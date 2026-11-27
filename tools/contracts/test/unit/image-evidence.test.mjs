import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { inspectImageScan, normalizeImageScan, readImageEvidence, retainRawImageScan, SCANNERS, sha256, validateImageExceptions, verifyImageDispositions, verifyRawImageScan } from '../../src/image-evidence.mjs';

const imageId = `sha256:${'a'.repeat(64)}`;
const sbomDigest = `sha256:${'b'.repeat(64)}`;
const revision = 'c'.repeat(40);

async function withDirectory(check) {
  const directory = await mkdtemp(join(tmpdir(), 'stocksense-image-raw-'));
  try { await check(directory); } finally { await rm(directory, { recursive: true, force: true }); }
}

test('retained scanner bytes have exact image, SBOM, scanner and source binding', async () => {
  await withDirectory(async directory => {
    const scanText = '{"matches":[]}\n';
    const db = { valid: true, built: new Date().toISOString(), schemaVersion: 'v6.1.9',
      from: 'https://grype.anchore.io/databases/v6/example' };
    const databaseText = JSON.stringify(db) + '\n';
    await writeFile(join(directory, 'validator.scan.json'), JSON.stringify(
      normalizeImageScan(JSON.parse(scanText), db, 'validator', imageId, sbomDigest)));
    const receipt = await retainRawImageScan(directory, { name: 'validator', imageId,
      sbomDigest, revision, scanText, databaseText });
    assert.equal(receipt.imageId, imageId);
    assert.equal(receipt.sbomDigest, sbomDigest);
    assert.equal(receipt.sourceRevision, revision);
    assert.equal(receipt.scanner, SCANNERS.grype);
    assert.equal(receipt.scanDigest, sha256(Buffer.from(scanText)));
    assert.equal(receipt.databaseDigest, sha256(Buffer.from(databaseText)));
    assert.equal(await readFile(join(directory, 'validator.grype-raw.json'), 'utf8'), scanText);
    assert.equal(await readFile(join(directory, 'validator.grype-db-raw.json'), 'utf8'), databaseText);
    assert.deepEqual(JSON.parse(await readFile(join(directory, 'validator.grype-raw-receipt.json'))), receipt);
    assert.deepEqual(await verifyRawImageScan(directory, { name: 'validator', imageId,
      sbomDigest, revision }), receipt);
    const normalized = JSON.parse(await readFile(join(directory, 'validator.scan.json'), 'utf8'));
    normalized.database.built = '2026-01-01T00:00:00Z';
    await writeFile(join(directory, 'validator.scan.json'), JSON.stringify(normalized));
    await assert.rejects(verifyRawImageScan(directory, { name: 'validator', imageId,
      sbomDigest, revision }), error => error.code === 'IMAGE_RAW');
  });
});

test('raw scanner tampering and wrong source revision fail verification', async () => {
  await withDirectory(async directory => {
    await retainRawImageScan(directory, { name: 'validator', imageId, sbomDigest,
      revision, scanText: '{"matches":[]}', databaseText: '{"valid":true}' });
    await assert.rejects(verifyRawImageScan(directory, { name: 'validator', imageId,
      sbomDigest, revision: 'd'.repeat(40) }), error => error.code === 'IMAGE_RAW');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(directory, 'validator.grype-raw.json'), '{"matches":[{}]}');
    await assert.rejects(verifyRawImageScan(directory, { name: 'validator', imageId,
      sbomDigest, revision }), error => error.code === 'IMAGE_RAW');
  });
});

test('observed generic Node binary finding is reported but fixed Critical still blocks after raw output is saved', async () => {
  await withDirectory(async directory => {
    const scanText = JSON.stringify({ matches: [{ artifact: { name: 'node', version: '24.19.0',
      type: 'binary', purl: 'pkg:generic/node@24.19.0' }, vulnerability: {
      id: 'CVE-2026-111497', severity: 'Critical', fix: { state: 'fixed', versions: ['24.22.1'] } } }] });
    const databaseText = '{"valid":true}';
    await retainRawImageScan(directory, { name: 'validator', imageId,
      sbomDigest, revision, scanText, databaseText });
    const report = { schema: 'stocksense-image-scan-v2', image: 'validator', imageId,
      sbomDigest, scanner: SCANNERS.grype, status: 'completed', database: {
        built: new Date().toISOString(), source: 'https://grype.anchore.io/databases/v6',
        schemaVersion: 'v6.0.0', status: 'valid' }, findings: [{
          id: 'CVE-2026-111497', severity: 'Critical', package: 'node', version: '24.19.0',
          type: 'binary', purl: 'pkg:generic/node@24.19.0', fixState: 'fixed',
          fixVersions: ['24.22.1'] }] };
    assert.equal(inspectImageScan(report, 'validator', imageId, sbomDigest).length, 1);
    assert.throws(() => verifyImageDispositions(report, [], { image: 'validator', imageId, sbomDigest }),
      error => error.code === 'IMAGE_FINDINGS');
    assert.equal(await readFile(join(directory, 'validator.grype-raw.json'), 'utf8'), scanText);
  });
});

const currentDb = () => ({ valid: true, built: new Date().toISOString(), schemaVersion: 'v6.1.10',
  from: 'https://grype.anchore.io/databases/v6/example' });
const nodeMatch = () => ({ artifact: { name: 'node', version: '24.22.2', type: 'binary',
  purl: 'pkg:generic/node@24.22.2' }, vulnerability: { id: 'CVE-2026-126051', severity: 'High',
  fix: { state: 'fixed', versions: ['24.22.3'] } } });
const nodeReport = match => normalizeImageScan({ matches: [match] }, currentDb(), 'validator', imageId, sbomDigest);

test('only canonical binary Node identities are reportable', () => {
  const match = nodeMatch();
  assert.equal(inspectImageScan(nodeReport(match), 'validator', imageId, sbomDigest).length, 1);
  for (const patch of [
    { name: 'other' }, { version: '24.22.3' }, { type: 'generic' },
    { name: 'python', purl: 'pkg:generic/python@24.22.2' },
    ...['pkg:generic/vendor/node@24.22.2', 'pkg:generic/%6eode@24.22.2',
      'pkg:generic/node@24%2e22.2', 'pkg:generic/node@24.22.2?arch=x86_64',
      'pkg:generic/node@24.22.2#bin/node', 'pkg:npm/node@24.22.2',
      'pkg:generic/node@24.22.2%', 'pkg:generic/node@24.22.2/'].map(purl => ({ purl }))
  ]) {
    const changed = JSON.parse(JSON.stringify(match));
    Object.assign(changed.artifact, patch);
    assert.throws(() => inspectImageScan(nodeReport(changed), 'validator', imageId, sbomDigest),
      error => error.code === 'IMAGE_SCAN', JSON.stringify(patch));
  }
});

test('explicit empty fix metadata remains unknown and cannot authorize a disposition', () => {
  const match = nodeMatch();
  match.vulnerability.severity = 'Medium';
  match.vulnerability.fix = { state: '', versions: [] };
  const report = nodeReport(match);
  assert.equal(inspectImageScan(report, 'validator', imageId, sbomDigest)[0].fixState, 'unknown');
  assert.throws(() => verifyImageDispositions(report, [], { image: 'validator', imageId, sbomDigest }),
    error => error.code === 'IMAGE_SCAN');
  const finding = { ...report.findings[0] };
  delete finding.fixVersions;
  assert.throws(() => validateImageExceptions([{ ...finding, image: 'validator', owner: 'test owner',
    rationale: 'test only', compensatingControl: 'test only', approvalReference: 'TEST-NOT-APPROVAL',
    createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-01-01T00:00:00Z' }]),
  error => error.code === 'IMAGE_EXCEPTION');
  for (const fix of [undefined, null, {}, { state: '' }, { state: '', versions: null },
    { state: '', versions: ['24.22.3'] }, { state: 'not-fixed' }, { state: 'fixed', versions: [] }]) {
    const changed = JSON.parse(JSON.stringify(match));
    changed.vulnerability.fix = fix;
    assert.throws(() => inspectImageScan(nodeReport(changed), 'validator', imageId, sbomDigest),
      error => error.code === 'IMAGE_SCAN', JSON.stringify(fix));
  }
});

test('retained vulnerable scan preserves every match and fixed High detection', async () => {
  const bytes = await readFile(new URL('../fixtures/image-evidence/validator-node-24.22.2.grype-raw.json', import.meta.url));
  assert.equal(sha256(bytes), 'sha256:574ff840ccc320963fbc37d0a7778992170d5fc008a4273da3af5f53000a4384');
  const raw = JSON.parse(bytes);
  const report = normalizeImageScan(raw, currentDb(), 'validator', imageId, sbomDigest);
  const findings = inspectImageScan(report, 'validator', imageId, sbomDigest);
  assert.equal(raw.matches.length, 20);
  assert.equal(findings.length, raw.matches.length);
  assert.equal(findings.filter(row => row.type === 'binary').length, 15);
  assert.equal(findings.filter(row => row.fixState === 'unknown').length, 5);
  assert.equal(findings.filter(row => row.severity === 'High' && row.fixState === 'fixed').length, 7);
  assert.deepEqual(findings.map(row => row.id), raw.matches.map(row => row.vulnerability.id));
  const nodeOnly = { ...report, findings: findings.filter(row => row.type === 'binary') };
  assert.throws(() => verifyImageDispositions(nodeOnly, [], { image: 'validator', imageId, sbomDigest }),
    error => error.code === 'IMAGE_FINDINGS');
  const duplicated = nodeReport(nodeMatch());
  duplicated.findings[0].severity = 'Medium';
  duplicated.findings.push({ ...duplicated.findings[0] });
  assert.throws(() => verifyImageDispositions(duplicated, [], { image: 'validator', imageId, sbomDigest }),
    error => error.code === 'IMAGE_SCAN');
});

test('binary findings require one exact named component in the bound SBOM', async () => {
  await withDirectory(async directory => {
    const binary = { name: 'node', version: '24.22.2', purl: 'pkg:generic/node@24.22.2' };
    async function writeEvidence(binaryComponents) {
      for (const name of ['validator', 'kiota']) {
        const ecosystem = name === 'validator' ? { name: 'yaml', version: '2.8.3', purl: 'pkg:npm/yaml@2.8.3' }
          : { name: 'Kiota', version: '1.38.0', purl: 'pkg:nuget/Kiota@1.38.0' };
        const sbom = { bomFormat: 'CycloneDX', specVersion: '1.6',
          metadata: { properties: [{ name: 'stocksense:imageId', value: imageId }] },
          components: [ecosystem, ...(name === 'validator' ? binaryComponents : [])] };
        const bytes = Buffer.from(JSON.stringify(sbom));
        await writeFile(join(directory, `${name}.cdx.json`), bytes);
        const report = normalizeImageScan({ matches: name === 'validator' ? [nodeMatch()] : [] },
          currentDb(), name, imageId, sha256(bytes));
        await writeFile(join(directory, `${name}.scan.json`), JSON.stringify(report));
      }
    }
    const imageIds = { validator: imageId, kiota: imageId };
    await writeEvidence([binary]);
    assert.equal((await readImageEvidence(directory, imageIds, { requireClean: false })).records[0].findings, 1);
    await assert.rejects(readImageEvidence(directory, imageIds), error => error.code === 'IMAGE_FINDINGS');
    for (const rows of [[], [{ ...binary, name: 'other' }], [{ ...binary, version: '24.22.3' }],
      [binary, { ...binary }], [binary, { ...binary, name: 'other' }]]) {
      await writeEvidence(rows);
      await assert.rejects(readImageEvidence(directory, imageIds, { requireClean: false }),
        error => error.code === 'IMAGE_SBOM');
    }
    await writeEvidence([binary]);
    const report = JSON.parse(await readFile(join(directory, 'validator.scan.json'), 'utf8'));
    report.sbomDigest = sbomDigest;
    await writeFile(join(directory, 'validator.scan.json'), JSON.stringify(report));
    await assert.rejects(readImageEvidence(directory, imageIds, { requireClean: false }), error => error.code === 'IMAGE_SCAN');
  });
});

test('complete Wolfi APK findings enter inventory and fixed High or unknown findings fail disposition', () => {
  const match = { artifact: { name: 'ld-linux-2.44', version: '2.44-r9', type: 'apk',
    purl: 'pkg:apk/wolfi/ld-linux-2.44@2.44-r9?arch=x86_64&distro=wolfi-20230201&upstream=glibc-2.44' },
    vulnerability: { id: 'CVE-2026-84243', severity: 'High', fix: { state: 'fixed', versions: ['2.44-r16'] } } };
  const db = { valid: true, built: new Date().toISOString(), schemaVersion: 'v6.1.9',
    from: 'https://grype.anchore.io/databases/v6/example' };
  const report = normalizeImageScan({ matches: [match] }, db, 'validator', imageId, sbomDigest);
  assert.equal(inspectImageScan(report, 'validator', imageId, sbomDigest).length, 1);
  const options = { image: 'validator', imageId, sbomDigest };
  assert.throws(() => verifyImageDispositions(report, [], options), error => error.code === 'IMAGE_FINDINGS');
  report.findings[0].severity = 'Unknown';
  assert.equal(inspectImageScan(report, 'validator', imageId, sbomDigest).length, 1);
  assert.throws(() => verifyImageDispositions(report, [], options), error => error.code === 'IMAGE_SCAN');
  report.findings[0].version = '2.44-r16';
  assert.throws(() => inspectImageScan(report, 'validator', imageId, sbomDigest), error => error.code === 'IMAGE_SCAN');
});

test('missing and stale database statuses remain rejected', () => {
  const report = { schema: 'stocksense-image-scan-v2', image: 'validator', imageId,
    sbomDigest, scanner: SCANNERS.grype, status: 'completed', findings: [], database: {
      built: '2026-01-01T00:00:00Z', source: 'https://grype.anchore.io/databases/v6',
      schemaVersion: 'v6.0.0', status: 'valid' } };
  assert.throws(() => inspectImageScan({ ...report, database: undefined },
    'validator', imageId, sbomDigest), error => error.code === 'IMAGE_SCAN');
  assert.throws(() => inspectImageScan(report, 'validator', imageId, sbomDigest,
    new Date('2026-01-10T00:00:00Z')), error => error.code === 'IMAGE_SCAN');
});

test('malformed raw output is retained without weakening binding budgets', async () => {
  await withDirectory(async directory => {
    const scanText = '{broken';
    await retainRawImageScan(directory, { name: 'validator', imageId, sbomDigest,
      revision, scanText, databaseText: '{}' });
    assert.equal(await readFile(join(directory, 'validator.grype-raw.json'), 'utf8'), scanText);
    await assert.rejects(retainRawImageScan(directory, { name: 'validator', imageId,
      sbomDigest, revision: 'wrong', scanText, databaseText: '{}' }),
    error => error.code === 'IMAGE_RAW');
  });
});
