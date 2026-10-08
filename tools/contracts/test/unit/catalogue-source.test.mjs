import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import YAML from 'yaml';
import Ajv2020 from 'ajv/dist/2020.js';

const source = resolve(import.meta.dirname, '../../../../contracts/source');
const profiles = resolve(import.meta.dirname, '../../../../contracts/profiles');
async function document(path) {
  const text = await readFile(resolve(source, path), 'utf8');
  return path.endsWith('.json') ? JSON.parse(text) : YAML.parse(text, { strict: true, uniqueKeys: true });
}

function assertAuditProfiles(contract) {
  assert.notEqual(contract.channels.auditEvents.address, contract.channels.globalIdentityAuditEvents.address);
  const tenant = contract.channels.auditEvents.messages.auditEvent.payload.schema;
  const global = contract.channels.globalIdentityAuditEvents.messages.globalIdentityAuditEvent.payload.schema;
  assert.equal(tenant.allOf[0].$ref, 'https://contracts.stocksense.local/common/v1/message-envelope.schema.json');
  assert.equal(global.allOf[0].$ref, 'https://contracts.stocksense.local/common/v1/global-identity-audit-envelope.schema.json');
  assert.ok(!tenant.allOf[1].properties.messageType.enum.includes('identity.global.audit.recorded'));
  assert.equal(global.allOf[1].properties.messageType.const, 'identity.global.audit.recorded');
}

test('C01 package schema compiles under the approved strict 2020-12 validator', async () => {
  const schema = await document('common/v1/contract-package.shared-schema.yaml');
  const validate = new Ajv2020({ strict: true, allErrors: true }).compile(schema);
  assert.equal(typeof validate, 'function');
  for (const field of ['openapi', 'asyncapi', 'schemas', 'boundaryCoverage']) {
    assert.equal(schema.allOf[0].then.properties[field].type, 'array');
  }
});

test('C15 tenant and retailerless global routes bind distinct closed envelope profiles', async () => {
  assertAuditProfiles(await document('audit-evidence/v1/authoritative-audit.asyncapi.yaml'));
  const tenant = await document('common/v1/message-envelope.schema.json');
  const global = await document('common/v1/global-identity-audit-envelope.schema.json');
  assert.equal(tenant.additionalProperties, false);
  assert.equal(global.additionalProperties, false);
  assert.ok(tenant.required.includes('retailerId'));
  assert.ok(!global.required.includes('retailerId'));
});

test('C15 cross-profile route substitution is rejected by the source invariant', async () => {
  const changed = await document('audit-evidence/v1/authoritative-audit.asyncapi.yaml');
  changed.channels.globalIdentityAuditEvents.address = changed.channels.auditEvents.address;
  assert.throws(() => assertAuditProfiles(changed), { code: 'ERR_ASSERTION' });
});

function assertSixOutcomes(schema) {
  assert.deepEqual(schema.properties.checks.items.properties.outcome.enum,
    ['passed', 'failed', 'limited', 'rejected', 'unavailable', 'not-run']);
}

test('C19 evidence checks expose exactly six governed outcomes', async () => {
  assertSixOutcomes(await document('demo-evidence/v1/evidence-manifest.shared-schema.yaml'));
});

test('C19 unapproved seventh outcome is rejected by the source invariant', async () => {
  const changed = await document('demo-evidence/v1/evidence-manifest.shared-schema.yaml');
  changed.properties.checks.items.properties.outcome.enum.push('success');
  assert.throws(() => assertSixOutcomes(changed), { code: 'ERR_ASSERTION' });
});

test('C22 and C23 agree on envelope, retry and replay limits', async () => {
  const protocol = YAML.parse(await readFile(resolve(profiles, 'messaging-platform/v1/protocol-compatibility.profile.yaml'), 'utf8'));
  const platform = YAML.parse(await readFile(resolve(profiles, 'messaging-platform/v1/platform.profile.yaml'), 'utf8'));
  assert.equal(protocol.wireRules.envelopeMaximumBytes, 65536);
  assert.equal(platform.delivery.envelopeMaximumBytes, protocol.wireRules.envelopeMaximumBytes);
  assert.equal(platform.policies.retry.maxTotalDeliveries, protocol.wireRules.maxTotalDeliveries);
  assert.deepEqual(platform.policies.retry.backoffSecondsForAttempts2Through5,
    protocol.wireRules.deterministicBackoffSecondsForAttempts2Through5);
  assert.equal(platform.policies.replay.maximumBatchMessages, protocol.wireRules.authorizedReplayBatchMaximum);
});

test('C24-C27 retain separate bootstrap, participant, operator and audit surfaces', async () => {
  const bootstrap = await document('recovery-coordination/v1/bootstrap-participant.openapi.yaml');
  const participant = await document('recovery-coordination/v1/participant-protocol.asyncapi.yaml');
  const control = await document('recovery-coordination/v1/control-status.openapi.yaml');
  const audit = await document('recovery-coordination/v1/recovery-audit.asyncapi.yaml');
  assert.equal(bootstrap.openapi, '3.1.2');
  assert.equal(participant.asyncapi, '3.0.0');
  assert.equal(control.openapi, '3.1.2');
  assert.equal(audit.asyncapi, '3.0.0');
  assert.ok(Object.values(bootstrap.paths).some(path => path.post?.operationId === 'applyRecoveryBootstrapCommand'));
  assert.ok(Object.values(control.paths).some(path => path.get?.operationId === 'getRecoveryManifest'));
  assert.ok(Object.values(control.paths).some(path => path.get?.operationId === 'getRestoreExecution'));
  assert.ok(Object.keys(participant.channels).length > 0 && Object.keys(audit.channels).length > 0);
});

test('C10 and C13 expose bounded product-set forecast queries', async () => {
  const planning = await document('forecasting/v1/planning-forecasts.openapi.yaml');
  const assistant = await document('forecasting/v1/assistant-forecasts.openapi.yaml');
  for (const contract of [planning, assistant]) {
    const serialized = JSON.stringify(contract);
    assert.match(serialized, /coveredProductIds/);
    assert.match(serialized, /unavailableProductIds/);
    assert.match(serialized, /"maxItems":100/);
  }
});

test('C16 separates registered OIDC redirects from the browser continuation', async () => {
  const contract = await document('web-bff/v1/identity-session.openapi.yaml');
  assert.equal(contract.paths['/signin-oidc'].get.operationId, 'receiveRegisteredOidcRedirect');
  assert.equal(contract.paths['/signout-callback-oidc'].get.operationId, 'receiveRegisteredOidcLogoutCallback');
  assert.equal(contract.paths['/auth/callback'].get.operationId, 'completeLogin');
  assert.match(contract.paths['/auth/callback'].get.description, /not a registered OAuth redirect URI/);
  assert.match(contract.paths['/signin-oidc'].get.description, /one-time code/);
});
