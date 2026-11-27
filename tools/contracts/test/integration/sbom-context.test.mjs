import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSbomSourceContext } from '../../src/sbom-context.mjs';
import { readImageEvidence, SCANNERS, sha256 } from '../../src/image-evidence.mjs';
import { normalizeKiotaRuntimeManifest } from '../../src/kiota-runtime-manifest.mjs';
import { sourceTreeDigest } from '../../src/source-digest.mjs';

const packageRoot = fileURLToPath(new URL('../../', import.meta.url));
const repositoryRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const image = `sha256:${'a'.repeat(64)}`;

function run(file, args, cwd, env = process.env) {
  return spawnSync(file, args, { cwd, env, shell: false, windowsHide: true,
    timeout: 30_000, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8' });
}
function git(root, args) {
  const result = run('git', args, root);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

async function fixture(root) {
  const contracts = join(root, 'tools/contracts');
  await mkdir(contracts, { recursive: true });
  for (const path of ['src', 'scripts', 'package.json', 'pnpm-lock.yaml',
    'Dockerfile.validator', 'Dockerfile.generator-kiota', 'kiota-runtime-inputs.json']) {
    await cp(join(packageRoot, path), join(contracts, path), { recursive: true });
  }
  await mkdir(join(root, '.github/workflows'), { recursive: true });
  for (const name of ['contracts-required.yml', 'release-evidence.yml']) {
    await cp(join(repositoryRoot, '.github/workflows', name), join(root, '.github/workflows', name));
  }
  await writeFile(join(root, '.gitignore'), 'node_modules/\ndist/\n');
  await symlink(join(packageRoot, 'node_modules'), join(contracts, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir');
  git(root, ['init', '--quiet']);
  git(root, ['add', '.']);
  git(root, ['-c', 'user.name=SBOM fixture', '-c', 'user.email=sbom@example.invalid',
    'commit', '--quiet', '-m', 'isolated fixture']);
  const revision = git(root, ['rev-parse', 'HEAD']);
  const context = readSbomSourceContext(root, revision);
  const directory = join(contracts, 'dist/image-evidence');
  await mkdir(directory, { recursive: true });
  let runtimeDigest;
  for (const name of ['validator', 'kiota']) {
    const sbom = { bomFormat: 'CycloneDX', specVersion: '1.6',
      metadata: { properties: [{ name: 'stocksense:imageId', value: image }] },
      components: [{ type: 'library', name: name === 'kiota' ? 'Microsoft.OpenApi.Kiota' : 'yaml',
        version: '1.0.0', purl: name === 'kiota' ? 'pkg:nuget/Microsoft.OpenApi.Kiota@1.0.0' : 'pkg:npm/yaml@1.0.0' }] };
    const bytes = Buffer.from(JSON.stringify(sbom) + '\n');
    await writeFile(join(directory, `${name}.cdx.json`), bytes);
    await writeFile(join(directory, `${name}.scan.json`), JSON.stringify({
      schema: 'stocksense-image-scan-v2', image: name, imageId: image, sbomDigest: sha256(bytes),
      scanner: SCANNERS.grype, status: 'completed', database: { status: 'valid',
        schemaVersion: 'v6.1.9', source: 'https://grype.anchore.io/databases/v6/example',
        built: new Date().toISOString() }, findings: []
    }) + '\n');
    if (name === 'kiota') {
      const normalized = normalizeKiotaRuntimeManifest({ entries: [
        { path: 'rootfs', kind: 'directory', mode: 0o755 },
        { path: 'rootfs/kiota', kind: 'file', mode: 0o755, size: 5, sha256: sha256('kiota') }
      ], config: { Entrypoint: ['/kiota'], Cmd: null, Env: [], User: '65532', WorkingDir: '/' }, sbom });
      runtimeDigest = normalized.digest;
      await writeFile(join(directory, 'kiota.runtime.json'), JSON.stringify({ imageId: image,
        sbomDigest: sha256(bytes), ...normalized }, null, 2) + '\n');
    }
  }
  const { records } = await readImageEvidence(directory, { validator: image, kiota: image });
  const receipt = { schema: 'stocksense-image-ledger-verification-v2', ...context,
    runtimeManifestDigest: runtimeDigest, ledgerSchema: 'stocksense-image-exceptions-v2',
    sourceDigest: await sourceTreeDigest(join(contracts, 'src')), mainSha: 'b'.repeat(40),
    ledgerBlobSha: 'c'.repeat(40), images: records.map(record => ({ image: record.name,
      imageId: record.imageId, sbomDigest: record.sbomDigest, scanDigest: record.scanDigest,
      findings: 0, disposed: 0 })) };
  const receiptPath = join(directory, 'ledger-verification.json');
  await writeFile(receiptPath, JSON.stringify(receipt) + '\n');
  const env = { ...process.env, STOCKSENSE_STANDARDS_IMAGE: image, STOCKSENSE_KIOTA_IMAGE: image,
    STOCKSENSE_IMAGE_EVIDENCE_DIR: directory, STOCKSENSE_CANDIDATE_REVISION: revision };
  const execute = () => run(process.execPath, [join(contracts, 'scripts/build-sbom.mjs'),
    join(contracts, 'dist/sbom.json')], root, env);
  return { contracts, revision, context, receipt, receiptPath, env, execute };
}

test('production SBOM entry point derives Git context and rejects valid-format receipt tampering', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-sbom-context-'));
  try {
    const data = await fixture(root);
    const good = data.execute();
    assert.equal(good.status, 0, good.stderr);
    for (const [key, value] of [
      ['candidateGitTreeSha', 'f'.repeat(40)],
      ['candidateTreeDigest', `sha256:${'f'.repeat(64)}`],
      ['executionFingerprint', `sha256:${'f'.repeat(64)}`],
      ['runtimeManifestDigest', `sha256:${'f'.repeat(64)}`]
    ]) {
      await writeFile(data.receiptPath, JSON.stringify({ ...data.receipt, [key]: value }) + '\n');
      const result = data.execute();
      assert.notEqual(result.status, 0, `accepted changed ${key}`);
      assert.match(result.stderr, /IMAGE_LEDGER|Image ledger/);
    }
    await writeFile(data.receiptPath, JSON.stringify(data.receipt) + '\n');
    data.env.STOCKSENSE_CANDIDATE_REVISION = 'e'.repeat(40);
    assert.notEqual(data.execute().status, 0);
    data.env.STOCKSENSE_CANDIDATE_REVISION = data.revision;
    // Dirty tracked source and a newly introduced protected file both fail.
    const source = join(data.contracts, 'src/sbom.mjs');
    const original = await readFile(source);
    await writeFile(source, Buffer.concat([original, Buffer.from('\n// dirty\n')]));
    assert.notEqual(data.execute().status, 0);
    await writeFile(source, original);
    const added = join(data.contracts, 'new-executor.mjs');
    await writeFile(added, 'export const unexpected = true;\n');
    assert.notEqual(data.execute().status, 0);
    await rm(added);
    const final = data.execute();
    assert.equal(final.status, 0, final.stderr);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('v1 production SBOM keeps its existing dirty-checkout and no-Git behavior', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-sbom-v1-context-'));
  try {
    const data = await fixture(root);
    const receipt = { ...data.receipt, schema: 'stocksense-image-ledger-verification-v1' };
    delete receipt.executionFingerprint;
    delete receipt.runtimeManifestDigest;
    delete receipt.ledgerSchema;
    const useReceipt = value => writeFile(data.receiptPath, JSON.stringify(value) + '\n');
    const tracked = join(data.contracts, 'scripts/setup-oasdiff.mjs');
    const original = await readFile(tracked);
    await writeFile(tracked, Buffer.concat([original, Buffer.from('\n// dirty fixture\n')]));
    const added = join(data.contracts, 'untracked-protected.mjs');
    await writeFile(added, 'export const fixture = true;\n');
    assert.notEqual(data.execute().status, 0, 'v2 accepted dirty protected paths');
    await useReceipt(receipt);
    const dirtyV1 = data.execute();
    assert.equal(dirtyV1.status, 0, dirtyV1.stderr);
    await writeFile(tracked, original);
    await rm(added);
    await rename(join(root, '.git'), join(root, 'fixture-git-metadata'));
    const noGitV1 = data.execute();
    assert.equal(noGitV1.status, 0, noGitV1.stderr);
    await useReceipt(data.receipt);
    assert.notEqual(data.execute().status, 0, 'v2 accepted a missing Git checkout');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('source context refuses a missing repository and invalid revision before claiming bindings', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-sbom-no-git-'));
  try {
    assert.throws(() => readSbomSourceContext(root, 'bad'), error => error.code === 'IMAGE_LEDGER');
    assert.throws(() => readSbomSourceContext(root, 'a'.repeat(40)), error => error.code === 'IMAGE_LEDGER');
  } finally { await rm(root, { recursive: true, force: true }); }
});
