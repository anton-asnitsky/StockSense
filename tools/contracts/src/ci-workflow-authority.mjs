import { spawnSync } from 'node:child_process';
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual, TextDecoder } from 'node:util';
import { ContractError } from './package-loader.mjs';
import { readSbomSourceContext } from './sbom-context.mjs';
import { readImageEvidence } from './image-evidence.mjs';
import { readKiotaRuntimeEvidence } from './image-ledger.mjs';
import { readPrLedgerInput } from './pr-ledger-context.mjs';
import { verifyImageLedgerSession } from './sbom.mjs';
import { assertPrLedgerAuthorityBinding, githubAuthorityRequest } from './pr-ledger-authority.mjs';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const allowed = new Set(['.github/workflows/contracts-required.yml', '.github/workflows/release-evidence.yml']);
/** @returns {never} */
const fail = message => { throw new ContractError('CI_WORKFLOW_CHANGE', 'BR6.7', message); };

/** NUL-delimited Git names, not shell-split or caller-supplied authorization. */
export function parseCiChangedPaths(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length > 32 * 1024 * 1024) fail('Changed paths exceed their bound');
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { fail('Changed paths have invalid UTF-8'); }
  if (!text.length) return [];
  if (!text.endsWith('\0')) fail('Changed paths are not NUL terminated');
  const paths = text.slice(0, -1).split('\0');
  if (new Set(paths).size !== paths.length || paths.some(path => !path ||
      /[\\\x00-\x1f\x7f:]/.test(path) || path.startsWith('/') ||
      path.split('/').some(part => !part || part === '.' || part === '..'))) {
    fail('Changed paths are malformed or ambiguous');
  }
  return paths.sort();
}

/** The live handoff is deliberately narrower than general U2 authorization. */
export function assertCiChangedPaths(paths) {
  for (const path of paths) {
    if (path.toLowerCase().startsWith('.github/') && !allowed.has(path)) {
      fail('Only the two reviewed workflow paths may use the PR handoff');
    }
  }
}

function changedPathsAt(base, revision) {
  if (![base, revision].every(value => /^[0-9a-f]{40}$/.test(value ?? ''))) fail('Missing immutable Git revisions');
  const result = spawnSync('git', ['diff', '--no-renames', '--name-only', '-z', base, revision, '--'], {
    cwd: repositoryRoot, shell: false, windowsHide: true, timeout: 10000, maxBuffer: 32 * 1024 * 1024
  });
  if (result.error || result.status !== 0 || result.signal) fail('Independent changed-path retrieval failed');
  return parseCiChangedPaths(result.stdout);
}

async function workflowSnapshot(directory) {
  const canonical = resolve(repositoryRoot, '.github/workflows');
  if (resolve(directory) !== canonical || await realpath(directory) !== join(await realpath(repositoryRoot), '.github/workflows') ||
      (await lstat(directory)).isSymbolicLink()) fail('PR policy requires the canonical workflow directory');
  const names = (await readdir(directory)).filter(name => /\.ya?ml$/.test(name)).sort();
  if (!names.length || names.length > 128) fail('Workflow inventory is empty or exceeds its bound');
  const workflows = [];
  for (const name of names) {
    const path = join(directory, name);
    const stat = await lstat(path);
    if (!stat.isFile() || stat.size > 1024 * 1024) fail('Workflow is not a bounded regular file');
    const bytes = await readFile(path);
    if (bytes.length > 1024 * 1024) fail('Workflow exceeds its bound');
    workflows.push({ name, bytes });
  }
  return workflows;
}

/**
 * Open only a completely verified live PR session. The caller checks these exact
 * workflow bytes, then MUST await revalidate before emitting acceptance.
 * No receipt field supplies an expected source, image or runtime value.
 */
export async function openCiWorkflowAuthority({ directory, changedPaths, env = process.env }) {
  const source = readSbomSourceContext(repositoryRoot, env.STOCKSENSE_CANDIDATE_REVISION);
  const paths = changedPathsAt(env.STOCKSENSE_PR_BASE_SHA, source.candidateRevision);
  assertCiChangedPaths(paths);
  if (changedPaths !== undefined && (!Array.isArray(changedPaths) ||
      !isDeepStrictEqual([...changedPaths].sort(), paths))) fail('Caller changed paths differ from Git');
  const workflows = await workflowSnapshot(directory);
  const evidence = env.STOCKSENSE_IMAGE_EVIDENCE_DIR;
  if (!evidence) fail('PR image evidence directory is required');
  const runtimeManifestDigest = await readKiotaRuntimeEvidence(evidence, env.STOCKSENSE_KIOTA_IMAGE);
  const input = readPrLedgerInput({ sourceContext: source, runtimeManifestDigest, env });
  let requestCount = 0;
  const request = async (path, token, format) => {
    requestCount++;
    return githubAuthorityRequest(path, token, format);
  };
  const images = await readImageEvidence(evidence, {
    validator: env.STOCKSENSE_STANDARDS_IMAGE, kiota: env.STOCKSENSE_KIOTA_IMAGE
  }, { requireClean: false });
  const session = await verifyImageLedgerSession(evidence, source.candidateRevision, images.records, source, { ...input, request });
  // Keep independent copies: a caller cannot mutate the terminal comparison.
  const initialWorkflows = workflows.map(({ name, bytes }) => ({ name, bytes: Buffer.from(bytes) }));
  const assertUnchanged = async () => {
    if (!isDeepStrictEqual(readSbomSourceContext(repositoryRoot, source.candidateRevision), source) ||
        !isDeepStrictEqual(changedPathsAt(input.baseSha, source.candidateRevision), paths) ||
        !isDeepStrictEqual(await workflowSnapshot(directory), initialWorkflows)) {
      fail('Candidate source, paths or workflow bytes changed during policy validation');
    }
  };
  return {
    workflows,
    async revalidate() {
      await assertUnchanged();
      const finalAuthority = await session.revalidate();
      // Network verification is not a source lock: close changes during it too.
      await assertUnchanged();
      // Local Git/file checks may cross expiry after the live response. This
      // additional bound check never substitutes for the live retrieval above.
      assertPrLedgerAuthorityBinding(finalAuthority, { ...input, ledgerBlobSha: session.receipt.ledgerBlobSha });
      return { candidateRevision: source.candidateRevision, candidateTreeDigest: source.candidateTreeDigest,
        executionFingerprint: source.executionFingerprint, runId: input.currentRunId,
        runAttempt: input.currentRunAttempt, requestCount,
        u2: { runId: session.receipt.authority.u2.runId, attempt: session.receipt.authority.u2.attempt,
          jobId: session.receipt.authority.u2.jobId, checkId: session.receipt.authority.u2.checkId } };
    }
  };
}
