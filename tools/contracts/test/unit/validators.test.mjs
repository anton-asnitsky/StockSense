import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertFixtureOracle, C07_PORT_NAME, C07_PORT_PATH, createSchemaValidator,
  detectDialect, DIALECTS, SUPPLIER_HEAD_PATH, validateCanonical
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

test('OpenAPI cannot validate without an isolated standards runner', async () => {
  const contract = entry('openapi', 'api.json');
  await assert.rejects(withSource('api.json', { openapi: '3.1.2', info: { title: 'Synthetic', version: '1.0.0' }, paths: {} },
    path => validateCanonical(contract, path)), error => error.code === 'STANDARDS_ENGINE');
});

test('AsyncAPI 3.0.0 dispatches without accepting a second document dialect', async () => {
  const contract = entry('asyncapi', 'events.json');
  const calls = [];
  await withSource('events.json', { asyncapi: '3.0.0', info: { title: 'Synthetic', version: '1.0.0' },
    channels: { synthetic: { messages: { changed: { payload: { schemaFormat: 'application/schema+json;version=draft-2020-12',
      schema: { type: 'object' } } } } } } },
    async path => assert.equal((await validateCanonical(contract, path, { runTool: dialect => { calls.push(dialect); } })).dialect,
      DIALECTS.asyncapi));
  assert.deepEqual(calls, [DIALECTS.asyncapi, 'asyncapi-payloads:2020-12']);
  expectCode(() => detectDialect(contract, JSON.stringify({ asyncapi: '3.0.0', openapi: '3.1.2' })), 'DIALECT_CONFLICT');
});

test('JSON Schema uses the pinned 2020-12 Ajv implementation and formats', async () => {
  const schema = { $schema: DIALECTS.schema, type: 'object', required: ['id'],
    properties: { id: { type: 'string', format: 'uuid' } }, additionalProperties: false };
  await withSource('schema.json', schema, async path => {
    assert.equal((await validateCanonical(entry('schema', 'schema.json'), path, { runTool: () => {} })).dialect, DIALECTS.schema);
  });
  const validate = createSchemaValidator(schema);
  assert.equal(validate({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }), true);
  assert.equal(validate({ id: 'wrong' }), false);
});

test('declared cross-document JSON Schemas compile against the verified registry', async () => {
  const id = 'https://contracts.stocksense.local/common/v1/item.schema.json';
  const other = { $schema: DIALECTS.schema, $id: id, type: 'string' };
  const schema = { $schema: DIALECTS.schema, $id: 'https://contracts.stocksense.local/common/v1/list.schema.json',
    type: 'array', items: { $ref: id } };
  expectCode(() => createSchemaValidator(schema), 'SCHEMA_INVALID');
  assert.equal(typeof createSchemaValidator(schema, new Map([[id, other]])), 'function');
});

test('reusable AsyncAPI component messages dispatch to both isolated validators', async () => {
  const contract = entry('asyncapi', 'events.json');
  const event = { asyncapi: '3.0.0', info: { title: 'Synthetic', version: '1.0.0' },
    channels: { changed: { messages: { changed: { $ref: '#/components/messages/Changed' } } } },
    components: { messages: { Changed: { payload: { schemaFormat: 'application/schema+json;version=draft-2020-12',
      schema: { $ref: './envelope.json' } } } } } };
  const calls = [];
  const options = { runTool: dialect => { calls.push(dialect); } };
  await withSource('events.json', event, async path => {
    assert.equal((await validateCanonical(contract, path, options)).valid, true);
  });
  assert.deepEqual(calls, [DIALECTS.asyncapi, 'asyncapi-payloads:2020-12']);
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

test('C05/C09 fixed Vault head validates the approved field names and rejects a missing CAS guarantee', async () => {
  const source = await readFile(new URL('../../../../contracts/source/common/v1/supplier-authority-head.shared-schema.yaml', import.meta.url), 'utf8');
  const head = entry('schema', SUPPLIER_HEAD_PATH, { boundaryIds: ['C05', 'C09'],
    schemaDialect: DIALECTS.governedRecord });
  const policy = { requiredCanonicalPaths: { C05: [SUPPLIER_HEAD_PATH], C09: [SUPPLIER_HEAD_PATH] } };
  await withSource('head.yaml', source, async path => {
    assert.equal((await validateCanonical(head, path, { policy })).dialect, DIALECTS.governedRecord);
  });
  await assert.rejects(withSource('head.yaml', source.replace('casRequired: true', 'casRequired: false'),
    path => validateCanonical(head, path, { policy })), error => error.code === 'SUPPLIER_HEAD_SHAPE');
  await assert.rejects(withSource('head.yaml', source, path => validateCanonical(head, path, { policy: {} })),
    error => error.code === 'SUPPLIER_HEAD_DISPATCH');
  await assert.rejects(withSource('head.yaml', source,
    path => validateCanonical({ ...head, document: 'elsewhere/head.yaml' }, path, { policy })),
  error => error.code === 'SUPPLIER_HEAD_PATH');
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
    expectedFailureRuleId: 'BR2.4', expectedFailurePath: '/retailerId' };
  const finding = { findingCode: 'SCHEMA_REQUIRED', ruleId: 'BR2.4', revisionId: contract.revisionId,
    contractElementId: 'MessageEnvelope', instancePath: '/retailerId' };
  assert.equal(assertFixtureOracle(fixture, [finding], [contract]), true);
  expectCode(() => assertFixtureOracle({ ...fixture, expectedFailureRuleId: undefined }, [finding], [contract]),
    'FIXTURE_ORACLE_MISSING');
  for (const wrong of [
    { findingCode: 'SCHEMA_TYPE' }, { ruleId: 'BR1.3' },
    { revisionId: 'sha256:' + 'b'.repeat(64) }, { contractElementId: 'OtherElement' },
    { instancePath: '/messageId' }
  ]) expectCode(() => assertFixtureOracle(fixture, [{ ...finding, ...wrong }], [contract]), 'FIXTURE_ORACLE_MISMATCH');
  expectCode(() => assertFixtureOracle(fixture, [], [contract]), 'FIXTURE_ORACLE_MISMATCH');
  expectCode(() => assertFixtureOracle(fixture, [finding, { ...finding, instancePath: '/messageId' }], [contract]),
    'FIXTURE_ORACLE_MISMATCH');
  expectCode(() => assertFixtureOracle({ ...fixture, expectedFailurePath: undefined }, [finding], [contract]),
    'FIXTURE_ORACLE_MISSING');
});

test('a negative fixture may declare a composite failure as an exact finding set', () => {
  // Requiring exactly one observed finding made composite keywords such as
  // oneOf inexpressible rather than merely strict: ajv reports several errors
  // for one violation. The invariant that matters is set equality - every
  // declared finding observed and no undeclared finding observed.
  const contract = entry('schema', 'schema.json', { boundaryIds: ['C01'] });
  const base = { scenarioType: 'invalid', expectedOutcome: 'fail', schemaRevisionId: contract.revisionId,
    boundaryIds: ['C01'], contractElementId: 'MessageEnvelope' };
  const finding = (findingCode, instancePath) => ({ findingCode, ruleId: 'BR2.4',
    revisionId: contract.revisionId, contractElementId: 'MessageEnvelope', instancePath });
  const fixture = { ...base, expectedFailures: [
    { code: 'SCHEMA_REQUIRED', ruleId: 'BR2.4', path: '/a' },
    { code: 'SCHEMA_REQUIRED', ruleId: 'BR2.4', path: '/b' },
    { code: 'SCHEMA_ONE_OF', ruleId: 'BR2.4', path: '' }
  ] };
  const observed = [finding('SCHEMA_REQUIRED', '/a'), finding('SCHEMA_REQUIRED', '/b'), finding('SCHEMA_ONE_OF', '')];
  assert.equal(assertFixtureOracle(fixture, observed, [contract]), true);
  // An undeclared extra finding is still a mismatch, and so is a missing one.
  expectCode(() => assertFixtureOracle(fixture, [...observed, finding('SCHEMA_TYPE', '/c')], [contract]),
    'FIXTURE_ORACLE_MISMATCH');
  expectCode(() => assertFixtureOracle(fixture, observed.slice(0, 2), [contract]), 'FIXTURE_ORACLE_MISMATCH');
  // The two declaration forms are alternatives, not a pair to be mixed.
  expectCode(() => assertFixtureOracle({ ...fixture, expectedFailureCode: 'SCHEMA_REQUIRED' }, observed, [contract]),
    'FIXTURE_ORACLE_MISSING');
  expectCode(() => assertFixtureOracle({ ...base, expectedFailures: [] }, [], [contract]), 'FIXTURE_ORACLE_MISSING');
  // Gating the mixing guard on Array.isArray let a non-array form fall through
  // to the single-field branch and be discarded without complaint.
  for (const notAnArray of [{ code: 'SCHEMA_REQUIRED', ruleId: 'BR2.4', path: '/a' }, 'SCHEMA_REQUIRED', 0, null]) {
    expectCode(() => assertFixtureOracle({ ...base, expectedFailures: notAnArray,
      expectedFailureCode: 'SCHEMA_REQUIRED', expectedFailureRuleId: 'BR2.4', expectedFailurePath: '/a' },
    [finding('SCHEMA_REQUIRED', '/a')], [contract]), 'FIXTURE_ORACLE_MISSING');
  }
  expectCode(() => assertFixtureOracle({ ...base, expectedFailures: [
    { code: 'SCHEMA_REQUIRED', ruleId: 'BR2.4', path: '/a' },
    { code: 'SCHEMA_REQUIRED', ruleId: 'BR2.4', path: '/a' }
  ] }, [finding('SCHEMA_REQUIRED', '/a')], [contract]), 'FIXTURE_ORACLE_MISSING');
  // A positive fixture may not carry the set form either.
  expectCode(() => assertFixtureOracle({ ...base, scenarioType: 'valid', expectedOutcome: 'pass',
    expectedFailures: [{ code: 'SCHEMA_REQUIRED', ruleId: 'BR2.4', path: '/a' }] }, [], [contract]),
  'FIXTURE_UNEXPECTED_FAILURE');
});

test('only approved x- extensions are permitted in an OpenAPI component', () => {
  // The collector previously registered every key beginning x-, so the gate was
  // "starts with x-" rather than "is approved": a mistyped or newly invented
  // extension was accepted silently, and Ajv's unknown-keyword refusal - the
  // only signal that a governance-bearing key existed - was removed. The
  // independent architecture review raised that as a weakening of NFR8.4.
  const component = extra => ({
    $schema: DIALECTS.schema, $id: 'https://contracts.stocksense.local/x.json',
    type: 'object', required: ['ids'],
    properties: { ids: { minItems: 1, items: { type: 'string' } } },
    ...extra
  });
  const compile = extra => createSchemaValidator(component(extra), new Map(), { openApiComponents: true });

  // Every extension the canonical catalogue declares must still compile.
  for (const approved of ['x-contract-fixtures', 'x-contract-owner', 'x-contract-package',
    'x-contract-protocol-version', 'x-stocksense-claims', 'x-stocksense-conformance',
    'x-stocksense-delivery', 'x-stocksense-kind-limits', 'x-stocksense-max-bytes',
    'x-stocksense-recovery']) {
    assert.ok(compile({ [approved]: { any: 'value' } }), approved);
  }

  // An unlisted or mistyped one is refused, and the reason names it - which it
  // did not before, because the compiler's message was discarded.
  for (const unapproved of ['x-not-approved', 'x-stocksense-kindlimits', 'x-contract-fixture']) {
    assert.throws(() => compile({ [unapproved]: { any: 'value' } }), error => {
      assert.equal(error.code, 'SCHEMA_INVALID');
      assert.equal(error.ruleId, 'NFR8.4');
      assert.match(error.message, /unknown keyword/, error.message);
      return true;
    }, unapproved);
  }

  // A schema document keeps full strict mode, so no extension is permitted there.
  assert.throws(() => createSchemaValidator(component({ 'x-stocksense-recovery': {} })),
    error => error.code === 'SCHEMA_INVALID');
});

test('a strict-mode refusal carries the compiler reason, bounded', () => {
  // Discarding it meant a strict refusal was invisible without a hand-written
  // probe. It comes from a tool, so it is collapsed and length-capped here and
  // sanitized again before any diagnostic is published.
  assert.throws(() => createSchemaValidator({
    $schema: DIALECTS.schema, $id: 'https://contracts.stocksense.local/y.json',
    type: 'object', properties: { a: { minItems: 1 } }
  }), error => {
    assert.equal(error.code, 'SCHEMA_INVALID');
    assert.match(error.message, /strict mode/);
    assert.ok(error.message.length <= 260, `message was ${error.message.length} characters`);
    return true;
  });
});
