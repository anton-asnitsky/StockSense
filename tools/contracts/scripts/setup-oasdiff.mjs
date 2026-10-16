import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const version = '1.28.0';
const assets = {
  'win32-x64': ['windows_amd64', 'cef8ec7cdd32ab4ce9c188f9dbb50452a91fa36cc11c8e1dcf340b19282c3ce1'],
  'win32-arm64': ['windows_arm64', 'e097cf94eb1d4cf05b08569f724923d5f0c79c22770faca0f359ec4ac789e77e'],
  'linux-x64': ['linux_amd64', 'e0ef076f2cf953d922addc04be9c3851cf3ec18f7678d2b94d44cea23dca51b5'],
  'linux-arm64': ['linux_arm64', 'cb15a381472321ac602cc252e65018d03feba7e6449a0854e1181680444d4051'],
  'darwin-x64': ['darwin_all', 'ff76474bf47bfb806d1711aa3e962b8e55570badcd462fa487b80aa532a823db'],
  'darwin-arm64': ['darwin_all', 'ff76474bf47bfb806d1711aa3e962b8e55570badcd462fa487b80aa532a823db']
};

const selection = assets[`${process.platform}-${process.arch}`];
if (!selection) throw new Error('oasdiff has no approved asset pin for this platform');

const [suffix, expectedHash] = selection;
const archiveName = `oasdiff_${version}_${suffix}.tar.gz`;
const binaryName = process.platform === 'win32' ? 'oasdiff.exe' : 'oasdiff';
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const outputDir = join(repoRoot, '.tools', 'oasdiff', version, `${process.platform}-${process.arch}`);
const output = join(outputDir, binaryName);
const scratch = await mkdtemp(join(tmpdir(), 'stocksense-oasdiff-'));
try {
  const url = `https://github.com/oasdiff/oasdiff/releases/download/v${version}/${archiveName}`;
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`oasdiff download failed with HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 100 * 1024 * 1024) throw new Error('oasdiff archive exceeds the setup limit');
  const actualHash = createHash('sha256').update(bytes).digest('hex');
  if (actualHash !== expectedHash) throw new Error('oasdiff archive checksum mismatch');
  const archive = join(scratch, archiveName);
  await writeFile(archive, bytes);
  const extracted = spawnSync('tar', ['-xzf', archive, '-C', scratch], { stdio: 'inherit' });
  if (extracted.error || extracted.status !== 0) throw new Error('oasdiff archive extraction failed');
  const binary = join(scratch, binaryName);
  const result = spawnSync(binary, ['-v'], { encoding: 'utf8' });
  if (result.error || result.status !== 0 || !result.stdout.includes(`oasdiff version ${version}`)) {
    throw new Error('oasdiff executable did not report the pinned version');
  }
  await mkdir(outputDir, { recursive: true });
  await copyFile(binary, output);
  if (process.platform !== 'win32') await chmod(output, 0o755);
  // A copied executable's bytes are checked again before reporting success.
  const copied = await readFile(output);
  const binaryHash = createHash('sha256').update(copied).digest('hex');
  console.log(`${basename(output)} ${version} at ${output} (sha256:${binaryHash})`);
} finally {
  const tempRoot = resolve(tmpdir());
  if (!resolve(scratch).startsWith(tempRoot + sep)) throw new Error('Unsafe temporary cleanup path');
  await rm(scratch, { recursive: true, force: true });
}
