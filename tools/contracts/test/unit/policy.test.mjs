import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_BOUNDARIES, BOUNDARY_SIDECARS, CANONICAL_KINDS, FIXED_PATHS, digest, loadPackage } from '../../src/package-loader.mjs';
import { assertDeclaredPolicy, mapSchemaFindings, runFixtureOracle } from '../../src/policy.mjs';

const sampleRoot = fileURLToPath(new URL('../../../../contracts/samples/walking-skeleton/', import.meta.url));
const expectCode = (fn, code) => assert.throws(fn, error => error.code === code);

async function withOracleFiles(documents, check) {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-oracle-'));
  const entries = [];
  try {
    for (const [document, { content, kind = 'schema', revisionId = digest(document), boundaryIds = ['C01'] }] of Object.entries(documents)) {
      await mkdir(dirname(join(root, document)), { recursive: true });
      await writeFile(join(root, document), content);
      entries.push({ document, artifactKind: kind === 'schema' ? 'schema' : 'sidecar',
        ...(kind === 'schema' ? {} : { kind }), contentDigest: digest(content), revisionId, boundaryIds });
    }
    await check(root, { entries });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const fixtureSidecar = (fixtures) => JSON.stringify({ syntheticOnly: true, fixtures });
const validFixture = contractElementId => ({ fixtureId: 'valid-' + contractElementId, contractElementId,
  boundaryIds: ['C01'], scenarioType: 'valid', expectedOutcome: 'pass', payload: { value: 'ok' } });

const candidate = { boundaryIds: ['C01'], manifest: { manifestStatus: 'candidate' } };
const basePolicy = () => ({
  contractPackagePolicyVersion: '1.0.0',
  requiredBoundaryIds: [...ALL_BOUNDARIES],
  requiredCanonicalKinds: Object.fromEntries(Object.entries(CANONICAL_KINDS).map(([kind, ids]) => [kind, ids.split(' ')])),
  requiredCanonicalPaths: Object.fromEntries(Object.entries(FIXED_PATHS).map(([id, paths]) => [id, [...paths]])),
  requiredSidecarKinds: {
    candidateEveryBoundary: ['example-fixture'],
    releaseEveryBoundary: ['example-fixture', 'compatibility-assessment', 'validation-run', 'evidence-record'],
    candidateForCanonicalDocuments: ['generation-profile'],
    releaseForGeneratedConsumers: ['generated-output-manifest'],
    candidateByBoundary: Object.fromEntries(Object.entries(BOUNDARY_SIDECARS).map(([id, kind]) => [id, [kind]]))
  },
  candidateScope: ['C01'],
  releaseReady: false
});

test('BR2.4-BR2.6: a policy restating the enforced matrix passes and reports uncovered boundaries', () => {
  const result = assertDeclaredPolicy(basePolicy(), candidate);
  assert.deepEqual(result.candidateScope, ['C01']);
  assert.equal(result.uncoveredBoundaries.length, ALL_BOUNDARIES.length - 1);
  assert.ok(!result.uncoveredBoundaries.includes('C01'));
});

test('BR2.5: a shortened boundary set is rejected', () => {
  const policy = basePolicy();
  policy.requiredBoundaryIds = ['C01'];
  expectCode(() => assertDeclaredPolicy(policy, candidate), 'POLICY_BOUNDARY_SET');
});

test('BR2.5: a weakened canonical-kind matrix is rejected', () => {
  const policy = basePolicy();
  policy.requiredCanonicalKinds.openapi = policy.requiredCanonicalKinds.openapi.slice(0, 2);
  expectCode(() => assertDeclaredPolicy(policy, candidate), 'POLICY_KIND_MATRIX');
  const dropped = basePolicy();
  delete dropped.requiredCanonicalKinds.asyncapi;
  expectCode(() => assertDeclaredPolicy(dropped, candidate), 'POLICY_KIND_MATRIX');
});

test('BR2.6: candidate scope must be covered by the manifest', () => {
  const policy = basePolicy();
  policy.candidateScope = ['C07'];
  expectCode(() => assertDeclaredPolicy(policy, candidate), 'POLICY_SCOPE');
  const empty = basePolicy();
  empty.candidateScope = [];
  expectCode(() => assertDeclaredPolicy(empty, candidate), 'POLICY_SCOPE');
});

test('BR2.6: declared canonical paths must match the enforced paths in scope', () => {
  const policy = basePolicy();
  policy.requiredCanonicalPaths.C01 = [FIXED_PATHS.C01[0]];
  expectCode(() => assertDeclaredPolicy(policy, candidate), 'POLICY_PATH_SET');
});

test('BR2.6: candidate policy cannot weaken a future boundary fixed path', () => {
  const policy = basePolicy();
  policy.requiredCanonicalPaths.C07 = [FIXED_PATHS.C07[0]];
  expectCode(() => assertDeclaredPolicy(policy, candidate), 'POLICY_PATH_SET');
});

test('BR2.6: release and future-boundary sidecar requirements cannot be omitted', () => {
  const policy = basePolicy();
  policy.requiredSidecarKinds.releaseEveryBoundary.pop();
  expectCode(() => assertDeclaredPolicy(policy, candidate), 'POLICY_SIDECAR_MATRIX');
  const missing = basePolicy();
  delete missing.requiredSidecarKinds.candidateByBoundary.C23;
  expectCode(() => assertDeclaredPolicy(missing, candidate), 'POLICY_SIDECAR_MATRIX');
});

test('BR2.6: checked-in candidate policy carries the complete enforced matrix', async () => {
  const loaded = await loadPackage(sampleRoot);
  const policy = JSON.parse(await readFile(new URL('../../../../contracts/samples/walking-skeleton/governance/contract-package-policy.json', import.meta.url)));
  const result = assertDeclaredPolicy(policy, loaded);
  assert.deepEqual(result.candidateScope, ['C01', 'C18']);
  assert.equal(result.uncoveredBoundaries.length, 25);
});

test('BR2.6: a candidate may not declare release readiness', () => {
  const policy = basePolicy();
  policy.releaseReady = true;
  expectCode(() => assertDeclaredPolicy(policy, candidate), 'POLICY_RELEASE_CLAIM');
});

test('BR2.4: validator errors map to stable revision-bound finding codes', () => {
  const findings = mapSchemaFindings(
    [{ keyword: 'required', instancePath: '' }, { keyword: 'additionalProperties', instancePath: '' }, { keyword: 'minLength', instancePath: '/idempotencyKey' }],
    { revisionId: 'sha256:' + 'a'.repeat(64), contractElementId: 'MessageEnvelope' }
  );
  assert.deepEqual(findings.map(finding => finding.findingCode), ['SCHEMA_REQUIRED', 'SCHEMA_ADDITIONAL_PROPERTY', 'SCHEMA_MIN_LENGTH']);
  assert.ok(findings.every(finding => finding.revisionId === 'sha256:' + 'a'.repeat(64) && finding.ruleId === 'BR2.4'));
});

test('BR2.7-BR2.9: the sample fixture oracle requires exact positive and negative outcomes', async () => {
  const loaded = await loadPackage(sampleRoot);
  const results = await runFixtureOracle(sampleRoot, loaded);
  assert.equal(results.length, 4);
  assert.deepEqual(results.map(row => row.observed), ['pass', 'pass', 'fail', 'fail']);
  assert.ok(results.every(row => row.revisionId.startsWith('sha256:')));
  // The tenant envelope requires retailerId; the global identity-audit envelope forbids it.
  assert.deepEqual(
    results.filter(row => row.scenarioType === 'invalid').map(row => row.contractElementId),
    ['MessageEnvelope', 'GlobalIdentityAuditEnvelope']
  );
});

test('BR2.7: C07 typed-port and governed-record YAML coexist with JSON Schema fixtures', async () => {
  const port = await readFile(new URL('../../../../contracts/source/model-lifecycle/v1/finalize-heavy-work.shared-schema.yaml', import.meta.url), 'utf8');
  const governed = await readFile(new URL('../../../../contracts/source/common/v1/supplier-authority-head.shared-schema.yaml', import.meta.url), 'utf8');
  await withOracleFiles({
    'model-lifecycle/v1/finalize-heavy-work.shared-schema.yaml': { content: port, boundaryIds: ['C07'] },
    'common/v1/supplier-authority-head.shared-schema.yaml': { content: governed, boundaryIds: ['C05', 'C09'] },
    'test.schema.json': { content: JSON.stringify({ $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://contracts.stocksense.local/test.schema.json', title: 'TestPayload',
      type: 'object', required: ['value'], properties: { value: { type: 'string' } } }) },
    'fixtures.json': { kind: 'example-fixture', content: fixtureSidecar([validFixture('TestPayload')]) }
  }, async (root, loaded) => {
    assert.deepEqual((await runFixtureOracle(root, loaded)).map(row => row.observed), ['pass']);
  });
});

test('BR2.8: a fixture resolves a declared cross-document JSON Schema reference', async () => {
  const target = { $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://contracts.stocksense.local/target.schema.json', title: 'CrossDocumentPayload',
    type: 'object', required: ['item'], properties: { item: { $ref: 'https://contracts.stocksense.local/shared.schema.json' } } };
  const shared = { $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://contracts.stocksense.local/shared.schema.json', type: 'object',
    required: ['value'], properties: { value: { type: 'string' } } };
  const fixtures = [
    { ...validFixture('CrossDocumentPayload'), payload: { item: { value: 'ok' } } },
    { fixtureId: 'missing-referenced-value', contractElementId: 'CrossDocumentPayload', boundaryIds: ['C01'],
      scenarioType: 'invalid', expectedOutcome: 'fail', expectedFailureCode: 'SCHEMA_REQUIRED',
      expectedFailureRuleId: 'BR2.4', payload: { item: {} } }
  ];
  await withOracleFiles({
    'target.schema.json': { content: JSON.stringify(target) },
    'shared.schema.json': { content: JSON.stringify(shared) },
    'fixtures.json': { kind: 'example-fixture', content: fixtureSidecar(fixtures) }
  }, async (root, loaded) => {
    assert.deepEqual((await runFixtureOracle(root, loaded)).map(row => row.observed), ['pass', 'fail']);
  });
});

test('BR1.1: the fixture oracle rejects changed schema and fixture bytes after snapshot loading', async () => {
  const documents = {
    'test.schema.json': { content: JSON.stringify({ $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://contracts.stocksense.local/test.schema.json', title: 'TestPayload', type: 'object' }) },
    'fixtures.json': { kind: 'example-fixture', content: fixtureSidecar([validFixture('TestPayload')]) }
  };
  for (const changedDocument of Object.keys(documents)) {
    await withOracleFiles(documents, async (root, loaded) => {
      await writeFile(join(root, changedDocument), 'changed after snapshot');
      await assert.rejects(runFixtureOracle(root, loaded), error => error.code === 'DIGEST_MISMATCH' && error.ruleId === 'BR1.1');
    });
  }
});
