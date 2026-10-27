import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import YAML from 'yaml';
import { ALL_BOUNDARIES, BOUNDARY_SIDECARS, CANONICAL_KINDS, FIXED_PATHS, ContractError, digest } from './package-loader.mjs';
import { C07_PORT_PATH, C08_PORT_PATH, DIALECTS, DOCUMENT_FIXTURE_KINDS, SUPPLIER_HEAD_PATH, assertFixtureOracle, createSchemaValidator } from './validators.mjs';

/** @returns {never} */
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
const RESPONSE_MEDIA = Object.freeze({
  'application/json': 'application-json',
  'application/problem+json': 'application-problem-json'
});
const MAX_OPENAPI_EXAMPLES = 128;
const HEAVY_WORK_PATH = 'model-lifecycle/v1/heavy-work.openapi.yaml';
const HEAVY_WORK_FAILURES = Object.freeze({
  'pin-admission-missing-run-invalid': [{ code: 'SCHEMA_REQUIRED', ruleId: 'BR2.4', path: '/forecastRunId' }],
  'batch-lease-missing-attempt-invalid': [
    { code: 'SCHEMA_REQUIRED', ruleId: 'BR2.4', path: '/forecastAttemptId' },
    { code: 'SCHEMA_IF', ruleId: 'BR2.4', path: '' }
  ],
  'nonbatch-lease-with-attempt-invalid': [
    { code: 'SCHEMA_NOT', ruleId: 'BR2.4', path: '' },
    { code: 'SCHEMA_IF', ruleId: 'BR2.4', path: '' }
  ],
  'embedding-lease-missing-fence-invalid': [
    { code: 'SCHEMA_REQUIRED', ruleId: 'BR2.4', path: '/localFenceGeneration' },
    { code: 'SCHEMA_IF', ruleId: 'BR2.4', path: '' }
  ]
});
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
 * through its components. AsyncAPI channel messages are listed separately
 * below; complete catalogues must bind every declared channel message.
 */
export function openApiInlineResponseElements(document) {
  const elements = [];
  for (const pathItem of Object.values(document?.paths ?? {})) {
    if (!object(pathItem)) continue;
    for (const operation of Object.values(pathItem)) {
      if (!object(operation) || !/^[A-Za-z][A-Za-z0-9]{0,96}$/.test(operation.operationId ?? '')) continue;
      for (const [status, response] of Object.entries(operation.responses ?? {})) {
        const schema = response?.content?.['application/json']?.schema;
        // Include every inline JSON schema. Required fields can be composed
        // through allOf or a component reference; an optional-only schema must
        // fail fixture construction explicitly rather than gain an exemption.
        if (/^[1-5][0-9]{2}$/.test(status) && object(schema)) {
          elements.push(`response:${operation.operationId}:${status}:application-json`);
        }
      }
    }
  }
  if (new Set(elements).size !== elements.length) {
    fail('FIXTURE_TARGET_AMBIGUOUS', 'BR2.8', 'Two inline responses share one fixture element');
  }
  return elements;
}

/** Enumerate the bounded named examples that the canonical OpenAPI source actually declares. */
export function openApiNamedExamples(document, documentPath) {
  if (document?.openapi !== '3.1.2') fail('FIXTURE_TARGET', 'BR2.8', 'OpenAPI example source has an unsupported dialect');
  const examples = [];
  const identities = new Set();
  const add = (id, element, value, expectedValid, expectedFailures) => {
    if (identities.has(id)) fail('FIXTURE_TARGET_AMBIGUOUS', 'BR2.8', 'OpenAPI example identity is duplicated');
    if (!object(value) || typeof expectedValid !== 'boolean') {
      fail('FIXTURE_EXAMPLE_SHAPE', 'BR2.7', 'OpenAPI example requires an object value and declared outcome');
    }
    if (examples.length >= MAX_OPENAPI_EXAMPLES) fail('FIXTURE_EXAMPLE_LIMIT', 'BR2.7', 'OpenAPI example count exceeds its bound');
    identities.add(id);
    examples.push({ id, element, payload: value, expectedValid,
      ...(expectedFailures === undefined ? {} : { expectedFailures }) });
  };
  const embedded = document['x-contract-fixtures'];
  if (embedded !== undefined && !Array.isArray(embedded)) {
    fail('FIXTURE_EXAMPLE_SHAPE', 'BR2.7', 'OpenAPI contract fixtures must be an array');
  }
  for (const fixture of embedded ?? []) {
    const match = typeof fixture?.schemaRef === 'string' &&
      /^#\/components\/schemas\/([A-Za-z][A-Za-z0-9_.-]*)$/.exec(fixture.schemaRef);
    if (!/^[a-z][a-z0-9-]{0,95}$/.test(fixture?.name ?? '') || !match ||
        !Object.hasOwn(document.components?.schemas ?? {}, match[1])) {
      fail('FIXTURE_TARGET', 'BR2.8', 'OpenAPI contract fixture has no named local component');
    }
    const expectedFailures = fixture.expectedValid === false && documentPath === HEAVY_WORK_PATH
      ? HEAVY_WORK_FAILURES[fixture.name] : undefined;
    if (fixture.expectedValid === false && !expectedFailures) {
      fail('FIXTURE_EXAMPLE_EXPECTATION', 'BR2.3', 'Invalid OpenAPI example has no approved exact finding');
    }
    add(`x:${fixture.name}`, match[1], fixture.value, fixture.expectedValid, expectedFailures);
  }
  for (const pathItem of Object.values(document.paths ?? {})) {
    if (!object(pathItem)) continue;
    for (const operation of Object.values(pathItem)) {
      if (!object(operation) || !object(operation.responses)) continue;
      for (const [status, response] of Object.entries(operation.responses)) {
        for (const [mediaType, media] of Object.entries(response?.content ?? {})) {
          if (!object(media) || (media.examples === undefined && media.example === undefined)) continue;
          const mediaSlug = RESPONSE_MEDIA[mediaType];
          if (!/^[A-Za-z][A-Za-z0-9]{0,96}$/.test(operation.operationId ?? '') ||
              !/^[1-5][0-9]{2}$/.test(status) || !mediaSlug || !object(media.schema) ||
              (media.examples !== undefined && media.example !== undefined)) {
            fail('FIXTURE_TARGET', 'BR2.8', 'OpenAPI response example has no supported operation, status, media type or schema');
          }
          const element = `response:${operation.operationId}:${status}:${mediaSlug}`;
          // The image worker's result contract accepts component names and
          // application-json response elements. Problem responses in this
          // catalogue point to a local component, so use that schema target
          // while the canonical example ID retains status and media identity.
          let fixtureElement = element;
          if (mediaType === 'application/problem+json') {
            const match = typeof media.schema.$ref === 'string' &&
              /^#\/components\/schemas\/([A-Za-z][A-Za-z0-9_.-]*)$/.exec(media.schema.$ref);
            if (!match || Object.keys(media.schema).length !== 1 ||
                !Object.hasOwn(document.components?.schemas ?? {}, match[1])) {
              fail('FIXTURE_TARGET', 'BR2.8', 'Problem response example must bind one local component');
            }
            fixtureElement = match[1];
          }
          const named = media.examples ?? { default: { value: media.example } };
          if (!object(named) || !Object.keys(named).length) {
            fail('FIXTURE_EXAMPLE_SHAPE', 'BR2.7', 'OpenAPI response examples must be a nonempty map');
          }
          for (const [name, example] of Object.entries(named)) {
            if (!/^[A-Za-z][A-Za-z0-9_.-]{0,95}$/.test(name) || !object(example) ||
                !Object.hasOwn(example, 'value') || Object.hasOwn(example, 'externalValue')) {
              fail('FIXTURE_EXAMPLE_SHAPE', 'BR2.7', 'OpenAPI response example must have a named inline value');
            }
            add(`${element}:${name}`, fixtureElement, example.value, true);
          }
        }
      }
    }
  }
  return examples;
}

function fixtureBindable(entry, schemas, documents = new Map()) {
  if (entry.artifactKind === 'openapi') {
    const document = documents.get(entry.document);
    if (document === undefined) return true;
    return (object(document?.components?.schemas) && Object.keys(document.components.schemas).length > 0) ||
      openApiInlineResponseElements(document).length > 0;
  }
  return entry.artifactKind === 'schema' &&
    [...schemas.values()].some(item => item.entry === entry);
}

const ASYNCAPI_PAYLOAD_FORMAT = 'application/schema+json;version=draft-2020-12';
const MESSAGE_NAME = '[A-Za-z][A-Za-z0-9_.-]*';
const MESSAGE_ELEMENT = new RegExp(`^message:(${MESSAGE_NAME})(?::(${MESSAGE_NAME}))?$`);

/** Every channel/message identity in an AsyncAPI document, including repeated components on distinct routes. */
export function asyncApiMessageElements(document) {
  if (document?.asyncapi !== '3.0.0' || !object(document.channels)) {
    fail('FIXTURE_TARGET', 'BR2.8', 'AsyncAPI document has no channel inventory');
  }
  const elements = [];
  for (const [channelName, channel] of Object.entries(document.channels)) {
    if (!object(channel?.messages)) continue;
    for (const messageName of Object.keys(channel.messages)) {
      const element = `message:${channelName}:${messageName}`;
      if (!MESSAGE_ELEMENT.test(element)) {
        fail('FIXTURE_TARGET', 'BR2.8', 'AsyncAPI channel message name is unsupported');
      }
      elements.push(element);
    }
  }
  if (!elements.length) fail('FIXTURE_COVERAGE', 'BR2.7', 'AsyncAPI document has no payload messages to bind');
  return elements;
}

/** Bind one AsyncAPI channel message, with a channel-qualified name when reused. */
export function asyncApiFixtureSchema(document, element) {
  if (document?.asyncapi !== '3.0.0' || typeof element !== 'string') {
    fail('FIXTURE_TARGET', 'BR2.8', 'AsyncAPI fixture element is absent from its declared document');
  }
  const match = MESSAGE_ELEMENT.exec(element);
  if (!match) throw new ContractError('FIXTURE_TARGET', 'BR2.8', 'AsyncAPI fixture element must name a channel message');
  const matches = [];
  for (const [channelName, channel] of Object.entries(document.channels ?? {})) {
    if (!object(channel?.messages)) continue;
    for (const [messageName, message] of Object.entries(channel.messages)) {
      if ((match[2] ? channelName === match[1] && messageName === match[2] : messageName === match[1])) {
        matches.push(message);
      }
    }
  }
  if (matches.length > 1) fail('FIXTURE_TARGET_AMBIGUOUS', 'BR2.8', 'AsyncAPI message name needs its channel');
  if (matches.length !== 1) fail('FIXTURE_TARGET', 'BR2.8', 'AsyncAPI channel message is absent');
  let message = matches[0];
  if (object(message) && Object.hasOwn(message, '$ref')) {
    const reference = message.$ref;
    const component = typeof reference === 'string' &&
      /^#\/components\/messages\/([A-Za-z][A-Za-z0-9_.-]*)$/.exec(reference);
    if (Object.keys(message).length !== 1 || !component || !Object.hasOwn(document.components?.messages ?? {}, component[1])) {
      throw new ContractError('FIXTURE_REFERENCE', 'BR2.8', 'AsyncAPI message reference is outside local components');
    }
    message = document.components.messages[component[1]];
  }
  if (!object(message) || Object.hasOwn(message, '$ref') || !object(message.payload) ||
      message.payload.schemaFormat !== ASYNCAPI_PAYLOAD_FORMAT ||
      !object(message.payload.schema) ||
      Object.keys(message.payload).some(key => !['schemaFormat', 'schema'].includes(key))) {
    fail('FIXTURE_TARGET', 'BR2.8', 'AsyncAPI message payload has an unsupported schema shape');
  }
  const seen = new Set();
  const walk = value => {
    if (!value || typeof value !== 'object') return;
    if (seen.has(value)) fail('FIXTURE_CYCLE', 'BR2.8', 'AsyncAPI payload contains a cyclic alias');
    seen.add(value);
    for (const child of Object.values(value)) walk(child);
    seen.delete(value);
  };
  walk(message.payload.schema);
  if (message.payload.schema.$schema !== undefined && message.payload.schema.$schema !== DIALECTS.schema) {
    fail('DIALECT_CONFLICT', 'BR1.3', 'AsyncAPI payload must use JSON Schema 2020-12');
  }
  return { ...message.payload.schema, $schema: DIALECTS.schema };
}

/**
 * The exact schema an OpenAPI fixture is judged against. Exported so that
 * anything deriving a fixture payload compiles the same document the oracle
 * will: a looser rewrite accepts components the oracle refuses, and the
 * mismatch only surfaces as a container rejection much later.
 */
export function openApiFixtureSchema(document, element) {
  if (document?.openapi !== '3.1.2' || typeof element !== 'string') {
    fail('FIXTURE_TARGET', 'BR2.8', 'OpenAPI fixture element is absent from its declared document');
  }
  const components = document.components?.schemas ?? {};
  let inlineResponse;
  if (!Object.hasOwn(components, element)) {
    const match = /^response:([A-Za-z][A-Za-z0-9]{0,96}):([1-5][0-9]{2}):(application-json|application-problem-json)$/.exec(element);
    if (match) {
      const mediaType = Object.keys(RESPONSE_MEDIA).find(type => RESPONSE_MEDIA[type] === match[3]);
      if (mediaType === undefined) {
        fail('FIXTURE_TARGET', 'BR2.8', 'OpenAPI response element has no supported media type');
      }
      for (const pathItem of Object.values(document.paths ?? {})) {
        if (!object(pathItem)) continue;
        for (const operation of Object.values(pathItem)) {
          if (object(operation) && operation.operationId === match[1]) {
            if (inlineResponse !== undefined) {
              fail('FIXTURE_TARGET_AMBIGUOUS', 'BR2.8', 'Two OpenAPI operations share one response element');
            }
            inlineResponse = operation.responses?.[match[2]]?.content?.[mediaType]?.schema;
          }
        }
      }
    }
    if (!object(inlineResponse)) {
      fail('FIXTURE_TARGET', 'BR2.8', 'OpenAPI fixture element is absent from its declared document');
    }
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
          if (!match || !Object.hasOwn(components, match[1])) {
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
    if (name === undefined) {
      fail('FIXTURE_TARGET', 'BR2.8', 'OpenAPI fixture target traversal is empty');
    }
    if (Object.hasOwn(definitions, name)) continue;
    definitions[name] = rewrite(name === element && inlineResponse ? inlineResponse : components[name], new Set());
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
  // Parse every document before the coverage check, because whether an OpenAPI
  // document can carry a fixture at all is decided by the components it
  // declares, and that has to be known before the pair rule is applied.
  const documents = new Map();
  for (const entry of loaded.entries.filter(item => DOCUMENT_FIXTURE_KINDS.includes(item.artifactKind))) {
    const bytes = await read(entry);
    try {
      const parsed = YAML.parseDocument(bytes, { uniqueKeys: true, strict: true });
      if (parsed.errors.length) throw parsed.errors[0];
      documents.set(entry.document, parsed.toJS());
    } catch { fail('SOURCE_PARSE', 'BR2.7', 'A canonical API document is malformed'); }
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
      // Preserve legacy partial samples with document-only AsyncAPI validation.
      // A full C01-C27 catalogue cannot use that exemption, and once a partial
      // package opts into one AsyncAPI revision it must cover every message in
      // that document, including repeated components on distinct channels.
      const completeCatalogue = Array.isArray(loaded.boundaryIds) &&
        ALL_BOUNDARIES.every(id => loaded.boundaryIds.includes(id));
      const bindable = canonical.filter(item => fixtureBindable(item, schemas, documents) ||
        (item.artifactKind === 'asyncapi' && (completeCatalogue || fixtures.some(fixture =>
          resolveFixtureTarget(fixture, loaded, schemas) === item))));
      for (const target of bindable) {
        const elements = target.artifactKind === 'asyncapi'
          ? asyncApiMessageElements(documents.get(target.document)) : [null];
        for (const element of elements) {
          const scenarios = fixtures.filter(fixture => fixture?.boundaryIds?.includes(boundaryId) &&
            resolveFixtureTarget(fixture, loaded, schemas) === target &&
            (element === null || fixture.contractElementId === element));
          if (!scenarios.some(fixture => fixture.scenarioType === 'valid' && fixture.expectedOutcome === 'pass') ||
              !scenarios.some(fixture => fixture.scenarioType === 'invalid' && fixture.expectedOutcome === 'fail')) {
            fail('FIXTURE_COVERAGE', 'BR2.7', 'A claimed canonical message lacks positive and negative fixtures');
          }
        }
      }
    }
  }
  const allFixtures = sidecars.flatMap(sidecar => sidecar.fixtures);
  for (const entry of loaded.entries.filter(item => item.artifactKind === 'openapi')) {
    for (const example of openApiNamedExamples(documents.get(entry.document), entry.document)) {
      const matches = allFixtures.filter(fixture => fixture?.canonicalExampleId === example.id &&
        fixture?.documentRevisionId === entry.revisionId && fixture?.contractElementId === example.element);
      if (matches.length !== 1 || !isDeepStrictEqual(matches[0].payload, example.payload) ||
          matches[0].expectedOutcome !== (example.expectedValid ? 'pass' : 'fail') ||
          (example.expectedFailures !== undefined && !isDeepStrictEqual(matches[0].expectedFailures, example.expectedFailures))) {
        fail('FIXTURE_EXAMPLE_COVERAGE', 'BR2.7', 'A canonical OpenAPI example lacks its exact revision-bound fixture');
      }
    }
  }
  for (const fixture of allFixtures.filter(item => item?.canonicalExampleId !== undefined)) {
    const target = resolveFixtureTarget(fixture, loaded, schemas);
    if (target?.artifactKind !== 'openapi' ||
        !openApiNamedExamples(documents.get(target.document), target.document)
          .some(example => example.id === fixture.canonicalExampleId && example.element === fixture.contractElementId)) {
      fail('FIXTURE_EXAMPLE_COVERAGE', 'BR2.7', 'A fixture claims an absent canonical OpenAPI example');
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
        } catch { fail('FIXTURE_TARGET', 'BR2.8', 'Fixture API document is malformed'); }
        if (target.artifactKind === 'asyncapi') {
          const payload = asyncApiFixtureSchema(document, fixture.contractElementId);
          // The verified snapshot rewrites external references to relative
          // package paths. Give the extracted schema the canonical document's
          // base URI so Ajv resolves those paths to the same digest-checked
          // registry identities as the pinned standards validator.
          validationSchema = payload.$id ? payload :
            { ...payload, $id: `https://contracts.stocksense.local/${target.document}` };
        } else validationSchema = openApiFixtureSchema(document, fixture.contractElementId);
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
