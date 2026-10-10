import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { ContractError, deriveIdentity, digest } from './package-loader.mjs';
import { readBlob } from './provenance.mjs';
import { buildSourceInventory } from './catalogue.mjs';
import { assertIntegrationBaseline, assessCompatibility, bindPredecessors } from './compatibility.mjs';

// Compare the whole canonical catalogue against an immutable baseline commit.
//
// The differ had only ever been exercised on two hand-built fixtures, one
// identical and one breaking. That proves the differ runs; it does not produce
// compatibility evidence for the catalogue. Until there is a released package
// to compare against, the honest immutable baseline is an earlier commit of the
// canonical sources themselves: it is an exact commit, it is immutable, and the
// comparison it yields is a real one over real documents.
//
// A document absent at the baseline is a first-release, recorded with that
// reason rather than passed over, so a gap can never read as "nothing changed".

/** @returns {never} */
const fail = (code, rule, message) => { throw new ContractError(code, rule, message); };

/** The identity-bearing entries for one revision of the catalogue. */
function entriesAt(repoRoot, revision, documents) {
  const entries = [];
  const absent = [];
  for (const { document, artifactKind, semanticOwner } of documents) {
    let bytes;
    try { bytes = readBlob(repoRoot, revision, `contracts/source/${document}`); }
    catch (error) {
      // A path the baseline does not carry is a first-release, not a failure.
      if (error.code !== 'SOURCE_PATH_ABSENT') throw error;
      absent.push(document);
      continue;
    }
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
  return { entries, absent };
}

/**
 * Assess every diffable canonical document against `baselineCommit`.
 * @param {string} repoRoot
 * @param {string} baselineCommit an exact 40-character commit
 * @returns {Promise<{baseline: {commit: string, ref: string|null}, candidateRevision: string,
 *   assessments: any[], tally: Record<string, number>, undiffable: any[]}>}
 */
export async function assessCatalogueAgainstBaseline(repoRoot, baselineCommit, { requirePinnedDiffer = false } = {}) {
  const baseline = assertIntegrationBaseline({ commit: baselineCommit });
  const inventory = await buildSourceInventory(repoRoot);
  if (inventory.sourceRevision === baseline.commit) {
    fail('BASELINE_IDENTICAL', 'BR4.2', 'The baseline commit is the candidate revision, so the comparison is empty');
  }

  const candidate = inventory.entries.map(entry => ({
    document: entry.document,
    artifactKind: entry.artifactKind,
    semanticOwner: entry.semanticOwner,
    semanticVersion: '1.0.0',
    contentDigest: entry.contentDigest,
    ...deriveIdentity(entry.artifactKind, entry.semanticOwner, entry.document, '1.0.0', entry.contentDigest)
  }));

  const previous = entriesAt(repoRoot, baseline.commit, candidate);
  const firstRelease = Object.fromEntries(candidate
    .filter(entry => previous.absent.includes(entry.document))
    .map(entry => [entry.logicalId, `absent at baseline ${baseline.commit}`]));
  const bindings = bindPredecessors(candidate, previous.entries, { firstRelease });

  // The pinned differ consumes immutable local files, so the baseline bytes are
  // materialised once into a scratch tree that is removed again. Nothing is
  // fetched and nothing is written inside the repository.
  const scratch = await mkdtemp(join(tmpdir(), 'stocksense-baseline-'));
  const baselineBytes = new Map(previous.entries.map(entry => [entry.document, entry.bytes]));
  try {
    const resolveSource = async binding => {
      const bytes = baselineBytes.get(binding.document);
      if (!bytes) fail('DIFF_SOURCE', 'BR4.3', 'The baseline bytes for a bound document are unavailable');
      const predecessorPath = join(scratch, binding.document);
      await mkdir(dirname(predecessorPath), { recursive: true });
      await writeFile(predecessorPath, bytes);
      return { predecessorPath, candidatePath: join(repoRoot, 'contracts/source', binding.document) };
    };

    // oasdiff judges OpenAPI only. A changed AsyncAPI or schema document has no
    // pinned differ, so it is reported as undiffable rather than run through a
    // tool that cannot read it or quietly credited as compatible.
    //
    // `requirePinnedDiffer` passes them through anyway, which is what a release
    // assessment does: it refuses with DIFFER_UNAVAILABLE. That refusal is the
    // honest state of BR4.3 for the non-OpenAPI kinds and is reproducible here
    // rather than only describable.
    const diffable = requirePinnedDiffer ? bindings : bindings.filter(binding => binding.unchanged ||
      binding.predecessorRevisionId === null || binding.artifactKind === 'openapi');
    const undiffable = bindings.filter(binding => !diffable.includes(binding));

    const assessments = await assessCompatibility({ bindings: diffable, resolveSource });
    /** @type {Record<string, number>} */
    const tally = {};
    for (const assessment of assessments) tally[assessment.outcome] = (tally[assessment.outcome] ?? 0) + 1;
    if (undiffable.length) tally.undiffable = undiffable.length;
    return { baseline, candidateRevision: inventory.sourceRevision, assessments, tally, undiffable };
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}
