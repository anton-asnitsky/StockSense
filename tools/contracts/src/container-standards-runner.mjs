import { spawnSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { ContractError, assertSafePath, deriveIdentity } from './package-loader.mjs';
import { LIMITS } from './preflight.mjs';
import { sourceTreeDigest } from './source-digest.mjs';

// The digest-pinned image must install exactly these locked CLIs at this path.
// A missing executable fails as an engine/toolchain error; it never falls back
// to a host executable or to a network package installation.
const TOOL = Object.freeze({
  'openapi:3.1.2': { binary: '/opt/contracts/node_modules/@redocly/cli/bin/cli.js', rule: 'NFR8.5' },
  'asyncapi:3.0.0': { binary: '/opt/contracts/node_modules/@asyncapi/cli/bin/run_bin', rule: 'NFR8.6' },
  'https://json-schema.org/draft/2020-12/schema': { binary: '/opt/contracts/container-schema-validator.mjs', rule: 'NFR8.4' },
  'asyncapi-payloads:2020-12': { binary: '/opt/contracts/container-schema-validator.mjs', rule: 'NFR8.6' },
  'fixture-oracle:2020-12': { binary: '/opt/contracts/src/container-fixture-oracle.mjs', rule: 'BR2.7' }
});
// A local build is addressed by its Docker image ID (config digest). A
// published build may instead use its repository manifest digest. Neither form
// resolves a mutable tag, and --pull=never requires the exact image locally.
const IMAGE = /^(?:sha256:[0-9a-f]{64}|[a-z0-9]+(?:[.-][a-z0-9]+)+(?:\/[a-z0-9]+(?:[._-][a-z0-9]+)*)+@sha256:[0-9a-f]{64})$/;
const SHA = /^sha256:[0-9a-f]{64}$/;
const VERSION = /^[1-9][0-9]*\.[0-9]+\.[0-9]+$/;
const CANONICAL = new Set(['schema', 'openapi', 'asyncapi']);
// Avoid PATH and current-directory executable search for untrusted checkouts.
// A nonstandard Docker installation needs a separately reviewed profile.
const DOCKER = process.platform === 'win32'
  ? 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe' : '/usr/bin/docker';
/** @returns {never} */
const fail = (code, rule, message) => { throw new ContractError(code, rule, message); };
const sha256 = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const inside = (root, path) => {
  const rel = relative(root, path);
  return rel !== '' && rel !== '..' && !rel.startsWith('..' + sep);
};

function checkedResult(result, code, rule) {
  if (!result || result.error || result.status !== 0 || result.signal || result.output?.some(chunk =>
    chunk && Buffer.byteLength(String(chunk)) > 1_048_576)) {
    fail(code, rule, 'Pinned standards container could not be run safely');
  }
  return String(result.stdout ?? '').trim();
}

// One verdict per image per process. The check costs a container start, and
// the image cannot change identity under a pinned digest mid-run.
/** @type {Map<string, string>} */
const imageSourceDigests = new Map();

/**
 * Refuse an image whose baked-in tool sources are not the ones being asked
 * about.
 *
 * The image copies `src` at build time, so the oracle inside it is the oracle
 * as of the build. Nothing in a passing run says which tool produced the
 * verdict: a stale image rejected a valid package here for a feature it did
 * not have, and an equally stale one would have passed a package the current
 * rules reject. Only the image can be trusted to say what it contains, so the
 * digest is read out of it rather than from a label or a build argument.
 */
function assertImageMatchesSources(spawn, image, hostDigest) {
  if (imageSourceDigests.get(image) === hostDigest) return;
  const result = dockerCall(spawn, ['run', '--rm', '--pull=never', '--network=none',
    '--read-only', '--security-opt=no-new-privileges=true', '--cap-drop=ALL', '--entrypoint=/bin/cat',
    image, '/opt/contracts/source-digest.txt'], 30_000);
  // Docker failing to start a container is an environment fault; a container
  // that ran and found no marker is an image built before this check existed.
  // Reporting both as an engine failure would send the operator to the wrong
  // place, which is the whole mistake this check exists to prevent.
  if (!result || result.error || result.signal || typeof result.status !== 'number' ||
      [125, 126, 127].includes(result.status)) {
    fail('STANDARDS_ENGINE', 'NFR6.2', 'Pinned standards container could not be run safely');
  }
  const baked = String(result.stdout ?? '').trim();
  if (result.status !== 0 || !SHA.test(baked)) {
    fail('STANDARDS_IMAGE_STALE', 'NFR6.2',
      'Standards image records no tool-source digest; rebuild it from this tree');
  }
  if (baked !== hostDigest) {
    fail('STANDARDS_IMAGE_STALE', 'NFR6.2',
      'Standards image was built from different tool sources; rebuild it from this tree');
  }
  imageSourceDigests.set(image, hostDigest);
}

function dockerCall(spawn, args, timeout) {
  try {
    // Host overrides can make `docker info` address a remote daemon even when
    // the selected context is local. Inspect and run with one fixed environment.
    const env = { ...process.env };
    for (const key of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[key];
    return spawn(DOCKER, args, { encoding: 'utf8', timeout, maxBuffer: 1_048_576,
      shell: false, windowsHide: true, env });
  } catch {
    fail('STANDARDS_ENGINE', 'NFR6.2', 'Local Docker engine is unavailable');
  }
}

function assertOracleGraph(files, entries, sourceDocument) {
  if (!Array.isArray(entries) || !Array.isArray(files) || !entries.length ||
      entries.length !== files.length || entries.length > 4096) {
    fail('STANDARDS_GRAPH', 'NFR6.2', 'Fixture metadata and verified graph differ');
  }
  const byPath = new Map();
  for (const file of files) {
    if (!file || typeof file.document !== 'string' || typeof file.digest !== 'string' || !SHA.test(file.digest) ||
        ![...CANONICAL, 'sidecar'].includes(file.artifactKind) || byPath.has(file.document)) {
      fail('STANDARDS_GRAPH', 'NFR6.2', 'Fixture graph descriptor is invalid');
    }
    try { assertSafePath(file.document); }
    catch { fail('STANDARDS_GRAPH', 'NFR6.2', 'Fixture graph path is unsafe'); }
    byPath.set(file.document, file);
  }
  const seen = new Set();
  for (const entry of entries) {
    if (!entry || typeof entry.document !== 'string' || seen.has(entry.document) ||
        typeof entry.contentDigest !== 'string' || !SHA.test(entry.contentDigest) ||
        typeof entry.semanticOwner !== 'string' || !entry.semanticOwner.trim() || entry.semanticOwner.length > 256 ||
        typeof entry.semanticVersion !== 'string' || !VERSION.test(entry.semanticVersion) ||
        !Array.isArray(entry.boundaryIds) || entry.boundaryIds.length > 27 ||
        entry.boundaryIds.some(id => !/^C(0[1-9]|1[0-9]|2[0-7])$/.test(id))) {
      fail('STANDARDS_GRAPH', 'NFR6.2', 'Fixture entry metadata is invalid');
    }
    const file = byPath.get(entry.document);
    if (!file || file.artifactKind !== entry.artifactKind ||
        (!CANONICAL.has(entry.artifactKind) &&
          (entry.artifactKind !== 'sidecar' || typeof entry.kind !== 'string' || !entry.kind))) {
      fail('STANDARDS_GRAPH', 'NFR6.2', 'Fixture entry has no matching verified file');
    }
    const identity = deriveIdentity(entry.artifactKind === 'sidecar' ? entry.kind : entry.artifactKind,
      entry.semanticOwner, entry.document, entry.semanticVersion, entry.contentDigest);
    if (entry.contentDigest !== file.digest || entry.logicalId !== identity.logicalId ||
        typeof entry.revisionId !== 'string' || !SHA.test(entry.revisionId) ||
        (entry.artifactKind === 'sidecar' && entry.revisionId !== identity.revisionId)) {
      fail('STANDARDS_GRAPH', 'NFR6.2', 'Fixture entry identity or digest differs from snapshot');
    }
    seen.add(entry.document);
  }
  const firstFixture = entries.find(entry => entry.artifactKind === 'sidecar' && entry.kind === 'example-fixture');
  if (!firstFixture || sourceDocument !== firstFixture.document) {
    fail('STANDARDS_GRAPH', 'NFR6.2', 'Fixture source is not the first declared fixture');
  }
}

function parseFixtureResults(stdout, entries) {
  if (typeof stdout !== 'string' || Buffer.byteLength(stdout) > 1_048_576) {
    fail('STANDARDS_OUTPUT', 'NFR10.1', 'Fixture worker output exceeds limit');
  }
  let envelope;
  try { envelope = JSON.parse(stdout); }
  catch { fail('STANDARDS_OUTPUT', 'NFR6.2', 'Fixture worker output is malformed'); }
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope) ||
      Object.keys(envelope).sort().join(',') !== 'fixtureResults,version' || envelope.version !== 1 ||
      !Array.isArray(envelope.fixtureResults) || !envelope.fixtureResults.length || envelope.fixtureResults.length > 1024) {
    fail('STANDARDS_OUTPUT', 'NFR6.2', 'Fixture worker result shape is invalid');
  }
  const revisions = new Set(entries.filter(entry => CANONICAL.has(entry.artifactKind)).map(entry => entry.revisionId));
  const ids = new Set();
  for (const row of envelope.fixtureResults) {
    if (!row || typeof row !== 'object' || Array.isArray(row) ||
        Object.keys(row).sort().join(',') !== 'contractElementId,fixtureId,observed,revisionId,scenarioType' ||
        typeof row.fixtureId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(row.fixtureId) ||
        ids.has(row.fixtureId) || typeof row.contractElementId !== 'string' ||
        !/^[A-Za-z][A-Za-z0-9_.-]{0,127}$/.test(row.contractElementId) ||
        !revisions.has(row.revisionId) || !['valid', 'invalid', 'compatibility'].includes(row.scenarioType) ||
        !['pass', 'fail'].includes(row.observed)) {
      fail('STANDARDS_OUTPUT', 'NFR6.2', 'Fixture worker returned an unsafe result');
    }
    ids.add(row.fixtureId);
  }
  return envelope.fixtureResults;
}

async function snapshotGraph(graphRoot, files, sourceDocument) {
  if (typeof graphRoot !== 'string' || !Array.isArray(files) || !files.length || files.length > 4096 || typeof sourceDocument !== 'string') {
    fail('STANDARDS_GRAPH', 'NFR6.2', 'Verified graph declaration is missing');
  }
  try { assertSafePath(sourceDocument); }
  catch { fail('STANDARDS_GRAPH', 'NFR6.2', 'Source path is unsafe'); }
  const root = resolve(graphRoot);
  const temp = await realpath(tmpdir()).catch(() => fail('STANDARDS_GRAPH', 'NFR6.2', 'Temporary directory is unavailable'));
  const actualRoot = await realpath(root).catch(() => fail('STANDARDS_GRAPH', 'NFR6.2', 'Verified graph is unavailable'));
  const rootStat = await lstat(root).catch(() => fail('STANDARDS_GRAPH', 'NFR6.2', 'Verified graph is unavailable'));
  if (actualRoot !== root || !inside(temp, actualRoot) || !relative(temp, actualRoot).split(sep)[0].startsWith('stocksense-verified-graph-') ||
      !rootStat.isDirectory()) {
    fail('STANDARDS_GRAPH', 'NFR6.2', 'Verified graph must be a real temporary directory');
  }
  const seen = new Set();
  let sourceSeen = false;
  let total = 0;
  const snapshot = await mkdtemp(join(tmpdir(), 'stocksense-validator-snapshot-'))
    .catch(() => fail('STANDARDS_GRAPH', 'NFR6.2', 'Snapshot directory is unavailable'));
  try {
    for (const file of files) {
      if (!file || typeof file.document !== 'string' || typeof file.digest !== 'string' || !SHA.test(file.digest)) {
        fail('STANDARDS_GRAPH', 'NFR6.2', 'Verified graph entry is malformed');
      }
      try { assertSafePath(file.document); }
      catch { fail('STANDARDS_GRAPH', 'NFR6.2', 'Verified graph path is unsafe'); }
      if (seen.has(file.document)) fail('STANDARDS_GRAPH', 'NFR6.2', 'Verified graph has duplicate paths');
      seen.add(file.document);
      sourceSeen ||= file.document === sourceDocument;
      const parts = file.document.split('/');
      let cursor = root;
      for (const [index, part] of parts.entries()) {
        cursor = join(cursor, part);
        const stat = await lstat(cursor).catch(() => fail('STANDARDS_GRAPH', 'NFR6.2', 'Verified graph file is unavailable'));
        if (stat.isSymbolicLink() || (index === parts.length - 1 ? !stat.isFile() : !stat.isDirectory())) {
          fail('STANDARDS_GRAPH', 'NFR6.2', 'Verified graph contains an unsafe file');
        }
      }
      if (await realpath(cursor).catch(() => fail('STANDARDS_GRAPH', 'NFR6.2', 'Verified graph file changed')) !== cursor) {
        fail('STANDARDS_GRAPH', 'NFR6.2', 'Verified graph file changed');
      }
      const bytes = await readFile(cursor).catch(() => fail('STANDARDS_GRAPH', 'NFR6.2', 'Verified graph file is unreadable'));
      if (bytes.length > LIMITS.sourceBytes || sha256(bytes) !== file.digest) {
        fail('STANDARDS_GRAPH', 'NFR6.2', 'Verified graph digest or source limit failed');
      }
      total += bytes.length;
      if (total > LIMITS.packageBytes) fail('STANDARDS_GRAPH', 'NFR10.1', 'Verified graph exceeds package limit');
      const target = join(snapshot, ...parts);
      await mkdir(dirname(target), { recursive: true })
        .catch(() => fail('STANDARDS_GRAPH', 'NFR6.2', 'Snapshot directory could not be created'));
      await writeFile(target, bytes, { flag: 'wx', mode: 0o444 })
        .catch(() => fail('STANDARDS_GRAPH', 'NFR6.2', 'Snapshot file could not be written'));
    }
    if (!sourceSeen) fail('STANDARDS_GRAPH', 'NFR6.2', 'Source is absent from verified graph');
    return snapshot;
  } catch (error) {
    await rm(snapshot, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

/**
 * Validate one canonical document against an already preflighted, materialized
 * package graph. `files` contains the digest of each post-materialization byte
 * sequence. No caller-supplied CLI arguments or container paths are accepted.
 *
 * The image is a separately built, reviewed Linux image containing the exact
 * package-lock/pnpm-lock tool versions at /opt/contracts/node_modules. This
 * function deliberately has no default image; CI must supply an immutable
 * repository manifest digest or a local Docker image ID.
 *
 * Schema and AsyncAPI payload runs require `artifactKind` on every graph entry
 * so no declared schema can be silently omitted from the shared Ajv registry.
 * @param {'openapi:3.1.2'|'asyncapi:3.0.0'|'https://json-schema.org/draft/2020-12/schema'|'asyncapi-payloads:2020-12'|'fixture-oracle:2020-12'} dialect
 * @param {string} sourceDocument safe graph-relative path
 * @param {{graphRoot?:string, files?:Array<{document:string,digest:string,artifactKind?:string,jsonSchema?:boolean}>, image?:string, entries?:Array<any>, spawn?:typeof spawnSync}} [options]
 */
export async function runContainerStandardsValidator(dialect, sourceDocument, options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    fail('STANDARDS_GRAPH', 'NFR6.2', 'Verified graph declaration is missing');
  }
  const { graphRoot, files, image, entries, spawn = spawnSync } = options;
  const tool = TOOL[dialect];
  if (!tool) fail('STANDARDS_DIALECT', 'BR2.1', 'Unsupported standards dialect');
  if (typeof image !== 'string' || !IMAGE.test(image)) {
    fail('STANDARDS_IMAGE_PIN', 'NFR6.2', 'Standards image requires an exact SHA-256 digest');
  }
  if (typeof graphRoot !== 'string' || !Array.isArray(files)) {
    fail('STANDARDS_GRAPH', 'NFR6.2', 'Verified graph declaration is missing');
  }
  const schemaDialect = dialect === 'https://json-schema.org/draft/2020-12/schema';
  const payloadDialect = dialect === 'asyncapi-payloads:2020-12';
  const fixtureDialect = dialect === 'fixture-oracle:2020-12';
  if ((schemaDialect || payloadDialect) &&
      (files.some(file => !file || typeof file.artifactKind !== 'string' ||
        !['schema', 'openapi', 'asyncapi', 'sidecar'].includes(file.artifactKind)) ||
      !files.some(file => file.document === sourceDocument &&
        file.artifactKind === (schemaDialect ? 'schema' : 'asyncapi')))) {
    fail('STANDARDS_GRAPH', 'NFR6.2', 'Schema worker needs explicit canonical kinds and selected source');
  }
  if (fixtureDialect) assertOracleGraph(files, entries, sourceDocument);
  if (typeof spawn !== 'function') fail('STANDARDS_ENGINE', 'NFR6.2', 'Docker invocation is unavailable');
  const snapshot = await snapshotGraph(graphRoot, files, sourceDocument);
  let configDir;
  let name;
  let attemptedRun = false;
  let succeeded = false;
  try {
    // A comma changes Docker --mount's key/value parsing. Newlines and controls
    // are likewise refused even though the child is launched without a shell.
    if ([snapshot, graphRoot].some(path => /[,\r\n\x00-\x1f]/.test(path))) {
      fail('STANDARDS_GRAPH', 'NFR6.2', 'Host bind path cannot be represented safely');
    }
    const context = checkedResult(dockerCall(spawn, ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'], 5_000),
      'STANDARDS_ENGINE', 'NFR6.2');
    if (!(process.platform === 'win32'
      ? ['npipe:////./pipe/dockerDesktopLinuxEngine', 'npipe:////./pipe/docker_engine'].includes(context)
      : ['unix:///var/run/docker.sock', 'unix:///run/docker.sock'].includes(context))) {
      fail('STANDARDS_ENGINE', 'NFR6.2', 'Docker context must use a local engine');
    }
    if (checkedResult(dockerCall(spawn, ['info', '--format', '{{.OSType}}'], 5_000),
      'STANDARDS_ENGINE', 'NFR6.2') !== 'linux') {
      fail('STANDARDS_ENGINE', 'NFR6.2', 'Standards image requires Linux containers');
    }
    assertImageMatchesSources(spawn, image, await sourceTreeDigest());
    configDir = await mkdtemp(join(tmpdir(), 'stocksense-validator-config-'))
      .catch(() => fail('STANDARDS_ENGINE', 'NFR6.2', 'Validator configuration directory is unavailable'));
    if (/[,\r\n\x00-\x1f]/.test(configDir)) fail('STANDARDS_GRAPH', 'NFR6.2', 'Host bind path cannot be represented safely');
    const config = join(configDir, 'redocly.yaml');
    if (dialect === 'openapi:3.1.2') {
      await writeFile(config, 'extends:\n  - recommended\nrules:\n  struct: error\n  operation-summary: off\n  operation-4xx-response: warn\n  operation-operationId: error\n  no-unresolved-refs: error\n', { flag: 'wx' })
        .catch(() => fail('STANDARDS_ENGINE', 'NFR6.2', 'Validator configuration could not be written'));
    } else if (schemaDialect || payloadDialect) {
      // A manifest declares C07's typed port, C08's in-process port and the
      // C05/C09 governed record as schema-kind entries, because that is what
      // they are in the inventory - but they are closed dialects, not JSON
      // Schema. The worker compiles every schema it is given into one shared
      // registry, so handing it a typed port fails the registry build and with
      // it *every* schema and AsyncAPI-payload validation in the package, not
      // just that document. The caller marks them `jsonSchema: false`; they
      // stay in the digest-checked graph and only leave the registry.
      const schemas = files.filter(file => file.artifactKind === 'schema' && file.jsonSchema !== false)
        .map(file => ({ document: file.document, digest: file.digest }));
      const selected = files.find(file => file.document === sourceDocument);
      const source = { document: sourceDocument, digest: selected?.digest,
        artifactKind: schemaDialect ? 'schema' : 'asyncapi' };
      await writeFile(join(configDir, 'schema-index.json'), JSON.stringify({ version: 1, source, schemas }), { flag: 'wx' })
        .catch(() => fail('STANDARDS_ENGINE', 'NFR6.2', 'Schema registry configuration could not be written'));
    } else if (fixtureDialect) {
      let metadata;
      try { metadata = JSON.stringify({ version: 1, sourceDocument, files, entries }); }
      catch { fail('STANDARDS_GRAPH', 'NFR6.2', 'Fixture metadata cannot be serialized'); }
      if (Buffer.byteLength(metadata) > 1_048_576) fail('STANDARDS_LIMIT', 'NFR10.1', 'Fixture metadata exceeds limit');
      await writeFile(join(configDir, 'fixture-index.json'), metadata, { flag: 'wx' })
        .catch(() => fail('STANDARDS_ENGINE', 'NFR6.2', 'Fixture registry configuration could not be written'));
    }
    name = 'stocksense-standards-' + randomUUID();
    const args = ['run', '--pull=never', '--name', name, '--network=none', '--read-only',
      '--security-opt=no-new-privileges=true', '--cap-drop=ALL', '--pids-limit=64',
      '--memory=' + LIMITS.processBytes, '--memory-swap=' + LIMITS.processBytes,
      '--user=65532:65532', '--workdir=/workspace', '--tmpfs=/tmp:rw,noexec,nosuid,size=67108864',
      '--env=HOME=/tmp', '--env=NO_UPDATE_NOTIFIER=1',
      '--mount', `type=bind,source=${snapshot},target=/workspace,readonly`];
    if (dialect === 'openapi:3.1.2' || schemaDialect || payloadDialect || fixtureDialect) {
      args.push('--mount', `type=bind,source=${configDir},target=/config,readonly`);
    }
    args.push('--entrypoint=/usr/local/bin/node', image, tool.binary,
      ...(dialect === 'openapi:3.1.2'
        ? ['lint', '/workspace/' + sourceDocument, '--config', '/config/redocly.yaml', '--format', 'json']
        : schemaDialect ? ['schema:2020-12', sourceDocument]
          : payloadDialect ? ['asyncapi-payloads:2020-12', sourceDocument]
            : fixtureDialect ? [sourceDocument]
            : ['validate', '/workspace/' + sourceDocument]));
    attemptedRun = true;
    const result = dockerCall(spawn, args, LIMITS.validatorMs);
    if (result?.error?.code === 'ETIMEDOUT' || result?.signal) {
      fail('STANDARDS_LIMIT', 'NFR10.1', 'Standards validator exceeded its time limit');
    }
    if (result?.error?.code === 'ENOBUFS') fail('STANDARDS_LIMIT', 'NFR10.1', 'Standards validator exceeded output limit');
    if (Buffer.byteLength(String(result?.stdout ?? '')) > 1_048_576 ||
        Buffer.byteLength(String(result?.stderr ?? '')) > 1_048_576) {
      fail('STANDARDS_LIMIT', 'NFR10.1', 'Standards validator exceeded output limit');
    }
    if (result?.status === 137) fail('STANDARDS_LIMIT', 'NFR10.1', 'Standards validator exceeded its memory limit');
    if (!result || result.error || typeof result.status !== 'number' || [125, 126, 127].includes(result.status)) {
      fail('STANDARDS_ENGINE', 'NFR6.2', 'Pinned standards image or Docker engine failed');
    }
    if (fixtureDialect && result.status === 3) fail('STANDARDS_GRAPH', 'NFR6.2', 'Fixture graph failed in container');
    if ((schemaDialect || payloadDialect || fixtureDialect) && result.status !== 0 && result.status !== 2) {
      fail('STANDARDS_ENGINE', 'NFR6.2', 'Pinned schema compiler did not complete');
    }
    if (result.status !== 0) fail('STANDARDS_VALIDATION', tool.rule, 'Pinned standards validator rejected the canonical document');
    let fixtureResults;
    if (fixtureDialect) fixtureResults = parseFixtureResults(result.stdout, entries);
    succeeded = true;
    return fixtureDialect ? { dialect, valid: true, fixtureResults } : { dialect, valid: true };
  } finally {
    let cleanupFailed = false;
    if (attemptedRun) {
      const cleanup = dockerCall(spawn, ['rm', '--force', name], 5_000);
      cleanupFailed = Boolean(cleanup?.error || cleanup?.status !== 0);
    }
    if (configDir) await rm(configDir, { recursive: true, force: true })
      .catch(() => fail('STANDARDS_ENGINE', 'NFR6.2', 'Validator configuration cleanup failed'));
    await rm(snapshot, { recursive: true, force: true })
      .catch(() => fail('STANDARDS_ENGINE', 'NFR6.2', 'Verified snapshot cleanup failed'));
    if (cleanupFailed && succeeded) fail('STANDARDS_ENGINE', 'NFR6.2', 'Standards container cleanup failed');
  }
}
