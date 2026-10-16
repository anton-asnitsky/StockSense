import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, open, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { MAX_ARTIFACT_BYTES } from '../../src/package-bundle.mjs';

const cli = fileURLToPath(new URL('../../scripts/verify-candidate-bundle.mjs', import.meta.url));
const commit = '1e5028c46f9857d0df2a44b06b1604b8d06a5210';

test('consumer refuses caller-selected signer repository before invoking gh', () => {
  const result = spawnSync(process.execPath, [cli, 'candidate.bundle.json', 'foreign/repo', commit],
    { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Usage:/);
});

test('consumer refuses a sparse oversized artifact before invoking gh or reading its bytes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-bundle-size-'));
  try {
    const path = join(root, 'oversized.bundle.json');
    const handle = await open(path, 'w');
    try { await handle.truncate(MAX_ARTIFACT_BYTES + 1); } finally { await handle.close(); }
    const result = spawnSync(process.execPath, [cli, path, commit], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(JSON.parse(result.stderr).code, 'BUNDLE_SIZE_LIMIT');
  } finally { await rm(root, { recursive: true, force: true }); }
});
