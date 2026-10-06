import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import YAML from 'yaml';
import { ALL_BOUNDARIES, BOUNDARY_SIDECARS, CANONICAL_KINDS, FIXED_PATHS, ContractError, digest } from './package-loader.mjs';
import { C07_PORT_PATH, C08_PORT_PATH, DIALECTS, SUPPLIER_HEAD_PATH, assertFixtureOracle, createSchemaValidator } from './validators.mjs';

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

const SIDECAR_MATRIX = Object.freeze({
  candidateEveryBoundary: ['example-fixture'],
  releaseEveryBoundary: ['example-fixture', 'compatibility-assessment', 'validation-run', 'evidence-record'],
  candidateForCanonicalDocuments: ['generation-profile'],
  releaseForGeneratedConsumers: ['generated-output-manifest'],
  candidateByBoundary: BOUNDARY_SIDECARS
});

function sameMembers(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length &&
    new Set(actual).size === actual.length && expected.every(item => actual.includes(item));
}

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
  if (!object(policy.requiredCanonicalPaths) ||
      Object.keys(policy.requiredCanonicalPaths).length !== Object.keys(FIXED_PATHS).length ||
      Object.entries(FIXED_PATHS).some(([id, paths]) => !sameMembers(policy.requiredCanonicalPaths[id], paths))) {
    fail('POLICY_PATH_SET', 'BR2.6', 'Declared canonical paths must match the complete enforced matrix');
  }
  const sidecars = policy.requiredSidecarKinds;
  if (!object(sidecars) || Object.keys(sidecars).length !== Object.keys(SIDECAR_MATRIX).length ||
      Object.entries(SIDECAR_MATRIX).some(([key, expected]) => key !== 'candidateByBoundary' && !sameMembers(sidecars[key], expected)) ||
      !object(sidecars.candidateByBoundary) ||
      Object.keys(sidecars.candidateByBoundary).length !== Object.keys(BOUNDARY_SIDECARS).length ||
      Object.entries(BOUNDARY_SIDECARS).some(([id, kind]) => !sameMembers(sidecars.candidateByBoundary[id], [kind]))) {
    fail('POLICY_SIDECAR_MATRIX', 'BR2.6', 'Declared sidecar kinds must match the complete enforced matrix');
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
  const read = async entry => {
    const bytes = await readFile(join(root, entry.document));
    if (entry.contentDigest !== undefined && digest(bytes) !== entry.contentDigest) {
      fail('DIGEST_MISMATCH', 'BR1.1', 'A declared content digest does not match');
    }
    return bytes.toString('utf8');
  };
  const schemas = new Map();
  const references = new Map();
  for (const entry of loaded.entries.filter(item => item.artifactKind === 'schema')) {
    let source;
    const bytes = await read(entry);
    try {
      if (entry.document.endsWith('.json')) source = JSON.parse(bytes);
      else if (entry.document.endsWith('.yaml') || entry.document.endsWith('.yml')) {
        const document = YAML.parseDocument(bytes, { uniqueKeys: true, strict: true });
        if (document.errors.length) throw document.errors[0];
        source = document.toJS();
      } else fail('SOURCE_PARSE', 'BR2.7', 'A canonical schema has an unsupported format');
    }
    catch { fail('SOURCE_PARSE', 'BR2.7', 'A canonical schema is malformed'); }
    if (!object(source)) fail('SOURCE_PARSE', 'BR2.7', 'A canonical schema is malformed');
    const typedPort = entry.document === C07_PORT_PATH ||
      [DIALECTS.typedPort, 'urn:stocksense:dialect:typed-port:1'].includes(entry.schemaDialect ?? source.dialect) ||
      source.kind === 'typed-port';
    const inProcessPort = entry.document === C08_PORT_PATH ||
      (entry.schemaDialect ?? source.dialect) === DIALECTS.inProcessPort ||
      source.kind === 'in-process-port';
    const governedRecord = entry.document === SUPPLIER_HEAD_PATH || source.kind === 'vault-kv-authority-head' ||
      [DIALECTS.governedRecord, 'urn:stocksense:dialect:governed-record:1'].includes(entry.schemaDialect ?? source.dialect) ||
      source.kind === 'governed-record';
    if (typedPort || inProcessPort || governedRecord) {
      if (source.$schema || Number(typedPort) + Number(inProcessPort) + Number(governedRecord) !== 1) {
        fail('DIALECT_CONFLICT', 'BR1.3', 'Schema dialect markers conflict');
      }
      continue;
    }
    if (source.$schema !== DIALECTS.schema || (entry.schemaDialect && entry.schemaDialect !== DIALECTS.schema) || source.dialect) {
      fail('DIALECT_CONFLICT', 'BR1.3', 'Expected JSON Schema 2020-12');
    }
    if (source.title !== undefined && (typeof source.title !== 'string' || !source.title)) {
      fail('SCHEMA_TITLE', 'BR2.7', 'A canonical schema title must be nonempty');
    }
    if (source.title) {
      if (schemas.has(source.title)) fail('FIXTURE_TARGET_AMBIGUOUS', 'BR2.8', 'Two canonical schemas share one element title');
      schemas.set(source.title, { entry, source });
    }
    if (source.$id) {
      if (references.has(source.$id)) fail('SCHEMA_INVALID', 'NFR8.4', 'Two canonical schemas share one identity');
      references.set(source.$id, source);
    }
  }
  const fixtureEntries = loaded.entries.filter(item => item.kind === 'example-fixture');
  if (!fixtureEntries.length) fail('FIXTURES_MISSING', 'BR2.7', 'A candidate package requires example fixtures');
  const results = [];
  for (const fixtureEntry of fixtureEntries) {
    let file;
    const bytes = await read(fixtureEntry);
    try { file = JSON.parse(bytes); }
    catch { fail('FIXTURE_PARSE', 'BR2.7', 'An example-fixture sidecar is malformed'); }
    if (file?.syntheticOnly !== true) fail('FIXTURE_SYNTHETIC', 'BR2.9', 'Fixture payloads must be declared synthetic');
    if (!Array.isArray(file.fixtures) || !file.fixtures.length) fail('FIXTURES_MISSING', 'BR2.7', 'An example-fixture sidecar declares no fixtures');
    for (const fixture of file.fixtures) {
      if (!object(fixture) || !object(fixture.payload)) fail('FIXTURE_PAYLOAD', 'BR2.7', 'Every fixture needs an object payload');
      const target = schemas.get(fixture.contractElementId);
      if (!target) fail('FIXTURE_TARGET', 'BR2.8', 'Fixture element does not resolve to a canonical schema');
      const validate = createSchemaValidator(target.source, references);
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
