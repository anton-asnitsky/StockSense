import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdtemp, open, readdir, readlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, posix } from 'node:path';
import { TextDecoder } from 'node:util';

const SCHEMA = 'stocksense-kiota-runtime-v1';
const IMAGE_ID = /^sha256:[0-9a-f]{64}$/;
const ROOTS = ['opt/kiota', 'opt/kiota-probe'];
const MAX_FILES = 50_000;
const MAX_BYTES = 512 * 1024 * 1024;
const MAX_FILE_BYTES = 128 * 1024 * 1024;
const MAX_ARCHIVE_BYTES = 640 * 1024 * 1024;
const MAX_PATH_BYTES = 4096;
const docker = process.platform === 'win32'
  ? 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe' : '/usr/bin/docker';
const hash = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const bad = message => { throw new Error(`Kiota runtime manifest: ${message}`); };
const compare = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));

function canonicalPath(path) {
  if (typeof path !== 'string' || !path || Buffer.byteLength(path) > MAX_PATH_BYTES ||
      path !== path.normalize('NFC') || /[\\\x00-\x1f\x7f]/.test(path) ||
      path.startsWith('/') || path.endsWith('/') ||
      path.split('/').some(part => !part || part === '.' || part === '..')) {
    bad('unsafe payload path');
  }
  if (!ROOTS.some(root => path === root || path.startsWith(`${root}/`))) bad('path outside payload roots');
  return path;
}

function safeLink(path, target) {
  if (typeof target !== 'string' || !target || Buffer.byteLength(target) > MAX_PATH_BYTES ||
      target !== target.normalize('NFC') || /[\\\x00-\x1f\x7f]/.test(target) ||
      target.startsWith('/') || /^[A-Za-z]:/.test(target)) bad('unsafe symlink target');
  const root = ROOTS.find(value => path === value || path.startsWith(`${value}/`));
  const resolved = posix.normalize(posix.join(posix.dirname(path), target));
  if (!root || resolved !== root && !resolved.startsWith(`${root}/`)) bad('symlink escapes payload root');
  return target;
}

function normalizedConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) bad('missing image Config');
  const args = field => {
    const value = config[field];
    if (value === null) return null;
    if (!Array.isArray(value) || value.length > 256 ||
        value.some(item => typeof item !== 'string' || item.includes('\0') || item.length > 8192)) {
      bad(`invalid Config.${field}`);
    }
    return [...value];
  };
  if (!Array.isArray(config.Env) || config.Env.length > 512 ||
      config.Env.some(item => typeof item !== 'string' || item.length > 8192 ||
        !/^[A-Za-z_][A-Za-z0-9_]*=/.test(item) || item.includes('\0'))) {
    bad('invalid Config.Env');
  }
  const env = [...config.Env].sort(compare);
  if (new Set(env.map(item => item.slice(0, item.indexOf('=')))).size !== env.length) {
    bad('duplicate Config.Env key');
  }
  if (typeof config.User !== 'string' || typeof config.WorkingDir !== 'string' ||
      [config.User, config.WorkingDir].some(item => item.length > 8192 || item.includes('\0'))) {
    bad('invalid Config identity or working directory');
  }
  return { Entrypoint: args('Entrypoint'), Cmd: args('Cmd'), Env: env,
    User: config.User, WorkingDir: config.WorkingDir };
}

function normalizedPackages(sbom) {
  if (!sbom || sbom.bomFormat !== 'CycloneDX' || !/^1\.[456]$/.test(sbom.specVersion ?? '') ||
      !Array.isArray(sbom.components) || !sbom.components.length || sbom.components.length > MAX_FILES) {
    bad('missing or malformed CycloneDX SBOM');
  }
  // Syft also emits file components (the actual Kiota/probe bytes are hashed
  // above) and package-less application/OS descriptors. Only purl-bearing
  // libraries are package identities. Preserve duplicate identities because
  // one package may be reported from more than one installed location.
  const packages = sbom.components.filter(component => {
    if (!component || typeof component !== 'object' ||
        component.type === 'library' && !component.purl) bad('library has no package identity');
    return Boolean(component.purl);
  }).map(component => {
    if (!component || typeof component !== 'object' ||
        ['type', 'name', 'version', 'purl'].some(field => typeof component[field] !== 'string' ||
          !component[field] || component[field].length > 4096 || /[\x00-\x1f\x7f]/.test(component[field]))) {
      bad('incomplete SBOM package identity');
    }
    return { type: component.type, name: component.name, version: component.version,
      purl: component.purl };
  }).sort((a, b) => compare(JSON.stringify(a), JSON.stringify(b)));
  if (!packages.some(item => item.purl.startsWith('pkg:nuget/'))) bad('Kiota NuGet packages absent');
  return packages;
}

/** Pure canonicalizer. The digest intentionally omits the image ID and raw SBOM digest. */
export function normalizeKiotaRuntimeManifest({ entries, config, sbom }) {
  if (!Array.isArray(entries) || entries.length < ROOTS.length || entries.length > MAX_FILES) {
    bad('invalid payload entry count');
  }
  const seen = new Set();
  let totalBytes = 0;
  const files = entries.map(entry => {
    if (!entry || typeof entry !== 'object') bad('invalid payload entry');
    const path = canonicalPath(entry.path);
    if (seen.has(path)) bad('duplicate payload path');
    seen.add(path);
    if (!Number.isInteger(entry.mode) || entry.mode < 0 || entry.mode > 0o7777) bad('invalid mode');
    if (entry.kind === 'directory') return { path, kind: 'directory', mode: entry.mode };
    if (entry.kind === 'symlink') return { path, kind: 'symlink', mode: entry.mode,
      target: safeLink(path, entry.target) };
    if (entry.kind !== 'file' || !IMAGE_ID.test(entry.sha256 ?? '') ||
        !Number.isSafeInteger(entry.size) || entry.size < 0 || entry.size > MAX_FILE_BYTES) {
      bad('invalid regular file entry');
    }
    totalBytes += entry.size;
    if (totalBytes > MAX_BYTES) bad('payload byte limit exceeded');
    return { path, kind: 'file', mode: entry.mode, size: entry.size, sha256: entry.sha256 };
  }).sort((a, b) => compare(a.path, b.path));
  for (const root of ROOTS) {
    if (!files.some(entry => entry.path === root && entry.kind === 'directory')) bad('missing payload root');
  }
  for (const entry of files) {
    if (ROOTS.includes(entry.path)) continue;
    const parent = posix.dirname(entry.path);
    if (!files.some(item => item.path === parent && item.kind === 'directory')) bad('missing payload parent');
  }
  const normalized = { schema: SCHEMA, entries: files, config: normalizedConfig(config),
    packages: normalizedPackages(sbom) };
  return { ...normalized, totalBytes, digest: hash(Buffer.from(JSON.stringify(normalized))) };
}

async function payloadEntries(scratch) {
  const entries = [];
  let bytes = 0;
  const decoder = new TextDecoder('utf-8', { fatal: true });
  async function visit(local, relative) {
    canonicalPath(relative);
    if (entries.length >= MAX_FILES) bad('payload file limit exceeded');
    const stat = await lstat(local);
    const mode = stat.mode & 0o7777;
    if (stat.isSymbolicLink()) {
      const target = await readlink(local);
      entries.push({ path: relative, kind: 'symlink', mode, target: safeLink(relative, target) });
    } else if (stat.isDirectory()) {
      entries.push({ path: relative, kind: 'directory', mode });
      const names = (await readdir(local, { encoding: 'buffer' }))
        .map(name => decoder.decode(name)).sort(compare);
      for (const name of names) {
        if (!name || name === '.' || name === '..' || name.includes('/') || name.includes('\\')) {
          bad('unsafe directory member');
        }
        await visit(join(local, name), `${relative}/${name}`);
      }
    } else if (stat.isFile()) {
      if (stat.size > MAX_FILE_BYTES || bytes + stat.size > MAX_BYTES) bad('payload byte limit exceeded');
      const handle = await open(local, 'r');
      let data;
      try { data = await handle.readFile(); } finally { await handle.close(); }
      if (data.length !== stat.size) bad('payload changed during collection');
      bytes += data.length;
      entries.push({ path: relative, kind: 'file', mode, size: data.length, sha256: hash(data) });
    } else bad('unsupported payload file type');
  }
  for (const root of ROOTS) await visit(join(scratch, root.slice(4)), root);
  return entries;
}

/** Collect the two complete payload trees from an unstarted container of the exact built image ID. */
export async function collectKiotaRuntimeManifest({ imageId, sbom, spawn = spawnSync }) {
  if (!IMAGE_ID.test(imageId ?? '') || typeof spawn !== 'function') bad('invalid image ID or spawn');
  if (process.platform !== 'linux' && spawn === spawnSync) {
    bad('a Linux host is required to preserve container POSIX modes');
  }
  const sbomBytes = Buffer.from(JSON.stringify(sbom, null, 2) + '\n');
  if (sbomBytes.length > 64 * 1024 * 1024) bad('SBOM byte limit exceeded');
  const properties = sbom?.metadata?.properties;
  const bindings = Array.isArray(properties)
    ? properties.filter(row => row?.name === 'stocksense:imageId') : [];
  if (bindings.length !== 1 || bindings[0].value !== imageId) {
    bad('SBOM is not bound to the image ID');
  }
  const sbomDigest = hash(sbomBytes);
  const run = (args, label, maxBuffer = 1024 * 1024) => {
    const result = spawn(docker, args, { encoding: 'utf8', shell: false, windowsHide: true,
      timeout: 5 * 60 * 1000, maxBuffer });
    if (!result || result.error || result.status !== 0 || typeof result.stdout !== 'string') {
      bad(`${label} failed`);
    }
    return result.stdout.trim();
  };
  const archiveSize = root => {
    const result = spawn(docker, ['cp', `${name}:/${root}`, '-'], { encoding: null,
      shell: false, windowsHide: true, timeout: 5 * 60 * 1000,
      maxBuffer: MAX_ARCHIVE_BYTES + 1 });
    if (!result || result.error || result.status !== 0 ||
        !Buffer.isBuffer(result.stdout) || result.stdout.length === 0 ||
        result.stdout.length > MAX_ARCHIVE_BYTES) bad(`bounded copy of ${root} failed`);
    return result.stdout.length;
  };
  const inspect = JSON.parse(run(['image', 'inspect', imageId, '--format', '{{json .}}'], 'image inspect'));
  if (inspect.Id !== imageId) bad('inspected image ID changed');
  const name = `stocksense-kiota-runtime-${randomUUID()}`;
  const scratch = await mkdtemp(join(tmpdir(), 'stocksense-kiota-runtime-'));
  let attemptedCreate = false;
  let failure;
  let manifest;
  try {
    attemptedCreate = true;
    const containerId = run(['create', '--name', name, '--network=none', imageId], 'container create');
    if (!/^[0-9a-f]{64}$/.test(containerId)) bad('container create returned invalid ID');
    const containerImage = run(['container', 'inspect', name, '--format', '{{.Image}}'],
      'container inspect');
    if (containerImage !== imageId) bad('container image ID changed');
    let archiveBytes = 0;
    for (const root of ROOTS) {
      archiveBytes += archiveSize(root);
      if (archiveBytes > MAX_ARCHIVE_BYTES) bad('payload archive byte limit exceeded');
      run(['cp', `${name}:/${root}`, join(scratch, root.slice(4))], `copy ${root}`);
    }
    manifest = { ...normalizeKiotaRuntimeManifest({ entries: await payloadEntries(scratch),
      config: inspect.Config, sbom }), imageId, sbomDigest };
  } catch (error) { failure = error; }
  const cleanup = [];
  if (attemptedCreate) {
    try { run(['rm', '--force', name], 'container cleanup'); }
    catch (error) { cleanup.push(error); }
  }
  try { await rm(scratch, { recursive: true, force: true }); }
  catch (error) { cleanup.push(error); }
  if (failure || cleanup.length) throw new AggregateError([...(failure ? [failure] : []), ...cleanup],
    'Kiota runtime collection or cleanup failed');
  return manifest;
}
