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
  const finding = { findingCode: 'GHSA-1111-2222-3333', ruleId: 'NFR13.2', package: 'sample', severity: 'high' };
  const report = base('vulnerability-scan', { findings: [finding] });
  code(() => check(report), 'SCAN_FINDINGS');
  const exception = { findingCode: finding.findingCode, ruleId: 'NFR13.2', revisionId: hashBytes(Buffer.from(revision)),
    approvedBy: 'owner', reason: 'tracked', expiresAt: '2099-01-01T00:00:00Z' };
  assert.equal(check(report, { exceptions: [exception] }).disposed, 1);
  code(() => check(report, { exceptions: [{ ...exception, expiresAt: '2020-01-01T00:00:00Z' }] }), 'EXCEPTION_EXPIRED');
  code(() => check(report, { exceptions: [{ ...exception, findingCode: '*' }] }), 'SCAN_EXCEPTION');
});

test('scanner output is reduced to findings without sensitive messages', () => {
  assert.deepEqual(scannerFindings('secret-scan', [{ filePath: 'fixture', messages: [
    { ruleId: '@secretlint/rule-preset', line: 3, message: 'secret material' }] }]),
  [{ findingCode: '@secretlint/rule-preset', ruleId: 'NFR13.1', fileDigest: hashBytes(Buffer.from('fixture')), line: 3 }]);
  assert.deepEqual(scannerFindings('vulnerability-scan', { advisories: { '123': {
    github_advisory_id: 'GHSA-1111-2222-3333', module_name: 'example', severity: 'high', title: 'untrusted' } } }),
  [{ findingCode: 'GHSA-1111-2222-3333', ruleId: 'NFR13.2', package: 'example', severity: 'high' }]);
  code(() => scannerFindings('vulnerability-scan', { error: 'offline' }), 'SCAN_FORMAT');
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
