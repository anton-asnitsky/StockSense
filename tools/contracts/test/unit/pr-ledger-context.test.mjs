import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readLedgerAuthorityMode, readPrLedgerInput, readPrLedgerReceipt } from '../../src/pr-ledger-context.mjs';

const digest = value => `sha256:${value.repeat(64)}`;
const sourceContext = { candidateRevision: 'a'.repeat(40), candidateGitTreeSha: 'b'.repeat(40),
  candidateTreeDigest: digest('c'), executionFingerprint: digest('d') };
const runtimeManifestDigest = digest('e');
const env = { STOCKSENSE_LEDGER_AUTHORITY: 'owner-authorized-pr-ledger-v1',
  GITHUB_EVENT_NAME: 'pull_request', GITHUB_REPOSITORY: 'anton-asnitsky/StockSense',
  GITHUB_SHA: sourceContext.candidateRevision, STOCKSENSE_PR_NUMBER: '74',
  STOCKSENSE_PR_BASE_SHA: '1'.repeat(40), STOCKSENSE_PR_HEAD_SHA: '2'.repeat(40),
  GITHUB_RUN_ID: '12345', GITHUB_RUN_ATTEMPT: '2', GITHUB_TOKEN: 'synthetic-test-token' };
const input = overrides => readPrLedgerInput({ sourceContext, runtimeManifestDigest, env, ...overrides });
const refused = action => assert.throws(action, error => error.code === 'PR_AUTH_CONTEXT');

test('main is the default and only known explicit modes are selected', () => {
  assert.equal(readLedgerAuthorityMode({}), 'protected-main');
  assert.equal(readLedgerAuthorityMode({ STOCKSENSE_LEDGER_AUTHORITY: 'protected-main' }), 'protected-main');
  assert.equal(readLedgerAuthorityMode(env), 'owner-authorized-pr-ledger-v1');
  for (const mode of ['', 'pr', 'protected-main ', null, 1]) {
    refused(() => readLedgerAuthorityMode({ STOCKSENSE_LEDGER_AUTHORITY: mode }));
  }
});

test('PR input uses independent Git/runtime bindings and exact hosted execution identities', () => {
  const actual = input();
  assert.equal(actual.sourceRevision, sourceContext.candidateRevision);
  assert.equal(actual.candidateGitTreeSha, sourceContext.candidateGitTreeSha);
  assert.equal(actual.candidateTreeDigest, sourceContext.candidateTreeDigest);
  assert.equal(actual.executionFingerprint, sourceContext.executionFingerprint);
  assert.equal(actual.runtimeManifestDigest, runtimeManifestDigest);
  assert.equal(actual.pullNumber, 74);
  assert.equal(actual.currentRunId, 12345);
  assert.equal(actual.currentRunAttempt, 2);
  assert.equal(actual.headSha, env.STOCKSENSE_PR_HEAD_SHA);
  assert.equal(actual.baseSha, env.STOCKSENSE_PR_BASE_SHA);
});

test('main, push, dispatch, release and other repositories cannot request PR input', () => {
  for (const changed of [{ STOCKSENSE_LEDGER_AUTHORITY: 'protected-main' },
    { GITHUB_EVENT_NAME: 'push' }, { GITHUB_EVENT_NAME: 'workflow_dispatch' },
    { GITHUB_EVENT_NAME: 'release' }, { GITHUB_REPOSITORY: 'other/StockSense' }]) {
    refused(() => input({ env: { ...env, ...changed } }));
  }
});

test('all numeric identifiers reject ambiguous, missing and unsafe values', () => {
  for (const key of ['STOCKSENSE_PR_NUMBER', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']) {
    for (const value of [undefined, '0', '-1', '01', ' 1', '1\n', '1e2', '9007199254740992']) {
      refused(() => input({ env: { ...env, [key]: value } }));
    }
  }
});

test('source mismatch and malformed branch identities fail before live verification', () => {
  for (const changed of [{ GITHUB_SHA: 'f'.repeat(40) }, { GITHUB_TOKEN: '' },
    { STOCKSENSE_PR_BASE_SHA: 'main' }, { STOCKSENSE_PR_HEAD_SHA: 'A'.repeat(40) }]) {
    refused(() => input({ env: { ...env, ...changed } }));
  }
});

test('closed independent context and actual runtime digest are mandatory', () => {
  for (const context of [null, [], {}, { ...sourceContext, extra: true },
    { ...sourceContext, candidateGitTreeSha: 'main' },
    { ...sourceContext, candidateTreeDigest: 'bad' }, { ...sourceContext, executionFingerprint: 'bad' }]) {
    refused(() => input({ sourceContext: context }));
  }
  refused(() => input({ runtimeManifestDigest: 'bad' }));
});

test('environment-provided digest claims do not replace independent expectations', () => {
  const actual = input({ env: { ...env, STOCKSENSE_CANDIDATE_DIGEST: digest('f'),
    STOCKSENSE_EXECUTION_FINGERPRINT: digest('f'), STOCKSENSE_RUNTIME_DIGEST: digest('f') } });
  assert.equal(actual.candidateTreeDigest, sourceContext.candidateTreeDigest);
  assert.equal(actual.executionFingerprint, sourceContext.executionFingerprint);
  assert.equal(actual.runtimeManifestDigest, runtimeManifestDigest);
});

test('retained PR receipt decoding rejects ambiguous, excessive and invalid byte input', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-pr-receipt-'));
  const path = join(root, 'receipt.json');
  try {
    await writeFile(path, '{"schema":"synthetic-test-data","images":[]}');
    assert.deepEqual(await readPrLedgerReceipt(path), { schema: 'synthetic-test-data', images: [] });
    for (const content of ['{"schema":1,"schema":2}', '[', '['.repeat(26) + '0' + ']'.repeat(26)]) {
      await writeFile(path, content);
      await assert.rejects(readPrLedgerReceipt(path), { code: 'PR_AUTH_JSON' });
    }
    await writeFile(path, Buffer.from([0xff]));
    await assert.rejects(readPrLedgerReceipt(path), { code: 'PR_AUTH_RECEIPT' });
    await writeFile(path, ' '.repeat(1024 * 1024 + 1));
    await assert.rejects(readPrLedgerReceipt(path), { code: 'PR_AUTH_CONTEXT' });
    await assert.rejects(readPrLedgerReceipt(root), { code: 'PR_AUTH_CONTEXT' });
    await assert.rejects(readPrLedgerReceipt(join(root, 'missing')), { code: 'PR_AUTH_RECEIPT' });
  } finally { await rm(root, { recursive: true, force: true }); }
});
