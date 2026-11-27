import { spawnSync } from 'node:child_process';
import { ContractError } from './package-loader.mjs';
import { candidateTreeDigestFromGit, executionFingerprintFromGit } from './image-ledger.mjs';

const COMMIT = /^[0-9a-f]{40}$/;
const protectedPaths = ['.github', 'tools/contracts', 'scripts', 'security', 'node_modules',
  '.npmrc', '.pnpmfile.cjs', 'pnpm-workspace.yaml'];
const fail = () => { throw new ContractError('IMAGE_LEDGER', 'BR6.5',
  'Independent SBOM source context is unavailable, dirty or differs from the candidate'); };

/** Derive receipt expectations from the checkout, never from a receipt or digest environment variable. */
export function readSbomSourceContext(repoRoot, candidateRevision) {
  const git = args => {
    const result = spawnSync('git', args, { cwd: repoRoot, shell: false, windowsHide: true,
      timeout: 10_000, maxBuffer: 32 * 1024 * 1024 });
    if (result.error || result.status !== 0 || !Buffer.isBuffer(result.stdout)) fail();
    return result.stdout;
  };
  if (!COMMIT.test(candidateRevision ?? '')) fail();
  const head = git(['rev-parse', 'HEAD']).toString('utf8').trim();
  if (head !== candidateRevision) fail();
  const dirty = git(['status', '--porcelain=v1', '-z', '--untracked-files=all', '--', ...protectedPaths]);
  if (dirty.length) fail();
  const tree = git(['rev-parse', `${head}^{tree}`]).toString('utf8').trim();
  if (!COMMIT.test(tree)) fail();
  const listing = git(['ls-tree', '-r', '-z', '--full-tree', head]);
  const context = { candidateRevision: head, candidateGitTreeSha: tree,
    candidateTreeDigest: candidateTreeDigestFromGit(listing),
    executionFingerprint: executionFingerprintFromGit(listing) };
  // Ref or source changes while collecting the context must not be accepted.
  if (git(['rev-parse', 'HEAD']).toString('utf8').trim() !== head ||
      git(['status', '--porcelain=v1', '-z', '--untracked-files=all', '--', ...protectedPaths]).length) fail();
  return context;
}
