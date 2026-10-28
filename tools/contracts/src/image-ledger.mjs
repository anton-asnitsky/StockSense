import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { TextDecoder } from 'node:util';
import { IMAGE_NAMES, readImageEvidence, sha256, verifyImageDispositions } from './image-evidence.mjs';
import { sourceTreeDigest } from './source-digest.mjs';

const SHA = /^[0-9a-f]{40}$/;
const REVISION = /^[0-9a-f]{40}$/;
const DIGEST = /^sha256:[0-9a-f]{64}$/;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const PATH = 'security/image-exceptions.json';
const MAX_BYTES = 1024 * 1024;
const requireValue = (condition, message) => {
  if (!condition) throw new Error(`Image ledger refused: ${message}`);
};

async function githubJson(path, token) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28' },
    signal: globalThis.AbortSignal.timeout(10_000)
  });
  requireValue(response.ok, `GitHub API unavailable (${response.status})`);
  return response.json();
}

function decodeBlob(blob) {
  requireValue(blob?.encoding === 'base64' && typeof blob.content === 'string' &&
    Number.isInteger(blob.size) && blob.size >= 0 && blob.size <= MAX_BYTES,
  'immutable blob is missing or oversized');
  const encoded = blob.content.replace(/\s/g, '');
  requireValue(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded),
    'immutable blob encoding is invalid');
  const bytes = Buffer.from(encoded, 'base64');
  requireValue(bytes.length === blob.size && bytes.toString('base64') === encoded,
    'immutable blob size or encoding disagrees');
  return bytes;
}

/** SHA-256 over the complete committed file manifest, except the ledger's own blob.
 * Excluding that one path lets main approve a candidate without changing its binding.
 * Every other tracked path, mode, type and Git object ID participates.
 */
export function candidateTreeDigestFromGit(entries) {
  requireValue(Buffer.isBuffer(entries) && entries.length > 0 && entries.at(-1) === 0,
    'candidate Git tree listing is unavailable');
  const hash = createHash('sha256');
  const seen = new Set();
  let included = 0;
  for (const line of entries.subarray(0, -1).toString('binary').split('\0')) {
    const tab = line.indexOf('\t');
    const meta = line.slice(0, tab);
    const path = line.slice(tab + 1);
    requireValue(tab > 0 && /^(?:100644|100755|120000) blob [0-9a-f]{40}$|^160000 commit [0-9a-f]{40}$/.test(meta) &&
      path.length > 0 && !seen.has(path), 'candidate Git tree listing is malformed');
    seen.add(path);
    if (path === PATH) continue;
    hash.update(Buffer.from(line, 'binary')).update('\0');
    included++;
  }
  requireValue(included > 0, 'candidate Git tree is empty');
  return `sha256:${hash.digest('hex')}`;
}

/** Read only the immutable blob selected by the live main ref, then recheck main. */
export async function fetchImageLedger({ repository, token, candidateRevision,
  candidateGitTreeSha, request = githubJson }) {
  requireValue(REPOSITORY.test(repository ?? '') && typeof token === 'string' && token.length > 0,
    'repository identity or read-only token is unavailable');
  requireValue(REVISION.test(candidateRevision ?? '') && SHA.test(candidateGitTreeSha ?? ''),
    'candidate commit or Git tree SHA is unavailable');
  const prefix = `/repos/${repository}`;
  const candidate = await request(`${prefix}/git/commits/${candidateRevision}`, token);
  requireValue(candidate?.sha === candidateRevision && candidate.tree?.sha === candidateGitTreeSha,
    'candidate checkout does not match GitHub commit metadata');
  const refPath = `${prefix}/git/ref/heads/main`;
  const ref = await request(refPath, token);
  const mainSha = ref?.object?.sha;
  requireValue(ref?.ref === 'refs/heads/main' && ref.object.type === 'commit' && SHA.test(mainSha ?? ''),
    'protected main ref is unavailable');
  const file = await request(`${prefix}/contents/${PATH}?ref=${mainSha}`, token);
  requireValue(file?.type === 'file' && file.path === PATH && SHA.test(file.sha ?? '') &&
    Number.isInteger(file.size) && file.size <= MAX_BYTES, 'ledger path is not a regular file');
  const blob = await request(`${prefix}/git/blobs/${file.sha}`, token);
  const bytes = decodeBlob(blob);
  const calculated = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  requireValue(calculated === file.sha && blob.sha === file.sha && blob.size === file.size,
    'ledger blob SHA or size disagrees with main');
  const latest = await request(refPath, token);
  requireValue(latest?.ref === 'refs/heads/main' && latest.object?.type === 'commit' &&
    latest.object.sha === mainSha, 'main moved while the ledger was read');
  let ledger;
  try { ledger = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new Error('Image ledger refused: malformed UTF-8 or JSON'); }
  requireValue(ledger && !Array.isArray(ledger) && typeof ledger === 'object' &&
    Object.keys(ledger).length === 2 && ledger.schema === 'stocksense-image-exceptions-v1' &&
    Array.isArray(ledger.exceptions), 'ledger schema is invalid');
  return { mainSha, blobSha: file.sha, candidateGitTreeSha, exceptions: ledger.exceptions };
}

/** Bind the current checkout, exact built IDs and retained scan bytes to main's rows. */
export async function verifyBoundImageEvidence({ directory, imageIds, ledger,
  expectedRevision, actualRevision, candidateTreeDigest, now = new Date() }) {
  requireValue(REVISION.test(expectedRevision ?? '') && actualRevision === expectedRevision,
    'candidate source revision differs from the hosted checkout');
  requireValue(SHA.test(ledger?.mainSha ?? '') && SHA.test(ledger?.blobSha ?? '') &&
    SHA.test(ledger?.candidateGitTreeSha ?? '') && Array.isArray(ledger.exceptions) &&
    DIGEST.test(candidateTreeDigest ?? ''), 'trusted ledger or candidate tree provenance is missing');
  requireValue(ledger.exceptions.every(item => item && !Array.isArray(item) &&
    typeof item === 'object' && Object.keys(item).length === 2 &&
    DIGEST.test(item.candidateTreeDigest ?? '') && item.candidateTreeDigest === candidateTreeDigest &&
    item.finding && typeof item.finding === 'object' && IMAGE_NAMES.includes(item.finding.image)),
    'ledger row is malformed, names an unknown image or belongs to a different candidate tree');
  const evidence = await readImageEvidence(directory, imageIds, { requireClean: false });
  const sourceDigest = await sourceTreeDigest();
  const rows = [];
  for (const name of IMAGE_NAMES) {
    const record = evidence.records.find(item => item.name === name);
    if (!record) throw new Error(`Image ledger refused: ${name} inspected record is missing`);
    const bytes = await readFile(join(directory, `${name}.scan.json`));
    requireValue(sha256(bytes) === record.scanDigest, `${name} scan changed after inspection`);
    let report;
    try { report = JSON.parse(bytes.toString('utf8')); }
    catch { throw new Error(`Image ledger refused: ${name} scan is malformed`); }
    const dispositions = ledger.exceptions.filter(item => item.finding.image === name)
      .map(item => item.finding);
    const result = verifyImageDispositions(report, dispositions,
      { image: name, imageId: record.imageId, sbomDigest: record.sbomDigest, now });
    rows.push({ image: name, imageId: record.imageId, sbomDigest: record.sbomDigest,
      scanDigest: record.scanDigest, ...result });
  }
  requireValue(ledger.exceptions.length === rows.reduce((count, row) => count + row.disposed, 0),
    'ledger contains a row for an unknown image');
  return { schema: 'stocksense-image-ledger-verification-v1', candidateRevision: expectedRevision,
    candidateGitTreeSha: ledger.candidateGitTreeSha, candidateTreeDigest,
    sourceDigest, mainSha: ledger.mainSha, ledgerBlobSha: ledger.blobSha, images: rows };
}
