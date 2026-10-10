import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOTNET_HOST, createPinnedGeneratorRunner, generatorConfigurationDigest } from '../../src/generators.mjs';
import { assertGenerationProfile, digestDirectory, regenerateConsumer } from '../../src/generation.mjs';
import { digest } from '../../src/package-loader.mjs';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const profilePath = join(repoRoot, 'contracts/samples/walking-skeleton/governance/generation-profile.json');
const runGenerator = createPinnedGeneratorRunner(repoRoot);
const loadProfile = async () => assertGenerationProfile(JSON.parse(await readFile(profilePath, 'utf8')));
// Selected by identity, not position: a second consumer must not silently
// change which one every other test is about.
const consumerNamed = async consumerId => {
  const found = (await loadProfile()).consumers.find(item => item.consumerId === consumerId);
  assert.ok(found, `the profile declares no ${consumerId}`);
  return found;
};

test('the sample generation profile declares both verified consumers', async () => {
  const profile = await loadProfile();
  assert.equal(profile.verified, true);
  assert.deepEqual(profile.consumers.map(item => item.consumerId).sort(),
    ['dotnet-operations-client', 'web-application']);
  const consumer = await consumerNamed('web-application');
  assert.equal(consumer.generator, 'openapi-typescript');
  assert.equal(consumer.sourceDocument, 'web-bff/v1/browser-api.openapi.yaml');
  // The declared configuration must match the pinned invocation, not a free-form flag set.
  assert.equal(
    consumer.configurationDigest,
    generatorConfigurationDigest('openapi-typescript', Object.keys(consumer.expectedOutputs)[0])
  );
});

test('the pinned generator reproduces the declared output with no drift', async () => {
  const consumer = await consumerNamed('web-application');
  const result = await regenerateConsumer(consumer, { runGenerator });
  assert.equal(result.consumerId, 'web-application');
  assert.deepEqual(result.outputs, consumer.expectedOutputs);
});

test('a changed expected digest is reported as drift', async () => {
  const consumer = await consumerNamed('web-application');
  const outputPath = Object.keys(consumer.expectedOutputs)[0];
  await assert.rejects(
    regenerateConsumer({ ...consumer, expectedOutputs: { [outputPath]: 'sha256:' + 'b'.repeat(64) } }, { runGenerator }),
    error => error.code === 'GENERATION_DRIFT'
  );
});

test('a consumer pinning another generator version is refused before running', async () => {
  const consumer = await consumerNamed('web-application');
  await assert.rejects(
    regenerateConsumer({ ...consumer, generatorVersion: '7.12.0' }, { runGenerator }),
    error => error.code === 'GENERATOR_VERSION'
  );
});

test('a consumer whose configuration digest does not match the pinned invocation is refused', async () => {
  const consumer = await consumerNamed('web-application');
  await assert.rejects(
    regenerateConsumer({ ...consumer, configurationDigest: 'sha256:' + 'c'.repeat(64) }, { runGenerator }),
    error => error.code === 'GENERATOR_CONFIGURATION'
  );
});

test('a generated fullPrompt file fails even when its expected digest matches', async () => {
  const consumer = await consumerNamed('web-application');
  const outputPath = Object.keys(consumer.expectedOutputs)[0];
  const bytes = 'export const fullPrompt = "synthetic:blocked";\n';
  await assert.rejects(regenerateConsumer({ ...consumer, expectedOutputs: { [outputPath]: digest(Buffer.from(bytes)) } }, {
    runGenerator: async (_consumer, workspace) => writeFile(join(workspace, outputPath), bytes)
  }), error => error.code === 'PROTECTED_CONTENT' && error.ruleId === 'NFR6.1');
});

test('a generated supplier-content filename fails before drift can pass', async () => {
  const consumer = await consumerNamed('web-application');
  const path = 'supplierSourceContent.d.ts';
  const bytes = 'export type Safe = never;\n';
  await assert.rejects(regenerateConsumer({ ...consumer, expectedOutputs: { [path]: digest(Buffer.from(bytes)) } }, {
    runGenerator: async (_consumer, workspace) => writeFile(join(workspace, path), bytes)
  }), error => error.code === 'PROTECTED_CONTENT' && error.ruleId === 'NFR6.1');
});

test('a generated protected variant fails despite an exact declared digest', async () => {
  const consumer = await consumerNamed('web-application');
  const outputPath = Object.keys(consumer.expectedOutputs)[0];
  for (const bytes of ['export const fullPromptText = "synthetic:blocked";\n', 'export const supplierSourceContentText = "synthetic:blocked";\n', 'const password = "letmein9";\n']) {
    await assert.rejects(regenerateConsumer({ ...consumer, expectedOutputs: { [outputPath]: digest(Buffer.from(bytes)) } }, {
      runGenerator: async (_consumer, workspace) => writeFile(join(workspace, outputPath), bytes)
    }), error => error.code === 'PROTECTED_CONTENT' && error.ruleId === 'NFR6.1');
  }
});

test('a generated Deno task manifest fails despite an exact declared digest', async () => {
  const consumer = await consumerNamed('web-application');
  const bytes = '{"tasks":{"build":"deno run build.ts"}}\n';
  await assert.rejects(regenerateConsumer({ ...consumer, expectedOutputs: { 'deno.json': digest(Buffer.from(bytes)) } }, {
    runGenerator: async () => assert.fail('Executable manifest reached generator')
  }), error => error.code === 'GENERATED_FILE_TYPE' && error.ruleId === 'NFR6.2');
});

test('generated package hook manifest cannot be credited as a matching output', async () => {
  const consumer = await consumerNamed('web-application');
  const bytes = '{"scripts":{"postinstall":"echo synthetic"}}\n';
  await assert.rejects(regenerateConsumer({ ...consumer, expectedOutputs: { 'package.json': digest(Buffer.from(bytes)) } }, {
    runGenerator: async () => assert.fail('Unsafe path reached generator')
  }), error => error.code === 'GENERATED_FILE_TYPE' && error.ruleId === 'NFR6.2');
});


test('the pinned Kiota generator produces a reproducible .NET client from the locked source', async t => {
  // Kiota 1.35.0 is a pinned local dotnet tool. Where the .NET host or the
  // restored tool is absent this skips rather than fails: an unavailable seam
  // must never read as a clean result.
  const probe = spawnSync(DOTNET_HOST, ['tool', 'run', 'kiota', '--', '--version'],
    { cwd: repoRoot, encoding: 'utf8', timeout: 120_000 });
  if (probe.error || probe.status !== 0 || !String(probe.stdout).trimStart().startsWith('1.35.0')) {
    t.skip('pinned Kiota 1.35.0 requires `dotnet tool restore` with the checked-in manifest');
    return;
  }
  const outputDirectory = 'dotnet-client';
  const consumer = {
    consumerId: 'dotnet-operations-client',
    generator: 'kiota',
    generatorVersion: '1.35.0',
    sourceDocument: 'web-bff/v1/browser-api.openapi.yaml',
    configurationDigest: generatorConfigurationDigest('kiota', outputDirectory),
    expectedOutputs: { [outputDirectory]: 'sha256:' + '0'.repeat(64) }
  };
  // Driven through the pinned runner, so the argument vector comes from the
  // generator registry and not from this test or from a consumer profile.
  const runs = [];
  for (let run = 0; run < 2; run += 1) {
    const workspace = await mkdtemp(join(tmpdir(), 'stocksense-kiota-'));
    try {
      await runGenerator(consumer, workspace);
      runs.push(await digestDirectory(workspace));
    } finally { await rm(workspace, { recursive: true, force: true }); }
  }
  const [first, second] = runs;
  const paths = Object.keys(first).sort();
  assert.ok(paths.length > 50, `expected a full client, got ${paths.length} files`);
  assert.ok(paths.every(path => path.startsWith(`${outputDirectory}/`)),
    'the generator must write only inside the declared output directory');
  // No dot-prefixed diagnostic file: the pinned invocation suppresses the log,
  // which the generated-output policy would otherwise refuse outright.
  assert.ok(!paths.some(path => path.split('/').some(part => part.startsWith('.'))));
  // Every generated path must be one the generated-output policy accepts, so
  // a .NET client cannot introduce a file type the gate would refuse.
  assert.ok(paths.every(path => /\.(?:cs|json)$/.test(path)), 'unexpected generated file type');
  assert.ok(paths.filter(path => path.endsWith('.cs')).length > 50, 'the client must be C# source');
  // Two clean workspaces agree, so drift detection over this client would be
  // meaningful rather than reporting the generator's own nondeterminism.
  assert.deepEqual(second, first, 'two clean Kiota runs must produce identical bytes');
  t.diagnostic(`kiota 1.35.0: ${paths.length} C# files, tree digest ${digest(Buffer.from(JSON.stringify(first)))}`);
});

test('the pinned .NET client is compared against its declared output manifest', async t => {
  // The .NET client emits a directory tree rather than one file, so until it
  // was pinned nothing ever compared it: the reproducibility test above built
  // its own placeholder manifest and bypassed the drift comparison entirely.
  // This runs the real consumer through regenerateConsumer, which means
  // assertNoDrift judges every generated file against the recorded digest.
  const probe = spawnSync(DOTNET_HOST, ['tool', 'run', 'kiota', '--', '--version'],
    { cwd: repoRoot, encoding: 'utf8', timeout: 120_000 });
  if (probe.error || probe.status !== 0 || !String(probe.stdout).trimStart().startsWith('1.35.0')) {
    t.skip('pinned Kiota 1.35.0 requires `dotnet tool restore` with the checked-in manifest');
    return;
  }
  const consumer = await consumerNamed('dotnet-operations-client');
  assert.equal(consumer.generator, 'kiota');
  assert.equal(consumer.generatorVersion, '1.35.0');
  assert.equal(consumer.sourceDocument, 'web-bff/v1/browser-api.openapi.yaml');
  const declared = Object.keys(consumer.expectedOutputs);
  assert.ok(declared.length > 50, `expected a full client manifest, got ${declared.length} entries`);
  assert.ok(declared.every(path => path.startsWith('dotnet-client/')),
    'every declared output must sit inside the declared output directory');
  // The configuration digest must match the pinned invocation for the output
  // directory, not a free-form flag set.
  assert.equal(consumer.configurationDigest, generatorConfigurationDigest('kiota', 'dotnet-client'));

  const result = await regenerateConsumer(consumer, { runGenerator });
  assert.equal(result.consumerId, 'dotnet-operations-client');
  assert.deepEqual(result.outputs, consumer.expectedOutputs);
  t.diagnostic(`kiota 1.35.0: ${declared.length} declared outputs verified with no drift`);
});

test('drift in any single file of the .NET client is reported', async t => {
  const probe = spawnSync(DOTNET_HOST, ['tool', 'run', 'kiota', '--', '--version'],
    { cwd: repoRoot, encoding: 'utf8', timeout: 120_000 });
  if (probe.error || probe.status !== 0 || !String(probe.stdout).trimStart().startsWith('1.35.0')) {
    t.skip('pinned Kiota 1.35.0 requires `dotnet tool restore` with the checked-in manifest');
    return;
  }
  const consumer = await consumerNamed('dotnet-operations-client');
  const paths = Object.keys(consumer.expectedOutputs).sort();
  // A manifest of a hundred files is worthless if a single changed, missing or
  // unexpected file slips through, so each case is exercised against the real
  // generated tree rather than a stub.
  const cases = [
    ['changed', { ...consumer.expectedOutputs, [paths[0]]: 'sha256:' + 'b'.repeat(64) }],
    ['missing', Object.fromEntries(Object.entries(consumer.expectedOutputs)
      .concat([['dotnet-client/NotGenerated.cs', 'sha256:' + 'c'.repeat(64)]]))],
    ['extra', Object.fromEntries(Object.entries(consumer.expectedOutputs).filter(([path]) => path !== paths[0]))]
  ];
  for (const [label, expectedOutputs] of cases) {
    await assert.rejects(regenerateConsumer({ ...consumer, expectedOutputs }, { runGenerator }),
      error => error.code === 'GENERATION_DRIFT' && error.ruleId === 'BR3.3', `${label} output must be drift`);
  }
});
