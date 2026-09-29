import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertFixtureOracle, C07_PORT_NAME, C07_PORT_PATH, createSchemaValidator,
  detectDialect, DIALECTS, validateCanonical
} from '../../src/validators.mjs';

const entry = (artifactKind, document, extra = {}) => ({
  artifactKind, document, boundaryIds: ['C07'], revisionId: 'sha256:' + 'a'.repeat(64), ...extra
});
const expectCode = (fn, code) => assert.throws(fn, error => error.code === code);
const c07Policy = { requiredCanonicalPaths: { C07: [C07_PORT_PATH] } };

async function withSource(name, source, action) {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-validator-'));
  const path = join(root, name);
  try {
    await writeFile(path, typeof source === 'string' ? source : JSON.stringify(source));
    return await action(path);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('OpenAPI 3.1.2 dispatches to the pinned-tool seam', async () => {
  const contract = entry('openapi', 'api.json');
  let called;
  await withSource('api.json', { openapi: '3.1.2', info: { title: 'Synthetic', version: '1.0.0' }, paths: {} }, async path => {
    const result = await validateCanonical(contract, path, { runTool: (dialect, sourcePath) => { called = [dialect, sourcePath]; } });
    assert.equal(result.dialect, DIALECTS.openapi);
    assert.deepEqual(called, [DIALECTS.openapi, path]);
  });
});

test('AsyncAPI 3.0.0 dispatches without accepting a second document dialect', async () => {
  const contract = entry('asyncapi', 'events.json');
  await withSource('events.json', { asyncapi: '3.0.0', info: { title: 'Synthetic', version: '1.0.0' }, channels: {} },
    async path => assert.equal((await validateCanonical(contract, path, { runTool: dialect => assert.equal(dialect, DIALECTS.asyncapi) })).dialect,
      DIALECTS.asyncapi));
  expectCode(() => detectDialect(contract, JSON.stringify({ asyncapi: '3.0.0', openapi: '3.1.2' })), 'DIALECT_CONFLICT');
});

test('JSON Schema uses the pinned 2020-12 Ajv implementation and formats', async () => {
  const schema = { $schema: DIALECTS.schema, type: 'object', required: ['id'],
    properties: { id: { type: 'string', format: 'uuid' } }, additionalProperties: false };
  await withSource('schema.json', schema, async path => {
    assert.equal((await validateCanonical(entry('schema', 'schema.json'), path)).dialect, DIALECTS.schema);
  });
  const validate = createSchemaValidator(schema);
  assert.equal(validate({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }), true);
  assert.equal(validate({ id: 'wrong' }), false);
});

test('C07 fixed path selects typed-port before parsing and rejects fallback or override', async () => {
  const port = entry('schema', C07_PORT_PATH);
  const requiredArguments = ['callerService', 'retailerId', 'workType', 'requestId', 'leaseId', 'workerId',
    'fencingToken', 'placementGeneration', 'recoveryGeneration', 'resultDigest', 'operationId',
    'idempotencyKey', 'expectedOwnerVersion'];
  const batchArguments = ['forecastRunId', 'forecastAttemptId', 'forecastRoutePinId'];
  const requiredResults = ['disposition', 'terminalResultId', 'resultDigest', 'closedPinId', 'pinClosureDisposition'];
  const source = { port: C07_PORT_NAME, transaction: 'caller-owned retailer-local transaction',
    authorizedCallers: ['forecasting-service'], arguments: { required: requiredArguments,
      conditionalRequiredForBatchForecast: batchArguments, forbiddenForOtherWorkTypes: batchArguments,
      postgresTypes: Object.fromEntries([...requiredArguments, ...batchArguments].map(name => [name, 'text'])) },
    result: { required: requiredResults, postgresTypes: Object.fromEntries(requiredResults.map(name => [name, 'text'])),
      disposition: ['finalized', 'idempotent-replay'], pinClosureDisposition: ['closed', 'already-closed', 'not-applicable'] },
    conflicts: ['stale-lease'],
    locking: 'retailer request and lease rows', ownerCommit: 'same transaction' };
  await withSource('port.yaml', source, async path => {
    assert.equal((await validateCanonical(port, path, { policy: c07Policy })).dialect, DIALECTS.typedPort);
  });
  expectCode(() => detectDialect(port, 'name: [unterminated', c07Policy), 'SOURCE_PARSE');
  expectCode(() => detectDialect(port, 'name: wrong', {}), 'C07_DISPATCH');
  expectCode(() => detectDialect(port, '$schema: https://json-schema.org/draft/2020-12/schema', c07Policy), 'C07_DISPATCH');
  expectCode(() => detectDialect(port, 'kind: governed-record', c07Policy), 'C07_DISPATCH');
  expectCode(() => detectDialect({ ...port, schemaDialect: DIALECTS.schema }, 'name: wrong', c07Policy), 'C07_DISPATCH');
  await assert.rejects(withSource('port.yaml', { ...source, authorizedCallers: ['supplier-knowledge-service'] },
    path => validateCanonical(port, path, { policy: c07Policy })), error => error.code === 'C07_PORT_NAME');
  await assert.rejects(withSource('port.yaml', { ...source, arguments: { ...source.arguments, required: ['requestId'] } },
    path => validateCanonical(port, path, { policy: c07Policy })), error => error.code === 'C07_PORT_SHAPE');
});

test('an alternate C07 port path and unsupported schema dialect fail closed', () => {
  expectCode(() => detectDialect(entry('schema', 'elsewhere/finalize-heavy-work.shared-schema.yaml',
    { schemaDialect: DIALECTS.typedPort }), 'name: [unterminated', c07Policy), 'C07_PATH');
  expectCode(() => detectDialect(entry('openapi', C07_PORT_PATH), 'name: [unterminated', c07Policy), 'C07_DISPATCH');
  expectCode(() => detectDialect(entry('schema', 'schema.json'), JSON.stringify({ $schema: 'http://json-schema.org/draft-07/schema#' })),
    'DIALECT_CONFLICT');
});

test('governed-record dialect requires its declared fields', async () => {
  const record = entry('schema', 'supplier-authority-head.yaml', { schemaDialect: 'urn:stocksense:dialect:governed-record:1' });
  const content = { kind: 'authority-head', owner: 'U5', store: 'vault', cas: true, key: 'tenant/key', fields: {},
    states: ['updating', 'active'], digest: 'sha256', revision: '1.0.0', rules: [], fixtures: [] };
  await withSource('record.yaml', content, async path => {
    assert.equal((await validateCanonical(record, path)).dialect, DIALECTS.governedRecord);
  });
  await assert.rejects(withSource('record.yaml', { ...content, states: undefined },
    path => validateCanonical(record, path)), error => error.code === 'GOVERNED_RECORD_SHAPE');
});

test('positive fixture requires exact immutable target and zero findings', () => {
  const contract = entry('schema', 'schema.json', { boundaryIds: ['C01'] });
  const fixture = { scenarioType: 'valid', expectedOutcome: 'pass', schemaRevisionId: contract.revisionId,
    boundaryIds: ['C01'], contractElementId: 'MessageEnvelope' };
  assert.equal(assertFixtureOracle(fixture, [], [contract]), true);
  expectCode(() => assertFixtureOracle({ ...fixture, expectedFailureCode: 'SCHEMA_REQUIRED' }, [], [contract]),
    'FIXTURE_UNEXPECTED_FAILURE');
  expectCode(() => assertFixtureOracle({ ...fixture, documentRevisionId: contract.revisionId }, [], [contract]), 'FIXTURE_TARGET');
});

test('negative fixture accepts only its declared code, rule, revision and element', () => {
  const contract = entry('schema', 'schema.json', { boundaryIds: ['C01'] });
  const fixture = { scenarioType: 'invalid', expectedOutcome: 'fail', schemaRevisionId: contract.revisionId,
    boundaryIds: ['C01'], contractElementId: 'MessageEnvelope', expectedFailureCode: 'SCHEMA_REQUIRED',
    expectedFailureRuleId: 'BR2.4' };
  const finding = { findingCode: 'SCHEMA_REQUIRED', ruleId: 'BR2.4', revisionId: contract.revisionId,
    contractElementId: 'MessageEnvelope' };
  assert.equal(assertFixtureOracle(fixture, [finding], [contract]), true);
  expectCode(() => assertFixtureOracle({ ...fixture, expectedFailureRuleId: undefined }, [finding], [contract]),
    'FIXTURE_ORACLE_MISSING');
  for (const wrong of [
    { findingCode: 'SCHEMA_TYPE' }, { ruleId: 'BR1.3' },
    { revisionId: 'sha256:' + 'b'.repeat(64) }, { contractElementId: 'OtherElement' }
  ]) expectCode(() => assertFixtureOracle(fixture, [{ ...finding, ...wrong }], [contract]), 'FIXTURE_ORACLE_MISMATCH');
  expectCode(() => assertFixtureOracle(fixture, [], [contract]), 'FIXTURE_ORACLE_MISMATCH');
});
