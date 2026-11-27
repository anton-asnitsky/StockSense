import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createPrEntrypointFixture } from '../fixtures/pr-ledger-authority/entrypoint.mjs';
import { assertLedgerBinding } from '../../src/candidate-provenance.mjs';

test('production combined SBOM independently revalidates the real PR receipt and refuses replay', async () => {
  const data = await createPrEntrypointFixture();
  const output = join(data.root, 'combined-sbom.json');
  const execute = () => data.execute('build-sbom.mjs', [output]);
  try {
    const verified = data.execute();
    assert.equal(verified.status, 0, verified.stderr);
    const original = await readFile(data.receiptPath, 'utf8');
    const receipt = JSON.parse(original);
    const good = execute();
    assert.equal(good.status, 0, good.stderr);
    const document = JSON.parse(await readFile(output, 'utf8'));
    const properties = Object.fromEntries(document.metadata.properties.map(row => [row.name, row.value]));
    assert.equal(properties['stocksense:imageLedgerAuthority'], 'owner-authorized-pr-ledger-v1');
    assert.equal(properties['stocksense:imageLedgerRun'], '111');
    assert.equal(properties['stocksense:imageLedgerRunAttempt'], '1');
    assert.equal(properties['stocksense:imageLedgerCommit'], receipt.authority.ledger.commit);
    assert.equal(properties['stocksense:imageLedgerMainSha'], undefined);
    assert.equal(properties['stocksense:imageLedgerCandidateRevision'], data.revision);
    assert.throws(() => assertLedgerBinding(receipt, {
      candidateRevision: data.revision, treeSha: data.context.candidateGitTreeSha,
      treeDigest: data.context.candidateTreeDigest, sourceDigest: receipt.sourceDigest,
      executionFingerprint: data.context.executionFingerprint,
      runtimeManifestDigest: data.runtimeManifestDigest,
      images: receipt.images.map(row => ({ name: row.image, imageId: row.imageId,
        sbomDigest: row.sbomDigest, scanDigest: row.scanDigest, findings: row.findings }))
    }), { code: 'IMAGE_LEDGER' }, 'release/candidate evidence refuses the genuinely verified PR receipt');

    for (const change of [
      row => { row.candidateTreeDigest = `sha256:${'f'.repeat(64)}`; },
      row => { row.runtimeManifestDigest = `sha256:${'f'.repeat(64)}`; },
      row => { row.sourceDigest = `sha256:${'f'.repeat(64)}`; },
      row => { row.mainSha = 'f'.repeat(40); },
      row => { row.schema = 'stocksense-image-ledger-verification-v2'; delete row.authority; row.mainSha = 'f'.repeat(40); }
    ]) {
      const changed = globalThis.structuredClone(receipt); change(changed);
      await writeFile(data.receiptPath, JSON.stringify(changed));
      await writeFile(output, 'stale output');
      const result = execute();
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /IMAGE_LEDGER/);
      await assert.rejects(access(output), { code: 'ENOENT' });
    }
    await writeFile(data.receiptPath, '{"schema":"duplicate",' + original.slice(1));
    const duplicate = execute();
    assert.notEqual(duplicate.status, 0);
    assert.match(duplicate.stderr, /PR_AUTH_JSON/);
    await writeFile(data.receiptPath, original);

    data.env.STOCKSENSE_LEDGER_AUTHORITY = 'protected-main';
    data.env.GITHUB_EVENT_NAME = 'push';
    const mainReplay = execute();
    assert.notEqual(mainReplay.status, 0);
    assert.match(mainReplay.stderr, /IMAGE_LEDGER/);
    await assert.rejects(access(output), { code: 'ENOENT' });
    data.env.STOCKSENSE_LEDGER_AUTHORITY = 'owner-authorized-pr-ledger-v1';
    data.env.GITHUB_EVENT_NAME = 'pull_request';

    data.env.GITHUB_RUN_ID = '999';
    await data.updateScenario({ contextOverride: { ...data.configuration.contextOverride, currentRunId: 999 } });
    const newRunReplay = execute();
    assert.notEqual(newRunReplay.status, 0);
    assert.match(newRunReplay.stderr, /PR_AUTH_RECEIPT/);
    await assert.rejects(access(output), { code: 'ENOENT' });
  } finally { await data.cleanup(); }
});

test('production PR SBOM refuses raw-scan tamper and owner revocation and cleans failed atomic output', async () => {
  const data = await createPrEntrypointFixture();
  const output = join(data.root, 'combined-sbom.json');
  const execute = () => data.execute('build-sbom.mjs', [output]);
  try {
    const verified = data.execute(); assert.equal(verified.status, 0, verified.stderr);
    const rawPath = join(data.directory, 'validator.grype-raw.json');
    const originalRaw = await readFile(rawPath);
    await writeFile(rawPath, '{"matches":[{}]}');
    const raw = execute();
    assert.notEqual(raw.status, 0);
    assert.match(raw.stderr, /IMAGE_RAW/);
    await assert.rejects(access(output), { code: 'ENOENT' });
    await writeFile(rawPath, originalRaw);

    for (const [scenario, error] of [['missing-u2', /PR_AUTH_U2_COMMENT/],
      ['revoked-final', /PR_AUTH_API/], ['rename-failure', /synthetic rename failure/]]) {
      await data.updateScenario({ scenario });
      await writeFile(output, 'stale output');
      const result = execute();
      assert.notEqual(result.status, 0, scenario);
      assert.match(result.stderr, error);
      await assert.rejects(access(output), { code: 'ENOENT' });
      assert.equal((await readdir(data.root)).some(name => name.startsWith('combined-sbom.json.')), false);
    }
    await data.updateScenario({ scenario: 'success' });
    const recovered = execute(); assert.equal(recovered.status, 0, recovered.stderr);
    await rm(output);
  } finally { await data.cleanup(); }
});
