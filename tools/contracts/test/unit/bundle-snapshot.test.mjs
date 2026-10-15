import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { withPrivateBundleSnapshot } from '../../src/bundle-snapshot.mjs';

async function withInput(check) {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-snapshot-test-'));
  const input = join(root, 'candidate.bundle.json');
  try { await writeFile(input, 'original'); await check(input); }
  finally { await rm(root, { recursive: true, force: true }); }
}

test('replacing the caller path while attestation runs cannot change the private subject', async () => {
  await withInput(async input => {
    const result = await withPrivateBundleSnapshot(input, async snapshot => {
      assert.notEqual(snapshot, input);
      await writeFile(input, 'attacker');
      assert.equal(await readFile(snapshot, 'utf8'), 'original');
      return 'verified';
    });
    assert.equal(result.bytes.toString(), 'original');
    assert.equal(result.result, 'verified');
  });
});

test('changing the private subject after verification is refused', async () => {
  await withInput(async input => {
    await assert.rejects(withPrivateBundleSnapshot(input, async snapshot => {
      await writeFile(snapshot, 'attacker');
      return 'verified';
    }), error => error.code === 'BUNDLE_CHANGED' && error.ruleId === 'BR6.6');
  });
});
