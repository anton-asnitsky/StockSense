import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const repository = resolve(import.meta.dirname, '../../../..');
const sample = resolve(repository, 'contracts/samples/messaging-profiles');
const cli = resolve(repository, 'tools/contracts/src/cli.mjs');

test('C01/C22/C23 messaging candidate validates with committed sources and exact fixtures', t => {
  if (!process.env.STOCKSENSE_STANDARDS_IMAGE) {
    t.skip('exact local standards image ID required for isolated integration validation');
    return;
  }
  const result = spawnSync(process.execPath, [cli, 'validate', sample, '--repo-root', repository],
    { cwd: repository, encoding: 'utf8', timeout: 120_000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const body = JSON.parse(result.stdout);
  assert.equal(body.sourceBinding, 'verified');
  assert.deepEqual(body.coveredBoundaries, ['C01', 'C22', 'C23']);
  assert.deepEqual(body.candidateScope, ['C01', 'C22', 'C23']);
  assert.equal(body.uncoveredBoundaries.length, 24);
  assert.equal(body.validatedCanonical.length, 6);
  assert.deepEqual(body.fixtureResults.map(item => item.observed),
    ['pass', 'pass', 'fail', 'fail', 'pass', 'fail', 'pass', 'fail']);
  assert.equal(body.releaseReady, false);
  assert.equal(body.validationLevel, 'candidate-canonical-and-fixture-validation');
});
