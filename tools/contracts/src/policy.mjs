import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import YAML from 'yaml';
import { ALL_BOUNDARIES, BOUNDARY_SIDECARS, CANONICAL_KINDS, FIXED_PATHS, ContractError, digest } from './package-loader.mjs';
import { C07_PORT_PATH, C08_PORT_PATH, DIALECTS, DOCUMENT_FIXTURE_KINDS, SUPPLIER_HEAD_PATH, assertFixtureOracle, createSchemaValidator } from './validators.mjs';

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
const pointerPart = value => String(value).replace(/~/g, '~0').replace(/\//g, '~1');
// Every keyword that scopes its violation to a property reports instancePath on
// the *containing* object and names the property in params. Left at the
// container, two unrelated violations in one object share a location, and a
// negative fixture then passes for a rule it never exercised - the exact hole
// an exact-path oracle exists to close. Any keyword added to Ajv's vocabulary
// that carries a property must be listed here, so the set is closed and
// anything unlisted keeps the container path rather than guessing.
const PROPERTY_PARAMS = Object.freeze({
  required: 'missingProperty',
  dependentRequired: 'missingProperty',
  dependencies: 'missingProperty',
  additionalProperties: 'additionalProperty',
  unevaluatedProperties: 'unevaluatedProperty',
  propertyNames: 'propertyName'
});
const findingPath = error => {
  const base = typeof error?.instancePath === 'string' ? error.instancePath : '';
  const param = PROPERTY_PARAMS[error?.keyword];
  if (param === undefined) return base;
  const property = error?.params?.[param];
  // "" is a legal JSON member name and its pointer is a bare trailing slash,
  // so only a non-string location is a validator shape error.
  if (typeof property !== 'string') fail('FINDING_SHAPE', 'BR2.4', 'Validator property location is invalid');
  return `${base}/${pointerPart(property)}`;
};

// A dependency violation is identified by two names, not one: the property
// whose presence created the obligation and the dependent it requires. The
// location can only carry the dependent, so two rules demanding the same
// dependent - dependentRequired {a:['b'], x:['b']} - produced byte-identical
// findings and the oracle's finding set collapsed them into one, letting an
// undeclared violation escape. The trigger is therefore part of the identity.
const TRIGGER_KEYWORDS = Object.freeze(['dependentRequired', 'dependencies']);
const findingTrigger = error => {
  if (!TRIGGER_KEYWORDS.includes(error?.keyword)) return undefined;
  const trigger = error?.params?.property;
  if (typeof trigger !== 'string') fail('FINDING_SHAPE', 'BR2.4', 'Validator dependency trigger is invalid');
  return trigger;
};

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
  return errors.map(error => {
    const trigger = findingTrigger(error);
    return {
      findingCode: findingCode(error?.keyword),
      ruleId,
      revisionId,
      contractElementId,
      instancePath: findingPath(error),
      ...(trigger === undefined ? {} : { dependencyTrigger: trigger })
    };
  });
}

/**
 * Resolve the canonical entry a fixture is actually validated against.
 *
 * The coverage check and the validation run have to agree on this, so both go
 * through here. While coverage read the fixture's own declared revision, a
 * fixture could be credited against a document the validator never loads: the
 * validation path overwrites a declared schemaRevisionId with the resolved
 * target before the oracle sees it, so the declared value was believed by one
 * side and discarded by the other.
 * @returns {any} the canonical entry, or null when nothing resolves
 */
function resolveFixtureTarget(fixture, loaded, schemas) {
  if (fixture?.documentRevisionId) {
    return loaded.entries.find(item => item.revisionId === fixture.documentRevisionId &&
      DOCUMENT_FIXTURE_KINDS.includes(item.artifactKind)) ?? null;
  }
  return schemas.get(fixture?.contractElementId)?.entry ?? null;
}

/**
 * Whether a fixture can be bound to this canonical document at all: a titled
 * JSON Schema is addressed by element title, an OpenAPI document by revision
 * through its components. An AsyncAPI document has no payload oracle here, so
 * it cannot carry fixtures and must not be credited as though it could.
 */
function fixtureBindable(entry, schemas, documents = new Map()) {
  if (DOCUMENT_FIXTURE_KINDS.includes(entry.artifactKind)) {
    // An OpenAPI document is addressed through its components, so one that
    // declares none carries no payload the oracle could bind - nine of the
    // seventeen canonical documents are parameter-only or non-JSON endpoints
    // and declare no component schemas at all. Crediting them as bindable
    // demanded a fixture pair that can never exist. Like the AsyncAPI and
    // closed-dialect exemptions, this is derived from the document and never
    // declared by the package, so a document that *does* declare components
    // still cannot dodge the pair rule.
    const document = documents.get(entry.document);
    if (document === undefined) return true;
    return object(document?.components?.schemas) && Object.keys(document.components.schemas).length > 0;
  }
  return entry.artifactKind === 'schema' &&
    [...schemas.values()].some(item => item.entry === entry);
}

/**
 * The exact schema an OpenAPI fixture is judged against. Exported so that
 * anything deriving a fixture payload compiles the same document the oracle
 * will: a looser rewrite accepts components the oracle refuses, and the
 * mismatch only surfaces as a container rejection much later.
 */
export function openApiFixtureSchema(document, element) {
  if (document?.openapi !== '3.1.2' || !object(document.components?.schemas) ||
      !Object.hasOwn(document.components.schemas, element)) {
    fail('FIXTURE_TARGET', 'BR2.8', 'OpenAPI fixture element is absent from its declared document');
  }
  const definitions = {};
  const pending = [element];
  // A YAML anchor may refer to its own ancestor, which parses without error and
  // yields a genuinely cyclic object. Walking that unguarded exhausts the stack
  // and dies as a RangeError carrying no finding code or rule - a fail-crash
  // where a governance tool owes a governed refusal. The cross-component guard
  // below cannot see this, because the cycle lives inside one component's own
  // value tree, so the recursion tracks the path it is currently on.
  const rewrite = (value, path) => {
    if (!object(value) && !Array.isArray(value)) return value;
    if (path.has(value)) {
      fail('FIXTURE_CYCLE', 'BR2.8', 'OpenAPI fixture component contains a cyclic alias');
    }
    path.add(value);
    try {
      if (Array.isArray(value)) return value.map(item => rewrite(item, path));
      const copy = {};
      for (const [key, child] of Object.entries(value)) {
        if (key === '$ref') {
          const match = typeof child === 'string' && /^#\/components\/schemas\/([A-Za-z][A-Za-z0-9_.-]*)$/.exec(child);
          if (!match || !Object.hasOwn(document.components.schemas, match[1])) {
            throw new ContractError('FIXTURE_REFERENCE', 'BR2.8', 'OpenAPI fixture reference is outside the declared component graph');
          }
          pending.push(match[1]);
          copy.$ref = `#/$defs/${match[1]}`;
        } else copy[key] = rewrite(child, path);
      }
      return copy;
    } finally { path.delete(value); }
  };
  while (pending.length) {
    const name = pending.pop();
    if (Object.hasOwn(definitions, name)) continue;
    definitions[name] = rewrite(document.components.schemas[name], new Set());
  }
  return { $schema: DIALECTS.schema, $ref: `#/$defs/${element}`, $defs: definitions };
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
  // Parse every OpenAPI document before the coverage check, because whether a
  // document can carry a fixture at all is decided by the components it
  // declares, and that has to be known before the pair rule is applied.
  const documents = new Map();
  for (const entry of loaded.entries.filter(item => item.artifactKind === 'openapi')) {
    const bytes = await read(entry);
    try {
      const parsed = YAML.parseDocument(bytes, { uniqueKeys: true, strict: true });
      if (parsed.errors.length) throw parsed.errors[0];
      documents.set(entry.document, parsed.toJS());
    } catch { fail('SOURCE_PARSE', 'BR2.7', 'A canonical OpenAPI document is malformed'); }
  }

  const fixtureEntries = loaded.entries.filter(item => item.kind === 'example-fixture');
  if (!fixtureEntries.length) fail('FIXTURES_MISSING', 'BR2.7', 'A candidate package requires example fixtures');
  const sidecars = [];
  for (const entry of fixtureEntries) {
    const bytes = await read(entry);
    let file;
    try { file = JSON.parse(bytes); }
    catch { fail('FIXTURE_PARSE', 'BR2.7', 'An example-fixture sidecar is malformed'); }
    if (file?.syntheticOnly !== true) fail('FIXTURE_SYNTHETIC', 'BR2.9', 'Fixture payloads must be declared synthetic');
    if (!Array.isArray(file.fixtures) || !file.fixtures.length) fail('FIXTURES_MISSING', 'BR2.7', 'An example-fixture sidecar declares no fixtures');
    sidecars.push({ entry, fixtures: file.fixtures });
  }
  for (const { entry, fixtures } of sidecars) {
    for (const boundaryId of entry.boundaryIds ?? []) {
      const canonical = loaded.entries.filter(item => ['schema', 'openapi', 'asyncapi'].includes(item.artifactKind) &&
        item.boundaryIds?.includes(boundaryId));
      if (!canonical.length) fail('FIXTURE_COVERAGE', 'BR2.7', 'A claimed fixture boundary has no canonical revision');
      // A boundary all of whose canonical documents are of a kind this oracle
      // provably cannot bind - an AsyncAPI document, or a schema in one of the
      // closed non-payload dialects - carries no fixture evidence and is
      // exempt from the pair rule. The exemption is derived from the artifact
      // kinds, never declared by the package, so it cannot be used to dodge a
      // document that *is* bindable: one bindable document under the boundary
      // and the pair rule applies to it. C08, C25 and C27 require only such
      // artifacts, so refusing here made them unpackageable.
      const bindable = canonical.filter(item => fixtureBindable(item, schemas, documents));
      for (const target of bindable) {
        const scenarios = fixtures.filter(fixture => fixture?.boundaryIds?.includes(boundaryId) &&
          resolveFixtureTarget(fixture, loaded, schemas) === target);
        if (!scenarios.some(fixture => fixture.scenarioType === 'valid' && fixture.expectedOutcome === 'pass') ||
            !scenarios.some(fixture => fixture.scenarioType === 'invalid' && fixture.expectedOutcome === 'fail')) {
          fail('FIXTURE_COVERAGE', 'BR2.7', 'A claimed canonical revision lacks positive and negative fixtures');
        }
      }
    }
  }
  const results = [];
  for (const { fixtures } of sidecars) {
    for (const fixture of fixtures) {
      if (!object(fixture) || !object(fixture.payload)) fail('FIXTURE_PAYLOAD', 'BR2.7', 'Every fixture needs an object payload');
      const target = resolveFixtureTarget(fixture, loaded, schemas);
      if (!target) {
        fail('FIXTURE_TARGET', 'BR2.8', fixture.documentRevisionId ? 'Fixture document revision is absent' :
          'Fixture element does not resolve to a canonical schema');
      }
      let validationSchema;
      if (fixture.documentRevisionId) {
        // Read outside the parse guard so a digest mismatch keeps its own code
        // instead of being reported as a malformed document.
        const bytes = await read(target);
        let document;
        try {
          const parsed = YAML.parseDocument(bytes, { uniqueKeys: true, strict: true });
          if (parsed.errors.length) throw parsed.errors[0];
          document = parsed.toJS();
        } catch { fail('FIXTURE_TARGET', 'BR2.8', 'Fixture OpenAPI document is malformed'); }
        validationSchema = openApiFixtureSchema(document, fixture.contractElementId);
      } else validationSchema = schemas.get(fixture.contractElementId).source;
      const validate = createSchemaValidator(validationSchema, references,
        { openApiComponents: Boolean(fixture.documentRevisionId) });
      const valid = validate(fixture.payload);
      const findings = valid ? [] : mapSchemaFindings(validate.errors, {
        revisionId: target.revisionId,
        contractElementId: fixture.contractElementId
      });
      assertFixtureOracle(fixture.documentRevisionId ? fixture :
        { ...fixture, schemaRevisionId: target.revisionId }, findings, loaded.entries);
      results.push({
        fixtureId: fixture.fixtureId,
        contractElementId: fixture.contractElementId,
        revisionId: target.revisionId,
        scenarioType: fixture.scenarioType,
        observed: valid ? 'pass' : 'fail'
      });
    }
  }
  return results;
}
