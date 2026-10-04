import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ContractError, deriveIdentity, digest, loadPackage } from '../../src/package-loader.mjs';
import { makePackage } from '../support/package-fixture.mjs';

async function withPackage(change, check) {
  const fixture = await makePackage({ change });
  try { await check(fixture); } finally { await rm(fixture.root, { recursive: true, force: true }); }
}
const rejectsCode = (promise, code, ruleId = 'BR1.1') => assert.rejects(promise,
  error => error instanceof ContractError && error.code === code && error.ruleId === ruleId);

test('C01 candidate loads exact listed bytes and remains incomplete', async () => {
  await withPackage(null, async ({ root }) => {
    const loaded = await loadPackage(root);
    assert.deepEqual(loaded.boundaryIds, ['C01']);
    assert.equal(loaded.releaseReady, false);
    assert.equal(loaded.entries.length, 5);
    assert.match(loaded.manifestDigest, /^sha256:[0-9a-f]{64}$/);
  });
});

test('logical identity is stable but revision changes with content', () => {
  const path = 'common/v1/message-envelope.schema.json';
  const one = deriveIdentity('schema', 'U1 Contracts', path, '1.0.0', digest('one'));
  const two = deriveIdentity('schema', 'U1 Contracts', path, '1.0.0', digest('two'));
  assert.equal(one.logicalId, two.logicalId);
  assert.notEqual(one.revisionId, two.revisionId);
});

test('duplicate canonical path is rejected before reading bytes', async () => {
  await withPackage(({ manifest }) => manifest.schemas.push({ ...manifest.schemas[0] }), ({ root }) =>
    rejectsCode(loadPackage(root), 'DUPLICATE_PATH'));
});

test('missing required C01 path fails even when another schema exists', async () => {
  await withPackage(({ manifest }) => {
    manifest.schemas = manifest.schemas.slice(0, 1);
    manifest.boundaryCoverage[0].canonicalDocuments = manifest.schemas.map(entry => entry.document);
  }, ({ root }) => rejectsCode(loadPackage(root), 'REQUIRED_PATH'));
});

test('malformed coverage lists fail with a stable finding', async () => {
  await withPackage(({ manifest }) => { manifest.boundaryCoverage[0].sidecars = 'not-an-array'; },
    ({ root }) => rejectsCode(loadPackage(root), 'BOUNDARY_INVENTORY'));
});

test('wrong content digest is rejected', async () => {
  await withPackage(({ manifest }) => { manifest.schemas[0].contentDigest = digest('different'); },
    ({ root }) => rejectsCode(loadPackage(root), 'DIGEST_MISMATCH'));
});

test('path traversal is rejected', async () => {
  await withPackage(({ manifest }) => { manifest.schemas[0].document = '../escape.json'; },
    ({ root }) => rejectsCode(loadPackage(root), 'UNSAFE_PATH'));
});

test('sidecar cannot claim another source revision', async () => {
  await withPackage(({ manifest }) => { manifest.governedArtifacts[0].sourceRevision = 'f'.repeat(40); },
    ({ root }) => rejectsCode(loadPackage(root), 'SOURCE_REVISION'));
});

test('detached receipt is not an in-package file', async () => {
  await withPackage(null, async ({ root }) => {
    await writeFile(join(root, 'receipt.json'), '{}');
    await rejectsCode(loadPackage(root), 'UNLISTED_FILE');
  });
});

test('symlink inside package is rejected even when listed', async t => {
  await withPackage(null, async ({ root }) => {
    try { await symlink(join(root, 'policy.json'), join(root, 'link.json')); }
    catch (error) {
      if (error.code === 'EPERM') { t.skip('Windows symlink creation requires privilege on this host'); return; }
      throw error;
    }
    await rejectsCode(loadPackage(root), 'SYMLINK');
  });
});
