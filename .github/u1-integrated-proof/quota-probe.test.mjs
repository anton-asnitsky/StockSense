import test from 'node:test';
import assert from 'node:assert/strict';
import { observeQuota, summarizeQuota } from './quota-probe.mjs';
const context = { repository: 'anton-asnitsky/StockSense', candidate: 'a'.repeat(40),
  harnessRevision: 'b'.repeat(40), runId: '1', runAttempt: '3', job: 'technical-proof', lane: '1' };
const headers = { 'x-ratelimit-limit': '1000', 'x-ratelimit-remaining': '998', 'x-ratelimit-used': '2',
  'x-ratelimit-reset': '1795788000', 'x-ratelimit-resource': 'core', date: 'Fri, 27 Nov 2026 14:00:00 GMT' };
const body = { id: 1361237685, full_name: 'anton-asnitsky/StockSense' };
const response = (data = body, options = {}) => new Response(JSON.stringify(data), { headers, ...options });
test('one bounded read uses the unchanged ordinary token and retains only allowlisted telemetry', async () => {
  let calls = 0;
  const actual = await observeQuota({ phase: 'start', token: 'secret-test-token', context: { ...context, extra: 'secret-extra' },
    request: async (url, init) => {
      calls++; assert.equal(url, 'https://api.github.com/repos/anton-asnitsky/StockSense');
      assert.equal(init.method, 'GET'); assert.equal(init.redirect, 'error'); assert.ok(init.signal instanceof AbortSignal);
      assert.equal(init.headers.Authorization, 'Bearer secret-test-token');
      return response({ ...body, unwanted: 'secret-body' }, { headers: { ...headers, location: 'https://secret-url/?token=secret', 'set-cookie': 'secret-cookie' } });
    } });
  assert.equal(calls, 1); assert.equal(actual.valid, true); assert.equal(actual.requestCount, 1);
  assert.equal(actual.headers.remaining, 998); assert.doesNotMatch(JSON.stringify(actual), /secret|https:/);
});
test('429 is retained without retry, error body, or credentials', async () => {
  let calls = 0;
  const actual = await observeQuota({ phase: 'end', token: 'secret', context,
    request: async () => { calls++; return response({ message: 'secret' }, { status: 429, headers: { ...headers, 'retry-after': '60' } }); } });
  assert.equal(calls, 1); assert.equal(actual.valid, false); assert.equal(actual.status, 429);
  assert.equal(actual.headers.retryAfterSeconds, 60); assert.doesNotMatch(JSON.stringify(actual), /secret/);
});
test('transport errors are sanitized and not retried', async () => {
  let calls = 0;
  const actual = await observeQuota({ phase: 'start', token: 'secret', context,
    request: async () => { calls++; throw new Error('https://secret/?token=secret'); } });
  assert.equal(calls, 1); assert.equal(actual.failure, 'REQUEST_OR_BODY_FAILURE');
  assert.doesNotMatch(JSON.stringify(actual), /secret|https:/);
});
test('missing/malformed quota headers and repository identity fail closed', async () => {
  for (const [data, h] of [[body, { ...headers, 'x-ratelimit-reset': 'bad' }],
    [body, { ...headers, 'x-ratelimit-resource': 'unknown-secret' }], [{ ...body, id: 1 }, headers]]) {
    const actual = await observeQuota({ phase: 'start', token: 'x', context, request: async () => response(data, { headers: h }) });
    assert.equal(actual.valid, false); assert.equal(actual.failure, 'INVALID_EVIDENCE');
  }
});
test('successful response with zero allowance is not usable scheduling evidence', async () => {
  const actual = await observeQuota({ phase: 'start', token: 'x', context,
    request: async () => response(body, { headers: { ...headers, 'x-ratelimit-remaining': '0' } }) });
  assert.equal(actual.valid, false); assert.equal(actual.failure, 'QUOTA_EXHAUSTED');
});
test('oversized and malformed bodies fail closed', async () => {
  for (const r of [new Response('x'.repeat(65537), { headers }), new Response('{', { headers })]) {
    const actual = await observeQuota({ phase: 'start', token: 'x', context, request: async () => r });
    assert.equal(actual.valid, false);
  }
});
test('two probes count only two own requests and distinguish reset boundaries', async () => {
  const start = await observeQuota({ phase: 'start', token: 'x', context, request: async () => response() });
  const end = await observeQuota({ phase: 'end', token: 'x', context,
    request: async () => response(body, { headers: { ...headers, 'x-ratelimit-reset': '1795791600' } }) });
  assert.deepEqual(summarizeQuota(start, end), { schema: 'stocksense-diagnostic-quota-summary-v1', diagnosticOnly: true,
    ownProbeRequests: 2, valid: true, sameResetWindow: false, productionAuthorityRequestsMeasured: false,
    note: 'Counts cover only these probes. Header deltas include other activity or reset effects and are not production request counts.' });
  assert.equal(summarizeQuota(undefined, end).valid, false);
  assert.equal(summarizeQuota(undefined, end).ownProbeRequests, 1);
  assert.equal(summarizeQuota({ ...start, runAttempt: '2' }, end).valid, false);
});
test('invalid context or missing token makes no request', async () => {
  let calls = 0;
  for (const args of [{ token: '', context }, { token: 'x', context: { ...context, repository: 'other/repo' } }]) {
    await assert.rejects(observeQuota({ phase: 'start', ...args, request: async () => { calls++; return response(); } }));
  }
  assert.equal(calls, 0);
});
