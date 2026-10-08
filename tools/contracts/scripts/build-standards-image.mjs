import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { sourceTreeDigest } from '../src/source-digest.mjs';

// Build the pinned standards image from this tree and print the exact image ID
// the runner requires. One path for a human and for a hosted job, so the image
// a run was judged by is always the image this tree describes.
//
// The runner refuses an image whose baked-in sources differ from this tree, so
// the build and the verification agree by construction rather than by someone
// remembering to rebuild.

const contractsRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const docker = process.platform === 'win32'
  ? 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe' : '/usr/bin/docker';
const tag = process.env.STOCKSENSE_STANDARDS_TAG ?? 'stocksense-validator:local';

const run = (args, label) => {
  const result = spawnSync(docker, args, { encoding: 'utf8', shell: false, windowsHide: true,
    maxBuffer: 16 * 1_048_576, stdio: ['ignore', 'pipe', 'inherit'] });
  if (result.error || result.status !== 0) {
    process.stderr.write(`${label} failed${result.error ? ': ' + result.error.message : ''}\n`);
    process.exit(1);
  }
  return String(result.stdout ?? '').trim();
};

const expected = await sourceTreeDigest();
run(['build', '--file', 'Dockerfile.validator', '--tag', tag, contractsRoot], 'docker build');
const id = run(['image', 'inspect', tag, '--format', '{{.Id}}'], 'docker image inspect');
if (!/^sha256:[0-9a-f]{64}$/.test(id)) {
  process.stderr.write(`Unexpected image ID: ${id}\n`);
  process.exit(1);
}

// Read the digest back out of the built image rather than trusting the build:
// the point of the check is that the image says what it contains.
const baked = run(['run', '--rm', '--pull=never', '--network=none', '--read-only',
  '--entrypoint=/bin/cat', id, '/opt/contracts/source-digest.txt'], 'source-digest read');
if (baked !== expected) {
  process.stderr.write(`Built image reports ${baked} but this tree is ${expected}\n`);
  process.exit(1);
}

process.stderr.write(`tool sources ${expected}\n`);
process.stdout.write(id + '\n');
