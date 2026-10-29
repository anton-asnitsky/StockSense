import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { collectKiotaRuntimeManifest, normalizeKiotaRuntimeManifest } from '../../src/kiota-runtime-manifest.mjs';

const id = letter => `sha256:${letter.repeat(64)}`;
const hash = value => `sha256:${createHash('sha256').update(value).digest('hex')}`;
const config = () => ({ Entrypoint: ['/opt/kiota/kiota'], Cmd: null,
  Env: ['HOME=/tmp', 'DOTNET_NOLOGO=1'], User: '65532:65532', WorkingDir: '/repo' });
const sbom = imageId => ({ bomFormat: 'CycloneDX', specVersion: '1.6',
  metadata: { properties: [{ name: 'stocksense:imageId', value: imageId }] },
  components: [{ type: 'library', name: 'Microsoft.OpenApi.Kiota', version: '1.35.0',
    purl: 'pkg:nuget/Microsoft.OpenApi.Kiota@1.35.0' }] });
const entries = () => [
  { path: 'opt/kiota', kind: 'directory', mode: 0o755 },
  { path: 'opt/kiota/kiota', kind: 'file', mode: 0o755, size: 5, sha256: hash('kiota') },
  { path: 'opt/kiota-probe', kind: 'directory', mode: 0o755 },
  { path: 'opt/kiota-probe/probe.dll', kind: 'file', mode: 0o644, size: 5, sha256: hash('probe') }
];

test('canonical content digest is independent of image ID, order and timestamps', () => {
  const a = normalizeKiotaRuntimeManifest({ entries: entries(), config: config(), sbom: sbom(id('a')) });
  const b = normalizeKiotaRuntimeManifest({ entries: entries().reverse(),
    config: { ...config(), Env: [...config().Env].reverse() }, sbom: sbom(id('b')) });
  assert.equal(a.schema, 'stocksense-kiota-runtime-v1');
  assert.equal(a.digest, b.digest);
  assert.equal(a.totalBytes, 10);
});

test('real Syft-style file components are excluded while duplicate package identities remain', () => {
  const full = sbom(id('a'));
  full.components.push({ type: 'file', name: '/opt/kiota/kiota' });
  full.components.push({ ...full.components[0] });
  const normalized = normalizeKiotaRuntimeManifest({ entries: entries(), config: config(), sbom: full });
  assert.equal(normalized.packages.length, 2);
  assert.ok(normalized.packages.every(item => item.purl ===
    'pkg:nuget/Microsoft.OpenApi.Kiota@1.35.0'));
  assert.throws(() => normalizeKiotaRuntimeManifest({ entries: entries(), config: config(),
    sbom: { ...full, components: [...full.components, { type: 'library', name: 'Unknown' }] } }),
  /package identity/);
});

test('file bytes, mode, executable, Config and package identities change digest', () => {
  const base = normalizeKiotaRuntimeManifest({ entries: entries(), config: config(), sbom: sbom(id('a')) });
  const variants = [
    { entries: entries().map(e => e.path.endsWith('/kiota') && e.kind === 'file'
      ? { ...e, sha256: hash('other') } : e) },
    { entries: entries().map(e => e.path.endsWith('/kiota') && e.kind === 'file'
      ? { ...e, mode: 0o700 } : e) },
    { entries: [...entries(), { path: 'opt/kiota/new-tool', kind: 'file', mode: 0o755,
      size: 3, sha256: hash('new') }] },
    { config: { ...config(), WorkingDir: '/elsewhere' } },
    { sbom: { ...sbom(id('a')), components: [{ ...sbom(id('a')).components[0],
      version: '1.35.1', purl: 'pkg:nuget/Microsoft.OpenApi.Kiota@1.35.1' }] } }
  ];
  for (const variant of variants) {
    const changed = normalizeKiotaRuntimeManifest({ entries: entries(), config: config(),
      sbom: sbom(id('a')), ...variant });
    assert.notEqual(changed.digest, base.digest);
  }
});

test('malformed paths, missing parents, unsafe links and limits fail closed', () => {
  const good = { entries: entries(), config: config(), sbom: sbom(id('a')) };
  for (const badPath of ['opt/kiota/../escape', 'opt/kiota//file', '/opt/kiota/file',
    'opt/kiota\\file', 'opt/kiota/\u0000file', 'opt/other/file']) {
    assert.throws(() => normalizeKiotaRuntimeManifest({ ...good,
      entries: [...entries(), { path: badPath, kind: 'file', mode: 0o644,
        size: 1, sha256: hash('x') }] }));
  }
  assert.throws(() => normalizeKiotaRuntimeManifest({ ...good,
    entries: [...entries(), { path: 'opt/kiota/sub/file', kind: 'file', mode: 0o644,
      size: 1, sha256: hash('x') }] }), /parent/);
  for (const target of ['/etc/passwd', '../../outside', '../kiota-probe/probe.dll']) {
    assert.throws(() => normalizeKiotaRuntimeManifest({ ...good,
      entries: [...entries(), { path: 'opt/kiota/link', kind: 'symlink', mode: 0o777,
        target }] }), /symlink/);
  }
  assert.throws(() => normalizeKiotaRuntimeManifest({ ...good,
    entries: [...entries(), { path: 'opt/kiota/huge', kind: 'file', mode: 0o644,
      size: 129 * 1024 * 1024, sha256: hash('x') }] }), /file entry/);
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-runtime-test-'));
  mkdirSync(join(root, 'kiota'));
  mkdirSync(join(root, 'kiota-probe'));
  writeFileSync(join(root, 'kiota', 'kiota'), 'kiota');
  writeFileSync(join(root, 'kiota-probe', 'probe.dll'), 'probe');
  return root;
}

function fakeDocker(root, imageId, { failCopy = false, failCleanup = false,
  wrongImage = false } = {}) {
  const calls = [];
  const destinations = [];
  const spawn = (_command, args) => {
    calls.push(args);
    const result = stdout => ({ status: 0, stdout, error: null });
    if (args[0] === 'image') return result(JSON.stringify({ Id: imageId, Config: config() }));
    if (args[0] === 'create') return result('c'.repeat(64));
    if (args[0] === 'container') return result(wrongImage ? id('f') : imageId);
    if (args[0] === 'cp') {
      if (failCopy) return { status: 1, stdout: '', error: null };
      if (args[2] === '-') return result(Buffer.alloc(1024));
      const from = args[1].endsWith('/kiota') ? 'kiota' : 'kiota-probe';
      destinations.push(args[2]);
      cpSync(join(root, from), args[2], { recursive: true });
      return result('');
    }
    if (args[0] === 'rm') return failCleanup
      ? { status: 1, stdout: '', error: null } : result('');
    throw new Error(`unexpected Docker command: ${args.join(' ')}`);
  };
  return { spawn, calls, destinations };
}

test('collector binds exact inspected and created image, copies both trees and cleans up', async () => {
  const root = await fixture();
  try {
    const imageId = id('a');
    const docker = fakeDocker(root, imageId);
    const record = await collectKiotaRuntimeManifest({ imageId, sbom: sbom(imageId),
      spawn: docker.spawn });
    assert.equal(record.imageId, imageId);
    assert.equal(record.sbomDigest, hash(JSON.stringify(sbom(imageId), null, 2) + '\n'));
    assert.deepEqual(record.entries.map(e => e.path),
      ['opt/kiota', 'opt/kiota-probe', 'opt/kiota-probe/probe.dll', 'opt/kiota/kiota']
        .sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b))));
    assert.equal(docker.calls.filter(args => args[0] === 'cp').length, 4);
    assert.equal(docker.calls.at(-1)[0], 'rm');
    assert.ok(docker.destinations.every(path => !existsSync(path)));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('two image IDs have the same collected content digest; an added unreported executable changes it', async () => {
  const root = await fixture();
  try {
    const a = await collectKiotaRuntimeManifest({ imageId: id('a'), sbom: sbom(id('a')),
      spawn: fakeDocker(root, id('a')).spawn });
    const b = await collectKiotaRuntimeManifest({ imageId: id('b'), sbom: sbom(id('b')),
      spawn: fakeDocker(root, id('b')).spawn });
    assert.equal(a.digest, b.digest);
    writeFileSync(join(root, 'kiota', 'unreported-tool'), 'new');
    chmodSync(join(root, 'kiota', 'unreported-tool'), 0o755);
    const changed = await collectKiotaRuntimeManifest({ imageId: id('b'), sbom: sbom(id('b')),
      spawn: fakeDocker(root, id('b')).spawn });
    assert.notEqual(changed.digest, b.digest);
    assert.ok(changed.entries.some(entry => entry.path === 'opt/kiota/unreported-tool'));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('collector rejects image mismatch and copy failure, then cleans container and scratch', async () => {
  const root = await fixture();
  try {
    for (const option of [{ wrongImage: true }, { failCopy: true }]) {
      const docker = fakeDocker(root, id('a'), option);
      await assert.rejects(collectKiotaRuntimeManifest({ imageId: id('a'),
        sbom: sbom(id('a')), spawn: docker.spawn }), AggregateError);
      assert.equal(docker.calls.at(-1)[0], 'rm');
      assert.ok(docker.destinations.every(path => !existsSync(path)));
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('cleanup failure rejects an otherwise valid manifest', async () => {
  const root = await fixture();
  try {
    const docker = fakeDocker(root, id('a'), { failCleanup: true });
    await assert.rejects(collectKiotaRuntimeManifest({ imageId: id('a'),
      sbom: sbom(id('a')), spawn: docker.spawn }), /cleanup failed/);
    assert.equal(docker.calls.at(-1)[0], 'rm');
    assert.ok(docker.destinations.every(path => !existsSync(path)));
  } finally { await rm(root, { recursive: true, force: true }); }
});
