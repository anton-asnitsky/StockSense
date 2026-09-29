import test from 'node:test';
import assert from 'node:assert/strict';
import { enforcePackageBudget, inspectContent, inspectReferences, limitFindings, LIMITS, sanitizeFinding } from '../../src/preflight.mjs';

const code = (fn, expected) => assert.throws(fn, error => error.code === expected);

test('synthetic placeholder and ordinary schema text pass content gate', () => {
  assert.equal(inspectContent('schema.json', '{"example":"synthetic:credential-example","type":"object"}'), true);
});
test('per-source and package budgets reject oversized inputs', () => {
  code(() => inspectContent('large.json', Buffer.alloc(LIMITS.sourceBytes + 1, 65)), 'SOURCE_SIZE_LIMIT');
  code(() => enforcePackageBudget({ totalBytes: LIMITS.packageBytes + 1 }), 'PACKAGE_SIZE_LIMIT');
});
test('reference count and recursive graph are bounded', () => {
  code(() => inspectReferences(Array.from({ length: 129 }, (_, i) => ({ from: 'a' + i, to: 'b' + i }))), 'REFERENCE_LIMIT');
  code(() => inspectReferences([{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }]), 'REFERENCE_CYCLE');
});
test('remote reference requires pinned HTTPS allowlist', () => {
  code(() => inspectReferences([{ from: 'a', to: 'http://example.invalid/schema' }]), 'REFERENCE_POLICY');
  assert.equal(inspectReferences([{ from: 'a', to: 'https://example.invalid/schema' }],
    { allowedRemote: { 'https://example.invalid/schema': 'sha256:' + 'a'.repeat(64) } }), 1);
});
test('protected supplier, prompt, reasoning and credential bytes are rejected', () => {
  for (const value of ['rawSupplierDocument: secret', 'fullPrompt: instructions', 'hiddenReasoning: trace',
    'client_secret: abcdefghijklmnop', '%PDF-1.7']) code(() => inspectContent('input', value), 'PROTECTED_CONTENT');
});
test('untrusted hooks and binary payloads are rejected', () => {
  code(() => inspectContent('input', 'postinstall: node install.js'), 'HOOK_FORBIDDEN');
  code(() => inspectContent('input', Buffer.from([0, 255])), 'BINARY_CONTENT');
});
test('diagnostics drop attacker-controlled annotation and source text', () => {
  const result = sanitizeFinding({ code: 'BAD_1', ruleId: 'NFR6.1', severity: 'error', path: 'common/schema.json', line: 2,
    message: '::error:: token=abcdefghijklmnop' });
  assert.equal(result.path, 'common/schema.json');
  assert.doesNotMatch(result.message, /token|::error::/);
  code(() => sanitizeFinding({ path: 'C:\\agent\\secret.txt' }), 'UNSAFE_DIAGNOSTIC');
});
test('diagnostic limit is a failing result', () => {
  code(() => limitFindings(Array.from({ length: 201 }, () => ({ code: 'BAD', ruleId: 'NFR10.1', path: 'a.json' }))), 'DIAGNOSTIC_LIMIT');
});
