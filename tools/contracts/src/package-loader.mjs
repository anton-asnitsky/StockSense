import { createHash } from 'node:crypto';
import { lstat, readFile, realpath, readdir } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';

export class ContractError extends Error {
  constructor(code, ruleId, message) {
    super(message);
    this.name = 'ContractError';
    this.code = code;
    this.ruleId = ruleId;
  }
}

export const digest = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
export const canonicalJson = value => {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalJson(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
};

const fail = (code, rule, message) => { throw new ContractError(code, rule, message); };
const boundary = /^C(0[1-9]|1[0-9]|2[0-7])$/;
const version = /^[1-9][0-9]*\.[0-9]+\.[0-9]+$/;
const sha = /^sha256:[0-9a-f]{64}$/;
const revision = /^[0-9a-f]{40}([0-9a-f]{24})?$/;
const safePath = /^[A-Za-z0-9._/-]+$/;
const kinds = new Set(['contract-package-policy', 'example-fixture', 'generation-profile', 'generated-output-manifest', 'compatibility-assessment', 'validation-run', 'evidence-record', 'protocol-compatibility-manifest', 'messaging-conformance-profile', 'recovery-policy']);
// The enforced matrix. A package's own contract-package-policy.json is checked
// against these values so a declared policy can never claim a weaker rule set.
export const CANONICAL_KINDS = Object.freeze({
  schema: 'C01 C02 C05 C07 C08 C09 C15 C16 C17 C19 C20 C21 C22 C23',
  openapi: 'C03 C04 C05 C06 C07 C09 C10 C11 C12 C13 C14 C17 C18 C24 C26',
  asyncapi: 'C03 C07 C15 C23 C25 C27'
});
const canonicalKinds = CANONICAL_KINDS;
export const FIXED_PATHS = Object.freeze({
  C01: ['common/v1/message-envelope.schema.json', 'common/v1/global-identity-audit-envelope.schema.json'],
  C05: ['common/v1/supplier-authority-head.shared-schema.yaml'],
  C07: ['model-lifecycle/v1/finalize-heavy-work.shared-schema.yaml', 'supplier-knowledge/v1/embedding-build-quiesced.asyncapi.yaml'],
  C09: ['common/v1/supplier-authority-head.shared-schema.yaml'],
  C15: ['common/v1/global-identity-audit-envelope.schema.json']
});
const fixedPaths = FIXED_PATHS;
export const BOUNDARY_SIDECARS = Object.freeze({ C01: 'contract-package-policy', C22: 'protocol-compatibility-manifest', C23: 'messaging-conformance-profile', C24: 'recovery-policy', C25: 'recovery-policy', C26: 'recovery-policy', C27: 'recovery-policy' });
const byBoundary = BOUNDARY_SIDECARS;
export const ALL_BOUNDARIES = Object.freeze(Array.from({ length: 27 }, (_, i) => 'C' + String(i + 1).padStart(2, '0')));
const allBoundaries = ALL_BOUNDARIES;

export function assertSafePath(path) {
  if (typeof path !== 'string' || !safePath.test(path) || path.startsWith('/') || path.includes('\\') ||
      path.split('/').some(part => !part || part === '.' || part === '..') || path.includes('//')) {
    fail('UNSAFE_PATH', 'BR1.5', 'A package path must be a safe relative slash path');
  }
  return path;
}

export function deriveIdentity(kind, owner, path, semanticVersion, contentDigest) {
  const logicalId = digest(Buffer.from(['logical', kind, owner, assertSafePath(path)].join('\0')));
  const revisionId = digest(Buffer.from(['revision', logicalId, semanticVersion, contentDigest].join('\0')));
  return { logicalId, revisionId };
}

function validateEntry(entry, kind, sourceRevision) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) fail('MANIFEST_SHAPE', 'BR1.1', 'Invalid manifest entry');
  const ownerKey = kind === 'openapi' ? 'provider' : kind === 'asyncapi' ? 'producer' : 'owner';
  const keys = kind === 'sidecar' ? ['kind', 'owner', 'boundaryIds', 'document', 'semanticVersion', 'contentDigest', 'sourceRevision'] :
    [ownerKey, 'boundaryIds', 'document', 'semanticVersion', 'contentDigest'];
  if (Object.keys(entry).some(key => !keys.includes(key)) || keys.some(key => !(key in entry))) fail('MANIFEST_SHAPE', 'BR1.1', 'Manifest entry fields do not match C01');
  if (typeof entry[ownerKey] !== 'string' || !entry[ownerKey].trim() || !version.test(entry.semanticVersion) || !sha.test(entry.contentDigest)) {
    fail('MANIFEST_SHAPE', 'BR1.1', 'Invalid owner, version or digest');
  }
  if (!Array.isArray(entry.boundaryIds) || !entry.boundaryIds.length ||
      new Set(entry.boundaryIds).size !== entry.boundaryIds.length || entry.boundaryIds.some(id => !boundary.test(id))) {
    fail('MANIFEST_SHAPE', 'BR1.1', 'Invalid boundary IDs');
  }
  if (kind === 'sidecar' && (!kinds.has(entry.kind) || entry.sourceRevision !== sourceRevision)) {
    fail('SOURCE_REVISION', 'BR1.6', 'Unknown sidecar kind or source revision mismatch');
  }
  assertSafePath(entry.document);
  return { ...entry, artifactKind: kind, semanticOwner: entry[ownerKey],
    ...deriveIdentity(kind === 'sidecar' ? entry.kind : kind, entry[ownerKey], entry.document, entry.semanticVersion, entry.contentDigest),
    manifestEntryDigest: digest(Buffer.from(canonicalJson(entry))) };
}

async function enumerate(root, current = '', files = []) {
  for (const dirent of await readdir(join(root, current), { withFileTypes: true })) {
    const relative = current ? current + '/' + dirent.name : dirent.name;
    assertSafePath(relative);
    if (dirent.isSymbolicLink()) fail('SYMLINK', 'BR1.5', 'Package symlinks are prohibited');
    if (dirent.isDirectory()) await enumerate(root, relative, files);
    else if (dirent.isFile()) files.push(relative);
    else fail('UNSAFE_FILE', 'BR1.5', 'Unsupported package file type');
  }
  return files;
}

function validateCoverage(manifest, entries) {
  const rows = manifest.boundaryCoverage;
  if (!Array.isArray(rows) || !rows.length || rows.length > 27 || new Set(rows.map(row => row.boundaryId)).size !== rows.length) {
    fail('BOUNDARY_INVENTORY', 'BR1.3', 'Boundary inventory is missing or duplicated');
  }
  if (manifest.manifestStatus === 'release' && (rows.length !== 27 || allBoundaries.some(id => !rows.some(row => row.boundaryId === id)))) {
    fail('INCOMPLETE_RELEASE', 'BR1.3', 'Release requires C01-C27');
  }
  for (const row of rows) {
    if (!row || !boundary.test(row.boundaryId) ||
      Object.keys(row).some(key => !['boundaryId', 'canonicalDocuments', 'sidecars'].includes(key))) fail('BOUNDARY_INVENTORY', 'BR1.3', 'Invalid boundary row');
    if (!Array.isArray(row.canonicalDocuments) || !row.canonicalDocuments.length ||
        !Array.isArray(row.sidecars) || !row.sidecars.length ||
        new Set(row.canonicalDocuments).size !== row.canonicalDocuments.length ||
        new Set(row.sidecars).size !== row.sidecars.length ||
        [...row.canonicalDocuments, ...row.sidecars].some(path => typeof path !== 'string')) {
      fail('BOUNDARY_INVENTORY', 'BR1.3', 'Boundary row paths must be unique nonempty arrays');
    }
    const matching = entries.filter(entry => entry.boundaryIds.includes(row.boundaryId));
    const canonical = matching.filter(entry => entry.artifactKind !== 'sidecar').map(entry => entry.document).sort();
    const sidecars = matching.filter(entry => entry.artifactKind === 'sidecar').map(entry => entry.document).sort();
    if (canonical.length === 0 || sidecars.length === 0 || canonicalJson(canonical) !== canonicalJson([...row.canonicalDocuments].sort()) ||
      canonicalJson(sidecars) !== canonicalJson([...row.sidecars].sort())) fail('BOUNDARY_INVENTORY', 'BR1.3', 'Coverage row differs from included entries');
    for (const [kind, ids] of Object.entries(canonicalKinds)) {
      if (ids.split(' ').includes(row.boundaryId) && !matching.some(entry => entry.artifactKind === kind)) {
        fail('REQUIRED_KIND', 'BR1.4', 'A required canonical kind is absent');
      }
    }
    for (const path of fixedPaths[row.boundaryId] ?? []) {
      if (!canonical.includes(path)) fail('REQUIRED_PATH', 'BR1.4', 'A fixed canonical path is absent');
    }
    const requiredSidecars = ['example-fixture', ...(manifest.manifestStatus === 'release' ?
      ['compatibility-assessment', 'validation-run', 'evidence-record'] : []), ...(byBoundary[row.boundaryId] ? [byBoundary[row.boundaryId]] : [])];
    for (const kind of requiredSidecars) if (!matching.some(entry => entry.artifactKind === 'sidecar' && entry.kind === kind)) {
      fail('REQUIRED_SIDECAR', 'BR1.4', 'A required sidecar kind is absent');
    }
    if (matching.some(entry => entry.artifactKind !== 'sidecar') && !matching.some(entry => entry.kind === 'generation-profile')) {
      fail('REQUIRED_SIDECAR', 'BR1.4', 'A generation profile is absent');
    }
  }
  for (const entry of entries) if (entry.boundaryIds.some(id => !rows.some(row => row.boundaryId === id))) {
    fail('BOUNDARY_INVENTORY', 'BR1.3', 'An entry names an undeclared boundary');
  }
}

export async function loadPackage(root, options = {}) {
  const absolute = resolve(root);
  if (!(await lstat(absolute)).isDirectory()) fail('PACKAGE_ROOT', 'BR1.1', 'Package root is not a directory');
  const manifestPath = join(absolute, 'manifest.json');
  const manifestStat = await lstat(manifestPath);
  if (!manifestStat.isFile()) fail('UNSAFE_FILE', 'BR1.5', 'Manifest must be a regular file');
  if (options.sourceByteLimit && manifestStat.size > options.sourceByteLimit) fail('SOURCE_SIZE_LIMIT', 'NFR10.1', 'Manifest exceeds source limit');
  if (options.packageByteLimit && manifestStat.size > options.packageByteLimit) fail('PACKAGE_SIZE_LIMIT', 'NFR10.1', 'Package exceeds 32 MiB');
  const manifestBytes = await readFile(manifestPath);
  let manifest;
  try { manifest = JSON.parse(manifestBytes.toString('utf8')); } catch { fail('MANIFEST_PARSE', 'BR1.1', 'Manifest JSON is invalid'); }
  const topKeys = ['packageVersion', 'manifestStatus', 'sourceRevision', 'openapi', 'asyncapi', 'schemas', 'governedArtifacts', 'boundaryCoverage'];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest) ||
      Object.keys(manifest).some(key => !topKeys.includes(key)) || topKeys.some(key => !(key in manifest)) ||
      !/^1\.[0-9]+\.[0-9]+$/.test(manifest.packageVersion) || !['candidate', 'release'].includes(manifest.manifestStatus) ||
      !revision.test(manifest.sourceRevision)) fail('MANIFEST_SHAPE', 'BR1.1', 'Manifest does not match C01 1.x');
  const entries = [];
  for (const [array, kind] of [['openapi', 'openapi'], ['asyncapi', 'asyncapi'], ['schemas', 'schema'], ['governedArtifacts', 'sidecar']]) {
    if (!Array.isArray(manifest[array])) fail('MANIFEST_SHAPE', 'BR1.1', 'Manifest arrays are required');
    for (const entry of manifest[array]) entries.push(validateEntry(entry, kind, manifest.sourceRevision));
  }
  const paths = entries.map(entry => entry.document);
  if (new Set(paths).size !== paths.length) fail('DUPLICATE_PATH', 'BR1.2', 'Manifest paths must be unique');
  if (new Set(entries.map(entry => entry.logicalId)).size !== entries.length) fail('DUPLICATE_LOGICAL_ID', 'BR1.2', 'One package cannot bind two revisions of a logical contract');
  validateCoverage(manifest, entries);
  const actualFiles = await enumerate(absolute);
  if (canonicalJson(actualFiles.sort()) !== canonicalJson(['manifest.json', ...paths].sort())) fail('UNLISTED_FILE', 'BR1.5', 'Package file inventory does not match manifest');
  let totalBytes = manifestBytes.length;
  for (const entry of entries) {
    const full = join(absolute, entry.document);
    const canonical = await realpath(full);
    if (!canonical.startsWith(absolute + sep)) fail('UNSAFE_PATH', 'BR1.5', 'Resolved path escaped package root');
    const fileStat = await lstat(full);
    if (!fileStat.isFile()) fail('UNSAFE_FILE', 'BR1.5', 'Package entry must be a regular file');
    if (options.sourceByteLimit && fileStat.size > options.sourceByteLimit) fail('SOURCE_SIZE_LIMIT', 'NFR10.1', 'Source exceeds 1 MiB');
    if (options.packageByteLimit && totalBytes + fileStat.size > options.packageByteLimit) fail('PACKAGE_SIZE_LIMIT', 'NFR10.1', 'Package exceeds 32 MiB');
    const bytes = await readFile(full);
    totalBytes += bytes.length;
    if (options.packageByteLimit && totalBytes > options.packageByteLimit) fail('PACKAGE_SIZE_LIMIT', 'NFR10.1', 'Package exceeds 32 MiB');
    if (digest(bytes) !== entry.contentDigest) fail('DIGEST_MISMATCH', 'BR1.6', 'A declared content digest does not match');
    if (options.inspectBytes) options.inspectBytes(entry, bytes);
  }
  return Object.freeze({ manifest: Object.freeze(manifest), entries: Object.freeze(entries), manifestDigest: digest(manifestBytes),
    totalBytes, boundaryIds: Object.freeze(manifest.boundaryCoverage.map(row => row.boundaryId)),
    releaseReady: manifest.manifestStatus === 'release' && manifest.boundaryCoverage.length === 27 });
}
