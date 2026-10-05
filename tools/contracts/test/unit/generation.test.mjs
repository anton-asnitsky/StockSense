import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ContractError, digest } from '../../src/package-loader.mjs';
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

test('NFR6.1: matching generated digest cannot hide fullPrompt content', async () => {
  const bytes = 'export const fullPrompt = "synthetic:blocked";\n';
  await assert.rejects(regenerateConsumer(consumer({ expectedOutputs: { 'bff.d.ts': digest(Buffer.from(bytes)) } }), {
    runGenerator: async (_consumer, workspace) => writeFile(join(workspace, 'bff.d.ts'), bytes)
  }), error => error.code === 'PROTECTED_CONTENT' && error.ruleId === 'NFR6.1');
});

test('NFR6.1: generated credential and supplier source content fail before hashing', async () => {
  for (const bytes of ['const client_secret = "abcdefghijklmnop";\n', 'const password = "letmein9";\n', 'const password = "!";\n', 'supplierSourceContent']) {
    await assert.rejects(regenerateConsumer(consumer({ expectedOutputs: { 'bff.d.ts': digest(Buffer.from(bytes)) } }), {
      runGenerator: async (_consumer, workspace) => writeFile(join(workspace, 'bff.d.ts'), bytes)
    }), error => error.code === 'PROTECTED_CONTENT' && error.ruleId === 'NFR6.1');
  }
});

test('NFR6.1: generated filenames and declared output paths cannot carry protected labels', async () => {
  await assert.rejects(regenerateConsumer(consumer({ expectedOutputs: { 'nested/fullPrompt.d.ts': sha('a') } }), {
    runGenerator: async (_consumer, workspace) => {
      await mkdir(join(workspace, 'nested'), { recursive: true });
      await writeFile(join(workspace, 'nested/fullPrompt.d.ts'), 'export type Safe = never;\n');
    }
  }), error => error.code === 'PROTECTED_CONTENT' && error.ruleId === 'NFR6.1');
  expectCode(() => assertNoDrift({ 'supplierSourceContent.json': sha('a') }, {}), 'PROTECTED_CONTENT');
});

test('NFR6.1: generator diagnostic output is replaced with a stable safe finding', async () => {
  await assert.rejects(regenerateConsumer(consumer(), {
    runGenerator: async () => { throw new Error('fullPrompt: synthetic:blocked'); }
  }), error => error.code === 'GENERATOR_FAILED' && error.ruleId === 'BR3.1' && !/fullPrompt/.test(error.message));
});

test('NFR6.1: generator metadata cannot become a passing result or drift diagnostic', async () => {
  await assert.rejects(regenerateConsumer(consumer({ consumerId: 'fullPrompt' }), {
    runGenerator: async (_consumer, workspace) => writeFile(join(workspace, 'bff.d.ts'), 'export type Api = never;\n')
  }), error => error.code === 'PROTECTED_CONTENT' && error.ruleId === 'NFR6.1');
  expectCode(() => assertNoDrift({}, { 'safe.ts': sha('a') }, 'supplierSourceContent'), 'PROTECTED_CONTENT');
});

test('NFR6.1: protected generated variants fail even when expected digests match', async () => {
  for (const bytes of ['export const fullPromptText = "synthetic:blocked";\n', 'export const supplierSourceContentText = "synthetic:blocked";\n']) {
    await assert.rejects(regenerateConsumer(consumer({ expectedOutputs: { 'bff.d.ts': digest(Buffer.from(bytes)) } }), {
      runGenerator: async (_consumer, workspace) => writeFile(join(workspace, 'bff.d.ts'), bytes)
    }), error => error.code === 'PROTECTED_CONTENT' && error.ruleId === 'NFR6.1');
  }
});

test('NFR6.2: executable hook manifests and unsupported generated files are rejected before drift hashing', async () => {
  for (const path of ['package.json', 'deno.json', 'scripts/run.sh', '.github/workflows/build.yaml']) {
    await assert.rejects(regenerateConsumer(consumer({ expectedOutputs: { [path]: sha('a') } }), {
      runGenerator: async () => assert.fail('Unsafe output path reached generator')
    }), error => error.code === 'GENERATED_FILE_TYPE' && error.ruleId === 'NFR6.2');
  }
  const bytes = 'scripts: {prepare: echo synthetic}\n';
  await assert.rejects(regenerateConsumer(consumer({ expectedOutputs: { 'settings.yaml': digest(Buffer.from(bytes)) } }), {
    runGenerator: async (_consumer, workspace) => writeFile(join(workspace, 'settings.yaml'), bytes)
  }), error => error.code === 'HOOK_FORBIDDEN' && error.ruleId === 'NFR6.2');
});

test('NFR6.2: Deno tasks cannot pass with a matching output digest', async () => {
  const bytes = '{"tasks":{"build":"deno run build.ts"}}\n';
  await assert.rejects(regenerateConsumer(consumer({ expectedOutputs: { 'deno.json': digest(Buffer.from(bytes)) } }), {
    runGenerator: async () => assert.fail('Executable manifest reached generator')
  }), error => error.code === 'GENERATED_FILE_TYPE' && error.ruleId === 'NFR6.2');
});

test('BR3.1: caller-controlled consumer id cannot inject diagnostic lines', async () => {
  const consumerId = 'web\n::error::injected';
  await assert.rejects(regenerateConsumer(consumer({ consumerId }), {
    runGenerator: async () => assert.fail('Unsafe consumer reached generator')
  }), error => error.code === 'GENERATION_CONSUMER_SHAPE' && error.ruleId === 'BR3.1' && !error.message.includes('::error::'));
  assert.throws(() => assertNoDrift({ 'a.ts': sha('a') }, {}, consumerId),
    error => error.code === 'GENERATION_CONSUMER_SHAPE' && error.ruleId === 'BR3.1' && !error.message.includes('::error::'));
});

test('BR3.1: forged generator diagnostic code and rule cannot be emitted', async () => {
  await assert.rejects(regenerateConsumer(consumer(), {
    runGenerator: async () => { throw new ContractError('PROTECTED_CONTENT', 'NFR6.1', 'fullPromptText synthetic:blocked'); }
  }), error => error.code === 'GENERATOR_FAILED' && error.ruleId === 'BR3.1' && !/fullPrompt/i.test(error.message));
});
