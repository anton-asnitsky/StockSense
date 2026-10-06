import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import YAML from 'yaml';
import { detectDialect, DIALECTS } from '../../src/validators.mjs';

const root = resolve(import.meta.dirname, '../../../../contracts');
const protocolPath = 'messaging-platform/v1/protocol-compatibility.shared-schema.yaml';
const platformPath = 'messaging-platform/v1/platform-profile.shared-schema.yaml';
const transportPath = 'messaging-platform/v1/transport-conformance.asyncapi.yaml';
const copy = value => JSON.parse(JSON.stringify(value));

async function yaml(path) {
  return YAML.parse(await readFile(resolve(root, path), 'utf8'), { strict: true, uniqueKeys: true });
}

async function json(path) {
  return JSON.parse(await readFile(resolve(root, path), 'utf8'));
}

async function fixture() {
  const [protocolSchema, platformSchema, protocol, platform, transport, audit] = await Promise.all([
    yaml(`source/${protocolPath}`), yaml(`source/${platformPath}`),
    yaml('profiles/messaging-platform/v1/protocol-compatibility.profile.yaml'),
    yaml('profiles/messaging-platform/v1/platform.profile.yaml'),
    yaml(`source/${transportPath}`), yaml('source/audit-evidence/v1/authoritative-audit.asyncapi.yaml')
  ]);
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  return { protocolSchema, platformSchema, protocol, platform, transport, audit,
    validateProtocol: ajv.compile(protocolSchema), validatePlatform: ajv.compile(platformSchema) };
}

function assertInvalid(validate, value, keyword) {
  assert.equal(validate(value), false, 'expected invalid instance');
  assert.ok(validate.errors?.some(error => error.keyword === keyword), JSON.stringify(validate.errors));
}

function assertRoutes(transport, audit) {
  assert.equal(transport.asyncapi, '3.0.0');
  const channels = transport.channels;
  assert.equal(channels.tenantMessages.address, audit.channels.auditEvents.address);
  assert.equal(channels.globalIdentityMessages.address, audit.channels.globalIdentityAuditEvents.address);
  assert.equal(channels.tenantDeadLetters.address, 'stocksense.audit.v1.dlq');
  assert.equal(channels.globalIdentityDeadLetters.address, 'stocksense.identity.audit.global.v1.dlq');
  assert.equal(new Set(Object.values(channels).map(channel => channel.address)).size, 4);
  assert.equal(transport.components.messages.tenantEnvelope.payload.schema.$ref,
    'https://contracts.stocksense.local/common/v1/message-envelope.schema.json');
  assert.equal(transport.components.messages.globalIdentityEnvelope.payload.schema.$ref,
    'https://contracts.stocksense.local/common/v1/global-identity-audit-envelope.schema.json');
  for (const [operation, channel] of Object.entries({
    publishTenantEnvelope: 'tenantMessages', consumeTenantEnvelope: 'tenantMessages',
    deadLetterTenantEnvelope: 'tenantDeadLetters', replayTenantEnvelope: 'tenantDeadLetters',
    publishGlobalIdentityEnvelope: 'globalIdentityMessages', consumeGlobalIdentityEnvelope: 'globalIdentityMessages',
    deadLetterGlobalIdentityEnvelope: 'globalIdentityDeadLetters', replayGlobalIdentityEnvelope: 'globalIdentityDeadLetters'
  })) assert.equal(transport.operations[operation].channel.$ref, `#/channels/${channel}`);
}

test('C22 and C23 use canonical 2020-12 dispatch and are schemas, not profile data', async () => {
  const { protocolSchema, platformSchema } = await fixture();
  for (const [path, schema] of [[protocolPath, protocolSchema], [platformPath, platformSchema]]) {
    assert.equal(schema.$schema, DIALECTS.schema);
    assert.equal(schema.type, 'object');
    const bytes = await readFile(resolve(root, 'source', path));
    assert.equal(detectDialect({ document: path, artifactKind: 'schema', boundaryIds: ['C22', 'C23'] }, bytes).dialect,
      DIALECTS.schema);
  }
});

test('required kind matrix still requires C22 schema and both C23 schema and AsyncAPI', async () => {
  const policy = await json('samples/walking-skeleton/governance/contract-package-policy.json');
  assert.ok(policy.requiredCanonicalKinds.schema.includes('C22'));
  assert.ok(policy.requiredCanonicalKinds.schema.includes('C23'));
  assert.ok(policy.requiredCanonicalKinds.asyncapi.includes('C23'));
  assert.ok(policy.requiredSidecarKinds.candidateByBoundary.C22.includes('protocol-compatibility-manifest'));
  assert.ok(policy.requiredSidecarKinds.candidateByBoundary.C23.includes('messaging-conformance-profile'));
});

test('governed C22 and C23 profile candidates validate against their canonical definitions', async () => {
  const { protocol, platform, validateProtocol, validatePlatform } = await fixture();
  assert.equal(validateProtocol(protocol), true, JSON.stringify(validateProtocol.errors));
  assert.equal(validatePlatform(platform), true, JSON.stringify(validatePlatform.errors));
});

test('C22 rejects missing global envelope and unregistered nested protocol fields', async () => {
  const { protocol, validateProtocol } = await fixture();
  const missing = copy(protocol);
  delete missing.protocol.envelopeSchemas.globalIdentity;
  assertInvalid(validateProtocol, missing, 'required');
  const extra = copy(protocol);
  extra.protocol.envelopeSchemas.fallback = 'tenant';
  assertInvalid(validateProtocol, extra, 'additionalProperties');
});

test('C22 requires independent .NET and Python package identities and valid ranges', async () => {
  const { protocol, validateProtocol } = await fixture();
  const duplicate = copy(protocol);
  duplicate.packages[1] = copy(duplicate.packages[0]);
  assertInvalid(validateProtocol, duplicate, 'contains');
  const wrongName = copy(protocol);
  wrongName.packages[0].package = 'wrong';
  assertInvalid(validateProtocol, wrongName, 'const');
  const badRange = copy(protocol);
  badRange.packages[1].supportedProtocolRange = '*';
  assertInvalid(validateProtocol, badRange, 'pattern');
});

test('C22 requires all cross-language and applicable bootstrap fixtures', async () => {
  const { protocol, validateProtocol } = await fixture();
  const missingSuite = copy(protocol);
  missingSuite.conformance.requiredSuites.pop();
  assertInvalid(validateProtocol, missingSuite, 'minItems');
  const weakBootstrap = copy(protocol);
  weakBootstrap.bootstrapPublishers[0].fixtures.pop();
  assertInvalid(validateProtocol, weakBootstrap, 'minItems');
  const duplicateBootstrap = copy(protocol);
  duplicateBootstrap.bootstrapPublishers[1] = copy(duplicateBootstrap.bootstrapPublishers[0]);
  assertInvalid(validateProtocol, duplicateBootstrap, 'contains');
});

test('C22 refuses weaker digest, delivery, retention and replay limits', async () => {
  const { protocol, validateProtocol } = await fixture();
  for (const [field, value] of [['canonicalization', 'JSON.stringify'], ['maxTotalDeliveries', 6],
    ['deadLetterRetentionDays', 1], ['authorizedReplayBatchMaximum', 1000]]) {
    const changed = copy(protocol);
    changed.wireRules[field] = value;
    assertInvalid(validateProtocol, changed, 'const');
  }
});

test('C23 requires inbox commit before acknowledgement and preserves tenant boundaries', async () => {
  const { platform, validatePlatform } = await fixture();
  const earlyAck = copy(platform);
  earlyAck.delivery.acknowledgement = 'on-receipt';
  assertInvalid(validatePlatform, earlyAck, 'const');
  const unauthorized = copy(platform);
  unauthorized.libraryConstraints.tenantAuthority = 'operator';
  assertInvalid(validatePlatform, unauthorized, 'const');
  const directStorage = copy(platform);
  directStorage.libraryConstraints.directBusinessStorageAccess = 'allowed';
  assertInvalid(validatePlatform, directStorage, 'const');
});

test('C23 rejects unbounded retry, early dead-letter expiry, and unreviewed replay', async () => {
  const { platform, validatePlatform } = await fixture();
  for (const change of [
    value => { value.policies.retry.backoffSecondsForAttempts2Through5 = [1, 2, 4, 16]; },
    value => { value.policies.deadLetter.retentionDays = 1; },
    value => { value.policies.replay.auditRequired = false; },
    value => { value.policies.replay.maximumBatchMessages = 101; }
  ]) {
    const changed = copy(platform);
    change(changed);
    assertInvalid(validatePlatform, changed, 'const');
  }
});

test('C23 keeps domain meaning and atomic effects with owners and requires all evidence', async () => {
  const { platform, validatePlatform } = await fixture();
  const stolen = copy(platform);
  stolen.domainResponsibilities.messageMeaning = 'messaging-platform';
  assertInvalid(validatePlatform, stolen, 'const');
  const omitted = copy(platform);
  omitted.acceptanceEvidence.required.pop();
  assertInvalid(validatePlatform, omitted, 'minItems');
  const extra = copy(platform);
  extra.delivery.exactlyOnce = true;
  assertInvalid(validatePlatform, extra, 'additionalProperties');
});

test('C23 AsyncAPI binds distinct tenant/global and dead-letter routes to C01 identities', async () => {
  const { transport, audit } = await fixture();
  assertRoutes(transport, audit);
  const swapped = copy(transport);
  swapped.channels.globalIdentityMessages.address = swapped.channels.tenantMessages.address;
  assert.throws(() => assertRoutes(swapped, audit), { code: 'ERR_ASSERTION' });
});

test('C23 AsyncAPI carries bounded mechanics without owning domain message types', async () => {
  const { transport, protocol, platform } = await fixture();
  const rules = transport['x-stocksense-conformance'];
  assert.equal(rules.envelopeMaximumBytes, protocol.wireRules.envelopeMaximumBytes);
  assert.equal(rules.maxTotalDeliveries, platform.policies.retry.maxTotalDeliveries);
  assert.deepEqual(rules.backoffSecondsForAttempts2Through5, platform.policies.retry.backoffSecondsForAttempts2Through5);
  assert.equal(rules.replayBatchMaximum, platform.policies.replay.maximumBatchMessages);
  assert.equal(rules.deadLetterRetentionSeconds, platform.policies.deadLetter.retentionDays * 86400);
  assert.deepEqual(rules.bootstrapPublishers, ['identity-access', 'retail-data']);
  assert.ok(!JSON.stringify(transport.components.messages).includes('messageType'));
});
