import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020Module from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';
import YAML from 'yaml';

const Ajv2020 = /** @type {any} */ (Ajv2020Module);
const addFormats = /** @type {any} */ (addFormatsModule);
const DIALECT = 'https://json-schema.org/draft/2020-12/schema';
const PAYLOAD_FORMAT = 'application/schema+json;version=draft-2020-12';
const PHYSICAL_ORIGIN = 'https://stocksense-package.invalid/';
const OTHER_CANONICAL = new Set(['typed-port', 'governed-record', 'vault-kv-authority-head']);
const SHA = /^sha256:[0-9a-f]{64}$/;
const SAFE_PATH = /^[A-Za-z0-9._/-]+$/;
const REFERENCES = new Set(['$ref', '$dynamicRef', '$recursiveRef']);
/** @returns {never} */
const invalid = () => { throw new Error('Verified schema graph failed validation'); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const safePath = value => typeof value === 'string' && SAFE_PATH.test(value) && !value.startsWith('/') &&
  value.split('/').every(part => part && part !== '.' && part !== '..');
const digest = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');

function checkedId(value, base) {
  if (typeof value !== 'string' || !value || /[\x00-\x1f\\?]/.test(value) || value.startsWith('//')) invalid();
  let uri;
  try { uri = new URL(value, base); }
  catch { invalid(); }
  if (uri.protocol !== 'https:' || uri.username || uri.password || uri.search || uri.hash) invalid();
  return uri.href;
}

function checkedReference(value, base, identities, physical) {
  if (typeof value !== 'string' || !value || /[\x00-\x1f\\?]/.test(value) || value.startsWith('//')) invalid();
  if (value.startsWith('#')) return value;
  let uri;
  try { uri = new URL(value, base); }
  catch { invalid(); }
  if (uri.protocol !== 'https:' || uri.username || uri.password || uri.search) invalid();
  const documentId = uri.href.slice(0, uri.href.length - uri.hash.length);
  const target = physical.get(documentId) ?? (identities.has(documentId) ? documentId : undefined);
  if (!target) invalid();
  return target + uri.hash;
}

function parseDocument(path, bytes) {
  try {
    const source = bytes.toString('utf8');
    if (Buffer.byteLength(source, 'utf8') !== bytes.length || source.includes('\0')) invalid();
    if (path.endsWith('.json')) return JSON.parse(source);
    if (path.endsWith('.yaml') || path.endsWith('.yml')) {
      const document = YAML.parseDocument(source, { strict: true, uniqueKeys: true });
      if (document.errors.length) invalid();
      return document.toJS({ maxAliasCount: 0 });
    }
  } catch { invalid(); }
  invalid();
}

async function checkedFile(root, entry) {
  if (!object(entry) || !safePath(entry.document) || typeof entry.digest !== 'string' || !SHA.test(entry.digest)) invalid();
  const path = resolve(root, ...entry.document.split('/'));
  const within = relative(root, path);
  if (!within || within === '..' || within.startsWith('..' + sep)) invalid();
  const stat = await lstat(path).catch(invalid);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1_048_576 || await realpath(path).catch(invalid) !== path) invalid();
  const bytes = await readFile(path).catch(invalid);
  if (bytes.length > 1_048_576 || digest(bytes) !== entry.digest) invalid();
  return parseDocument(entry.document, bytes);
}

function registerIds(node, base, owner, identities, path = '') {
  if (!node || typeof node !== 'object') return;
  let effective = base;
  if (object(node) && Object.hasOwn(node, '$id')) {
    effective = checkedId(node.$id, base);
    const location = owner + '#' + path;
    if (identities.has(effective) && identities.get(effective) !== location) invalid();
    identities.set(effective, location);
  }
  for (const [key, child] of Object.entries(node)) {
    if (key !== '$id') registerIds(child, effective, owner, identities, path + '/' + key);
  }
}

function bindReferences(node, base, identities, physical) {
  if (!node || typeof node !== 'object') return;
  const effective = object(node) && Object.hasOwn(node, '$id') ? checkedId(node.$id, base) : base;
  for (const [key, child] of Object.entries(node)) {
    if (REFERENCES.has(key)) node[key] = checkedReference(child, effective, identities, physical);
    else if (key !== '$id') bindReferences(child, effective, identities, physical);
  }
}

function payloadsIn(source) {
  const payloads = [];
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (object(node) && Object.hasOwn(node, 'payload')) {
      const payload = node.payload;
      if (object(payload) && (Object.hasOwn(payload, 'schemaFormat') || Object.hasOwn(payload, 'schema'))) {
        if (payload.schemaFormat !== PAYLOAD_FORMAT || !object(payload.schema)) invalid();
        payloads.push(payload.schema);
      }
    }
    for (const child of Object.values(node)) walk(child);
  }
  walk(source);
  if (!payloads.length) invalid();
  return payloads;
}

/**
 * Pure worker logic for focused tests. Production calls this only from the
 * digest-pinned image, where /workspace and /config are read-only mounts.
 * @param {{root:string,indexPath:string,sourceDocument:string,mode:'schema:2020-12'|'asyncapi-payloads:2020-12'}} options
 */
export async function validateSchemaGraph({ root, indexPath, sourceDocument, mode }) {
  try {
  if (!['schema:2020-12', 'asyncapi-payloads:2020-12'].includes(mode) || !safePath(sourceDocument)) invalid();
  const graphRoot = await realpath(root).catch(invalid);
  const indexStat = await lstat(indexPath).catch(invalid);
  if (!indexStat.isFile() || indexStat.size > 1_048_576) invalid();
  let index;
  try { index = JSON.parse(await readFile(indexPath, 'utf8')); }
  catch { invalid(); }
  if (!object(index) || Object.keys(index).sort().join(',') !== 'schemas,source,version' ||
      index.version !== 1 || !Array.isArray(index.schemas) || index.schemas.length > 4096 ||
      !object(index.source) || index.source.document !== sourceDocument ||
      index.source.artifactKind !== (mode === 'schema:2020-12' ? 'schema' : 'asyncapi')) invalid();
  const seen = new Set();
  const entries = [];
  for (const entry of index.schemas) {
    if (!object(entry) || seen.has(entry.document)) invalid();
    seen.add(entry.document);
    const source = await checkedFile(graphRoot, entry);
    if (!object(source)) invalid();
    if (source.$schema !== DIALECT) {
      if (Object.hasOwn(source, '$schema') || !OTHER_CANONICAL.has(source.kind)) invalid();
      continue;
    }
    if (Object.hasOwn(source, 'dialect')) invalid();
    const physicalId = new URL(entry.document, PHYSICAL_ORIGIN).href;
    const id = Object.hasOwn(source, '$id') ? checkedId(source.$id, physicalId) : physicalId;
    entries.push({ document: entry.document, source, physicalId, id });
  }
  if (mode === 'schema:2020-12' && (!entries.some(entry => entry.document === sourceDocument) ||
      index.schemas.find(entry => entry.document === sourceDocument)?.digest !== index.source.digest)) invalid();
  const identities = new Map();
  const physical = new Map();
  for (const entry of entries) {
    if (physical.has(entry.physicalId)) invalid();
    physical.set(entry.physicalId, entry.id);
    identities.set(entry.physicalId, entry.document + '#');
  }
  for (const entry of entries) registerIds(entry.source, entry.physicalId, entry.document, identities);
  const ajv = new Ajv2020({ strict: true, allErrors: true, validateFormats: true, logger: false });
  addFormats(ajv);
  for (const entry of entries) {
    bindReferences(entry.source, entry.physicalId, identities, physical);
    if (Object.hasOwn(entry.source, '$id')) entry.source.$id = entry.id;
    ajv.addSchema(entry.source, entry.id);
  }
  for (const entry of entries) {
    if (!ajv.getSchema(entry.id)) invalid();
  }
  if (mode === 'schema:2020-12') return { valid: true, compiled: entries.length };
  const asyncSource = await checkedFile(graphRoot, index.source);
  if (!object(asyncSource) || asyncSource.asyncapi !== '3.0.0' || Object.hasOwn(asyncSource, 'openapi')) invalid();
  const base = new URL(sourceDocument, PHYSICAL_ORIGIN).href;
  const payloads = payloadsIn(asyncSource);
  for (const [index, payload] of payloads.entries()) {
    registerIds(payload, base, sourceDocument + '/payload/' + index, identities);
    bindReferences(payload, base, identities, physical);
    if (Object.hasOwn(payload, '$id')) payload.$id = checkedId(payload.$id, base);
    ajv.compile(payload);
  }
  return { valid: true, compiled: entries.length + payloads.length };
  } catch { invalid(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, sourceDocument, extra] = process.argv.slice(2);
  if (extra !== undefined || !sourceDocument ||
      (mode !== 'schema:2020-12' && mode !== 'asyncapi-payloads:2020-12')) process.exitCode = 2;
  else validateSchemaGraph({ root: '/workspace', indexPath: '/config/schema-index.json', sourceDocument, mode })
    .then(() => { process.stdout.write('VALID\n'); })
    .catch(() => { process.exitCode = 2; });
}
