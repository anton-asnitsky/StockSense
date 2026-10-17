import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertPinnedScanner, hashBytes, inputDigest, scannerFindings, sourcePaths, toolchainDigest,
  verifySecurityReports } from '../src/ci-policy.mjs';

const root = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const [command, directoryArg] = process.argv.slice(2);
const directory = resolve(directoryArg ?? 'tools/contracts/dist/security-reports');
const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
const revision = git.status === 0 ? git.stdout.trim() : '';
if (!/^[0-9a-f]{40}$/.test(revision)) throw new Error('Immutable revision unavailable');

if (command === 'verify') {
  const exceptionsPath = process.env.STOCKSENSE_SCAN_EXCEPTIONS;
  const exceptions = exceptionsPath ? JSON.parse(await readFile(exceptionsPath, 'utf8')) : [];
  const reports = await verifySecurityReports(root, revision, directory, exceptions);
  for (const [kind, value] of Object.entries(reports)) process.stdout.write(`${kind}: ${value.digest}\n`);
} else if (['secret-scan', 'vulnerability-scan'].includes(command)) {
  await mkdir(directory, { recursive: true });
  /** @type {any} */
  const report = {
    schema: 'stocksense-scan-v1', kind: command, revision, inputDigest: null,
    toolchainDigest: null,
    scanner: command === 'secret-scan' ? 'secretlint@13.0.6' : 'pnpm-audit@11.25.0',
    status: 'failed', findings: [], failure: 'scanner could not complete'
  };
  try {
    await assertPinnedScanner(root);
    const paths = sourcePaths(root);
    [report.inputDigest, report.toolchainDigest] = await Promise.all([
      inputDigest(root, paths), toolchainDigest(root)]);
    const executable = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
    const args = command === 'secret-scan'
      ? ['--dir', 'tools/contracts', 'exec', 'secretlint', '--format', 'json', ...paths.map(path => resolve(root, path))]
      : ['--dir', 'tools/contracts', 'audit', '--json', '--audit-level', 'moderate'];
    const run = spawnSync(executable, args, { cwd: root, encoding: 'utf8', timeout: 180_000,
      maxBuffer: 16 * 1024 * 1024, windowsHide: true });
    report.findings = scannerFindings(command, JSON.parse(run.stdout));
    if (run.status === 0 || command === 'vulnerability-scan' && run.status === 1 && report.findings.length > 0) {
      report.status = 'passed';
      report.failure = null;
    } else report.failure = 'scanner returned a nonzero status';
  } catch { /* The retained report says failed without exposing scanner output. */ }
  const bytes = Buffer.from(JSON.stringify(report, null, 2) + '\n');
  await writeFile(resolve(directory, `${command}.json`), bytes, { flag: 'w' });
  process.stdout.write(`${command}: ${report.status} ${hashBytes(bytes)} (${report.findings.length} findings)\n`);
} else {
  throw new Error('Usage: security-reports.mjs <secret-scan|vulnerability-scan|verify> [report-dir]');
}
