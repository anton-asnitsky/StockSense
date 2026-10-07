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
 * A governance tool must not report a false provenance claim with the same code
 * as a broken toolchain: the first blames the package, the second blames the
 * environment, and only the operator can act on the difference. So a failure to
 * run Git stays GIT_UNAVAILABLE, while Git running and reporting that the path
 * is not in the recorded commit is a binding failure in its own right.
 * @param {string} repoRoot
 * @param {string} revision
 * @param {string} sourcePath
 * @returns {Buffer}
 */
function readBlob(repoRoot, revision, sourcePath) {
  const result = spawnSync('git', ['show', `${revision}:${sourcePath}`], { ...GIT_OPTIONS, cwd: repoRoot });
  if (result.error) fail('GIT_UNAVAILABLE', 'BR1.7', 'Git provenance could not be read for the contract sources');
  if (result.status !== 0) {
    fail('SOURCE_PATH_ABSENT', 'BR1.7',
      `The recorded revision does not contain ${sourcePath}, so it cannot describe the bytes being packaged`);
  }
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
  // Resolve the commit once, so a revision this repository does not contain is
  // reported as such rather than as a missing path for every binding after it.
  const resolved = spawnSync('git', ['rev-parse', '--verify', '--quiet', `${revision}^{commit}`],
    { ...GIT_OPTIONS, cwd: repoRoot, encoding: 'utf8' });
  if (resolved.error) fail('GIT_UNAVAILABLE', 'BR1.7', 'Git provenance could not be read for the contract sources');
  if (resolved.status !== 0) {
    fail('SOURCE_REVISION_UNKNOWN', 'BR1.7', 'The recorded revision names no commit in this repository');
  }
  const verified = [];
  for (const { sourcePath, contentDigest } of bindings) {
    const blob = readBlob(repoRoot, revision, sourcePath);
    const actual = digest(Buffer.from(blob));
    if (actual !== contentDigest) {
      fail('SOURCE_REVISION_MISMATCH', 'BR1.7',
        `The shipped bytes for ${sourcePath} do not match the blob at the recorded revision`);
    }
    verified.push({ sourcePath, contentDigest, revision });
  }
  return verified;
}
