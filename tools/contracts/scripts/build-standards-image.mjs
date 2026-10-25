import { spawnSync } from 'node:child_process';
import { lstatSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceTreeDigest } from '../src/source-digest.mjs';

// Build the locked image, then verify the exact marker bytes in its final
// filesystem. An unstarted container allows this even without shell utilities.
const contractsRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const docker = process.platform === 'win32'
  ? 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe' : '/usr/bin/docker';
const tag = process.env.STOCKSENSE_STANDARDS_TAG ?? 'stocksense-validator:local';
const SHA = /^sha256:[0-9a-f]{64}$/;
const CONTAINER_ID = /^[0-9a-f]{64}$/;

function run(args, label, timeout = 120_000) {
  const result = spawnSync(docker, args, { encoding: 'utf8', shell: false, windowsHide: true,
    timeout, maxBuffer: 16 * 1_048_576, stdio: ['ignore', 'pipe', 'inherit'] });
  if (result.error || result.status !== 0) throw new Error(`${label} failed`);
  return String(result.stdout ?? '').trim();
}

try {
  const expected = Buffer.from(await sourceTreeDigest() + '\n');
  run(['build', '--platform=linux/amd64', '--file', 'Dockerfile.validator', '--tag', tag,
    contractsRoot], 'docker build', 12 * 60_000);
  const id = run(['image', 'inspect', tag, '--format', '{{.Id}}'], 'docker image inspect');
  if (!SHA.test(id)) throw new Error('Unexpected image ID');
  if (run(['image', 'inspect', id, '--format', '{{.Architecture}}'], 'image architecture') !== 'amd64') {
    throw new Error('Validator image is not linux/amd64');
  }
  const container = run(['create', '--pull=never', '--network=none', '--read-only',
    '--entrypoint=/nodejs/bin/node', id, '--version'], 'docker create');
  if (!CONTAINER_ID.test(container)) throw new Error('Unexpected container ID');
  let directory;
  try {
    directory = mkdtempSync(join(tmpdir(), 'stocksense-standards-digest-'));
    const target = join(directory, 'source-digest.txt');
    run(['cp', `${container}:/opt/contracts/source-digest.txt`, target], 'docker cp');
    if (!lstatSync(target).isFile() || !readFileSync(target).equals(expected)) {
      throw new Error('Built image has a different tool-source digest');
    }
  } finally {
    let localCleanupError;
    try { if (directory) rmSync(directory, { recursive: true, force: true }); }
    catch (error) { localCleanupError = error; }
    run(['rm', '--force', container], 'docker rm');
    if (localCleanupError) throw new Error('Source-digest cleanup failed');
  }
  const version = run(['run', '--rm', '--pull=never', '--network=none', '--read-only',
    '--security-opt=no-new-privileges=true', '--cap-drop=ALL', '--pids-limit=64',
    '--memory=2147483648', '--memory-swap=2147483648', '--user=65532:65532',
    '--entrypoint=/nodejs/bin/node', id, '--version'], 'runtime smoke');
  if (version !== 'v24.19.0') throw new Error('Validator runtime Node version differs from the pin');
  process.stderr.write(`tool sources ${expected.toString().trim()}\n`);
  process.stdout.write(id + '\n');
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
