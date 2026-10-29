import { createHash } from 'node:crypto';
import { open, stat } from 'node:fs/promises';
import { TextDecoder } from 'node:util';

const BLOCK = 512;
const MAX_ARCHIVE = 1536 * 1024 * 1024;
const MAX_FILE = 512 * 1024 * 1024;
const MAX_CONTENT = 1024 * 1024 * 1024;
const MAX_ENTRIES = 100_000;
const MAX_META = 1024 * 1024;
const decoder = new TextDecoder('utf-8', { fatal: true });
const bad = message => { throw new Error('Container tar refused: ' + message); };

function textField(bytes) {
  const end = bytes.indexOf(0);
  return decoder.decode(end < 0 ? bytes : bytes.subarray(0, end));
}

function octal(bytes, label) {
  const value = textField(bytes).trim();
  if (!/^[0-7]*$/.test(value)) bad('invalid ' + label);
  const parsed = value ? Number.parseInt(value, 8) : 0;
  if (!Number.isSafeInteger(parsed)) bad('oversized ' + label);
  return parsed;
}

function archivePath(value) {
  if (typeof value !== 'string' || !value || value.includes('\0') ||
      value.includes('\\') || value.startsWith('/')) bad('unsafe archive path');
  let path = value;
  while (path.startsWith('./')) path = path.slice(2);
  if (path === '.' || path === '') return 'rootfs';
  if (path.endsWith('/')) path = path.slice(0, -1);
  if (!path || path.split('/').some(part => !part || part === '.' || part === '..')) {
    bad('unsafe archive path');
  }
  return 'rootfs/' + path;
}

function parsePax(bytes) {
  const fields = {};
  let position = 0;
  while (position < bytes.length) {
    const separator = bytes.indexOf(32, position);
    if (separator < 0 || separator - position > 12) bad('invalid PAX length');
    const digits = bytes.subarray(position, separator).toString('ascii');
    if (!/^[1-9][0-9]*$/.test(digits)) bad('invalid PAX length');
    const length = Number(digits);
    if (!Number.isSafeInteger(length) || length <= separator - position + 2 ||
        position + length > bytes.length || bytes[position + length - 1] !== 10) {
      bad('invalid PAX record');
    }
    const line = decoder.decode(bytes.subarray(separator + 1, position + length - 1));
    const equals = line.indexOf('=');
    if (equals <= 0) bad('invalid PAX field');
    const key = line.slice(0, equals);
    const allowed = new Set(['path', 'linkpath', 'size', 'mtime', 'atime', 'ctime',
      'uid', 'gid', 'uname', 'gname']);
    if (!allowed.has(key) || Object.hasOwn(fields, key)) bad('unsupported PAX field');
    fields[key] = line.slice(equals + 1);
    position += length;
  }
  return fields;
}

async function readExact(handle, position, length) {
  const bytes = Buffer.alloc(length);
  let consumed = 0;
  while (consumed < length) {
    const result = await handle.read(bytes, consumed, length - consumed, position + consumed);
    if (result.bytesRead <= 0) bad('truncated tar archive');
    consumed += result.bytesRead;
  }
  return bytes;
}

function headerInfo(header) {
  const stored = octal(header.subarray(148, 156), 'header checksum');
  let sum = 0;
  for (let i = 0; i < BLOCK; i++) sum += i >= 148 && i < 156 ? 32 : header[i];
  if (stored !== sum) bad('tar header checksum differs');
  const prefix = textField(header.subarray(345, 500));
  const name = textField(header.subarray(0, 100));
  const type = header[156] === 0 ? '0' : String.fromCharCode(header[156]);
  return {
    name: prefix ? prefix + '/' + name : name,
    mode: octal(header.subarray(100, 108), 'mode'),
    uid: octal(header.subarray(108, 116), 'uid'),
    gid: octal(header.subarray(116, 124), 'gid'),
    size: octal(header.subarray(124, 136), 'size'),
    type,
    link: textField(header.subarray(157, 257)),
    major: octal(header.subarray(329, 337), 'device major'),
    minor: octal(header.subarray(337, 345), 'device minor')
  };
}

/** Parse Docker's merged-filesystem export without extracting untrusted paths. */
export async function readContainerTarManifest(archive) {
  const info = await stat(archive);
  if (!info.isFile() || info.size < BLOCK * 2 || info.size > MAX_ARCHIVE ||
      info.size % BLOCK !== 0) bad('archive size is invalid');
  const handle = await open(archive, 'r');
  try {
    const entries = [];
    const seen = new Set();
    let offset = 0;
    let total = 0;
    let local = {};
    let global = {};
    let longName = null;
    let longLink = null;
    let ended = false;
    while (offset + BLOCK <= info.size) {
      const header = await readExact(handle, offset, BLOCK);
      if (header.every(byte => byte === 0)) {
        if (offset + 2 * BLOCK > info.size ||
            !(await readExact(handle, offset + BLOCK, BLOCK)).every(byte => byte === 0)) {
          bad('missing second tar end block');
        }
        for (let tail = offset + 2 * BLOCK; tail < info.size; tail += 1024 * 1024) {
          const bytes = await readExact(handle, tail, Math.min(1024 * 1024, info.size - tail));
          if (!bytes.every(byte => byte === 0)) bad('nonzero data follows tar end');
        }
        ended = true;
        break;
      }
      const meta = headerInfo(header);
      const size = ['x', 'g', 'L', 'K'].includes(meta.type) ? meta.size
        : local.size !== undefined ? Number(local.size)
          : global.size !== undefined ? Number(global.size) : meta.size;
      if (!Number.isSafeInteger(size) || size < 0 || size > MAX_FILE) bad('entry size exceeds bound');
      const data = offset + BLOCK;
      const next = data + Math.ceil(size / BLOCK) * BLOCK;
      if (next > info.size) bad('tar entry is truncated');
      if (['x', 'g', 'L', 'K'].includes(meta.type)) {
        if (size > MAX_META) bad('metadata entry exceeds bound');
        const bytes = await readExact(handle, data, size);
        if (meta.type === 'x') local = parsePax(bytes);
        else if (meta.type === 'g') global = { ...global, ...parsePax(bytes) };
        else if (meta.type === 'L') longName = textField(bytes).replace(/\n$/, '');
        else longLink = textField(bytes).replace(/\n$/, '');
        offset = next;
        continue;
      }
      const path = archivePath(local.path ?? global.path ?? longName ?? meta.name);
      const link = local.linkpath ?? global.linkpath ?? longLink ?? meta.link;
      if (seen.has(path) || entries.length >= MAX_ENTRIES) bad('duplicate or excessive path');
      seen.add(path);
      const uid = local.uid ?? global.uid ?? meta.uid;
      const gid = local.gid ?? global.gid ?? meta.gid;
      if (![uid, gid].every(value => /^\d+$/.test(String(value)) &&
          Number.isSafeInteger(Number(value)))) bad('invalid PAX ownership');
      const common = { path, mode: meta.mode, uid: Number(uid), gid: Number(gid) };
      if (meta.type === '0' || meta.type === '7') {
        total += size;
        if (total > MAX_CONTENT) bad('filesystem byte limit exceeded');
        const hash = createHash('sha256');
        let consumed = 0;
        while (consumed < size) {
          const length = Math.min(1024 * 1024, size - consumed);
          hash.update(await readExact(handle, data + consumed, length));
          consumed += length;
        }
        entries.push({ ...common, kind: 'file', size, sha256: 'sha256:' + hash.digest('hex') });
      } else if (meta.type === '5' && size === 0) {
        entries.push({ ...common, kind: 'directory' });
      } else if (meta.type === '2' && size === 0) {
        entries.push({ ...common, kind: 'symlink', target: link });
      } else if (meta.type === '1' && size === 0) {
        entries.push({ ...common, kind: 'hardlink', target: archivePath(link) });
      } else if ((meta.type === '3' || meta.type === '4') && size === 0) {
        entries.push({ ...common, kind: meta.type === '3' ? 'character-device' : 'block-device',
          major: meta.major, minor: meta.minor });
      } else if (meta.type === '6' && size === 0) {
        entries.push({ ...common, kind: 'fifo' });
      } else bad(`unsupported tar entry type ${JSON.stringify(meta.type)} at ${JSON.stringify(path)}`);
      local = {};
      longName = null;
      longLink = null;
      offset = next;
    }
    if (!ended || Object.keys(local).length || longName || longLink || !entries.length) {
      bad('incomplete filesystem archive');
    }
    if (!seen.has('rootfs')) {
      entries.push({ path: 'rootfs', kind: 'directory', mode: 0o755, uid: 0, gid: 0 });
    }
    return entries;
  } finally { await handle.close(); }
}
