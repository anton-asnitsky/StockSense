import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createPrEntrypointFixture } from '../fixtures/pr-ledger-authority/entrypoint.mjs';

test('production image receipt entry point uses live PR authority and writes only after final revalidation', async () => {
  const data = await createPrEntrypointFixture();
  try {
    const good = data.execute(); assert.equal(good.status, 0, good.stderr);
    const receipt = await data.readReceipt();
    assert.equal(receipt.schema, 'stocksense-image-ledger-verification-pr-v1');
    assert.equal(Object.hasOwn(receipt, 'mainSha'), false);
    assert.equal(receipt.candidateRevision, data.revision);
    assert.equal(receipt.authority.headSha, data.head);
    assert.deepEqual(receipt.authority.mergeParents, [data.env.STOCKSENSE_PR_BASE_SHA, data.head]);
    assert.equal(receipt.authority.currentRunId, 111);
    assert.deepEqual(receipt.images.map(row => row.findings), [0, 0]);
    for (const [scenario, expected] of [['missing-u2', /PR_AUTH_U2_COMMENT/],
      ['revoked-final', /PR_AUTH_API/], ['rename-failure', /synthetic rename failure/]]) {
      await data.updateScenario({ scenario });
      await writeFile(data.receiptPath, JSON.stringify(receipt));
      const result = data.execute(); assert.notEqual(result.status, 0, scenario);
      assert.match(result.stderr, expected);
      await assert.rejects(access(data.receiptPath), { code: 'ENOENT' });
      assert.equal((await readdir(data.directory)).some(name => name.startsWith('.ledger-verification-')), false);
    }
    await data.updateScenario({ scenario: 'success' });
    await writeFile(join(data.directory, 'validator.grype-raw.json'), '{"matches":[{}]}');
    const rawTamper = data.execute(); assert.notEqual(rawTamper.status, 0);
    assert.match(rawTamper.stderr, /IMAGE_RAW/);
    await assert.rejects(access(data.receiptPath), { code: 'ENOENT' });
    const requests = await readFile(data.requestLog, 'utf8');
    assert.equal(requests.includes('/contents/security/image-exceptions.json'), false,
      'a refused PR authority must never fall back to the protected-main ledger reader');
  } finally { await data.cleanup(); }
});
