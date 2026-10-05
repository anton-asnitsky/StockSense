import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPackage } from '../../src/package-loader.mjs';
import { runFixtureWorker } from '../../src/container-fixture-oracle.mjs';

const sampleRoot = fileURLToPath(new URL('../../../../contracts/samples/walking-skeleton/', import.meta.url));

async function withSample(action) {
  const loaded = await loadPackage(sampleRoot);
  const root = await mkdtemp(join(tmpdir(), 'stocksense-fixture-worker-'));
  const entries = JSON.parse(JSON.stringify(loaded.entries));
  const files = entries.map(entry => ({ document: entry.document, digest: entry.contentDigest,
    artifactKind: entry.artifactKind }));
  const sourceDocument = entries.find(entry => entry.kind === 'example-fixture').document;
  const indexPath = join(root, 'fixture-index.json');
  for (const entry of entries) {
    const target = join(root, ...entry.document.split('/'));
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(sampleRoot, ...entry.document.split('/')), target);
  }
  const index = { version: 1, sourceDocument, files, entries };
  async function writeIndex() { await writeFile(indexPath, JSON.stringify(index)); }
  try {
    await writeIndex();
    return await action({ root, indexPath, index, writeIndex, sourceDocument });
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('image worker runs the real policy fixture oracle over the verified sample graph', async () => {
  await withSample(async ({ root, indexPath, sourceDocument }) => {
    const result = JSON.parse(await runFixtureWorker(root, indexPath, sourceDocument));
    assert.equal(result.version, 1);
    assert.equal(result.fixtureResults.length, 4);
    assert.deepEqual(result.fixtureResults.map(row => row.observed), ['pass', 'pass', 'fail', 'fail']);
  });
});

test('image worker accepts post-materialization canonical digest with original revision metadata', async () => {
  await withSample(async ({ root, indexPath, index, writeIndex, sourceDocument }) => {
    const canonical = index.entries.find(entry => entry.artifactKind === 'schema' && entry.document.endsWith('.json'));
    assert.ok(canonical);
    const path = join(root, ...canonical.document.split('/'));
    const revised = Buffer.concat([await readFile(path), Buffer.from('\n')]);
    await writeFile(path, revised);
    const originalRevisionId = canonical.revisionId;
    const snapshotDigest = 'sha256:' + createHash('sha256').update(revised).digest('hex');
    canonical.contentDigest = snapshotDigest;
    index.files.find(file => file.document === canonical.document).digest = snapshotDigest;
    await writeIndex();
    const result = JSON.parse(await runFixtureWorker(root, indexPath, sourceDocument));
    assert.equal(result.fixtureResults.length, 4);
    assert.equal(canonical.revisionId, originalRevisionId);
  });
});

test('image worker rejects missing entries, changed mounted bytes and a changed sidecar digest', async () => {
  await withSample(async ({ root, indexPath, index, writeIndex, sourceDocument }) => {
    index.entries.pop();
    await writeIndex();
    await assert.rejects(runFixtureWorker(root, indexPath, sourceDocument), /Verified fixture graph is invalid/);
    // Restore the authoritative loaded entries through the sample loader.
    index.entries = JSON.parse(JSON.stringify((await loadPackage(sampleRoot)).entries));
    await writeIndex();
    const first = index.files[0];
    const path = join(root, ...first.document.split('/'));
    const original = await readFile(path);
    await writeFile(path, Buffer.concat([original, Buffer.from('\n')]));
    await assert.rejects(runFixtureWorker(root, indexPath, sourceDocument), /Verified fixture graph is invalid/);
    await writeFile(path, original);
    const sidecar = index.files.find(file => file.artifactKind === 'sidecar');
    sidecar.digest = 'sha256:' + '0'.repeat(64);
    await writeIndex();
    await assert.rejects(runFixtureWorker(root, indexPath, sourceDocument), /Verified fixture graph is invalid/);
  });
});
