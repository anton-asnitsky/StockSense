import assert from 'node:assert/strict';
import { readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const source = join(process.env.GITHUB_WORKSPACE, 'candidate');
const proof = join(process.env.RUNNER_TEMP, 'u1-integrated/proof');
const directory = join(proof, 'images');
const imported = file => import(pathToFileURL(join(source, 'tools/contracts/src', file)));
const { readImageEvidence, verifyRawImageScan, sha256 } = await imported('image-evidence.mjs');
const { readKiotaRuntimeEvidence } = await imported('image-ledger.mjs');
const { readSbomSourceContext } = await imported('sbom-context.mjs');
const { buildSbom } = await imported('sbom.mjs');
const imageIds = { validator: process.env.STOCKSENSE_STANDARDS_IMAGE, kiota: process.env.STOCKSENSE_KIOTA_IMAGE };
const sourceContext = readSbomSourceContext(source, process.env.CANDIDATE);
assert.equal(sourceContext.candidateRevision, process.env.CANDIDATE);
// Retaining residuals is diagnostic evidence, never an accepted disposition.
const inventory = await readImageEvidence(directory, imageIds, { requireClean: false });
for (const [name, imageId] of Object.entries(imageIds)) {
  await verifyRawImageScan(directory, { name, imageId, revision: process.env.CANDIDATE,
    sbomDigest: sha256(await readFile(join(directory, `${name}.cdx.json`))) });
  const report = JSON.parse(await readFile(join(directory, `${name}.scan.json`)));
  if (name === 'validator') assert.equal(report.findings.length, 0, 'Validator runtime must remain clean');
  for (const finding of report.findings) {
    assert.notEqual(finding.fixState, 'unknown', 'Unknown findings remain ineligible');
    assert.ok(!(finding.fixState === 'fixed' && ['High', 'Critical'].includes(finding.severity)), 'Fixable High/Critical finding requires remediation');
  }
}
const runtimeManifestDigest = await readKiotaRuntimeEvidence(directory, imageIds.kiota);
await assert.rejects(access(join(directory, 'ledger-verification.json')), { code: 'ENOENT' });
let refusal;
// Correct actual source/images reach the production missing-ledger guard.
// No synthetic ledger or accepted finding is supplied for these real scans.
await assert.rejects(buildSbom(join(source, 'tools/contracts/pnpm-lock.yaml'), {
  name: 'stocksense-contracts', version: '0.1.0', generator: 'stocksense-contracts-sbom',
  validatorImageDigest: imageIds.validator, kiotaImageDigest: imageIds.kiota,
  imageEvidenceDirectory: directory, candidateRevision: process.env.CANDIDATE, sourceContext
}), error => {
  refusal = { code: error.code, ruleId: error.ruleId, message: error.message };
  return error.code === 'IMAGE_LEDGER' && error.ruleId === 'BR6.5' &&
    error.message === 'Successful image ledger verification is missing or malformed';
});
await writeFile(join(proof, 'actual-evidence-and-authority-pending.json'), JSON.stringify({ diagnosticOnly: true,
  candidate: process.env.CANDIDATE, sourceContext, imageIds, records: inventory.records, runtimeManifestDigest,
  positiveProductionLedger: 'pending-genuine-owner-decisions', positiveCombinedSbom: 'pending-genuine-owner-decisions',
  productionMissingAuthorityRefusal: refusal }, null, 2) + '\n');
console.log('Actual raw/SBOM/runtime bindings verified; production combined SBOM correctly refuses absent authority');
