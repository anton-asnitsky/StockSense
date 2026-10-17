import assert from 'node:assert/strict';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { buildPackageBundle, verifyPackageBundle } from '../../src/package-bundle.mjs';
import { buildCandidateEvidence, validateCandidateScan,
  verifyCandidateEvidence } from '../../src/candidate-provenance.mjs';
import { generatorConfigurationDigest, GENERATORS } from '../../src/generators.mjs';
import { canonicalJson, digest } from '../../src/package-loader.mjs';
import { makePackage } from '../support/package-fixture.mjs';
import { dirname, join } from 'node:path';

const scan = report => ({ status: 'passed', report: JSON.stringify(report),
  digest: digest(Buffer.from(JSON.stringify(report))) });
const rejects = (action, code) => assert.throws(action,
  error => error.code === code && typeof error.ruleId === 'string');

test('candidate scan records bind exact machine-readable report bytes', () => {
  const secret = scan([{ filePath: 'synthetic.txt', messages: [] }]);
  const vulnerability = scan({ advisories: {}, metadata: { vulnerabilities: {
    info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0
  } } });
  validateCandidateScan('secret', secret);
  validateCandidateScan('vulnerability', vulnerability);
  rejects(() => validateCandidateScan('secret', { ...secret, digest: digest('old') }), 'SCAN_EVIDENCE_MISSING');
  rejects(() => validateCandidateScan('vulnerability', { ...vulnerability, report: '{}' }), 'SCAN_EVIDENCE_MISSING');
});

test('missing, failed and finding-bearing scan evidence is never credited', () => {
  rejects(() => validateCandidateScan('secret', undefined), 'SCAN_EVIDENCE_MISSING');
  rejects(() => validateCandidateScan('secret', { ...scan([]), status: 'not-run' }), 'SCAN_EVIDENCE_MISSING');
  rejects(() => validateCandidateScan('secret', scan([{ messages: [{ ruleId: 'synthetic' }] }])),
    'SCAN_FINDINGS');
  rejects(() => validateCandidateScan('vulnerability', scan({ advisories: { synthetic: {} },
    metadata: { vulnerabilities: { high: 1 } } })), 'SCAN_FINDINGS');
  rejects(() => validateCandidateScan('vulnerability', scan({ audit: 'green' })), 'SCAN_FINDINGS');
  rejects(() => validateCandidateScan('secret', scan({ conclusion: 'success' })), 'SCAN_FINDINGS');
});

test('portable bundle carries candidate evidence inside the attested subject bytes', async () => {
  const fixture = await makePackage();
  try {
    const bytes = await buildPackageBundle(fixture.root, { candidateEvidence: {
      format: 'synthetic-only', releaseReady: false
    } });
    const verified = verifyPackageBundle(bytes, { expectedDigest: digest(bytes) });
    assert.equal(verified.candidateEvidence.format, 'synthetic-only');
    assert.equal(verified.artifactDigest, digest(bytes));
    const changed = Buffer.from(bytes.toString().replace('synthetic-only', 'changed-local'));
    rejects(() => verifyPackageBundle(changed, { expectedDigest: digest(bytes) }),
      'BUNDLE_DIGEST_MISMATCH');
  } finally { await rm(fixture.root, { recursive: true, force: true }); }
});

test('clean consumer refuses legacy, missing and wrong-commit evidence', async () => {
  const base = { manifestDigest: digest('manifest'), files: new Map() };
  await assert.rejects(verifyCandidateEvidence(base, { repoRoot: '.',
    sourceCommit: 'a'.repeat(40) }), error => error.code === 'CANDIDATE_EVIDENCE_MISSING');
  await assert.rejects(verifyCandidateEvidence({ ...base, candidateEvidence: {
    format: 'stocksense-candidate-evidence-v1', releaseReady: false,
    sourceCommit: 'b'.repeat(40), manifestDigest: digest('manifest'),
    profileDigest: digest('profile'), validationDigest: digest('validation'),
    consumers: [], sources: {}, tools: {}, scans: {}
  } }, { repoRoot: '.', sourceCommit: 'a'.repeat(40) }),
  error => error.code === 'CANDIDATE_EVIDENCE_MISSING');
});

function syntheticCandidate() {
  const revision = 'a'.repeat(40);
  const commit = 'b'.repeat(40);
  const outputs = {
    'dotnet-operations-client': ['dotnet-client/Client.cs', 'namespace Synthetic;\n'],
    'messaging-typescript': ['message-models/Envelope.ts', 'export type Envelope = {};\n'],
    'web-application': ['browser-api.d.ts', 'export type paths = {};\n']
  };
  const consumers = Object.entries(outputs).map(([consumerId, [path, content]]) => {
    const generator = { 'dotnet-operations-client': 'kiota',
      'messaging-typescript': 'modelina', 'web-application': 'openapi-typescript' }[consumerId];
    return { consumerId, generator, generatorVersion: GENERATORS[generator].version,
      sourceDocument: generator === 'modelina' ? 'events.yaml' : 'api.yaml',
      configurationDigest: generatorConfigurationDigest(generator, GENERATORS[generator].outputPath),
      expectedOutputs: { [path]: digest(content) } };
  });
  const profile = Buffer.from(JSON.stringify({ generationProfileVersion: '1.1.0',
    sourceRevision: revision, consumers }));
  const sourceFiles = new Map([['api.yaml', Buffer.from('synthetic REST')],
    ['events.yaml', Buffer.from('synthetic messages')]]);
  const manifest = { sourceRevision: revision,
    openapi: [{ document: 'api.yaml', contentDigest: digest(sourceFiles.get('api.yaml')) }],
    asyncapi: [{ document: 'events.yaml', contentDigest: digest(sourceFiles.get('events.yaml')) }],
    schemas: [], governedArtifacts: [{ kind: 'generation-profile',
      document: 'governance/generation-profile.json', contentDigest: digest(profile) }] };
  const manifestBytes = Buffer.from(JSON.stringify(manifest));
  const bundle = { manifestDigest: digest(manifestBytes), files: new Map([
    ['manifest.json', manifestBytes], ['governance/generation-profile.json', profile], ...sourceFiles
  ]) };
  const validation = { releaseReady: false, manifestDigest: bundle.manifestDigest,
    sourceRevision: revision, uncoveredBoundaries: [],
    validatedCanonical: [{ document: 'api.yaml' }, { document: 'events.yaml' }],
    fixtureResults: [{ fixtureId: 'synthetic', observed: 'pass' }] };
  const scans = { secret: scan([]), vulnerability: scan({ advisories: {},
    metadata: { vulnerabilities: { moderate: 0, high: 0, critical: 0, total: 0 } } }) };
  const sbomBytes = Buffer.from('{"bomFormat":"CycloneDX","specVersion":"1.6"}');
  const seams = { repoRoot: '.', sourceCommit: commit,
    verifySources: async () => {}, readToolInputs: async () => ({ 'pinned-tool': digest('tool') }),
    readSbom: async () => ({ bytes: sbomBytes, digest: digest(sbomBytes) }),
    runGenerator: async (consumer, workspace) => {
      const [path, content] = outputs[consumer.consumerId];
      await mkdir(dirname(join(workspace, path)), { recursive: true });
      await writeFile(join(workspace, path), content);
    } };
  return { bundle, validation, scans, seams };
}

test('candidate evidence binds all three declared consumers, validation, SBOM and scans', async () => {
  const { bundle, validation, scans, seams } = syntheticCandidate();
  const candidateEvidence = await buildCandidateEvidence(bundle, { ...seams, validation, scans });
  assert.equal(candidateEvidence.releaseReady, false);
  assert.equal(candidateEvidence.consumers.length, 3);
  assert.ok(candidateEvidence.consumers.every(row => row.outputManifestDigest ===
    digest(Buffer.from(canonicalJson(row.outputs)))));
  const result = await verifyCandidateEvidence({ ...bundle, candidateEvidence }, seams);
  assert.deepEqual(result, { consumers: 3, outputs: 3, sbomDigest: candidateEvidence.sbom.digest,
    validationDigest: candidateEvidence.validationDigest, scanDigests: {
      secret: scans.secret.digest, vulnerability: scans.vulnerability.digest }, releaseReady: false });
});

test('clean verification rejects stale output, tool, SBOM, validation and scan bindings', async () => {
  const { bundle, validation, scans, seams } = syntheticCandidate();
  const candidateEvidence = await buildCandidateEvidence(bundle, { ...seams, validation, scans });
  const verify = evidence => verifyCandidateEvidence({ ...bundle, candidateEvidence: evidence }, seams);
  const changedOutput = JSON.parse(JSON.stringify(candidateEvidence));
  changedOutput.consumers[0].outputManifestDigest = digest('stale');
  await assert.rejects(verify(changedOutput), error => error.code === 'CONSUMER_EVIDENCE_MISMATCH');
  await assert.rejects(verifyCandidateEvidence({ ...bundle, candidateEvidence }, {
    ...seams, readToolInputs: async () => ({ 'pinned-tool': digest('changed') })
  }), error => error.code === 'TOOL_INPUT_STALE');
  await assert.rejects(verifyCandidateEvidence({ ...bundle, candidateEvidence }, {
    ...seams, readSbom: async () => ({ bytes: Buffer.from('changed'), digest: digest('changed') })
  }), error => error.code === 'SBOM_EVIDENCE_MISMATCH');
  const changedValidation = JSON.parse(JSON.stringify(candidateEvidence));
  changedValidation.validation.sourceRevision = 'c'.repeat(40);
  await assert.rejects(verify(changedValidation), error => error.code === 'VALIDATION_EVIDENCE_MISMATCH');
  const missingScan = JSON.parse(JSON.stringify(candidateEvidence));
  delete missingScan.scans.secret;
  await assert.rejects(verify(missingScan), error => error.code === 'SCAN_EVIDENCE_MISSING');
});

test('source bytes, profile revision and generator configuration are checked before credit', async () => {
  const { bundle, validation, scans, seams } = syntheticCandidate();
  const evidence = await buildCandidateEvidence(bundle, { ...seams, validation, scans });
  const wrongSource = { ...bundle, files: new Map(bundle.files) };
  wrongSource.files.set('api.yaml', Buffer.from('changed source'));
  await assert.rejects(verifyCandidateEvidence({ ...wrongSource, candidateEvidence: evidence }, seams),
    error => error.code === 'SOURCE_DIGEST_MISMATCH');

  const changeProfile = edit => {
    const files = new Map(bundle.files);
    const manifest = JSON.parse(files.get('manifest.json'));
    const profile = JSON.parse(files.get('governance/generation-profile.json'));
    edit(profile);
    const profileBytes = Buffer.from(JSON.stringify(profile));
    manifest.governedArtifacts[0].contentDigest = digest(profileBytes);
    files.set('governance/generation-profile.json', profileBytes);
    const manifestBytes = Buffer.from(JSON.stringify(manifest));
    files.set('manifest.json', manifestBytes);
    return { manifestDigest: digest(manifestBytes), files };
  };
  const oldRevision = changeProfile(profile => { profile.sourceRevision = 'c'.repeat(40); });
  await assert.rejects(buildCandidateEvidence(oldRevision, { ...seams, validation: {
    ...validation, manifestDigest: oldRevision.manifestDigest }, scans }),
  error => error.code === 'GENERATION_PROFILE_STALE');
  const wrongConfiguration = changeProfile(profile => {
    profile.consumers[0].configurationDigest = digest('wrong configuration');
  });
  await assert.rejects(buildCandidateEvidence(wrongConfiguration, { ...seams, validation: {
    ...validation, manifestDigest: wrongConfiguration.manifestDigest }, scans }),
  error => error.code === 'GENERATION_INPUT_MISMATCH');
});
