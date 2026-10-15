import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest } from '../../src/package-loader.mjs';
import { asyncApiFixtureSchema, runFixtureOracle } from '../../src/policy.mjs';

const C23_REVISION = digest('c23-fixture-revision');
const C01_SCHEMA_PATH = 'common/v1/message-envelope.schema.json';
const C01_SCHEMA_FILE = fileURLToPath(new URL(`../../../../contracts/source/${C01_SCHEMA_PATH}`, import.meta.url));
const C01_SCHEMA_ID = `https://contracts.stocksense.local/${C01_SCHEMA_PATH}`;
const FORMAT = 'application/schema+json;version=draft-2020-12';
const payload = schema => ({ schemaFormat: FORMAT, schema });
const fixture = (fixtureId, element, body, expectedFailurePath) => ({
  fixtureId, boundaryIds: ['C23'], documentRevisionId: C23_REVISION, contractElementId: element,
  scenarioType: expectedFailurePath === undefined ? 'valid' : 'invalid',
  expectedOutcome: expectedFailurePath === undefined ? 'pass' : 'fail',
  ...(expectedFailurePath === undefined ? {} : {
    expectedFailureCode: 'SCHEMA_REQUIRED', expectedFailureRuleId: 'BR2.4', expectedFailurePath
  }), payload: body
});
const sidecar = fixtures => JSON.stringify({ syntheticOnly: true, fixtures });

async function withPackage(document, fixtures, action, extraEntries = []) {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-asyncapi-fixture-'));
  const files = [
    { document: 'messaging-platform/v1/transport.asyncapi.yaml', artifactKind: 'asyncapi',
      revisionId: C23_REVISION, boundaryIds: ['C23'], content: JSON.stringify(document) },
    { document: 'governance/example-fixture.json', artifactKind: 'sidecar', kind: 'example-fixture',
      revisionId: digest('c23-sidecar'), boundaryIds: ['C23'], content: sidecar(fixtures) },
    ...extraEntries
  ];
  try {
    for (const file of files) {
      const path = join(root, file.document);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, file.content);
    }
    const entries = files.map(({ content, ...entry }) => ({ ...entry, contentDigest: digest(content) }));
    return await action(root, { entries });
  } finally { await rm(root, { recursive: true, force: true }); }
}

const directDocument = { asyncapi: '3.0.0', channels: { auditEvents: { messages: {
  event: { payload: payload({ type: 'object', required: ['eventId'],
    properties: { eventId: { type: 'string' } }, additionalProperties: false }) }
} } } };
const expectError = (code, ruleId) => error => error.code === code && error.ruleId === ruleId;

test('direct AsyncAPI channel payload accepts a revision-bound pair with exact findings', async () => {
  const fixtures = [fixture('direct-positive', 'message:auditEvents:event', { eventId: 'synthetic' }),
    fixture('direct-negative', 'message:auditEvents:event', {}, '/eventId')];
  await withPackage(directDocument, fixtures, async (root, loaded) => {
    assert.deepEqual((await runFixtureOracle(root, loaded)).map(row => row.observed), ['pass', 'fail']);
  });
});

test('C23 local component messages resolve by channel and enforce a C01 registry ref through allOf', async () => {
  const schema = JSON.parse(await readFile(C01_SCHEMA_FILE, 'utf8'));
  const document = { asyncapi: '3.0.0', channels: {
    tenantMessages: { messages: { envelope: { $ref: '#/components/messages/tenantEnvelope' } } },
    tenantDeadLetters: { messages: { envelope: { $ref: '#/components/messages/tenantEnvelope' } } }
  }, components: { messages: { tenantEnvelope: { payload: payload({ allOf: [
    { $ref: C01_SCHEMA_ID },
    { type: 'object', properties: { messageType: { const: 'tenant.audit.recorded' } } }
  ] }) } } } };
  const valid = {
    messageId: '00000000-0000-4000-8000-000000000001', messageType: 'tenant.audit.recorded',
    schemaVersion: '1.0.0', occurredAt: '2026-09-08T12:00:00Z',
    retailerId: '00000000-0000-4000-8000-000000000002', actor: { type: 'service', subjectId: 'synthetic' },
    correlationId: '00000000-0000-4000-8000-000000000003',
    causationId: '00000000-0000-4000-8000-000000000004', idempotencyKey: 'synthetic-key-12345',
    placementGeneration: 1, producer: { serviceId: 'retail-data', subjectId: 'synthetic',
      audience: 'messaging', protocolVersion: '1.0.0' }, payloadDigest: `sha256:${'a'.repeat(64)}`,
    data: {}
  };
  const missingId = { ...valid };
  delete missingId.messageId;
  const fixtures = [fixture('ref-positive', 'message:tenantMessages:envelope', valid),
    fixture('ref-negative', 'message:tenantMessages:envelope', missingId, '/messageId'),
    fixture('dead-letter-positive', 'message:tenantDeadLetters:envelope', valid),
    fixture('dead-letter-negative', 'message:tenantDeadLetters:envelope', missingId, '/messageId')];
  await withPackage(document, fixtures, async (root, loaded) => {
    const results = await runFixtureOracle(root, loaded);
    assert.deepEqual(results.map(row => [row.revisionId, row.observed]),
      [[C23_REVISION, 'pass'], [C23_REVISION, 'fail'],
        [C23_REVISION, 'pass'], [C23_REVISION, 'fail']]);
  }, [{ document: C01_SCHEMA_PATH, artifactKind: 'schema', revisionId: digest('c01-revision'),
    boundaryIds: ['C01'], content: JSON.stringify(schema) }]);
  await withPackage(document, [...fixtures, fixture('ambiguous', 'message:envelope', valid)],
    async (root, loaded) => assert.rejects(runFixtureOracle(root, loaded),
      expectError('FIXTURE_TARGET_AMBIGUOUS', 'BR2.8')),
    [{ document: C01_SCHEMA_PATH, artifactKind: 'schema', revisionId: digest('c01-revision'),
      boundaryIds: ['C01'], content: JSON.stringify(schema) }]);
  assert.throws(() => asyncApiFixtureSchema(document, 'message:envelope'),
    expectError('FIXTURE_TARGET_AMBIGUOUS', 'BR2.8'));
  await withPackage(document, fixtures.slice(0, 2), async (root, loaded) =>
    assert.rejects(runFixtureOracle(root, loaded), expectError('FIXTURE_COVERAGE', 'BR2.7')),
  [{ document: C01_SCHEMA_PATH, artifactKind: 'schema', revisionId: digest('c01-revision'),
    boundaryIds: ['C01'], content: JSON.stringify(schema) }]);
});

test('AsyncAPI negative oracle rejects wrong code, path and additional findings', async () => {
  const positive = fixture('exact-positive', 'message:auditEvents:event', { eventId: 'synthetic' });
  const negative = fixture('exact-negative', 'message:auditEvents:event', {}, '/eventId');
  for (const bad of [
    { ...negative, expectedFailureCode: 'SCHEMA_TYPE' },
    { ...negative, expectedFailurePath: '/other' },
    { ...negative, payload: { unexpected: true } }
  ]) {
    await withPackage(directDocument, [positive, bad], async (root, loaded) => {
      await assert.rejects(runFixtureOracle(root, loaded), expectError('FIXTURE_ORACLE_MISMATCH', 'NFR8.13'));
    });
  }
});

test('AsyncAPI fixtures refuse absent revisions and messages', async () => {
  const positive = fixture('target-positive', 'message:auditEvents:event', { eventId: 'synthetic' });
  const negative = fixture('target-negative', 'message:auditEvents:event', {}, '/eventId');
  for (const bad of [
    { ...positive, documentRevisionId: digest('absent-revision') },
    { ...positive, contractElementId: 'message:auditEvents:missing' },
    { ...positive, contractElementId: 'message:missing:event' }
  ]) {
    await withPackage(directDocument, [positive, negative, bad], async (root, loaded) => {
      await assert.rejects(runFixtureOracle(root, loaded), expectError('FIXTURE_TARGET', 'BR2.8'));
    });
  }
});

test('an explicitly targeted AsyncAPI revision requires both fixture outcomes', async () => {
  await withPackage(directDocument,
    [fixture('only-positive', 'message:auditEvents:event', { eventId: 'synthetic' })],
    async (root, loaded) => assert.rejects(runFixtureOracle(root, loaded),
      expectError('FIXTURE_COVERAGE', 'BR2.7')));
});

test('AsyncAPI fixture extraction fails closed on unsupported message references and payload shapes', async () => {
  const changed = message => ({ asyncapi: '3.0.0', channels: { auditEvents: { messages: { event: message } } } });
  for (const message of [
    { $ref: 'https://example.invalid/message' },
    { $ref: '#/components/messages/absent' }
  ]) {
    assert.throws(() => asyncApiFixtureSchema(changed(message), 'message:auditEvents:event'),
      expectError('FIXTURE_REFERENCE', 'BR2.8'));
  }
  for (const message of [
    { payload: { type: 'object' } },
    { payload: { schemaFormat: 'application/schema+json;version=draft-07', schema: { type: 'object' } } },
    { payload: payload(true) },
    { payload: payload({ $schema: 'https://json-schema.org/draft-07/schema', type: 'object' }) }
  ]) {
    assert.throws(() => asyncApiFixtureSchema(changed(message), 'message:auditEvents:event'),
      error => ['FIXTURE_TARGET', 'DIALECT_CONFLICT'].includes(error.code));
  }
  await withPackage(changed({ payload: { type: 'object' } }), [
    fixture('unsupported-positive', 'message:auditEvents:event', {}),
    fixture('unsupported-negative', 'message:auditEvents:event', {}, '/eventId')
  ], async (root, loaded) => assert.rejects(runFixtureOracle(root, loaded),
    expectError('FIXTURE_TARGET', 'BR2.8')));
});
