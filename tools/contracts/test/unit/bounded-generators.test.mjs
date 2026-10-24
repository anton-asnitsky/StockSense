import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createBoundedGeneratorRunner, verifyKiotaPackageImage } from '../../src/bounded-generators.mjs';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const profile = JSON.parse(await readFile(new URL('../../../../contracts/samples/walking-skeleton/governance/generation-profile.json', import.meta.url)));
const image = 'sha256:' + 'a'.repeat(64);
const kiotaSha = '5e75f6adf161717be8d9f39eb596f93d52535e7b8cbcc00cffdcef3d0d3c3486';
const containerId = 'b'.repeat(64);

function fixture(runResult, inspectStatus = 1, removeStatus = 0, copyStatus = 0) {
  const calls = [];
  const spawn = (_bin, args, options) => {
    calls.push({ args, timeout: options.timeout });
    if (args[0] === 'context') return { status: 0, stdout: process.platform === 'win32'
      ? 'npipe:////./pipe/dockerDesktopLinuxEngine' : 'unix:///var/run/docker.sock' };
    if (args[0] === 'info') return { status: 0, stdout: 'linux' };
    if (args[0] === 'container') return { status: inspectStatus };
    if (args[0] === 'rm') return { status: args[2] === containerId ? 0 : removeStatus };
    if (args[0] === 'create') return { status: 0, stdout: containerId + '\n' };
    if (args[0] === 'cp') {
      if (copyStatus === 0) writeFileSync(args[2], 'synthetic Kiota package');
      return { status: copyStatus };
    }
    return runResult;
  };
  const run = createBoundedGeneratorRunner(repoRoot, { standardsImage: image, kiotaImage: image,
    spawn, hashPackage: () => kiotaSha, now: () => 0, limitMs: 500 });
  return { calls, run };
}

test('a timed-out generator is killed at the configured limit and its container is removed', () => {
  const { calls, run } = fixture({ error: { code: 'ETIMEDOUT' }, signal: 'SIGTERM' }, 0);
  assert.throws(() => run(profile.consumers[0], repoRoot), { code: 'GENERATOR_LIMIT' });
  assert.equal(calls.find(call => call.args[0] === 'run' && call.args.includes('--entrypoint=/bin/sh')).timeout, 500);
  assert.ok(calls.some(call => call.args[0] === 'rm' && call.args[1] === '--force'));
});

test('a failed forced cleanup is never reported as successful generation', () => {
  const { run } = fixture({ status: 0, stderr: '\nSTOCKSENSE_GENERATOR_PEAK=123\n' }, 0, 1);
  assert.throws(() => run(profile.consumers[0], repoRoot), { code: 'GENERATOR_ENGINE' });
});

test('memory kill and missing cgroup measurement fail closed', () => {
  for (const [result, code] of [
    [{ status: 137, stderr: '' }, 'GENERATOR_LIMIT'],
    [{ status: 0, stderr: '' }, 'GENERATION_FAILED']
  ]) {
    const { run } = fixture(result);
    assert.throws(() => run(profile.consumers[0], repoRoot), { code });
  }
});

test('generator memory and time limits cannot exceed their approved maxima', () => {
  for (const options of [{ limitMs: 120_001 }, { memoryBytes: 2 * 1024 ** 3 + 1 }]) {
    assert.throws(() => createBoundedGeneratorRunner(repoRoot, { standardsImage: image,
      kiotaImage: image, ...options }), { code: 'GENERATOR_LIMIT' });
  }
});

test('Modelina uses the fixed offline entry point and constrained source mount', () => {
  const { calls, run } = fixture({ status: 0, stderr: '\nSTOCKSENSE_GENERATOR_PEAK=123\n' });
  run(profile.consumers.find(consumer => consumer.consumerId === 'messaging-typescript'), repoRoot);
  const args = calls.find(call => call.args.includes('--entrypoint=/bin/sh')).args;
  assert.ok(args.includes('/opt/contracts/src/modelina-message-generator.mjs'));
  assert.ok(args.includes('--network=none'));
  assert.ok(args.includes('--memory=2147483648'));
});

test('chiseled Kiota uses the net10 launcher while preserving peak and cgroup limits', () => {
  const { calls, run } = fixture({ status: 0, stderr: '\nSTOCKSENSE_GENERATOR_PEAK=123\n' });
  run(profile.consumers.find(consumer => consumer.generator === 'kiota'), repoRoot);
  const args = calls.find(call => call.args.includes('--entrypoint=/usr/share/dotnet/dotnet')).args;
  assert.ok(args.includes('/opt/kiota-probe/kiota-probe.dll'));
  assert.ok(args.includes('--network=none'));
  assert.ok(args.includes('--memory=2147483648'));
  assert.ok(args.includes('--memory-swap=2147483648'));
  assert.equal(args.includes('/bin/sh'), false);
});

test('final-image Kiota probe copies exact package bytes from an unstarted offline container', () => {
  const calls = [];
  const spawn = (_bin, args) => {
    calls.push(args);
    if (args[0] === 'create') return { status: 0, stdout: containerId + '\n' };
    if (args[0] === 'cp') { writeFileSync(args[2], 'synthetic Kiota package'); return { status: 0 }; }
    if (args[0] === 'rm') return { status: 0 };
    assert.fail(`unexpected Docker command: ${args[0]}`);
  };
  assert.doesNotThrow(() => verifyKiotaPackageImage(image, { spawn, hashPackage: () => kiotaSha }));
  assert.deepEqual(calls.map(args => args[0]), ['create', 'cp', 'rm']);
  assert.ok(calls[0].includes('--pull=never'));
  assert.ok(calls[0].includes('--network=none'));
  assert.ok(calls[0].includes('--read-only'));
  assert.equal(calls[1][1].startsWith(`${containerId}:/opt/kiota/.store/`), true);
});

test('wrong final-image package digest and failed copy both fail closed after cleanup', () => {
  for (const copyStatus of [0, 1]) {
    const calls = [];
    const spawn = (_bin, args) => {
      calls.push(args);
      if (args[0] === 'create') return { status: 0, stdout: containerId + '\n' };
      if (args[0] === 'cp') {
        if (copyStatus === 0) writeFileSync(args[2], 'wrong package');
        return { status: copyStatus };
      }
      if (args[0] === 'rm') return { status: 0 };
      assert.fail(`unexpected Docker command: ${args[0]}`);
    };
    assert.throws(() => verifyKiotaPackageImage(image, { spawn }), { code: 'GENERATOR_IMAGE' });
    assert.equal(calls.at(-1)[0], 'rm');
  }
});

test('all Kiota Dockerfile RUN instructions use exec form and pin the chiseled runtime', async () => {
  const dockerfile = await readFile(new URL('../../Dockerfile.generator-kiota', import.meta.url), 'utf8');
  const runs = dockerfile.split(/\r?\n/).filter(line => line.startsWith('RUN '));
  assert.ok(runs.length > 0);
  for (const line of runs) assert.ok(Array.isArray(JSON.parse(line.slice(4))), line);
  assert.match(dockerfile, /runtime@sha256:e5316053d31edfd98aa5742dd24987f315ba1265b4c838afc9799ce6a3602be8/);
  assert.match(dockerfile, /<TargetFramework>net10\.0<\/TargetFramework>/);
  assert.match(dockerfile, /COPY --from=build \/opt\/kiota-probe \/opt\/kiota-probe/);
});
