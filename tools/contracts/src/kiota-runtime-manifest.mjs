import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, posix } from 'node:path';
import { readContainerTarManifest } from './container-tar-manifest.mjs';

const SCHEMA = 'stocksense-kiota-runtime-v1';
const IMAGE_ID = /^sha256:[0-9a-f]{64}$/;
const ROOTS = ['rootfs'];
const MAX_FILES = 100_000;
const MAX_BYTES = 1024 * 1024 * 1024;
const MAX_FILE_BYTES = 512 * 1024 * 1024;
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
      /^[A-Za-z]:/.test(target)) bad('unsafe symlink target');
  const root = 'rootfs';
  const resolved = target.startsWith('/')
    ? posix.normalize(`${root}${target}`)
    : posix.normalize(posix.join(posix.dirname(path), target));
  if (!root || resolved !== root && !resolved.startsWith(`${root}/`)) bad('symlink escapes payload root');
  return target;
}

function normalizedConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) bad('missing image Config');
  const canonical = (value, depth = 0) => {
    if (depth > 16) bad('image Config nesting limit exceeded');
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.length <= 8192 && !value.includes('\0')) return value;
    if (Array.isArray(value) && value.length <= 512) {
      return value.map(item => canonical(item, depth + 1));
    }
    if (value && typeof value === 'object' && !Array.isArray(value) &&
        Object.keys(value).length <= 512) {
      return Object.fromEntries(Object.keys(value).sort(compare).map(key => {
        if (!key || key.length > 256 || key.includes('\0')) bad('invalid image Config key');
        return [key, canonical(value[key], depth + 1)];
      }));
    }
    bad('invalid image Config value');
  };
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
  const complete = canonical(config);
  complete.Entrypoint = args('Entrypoint');
  complete.Cmd = args('Cmd');
  complete.Env = env;
  return canonical(complete);
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
    const uid = entry.uid ?? 0;
    const gid = entry.gid ?? 0;
    if (![uid, gid].every(value => Number.isSafeInteger(value) && value >= 0)) {
      bad('invalid payload ownership');
    }
    const common = { path, kind: entry.kind, mode: entry.mode, uid, gid };
    if (entry.kind === 'directory') return common;
    if (entry.kind === 'symlink') return { ...common,
      target: safeLink(path, entry.target) };
    if (entry.kind === 'hardlink') return { ...common,
      target: canonicalPath(entry.target) };
    if (entry.kind === 'character-device' || entry.kind === 'block-device') {
      if (![entry.major, entry.minor].every(value => Number.isSafeInteger(value) && value >= 0)) {
        bad('invalid device number');
      }
      return { ...common, major: entry.major, minor: entry.minor };
    }
    if (entry.kind === 'fifo') return common;
    if (entry.kind !== 'file' || !IMAGE_ID.test(entry.sha256 ?? '') ||
        !Number.isSafeInteger(entry.size) || entry.size < 0 || entry.size > MAX_FILE_BYTES) {
      bad('invalid regular file entry');
    }
    totalBytes += entry.size;
    if (totalBytes > MAX_BYTES) bad('payload byte limit exceeded');
    return { ...common, size: entry.size, sha256: entry.sha256 };
  }).sort((a, b) => compare(a.path, b.path));
  for (const root of ROOTS) {
    if (!files.some(entry => entry.path === root && entry.kind === 'directory')) bad('missing payload root');
  }
  for (const entry of files) {
    if (ROOTS.includes(entry.path)) continue;
    const parent = posix.dirname(entry.path);
    if (!files.some(item => item.path === parent && item.kind === 'directory')) bad('missing payload parent');
    if (entry.kind === 'hardlink' && !files.some(item => item.path === entry.target &&
        item.kind === 'file')) bad('hardlink target is not a regular file');
  }
  const normalized = { schema: SCHEMA, entries: files, config: normalizedConfig(config),
    packages: normalizedPackages(sbom) };
  return { ...normalized, totalBytes, digest: hash(Buffer.from(JSON.stringify(normalized))) };
}

/** Collect the complete final filesystem from an unstarted exact-image container. */
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
  const inspect = JSON.parse(run(['image', 'inspect', imageId, '--format', '{{json .}}'], 'image inspect'));
  if (inspect.Id !== imageId || !Number.isSafeInteger(inspect.Size) ||
      inspect.Size <= 0 || inspect.Size > MAX_BYTES) bad('inspected image ID or size is invalid');
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
    const archive = join(scratch, 'rootfs.tar');
    run(['export', '--output', archive, name], 'export complete image filesystem');
    manifest = { ...normalizeKiotaRuntimeManifest({ entries: await readContainerTarManifest(archive),
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
