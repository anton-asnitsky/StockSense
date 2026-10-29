import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const SHA = /^[0-9a-f]{40}$/;
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const BASES = new Set(['main', 'bolt/u1-candidate-ready']);
const APPROVAL_PREFIX = 'StockSense protected CI approval: ';
// These bytes define or configure the required scan verdict. A candidate PR
// may supply files to scan, but may not supply the scanner, its dependency tree
// or the exception evaluator that decides whether its own findings pass.
const SCAN_AUTHORITY = new Set([
  'security/image-exceptions.json',
  'pnpm-workspace.yaml', 'tools/contracts/pnpm-workspace.yaml', '.npmrc', '.pnpmfile.cjs',
  'tools/contracts/.npmrc', 'tools/contracts/.pnpmfile.cjs'
]);
const PROTECTED_DIRECTORIES = [
  '.github', 'node_modules', 'tools/contracts', 'scripts', 'security'
];

function isProtectedPath(path) {
  const lower = path.toLowerCase();
  // Protect complete authority roots. A newly named helper or build input is
  // protected even before a manifest or known-file list mentions it.
  return SCAN_AUTHORITY.has(lower) || PROTECTED_DIRECTORIES.some(root =>
    lower === root || lower.startsWith(`${root}/`));
}
const requireValue = (condition, message) => {
  if (!condition) throw new Error(message);
};

function treeEntries(tree) {
  requireValue(tree && tree.truncated === false && Array.isArray(tree.tree) &&
    tree.tree.length <= 10000, 'The complete immutable Git tree is unavailable');
  const entries = new Map();
  for (const item of tree.tree) {
    requireValue(typeof item?.path === 'string' && item.path.length > 0 &&
      typeof item.sha === 'string' && SHA.test(item.sha) &&
      !entries.has(item.path), 'The Git tree contains an invalid or duplicate path');
    entries.set(item.path, `${item.mode}:${item.type}:${item.sha}`);
  }
  return entries;
}

function changesBetween(baseTree, headTree) {
  const before = treeEntries(baseTree);
  const after = treeEntries(headTree);
  const changed = [...new Set([...before.keys(), ...after.keys()])]
    .filter(path => before.get(path) !== after.get(path));
  const protectedPaths = changed.filter(isProtectedPath);
  return { changed, protectedPaths };
}

/** Decide from two immutable trees, never from a live paginated PR file list. */
export function evaluatePublicPr({ event, repository, baseSha, pull, baseTree, headTree,
  approvedHead = null }) {
  requireValue(event?.pull_request && Number.isInteger(event.number), 'Missing pull-request event');
  requireValue(BASES.has(event.pull_request.base?.ref) &&
    event.pull_request.base.repo?.full_name === repository &&
    pull?.base?.ref === event.pull_request.base.ref && pull.base.repo?.full_name === repository,
  'The pull request must target this repository\'s protected main or U1 Bolt branch');
  requireValue(SHA.test(baseSha) && event.pull_request.base.sha === baseSha &&
    pull.base.sha === baseSha, 'The protected base revision changed during the check');
  requireValue(SHA.test(event.pull_request.head?.sha) &&
    pull.head?.sha === event.pull_request.head.sha && REPO.test(pull.head.repo?.full_name),
  'The pull-request head changed or its repository is unavailable');
  // Protect workflows, local actions and this policy itself. A rename is a
  // deletion plus an addition here, so both sides are checked.
  const { changed, protectedPaths } = changesBetween(baseTree, headTree);
  requireValue(!protectedPaths.length || approvedHead === pull.head.sha,
    `Protected CI paths changed without exact-head owner approval: ${protectedPaths.join(', ')}`);
  return { baseSha, headSha: pull.head.sha, comparedPaths: changed.length,
    protectedPaths: protectedPaths.length, ownerApproved: protectedPaths.length > 0 };
}

/** A PR author's body and labels cannot authorize changes to the guard itself. */
export function ownerApproval(comments, repository, baseSha, headSha) {
  requireValue(Array.isArray(comments) && REPO.test(repository) && SHA.test(baseSha) && SHA.test(headSha),
    'Owner approval evidence is unavailable');
  const owner = repository.split('/')[0].toLowerCase();
  const expected = `${APPROVAL_PREFIX}${baseSha} ${headSha}`;
  return comments.find(comment => comment?.body?.trim() === expected &&
    comment.user?.login?.toLowerCase() === owner &&
    comment.user?.type === 'User' && comment.author_association === 'OWNER') ?? null;
}

async function approvalComments(repository, number, token, request) {
  requireValue(Number.isInteger(number) && number > 0, 'Invalid pull-request number');
  const comments = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await request(`/repos/${repository}/issues/${number}/comments?per_page=100&page=${page}`, token);
    requireValue(Array.isArray(batch) && batch.length <= 100,
      'Owner approval comment listing is incomplete');
    comments.push(...batch);
    if (batch.length < 100) return comments;
  }
  throw new Error('Owner approval comment listing exceeds the review bound');
}

async function githubJson(path, token) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28'
    },
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) throw new Error(`GitHub metadata request failed (${response.status})`);
  return response.json();
}

async function immutableTree(repository, revision, token, request) {
  requireValue(REPO.test(repository) && SHA.test(revision), 'Invalid immutable tree identity');
  const commit = await request(`/repos/${repository}/git/commits/${revision}`, token);
  requireValue(SHA.test(commit?.tree?.sha), 'The commit has no immutable tree');
  const tree = await request(`/repos/${repository}/git/trees/${commit.tree.sha}?recursive=1`, token);
  treeEntries(tree);
  return tree;
}

/** Read only protected-base and fork-head Git objects and verify the live PR twice. */
export async function checkPublicPr({ event, repository, baseSha, token, request = githubJson }) {
  requireValue(REPO.test(repository) && token, 'Repository identity or read-only token is unavailable');
  const path = `/repos/${repository}/pulls/${event?.number}`;
  const pull = await request(path, token);
  requireValue(SHA.test(pull?.head?.sha) && REPO.test(pull.head.repo?.full_name),
    'The pull-request head or fork is unavailable');
  const [baseTree, headTree] = await Promise.all([
    immutableTree(repository, baseSha, token, request),
    immutableTree(pull.head.repo.full_name, pull.head.sha, token, request)
  ]);
  const latest = await request(path, token);
  requireValue(latest?.head?.sha === pull.head.sha && latest?.base?.sha === pull.base.sha,
    'The pull request changed while its immutable trees were read');
  // Inspect the same immutable trees before reading approval evidence. Ordinary
  // PRs keep the original no-comment path and do not depend on comment access.
  const protectedChanged = changesBetween(baseTree, headTree).protectedPaths.length > 0;
  let approvedHead = null;
  if (protectedChanged) {
    const comments = await approvalComments(repository, event.number, token, request);
    if (ownerApproval(comments, repository, baseSha, latest.head.sha)) approvedHead = latest.head.sha;
    // A PR can move while comments are read. Never transfer an approval to a
    // later head or base revision just because a stale event is still running.
    const final = await request(path, token);
    requireValue(final?.head?.sha === latest.head.sha && final?.base?.sha === latest.base.sha,
      'The pull request changed while owner approval was read');
  }
  return evaluatePublicPr({ event, repository, baseSha, pull: latest, baseTree, headTree,
    approvedHead });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const result = await checkPublicPr({
      event,
      repository: process.env.GITHUB_REPOSITORY,
      // pull_request_target executes trusted code from the default branch,
      // while a PR may target the U1 Bolt. Compare the PR's actual base tree.
      baseSha: event?.pull_request?.base?.sha,
      token: process.env.GITHUB_TOKEN
    });
    process.stdout.write(`Protected base ${result.baseSha}, head ${result.headSha}, ${result.comparedPaths} changed paths compared, ${result.protectedPaths} protected paths${result.ownerApproved ? ' approved by repository owner for this exact head' : ''}\n`);
  } catch (error) {
    process.stderr.write(`Public PR policy refused: ${error.message}\n`);
    process.exitCode = 1;
  }
}
