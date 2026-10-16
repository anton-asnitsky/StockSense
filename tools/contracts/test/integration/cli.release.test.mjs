import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { buildEvidenceRecord, REQUIRED_GATES } from '../../src/evidence.mjs';

const projectRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const sample = join(projectRoot, 'contracts/samples/walking-skeleton');
const cli = fileURLToPath(new URL('../../src/cli.mjs', import.meta.url));

function run(root) {
  try {
    return { exitCode: 0, body: JSON.parse(execFileSync(process.execPath, [cli, 'validate', root], { encoding: 'utf8' })) };
  } catch (error) {
    return { exitCode: error.status, body: JSON.parse(error.stdout) };
  }
}

async function withCopy(change, check) {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-release-'));
  try { await cp(sample, root, { recursive: true }); await change(root); await check(root); }
  finally { await rm(root, { recursive: true, force: true }); }
}

const editManifest = async (root, edit) => {
  const path = join(root, 'manifest.json');
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  edit(manifest);
  await writeFile(path, JSON.stringify(manifest, null, 2) + '\n');
};

test('a partial package claiming release status is refused on coverage', async () => {
  await withCopy(
    root => editManifest(root, manifest => { manifest.manifestStatus = 'release'; }),
    root => {
      const result = run(root);
      assert.equal(result.exitCode, 1);
      // Coverage is the first guard: this sample carries C01 alone, and a
      // release requires C01-C27. RELEASE_EVIDENCE_REQUIRED sits behind it for
      // a package that does reach full coverage.
      assert.equal(result.body.code, 'INCOMPLETE_RELEASE');
      assert.equal(result.body.ruleId, 'BR1.1');
    }
  );
});

test('the candidate result never reports release readiness', () => {
  const result = run(sample);
  assert.equal(result.exitCode, 0);
  assert.equal(result.body.releaseReady, false);
  assert.match(result.body.validationLevel, /^candidate-/);
  assert.ok(result.body.limitations.length > 0);
});

test('release evidence construction rejects protected nested findings before receipt creation', () => {
  const check = {
    checkId: 'canonical-validation', outcome: 'passed', reason: 'synthetic', expectedResult: 'clean',
    actualResult: 'clean', startedAt: '2026-09-29T10:00:00Z', completedAt: '2026-09-29T10:01:00Z',
    limitations: []
  };
  const gates = Object.fromEntries(REQUIRED_GATES.map(name => [name, { ...check, reportDigest: 'sha256:' + 'a'.repeat(64) }]));
  for (const input of [
    { checks: [{ ...check, findings: [{ fullPrompt: 'synthetic:blocked' }] }] },
    { checks: [{ ...check, fullPromptText: 'synthetic:blocked' }] },
    { artifacts: [{ artifactId: 'supplierSourceContent.txt', contentDigest: 'sha256:' + 'b'.repeat(64) }] },
    { gates: { ...gates, sbom: { ...gates.sbom, actualResult: 'client_secret=abcdefghijklmnop' } } },
    { gates: { ...gates, sbom: { ...gates.sbom, supplierSourceContentText: 'synthetic:blocked' } } }
  ]) {
    assert.throws(() => buildEvidenceRecord({
      revision: 'b'.repeat(40), packageDigest: 'sha256:' + 'c'.repeat(64), checks: [check], gates,
      ...input
    }), error => error.code === 'PROTECTED_CONTENT' && error.ruleId === 'NFR6.1');
  }
});

test('release evidence rejects unlisted fields instead of constructing a passing receipt', () => {
  const check = {
    checkId: 'canonical-validation', outcome: 'passed', reason: 'synthetic', expectedResult: 'clean',
    actualResult: 'clean', startedAt: '2026-09-29T10:00:00Z', completedAt: '2026-09-29T10:01:00Z', limitations: []
  };
  const gates = Object.fromEntries(REQUIRED_GATES.map(name => [name, { ...check, reportDigest: 'sha256:' + 'a'.repeat(64) }]));
  assert.throws(() => buildEvidenceRecord({
    revision: 'b'.repeat(40), packageDigest: 'sha256:' + 'c'.repeat(64),
    checks: [check], gates, diagnosticBlob: 'synthetic:arbitrary'
  }), error => error.code === 'EVIDENCE_FIELD' && error.ruleId === 'BR6.1');
});

// Full C01-C27 release verification stays unimplemented on purpose. It needs the
// complete canonical catalogue, owner-local conformance evidence, pinned scanners,
// SBOM and attestation, and U2's protected required check anchoring the public-PR
// policy. The guard above is what keeps a release claim from being made without them.
test.todo('C01-C27 release verification requires complete owner evidence and U2 protected CI checks');
