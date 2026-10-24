import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSbom, parsePackageKey } from '../../src/sbom.mjs';
import { SCANNERS, readImageEvidence, sha256, verifyImageDispositions } from '../../src/image-evidence.mjs';
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
  assert.equal(document.components.filter(item => item.purl?.startsWith('pkg:npm/') && item.hashes?.length).length,
    document.components.filter(item => item.purl?.startsWith('pkg:npm/')).length);
  for (const item of document.components.filter(item => item.purl?.startsWith('pkg:npm/'))) {
    assert.match(item.purl, /^pkg:npm\//);
    assert.equal(item['bom-ref'], item.purl);
    assert.match(item.hashes[0].content, /^[0-9a-f]{64,128}$/);
    assert.match(item.hashes[0].alg, /^SHA-(256|512)$/);
  }
  assert.match(digest, /^sha256:[0-9a-f]{64}$/);
  assert.match(document.serialNumber, /^urn:uuid:[0-9a-f-]{36}$/);
  for (const name of ['validator-node-image', 'kiota-dotnet-sdk-image', 'Microsoft.OpenApi.Kiota',
    'oasdiff-linux-amd64-archive', 'actions/checkout', 'GitHub hosted runner']) {
    assert.ok(document.components.some(item => item.name === name), `missing ${name}`);
  }
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

async function imageFixture(directory, name, imageId, findings = []) {
  const sbom = { bomFormat: 'CycloneDX', specVersion: '1.6',
    metadata: { properties: [{ name: 'stocksense:imageId', value: imageId }] },
    components: [{ type: 'library', name: name === 'kiota' ? 'Microsoft.OpenApi.Kiota' : 'yaml',
      version: '1.0.0', purl: name === 'kiota' ? 'pkg:nuget/Microsoft.OpenApi.Kiota@1.0.0' : 'pkg:npm/yaml@1.0.0' }] };
  const bytes = Buffer.from(JSON.stringify(sbom) + '\n');
  await writeFile(join(directory, `${name}.cdx.json`), bytes);
  await writeFile(join(directory, `${name}.scan.json`), JSON.stringify({
    schema: 'stocksense-image-scan-v2', image: name, imageId, sbomDigest: sha256(bytes),
    scanner: SCANNERS.grype, status: 'completed', database: { status: 'valid', schemaVersion: 'v6.1.9',
      source: 'https://grype.anchore.io/databases/v6/example', built: new Date().toISOString() },
    findings
  }) + '\n');
}

test('built image packages enter the SBOM with exact image IDs and scanned inventories', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stocksense-images-'));
  const image = 'sha256:' + 'a'.repeat(64);
  try {
    await imageFixture(directory, 'validator', image);
    await imageFixture(directory, 'kiota', image);
    const { document } = await buildSbom(lockfile, { ...subject, validatorImageDigest: image,
      kiotaImageDigest: image, imageEvidenceDirectory: directory });
    for (const name of ['validator-image', 'kiota-image']) {
      assert.equal(document.components.find(item => item.name === name).hashes[0].content, image.slice(7));
    }
    for (const name of ['validator', 'kiota']) {
      assert.ok(document.components.some(item => item.properties?.some(p =>
        p.name === 'stocksense:image' && p.value === name)));
    }
    assert.ok(document.components.some(item => item.purl?.startsWith('pkg:nuget/')));
    assert.ok(document.components.some(item => item.name === 'syft-image-scanner'));
  } finally { await rm(directory, { recursive: true, force: true }); }
  await expectCode(buildSbom(lockfile, { ...subject, validatorImageDigest: 'latest' }), 'SBOM_TOOL_PIN');
});

test('missing, stale, malformed and vulnerable image evidence fails closed', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stocksense-images-'));
  const image = 'sha256:' + 'a'.repeat(64);
  const ids = { validator: image, kiota: image };
  try {
    await expectCode(readImageEvidence(directory, ids), 'IMAGE_MISSING');
    await imageFixture(directory, 'validator', image);
    await imageFixture(directory, 'kiota', image);
    await expectCode(readImageEvidence(directory, { ...ids, kiota: 'sha256:' + 'b'.repeat(64) }), 'IMAGE_STALE');
    await imageFixture(directory, 'kiota', image, [{ id: 'CVE-2026-12345', severity: 'High',
      package: 'Kiota', version: '1.0.0', type: 'dotnet', purl: 'pkg:nuget/Kiota@1.0.0',
      fixState: 'fixed', fixVersions: ['1.1.0'] }]);
    await expectCode(readImageEvidence(directory, ids), 'IMAGE_FINDINGS');
    const findingPath = join(directory, 'kiota.scan.json');
    const incomplete = JSON.parse(await readFile(findingPath, 'utf8'));
    delete incomplete.findings[0].fixState;
    await writeFile(findingPath, JSON.stringify(incomplete));
    await expectCode(readImageEvidence(directory, ids), 'IMAGE_SCAN');
    await imageFixture(directory, 'kiota', image);
    const path = join(directory, 'kiota.scan.json');
    const scan = JSON.parse(await readFile(path, 'utf8'));
    scan.database.built = '2020-01-01T00:00:00Z';
    await writeFile(path, JSON.stringify(scan));
    await expectCode(readImageEvidence(directory, ids), 'IMAGE_SCAN');
    scan.database.built = new Date().toISOString();
    scan.database.schemaVersion = 'v5.0.0';
    await writeFile(path, JSON.stringify(scan));
    await expectCode(readImageEvidence(directory, ids), 'IMAGE_SCAN');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

const imageNow = new Date('2026-10-20T12:00:00Z');
const imageFinding = { id: 'CVE-2026-12345', severity: 'Medium', package: 'yaml',
  version: '2.8.3', type: 'npm', purl: 'pkg:npm/yaml@2.8.3',
  fixState: 'not-fixed', fixVersions: [] };
const imageException = { id: imageFinding.id, image: 'validator', package: imageFinding.package,
  version: imageFinding.version, type: imageFinding.type, purl: imageFinding.purl,
  fixState: imageFinding.fixState, severity: imageFinding.severity,
  owner: 'security-owner', rationale: 'No fixed release yet',
  compensatingControl: 'Restrict image execution', approvalReference: 'SEC-42',
  createdAt: '2026-10-19T12:00:00Z', expiresAt: '2026-10-21T12:00:00Z' };
const imageId = 'sha256:' + 'a'.repeat(64);
const imageSbomDigest = 'sha256:' + 'b'.repeat(64);
const imageReport = (findings = [imageFinding]) => ({ schema: 'stocksense-image-scan-v2',
  image: 'validator', imageId, sbomDigest: imageSbomDigest, scanner: SCANNERS.grype,
  status: 'completed', database: { status: 'valid', schemaVersion: 'v6.1.9',
    source: 'https://grype.anchore.io/databases/v6/example', built: imageNow.toISOString() }, findings });
const verifyDisposition = (findings = [imageFinding], exceptions = [imageException], image = 'validator') =>
  verifyImageDispositions(imageReport(findings), exceptions,
    { image, imageId, sbomDigest: imageSbomDigest, now: imageNow });
const expectImageCode = (code, callback) => assert.throws(callback, error => error.code === code);

test('one current non-secret image finding accepts one exact live disposition', () => {
  assert.deepEqual(verifyDisposition(), { findings: 1, disposed: 1 });
  assert.deepEqual(verifyDisposition([], []), { findings: 0, disposed: 0 });
});

test('an undisposed finding and an unmatched or duplicate exception fail closed', () => {
  expectImageCode('IMAGE_FINDINGS', () => verifyDisposition([imageFinding], []));
  expectImageCode('IMAGE_EXCEPTION', () => verifyDisposition([], [imageException]));
  expectImageCode('IMAGE_EXCEPTION', () => verifyDisposition([imageFinding], [imageException, imageException]));
  expectImageCode('IMAGE_SCAN', () => verifyDisposition([imageFinding, { ...imageFinding }], [imageException]));
});

test('the disposition identity includes exact version, purl, image, type, fix state and severity', () => {
  for (const field of ['version', 'purl', 'image', 'type', 'fixState', 'severity']) {
    const changed = { ...imageException, [field]: field === 'image' ? 'kiota' : `${imageException[field]}-changed` };
    expectImageCode('IMAGE_EXCEPTION', () => verifyDisposition([imageFinding], [changed]));
  }
  expectImageCode('IMAGE_SCAN', () => verifyDisposition([imageFinding], [imageException], 'kiota'));
  expectImageCode('IMAGE_SCAN', () => verifyDisposition([{ ...imageFinding, version: '2.8.4' }]));
  expectImageCode('IMAGE_SCAN', () => verifyDisposition([{ ...imageFinding, purl: 'pkg:npm/yaml@2.8.4' }]));
  expectImageCode('IMAGE_EXCEPTION', () => verifyDisposition([{ ...imageFinding,
    version: '2.8.4', purl: 'pkg:npm/yaml@2.8.4' }]));
});

test('a Medium to High or High to Critical change requires a new disposition', () => {
  const high = { ...imageFinding, severity: 'High' };
  const critical = { ...imageFinding, severity: 'Critical' };
  const highException = { ...imageException, severity: 'High' };
  expectImageCode('IMAGE_EXCEPTION', () => verifyDisposition([high], [imageException]));
  assert.deepEqual(verifyDisposition([high], [highException]), { findings: 1, disposed: 1 });
  expectImageCode('IMAGE_EXCEPTION', () => verifyDisposition([critical], [highException]));
  assert.deepEqual(verifyDisposition([critical], [{ ...imageException, severity: 'Critical' }]),
    { findings: 1, disposed: 1 });
});

test('decoded Debian, NuGet and scoped npm PURLs bind the reported package and version', () => {
  for (const { package: packageName, version, type, purl } of [
    { package: 'libstdc++6', version: '12.2.0-14+deb12u1', type: 'deb',
      purl: 'pkg:deb/debian/libstdc%2B%2B6@12.2.0-14%2Bdeb12u1?arch=amd64&distro=debian-12' },
    { package: 'Microsoft.OpenApi.Kiota', version: '1.35.0', type: 'dotnet',
      purl: 'pkg:nuget/microsoft.openapi.kiota@1.35.0' },
    { package: '@asyncapi/parser', version: '3.6.4', type: 'npm',
      purl: 'pkg:npm/%40asyncapi/parser@3.6.4' }
  ]) {
    const finding = { ...imageFinding, package: packageName, version, type, purl };
    const exception = { ...imageException, package: packageName, version, type, purl };
    assert.deepEqual(verifyDisposition([finding], [exception]), { findings: 1, disposed: 1 });
  }
});

test('PURL package/version disagreement or malformed percent encoding fails closed', () => {
  for (const finding of [
    { ...imageFinding, purl: 'pkg:npm/other@2.8.3' },
    { ...imageFinding, purl: 'pkg:npm/yaml@2.8.4' },
    { ...imageFinding, purl: 'pkg:nuget/yaml@2.8.3' },
    { ...imageFinding, purl: 'pkg:npm/yaml@2.8.%ZZ' }
  ]) expectImageCode('IMAGE_SCAN', () => verifyDisposition([finding]));
  for (const exception of [
    { ...imageException, purl: 'pkg:npm/other@2.8.3' },
    { ...imageException, purl: 'pkg:npm/yaml@2.8.4' },
    { ...imageException, purl: 'pkg:nuget/yaml@2.8.3' },
    { ...imageException, purl: 'pkg:npm/yaml@2.8.%ZZ' }
  ]) expectImageCode('IMAGE_EXCEPTION', () => verifyDisposition([imageFinding], [exception]));
});

test('malformed, broad and ownerless image exceptions are rejected', () => {
  for (const exception of [
    { ...imageException, version: '*' },
    { ...imageException, type: '?' },
    { ...imageException, purl: 'pkg:npm/yaml@?' },
    { ...imageException, owner: '' },
    { ...imageException, severity: undefined },
    { ...imageException, approvalReference: ' ' },
    { ...imageException, compensatingControl: undefined },
    { ...imageException, unexpected: 'value' }
  ]) expectImageCode('IMAGE_EXCEPTION', () => verifyDisposition([imageFinding], [exception]));
});

test('expired, future and impossible UTC disposition times fail', () => {
  for (const exception of [
    { ...imageException, expiresAt: '2026-10-20T12:00:00Z' },
    { ...imageException, createdAt: '2026-10-20T12:00:01Z' },
    { ...imageException, createdAt: '2026-02-30T12:00:00Z' },
    { ...imageException, expiresAt: '2026-10-19T12:00:00Z' }
  ]) expectImageCode('IMAGE_EXCEPTION', () => verifyDisposition([imageFinding], [exception]));
});

test('a fixed High or Critical finding blocks even with an exact exception', () => {
  for (const severity of ['High', 'Critical']) {
    const finding = { ...imageFinding, severity, fixState: 'fixed', fixVersions: ['2.8.4'] };
    const exception = { ...imageException, fixState: 'fixed', severity };
    expectImageCode('IMAGE_FINDINGS', () => verifyDisposition([finding], [exception]));
  }
});

test('unknown fix state or severity and missing purl cannot be disposed', () => {
  for (const finding of [
    { ...imageFinding, fixState: 'unknown' },
    { ...imageFinding, severity: 'Unknown' },
    { ...imageFinding, purl: null }
  ]) expectImageCode('IMAGE_SCAN', () => verifyDisposition([finding], [imageException]));
});

test('disposition verification rejects stale image, SBOM and scanner database bindings', () => {
  const report = imageReport();
  for (const binding of [
    { image: 'kiota', imageId, sbomDigest: imageSbomDigest, now: imageNow },
    { image: 'validator', imageId: 'sha256:' + 'c'.repeat(64), sbomDigest: imageSbomDigest, now: imageNow },
    { image: 'validator', imageId, sbomDigest: 'sha256:' + 'c'.repeat(64), now: imageNow }
  ]) expectImageCode('IMAGE_SCAN', () => verifyImageDispositions(report, [imageException], binding));
  const stale = imageReport();
  stale.database.built = '2026-10-01T00:00:00Z';
  expectImageCode('IMAGE_SCAN', () => verifyImageDispositions(stale, [imageException],
    { image: 'validator', imageId, sbomDigest: imageSbomDigest, now: imageNow }));
});

test('a local exception file has no authority over the image evidence gate', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stocksense-image-exceptions-'));
  const ids = { validator: imageId, kiota: imageId };
  try {
    await imageFixture(directory, 'validator', imageId, [imageFinding]);
    await imageFixture(directory, 'kiota', imageId);
    await writeFile(join(directory, 'validator.exceptions.json'), JSON.stringify([imageException]));
    await expectCode(readImageEvidence(directory, ids), 'IMAGE_FINDINGS');
  } finally { await rm(directory, { recursive: true, force: true }); }
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
      assert.ok(document.components.length > 1);
      assert.equal(document.components[0].hashes, undefined);
      const property = document.metadata.properties.find(item => item.name === 'stocksense:pnpmComponentsWithoutHash');
      assert.equal(property.value, '1');
    });
});
