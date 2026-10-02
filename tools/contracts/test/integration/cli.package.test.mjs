import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { digest } from '../../src/package-loader.mjs';

const projectRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const sample = join(projectRoot, 'contracts/samples/walking-skeleton');
const cli = fileURLToPath(new URL('../../src/cli.mjs', import.meta.url));
function run(root) {
  try {
    const output = execFileSync(process.execPath, [cli, 'validate', root], { encoding: 'utf8' });
    return { exitCode: 0, body: JSON.parse(output) };
  } catch (error) {
    return { exitCode: error.status, body: JSON.parse(error.stdout) };
  }
}
async function withCopy(change, check) {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-cli-'));
  try { await cp(sample, root, { recursive: true }); await change(root); await check(root); }
  finally { await rm(root, { recursive: true, force: true }); }
}
async function editManifest(root, edit) {
  const path = join(root, 'manifest.json');
  const manifest = JSON.parse(await readFile(path));
  edit(manifest);
  await writeFile(path, JSON.stringify(manifest));
}

test('the thin C01/C18 candidate passes canonical and fixture validation', () => {
  const result = run(sample);
  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.body.coveredBoundaries, ['C01', 'C18']);
  assert.equal(result.body.releaseReady, false);
  assert.equal(result.body.validationLevel, 'candidate-canonical-and-fixture-validation');
  // The OpenAPI document goes to the pinned standards validator; the envelopes
  // go to the pinned JSON Schema 2020-12 implementation.
  assert.deepEqual(result.body.validatedCanonical.map(item => item.dialect), [
    'openapi:3.1.2',
    'https://json-schema.org/draft/2020-12/schema',
    'https://json-schema.org/draft/2020-12/schema'
  ]);
  // The thin package covers two boundaries and says so; the other 25 stay uncovered.
  assert.deepEqual(result.body.candidateScope, ['C01', 'C18']);
  assert.equal(result.body.uncoveredBoundaries.length, 25);
  assert.deepEqual(result.body.fixtureResults.map(item => item.observed), ['pass', 'pass', 'fail', 'fail']);
  // Without a repository the revision is recorded but not proven.
  assert.equal(result.body.sourceBinding, 'unverified-no-repository');
});

test('with a repository the recorded sourceRevision is verified against real blobs', () => {
  const output = execFileSync(process.execPath, [cli, 'validate', sample, '--repo-root', projectRoot], { encoding: 'utf8' });
  const body = JSON.parse(output);
  assert.equal(body.sourceBinding, 'verified');
  assert.match(body.sourceRevision, /^[0-9a-f]{40}$/);
  assert.notEqual(body.sourceRevision, '0'.repeat(40));
});
test('clean repeated CLI run preserves immutable manifest digest', () => {
  assert.equal(run(sample).body.manifestDigest, run(sample).body.manifestDigest);
});
test('malformed coverage input reports stable code and rule', async () => {
  await withCopy(root => editManifest(root, manifest => { manifest.boundaryCoverage[0].sidecars = null; }), root => {
    const result = run(root);
    assert.equal(result.exitCode, 1);
    assert.equal(result.body.code, 'BOUNDARY_INVENTORY');
    assert.equal(result.body.ruleId, 'BR1.3');
  });
});
test('changed bytes fail exact digest before release', async () => {
  await withCopy(root => writeFile(join(root, 'governance/example-fixture.json'), '{}'), root => {
    const result = run(root);
    assert.equal(result.body.code, 'DIGEST_MISMATCH');
    assert.equal(result.body.ruleId, 'BR1.6');
  });
});
test('a tampered OpenAPI document fails provenance even with a matching digest', async () => {
  const document = 'web-bff/v1/browser-api.openapi.yaml';
  await withCopy(async root => {
    const tampered = await readFile(join(root, document), 'utf8') + '\n# appended after the recorded commit\n';
    await writeFile(join(root, document), tampered);
    await editManifest(root, manifest => {
      manifest.openapi.find(entry => entry.document === document).contentDigest = digest(tampered);
    });
  }, root => {
    // The digest check now passes, so only the source binding can catch this.
    let body = null;
    try {
      execFileSync(process.execPath, [cli, 'validate', root, '--repo-root', projectRoot], { encoding: 'utf8' });
    } catch (error) {
      body = JSON.parse(error.stdout);
    }
    assert.ok(body, 'expected the CLI to reject a document that drifted from its recorded commit');
    assert.equal(body.code, 'SOURCE_REVISION_MISMATCH');
    assert.equal(body.ruleId, 'BR1.7');
  });
});
test('protected content is rejected even with its new digest declared', async () => {
  await withCopy(async root => {
    const content = '{"fullPrompt":"synthetic:disallowed-full-transcript"}';
    await writeFile(join(root, 'governance/example-fixture.json'), content);
    await editManifest(root, manifest => { manifest.governedArtifacts.find(entry => entry.kind === 'example-fixture').contentDigest = digest(content); });
  }, root => {
    const result = run(root);
    assert.equal(result.body.code, 'PROTECTED_CONTENT');
    assert.equal(result.body.ruleId, 'NFR6.1');
  });
});

test('oversized source is rejected before its stale digest is considered', async () => {
  await withCopy(root => writeFile(join(root, 'governance/example-fixture.json'), Buffer.alloc(1_048_577, 'x')), root => {
    const result = run(root);
    assert.equal(result.exitCode, 1);
    assert.equal(result.body.code, 'SOURCE_SIZE_LIMIT');
    assert.equal(result.body.ruleId, 'NFR10.1');
  });
});

test('oversized manifest is rejected before JSON parsing', async () => {
  await withCopy(root => writeFile(join(root, 'manifest.json'), Buffer.alloc(1_048_577, 'x')), root => {
    const result = run(root);
    assert.equal(result.exitCode, 1);
    assert.equal(result.body.code, 'SOURCE_SIZE_LIMIT');
  });
});
test('C01-only candidate cannot be relabeled a release', async () => {
  await withCopy(root => editManifest(root, manifest => { manifest.manifestStatus = 'release'; }), root => {
    const result = run(root);
    assert.equal(result.body.code, 'INCOMPLETE_RELEASE');
    assert.equal(result.body.ruleId, 'BR1.3');
  });
});

test('canonical schema dialect failure is surfaced after a matching manifest digest', async () => {
  await withCopy(async root => {
    const path = 'common/v1/message-envelope.schema.json';
    const fullPath = join(root, path);
    const schema = JSON.parse(await readFile(fullPath));
    schema.$schema = 'https://json-schema.org/draft/2019-09/schema';
    const content = JSON.stringify(schema);
    await writeFile(fullPath, content);
    await editManifest(root, manifest => {
      manifest.schemas.find(entry => entry.document === path).contentDigest = digest(content);
    });
  }, root => {
    const result = run(root);
    assert.equal(result.exitCode, 1);
    assert.equal(result.body.code, 'DIALECT_CONFLICT');
  });
});
