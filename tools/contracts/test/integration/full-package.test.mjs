import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { ALL_BOUNDARIES, digest, loadPackage } from '../../src/package-loader.mjs';
import { DIALECTS, createSchemaValidator } from '../../src/validators.mjs';
import { asyncApiFixtureSchema, asyncApiMessageElements, mapSchemaFindings,
  openApiNamedExamples, runFixtureOracle } from '../../src/policy.mjs';
import { buildFullPackage, fixturePair, namedOpenApiFixtures } from '../../src/full-package.mjs';
import { buildPackageBundle, verifyPackageBundle } from '../../src/package-bundle.mjs';

// Only the thin C01/C18 walking skeleton had ever been packaged, so every rule
// that is whole-catalogue rather than per-document - the boundary inventory,
// required kinds, fixed paths, per-boundary sidecars, cross-document references
// and the fixture pair rule - had never met the real catalogue at once. These
// tests assemble the complete C01-C27 candidate and judge it.
const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));

// Nine documents have no components; two of them have inline JSON response
// schemas that the oracle now binds. The other seven remain payload-exempt.
// Asserted exactly, as a ratchet rather than a tolerance - adding components to
// one of these, or removing them from another, fails here and forces the
// AI-DLC record to be updated with it.
const WITHOUT_COMPONENTS = Object.freeze([
  'identity-access/v1/global-audit-read.openapi.yaml',
  'identity-access/v1/identity-metadata.openapi.yaml',
  'planning-purchasing/v1/assistant-purchasing.openapi.yaml',
  'retail-data/v1/assistant-inventory.openapi.yaml',
  'retail-data/v1/dataset-exports.openapi.yaml',
  'retail-data/v1/forecast-inputs.openapi.yaml',
  'retail-data/v1/supplier-reference.openapi.yaml',
  'supplier-knowledge/v1/assistant-retrieval.openapi.yaml',
  'web-bff/v1/identity-session.openapi.yaml'
]);

const ASYNCAPI_MESSAGES = Object.freeze({
  'audit-evidence/v1/authoritative-audit.asyncapi.yaml': [
    'message:auditEvents:auditEvent', 'message:globalIdentityAuditEvents:globalIdentityAuditEvent'
  ],
  'retail-data/v1/inventory-import-audit.asyncapi.yaml': [
    'message:inventoryImportAuditEvents:inventoryImportAuditEvent'
  ],
  'messaging-platform/v1/transport-conformance.asyncapi.yaml': [
    'message:tenantMessages:tenantEnvelope', 'message:tenantDeadLetters:tenantEnvelope',
    'message:globalIdentityMessages:globalIdentityEnvelope',
    'message:globalIdentityDeadLetters:globalIdentityEnvelope'
  ],
  'recovery-coordination/v1/participant-protocol.asyncapi.yaml': [
    'message:recoveryCommands:recoveryCommand',
    'message:recoveryAcknowledgements:recoveryAcknowledgement',
    'message:recoveryRestoreAttestations:recoveryRestoreAttestation'
  ],
  'recovery-coordination/v1/recovery-audit.asyncapi.yaml': ['message:recoveryEvents:recoveryEvent'],
  'retail-data/v1/retail-reference-changed.asyncapi.yaml': [
    'message:retailReferenceChanged:retailReferenceChanged'
  ],
  'retail-data/v1/inventory-import.asyncapi.yaml': [
    'message:inventoryImportRequested:inventoryImportRequested',
    'message:inventoryImportCompleted:inventoryImportCompleted',
    'message:inventoryImportFailed:inventoryImportFailed'
  ],
  'supplier-knowledge/v1/embedding-build-quiesced.asyncapi.yaml': [
    'message:embeddingBuildQuiesced:embeddingBuildQuiesced'
  ]
});

const TENANT_ENVELOPE_ID = 'https://contracts.stocksense.local/common/v1/message-envelope.schema.json';
const TENANT_ENVELOPE_FIELDS = Object.freeze([
  'messageId', 'messageType', 'schemaVersion', 'occurredAt', 'retailerId',
  'actor', 'correlationId', 'causationId', 'idempotencyKey',
  'placementGeneration', 'producer', 'payloadDigest', 'data'
]);

async function assembled() {
  const out = await mkdtemp(join(tmpdir(), 'stocksense-full-package-test-'));
  try { return { out, built: await buildFullPackage(repoRoot, out), clean: () => rm(out, { recursive: true, force: true }) }; }
  catch (error) { await rm(out, { recursive: true, force: true }); throw error; }
}

test('C01 generates and verifies every required tenant envelope omission across bound messages', async () => {
  const YAML = (await import('yaml')).default;
  const envelope = JSON.parse(await readFile(join(repoRoot,
    'contracts/source/common/v1/message-envelope.schema.json'), 'utf8'));
  assert.deepEqual(envelope.required, TENANT_ENVELOPE_FIELDS);
  const registry = new Map([[envelope.$id, envelope]]);
  let bound = 0;
  const fixtureIds = new Set();
  for (const [documentPath, elements] of Object.entries(ASYNCAPI_MESSAGES)) {
    const document = YAML.parse(await readFile(join(repoRoot, 'contracts/source', documentPath), 'utf8'),
      { strict: true, uniqueKeys: true });
    for (const element of elements) {
      const schema = asyncApiFixtureSchema(document, element);
      if (!(schema.$ref === TENANT_ENVELOPE_ID ||
          schema.allOf?.some(branch => branch.$ref === TENANT_ENVELOPE_ID))) continue;
      bound += 1;
      const revisionId = 'test-revision';
      const pair = fixturePair({ artifactKind: 'asyncapi', document: documentPath,
        revisionId, boundaryIds: ['C01'] }, { element, schema, root: schema }, registry);
      assert.equal(pair.problem, null, `${documentPath} ${element}: ${pair.problem}`);
      const positive = pair.fixtures.find(fixture => fixture.scenarioType === 'valid');
      const omissions = pair.fixtures.filter(fixture => fixture.fixtureId.includes('-envelope-'));
      assert.deepEqual(omissions.map(fixture => fixture.expectedFailurePath),
        TENANT_ENVELOPE_FIELDS.map(field => `/${field}`), element);
      const validate = createSchemaValidator(schema, registry, { openApiComponents: true });
      assert.equal(validate(positive.payload), true, element);
      for (const fixture of omissions) {
        assert.equal(fixtureIds.has(fixture.fixtureId), false, fixture.fixtureId);
        fixtureIds.add(fixture.fixtureId);
        assert.ok(fixture.fixtureId.length <= 128, fixture.fixtureId);
        assert.equal(fixture.documentRevisionId, revisionId);
        assert.equal(validate(fixture.payload), false, fixture.fixtureId);
        assert.deepEqual(mapSchemaFindings(validate.errors, { revisionId, contractElementId: element }), [{
          findingCode: 'SCHEMA_REQUIRED', ruleId: 'BR2.4', revisionId,
          contractElementId: element, instancePath: fixture.expectedFailurePath
        }], fixture.fixtureId);
      }
    }
  }
  assert.equal(bound, 13);
  assert.equal(fixtureIds.size, bound * TENANT_ENVELOPE_FIELDS.length);
});

test('inventory import audit binds job identity and rejects contradictory terminal outcomes', async () => {
  const YAML = (await import('yaml')).default;
  const documentPath = 'retail-data/v1/inventory-import-audit.asyncapi.yaml';
  const document = YAML.parse(await readFile(join(repoRoot, 'contracts/source', documentPath), 'utf8'));
  assert.deepEqual(document['x-stocksense-import-audit-link'], {
    jobIdentity: ['retailerId', 'data.resourceId'], matchingJobField: 'data.jobId',
    matchingSourceDigest: 'data.sourceDigest', matchingCorrelationId: 'correlationId',
    enforceBeforeAuditOutboxCommit: true
  });
  const envelope = JSON.parse(await readFile(join(repoRoot,
    'contracts/source/common/v1/message-envelope.schema.json'), 'utf8'));
  const registry = new Map([[envelope.$id, envelope]]);
  const element = ASYNCAPI_MESSAGES[documentPath][0];
  const schema = asyncApiFixtureSchema(document, element);
  const strict = new Ajv2020({ strict: true, allErrors: true, validateFormats: true, logger: false });
  addFormats(strict);
  strict.addSchema(envelope);
  assert.equal(typeof strict.compile(schema), 'function');
  const pair = fixturePair({ artifactKind: 'asyncapi', document: documentPath,
    revisionId: 'test-revision', boundaryIds: ['C15'] }, { element, schema, root: schema }, registry);
  assert.equal(pair.problem, null);
  const positive = pair.fixtures.find(fixture => fixture.scenarioType === 'valid').payload;
  const validate = createSchemaValidator(schema, registry, { openApiComponents: true });
  assert.equal(validate(positive), true);
  const failed = { ...positive, data: { ...positive.data, action: 'inventory.import.failed',
    outcome: 'failed', reasonCode: 'IMPORT_FAILED' } };
  assert.equal(validate(failed), true);
  assert.equal(validate({ ...failed, data: { ...failed.data, outcome: 'accepted' } }), false);
  const missingReason = { ...failed, data: { ...failed.data } };
  delete missingReason.data.reasonCode;
  assert.equal(validate(missingReason), false);
  assert.equal(validate({ ...positive, data: { ...positive.data,
    action: 'inventory.import.completed', outcome: 'failed' } }), false);
});

test('every canonical schema, OpenAPI target, and AsyncAPI message binds or has an allowed exemption', async () => {
  const { out, built, clean } = await assembled();
  try {
    // Nothing is refused and nothing is unaccounted for. The exempt documents
    // are seven OpenAPI documents and three closed-dialect schemas. The eight
    // AsyncAPI documents contribute sixteen channel-message targets.
    assert.deepEqual(built.problems, []);
    assert.equal(built.bound, 38);
    assert.equal(built.exempt, 10);
    assert.equal(built.bound + built.exempt, 48);
    const loaded = await loadPackage(out);
    const bundleBytes = await buildPackageBundle(out);
    const bundled = verifyPackageBundle(bundleBytes);
    assert.equal(bundled.manifestDigest, loaded.manifestDigest);
    assert.equal(bundled.fileCount, loaded.entries.length + 1);
    assert.deepEqual(bundleBytes, await buildPackageBundle(out), 'full-catalogue package bundle is deterministic');
    const fixtures = JSON.parse(await readFile(join(out, 'governance/example-fixture.json'), 'utf8')).fixtures;
    const openApiExempt = loaded.entries.filter(entry => entry.artifactKind === 'openapi' &&
      !fixtures.some(fixture => fixture.documentRevisionId === entry.revisionId));
    assert.equal(openApiExempt.length, 7);
    const YAML = (await import('yaml')).default;
    const closedSchemas = [];
    for (const entry of loaded.entries.filter(item => item.artifactKind === 'schema')) {
      const source = YAML.parse(await readFile(join(out, entry.document), 'utf8'));
      if (source.$schema !== DIALECTS.schema) closedSchemas.push(entry.document);
    }
    assert.equal(closedSchemas.length, 3);
    assert.ok(built.manifest, 'a complete package is written');
    assert.equal(built.manifest.manifestStatus, 'candidate');
    assert.equal(built.manifest.boundaryCoverage.length, ALL_BOUNDARIES.length);
  } finally { await clean(); }
});

test('each bound element contributes a positive, a required negative, and the mutations it admits', async () => {
  const { out, built, clean } = await assembled();
  try {
    const sidecar = JSON.parse(await readFile(join(out, 'governance/example-fixture.json'), 'utf8'));
    assert.equal(sidecar.syntheticOnly, true);
    const generated = sidecar.fixtures.filter(fixture => fixture.canonicalExampleId === undefined);
    const positives = generated.filter(fixture => fixture.scenarioType === 'valid');
    const negatives = generated.filter(fixture => fixture.scenarioType === 'invalid');
    assert.equal(positives.length, built.bound);
    // One generic required omission per bound element, every required tenant
    // envelope omission, and the non-required mutations each element admits.
    assert.ok(negatives.length > built.bound, `expected more than ${built.bound} negatives, got ${negatives.length}`);

    const requiredOnly = negatives.filter(fixture => fixture.fixtureId.endsWith('-negative'));
    assert.equal(requiredOnly.length, built.bound);
    for (const fixture of requiredOnly) {
      assert.equal(fixture.expectedOutcome, 'fail');
      assert.equal(fixture.expectedFailureCode, 'SCHEMA_REQUIRED');
      assert.equal(fixture.expectedFailureRuleId, 'BR2.4');
      assert.match(fixture.expectedFailurePath, /^\/[^/]/);
    }

    // Every negative that is not the required omission declares its findings as
    // a set, and at least one of them is not SCHEMA_REQUIRED. Before these
    // existed, all forty oracle rows asserted the same keyword, so nothing
    // exercised an enum, a closed object or a conditional discriminator - the
    // architecture review's A-05.
    const mutations = negatives.filter(fixture => Array.isArray(fixture.expectedFailures));
    const envelopeOmissions = negatives.filter(fixture =>
      fixture.expectedFailureCode === 'SCHEMA_REQUIRED' &&
      TENANT_ENVELOPE_FIELDS.some(field => fixture.fixtureId.endsWith(`-envelope-${field}`)));
    assert.equal(requiredOnly.length + envelopeOmissions.length + mutations.length, negatives.length);
    assert.ok(mutations.length > 0, 'no non-required negatives were produced');
    for (const fixture of mutations) {
      assert.equal(fixture.expectedOutcome, 'fail');
      assert.ok(fixture.expectedFailures.length > 0, fixture.fixtureId);
      assert.ok(fixture.expectedFailures.some(row => row.code !== 'SCHEMA_REQUIRED'),
        `${fixture.fixtureId} asserts only SCHEMA_REQUIRED`);
      for (const row of fixture.expectedFailures) {
        assert.match(row.code, /^SCHEMA_[A-Z_]+$/);
        assert.equal(row.ruleId, 'BR2.4');
        assert.equal(typeof row.path, 'string');
      }
    }
    // The constraints the catalogue actually leans on are represented.
    const codes = new Set(mutations.flatMap(fixture => fixture.expectedFailures.map(row => row.code)));
    for (const code of ['SCHEMA_ADDITIONAL_PROPERTY', 'SCHEMA_ENUM', 'SCHEMA_CONST', 'SCHEMA_IF']) {
      assert.ok(codes.has(code), `no negative asserts ${code}`);
    }
    // Every payload is derived from a schema and verified by the oracle, never
    // hand-written, so a fixture cannot be authored against a schema it does
    // not satisfy.
    assert.ok(sidecar.fixtures.every(fixture => fixture.payload !== undefined));
  } finally { await clean(); }
});

test('all sixteen AsyncAPI channel messages bind distinct revision-scoped exact oracle pairs', async () => {
  const YAML = (await import('yaml')).default;
  const { out, built, clean } = await assembled();
  try {
    const loaded = await loadPackage(out);
    const fixtures = JSON.parse(await readFile(join(out, 'governance/example-fixture.json'), 'utf8')).fixtures;
    const results = await runFixtureOracle(out, loaded);
    const tenantEnvelope = JSON.parse(await readFile(join(out,
      'common/v1/message-envelope.schema.json'), 'utf8'));
    assert.deepEqual(tenantEnvelope.required, TENANT_ENVELOPE_FIELDS);
    const asyncEntries = loaded.entries.filter(entry => entry.artifactKind === 'asyncapi');
    assert.deepEqual(asyncEntries.map(entry => entry.document).sort(), Object.keys(ASYNCAPI_MESSAGES).sort());
    assert.equal(Object.values(ASYNCAPI_MESSAGES).flat().length, 16);
    assert.equal(new Set(fixtures.map(fixture => fixture.fixtureId)).size, fixtures.length,
      'fixture IDs must remain unique when C23 reuses a message on two channels');

    let tenantMessages = 0;
    for (const entry of asyncEntries) {
      const document = YAML.parse(await readFile(join(out, entry.document), 'utf8'),
        { strict: true, uniqueKeys: true });
      assert.deepEqual(asyncApiMessageElements(document).sort(), [...ASYNCAPI_MESSAGES[entry.document]].sort());
      for (const element of ASYNCAPI_MESSAGES[entry.document]) {
        const slug = element.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-|-$/g, '');
        const pair = fixtures.filter(fixture => fixture.documentRevisionId === entry.revisionId &&
          fixture.contractElementId === element);
        assert.equal(pair.filter(fixture => fixture.scenarioType === 'valid').length, 1, element);
        const requiredNegative = pair.filter(fixture => fixture.expectedFailureCode === 'SCHEMA_REQUIRED');
        const generic = requiredNegative.filter(fixture => fixture.fixtureId.endsWith('-negative'));
        assert.equal(generic.length, 1, element);
        assert.equal(generic[0].expectedFailureRuleId, 'BR2.4');
        assert.match(generic[0].expectedFailurePath, /^\/[^/]/);
        const schema = asyncApiFixtureSchema(document, element);
        const isTenantEnvelope = schema.$ref === TENANT_ENVELOPE_ID ||
          schema.allOf?.some(branch => branch.$ref === TENANT_ENVELOPE_ID);
        if (isTenantEnvelope) tenantMessages += 1;
        const omissions = pair.filter(fixture => fixture.fixtureId.includes('-envelope-'));
        assert.equal(omissions.length, isTenantEnvelope ? TENANT_ENVELOPE_FIELDS.length : 0, element);
        assert.equal(requiredNegative.length, 1 + omissions.length, element);
        assert.deepEqual(omissions.map(fixture => fixture.expectedFailurePath),
          isTenantEnvelope ? TENANT_ENVELOPE_FIELDS.map(field => `/${field}`) : [], element);
        for (const fixture of omissions) {
          const field = fixture.expectedFailurePath.slice(1);
          assert.ok(fixture.fixtureId.endsWith(`-envelope-${field}`), fixture.fixtureId);
          assert.equal(fixture.expectedFailureCode, 'SCHEMA_REQUIRED');
          assert.equal(fixture.expectedFailureRuleId, 'BR2.4');
          assert.equal(fixture.expectedOutcome, 'fail');
          assert.ok(Object.hasOwn(pair[0].payload, field), fixture.fixtureId);
          assert.equal(Object.hasOwn(fixture.payload, field), false, fixture.fixtureId);
          assert.deepEqual({ ...fixture.payload, [field]: pair[0].payload[field] }, pair[0].payload,
            `the ${field} omission must leave every other value intact`);
          assert.equal(results.find(row => row.fixtureId === fixture.fixtureId)?.observed, 'fail', fixture.fixtureId);
        }
        assert.ok(pair.filter(fixture => !fixture.fixtureId.includes('-envelope-'))
          .every(fixture => fixture.fixtureId.includes(slug)), element);
        assert.ok(pair.every(fixture => fixture.boundaryIds.every(id => entry.boundaryIds.includes(id))), element);
        assert.deepEqual(results.filter(row => pair.some(fixture => fixture.fixtureId === row.fixtureId))
          .filter(row => row.fixtureId.endsWith('-positive') || row.fixtureId.endsWith('-negative'))
          .map(row => row.observed), ['pass', 'fail'], element);
      }
    }
    assert.equal(tenantMessages, 13);
    assert.equal(built.bound, 22 + 16);
  } finally { await clean(); }
});

test('the complete C01-C27 candidate package passes the governance rules', async () => {
  // This is the whole point. Until the OpenAPI components compiled and the
  // bindability exemption was derived rather than assumed, this package was
  // refused with FIXTURE_COVERAGE/BR2.7 and the catalogue could not be packaged
  // at all.
  const { out, built, clean } = await assembled();
  try {
    assert.ok(built.manifest);
    const loaded = await loadPackage(out);
    assert.deepEqual([...loaded.boundaryIds].sort(), [...ALL_BOUNDARIES].sort());
    const results = await runFixtureOracle(out, loaded);
    // Every declared fixture is judged, and none is silently skipped.
    const sidecar = JSON.parse(await readFile(join(out, 'governance/example-fixture.json'), 'utf8'));
    assert.equal(results.length, sidecar.fixtures.length);
    assert.ok(results.length > built.bound * 2,
      `expected more than the required-only pairs, got ${results.length}`);
    // Every fixture's observed outcome must equal the one it declared. For the
    // non-required negatives that means the oracle reproduced an exact finding
    // set - enum, const, additionalProperties or a conditional - not merely
    // that the payload failed somehow.
    for (const row of results) {
      assert.ok(['valid', 'invalid'].includes(row.scenarioType));
      assert.equal(row.observed, row.scenarioType === 'valid' ? 'pass' : 'fail');
    }
  } finally { await clean(); }
});

test('the documents that declare no components are exactly the nine expected', async () => {
  const YAML = (await import('yaml')).default;
  const { buildSourceInventory } = await import('../../src/catalogue.mjs');
  const inventory = await buildSourceInventory(repoRoot);
  const bare = [];
  for (const entry of inventory.entries.filter(item => item.artifactKind === 'openapi')) {
    const source = YAML.parse(await readFile(join(repoRoot, 'contracts/source', entry.document), 'utf8'),
      { strict: true, uniqueKeys: true });
    if (!Object.keys(source?.components?.schemas ?? {}).length) bare.push(entry.document);
  }
  assert.deepEqual(bare.sort(), [...WITHOUT_COMPONENTS].sort());
});

test('inline identity responses bind exact positive and negative fixtures to their revisions', async () => {
  const { out, clean } = await assembled();
  try {
    const loaded = await loadPackage(out);
    const fixtures = JSON.parse(await readFile(join(out, 'governance/example-fixture.json'), 'utf8')).fixtures;
    const results = await runFixtureOracle(out, loaded);
    for (const document of ['identity-access/v1/identity-metadata.openapi.yaml',
      'identity-access/v1/global-audit-read.openapi.yaml']) {
      const entry = loaded.entries.find(item => item.document === document);
      const pair = fixtures.filter(item => item.documentRevisionId === entry.revisionId);
      assert.ok(pair.length >= 2, document);
      assert.ok(pair.every(item => item.contractElementId.startsWith('response:')));
      assert.ok(pair.some(item => item.scenarioType === 'valid'));
      assert.ok(pair.some(item => item.scenarioType === 'invalid' &&
        item.expectedFailureCode === 'SCHEMA_REQUIRED' && item.expectedFailureRuleId === 'BR2.4'));
      assert.deepEqual(results.filter(item => item.revisionId === entry.revisionId).slice(0, 2)
        .map(item => item.observed), ['pass', 'fail']);
    }
  } finally { await clean(); }
});

test('all named OpenAPI examples bind exact immutable revisions and expected findings', async () => {
  const YAML = (await import('yaml')).default;
  const expected = {
    'forecasting/v1/assistant-forecasts.openapi.yaml': [
      'x:assistant-status-partial-coverage'
    ],
    'identity-access/v1/global-audit-read.openapi.yaml': [
      'response:queryGlobalIdentityAudit:200:application-json:redactedDeniedIdentityEvent'
    ],
    'identity-access/v1/identity-metadata.openapi.yaml': [
      'response:getOpenIdConfiguration:200:application-json:localIssuerDiscovery'
    ],
    'model-lifecycle/v1/supplier-policy-evaluations.openapi.yaml': [
      'x:signed-supplier-selection-metadata'
    ],
    'recovery-coordination/v1/control-status.openapi.yaml': [
      'x:recovery-generation-conflict'
    ],
    'supplier-knowledge/v1/accepted-terms.openapi.yaml': [
      'x:sealed-accepted-terms-selection'
    ],
    'web-bff/v1/browser-api.openapi.yaml': [
      'x:dashboard-partial-unavailable-section'
    ],
    'model-lifecycle/v1/heavy-work.openapi.yaml': [
      'x:pin-admission-valid', 'x:pin-admission-missing-run-invalid',
      'x:batch-lease-valid', 'x:batch-lease-missing-attempt-invalid',
      'x:nonbatch-lease-valid', 'x:nonbatch-lease-with-attempt-invalid',
      'x:embedding-lease-valid', 'x:embedding-lease-missing-fence-invalid'
    ],
    'forecasting/v1/planning-forecasts.openapi.yaml': [
      'response:getForecastRun:200:application-json:succeeded',
      'response:getForecastRun:200:application-json:staleFailed'
    ],
    'recovery-coordination/v1/bootstrap-participant.openapi.yaml': [
      'response:applyRecoveryBootstrapCommand:200:application-json:prepared',
      'response:applyRecoveryBootstrapCommand:200:application-json:closed',
      'response:applyRecoveryBootstrapCommand:200:application-json:abortBeforeLatePrepare',
      'response:applyRecoveryBootstrapCommand:401:application-problem-json:invalidToken',
      'response:applyRecoveryBootstrapCommand:409:application-problem-json:staleGeneration',
      'response:applyRecoveryBootstrapCommand:503:application-problem-json:persistenceUnavailable',
      'response:attestRestoredBootstrapState:200:application-json:identityVerified'
    ]
  };
  const { out, clean } = await assembled();
  try {
    const loaded = await loadPackage(out);
    const fixtures = JSON.parse(await readFile(join(out, 'governance/example-fixture.json'), 'utf8')).fixtures;
    const results = await runFixtureOracle(out, loaded);
    const named = fixtures.filter(fixture => fixture.canonicalExampleId !== undefined);
    assert.equal(Object.keys(expected).length, 10);
    assert.equal(named.length, 24);
    for (const [documentPath, ids] of Object.entries(expected)) {
      const source = YAML.parse(await readFile(join(out, documentPath), 'utf8'));
      const examples = openApiNamedExamples(source, documentPath);
      assert.deepEqual(examples.map(example => example.id), ids);
      const entry = loaded.entries.find(item => item.document === documentPath);
      const bound = named.filter(fixture => fixture.documentRevisionId === entry.revisionId);
      assert.deepEqual(bound.map(fixture => fixture.canonicalExampleId), ids);
      for (const fixture of bound) {
        const example = examples.find(item => item.id === fixture.canonicalExampleId);
        assert.equal(fixture.contractElementId, example.element);
        assert.deepEqual(fixture.payload, example.payload);
        assert.deepEqual(fixture.expectedFailures, example.expectedFailures);
        assert.equal(results.find(row => row.fixtureId === fixture.fixtureId)?.observed,
          example.expectedValid ? 'pass' : 'fail');
      }
    }
    assert.equal(named.filter(fixture => fixture.expectedOutcome === 'fail').length, 4);
    assert.ok(named.filter(fixture => fixture.expectedOutcome === 'fail').every(fixture =>
      fixture.expectedFailures?.every(finding => finding.ruleId === 'BR2.4')));
  } finally { await clean(); }
});

test('named OpenAPI examples fail if a canonical payload or approved finding changes', async () => {
  const YAML = (await import('yaml')).default;
  const documentPath = 'model-lifecycle/v1/heavy-work.openapi.yaml';
  const source = YAML.parse(await readFile(join(repoRoot, 'contracts/source', documentPath), 'utf8'));
  const entry = { artifactKind: 'openapi', document: documentPath, revisionId: 'immutable-test-revision',
    boundaryIds: ['C07'] };
  assert.equal(namedOpenApiFixtures(entry, source, new Map()).length, 8);
  const changed = JSON.parse(JSON.stringify(source));
  changed['x-contract-fixtures'][1].value.forecastRunId = '00000000-0000-4000-8000-000000000103';
  assert.throws(() => namedOpenApiFixtures(entry, changed, new Map()), error =>
    error.code === 'FIXTURE_ORACLE_MISMATCH' && error.ruleId === 'NFR8.13');
  const wrongFailure = JSON.parse(JSON.stringify(source));
  wrongFailure['x-contract-fixtures'][1].value.initialForecastAttemptId = 17;
  assert.throws(() => namedOpenApiFixtures(entry, wrongFailure, new Map()), error =>
    error.code === 'FIXTURE_ORACLE_MISMATCH' && error.ruleId === 'NFR8.13');
});

test('the oracle refuses a missing or mismatched named example despite other valid document fixtures', async () => {
  const { out, clean } = await assembled();
  try {
    const loaded = await loadPackage(out);
    const path = join(out, 'governance/example-fixture.json');
    const sidecar = JSON.parse(await readFile(path, 'utf8'));
    const example = sidecar.fixtures.find(fixture => fixture.canonicalExampleId ===
      'response:getForecastRun:200:application-json:succeeded');
    assert.ok(example);
    const check = async fixtures => {
      const bytes = JSON.stringify({ ...sidecar, fixtures });
      await (await import('node:fs/promises')).writeFile(path, bytes);
      const entries = loaded.entries.map(entry => entry.document === 'governance/example-fixture.json'
        ? { ...entry, contentDigest: digest(Buffer.from(bytes)) } : entry);
      await assert.rejects(runFixtureOracle(out, { ...loaded, entries }), error =>
        error.code === 'FIXTURE_EXAMPLE_COVERAGE' && error.ruleId === 'BR2.7');
    };
    await check(sidecar.fixtures.filter(fixture => fixture.fixtureId !== example.fixtureId));
    await check(sidecar.fixtures.map(fixture => fixture.fixtureId === example.fixtureId
      ? { ...fixture, payload: { ...fixture.payload, retailerId: '00000000-0000-4000-8000-000000000999' } }
      : fixture));
  } finally { await clean(); }
});
