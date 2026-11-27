import { lstat, readFile } from 'node:fs/promises';
import { TextDecoder } from 'node:util';
import { PrLedgerAuthorityError, parseAuthorityJson } from './pr-ledger-authority.mjs';

const PR = 'owner-authorized-pr-ledger-v1';
const COMMIT = /^[0-9a-f]{40}(?![\s\S])/;
const DIGEST = /^sha256:[0-9a-f]{64}(?![\s\S])/;
const fail = message => { throw new PrLedgerAuthorityError('PR_AUTH_CONTEXT', message); };

/** Retained PR receipts are bounded data, never authority by themselves. */
export async function readPrLedgerReceipt(path) {
  try {
    const stat = await lstat(path);
    if (!stat.isFile() || stat.size > 1024 * 1024) fail('PR receipt is not a bounded regular file');
    const bytes = await readFile(path);
    if (bytes.length > 1024 * 1024) fail('PR receipt exceeds its bound');
    return parseAuthorityJson(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof PrLedgerAuthorityError) throw error;
    throw new PrLedgerAuthorityError('PR_AUTH_RECEIPT', 'PR receipt is missing or has invalid UTF-8');
  }
}

/** Select a mode explicitly; a refused PR authority never falls back to main. */
export function readLedgerAuthorityMode(env = process.env) {
  const mode = env.STOCKSENSE_LEDGER_AUTHORITY === undefined
    ? 'protected-main' : env.STOCKSENSE_LEDGER_AUTHORITY;
  if (mode !== 'protected-main' && mode !== PR) fail('Unknown ledger authority mode');
  return mode;
}

function positive(value) {
  if (typeof value !== 'string' || !/^[1-9][0-9]*(?![\s\S])/.test(value) ||
      !Number.isSafeInteger(Number(value))) fail('Hosted PR execution identity is malformed');
  return Number(value);
}

/** Inputs bind live GitHub verification to independently computed Git/runtime data.
 * These environment fields are expectations, not authorization; the authority
 * reader must independently fetch and compare every live identity.
 */
export function readPrLedgerInput({ sourceContext, runtimeManifestDigest, env = process.env }) {
  if (readLedgerAuthorityMode(env) !== PR || env.GITHUB_EVENT_NAME !== 'pull_request' ||
      env.GITHUB_REPOSITORY !== 'anton-asnitsky/StockSense') fail('PR ledger context is ineligible');
  const fields = ['candidateRevision', 'candidateGitTreeSha', 'candidateTreeDigest', 'executionFingerprint'];
  if (!sourceContext || typeof sourceContext !== 'object' || Array.isArray(sourceContext) ||
      Object.keys(sourceContext).length !== fields.length ||
      !fields.every(key => Object.hasOwn(sourceContext, key)) ||
      !COMMIT.test(sourceContext.candidateRevision ?? '') ||
      !COMMIT.test(sourceContext.candidateGitTreeSha ?? '') ||
      !DIGEST.test(sourceContext.candidateTreeDigest ?? '') ||
      !DIGEST.test(sourceContext.executionFingerprint ?? '') ||
      !DIGEST.test(runtimeManifestDigest ?? '') ||
      env.GITHUB_SHA !== sourceContext.candidateRevision ||
      !COMMIT.test(env.STOCKSENSE_PR_BASE_SHA ?? '') ||
      !COMMIT.test(env.STOCKSENSE_PR_HEAD_SHA ?? '') ||
      typeof env.GITHUB_TOKEN !== 'string' || !env.GITHUB_TOKEN.length) {
    fail('Independent source/runtime or hosted PR context is missing or inconsistent');
  }
  return {
    eventName: env.GITHUB_EVENT_NAME, repository: env.GITHUB_REPOSITORY,
    pullNumber: positive(env.STOCKSENSE_PR_NUMBER),
    sourceRevision: sourceContext.candidateRevision,
    candidateGitTreeSha: sourceContext.candidateGitTreeSha,
    headSha: env.STOCKSENSE_PR_HEAD_SHA, baseSha: env.STOCKSENSE_PR_BASE_SHA,
    candidateTreeDigest: sourceContext.candidateTreeDigest,
    executionFingerprint: sourceContext.executionFingerprint, runtimeManifestDigest,
    currentRunId: positive(env.GITHUB_RUN_ID), currentRunAttempt: positive(env.GITHUB_RUN_ATTEMPT),
    token: env.GITHUB_TOKEN
  };
}
