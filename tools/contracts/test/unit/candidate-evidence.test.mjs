import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { assertCandidateGenerationProfile, assertCandidateRecord, assertLedgerBinding,
  validateBundledCandidate,
  verifyHostedSubject } from '../../src/candidate-provenance.mjs';

const profilePath = fileURLToPath(new URL('../../../../contracts/samples/walking-skeleton/governance/generation-profile.json', import.meta.url));
const profile = JSON.parse(await readFile(profilePath, 'utf8'));
const sha = 'sha256:' + 'a'.repeat(64);
const commit = 'a'.repeat(40);
const identity = 'anton-asnitsky/StockSense/.github/workflows/release-evidence.yml';
const copy = value => JSON.parse(JSON.stringify(value));

function record() {
  return { schema: 'stocksense-candidate-evidence-v1', candidateRevision: commit,
    sourceRevision: commit, manifestDigest: sha, bundleDigest: sha, profileDigest: sha,
    sourceDigests: Object.fromEntries([
      ['web-bff/v1/browser-api.openapi.yaml', sha],
      ['messaging-platform/v1/transport-conformance.asyncapi.yaml', sha],
      ...Array.from({ length: 38 }, (_, index) => [`source-${index}.yaml`, sha])
    ]),
    validation: { resultDigest: sha, manifestDigest: sha,
      validationLevel: 'candidate-canonical-and-fixture-validation',
      canonicalDocuments: 40, fixtureCases: 80, coveredBoundaries: 27 },
    consumers: profile.consumers.map(row => ({ consumerId: row.consumerId, generator: row.generator,
      generatorVersion: row.generatorVersion, sourceDocument: row.sourceDocument,
      configurationDigest: row.configurationDigest, outputs: { ...row.expectedOutputs } })),
    sbomDigest: sha, images: ['validator', 'kiota'].map(name => ({ name, imageId: sha,
      sbomDigest: sha, scanDigest: sha, packages: 1, findings: 0 })),
    ledger: { digest: sha, mainSha: commit, ledgerBlobSha: commit,
      candidateTreeDigest: sha, sourceDigest: sha },
    scans: Object.fromEntries(['secret-scan', 'vulnerability-scan'].map(name =>
      [name, { digest: sha, findings: 0, disposed: 0 }])),
    attestations: {
      ...Object.fromEntries(['bundle', 'sbom'].map(name => [name,
        { identity, sourceCommit: commit, sourceRef: 'refs/heads/main', subjectDigest: sha }])),
      scans: Object.fromEntries(['secret-scan', 'vulnerability-scan'].map(name => [name,
        { identity, sourceCommit: commit, sourceRef: 'refs/heads/main', subjectDigest: sha }]))
    },
    releaseReady: false };
}

test('approved profile pins precisely three generators and 107 output hashes', () => {
  assert.equal(assertCandidateGenerationProfile(profile), profile);
  assert.equal(profile.consumers.reduce((n, row) => n + Object.keys(row.expectedOutputs).length, 0), 107);
});

test('a missing declared consumer or output cannot be credited', () => {
  const missingConsumer = copy(profile);
  missingConsumer.consumers.pop();
  assert.throws(() => assertCandidateGenerationProfile(missingConsumer), { code: 'CANDIDATE_CONSUMERS' });
  const missingOutput = copy(profile);
  delete missingOutput.consumers[1].expectedOutputs[Object.keys(missingOutput.consumers[1].expectedOutputs)[0]];
  assert.throws(() => assertCandidateGenerationProfile(missingOutput), { code: 'CANDIDATE_CONSUMERS' });
});

test('generator and invocation configuration drift are refused', () => {
  const changed = copy(profile);
  changed.consumers[0].configurationDigest = sha;
  assert.throws(() => assertCandidateGenerationProfile(changed), { code: 'CANDIDATE_CONSUMERS' });
  const swapped = copy(profile);
  swapped.consumers[0].generator = 'modelina';
  assert.throws(() => assertCandidateGenerationProfile(swapped), { code: 'CANDIDATE_CONSUMERS' });
});

test('candidate record is complete and cannot claim release readiness', () => {
  assert.equal(assertCandidateRecord(record()).releaseReady, false);
  const released = record(); released.releaseReady = true;
  assert.throws(() => assertCandidateRecord(released), { code: 'CANDIDATE_RECORD' });
});

test('candidate record refuses absent or malformed validation binding', () => {
  const missing = record(); delete missing.validation;
  assert.throws(() => assertCandidateRecord(missing), { code: 'CANDIDATE_RECORD' });
  const mismatch = record(); mismatch.validation.manifestDigest = 'sha256:' + 'b'.repeat(64);
  assert.throws(() => assertCandidateRecord(mismatch), { code: 'CANDIDATE_RECORD' });
  const missingOutcome = record(); delete missingOutcome.validation.resultDigest;
  assert.throws(() => assertCandidateRecord(missingOutcome), { code: 'CANDIDATE_RECORD' });
});

test('validation receipt binds complete outcomes from exact bundled bytes', async () => {
  const bundle = { manifestDigest: sha, files: new Map([
    ['manifest.json', Buffer.from('{"source":"candidate"}')],
    ['nested/source.json', Buffer.from('{"value":1}')]
  ]) };
  const validate = async root => {
    assert.equal((await readFile(join(root, 'nested/source.json'))).toString(), '{"value":1}');
    return { manifestDigest: sha, sourceBinding: 'verified-canonical-package-outside-repository',
      validationLevel: 'candidate-canonical-and-fixture-validation', releaseReady: false,
      uncoveredBoundaries: [], coveredBoundaries: Array.from({ length: 27 }, (_, i) => `C${i + 1}`),
      validatedCanonical: Array.from({ length: 40 }, (_, i) => ({ document: `doc-${i}` })),
      fixtureResults: [{ fixtureId: 'fixture-1', observed: 'pass' }] };
  };
  const first = await validateBundledCandidate(bundle, '.', sha, validate);
  assert.equal(first.canonicalDocuments, 40);
  assert.equal(first.fixtureCases, 1);
  const changed = await validateBundledCandidate(bundle, '.', sha, async root => ({
    ...await validate(root), fixtureResults: [{ fixtureId: 'fixture-1', observed: 'fail' }] }));
  assert.notEqual(changed.resultDigest, first.resultDigest);
  await assert.rejects(validateBundledCandidate(bundle, '.', sha, async root => ({
    ...await validate(root), manifestDigest: 'sha256:' + 'b'.repeat(64) })),
  { code: 'CANDIDATE_VALIDATION' });
});

test('missing scan, changed subject, and missing output fail closed', () => {
  for (const mutate of [
    row => { delete row.scans['vulnerability-scan']; },
    row => { delete row.sourceDigests['web-bff/v1/browser-api.openapi.yaml']; },
    row => { row.attestations.bundle.subjectDigest = 'sha256:' + 'b'.repeat(64); },
    row => { delete row.attestations.scans['secret-scan']; },
    row => { row.attestations.scans['vulnerability-scan'].subjectDigest = 'sha256:' + 'b'.repeat(64); },
    row => { delete row.consumers[1].outputs[Object.keys(row.consumers[1].outputs)[0]]; }
  ]) {
    const row = record(); mutate(row);
    assert.throws(() => assertCandidateRecord(row), { code: 'CANDIDATE_RECORD' });
  }
});

test('protected raw content cannot enter candidate evidence', () => {
  const row = record();
  row.extra = { fullPromptText: 'synthetic forbidden' };
  assert.throws(() => assertCandidateRecord(row), { code: 'CANDIDATE_RECORD' });
  delete row.extra;
  delete row.consumers[0].outputs['browser-api.d.ts'];
  row.consumers[0].outputs['fullPromptText.ts'] = sha;
  assert.throws(() => assertCandidateRecord(row), { code: 'PROTECTED_CONTENT' });
});

test('hosted attestation requires an immutable commit and subject digest before invoking gh', async () => {
  await assert.rejects(verifyHostedSubject('candidate.bundle.json', 'main', sha), { code: 'ATTESTATION_POLICY' });
  await assert.rejects(verifyHostedSubject('candidate.bundle.json', commit, 'mutable'), { code: 'ATTESTATION_POLICY' });
});

test('protected-main receipt binds exact source, tree, image inventories and scans', () => {
  const images = ['validator', 'kiota'].map(name => ({ name, imageId: sha,
    sbomDigest: sha, scanDigest: sha, findings: 1 }));
  const receipt = { schema: 'stocksense-image-ledger-verification-v1',
    candidateRevision: commit, candidateGitTreeSha: commit, candidateTreeDigest: sha,
    sourceDigest: sha, mainSha: commit, ledgerBlobSha: commit,
    images: images.map(row => ({ image: row.name, imageId: row.imageId,
      sbomDigest: row.sbomDigest, scanDigest: row.scanDigest,
      findings: row.findings, disposed: row.findings })) };
  const context = { candidateRevision: commit, treeSha: commit, treeDigest: sha,
    sourceDigest: sha, images };
  assert.equal(assertLedgerBinding(receipt, context), true);
  for (const mutate of [
    row => { row.sourceDigest = 'sha256:' + 'b'.repeat(64); },
    row => { row.candidateGitTreeSha = 'b'.repeat(40); },
    row => { row.candidateTreeDigest = 'sha256:' + 'b'.repeat(64); },
    row => { row.images[0].sbomDigest = 'sha256:' + 'b'.repeat(64); },
    row => { row.images[1].scanDigest = 'sha256:' + 'b'.repeat(64); },
    row => { row.images[0].disposed = 0; }
  ]) {
    const changed = copy(receipt); mutate(changed);
    assert.throws(() => assertLedgerBinding(changed, context), { code: 'IMAGE_LEDGER' });
  }
});
