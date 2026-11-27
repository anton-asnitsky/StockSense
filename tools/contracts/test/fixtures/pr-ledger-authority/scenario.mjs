import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const REPO = 'anton-asnitsky/StockSense';
const P = `/repos/${REPO}`;
const BASE = '402ace3b195c291a756ed230a24a73199ef8349a';
const POLICY = '8cce4f8040ad0767fca1b1ab14a00bb067a66b76';
const WB = '6d546c763f783a261d6c708079e1ca84779370eb';
const PB = '2756247041676c61d949354c1d6d22ac139b0a4e';
const sha = n => n.toString(16).padStart(40, '0');
const digest = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const blobId = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const wb = await readFile(new URL('./trusted-workflow.yml', import.meta.url));
const pb = await readFile(new URL('./trusted-policy.mjs.txt', import.meta.url));
const realLog = await readFile(new URL('./u2-job.log', import.meta.url), 'utf8');
const log = realLog.replaceAll('2252d2109d47d3f26c6d6d0a035cea9be96ded81', sha(1));
const context = () => ({ eventName: 'pull_request', repository: REPO, pullNumber: 74,
  sourceRevision: sha(2), candidateGitTreeSha: sha(3), headSha: sha(1), baseSha: BASE,
  candidateTreeDigest: digest('candidate'), executionFingerprint: digest('execution'),
  runtimeManifestDigest: digest('runtime'), currentRunId: 111, currentRunAttempt: 1,
  token: 'synthetic-unit-token', now: () => new Date('2026-11-28T00:00:00Z') });
function fixture({ ledgerText = '{"schema":"stocksense-image-exceptions-v2","exceptions":[]}', extras = 0 } = {}) {
  const input = context(); const bytes = Buffer.from(ledgerText); const bid = blobId(bytes);
  const body = `StockSense PR ledger authority v1: repository=1361237685 pr=74 base=${BASE} head=${sha(1)} candidate=${input.candidateTreeDigest} execution=${input.executionFingerprint} runtime=${input.runtimeManifestDigest} ledgerCommit=${sha(4)} ledgerBlob=${bid} ledgerSha256=${digest(bytes)} policyCommit=${sha(1)} expires=2026-11-30T00:00:00Z`;
  const comment = (id, text) => ({ id, body: text, user: { id: 8492824, login: 'anton-asnitsky', type: 'User' },
    author_association: 'OWNER', issue_url: `https://api.github.com${P}/issues/74`,
    created_at: '2026-11-27T00:00:00Z', updated_at: '2026-11-27T00:00:00Z' });
  const allComments = [comment(501, body), comment(502, `StockSense protected CI approval: ${BASE} ${sha(1)}`),
    ...Array.from({ length: extras }, (_, i) => ({ ...comment(600 + i, 'ordinary comment'),
      user: { id: 999, login: 'someone', type: 'User' }, author_association: 'NONE' }))];
  const repo = { id: 1361237685, full_name: REPO, default_branch: 'main',
    owner: { id: 8492824, login: 'anton-asnitsky', type: 'User' } };
  const association = { number: 74, base: { repo: { id: repo.id } }, head: { repo: { id: repo.id }, sha: sha(999) } };
  const run = { id: 222, workflow_id: 386489834, path: '.github/workflows/public-pr-policy.yml',
    event: 'pull_request_target', head_sha: sha(1), repository: repo, head_repository: repo,
    run_attempt: 2, check_suite_id: 444, status: 'completed', conclusion: 'success', pull_requests: [association] };
  const job = { id: 333, name: 'U2 protected-base PR policy', run_id: 222, run_attempt: 2,
    head_sha: sha(1), status: 'completed', conclusion: 'success',
    check_run_url: `https://api.github.com${P}/check-runs/333`,
    steps: ['Check out only the protected base revision', 'Test the protected-base policy',
      'Check complete PR metadata without executing PR code', 'Complete job']
      .map(name => ({ name, status: 'completed', conclusion: 'success' })) };
  const check = { id: 333, name: job.name, head_sha: sha(1), check_suite: { id: 444 },
    status: 'completed', conclusion: 'success', app: { id: 15368, slug: 'github-actions', owner: { id: 9919, login: 'github' } } };
  const data = new Map([
    [P, repo], [`${P}/pulls/74`, { number: 74, state: 'open', merged: false, comments: allComments.length,
      base: { sha: BASE, ref: 'bolt/u1-candidate-ready', repo }, head: { sha: sha(1), repo }, merge_commit_sha: sha(2) }],
    [`${P}/git/commits/${sha(2)}`, { sha: sha(2), tree: { sha: sha(3) }, parents: [{ sha: BASE }, { sha: sha(1) }] }],
    [`${P}/actions/runs/111`, { id: 111, run_attempt: 1, event: 'pull_request',
      path: '.github/workflows/contracts-required.yml', head_sha: sha(1), repository: repo,
      head_repository: repo, pull_requests: [association] }],
    [`${P}/git/ref/heads/main`, { ref: 'refs/heads/main', object: { type: 'commit', sha: POLICY } }],
    [`${P}/actions/workflows/386489834`, { id: 386489834, path: run.path, state: 'active' }],
    [`${P}/actions/runs/222`, run], [`${P}/actions/runs/222/attempts/2`, run],
    [`${P}/check-runs/333`, check], [`${P}/actions/jobs/333/logs`, log],
    [`${P}/issues/comments/501`, allComments[0]], [`${P}/issues/comments/502`, allComments[1]],
    [`${P}/git/commits/${POLICY}`, { sha: POLICY, tree: { sha: sha(10) } }],
    [`${P}/git/commits/${sha(4)}`, { sha: sha(4), tree: { sha: sha(15) } }]
  ]);
  const tree = (id, entries) => data.set(`${P}/git/trees/${sha(id)}`, { sha: sha(id), truncated: false,
    tree: entries.map(([path, type, target]) => ({ path, type, sha: typeof target === 'number' ? sha(target) : target,
      mode: type === 'tree' ? '040000' : '100644' })) });
  tree(10, [['.github', 'tree', 11], ['security', 'tree', 14]]);
  tree(11, [['workflows', 'tree', 12], ['scripts', 'tree', 13]]);
  tree(12, [['public-pr-policy.yml', 'blob', WB]]); tree(13, [['public-pr-policy.mjs', 'blob', PB]]);
  tree(14, [['image-exceptions.json', 'blob', sha(99)]]);
  tree(15, [['security', 'tree', 16]]); tree(16, [['image-exceptions.json', 'blob', bid]]);
  for (const [id, contents] of [[WB, wb], [PB, pb], [bid, bytes]]) {
    data.set(`${P}/git/blobs/${id}`, { sha: id, encoding: 'base64', size: contents.length, content: contents.toString('base64') });
  }
  const counts = new Map(); const calls = []; let hook = (_path, result) => result;
  input.request = async (path, _token, format) => {
    calls.push({ path, format }); const count = (counts.get(path) ?? 0) + 1; counts.set(path, count);
    const url = new URL(`https://api.github.com${path}`); let result;
    if (format === 'page') {
      let rows, field;
      if (url.pathname.endsWith('/comments')) rows = allComments;
      else if (url.pathname.endsWith('/jobs')) { rows = [job]; field = 'jobs'; }
      else { rows = [run]; field = 'workflow_runs'; }
      const page = Number(url.searchParams.get('page'));
      const batch = rows.slice((page - 1) * 100, page * 100);
      url.searchParams.set('page', String(page + 1));
      result = { data: field ? { total_count: rows.length, [field]: batch } : batch,
        link: page * 100 < rows.length ? `<${url.href}>; rel="next"` : null };
    } else result = data.get(path);
    if (result === undefined) throw new Error(`Unexpected synthetic API path ${path}`);
    return hook(path, globalThis.structuredClone(result), count, format);
  };
  return { input, data, comments: allComments, run, job, check, body, bid, bytes, calls,
    hook(fn) { hook = fn; } };
}

export { REPO, P, BASE, POLICY, WB, PB, sha, digest, blobId, wb, pb, realLog, log, context, fixture };
