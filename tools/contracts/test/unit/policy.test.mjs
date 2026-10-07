import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
      const canonicalKind = ['schema', 'openapi', 'asyncapi'].includes(kind);
      entries.push({ document, artifactKind: canonicalKind ? kind : 'sidecar',
        ...(canonicalKind ? {} : { kind }), contentDigest: digest(content), revisionId, boundaryIds });
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
    [{ keyword: 'required', instancePath: '', params: { missingProperty: 'retailerId' } },
      { keyword: 'additionalProperties', instancePath: '', params: { additionalProperty: 'other' } },
      { keyword: 'minLength', instancePath: '/idempotencyKey' }],
    { revisionId: 'sha256:' + 'a'.repeat(64), contractElementId: 'MessageEnvelope' }
  );
  assert.deepEqual(findings.map(finding => finding.findingCode), ['SCHEMA_REQUIRED', 'SCHEMA_ADDITIONAL_PROPERTY', 'SCHEMA_MIN_LENGTH']);
  assert.ok(findings.every(finding => finding.revisionId === 'sha256:' + 'a'.repeat(64) && finding.ruleId === 'BR2.4'));
});

test('required and additional-property findings preserve the exact escaped JSON Pointer', () => {
  const findings = mapSchemaFindings([
    { keyword: 'required', instancePath: '/outer', params: { missingProperty: 'a/b~c' } },
    { keyword: 'additionalProperties', instancePath: '', params: { additionalProperty: 'other' } }
  ], { revisionId: digest('revision'), contractElementId: 'Example' });
  assert.deepEqual(findings.map(finding => finding.instancePath), ['/outer/a~1b~0c', '/other']);
  assert.throws(() => mapSchemaFindings([{ keyword: 'required', params: { missingProperty: 42 } }],
    { revisionId: digest('revision'), contractElementId: 'Example' }),
  error => error.code === 'FINDING_SHAPE' && error.ruleId === 'BR2.4');
});

test('BR2.7-BR2.9: the sample fixture oracle requires exact positive and negative outcomes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-sample-oracle-'));
  let results;
  try {
    await cp(sampleRoot, root, { recursive: true });
    const fixturePath = join(root, 'governance/example-fixture.json');
    const sidecar = JSON.parse(await readFile(fixturePath, 'utf8'));
    const paths = { 'c01-tenant-no-retailer': '/retailerId', 'c01-global-with-retailer': '/retailerId',
      'c18-manual-review-missing-version': '/expectedSupplierTermsVersion', 'c18-reconciliation-invalid-action': '/action',
      'c18-assistant-turn-empty-message': '/message' };
    for (const fixture of sidecar.fixtures) {
      if (paths[fixture.fixtureId]) fixture.expectedFailurePath = paths[fixture.fixtureId];
    }
    const bytes = JSON.stringify(sidecar);
    await writeFile(fixturePath, bytes);
    const loaded = await loadPackage(sampleRoot);
    const entries = loaded.entries.map(entry => entry.document === 'governance/example-fixture.json' ?
      { ...entry, contentDigest: digest(bytes) } : entry);
    results = await runFixtureOracle(root, { ...loaded, entries });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
  assert.equal(results.length, 10);
  assert.deepEqual(results.map(row => row.observed),
    ['pass', 'pass', 'fail', 'fail', 'pass', 'fail', 'pass', 'fail', 'pass', 'fail']);
  assert.ok(results.every(row => row.revisionId.startsWith('sha256:')));
  // The tenant envelope requires retailerId; the global identity-audit envelope forbids it.
  assert.deepEqual(
    results.filter(row => row.scenarioType === 'invalid').map(row => row.contractElementId),
    ['MessageEnvelope', 'GlobalIdentityAuditEnvelope', 'ManualReviewRequest',
      'ReconciliationRequest', 'AssistantTurnRequest']
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
    'fixtures.json': { kind: 'example-fixture', content: fixtureSidecar([validFixture('TestPayload'),
      { fixtureId: 'missing-value', contractElementId: 'TestPayload', boundaryIds: ['C01'],
        scenarioType: 'invalid', expectedOutcome: 'fail', expectedFailureCode: 'SCHEMA_REQUIRED',
        expectedFailureRuleId: 'BR2.4', expectedFailurePath: '/value', payload: {} }]) }
  }, async (root, loaded) => {
    assert.deepEqual((await runFixtureOracle(root, loaded)).map(row => row.observed), ['pass', 'fail']);
  });
});

test('BR2.8: a fixture resolves a declared cross-document JSON Schema reference', async () => {
  const target = { $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://contracts.stocksense.local/target.schema.json', title: 'CrossDocumentPayload',
    type: 'object', required: ['item'], properties: { item: { $ref: 'https://contracts.stocksense.local/shared.schema.json' } } };
  const shared = { $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://contracts.stocksense.local/shared.schema.json', title: 'SharedPayload', type: 'object',
    required: ['value'], properties: { value: { type: 'string' } } };
  const fixtures = [
    { ...validFixture('CrossDocumentPayload'), payload: { item: { value: 'ok' } } },
    { fixtureId: 'missing-referenced-value', contractElementId: 'CrossDocumentPayload', boundaryIds: ['C01'],
      scenarioType: 'invalid', expectedOutcome: 'fail', expectedFailureCode: 'SCHEMA_REQUIRED',
      expectedFailureRuleId: 'BR2.4', expectedFailurePath: '/item/value', payload: { item: {} } },
    { ...validFixture('SharedPayload'), payload: { value: 'ok' } },
    { fixtureId: 'missing-shared-value', contractElementId: 'SharedPayload', boundaryIds: ['C01'],
      scenarioType: 'invalid', expectedOutcome: 'fail', expectedFailureCode: 'SCHEMA_REQUIRED',
      expectedFailureRuleId: 'BR2.4', expectedFailurePath: '/value', payload: {} }
  ];
  await withOracleFiles({
    'target.schema.json': { content: JSON.stringify(target) },
    'shared.schema.json': { content: JSON.stringify(shared) },
    'fixtures.json': { kind: 'example-fixture', content: fixtureSidecar(fixtures) }
  }, async (root, loaded) => {
    assert.deepEqual((await runFixtureOracle(root, loaded)).map(row => row.observed), ['pass', 'fail', 'pass', 'fail']);
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

const C18_REVISION = digest('synthetic-c18-revision');
const c18Document = { openapi: '3.1.2', components: { schemas: {
  ManualReviewRequest: { type: 'object', required: ['expectedVersion'],
    properties: { expectedVersion: { type: 'integer', minimum: 1 } }, additionalProperties: false },
  ReviewWrapper: { $ref: '#/components/schemas/ManualReviewRequest' }
} } };
const c18Fixture = (fixtureId, element, payload, expectedOutcome = 'pass') => ({
  fixtureId, boundaryIds: ['C18'], contractElementId: element, documentRevisionId: C18_REVISION,
  scenarioType: expectedOutcome === 'pass' ? 'valid' : 'invalid', expectedOutcome,
  ...(expectedOutcome === 'fail' ? { expectedFailureCode: 'SCHEMA_REQUIRED', expectedFailureRuleId: 'BR2.4',
    expectedFailurePath: '/expectedVersion' } : {}), payload
});
const c18OracleFiles = fixtures => ({
  'browser.openapi.yaml': { kind: 'openapi', revisionId: C18_REVISION, boundaryIds: ['C18'], content: JSON.stringify(c18Document) },
  'fixtures.json': { kind: 'example-fixture', boundaryIds: ['C18'], content: fixtureSidecar([
    c18Fixture('coverage-positive', 'ManualReviewRequest', { expectedVersion: 2 }),
    c18Fixture('coverage-negative', 'ManualReviewRequest', {}, 'fail'), ...fixtures
  ]) }
});

test('C18 OpenAPI component accepts its revision-bound positive and exact negative fixtures', async () => {
  const fixtures = [c18Fixture('c18-valid', 'ManualReviewRequest', { expectedVersion: 2 }),
    c18Fixture('c18-required', 'ManualReviewRequest', {}, 'fail')];
  await withOracleFiles(c18OracleFiles(fixtures), async (root, loaded) => {
    assert.deepEqual((await runFixtureOracle(root, loaded)).slice(-2).map(row => row.observed), ['pass', 'fail']);
  });
});

test('C18 OpenAPI fixture follows declared local component references', async () => {
  await withOracleFiles(c18OracleFiles([c18Fixture('c18-ref', 'ReviewWrapper', { expectedVersion: 2 })]),
    async (root, loaded) => assert.deepEqual((await runFixtureOracle(root, loaded)).slice(-1).map(row => row.observed), ['pass']));
});

test('C18 OpenAPI fixture rejects an unrelated schema finding', async () => {
  const fixture = { ...c18Fixture('c18-wrong-code', 'ManualReviewRequest', {}, 'fail'), expectedFailureCode: 'SCHEMA_MINIMUM' };
  await withOracleFiles(c18OracleFiles([fixture]), async (root, loaded) => {
    await assert.rejects(runFixtureOracle(root, loaded), error => error.code === 'FIXTURE_ORACLE_MISMATCH' && error.ruleId === 'NFR8.13');
  });
});

test('C18 OpenAPI fixture refuses an absent immutable document revision or element', async () => {
  for (const fixture of [
    { ...c18Fixture('c18-wrong-revision', 'ManualReviewRequest', { expectedVersion: 2 }), documentRevisionId: digest('other') },
    c18Fixture('c18-wrong-element', 'OtherRequest', { expectedVersion: 2 })
  ]) {
    await withOracleFiles(c18OracleFiles([fixture]), async (root, loaded) => {
      await assert.rejects(runFixtureOracle(root, loaded), error => error.code === 'FIXTURE_TARGET' && error.ruleId === 'BR2.8');
    });
  }
});

test('C18 OpenAPI fixture refuses references outside the declared component graph', async () => {
  const files = c18OracleFiles([c18Fixture('c18-remote', 'ReviewWrapper', { expectedVersion: 2 })]);
  const document = JSON.parse(JSON.stringify(c18Document));
  document.components.schemas.ReviewWrapper.$ref = 'https://example.invalid/other.schema.json';
  files['browser.openapi.yaml'].content = JSON.stringify(document);
  await withOracleFiles(files, async (root, loaded) => {
    await assert.rejects(runFixtureOracle(root, loaded), error => error.code === 'FIXTURE_REFERENCE' && error.ruleId === 'BR2.8');
  });
});

test('an exact required-field oracle rejects the wrong missing property and unrelated extra findings', async () => {
  const schema = { $schema: 'https://json-schema.org/draft/2020-12/schema', title: 'TwoFields',
    type: 'object', required: ['first', 'second'],
    properties: { first: { type: 'string' }, second: { type: 'string' } }, additionalProperties: false };
  const valid = { fixtureId: 'two-valid', boundaryIds: ['C01'], contractElementId: 'TwoFields',
    scenarioType: 'valid', expectedOutcome: 'pass', payload: { first: 'one', second: 'two' } };
  const invalid = { fixtureId: 'two-missing-first', boundaryIds: ['C01'], contractElementId: 'TwoFields',
    scenarioType: 'invalid', expectedOutcome: 'fail', expectedFailureCode: 'SCHEMA_REQUIRED',
    expectedFailureRuleId: 'BR2.4', expectedFailurePath: '/first', payload: { second: 'two' } };
  const files = fixtures => ({ 'two.schema.json': { content: JSON.stringify(schema) },
    'fixtures.json': { kind: 'example-fixture', content: fixtureSidecar(fixtures) } });
  await withOracleFiles(files([valid, invalid]), async (root, loaded) => {
    assert.deepEqual((await runFixtureOracle(root, loaded)).map(row => row.observed), ['pass', 'fail']);
  });
  for (const payload of [{ first: 'one' }, {}]) {
    await withOracleFiles(files([valid, { ...invalid, payload }]), async (root, loaded) => {
      await assert.rejects(runFixtureOracle(root, loaded),
        error => error.code === 'FIXTURE_ORACLE_MISMATCH' && error.ruleId === 'NFR8.13');
    });
  }
});

test('a sidecar retaining C18 cannot remove every C18 fixture row', async () => {
  const schema = { $schema: 'https://json-schema.org/draft/2020-12/schema', title: 'C01Payload',
    type: 'object', required: ['value'], properties: { value: { type: 'string' } } };
  const c01Fixtures = [
    { fixtureId: 'c01-positive', boundaryIds: ['C01'], contractElementId: 'C01Payload',
      scenarioType: 'valid', expectedOutcome: 'pass', payload: { value: 'synthetic' } },
    { fixtureId: 'c01-negative', boundaryIds: ['C01'], contractElementId: 'C01Payload',
      scenarioType: 'invalid', expectedOutcome: 'fail', expectedFailureCode: 'SCHEMA_REQUIRED',
      expectedFailureRuleId: 'BR2.4', expectedFailurePath: '/value', payload: {} }
  ];
  await withOracleFiles({
    'c01.schema.json': { content: JSON.stringify(schema), boundaryIds: ['C01'] },
    'browser.openapi.yaml': { kind: 'openapi', revisionId: C18_REVISION, boundaryIds: ['C18'],
      content: JSON.stringify(c18Document) },
    'fixtures.json': { kind: 'example-fixture', boundaryIds: ['C01', 'C18'],
      content: fixtureSidecar(c01Fixtures) }
  }, async (root, loaded) => {
    await assert.rejects(runFixtureOracle(root, loaded),
      error => error.code === 'FIXTURE_COVERAGE' && error.ruleId === 'BR2.7');
  });
});

const schemaDocument = (title, body) => JSON.stringify({ $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: `https://contracts.stocksense.local/${title}.schema.json`, title, ...body });

test('BR2.7: coverage resolves a fixture target the way validation does, not from its declared revision', async () => {
  // A revision a fixture declares for itself was believed by the coverage check
  // and discarded by the validation run, so a sidecar could claim a boundary
  // while every one of its fixtures validated against something else.
  const openapi = ['openapi: 3.1.2', 'info:', '  title: Shared', '  version: 1.0.0', 'paths: {}',
    'components:', '  schemas:', '    Document:', '      type: object',
    '      required: [documentField]', '      properties:', '        documentField: { type: string }'].join('\n');
  await withOracleFiles({
    'shared.openapi.yaml': { content: openapi, kind: 'openapi', revisionId: digest('openapi-target'), boundaryIds: ['C18'] },
    'shared.schema.json': { content: schemaDocument('Shared', { type: 'object', required: ['value'],
      properties: { value: { type: 'string' } } }), revisionId: digest('schema-target'), boundaryIds: ['C01', 'C18'] },
    'fixtures.json': { kind: 'example-fixture', boundaryIds: ['C18'], content: fixtureSidecar([
      { ...validFixture('Shared'), boundaryIds: ['C18'], schemaRevisionId: digest('openapi-target') },
      { fixtureId: 'invalid-Shared', contractElementId: 'Shared', boundaryIds: ['C18'],
        scenarioType: 'invalid', expectedOutcome: 'fail', expectedFailureCode: 'SCHEMA_REQUIRED',
        expectedFailureRuleId: 'BR2.4', expectedFailurePath: '/value',
        schemaRevisionId: digest('openapi-target'), payload: {} }
    ]) }
  }, async (root, loaded) => {
    await assert.rejects(runFixtureOracle(root, loaded),
      error => error.code === 'FIXTURE_COVERAGE' && error.ruleId === 'BR2.7');
  });
});

test('BR2.7: an AsyncAPI document is exempt from the fixture pair but cannot carry a boundary alone', async () => {
  const asyncapi = ['asyncapi: 3.0.0', 'info:', '  title: Transport', '  version: 1.0.0'].join('\n');
  const profile = schemaDocument('Profile', { type: 'object', required: ['value'],
    properties: { value: { type: 'string' } } });
  // The oracle has no payload extractor for AsyncAPI, so such a document is
  // validated as a document elsewhere and carries no fixtures here.
  await withOracleFiles({
    'transport.asyncapi.yaml': { content: asyncapi, kind: 'asyncapi', boundaryIds: ['C23'] },
    'profile.schema.json': { content: profile, boundaryIds: ['C23'] },
    'fixtures.json': { kind: 'example-fixture', boundaryIds: ['C23'], content: fixtureSidecar([
      { ...validFixture('Profile'), boundaryIds: ['C23'] },
      { fixtureId: 'invalid-Profile', contractElementId: 'Profile', boundaryIds: ['C23'],
        scenarioType: 'invalid', expectedOutcome: 'fail', expectedFailureCode: 'SCHEMA_REQUIRED',
        expectedFailureRuleId: 'BR2.4', expectedFailurePath: '/value', payload: {} }
    ]) }
  }, async (root, loaded) => {
    assert.deepEqual((await runFixtureOracle(root, loaded)).map(row => row.observed), ['pass', 'fail']);
  });
  // With nothing bindable under the boundary the pair rule would hold
  // vacuously, which is the claim-with-zero-fixtures hole itself.
  await withOracleFiles({
    'transport.asyncapi.yaml': { content: asyncapi, kind: 'asyncapi', boundaryIds: ['C23'] },
    'other.schema.json': { content: profile, boundaryIds: ['C01'] },
    'fixtures.json': { kind: 'example-fixture', boundaryIds: ['C23'], content: fixtureSidecar([
      { ...validFixture('Profile'), boundaryIds: ['C01'] }
    ]) }
  }, async (root, loaded) => {
    await assert.rejects(runFixtureOracle(root, loaded),
      error => error.code === 'FIXTURE_COVERAGE' && error.ruleId === 'BR2.7');
  });
});

test('BR2.8: a cyclic YAML alias is refused with a governed code, not a stack overflow', async () => {
  // A self-referential anchor parses without error and yields a genuinely
  // cyclic object; walking it unguarded died as a RangeError with no code.
  const cyclic = ['openapi: 3.1.2', 'info:', '  title: Cyclic', '  version: 1.0.0', 'paths: {}',
    'components:', '  schemas:', '    Loop: &loop', '      type: object', '      properties:',
    '        self: *loop'].join('\n');
  await withOracleFiles({
    'cyclic.openapi.yaml': { content: cyclic, kind: 'openapi', revisionId: digest('cyclic'), boundaryIds: ['C18'] },
    'fixtures.json': { kind: 'example-fixture', boundaryIds: ['C18'], content: fixtureSidecar([
      { fixtureId: 'cyclic-positive', contractElementId: 'Loop', boundaryIds: ['C18'], scenarioType: 'valid',
        expectedOutcome: 'pass', documentRevisionId: digest('cyclic'), payload: {} },
      // Present so the document satisfies the coverage pair and the run
      // actually reaches the document, which is what this test is about.
      { fixtureId: 'cyclic-negative', contractElementId: 'Loop', boundaryIds: ['C18'], scenarioType: 'invalid',
        expectedOutcome: 'fail', documentRevisionId: digest('cyclic'), expectedFailureCode: 'SCHEMA_TYPE',
        expectedFailureRuleId: 'BR2.4', expectedFailurePath: '/self', payload: { self: 1 } }
    ]) }
  }, async (root, loaded) => {
    await assert.rejects(runFixtureOracle(root, loaded),
      error => error.code === 'FIXTURE_CYCLE' && error.ruleId === 'BR2.8');
  });
});

test('BR2.4: every property-scoped keyword reports its own exact location', () => {
  // Ajv puts instancePath on the container for all of these, so left unmapped
  // two unrelated violations in one object share a location and a negative
  // fixture passes for a rule it never exercised.
  const findings = mapSchemaFindings([
    { keyword: 'dependentRequired', instancePath: '', params: { property: 'card', missingProperty: 'cvv' } },
    { keyword: 'unevaluatedProperties', instancePath: '/nested', params: { unevaluatedProperty: 'extra' } },
    { keyword: 'propertyNames', instancePath: '', params: { propertyName: 'Bad Name' } },
    { keyword: 'required', instancePath: '', params: { missingProperty: '' } }
  ], { revisionId: digest('revision'), contractElementId: 'Example' });
  // "" is a legal member name and its pointer is a bare trailing slash.
  assert.deepEqual(findings.map(finding => finding.instancePath),
    ['/cvv', '/nested/extra', '/Bad Name', '/']);
  assert.deepEqual(findings.map(finding => finding.findingCode),
    ['SCHEMA_DEPENDENT_REQUIRED', 'SCHEMA_UNEVALUATED_PROPERTIES', 'SCHEMA_PROPERTY_NAMES', 'SCHEMA_REQUIRED']);
});

test('BR2.3: a dependentRequired negative fixture cannot pass for a different dependency rule', async () => {
  const schema = schemaDocument('Order', { type: 'object',
    dependentRequired: { card: ['cvv'], shipping: ['address'] } });
  const oracle = payload => ({ fixtureId: 'dependent-missing-cvv', contractElementId: 'Order',
    boundaryIds: ['C01'], scenarioType: 'invalid', expectedOutcome: 'fail',
    expectedFailureCode: 'SCHEMA_DEPENDENT_REQUIRED', expectedFailureRuleId: 'BR2.4',
    expectedFailurePath: '/cvv', payload });
  const paired = payload => [{ ...validFixture('Order'), payload: {} }, oracle(payload)];
  await withOracleFiles({
    'order.schema.json': { content: schema },
    'fixtures.json': { kind: 'example-fixture', content: fixtureSidecar(paired({ card: '4111' })) }
  }, async (root, loaded) => {
    assert.deepEqual((await runFixtureOracle(root, loaded)).map(row => row.observed), ['pass', 'fail']);
  });
  // This payload violates the shipping rule, not the declared card rule.
  await withOracleFiles({
    'order.schema.json': { content: schema },
    'fixtures.json': { kind: 'example-fixture', content: fixtureSidecar(paired({ shipping: 'express' })) }
  }, async (root, loaded) => {
    await assert.rejects(runFixtureOracle(root, loaded),
      error => error.code === 'FIXTURE_ORACLE_MISMATCH' && error.ruleId === 'NFR8.13');
  });
});
