import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { digest } from '../../src/package-loader.mjs';
import {
  assertGenerationProfile, assertNoDrift, digestDirectory, regenerateConsumer
} from '../../src/generation.mjs';

const expectCode = (fn, code) => assert.throws(fn, error => error.code === code);
const expectAsyncCode = (promise, code) => assert.rejects(promise, error => error.code === code);
const sha = char => 'sha256:' + char.repeat(64);

const consumer = (overrides = {}) => ({
  consumerId: 'web-bff',
  generator: 'openapi-typescript',
  generatorVersion: '7.13.0',
  sourceDocument: 'web-bff/v1/bff.openapi.yaml',
  configurationDigest: sha('c'),
  expectedOutputs: { 'bff.d.ts': digest(Buffer.from('export type Api = never;\n')) },
  ...overrides
});

test('BR3.1: an empty consumer list is allowed only with a stated limitation', () => {
  const stated = assertGenerationProfile({ generationProfileVersion: '1.0.0', consumers: [], limitation: 'C01-only candidate' });
  assert.deepEqual(stated, { consumers: [], limitation: 'C01-only candidate', verified: false });
  expectCode(() => assertGenerationProfile({ generationProfileVersion: '1.0.0', consumers: [] }), 'GENERATION_LIMITATION');
});

test('BR3.1: each declared consumer needs a pinned generator, source and configuration digest', () => {
  const profile = { generationProfileVersion: '1.0.0', consumers: [consumer()] };
  assert.equal(assertGenerationProfile(profile).verified, true);
  for (const [key, value] of [['generatorVersion', 'latest'], ['configurationDigest', 'not-a-digest'], ['sourceDocument', '']]) {
    expectCode(
      () => assertGenerationProfile({ generationProfileVersion: '1.0.0', consumers: [consumer({ [key]: value })] }),
      'GENERATION_CONSUMER_SHAPE'
    );
  }
});

test('BR3.2: a declared consumer must expect at least one digested output', () => {
  expectCode(() => assertGenerationProfile({ generationProfileVersion: '1.0.0', consumers: [consumer({ expectedOutputs: {} })] }), 'GENERATION_OUTPUT_DIGEST');
  expectCode(() => assertGenerationProfile({ generationProfileVersion: '1.0.0', consumers: [consumer({ expectedOutputs: { 'a.ts': 'nope' } })] }), 'GENERATION_OUTPUT_DIGEST');
});

test('BR3.3: missing, extra and changed outputs all count as drift', () => {
  const expected = { 'a.ts': sha('a'), 'b.ts': sha('b') };
  assert.equal(assertNoDrift(expected, { ...expected }), true);
  expectCode(() => assertNoDrift(expected, { 'a.ts': sha('a') }), 'GENERATION_DRIFT');
  expectCode(() => assertNoDrift(expected, { ...expected, 'c.ts': sha('c') }), 'GENERATION_DRIFT');
  expectCode(() => assertNoDrift(expected, { ...expected, 'b.ts': sha('9') }), 'GENERATION_DRIFT');
});

test('BR3.2: nested generated files are digested by relative slash path', async () => {
  const observed = await regenerateConsumer(
    consumer({ expectedOutputs: { 'models/item.ts': digest(Buffer.from('item\n')) } }),
    {
      runGenerator: async (_consumer, workspace) => {
        await mkdir(join(workspace, 'models'), { recursive: true });
        await writeFile(join(workspace, 'models/item.ts'), 'item\n');
      }
    }
  );
  assert.deepEqual(Object.keys(observed.outputs), ['models/item.ts']);
});

test('BR3.1: the pinned generator is unavailable here and fails closed', async () => {
  await expectAsyncCode(regenerateConsumer(consumer()), 'GENERATOR_UNAVAILABLE');
});

test('BR3.3: a regenerated consumer that matches its manifest reports its pins', async () => {
  const result = await regenerateConsumer(consumer(), {
    runGenerator: async (_consumer, workspace) => writeFile(join(workspace, 'bff.d.ts'), 'export type Api = never;\n')
  });
  assert.equal(result.consumerId, 'web-bff');
  assert.equal(result.generatorVersion, '7.13.0');
  assert.deepEqual(result.outputs, consumer().expectedOutputs);
});

test('BR3.3: a generator writing an unexpected file is drift and the workspace is still removed', async () => {
  let captured;
  await expectAsyncCode(
    regenerateConsumer(consumer(), {
      runGenerator: async (_consumer, workspace) => {
        captured = workspace;
        await writeFile(join(workspace, 'bff.d.ts'), 'export type Api = never;\n');
        await writeFile(join(workspace, 'stray.ts'), 'stray\n');
      }
    }),
    'GENERATION_DRIFT'
  );
  await assert.rejects(digestDirectory(captured));
});
