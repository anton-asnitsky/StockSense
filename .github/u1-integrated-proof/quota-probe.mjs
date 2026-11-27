import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = 'anton-asnitsky/StockSense';
const number = value => /^\d+$/.test(value ?? '') && Number.isSafeInteger(Number(value)) ? Number(value) : null;
export async function observeQuota({ phase, token, context, request = globalThis.fetch }) {
  if (!['start', 'end'].includes(phase) || typeof token !== 'string' || !token ||
      context.repository !== repository || !/^[a-f0-9]{40}$/.test(context.candidate ?? '') ||
      !/^[a-f0-9]{40}$/.test(context.harnessRevision ?? '') ||
      !['runId', 'runAttempt', 'lane'].every(key => /^[1-9]\d*$/.test(context[key] ?? '')) ||
      context.job !== 'technical-proof') throw new Error('Invalid quota probe context');
  const observation = { schema: 'stocksense-diagnostic-quota-v1', diagnosticOnly: true,
    tokenProvenance: 'ordinary-job-GITHUB_TOKEN', phase,
    ...Object.fromEntries(['repository', 'candidate', 'harnessRevision', 'runId', 'runAttempt', 'job', 'lane']
      .map(key => [key, context[key]])),
    observedAt: new Date().toISOString(), requestCount: 1, status: null, headers: {},
    repositoryVerified: false, valid: false, failure: null };
  try {
    const response = await request(`https://api.github.com/repos/${repository}`, {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28' }
    });
    observation.status = response.status;
    for (const key of ['limit', 'remaining', 'used', 'reset']) {
      observation.headers[key] = number(response.headers.get(`x-ratelimit-${key}`));
    }
    observation.headers.resource = response.headers.get('x-ratelimit-resource') === 'core' ? 'core' : null;
    const date = response.headers.get('date');
    observation.headers.date = Number.isFinite(Date.parse(date ?? '')) ? new Date(date).toISOString() : null;
    const retry = response.headers.get('retry-after');
    if (retry !== null) observation.headers.retryAfterSeconds = number(retry);
    if (!response.ok || !response.body) { observation.failure = 'HTTP_FAILURE'; return observation; }
    const chunks = []; let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 65536) { observation.failure = 'BODY_BOUND'; return observation; }
      chunks.push(chunk);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    observation.repositoryVerified = body.id === 1361237685 && body.full_name === repository;
    const headers = observation.headers;
    observation.valid = observation.repositoryVerified && ['limit', 'remaining', 'used', 'reset']
      .every(key => headers[key] !== null) && headers.limit > 0 && headers.reset > 0 &&
      headers.remaining <= headers.limit && headers.resource === 'core' && headers.date !== null &&
      (retry === null || headers.retryAfterSeconds !== null);
    if (!observation.valid) observation.failure = 'INVALID_EVIDENCE';
    else if (headers.remaining === 0) { observation.valid = false; observation.failure = 'QUOTA_EXHAUSTED'; }
  } catch { observation.failure = 'REQUEST_OR_BODY_FAILURE'; }
  return observation;
}

export function summarizeQuota(start, end) {
  const keys = ['repository', 'candidate', 'harnessRevision', 'runId', 'runAttempt', 'job', 'lane'];
  const sameContext = start && keys.every(key => start[key] === end[key]);
  return { schema: 'stocksense-diagnostic-quota-summary-v1', diagnosticOnly: true,
    ownProbeRequests: (start?.requestCount ?? 0) + end.requestCount,
    valid: Boolean(sameContext && start.phase === 'start' && end.phase === 'end' && start.valid && end.valid &&
      start.requestCount === 1 && end.requestCount === 1),
    sameResetWindow: Boolean(start && start.headers.reset === end.headers.reset),
    productionAuthorityRequestsMeasured: false,
    note: 'Counts cover only these probes. Header deltas include other activity or reset effects and are not production request counts.' };
}

async function main() {
  const phase = process.argv[2];
  const context = { repository: process.env.GITHUB_REPOSITORY, candidate: process.env.CANDIDATE,
    harnessRevision: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT, job: process.env.GITHUB_JOB, lane: process.env.PROOF_LANE };
  const observation = await observeQuota({ phase, token: process.env.GITHUB_TOKEN, context });
  const output = join(process.env.RUNNER_TEMP, 'u1-integrated/proof');
  await mkdir(output, { recursive: true });
  await writeFile(join(output, `quota-${phase}.json`), JSON.stringify(observation, null, 2) + '\n');
  let summary;
  if (phase === 'end') {
    let start;
    try { start = JSON.parse(await readFile(join(output, 'quota-start.json'), 'utf8')); } catch { /* Missing start is a failed proof. */ }
    summary = summarizeQuota(start, observation);
    await writeFile(join(output, 'quota-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  }
  if (!observation.valid || (summary && !summary.valid)) throw new Error('Quota evidence incomplete or unavailable');
  console.log(`Quota ${phase} observation retained; one own probe request, no production authority claim`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(() => { console.error('Quota probe failed; inspect sanitized retained evidence'); process.exitCode = 1; });
}
