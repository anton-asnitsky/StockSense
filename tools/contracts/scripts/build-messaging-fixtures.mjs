#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import YAML from 'yaml';

const root = process.argv[2] ? resolve(process.argv[2]) : resolve(import.meta.dirname, '../../..');
const profileRoot = join(root, 'contracts/profiles/messaging-platform/v1');
const output = join(root, 'contracts/fixtures/messaging-platform/v1/example-fixture.json');

const c22 = YAML.parse(await readFile(join(profileRoot, 'protocol-compatibility.profile.yaml'), 'utf8'),
  { strict: true, uniqueKeys: true });
const c23 = YAML.parse(await readFile(join(profileRoot, 'platform.profile.yaml'), 'utf8'),
  { strict: true, uniqueKeys: true });
const copy = value => JSON.parse(JSON.stringify(value));
const c22Invalid = copy(c22);
delete c22Invalid.protocol.asyncapiBaseline;
const c23Invalid = copy(c23);
delete c23Invalid.delivery.publisherConfirm;

const fixtures = [
  { fixtureId: 'c22-protocol-positive', boundaryIds: ['C22'],
    contractElementId: 'MessagingProtocolCompatibilityManifest', scenarioType: 'valid',
    expectedOutcome: 'pass', payload: c22 },
  { fixtureId: 'c22-missing-asyncapi-baseline', boundaryIds: ['C22'],
    contractElementId: 'MessagingProtocolCompatibilityManifest', scenarioType: 'invalid',
    expectedOutcome: 'fail', expectedFailureCode: 'SCHEMA_REQUIRED', expectedFailureRuleId: 'BR2.4',
    payload: c22Invalid },
  { fixtureId: 'c23-platform-positive', boundaryIds: ['C23'],
    contractElementId: 'MessagingPlatformProfile', scenarioType: 'valid',
    expectedOutcome: 'pass', payload: c23 },
  { fixtureId: 'c23-missing-publisher-confirm', boundaryIds: ['C23'],
    contractElementId: 'MessagingPlatformProfile', scenarioType: 'invalid',
    expectedOutcome: 'fail', expectedFailureCode: 'SCHEMA_REQUIRED', expectedFailureRuleId: 'BR2.4',
    payload: c23Invalid }
];

await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify({ fixtureVersion: '1.0.0', syntheticOnly: true, fixtures }, null, 2) + '\n');
process.stdout.write(`${output}\n`);
