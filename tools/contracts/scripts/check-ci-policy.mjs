import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { TextDecoder } from 'node:util';
import YAML from 'yaml';
import { assertCiPolicy, assertCiWorkflowStaticPolicy } from '../src/evidence.mjs';
import { ContractError, digest } from '../src/package-loader.mjs';
import { readLedgerAuthorityMode } from '../src/pr-ledger-context.mjs';
import { openCiWorkflowAuthority } from '../src/ci-workflow-authority.mjs';

// One reviewed, base-owned exception to the generic pull_request_target ban.
// The byte pin prevents this command from crediting a changed metadata guard;
// the separate protected-base job decides proposed .github changes.
const METADATA_GUARD = 'public-pr-policy.yml';
const METADATA_GUARD_DIGEST = 'sha256:fc5bbd9b189de20393496af6c9fa83f189b9ecc319a39ae8e6a9316754f18b78';

// Check U1's public-PR policy against the workflows actually present.
//
// U1 defines assertCiPolicy (BR6.7) but nothing invoked it, so the policy
// described a rule the repository never applied: a pull request could have
// introduced pull_request_target, a self-hosted runner on an untrusted
// trigger, a write permission or an unpinned action, and no check would have
// objected. The U2 protected-base guard independently checks PR changes;
// this script running from PR code cannot certify its own integrity.
//
// Standalone callers retain default refusal. The narrow PR mode derives paths
// from Git and independently verifies live authority before accepting changes.
//
// usage: check-ci-policy.mjs <workflow-dir> [--changed <path> ...]

const argv = process.argv.slice(2);
const directory = resolve(argv[0] ?? '.github/workflows');
const changedAt = argv.indexOf('--changed');
const changedPaths = changedAt === -1 ? [] : argv.slice(changedAt + 1).filter(Boolean);
let authority;
try {
  const mode = readLedgerAuthorityMode();
  if (process.env.GITHUB_EVENT_NAME === 'pull_request' &&
      ['74', '75', '76'].includes(process.env.STOCKSENSE_PR_NUMBER ?? '') &&
      mode !== 'owner-authorized-pr-ledger-v1') {
    throw new ContractError('CI_WORKFLOW_CHANGE', 'BR6.7', 'This hosted PR requires explicit live workflow authority');
  }
  if (mode === 'owner-authorized-pr-ledger-v1') {
    authority = await openCiWorkflowAuthority({ directory,
      changedPaths: changedAt === -1 ? undefined : changedPaths });
  }
} catch (error) {
  process.stderr.write(`${error.code ?? 'CI_WORKFLOW_CHANGE'}/BR6.7 ${error.message}\n`);
  process.exit(1);
}

/** @type {string[]} */
let names = [];
try {
  names = authority ? authority.workflows.map(row => row.name)
    : (await readdir(directory)).filter(name => /\.ya?ml$/.test(name)).sort();
} catch {
  process.stderr.write(`No workflow directory at ${directory}\n`);
  process.exit(1);
}
if (!names.length) {
  process.stderr.write(`No workflow files in ${directory}\n`);
  process.exit(1);
}

let failed = false;
const accepted = [];
for (const name of names) {
  let workflow;
  let content;
  try {
    content = authority ? new TextDecoder('utf-8', { fatal: true }).decode(
      authority.workflows.find(row => row.name === name)?.bytes) : await readFile(join(directory, name), 'utf8');
    workflow = YAML.parse(content, { strict: true, uniqueKeys: true });
  }
  catch {
    process.stdout.write(`${name}: WORKFLOW_PARSE/BR6.7 workflow is not well-formed YAML\n`);
    failed = true;
    continue;
  }
  try {
    if (name === METADATA_GUARD) {
      if (!authority && changedPaths.some(path => path.toLowerCase().startsWith('.github/'))) {
        throw new ContractError('CI_WORKFLOW_CHANGE', 'BR6.7',
          'The protected base must decide a metadata-guard change');
      }
      if (digest(Buffer.from(content.replace(/\r\n/g, '\n'))) !== METADATA_GUARD_DIGEST) {
        throw new ContractError('CI_GUARD_DRIFT', 'BR6.7',
          'The protected-base metadata guard differs from its reviewed pin');
      }
      accepted.push(`${name}: accepted pinned protected-base metadata guard\n`);
      continue;
    }
    if (authority) assertCiWorkflowStaticPolicy(workflow);
    else assertCiPolicy(workflow, { changedPaths });
    accepted.push(`${name}: accepted\n`);
  } catch (error) {
    const code = error instanceof ContractError ? `${error.code}/${error.ruleId}` : 'CI_POLICY_SHAPE/BR6.7';
    process.stdout.write(`${name}: ${code} ${error.message}\n`);
    failed = true;
  }
}
if (failed) {
  process.stderr.write('CI policy refused this pull request. A change to workflow configuration ' +
    'must be decided by the protected base revision, not by the pull request proposing it.\n');
  process.exit(1);
}
if (authority) {
  try {
    const summary = await authority.revalidate();
    process.stdout.write(`Verified live PR workflow authority: ${JSON.stringify(summary)}\n`);
  } catch (error) {
    process.stderr.write(`${error.code ?? 'CI_WORKFLOW_CHANGE'}/BR6.7 ${error.message}\n`);
    process.exit(1);
  }
}
for (const message of accepted) process.stdout.write(message);
