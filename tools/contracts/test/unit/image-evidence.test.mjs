import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { inspectImageScan, retainRawImageScan, SCANNERS, sha256, verifyRawImageScan } from '../../src/image-evidence.mjs';

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
    const databaseText = '{"valid":true}\n';
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

test('observed generic Node binary finding fails closed after raw output is saved', async () => {
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
    assert.throws(() => inspectImageScan(report, 'validator', imageId, sbomDigest),
      error => error.code === 'IMAGE_SCAN');
    assert.equal(await readFile(join(directory, 'validator.grype-raw.json'), 'utf8'), scanText);
  });
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
