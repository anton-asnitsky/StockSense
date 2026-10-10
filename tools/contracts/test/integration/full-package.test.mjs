import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_BOUNDARIES, loadPackage } from '../../src/package-loader.mjs';
import { runFixtureOracle } from '../../src/policy.mjs';
import { buildFullPackage } from '../../src/full-package.mjs';

// Only the thin C01/C18 walking skeleton had ever been packaged, so every rule
// that is whole-catalogue rather than per-document - the boundary inventory,
// required kinds, fixed paths, per-boundary sidecars, cross-document references
// and the fixture pair rule - had never met the real catalogue at once. These
// tests assemble the complete C01-C27 candidate and judge it.
const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));

// The nine canonical documents that carry no payload an oracle could bind:
// parameter-only or non-JSON endpoints that declare no component schemas.
// Asserted exactly, as a ratchet rather than a tolerance - adding components to
// one of these, or removing them from another, fails here and forces the
// AI-DLC record to be updated with it.
const WITHOUT_COMPONENTS = Object.freeze([
  'identity-access/v1/global-audit-read.openapi.yaml',
  'identity-access/v1/identity-metadata.openapi.yaml',
  'planning-purchasing/v1/assistant-purchasing.openapi.yaml',
  'retail-data/v1/assistant-inventory.openapi.yaml',
  'retail-data/v1/dataset-exports.openapi.yaml',
  'retail-data/v1/forecast-inputs.openapi.yaml',
  'retail-data/v1/supplier-reference.openapi.yaml',
  'supplier-knowledge/v1/assistant-retrieval.openapi.yaml',
  'web-bff/v1/identity-session.openapi.yaml'
]);

async function assembled() {
  const out = await mkdtemp(join(tmpdir(), 'stocksense-full-package-test-'));
  try { return { out, built: await buildFullPackage(repoRoot, out), clean: () => rm(out, { recursive: true, force: true }) }; }
  catch (error) { await rm(out, { recursive: true, force: true }); throw error; }
}

test('every canonical document either binds a verified fixture pair or is exempt by kind', async () => {
  const { built, clean } = await assembled();
  try {
    // Nothing is refused and nothing is unaccounted for. The exempt documents
    // are the AsyncAPI sources, the closed-dialect schemas and the OpenAPI
    // documents that declare no components - all derived from the document, so
    // none of them is credited as carrying fixture evidence.
    assert.deepEqual(built.problems, []);
    assert.equal(built.bound, 20);
    assert.equal(built.exempt, 18);
    assert.equal(built.bound + built.exempt, 38);
    assert.ok(built.manifest, 'a complete package is written');
    assert.equal(built.manifest.manifestStatus, 'candidate');
    assert.equal(built.manifest.boundaryCoverage.length, ALL_BOUNDARIES.length);
  } finally { await clean(); }
});

test('each bound document contributes a positive, a required negative, and the mutations it admits', async () => {
  const { out, built, clean } = await assembled();
  try {
    const sidecar = JSON.parse(await readFile(join(out, 'governance/example-fixture.json'), 'utf8'));
    assert.equal(sidecar.syntheticOnly, true);
    const positives = sidecar.fixtures.filter(fixture => fixture.scenarioType === 'valid');
    const negatives = sidecar.fixtures.filter(fixture => fixture.scenarioType === 'invalid');
    assert.equal(positives.length, built.bound);
    // One required-omission negative per bound document, plus the non-required
    // mutations each document admits.
    assert.ok(negatives.length > built.bound, `expected more than ${built.bound} negatives, got ${negatives.length}`);

    const requiredOnly = negatives.filter(fixture => fixture.expectedFailureCode !== undefined);
    assert.equal(requiredOnly.length, built.bound);
    for (const fixture of requiredOnly) {
      assert.equal(fixture.expectedOutcome, 'fail');
      assert.equal(fixture.expectedFailureCode, 'SCHEMA_REQUIRED');
      assert.equal(fixture.expectedFailureRuleId, 'BR2.4');
      assert.match(fixture.expectedFailurePath, /^\/[^/]/);
    }

    // Every negative that is not the required omission declares its findings as
    // a set, and at least one of them is not SCHEMA_REQUIRED. Before these
    // existed, all forty oracle rows asserted the same keyword, so nothing
    // exercised an enum, a closed object or a conditional discriminator - the
    // architecture review's A-05.
    const mutations = negatives.filter(fixture => Array.isArray(fixture.expectedFailures));
    assert.equal(requiredOnly.length + mutations.length, negatives.length);
    assert.ok(mutations.length > 0, 'no non-required negatives were produced');
    for (const fixture of mutations) {
      assert.equal(fixture.expectedOutcome, 'fail');
      assert.ok(fixture.expectedFailures.length > 0, fixture.fixtureId);
      assert.ok(fixture.expectedFailures.some(row => row.code !== 'SCHEMA_REQUIRED'),
        `${fixture.fixtureId} asserts only SCHEMA_REQUIRED`);
      for (const row of fixture.expectedFailures) {
        assert.match(row.code, /^SCHEMA_[A-Z_]+$/);
        assert.equal(row.ruleId, 'BR2.4');
        assert.equal(typeof row.path, 'string');
      }
    }
    // The constraints the catalogue actually leans on are represented.
    const codes = new Set(mutations.flatMap(fixture => fixture.expectedFailures.map(row => row.code)));
    for (const code of ['SCHEMA_ADDITIONAL_PROPERTY', 'SCHEMA_ENUM', 'SCHEMA_CONST', 'SCHEMA_IF']) {
      assert.ok(codes.has(code), `no negative asserts ${code}`);
    }
    // Every payload is derived from a schema and verified by the oracle, never
    // hand-written, so a fixture cannot be authored against a schema it does
    // not satisfy.
    assert.ok(sidecar.fixtures.every(fixture => fixture.payload !== undefined));
  } finally { await clean(); }
});

test('the complete C01-C27 candidate package passes the governance rules', async () => {
  // This is the whole point. Until the OpenAPI components compiled and the
  // bindability exemption was derived rather than assumed, this package was
  // refused with FIXTURE_COVERAGE/BR2.7 and the catalogue could not be packaged
  // at all.
  const { out, built, clean } = await assembled();
  try {
    assert.ok(built.manifest);
    const loaded = await loadPackage(out);
    assert.deepEqual([...loaded.boundaryIds].sort(), [...ALL_BOUNDARIES].sort());
    const results = await runFixtureOracle(out, loaded);
    // Every declared fixture is judged, and none is silently skipped.
    const sidecar = JSON.parse(await readFile(join(out, 'governance/example-fixture.json'), 'utf8'));
    assert.equal(results.length, sidecar.fixtures.length);
    assert.ok(results.length > built.bound * 2,
      `expected more than the required-only pairs, got ${results.length}`);
    // Every fixture's observed outcome must equal the one it declared. For the
    // non-required negatives that means the oracle reproduced an exact finding
    // set - enum, const, additionalProperties or a conditional - not merely
    // that the payload failed somehow.
    for (const row of results) {
      assert.ok(['valid', 'invalid'].includes(row.scenarioType));
      assert.equal(row.observed, row.scenarioType === 'valid' ? 'pass' : 'fail');
    }
  } finally { await clean(); }
});

test('the documents that declare no components are exactly the nine expected', async () => {
  const YAML = (await import('yaml')).default;
  const { buildSourceInventory } = await import('../../src/catalogue.mjs');
  const inventory = await buildSourceInventory(repoRoot);
  const bare = [];
  for (const entry of inventory.entries.filter(item => item.artifactKind === 'openapi')) {
    const source = YAML.parse(await readFile(join(repoRoot, 'contracts/source', entry.document), 'utf8'),
      { strict: true, uniqueKeys: true });
    if (!Object.keys(source?.components?.schemas ?? {}).length) bare.push(entry.document);
  }
  assert.deepEqual(bare.sort(), [...WITHOUT_COMPONENTS].sort());
});
