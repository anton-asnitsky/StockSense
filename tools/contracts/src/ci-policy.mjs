import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ContractError } from './package-loader.mjs';
import { applyExceptions } from './evidence.mjs';

/** @returns {never} */
const fail = (code, message) => { throw new ContractError(code, 'BR6.2', message); };
export const hashBytes = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const HEX = /^sha256:[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;

export function sourcePaths(root) {
  const run = spawnSync('git', ['ls-files', '-z', '--', 'tools/contracts', 'contracts', '.github'],
    { cwd: root, encoding: 'utf8' });
  if (run.status !== 0 || !run.stdout) fail('SCAN_INPUT', 'Tracked scan input inventory is unavailable');
  return run.stdout.split('\0').filter(Boolean).sort();
}

export async function inputDigest(root, paths = sourcePaths(root)) {
  const hash = createHash('sha256');
  for (const path of paths) {
    const bytes = await readFile(resolve(root, path));
    hash.update(path).update('\0').update(String(bytes.length)).update('\0').update(bytes);
  }
  return `sha256:${hash.digest('hex')}`;
}

export async function toolchainDigest(root) {
  const paths = ['tools/contracts/package.json', 'tools/contracts/pnpm-lock.yaml',
    'tools/contracts/Dockerfile.validator', 'tools/contracts/Dockerfile.generator-kiota',
    'tools/contracts/scripts/setup-oasdiff.mjs', '.github/workflows/contracts-required.yml',
    '.github/workflows/release-evidence.yml'];
  return inputDigest(root, paths);
}

export async function assertPinnedScanner(root) {
  const manifest = JSON.parse(await readFile(resolve(root, 'tools/contracts/package.json'), 'utf8'));
  if (manifest.packageManager !== 'pnpm@11.25.0' || manifest.engines?.node !== '24.19.0' ||
      manifest.devDependencies?.secretlint !== '13.0.6') {
    fail('SCAN_SCANNER', 'Scanner, package manager or Node pin has changed');
  }
}

export function scannerFindings(kind, parsed) {
  if (kind === 'secret-scan') {
    if (!Array.isArray(parsed)) fail('SCAN_FORMAT', 'Secret scan did not return a JSON result array');
    return parsed.flatMap(file => (file.messages ?? []).map(message => ({
      findingCode: String(message.ruleId ?? 'SECRET').replace(/[^A-Za-z0-9_.@/-]/g, '').slice(0, 128),
      ruleId: 'NFR13.1', fileDigest: hashBytes(Buffer.from(String(file.filePath ?? ''))),
      line: Number(message.line ?? message.loc?.start?.line ?? 0)
    })));
  }
  if (kind === 'vulnerability-scan') {
    const advisories = parsed?.advisories;
    if (!advisories || typeof advisories !== 'object' || Array.isArray(advisories)) {
      fail('SCAN_FORMAT', 'Vulnerability scan did not return an advisory map');
    }
    return Object.entries(advisories).map(([id, item]) => ({
      findingCode: String(item?.github_advisory_id ?? item?.cves?.[0] ?? id).replace(/[^A-Za-z0-9-]/g, '').slice(0, 128),
      ruleId: 'NFR13.2', package: String(item?.module_name ?? '').replace(/[^A-Za-z0-9@/._-]/g, '').slice(0, 128),
      severity: String(item?.severity ?? '').replace(/[^a-z]/g, '').slice(0, 32)
    }));
  }
  fail('SCAN_KIND', 'Unknown scan kind');
}

/** @param {any} report
 * @param {{kind: string, revision: string, input: string, toolchain: string, bytes: Buffer, exceptions?: any[], now?: Date}} options */
export function verifyScanReport(report, { kind, revision, input, toolchain, bytes, exceptions = [], now = new Date() }) {
  if (!report || report.schema !== 'stocksense-scan-v1' || report.kind !== kind ||
      report.revision !== revision || !COMMIT.test(revision) || report.inputDigest !== input ||
      report.toolchainDigest !== toolchain || !HEX.test(String(input)) || !HEX.test(String(toolchain)) ||
      !Array.isArray(report.findings) || !['passed', 'failed'].includes(report.status)) {
    fail('SCAN_STALE', 'Scan report is missing, malformed or bound to another revision/toolchain');
  }
  if (!report.scanner || typeof report.scanner !== 'string') fail('SCAN_SCANNER', 'Scanner identity is missing');
  if (kind === 'secret-scan' && report.scanner !== 'secretlint@13.0.6' ||
      kind === 'vulnerability-scan' && report.scanner !== 'pnpm-audit@11.25.0') {
    fail('SCAN_SCANNER', 'Scanner identity differs from the pinned version');
  }
  if (report.status !== 'passed') fail('SCAN_FAILED', 'The current scan failed');
  if (exceptions.some(exception =>
    exception.ruleId !== 'NFR13.2' || !/^(GHSA-|CVE-)/.test(exception.findingCode))) {
    fail('SCAN_EXCEPTION', 'Only specific vulnerability advisories can carry exceptions');
  }
  if (kind === 'secret-scan' && report.findings.length) fail('SCAN_SECRET', 'A secret finding cannot be waived');
  const revisionId = hashBytes(Buffer.from(revision));
  const findings = report.findings.map(finding => ({ ...finding, revisionId }));
  const remaining = applyExceptions(findings, exceptions, now);
  if (remaining.length) fail('SCAN_FINDINGS', 'Current vulnerability findings lack a permitted disposition');
  return { digest: hashBytes(bytes), findings: findings.length, disposed: findings.length - remaining.length };
}

export async function verifySecurityReports(root, revision, directory, exceptions = []) {
  const [input, toolchain] = await Promise.all([inputDigest(root), toolchainDigest(root)]);
  /** @type {Record<string, {digest: string, findings: number, disposed: number}>} */
  const reports = {};
  for (const kind of ['secret-scan', 'vulnerability-scan']) {
    let bytes;
    try { bytes = await readFile(resolve(directory, `${kind}.json`)); }
    catch { fail('SCAN_MISSING', `Required ${kind} report is missing`); }
    let parsed;
    try { parsed = JSON.parse(bytes.toString('utf8')); }
    catch { fail('SCAN_FORMAT', `Required ${kind} report is invalid JSON`); }
    reports[kind] = verifyScanReport(parsed, { kind, revision, input, toolchain, bytes, exceptions });
  }
  return reports;
}
