import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isFrameworkToolInvocation } from '../.codex/hooks/aidlc-plan-approval-guard.ts';
import { shellCommandInvocations } from '../.codex/hooks/review-freeze-command.ts';

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wrapper = './scripts/aidlc.ps1';
const planApproval = ['--stage', 'code-generation', '--checkpoint', 'plan-approval'];

function allowed(command) {
  const [invocation] = shellCommandInvocations(command);
  return isFrameworkToolInvocation(projectDir, projectDir,
    invocation.name, invocation.args, command);
}

test('the checked-in wrapper can record a protected Plan Approval answer', () => {
  assert.equal(allowed(`${wrapper} engine log answer ${planApproval.join(' ')} --unit contracts`), true);
  assert.equal(allowed(`${wrapper} engine log decision ${planApproval.join(' ')} --unit contracts`), true);
});

test('the exception does not permit unrelated runtime commands or wrappers', () => {
  assert.equal(allowed(`${wrapper} engine orchestrate report ${planApproval.join(' ')}`), false);
  assert.equal(allowed(`${wrapper} engine log answer --stage other --checkpoint plan-approval`), false);
  assert.equal(allowed(`${wrapper} engine log answer --stage code-generation --checkpoint other`), false);
  assert.equal(allowed(`./scripts/other.ps1 engine log answer ${planApproval.join(' ')}`), false);
  assert.equal(allowed(`aidlc.ps1 engine log answer ${planApproval.join(' ')}`), false);
});
