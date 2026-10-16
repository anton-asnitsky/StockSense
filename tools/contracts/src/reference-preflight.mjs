import { lstat, readFile, realpath } from 'node:fs/promises';
import { join, posix, resolve, sep } from 'node:path';
import YAML from 'yaml';
import { ContractError, digest } from './package-loader.mjs';
import { LIMITS } from './preflight.mjs';

/** @returns {never} */
const fail = (code, ruleId, message) => { throw new ContractError(code, ruleId, message); };
const canonicalKinds = new Set(['openapi', 'asyncapi', 'schema']);
const referenceKeys = new Set(['$ref', '$dynamicRef', '$recursiveRef']);
const packageOrigin = 'https://stocksense-package.invalid/';
const pointerToken = key => String(key).replace(/~/g, '~0').replace(/\//g, '~1');

function parseCanonical(path, bytes) {
  try {
    if (path.endsWith('.json')) return JSON.parse(bytes.toString('utf8'));
    if (path.endsWith('.yaml') || path.endsWith('.yml')) {
      const document = YAML.parseDocument(bytes.toString('utf8'), { strict: true, uniqueKeys: true });
      if (document.errors.length) throw document.errors[0];
      return document.toJS({ maxAliasCount: 0 });
    }
  } catch {
    fail('SOURCE_PARSE', 'BR2.1', 'Canonical reference source is malformed');
  }
  fail('SOURCE_FORMAT', 'BR2.1', 'Canonical reference source must be JSON or YAML');
}

function checkedUri(value, base, isId = false, allowAbsolute = false) {
  if (typeof value !== 'string' || !value || /[\u0000-\u001f\\?]/.test(value) || value.startsWith('//')) {
    fail('REFERENCE_POLICY', 'NFR6.2', 'Reference or schema identity is malformed');
  }
  const path = value.split('#')[0];
  // Only the digest-bound package-id mapping below may admit an absolute URI;
  // the standards validator receives a materialized local reference instead.
  if (!isId && !allowAbsolute && /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)) {
    fail('REFERENCE_POLICY', 'NFR6.2', 'Absolute references require a pinned offline resolver');
  }
  const relativePath = path.startsWith('./') ? path.slice(2) : path;
  if (!isId && (value.split('#').length > 2 || /%/.test(path) || path.startsWith('/') ||
      relativePath.split('/').some(part => part === '..' || part === '.'))) {
    fail('REFERENCE_POLICY', 'NFR6.2', 'Reference path is unsafe');
  }
  let uri;
  try { uri = new URL(value, base); }
  catch { fail('REFERENCE_POLICY', 'NFR6.2', 'Reference URI is malformed'); }
  if (uri.protocol !== 'https:' || uri.username || uri.password || (isId && uri.hash)) {
    fail('REFERENCE_POLICY', 'NFR6.2', 'Only uncredentialed HTTPS identities are allowed');
  }
  return uri;
}

/** Count each declared $ref once and resolve it only to a digest-checked node. */
/** @param {{offlineReferences?: Array<{sourceDocument:string, referenceValue:string, localReference:string}>}} [options] */
export async function preflightCanonicalReferences(root, entries, options = {}) {
  const { offlineReferences = [] } = options;
  const captureOfflineReferences = Array.isArray(options.offlineReferences);
  const packageRoot = await realpath(resolve(root));
  const locations = new Map();
  const idRoots = new Map();
  const rootIds = new Map();
  const occurrences = [];
  const canonical = entries.filter(item => canonicalKinds.has(item.artifactKind));
  // Reserve physical identities first so a schema $id cannot claim another
  // document's URI regardless of manifest order.
  for (const entry of canonical) {
    const physicalId = new URL(entry.document, packageOrigin).href;
    if (idRoots.has(physicalId)) {
      fail('REFERENCE_ID_CONFLICT', 'NFR6.2', 'Two declared sources claim one physical identity');
    }
    idRoots.set(physicalId, entry.document + '#');
  }
  for (const entry of canonical) {
    const full = join(packageRoot, entry.document);
    const actual = await realpath(full);
    if (!actual.startsWith(packageRoot + sep) || !(await lstat(full)).isFile()) {
      fail('REFERENCE_POLICY', 'NFR6.2', 'Canonical source escaped the package');
    }
    const bytes = await readFile(full);
    if (bytes.length > LIMITS.sourceBytes) fail('SOURCE_SIZE_LIMIT', 'NFR10.1', 'Canonical source exceeds 1 MiB');
    if (entry.contentDigest && digest(bytes) !== entry.contentDigest) {
      fail('DIGEST_MISMATCH', 'BR1.1', 'A declared reference source digest does not match');
    }
    const document = parseCanonical(entry.document, bytes);
    const physicalId = new URL(entry.document, packageOrigin).href;
    const pending = [{ node: document, pointer: '', base: physicalId }];
    while (pending.length) {
      const current = pending.pop();
      if (!current) continue;
      const identity = entry.document + '#' + current.pointer;
      let base = current.base;
      if (current.node && typeof current.node === 'object' && !Array.isArray(current.node) &&
          Object.hasOwn(current.node, '$id')) {
        base = checkedUri(current.node.$id, base, true).href;
        const prior = idRoots.get(base);
        if (prior && prior !== identity) fail('REFERENCE_ID_CONFLICT', 'NFR6.2', 'Two package nodes claim one schema identity');
        idRoots.set(base, identity);
        if (!current.pointer && entry.artifactKind === 'schema' && entry.contentDigest) {
          rootIds.set(base, entry.document);
        }
      }
      locations.set(identity, { node: current.node, base });
      if (!current.node || typeof current.node !== 'object') continue;
      for (const [key, child] of Object.entries(current.node)) {
        if (referenceKeys.has(key)) {
          occurrences.push({ from: identity, base, value: child });
          if (occurrences.length > LIMITS.references) {
            fail('REFERENCE_LIMIT', 'NFR10.1', 'Package reference count exceeds 1024');
          }
        }
        pending.push({ node: child, pointer: current.pointer + '/' + pointerToken(key), base });
      }
    }
  }

  const edges = [];
  for (const occurrence of occurrences) {
    const absolute = typeof occurrence.value === 'string' && /^[A-Za-z][A-Za-z0-9+.-]*:/.test(occurrence.value);
    const target = checkedUri(occurrence.value, occurrence.base, false, absolute);
    const documentUri = target.href.slice(0, target.href.length - target.hash.length);
    const rootIdentity = idRoots.get(documentUri);
    // A semantic $id may name an HTTPS resource, but this runner does not
    // install an offline resolver into Redocly/AsyncAPI. Only fragment-local
    // uses of that identity are safe; a cross-document HTTPS lookup would
    // otherwise cause the validator to fetch a different body.
    if (!absolute && !documentUri.startsWith(packageOrigin) &&
        !(occurrence.value.startsWith('#') && rootIdentity?.split('#')[0] === occurrence.from.split('#')[0]) &&
        !(documentUri.startsWith('https://contracts.stocksense.local/') && rootIds.has(documentUri))) {
      fail('REFERENCE_POLICY', 'NFR6.2', 'Validator cannot resolve an external identity from the verified graph');
    }
    // Fragment-only references can also rebase under a nested $id. Compare
    // their semantic target with the file-relative target seen by validators.
    if (!absolute) {
      const physicalSource = new URL(occurrence.from.split('#')[0], packageOrigin);
      const physicalTarget = checkedUri(occurrence.value, physicalSource);
      const physicalDocumentUri = physicalTarget.href.slice(0, physicalTarget.href.length - physicalTarget.hash.length);
      const samePackageTarget = idRoots.get(physicalDocumentUri) === rootIdentity &&
        physicalTarget.hash === target.hash;
      if (physicalTarget.href !== target.href && !samePackageTarget) {
        fail('REFERENCE_TARGET_MISMATCH', 'NFR6.2', 'Schema base and validator file base select different targets');
      }
    }
    if (!rootIdentity) {
      if (documentUri.startsWith(packageOrigin)) fail('REFERENCE_TARGET', 'NFR6.2', 'Reference target is not declared');
      fail('REFERENCE_POLICY', 'NFR6.2', 'Reference is outside the declared package graph');
    }
    let fragment;
    try { fragment = decodeURIComponent(target.hash.slice(1)); }
    catch { fail('REFERENCE_POLICY', 'NFR6.2', 'Reference fragment is malformed'); }
    if (fragment && !fragment.startsWith('/')) fail('REFERENCE_POLICY', 'NFR6.2', 'Reference fragment is not a JSON pointer');
    const identity = rootIdentity + fragment;
    if (!locations.has(identity)) fail('REFERENCE_TARGET', 'NFR6.2', 'Reference pointer is absent from its declared target');
    if (absolute) {
      if (!captureOfflineReferences) {
        fail('REFERENCE_POLICY', 'NFR6.2', 'Absolute reference requires an offline materialization plan');
      }
      const targetDocument = rootIds.get(documentUri);
      if (!targetDocument || !documentUri.startsWith('https://contracts.stocksense.local/')) {
        fail('REFERENCE_POLICY', 'NFR6.2', 'Absolute reference has no digest-pinned package identity');
      }
      const sourceDocument = occurrence.from.split('#')[0];
      let localReference = posix.relative(posix.dirname(sourceDocument), targetDocument);
      if (!localReference.startsWith('.')) localReference = './' + localReference;
      offlineReferences.push({ sourceDocument, referenceValue: occurrence.value, localReference: localReference + target.hash });
    }
    edges.push({ from: occurrence.from, to: identity });
  }

  // Memoize target bodies. Incoming occurrences are charged above; they do
  // not multiply the internal references of a previously scanned target.
  const memo = new Map();
  const active = new Set();
  function depthFrom(identity) {
    if (active.has(identity)) fail('REFERENCE_CYCLE', 'NFR10.1', 'Recursive reference detected');
    if (memo.has(identity)) return memo.get(identity);
    active.add(identity);
    const [path, pointer] = identity.split('#');
    let depth = 0;
    for (const edge of edges) {
      const [sourcePath, sourcePointer] = edge.from.split('#');
      if (sourcePath !== path || (pointer && sourcePointer !== pointer && !sourcePointer.startsWith(pointer + '/'))) continue;
      depth = Math.max(depth, 1 + depthFrom(edge.to));
      if (depth > LIMITS.referenceDepth) fail('REFERENCE_DEPTH_LIMIT', 'NFR10.1', 'Reference nesting exceeds 32');
    }
    active.delete(identity);
    memo.set(identity, depth);
    return depth;
  }
  for (const entry of canonical) depthFrom(entry.document + '#');
  return occurrences.length;
}
