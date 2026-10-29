import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { ContractError, assertSafePath, deriveIdentity, digest } from './package-loader.mjs';
import { readBlob } from './provenance.mjs';
import { buildSourceInventory, OWNER_BY_AREA } from './catalogue.mjs';
import { assertIntegrationBaseline, assessCompatibility, bindPredecessors,
  createPreflightedSnapshotDiffer } from './compatibility.mjs';

// Compare the whole canonical catalogue against an immutable baseline commit.
//
// The differ had only ever been exercised on two hand-built fixtures, one
// identical and one breaking. That proves the differ runs; it does not produce
// compatibility evidence for the catalogue. Until there is a released package
// to compare against, the honest immutable baseline is an earlier commit of the
// canonical sources themselves: it is an exact commit, it is immutable, and the
// comparison it yields is a real one over real documents.
//
// A genuinely new document is a recorded first release; every baseline
// identity must still bind to a successor or have an approved mapping.

/** @returns {never} */
const fail = (code, rule, message) => { throw new ContractError(code, rule, message); };

/** Enumerate the immutable tree itself; candidate paths cannot reveal removals. */
function entriesAt(repoRoot, revision) {
  const tree = spawnSync('git', ['ls-tree', '-r', '-z', revision, '--', 'contracts/source/'],
    { cwd: repoRoot, timeout: 60_000, maxBuffer: 8 * 1024 * 1024 });
  if (tree.error || tree.status !== 0) {
    fail('BASELINE_SOURCE_UNAVAILABLE', 'BR4.1', 'The immutable baseline source tree cannot be read');
  }
  const entries = [];
  for (const record of tree.stdout.toString('utf8').split('\0').filter(Boolean)) {
    const tab = record.indexOf('\t');
    const metadata = record.slice(0, tab).split(' ');
    const sourcePath = record.slice(tab + 1);
    if (tab < 0 || metadata.length !== 3 || !['100644', '100755'].includes(metadata[0]) ||
        metadata[1] !== 'blob' || !sourcePath.startsWith('contracts/source/')) {
      fail('BASELINE_SOURCE_INVALID', 'BR4.1', 'The baseline contains an invalid canonical source entry');
    }
    const document = assertSafePath(sourcePath.slice('contracts/source/'.length));
    const artifactKind = document.endsWith('.openapi.yaml') ? 'openapi' :
      document.endsWith('.asyncapi.yaml') ? 'asyncapi' :
      document.endsWith('.schema.json') || document.endsWith('.shared-schema.yaml') ? 'schema' : null;
    const semanticOwner = OWNER_BY_AREA[document.split('/')[0]];
    if (!artifactKind || !semanticOwner) {
      fail('BASELINE_SOURCE_INVALID', 'BR4.1', 'The baseline contains an unknown canonical source');
    }
    const bytes = readBlob(repoRoot, revision, sourcePath);
    const contentDigest = digest(bytes);
    entries.push({
      document,
      artifactKind,
      semanticOwner,
      semanticVersion: '1.0.0',
      contentDigest,
      bytes,
      ...deriveIdentity(artifactKind, semanticOwner, document, '1.0.0', contentDigest)
    });
  }
  return entries;
}

/**
 * Assess every diffable canonical document against `baselineCommit`.
 * @param {string} repoRoot
 * @param {string} baselineCommit an exact 40-character commit
 * @returns {Promise<{baseline: {commit: string, ref: string|null}, candidateRevision: string,
 *   assessments: any[], tally: Record<string, number>, undiffable: any[]}>}
 */
export async function assessCatalogueAgainstBaseline(repoRoot, baselineCommit,
  { requirePinnedDiffer = false, approvals = {} } = {}) {
  const baseline = assertIntegrationBaseline({ commit: baselineCommit });
  const inventory = await buildSourceInventory(repoRoot);
  const candidate = inventory.entries.map(entry => ({
    document: entry.document,
    artifactKind: entry.artifactKind,
    semanticOwner: entry.semanticOwner,
    semanticVersion: '1.0.0',
    contentDigest: entry.contentDigest,
    ...deriveIdentity(entry.artifactKind, entry.semanticOwner, entry.document, '1.0.0', entry.contentDigest)
  }));

  const previous = entriesAt(repoRoot, baseline.commit);
  if (inventory.sourceRevision === baseline.commit && candidate.length === previous.length &&
      candidate.every(entry => previous.some(prior => prior.logicalId === entry.logicalId &&
        prior.revisionId === entry.revisionId))) {
    fail('BASELINE_IDENTICAL', 'BR4.2', 'The baseline commit is the candidate revision, so the comparison is empty');
  }
  const previousIds = new Set(previous.map(entry => entry.logicalId));
  const firstRelease = Object.fromEntries(candidate
    .filter(entry => !previousIds.has(entry.logicalId))
    .map(entry => [entry.logicalId, `absent at baseline ${baseline.commit}`]));
  const bindings = bindPredecessors(candidate, previous, { firstRelease, approvals });

  // The pinned differ consumes immutable local files, so the baseline bytes are
  // materialised once into a scratch tree that is removed again. Nothing is
  // fetched and nothing is written inside the repository.
  const scratch = await mkdtemp(join(tmpdir(), 'stocksense-baseline-'));
  const baselineRoot = join(scratch, 'baseline');
  try {
    for (const entry of previous) {
      const path = join(baselineRoot, entry.document);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, entry.bytes);
    }
    const snapshot = await createPreflightedSnapshotDiffer({
      predecessorRoot: baselineRoot, predecessorEntries: previous,
      candidateRoot: join(repoRoot, 'contracts/source'), candidateEntries: inventory.entries
    });

    // oasdiff judges OpenAPI only. Changed AsyncAPI and schema documents are
    // assessed only under explicit predecessor-bound approval. An exploratory
    // run reports missing approvals; a required run refuses them.
    const diffable = requirePinnedDiffer ? bindings : bindings.filter(binding => binding.unchanged ||
      binding.predecessorRevisionId === null || binding.artifactKind === 'openapi' ||
      Object.hasOwn(approvals, binding.logicalId));
    const undiffable = bindings.filter(binding => !diffable.includes(binding));

    let assessments;
    try {
      assessments = await assessCompatibility({ bindings: diffable, approvals, runDiff: snapshot.runDiff });
    } finally {
      await snapshot.cleanup();
    }
    /** @type {Record<string, number>} */
    const tally = {};
    for (const assessment of assessments) tally[assessment.outcome] = (tally[assessment.outcome] ?? 0) + 1;
    if (undiffable.length) tally.undiffable = undiffable.length;
    return { baseline, candidateRevision: inventory.sourceRevision, assessments, tally, undiffable };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}
