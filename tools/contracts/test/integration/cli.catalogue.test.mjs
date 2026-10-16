import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { ALL_BOUNDARIES, digest } from '../../src/package-loader.mjs';
import { buildFullPackage } from '../../src/full-package.mjs';

const repository = fileURLToPath(new URL('../../../../', import.meta.url));
const cli = fileURLToPath(new URL('../../src/cli.mjs', import.meta.url));

function validateWithCli(packageRoot) {
  const started = performance.now();
  const result = spawnSync(process.execPath,
    [cli, 'validate', packageRoot, '--repo-root', repository],
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, timeout: 180_000 });
  assert.ifError(result.error);
  assert.equal(result.signal, null, result.stderr);
  return { status: result.status, body: JSON.parse(result.stdout), elapsedMs: performance.now() - started };
}

async function withFullPackage(check) {
  const packageRoot = await mkdtemp(join(tmpdir(), 'stocksense-cli-catalogue-'));
  try {
    const { manifest, problems } = await buildFullPackage(repository, packageRoot);
    assert.ok(manifest, JSON.stringify(problems));
    await check(packageRoot, manifest);
  } finally {
    await rm(packageRoot, { recursive: true, force: true });
  }
}

test('source-bound C01-C27 catalogue validates through the CLI', async t => {
  await withFullPackage(async (packageRoot, manifest) => {
    const accepted = validateWithCli(packageRoot);
    t.diagnostic(`full-catalogue CLI elapsed ${accepted.elapsedMs.toFixed(0)} ms`);
    assert.equal(accepted.status, 0, JSON.stringify(accepted.body));
    assert.equal(accepted.body.sourceBinding, 'verified-canonical-package-outside-repository');
    assert.deepEqual(accepted.body.coveredBoundaries, ALL_BOUNDARIES);
    assert.deepEqual(accepted.body.uncoveredBoundaries, []);
    assert.equal(accepted.body.validationLevel, 'candidate-canonical-and-fixture-validation');
    assert.equal(accepted.body.releaseReady, false);

    const canonical = [...manifest.openapi, ...manifest.asyncapi, ...manifest.schemas];
    assert.deepEqual(
      accepted.body.validatedCanonical.map(row => row.document).sort(),
      canonical.map(entry => entry.document).sort());
    const fixtures = JSON.parse(await readFile(join(packageRoot, 'governance/example-fixture.json'), 'utf8')).fixtures;
    assert.deepEqual(
      accepted.body.fixtureResults.map(row => row.fixtureId).sort(),
      fixtures.map(fixture => fixture.fixtureId).sort());
  });
});

test('CLI rejects a re-digested full-catalogue canonical source edit', async () => {
  await withFullPackage(async (packageRoot, manifest) => {
    // A matching package digest alone cannot authorize changed canonical bytes.
    // The added comment leaves payload fixtures unchanged; source provenance
    // must still reject the re-digested canonical document.
    const document = 'messaging-platform/v1/transport-conformance.asyncapi.yaml';
    const sourcePath = join(packageRoot, document);
    const changed = await readFile(sourcePath, 'utf8') + '\n# synthetic source drift\n';
    await writeFile(sourcePath, changed);
    const entry = manifest.asyncapi.find(item => item.document === document);
    assert.ok(entry);
    entry.contentDigest = digest(changed);
    await writeFile(join(packageRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

    const refused = validateWithCli(packageRoot);
    assert.equal(refused.status, 1, JSON.stringify(refused.body));
    assert.equal(refused.body.code, 'SOURCE_REVISION_MISMATCH');
    assert.equal(refused.body.ruleId, 'BR1.7');
  });
});
