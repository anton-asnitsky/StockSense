import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = join(process.env.GITHUB_WORKSPACE, 'candidate');
const directory = join(process.env.RUNNER_TEMP, 'noble/proof/security');
const { verifySecurityReports } = await import(pathToFileURL(join(root, 'tools/contracts/src/ci-policy.mjs')));
const report = JSON.parse(await readFile(join(directory, 'vulnerability-scan.json'), 'utf8'));
const secrets = JSON.parse(await readFile(join(directory, 'secret-scan.json'), 'utf8'));
assert.equal(secrets.status, 'passed');
assert.equal(secrets.failure, null);
assert.deepEqual(secrets.findings, [], 'A secret finding must never be treated as known picomatch');
let outcome = { status: 'clean', ordinaryGatePassed: true };
try {
  await verifySecurityReports(root, process.env.CANDIDATE, directory);
} catch (error) {
  // Only the previously identified exact finding may remain diagnostic here.
  // Invalid, incomplete or newly changed evidence fails the proof job.
  assert.equal(error.code, 'SCAN_FINDINGS');
  assert.deepEqual(report.findings, [{ findingCode: 'GHSA-fc5q-39xc-vjpf',
    ruleId: 'NFR13.2', package: 'picomatch', version: '4.0.7',
    dependencyPath: '.>secretlint>@secretlint/walker>picomatch', severity: 'high' }]);
  outcome = { status: 'blocked-by-known-finding', ordinaryGatePassed: false,
    failureCode: error.code, findings: report.findings, exceptionsGranted: false };
}
await writeFile(join(directory, 'gate-result.json'), JSON.stringify(outcome, null, 2) + '\n');
console.log(JSON.stringify(outcome));
