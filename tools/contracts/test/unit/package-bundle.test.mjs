import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ContractError, canonicalJson, digest } from '../../src/package-loader.mjs';
import { buildPackageBundle, verifyPackageBundle } from '../../src/package-bundle.mjs';
import { makePackage } from '../support/package-fixture.mjs';

async function withPackage(change, check) {
  const fixture = await makePackage({ change });
  try { await check(fixture); } finally { await rm(fixture.root, { recursive: true, force: true }); }
}
const rejectsCode = (promise, code) => assert.rejects(promise,
  error => error instanceof ContractError && error.code === code);
const throwsCode = (action, code) => assert.throws(action,
  error => error instanceof ContractError && error.code === code);
const alter = (bytes, edit) => {
  const value = JSON.parse(bytes.toString('utf8'));
  edit(value);
  return Buffer.from(canonicalJson(value));
};

test('same candidate produces identical portable bytes and an in-memory verified file listing', async () => {
  await withPackage(null, async ({ root, files }) => {
    const first = await buildPackageBundle(root);
    const second = await buildPackageBundle(root);
    assert.ok(Buffer.isBuffer(first));
    assert.deepEqual(first, second);
    const verified = verifyPackageBundle(first, { expectedDigest: digest(first) });
    assert.equal(verified.artifactDigest, digest(first));
    assert.equal(verified.fileCount, 6);
    assert.equal(verified.files.get('policy.json').toString(), files['policy.json']);
    assert.deepEqual([...verified.files.keys()], [...verified.files.keys()].sort());
    assert.equal(JSON.parse(verified.files.get('manifest.json')).manifestStatus, 'candidate');
    assert.ok(!first.toString().includes(root), 'host path is not embedded');
  });
});

test('artifact digest, file hash, manifest hash and C01 source binding reject tampering', async () => {
  await withPackage(null, async ({ root }) => {
    const bytes = await buildPackageBundle(root);
    throwsCode(() => verifyPackageBundle(bytes, { expectedDigest: digest('other') }), 'BUNDLE_DIGEST_MISMATCH');
    const payloadChange = alter(bytes, bundle => {
      const file = bundle.files.find(row => row.path === 'policy.json');
      file.base64 = Buffer.from('changed').toString('base64');
      file.size = 7;
    });
    throwsCode(() => verifyPackageBundle(payloadChange), 'DIGEST_MISMATCH');
    const manifestHashChange = alter(bytes, bundle => { bundle.manifestDigest = digest('other'); });
    throwsCode(() => verifyPackageBundle(manifestHashChange), 'DIGEST_MISMATCH');
    const sourceBindingChange = alter(bytes, bundle => {
      const file = bundle.files.find(row => row.path === 'policy.json');
      const content = Buffer.from('changed');
      file.base64 = content.toString('base64');
      file.size = content.length;
      file.sha256 = digest(content);
    });
    throwsCode(() => verifyPackageBundle(sourceBindingChange), 'DIGEST_MISMATCH');
  });
});

test('verifier refuses noncanonical encoding, traversal, missing files and portable path collisions', async () => {
  await withPackage(null, async ({ root }) => {
    const bytes = await buildPackageBundle(root);
    throwsCode(() => verifyPackageBundle(Buffer.concat([bytes, Buffer.from('\n')])), 'BUNDLE_FORMAT');
    throwsCode(() => verifyPackageBundle(alter(bytes, bundle => { bundle.files[0].path = '../escape'; })), 'UNSAFE_PATH');
    throwsCode(() => verifyPackageBundle(alter(bytes, bundle => { bundle.files.pop(); })), 'UNLISTED_FILE');
    throwsCode(() => verifyPackageBundle(alter(bytes, bundle => {
      bundle.files.push({ ...bundle.files.find(row => row.path === 'policy.json'), path: 'POLICY.JSON' });
      bundle.files.sort((a, b) => a.path < b.path ? -1 : 1);
    })), 'DUPLICATE_PATH');
  });
});

test('builder refuses source traversal and symlinks', async t => {
  await withPackage(({ manifest }) => { manifest.schemas[0].document = '../escape.json'; },
    ({ root }) => rejectsCode(buildPackageBundle(root), 'UNSAFE_PATH'));
  await withPackage(null, async ({ root }) => {
    try { await symlink(join(root, 'policy.json'), join(root, 'link.json')); }
    catch (error) {
      if (error.code === 'EPERM') { t.diagnostic('symlink creation unavailable on this Windows host'); return; }
      throw error;
    }
    await rejectsCode(buildPackageBundle(root), 'SYMLINK');
  });
});

test('builder enforces 1 MiB per file and 32 MiB across all source files', async () => {
  await withPackage(null, async ({ root }) => {
    await writeFile(join(root, 'policy.json'), 'x'.repeat(1_048_577));
    await rejectsCode(buildPackageBundle(root), 'SOURCE_SIZE_LIMIT');
  });
  await withPackage(({ manifest, files }) => {
    const content = 'x'.repeat(1_048_576);
    for (let index = 0; index < 33; index++) {
      const path = `extra-${String(index).padStart(2, '0')}.json`;
      files[path] = content;
      manifest.governedArtifacts.push({ kind: 'example-fixture', owner: 'U1 Contracts', boundaryIds: ['C01'],
        document: path, semanticVersion: '1.0.0', contentDigest: digest(content), sourceRevision: manifest.sourceRevision });
      manifest.boundaryCoverage[0].sidecars.push(path);
    }
  }, ({ root }) => rejectsCode(buildPackageBundle(root), 'PACKAGE_SIZE_LIMIT'));
  throwsCode(() => verifyPackageBundle(Buffer.alloc(48 * 1024 * 1024 + 1)), 'BUNDLE_SIZE_LIMIT');
});

test('protected content is rejected by both producer and clean consumer', async () => {
  await withPackage(({ manifest, files }) => {
    files['policy.json'] = 'client_secret: live-value';
    manifest.governedArtifacts[0].contentDigest = digest(files['policy.json']);
  }, ({ root }) => rejectsCode(buildPackageBundle(root), 'PROTECTED_CONTENT'));
  await withPackage(null, async ({ root }) => {
    const bytes = await buildPackageBundle(root);
    const forbidden = Buffer.from('fullPrompt: hidden text');
    const changed = alter(bytes, bundle => {
      const policy = bundle.files.find(row => row.path === 'policy.json');
      policy.base64 = forbidden.toString('base64');
      policy.size = forbidden.length;
      policy.sha256 = digest(forbidden);
      const manifestFile = bundle.files.find(row => row.path === 'manifest.json');
      const manifest = JSON.parse(Buffer.from(manifestFile.base64, 'base64').toString());
      manifest.governedArtifacts.find(row => row.document === 'policy.json').contentDigest = policy.sha256;
      const manifestBytes = Buffer.from(JSON.stringify(manifest));
      manifestFile.base64 = manifestBytes.toString('base64');
      manifestFile.size = manifestBytes.length;
      manifestFile.sha256 = digest(manifestBytes);
      bundle.manifestDigest = manifestFile.sha256;
    });
    throwsCode(() => verifyPackageBundle(changed), 'PROTECTED_CONTENT');
  });
});
