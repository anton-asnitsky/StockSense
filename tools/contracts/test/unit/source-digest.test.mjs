import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sourceTreeDigest } from '../../src/source-digest.mjs';

// The digest decides whether a standards image may speak for this tree, so it
// has to cover everything that changes what the image actually runs: the tool
// sources and the dependency manifests that pin the validators inside it.
async function withTree(files, check) {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-digest-'));
  try {
    await mkdir(join(root, 'src'), { recursive: true });
    for (const [path, content] of Object.entries(files)) {
      await writeFile(join(root, path), content);
    }
    await check(join(root, 'src'));
  } finally { await rm(root, { recursive: true, force: true }); }
}

const base = Object.freeze({
  'package.json': '{"name":"contracts","dependencies":{"@asyncapi/cli":"6.2.0"}}',
  'pnpm-lock.yaml': "lockfileVersion: '9.0'\n",
  'src/policy.mjs': 'export const rule = 1;\n',
  'src/validate.mjs': 'export const check = 2;\n'
});

test('the tool-source digest is stable for identical trees and ignores non-sources', async () => {
  let first;
  await withTree(base, async src => { first = await sourceTreeDigest(src); });
  assert.match(first, /^sha256:[0-9a-f]{64}$/);
  await withTree(base, async src => assert.equal(await sourceTreeDigest(src), first));
  // A file the image never executes must not change the verdict.
  await withTree({ ...base, 'src/notes.md': '# not a module\n' },
    async src => assert.equal(await sourceTreeDigest(src), first));
});

test('the digest changes for a source edit and for a dependency pin change', async () => {
  let base64;
  await withTree(base, async src => { base64 = await sourceTreeDigest(src); });

  // A changed rule must invalidate an image built before it.
  await withTree({ ...base, 'src/policy.mjs': 'export const rule = 2;\n' },
    async src => assert.notEqual(await sourceTreeDigest(src), base64));

  // A changed dependency pin changes which validators the image carries even
  // though every source file is byte-identical. Digesting sources alone left
  // this unguarded: upgrading the AsyncAPI CLI swapped the validator inside
  // the image while the digest stayed the same, so a stale image passed.
  await withTree({ ...base, 'package.json': '{"name":"contracts","dependencies":{"@asyncapi/cli":"6.0.2"}}' },
    async src => assert.notEqual(await sourceTreeDigest(src), base64));

  // The resolved lockfile decides the transitive tree, so it counts too.
  await withTree({ ...base, 'pnpm-lock.yaml': "lockfileVersion: '9.0'\n# resolved differently\n" },
    async src => assert.notEqual(await sourceTreeDigest(src), base64));
});

test('a missing dependency manifest fails rather than digesting a partial tree', async () => {
  // Silently skipping an unreadable manifest would reintroduce exactly the
  // gap this covers, so the digest refuses to be computed at all.
  const root = await mkdtemp(join(tmpdir(), 'stocksense-digest-'));
  try {
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src/policy.mjs'), 'export const rule = 1;\n');
    await assert.rejects(sourceTreeDigest(join(root, 'src')), { code: 'ENOENT' });
  } finally { await rm(root, { recursive: true, force: true }); }
});
