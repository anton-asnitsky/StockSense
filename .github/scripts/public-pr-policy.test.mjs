import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { checkPublicPr, evaluatePublicPr, ownerApproval } from './public-pr-policy.mjs';

const baseSha = 'a'.repeat(40);
const headSha = 'b'.repeat(40);
const repository = 'anton-asnitsky/StockSense';
const event = {
  number: 42,
  pull_request: {
    base: { ref: 'main', sha: baseSha, repo: { full_name: repository } },
    head: { sha: headSha }
  }
};
const pull = { base: event.pull_request.base,
  head: { ...event.pull_request.head, repo: { full_name: 'contributor/StockSense' } } };
const entry = (path, sha) => ({ path, sha, mode: '100644', type: 'blob' });
const tree = (...entries) => ({ truncated: false, tree: entries });
const baseTree = tree(entry('.github/workflows/contracts-required.yml', 'c'.repeat(40)),
  entry('src/example.mjs', 'd'.repeat(40)));
const headTree = tree(entry('.github/workflows/contracts-required.yml', 'c'.repeat(40)),
  entry('src/example.mjs', 'e'.repeat(40)));
const input = { event, repository, baseSha, pull, baseTree, headTree };

test('image disposition precedes candidate package installation and tests', () => {
  const workflow = readFileSync(new URL('../workflows/contracts-required.yml', import.meta.url), 'utf8');
  const position = name => {
    const index = workflow.indexOf(`      - name: ${name}`);
    assert.ok(index >= 0, `Missing required step: ${name}`);
    return index;
  };
  const verified = position('Verify current findings against protected main ledger');
  for (const name of ['Install from the frozen lockfile', 'Enforce the CI policy',
    'Set up the pinned differ', 'Lint', 'Type-check', 'Unit tests',
    'Integration tests', 'Coverage with the 80% line floor']) {
    assert.ok(verified < position(name), `${name} executes before image disposition`);
  }
  assert.ok(position('Build the pinned standards image') < position('Inventory and scan the exact built images'));
  assert.ok(position('Inventory and scan the exact built images') < verified);
  const beforeVerification = workflow.slice(0, verified);
  for (const name of ['build-standards-image', 'build-kiota-image']) {
    assert.match(beforeVerification,
      new RegExp(`working-directory: tools/contracts\\s+run: \\|\\s+id="\\$\\(node scripts/${name}\\.mjs`));
  }
  assert.doesNotMatch(beforeVerification, /pnpm --(?:dir|silent)/);
});

test('an ordinary PR compares exact immutable base and fork-head trees', () => {
  assert.deepEqual(evaluatePublicPr(input), { baseSha, headSha, comparedPaths: 1,
    protectedPaths: 0, ownerApproved: false });
});

test('workflow edits, same-name job additions, local actions and renames are refused', () => {
  for (const path of ['.github/workflows/contracts-required.yml',
    '.github/workflows/spoof-required-job.yml', '.GITHUB/actions/guard/action.yml',
    '.github/scripts/public-pr-policy.mjs']) {
    assert.throws(() => evaluatePublicPr({ ...input, headTree: tree(...headTree.tree.filter(item => item.path !== path),
      entry(path, 'f'.repeat(40))) }), /Protected CI paths changed/);
  }
  assert.throws(() => evaluatePublicPr({ ...input,
    headTree: tree(entry('src/example.mjs', 'e'.repeat(40))) }), /Protected CI paths changed/);
});

test('a PR cannot change the scanner, its dependency inputs or exception authority', () => {
  for (const path of ['tools/contracts/scripts/security-reports.mjs',
    'tools/contracts/scripts/check-ci-policy.mjs', 'tools/contracts/scripts/build-sbom.mjs',
    'tools/contracts/scripts/build-standards-image.mjs', 'tools/contracts/scripts/build-kiota-image.mjs',
    'security/image-exceptions.json',
    'tools/contracts/scripts/build-candidate-bundle.mjs', 'tools/contracts/scripts/image-evidence.mjs',
    'tools/contracts/src/ci-policy.mjs', 'tools/contracts/src/bounded-generators.mjs',
    'tools/contracts/src/container-tool-launcher.mjs',
    'tools/contracts/src/evidence.mjs', 'tools/contracts/src/generators.mjs',
    'tools/contracts/src/candidate-provenance.mjs', 'tools/contracts/src/image-evidence.mjs',
    'tools/contracts/src/image-ledger.mjs', 'tools/contracts/src/source-digest.mjs',
    'tools/contracts/src/package-loader.mjs', 'tools/contracts/src/preflight.mjs',
    'tools/contracts/src/sbom.mjs',
    'tools/contracts/package.json',
    'tools/contracts/pnpm-lock.yaml', 'tools/contracts/pnpm-workspace.yaml',
    'tools/contracts/Dockerfile.validator',
    'tools/contracts/Dockerfile.generator-kiota', '.npmrc', 'tools/contracts/.pnpmfile.cjs',
    'tools/contracts/node_modules/.bin/node', 'node_modules/.bin/node']) {
    assert.throws(() => evaluatePublicPr({ ...input,
      baseTree: tree(...baseTree.tree, entry(path, 'c'.repeat(40))),
      headTree: tree(...headTree.tree, entry(path, 'f'.repeat(40))) }),
    /Protected CI paths changed/, path);
  }
});

test('the base-owned policy also checks U1 Bolt PRs', () => {
  const boltBase = { ...event.pull_request.base, ref: 'bolt/u1-candidate-ready' };
  const boltEvent = { ...event, pull_request: { ...event.pull_request, base: boltBase } };
  const boltPull = { ...pull, base: boltBase };
  assert.deepEqual(evaluatePublicPr({ ...input, event: boltEvent, pull: boltPull }),
    { baseSha, headSha, comparedPaths: 1, protectedPaths: 0, ownerApproved: false });
  assert.throws(() => evaluatePublicPr({ ...input, event: boltEvent, pull: boltPull,
    headTree: tree(...headTree.tree, entry('tools/contracts/src/ci-policy.mjs', 'f'.repeat(40))) }),
  /Protected CI paths changed/);
});

test('only an exact-head repository-owner comment authorizes protected paths', () => {
  const protectedHead = tree(entry('.github/workflows/contracts-required.yml', 'f'.repeat(40)),
    entry('src/example.mjs', 'e'.repeat(40)));
  const body = `StockSense protected CI approval: ${headSha}`;
  const valid = { body, user: { login: 'anton-asnitsky', type: 'User' },
    author_association: 'OWNER' };
  assert.equal(ownerApproval([valid], repository, headSha), valid);
  for (const comment of [
    { ...valid, body: `StockSense protected CI approval: ${'f'.repeat(40)}` },
    { ...valid, user: { login: 'contributor', type: 'User' } },
    { ...valid, author_association: 'CONTRIBUTOR' },
    { ...valid, user: { login: 'anton-asnitsky', type: 'Bot' } }
  ]) assert.equal(ownerApproval([comment], repository, headSha), null);
  assert.throws(() => evaluatePublicPr({ ...input, headTree: protectedHead }),
    /without exact-head owner approval/);
  assert.deepEqual(evaluatePublicPr({ ...input, headTree: protectedHead,
    approvedHead: headSha }), { baseSha, headSha, comparedPaths: 2,
    protectedPaths: 1, ownerApproved: true });
  assert.throws(() => evaluatePublicPr({ ...input, headTree: protectedHead,
    approvedHead: 'f'.repeat(40) }), /without exact-head owner approval/);
});

test('the base-owned API reader checks owner comments and rechecks the PR', async () => {
  const protectedHead = tree(entry('.github/workflows/contracts-required.yml', 'f'.repeat(40)),
    entry('src/example.mjs', 'e'.repeat(40)));
  const requests = [];
  const request = async path => {
    requests.push(path);
    if (path.endsWith('/pulls/42')) return pull;
    if (path.endsWith(`/git/commits/${baseSha}`)) return { tree: { sha: '1'.repeat(40) } };
    if (path.endsWith(`/git/commits/${headSha}`)) return { tree: { sha: '2'.repeat(40) } };
    if (path.includes(`/git/trees/${'1'.repeat(40)}`)) return baseTree;
    if (path.includes(`/git/trees/${'2'.repeat(40)}`)) return protectedHead;
    if (path.endsWith('/issues/42/comments?per_page=100&page=1')) return [
      { body: `StockSense protected CI approval: ${headSha}`,
        user: { login: 'anton-asnitsky', type: 'User' }, author_association: 'OWNER' }];
    throw new Error(`Unexpected request ${path}`);
  };
  const result = await checkPublicPr({ event, repository, baseSha, token: 'test', request });
  assert.equal(result.ownerApproved, true);
  assert.equal(requests.filter(path => path.endsWith('/pulls/42')).length, 3);
  assert.ok(requests.some(path => path.includes('/issues/42/comments?per_page=100&page=1')));
  await assert.rejects(checkPublicPr({ event, repository, baseSha, token: 'test',
    request: async path => path.includes('/issues/42/comments') ? [] : request(path) }),
  /without exact-head owner approval/);
  let pullReads = 0;
  await assert.rejects(checkPublicPr({ event, repository, baseSha, token: 'test',
    request: async path => path.endsWith('/pulls/42') && ++pullReads === 3 ?
      { ...pull, head: { ...pull.head, sha: 'f'.repeat(40) } } : request(path) }),
  /changed while owner approval was read/);
});

test('stale revisions, wrong repository and truncated trees fail closed', () => {
  assert.throws(() => evaluatePublicPr({ ...input, baseSha: 'f'.repeat(40) }), /base revision changed/);
  assert.throws(() => evaluatePublicPr({ ...input,
    pull: { ...pull, head: { ...pull.head, sha: 'f'.repeat(40) } } }), /head changed/);
  assert.throws(() => evaluatePublicPr({ ...input, repository: 'someone/else' }), /protected main/);
  assert.throws(() => evaluatePublicPr({ ...input, headTree: { ...headTree, truncated: true } }),
    /complete immutable Git tree/);
});

test('API reader binds tree objects to commits and rereads the PR after both trees', async () => {
  const requests = [];
  const request = async path => {
    requests.push(path);
    if (path.endsWith('/pulls/42')) return pull;
    if (path.endsWith(`/git/commits/${baseSha}`)) return { tree: { sha: '1'.repeat(40) } };
    if (path.endsWith(`/git/commits/${headSha}`)) return { tree: { sha: '2'.repeat(40) } };
    if (path.includes(`/git/trees/${'1'.repeat(40)}`)) return baseTree;
    if (path.includes(`/git/trees/${'2'.repeat(40)}`)) return headTree;
    throw new Error(`Unexpected request ${path}`);
  };
  assert.equal((await checkPublicPr({ event, repository, baseSha, token: 'test', request })).comparedPaths, 1);
  assert.equal(requests.filter(path => path.endsWith('/pulls/42')).length, 2);
  assert.ok(requests.some(path => path.includes('/repos/contributor/StockSense/git/commits/')));
  let reads = 0;
  await assert.rejects(checkPublicPr({ event, repository, baseSha, token: 'test',
    request: async path => {
      if (path.endsWith('/pulls/42')) return ++reads === 1 ? pull :
        { ...pull, head: { ...pull.head, sha: 'f'.repeat(40) } };
      return request(path);
    } }), /changed while its immutable trees were read/);
});
