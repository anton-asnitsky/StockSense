import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { verifyKiotaPackageImage } from '../src/bounded-generators.mjs';

const contractsRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const docker = process.platform === 'win32'
  ? 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe' : '/usr/bin/docker';
const tag = process.env.STOCKSENSE_KIOTA_TAG ?? 'stocksense-kiota:1.35.0';
const run = (args, label) => {
  const result = spawnSync(docker, args, { encoding: 'utf8', shell: false, windowsHide: true,
    maxBuffer: 16 * 1_048_576, stdio: ['ignore', 'pipe', 'inherit'] });
  if (result.error || result.status !== 0) {
    process.stderr.write(`${label} failed${result.error ? ': ' + result.error.message : ''}\n`);
    process.exit(1);
  }
  return String(result.stdout ?? '').trim();
};

run(['build', '--file', 'Dockerfile.generator-kiota', '--tag', tag, contractsRoot], 'Kiota image build');
const id = run(['image', 'inspect', tag, '--format', '{{.Id}}'], 'Kiota image inspect');
if (!/^sha256:[0-9a-f]{64}$/.test(id)) {
  process.stderr.write('Kiota build did not yield an immutable image ID\n');
  process.exit(1);
}
const version = run(['run', '--rm', '--pull=never', '--network=none', '--read-only',
  '--entrypoint=/opt/kiota/kiota', id, '--version'], 'Kiota version check');
if (!/^1\.35\.0(?:\+[^\r\n]+)?$/.test(version)) {
  process.stderr.write('Kiota image does not contain the approved 1.35.0 tool\n');
  process.exit(1);
}
try { verifyKiotaPackageImage(id); }
catch (error) {
  process.stderr.write(`Kiota package digest check failed: ${error.message}\n`);
  process.exit(1);
}
process.stderr.write(`Kiota ${version}\n`);
process.stdout.write(id + '\n');
