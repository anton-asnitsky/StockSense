import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertPinnedScanner, hashBytes, inputDigest, scannerFindings, toolchainDigest,
  verifyScanReport, verifySecurityReports } from '../../src/ci-policy.mjs';

const revision = 'a'.repeat(40);
const digest = hashBytes(Buffer.from('input'));
const base = (kind, overrides = {}) => ({ schema: 'stocksense-scan-v1', kind, revision,
  inputDigest: digest, toolchainDigest: digest,
  scanner: kind === 'secret-scan' ? 'secretlint@13.0.6' : 'pnpm-audit@11.25.0',
  status: 'passed', findings: [], failure: null, ...overrides });
const check = (report, options = {}) => verifyScanReport(report, {
  kind: report.kind, revision, input: digest, toolchain: digest,
  bytes: Buffer.from(JSON.stringify(report)), ...options
});
const code = (fn, wanted) => assert.throws(fn, error => error.code === wanted);
const affected = (overrides = {}) => ({ findingCode: 'GHSA-1111-2222-3333', ruleId: 'NFR13.2',
  package: '@example/parser', version: '1.2.3', dependencyPath: '.>@example/parser', severity: 'high', ...overrides });
const disposition = (finding = affected(), overrides = {}) => ({
  findingCode: finding.findingCode, ruleId: 'NFR13.2', revisionId: hashBytes(Buffer.from(revision)),
  package: finding.package, version: finding.version, dependencyPath: finding.dependencyPath,
  approvedBy: 'security owner', reason: 'tracked mitigation', compensatingControl: 'isolated parser',
  approvalReference: 'SEC-123', createdAt: '2026-01-01T00:00:00Z',
  expiresAt: '2099-01-01T00:00:00Z', ...overrides
});

test('current clean reports bind revision, toolchain, source and exact bytes', () => {
  const report = base('secret-scan');
  assert.equal(check(report).digest, hashBytes(Buffer.from(JSON.stringify(report))));
  code(() => check(base('secret-scan', { revision: 'b'.repeat(40) })), 'SCAN_STALE');
  code(() => check(base('secret-scan', { toolchainDigest: hashBytes(Buffer.from('other')) })), 'SCAN_STALE');
  code(() => check(base('secret-scan', { inputDigest: hashBytes(Buffer.from('other')) })), 'SCAN_STALE');
});

test('failed scanners and missing scanner identity fail closed', () => {
  code(() => check(base('vulnerability-scan', { status: 'failed' })), 'SCAN_FAILED');
  code(() => check(base('vulnerability-scan', { scanner: 'pnpm-audit@latest' })), 'SCAN_SCANNER');
});

test('secret findings cannot be waived', () => {
  const finding = { findingCode: '@secretlint/rule-preset', ruleId: 'NFR13.1', fileDigest: digest, line: 1 };
  code(() => check(base('secret-scan', { findings: [finding] }), { exceptions: [] }), 'SCAN_SECRET');
  code(() => check(base('secret-scan'), { exceptions: [{ ...finding }] }), 'SCAN_EXCEPTION');
});

test('vulnerability findings require exact live approved exceptions', () => {
  const finding = affected();
  const report = base('vulnerability-scan', { findings: [finding] });
  code(() => check(report), 'SCAN_FINDINGS');
  const exception = disposition(finding);
  assert.equal(check(report, { exceptions: [exception] }).disposed, 1);
  code(() => check(report, { exceptions: [{ ...exception, expiresAt: '2020-01-01T00:00:00Z' }] }), 'EXCEPTION_EXPIRED');
  code(() => check(report, { exceptions: [{ ...exception, findingCode: '*' }] }), 'SCAN_EXCEPTION');
});

test('one advisory exception cannot clear another affected version or dependency path', () => {
  const first = affected();
  const otherVersion = affected({ version: '1.2.4' });
  const otherPath = affected({ dependencyPath: '.>other>@example/parser' });
  const otherPackage = affected({ package: 'other', dependencyPath: '.>other' });
  const report = base('vulnerability-scan', { findings: [first, otherVersion, otherPath, otherPackage] });
  code(() => check(report, { exceptions: [disposition(first)] }), 'SCAN_FINDINGS');
  assert.equal(check(report, { exceptions: [disposition(first), disposition(otherVersion),
    disposition(otherPath), disposition(otherPackage)] }).disposed, 4);
  code(() => check(report, { exceptions: [disposition(first), disposition(first)] }), 'SCAN_EXCEPTION');
  code(() => check(report, { exceptions: [disposition(first, { dependencyPath: '*' })] }), 'SCAN_EXCEPTION');
  code(() => check(report, { exceptions: [disposition(first, { version: '1.2.9' })] }), 'SCAN_EXCEPTION');
});

test('incomplete, ownerless, future and unmatched exceptions fail closed', () => {
  const finding = affected();
  const report = base('vulnerability-scan', { findings: [finding] });
  for (const field of ['package', 'version', 'dependencyPath', 'approvedBy', 'reason',
    'compensatingControl', 'approvalReference', 'createdAt', 'expiresAt']) {
    const exception = disposition(finding);
    delete exception[field];
    code(() => check(report, { exceptions: [exception] }), 'SCAN_EXCEPTION');
  }
  code(() => check(report, { exceptions: [disposition(finding, { approvedBy: ' ' })] }), 'SCAN_EXCEPTION');
  code(() => check(report, { exceptions: [disposition(finding, { approvedBy: '*' })] }), 'SCAN_EXCEPTION');
  code(() => check(report, { exceptions: [disposition(finding, { approvalReference: ' ' })] }), 'SCAN_EXCEPTION');
  code(() => check(report, { exceptions: [disposition(finding, { createdAt: '2098-01-01T00:00:00Z' })],
    now: new Date('2026-10-17T00:00:00Z') }), 'SCAN_EXCEPTION');
  code(() => check(report, { exceptions: [disposition(finding, { createdAt: '2026-01-01' })] }),
    'SCAN_EXCEPTION');
  code(() => check(report, { exceptions: [disposition(finding, {
    createdAt: '2099-02-01T00:00:00Z' })] }), 'SCAN_EXCEPTION');
  code(() => check(report, { exceptions: [disposition(finding, { revisionId: hashBytes(Buffer.from('other')) })] }),
    'SCAN_EXCEPTION');
  code(() => check(base('vulnerability-scan'), { exceptions: [disposition(finding)] }), 'SCAN_EXCEPTION');
});

test('malformed vulnerability identities and duplicate findings cannot receive credit', () => {
  for (const finding of [affected({ version: undefined }), affected({ dependencyPath: undefined }),
    affected({ package: undefined }), affected({ package: '..' }),
    affected({ dependencyPath: '.>..' }), affected({ dependencyPath: '/home/runner/secret' }),
    affected({ findingCode: '123' }),
    affected({ severity: 'unknown' })]) {
    code(() => check(base('vulnerability-scan', { findings: [finding] })), 'SCAN_FORMAT');
  }
  code(() => check(base('vulnerability-scan', { findings: [affected(), affected()] }),
    { exceptions: [disposition()] }), 'SCAN_FORMAT');
});

test('scanner output is reduced to findings without sensitive messages', () => {
  assert.deepEqual(scannerFindings('secret-scan', [{ filePath: 'fixture', messages: [
    { ruleId: '@secretlint/rule-preset', line: 3, message: 'secret material' }] }]),
  [{ findingCode: '@secretlint/rule-preset', ruleId: 'NFR13.1', fileDigest: hashBytes(Buffer.from('fixture')), line: 3 }]);
  assert.deepEqual(scannerFindings('vulnerability-scan', { advisories: { '123': {
    github_advisory_id: 'GHSA-1111-2222-3333', module_name: '@example/parser', severity: 'high',
    title: 'untrusted', findings: [{ version: '1.2.3', paths: ['.>@example/parser', '.>other>@example/parser'] }] } } }),
  [affected(), affected({ dependencyPath: '.>other>@example/parser' })]);
  code(() => scannerFindings('vulnerability-scan', { error: 'offline' }), 'SCAN_FORMAT');
  for (const item of [{ module_name: 'example', severity: 'high', findings: [] },
    { module_name: 'example', severity: 'high', findings: [{ version: '1.2.3', paths: [] }] },
    { module_name: 'example', severity: 'high', findings: [{ version: '1.2.3', paths: ['.>bad\npath'] }] },
    { module_name: 'example', severity: 'high', findings: [{ version: '1.2.3', paths: ['.>..'] }] },
    { module_name: 'example', severity: 'high', findings: [{ version: '1.2.3', paths: ['/home/runner/secret'] }] }]) {
    code(() => scannerFindings('vulnerability-scan', { advisories: { '123': {
      github_advisory_id: 'GHSA-1111-2222-3333', ...item } } }), 'SCAN_FORMAT');
  }
});

test('report reader refuses missing, stale and failed exact report files', async () => {
  const root = fileURLToPath(new URL('../../../../', import.meta.url));
  await assertPinnedScanner(root);
  const [input, toolchain] = await Promise.all([inputDigest(root), toolchainDigest(root)]);
  const directory = await mkdtemp(join(tmpdir(), 'stocksense-scan-gate-'));
  try {
    await assert.rejects(verifySecurityReports(root, revision, directory), error => error.code === 'SCAN_MISSING');
    await writeFile(join(directory, 'secret-scan.json'), JSON.stringify(base('secret-scan', { inputDigest: input, toolchainDigest: toolchain })));
    await writeFile(join(directory, 'vulnerability-scan.json'), JSON.stringify(base('vulnerability-scan', { inputDigest: input, toolchainDigest: toolchain })));
    assert.equal(Object.keys(await verifySecurityReports(root, revision, directory)).length, 2);
    await writeFile(join(directory, 'vulnerability-scan.json'), JSON.stringify(base('vulnerability-scan', { inputDigest: input, toolchainDigest: toolchain, status: 'failed' })));
    await assert.rejects(verifySecurityReports(root, revision, directory), error => error.code === 'SCAN_FAILED');
    await writeFile(join(directory, 'vulnerability-scan.json'), JSON.stringify(base('vulnerability-scan', { inputDigest: digest, toolchainDigest: toolchain })));
    await assert.rejects(verifySecurityReports(root, revision, directory), error => error.code === 'SCAN_STALE');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
