import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { ALL_BOUNDARIES, CANONICAL_KINDS, ContractError, assertSafePath, digest } from './package-loader.mjs';
import { assertSourcesCommitted, resolveSourceRevision, verifySourceBinding } from './provenance.mjs';

const kindOf = path => {
  if (path.endsWith('.openapi.yaml')) return 'openapi';
  if (path.endsWith('.asyncapi.yaml')) return 'asyncapi';
  if (path.endsWith('.schema.json') || path.endsWith('.shared-schema.yaml')) return 'schema';
  throw new ContractError('CATALOGUE_KIND', 'BR1.3', 'Canonical source has an unsupported kind');
};

async function sourcePaths(root, prefix = '') {
  const paths = [];
  for (const item of await readdir(join(root, prefix), { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${item.name}` : item.name;
    assertSafePath(relative);
    if (item.isDirectory()) paths.push(...await sourcePaths(root, relative));
    else if (item.isFile()) paths.push(relative);
    else throw new ContractError('CATALOGUE_FILE', 'BR1.1', 'Canonical source must be a regular file');
  }
  return paths.sort();
}

/** Inventory real, committed canonical bytes before adding governed package sidecars. */
export async function buildSourceInventory(repoRoot) {
  const root = resolve(repoRoot);
  const mapBytes = await readFile(join(root, 'contracts/catalogue/v1/boundary-sources.json'));
  let map;
  try { map = JSON.parse(mapBytes.toString('utf8')); }
  catch { throw new ContractError('CATALOGUE_PARSE', 'BR1.1', 'Boundary-source inventory is malformed'); }
  if (!map || typeof map !== 'object' || Array.isArray(map) ||
      JSON.stringify(Object.keys(map)) !== JSON.stringify(ALL_BOUNDARIES)) {
    throw new ContractError('CATALOGUE_BOUNDARIES', 'BR1.1', 'Boundary-source inventory must cover C01-C27 in order');
  }
  const pathBoundaries = new Map();
  for (const id of ALL_BOUNDARIES) {
    const paths = map[id];
    if (!Array.isArray(paths) || !paths.length || new Set(paths).size !== paths.length) {
      throw new ContractError('CATALOGUE_BOUNDARIES', 'BR1.1', 'Each boundary needs distinct canonical sources');
    }
    for (const path of paths) {
      assertSafePath(path);
      const ids = pathBoundaries.get(path) ?? [];
      ids.push(id);
      pathBoundaries.set(path, ids);
    }
  }
  const actual = await sourcePaths(join(root, 'contracts/source'));
  const listed = [...pathBoundaries.keys()].sort();
  if (JSON.stringify(actual) !== JSON.stringify(listed)) {
    throw new ContractError('CATALOGUE_FILES', 'BR1.1', 'Boundary-source inventory differs from canonical source files');
  }
  for (const id of ALL_BOUNDARIES) {
    for (const [kind, ids] of Object.entries(CANONICAL_KINDS)) {
      if (ids.split(' ').includes(id) && !map[id].some(path => kindOf(path) === kind)) {
        throw new ContractError('CATALOGUE_KIND', 'BR1.3', 'A boundary lacks its required canonical kind');
      }
    }
  }
  const sourcePathsAtRoot = listed.map(path => `contracts/source/${path}`);
  assertSourcesCommitted(root, sourcePathsAtRoot);
  const sourceRevision = resolveSourceRevision(root, sourcePathsAtRoot);
  const entries = await Promise.all(listed.map(async document => ({
    document,
    boundaryIds: pathBoundaries.get(document),
    artifactKind: kindOf(document),
    contentDigest: digest(await readFile(join(root, 'contracts/source', document)))
  })));
  verifySourceBinding(root, sourceRevision, entries.map(entry => ({
    sourcePath: `contracts/source/${entry.document}`, contentDigest: entry.contentDigest
  })));
  return Object.freeze({ sourceRevision, mapDigest: digest(mapBytes), entries: Object.freeze(entries) });
}
