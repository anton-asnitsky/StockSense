import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ALL_BOUNDARIES, CANONICAL_KINDS, FIXED_PATHS, ContractError } from './package-loader.mjs';
import { assertFixtureOracle, createSchemaValidator } from './validators.mjs';

const fail = (code, rule, message) => { throw new ContractError(code, rule, message); };
const object = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

// Stable finding codes for the fixture oracle. An unmapped keyword derives its
// own distinct code so two different failures can never collide on one oracle.
const FINDING_CODES = Object.freeze({
  required: 'SCHEMA_REQUIRED',
  additionalProperties: 'SCHEMA_ADDITIONAL_PROPERTY',
  oneOf: 'SCHEMA_ONE_OF'
});

const findingCode = keyword =>
  FINDING_CODES[keyword] ?? 'SCHEMA_' + String(keyword).replace(/([A-Z])/g, '_$1').toUpperCase();

/** Translate pinned-validator errors into revision-bound findings. */
export function mapSchemaFindings(errors, { revisionId, contractElementId, ruleId = 'BR2.4' }) {
  if (!Array.isArray(errors)) fail('FINDING_SHAPE', 'BR2.4', 'Validator errors must be an array');
  return errors.map(error => ({
    findingCode: findingCode(error?.keyword),
    ruleId,
    revisionId,
    contractElementId,
    instancePath: typeof error?.instancePath === 'string' ? error.instancePath : ''
  }));
}

/**
 * A package's declared contract-package-policy may restate the enforced matrix
 * but never weaken it, and may not claim coverage its manifest does not carry.
 */
export function assertDeclaredPolicy(policy, loaded) {
  if (!object(policy) || !/^1\.[0-9]+\.[0-9]+$/.test(policy.contractPackagePolicyVersion)) {
    fail('POLICY_SHAPE', 'BR2.4', 'Contract package policy shape or version is invalid');
  }
  if (!Array.isArray(policy.requiredBoundaryIds) ||
      policy.requiredBoundaryIds.length !== ALL_BOUNDARIES.length ||
      ALL_BOUNDARIES.some((id, index) => policy.requiredBoundaryIds[index] !== id)) {
    fail('POLICY_BOUNDARY_SET', 'BR2.5', 'Declared boundary set must be the closed C01-C27 list');
  }
  const declaredKinds = policy.requiredCanonicalKinds;
  if (!object(declaredKinds) || Object.keys(declaredKinds).length !== Object.keys(CANONICAL_KINDS).length) {
    fail('POLICY_KIND_MATRIX', 'BR2.5', 'Declared canonical kinds do not match the enforced matrix');
  }
  for (const [kind, ids] of Object.entries(CANONICAL_KINDS)) {
    const declared = declaredKinds[kind];
    if (!Array.isArray(declared) || declared.join(' ') !== ids) {
      fail('POLICY_KIND_MATRIX', 'BR2.5', 'Declared canonical kinds do not match the enforced matrix');
    }
  }
  const scope = policy.candidateScope;
  if (!Array.isArray(scope) || !scope.length || scope.some(id => !loaded.boundaryIds.includes(id))) {
    fail('POLICY_SCOPE', 'BR2.6', 'Candidate scope must be non-empty and covered by the manifest');
  }
  for (const boundaryId of scope) {
    const enforced = FIXED_PATHS[boundaryId];
    if (!enforced) continue;
    const declared = policy.requiredCanonicalPaths?.[boundaryId];
    if (!Array.isArray(declared) || declared.length !== enforced.length ||
        enforced.some(path => !declared.includes(path))) {
      fail('POLICY_PATH_SET', 'BR2.6', 'Declared canonical paths must match the enforced paths in scope');
    }
  }
  if (policy.releaseReady !== (loaded.manifest.manifestStatus === 'release')) {
    fail('POLICY_RELEASE_CLAIM', 'BR2.6', 'Declared release readiness contradicts the manifest status');
  }
  return { candidateScope: Object.freeze([...scope]), uncoveredBoundaries: ALL_BOUNDARIES.filter(id => !loaded.boundaryIds.includes(id)) };
}

/**
 * Run every declared example fixture against its immutable canonical target.
 * A positive fixture must produce no finding; a negative one must produce the
 * exact declared code, rule, revision and element.
 */
export async function runFixtureOracle(root, loaded) {
  const read = async document => readFile(join(root, document), 'utf8');
  const schemas = new Map();
  for (const entry of loaded.entries.filter(item => item.artifactKind === 'schema')) {
    let source;
    try { source = JSON.parse(await read(entry.document)); }
    catch { fail('SOURCE_PARSE', 'BR2.7', 'A canonical schema is malformed'); }
    if (typeof source.title !== 'string' || !source.title) fail('SCHEMA_TITLE', 'BR2.7', 'A canonical schema needs a title to bind fixtures');
    if (schemas.has(source.title)) fail('FIXTURE_TARGET_AMBIGUOUS', 'BR2.8', 'Two canonical schemas share one element title');
    schemas.set(source.title, { entry, source });
  }
  const fixtureEntries = loaded.entries.filter(item => item.kind === 'example-fixture');
  if (!fixtureEntries.length) fail('FIXTURES_MISSING', 'BR2.7', 'A candidate package requires example fixtures');
  const results = [];
  for (const fixtureEntry of fixtureEntries) {
    let file;
    try { file = JSON.parse(await read(fixtureEntry.document)); }
    catch { fail('FIXTURE_PARSE', 'BR2.7', 'An example-fixture sidecar is malformed'); }
    if (file?.syntheticOnly !== true) fail('FIXTURE_SYNTHETIC', 'BR2.9', 'Fixture payloads must be declared synthetic');
    if (!Array.isArray(file.fixtures) || !file.fixtures.length) fail('FIXTURES_MISSING', 'BR2.7', 'An example-fixture sidecar declares no fixtures');
    for (const fixture of file.fixtures) {
      if (!object(fixture) || !object(fixture.payload)) fail('FIXTURE_PAYLOAD', 'BR2.7', 'Every fixture needs an object payload');
      const target = schemas.get(fixture.contractElementId);
      if (!target) fail('FIXTURE_TARGET', 'BR2.8', 'Fixture element does not resolve to a canonical schema');
      const validate = createSchemaValidator(target.source);
      const valid = validate(fixture.payload);
      const findings = valid ? [] : mapSchemaFindings(validate.errors, {
        revisionId: target.entry.revisionId,
        contractElementId: fixture.contractElementId
      });
      assertFixtureOracle({ ...fixture, schemaRevisionId: target.entry.revisionId }, findings, loaded.entries);
      results.push({
        fixtureId: fixture.fixtureId,
        contractElementId: fixture.contractElementId,
        revisionId: target.entry.revisionId,
        scenarioType: fixture.scenarioType,
        observed: valid ? 'pass' : 'fail'
      });
    }
  }
  return results;
}
