import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const SHA = /^[0-9a-f]{40}$/;
const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const BASES = new Set(['main', 'bolt/u1-candidate-ready']);
// These bytes define or configure the required scan verdict. A candidate PR
// may supply files to scan, but may not supply the scanner, its dependency tree
// or the exception evaluator that decides whether its own findings pass.
const SCAN_AUTHORITY = new Set([
  'security/image-exceptions.json',
  'tools/contracts/scripts/security-reports.mjs',
  'tools/contracts/scripts/check-ci-policy.mjs',
  'tools/contracts/scripts/build-sbom.mjs',
  'tools/contracts/scripts/build-standards-image.mjs',
  'tools/contracts/scripts/build-kiota-image.mjs',
  'tools/contracts/scripts/build-candidate-bundle.mjs',
  'tools/contracts/scripts/image-evidence.mjs',
  'tools/contracts/src/ci-policy.mjs',
  'tools/contracts/src/bounded-generators.mjs',
  'tools/contracts/src/container-tool-launcher.mjs',
  'tools/contracts/src/candidate-provenance.mjs',
  'tools/contracts/src/evidence.mjs',
  'tools/contracts/src/generators.mjs',
  'tools/contracts/src/image-evidence.mjs',
  'tools/contracts/src/image-ledger.mjs',
  'tools/contracts/src/source-digest.mjs',
  'tools/contracts/src/package-loader.mjs',
  'tools/contracts/src/preflight.mjs',
  'tools/contracts/src/sbom.mjs',
  'tools/contracts/package.json',
  'tools/contracts/pnpm-lock.yaml',
  'tools/contracts/dockerfile.validator',
  'tools/contracts/dockerfile.generator-kiota',
  'pnpm-workspace.yaml', 'tools/contracts/pnpm-workspace.yaml', '.npmrc', '.pnpmfile.cjs',
  'tools/contracts/.npmrc', 'tools/contracts/.pnpmfile.cjs'
]);
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

/** Decide from two immutable trees, never from a live paginated PR file list. */
export function evaluatePublicPr({ event, repository, baseSha, pull, baseTree, headTree }) {
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
  const before = treeEntries(baseTree);
  const after = treeEntries(headTree);
  const changed = [...new Set([...before.keys(), ...after.keys()])]
    .filter(path => before.get(path) !== after.get(path));
  // Protect workflows, local actions and this policy itself. A rename is a
  // deletion plus an addition here, so both sides are checked.
  const denied = changed.filter(path => {
    const lower = path.toLowerCase();
    return lower === '.github' || lower.startsWith('.github/') ||
      SCAN_AUTHORITY.has(lower) ||
      ['node_modules', 'tools/contracts/node_modules'].some(root =>
        lower === root || lower.startsWith(`${root}/`));
  });
  requireValue(!denied.length, `Protected CI paths changed: ${denied.join(', ')}`);
  return { baseSha, headSha: pull.head.sha, comparedPaths: changed.length };
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
  return evaluatePublicPr({ event, repository, baseSha, pull: latest, baseTree, headTree });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const result = await checkPublicPr({
      event,
      repository: process.env.GITHUB_REPOSITORY,
      baseSha: process.env.GITHUB_SHA,
      token: process.env.GITHUB_TOKEN
    });
    process.stdout.write(`Protected base ${result.baseSha}, head ${result.headSha}, ${result.comparedPaths} changed paths compared\n`);
  } catch (error) {
    process.stderr.write(`Public PR policy refused: ${error.message}\n`);
    process.exitCode = 1;
  }
}
