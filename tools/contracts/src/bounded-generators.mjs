import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { ContractError, assertSafePath } from './package-loader.mjs';
import { GENERATORS, generatorConfigurationDigest } from './generators.mjs';
import { LIMITS } from './preflight.mjs';

const DOCKER = process.platform === 'win32'
  ? 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe' : '/usr/bin/docker';
const IMAGE = /^sha256:[0-9a-f]{64}$/;
const KIOTA_PACKAGE = '/opt/kiota/.store/microsoft.openapi.kiota/1.35.0/microsoft.openapi.kiota/1.35.0/microsoft.openapi.kiota.1.35.0.nupkg';
const KIOTA_SHA = '5e75f6adf161717be8d9f39eb596f93d52535e7b8cbcc00cffdcef3d0d3c3486';
const PEAK = /(?:^|\n)STOCKSENSE_GENERATOR_PEAK=(\d+)\r?\n?$/;
const WRAPPER = '"$@"\ncode=$?\nprintf "\\nSTOCKSENSE_GENERATOR_PEAK=" >&2\ncat /sys/fs/cgroup/memory.peak >&2\nexit "$code"';
/** @returns {never} */
const fail = (code, message) => { throw new ContractError(code, 'NFR10.1', message); };

function dockerCall(spawn, args, timeout) {
  const env = { ...process.env };
  for (const key of ['DOCKER_HOST', 'DOCKER_CONTEXT', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH']) delete env[key];
  return spawn(DOCKER, args, { encoding: 'utf8', timeout, maxBuffer: 1_048_576,
    shell: false, windowsHide: true, env });
}

/**
 * Run each declared generator in a disposable Linux cgroup capped at 2 GiB.
 * @param {string} repoRoot
 * @param {{ standardsImage?: string, kiotaImage?: string,
 *   onMeasurement?: (measurement: {consumerId: string, generator: string, image: string,
 *     elapsedMs: number, peakBytes: number, outputPath: string}) => void,
 *   spawn?: typeof spawnSync, now?: () => number, limitMs?: number,
 *   memoryBytes?: number }} options
 */
export function createBoundedGeneratorRunner(repoRoot, { standardsImage, kiotaImage, onMeasurement = () => {},
  spawn = spawnSync, now = () => performance.now(), limitMs = LIMITS.generatorMs,
  memoryBytes = LIMITS.processBytes } = {}) {
  if (!Number.isSafeInteger(limitMs) || limitMs < 1 || limitMs > LIMITS.generatorMs ||
      !Number.isSafeInteger(memoryBytes) || memoryBytes < 16 * 1024 * 1024 ||
      memoryBytes > LIMITS.processBytes) {
    fail('GENERATOR_LIMIT', 'Generator limits may only be tightened');
  }
  if (!IMAGE.test(standardsImage ?? '') || !IMAGE.test(kiotaImage ?? '')) {
    fail('GENERATOR_IMAGE', 'Both generator images must be supplied by immutable image ID');
  }
  const standardId = /** @type {string} */ (standardsImage);
  const kiotaId = /** @type {string} */ (kiotaImage);
  if (/[,\r\n\x00-\x1f]/.test(repoRoot)) fail('GENERATOR_MOUNT', 'Repository path cannot be mounted safely');
  const context = dockerCall(spawn, ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'], 5_000);
  const allowed = process.platform === 'win32'
    ? ['npipe:////./pipe/dockerDesktopLinuxEngine', 'npipe:////./pipe/docker_engine']
    : ['unix:///var/run/docker.sock', 'unix:///run/docker.sock'];
  if (context.error || context.status !== 0 || !allowed.includes(String(context.stdout).trim())) {
    fail('GENERATOR_ENGINE', 'Generator supervision requires a local Docker engine');
  }
  const info = dockerCall(spawn, ['info', '--format', '{{.OSType}}'], 5_000);
  if (info.error || info.status !== 0 || String(info.stdout).trim() !== 'linux') {
    fail('GENERATOR_ENGINE', 'Generator supervision requires Linux containers');
  }
  const installed = dockerCall(spawn, ['run', '--rm', '--pull=never', '--network=none', '--read-only',
    '--entrypoint=/usr/bin/sha256sum', kiotaId, KIOTA_PACKAGE], 5_000);
  if (installed.error || installed.status !== 0 || String(installed.stdout).split(/\s+/)[0] !== KIOTA_SHA) {
    fail('GENERATOR_IMAGE', 'Pinned Kiota image does not contain the approved package bytes');
  }
  let user = '65532:65532';
  if (process.platform !== 'win32') {
    const uid = process.getuid?.();
    const gid = process.getgid?.();
    if (uid === undefined || gid === undefined || uid === 0) {
      fail('GENERATOR_ENGINE', 'Generator supervision requires a non-root host user');
    }
    user = `${uid}:${gid}`;
  }
  return (consumer, workspace) => {
    if (/[,\r\n\x00-\x1f]/.test(workspace)) fail('GENERATOR_MOUNT', 'Workspace path cannot be mounted safely');
    const generator = GENERATORS[consumer.generator];
    if (!generator) fail('GENERATOR_UNKNOWN', 'Consumer names an unregistered generator');
    if (consumer.generatorVersion !== generator.version ||
        consumer.configurationDigest !== generatorConfigurationDigest(consumer.generator, generator.outputPath)) {
      fail('GENERATOR_CONFIGURATION', 'Consumer generator version or configuration differs from the approved invocation');
    }
    const source = '/repo/contracts/source/' + assertSafePath(consumer.sourceDocument);
    const target = '/work/' + generator.outputPath;
    const image = consumer.generator === 'kiota' ? kiotaId : standardId;
    const command = consumer.generator === 'kiota'
      ? ['/opt/kiota/kiota', ...generator.args(source, target).slice(4)]
      : consumer.generator === 'modelina'
        ? ['/usr/local/bin/node', '/opt/contracts/src/modelina-message-generator.mjs',
            ...generator.args(source, target)]
        : ['/usr/local/bin/node', '/opt/contracts/node_modules/openapi-typescript/bin/cli.js',
            ...generator.args(source, target)];
    // Kiota's host invocation starts with `tool run kiota --`; the image
    // installs that same pinned binary directly.
    const name = 'stocksense-generator-' + randomUUID();
    const args = ['run', '--rm', '--pull=never', '--name', name, '--network=none', '--read-only',
      '--security-opt=no-new-privileges=true', '--cap-drop=ALL', '--pids-limit=128',
      '--memory=' + memoryBytes, '--memory-swap=' + memoryBytes,
      '--user=' + user, '--tmpfs=/tmp:rw,noexec,nosuid,size=67108864',
      '--env=HOME=/tmp', '--env=DOTNET_CLI_HOME=/tmp', '--env=DOTNET_CLI_TELEMETRY_OPTOUT=1',
      '--mount', `type=bind,source=${join(repoRoot, 'contracts/source')},target=/repo/contracts/source,readonly`,
      '--mount', `type=bind,source=${workspace},target=/work`, '--workdir=/work',
      '--entrypoint=/bin/sh', image, '-c', WRAPPER, '_', ...command];
    const start = now();
    const result = dockerCall(spawn, args, limitMs);
    const elapsedMs = Math.ceil(now() - start);
    // A timed-out Docker client can leave its container running. Check and
    // remove it before reporting the generator outcome.
    const remaining = dockerCall(spawn, ['container', 'inspect', name], 5_000);
    if (remaining.error || (remaining.status !== 0 && remaining.status !== 1)) {
      fail('GENERATOR_ENGINE', 'Could not verify generator container cleanup');
    }
    if (remaining.status === 0) {
      const removed = dockerCall(spawn, ['rm', '--force', name], 5_000);
      if (removed.error || removed.status !== 0) {
        fail('GENERATOR_ENGINE', 'Could not stop generator container');
      }
    }
    if (result?.error?.code === 'ETIMEDOUT' || result?.signal || elapsedMs > limitMs) {
      fail('GENERATOR_LIMIT', 'Pinned generator exceeded the 120-second limit');
    }
    if (result?.status === 137) fail('GENERATOR_LIMIT', 'Pinned generator exceeded the 2 GiB memory limit');
    if (result?.error || typeof result?.status !== 'number' || [125, 126, 127].includes(result.status)) {
      fail('GENERATOR_ENGINE', 'Local pinned generator container could not run');
    }
    const peak = PEAK.exec(String(result.stderr ?? ''));
    if (result.status !== 0 || !peak) fail('GENERATION_FAILED', 'Pinned generator failed or did not report cgroup peak memory');
    const peakBytes = Number(peak[1]);
    if (!Number.isSafeInteger(peakBytes) || peakBytes > memoryBytes) {
      fail('GENERATOR_LIMIT', 'Pinned generator exceeded the 2 GiB memory limit');
    }
    onMeasurement({ consumerId: consumer.consumerId, generator: consumer.generator,
      image, elapsedMs, peakBytes, outputPath: join(workspace, generator.outputPath) });
  };
}
