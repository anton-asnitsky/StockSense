import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// U1 defines the public-PR policy; this is the script that applies it, so that
// the rule is enforced rather than merely described. Before it existed a pull
// request could have introduced pull_request_target, a self-hosted runner on an
// untrusted trigger, a write permission or an unpinned action, and nothing in
// the repository would have objected.
const script = fileURLToPath(new URL('../../scripts/check-ci-policy.mjs', import.meta.url));
const sha = 'a'.repeat(40);

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

async function withWorkflow(content, changed, check) {
  const directory = await mkdtemp(join(tmpdir(), 'stocksense-ci-policy-'));
  try {
    await writeFile(join(directory, 'required.yml'), content);
    const result = spawnSync(process.execPath,
      [script, directory, ...(changed.length ? ['--changed', ...changed] : [])],
      { encoding: 'utf8', timeout: 60_000 });
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
    const result = spawnSync(process.execPath, [script, empty], { encoding: 'utf8', timeout: 60_000 });
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
