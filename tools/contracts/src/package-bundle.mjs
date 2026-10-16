import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { ContractError, assertSafePath, canonicalJson, digest, loadPackage,
  validatePackageManifest } from './package-loader.mjs';
import { inspectContent, LIMITS } from './preflight.mjs';

// This is a transport format for a validated candidate, not a release receipt.
// The artifact digest is deliberately detached: a file cannot contain its own hash.
const FORMAT = 'stocksense-candidate-bundle-v1';
const MAX_FILES = 4096;
const MAX_PATH_BYTES = 512;
export const MAX_ARTIFACT_BYTES = 48 * 1024 * 1024; // base64 and bounded JSON overhead for 32 MiB of inputs
const SHA256 = /^sha256:[0-9a-f]{64}$/;
const fail = (code, rule, message) => { throw new ContractError(code, rule, message); };
const own = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

function checkedPath(path) {
  assertSafePath(path);
  if (Buffer.byteLength(path) > MAX_PATH_BYTES || path.split('/').length > 32) {
    fail('BUNDLE_PATH_LIMIT', 'NFR10.1', 'Bundle path exceeds its portable bound');
  }
  return path;
}

function checkedPaths(paths) {
  if (!Array.isArray(paths) || !paths.length || paths.length > MAX_FILES) {
    fail('BUNDLE_FILE_LIMIT', 'NFR10.1', 'Bundle file count is outside its bound');
  }
  const seen = new Set();
  for (const path of paths) {
    checkedPath(path);
    // Case-fold collisions are ambiguous when the bundle is used on Windows.
    const portable = path.toLowerCase();
    if (seen.has(portable)) fail('DUPLICATE_PATH', 'BR1.1', 'Bundle paths collide on a portable filesystem');
    seen.add(portable);
  }
  if (!seen.has('manifest.json') || paths.some((path, index) => index && path <= paths[index - 1])) {
    fail('BUNDLE_ORDER', 'BR6.6', 'Bundle paths must be strictly sorted');
  }
}

async function snapshotPaths(root, current = '', files = []) {
  for (const item of await readdir(join(root, current), { withFileTypes: true })) {
    const path = current ? `${current}/${item.name}` : item.name;
    checkedPath(path);
    if (item.isSymbolicLink()) fail('SYMLINK', 'BR1.1', 'Package symlinks are prohibited');
    if (item.isDirectory()) await snapshotPaths(root, path, files);
    else if (item.isFile()) files.push(path);
    else fail('UNSAFE_FILE', 'BR1.1', 'Unsupported package file type');
    if (files.length > MAX_FILES) fail('BUNDLE_FILE_LIMIT', 'NFR10.1', 'Bundle file count exceeds its bound');
  }
  return files;
}

function manifestPaths(bytes) {
  const { manifest, paths: entries } = validatePackageManifest(bytes);
  if (manifest.manifestStatus !== 'candidate') {
    fail('BUNDLE_CANDIDATE', 'BR6.6', 'Bundle requires a candidate C01 manifest');
  }
  const paths = ['manifest.json', ...entries].sort();
  checkedPaths(paths);
  return { manifest, paths };
}

function checkManifestBindings(manifest, byPath) {
  for (const key of ['openapi', 'asyncapi', 'schemas', 'governedArtifacts']) {
    for (const entry of manifest[key]) {
      if (byPath.get(entry.document)?.sha256 !== entry.contentDigest) {
        fail('DIGEST_MISMATCH', 'BR6.6', 'Bundled source differs from C01 content digest');
      }
    }
  }
}

/**
 * Build a portable, deterministic in-memory bundle from an existing candidate.
 * No output path, clock, host path or release claim is encoded in the artifact.
 */
export async function buildPackageBundle(root) {
  const absolute = resolve(root);
  if (!(await lstat(absolute)).isDirectory()) fail('PACKAGE_ROOT', 'BR1.1', 'Package root is not a directory');
  const listed = (await snapshotPaths(absolute)).sort();
  checkedPaths(listed);
  const loaded = await loadPackage(absolute, {
    sourceByteLimit: LIMITS.sourceBytes,
    packageByteLimit: LIMITS.packageBytes,
    inspectBytes: (entry, bytes) => inspectContent(entry.document, bytes)
  });
  if (loaded.manifest.manifestStatus !== 'candidate') {
    fail('BUNDLE_CANDIDATE', 'BR6.6', 'Only validated candidate packages can be bundled');
  }
  const files = [];
  let totalBytes = 0;
  for (const path of listed) {
    const full = join(absolute, path);
    const stat = await lstat(full);
    if (!stat.isFile()) fail('UNSAFE_FILE', 'BR1.1', 'Bundle source must be a regular file');
    if (!(await realpath(full)).startsWith(absolute + sep)) {
      fail('UNSAFE_PATH', 'BR1.1', 'Bundle source escaped package root');
    }
    if (stat.size > LIMITS.sourceBytes) fail('SOURCE_SIZE_LIMIT', 'NFR10.1', 'Bundle source exceeds 1 MiB');
    if (totalBytes + stat.size > LIMITS.packageBytes) fail('PACKAGE_SIZE_LIMIT', 'NFR10.1', 'Bundle inputs exceed 32 MiB');
    const content = await readFile(full);
    if (content.length !== stat.size || !(await lstat(full)).isFile()) {
      fail('PACKAGE_CHANGED', 'BR6.6', 'Package changed while bundling');
    }
    inspectContent(path, content);
    totalBytes += content.length;
    if (totalBytes > LIMITS.packageBytes) fail('PACKAGE_SIZE_LIMIT', 'NFR10.1', 'Bundle inputs exceed 32 MiB');
    files.push({ path, size: content.length, sha256: digest(content), base64: content.toString('base64') });
  }
  const byPath = new Map(files.map(file => [file.path, file]));
  const manifestFile = byPath.get('manifest.json');
  if (!manifestFile) throw new ContractError('UNLISTED_FILE', 'BR1.1', 'Candidate package has no manifest');
  const manifestBytes = Buffer.from(manifestFile.base64, 'base64');
  const { manifest, paths } = manifestPaths(manifestBytes);
  if (canonicalJson(paths) !== canonicalJson(listed) || digest(manifestBytes) !== loaded.manifestDigest) {
    fail('PACKAGE_CHANGED', 'BR6.6', 'Package changed after candidate validation');
  }
  checkManifestBindings(manifest, byPath);
  // A final inventory check catches additions/removals during the byte snapshot.
  if (canonicalJson((await snapshotPaths(absolute)).sort()) !== canonicalJson(listed)) {
    fail('PACKAGE_CHANGED', 'BR6.6', 'Package inventory changed while bundling');
  }
  const bytes = Buffer.from(canonicalJson({ format: FORMAT, manifestDigest: loaded.manifestDigest, files }));
  if (bytes.length > MAX_ARTIFACT_BYTES) fail('BUNDLE_SIZE_LIMIT', 'NFR10.1', 'Encoded bundle exceeds 48 MiB');
  return bytes;
}

/**
 * Verify from the artifact bytes alone, before extraction or use. An optional
 * expectedDigest binds these bytes to a digest supplied by a trusted channel;
 * internal checks alone cannot authenticate who produced the artifact.
 * @param {Buffer} input
 * @param {{ expectedDigest?: string }} [options]
 */
export function verifyPackageBundle(input, { expectedDigest } = {}) {
  if (!Buffer.isBuffer(input) || input.length > MAX_ARTIFACT_BYTES || input.length === 0) {
    fail('BUNDLE_SIZE_LIMIT', 'NFR10.1', 'Bundle bytes are absent or exceed 48 MiB');
  }
  const artifactDigest = digest(input);
  if (expectedDigest !== undefined && (typeof expectedDigest !== 'string' || !SHA256.test(expectedDigest) || expectedDigest !== artifactDigest)) {
    fail('BUNDLE_DIGEST_MISMATCH', 'BR6.6', 'Bundle artifact digest differs from the expected digest');
  }
  let bundle;
  try { bundle = JSON.parse(input.toString('utf8')); }
  catch { fail('BUNDLE_FORMAT', 'BR6.6', 'Bundle is not valid JSON'); }
  if (!own(bundle, ['format', 'manifestDigest', 'files']) || bundle.format !== FORMAT || !SHA256.test(bundle.manifestDigest) ||
      !Array.isArray(bundle.files)) fail('BUNDLE_FORMAT', 'BR6.6', 'Unsupported bundle structure');
  checkedPaths(bundle.files.map(file => file?.path));
  for (const file of bundle.files) {
    if (!own(file, ['path', 'size', 'sha256', 'base64']) || !Number.isSafeInteger(file.size) || file.size < 0 ||
        file.size > LIMITS.sourceBytes || !SHA256.test(file.sha256) || typeof file.base64 !== 'string' ||
        file.base64.length > Math.ceil(LIMITS.sourceBytes / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.base64)) {
      fail('BUNDLE_FORMAT', 'BR6.6', 'Invalid bundle file encoding or size');
    }
  }
  if (!input.equals(Buffer.from(canonicalJson(bundle)))) {
    fail('BUNDLE_FORMAT', 'BR6.6', 'Bundle encoding is not canonical');
  }
  let totalBytes = 0;
  const files = new Map();
  const bindings = new Map();
  for (const file of bundle.files) {
    if (totalBytes + file.size > LIMITS.packageBytes) fail('PACKAGE_SIZE_LIMIT', 'NFR10.1', 'Bundle inputs exceed 32 MiB');
    const content = Buffer.from(file.base64, 'base64');
    if (content.length !== file.size || content.toString('base64') !== file.base64 || digest(content) !== file.sha256) {
      fail('DIGEST_MISMATCH', 'BR6.6', 'Bundled file bytes differ from declared hash or size');
    }
    inspectContent(file.path, content);
    totalBytes += content.length;
    files.set(file.path, content);
    bindings.set(file.path, file);
  }
  const manifestBytes = files.get('manifest.json');
  if (digest(manifestBytes) !== bundle.manifestDigest) {
    fail('DIGEST_MISMATCH', 'BR6.6', 'Bundled manifest digest differs');
  }
  const { manifest, paths } = manifestPaths(manifestBytes);
  if (canonicalJson(paths) !== canonicalJson([...files.keys()])) {
    fail('UNLISTED_FILE', 'BR1.1', 'Bundle file inventory differs from C01 manifest');
  }
  checkManifestBindings(manifest, bindings);
  return { artifactDigest, manifestDigest: bundle.manifestDigest, fileCount: files.size, totalBytes, files };
}
