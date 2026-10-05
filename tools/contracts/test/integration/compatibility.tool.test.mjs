import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { assessCompatibility } from '../../src/compatibility.mjs';

const base = fileURLToPath(new URL('../fixtures/compatibility/base.openapi.yaml', import.meta.url));
const removed = fileURLToPath(new URL('../fixtures/compatibility/removed.openapi.yaml', import.meta.url));
const binding = {
  artifactKind: 'openapi', logicalId: 'sha256:' + 'a'.repeat(64),
  predecessorRevisionId: 'sha256:' + 'b'.repeat(64), candidateRevisionId: 'sha256:' + 'c'.repeat(64),
  document: 'synthetic.openapi.yaml', unchanged: false
};

test('pinned oasdiff reports no breaking change for identical local specs', async () => {
  const result = await assessCompatibility({
    bindings: [binding],
    resolveSource: () => ({ predecessorPath: base, candidatePath: base })
  });
  assert.equal(result[0].outcome, 'compatible');
  assert.deepEqual(result[0].breakingChanges, []);
});

test('pinned oasdiff blocks path removal until exact predecessor approval', async () => {
  const resolveSource = () => ({ predecessorPath: base, candidatePath: removed });
  await assert.rejects(assessCompatibility({ bindings: [binding], resolveSource }),
    error => error.code === 'BREAKING_CHANGE_UNAPPROVED');
  const result = await assessCompatibility({
    bindings: [binding], resolveSource,
    approvals: { [binding.logicalId]: {
      predecessorRevisionId: binding.predecessorRevisionId,
      approvedBy: 'synthetic-reviewer', overlapUntil: '2027-01-01T00:00:00Z'
    } }
  });
  assert.equal(result[0].outcome, 'breaking-approved');
  assert.ok(result[0].breakingChanges.some(change => change.id === 'api-path-removed-without-deprecation'));
  assert.ok(result[0].breakingChanges.every(change => !Object.hasOwn(change, 'text') && !Object.hasOwn(change, 'baseSource')));
});

test('pinned differ rejects URLs instead of fetching compatibility inputs', async () => {
  await assert.rejects(assessCompatibility({
    bindings: [binding],
    resolveSource: () => ({ predecessorPath: 'https://example.invalid/base.yaml', candidatePath: removed })
  }), error => error.code === 'DIFF_SOURCE');
});
