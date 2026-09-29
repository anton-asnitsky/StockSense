import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertIntegrationBaseline, assertPackageMajor, assessCompatibility, bindPredecessors
} from '../../src/compatibility.mjs';

const expectCode = (fn, code) => assert.throws(fn, error => error.code === code);
const expectAsyncCode = (promise, code) => assert.rejects(promise, error => error.code === code);
const rev = char => 'sha256:' + char.repeat(64);
const commit = 'a'.repeat(40);

const entry = (logicalId, revisionId, artifactKind = 'openapi', document = 'api.yaml') =>
  ({ logicalId, revisionId, artifactKind, document });

test('BR4.1: the integration baseline must be an exact immutable commit', () => {
  assert.deepEqual(assertIntegrationBaseline({ commit }), { commit, ref: null });
  assert.equal(assertIntegrationBaseline({ commit, ref: 'refs/heads/main' }).ref, 'refs/heads/main');
  expectCode(() => assertIntegrationBaseline({ commit: 'main' }), 'BASELINE_NOT_IMMUTABLE');
  expectCode(() => assertIntegrationBaseline({ commit: 'a'.repeat(39) }), 'BASELINE_NOT_IMMUTABLE');
  expectCode(() => assertIntegrationBaseline(null), 'BASELINE_NOT_IMMUTABLE');
});

test('BR4.4: the C01 package major stays at 1 and 2.x.x is rejected', () => {
  assert.equal(assertPackageMajor('1.4.0', '1.3.0'), true);
  expectCode(() => assertPackageMajor('2.0.0', '1.3.0'), 'PACKAGE_MAJOR_REJECTED');
  expectCode(() => assertPackageMajor('1.0.0', '2.0.0'), 'PACKAGE_MAJOR_REJECTED');
  expectCode(() => assertPackageMajor('1.0', '1.0.0'), 'PACKAGE_VERSION_SHAPE');
});

test('BR4.2: a candidate binds its same-kind predecessor by logical identity', () => {
  const bindings = bindPredecessors(
    [entry('L1', rev('1')), entry('L2', rev('2'), 'schema', 'envelope.json')],
    [entry('L1', rev('9')), entry('L2', rev('2'), 'schema', 'envelope.json')]
  );
  assert.deepEqual(bindings.map(binding => binding.predecessorRevisionId), [rev('9'), rev('2')]);
  assert.deepEqual(bindings.map(binding => binding.unchanged), [false, true]);
});

test('BR4.2: a missing predecessor needs an explicit first-release reason', () => {
  expectCode(() => bindPredecessors([entry('L1', rev('1'))], []), 'PREDECESSOR_MISSING');
  const bindings = bindPredecessors([entry('L1', rev('1'))], [], { firstRelease: { L1: 'New C10 surface in this Bolt' } });
  assert.equal(bindings[0].predecessorRevisionId, null);
  assert.equal(bindings[0].firstReleaseReason, 'New C10 surface in this Bolt');
});

test('BR4.2: a predecessor of a different canonical kind is rejected', () => {
  expectCode(() => bindPredecessors([entry('L1', rev('1'), 'openapi')], [entry('L1', rev('9'), 'asyncapi')]), 'PREDECESSOR_KIND');
});

test('BR4.3: sidecars are not diffed and unchanged revisions short-circuit', async () => {
  const bindings = bindPredecessors(
    [entry('L1', rev('1')), entry('L2', rev('2'), 'sidecar', 'policy.json')],
    [entry('L1', rev('1'))]
  );
  assert.equal(bindings.length, 1);
  const assessed = await assessCompatibility({ bindings, runDiff: () => assert.fail('unchanged pairs must not be diffed') });
  assert.deepEqual(assessed.map(row => row.outcome), ['unchanged']);
});

test('BR4.3: the pinned differ is unavailable here and fails closed', async () => {
  const bindings = bindPredecessors([entry('L1', rev('1'))], [entry('L1', rev('9'))]);
  await expectAsyncCode(assessCompatibility({ bindings }), 'DIFFER_UNAVAILABLE');
});

test('BR4.3-BR4.4: a breaking identity needs an approval naming its exact predecessor', async () => {
  const bindings = bindPredecessors([entry('L1', rev('1'))], [entry('L1', rev('9'))]);
  const runDiff = async () => ({ breakingChanges: [{ id: 'response-removed' }] });
  await expectAsyncCode(assessCompatibility({ bindings, runDiff }), 'BREAKING_CHANGE_UNAPPROVED');
  // An approval bound to the wrong predecessor revision is not an approval.
  await expectAsyncCode(
    assessCompatibility({ bindings, runDiff, approvals: { L1: { predecessorRevisionId: rev('8'), approvedBy: 'owner', overlapUntil: '2026-12-31' } } }),
    'BREAKING_CHANGE_UNAPPROVED'
  );
  const approved = await assessCompatibility({
    bindings, runDiff,
    approvals: { L1: { predecessorRevisionId: rev('9'), approvedBy: 'owner', overlapUntil: '2026-12-31' } }
  });
  assert.equal(approved[0].outcome, 'breaking-approved');
  assert.equal(approved[0].breakingChanges.length, 1);
});

test('BR4.3: a differ that does not report a breaking-change list is rejected', async () => {
  const bindings = bindPredecessors([entry('L1', rev('1'))], [entry('L1', rev('9'))]);
  await expectAsyncCode(assessCompatibility({ bindings, runDiff: async () => ({}) }), 'DIFF_RESULT_SHAPE');
});
