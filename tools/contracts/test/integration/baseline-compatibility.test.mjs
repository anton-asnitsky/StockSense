import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { assessCatalogueAgainstBaseline } from '../../src/baseline-compatibility.mjs';

// The pinned differ had only ever been exercised on two hand-built fixtures,
// one identical and one breaking. That proves the differ runs; it is not
// compatibility evidence for the catalogue. These tests run the comparison
// across every canonical document against an immutable baseline commit.
const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));

// The commit that drafted the C01-C27 catalogue. An exact commit from this
// repository's own history is immutable by construction, which is what BR4.1
// requires of a baseline, and it is the earliest point at which the whole
// catalogue exists to compare against.
const CATALOGUE_DRAFT = '20dc9345cf702848167ba6bb4ab5c4aabf756876';
// An earlier commit, before most canonical sources existed.
const BEFORE_CATALOGUE = '3de357c7502f7ffffb653c7ff353a4930a7f96cd';
const OUTCOMES = ['unchanged', 'first-release', 'compatible', 'breaking-approved'];

test('the whole catalogue is assessed against an immutable baseline commit', async () => {
  const { baseline, candidateRevision, assessments, tally, undiffable } =
    await assessCatalogueAgainstBaseline(repoRoot, CATALOGUE_DRAFT);
  assert.equal(baseline.commit, CATALOGUE_DRAFT);
  assert.match(candidateRevision, /^[0-9a-f]{40}$/);
  assert.notEqual(candidateRevision, baseline.commit);

  // Every diffable canonical document is accounted for exactly once, so a
  // document can never be dropped from the comparison unnoticed.
  assert.equal(assessments.length + undiffable.length, 38);
  assert.equal(new Set(assessments.map(row => row.document)).size, assessments.length);
  for (const row of assessments) {
    assert.ok(OUTCOMES.includes(row.outcome), `${row.document}: ${row.outcome}`);
    assert.ok(Array.isArray(row.breakingChanges));
    // Nothing may be reported as breaking without an approval naming its exact
    // predecessor; assessCompatibility refuses otherwise, so reaching here with
    // breaking changes means an approval existed.
    if (row.breakingChanges.length) assert.equal(row.outcome, 'breaking-approved');
  }
  assert.equal(Object.keys(tally).reduce((sum, key) => sum + tally[key], 0), 38);
});

test('a changed document of a kind the pinned differ cannot read is reported, never credited', async () => {
  // oasdiff judges OpenAPI only. A changed schema or AsyncAPI document has no
  // pinned differ, so it must surface as undiffable rather than be passed
  // through a tool that cannot read it or quietly counted as compatible.
  const { undiffable } = await assessCatalogueAgainstBaseline(repoRoot, CATALOGUE_DRAFT);
  for (const row of undiffable) {
    assert.notEqual(row.artifactKind, 'openapi');
    assert.equal(row.unchanged, false);
    assert.match(row.predecessorRevisionId, /^sha256:[0-9a-f]{64}$/);
    assert.notEqual(row.candidateRevisionId, row.predecessorRevisionId);
  }
});

test('requiring the pinned differ refuses, which is the honest state of BR4.3', async () => {
  // This is what a release assessment does. It refuses because the catalogue
  // holds changed documents of kinds no pinned differ covers.
  await assert.rejects(
    assessCatalogueAgainstBaseline(repoRoot, CATALOGUE_DRAFT, { requirePinnedDiffer: true }),
    error => {
      assert.equal(error.code, 'DIFFER_UNAVAILABLE');
      assert.equal(error.ruleId, 'BR4.3');
      return true;
    });
});

test('a document absent at the baseline is a recorded first release, not a silent gap', async () => {
  const { assessments } = await assessCatalogueAgainstBaseline(repoRoot, BEFORE_CATALOGUE);
  const first = assessments.filter(row => row.outcome === 'first-release');
  assert.ok(first.length > 0, 'most canonical sources postdate this commit');
  for (const row of first) {
    assert.equal(row.predecessorRevisionId, null);
    // bindPredecessors refuses a missing predecessor without an explicit
    // reason, so an unexplained gap can never read as "nothing changed".
    assert.match(row.firstReleaseReason, new RegExp(`absent at baseline ${BEFORE_CATALOGUE}`));
  }
});

test('the baseline must be an exact immutable commit, and not the candidate itself', async () => {
  for (const reference of ['main', 'HEAD', 'v1.0.0', '20dc934', '']) {
    await assert.rejects(assessCatalogueAgainstBaseline(repoRoot, reference),
      error => error.code === 'BASELINE_NOT_IMMUTABLE' && error.ruleId === 'BR4.1',
      `a mutable reference must be refused: ${reference || '(empty)'}`);
  }
  const { candidateRevision } = await assessCatalogueAgainstBaseline(repoRoot, CATALOGUE_DRAFT);
  // Comparing the catalogue with itself yields an empty comparison that would
  // otherwise read as a clean one.
  await assert.rejects(assessCatalogueAgainstBaseline(repoRoot, candidateRevision),
    error => error.code === 'BASELINE_IDENTICAL' && error.ruleId === 'BR4.2');
});
