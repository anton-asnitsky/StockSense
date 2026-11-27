import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPrEntrypointFixture } from '../fixtures/pr-ledger-authority/entrypoint.mjs';

// U1 defines the public-PR policy; this is the script that applies it, so that
// the rule is enforced rather than merely described. Before it existed a pull
// request could have introduced pull_request_target, a self-hosted runner on an
// untrusted trigger, a write permission or an unpinned action, and nothing in
// the repository would have objected.
const script = fileURLToPath(new URL('../../scripts/check-ci-policy.mjs', import.meta.url));
const sha = 'a'.repeat(40);
// Standalone behavior is tested independently of the hosting CI job's mode.
const standaloneEnv = { ...process.env };
for (const key of Object.keys(standaloneEnv)) {
  if (key.startsWith('GITHUB_') || key.startsWith('STOCKSENSE_')) delete standaloneEnv[key];
}

const compliant = `name: required
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  checks:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@${sha}
      - run: echo ok
`;

test('live protected U2 handoff accepts exactly reviewed workflows and refuses replay, omissions and revocation', async () => {
  const data = await createPrEntrypointFixture({ workflows: {
    'contracts-required.yml': compliant, 'release-evidence.yml': compliant
  } });
  const run = (...args) => data.execute('check-ci-policy.mjs', ['.github/workflows', ...args]);
  try {
    const ledger = data.execute(); assert.equal(ledger.status, 0, ledger.stderr);
    const good = run();
    assert.equal(good.status, 0, good.stdout + good.stderr);
    assert.match(good.stdout, /Verified live PR workflow authority/);
    assert.match(good.stdout, /"requestCount":[1-9][0-9]*/);
    assert.match(good.stdout, /accepted pinned protected-base metadata guard/);
    assert.doesNotMatch(good.stdout, /synthetic-unit-token/);
    const missingPaths = run('--changed', '.github/workflows/contracts-required.yml');
    assert.notEqual(missingPaths.status, 0);
    assert.match(missingPaths.stderr, /Caller changed paths differ from Git/);
    assert.doesNotMatch(missingPaths.stdout, /accepted/);
    const elsewhere = data.execute('check-ci-policy.mjs', [data.directory]);
    assert.notEqual(elsewhere.status, 0);
    assert.match(elsewhere.stderr, /canonical workflow directory/);

    for (const [key, value] of [['GITHUB_TOKEN', ''], ['GITHUB_EVENT_NAME', 'push'],
      ['GITHUB_EVENT_NAME', 'release'], ['STOCKSENSE_LEDGER_AUTHORITY', 'unknown'],
      ['STOCKSENSE_LEDGER_AUTHORITY', 'protected-main'], ['STOCKSENSE_LEDGER_AUTHORITY', undefined],
      ['STOCKSENSE_PR_NUMBER', '77'], ['GITHUB_RUN_ID', '999'],
      ['GITHUB_RUN_ATTEMPT', '2'], ['STOCKSENSE_PR_BASE_SHA', 'f'.repeat(40)],
      ['STOCKSENSE_PR_HEAD_SHA', 'f'.repeat(40)], ['GITHUB_SHA', 'f'.repeat(40)],
      ['STOCKSENSE_CANDIDATE_REVISION', 'f'.repeat(40)],
      ['STOCKSENSE_STANDARDS_IMAGE', `sha256:${'f'.repeat(64)}`]]) {
      const old = data.env[key];
      if (value === undefined) delete data.env[key]; else data.env[key] = value;
      const result = run(); data.env[key] = old;
      assert.notEqual(result.status, 0, key);
      assert.doesNotMatch(result.stdout, /accepted/, key);
    }
    const retained = await readFile(data.receiptPath, 'utf8');
    await rm(data.receiptPath);
    const missing = run(); assert.notEqual(missing.status, 0); assert.doesNotMatch(missing.stdout, /accepted/);
    for (const malformed of ['{"schema":', ' '.repeat(1024 * 1024 + 1), '{"schema":"duplicate",' + retained.slice(1)]) {
      await writeFile(data.receiptPath, malformed);
      const result = run(); assert.notEqual(result.status, 0); assert.doesNotMatch(result.stdout, /accepted/);
    }
    await writeFile(data.receiptPath, retained);
    const rawPath = join(data.directory, 'validator.grype-raw.json');
    const raw = await readFile(rawPath);
    await writeFile(rawPath, '{"matches":[{}]}');
    const tampered = run(); assert.notEqual(tampered.status, 0); assert.match(tampered.stderr, /IMAGE_RAW/);
    await writeFile(rawPath, raw);
    for (const scenario of ['missing-u2', 'revoked-final', 'u2-attempt-final']) {
      await data.updateScenario({ scenario });
      const result = run();
      assert.notEqual(result.status, 0, scenario);
      assert.doesNotMatch(result.stdout, /accepted/, scenario);
      assert.match(result.stderr, /PR_AUTH/, scenario);
    }
    await data.updateScenario({ scenario: 'success' });
    await writeFile(join(data.repoRoot, '.github/workflows/contracts-required.yml'), compliant + '# dirty\n');
    const dirty = run(); assert.notEqual(dirty.status, 0); assert.match(dirty.stderr, /dirty/);
  } finally { await data.cleanup(); }
});

test('the same independently bound handoff supports the other two explicitly scoped PRs', async () => {
  for (const pullNumber of [75, 76]) {
    const data = await createPrEntrypointFixture({ pullNumber, workflows: { 'contracts-required.yml': compliant } });
    try {
      const ledger = data.execute(); assert.equal(ledger.status, 0, ledger.stderr);
      const result = data.execute('check-ci-policy.mjs', ['.github/workflows']);
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.match(result.stdout, /Verified live PR workflow authority/);
    } finally { await data.cleanup(); }
  }
});

test('live receipt never excuses forbidden workflow changes or static policy violations', async () => {
  const cases = [
    ['other.yml', compliant, /Only the two reviewed/],
    ['public-pr-policy.yml', compliant, /Only the two reviewed/],
    ['contracts-required.yml', compliant.replace(`actions/checkout@${sha}`, 'actions/checkout@v5'), /CI_UNPINNED_ACTION/],
    ['contracts-required.yml', compliant.replace('  pull_request:', '  pull_request_target:'), /CI_UNTRUSTED_TRIGGER/],
    ['contracts-required.yml', compliant.replace('runs-on: ubuntu-latest', 'runs-on: self-hosted'), /CI_UNTRUSTED_RUNNER/],
    ['contracts-required.yml', compliant.replace('      contents: read\n    steps:', '      contents: write\n    steps:'), /CI_EXCESSIVE_PERMISSIONS/],
    ['contracts-required.yml', compliant.replace('permissions:\n  contents: read\n', '').replace('    permissions:\n      contents: read\n', ''), /CI_PERMISSIONS_UNSET/],
    ['contracts-required.yml', 'jobs: [broken\n', /WORKFLOW_PARSE/]
  ];
  for (const [name, content, expected] of cases) {
    const data = await createPrEntrypointFixture({ workflows: { [name]: content } });
    try {
      const ledger = data.execute(); assert.equal(ledger.status, 0, ledger.stderr);
      const result = data.execute('check-ci-policy.mjs', ['.github/workflows']);
      assert.notEqual(result.status, 0, name);
      assert.match(result.stdout + result.stderr, expected);
      assert.doesNotMatch(result.stdout, /accepted/);
    } finally { await data.cleanup(); }
  }
});

test('source edits and new workflow files during terminal live verification cannot be credited', async () => {
  for (const scenario of ['workflow-race-final', 'workflow-added-final']) {
    const data = await createPrEntrypointFixture({ workflows: { 'contracts-required.yml': compliant } });
    try {
      const ledger = data.execute(); assert.equal(ledger.status, 0, ledger.stderr);
      await data.updateScenario({ scenario });
      const result = data.execute('check-ci-policy.mjs', ['.github/workflows']);
      assert.notEqual(result.status, 0, scenario);
      assert.match(result.stderr, /dirty|changed during policy/);
      assert.doesNotMatch(result.stdout, /accepted|Verified live PR workflow authority/);
    } finally { await data.cleanup(); }
  }
});

test('authority expiring only during post-network source checks is refused before acceptance', async () => {
  const data = await createPrEntrypointFixture({ workflows: { 'contracts-required.yml': compliant } });
  try {
    const ledger = data.execute(); assert.equal(ledger.status, 0, ledger.stderr);
    await data.updateScenario({ scenario: 'expiry-after-source' });
    const result = data.execute('check-ci-policy.mjs', ['.github/workflows']);
    assert.notEqual(result.status, 0);
    // The live retrieval finished before the injected clock crossed expiry;
    // only the final pure bound check sees the expired authorization.
    assert.match(result.stderr, /PR_AUTH_BINDING/);
    assert.doesNotMatch(result.stderr, /PR_AUTH_TIME/);
    assert.doesNotMatch(result.stdout, /accepted|Verified live PR workflow authority/);
  } finally { await data.cleanup(); }
});

async function withWorkflow(content, changed, check) {
  const directory = await mkdtemp(join(tmpdir(), 'stocksense-ci-policy-'));
  try {
    await writeFile(join(directory, 'required.yml'), content);
    const result = spawnSync(process.execPath,
      [script, directory, ...(changed.length ? ['--changed', ...changed] : [])],
      { encoding: 'utf8', timeout: 60_000, env: standaloneEnv });
    await check(result);
  } finally { await rm(directory, { recursive: true, force: true }); }
}

test('the policy check accepts a compliant workflow on an ordinary pull request', async () => {
  await withWorkflow(compliant, ['tools/contracts/src/policy.mjs'], result => {
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /required\.yml: accepted/);
  });
});

test('the policy check refuses a pull request that edits workflow configuration', async () => {
  // The protected base revision decides a workflow change, never the pull
  // request proposing it.
  await withWorkflow(compliant, ['.github/workflows/required.yml'], result => {
    assert.equal(result.status, 1);
    assert.match(result.stdout, /CI_WORKFLOW_CHANGE\/BR6\.7/);
  });
});

test('only the exact reviewed protected-base metadata guard is excepted', async () => {
  const guard = await readFile(fileURLToPath(new URL('../../../../.github/workflows/public-pr-policy.yml',
    import.meta.url)), 'utf8');
  const directory = await mkdtemp(join(tmpdir(), 'stocksense-ci-guard-'));
  try {
    await writeFile(join(directory, 'public-pr-policy.yml'), guard);
    const run = (...extra) => spawnSync(process.execPath, [script, directory, ...extra],
      { encoding: 'utf8', timeout: 60_000, env: standaloneEnv });
    assert.equal(run().status, 0, 'the pinned guard must be accepted');
    const changed = run('--changed', '.github/workflows/public-pr-policy.yml');
    assert.equal(changed.status, 1);
    assert.match(changed.stdout, /CI_WORKFLOW_CHANGE\/BR6\.7/);
    await writeFile(join(directory, 'public-pr-policy.yml'), guard.replace('contents: read', 'contents: write'));
    const drift = run();
    assert.equal(drift.status, 1);
    assert.match(drift.stdout, /CI_GUARD_DRIFT\/BR6\.7/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('the policy check refuses each shape the policy exists to stop', async () => {
  const cases = [
    ['pull_request_target', compliant.replace('  pull_request:', '  pull_request_target:'), /CI_UNTRUSTED_TRIGGER/],
    ['self-hosted runner', compliant.replace('runs-on: ubuntu-latest', 'runs-on: self-hosted'), /CI_UNTRUSTED_RUNNER/],
    ['write permission', compliant.replace('      contents: read\n    steps:', '      id-token: write\n    steps:'), /CI_EXCESSIVE_PERMISSIONS/],
    ['unpinned action', compliant.replace(`actions/checkout@${sha}`, 'actions/checkout@v5'), /CI_UNPINNED_ACTION/],
    ['absent permissions', compliant.replace('permissions:\n  contents: read\n', '').replace('    permissions:\n      contents: read\n', ''), /CI_PERMISSIONS_UNSET/]
  ];
  for (const [label, content, expected] of cases) {
    await withWorkflow(content, ['tools/contracts/src/policy.mjs'], result => {
      assert.equal(result.status, 1, `${label} should be refused`);
      assert.match(result.stdout, expected, label);
    });
  }
});

test('the policy check refuses a workflow that is not well-formed, and an empty directory', async () => {
  await withWorkflow('name: broken\non: [pull_request]\njobs: "not a map"\n', [], result => {
    assert.equal(result.status, 1);
    assert.match(result.stdout, /CI_POLICY_SHAPE\/BR6\.7/);
  });
  const empty = await mkdtemp(join(tmpdir(), 'stocksense-ci-policy-'));
  try {
    const result = spawnSync(process.execPath, [script, empty], { encoding: 'utf8', timeout: 60_000, env: standaloneEnv });
    // An absent workflow must fail rather than silently pass: a required check
    // that finds nothing to judge has judged nothing.
    assert.equal(result.status, 1);
    assert.match(result.stderr, /No workflow files/);
  } finally { await rm(empty, { recursive: true, force: true }); }
});

test('a trusted-only workflow may hold the writes build provenance needs', async () => {
  // Attestation was never blocked by this policy; it was blocked in the
  // pull-request-triggered check, correctly, and nobody had written the
  // release workflow. A push-only workflow may hold id-token and attestations.
  const release = `name: release
on:
  push:
    branches: [main]
permissions:
  contents: read
  id-token: write
  attestations: write
jobs:
  attest:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
      attestations: write
    steps:
      - uses: actions/attest-build-provenance@${sha}
`;
  await withWorkflow(release, ['tools/contracts/src/sbom.mjs'], result => {
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /accepted/);
  });
});

test('a trusted trigger no longer exempts a workflow from declaring permissions', async () => {
  // These three all passed before: the permission rules applied only to
  // untrusted triggers, so a release workflow could grant anything.
  const base = `name: release
on:
  push:
    branches: [main]
PERMISSIONS
jobs:
  attest:
    runs-on: ubuntu-latest
JOBPERMS
    steps:
      - uses: actions/attest-build-provenance@${sha}
`;
  const cases = [
    ['no permissions anywhere', base.replace('PERMISSIONS\n', '').replace('JOBPERMS\n', ''), /CI_PERMISSIONS_UNSET/],
    ['write-all at workflow level', base.replace('PERMISSIONS', 'permissions: write-all').replace('JOBPERMS\n', ''), /CI_EXCESSIVE_PERMISSIONS/],
    ['read-all at workflow level', base.replace('PERMISSIONS', 'permissions: read-all').replace('JOBPERMS\n', ''), /CI_EXCESSIVE_PERMISSIONS/],
    ['unjustified packages write', base.replace('PERMISSIONS', 'permissions:\n  packages: write').replace('JOBPERMS\n', ''), /CI_UNJUSTIFIED_PERMISSION/],
    ['unjustified actions write', base.replace('PERMISSIONS', 'permissions:\n  actions: write').replace('JOBPERMS\n', ''), /CI_UNJUSTIFIED_PERMISSION/]
  ];
  for (const [label, content, expected] of cases) {
    await withWorkflow(content, [], result => {
      assert.equal(result.status, 1, `${label} should be refused`);
      assert.match(result.stdout, expected, label);
    });
  }
});

test('a write on an untrusted trigger stays refused whatever the scope', async () => {
  const pr = scope => `name: required
on:
  pull_request:
permissions:
  contents: read
jobs:
  checks:
    runs-on: ubuntu-latest
    permissions:
      ${scope}: write
    steps:
      - uses: actions/checkout@${sha}
`;
  // id-token and attestations are allowlisted for trusted triggers only; a
  // pull request must never hold them, which is the whole threat model.
  for (const scope of ['id-token', 'attestations', 'contents', 'packages']) {
    await withWorkflow(pr(scope), [], result => {
      assert.equal(result.status, 1, `${scope} should be refused on a pull request`);
      assert.match(result.stdout, /CI_EXCESSIVE_PERMISSIONS/, scope);
    });
  }
});
