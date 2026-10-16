import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { deriveIdentity, digest, loadPackage } from '../../src/package-loader.mjs';
import { runFixtureOracle } from '../../src/policy.mjs';

const projectRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const sample = join(projectRoot, 'contracts/samples/walking-skeleton');
const cli = fileURLToPath(new URL('../../src/cli.mjs', import.meta.url));
test('C18 package examples bind the OpenAPI revision and exact positive/negative outcomes', async () => {
  const loaded = await loadPackage(sample);
  const c18 = loaded.entries.find(entry => entry.document === 'web-bff/v1/browser-api.openapi.yaml');
  const fixture = JSON.parse(await readFile(join(sample, 'governance/example-fixture.json')));
  const c18Fixtures = fixture.fixtures.filter(item => item.boundaryIds.includes('C18'));
  const canonicalFixtures = JSON.parse(await readFile(join(projectRoot,
    'contracts/fixtures/web-bff/v1/example-fixture.json')));
  assert.equal(canonicalFixtures.syntheticOnly, true);
  assert.deepEqual(c18Fixtures, canonicalFixtures.fixtures);
  assert.equal(c18Fixtures.length, 6);
  assert.ok(c18Fixtures.every(item => item.documentRevisionId === c18.revisionId));
  const rows = (await runFixtureOracle(sample, loaded)).filter(item => item.fixtureId.startsWith('c18-'));
  assert.deepEqual(rows.map(item => item.observed), ['pass', 'fail', 'pass', 'fail', 'pass', 'fail']);
  await withCopy(async root => {
    const path = join(root, 'governance/example-fixture.json');
    const changed = JSON.parse(await readFile(path));
    changed.fixtures.find(item => item.fixtureId === 'c18-manual-review-missing-version').expectedFailureCode = 'SCHEMA_ENUM';
    const bytes = JSON.stringify(changed);
    await writeFile(path, bytes);
    await editManifest(root, manifest => {
      manifest.governedArtifacts.find(entry => entry.kind === 'example-fixture').contentDigest = digest(bytes);
    });
  }, async root => {
    await assert.rejects(runFixtureOracle(root, await loadPackage(root)),
      error => error.code === 'FIXTURE_ORACLE_MISMATCH' && error.ruleId === 'NFR8.13');
  });
});
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

async function replaceOpenApi(root, content) {
  const document = 'web-bff/v1/browser-api.openapi.yaml';
  await writeFile(join(root, document), content);
  const fixturePath = join(root, 'governance/example-fixture.json');
  const sidecar = JSON.parse(await readFile(fixturePath, 'utf8'));
  let revisionId;
  await editManifest(root, manifest => {
    const entry = manifest.openapi.find(item => item.document === document);
    entry.contentDigest = digest(content);
    revisionId = deriveIdentity('openapi', entry.provider, document, entry.semanticVersion, entry.contentDigest).revisionId;
  });
  // A C18 fixture binds its target by a revision derived from the document
  // digest, so replacing the document moves that revision and the fixtures
  // have to come with it. Otherwise every test that edits this document
  // fails in the oracle for a reason it is not testing.
  for (const fixture of sidecar.fixtures) {
    if (fixture.documentRevisionId) fixture.documentRevisionId = revisionId;
  }
  const bytes = JSON.stringify(sidecar, null, 2) + '\n';
  await writeFile(fixturePath, bytes);
  await editManifest(root, manifest => {
    manifest.governedArtifacts.find(item => item.kind === 'example-fixture').contentDigest = digest(bytes);
  });
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
  assert.deepEqual(result.body.fixtureResults.map(item => item.observed),
    ['pass', 'pass', 'fail', 'fail', 'pass', 'fail', 'pass', 'fail', 'pass', 'fail']);
  // Without a repository the revision is recorded but not proven.
  assert.equal(result.body.sourceBinding, 'unverified-no-repository');
});

test('candidate validation refuses an unpinned standards image instead of falling back to host tools', () => {
  let body;
  try {
    execFileSync(process.execPath, [cli, 'validate', sample],
      { encoding: 'utf8', env: { ...process.env, STOCKSENSE_STANDARDS_IMAGE: '' } });
  } catch (error) {
    body = JSON.parse(error.stdout);
  }
  assert.equal(body?.code, 'STANDARDS_IMAGE_PIN');
  assert.equal(body.ruleId, 'NFR6.2');
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
    assert.equal(result.body.ruleId, 'BR1.1');
  });
});
test('changed bytes fail exact digest before release', async () => {
  await withCopy(root => writeFile(join(root, 'governance/example-fixture.json'), '{}'), root => {
    const result = run(root);
    assert.equal(result.body.code, 'DIGEST_MISMATCH');
    assert.equal(result.body.ruleId, 'BR1.1');
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
    assert.equal(result.body.ruleId, 'BR1.1');
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

test('preflight: YAML remote reference is rejected before the standards validator', async () => {
  await withCopy(root => replaceOpenApi(root, 'openapi: 3.1.2\nitem: { $ref: "https://example.invalid/schema.yaml" }\n'), root => {
    const result = run(root);
    assert.equal(result.exitCode, 1);
    assert.equal(result.body.code, 'REFERENCE_POLICY');
    assert.equal(result.body.ruleId, 'NFR6.2');
  });
});

test('preflight: YAML traversal reference is rejected before the standards validator', async () => {
  await withCopy(root => replaceOpenApi(root, 'openapi: 3.1.2\nitem: { $ref: "../../outside.yaml" }\n'), root => {
    const result = run(root);
    assert.equal(result.exitCode, 1);
    assert.equal(result.body.code, 'REFERENCE_POLICY');
    assert.equal(result.body.ruleId, 'NFR6.2');
  });
});

test('preflight: the real C18 candidate passes at 1024 references and fails at 1025', async () => {
  for (const count of [1024, 1025]) {
    await withCopy(async root => {
      const document = 'web-bff/v1/browser-api.openapi.yaml';
      const source = await readFile(join(root, document), 'utf8');
      const existing = (source.match(/\$ref:/g) ?? []).length;
      const added = Array.from({ length: count - existing }, () => '  - { $ref: "#/components/schemas/SessionResponse" }').join('\n');
      await replaceOpenApi(root, source + `\nx-reference-budget:\n${added}\n`);
    }, root => {
      const result = run(root);
      if (count === 1024) assert.equal(result.exitCode, 0, JSON.stringify(result.body));
      else {
        assert.equal(result.exitCode, 1);
        assert.equal(result.body.code, 'REFERENCE_LIMIT');
        assert.equal(result.body.ruleId, 'NFR10.1');
      }
    });
  }
});
