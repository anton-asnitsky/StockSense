import { spawnSync } from 'node:child_process';
import { ContractError, digest } from './package-loader.mjs';

/** @returns {never} */
const fail = (code, rule, message) => { throw new ContractError(code, rule, message); };
const COMMIT = /^[0-9a-f]{40}$/;

const GIT_OPTIONS = { timeout: 60_000, maxBuffer: 8 * 1024 * 1024 };

const gitFailed = result => Boolean(result.error) || result.status !== 0;

/**
 * @param {string} repoRoot
 * @param {string[]} args
 * @returns {string}
 */
function gitText(repoRoot, args) {
  const result = spawnSync('git', args, { ...GIT_OPTIONS, cwd: repoRoot, encoding: 'utf8' });
  if (gitFailed(result)) fail('GIT_UNAVAILABLE', 'BR1.7', 'Git provenance could not be read for the contract sources');
  return result.stdout;
}

/**
 * @param {string} repoRoot
 * @param {string[]} args
 * @returns {Buffer}
 */
function gitBytes(repoRoot, args) {
  const result = spawnSync('git', args, { ...GIT_OPTIONS, cwd: repoRoot });
  if (gitFailed(result)) fail('GIT_UNAVAILABLE', 'BR1.7', 'Git provenance could not be read for the contract sources');
  return result.stdout;
}

/**
 * The commit a package claims must contain the exact source bytes it ships.
 * If the working tree has uncommitted changes under the source paths, any
 * commit we stamped would describe bytes that are not the ones being packaged.
 */
export function assertSourcesCommitted(repoRoot, paths) {
  const status = gitText(repoRoot, ['status', '--porcelain', '--', ...paths]).trim();
  if (status) {
    fail('SOURCE_NOT_COMMITTED', 'BR1.7',
      'Contract sources have uncommitted changes, so no commit describes the bytes being packaged');
  }
  return true;
}

/** Resolve the last commit that touched the given source paths. */
export function resolveSourceRevision(repoRoot, paths) {
  const revision = gitText(repoRoot, ['log', '-1', '--format=%H', '--', ...paths]).trim();
  if (!COMMIT.test(revision)) {
    fail('SOURCE_REVISION_UNRESOLVED', 'BR1.7', 'No commit contains these contract sources');
  }
  return revision;
}

/**
 * Verify that each shipped document matches the blob recorded at the claimed
 * revision. This is what makes `sourceRevision` a binding rather than a label:
 * a package whose bytes drifted from its commit is rejected.
 */
export function verifySourceBinding(repoRoot, revision, bindings) {
  if (!COMMIT.test(String(revision))) {
    fail('SOURCE_REVISION_SHAPE', 'BR1.7', 'A package must record a full 40-character commit');
  }
  const verified = [];
  for (const { sourcePath, contentDigest } of bindings) {
    const blob = gitBytes(repoRoot, ['show', `${revision}:${sourcePath}`]);
    const actual = digest(Buffer.from(blob));
    if (actual !== contentDigest) {
      fail('SOURCE_REVISION_MISMATCH', 'BR1.7',
        `The shipped bytes for ${sourcePath} do not match the blob at the recorded revision`);
    }
    verified.push({ sourcePath, contentDigest, revision });
  }
  return verified;
}
