// Diagnostic test only. No protected-main policy is fetched or altered.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = join(process.env.GITHUB_WORKSPACE, 'candidate');
const packageRoot = join(root, 'tools/contracts');
const proof = join(process.env.RUNNER_TEMP, 'noble/proof');
const directory = join(proof, 'SIMULATION-ONLY/evidence');
await mkdir(directory, { recursive: true });
await cp(join(proof, 'images'), directory, { recursive: true });
const ledgerModule = await import(pathToFileURL(join(packageRoot, 'src/image-ledger.mjs')));
const { IMAGE_NAMES, readImageEvidence, sha256, verifyRawImageScan } =
  await import(pathToFileURL(join(packageRoot, 'src/image-evidence.mjs')));
const git = (args, binary = false) => {
  const result = spawnSync('git', args, { cwd: root, shell: false,
    encoding: binary ? undefined : 'utf8', timeout: 10_000, maxBuffer: 32 * 1024 * 1024 });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  return binary ? result.stdout : result.stdout.trim();
};
const revision = git(['rev-parse', 'HEAD']);
assert.equal(revision, process.env.CANDIDATE);
const tree = git(['rev-parse', 'HEAD^{tree}']);
const listing = git(['ls-tree', '-r', '-z', '--full-tree', 'HEAD'], true);
const candidateTreeDigest = ledgerModule.candidateTreeDigestFromGit(listing);
const executionFingerprint = ledgerModule.executionFingerprintFromGit(listing);
const imageIds = { validator: process.env.STOCKSENSE_STANDARDS_IMAGE, kiota: process.env.STOCKSENSE_KIOTA_IMAGE };
const evidence = await readImageEvidence(directory, imageIds, { requireClean: false });
const runtimeManifestDigest = await ledgerModule.readKiotaRuntimeEvidence(directory, imageIds.kiota);
const now = new Date();
const findings = [];
for (const name of IMAGE_NAMES) {
  const record = evidence.records.find(item => item.name === name);
  await verifyRawImageScan(directory, { name, imageId: imageIds[name],
    sbomDigest: record.sbomDigest, revision });
  const scan = JSON.parse(await readFile(join(directory, `${name}.scan.json`), 'utf8'));
  for (const row of scan.findings) findings.push({ id: row.id, image: name,
    package: row.package, version: row.version, type: row.type, purl: row.purl,
    severity: row.severity, fixState: row.fixState, owner: 'SIMULATION-ONLY',
    rationale: 'Diagnostic test fixture; no real disposition or approval',
    compensatingControl: 'Temporary isolated proof; never authoritative security policy',
    approvalReference: 'SIMULATION-ONLY-NOT-AN-OWNER-APPROVAL',
    createdAt: new Date(now.getTime() - 60_000).toISOString(),
    expiresAt: new Date(now.getTime() + 3_600_000).toISOString() });
}
assert.ok(findings.length > 0, 'Expected real runtime findings for the selection exercise');
const alternateFingerprints = ['unrelated-baseline-one', 'unrelated-baseline-two'].map(value => sha256(Buffer.from(value)));
assert.ok(alternateFingerprints.every(value => value !== executionFingerprint));
const ledger = { schema: 'stocksense-image-exceptions-v2', mainSha: '1'.repeat(40),
  blobSha: '2'.repeat(40), candidateGitTreeSha: tree,
  exceptions: [executionFingerprint, ...alternateFingerprints].flatMap(fingerprint =>
    findings.map(finding => ({ executionFingerprint: fingerprint, runtimeManifestDigest, finding }))) };
const args = { directory, imageIds, ledger, expectedRevision: revision, actualRevision: revision,
  candidateTreeDigest, executionFingerprint, runtimeManifestDigest, now };
const receipt = await ledgerModule.verifyBoundImageEvidence(args);
assert.equal(receipt.images.reduce((sum, row) => sum + row.disposed, 0), findings.length);
await assert.rejects(ledgerModule.verifyBoundImageEvidence({ ...args,
  executionFingerprint: sha256(Buffer.from('unmatched-baseline')) }));
const malformed = structuredClone(ledger);
malformed.exceptions.at(-1).finding.expiresAt = '2000-01-01T00:00:00.000Z';
await assert.rejects(ledgerModule.verifyBoundImageEvidence({ ...args, ledger: malformed }));
await writeFile(join(directory, 'ledger-verification.json'), JSON.stringify(receipt, null, 2) + '\n');
await writeFile(join(proof, 'SIMULATION-ONLY/ledger.json'), JSON.stringify(ledger, null, 2) + '\n');
const output = join(proof, 'SIMULATION-ONLY/combined.cdx.json');
const run = () => spawnSync(process.execPath, ['scripts/build-sbom.mjs', output], {
  cwd: packageRoot, shell: false, encoding: 'utf8', timeout: 60_000, maxBuffer: 4 * 1024 * 1024,
  env: { ...process.env, STOCKSENSE_IMAGE_EVIDENCE_DIR: directory,
    STOCKSENSE_CANDIDATE_REVISION: revision }
});
let result = run();
assert.ifError(result.error);
assert.equal(result.status, 0, result.stderr);
const combinedDigest = sha256(await readFile(output));
const rejected = [];
for (const field of ['executionFingerprint', 'runtimeManifestDigest', 'candidateTreeDigest', 'candidateGitTreeSha']) {
  const altered = { ...receipt, [field]: field === 'candidateGitTreeSha' ? '3'.repeat(40) : sha256(Buffer.from(`tampered-${field}`)) };
  await writeFile(join(directory, 'ledger-verification.json'), JSON.stringify(altered, null, 2) + '\n');
  result = run();
  assert.ifError(result.error);
  assert.notEqual(result.status, 0, `valid-format altered ${field} was accepted`);
  rejected.push(field);
}
await writeFile(join(directory, 'ledger-verification.json'), JSON.stringify(receipt, null, 2) + '\n');
await writeFile(join(proof, 'SIMULATION-ONLY/result.json'), JSON.stringify({
  simulationOnly: true, protectedReceipt: false, ordinaryU1Passed: false, ownerApproval: false,
  candidateRevision: revision, candidateGitTreeSha: tree, candidateTreeDigest,
  executionFingerprint, runtimeManifestDigest, imageIds, findingCount: findings.length,
  groups: 3, unmatchedGroupRejected: true, expiredUnrelatedGroupRejected: true,
  alteredReceiptFieldsRejected: rejected, combinedDigest, sourceBoundProofPassed: true
}, null, 2) + '\n');
console.log('SIMULATION ONLY: real scans reconciled, exact group selected, SBOM bindings and tampering checks passed; no protected approval.');
