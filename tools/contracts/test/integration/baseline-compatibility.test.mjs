import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assessCatalogueAgainstBaseline } from '../../src/baseline-compatibility.mjs';
import { assessCompatibility } from '../../src/compatibility.mjs';
import { deriveIdentity, digest } from '../../src/package-loader.mjs';

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
// The protected integration base for the two new import documents. Every
// earlier canonical document is unchanged here; the additions are first releases.
const CURRENT_BOLT_BASE = 'e7079f1bf96a541c1b3e47ba72de905ba5547c88';
const STORY_BOLT_BASE = '402ace3b195c291a756ed230a24a73199ef8349a';
// An earlier commit, before most canonical sources existed.
const BEFORE_CATALOGUE = '3de357c7502f7ffffb653c7ff353a4930a7f96cd';
const OUTCOMES = ['unchanged', 'first-release', 'compatible', 'breaking-approved', 'change-approved'];

async function catalogueFixture() {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-baseline-coverage-'));
  await cp(join(repoRoot, 'contracts', 'source'), join(root, 'contracts', 'source'), { recursive: true });
  await mkdir(join(root, 'contracts', 'catalogue', 'v1'), { recursive: true });
  const mapPath = join(root, 'contracts', 'catalogue', 'v1', 'boundary-sources.json');
  await cp(join(repoRoot, 'contracts', 'catalogue', 'v1', 'boundary-sources.json'), mapPath);
  const git = (...args) => execFileSync('git', ['-C', root,
    '-c', 'core.autocrlf=false', '-c', 'commit.gpgsign=false',
    '-c', 'user.name=StockSense Fixture', '-c', 'user.email=fixture@example.invalid',
    ...args], { encoding: 'utf8' }).trim();
  git('init', '--quiet');
  git('add', 'contracts');
  git('commit', '--quiet', '-m', 'Synthetic baseline');
  return { root, mapPath, baseline: git('rev-parse', 'HEAD'), git };
}

test('the whole catalogue is assessed against an immutable baseline commit', async () => {
  const { baseline, candidateRevision, assessments, tally, undiffable } =
    await assessCatalogueAgainstBaseline(repoRoot, CATALOGUE_DRAFT);
  assert.equal(baseline.commit, CATALOGUE_DRAFT);
  assert.match(candidateRevision, /^[0-9a-f]{40}$/);
  assert.notEqual(candidateRevision, baseline.commit);

  // Every diffable canonical document is accounted for exactly once, so a
  // document can never be dropped from the comparison unnoticed.
  assert.equal(assessments.length + undiffable.length, 40);
  assert.equal(new Set(assessments.map(row => row.document)).size, assessments.length);
  for (const row of assessments) {
    assert.ok(OUTCOMES.includes(row.outcome), `${row.document}: ${row.outcome}`);
    assert.ok(Array.isArray(row.breakingChanges));
    // Nothing may be reported as breaking without an approval naming its exact
    // predecessor; assessCompatibility refuses otherwise, so reaching here with
    // breaking changes means an approval existed.
    if (row.breakingChanges.length) assert.equal(row.outcome, 'breaking-approved');
  }
  assert.equal(Object.keys(tally).reduce((sum, key) => sum + tally[key], 0), 40);
  for (const document of ['retail-data/v1/inventory-import.asyncapi.yaml',
    'retail-data/v1/inventory-import-audit.asyncapi.yaml']) {
    const row = assessments.find(item => item.document === document);
    assert.equal(row?.outcome, 'first-release', document);
    assert.equal(row?.predecessorRevisionId, null, document);
    assert.match(row.firstReleaseReason, new RegExp(`absent at baseline ${CATALOGUE_DRAFT}`));
  }
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

test('required compatibility refuses a changed non-OpenAPI document without approval', async () => {
  await assert.rejects(
    assessCatalogueAgainstBaseline(repoRoot, CATALOGUE_DRAFT, { requirePinnedDiffer: true }),
    error => {
      assert.equal(error.code, 'NON_OPENAPI_CHANGE_UNAPPROVED');
      assert.equal(error.ruleId, 'BR4.4');
      return true;
    });
});

test('changed AsyncAPI and JSON Schema revisions need exact predecessor-bound overlap approvals', async () => {
  // A disposable repository keeps both revisions available after this story
  // is squash-merged; no branch-local commit becomes a permanent test input.
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'stocksense-compatibility-'));
  try {
    const sourceRoot = join(fixtureRoot, 'contracts', 'source');
    const catalogueRoot = join(fixtureRoot, 'contracts', 'catalogue', 'v1');
    await cp(join(repoRoot, 'contracts', 'source'), sourceRoot, { recursive: true });
    await mkdir(catalogueRoot, { recursive: true });
    await cp(join(repoRoot, 'contracts', 'catalogue', 'v1', 'boundary-sources.json'),
      join(catalogueRoot, 'boundary-sources.json'));
    const git = (...args) => execFileSync('git', ['-C', fixtureRoot,
      '-c', 'core.autocrlf=false', '-c', 'commit.gpgsign=false',
      '-c', 'user.name=StockSense Fixture', '-c', 'user.email=fixture@example.invalid',
      ...args], { encoding: 'utf8' }).trim();
    git('init', '--quiet');
    const changedPaths = [
      join(sourceRoot, 'common', 'v1', 'contract-package.shared-schema.yaml'),
      join(sourceRoot, 'messaging-platform', 'v1', 'transport-conformance.asyncapi.yaml')
    ];
    const originals = await Promise.all(changedPaths.map(path => readFile(path)));
    for (let i = 0; i < changedPaths.length; i++) {
      await writeFile(changedPaths[i], Buffer.concat([originals[i], Buffer.from('\n# synthetic baseline revision\n')]));
    }
    git('add', 'contracts');
    git('commit', '--quiet', '-m', 'Synthetic baseline');
    const commit = git('rev-parse', 'HEAD');
    for (let i = 0; i < changedPaths.length; i++) await writeFile(changedPaths[i], originals[i]);
    git('add', 'contracts');
    git('commit', '--quiet', '-m', 'Synthetic candidate');

    const exploratory = await assessCatalogueAgainstBaseline(fixtureRoot, commit);
    const changed = exploratory.undiffable;
    assert.deepEqual(changed.map(row => row.artifactKind).sort(), ['asyncapi', 'schema']);
    const approvals = Object.fromEntries(changed.map(row => [row.logicalId, {
      predecessorRevisionId: row.predecessorRevisionId,
      approvedBy: 'synthetic-integration-fixture',
      overlapUntil: '2099-12-31'
    }]));
    const accepted = await assessCatalogueAgainstBaseline(fixtureRoot, commit,
      { requirePinnedDiffer: true, approvals });
    assert.deepEqual(accepted.undiffable, []);
    assert.equal(accepted.assessments.length, 40);
    for (const row of changed) {
      const result = accepted.assessments.find(item => item.logicalId === row.logicalId);
      assert.equal(result?.outcome, 'change-approved', row.document);
      assert.equal(result.predecessorRevisionId, row.predecessorRevisionId);
      assert.equal(result.approvedBy, 'synthetic-integration-fixture');
      assert.equal(result.overlapUntil, '2099-12-31');
    }
    const wrong = { ...approvals, [changed[0].logicalId]: {
      ...approvals[changed[0].logicalId], predecessorRevisionId: `sha256:${'0'.repeat(64)}`
    } };
    await assert.rejects(assessCatalogueAgainstBaseline(fixtureRoot, commit,
      { requirePinnedDiffer: true, approvals: wrong }), error =>
      error.code === 'NON_OPENAPI_CHANGE_UNAPPROVED' && error.ruleId === 'BR4.4');
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test('required compatibility passes the current immutable integration base with explicit import first releases', async () => {
  const { baseline, assessments, undiffable, tally } = await assessCatalogueAgainstBaseline(
    repoRoot, CURRENT_BOLT_BASE, { requirePinnedDiffer: true });
  assert.equal(baseline.commit, CURRENT_BOLT_BASE);
  assert.deepEqual(undiffable, []);
  assert.equal(assessments.length, 40);
  assert.equal(tally.unchanged, 24);
  assert.equal(tally.compatible, 14);
  assert.equal(tally['first-release'], 2);
  for (const document of ['retail-data/v1/inventory-import.asyncapi.yaml',
    'retail-data/v1/inventory-import-audit.asyncapi.yaml']) {
    const row = assessments.find(item => item.document === document);
    assert.equal(row?.outcome, 'first-release', document);
    assert.equal(row?.predecessorRevisionId, null, document);
    assert.match(row.firstReleaseReason, new RegExp(`absent at baseline ${CURRENT_BOLT_BASE}`));
  }
});

test('required comparison resolves the local identity schema against the exact story Bolt base', async () => {
  const { assessments, tally, undiffable } = await assessCatalogueAgainstBaseline(
    repoRoot, STORY_BOLT_BASE, { requirePinnedDiffer: true });
  assert.deepEqual(undiffable, []);
  assert.deepEqual(tally, { unchanged: 26, compatible: 14 });
  assert.equal(assessments.find(row => row.document ===
    'identity-access/v1/identity-metadata.openapi.yaml')?.outcome, 'compatible');
});

test('a remote reference in a changed OpenAPI document is refused before the differ runs', async () => {
  const fixture = await catalogueFixture();
  try {
    const path = join(fixture.root, 'contracts', 'source',
      'identity-access', 'v1', 'identity-metadata.openapi.yaml');
    const original = await readFile(path, 'utf8');
    assert.match(original, /\$ref: \.\/platform-operator-grant\.schema\.json/);
    await writeFile(path, original.replace('$ref: ./platform-operator-grant.schema.json',
      '$ref: https://example.invalid/remote.schema.json'));
    fixture.git('add', 'contracts');
    fixture.git('commit', '--quiet', '-m', 'Introduce remote OpenAPI reference');
    await assert.rejects(assessCatalogueAgainstBaseline(fixture.root, fixture.baseline,
      { requirePinnedDiffer: true }), error =>
      error.code === 'REFERENCE_POLICY' && error.ruleId === 'NFR6.2');
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test('a caller-supplied preflight flag cannot enable local reference loading in the general differ', async () => {
  const document = 'identity-access/v1/identity-metadata.openapi.yaml';
  const path = join(repoRoot, 'contracts', 'source', document);
  await assert.rejects(assessCompatibility({
    bindings: [{ document, logicalId: 'synthetic:identity-metadata', artifactKind: 'openapi',
      predecessorRevisionId: 'sha256:old', candidateRevisionId: 'sha256:new', unchanged: false }],
    resolveSource: async () => ({ predecessorPath: path, candidatePath: path,
      localReferencesPreflighted: true })
  }), error => error.code === 'DIFFER_UNAVAILABLE' && error.ruleId === 'BR4.3');
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

test('a removed canonical source is detected from the immutable baseline tree', async () => {
  const fixture = await catalogueFixture();
  try {
    const document = 'retail-data/v1/inventory-import.asyncapi.yaml';
    const map = JSON.parse(await readFile(fixture.mapPath, 'utf8'));
    map.C23 = map.C23.filter(path => path !== document);
    await writeFile(fixture.mapPath, JSON.stringify(map, null, 2) + '\n');
    await rm(join(fixture.root, 'contracts', 'source', document));
    fixture.git('add', 'contracts');
    fixture.git('commit', '--quiet', '-m', 'Remove canonical source');
    await assert.rejects(assessCatalogueAgainstBaseline(fixture.root, fixture.baseline), error =>
      error.code === 'PREDECESSOR_UNACCOUNTED' && error.ruleId === 'BR4.1');
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test('a renamed source is not a first release and requires exact predecessor approval', async () => {
  const fixture = await catalogueFixture();
  try {
    const oldDocument = 'retail-data/v1/inventory-import.asyncapi.yaml';
    const newDocument = 'retail-data/v1/inventory-import-renamed.asyncapi.yaml';
    const sourceRoot = join(fixture.root, 'contracts', 'source');
    const bytes = await readFile(join(sourceRoot, oldDocument));
    const oldIdentity = deriveIdentity('asyncapi', 'U4 Retail Data', oldDocument, '1.0.0', digest(bytes));
    const newIdentity = deriveIdentity('asyncapi', 'U4 Retail Data', newDocument, '1.0.0', digest(bytes));
    const map = JSON.parse(await readFile(fixture.mapPath, 'utf8'));
    map.C23 = map.C23.map(path => path === oldDocument ? newDocument : path);
    await writeFile(fixture.mapPath, JSON.stringify(map, null, 2) + '\n');
    await rename(join(sourceRoot, oldDocument), join(sourceRoot, newDocument));
    fixture.git('add', 'contracts');
    fixture.git('commit', '--quiet', '-m', 'Rename canonical source');

    await assert.rejects(assessCatalogueAgainstBaseline(fixture.root, fixture.baseline), error =>
      error.code === 'PREDECESSOR_UNACCOUNTED' && error.ruleId === 'BR4.1');
    const approval = { predecessorLogicalId: oldIdentity.logicalId,
      predecessorRevisionId: oldIdentity.revisionId,
      approvedBy: 'synthetic-owner', overlapUntil: '2099-12-31' };
    await assert.rejects(assessCatalogueAgainstBaseline(fixture.root, fixture.baseline,
      { approvals: { [newIdentity.logicalId]: { ...approval, predecessorRevisionId: `sha256:${'0'.repeat(64)}` } } }),
    error => error.code === 'PREDECESSOR_MAPPING_UNAPPROVED' && error.ruleId === 'BR4.1');

    const result = await assessCatalogueAgainstBaseline(fixture.root, fixture.baseline,
      { requirePinnedDiffer: true, approvals: { [newIdentity.logicalId]: approval } });
    const replacement = result.assessments.find(row => row.logicalId === newIdentity.logicalId);
    assert.equal(result.assessments.length, 40);
    assert.deepEqual(result.undiffable, []);
    assert.equal(result.tally.unchanged, 39);
    assert.equal(replacement.outcome, 'change-approved');
    assert.equal(replacement.predecessorLogicalId, oldIdentity.logicalId);
    assert.equal(replacement.predecessorRevisionId, oldIdentity.revisionId);
    assert.equal(replacement.predecessorDocument, oldDocument);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
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
