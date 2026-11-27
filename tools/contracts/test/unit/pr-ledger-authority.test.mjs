import { P, BASE, POLICY, WB, PB, sha, digest, blobId, wb, pb, realLog, log, context, fixture } from '../fixtures/pr-ledger-authority/scenario.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchPrLedgerAuthority, verifyRetainedPrLedgerAuthority, parsePrLedgerAuthorization,
  parseAuthorityJson, verifyU2LogProvenance, githubAuthorityRequest,
  assertPrLedgerAuthorityBinding } from '../../src/pr-ledger-authority.mjs';

const refuses = (promise, code) => assert.rejects(promise, error => error.code === code);

test('pure binding guard preserves exact independent source/runtime/blob and closed authority policy', async () => {
  const f = fixture(); const { authority } = await fetchPrLedgerAuthority(f.input);
  const binding = { ...f.input, ledgerBlobSha: f.bid, now: f.input.now() };
  assertPrLedgerAuthorityBinding(authority, binding);
  for (const [key, changed] of [['sourceRevision', sha(9)], ['candidateGitTreeSha', sha(9)],
    ['candidateTreeDigest', digest('other')], ['executionFingerprint', digest('other')],
    ['runtimeManifestDigest', digest('other')], ['ledgerBlobSha', sha(9)]]) {
    assert.throws(() => assertPrLedgerAuthorityBinding(authority, { ...binding, [key]: changed }),
      { code: 'PR_AUTH_BINDING' });
  }
  for (const change of [a => { a.type = 'protected-main'; }, a => { a.repositoryId = 7; },
    a => { a.u2.policyCommit = sha(9); }, a => { a.ledger.path = '../image-exceptions.json'; },
    a => { a.currentRunId = 0; }, a => { a.mergeParents.reverse(); }]) {
    const altered = globalThis.structuredClone(authority); change(altered);
    assert.throws(() => assertPrLedgerAuthorityBinding(altered, binding), { code: 'PR_AUTH_BINDING' });
  }
  assert.throws(() => assertPrLedgerAuthorityBinding(authority,
    { ...binding, now: new Date('2026-11-30T00:00:00Z') }), { code: 'PR_AUTH_BINDING' });
});

test('authentic pinned test blobs and actual U2 log prove trusted source distinct from compared base', () => {
  assert.equal(blobId(wb), WB); assert.equal(blobId(pb), PB);
  assert.equal(verifyU2LogProvenance(realLog, { baseSha: BASE,
    headSha: '2252d2109d47d3f26c6d6d0a035cea9be96ded81' }).policyCommit, POLICY);
});

test('complete live authority succeeds, revalidates and never labels contextual main as ledger authority', async t => {
  const f = fixture(); const result = await fetchPrLedgerAuthority(f.input);
  const initialRequests = f.calls.length;
  assert.equal(result.authority.type, 'owner-authorized-pr-ledger-v1');
  assert.equal(result.authority.ledger.blobSha, f.bid);
  assert.equal(result.authority.protectedMain.commit, POLICY);
  assert.equal(result.authority.u2.ownerComment.commentId, 502);
  assert.equal(result.authority.currentRunId, 111);
  assert.deepEqual(result.authority.mergeParents, [BASE, sha(1)]);
  assert.equal(Object.hasOwn(result.ledger, 'mainSha'), false);
  assert.equal((await result.revalidate()).u2.attempt, 2);
  const finalRevalidationRequests = f.calls.length - initialRequests;
  f.input.now = () => new Date('2026-11-28T00:00:01Z');
  assert.equal((await verifyRetainedPrLedgerAuthority(f.input, result.authority)).authority.retrievedAt,
    '2026-11-28T00:00:01.000Z');
  t.diagnostic(JSON.stringify({ initialRequests, finalRevalidationRequests,
    downstreamRequests: f.calls.length - initialRequests - finalRevalidationRequests,
    immutableBlobRequests: f.calls.filter(call => call.path.includes('/git/blobs/')).length }));
});

test('canonical authorization rejects whitespace, prose, reordered/duplicate fields and invalid timestamps', () => {
  const { body } = fixture(); assert.equal(parsePrLedgerAuthorization(body).pullNumber, 74);
  for (const changed of [body + '\n', body + '\r\n', ' ' + body, body + ' approved',
    body.replace(' pr=74', ' pr=074'), body.replace(' pr=74', ' pr=74 pr=74'),
    body.replace('2026-11-30', '2026-02-30'), body.replace('repository=1361237685', 'repository=9'),
    body.replace(`policyCommit=${sha(1)}`, `policyCommit=${sha(9)}`)]) {
    assert.throws(() => parsePrLedgerAuthorization(changed), error => ['PR_AUTH_COMMENT', 'PR_AUTH_TIME'].includes(error.code));
  }
});

test('strict JSON refuses duplicates, malformed bodies, deep nesting and oversized responses', () => {
  assert.deepEqual(parseAuthorityJson('{"nested":[true,false,null,-1.25e2,"a\\\"b"]}'),
    { nested: [true, false, null, -125, 'a"b'] });
  for (const value of ['{"a":1,"a":2}', '{"a":}', '[1,]', '"unterminated', '{} trailing',
    '['.repeat(26) + '0' + ']'.repeat(26), ' '.repeat(8 * 1024 * 1024 + 1)]) {
    assert.throws(() => parseAuthorityJson(value), { code: 'PR_AUTH_JSON' });
  }
});

test('execution eligibility refuses wrong event, PR, repository, base, digest and run identifiers', async t => {
  for (const [key, value] of [['eventName', 'push'], ['eventName', 'workflow_dispatch'], ['pullNumber', 73],
    ['repository', 'attacker/StockSense'], ['baseSha', sha(7)], ['headSha', sha(1) + '\n'],
    ['candidateTreeDigest', digest('candidate') + '\n'], ['currentRunId', 0], ['currentRunAttempt', '1'], ['token', '']]) {
    await t.test(`${key}=${value}`, async () => { const f = fixture(); f.input[key] = value;
      await refuses(fetchPrLedgerAuthority(f.input), 'PR_AUTH_CONTEXT'); assert.equal(f.calls.length, 0); });
  }
});

test('live repository, open same-repo PR and exact ordered merge parents are mandatory', async t => {
  const variants = [
    [P, row => { row.owner.id = 8; }, 'PR_AUTH_IDENTITY'],
    [P, row => { row.id = 8; }, 'PR_AUTH_IDENTITY'],
    [`${P}/pulls/74`, row => { row.state = 'closed'; }, 'PR_AUTH_PR'],
    [`${P}/pulls/74`, row => { row.head.repo = { id: 9, full_name: 'attacker/StockSense' }; }, 'PR_AUTH_PR'],
    [`${P}/pulls/74`, row => { row.base.sha = sha(9); }, 'PR_AUTH_PR'],
    [`${P}/pulls/74`, row => { row.merge_commit_sha = sha(9); }, 'PR_AUTH_PR'],
    [`${P}/git/commits/${sha(2)}`, row => { row.parents.reverse(); }, 'PR_AUTH_MERGE'],
    [`${P}/git/commits/${sha(2)}`, row => { row.tree.sha = sha(9); }, 'PR_AUTH_MERGE'],
    [`${P}/actions/runs/111`, row => { row.run_attempt = 2; }, 'PR_AUTH_EXECUTION'],
    [`${P}/actions/runs/111`, row => { row.event = 'workflow_dispatch'; }, 'PR_AUTH_EXECUTION'],
    [`${P}/git/ref/heads/main`, row => { row.object.sha = sha(9); }, 'PR_AUTH_U2_SOURCE']
  ];
  for (const [path, mutate, code] of variants) await t.test(path + code, async () => {
    const f = fixture(); mutate(f.data.get(path)); await refuses(fetchPrLedgerAuthority(f.input), code);
  });
});

test('owner statement rejects spoofed, edited, expired, duplicate and conflicting comments', async t => {
  for (const [label, mutate, code] of [
    ['wrong numeric owner', f => { f.comments[0].user.id = 4; }, 'PR_AUTH_COMMENT'],
    ['wrong association', f => { f.comments[0].author_association = 'MEMBER'; }, 'PR_AUTH_COMMENT'],
    ['edited', f => { f.comments[0].updated_at = '2026-11-27T01:00:00Z'; }, 'PR_AUTH_COMMENT'],
    ['wrong PR', f => { f.comments[0].issue_url = `https://api.github.com${P}/issues/75`; }, 'PR_AUTH_COMMENT'],
    ['expired', f => { f.comments[0].body = f.body.replace('2026-11-30', '2026-11-27'); }, 'PR_AUTH_TIME'],
    ['too long', f => { f.comments[0].body = f.body.replace('2026-11-30', '2026-12-05'); }, 'PR_AUTH_TIME'],
    ['past sunset', f => { f.comments[0].created_at = f.comments[0].updated_at = '2026-12-08T00:00:00Z';
      f.comments[0].body = f.body.replace('2026-11-30', '2026-12-11'); f.input.now = () => new Date('2026-12-09T00:00:00Z'); }, 'PR_AUTH_TIME'],
    ['wrong measured candidate', f => { f.comments[0].body = f.body.replace(digest('candidate'), digest('wrong')); }, 'PR_AUTH_BINDING'],
    ['missing U2', f => { f.comments[1].body = 'not approval'; }, 'PR_AUTH_U2_COMMENT'],
    ['duplicate', f => { f.comments.push({ ...f.comments[0], id: 503 }); f.data.get(`${P}/pulls/74`).comments++; }, 'PR_AUTH_COMMENT'],
    ['conflicting', f => { f.comments.push({ ...f.comments[0], id: 503,
      body: f.body.replace(digest('candidate'), digest('wrong')) }); f.data.get(`${P}/pulls/74`).comments++; }, 'PR_AUTH_COMMENT']
  ]) await t.test(label, async () => { const f = fixture(); mutate(f); await refuses(fetchPrLedgerAuthority(f.input), code); });
});

test('ledger object path, regular mode, complete tree, hashes, encoding and closed schema are enforced', async t => {
  for (const [label, mutate, code] of [
    ['symlink', f => { f.data.get(`${P}/git/trees/${sha(16)}`).tree[0].mode = '120000'; }, 'PR_AUTH_TREE'],
    ['ancestor blob', f => { f.data.get(`${P}/git/trees/${sha(15)}`).tree[0].type = 'blob'; }, 'PR_AUTH_TREE'],
    ['path absent', f => { f.data.get(`${P}/git/trees/${sha(16)}`).tree[0].path = '../image-exceptions.json'; }, 'PR_AUTH_TREE'],
    ['truncated', f => { f.data.get(`${P}/git/trees/${sha(16)}`).truncated = true; }, 'PR_AUTH_TREE'],
    ['wrong tree blob', f => { f.data.get(`${P}/git/trees/${sha(16)}`).tree[0].sha = sha(9); }, 'PR_AUTH_BLOB'],
    ['wrong decoded hash', f => { f.data.get(`${P}/git/blobs/${f.bid}`).content = Buffer.alloc(f.bytes.length).toString('base64'); }, 'PR_AUTH_BLOB'],
    ['wrong size', f => { f.data.get(`${P}/git/blobs/${f.bid}`).size++; }, 'PR_AUTH_BLOB'],
    ['oversize', f => { f.data.get(`${P}/git/blobs/${f.bid}`).size = 1024 * 1024 + 1; }, 'PR_AUTH_BLOB'],
    ['encoding', f => { f.data.get(`${P}/git/blobs/${f.bid}`).content = '!notbase64'; }, 'PR_AUTH_BLOB'],
    ['SHA256', f => { f.comments[0].body = f.body.replace(digest(f.bytes), digest('other')); }, 'PR_AUTH_BLOB']
  ]) await t.test(label, async () => { const f = fixture(); mutate(f); await refuses(fetchPrLedgerAuthority(f.input), code); });
  for (const ledgerText of ['{"schema":"stocksense-image-exceptions-v1","exceptions":[]}',
    '{"schema":"stocksense-image-exceptions-v2","exceptions":[],"extra":true}',
    '{"schema":"stocksense-image-exceptions-v2","exceptions":[],"exceptions":[1]}', 'null']) {
    await refuses(fetchPrLedgerAuthority(fixture({ ledgerText }).input), 'PR_AUTH_LEDGER');
  }
});

test('U2 requires immutable run/job/check heads and trusted workflow/app/attempt identities', async t => {
  for (const [label, mutate, code] of [
    ['old immutable head with new nested head', f => { f.run.head_sha = sha(9); f.run.pull_requests[0].head.sha = sha(1); }, 'PR_AUTH_U2'],
    ['failed latest attempt', f => { f.run.conclusion = 'failure'; }, 'PR_AUTH_U2'],
    ['wrong event', f => { f.run.event = 'pull_request'; }, 'PR_AUTH_U2'],
    ['wrong workflow', f => { f.run.workflow_id = 7; }, 'PR_AUTH_U2'],
    ['old job attempt', f => { f.job.run_attempt = 1; }, 'PR_AUTH_U2'],
    ['old job head', f => { f.job.head_sha = sha(9); }, 'PR_AUTH_U2'],
    ['wrong job name', f => { f.job.name = 'fake U2'; }, 'PR_AUTH_U2'],
    ['skipped policy step', f => { f.job.steps[2].conclusion = 'skipped'; }, 'PR_AUTH_U2'],
    ['wrong app', f => { f.check.app.id = 8; }, 'PR_AUTH_U2'],
    ['old check head', f => { f.check.head_sha = sha(9); }, 'PR_AUTH_U2'],
    ['wrong check suite', f => { f.check.check_suite.id = 8; }, 'PR_AUTH_U2'],
    ['wrong policy blob', f => { f.data.get(`${P}/git/trees/${sha(13)}`).tree[0].sha = sha(8); }, 'PR_AUTH_U2_SOURCE']
  ]) await t.test(label, async () => { const f = fixture(); mutate(f); await refuses(fetchPrLedgerAuthority(f.input), code); });
});

test('U2 log grammar refuses missing, duplicate, wrong-source, wrong-base and truncated evidence', () => {
  for (const changed of [log.slice(0, -1), log.replace('Cleaning up orphan processes', 'incomplete'),
    log.replaceAll(POLICY, sha(9)), log.replace(`Protected base ${BASE}`, `Protected base ${sha(9)}`),
    log + log, log.replace('  ref: ', '  unrelated: '), log.replace('protected paths approved', 'protected paths not approved'),
    log + '2026-11-26T20:59:10.0000000Z log truncated\n']) {
    assert.throws(() => verifyU2LogProvenance(changed, context()), { code: 'PR_AUTH_U2_LOG' });
  }
});

test('complete comment pagination accepts multiple pages and rejects incomplete or foreign continuations', async t => {
  const complete = fixture({ extras: 100 }); await fetchPrLedgerAuthority(complete.input);
  assert.ok(complete.calls.some(call => call.path.includes('comments?per_page=100&page=2')));
  for (const [label, change] of [
    ['missing next', row => { row.link = null; }],
    ['foreign next', row => { row.link = row.link.replace('api.github.com', 'attacker.example'); }],
    ['duplicate next', row => { row.link += ', ' + row.link; }],
    ['skipped page', row => { row.link = row.link.replace('page=2', 'page=3'); }],
    ['short page with more', row => { row.data.pop(); }]
  ]) await t.test(label, async () => {
    const f = fixture({ extras: 100 }); f.hook((path, row) => {
      if (path.includes('/comments?') && path.endsWith('page=1')) change(row); return row;
    }); await refuses(fetchPrLedgerAuthority(f.input), 'PR_AUTH_PAGINATION');
  });
  const duplicate = fixture({ extras: 100 }); duplicate.comments[100].id = 501;
  await refuses(fetchPrLedgerAuthority(duplicate.input), 'PR_AUTH_PAGINATION');
});

test('run/job total counts cannot conceal partial results', async () => {
  const f = fixture(); f.hook((path, row) => {
    if (path.includes('/runs?')) { row.data.total_count = 2; row.link = `<https://api.github.com${path.replace('page=1', 'page=2')}>; rel="next"`; }
    return row;
  }); await refuses(fetchPrLedgerAuthority(f.input), 'PR_AUTH_PAGINATION');
});

test('terminal rechecks reject changed PR/comments/run/check/main and expiration during retrieval', async t => {
  const cases = [
    [`${P}/pulls/74`, row => { row.head.sha = sha(8); }, 'PR_AUTH_PR'],
    [`${P}/actions/runs/111`, row => { row.run_attempt = 2; }, 'PR_AUTH_RACE'],
    [`${P}/actions/runs/222`, row => { row.run_attempt = 3; }, 'PR_AUTH_RACE'],
    [`${P}/check-runs/333`, row => { row.conclusion = 'failure'; }, 'PR_AUTH_RACE'],
    [`${P}/git/ref/heads/main`, row => { row.object.sha = sha(8); }, 'PR_AUTH_RACE']
  ];
  for (const [target, change, code] of cases) await t.test(target, async () => {
    const f = fixture(); f.hook((path, row, count) => { if (path === target && count >= 2) change(row); return row; });
    await refuses(fetchPrLedgerAuthority(f.input), code);
  });
  for (const id of [501, 502]) {
    const f = fixture(); f.hook((path, row) => { if (path === `${P}/issues/comments/${id}`) row.id = 999; return row; });
    await refuses(fetchPrLedgerAuthority(f.input), 'PR_AUTH_RACE');
  }
  const f = fixture(); let ticks = 0;
  f.input.now = () => new Date(++ticks === 1 ? '2026-11-28T00:00:00Z' : '2026-11-30T00:00:00Z');
  await refuses(fetchPrLedgerAuthority(f.input), 'PR_AUTH_TIME');
});

test('live consumer verification rejects revoked, replaced, cross-run and extended receipts', async () => {
  const f = fixture(); const result = await fetchPrLedgerAuthority(f.input);
  f.data.set(`${P}/actions/runs/999`, { ...f.data.get(`${P}/actions/runs/111`), id: 999 });
  await refuses(verifyRetainedPrLedgerAuthority({ ...f.input, currentRunId: 999 }, result.authority), 'PR_AUTH_RECEIPT');
  for (const mutate of [r => { r.currentRunAttempt = 2; }, r => { r.authorization.commentId = 600; },
    r => { r.u2.attempt = 3; }, r => { r.ledger.extra = undefined; }, r => { r.extra = true; },
    r => { r.retrievedAt = '1'; }, r => { r.retrievedAt = '2026-12-01T00:00:00.000Z'; },
    r => { r.retrievedAt = '2026-11-26T00:00:00.000Z'; }]) {
    const retained = globalThis.structuredClone(result.authority); mutate(retained);
    await refuses(verifyRetainedPrLedgerAuthority(f.input, retained), 'PR_AUTH_RECEIPT');
  }
  f.comments[0].updated_at = '2026-11-28T00:00:00Z';
  await refuses(result.revalidate(), 'PR_AUTH_COMMENT');
});

test('new U2 run, edited body and duplicate owner statement appearing during verification are refused', async () => {
  const runRace = fixture(); runRace.hook((path, row, count) => {
    if (path.includes('/runs?') && count === 2) {
      row.data.workflow_runs.push({ ...row.data.workflow_runs[0], id: 223 }); row.data.total_count++;
    } return row;
  }); await refuses(fetchPrLedgerAuthority(runRace.input), 'PR_AUTH_RACE');
  const bodyRace = fixture(); bodyRace.hook((path, row, count) => {
    if (path.includes('/comments?') && count === 2) row.data[0].body += ' edited'; return row;
  }); await refuses(fetchPrLedgerAuthority(bodyRace.input), 'PR_AUTH_RACE');
  const duplicateRace = fixture({ extras: 1 }); duplicateRace.hook((path, row, count) => {
    if (path.includes('/comments?') && count === 2) row.data[2] = { ...row.data[0], id: 503 }; return row;
  }); await refuses(fetchPrLedgerAuthority(duplicateRace.input), 'PR_AUTH_RACE');
});

test('genuine expiration and listing bound fail closed', async () => {
  const expired = fixture(); expired.comments[0].body = expired.body.replace('2026-11-30T00:00:00Z', '2026-11-27T12:00:00Z');
  await refuses(fetchPrLedgerAuthority(expired.input), 'PR_AUTH_COMMENT');
  const oversized = fixture(); oversized.data.get(`${P}/pulls/74`).comments = 10001;
  await refuses(fetchPrLedgerAuthority(oversized.input), 'PR_AUTH_PAGINATION');
  const sunset = fixture(); sunset.input.now = () => new Date('2026-12-10T23:59:59Z');
  await refuses(fetchPrLedgerAuthority(sunset.input), 'PR_AUTH_TIME');
});

test('observed GitHub numeric repository pagination is equivalent only for the pinned repository', async () => {
  const f = fixture({ extras: 100 }); f.hook((_path, row, _count, format) => {
    if (format === 'page' && row.link) row.link = row.link.replace(P, '/repositories/1361237685'); return row;
  }); await fetchPrLedgerAuthority(f.input);
  f.hook((_path, row, _count, format) => {
    if (format === 'page' && row.link) row.link = row.link.replace(P, '/repositories/999'); return row;
  }); await refuses(fetchPrLedgerAuthority(f.input), 'PR_AUTH_PAGINATION');
});

test('HTTP transport enforces response bounds and never surfaces failing-request secrets', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new globalThis.Response('a'.repeat(4 * 1024 * 1024 + 1));
    await refuses(githubAuthorityRequest(`${P}/actions/jobs/333/logs`, 'unit-token', 'text'), 'PR_AUTH_API');
    globalThis.fetch = async () => new globalThis.Response(Uint8Array.from([255]));
    await refuses(githubAuthorityRequest(`${P}/pulls/74`, 'unit-token'), 'PR_AUTH_API');
    globalThis.fetch = async () => { throw new Error('unit-token-sensitive'); };
    await assert.rejects(githubAuthorityRequest(P, 'unit-token'), error =>
      error.code === 'PR_AUTH_API' && !error.message.includes('unit-token-sensitive'));
    await refuses(githubAuthorityRequest('/repos/foreign/project/pulls/74', 'unit-token'), 'PR_AUTH_API');
    globalThis.fetch = async () => new globalThis.Response('[]', { headers: { link: '<https://api.github.com/repositories/1361237685/issues/74/comments?per_page=100&page=2>; rel="next"' } });
    const page = await githubAuthorityRequest(`${P}/issues/74/comments?per_page=100&page=1`, 'unit-token', 'page');
    assert.deepEqual(page.data, []); assert.match(page.link, /repositories\/1361237685/);
  } finally { globalThis.fetch = original; }
});

test('HTTP adapter refuses failed responses, malformed JSON and credential-bearing redirects', async t => {
  const original = globalThis.fetch;
  try {
    for (const [scenario, code] of [
      [async () => new globalThis.Response('', { status: 403 }), 'PR_AUTH_API'],
      [async () => new globalThis.Response('{"id":1,"id":2}'), 'PR_AUTH_JSON'],
      [async () => { throw new Error('synthetic secret must not be surfaced'); }, 'PR_AUTH_API']
    ]) { globalThis.fetch = scenario; await refuses(githubAuthorityRequest(`${P}/pulls/74`, 'unit-token'), code); }
    const calls = [];
    globalThis.fetch = async (url, options) => {
      calls.push({ url: String(url), options });
      return calls.length === 1 ? new globalThis.Response('', { status: 302,
        headers: { location: 'https://logs.blob.core.windows.net/archive/log?sig=synthetic' } }) : new globalThis.Response('plain log');
    };
    assert.equal(await githubAuthorityRequest(`${P}/actions/jobs/333/logs`, 'unit-token', 'text'), 'plain log');
    assert.match(calls[0].options.headers.Authorization, /^Bearer /);
    assert.equal(calls[1].options.headers, undefined);
    for (const location of ['https://attacker.example/log', 'http://logs.blob.core.windows.net/log',
      'https://user:password@logs.blob.core.windows.net/log', 'https://logs.blob.core.windows.net:8443/log']) {
      await t.test(location, async () => { globalThis.fetch = async () => new globalThis.Response('', { status: 302, headers: { location } });
        await refuses(githubAuthorityRequest(`${P}/actions/jobs/333/logs`, 'unit-token', 'text'), 'PR_AUTH_API'); });
    }
  } finally { globalThis.fetch = original; }
});
