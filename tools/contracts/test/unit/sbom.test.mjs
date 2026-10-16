import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSbom, parsePackageKey } from '../../src/sbom.mjs';
import { assertScanGates } from '../../src/evidence.mjs';

const lockfile = fileURLToPath(new URL('../../pnpm-lock.yaml', import.meta.url));
const subject = { name: 'stocksense-contracts', version: '1.0.0', generator: 'stocksense-contracts-sbom' };
const expectCode = (promise, code) => assert.rejects(promise, error => error.code === code);

async function withLockfile(content, check) {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-sbom-'));
  try {
    const path = join(root, 'pnpm-lock.yaml');
    await writeFile(path, content);
    await check(path);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('a package key yields name and version, and a peer suffix is not identity', () => {
  assert.deepEqual(parsePackageKey('yaml@2.8.3'), { name: 'yaml', version: '2.8.3' });
  assert.deepEqual(parsePackageKey('@asyncapi/parser@3.6.3'), { name: '@asyncapi/parser', version: '3.6.3' });
  // A peer-resolution suffix describes how a package was resolved, not what it is.
  assert.deepEqual(parsePackageKey('ajv-formats@3.0.1(ajv@8.20.0)'), { name: 'ajv-formats', version: '3.0.1' });
  assert.deepEqual(parsePackageKey('typescript@5.9.3'), { name: 'typescript', version: '5.9.3' });
});

test('the SBOM covers the locked tree with a hash for every component', async () => {
  const { document, components, digest } = await buildSbom(lockfile, subject);
  assert.equal(document.bomFormat, 'CycloneDX');
  assert.equal(document.specVersion, '1.6');
  assert.ok(components > 100, `expected the whole tree, got ${components}`);
  assert.equal(document.components.length, components);
  // Every component carries an integrity hash, so the SBOM is verifiable
  // rather than a list of names. The lockfile is the reason that holds.
  assert.equal(document.components.filter(item => item.hashes?.length).length, components);
  for (const item of document.components) {
    assert.match(item.purl, /^pkg:npm\//);
    assert.equal(item['bom-ref'], item.purl);
    assert.match(item.hashes[0].content, /^[0-9a-f]{64,128}$/);
    assert.match(item.hashes[0].alg, /^SHA-(256|512)$/);
  }
  assert.match(digest, /^sha256:[0-9a-f]{64}$/);
  assert.match(document.serialNumber, /^urn:uuid:[0-9a-f-]{36}$/);
});

test('the same lockfile always produces the same bytes', async () => {
  // Without this a report digest would mean nothing: every run would differ and
  // no gate could claim the SBOM it recorded is the SBOM it generated.
  const first = await buildSbom(lockfile, subject);
  const second = await buildSbom(lockfile, subject);
  assert.equal(first.digest, second.digest);
  assert.ok(first.bytes.equals(second.bytes));
  assert.ok(!JSON.stringify(first.document).includes('timestamp'));
});

test('the SBOM digest lets the release sbom gate report a pass', async () => {
  const { digest } = await buildSbom(lockfile, subject);
  const detail = { reason: 'CycloneDX 1.6 generated from the locked tree',
    expectedResult: 'a component for every locked package', actualResult: 'complete',
    startedAt: '2026-10-08T00:00:00Z', completedAt: '2026-10-08T00:00:01Z', limitations: [] };
  const gates = {
    'secret-scan': { outcome: 'passed', reportDigest: digest, ...detail },
    sbom: { outcome: 'passed', reportDigest: digest, ...detail },
    'vulnerability-scan': { outcome: 'passed', reportDigest: digest, ...detail }
  };
  assert.deepEqual(assertScanGates(gates).find(row => row.gate === 'sbom'), { gate: 'sbom', outcome: 'passed' });
  // And a pass without a digest is still refused, so the generator is what
  // makes the difference rather than the claim.
  assert.throws(() => assertScanGates({ ...gates, sbom: { ...gates.sbom, reportDigest: undefined } }),
    error => error.code === 'SCAN_REPORT_DIGEST');
});

test('a lockfile this generator does not understand fails rather than half-reporting', async () => {
  // A partial SBOM is worse than an absent one: it looks complete.
  await withLockfile("lockfileVersion: '6.0'\npackages:\n  yaml@2.8.3:\n    resolution:\n      integrity: sha512-AAAA\n",
    path => expectCode(buildSbom(path, subject), 'SBOM_LOCKFILE'));
  await withLockfile("lockfileVersion: '9.0'\n", path => expectCode(buildSbom(path, subject), 'SBOM_LOCKFILE'));
  await withLockfile("lockfileVersion: '9.0'\npackages: {}\n",
    path => expectCode(buildSbom(path, subject), 'SBOM_COMPONENT'));
  await withLockfile("lockfileVersion: '9.0'\npackages:\n  'not-a-version-key':\n    resolution: {}\n",
    path => expectCode(buildSbom(path, subject), 'SBOM_COMPONENT'));
  await withLockfile(': : not yaml\n', path => expectCode(buildSbom(path, subject), 'SBOM_LOCKFILE'));
});

test('a component without an integrity hash is counted rather than hidden', async () => {
  await withLockfile("lockfileVersion: '9.0'\npackages:\n  local-thing@1.0.0:\n    resolution:\n      directory: ../x\n",
    async path => {
      const { document } = await buildSbom(path, subject);
      assert.equal(document.components.length, 1);
      assert.equal(document.components[0].hashes, undefined);
      const property = document.metadata.properties.find(item => item.name === 'stocksense:componentsWithoutHash');
      assert.equal(property.value, '1');
    });
});
