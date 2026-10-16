import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const schemaRoot = new URL('../../../../contracts/source/common/v1/', import.meta.url);
const readSchema = async name => JSON.parse(await readFile(new URL(name, schemaRoot), 'utf8'));
const ajv = new Ajv2020({ strict: true, allErrors: true });
addFormats(ajv);
const tenant = ajv.compile(await readSchema('message-envelope.schema.json'));
const global = ajv.compile(await readSchema('global-identity-audit-envelope.schema.json'));
const sampleRoot = new URL('../../../../contracts/samples/walking-skeleton/common/v1/', import.meta.url);
const uuid = '00000000-0000-4000-8000-000000000001';
const digest = 'sha256:' + 'a'.repeat(64);
const producer = {
  serviceId: 'identity-access', subjectId: 'synthetic:service',
  audience: 'synthetic:events', protocolVersion: '1.0.0'
};
const tenantEnvelope = () => ({
  messageId: uuid, messageType: 'identity.audit.recorded', schemaVersion: '1.0.0',
  occurredAt: '2026-09-29T00:00:00Z', retailerId: uuid,
  actor: { type: 'service', subjectId: 'synthetic:service' }, correlationId: uuid,
  causationId: uuid, idempotencyKey: 'synthetic:request-0001',
  placementGeneration: 1, producer, payloadDigest: digest, data: {}
});
const globalEnvelope = () => ({
  scope: 'global', messageId: uuid, messageType: 'identity.global.audit.recorded',
  schemaVersion: '1.0.0', occurredAt: '2026-09-29T00:00:00Z',
  actor: { type: 'anonymous', subjectId: 'anonymous' }, correlationId: uuid,
  causationId: null, idempotencyKey: 'synthetic:request-0001',
  producer, payloadDigest: digest, data: {}
});

test('tenant envelope accepts a complete synthetic message', () => {
  assert.equal(tenant(tenantEnvelope()), true, JSON.stringify(tenant.errors));
});

test('illustrative package copies match the canonical envelope source bytes', async () => {
  for (const name of ['message-envelope.schema.json', 'global-identity-audit-envelope.schema.json']) {
    assert.deepEqual(await readFile(new URL(name, sampleRoot)), await readFile(new URL(name, schemaRoot)));
  }
});

test('tenant envelope rejects every missing required field', () => {
  for (const field of tenant.schema.required) {
    const message = tenantEnvelope();
    delete message[field];
    assert.equal(tenant(message), false, `${field} was accepted`);
  }
});

test('tenant envelope rejects global scope and undeclared fields', () => {
  assert.equal(tenant({ ...tenantEnvelope(), scope: 'global' }), false);
});

test('global envelope accepts an anonymous root decision', () => {
  assert.equal(global(globalEnvelope()), true, JSON.stringify(global.errors));
});

test('global envelope rejects tenant and placement fields', () => {
  assert.equal(global({ ...globalEnvelope(), retailerId: uuid }), false);
  assert.equal(global({ ...globalEnvelope(), placementGeneration: 1 }), false);
});

test('global envelope rejects wrong publisher and tenant message type', () => {
  assert.equal(global({ ...globalEnvelope(), producer: { ...producer, serviceId: 'other-service' } }), false);
  assert.equal(global({ ...globalEnvelope(), messageType: 'identity.audit.recorded' }), false);
});

test('global envelope rejects a forged anonymous actor or malformed causation', () => {
  assert.equal(global({ ...globalEnvelope(), actor: { type: 'anonymous', subjectId: 'synthetic:user' } }), false);
  assert.equal(global({ ...globalEnvelope(), causationId: 'not-a-uuid' }), false);
});
