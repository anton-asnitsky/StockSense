import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createBoundedGeneratorRunner } from '../../src/bounded-generators.mjs';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const profile = JSON.parse(await readFile(new URL('../../../../contracts/samples/walking-skeleton/governance/generation-profile.json', import.meta.url)));
const image = 'sha256:' + 'a'.repeat(64);
const kiotaSha = '5e75f6adf161717be8d9f39eb596f93d52535e7b8cbcc00cffdcef3d0d3c3486';

function fixture(runResult, inspectStatus = 1, removeStatus = 0) {
  const calls = [];
  const spawn = (_bin, args, options) => {
    calls.push({ args, timeout: options.timeout });
    if (args[0] === 'context') return { status: 0, stdout: process.platform === 'win32'
      ? 'npipe:////./pipe/dockerDesktopLinuxEngine' : 'unix:///var/run/docker.sock' };
    if (args[0] === 'info') return { status: 0, stdout: 'linux' };
    if (args[0] === 'container') return { status: inspectStatus };
    if (args[0] === 'rm') return { status: removeStatus };
    if (args.includes('--entrypoint=/usr/bin/sha256sum')) return { status: 0, stdout: kiotaSha + '  package.nupkg\n' };
    return runResult;
  };
  const run = createBoundedGeneratorRunner(repoRoot, { standardsImage: image, kiotaImage: image,
    spawn, now: () => 0, limitMs: 500 });
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
