import { createHash } from 'node:crypto';
import { TextDecoder } from 'node:util';

const REPOSITORY = 'anton-asnitsky/StockSense';
const PREFIX = `/repos/${REPOSITORY}`;
const REPOSITORY_ID = 1361237685;
const OWNER_ID = 8492824;
const OWNER = 'anton-asnitsky';
const BASE = '402ace3b195c291a756ed230a24a73199ef8349a';
const POLICY = '8cce4f8040ad0767fca1b1ab14a00bb067a66b76';
const WORKFLOW = '.github/workflows/public-pr-policy.yml';
const WORKFLOW_BLOB = '6d546c763f783a261d6c708079e1ca84779370eb';
const POLICY_BLOB = '2756247041676c61d949354c1d6d22ac139b0a4e';
const WORKFLOW_ID = 386489834;
const JOB = 'U2 protected-base PR policy';
const PATH = 'security/image-exceptions.json';
const TAG = 'owner-authorized-pr-ledger-v1';
const SUNSET = Date.parse('2026-12-10T23:59:59Z');
const WEEK = 7 * 24 * 60 * 60 * 1000;
const SHA = /^[0-9a-f]{40}(?![\s\S])/;
const DIGEST = /^sha256:[0-9a-f]{64}(?![\s\S])/;
const MAX_BLOB = 1024 * 1024;
const MAX_RESPONSE = 8 * MAX_BLOB;
const MAX_LOG = 4 * MAX_BLOB;
const AUTH_PREFIX = 'StockSense PR ledger authority v1: ';
const hash = value => `sha256:${createHash('sha256').update(value).digest('hex')}`;
const blobHash = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const positive = value => Number.isSafeInteger(value) && value > 0;
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));

export class PrLedgerAuthorityError extends Error {
  constructor(code, message) { super(`PR ledger refused: ${message}`); this.code = code; }
}
/** @param {unknown} condition @returns {asserts condition} */
function requireValue(condition, code, message) {
  if (!condition) throw new PrLedgerAuthorityError(code, message);
}
function instant(value) {
  requireValue(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value.replace('Z', '.000Z'),
  'PR_AUTH_TIME', 'timestamp is not canonical UTC');
  return Date.parse(value);
}

/** Strict bounded JSON: duplicate keys and excessive depth are refused before use. */
export function parseAuthorityJson(text) {
  requireValue(typeof text === 'string' && Buffer.byteLength(text) <= MAX_RESPONSE,
    'PR_AUTH_JSON', 'JSON response is oversized');
  let offset = 0, nodes = 0;
  const space = () => { while (/[ \t\r\n]/.test(text[offset] ?? '') && offset < text.length) offset++; };
  const string = () => {
    const start = offset++;
    while (offset < text.length) {
      if (text[offset] === '\\') { offset += 2; continue; }
      if (text[offset++] === '"') return JSON.parse(text.slice(start, offset));
    }
    throw new Error('unterminated string');
  };
  const value = depth => {
    requireValue(depth <= 24 && ++nodes <= 100000, 'PR_AUTH_JSON', 'JSON structural bound exceeded');
    space();
    if (text[offset] === '"') return string();
    if (text[offset] === '{') {
      offset++; space(); const result = {}; const keys = new Set();
      if (text[offset] === '}') { offset++; return result; }
      for (;;) {
        space(); if (text[offset] !== '"') throw new Error('object key missing');
        const key = string(); requireValue(!keys.has(key), 'PR_AUTH_JSON', 'duplicate JSON key'); keys.add(key);
        space(); if (text[offset++] !== ':') throw new Error('colon missing');
        Object.defineProperty(result, key, { value: value(depth + 1), enumerable: true });
        space(); const next = text[offset++]; if (next === '}') return result;
        if (next !== ',') throw new Error('object separator missing');
      }
    }
    if (text[offset] === '[') {
      offset++; space(); const result = [];
      if (text[offset] === ']') { offset++; return result; }
      for (;;) {
        result.push(value(depth + 1)); space(); const next = text[offset++];
        if (next === ']') return result;
        if (next !== ',') throw new Error('array separator missing');
      }
    }
    const match = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(offset));
    if (!match) throw new Error('invalid value'); offset += match[0].length;
    return JSON.parse(match[0]);
  };
  try { const result = value(0); space(); if (offset !== text.length) throw new Error('trailing JSON'); return result; }
  catch (error) {
    if (error instanceof PrLedgerAuthorityError) throw error;
    throw new PrLedgerAuthorityError('PR_AUTH_JSON', 'malformed JSON response');
  }
}

/** Only GitHub API requests receive credentials; signed log redirects never do. */
export async function githubAuthorityRequest(path, token, format = 'json') {
  requireValue(typeof path === 'string' && (path === PREFIX || path.startsWith(`${PREFIX}/`)) &&
    !/[\x00-\x20\\#]/.test(path) && !path.includes('..') && ['json', 'page', 'text'].includes(format),
  'PR_AUTH_API', 'invalid API request');
  try {
    const signal = globalThis.AbortSignal.timeout(15000);
    let response = await fetch(`https://api.github.com${path}`, {
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28' }, redirect: 'manual', signal });
    if (response.status === 302 && format === 'text' && /\/actions\/jobs\/\d+\/logs$/.test(path)) {
      const url = new URL(response.headers.get('location') ?? '');
      requireValue(url.protocol === 'https:' && !url.username && !url.password && !url.port &&
        !url.hash && /^[a-z0-9-]+\.blob\.core\.windows\.net$/.test(url.hostname),
      'PR_AUTH_API', 'untrusted job-log redirect');
      response = await fetch(url, { redirect: 'error', signal });
    }
    requireValue(response.ok && response.body, 'PR_AUTH_API', 'GitHub evidence is unavailable');
    const maxBytes = format === 'text' ? MAX_LOG : MAX_RESPONSE;
    const chunks = []; let count = 0;
    for await (const chunk of response.body) {
      count += chunk.length;
      requireValue(count <= maxBytes, 'PR_AUTH_API', 'GitHub response exceeds bound'); chunks.push(chunk);
    }
    const text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
    if (format === 'text') return text;
    const data = parseAuthorityJson(text);
    return format === 'page' ? { data, link: response.headers.get('link') } : data;
  } catch (error) {
    if (error instanceof PrLedgerAuthorityError) throw error;
    throw new PrLedgerAuthorityError('PR_AUTH_API', 'GitHub evidence request failed');
  }
}

const AUTH = /^StockSense PR ledger authority v1: repository=([1-9]\d*) pr=(74|75|76) base=([0-9a-f]{40}) head=([0-9a-f]{40}) candidate=(sha256:[0-9a-f]{64}) execution=(sha256:[0-9a-f]{64}) runtime=(sha256:[0-9a-f]{64}) ledgerCommit=([0-9a-f]{40}) ledgerBlob=([0-9a-f]{40}) ledgerSha256=(sha256:[0-9a-f]{64}) policyCommit=([0-9a-f]{40}) expires=(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)$/;
export function parsePrLedgerAuthorization(body) {
  requireValue(typeof body === 'string' && body.length < 2048, 'PR_AUTH_COMMENT', 'authorization body is unavailable');
  const match = AUTH.exec(body);
  requireValue(match && match[0] === body, 'PR_AUTH_COMMENT', 'authorization does not match the canonical grammar');
  const [, repositoryId, pullNumber, baseSha, headSha, candidateTreeDigest, executionFingerprint,
    runtimeManifestDigest, ledgerCommit, ledgerBlob, ledgerSha256, policyCommit, expires] = match;
  requireValue(Number(repositoryId) === REPOSITORY_ID && baseSha === BASE && policyCommit === headSha,
    'PR_AUTH_COMMENT', 'authorization names a different authority');
  instant(expires);
  return { repositoryId: Number(repositoryId), pullNumber: Number(pullNumber), baseSha, headSha,
    candidateTreeDigest, executionFingerprint, runtimeManifestDigest, ledgerCommit, ledgerBlob,
    ledgerSha256, policyCommit, expires };
}

/** Logs bind trusted checkout and compared revisions; they are not signed attestations. */
export function verifyU2LogProvenance(log, { baseSha, headSha }) {
  requireValue(typeof log === 'string' && Buffer.byteLength(log) <= MAX_LOG && log.endsWith('\n') &&
    !/\b(?:log truncated|logs? (?:have been )?truncated)\b/i.test(log),
  'PR_AUTH_U2_LOG', 'job log is missing, oversized or truncated');
  const lines = log.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').split('\n').slice(0, -1).map(line => {
    const match = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3,9}Z (.*)$/.exec(line);
    requireValue(match, 'PR_AUTH_U2_LOG', 'job log framing is ambiguous'); return match[1];
  });
  const refs = lines.filter(line => /^  ref: /.test(line));
  const checkouts = lines.filter(line => /^\[command\].*git checkout /.test(line));
  const revisions = lines.flatMap((line, index) => line === '[command]/usr/bin/git log -1 --format=%H'
    ? [lines[index + 1]] : []);
  const summaries = lines.filter(line => line.startsWith('Protected base '));
  const summary = new RegExp(`^Protected base ${baseSha}, head ${headSha}, ([1-9][0-9]*) changed paths compared, ([1-9][0-9]*) protected paths approved by repository owner for this exact head$`);
  const counts = summaries.length === 1 ? summary.exec(summaries[0]) : null;
  requireValue(refs.length === 1 && refs[0] === `  ref: ${POLICY}` && checkouts.length === 1 &&
    checkouts[0] === `[command]/usr/bin/git checkout --progress --force ${POLICY}` &&
    revisions.length === 1 && revisions[0] === POLICY && counts &&
    Number.isSafeInteger(Number(counts[1])) && Number(counts[2]) <= Number(counts[1]) &&
    lines.filter(line => line === `Complete job name: ${JOB}`).length === 1 &&
    lines.at(-1) === 'Cleaning up orphan processes' &&
    lines.indexOf(refs[0]) < lines.indexOf(checkouts[0]) &&
    lines.indexOf(checkouts[0]) < lines.indexOf(POLICY) && lines.indexOf(POLICY) < lines.indexOf(summaries[0]),
  'PR_AUTH_U2_LOG', 'trusted checkout or compared revisions are not uniquely proven');
  return { policyCommit: POLICY, logDigest: hash(log) };
}

function assertInput(input) {
  requireValue(input.eventName === 'pull_request' && input.repository === REPOSITORY &&
    [74, 75, 76].includes(input.pullNumber) && input.baseSha === BASE && SHA.test(input.headSha ?? '') &&
    SHA.test(input.sourceRevision ?? '') && SHA.test(input.candidateGitTreeSha ?? '') &&
    DIGEST.test(input.candidateTreeDigest ?? '') && DIGEST.test(input.executionFingerprint ?? '') &&
    DIGEST.test(input.runtimeManifestDigest ?? '') && positive(input.currentRunId) &&
    positive(input.currentRunAttempt) && typeof input.token === 'string' && input.token.length > 0,
  'PR_AUTH_CONTEXT', 'PR authority is not eligible in this execution context');
}
function assertRepository(repo) {
  requireValue(repo?.id === REPOSITORY_ID && repo.full_name === REPOSITORY && repo.default_branch === 'main' &&
    repo.owner?.id === OWNER_ID && repo.owner.login === OWNER && repo.owner.type === 'User',
  'PR_AUTH_IDENTITY', 'repository or owner identity differs');
}
function assertPull(pull, input) {
  requireValue(pull?.number === input.pullNumber && pull.state === 'open' && pull.merged === false &&
    pull.base?.sha === BASE && pull.base.ref === 'bolt/u1-candidate-ready' &&
    pull.head?.sha === input.headSha && pull.head.repo?.id === REPOSITORY_ID &&
    pull.base.repo?.id === REPOSITORY_ID && pull.head.repo.full_name === REPOSITORY &&
    pull.base.repo.full_name === REPOSITORY && pull.merge_commit_sha === input.sourceRevision,
  'PR_AUTH_PR', 'PR is closed, foreign, moved or has a different test merge');
}
function ownerComment(comment, pullNumber) {
  return positive(comment?.id) && comment.user?.id === OWNER_ID && comment.user.login === OWNER &&
    comment.user.type === 'User' && comment.author_association === 'OWNER' &&
    comment.issue_url === `https://api.github.com${PREFIX}/issues/${pullNumber}` &&
    comment.created_at === comment.updated_at;
}
function commentReceipt(comment) {
  return { commentId: comment.id, bodyDigest: hash(comment.body), createdAt: comment.created_at,
    updatedAt: comment.updated_at };
}
function pagination(link, path, page, more) {
  requireValue(link === null || typeof link === 'string', 'PR_AUTH_PAGINATION', 'pagination metadata is missing');
  const seen = new Set(); let next;
  const expected = new URL(`https://api.github.com${path}`);
  for (const entry of (link ? link.split(',') : [])) {
    const match = /^\s*<([^<>]+)>; rel="(next|prev|first|last)"\s*$/.exec(entry);
    requireValue(match && !seen.has(match[2]), 'PR_AUTH_PAGINATION', 'pagination relation is ambiguous');
    seen.add(match[2]); let url;
    try { url = new URL(match[1]); } catch { throw new PrLedgerAuthorityError('PR_AUTH_PAGINATION', 'pagination URL is invalid'); }
    const expectedKeys = [...expected.searchParams.keys(), 'per_page', 'page'].sort();
    const actualKeys = [...url.searchParams.keys()].sort();
    const numericPath = expected.pathname.replace(PREFIX, `/repositories/${REPOSITORY_ID}`);
    requireValue(url.origin === expected.origin && [expected.pathname, numericPath].includes(url.pathname) && !url.hash &&
      !url.username && !url.password && JSON.stringify(actualKeys) === JSON.stringify(expectedKeys) &&
      [...expected.searchParams].every(([key, value]) => url.searchParams.get(key) === value) &&
      url.searchParams.get('per_page') === '100' && /^[1-9][0-9]*$/.test(url.searchParams.get('page') ?? '') &&
      Number(url.searchParams.get('page')) <= 100,
    'PR_AUTH_PAGINATION', 'pagination continuation is outside the bounded endpoint');
    if (match[2] === 'next') next = Number(url.searchParams.get('page'));
  }
  requireValue(more ? next === page + 1 : next === undefined,
    'PR_AUTH_PAGINATION', 'pagination continuation disagrees with complete count');
}
async function comments(request, token, number, total) {
  requireValue(Number.isInteger(total) && total >= 0 && total <= 10000,
    'PR_AUTH_PAGINATION', 'PR comment count is unavailable or oversized');
  const rows = []; const ids = new Set();
  for (let page = 1; page <= 100; page++) {
    const path = `${PREFIX}/issues/${number}/comments`;
    const response = await request(`${path}?per_page=100&page=${page}`, token, 'page');
    const batch = response?.data;
    requireValue(Array.isArray(batch) && batch.length <= 100, 'PR_AUTH_PAGINATION', 'comment page is invalid');
    for (const row of batch) {
      requireValue(positive(row?.id) && !ids.has(row.id), 'PR_AUTH_PAGINATION', 'comment pagination repeats an identity');
      ids.add(row.id); rows.push(row);
    }
    requireValue(rows.length <= total, 'PR_AUTH_PAGINATION', 'PR comment count changed');
    pagination(response.link, path, page, rows.length < total);
    if (rows.length === total) return rows;
    requireValue(batch.length === 100, 'PR_AUTH_PAGINATION', 'comment listing ended early');
  }
  throw new PrLedgerAuthorityError('PR_AUTH_PAGINATION', 'comment listing exceeds bound');
}
async function countedPages(request, token, path, field) {
  const rows = []; const ids = new Set(); let total;
  for (let page = 1; page <= 100; page++) {
    const fetched = await request(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`, token, 'page');
    const response = fetched?.data;
    requireValue(Number.isSafeInteger(response?.total_count) && response.total_count >= 0 &&
      response.total_count <= 10000 && (total === undefined || response.total_count === total) &&
      Array.isArray(response[field]) && response[field].length <= 100,
    'PR_AUTH_PAGINATION', 'run/job listing is incomplete or changed');
    total = response.total_count;
    for (const row of response[field]) {
      requireValue(positive(row?.id) && !ids.has(row.id), 'PR_AUTH_PAGINATION', 'run/job identity repeats');
      ids.add(row.id); rows.push(row);
    }
    requireValue(rows.length <= total, 'PR_AUTH_PAGINATION', 'run/job count disagrees');
    pagination(fetched.link, path, page, rows.length < total);
    if (rows.length === total) return rows;
    requireValue(response[field].length === 100, 'PR_AUTH_PAGINATION', 'run/job listing ended early');
  }
  throw new PrLedgerAuthorityError('PR_AUTH_PAGINATION', 'run/job listing exceeds bound');
}
function decodeBlob(blob, expected, max = MAX_BLOB) {
  requireValue(blob?.sha === expected && blob.encoding === 'base64' && typeof blob.content === 'string' &&
    Number.isInteger(blob.size) && blob.size >= 0 && blob.size <= max && blob.content.length <= max * 2,
  'PR_AUTH_BLOB', 'immutable blob is missing or oversized');
  const encoded = blob.content.replace(/\s/g, '');
  requireValue(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded),
    'PR_AUTH_BLOB', 'blob encoding is invalid');
  const bytes = Buffer.from(encoded, 'base64');
  requireValue(bytes.length === blob.size && bytes.toString('base64') === encoded && blobHash(bytes) === expected,
    'PR_AUTH_BLOB', 'immutable blob identity disagrees');
  return bytes;
}
async function regularBlob(request, token, commitSha, path) {
  const commit = await request(`${PREFIX}/git/commits/${commitSha}`, token);
  requireValue(commit?.sha === commitSha && SHA.test(commit.tree?.sha ?? ''), 'PR_AUTH_TREE', 'commit tree is missing');
  let treeSha = commit.tree.sha; const parts = path.split('/');
  for (let index = 0; index < parts.length; index++) {
    const tree = await request(`${PREFIX}/git/trees/${treeSha}`, token);
    requireValue(tree?.sha === treeSha && tree.truncated === false && Array.isArray(tree.tree),
      'PR_AUTH_TREE', 'immutable tree is missing or truncated');
    const matches = tree.tree.filter(row => row.path === parts[index]);
    const final = index === parts.length - 1; const row = matches[0];
    requireValue(matches.length === 1 && SHA.test(row?.sha ?? '') &&
      (final ? row.type === 'blob' && ['100644', '100755'].includes(row.mode)
        : row.type === 'tree' && row.mode === '040000'),
    'PR_AUTH_TREE', 'ledger or policy path is not a regular Git object');
    treeSha = row.sha;
  }
  return treeSha;
}
function assertU2Run(run, input) {
  requireValue(positive(run?.id) && run.workflow_id === WORKFLOW_ID && run.path === WORKFLOW &&
    run.event === 'pull_request_target' && run.head_sha === input.headSha &&
    run.repository?.id === REPOSITORY_ID && run.head_repository?.id === REPOSITORY_ID &&
    positive(run.run_attempt) && positive(run.check_suite_id) && run.status === 'completed' &&
    run.conclusion === 'success' && Array.isArray(run.pull_requests) &&
    run.pull_requests.some(pr => pr.number === input.pullNumber && pr.base?.repo?.id === REPOSITORY_ID &&
      pr.head?.repo?.id === REPOSITORY_ID),
  'PR_AUTH_U2', 'independent U2 execution does not approve this head');
}
async function u2Evidence(request, input, u2OwnerComment) {
  const { token } = input;
  const workflow = await request(`${PREFIX}/actions/workflows/${WORKFLOW_ID}`, token);
  requireValue(workflow?.id === WORKFLOW_ID && workflow.path === WORKFLOW && workflow.state === 'active',
    'PR_AUTH_U2', 'independent workflow identity differs');
  const runs = await countedPages(request, token,
    `${PREFIX}/actions/workflows/${WORKFLOW_ID}/runs?event=pull_request_target&head_sha=${input.headSha}`, 'workflow_runs');
  const eligible = runs.filter(run => run.head_sha === input.headSha &&
    run.pull_requests?.some(pr => pr.number === input.pullNumber)).sort((a, b) => b.id - a.id);
  requireValue(eligible.length > 0, 'PR_AUTH_U2', 'no independent U2 run for this head');
  const run = await request(`${PREFIX}/actions/runs/${eligible[0].id}`, token);
  requireValue(run?.id === eligible[0].id && run.run_attempt === eligible[0].run_attempt,
    'PR_AUTH_RACE', 'U2 attempt changed during lookup');
  assertU2Run(run, input);
  const attempt = await request(`${PREFIX}/actions/runs/${run.id}/attempts/${run.run_attempt}`, token);
  assertU2Run(attempt, input);
  requireValue(attempt.id === run.id && attempt.run_attempt === run.run_attempt &&
    attempt.check_suite_id === run.check_suite_id, 'PR_AUTH_U2', 'U2 attempt identity disagrees');
  const jobs = await countedPages(request, token,
    `${PREFIX}/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs`, 'jobs');
  const selected = jobs.filter(job => job.name === JOB);
  const job = selected[0];
  requireValue(selected.length === 1 && job.run_id === run.id && job.run_attempt === run.run_attempt &&
    job.head_sha === input.headSha && job.status === 'completed' && job.conclusion === 'success' &&
    job.check_run_url === `https://api.github.com${PREFIX}/check-runs/${job.id}` &&
    Array.isArray(job.steps) && ['Check out only the protected base revision', 'Test the protected-base policy',
      'Check complete PR metadata without executing PR code', 'Complete job'].every(name => {
      const steps = job.steps.filter(step => step.name === name);
      return steps.length === 1 && steps[0].status === 'completed' && steps[0].conclusion === 'success';
    }), 'PR_AUTH_U2', 'exact successful U2 job is missing');
  const check = await request(`${PREFIX}/check-runs/${job.id}`, token);
  requireValue(check?.id === job.id && check.name === JOB && check.head_sha === input.headSha &&
    check.check_suite?.id === run.check_suite_id && check.status === 'completed' && check.conclusion === 'success' &&
    check.app?.id === 15368 && check.app.slug === 'github-actions' && check.app.owner?.id === 9919 &&
    check.app.owner.login === 'github', 'PR_AUTH_U2', 'U2 check identity or app differs');
  const log = await request(`${PREFIX}/actions/jobs/${job.id}/logs`, token, 'text');
  const provenance = verifyU2LogProvenance(log, input);
  for (const [path, expected] of [[WORKFLOW, WORKFLOW_BLOB], ['.github/scripts/public-pr-policy.mjs', POLICY_BLOB]]) {
    requireValue(await regularBlob(request, token, POLICY, path) === expected,
      'PR_AUTH_U2_SOURCE', 'trusted policy source differs from reviewed blobs');
    decodeBlob(await request(`${PREFIX}/git/blobs/${expected}`, token), expected);
  }
  return { runId: run.id, attempt: run.run_attempt, jobId: job.id, checkId: check.id,
    suiteId: check.check_suite.id, ...provenance, workflowBlob: WORKFLOW_BLOB, policyBlob: POLICY_BLOB,
    ownerComment: commentReceipt(u2OwnerComment) };
}

async function collect(input, request, now) {
  const { token, pullNumber } = input;
  const time = now();
  requireValue(time instanceof Date && Number.isFinite(time.getTime()) && time.getTime() < SUNSET,
    'PR_AUTH_TIME', 'temporary PR authority has expired');
  const repo = await request(PREFIX, token); assertRepository(repo);
  const pull = await request(`${PREFIX}/pulls/${pullNumber}`, token); assertPull(pull, input);
  const source = await request(`${PREFIX}/git/commits/${input.sourceRevision}`, token);
  requireValue(source?.sha === input.sourceRevision && source.tree?.sha === input.candidateGitTreeSha &&
    Array.isArray(source.parents) && source.parents.length === 2 &&
    source.parents[0]?.sha === BASE && source.parents[1]?.sha === input.headSha,
  'PR_AUTH_MERGE', 'checkout is not the exact ordered base/head test merge');
  const current = await request(`${PREFIX}/actions/runs/${input.currentRunId}`, token);
  requireValue(current?.id === input.currentRunId && current.run_attempt === input.currentRunAttempt &&
    current.event === 'pull_request' && current.path === '.github/workflows/contracts-required.yml' &&
    current.head_sha === input.headSha && current.repository?.id === REPOSITORY_ID &&
    current.head_repository?.id === REPOSITORY_ID && current.pull_requests?.some(pr => pr.number === pullNumber),
  'PR_AUTH_EXECUTION', 'current PR run identity differs');
  const main = await request(`${PREFIX}/git/ref/heads/main`, token);
  requireValue(main?.ref === 'refs/heads/main' && main.object?.type === 'commit' && main.object.sha === POLICY,
    'PR_AUTH_U2_SOURCE', 'default-main policy source changed; renewed review is required');
  const mainBlob = await regularBlob(request, token, POLICY, PATH);
  const listed = await comments(request, token, pullNumber, pull.comments);
  const eligible = [];
  for (const comment of listed) {
    if (!ownerComment(comment, pullNumber) || !comment.body?.startsWith(AUTH_PREFIX)) continue;
    const parsed = parsePrLedgerAuthorization(comment.body);
    if (parsed.pullNumber !== pullNumber || parsed.headSha !== input.headSha || parsed.baseSha !== input.baseSha) continue;
    const created = instant(comment.created_at), expires = instant(parsed.expires);
    requireValue(created <= time.getTime() && expires > created && expires - created <= WEEK && expires <= SUNSET,
      'PR_AUTH_TIME', 'owner authorization lifetime exceeds policy');
    if (expires <= time.getTime()) continue;
    eligible.push({ comment, parsed });
  }
  requireValue(eligible.length === 1, 'PR_AUTH_COMMENT', 'exactly one live owner ledger authorization is required');
  const { comment, parsed } = eligible[0];
  requireValue(parsed.candidateTreeDigest === input.candidateTreeDigest &&
    parsed.executionFingerprint === input.executionFingerprint && parsed.runtimeManifestDigest === input.runtimeManifestDigest,
  'PR_AUTH_BINDING', 'owner statement differs from independent candidate measurements');
  const u2Comments = listed.filter(row => ownerComment(row, pullNumber) &&
    row.body === `StockSense protected CI approval: ${BASE} ${input.headSha}`);
  requireValue(u2Comments.length === 1, 'PR_AUTH_U2_COMMENT', 'one live exact-head owner U2 comment is required');
  requireValue(instant(u2Comments[0].created_at) <= time.getTime(), 'PR_AUTH_TIME', 'U2 comment is future-dated');
  const blobSha = await regularBlob(request, token, parsed.ledgerCommit, PATH);
  requireValue(blobSha === parsed.ledgerBlob, 'PR_AUTH_BLOB', 'ledger tree differs from authorized blob');
  const bytes = decodeBlob(await request(`${PREFIX}/git/blobs/${blobSha}`, token), blobSha);
  requireValue(hash(bytes) === parsed.ledgerSha256, 'PR_AUTH_BLOB', 'ledger SHA256 differs');
  let document;
  try { document = parseAuthorityJson(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new PrLedgerAuthorityError('PR_AUTH_LEDGER', 'ledger is not bounded UTF-8 JSON'); }
  requireValue(exact(document, ['schema', 'exceptions']) && document.schema === 'stocksense-image-exceptions-v2' &&
    Array.isArray(document.exceptions), 'PR_AUTH_LEDGER', 'PR authority requires a closed v2 ledger');
  const u2 = await u2Evidence(request, input, u2Comments[0]);
  // Individual retrieval prevents a deleted comment surviving a stale listing.
  for (const expected of [comment, u2Comments[0]]) {
    const live = await request(`${PREFIX}/issues/comments/${expected.id}`, token);
    requireValue(live?.id === expected.id && ownerComment(live, pullNumber) && live.body === expected.body &&
      live.created_at === expected.created_at && live.updated_at === expected.updated_at,
    'PR_AUTH_RACE', 'owner authorization was edited or revoked');
  }
  // Re-read mutable identities after slow blob/log retrieval, including a newly
  // started workflow run (not merely a newer attempt of the selected run).
  assertRepository(await request(PREFIX, token));
  const finalPull = await request(`${PREFIX}/pulls/${pullNumber}`, token); assertPull(finalPull, input);
  requireValue(finalPull.comments === pull.comments, 'PR_AUTH_RACE', 'comment listing changed during verification');
  const finalComments = await comments(request, token, pullNumber, finalPull.comments);
  const commentSnapshot = rows => JSON.stringify(rows.map(row => ({ id: row.id, body: row.body,
    user: row.user, association: row.author_association, issue: row.issue_url,
    created: row.created_at, updated: row.updated_at })).sort((a, b) => a.id - b.id));
  requireValue(commentSnapshot(finalComments) === commentSnapshot(listed),
    'PR_AUTH_RACE', 'owner statements changed during verification');
  const finalMain = await request(`${PREFIX}/git/ref/heads/main`, token);
  requireValue(finalMain?.ref === 'refs/heads/main' && finalMain.object?.type === 'commit' &&
    finalMain.object.sha === POLICY, 'PR_AUTH_RACE', 'default-main changed during verification');
  const finalCurrent = await request(`${PREFIX}/actions/runs/${input.currentRunId}`, token);
  requireValue(finalCurrent?.id === current.id && finalCurrent.run_attempt === current.run_attempt &&
    finalCurrent.head_sha === current.head_sha && finalCurrent.event === current.event &&
    finalCurrent.path === current.path && finalCurrent.repository?.id === REPOSITORY_ID &&
    finalCurrent.head_repository?.id === REPOSITORY_ID &&
    finalCurrent.pull_requests?.some(pr => pr.number === pullNumber),
  'PR_AUTH_RACE', 'current PR execution changed during verification');
  const finalRuns = await countedPages(request, token,
    `${PREFIX}/actions/workflows/${WORKFLOW_ID}/runs?event=pull_request_target&head_sha=${input.headSha}`, 'workflow_runs');
  const finalSelected = finalRuns.filter(run => run.head_sha === input.headSha &&
    run.pull_requests?.some(pr => pr.number === pullNumber)).sort((a, b) => b.id - a.id)[0];
  requireValue(finalSelected?.id === u2.runId && finalSelected.run_attempt === u2.attempt,
    'PR_AUTH_RACE', 'a new U2 run or attempt appeared during verification');
  const finalRun = await request(`${PREFIX}/actions/runs/${u2.runId}`, token); assertU2Run(finalRun, input);
  requireValue(finalRun.id === u2.runId && finalRun.run_attempt === u2.attempt &&
    finalRun.check_suite_id === u2.suiteId, 'PR_AUTH_RACE', 'U2 attempt changed during verification');
  const finalCheck = await request(`${PREFIX}/check-runs/${u2.checkId}`, token);
  requireValue(finalCheck?.id === u2.checkId && finalCheck.head_sha === input.headSha &&
    finalCheck.check_suite?.id === u2.suiteId && finalCheck.status === 'completed' &&
    finalCheck.conclusion === 'success' && finalCheck.name === JOB && finalCheck.app?.id === 15368 &&
    finalCheck.app.slug === 'github-actions' && finalCheck.app.owner?.id === 9919 &&
    finalCheck.app.owner.login === 'github', 'PR_AUTH_RACE', 'U2 check changed during verification');
  const finished = now();
  requireValue(finished instanceof Date && Number.isFinite(finished.getTime()) &&
    finished.getTime() >= time.getTime() && finished.getTime() < instant(parsed.expires) && finished.getTime() < SUNSET,
  'PR_AUTH_TIME', 'authorization expired while evidence was retrieved');
  const authority = { type: TAG, repository: REPOSITORY, repositoryId: REPOSITORY_ID, ownerId: OWNER_ID,
    pullNumber, baseSha: BASE, headSha: input.headSha, sourceRevision: input.sourceRevision,
    candidateGitTreeSha: input.candidateGitTreeSha, mergeParents: [BASE, input.headSha],
    candidateTreeDigest: input.candidateTreeDigest, executionFingerprint: input.executionFingerprint,
    runtimeManifestDigest: input.runtimeManifestDigest, currentRunId: input.currentRunId,
    currentRunAttempt: input.currentRunAttempt,
    ledger: { commit: parsed.ledgerCommit, blobSha, sha256: parsed.ledgerSha256, path: PATH },
    authorization: { ...commentReceipt(comment), expires: parsed.expires }, u2,
    protectedMain: { commit: POLICY, ledgerBlob: mainBlob }, retrievedAt: finished.toISOString() };
  return { ledger: { schema: document.schema, exceptions: document.exceptions, blobSha,
    candidateGitTreeSha: input.candidateGitTreeSha }, authority };
}

function identity(authority) {
  requireValue(exact(authority, ['type', 'repository', 'repositoryId', 'ownerId', 'pullNumber', 'baseSha', 'headSha',
    'sourceRevision', 'candidateGitTreeSha', 'mergeParents', 'candidateTreeDigest', 'executionFingerprint',
    'runtimeManifestDigest', 'currentRunId', 'currentRunAttempt', 'ledger', 'authorization', 'u2', 'protectedMain', 'retrievedAt']) &&
    typeof authority.retrievedAt === 'string' && Number.isFinite(Date.parse(authority.retrievedAt)) &&
    new Date(authority.retrievedAt).toISOString() === authority.retrievedAt &&
    Array.isArray(authority.mergeParents) && authority.mergeParents.length === 2 &&
    exact(authority.ledger, ['commit', 'blobSha', 'sha256', 'path']) &&
    exact(authority.authorization, ['commentId', 'bodyDigest', 'createdAt', 'updatedAt', 'expires']) &&
    exact(authority.u2, ['runId', 'attempt', 'jobId', 'checkId', 'suiteId', 'policyCommit', 'logDigest',
      'workflowBlob', 'policyBlob', 'ownerComment']) &&
    exact(authority.u2.ownerComment, ['commentId', 'bodyDigest', 'createdAt', 'updatedAt']) &&
    exact(authority.protectedMain, ['commit', 'ledgerBlob']) &&
    Date.parse(authority.retrievedAt) >= Date.parse(authority.authorization.createdAt),
  'PR_AUTH_RECEIPT', 'authority receipt shape is invalid');
  const bound = { ...authority }; delete bound.retrievedAt;
  return JSON.stringify(bound);
}

/** Caller must verify every ledger row/scan, then call revalidate immediately before receipt issuance. */
export async function fetchPrLedgerAuthority(input) {
  assertInput(input);
  const request = input.request ?? githubAuthorityRequest;
  const now = input.now ?? (() => new Date());
  const first = await collect(input, request, now);
  const revalidate = async () => {
    const fresh = await collect(input, request, now);
    requireValue(identity(first.authority) === identity(fresh.authority), 'PR_AUTH_RACE',
      'authority changed during verification');
    return fresh.authority;
  };
  // Also close races during initial retrieval, before exposing any ledger bytes.
  const authority = await revalidate();
  return { ledger: first.ledger, authority, revalidate };
}

/** Live revalidation for downstream consumers; a retained receipt is never authority by itself. */
export async function verifyRetainedPrLedgerAuthority(input, retained) {
  const expected = identity(retained);
  const fresh = await fetchPrLedgerAuthority(input);
  requireValue(identity(fresh.authority) === expected &&
    Date.parse(retained.retrievedAt) <= Date.parse(fresh.authority.retrievedAt), 'PR_AUTH_RECEIPT',
    'retained authority was replaced, revoked or replayed');
  return fresh;
}
