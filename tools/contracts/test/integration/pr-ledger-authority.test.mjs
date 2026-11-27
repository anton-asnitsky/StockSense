import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchPrLedgerAuthority, verifyRetainedPrLedgerAuthority } from '../../src/pr-ledger-authority.mjs';
import { fixture, P, log } from '../fixtures/pr-ledger-authority/scenario.mjs';

// Exercise the real bounded HTTP adapter, decoding, pagination and signed-log
// redirect path. No production request seam is injected into the authority reader.
async function withHttp(f, run, override = () => undefined) {
  const original = globalThis.fetch;
  const calls = []; const input = { ...f.input }; delete input.request;
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(url); calls.push({ url: parsed.href, options });
    assert.equal(options.redirect, parsed.hostname === 'api.github.com' ? 'manual' : 'error');
    assert.ok(options.signal instanceof globalThis.AbortSignal);
    if (parsed.hostname !== 'api.github.com') {
      assert.equal(parsed.hostname, 'logs.blob.core.windows.net');
      assert.equal(options.headers, undefined, 'read-only token must never reach signed storage');
      return new globalThis.Response(log);
    }
    assert.equal(options.headers.Authorization, 'Bearer synthetic-unit-token');
    const path = parsed.pathname + parsed.search;
    const changed = override(path, calls.length); if (changed) return changed;
    if (/\/actions\/jobs\/\d+\/logs$/.test(parsed.pathname)) {
      return new globalThis.Response(null, { status: 302,
        headers: { location: 'https://logs.blob.core.windows.net/u2.log?sig=synthetic-unit-signature' } });
    }
    const format = parsed.searchParams.has('per_page') ? 'page' : 'json';
    const payload = await f.input.request(path, 'synthetic-unit-token', format);
    return new globalThis.Response(JSON.stringify(format === 'page' ? payload.data : payload), {
      headers: format === 'page' && payload.link ? { link: payload.link } : {} });
  };
  try { await run(input, calls); } finally { globalThis.fetch = original; }
}

test('production HTTP adapter and reader compose exact live authority with authenticated blob and redirect boundaries', async () => {
  const f = fixture({ extras: 100 });
  await withHttp(f, async (input, calls) => {
    const result = await fetchPrLedgerAuthority(input);
    assert.equal(result.ledger.schema, 'stocksense-image-exceptions-v2');
    assert.deepEqual(result.ledger.exceptions, []);
    assert.equal(result.authority.authorization.commentId, 501);
    assert.equal(result.authority.u2.ownerComment.commentId, 502);
    assert.ok(calls.some(call => call.url.includes('/comments?per_page=100&page=2')));
    assert.equal(calls.filter(call => call.url.startsWith('https://logs.blob.core.windows.net/')).length, 2);
    assert.equal((await result.revalidate()).u2.attempt, 2);
    assert.equal((await verifyRetainedPrLedgerAuthority(input, result.authority)).authority.currentRunId, 111);
  });
});

test('production transport refuses malformed, duplicate-key and unavailable HTTP evidence with stable codes', async t => {
  for (const [label, response, code] of [
    ['denied', () => new globalThis.Response('', { status: 403 }), 'PR_AUTH_API'],
    ['duplicate identity', () => new globalThis.Response('{"id":1361237685,"id":7}'), 'PR_AUTH_JSON'],
    ['truncated JSON', () => new globalThis.Response('{"id":'), 'PR_AUTH_JSON']
  ]) await t.test(label, async () => {
    await withHttp(fixture(), async input => {
      await assert.rejects(fetchPrLedgerAuthority(input), { code });
    }, path => path === P ? response() : undefined);
  });
});

test('short HTTP comment page cannot hide advertised continuation and owner conflicts', async () => {
  const f = fixture({ extras: 100 });
  await withHttp(f, async input => {
    await assert.rejects(fetchPrLedgerAuthority(input), { code: 'PR_AUTH_PAGINATION' });
  }, path => path.endsWith('/comments?per_page=100&page=1')
    ? new globalThis.Response(JSON.stringify(f.comments.slice(0, 2)), { headers: {
      link: `<https://api.github.com${P}/issues/74/comments?per_page=100&page=2>; rel="next"` } }) : undefined);
});

test('HTTP log redirects cannot leak credentials or substitute another origin', async () => {
  await withHttp(fixture(), async input => {
    await assert.rejects(fetchPrLedgerAuthority(input), { code: 'PR_AUTH_API' });
  }, path => path.endsWith('/actions/jobs/333/logs') ? new globalThis.Response(null, {
    status: 302, headers: { location: 'https://attacker.example/u2.log' } }) : undefined);
});

test('real adapter freshness rejects an owner comment removed after immutable evidence retrieval', async () => {
  await withHttp(fixture(), async input => {
    await assert.rejects(fetchPrLedgerAuthority(input), { code: 'PR_AUTH_API' });
  }, path => path === `${P}/issues/comments/501` ? new globalThis.Response('', { status: 404 }) : undefined);
});
