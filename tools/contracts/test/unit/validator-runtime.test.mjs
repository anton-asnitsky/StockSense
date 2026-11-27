import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { inspectRuntimeArchive, inspectRuntimeElf, parseRuntimeTar, verifyValidatorRuntimeArchive } from '../../src/validator-runtime.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function tar(files) {
  const chunks = [];
  for (const [path, value] of Object.entries(files)) {
    const entry = Buffer.isBuffer(value) || typeof value === 'string' ? { bytes: Buffer.from(value) } : value;
    const bytes = entry.bytes ?? Buffer.alloc(0);
    const header = Buffer.alloc(512);
    header.write(path, 0, 100);
    header.write('0000755\0', 100);
    header.write(bytes.length.toString(8).padStart(11, '0') + '\0', 124);
    header.fill(32, 148, 156);
    header.write(entry.kind ?? '0', 156);
    header.write(entry.link ?? '', 157, 100);
    header.write(header.reduce((sum, byte) => sum + byte, 0).toString(8).padStart(6, '0') + '\0 ', 148);
    chunks.push(header, bytes, Buffer.alloc((512 - bytes.length % 512) % 512));
  }
  return Buffer.concat([...chunks, Buffer.alloc(1024)]);
}
function elf(interpreter = null, needed = []) {
  const bytes = Buffer.alloc(1024);
  bytes.set([127, 69, 76, 70, 2, 1, 1]);
  bytes.writeUInt16LE(62, 18);
  bytes.writeBigUInt64LE(64n, 32);
  bytes.writeUInt16LE(56, 54);
  bytes.writeUInt16LE(interpreter ? 3 : 2, 56);
  const segment = (at, type, offset, size) => {
    bytes.writeUInt32LE(type, at);
    bytes.writeBigUInt64LE(BigInt(offset), at + 8);
    bytes.writeBigUInt64LE(BigInt(offset), at + 16);
    bytes.writeBigUInt64LE(BigInt(size), at + 32);
  };
  segment(64, 1, 0, bytes.length);
  segment(120, 2, 256, (needed.length + 3) * 16);
  if (interpreter) { segment(176, 3, 640, interpreter.length + 1); bytes.write(interpreter, 640); }
  const strings = Buffer.from('\0' + needed.join('\0') + '\0');
  strings.copy(bytes, 512);
  const dynamic = (index, tag, value) => { bytes.writeBigUInt64LE(BigInt(tag), 256 + index * 16); bytes.writeBigUInt64LE(BigInt(value), 264 + index * 16); };
  dynamic(0, 5, 512); dynamic(1, 10, strings.length);
  let offset = 1;
  needed.forEach((name, index) => { dynamic(index + 2, 1, offset); offset += name.length + 1; });
  return bytes;
}
function fixture() {
  const files = {
    'etc/os-release': 'ID=alpine\nVERSION_ID=3.24.0\n',
    'nodejs/bin/node': elf('/lib/ld-musl-x86_64.so.1', ['libc.musl-x86_64.so.1']),
    'lib/ld-musl-x86_64.so.1': elf(),
    'lib/libc.musl-x86_64.so.1': { kind: '2', link: 'ld-musl-x86_64.so.1' },
    'usr/lib/libgcc_s.so.1': elf(),
    'usr/lib/libstdc++.so.6.0.34': elf()
  };
  const packages = { musl: '1.2.6-r3', libgcc: '15.2.0-r5', 'libstdc++': '15.2.0-r5' };
  const packageChecksums = { musl: 'musl-identity', libgcc: 'gcc-identity', 'libstdc++': 'stdc-identity' };
  files['lib/apk/db/installed'] = Object.entries(packages).map(([name, version]) =>
    `P:${name}\nV:${version}\nA:x86_64\nC:${packageChecksums[name]}\n`).join('\n');
  const policy = { apkDatabaseSha256: digest(files['lib/apk/db/installed']), packages, packageChecksums, files: Object.fromEntries(Object.entries(files)
    .filter(([, value]) => Buffer.isBuffer(value)).map(([path, value]) => [path, digest(value)])) };
  return { files, policy };
}
test('complete synthetic musl closure resolves actual ELF dependencies; production pins reject it', () => {
  const { files, policy } = fixture();
  const result = inspectRuntimeArchive(tar(files), policy);
  assert.equal(result.binaries.length, 4);
  assert.equal(result.libc, 'musl');
  assert.throws(() => verifyValidatorRuntimeArchive(tar(files)), /APK database/);
});
test('tar rejects traversal, checksum corruption, truncation and unsupported entries', () => {
  assert.throws(() => parseRuntimeTar(tar({ '../escape': 'x' })), /unsafe archive path/);
  const bytes = tar({ file: 'ok' }); bytes[1] ^= 1;
  assert.throws(() => parseRuntimeTar(bytes), /checksum/);
  assert.throws(() => parseRuntimeTar(tar({ file: 'ok' }).subarray(0, 1024)), /terminator/);
  assert.throws(() => parseRuntimeTar(tar({ file: { kind: '3' } })), /unsupported archive entry/);
});
test('only Docker exact mount-table link may target the runtime kernel proc mount', () => {
  const { files, policy } = fixture();
  const value = { kind: '2', link: '/proc/mounts' };
  assert.deepEqual(inspectRuntimeArchive(tar({ ...files, 'etc/mtab': value }), policy).virtualLinks,
    [{ path: 'etc/mtab', target: '/proc/mounts' }]);
  for (const extra of [{ 'etc/other': value }, { 'etc/mtab': { kind: '2', link: '/proc/other' } },
    { 'etc/mtab': { kind: '1', link: '/proc/mounts' } },
    { 'etc/mtab': value, 'etc/mtab/child': 'x' }]) {
    assert.throws(() => inspectRuntimeArchive(tar({ ...files, ...extra }), policy), /missing runtime path|non-directory/);
  }
});
test('tar rejects duplicate paths and unsafe PAX overrides', () => {
  const one = tar({ file: 'x' });
  assert.throws(() => parseRuntimeTar(Buffer.concat([one.subarray(0, 1024), one])), /duplicate/);
  assert.throws(() => parseRuntimeTar(tar({ metadata: { kind: 'x', bytes: Buffer.from('99 path=x\n') }, file: 'x' })), /PAX/);
  assert.throws(() => parseRuntimeTar(tar({ metadata: { kind: 'g', bytes: Buffer.from('12 path=foo\n') } })), /global PAX/);
});
for (const [label, extra, pattern] of [
  ['escaping link', { bad: { kind: '2', link: '../outside' } }, /unsafe archive path/],
  ['dangling link', { bad: { kind: '2', link: 'missing' } }, /missing runtime path/],
  ['cyclic links', { a: { kind: '2', link: 'b' }, b: { kind: '2', link: 'a' } }, /link cycle/],
  ['file ancestor', { file: 'x', 'file/child': 'y' }, /non-directory/],
  ['glibc library', { 'lib/libc.so.6': 'x' }, /forbidden/],
  ['shell', { 'bin/sh': 'shell' }, /forbidden/],
  ['nested npm', { 'opt/deps/npm/package.json': '{"name":"npm"}' }, /package manager/],
  ['unexpected native addon', { 'opt/deps/addon.node': elf() }, /unexpected ELF/],
  ['non-ELF native addon', { 'opt/deps/addon.node': 'fake' }, /non-ELF/]
]) test(`runtime refuses ${label}`, () => {
  const { files, policy } = fixture();
  assert.throws(() => inspectRuntimeArchive(tar({ ...files, ...extra }), policy), pattern);
});
test('runtime refuses changed package version, identity and file checksum', () => {
  for (const mutate of [text => text.replace('1.2.6-r3', '0.0.0'), text => text.replace('musl-identity', 'forged'),
    text => text.replace('C:musl-identity\n', 'C:musl-identity\nF:lib\nR:ld-musl-x86_64.so.1\nZ:Q1AAAAAAAAAAAAAAAAAAAAAAAAAAA=\n')]) {
    const { files, policy } = fixture();
    files['lib/apk/db/installed'] = mutate(files['lib/apk/db/installed']);
    assert.throws(() => inspectRuntimeArchive(tar(files), policy), /APK/);
  }
});
test('runtime validates honest package-file checksums', () => {
  const { files, policy } = fixture();
  const checksum = createHash('sha1').update(files['lib/ld-musl-x86_64.so.1']).digest('base64');
  files['lib/apk/db/installed'] = files['lib/apk/db/installed'].replace('C:musl-identity\n',
    `C:musl-identity\nF:lib\nR:ld-musl-x86_64.so.1\nZ:Q1${checksum}\n`);
  policy.apkDatabaseSha256 = digest(files['lib/apk/db/installed']);
  assert.equal(inspectRuntimeArchive(tar(files), policy).packages.length, 3);
  for (const pattern of [/R:ld-musl-x86_64.so.1\n/, /Z:Q1[^\n]+\n/]) {
    assert.throws(() => inspectRuntimeArchive(tar({ ...files,
      'lib/apk/db/installed': files['lib/apk/db/installed'].replace(pattern, '') }), policy), /APK database/);
  }
});
test('runtime refuses wrong interpreter, missing dynamic dependency and changed binary', () => {
  for (const [bytes, expected] of [[elf('/lib/ld-linux-x86-64.so.2'), /non-musl/],
    [elf('/lib/ld-musl-x86_64.so.1', ['missing.so']), /missing ELF dependency/]]) {
    const { files, policy } = fixture(); files['nodejs/bin/node'] = bytes;
    policy.files['nodejs/bin/node'] = digest(bytes);
    assert.throws(() => inspectRuntimeArchive(tar(files), policy), expected);
  }
  const { files, policy } = fixture(); files['nodejs/bin/node'][1000] = 1;
  assert.throws(() => inspectRuntimeArchive(tar(files), policy), /unexpected ELF bytes/);
});
test('ELF refuses architecture, bounds, unterminated dynamic tables and bad string references', () => {
  for (const mutate of [bytes => { bytes[4] = 1; }, bytes => { bytes.writeBigUInt64LE(99999n, 32); },
    bytes => { bytes.writeBigUInt64LE(99999n, 64 + 32); },
    bytes => { bytes.writeBigUInt64LE(1n, 304); },
    bytes => { bytes.writeBigUInt64LE(99999n, 264); }]) {
    const bytes = elf(null, ['libc.so']); mutate(bytes);
    assert.throws(() => inspectRuntimeElf(bytes), /ELF/);
  }
});
