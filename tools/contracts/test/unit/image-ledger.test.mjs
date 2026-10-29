import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { candidateTreeDigestFromGit, executionFingerprintFromGit,
  fetchImageLedger, readKiotaRuntimeEvidence, verifyBoundImageEvidence } from '../../src/image-ledger.mjs';
import { SCANNERS, sha256 } from '../../src/image-evidence.mjs';
import { normalizeKiotaRuntimeManifest } from '../../src/kiota-runtime-manifest.mjs';

const repository = 'owner/StockSense';
const mainSha = 'a'.repeat(40);
const revision = 'b'.repeat(40);
const treeSha = 'e'.repeat(40);
const candidateTreeDigest = candidateTreeDigestFromGit(Buffer.from(
  `100644 blob ${'1'.repeat(40)}\tsecurity/image-exceptions.json\0` +
  `100644 blob ${'2'.repeat(40)}\ttools/contracts/src/example.mjs\0`));
const executionTree = (...extra) => Buffer.from([
  `100644 blob ${'1'.repeat(40)}\tsecurity/image-exceptions.json`,
  `100644 blob ${'2'.repeat(40)}\ttools/contracts/src/image-ledger.mjs`,
  `100644 blob ${'3'.repeat(40)}\ttools/contracts/scripts/image-evidence.mjs`,
  `100644 blob ${'4'.repeat(40)}\ttools/contracts/Dockerfile.generator-kiota`,
  `100644 blob ${'5'.repeat(40)}\t.github/workflows/contracts-required.yml`,
  ...extra
].join('\0') + '\0');
const executionFingerprint = executionFingerprintFromGit(executionTree());
const runtimeManifestDigest = 'sha256:' + '7'.repeat(64);
const imageId = 'sha256:' + 'c'.repeat(64);
const now = new Date();
const finding = { id: 'CVE-2026-12345', severity: 'Medium', package: 'yaml',
  version: '2.8.3', type: 'npm', purl: 'pkg:npm/yaml@2.8.3',
  fixState: 'not-fixed', fixVersions: [] };
const exception = { id: finding.id, image: 'validator', package: finding.package,
  version: finding.version, type: finding.type, purl: finding.purl,
  severity: finding.severity, fixState: finding.fixState, owner: 'security owner',
  rationale: 'Current advisory accepted for this candidate',
  compensatingControl: 'Restricted execution', approvalReference: 'OWNER-42',
  createdAt: new Date(now.getTime() - 86_400_000).toISOString(),
  expiresAt: new Date(now.getTime() + 86_400_000).toISOString() };

function fakeGithub(ledger = { schema: 'stocksense-image-exceptions-v1', exceptions: [] }) {
  const bytes = Buffer.from(JSON.stringify(ledger));
  const blobSha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  const calls = [];
  let moved = false;
  let refReads = 0;
  const request = async path => {
    calls.push(path);
    if (path.endsWith(`/git/commits/${revision}`)) return { sha: revision, tree: { sha: treeSha } };
    if (path.endsWith('/git/ref/heads/main')) return { ref: 'refs/heads/main',
      object: { type: 'commit', sha: moved && ++refReads > 1 ? 'f'.repeat(40) : mainSha } };
    if (path.endsWith(`/contents/security/image-exceptions.json?ref=${mainSha}`)) {
      return { type: 'file', path: 'security/image-exceptions.json', sha: blobSha, size: bytes.length };
    }
    if (path.endsWith(`/git/blobs/${blobSha}`)) return { sha: blobSha, size: bytes.length,
      encoding: 'base64', content: bytes.toString('base64') };
    throw new Error(`unexpected request ${path}`);
  };
  return { blobSha, calls, request, moveMain: () => { moved = true; } };
}

test('ledger comes from main path and exact immutable blob, with main checked twice', async () => {
  const api = fakeGithub();
  const ledger = await fetchImageLedger({ repository, token: 'read-only',
    candidateRevision: revision, candidateGitTreeSha: treeSha, request: api.request });
  assert.deepEqual(ledger, { mainSha, blobSha: api.blobSha, candidateGitTreeSha: treeSha,
    schema: 'stocksense-image-exceptions-v1', exceptions: [] });
  assert.equal(api.calls.filter(path => path.endsWith('/git/ref/heads/main')).length, 2);
  assert.ok(api.calls.some(path => path.includes(`?ref=${mainSha}`)));
  assert.ok(api.calls.every(path => !path.includes('/pulls/') && !path.includes('/heads/feat/')));
});

test('missing, moved, malformed and substituted main ledger fail closed', async () => {
  const api = fakeGithub();
  api.moveMain();
  const args = { repository, token: 'x', candidateRevision: revision,
    candidateGitTreeSha: treeSha };
  await assert.rejects(fetchImageLedger({ ...args, request: api.request }), /main moved/);
  await assert.rejects(fetchImageLedger({ ...args, token: '', request: api.request }), /token/);
  const bad = fakeGithub({ schema: 'wrong', exceptions: [] });
  await assert.rejects(fetchImageLedger({ ...args, request: bad.request }), /schema/);
  const good = fakeGithub();
  await assert.rejects(fetchImageLedger({ ...args,
    request: async path => {
      const result = await good.request(path);
      return path.includes('/git/blobs/') ? { ...result, content: Buffer.from('{}').toString('base64') } : result;
    } }), /blob size or encoding|blob SHA/);
  await assert.rejects(fetchImageLedger({ ...args,
    request: async path => {
      const result = await good.request(path);
      if (!path.includes('/git/blobs/')) return result;
      const altered = Buffer.from(result.content, 'base64');
      altered[0] ^= 1;
      return { ...result, content: altered.toString('base64') };
    } }), /blob SHA/);
  await assert.rejects(fetchImageLedger({ ...args,
    request: async path => path.includes('/contents/') ?
      Promise.reject(new Error('GitHub API unavailable (404)')) : good.request(path) }), /404/);
  await assert.rejects(fetchImageLedger({ ...args,
    request: async path => path.includes('/contents/') ? null : good.request(path) }), /regular file/);
  await assert.rejects(fetchImageLedger({ ...args, candidateGitTreeSha: 'f'.repeat(40),
    request: good.request }), /GitHub commit metadata/);
  const v2 = fakeGithub({ schema: 'stocksense-image-exceptions-v2', exceptions: [] });
  assert.equal((await fetchImageLedger({ ...args, request: v2.request })).schema,
    'stocksense-image-exceptions-v2');
});

test('whole candidate manifest changes on code edits but excludes only the ledger blob', () => {
  const file = `100644 blob ${'2'.repeat(40)}\ttools/contracts/src/example.mjs\0`;
  const first = candidateTreeDigestFromGit(Buffer.from(
    `100644 blob ${'1'.repeat(40)}\tsecurity/image-exceptions.json\0${file}`));
  const ledgerChanged = candidateTreeDigestFromGit(Buffer.from(
    `100644 blob ${'3'.repeat(40)}\tsecurity/image-exceptions.json\0${file}`));
  const codeChanged = candidateTreeDigestFromGit(Buffer.from(
    `100644 blob ${'1'.repeat(40)}\tsecurity/image-exceptions.json\0` +
    `100644 blob ${'4'.repeat(40)}\ttools/contracts/src/example.mjs\0`));
  assert.equal(first, ledgerChanged);
  assert.notEqual(first, codeChanged);
  for (const path of ['tools/contracts/Dockerfile.validator',
    '.github/workflows/contracts-required.yml']) {
    const before = candidateTreeDigestFromGit(Buffer.from(file +
      `100644 blob ${'5'.repeat(40)}\t${path}\0`));
    const after = candidateTreeDigestFromGit(Buffer.from(file +
      `100644 blob ${'6'.repeat(40)}\t${path}\0`));
    assert.notEqual(before, after, path);
  }
  assert.throws(() => candidateTreeDigestFromGit(Buffer.from('invalid\0')), /malformed/);
});

test('execution fingerprint permits ordinary sources but detects every protected addition', () => {
  assert.equal(executionFingerprint,
    executionFingerprintFromGit(executionTree(
      `100644 blob ${'6'.repeat(40)}\tdocs/ordinary-change.md`,
      `100644 blob ${'7'.repeat(40)}\tcontracts/openapi/c01.yaml`)));
  for (const path of [
    'tools/contracts/src/new-helper.mjs',
    'tools/contracts/arbitrary/build-input',
    'tools/contracts/Dockerfile.validator',
    '.github/workflows/new-gate.yml',
    'scripts/new-build-helper.ps1',
    'security/scan-policy.json'
  ]) {
    assert.notEqual(executionFingerprint,
      executionFingerprintFromGit(executionTree(`100644 blob ${'8'.repeat(40)}\t${path}`)), path);
  }
  assert.notEqual(executionFingerprint, executionFingerprintFromGit(Buffer.from(
    executionTree().toString('utf8').replace('2'.repeat(40), '9'.repeat(40)))));
  assert.throws(() => executionFingerprintFromGit(Buffer.from('bad\0')), /malformed/);
});

async function evidenceFiles(directory, validatorFindings = [finding]) {
  for (const name of ['validator', 'kiota']) {
    const purl = name === 'validator' ? finding.purl : 'pkg:nuget/Microsoft.OpenApi.Kiota@1.35.0';
    const sbom = { bomFormat: 'CycloneDX', specVersion: '1.6',
      metadata: { properties: [{ name: 'stocksense:imageId', value: imageId }] },
      components: [{ name: name === 'validator' ? 'yaml' : 'Microsoft.OpenApi.Kiota',
        version: name === 'validator' ? '2.8.3' : '1.35.0', purl }] };
    const sbomBytes = Buffer.from(JSON.stringify(sbom));
    await writeFile(join(directory, `${name}.cdx.json`), sbomBytes);
    const scan = { schema: 'stocksense-image-scan-v2', image: name, imageId,
      sbomDigest: sha256(sbomBytes), scanner: SCANNERS.grype, status: 'completed',
      database: { status: 'valid', schemaVersion: 'v6.1.9',
        source: 'https://grype.anchore.io/databases/v6/example', built: now.toISOString() },
      findings: name === 'validator' ? validatorFindings : [] };
    await writeFile(join(directory, `${name}.scan.json`), JSON.stringify(scan));
  }
}

test('candidate revision, image IDs, retained scans and exact dispositions bind together', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stocksense-ledger-test-'));
  const ids = { validator: imageId, kiota: imageId };
  const binding = { directory, imageIds: ids, expectedRevision: revision,
    actualRevision: revision, candidateTreeDigest, now };
  try {
    await evidenceFiles(directory);
    const ledger = { mainSha, blobSha: 'd'.repeat(40), candidateGitTreeSha: treeSha,
      exceptions: [{ candidateTreeDigest, finding: exception }] };
    const result = await verifyBoundImageEvidence({ ...binding, ledger });
    assert.equal(result.candidateRevision, revision);
    assert.equal(result.candidateTreeDigest, candidateTreeDigest);
    assert.equal(result.mainSha, mainSha);
    assert.equal(result.images[0].disposed, 1);
    assert.match(result.images[0].scanDigest, /^sha256:[0-9a-f]{64}$/);
    await assert.rejects(verifyBoundImageEvidence({ ...binding, actualRevision: 'e'.repeat(40),
      ledger }), /candidate source revision/);
    await assert.rejects(verifyBoundImageEvidence({ ...binding, ledger: { ...ledger, exceptions: [] } }),
      error => error.code === 'IMAGE_FINDINGS');
    await assert.rejects(verifyBoundImageEvidence({ ...binding, ledger: { ...ledger,
      exceptions: [{ candidateTreeDigest: 'sha256:' + 'f'.repeat(64), finding: exception }] } }),
    /different candidate tree/);
    await assert.rejects(verifyBoundImageEvidence({ ...binding, ledger: { ...ledger,
      exceptions: [{ candidateTreeDigest,
        finding: { ...exception, expiresAt: new Date(now.getTime() - 1000).toISOString() } }] } }),
    error => error.code === 'IMAGE_EXCEPTION');
    await assert.rejects(verifyBoundImageEvidence({ ...binding, ledger: { ...ledger,
      exceptions: [{ candidateTreeDigest, finding: { ...exception, image: 'unknown' } }] } }),
    /unknown image/);
    await assert.rejects(verifyBoundImageEvidence({ ...binding,
      imageIds: { ...ids, validator: 'sha256:' + 'e'.repeat(64) }, ledger }));
    await evidenceFiles(directory, [{ ...finding, severity: 'High', fixState: 'fixed',
      fixVersions: ['2.8.4'] }]);
    await assert.rejects(verifyBoundImageEvidence({ ...binding, ledger: { ...ledger,
      exceptions: [{ candidateTreeDigest,
        finding: { ...exception, severity: 'High', fixState: 'fixed' } }] } }),
    error => error.code === 'IMAGE_FINDINGS');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('v2 ledger binds execution and runtime baselines without binding unrelated source bytes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stocksense-ledger-v2-test-'));
  const ids = { validator: imageId, kiota: imageId };
  const ledger = { schema: 'stocksense-image-exceptions-v2', mainSha,
    blobSha: 'd'.repeat(40), candidateGitTreeSha: treeSha,
    exceptions: [{ executionFingerprint, runtimeManifestDigest, finding: exception }] };
  const args = { directory, imageIds: ids, ledger, expectedRevision: revision,
    actualRevision: revision, candidateTreeDigest, executionFingerprint,
    runtimeManifestDigest, now };
  try {
    await evidenceFiles(directory);
    const result = await verifyBoundImageEvidence(args);
    assert.equal(result.images[0].disposed, 1);
    assert.equal(result.executionFingerprint, executionFingerprint);
    assert.equal(result.runtimeManifestDigest, runtimeManifestDigest);
    assert.equal(result.ledgerSchema, 'stocksense-image-exceptions-v2');
    const unrelatedTree = candidateTreeDigestFromGit(Buffer.from(
      `100644 blob ${'8'.repeat(40)}\tdocs/ordinary-change.md\0` +
      `100644 blob ${'2'.repeat(40)}\ttools/contracts/src/example.mjs\0`));
    assert.notEqual(unrelatedTree, candidateTreeDigest);
    await verifyBoundImageEvidence({ ...args, candidateTreeDigest: unrelatedTree });
    await assert.rejects(verifyBoundImageEvidence({ ...args,
      executionFingerprint: 'sha256:' + '8'.repeat(64) }), /execution baseline/);
    await assert.rejects(verifyBoundImageEvidence({ ...args,
      runtimeManifestDigest: 'sha256:' + '8'.repeat(64) }), /execution baseline/);
    await assert.rejects(verifyBoundImageEvidence({ ...args,
      runtimeManifestDigest: null }), /runtime manifest is missing/);
    await assert.rejects(verifyBoundImageEvidence({ ...args, ledger: { ...ledger,
      exceptions: [{ ...ledger.exceptions[0], unknown: true }] } }), /malformed/);
    await evidenceFiles(directory, [{ ...finding, severity: 'High', fixState: 'fixed',
      fixVersions: ['2.8.4'] }]);
    await assert.rejects(verifyBoundImageEvidence(args), error => error.code === 'IMAGE_FINDINGS');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('retained runtime record must be canonical and bound to the exact SBOM and image ID', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stocksense-runtime-binding-test-'));
  const sbom = { bomFormat: 'CycloneDX', specVersion: '1.6',
    components: [{ type: 'library', name: 'Microsoft.OpenApi.Kiota', version: '1.35.0',
      purl: 'pkg:nuget/Microsoft.OpenApi.Kiota@1.35.0' }] };
  const sbomBytes = Buffer.from(JSON.stringify(sbom, null, 2) + '\n');
  const entries = [
    { path: 'opt/kiota', kind: 'directory', mode: 0o755 },
    { path: 'opt/kiota-probe', kind: 'directory', mode: 0o755 }
  ];
  const config = { Entrypoint: null, Cmd: null, Env: [], User: '65532', WorkingDir: '/' };
  const normalized = normalizeKiotaRuntimeManifest({ entries, config, sbom });
  const record = { imageId, sbomDigest: sha256(sbomBytes), ...normalized };
  try {
    await writeFile(join(directory, 'kiota.cdx.json'), sbomBytes);
    await writeFile(join(directory, 'kiota.runtime.json'), JSON.stringify(record, null, 2) + '\n');
    assert.equal(await readKiotaRuntimeEvidence(directory, imageId), normalized.digest);
    await assert.rejects(readKiotaRuntimeEvidence(directory, 'sha256:' + 'd'.repeat(64)),
      /disagrees with current image/);
    for (const changed of [
      { ...record, sbomDigest: 'sha256:' + 'd'.repeat(64) },
      { ...record, unreviewed: true },
      { ...record, entries: [...record.entries, { path: 'opt/kiota/new-tool',
        kind: 'file', mode: 0o755, size: 1, sha256: sha256(Buffer.from('x')) }] }
    ]) {
      await writeFile(join(directory, 'kiota.runtime.json'), JSON.stringify(changed, null, 2) + '\n');
      await assert.rejects(readKiotaRuntimeEvidence(directory, imageId),
        /canonical|disagrees/);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
