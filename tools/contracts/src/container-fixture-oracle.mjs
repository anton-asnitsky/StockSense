import { createHash } from 'node:crypto';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContractError, assertSafePath, deriveIdentity } from './package-loader.mjs';
import { runFixtureOracle } from './policy.mjs';

const SHA = /^sha256:[0-9a-f]{64}$/;
const VERSION = /^[1-9][0-9]*\.[0-9]+\.[0-9]+$/;
const KINDS = new Set(['schema', 'openapi', 'asyncapi', 'sidecar']);
const CANONICAL = new Set(['schema', 'openapi', 'asyncapi']);
const digest = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
class GraphError extends Error {}
/** @returns {never} */
const rejectGraph = () => { throw new GraphError('Verified fixture graph is invalid'); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function checkedPath(path) {
  try { assertSafePath(path); }
  catch { rejectGraph(); }
}

async function verifyGraph(root, index) {
  if (!object(index) || Object.keys(index).sort().join(',') !== 'entries,files,sourceDocument,version' ||
      index.version !== 1 || !Array.isArray(index.files) || !Array.isArray(index.entries) ||
      !index.files.length || index.files.length > 4096 || index.files.length !== index.entries.length) rejectGraph();
  checkedPath(index.sourceDocument);
  const paths = new Map();
  let total = 0;
  for (const file of index.files) {
    if (!object(file) || typeof file.document !== 'string' || paths.has(file.document) ||
        typeof file.digest !== 'string' || !SHA.test(file.digest) || !KINDS.has(file.artifactKind)) rejectGraph();
    checkedPath(file.document);
    const target = resolve(root, ...file.document.split('/'));
    const within = relative(root, target);
    if (!within || within === '..' || within.startsWith('..' + sep)) rejectGraph();
    const stat = await lstat(target).catch(rejectGraph);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1_048_576 ||
        await realpath(target).catch(rejectGraph) !== target) rejectGraph();
    const bytes = await readFile(target).catch(rejectGraph);
    total += bytes.length;
    if (bytes.length > 1_048_576 || total > 33_554_432 || digest(bytes) !== file.digest) rejectGraph();
    paths.set(file.document, file);
  }
  const seen = new Set();
  for (const entry of index.entries) {
    if (!object(entry) || typeof entry.document !== 'string' || seen.has(entry.document) ||
        !SHA.test(entry.contentDigest) || typeof entry.semanticOwner !== 'string' ||
        !entry.semanticOwner.trim() || entry.semanticOwner.length > 256 ||
        typeof entry.semanticVersion !== 'string' || !VERSION.test(entry.semanticVersion) ||
        !Array.isArray(entry.boundaryIds) || entry.boundaryIds.length > 27 ||
        entry.boundaryIds.some(id => !/^C(0[1-9]|1[0-9]|2[0-7])$/.test(id))) rejectGraph();
    const file = paths.get(entry.document);
    if (!file || file.artifactKind !== entry.artifactKind ||
        (!CANONICAL.has(entry.artifactKind) &&
          (entry.artifactKind !== 'sidecar' || typeof entry.kind !== 'string' || !entry.kind))) rejectGraph();
    const identity = deriveIdentity(entry.artifactKind === 'sidecar' ? entry.kind : entry.artifactKind,
      entry.semanticOwner, entry.document, entry.semanticVersion, entry.contentDigest);
    if (entry.contentDigest !== file.digest || entry.logicalId !== identity.logicalId ||
        typeof entry.revisionId !== 'string' || !SHA.test(entry.revisionId) ||
        (entry.artifactKind === 'sidecar' && entry.revisionId !== identity.revisionId)) rejectGraph();
    seen.add(entry.document);
  }
  const first = index.entries.find(entry => entry.artifactKind === 'sidecar' && entry.kind === 'example-fixture');
  if (!first || first.document !== index.sourceDocument) rejectGraph();
}

function checkedResults(rows, entries) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 1024) rejectGraph();
  const revisions = new Set(entries.filter(entry => CANONICAL.has(entry.artifactKind)).map(entry => entry.revisionId));
  const seen = new Set();
  for (const row of rows) {
    if (!object(row) || Object.keys(row).sort().join(',') !== 'contractElementId,fixtureId,observed,revisionId,scenarioType' ||
        typeof row.fixtureId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(row.fixtureId) ||
        seen.has(row.fixtureId) || typeof row.contractElementId !== 'string' ||
        !/^[A-Za-z][A-Za-z0-9_.-]{0,127}$/.test(row.contractElementId) ||
        !revisions.has(row.revisionId) || !['valid', 'invalid', 'compatibility'].includes(row.scenarioType) ||
        !['pass', 'fail'].includes(row.observed)) rejectGraph();
    seen.add(row.fixtureId);
  }
  const output = JSON.stringify({ version: 1, fixtureResults: rows });
  if (Buffer.byteLength(output) > 1_048_576) rejectGraph();
  return output;
}

/** In the image this reads only read-only /workspace and /config mounts. */
export async function runFixtureWorker(root, indexPath, sourceDocument) {
  const graphRoot = await realpath(root).catch(rejectGraph);
  const stat = await lstat(indexPath).catch(rejectGraph);
  if (!stat.isFile() || stat.size > 1_048_576) rejectGraph();
  let index;
  try { index = JSON.parse(await readFile(indexPath, 'utf8')); }
  catch { rejectGraph(); }
  if (!object(index) || index.sourceDocument !== sourceDocument) rejectGraph();
  await verifyGraph(graphRoot, index);
  const results = await runFixtureOracle(graphRoot, { entries: index.entries });
  return checkedResults(results, index.entries);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [sourceDocument, extra] = process.argv.slice(2);
  if (!sourceDocument || extra !== undefined) process.exitCode = 3;
  else runFixtureWorker('/workspace', '/config/fixture-index.json', sourceDocument)
    .then(output => { process.stdout.write(output + '\n'); })
    .catch(error => {
      process.exitCode = error instanceof GraphError ? 3 : error instanceof ContractError ? 2 : 4;
    });
}
