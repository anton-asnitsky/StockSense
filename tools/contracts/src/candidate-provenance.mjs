import { spawnSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ContractError, canonicalJson, digest } from './package-loader.mjs';
import { assertGenerationProfile, regenerateConsumer } from './generation.mjs';
import { createPinnedGeneratorRunner, generatorConfigurationDigest, GENERATORS } from './generators.mjs';
import { readBlob, verifySourceBinding } from './provenance.mjs';
import { assertEvidenceContentSafe } from './evidence.mjs';

/** @returns {never} */
const fail = (code, rule, message) => { throw new ContractError(code, rule, message); };
const SHA = /^sha256:[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const FORMAT = 'stocksense-candidate-evidence-v1';
const TOOL_INPUTS = Object.freeze([
  '.config/dotnet-tools.json', 'tools/contracts/package.json',
  'tools/contracts/pnpm-lock.yaml', 'tools/contracts/Dockerfile.validator',
  'tools/contracts/Dockerfile.generator-kiota', 'tools/contracts/nuget.config'
]);
const EXPECTED_CONSUMERS = Object.freeze({
  'dotnet-operations-client': 'kiota',
  'messaging-typescript': 'modelina',
  'web-application': 'openapi-typescript'
});
const same = (left, right) => canonicalJson(left) === canonicalJson(right);
const ordered = value => Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b, 'en')));
// Git stores these declared text inputs with LF; Windows may check them out
// with CRLF. Bind the Git bytes while still checking the local file contents.
const gitTextBytes = bytes => Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'));

function parseJson(bytes, code) {
  try { return JSON.parse(bytes.toString('utf8')); }
  catch { fail(code, 'BR6.6', 'Candidate evidence contains malformed JSON'); }
}

function sourceEntries(manifest) {
  return ['openapi', 'asyncapi', 'schemas'].flatMap(key => manifest[key].map(entry => entry));
}

function packageInputs(bundle) {
  const manifest = parseJson(bundle.files.get('manifest.json'), 'EVIDENCE_MANIFEST');
  const profileEntry = manifest.governedArtifacts.find(entry => entry.kind === 'generation-profile');
  if (!profileEntry || !bundle.files.has(profileEntry.document)) {
    fail('GENERATION_PROFILE_MISSING', 'BR3.1', 'Candidate has no bound generation profile');
  }
  const profileBytes = bundle.files.get(profileEntry.document);
  if (digest(profileBytes) !== profileEntry.contentDigest) {
    fail('GENERATION_PROFILE_DIGEST', 'BR3.1', 'Generation profile differs from C01');
  }
  const profileDocument = parseJson(profileBytes, 'GENERATION_PROFILE_SHAPE');
  if (profileDocument.sourceRevision !== manifest.sourceRevision) {
    fail('GENERATION_PROFILE_STALE', 'BR3.1', 'Generation profile source revision differs from C01');
  }
  const profile = assertGenerationProfile(profileDocument);
  if (!profile.verified || profile.consumers.length !== 3 ||
      !same(ordered(Object.fromEntries(profile.consumers.map(c => [c.consumerId, c.generator]))), EXPECTED_CONSUMERS)) {
    fail('GENERATION_CONSUMERS_INCOMPLETE', 'BR3.1', 'All three pinned consumers are required');
  }
  const sources = {};
  for (const entry of sourceEntries(manifest)) {
    if (sources[entry.document] || !bundle.files.has(entry.document) ||
        digest(bundle.files.get(entry.document)) !== entry.contentDigest) {
      fail('SOURCE_DIGEST_MISMATCH', 'BR1.7', 'Candidate source inventory is incomplete or changed');
    }
    sources[entry.document] = entry.contentDigest;
  }
  return { manifest, profile, profileDigest: digest(profileBytes), sources: ordered(sources) };
}

export function validateCandidateScan(name, scan) {
  if (!['secret', 'vulnerability'].includes(name)) {
    fail('SCAN_REPORT_INVALID', 'BR6.2', 'Unknown candidate scan');
  }
  if (!scan || Object.keys(scan).sort().join(',') !== 'digest,report,scopeDigest,status' ||
      scan.status !== 'passed' || !SHA.test(scan.digest) || !SHA.test(scan.scopeDigest) ||
      typeof scan.report !== 'string' ||
      scan.report.length > 4 * 1024 * 1024 || digest(Buffer.from(scan.report)) !== scan.digest) {
    fail('SCAN_EVIDENCE_MISSING', 'BR6.2', `Current ${name} scan evidence is absent or changed`);
  }
  const report = parseJson(Buffer.from(scan.report), 'SCAN_REPORT_INVALID');
  if (name === 'secret') {
    if (!Array.isArray(report) || report.some(row => !Array.isArray(row.messages) || row.messages.length)) {
      fail('SCAN_FINDINGS', 'BR6.2', 'Secret scan has findings or an unknown report shape');
    }
  } else if (!report || typeof report !== 'object' || Array.isArray(report) ||
      !report.metadata?.vulnerabilities ||
      !['moderate', 'high', 'critical', 'total'].every(key =>
        Number.isSafeInteger(report.metadata.vulnerabilities[key])) ||
      Object.values(report.metadata.vulnerabilities).some(count => !Number.isSafeInteger(count) || count !== 0) ||
      (report.advisories && Object.keys(report.advisories).length) ||
      (report.vulnerabilities && Object.keys(report.vulnerabilities).length)) {
    fail('SCAN_FINDINGS', 'BR6.2', 'Vulnerability scan has findings or an unknown report shape');
  }
}

/** Bind scan scope to committed Git blobs, independent of checkout line endings. */
export function candidateScanScope(repoRoot, commit = 'HEAD') {
  const result = spawnSync('git', ['ls-tree', '-r', '-z', commit, '--',
    'contracts', 'tools/contracts', '.github'], { cwd: repoRoot,
    shell: false, timeout: 60_000, maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0 || !result.stdout?.length) {
    fail('SCAN_INPUT', 'BR6.2', 'Committed scan input inventory is unavailable');
  }
  const entries = result.stdout.toString('utf8').split('\0').filter(Boolean).map(line => {
    const match = /^(100644|100755) blob ([0-9a-f]{40})\t([^\r\n\0]+)$/.exec(line);
    if (!match || match[3].split('/').some(part => !part || part === '.' || part === '..')) {
      fail('SCAN_INPUT', 'BR6.2', 'Committed scan input inventory is unsafe');
    }
    return { mode: match[1], blob: match[2], path: match[3] };
  }).sort((a, b) => a.path.localeCompare(b.path, 'en'));
  if (!entries.length || entries.length > 4096 ||
      !entries.some(row => row.path.startsWith('contracts/source/')) ||
      new Set(entries.map(row => row.path)).size !== entries.length) {
    fail('SCAN_INPUT', 'BR6.2', 'Committed scan input inventory is incomplete');
  }
  const clean = spawnSync('git', ['diff', '--quiet', commit, '--',
    'contracts', 'tools/contracts', '.github'], { cwd: repoRoot, shell: false,
    timeout: 60_000 });
  if (clean.error || clean.status !== 0) {
    fail('SCAN_INPUT', 'BR6.2', 'Scan input checkout differs from the signing revision');
  }
  return { paths: entries.map(row => row.path),
    digest: digest(Buffer.from(canonicalJson(entries))) };
}

/** Windows pnpm is a .cmd shim; invoke its JavaScript entry without a shell. */
export function pnpmInvocation(args, { platform = process.platform, env = process.env } = {}) {
  if (platform !== 'win32') return { command: 'pnpm', args };
  const entry = env.npm_execpath;
  if (typeof entry !== 'string' || !/\.[cm]?js$/i.test(entry)) {
    fail('SCAN_UNVERIFIED', 'BR6.2', 'The pinned pnpm JavaScript entry is unavailable');
  }
  return { command: process.execPath, args: [entry, ...args] };
}

function checkValidation(validation, bundle, manifest) {
  const canonical = sourceEntries(manifest);
  const fixturesEntry = manifest.governedArtifacts.find(entry => entry.kind === 'example-fixture');
  const fixtureBytes = fixturesEntry && bundle.files.get(fixturesEntry.document);
  if (!fixtureBytes || digest(fixtureBytes) !== fixturesEntry.contentDigest) {
    fail('VALIDATION_EVIDENCE_MISMATCH', 'BR6.5', 'Candidate fixtures are missing or changed');
  }
  const declared = parseJson(fixtureBytes, 'VALIDATION_EVIDENCE_MISMATCH').fixtures;
  const expected = Array.isArray(declared) ? declared.map(row => ({
    fixtureId: row.fixtureId, contractElementId: row.contractElementId,
    scenarioType: row.scenarioType, observed: row.expectedOutcome,
    revisionId: row.documentRevisionId ?? row.schemaRevisionId
  })) : [];
  const actual = validation?.fixtureResults;
  const byId = new Map(expected.map(row => [row.fixtureId, row]));
  if (!validation || validation.releaseReady !== false || validation.manifestDigest !== bundle.manifestDigest ||
      validation.sourceRevision !== manifest.sourceRevision ||
      !['verified', 'verified-canonical-package-outside-repository'].includes(validation.sourceBinding) ||
      !Array.isArray(validation.validatedCanonical) ||
      !Array.isArray(validation.uncoveredBoundaries) || validation.uncoveredBoundaries.length ||
      !Array.isArray(actual) || !actual.length || !expected.length ||
      new Set(expected.map(row => row.fixtureId)).size !== expected.length ||
      actual.length !== expected.length || new Set(actual.map(row => row.fixtureId)).size !== actual.length ||
      !same(validation.validatedCanonical.map(row => [row.document, row.revisionId]).sort(),
        canonical.map(row => [row.document, row.revisionId]).sort()) ||
      actual.some(row => {
        const declaredRow = byId.get(row.fixtureId);
        return !declaredRow || row.contractElementId !== declaredRow.contractElementId ||
          row.scenarioType !== declaredRow.scenarioType || row.observed !== declaredRow.observed ||
          !['pass', 'fail'].includes(row.observed) ||
          !canonical.some(entry => entry.revisionId === row.revisionId) ||
          (declaredRow.revisionId && row.revisionId !== declaredRow.revisionId);
      })) {
    fail('VALIDATION_EVIDENCE_MISMATCH', 'BR6.5', 'Candidate validation is missing, stale or incomplete');
  }
}

async function toolInputs(repoRoot, commit) {
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8',
    shell: false, timeout: 60_000 });
  if (head.error || head.status !== 0 || head.stdout.trim() !== commit) {
    fail('EVIDENCE_COMMIT_STALE', 'BR6.6', 'Clean consumer must check out the signing commit');
  }
  const paths = [...TOOL_INPUTS];
  for (const directory of ['tools/contracts/src', 'tools/contracts/scripts']) {
    const entries = await readdir(join(repoRoot, directory), { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.mjs')) {
        fail('TOOL_INPUT_STALE', 'BR6.6', 'Tool source inventory contains an unexpected entry');
      }
      paths.push(`${directory}/${entry.name}`);
    }
  }
  const committed = spawnSync('git', ['ls-tree', '-r', '--name-only', commit, '--',
    'tools/contracts/src', 'tools/contracts/scripts'], { cwd: repoRoot,
    encoding: 'utf8', shell: false, timeout: 60_000 });
  if (committed.error || committed.status !== 0 ||
      !same(paths.filter(path => path.startsWith('tools/contracts/src/') ||
        path.startsWith('tools/contracts/scripts/')).sort(),
      committed.stdout.trim().split(/\r?\n/).sort())) {
    fail('TOOL_INPUT_STALE', 'BR6.6', 'Tool source inventory differs from the signing commit');
  }
  const result = {};
  for (const path of paths) {
    const bytes = await readFile(join(repoRoot, path));
    const recorded = readBlob(repoRoot, commit, path);
    if (!gitTextBytes(bytes).equals(recorded)) {
      fail('TOOL_INPUT_STALE', 'BR6.6', 'Pinned tool input differs from the signing commit');
    }
    result[path] = digest(recorded);
  }
  return ordered(result);
}

async function checkSources(repoRoot, manifest, sources) {
  verifySourceBinding(repoRoot, manifest.sourceRevision,
    Object.entries(sources).map(([path, contentDigest]) =>
      ({ sourcePath: `contracts/source/${path}`, contentDigest })));
  for (const [path, expected] of Object.entries(sources)) {
    if (digest(gitTextBytes(await readFile(join(repoRoot, 'contracts/source', path)))) !== expected) {
      fail('SOURCE_CHECKOUT_STALE', 'BR1.7', 'Clean consumer source differs from the candidate');
    }
  }
}

async function checkConsumers(profile, sources, declared, runGenerator) {
  const actual = [];
  for (const consumer of profile.consumers) {
    const generator = GENERATORS[consumer.generator];
    if (!generator || consumer.generatorVersion !== generator.version ||
        consumer.configurationDigest !== generatorConfigurationDigest(consumer.generator, generator.outputPath) ||
        sources[consumer.sourceDocument] === undefined) {
      fail('GENERATION_INPUT_MISMATCH', 'BR3.1', 'Consumer source, tool or configuration is not pinned');
    }
    const result = await regenerateConsumer(consumer, { runGenerator });
    actual.push({ ...result, sourceDigest: sources[consumer.sourceDocument],
      outputManifestDigest: digest(Buffer.from(canonicalJson(result.outputs))) });
  }
  actual.sort((a, b) => a.consumerId.localeCompare(b.consumerId, 'en'));
  if (declared && !same(actual, declared)) {
    fail('CONSUMER_EVIDENCE_MISMATCH', 'BR3.3', 'Declared consumer output evidence differs from clean regeneration');
  }
  return actual;
}

async function currentSbom(repoRoot) {
  const { buildSbom } = await import('./sbom.mjs');
  const packageJson = JSON.parse(await readFile(join(repoRoot, 'tools/contracts/package.json'), 'utf8'));
  return buildSbom(join(repoRoot, 'tools/contracts/pnpm-lock.yaml'), {
    name: packageJson.name, version: packageJson.version, generator: 'stocksense-contracts-sbom'
  });
}

/** Construct evidence only from current committed inputs and real clean generation. */
export async function buildCandidateEvidence(bundle, { repoRoot, sourceCommit, validation, scans,
  runGenerator = createPinnedGeneratorRunner(repoRoot), verifySources = checkSources,
  readToolInputs = toolInputs, readSbom = currentSbom, readScanScope = candidateScanScope }) {
  if (!COMMIT.test(sourceCommit)) fail('EVIDENCE_COMMIT', 'BR6.6', 'A full signing commit is required');
  const { manifest, profile, profileDigest, sources } = packageInputs(bundle);
  checkValidation(validation, bundle, manifest);
  validateCandidateScan('secret', scans?.secret);
  validateCandidateScan('vulnerability', scans?.vulnerability);
  const scope = await readScanScope(repoRoot, sourceCommit);
  if (scans.secret.scopeDigest !== scope.digest || scans.vulnerability.scopeDigest !== scope.digest) {
    fail('SCAN_INPUT', 'BR6.2', 'Candidate scan did not cover the signing revision');
  }
  await verifySources(repoRoot, manifest, sources);
  const tools = await readToolInputs(repoRoot, sourceCommit);
  const consumers = await checkConsumers(profile, sources, null, runGenerator);
  const sbom = await readSbom(repoRoot);
  const evidence = { format: FORMAT, releaseReady: false, sourceCommit,
    sourceRevision: manifest.sourceRevision, manifestDigest: bundle.manifestDigest,
    profileDigest, sources, tools, consumers, validation,
    validationDigest: digest(Buffer.from(canonicalJson(validation))),
    sbom: { digest: sbom.digest, base64: sbom.bytes.toString('base64') },
    scans: { secret: scans.secret, vulnerability: scans.vulnerability } };
  assertEvidenceContentSafe(evidence);
  return evidence;
}

/** Verify the attested bundle's evidence against the clean checkout and generators. */
export async function verifyCandidateEvidence(bundle, { repoRoot, sourceCommit,
  runGenerator = createPinnedGeneratorRunner(repoRoot), verifySources = checkSources,
  readToolInputs = toolInputs, readSbom = currentSbom, readScanScope = candidateScanScope }) {
  const evidence = bundle.candidateEvidence;
  if (!evidence || evidence.format !== FORMAT || evidence.releaseReady !== false ||
      !COMMIT.test(sourceCommit) || evidence.sourceCommit !== sourceCommit ||
      !SHA.test(evidence.manifestDigest) || !SHA.test(evidence.profileDigest) ||
      !SHA.test(evidence.validationDigest) || !Array.isArray(evidence.consumers) ||
      !evidence.sources || !evidence.tools || !evidence.scans) {
    fail('CANDIDATE_EVIDENCE_MISSING', 'BR6.6', 'Attested candidate lacks complete evidence');
  }
  assertEvidenceContentSafe(evidence);
  const { manifest, profile, profileDigest, sources } = packageInputs(bundle);
  if (evidence.manifestDigest !== bundle.manifestDigest || evidence.sourceRevision !== manifest.sourceRevision ||
      evidence.profileDigest !== profileDigest || !same(evidence.sources, sources)) {
    fail('CANDIDATE_EVIDENCE_STALE', 'BR6.6', 'Candidate evidence does not bind the package inputs');
  }
  checkValidation(evidence.validation, bundle, manifest);
  if (digest(Buffer.from(canonicalJson(evidence.validation))) !== evidence.validationDigest) {
    fail('VALIDATION_EVIDENCE_MISMATCH', 'BR6.5', 'Validation result digest changed');
  }
  validateCandidateScan('secret', evidence.scans.secret);
  validateCandidateScan('vulnerability', evidence.scans.vulnerability);
  const scope = await readScanScope(repoRoot, sourceCommit);
  if (evidence.scans.secret.scopeDigest !== scope.digest ||
      evidence.scans.vulnerability.scopeDigest !== scope.digest) {
    fail('SCAN_INPUT', 'BR6.2', 'Attested scan did not cover the signing revision');
  }
  await verifySources(repoRoot, manifest, sources);
  if (!same(evidence.tools, await readToolInputs(repoRoot, sourceCommit))) {
    fail('TOOL_INPUT_STALE', 'BR6.6', 'Toolchain input digest differs from the signing commit');
  }
  const sbom = await readSbom(repoRoot);
  if (!evidence.sbom || evidence.sbom.digest !== sbom.digest ||
      evidence.sbom.base64 !== sbom.bytes.toString('base64')) {
    fail('SBOM_EVIDENCE_MISMATCH', 'BR6.5', 'SBOM is missing or differs from the pinned lockfile');
  }
  await checkConsumers(profile, sources, evidence.consumers, runGenerator);
  return { consumers: evidence.consumers.length, outputs: evidence.consumers.reduce(
    (sum, item) => sum + Object.keys(item.outputs).length, 0), sbomDigest: sbom.digest,
    validationDigest: evidence.validationDigest, scanDigests: {
      secret: evidence.scans.secret.digest, vulnerability: evidence.scans.vulnerability.digest
    }, releaseReady: false };
}

/** Pinned JSON scanners; their actual reports are embedded, never a green-job label. */
export function runCandidateScans(repoRoot) {
  const scope = candidateScanScope(repoRoot);
  const commands = {
    secret: ['exec', 'secretlint', '--format', 'json', 'src/**/*', 'test/**/*', 'scripts/**/*'],
    vulnerability: ['audit', '--json', '--audit-level', 'moderate']
  };
  const scans = {};
  for (const [name, args] of Object.entries(commands)) {
    const invocation = pnpmInvocation(name === 'secret'
      ? ['exec', 'secretlint', '--format', 'json', ...scope.paths.map(path => join(repoRoot, path))]
      : args);
    const result = spawnSync(invocation.command, invocation.args, { cwd: join(repoRoot, 'tools/contracts'),
      encoding: 'utf8', shell: false, windowsHide: true, timeout: 120_000,
      maxBuffer: 16 * 1024 * 1024 });
    if (result.error || result.status !== 0 || !result.stdout?.trim()) {
      fail('SCAN_UNVERIFIED', 'BR6.2', `Current ${name} scan did not pass`);
    }
    scans[name] = { status: 'passed', report: result.stdout, scopeDigest: scope.digest,
      digest: digest(Buffer.from(result.stdout)) };
    validateCandidateScan(name, scans[name]);
  }
  return scans;
}
