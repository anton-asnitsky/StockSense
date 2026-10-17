import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ContractError } from './package-loader.mjs';
import { applyExceptions, assertException } from './evidence.mjs';

/** @returns {never} */
const fail = (code, message) => { throw new ContractError(code, 'BR6.2', message); };
export const hashBytes = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const HEX = /^sha256:[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const ADVISORY = /^(?:GHSA-[A-Za-z0-9]{4}(?:-[A-Za-z0-9]{4}){2}|CVE-[0-9]{4}-[0-9]{4,})$/;
const COMPONENT = /^(?:@[A-Za-z0-9._~-]+\/)?[A-Za-z0-9._~-]+$/;
const VERSION = /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?$/;
const DEPENDENCY_PATH = /^[A-Za-z0-9@/._+~-]+(?:>[A-Za-z0-9@/._+~-]+)*$/;
const EXCEPTION_FIELDS = new Set(['findingCode', 'ruleId', 'revisionId', 'package', 'version',
  'dependencyPath', 'approvedBy', 'reason', 'compensatingControl', 'approvalReference',
  'createdAt', 'expiresAt']);

const validText = (value, pattern, limit) =>
  typeof value === 'string' && value.length > 0 && value.length <= limit && pattern.test(value);

function exactText(value, pattern, limit, label) {
  if (!validText(value, pattern, limit)) {
    fail('SCAN_FORMAT', `Invalid ${label} in scanner finding`);
  }
  return value;
}

const findingIdentity = finding => [finding.findingCode, finding.ruleId, finding.revisionId,
  finding.package, finding.version, finding.dependencyPath];
const unambiguousComponent = value => value.split('/').every(part => part !== '.' && part !== '..');
const unambiguousPath = value => !value.startsWith('/') && !value.includes('//') &&
  value.split('>').every((part, index) => part.split('/').every(segment => segment !== '..') &&
    (part !== '.' || index === 0));

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
    return Object.values(advisories).flatMap(item => {
      const findingCode = exactText(item?.github_advisory_id, ADVISORY, 32, 'advisory ID');
      const component = exactText(item?.module_name, COMPONENT, 128, 'component');
      if (!unambiguousComponent(component)) fail('SCAN_FORMAT', 'Ambiguous affected component');
      const severity = exactText(item?.severity, /^(?:info|low|moderate|high|critical)$/, 8, 'severity');
      if (!Array.isArray(item?.findings) || item.findings.length === 0) {
        fail('SCAN_FORMAT', 'Advisory has no affected version and dependency path');
      }
      return item.findings.flatMap(affected => {
        const version = exactText(affected?.version, VERSION, 128, 'affected version');
        if (!Array.isArray(affected?.paths) || affected.paths.length === 0) {
          fail('SCAN_FORMAT', 'Affected version has no dependency path');
        }
        return affected.paths.map(path => {
          const dependencyPath = exactText(path, DEPENDENCY_PATH, 1024, 'dependency path');
          if (!unambiguousPath(dependencyPath)) fail('SCAN_FORMAT', 'Ambiguous dependency path');
          return { findingCode, ruleId: 'NFR13.2', package: component, version, dependencyPath, severity };
        });
      });
    });
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
  if (kind === 'secret-scan' && report.findings.length) fail('SCAN_SECRET', 'A secret finding cannot be waived');
  if (kind === 'secret-scan') {
    if (!Array.isArray(exceptions) || exceptions.some(item => item?.ruleId === 'NFR13.1')) {
      fail('SCAN_EXCEPTION', 'A secret scan cannot carry an exception');
    }
    return { digest: hashBytes(bytes), findings: 0, disposed: 0 };
  }
  if (!Array.isArray(exceptions)) fail('SCAN_EXCEPTION', 'Exceptions must be a list');
  const revisionId = hashBytes(Buffer.from(revision));
  const findings = report.findings.map(finding => {
    if (!finding || finding.ruleId !== 'NFR13.2' ||
        !validText(finding.findingCode, ADVISORY, 32) ||
        !validText(finding.package, COMPONENT, 128) || !unambiguousComponent(finding.package) ||
        !validText(finding.version, VERSION, 128) ||
        !validText(finding.dependencyPath, DEPENDENCY_PATH, 1024) ||
        !unambiguousPath(finding.dependencyPath) ||
        !validText(finding.severity, /^(?:info|low|moderate|high|critical)$/, 8)) {
      fail('SCAN_FORMAT', 'Vulnerability report has an incomplete or ambiguous finding');
    }
    return { ...finding, revisionId };
  });
  const findingById = new Map();
  for (const finding of findings) {
    const identity = JSON.stringify(findingIdentity(finding));
    if (findingById.has(identity)) fail('SCAN_FORMAT', 'Duplicate vulnerability finding');
    findingById.set(identity, finding);
  }
  const exceptionById = new Map();
  for (const exception of exceptions) {
    if (!exception || typeof exception !== 'object' || Array.isArray(exception) ||
        Object.keys(exception).some(key => !EXCEPTION_FIELDS.has(key)) ||
        EXCEPTION_FIELDS.size !== Object.keys(exception).length ||
        exception.ruleId !== 'NFR13.2' || !validText(exception.findingCode, ADVISORY, 32) ||
        !validText(exception.package, COMPONENT, 128) || !unambiguousComponent(exception.package) ||
        !validText(exception.version, VERSION, 128) ||
        !validText(exception.dependencyPath, DEPENDENCY_PATH, 1024) ||
        !unambiguousPath(exception.dependencyPath)) {
      fail('SCAN_EXCEPTION', 'Exception must identify one advisory, component, version and path');
    }
    assertException(exception, now);
    for (const field of ['approvedBy', 'reason', 'compensatingControl', 'approvalReference']) {
      if (typeof exception[field] !== 'string' || !exception[field].trim() ||
          exception[field].trim() === '*' || exception[field].length > 512 ||
          /[\x00-\x1f\x7f]/.test(exception[field])) {
        fail('SCAN_EXCEPTION', `Exception lacks a safe ${field}`);
      }
    }
    if (typeof exception.createdAt !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(exception.createdAt)) {
      fail('SCAN_EXCEPTION', 'Exception creation time must be UTC');
    }
    const created = new Date(exception.createdAt);
    const expiry = new Date(exception.expiresAt);
    if (!Number.isFinite(created.getTime()) ||
        created.getTime() > now.getTime() || created.getTime() >= expiry.getTime()) {
      fail('SCAN_EXCEPTION', 'Exception creation time is invalid or later than expiry');
    }
    const identity = JSON.stringify(findingIdentity(exception));
    if (!findingById.has(identity) || exceptionById.has(identity)) {
      fail('SCAN_EXCEPTION', 'Exception is unmatched or duplicates another disposition');
    }
    exceptionById.set(identity, exception);
  }
  // The shared matcher keys only advisory/rule/revision. Supply it one finding
  // and at most one already scope-matched exception so it cannot clear a peer.
  const remaining = findings.filter(finding => {
    const identity = JSON.stringify(findingIdentity(finding));
    const exception = exceptionById.get(identity);
    return applyExceptions([finding], exception ? [exception] : [], now).length > 0;
  });
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
