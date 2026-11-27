import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceTreeDigest } from '../src/source-digest.mjs';
import { VALIDATOR_RUNTIME, verifyValidatorRuntimeArchive } from '../src/validator-runtime.mjs';

// Build the locked image, then verify the exact marker bytes in its final
// filesystem. An unstarted container allows this even without shell utilities.
const contractsRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const docker = process.platform === 'win32'
  ? 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe' : '/usr/bin/docker';
const tag = process.env.STOCKSENSE_STANDARDS_TAG ?? 'stocksense-validator:local';
const SHA = /^sha256:[0-9a-f]{64}$/;
const CONTAINER_ID = /^[0-9a-f]{64}$/;

function run(args, label, timeout = 120_000) {
  const result = spawnSync(docker, args, { cwd: contractsRoot, encoding: 'utf8', shell: false, windowsHide: true,
    timeout, maxBuffer: 16 * 1_048_576, stdio: ['ignore', 'pipe', 'inherit'] });
  if (result.error || result.status !== 0) throw new Error(`${label} failed`);
  return String(result.stdout ?? '').trim();
}

try {
  const expected = Buffer.from(await sourceTreeDigest() + '\n');
  const caFile = process.env.STOCKSENSE_BUILD_CA_FILE;
  const caOptions = caFile ? ['--secret', `id=npm_ca,src=${resolve(caFile)}`] : [];
  run(['build', '--platform=linux/amd64', '--file', 'Dockerfile.validator', '--tag', tag,
    ...caOptions, '.'], 'docker build', 12 * 60_000);
  const id = run(['image', 'inspect', tag, '--format', '{{.Id}}'], 'docker image inspect');
  if (!SHA.test(id)) throw new Error('Unexpected image ID');
  if (run(['image', 'inspect', id, '--format', '{{.Architecture}}'], 'image architecture') !== 'amd64') {
    throw new Error('Validator image is not linux/amd64');
  }
  const container = run(['create', '--pull=never', '--network=none', '--read-only',
    '--entrypoint=/nodejs/bin/node', id, '--version'], 'docker create');
  if (!CONTAINER_ID.test(container)) throw new Error('Unexpected container ID');
  let directory;
  let inventory;
  try {
    directory = mkdtempSync(join(tmpdir(), 'stocksense-standards-digest-'));
    const target = join(directory, 'source-digest.txt');
    run(['cp', `${container}:/opt/contracts/source-digest.txt`, target], 'docker cp');
    if (!lstatSync(target).isFile() || !readFileSync(target).equals(expected)) {
      throw new Error('Built image has a different tool-source digest');
    }
    const binary = join(directory, 'node');
    run(['cp', `${container}:/nodejs/bin/node`, binary], 'copy final Node binary');
    if (!lstatSync(binary).isFile() || createHash('sha256').update(readFileSync(binary)).digest('hex') !==
        VALIDATOR_RUNTIME.node) {
      throw new Error('Validator Node binary differs from the verified release');
    }
    // Export an unstarted container and inspect every file without extracting
    // archive paths onto the host or trusting code executed by the candidate.
    const archive = join(directory, 'runtime.tar');
    run(['export', '--output', archive, container], 'export final runtime', 120_000);
    inventory = verifyValidatorRuntimeArchive(readFileSync(archive));
  } finally {
    let localCleanupError;
    try { if (directory) rmSync(directory, { recursive: true, force: true }); }
    catch (error) { localCleanupError = error; }
    run(['rm', '--force', container], 'docker rm');
    if (localCleanupError) throw new Error('Source-digest cleanup failed');
  }
  const version = run(['run', '--rm', '--pull=never', '--network=none', '--read-only',
    '--security-opt=no-new-privileges=true', '--cap-drop=ALL', '--pids-limit=64',
    '--cpus=1',
    '--memory=2147483648', '--memory-swap=2147483648', '--user=65532:65532',
    '--entrypoint=/nodejs/bin/node', id, '--version'], 'runtime smoke');
  if (version !== 'v24.22.3') throw new Error('Validator runtime Node version differs from the pin');
  const evidencePath = resolve(process.env.STOCKSENSE_STANDARDS_RUNTIME_EVIDENCE ??
    join(contractsRoot, 'dist/validator-runtime.json'));
  mkdirSync(dirname(evidencePath), { recursive: true });
  writeFileSync(evidencePath, JSON.stringify({ imageId: id, sourceDigest: expected.toString().trim(),
    nodeVersion: version, ...inventory }, null, 2) + '\n');
  process.stderr.write(`tool sources ${expected.toString().trim()}\n`);
  process.stdout.write(id + '\n');
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
