import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import { TextDecoder } from 'node:util';

// Digests are independently measured from the authenticated Node archive and
// the signed, checksum-pinned Alpine APK closure in Dockerfile.validator.
export const VALIDATOR_RUNTIME = Object.freeze({
  apkDatabaseSha256: '33e900e92ac3e3f90fc68435956a182ffb4352c645092680f9da7f2f0c689e86',
  node: '7e027679034844bb06f53bead732673553cf5bb0de424bbbd257b35c989d34b0',
  files: Object.freeze({
    'nodejs/bin/node': '7e027679034844bb06f53bead732673553cf5bb0de424bbbd257b35c989d34b0',
    'lib/ld-musl-x86_64.so.1': '095b047c631447e4fa50401fa7ffce01f678587040d65ba18c574981dc630de5',
    'usr/lib/libgcc_s.so.1': '5ea51dd885b6fc691eccc569d0bda739204204f6161e97075b26dc9c050d1ca1',
    'usr/lib/libstdc++.so.6.0.34': '67a940194aec6c44c3eb47a98e44c53d248e4dac5f4eb57c0971c0d6286eafe5'
  }),
  packages: Object.freeze({ musl: '1.2.6-r3', libgcc: '15.2.0-r5', 'libstdc++': '15.2.0-r5' }),
  packageChecksums: Object.freeze({ musl: 'Q1dw6DBNlY3O2Y12mX356Podtcoy8=',
    libgcc: 'Q1N5wVbFPgzBQOh8ecCj3SK27lFVI=', 'libstdc++': 'Q1X3oq12RhKLoCzA1vuUZytoRWSNU=' })
});
/** @returns {never} */
const fail = message => { throw new Error(`Validator runtime refused: ${message}`); };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const decoder = new TextDecoder('utf-8', { fatal: true });
const text = bytes => decoder.decode(bytes);
const string = bytes => text(bytes.subarray(0, bytes.indexOf(0) < 0 ? bytes.length : bytes.indexOf(0)));
const number = bytes => {
  const value = string(bytes).trim();
  if (!/^[0-7]+$/.test(value)) fail('invalid archive number');
  const result = Number.parseInt(value, 8);
  if (!Number.isSafeInteger(result)) fail('archive number overflow');
  return result;
};
function canonical(path) {
  while (path.startsWith('./')) path = path.slice(2);
  path = path.replace(/\/$/, '');
  if (!path || path.startsWith('/') || /[\\\x00-\x1f\x7f]/.test(path) ||
      path.split('/').some(part => !part || part === '.' || part === '..')) fail('unsafe archive path');
  return path;
}
function pax(bytes) {
  const values = {};
  let offset = 0;
  while (offset < bytes.length) {
    const space = bytes.indexOf(32, offset);
    if (space < offset || space - offset > 10) fail('invalid PAX length');
    const countText = text(bytes.subarray(offset, space));
    if (!/^[1-9][0-9]*$/.test(countText)) fail('invalid PAX length');
    const count = Number(countText);
    if (!Number.isSafeInteger(count) || count <= space - offset + 2 || offset + count > bytes.length ||
        bytes[offset + count - 1] !== 10) fail('truncated PAX record');
    const record = text(bytes.subarray(space + 1, offset + count - 1));
    const equals = record.indexOf('=');
    if (equals < 1 || Object.hasOwn(values, record.slice(0, equals))) fail('duplicate or invalid PAX key');
    values[record.slice(0, equals)] = record.slice(equals + 1);
    offset += count;
  }
  return values;
}

/** Parse a Docker export without extracting any archive entry on the host. */
export function parseRuntimeTar(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 1024 || bytes.length > 512 * 1024 * 1024 ||
      bytes.length % 512) fail('invalid archive size');
  const entries = new Map();
  let extended = {};
  let offset = 0;
  while (offset + 512 <= bytes.length) {
    const header = bytes.subarray(offset, offset + 512);
    if (header.every(byte => byte === 0)) {
      if (Object.keys(extended).length || offset + 1024 > bytes.length ||
          !bytes.subarray(offset).every(byte => byte === 0)) fail('invalid archive terminator');
      return entries;
    }
    let checksum = 0;
    for (let i = 0; i < 512; i++) checksum += i >= 148 && i < 156 ? 32 : header[i];
    if (checksum !== number(header.subarray(148, 156))) fail('archive checksum mismatch');
    const size = number(header.subarray(124, 136));
    if (size > 256 * 1024 * 1024 || offset + 512 + size > bytes.length) fail('truncated archive body');
    const body = bytes.subarray(offset + 512, offset + 512 + size);
    const kind = header[156] === 0 ? '0' : String.fromCharCode(header[156]);
    offset += 512 + Math.ceil(size / 512) * 512;
    if (kind === 'x' || kind === 'g') {
      if (size > 64 * 1024 || Object.keys(extended).length) fail('unsupported archive extension');
      const metadata = pax(body);
      if (kind === 'g') {
        if (['path', 'linkpath', 'size'].some(key => Object.hasOwn(metadata, key))) fail('unsafe global PAX');
      } else extended = metadata;
      continue;
    }
    if (!['0', '1', '2', '5'].includes(kind)) fail('unsupported archive entry');
    const prefix = string(header.subarray(345, 500));
    const name = string(header.subarray(0, 100));
    const path = canonical(extended.path ?? (prefix ? `${prefix}/${name}` : name));
    const link = extended.linkpath ?? string(header.subarray(157, 257));
    if (extended.size !== undefined && String(size) !== extended.size) fail('ambiguous archive size');
    extended = {};
    if (entries.has(path) || entries.size >= 100_000 || (kind !== '0' && size !== 0)) fail('duplicate or malformed archive entry');
    if ((kind === '1' || kind === '2') && (!link || /[\\\x00-\x1f\x7f]/.test(link))) fail('invalid archive link');
    entries.set(path, { path, kind, link, mode: number(header.subarray(100, 108)), bytes: body });
  }
  fail('missing archive terminator');
}

/** Decode the ELF64 loader and dynamic dependencies directly from file bytes. */
export function inspectRuntimeElf(bytes) {
  if (bytes.length < 64 || !bytes.subarray(0, 4).equals(Buffer.from([127, 69, 76, 70])) ||
      bytes[4] !== 2 || bytes[5] !== 1 || bytes[6] !== 1 || bytes.readUInt16LE(18) !== 62) fail('wrong ELF architecture');
  const read64 = offset => {
    if (offset + 8 > bytes.length) fail('truncated ELF integer');
    const value = bytes.readBigUInt64LE(offset);
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) fail('ELF integer overflow');
    return Number(value);
  };
  const start = read64(32);
  const width = bytes.readUInt16LE(54);
  const count = bytes.readUInt16LE(56);
  if (width !== 56 || !count || count > 256 || start < 64 || start + count * width > bytes.length) fail('invalid ELF program table');
  const segments = [];
  for (let i = 0; i < count; i++) {
    const at = start + width * i;
    const segment = { type: bytes.readUInt32LE(at), offset: read64(at + 8), address: read64(at + 16), size: read64(at + 32) };
    if (segment.offset + segment.size > bytes.length) fail('truncated ELF segment');
    segments.push(segment);
  }
  const interpreters = segments.filter(segment => segment.type === 3);
  if (interpreters.length > 1) fail('multiple ELF interpreters');
  if (interpreters.some(segment => segment.size < 2 || bytes[segment.offset + segment.size - 1] !== 0)) fail('unterminated ELF interpreter');
  const interpreter = interpreters.length ? string(bytes.subarray(interpreters[0].offset, interpreters[0].offset + interpreters[0].size)) : null;
  const dynamic = segments.filter(segment => segment.type === 2);
  if (dynamic.length > 1) fail('multiple ELF dynamic segments');
  const needed = [];
  const paths = [];
  let strings = null;
  let stringSize = null;
  if (dynamic.length) {
    if (dynamic[0].size % 16) fail('invalid ELF dynamic table');
    let terminated = false;
    for (let at = dynamic[0].offset; at < dynamic[0].offset + dynamic[0].size; at += 16) {
      const tag = read64(at);
      const value = read64(at + 8);
      if (tag === 0) { terminated = true; break; }
      if (tag === 1) needed.push(value);
      if (tag === 5) { if (strings !== null) fail('duplicate ELF string table'); strings = value; }
      if (tag === 10) { if (stringSize !== null) fail('duplicate ELF string size'); stringSize = value; }
      if (tag === 15 || tag === 29) paths.push(value);
    }
    if (!terminated) fail('unterminated ELF dynamic table');
  }
  const loads = segments.filter(segment => segment.type === 1 && strings !== null &&
    strings >= segment.address && strings < segment.address + segment.size);
  const getString = value => {
    if (loads.length !== 1 || strings === null || stringSize === null || value >= stringSize) fail('invalid ELF string reference');
    const at = loads[0].offset + strings - loads[0].address + value;
    const end = bytes.indexOf(0, at);
    if (end < at || end >= loads[0].offset + loads[0].size || end - at >= stringSize - value) fail('unterminated ELF string');
    return text(bytes.subarray(at, end));
  };
  return { architecture: 'x86_64', interpreter, needed: needed.map(getString), searchPaths: paths.map(getString) };
}

/** Independently inspect all exported bytes before running the candidate. */
export function verifyValidatorRuntimeArchive(bytes) {
  return inspectRuntimeArchive(bytes, VALIDATOR_RUNTIME);
}

// Pure inspection seam for tests. Production callers use the fixed-policy
// wrapper above; policy is trusted source configuration, never candidate data.
export function inspectRuntimeArchive(bytes, policy) {
  const entries = parseRuntimeTar(bytes);
  const resolve = (path, visited = new Set()) => {
    path = canonical(path);
    if (visited.has(path) || visited.size > 32) fail('archive link cycle');
    visited.add(path);
    const entry = entries.get(path);
    if (!entry) fail(`missing runtime path ${path}`);
    if (entry.kind === '1' || entry.kind === '2') {
      const target = entry.kind === '1' ? entry.link : posix.join(posix.dirname(path), entry.link);
      return resolve(entry.link.startsWith('/') ? entry.link.slice(1) : posix.normalize(target), visited);
    }
    return entry;
  };
  const regular = path => {
    const entry = resolve(path);
    if (entry.kind !== '0') fail(`runtime path is not a regular file: ${path}`);
    return entry;
  };
  const virtualLinks = [];
  // Validate even unused links: no exported symlink may escape the image root.
  for (const entry of entries.values()) {
    let parent = posix.dirname(entry.path);
    while (parent !== '.') {
      if (entries.has(parent) && entries.get(parent).kind !== '5') fail('archive entry below a non-directory');
      parent = posix.dirname(parent);
    }
    if (entry.kind === '1' || entry.kind === '2') {
      // Docker's container init layer replaces /etc/mtab with this exact link.
      // proc is a kernel mount at execution, deliberately absent from export.
      // Do not generalize this to arbitrary missing targets or descendants.
      if (entry.path === 'etc/mtab' && entry.kind === '2' && entry.link === '/proc/mounts' && !entries.has('proc/mounts')) {
        virtualLinks.push({ path: entry.path, target: entry.link });
        continue;
      }
      const target = entry.link.startsWith('/') ? entry.link.slice(1) :
        posix.normalize(entry.kind === '1' ? entry.link : posix.join(posix.dirname(entry.path), entry.link));
      canonical(target);
      resolve(entry.path);
    }
  }
  const osRelease = text(regular('etc/os-release').bytes);
  if (!/^ID=alpine$/m.test(osRelease) || !/^VERSION_ID=3\.24\.[0-9]+$/m.test(osRelease)) fail('unexpected runtime distribution');
  const installedBytes = regular('lib/apk/db/installed').bytes;
  if (hash(installedBytes) !== policy.apkDatabaseSha256) fail('APK database differs from authenticated installation');
  const installed = text(installedBytes);
  const packages = installed.trim().split(/\n\n+/).map(block => {
    const field = key => block.split('\n').filter(line => line.startsWith(`${key}:`));
    if (['P', 'V', 'A', 'C'].some(key => field(key).length !== 1)) fail('ambiguous APK metadata');
    let directory = '';
    let path = null;
    for (const line of block.split('\n')) {
      if (line.startsWith('F:')) { directory = line.slice(2); path = null; }
      if (line.startsWith('R:')) path = canonical(posix.join(directory, line.slice(2)));
      if (line.startsWith('Z:')) {
        if (path === null || !/^Z:Q1[A-Za-z0-9+/]{27}=$/.test(line)) fail('invalid APK file checksum');
        const entry = entries.get(path);
        if (!entry || !['0', '1', '2'].includes(entry.kind)) fail('missing APK-owned file');
        const fileBytes = entry.kind === '2' ? Buffer.from(entry.link) : regular(path).bytes;
        if (`Z:Q1${createHash('sha1').update(fileBytes).digest('base64')}` !== line) fail('APK-owned file checksum differs');
      }
    }
    return { name: field('P')[0].slice(2), version: field('V')[0].slice(2), architecture: field('A')[0].slice(2), checksum: field('C')[0].slice(2) };
  });
  if (packages.length !== 3 || new Set(packages.map(pkg => pkg.name)).size !== 3 ||
      packages.some(pkg => policy.packages[pkg.name] !== pkg.version ||
        policy.packageChecksums[pkg.name] !== pkg.checksum || pkg.architecture !== 'x86_64')) fail('unexpected APK closure');
  const forbidden = /^(?:bin\/|sbin\/|usr\/bin\/|usr\/sbin\/|usr\/local\/bin\/|usr\/local\/lib\/node_modules\/)|(?:^|\/)(?:ld-linux[^/]*|libc\.so\.6|gcompat|busybox)$/;
  const binaries = [];
  const executables = [];
  for (const entry of entries.values()) {
    if (entry.kind !== '5' && forbidden.test(entry.path)) fail(`forbidden runtime tool or glibc path ${entry.path}`);
    if (entry.kind !== '0') continue;
    if (entry.path.endsWith('/package.json')) {
      let metadata;
      try { metadata = JSON.parse(text(entry.bytes)); } catch { fail('invalid package metadata'); }
      if (['npm', 'pnpm', 'corepack', 'yarn'].includes(metadata?.name)) fail('package manager in dependency tree');
    }
    const elf = entry.bytes.subarray(0, 4).equals(Buffer.from([127, 69, 76, 70]));
    if (/\.node$|\.so(?:\.[0-9]+)*$/.test(entry.path) && !elf) fail('non-ELF native runtime file');
    if (entry.mode & 0o111) executables.push({ path: entry.path, sha256: hash(entry.bytes), elf });
    if (!elf) continue;
    if (!Object.hasOwn(policy.files, entry.path) || hash(entry.bytes) !== policy.files[entry.path]) fail(`unexpected ELF bytes ${entry.path}`);
    const details = inspectRuntimeElf(entry.bytes);
    if (details.interpreter !== null && details.interpreter !== '/lib/ld-musl-x86_64.so.1') fail('non-musl interpreter');
    if (entry.path === 'nodejs/bin/node' && details.interpreter !== '/lib/ld-musl-x86_64.so.1') fail('missing Node musl interpreter');
    if (details.searchPaths.length) fail('unapproved ELF library search path');
    for (const needed of details.needed) {
      if (!/^[A-Za-z0-9_.+-]+$/.test(needed)) fail('unsafe ELF dependency');
      const match = ['lib/', 'usr/lib/'].map(prefix => prefix + needed).filter(path => entries.has(path));
      if (!match.length) fail(`missing ELF dependency ${needed}`);
      const resolved = regular(match[0]);
      if (!Object.hasOwn(policy.files, resolved.path)) fail('ELF dependency outside approved closure');
    }
    binaries.push({ path: entry.path, sha256: hash(entry.bytes), ...details });
  }
  if (binaries.length !== Object.keys(policy.files).length) fail('incomplete ELF inventory');
  for (const [path, expected] of Object.entries(policy.files)) {
    if (hash(regular(path).bytes) !== expected) fail(`runtime binary hash differs ${path}`);
  }
  return { schema: 'stocksense-validator-runtime-v1', distribution: 'alpine-3.24', libc: 'musl',
    packages, apkDatabaseSha256: hash(Buffer.from(installed)), binaries, executables, virtualLinks,
    archiveSha256: hash(bytes), entryCount: entries.size };
}
