import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyExceptions, assertCheckResult, assertCiPolicy, assertEvidenceContentSafe, assertException,
  assertScanGates, buildEvidenceRecord, C19_OUTCOMES, REQUIRED_GATES, verifyAttestation, verifyReceipt
} from '../../src/evidence.mjs';

const expectCode = (fn, code) => assert.throws(fn, error => error.code === code);
const sha = char => {
  if (!/^[0-9a-f]$/.test(char)) throw new Error('digest fill must be a hex character');
  return 'sha256:' + char.repeat(64);
};
const commit = 'b'.repeat(40);

const detail = (overrides = {}) => ({
  outcome: 'passed', reason: 'ran', expectedResult: 'clean', actualResult: 'clean',
  startedAt: '2026-09-29T10:00:00Z', completedAt: '2026-09-29T10:01:00Z', limitations: [], ...overrides
});
const gates = (overrides = {}) => Object.fromEntries(
  REQUIRED_GATES.map(name => [name, detail({ reportDigest: sha('c') })]).concat(Object.entries(overrides))
);
const record = (overrides = {}) => buildEvidenceRecord({
  revision: commit, packageDigest: sha('a'),
  checks: [detail({ checkId: 'canonical-validation' })], gates: gates(), ...overrides
});

test('BR6.1: the six C19 outcomes are exhaustive and details stay required', () => {
  assert.deepEqual(C19_OUTCOMES, ['passed', 'failed', 'limited', 'rejected', 'unavailable', 'not-run']);
  for (const outcome of C19_OUTCOMES) assert.equal(assertCheckResult(detail({ checkId: 'c', outcome })), true);
  expectCode(() => assertCheckResult(detail({ checkId: 'c', outcome: 'skipped' })), 'CHECK_OUTCOME');
  // A not-run check still has to say what prevented it.
  expectCode(() => assertCheckResult({ ...detail({ checkId: 'c', outcome: 'not-run' }), reason: '' }), 'CHECK_DETAIL');
});

test('BR6.2: a missing scan gate is reported, never assumed clean', () => {
  const missing = gates();
  delete missing.sbom;
  expectCode(() => assertScanGates(missing), 'SCAN_MISSING');
  // A gate may be unavailable, but it may not claim a pass with no report.
  expectCode(() => assertScanGates(gates({ 'secret-scan': detail() })), 'SCAN_REPORT_DIGEST');
  const unavailable = assertScanGates(gates({ sbom: detail({ outcome: 'unavailable', reason: 'no SBOM tool pinned' }) }));
  assert.deepEqual(unavailable.find(row => row.gate === 'sbom'), { gate: 'sbom', outcome: 'unavailable' });
});

test('BR6.3: an expired or blanket exception does not suspend a finding', () => {
  const now = new Date('2026-09-29T00:00:00Z');
  const base = { findingCode: 'SCHEMA_REQUIRED', ruleId: 'BR2.4', revisionId: sha('b'), approvedBy: 'owner', reason: 'tracked', expiresAt: '2026-12-31T00:00:00Z' };
  assert.equal(assertException(base, now), true);
  expectCode(() => assertException({ ...base, expiresAt: '2026-01-01T00:00:00Z' }, now), 'EXCEPTION_EXPIRED');
  expectCode(() => assertException({ ...base, findingCode: '' }, now), 'EXCEPTION_SHAPE');
  expectCode(() => assertException({ ...base, expiresAt: 'whenever' }, now), 'EXCEPTION_EXPIRY');
});

test('BR6.3: an exception suspends only the exact finding it names', () => {
  const now = new Date('2026-09-29T00:00:00Z');
  const finding = { findingCode: 'SCHEMA_REQUIRED', ruleId: 'BR2.4', revisionId: sha('b') };
  const other = { findingCode: 'SCHEMA_REQUIRED', ruleId: 'BR2.4', revisionId: sha('e') };
  const exception = { ...finding, approvedBy: 'owner', reason: 'tracked', expiresAt: '2026-12-31T00:00:00Z' };
  assert.deepEqual(applyExceptions([finding, other], [exception], now), [other]);
});

test('BR6.1-BR6.4: evidence binds an immutable revision, package digest and resolvable artifacts', () => {
  const built = record();
  assert.equal(built.record.revision, commit);
  assert.equal(built.record.releaseReady, false);
  expectCode(() => record({ revision: 'main' }), 'EVIDENCE_REVISION');
  expectCode(() => record({ packageDigest: 'nope' }), 'EVIDENCE_PACKAGE_DIGEST');
  expectCode(
    () => record({ checks: [{ ...detail({ checkId: 'c' }), artifactIds: ['absent'] }] }),
    'EVIDENCE_ARTIFACT_UNRESOLVED'
  );
});

test('BR6.5: a detached receipt fails on any digest or binding mismatch', () => {
  const { record: built, receipt } = record();
  assert.equal(verifyReceipt(built, receipt), true);
  expectCode(() => verifyReceipt({ ...built, limitations: ['edited'] }, receipt), 'RECEIPT_DIGEST_MISMATCH');
  // Re-pointing the receipt leaves the record digest intact, so it is a binding failure.
  expectCode(() => verifyReceipt(built, { ...receipt, revision: 'c'.repeat(40) }), 'RECEIPT_BINDING');
  assert.throws(() => verifyReceipt({ ...built, fullPrompt: 'synthetic:blocked' }, receipt),
    error => error.code === 'PROTECTED_CONTENT' && error.ruleId === 'NFR6.1');
});

test('BR6.6: a forged attestation subject or untrusted identity is rejected', () => {
  const attestation = { subjectDigest: sha('a'), identity: 'https://github.com/anton-asnitsky/StockSense/.github/workflows/release.yml@refs/heads/main' };
  assert.equal(verifyAttestation(attestation, { subjectDigest: sha('a'), expectedIdentities: [attestation.identity] }), true);
  expectCode(() => verifyAttestation({ ...attestation, subjectDigest: sha('d') }, { subjectDigest: sha('a'), expectedIdentities: [attestation.identity] }), 'ATTESTATION_SUBJECT_MISMATCH');
  expectCode(() => verifyAttestation(attestation, { subjectDigest: sha('a'), expectedIdentities: ['https://example.invalid/other'] }), 'ATTESTATION_IDENTITY');
  expectCode(() => verifyAttestation(attestation, { subjectDigest: sha('a'), expectedIdentities: [] }), 'ATTESTATION_POLICY');
});

test('BR6.4: published evidence may not leak protected content', () => {
  const clean = record();
  assert.equal(assertEvidenceContentSafe(clean.record), true);
  for (const actualResult of ['authorization=abcdef0123456789abcd', 'password="!"', 'client_secret="!"', 'fullPrompt', 'supplierSourceContent']) {
    assert.throws(() => record({ checks: [detail({ checkId: 'c', actualResult })] }),
      error => error.code === 'PROTECTED_CONTENT' && error.ruleId === 'NFR6.1');
  }
});

test('BR6.4: nested evidence fields, filenames and scan diagnostics fail before receipt construction', () => {
  for (const overrides of [
    { checks: [detail({ checkId: 'c', diagnostics: { fullPrompt: 'synthetic:blocked' } })] },
    { gates: gates({ sbom: detail({ reportDigest: sha('c'), actualResult: { supplierSourceContent: 'synthetic:blocked' } }) }) },
    { artifacts: [{ artifactId: 'reports/fullPrompt.json', contentDigest: sha('d') }] },
    { limitations: ['reports/client_secret.txt'] }
  ]) {
    assert.throws(() => record(overrides),
      error => error.code === 'PROTECTED_CONTENT' && error.ruleId === 'NFR6.1');
  }
});

test('NFR6.1: protected field variants are rejected before an evidence digest exists', () => {
  for (const input of [
    { checks: [detail({ checkId: 'c', fullPromptText: 'synthetic:blocked' })] },
    { gates: gates({ sbom: detail({ reportDigest: sha('c'), supplierSourceContentText: 'synthetic:blocked' }) }) },
    { artifacts: [{ artifactId: 'safe', contentDigest: sha('d'), clientSecretValue: 'synthetic:blocked' }] }
  ]) {
    assert.throws(() => record(input), error => error.code === 'PROTECTED_CONTENT' && error.ruleId === 'NFR6.1');
  }
});

test('BR6.1: evidence rejects undeclared fields instead of silently dropping them', () => {
  assert.throws(() => record({ diagnosticBlob: 'synthetic:arbitrary' }),
    error => error.code === 'EVIDENCE_FIELD' && error.ruleId === 'BR6.1');
  assert.throws(() => record({ checks: [detail({ checkId: 'c', arbitrary: 'synthetic:arbitrary' })] }),
    error => error.code === 'EVIDENCE_FIELD' && error.ruleId === 'BR6.1');
  const built = record();
  assert.throws(() => verifyReceipt({ ...built.record, unknown: 'synthetic:arbitrary' }, built.receipt),
    error => error.code === 'EVIDENCE_FIELD' && error.ruleId === 'BR6.1');
  assert.throws(() => record({ gates: { ...gates(), extraScan: detail({ reportDigest: sha('c') }) } }),
    error => error.code === 'EVIDENCE_FIELD' && error.ruleId === 'BR6.1');
  assert.throws(() => verifyReceipt({ ...built.record, gates: [{ gate: 'sbom', outcome: 'unknown' }] }, built.receipt),
    error => error.code === 'EVIDENCE_FIELD' && error.ruleId === 'BR6.1');
});

test('BR6.1: nested limitations cannot smuggle unlisted objects into a signed receipt', () => {
  assert.throws(() => record({ checks: [detail({ checkId: 'c', limitations: [{ arbitrary: 'accepted' }] })] }),
    error => error.code === 'EVIDENCE_FIELD' && error.ruleId === 'BR6.1');
  assert.throws(() => record({ gates: gates({ sbom: detail({ reportDigest: sha('c'), limitations: [{ arbitrary: 'accepted' }] }) }) }),
    error => error.code === 'EVIDENCE_FIELD' && error.ruleId === 'BR6.1');
  const built = record();
  assert.throws(() => verifyReceipt({ ...built.record,
    checks: [detail({ checkId: 'c', limitations: [{ arbitrary: 'accepted' }] })] }, built.receipt),
  error => error.code === 'EVIDENCE_FIELD' && error.ruleId === 'BR6.1');
});

test('BR6.1: caller-controlled check ids cannot inject diagnostic lines', () => {
  const checkId = 'check\n::error::injected';
  assert.throws(() => record({ checks: [detail({ checkId, reason: '' })] }),
    error => error.code === 'CHECK_OUTCOME' && error.ruleId === 'BR6.1' && !error.message.includes('::error::'));
  assert.throws(() => assertCheckResult(detail({ checkId: 'safe', reason: '' })),
    error => error.code === 'CHECK_DETAIL' && error.ruleId === 'BR6.1' && !error.message.includes('safe'));
});

test('BR6.7: an untrusted public-PR workflow is rejected on trigger, runner and permissions', () => {
  const safe = {
    on: { pull_request: {} },
    jobs: { verify: { 'runs-on': 'ubuntu-24.04', permissions: { contents: 'read' }, steps: [{ uses: 'actions/checkout@' + 'a'.repeat(40) }] } }
  };
  assert.equal(assertCiPolicy(safe), true);
  expectCode(() => assertCiPolicy({ ...safe, on: { pull_request_target: {} } }), 'CI_UNTRUSTED_TRIGGER');
  expectCode(() => assertCiPolicy({ ...safe, jobs: { verify: { ...safe.jobs.verify, 'runs-on': ['self-hosted', 'linux'] } } }), 'CI_UNTRUSTED_RUNNER');
  expectCode(() => assertCiPolicy({ ...safe, jobs: { verify: { ...safe.jobs.verify, permissions: { contents: 'write' } } } }), 'CI_EXCESSIVE_PERMISSIONS');
  expectCode(() => assertCiPolicy({ ...safe, jobs: { verify: { ...safe.jobs.verify, permissions: undefined } } }), 'CI_PERMISSIONS_UNSET');
  expectCode(() => assertCiPolicy({ ...safe, jobs: { verify: { ...safe.jobs.verify, steps: [{ uses: 'actions/checkout@v4' }] } } }), 'CI_UNPINNED_ACTION');
});

test('BR6.7: a pull request changing workflow configuration cannot credit itself', () => {
  const safe = { on: { pull_request: {} }, jobs: { verify: { 'runs-on': 'ubuntu-24.04', permissions: { contents: 'read' }, steps: [] } } };
  assert.equal(assertCiPolicy(safe, { changedPaths: ['tools/contracts/src/policy.mjs'] }), true);
  expectCode(() => assertCiPolicy(safe, { changedPaths: ['.github/workflows/contracts.yml'] }), 'CI_WORKFLOW_CHANGE');
});
