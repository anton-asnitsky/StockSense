import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { regenerateFromCleanCheckout } from '../../src/candidate-provenance.mjs';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const profilePath = fileURLToPath(new URL('../../../../contracts/samples/walking-skeleton/governance/generation-profile.json', import.meta.url));
const verifyCli = fileURLToPath(new URL('../../scripts/verify-candidate-evidence.mjs', import.meta.url));
const buildCli = fileURLToPath(new URL('../../scripts/build-candidate-evidence.mjs', import.meta.url));
const protectedCli = fileURLToPath(new URL('../../src/candidate-provenance.mjs', import.meta.url));

test('candidate evidence CLIs require their exact inputs', () => {
  for (const path of [buildCli, verifyCli]) {
    const result = spawnSync(process.execPath, [path], { encoding: 'utf8' });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Usage:/);
  }
  const direct = spawnSync(process.execPath, [protectedCli, 'verify'], { encoding: 'utf8' });
  assert.equal(direct.status, 2);
  assert.match(direct.stderr, /src\/candidate-provenance\.mjs/);
});

test('package scripts select the protected source entry for candidate verdicts', async () => {
  const manifest = JSON.parse(await readFile(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8'));
  assert.equal(manifest.scripts['evidence:candidate'], 'node src/candidate-provenance.mjs build');
  assert.equal(manifest.scripts['evidence:verify'], 'node src/candidate-provenance.mjs verify');
});

test('verifier refuses an absent evidence record before claiming a candidate verdict', () => {
  const result = spawnSync(process.execPath, [verifyCli, 'absent-record.json', 'bundle.json',
    'sbom.cdx.json', 'image-evidence', 'security-reports'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stderr).code, 'CANDIDATE_EVIDENCE_MISSING');
  assert.equal(result.stdout, '');
  const direct = spawnSync(process.execPath, [protectedCli, 'verify', 'absent-record.json',
    'bundle.json', 'sbom.cdx.json', 'image-evidence', 'security-reports'], { encoding: 'utf8' });
  assert.equal(direct.status, 1);
  assert.equal(JSON.parse(direct.stderr).code, 'CANDIDATE_EVIDENCE_MISSING');
});

test('all 107 declared outputs regenerate from a clean checkout with the pinned runner',
  { timeout: 300_000 }, async () => {
    const profile = JSON.parse(await readFile(profilePath, 'utf8'));
    const revision = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
    const images = process.env.STOCKSENSE_STANDARDS_IMAGE || process.env.STOCKSENSE_KIOTA_IMAGE
      ? { validatorImageId: process.env.STOCKSENSE_STANDARDS_IMAGE,
          kiotaImageId: process.env.STOCKSENSE_KIOTA_IMAGE }
      : null;
    const results = await regenerateFromCleanCheckout(root, revision, profile.consumers, images);
    assert.deepEqual(results.map(row => row.consumerId), profile.consumers.map(row => row.consumerId));
    assert.equal(results.reduce((count, row) => count + Object.keys(row.outputs).length, 0), 107);
  });
