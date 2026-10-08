import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { BOUNDARY_SIDECARS, digest, loadPackage } from '../../src/package-loader.mjs';

// C24-C27 each require a recovery-policy sidecar. No such document existed, so
// a candidate covering any recovery boundary could not be assembled at all -
// a blocker on the C01-C27 package that had nothing to do with fixtures.
const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const policyPath = 'contracts/profiles/recovery-coordination/v1/recovery.policy.yaml';

const entry = (kind, boundaryIds, document, bytes) => ({ kind, owner: 'U13 Recovery Coordination',
  boundaryIds, document, semanticVersion: '1.0.0', contentDigest: digest(bytes),
  sourceRevision: '0'.repeat(40) });

async function withRecoveryCandidate(check) {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-recovery-'));
  try {
    const policy = await readFile(join(repoRoot, policyPath));
    const openapi = await readFile(join(repoRoot, 'contracts/source/recovery-coordination/v1/control-status.openapi.yaml'));
    const fixtures = Buffer.from(JSON.stringify({ fixtureVersion: '1.1.0', syntheticOnly: true,
      fixtures: [] }, null, 2) + '\n');
    // A candidate carrying canonical documents also needs a generation profile.
    const generation = Buffer.from(JSON.stringify({ generationProfileVersion: '1.1.0',
      sourceRevision: '0'.repeat(40), consumers: [],
      limitation: 'Recovery sidecar inventory only; no consumer generation is claimed.' }, null, 2) + '\n');
    for (const [document, bytes] of [
      ['governance/recovery.policy.yaml', policy],
      ['governance/example-fixture.json', fixtures],
      ['governance/generation-profile.json', generation],
      ['recovery-coordination/v1/control-status.openapi.yaml', openapi]
    ]) {
      await mkdir(dirname(join(root, document)), { recursive: true });
      await writeFile(join(root, document), bytes);
    }
    const manifest = {
      packageVersion: '1.0.0', manifestStatus: 'candidate', sourceRevision: '0'.repeat(40),
      openapi: [{ provider: 'U13 Recovery Coordination', boundaryIds: ['C26'],
        document: 'recovery-coordination/v1/control-status.openapi.yaml',
        semanticVersion: '1.0.0', contentDigest: digest(openapi) }],
      asyncapi: [], schemas: [],
      governedArtifacts: [
        entry('recovery-policy', ['C26'], 'governance/recovery.policy.yaml', policy),
        entry('example-fixture', ['C26'], 'governance/example-fixture.json', fixtures),
        entry('generation-profile', ['C26'], 'governance/generation-profile.json', generation)
      ],
      boundaryCoverage: [{ boundaryId: 'C26',
        canonicalDocuments: ['recovery-coordination/v1/control-status.openapi.yaml'],
        sidecars: ['governance/example-fixture.json', 'governance/generation-profile.json', 'governance/recovery.policy.yaml'] }]
    };
    await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    await check(root, manifest);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('C24-C27 require a recovery-policy sidecar, and one now exists to satisfy it', async () => {
  for (const boundary of ['C24', 'C25', 'C26', 'C27']) {
    assert.equal(BOUNDARY_SIDECARS[boundary], 'recovery-policy');
  }
  await withRecoveryCandidate(async root => {
    const loaded = await loadPackage(root);
    assert.deepEqual(loaded.boundaryIds, ['C26']);
    assert.ok(loaded.entries.some(item => item.kind === 'recovery-policy'));
  });
});

test('a recovery candidate without the policy sidecar is refused', async () => {
  // The point of the document is that its absence blocks the package, so the
  // refusal is pinned rather than assumed.
  await withRecoveryCandidate(async root => {
    const path = join(root, 'manifest.json');
    const manifest = JSON.parse(await readFile(path, 'utf8'));
    manifest.governedArtifacts = manifest.governedArtifacts.filter(item => item.kind !== 'recovery-policy');
    manifest.boundaryCoverage[0].sidecars = ['governance/example-fixture.json', 'governance/generation-profile.json'];
    await writeFile(path, JSON.stringify(manifest, null, 2) + '\n');
    await assert.rejects(loadPackage(root),
      error => error.code === 'REQUIRED_SIDECAR' && error.ruleId === 'BR1.1');
  });
});

test('the recovery policy leaves every OQ5 objective unset and refuses to assess', async () => {
  const policy = YAML.parse(await readFile(join(repoRoot, policyPath), 'utf8'), { strict: true, uniqueKeys: true });
  assert.equal(policy.kind, 'recovery-policy');
  assert.deepEqual(policy.boundaries, ['C24', 'C25', 'C26', 'C27']);
  // Null rather than provisional: a guessed target is indistinguishable from an
  // agreed one once it reaches evidence, and would read as a pass.
  assert.deepEqual(policy.objectiveTargets,
    { rpoSeconds: null, rtoSeconds: null, backupExpiryDays: null, totalDiskGiB: null });
  assert.equal(policy.objectiveAssessment, 'not-run-missing-objectives');
  assert.ok(policy.limitations.length >= 3);
  // Each declared surface must name a canonical source that actually exists.
  for (const boundary of ['C24', 'C25', 'C26', 'C27']) {
    const declared = policy.coordination[boundary];
    assert.ok(declared, `${boundary} is undeclared`);
    assert.match(String(declared.source), /^recovery-coordination\/v1\/.+\.(openapi|asyncapi)\.yaml$/);
    await readFile(join(repoRoot, 'contracts/source', declared.source));
  }
});
