import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { ALL_BOUNDARIES, CANONICAL_KINDS, FIXED_PATHS, loadPackage } from '../../src/package-loader.mjs';
import { assertDeclaredPolicy, mapSchemaFindings, runFixtureOracle } from '../../src/policy.mjs';

const sampleRoot = fileURLToPath(new URL('../../../../contracts/samples/walking-skeleton/', import.meta.url));
const expectCode = (fn, code) => assert.throws(fn, error => error.code === code);

const candidate = { boundaryIds: ['C01'], manifest: { manifestStatus: 'candidate' } };
const basePolicy = () => ({
  contractPackagePolicyVersion: '1.0.0',
  requiredBoundaryIds: [...ALL_BOUNDARIES],
  requiredCanonicalKinds: Object.fromEntries(Object.entries(CANONICAL_KINDS).map(([kind, ids]) => [kind, ids.split(' ')])),
  requiredCanonicalPaths: { C01: [...FIXED_PATHS.C01] },
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
