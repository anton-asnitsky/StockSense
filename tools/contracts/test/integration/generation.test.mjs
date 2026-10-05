import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPinnedGeneratorRunner, generatorConfigurationDigest } from '../../src/generators.mjs';
import { assertGenerationProfile, regenerateConsumer } from '../../src/generation.mjs';
import { digest } from '../../src/package-loader.mjs';

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

test('a generated fullPrompt file fails even when its expected digest matches', async () => {
  const [consumer] = (await loadProfile()).consumers;
  const outputPath = Object.keys(consumer.expectedOutputs)[0];
  const bytes = 'export const fullPrompt = "synthetic:blocked";\n';
  await assert.rejects(regenerateConsumer({ ...consumer, expectedOutputs: { [outputPath]: digest(Buffer.from(bytes)) } }, {
    runGenerator: async (_consumer, workspace) => writeFile(join(workspace, outputPath), bytes)
  }), error => error.code === 'PROTECTED_CONTENT' && error.ruleId === 'NFR6.1');
});

test('a generated supplier-content filename fails before drift can pass', async () => {
  const [consumer] = (await loadProfile()).consumers;
  const path = 'supplierSourceContent.d.ts';
  const bytes = 'export type Safe = never;\n';
  await assert.rejects(regenerateConsumer({ ...consumer, expectedOutputs: { [path]: digest(Buffer.from(bytes)) } }, {
    runGenerator: async (_consumer, workspace) => writeFile(join(workspace, path), bytes)
  }), error => error.code === 'PROTECTED_CONTENT' && error.ruleId === 'NFR6.1');
});

test('a generated protected variant fails despite an exact declared digest', async () => {
  const [consumer] = (await loadProfile()).consumers;
  const outputPath = Object.keys(consumer.expectedOutputs)[0];
  for (const bytes of ['export const fullPromptText = "synthetic:blocked";\n', 'export const supplierSourceContentText = "synthetic:blocked";\n', 'const password = "letmein9";\n']) {
    await assert.rejects(regenerateConsumer({ ...consumer, expectedOutputs: { [outputPath]: digest(Buffer.from(bytes)) } }, {
      runGenerator: async (_consumer, workspace) => writeFile(join(workspace, outputPath), bytes)
    }), error => error.code === 'PROTECTED_CONTENT' && error.ruleId === 'NFR6.1');
  }
});

test('a generated Deno task manifest fails despite an exact declared digest', async () => {
  const [consumer] = (await loadProfile()).consumers;
  const bytes = '{"tasks":{"build":"deno run build.ts"}}\n';
  await assert.rejects(regenerateConsumer({ ...consumer, expectedOutputs: { 'deno.json': digest(Buffer.from(bytes)) } }, {
    runGenerator: async () => assert.fail('Executable manifest reached generator')
  }), error => error.code === 'GENERATED_FILE_TYPE' && error.ruleId === 'NFR6.2');
});

test('generated package hook manifest cannot be credited as a matching output', async () => {
  const [consumer] = (await loadProfile()).consumers;
  const bytes = '{"scripts":{"postinstall":"echo synthetic"}}\n';
  await assert.rejects(regenerateConsumer({ ...consumer, expectedOutputs: { 'package.json': digest(Buffer.from(bytes)) } }, {
    runGenerator: async () => assert.fail('Unsafe path reached generator')
  }), error => error.code === 'GENERATED_FILE_TYPE' && error.ruleId === 'NFR6.2');
});
