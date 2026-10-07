import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { digest } from '../../src/package-loader.mjs';
import { assertSourcesCommitted, resolveSourceRevision, verifySourceBinding } from '../../src/provenance.mjs';
import { governedSidecarSourceBindings } from '../../src/validate.mjs';

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
  expectCode(() => verifySourceBinding(repoRoot, '0'.repeat(40), [{ sourcePath: sourcePaths[0], contentDigest: 'sha256:' + 'a'.repeat(64) }]), 'SOURCE_REVISION_UNKNOWN');
});

test('BR1.7: an unknown source path cannot resolve a revision', () => {
  expectCode(() => resolveSourceRevision(repoRoot, ['contracts/source/does-not-exist.json']), 'SOURCE_REVISION_UNRESOLVED');
});

const sidecarEntries = [
  { artifactKind: 'sidecar', kind: 'example-fixture', document: 'governance/example-fixture.json', contentDigest: 'sha256:' + 'a'.repeat(64) },
  { artifactKind: 'sidecar', kind: 'contract-package-policy', document: 'governance/contract-package-policy.json', contentDigest: 'sha256:' + 'b'.repeat(64) },
  { artifactKind: 'sidecar', kind: 'generation-profile', document: 'governance/generation-profile.json', contentDigest: 'sha256:' + 'c'.repeat(64) },
  { artifactKind: 'schema', document: 'common/v1/message-envelope.schema.json', contentDigest: 'sha256:' + 'd'.repeat(64) }
];

test('BR1.7: every governed sidecar except the revision-bearing one binds to its repository path', () => {
  const bindings = governedSidecarSourceBindings(repoRoot,
    join(repoRoot, 'contracts/samples/walking-skeleton'), sidecarEntries);
  // The generation profile names the revision in its own bytes, so binding it
  // to that revision has no fixpoint; canonical documents bind by source path.
  assert.deepEqual(bindings, [
    { sourcePath: 'contracts/samples/walking-skeleton/governance/example-fixture.json', contentDigest: 'sha256:' + 'a'.repeat(64) },
    { sourcePath: 'contracts/samples/walking-skeleton/governance/contract-package-policy.json', contentDigest: 'sha256:' + 'b'.repeat(64) }
  ]);
});

test('BR1.7: a package outside the repository yields no sidecar binding instead of throwing', () => {
  // Throwing here pre-empted every genuine provenance verdict, because the
  // throw happened while the binding list was still being built.
  assert.equal(governedSidecarSourceBindings(repoRoot, join(repoRoot, '..', 'outside'), sidecarEntries), null);
  assert.equal(governedSidecarSourceBindings(repoRoot, repoRoot, sidecarEntries), null);
});

test('BR1.7: shipped C18 fixture sidecar matches the stamped Git blob', async () => {
  const packageRoot = join(repoRoot, 'contracts/samples/walking-skeleton');
  const manifest = JSON.parse(await readFile(join(packageRoot, 'manifest.json'), 'utf8'));
  const entries = manifest.governedArtifacts.map(entry => ({ ...entry, artifactKind: 'sidecar' }));
  const bindings = governedSidecarSourceBindings(repoRoot, packageRoot, entries);
  assertSourcesCommitted(repoRoot, [
    'contracts/fixtures/web-bff/v1/example-fixture.json', ...bindings.map(binding => binding.sourcePath)
  ]);
  assert.equal(verifySourceBinding(repoRoot, manifest.sourceRevision, bindings).length, bindings.length);
  expectCode(() => verifySourceBinding(repoRoot, manifest.sourceRevision,
    [{ ...bindings[0], contentDigest: 'sha256:' + 'a'.repeat(64) }]), 'SOURCE_REVISION_MISMATCH');
});

test('BR1.7: a path absent from the recorded commit is a binding failure, not a toolchain failure', () => {
  // GIT_UNAVAILABLE means "fix your toolchain"; a false provenance claim means
  // "fix the package". Collapsing both into one code hid a real package defect.
  expectCode(() => verifySourceBinding(repoRoot, resolveSourceRevision(repoRoot, sourcePaths),
    [{ sourcePath: 'contracts/source/does-not-exist.schema.json', contentDigest: 'sha256:' + 'a'.repeat(64) }]),
  'SOURCE_PATH_ABSENT');
});
