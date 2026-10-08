import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_BOUNDARIES, loadPackage } from '../../src/package-loader.mjs';
import { runFixtureOracle } from '../../src/policy.mjs';
import { buildFullPackage } from '../../src/full-package.mjs';

// Only the thin C01/C18 walking skeleton has ever been packaged, so every rule
// that is whole-catalogue rather than per-document - required kinds, fixed
// paths, per-boundary sidecars and the fixture pair rule - had never met the
// real catalogue at once. These tests assemble the complete C01-C27 candidate
// and record exactly how far it gets.
const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));

// The canonical documents that cannot carry a fixture pair today. This list is
// a ratchet, not a tolerance: it is asserted exactly, so adding component
// schemas to one of these documents, or removing them from another, fails here
// and forces the AI-DLC record to be updated with it.
const UNBINDABLE = Object.freeze({
  'forecasting/v1/planning-forecasts.openapi.yaml': 'SCHEMA_INVALID',
  'model-lifecycle/v1/heavy-work.openapi.yaml': 'SCHEMA_INVALID',
  'identity-access/v1/global-audit-read.openapi.yaml': 'declares no component schemas',
  'identity-access/v1/identity-metadata.openapi.yaml': 'declares no component schemas',
  'planning-purchasing/v1/assistant-purchasing.openapi.yaml': 'declares no component schemas',
  'retail-data/v1/assistant-inventory.openapi.yaml': 'declares no component schemas',
  'retail-data/v1/dataset-exports.openapi.yaml': 'declares no component schemas',
  'retail-data/v1/forecast-inputs.openapi.yaml': 'declares no component schemas',
  'retail-data/v1/supplier-reference.openapi.yaml': 'declares no component schemas',
  'supplier-knowledge/v1/assistant-retrieval.openapi.yaml': 'declares no component schemas',
  'web-bff/v1/identity-session.openapi.yaml': 'declares no component schemas'
});

async function assembled(options) {
  const out = await mkdtemp(join(tmpdir(), 'stocksense-full-package-test-'));
  try { return { out, built: await buildFullPackage(repoRoot, out, options), clean: () => rm(out, { recursive: true, force: true }) }; }
  catch (error) { await rm(out, { recursive: true, force: true }); throw error; }
}

test('the assembler refuses to write a package it cannot complete', async () => {
  // A half-written package root is worse than none: a later run would validate
  // a stale tree and the result would read as proof.
  const { built, clean } = await assembled();
  try {
    assert.equal(built.manifest, null);
    assert.deepEqual(built.problems.map(problem => problem.document).sort(), Object.keys(UNBINDABLE).sort());
    for (const { document, reason } of built.problems) {
      assert.ok(reason.startsWith(UNBINDABLE[document]), `${document}: ${reason}`);
    }
  } finally { await clean(); }
});

test('every document that can bind a fixture pair does, verified by the pinned oracle', async () => {
  const { out, built, clean } = await assembled({ allowIncomplete: true });
  try {
    // 18 bound, 9 exempt by kind, 11 refused. The exempt documents are the
    // AsyncAPI and closed-dialect sources the oracle provably cannot bind, so
    // they carry no fixture evidence and are not credited as though they did.
    assert.equal(built.bound, 18);
    assert.equal(built.exempt, 9);
    assert.equal(built.bound + built.exempt + built.problems.length, 38);
    assert.equal(built.manifest.boundaryCoverage.length, ALL_BOUNDARIES.length);
    assert.equal(built.manifest.manifestStatus, 'candidate');

    // Each bound document contributes exactly one verified pair, and every
    // negative declares the required-property finding its pointer names.
    const sidecar = JSON.parse(await readFile(join(out, 'governance/example-fixture.json'), 'utf8'));
    assert.equal(sidecar.syntheticOnly, true);
    assert.equal(sidecar.fixtures.length, built.bound * 2);
    const negatives = sidecar.fixtures.filter(fixture => fixture.scenarioType === 'invalid');
    assert.equal(negatives.length, built.bound);
    for (const fixture of negatives) {
      assert.equal(fixture.expectedOutcome, 'fail');
      assert.equal(fixture.expectedFailureCode, 'SCHEMA_REQUIRED');
      assert.equal(fixture.expectedFailureRuleId, 'BR2.4');
      assert.match(fixture.expectedFailurePath, /^\/[^/]/);
    }
  } finally { await clean(); }
});

test('the full candidate package is refused for exactly the fixture-coverage rule', async () => {
  // This is the live blocker on the whole-catalogue package, recorded as an
  // executable fact rather than a note: eleven OpenAPI documents cannot carry
  // the pair the candidate rule requires, so C01-C27 cannot be packaged until
  // that is resolved upstream. When it is, this test fails and says so.
  const { out, built, clean } = await assembled({ allowIncomplete: true });
  try {
    assert.ok(built.manifest, 'the package is written so the governance rules can judge it');
    const loaded = await loadPackage(out);
    // Everything structural passes: the manifest loads, which means required
    // kinds, fixed paths, per-boundary sidecars and the boundary inventory all
    // hold across the complete catalogue for the first time.
    assert.deepEqual([...loaded.boundaryIds].sort(), [...ALL_BOUNDARIES].sort());
    await assert.rejects(runFixtureOracle(out, loaded), error => {
      assert.equal(error.code, 'FIXTURE_COVERAGE');
      assert.equal(error.ruleId, 'BR2.7');
      return true;
    });
  } finally { await clean(); }
});
