import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPinnedGeneratorRunner, generatorConfigurationDigest } from '../../src/generators.mjs';
import { assertGenerationProfile, regenerateConsumer } from '../../src/generation.mjs';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const profilePath = join(repoRoot, 'contracts/samples/walking-skeleton/governance/generation-profile.json');
const runGenerator = createPinnedGeneratorRunner(repoRoot);
const loadProfile = async () => assertGenerationProfile(JSON.parse(await readFile(profilePath, 'utf8')));

test('the sample generation profile declares a verified consumer', async () => {
  const profile = await loadProfile();
  assert.equal(profile.verified, true);
  assert.equal(profile.consumers.length, 1);
  const [consumer] = profile.consumers;
  assert.equal(consumer.generator, 'openapi-typescript');
  assert.equal(consumer.sourceDocument, 'web-bff/v1/browser-api.openapi.yaml');
  // The declared configuration must match the pinned invocation, not a free-form flag set.
  assert.equal(
    consumer.configurationDigest,
    generatorConfigurationDigest('openapi-typescript', Object.keys(consumer.expectedOutputs)[0])
  );
});

test('the pinned generator reproduces the declared output with no drift', async () => {
  const [consumer] = (await loadProfile()).consumers;
  const result = await regenerateConsumer(consumer, { runGenerator });
  assert.equal(result.consumerId, 'web-application');
  assert.deepEqual(result.outputs, consumer.expectedOutputs);
});

test('a changed expected digest is reported as drift', async () => {
  const [consumer] = (await loadProfile()).consumers;
  const outputPath = Object.keys(consumer.expectedOutputs)[0];
  await assert.rejects(
    regenerateConsumer({ ...consumer, expectedOutputs: { [outputPath]: 'sha256:' + 'b'.repeat(64) } }, { runGenerator }),
    error => error.code === 'GENERATION_DRIFT'
  );
});

test('a consumer pinning another generator version is refused before running', async () => {
  const [consumer] = (await loadProfile()).consumers;
  await assert.rejects(
    regenerateConsumer({ ...consumer, generatorVersion: '7.12.0' }, { runGenerator }),
    error => error.code === 'GENERATOR_VERSION'
  );
});

test('a consumer whose configuration digest does not match the pinned invocation is refused', async () => {
  const [consumer] = (await loadProfile()).consumers;
  await assert.rejects(
    regenerateConsumer({ ...consumer, configurationDigest: 'sha256:' + 'c'.repeat(64) }, { runGenerator }),
    error => error.code === 'GENERATOR_CONFIGURATION'
  );
});
