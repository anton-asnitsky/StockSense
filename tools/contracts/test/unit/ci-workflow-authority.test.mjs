import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCiChangedPaths, assertCiChangedPaths } from '../../src/ci-workflow-authority.mjs';

test('Git NUL path parsing preserves spaces and deterministically compares the full set', () => {
  assert.deepEqual(parseCiChangedPaths(Buffer.from('tools/a file.mjs\0.github/workflows/contracts-required.yml\0')),
    ['.github/workflows/contracts-required.yml', 'tools/a file.mjs']);
  assert.deepEqual(parseCiChangedPaths(Buffer.alloc(0)), []);
});

test('Git output refuses malformed, ambiguous and invalid UTF-8 paths', () => {
  for (const value of ['a', '\0', 'a\0a\0', '../x\0', '/x\0', 'a//b\0', 'a/./b\0',
    'a\\b\0', 'C:x\0', 'a\nb\0', 'a\rb\0']) {
    assert.throws(() => parseCiChangedPaths(Buffer.from(value)), { code: 'CI_WORKFLOW_CHANGE' }, value);
  }
  assert.throws(() => parseCiChangedPaths(Buffer.from([255, 0])), { code: 'CI_WORKFLOW_CHANGE' });
  assert.throws(() => parseCiChangedPaths('not bytes'), { code: 'CI_WORKFLOW_CHANGE' });
  assert.throws(() => parseCiChangedPaths(Buffer.alloc(32 * 1024 * 1024 + 1)), { code: 'CI_WORKFLOW_CHANGE' });
});

test('only the two reviewed workflow changes are eligible, including mixed and case variants', () => {
  assert.doesNotThrow(() => assertCiChangedPaths(['tools/contracts/src/evidence.mjs',
    '.github/workflows/contracts-required.yml', '.github/workflows/release-evidence.yml']));
  for (const path of ['.github/workflows/public-pr-policy.yml', '.github/scripts/public-pr-policy.mjs',
    '.github/workflows/other.yml', '.github/CODEOWNERS', '.GitHub/workflows/contracts-required.yml']) {
    assert.throws(() => assertCiChangedPaths(['.github/workflows/contracts-required.yml', path]),
      { code: 'CI_WORKFLOW_CHANGE' }, path);
  }
});
