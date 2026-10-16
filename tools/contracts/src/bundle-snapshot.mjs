import { mkdtemp, open, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { ContractError, digest } from './package-loader.mjs';
import { MAX_ARTIFACT_BYTES } from './package-bundle.mjs';

const fail = (code, rule, message) => { throw new ContractError(code, rule, message); };

async function readBounded(path) {
  const handle = await open(path, 'r');
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size === 0 || stat.size > MAX_ARTIFACT_BYTES) {
      fail('BUNDLE_SIZE_LIMIT', 'NFR10.1', 'The package artifact exceeds its safe byte bound');
    }
    const bytes = Buffer.allocUnsafe(stat.size);
    let offset = 0;
    while (offset < bytes.length) {
      const result = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (!result.bytesRead) fail('BUNDLE_CHANGED', 'BR6.6', 'Package artifact changed during the read');
      offset += result.bytesRead;
    }
    if ((await handle.read(Buffer.alloc(1), 0, 1, offset)).bytesRead ||
        (await handle.stat()).size !== bytes.length) {
      fail('BUNDLE_CHANGED', 'BR6.6', 'Package artifact changed during the read');
    }
    return bytes;
  } finally { await handle.close(); }
}

/** Give the attestation verifier and package parser the same bounded private bytes. */
export async function withPrivateBundleSnapshot(inputPath, verify) {
  const original = await readBounded(inputPath);
  const directory = await mkdtemp(join(tmpdir(), 'stocksense-verify-'));
  const snapshot = join(directory, basename(inputPath));
  try {
    await writeFile(snapshot, original, { flag: 'wx', mode: 0o600 });
    const result = await verify(snapshot);
    const bytes = await readBounded(snapshot);
    if (digest(bytes) !== digest(original)) fail('BUNDLE_CHANGED', 'BR6.6', 'Private subject changed after attestation');
    return { bytes, result };
  } finally {
    await unlink(snapshot).catch(() => {});
    await rmdir(directory).catch(() => {});
  }
}
