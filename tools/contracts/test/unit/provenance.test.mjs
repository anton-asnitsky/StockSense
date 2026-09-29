import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { digest } from '../../src/package-loader.mjs';
import { assertSourcesCommitted, resolveSourceRevision, verifySourceBinding } from '../../src/provenance.mjs';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const sourcePaths = [
  'contracts/source/common/v1/message-envelope.schema.json',
  'contracts/source/common/v1/global-identity-audit-envelope.schema.json'
];
const expectCode = (fn, code) => assert.throws(fn, error => error.code === code);

test('BR1.7: the contract sources resolve to a real immutable commit', () => {
  assertSourcesCommitted(repoRoot, sourcePaths);
  const revision = resolveSourceRevision(repoRoot, sourcePaths);
  assert.match(revision, /^[0-9a-f]{40}$/);
  // The commit must actually exist in this repository.
  const subject = execFileSync('git', ['log', '-1', '--format=%H', revision], { cwd: repoRoot, encoding: 'utf8' }).trim();
  assert.equal(subject, revision);
});

test('BR1.7: shipped bytes are verified against the blobs at that commit', async () => {
  const revision = resolveSourceRevision(repoRoot, sourcePaths);
  const bindings = [];
  for (const sourcePath of sourcePaths) {
    bindings.push({ sourcePath, contentDigest: digest(await readFile(join(repoRoot, sourcePath))) });
  }
  const verified = verifySourceBinding(repoRoot, revision, bindings);
  assert.equal(verified.length, 2);
  assert.ok(verified.every(row => row.revision === revision));
});

test('BR1.7: bytes that drifted from the recorded commit are rejected', () => {
  const revision = resolveSourceRevision(repoRoot, sourcePaths);
  expectCode(
    () => verifySourceBinding(repoRoot, revision, [{ sourcePath: sourcePaths[0], contentDigest: 'sha256:' + 'a'.repeat(64) }]),
    'SOURCE_REVISION_MISMATCH'
  );
});

test('BR1.7: a short or placeholder revision is not a binding', () => {
  expectCode(() => verifySourceBinding(repoRoot, '0'.repeat(39), []), 'SOURCE_REVISION_SHAPE');
  // The all-zero placeholder is well-formed but names no commit in this repository.
  expectCode(() => verifySourceBinding(repoRoot, '0'.repeat(40), [{ sourcePath: sourcePaths[0], contentDigest: 'sha256:' + 'a'.repeat(64) }]), 'GIT_UNAVAILABLE');
});

test('BR1.7: an unknown source path cannot resolve a revision', () => {
  expectCode(() => resolveSourceRevision(repoRoot, ['contracts/source/does-not-exist.json']), 'SOURCE_REVISION_UNRESOLVED');
});
