import { readFile } from 'node:fs/promises';
import Ajv2020Module from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';
import YAML from 'yaml';
import { isDeepStrictEqual } from 'node:util';
import { ContractError } from './package-loader.mjs';

// ajv and ajv-formats are CommonJS. Node's interop hands back the callable
// default at runtime; the casts keep the type-checker aligned with that.
const Ajv2020 = /** @type {any} */ (Ajv2020Module);
const addFormats = /** @type {any} */ (addFormatsModule);

export const DIALECTS = Object.freeze({
  openapi: 'openapi:3.1.2',
  asyncapi: 'asyncapi:3.0.0',
  schema: 'https://json-schema.org/draft/2020-12/schema',
  typedPort: 'typed-port:1',
  inProcessPort: 'in-process-port:1',
  governedRecord: 'governed-record:1'
});
export const C08_PORT_PATH = 'retail-data/v1/inventory-operations.shared-schema.yaml';
export const C07_PORT_PATH = 'model-lifecycle/v1/finalize-heavy-work.shared-schema.yaml';
export const C07_PORT_NAME = 'model_lifecycle.finalize_heavy_work_v1';
export const SUPPLIER_HEAD_PATH = 'common/v1/supplier-authority-head.shared-schema.yaml';
const C07_REQUIRED_ARGUMENTS = ['callerService', 'retailerId', 'workType', 'requestId', 'leaseId', 'workerId',
  'fencingToken', 'placementGeneration', 'recoveryGeneration', 'resultDigest', 'operationId',
  'idempotencyKey', 'expectedOwnerVersion'];
const C07_BATCH_ARGUMENTS = ['forecastRunId', 'forecastAttemptId', 'forecastRoutePinId'];
const C07_REQUIRED_RESULTS = ['disposition', 'terminalResultId', 'resultDigest', 'closedPinId', 'pinClosureDisposition'];

const fail = (code, rule, message) => { throw new ContractError(code, rule, message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const string = value => typeof value === 'string' && value.trim().length > 0;

function parseSource(bytes, path) {
  const source = Buffer.isBuffer(bytes) ? bytes.toString('utf8') : bytes;
  if (typeof source !== 'string') fail('SOURCE_PARSE', 'BR1.3', 'Canonical source must be text');
  try {
    if (path.endsWith('.json')) return JSON.parse(source);
    if (path.endsWith('.yaml') || path.endsWith('.yml')) {
      const document = YAML.parseDocument(source, { uniqueKeys: true, strict: true });
      if (document.errors.length) throw document.errors[0];
      return document.toJS();
    }
  } catch {
    fail('SOURCE_PARSE', 'BR1.3', 'Canonical source cannot be parsed');
  }
  fail('SOURCE_FORMAT', 'BR1.3', 'Canonical source requires JSON or YAML');
}

function schemaDialect(entry, source, policy) {
  const path = entry.document;
  if (source.kind === 'in-process-port' && path !== C08_PORT_PATH) {
    fail('C08_PATH', 'BR1.3', 'C08 in-process port requires its canonical path');
  }
  if (path === C08_PORT_PATH) {
    if (entry.artifactKind !== 'schema' || !entry.boundaryIds?.includes('C08') ||
        (entry.schemaDialect && entry.schemaDialect !== DIALECTS.inProcessPort) ||
        source.kind !== 'in-process-port' || source.$schema || source.dialect) {
      fail('C08_DISPATCH', 'BR1.3', 'C08 in-process port conflicts with its fixed boundary');
    }
    return DIALECTS.inProcessPort;
  }
  if (source.kind === 'vault-kv-authority-head' && path !== SUPPLIER_HEAD_PATH) {
    fail('SUPPLIER_HEAD_PATH', 'BR1.3', 'Supplier authority head requires the fixed path');
  }
  if (path === SUPPLIER_HEAD_PATH) {
    if (entry.artifactKind !== 'schema' || !['C05', 'C09'].every(id => entry.boundaryIds?.includes(id) &&
        policy?.requiredCanonicalPaths?.[id]?.includes(SUPPLIER_HEAD_PATH)) ||
        (entry.schemaDialect && ![DIALECTS.governedRecord, 'urn:stocksense:dialect:governed-record:1'].includes(entry.schemaDialect)) ||
        source.kind !== 'vault-kv-authority-head' || source.$schema || source.dialect) {
      fail('SUPPLIER_HEAD_DISPATCH', 'BR1.3', 'Supplier authority head conflicts with its fixed governed-record boundary');
    }
    return DIALECTS.governedRecord;
  }
  const isC07Path = path === C07_PORT_PATH;
  const isC07PortClaim = entry.boundaryIds?.includes('C07') &&
    (path.endsWith('/finalize-heavy-work.shared-schema.yaml') || entry.schemaDialect === DIALECTS.typedPort || entry.schemaDialect === 'urn:stocksense:dialect:typed-port:1');
  if (isC07PortClaim && !isC07Path) fail('C07_PATH', 'NFR8.14', 'C07 typed port requires the fixed path');
  if (isC07Path) {
    if (entry.artifactKind !== 'schema' || !entry.boundaryIds?.includes('C07') ||
        policy?.requiredCanonicalPaths?.C07?.includes(C07_PORT_PATH) !== true ||
        (entry.schemaDialect && ![DIALECTS.typedPort, 'urn:stocksense:dialect:typed-port:1'].includes(entry.schemaDialect))) {
      fail('C07_DISPATCH', 'NFR8.14', 'C07 policy, kind or dialect conflicts with the fixed typed port');
    }
    // Select the validator from the exact manifest path before parsing the bytes.
    return DIALECTS.typedPort;
  }
  const declared = entry.schemaDialect ?? source.dialect ??
    (source.kind === 'typed-port' ? DIALECTS.typedPort :
      source.kind === 'governed-record' ? DIALECTS.governedRecord : undefined);
  if (declared === DIALECTS.typedPort || declared === 'urn:stocksense:dialect:typed-port:1') {
    if (source.$schema || (source.dialect && source.dialect !== declared) ||
        ['json-schema', 'governed-record'].includes(source.kind)) fail('DIALECT_CONFLICT', 'BR1.3', 'Typed port has conflicting dialect markers');
    return DIALECTS.typedPort;
  }
  if (declared === DIALECTS.governedRecord || declared === 'urn:stocksense:dialect:governed-record:1') {
    if (source.$schema || (source.dialect && source.dialect !== declared) ||
        ['json-schema', 'typed-port'].includes(source.kind)) fail('DIALECT_CONFLICT', 'BR1.3', 'Governed record has conflicting dialect markers');
    return DIALECTS.governedRecord;
  }
  if (declared && declared !== DIALECTS.schema) fail('DIALECT_UNSUPPORTED', 'BR1.3', 'Unsupported schema dialect');
  if (source.$schema !== DIALECTS.schema || (declared && declared !== source.$schema) || source.dialect) {
    fail('DIALECT_CONFLICT', 'BR1.3', 'JSON Schema must declare only the 2020-12 dialect');
  }
  return DIALECTS.schema;
}

/** The manifest kind and fixed C07 path decide dispatch; parser failures never trigger another dialect. */
export function detectDialect(entry, bytes, policy) {
  if (!object(entry) || !string(entry.document)) fail('DIALECT_ENTRY', 'BR1.3', 'Canonical entry is missing its path');
  const kind = entry.artifactKind;
  if (!['openapi', 'asyncapi', 'schema'].includes(kind)) fail('DIALECT_KIND', 'BR1.3', 'Unsupported canonical kind');
  if (entry.document === C08_PORT_PATH && kind !== 'schema') {
    fail('C08_DISPATCH', 'BR1.3', 'C08 fixed path must use the in-process schema kind');
  }
  if (entry.document === C07_PORT_PATH && kind !== 'schema') {
    fail('C07_DISPATCH', 'NFR8.14', 'C07 fixed path must be a schema-kind typed port');
  }
  if (kind === 'schema' && entry.boundaryIds?.includes('C07') && entry.document !== C07_PORT_PATH &&
      (entry.document.endsWith('/finalize-heavy-work.shared-schema.yaml') ||
        [DIALECTS.typedPort, 'urn:stocksense:dialect:typed-port:1'].includes(entry.schemaDialect))) {
    fail('C07_PATH', 'NFR8.14', 'C07 typed port requires the fixed path');
  }
  if (kind === 'schema' && entry.document === C07_PORT_PATH) {
    // Enforce policy and select typed-port before YAML/JSON parsing.
    const dialect = schemaDialect(entry, {}, policy);
    const source = parseSource(bytes, entry.document);
    if (!object(source) || source.$schema || source.dialect ||
        ['json-schema', 'governed-record'].includes(source.kind) ||
        (source.port && source.port !== C07_PORT_NAME)) {
      fail('C07_DISPATCH', 'NFR8.14', 'C07 bytes conflict with typed-port dispatch');
    }
    return { dialect, source };
  }
  const source = parseSource(bytes, entry.document);
  if (!object(source)) fail('SOURCE_SHAPE', 'BR1.3', 'Canonical document must be an object');
  if (kind === 'openapi') {
    if (source.openapi !== '3.1.2' || source.asyncapi || source.$schema || source.dialect || entry.schemaDialect) {
      fail('DIALECT_CONFLICT', 'BR1.3', 'OpenAPI document must declare 3.1.2 only');
    }
    return { dialect: DIALECTS.openapi, source };
  }
  if (kind === 'asyncapi') {
    if (source.asyncapi !== '3.0.0' || source.openapi || source.$schema || source.dialect || entry.schemaDialect) {
      fail('DIALECT_CONFLICT', 'BR1.3', 'AsyncAPI document must declare 3.0.0 only');
    }
    return { dialect: DIALECTS.asyncapi, source };
  }
  if (source.openapi || source.asyncapi) fail('DIALECT_CONFLICT', 'BR1.3', 'Schema bytes contain a document dialect');
  return { dialect: schemaDialect(entry, source, policy), source };
}

function validateTypedPort(source, entry) {
  if (!string(source.port) || !/_v[1-9][0-9]*$/.test(source.port) || !string(source.transaction) ||
      !Array.isArray(source.authorizedCallers) || !source.authorizedCallers.length ||
      source.authorizedCallers.some(caller => !string(caller)) ||
      !object(source.arguments) || !Array.isArray(source.arguments.required) ||
      !object(source.arguments.postgresTypes) || !object(source.result) ||
      !Array.isArray(source.result.required) || !object(source.result.postgresTypes) ||
      !Array.isArray(source.conflicts) || !source.conflicts.length || !string(source.locking)) {
    fail('TYPED_PORT_SHAPE', 'BR1.3', 'Typed port signature is incomplete');
  }
  if (entry.document === C07_PORT_PATH && (source.port !== C07_PORT_NAME ||
      source.authorizedCallers.length !== 1 || source.authorizedCallers[0] !== 'forecasting-service' ||
      !string(source.ownerCommit) || !source.transaction.includes('caller-owned'))) {
    fail('C07_PORT_NAME', 'NFR8.14', 'C07 typed port name or version is invalid');
  }
  if (entry.document === C07_PORT_PATH) {
    const hasFields = (names, required, types) => names.every(name => required.includes(name) && string(types[name]));
    if (!hasFields(C07_REQUIRED_ARGUMENTS, source.arguments.required, source.arguments.postgresTypes) ||
        !hasFields(C07_BATCH_ARGUMENTS, source.arguments.conditionalRequiredForBatchForecast ?? [], source.arguments.postgresTypes) ||
        C07_BATCH_ARGUMENTS.some(name => !source.arguments.forbiddenForOtherWorkTypes?.includes(name)) ||
        !hasFields(C07_REQUIRED_RESULTS, source.result.required, source.result.postgresTypes) ||
        !source.result.disposition?.includes('finalized') || !source.result.disposition.includes('idempotent-replay') ||
        !source.result.pinClosureDisposition?.includes('already-closed')) {
      fail('C07_PORT_SHAPE', 'NFR8.14', 'C07 finalizer signature is incomplete');
    }
  }
}

function validateGovernedRecord(source) {
  if (source.kind === 'vault-kv-authority-head') {
    const requiredFields = ['schemaVersion', 'retailerId', 'productId', 'sourceVersion', 'acceptedTermVersion',
      'state', 'revocationEpoch', 'placementGeneration', 'recoveryGeneration', 'sourceMutationId', 'updatedAt'];
    if (source.name !== 'SupplierSelectionAuthorityHead' || source.owner !== 'U5 Supplier Knowledge' ||
        source.store !== 'existing-in-cluster-vault-kv-v2' || source.casRequired !== true ||
        source.pathTemplate !== 'stocksense/supplier-authority/v1/{retailerId}/{productId}' ||
        !string(source.writerIdentity) || !string(source.readerIdentity) ||
        !string(source.authorityRevision) || !string(source.digest) ||
        !Array.isArray(source.key) || source.key.join(',') !== 'retailerId,productId' ||
        !Array.isArray(source.fields) || !requiredFields.every(field => source.fields.includes(field)) ||
        !Array.isArray(source.states) || source.states.join(',') !== 'updating,active' ||
        !Array.isArray(source.rules) || !source.rules.length ||
        !Array.isArray(source.fixtures) || !source.fixtures.length) {
      fail('SUPPLIER_HEAD_SHAPE', 'BR1.3', 'Fixed supplier authority head is incomplete');
    }
    return;
  }
  for (const field of ['kind', 'owner', 'store', 'cas', 'key', 'fields', 'states', 'digest', 'revision', 'rules', 'fixtures']) {
    if (source[field] === undefined || source[field] === null ||
        (typeof source[field] === 'string' && !source[field].trim())) {
      fail('GOVERNED_RECORD_SHAPE', 'BR1.3', `Governed record lacks ${field}`);
    }
  }
}

// C08 is a versioned, in-process transaction contract, not an HTTP or broker
// document. The v1 descriptor is deliberately closed: an added operation or a
// weakened receipt/transaction invariant requires a reviewed new version.
const C08_PORT_V1 = Object.freeze({
  kind: 'in-process-port',
  name: 'RetailOperationsInventoryPort',
  version: '1.0.0',
  deploymentBoundary: 'retail-operations-v1',
  transaction: {
    owner: 'planning-purchasing-command-handler',
    database: 'shared-postgresql-instance',
    atomicEffects: ['purchasing-state-and-idempotency-result', 'inventory-inbound-commitment',
      'stock-movement-on-receipt', 'authoritative-audit-and-outbox'],
    crossSchemaSql: 'prohibited'
  },
  operations: {
    getInventorySnapshot: {
      input: ['retailerId', 'placementGeneration', 'asOf'],
      output: ['inventoryVersion', 'movementWatermark', 'positions', 'datedInboundCommitments']
    },
    createApprovedCommitments: {
      input: ['retailerId', 'orderId', 'expectedOrderVersion', 'approvedLines'],
      invariant: 'all-lines-or-none'
    },
    cancelOpenCommitments: {
      input: ['retailerId', 'orderId', 'expectedOrderVersion'],
      invariant: 'rejected-after-any-receipt'
    },
    recordReceipt: {
      input: ['retailerId', 'orderId', 'expectedOrderVersion', 'idempotencyKey', 'receiptLines'],
      invariant: 'cumulative-receipts-never-exceed-approved-quantity'
    }
  },
  errors: {
    'stale-authority': 'forbidden',
    'stale-placement-generation': 'conflict',
    'stale-order-version': 'conflict',
    'idempotency-hash-mismatch': 'conflict',
    'over-receipt': 'conflict',
    'validation-failed': 'unprocessable'
  }
});

function validateInProcessPort(source) {
  if (!isDeepStrictEqual(source, C08_PORT_V1)) {
    fail('C08_PORT_SHAPE', 'BR1.3', 'C08 v1 in-process port differs from its closed transaction contract');
  }
}

/**
 * The approved `x-` specification extensions. OpenAPI reserves these for
 * implementations and requires that they never make a document invalid, so
 * they are permitted by name.
 *
 * This was previously a walk that registered every key beginning `x-`, which
 * made the gate "starts with x-" rather than "is approved": a newly invented or
 * mistyped extension was accepted silently, and the only signal that a
 * governance-bearing key existed at all - Ajv's unknown-keyword refusal - was
 * removed. The independent architecture review raised that as a weakening of
 * NFR8.4, correctly.
 *
 * Permitting a name here means the validator ignores it, nothing more. None of
 * these is enforced by U1 today: several carry real constraints, and
 * `x-stocksense-kind-limits` in particular declares per-kind import byte and
 * row limits that no code reads. Whether each should be enforced, or recorded
 * as an explicit traceability gap, is an open owner decision - not something
 * this allowlist settles.
 */
const APPROVED_EXTENSIONS = Object.freeze([
  'x-contract-fixtures',
  'x-contract-owner',
  'x-contract-package',
  'x-contract-protocol-version',
  'x-stocksense-claims',
  'x-stocksense-conformance',
  'x-stocksense-delivery',
  'x-stocksense-kind-limits',
  'x-stocksense-max-bytes',
  'x-stocksense-recovery'
]);

/**
 * @param {any} schema
 * @param {Map<string, any>} [references]
 * @param {{ openApiComponents?: boolean }} [options] compile an OpenAPI
 *   component rather than a standalone schema document.
 */
export function createSchemaValidator(schema, references = new Map(), { openApiComponents = false } = {}) {
  if (!object(schema) || schema.$schema !== DIALECTS.schema) fail('DIALECT_CONFLICT', 'BR1.3', 'Expected JSON Schema 2020-12');
  // An OpenAPI component is not a standalone schema document and must not be
  // compiled as though it were. Its components legitimately carry `x-`
  // extensions; they routinely use `minItems` or `items` with no sibling
  // `type`; and they require a name inside a conditional branch without
  // redeclaring it there, which is the idiom this whole catalogue uses for a
  // discriminator that pins dependent fields.
  //
  // All three are lint rules rather than validation rules, so relaxing them
  // changes no instance outcome: the conditional `required` is enforced exactly
  // as before. Declaring those names in the source instead was tried and
  // reverted - it let the pinned differ enumerate required properties its model
  // had never seen and report them as breaking, so a cosmetic edit became a
  // compatibility event. Schema documents keep strict mode in full.
  const ajv = new Ajv2020({ strict: true, allErrors: true, validateFormats: true,
    ...(openApiComponents ? { strictTypes: false, strictRequired: false } : {}) });
  addFormats(ajv);
  try {
    // Only the approved names. An unlisted `x-` key is left unknown, so Ajv
    // refuses it and the operator sees which key it was.
    if (openApiComponents) ajv.addVocabulary([...APPROVED_EXTENSIONS]);
    for (const [identity, reference] of references) {
      if (identity !== schema.$id) ajv.addSchema(reference);
    }
    return ajv.compile(schema);
  }
  catch (error) {
    // Carry the compiler's reason, not just the code. Discarding it meant a
    // strict-mode refusal - an unapproved `x-` keyword, a `required` name the
    // branch does not declare - was invisible without a hand-written probe.
    // The message is bounded and collapsed because it comes from a tool, and
    // the diagnostics sanitiser cleans it again before anything is published.
    const reason = String(error?.message ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
    fail('SCHEMA_INVALID', 'NFR8.4',
      `JSON Schema does not compile with the pinned 2020-12 validator${reason ? `: ${reason}` : ''}`);
  }
}

/**
 * Validate one already load-checked package entry at its exact file path.
 * @param {any} entry
 * @param {string} sourcePath
 * @param {{ policy?: object, runTool?: Function }} [options]
 */
export async function validateCanonical(entry, sourcePath, { policy, runTool } = {}) {
  const bytes = await readFile(sourcePath);
  const { dialect, source } = detectDialect(entry, bytes, policy);
  if (dialect === DIALECTS.typedPort) validateTypedPort(source, entry);
  else if (dialect === DIALECTS.inProcessPort) validateInProcessPort(source);
  else if (dialect === DIALECTS.governedRecord) validateGovernedRecord(source);
  else {
    if (typeof runTool === 'function') {
      await runTool(dialect, sourcePath);
      if (dialect === DIALECTS.asyncapi) await runTool('asyncapi-payloads:2020-12', sourcePath);
    } else fail('STANDARDS_ENGINE', 'NFR6.2', 'Isolated standards validator is required');
  }
  return { dialect, revisionId: entry.revisionId, valid: true };
}

/**
 * The canonical kinds a fixture may name through documentRevisionId. This is
 * exactly the set the fixture oracle has a payload extractor for: advertising
 * a kind it cannot load let a package declare coverage the oracle could never
 * check. AsyncAPI documents are validated as documents by the pinned standards
 * runner, not by payload fixtures.
 */
export const DOCUMENT_FIXTURE_KINDS = Object.freeze(['openapi']);

const POINTER = /^\/(?:[^~]|~[01])*(?:\/(?:[^~]|~[01])*)*$/;

/**
 * The findings a negative fixture declares, as a set of exact locations.
 *
 * A composite keyword such as oneOf legitimately reports several errors at
 * once, so requiring exactly one observed finding made those rules
 * inexpressible rather than merely strict. The invariant that actually matters
 * is set equality: every declared finding observed, and no undeclared finding
 * observed. The single-field form stays the one-element case of it.
 */
const failureKey = (code, ruleId, path, trigger) =>
  `${code}\u0000${ruleId}\u0000${path}\u0000${trigger ?? ''}`;

function declaredFailures(fixture) {
  const setForm = fixture.expectedFailures !== undefined;
  // Gating the mixing guard on Array.isArray let a non-array expectedFailures
  // fall through to the single-field branch and be silently discarded. Nothing
  // else checks a fixture sidecar's shape, so the refusal has to be here.
  if (setForm && !Array.isArray(fixture.expectedFailures)) {
    fail('FIXTURE_ORACLE_MISSING', 'NFR8.13', 'expectedFailures must be an array of declared findings');
  }
  const rows = setForm ? fixture.expectedFailures :
    [{ code: fixture.expectedFailureCode, ruleId: fixture.expectedFailureRuleId,
      path: fixture.expectedFailurePath, trigger: fixture.expectedFailureTrigger }];
  if (setForm && (!rows.length || fixture.expectedFailureCode !== undefined ||
      fixture.expectedFailureRuleId !== undefined || fixture.expectedFailurePath !== undefined ||
      fixture.expectedFailureTrigger !== undefined)) {
    fail('FIXTURE_ORACLE_MISSING', 'NFR8.13', 'Declare a negative oracle either as single fields or as expectedFailures, not both');
  }
  for (const row of rows) {
    if (!object(row) || !string(row.code) || !string(row.ruleId) || typeof row.path !== 'string' ||
        (row.path !== '' && !POINTER.test(row.path)) ||
        (row.trigger !== undefined && typeof row.trigger !== 'string')) {
      fail('FIXTURE_ORACLE_MISSING', 'NFR8.13', 'Negative fixture needs a code, rule and JSON-pointer failure path');
    }
  }
  const keys = rows.map(row => failureKey(row.code, row.ruleId, row.path, row.trigger));
  if (new Set(keys).size !== keys.length) {
    fail('FIXTURE_ORACLE_MISSING', 'NFR8.13', 'A negative fixture declares the same finding twice');
  }
  return new Set(keys);
}

/** An invalid fixture succeeds only for the declared finding on its immutable target. */
export function assertFixtureOracle(fixture, findings, entries) {
  if (!object(fixture) || !Array.isArray(findings) || !Array.isArray(entries) || !string(fixture.contractElementId)) {
    fail('FIXTURE_SHAPE', 'BR2.3', 'Fixture, findings or element is invalid');
  }
  const { documentRevisionId, schemaRevisionId } = fixture;
  if (Boolean(documentRevisionId) === Boolean(schemaRevisionId)) fail('FIXTURE_TARGET', 'BR2.3', 'Exactly one immutable target is required');
  const revisionId = documentRevisionId ?? schemaRevisionId;
  const entry = entries.find(item => item.revisionId === revisionId);
  if (!entry || (documentRevisionId && !DOCUMENT_FIXTURE_KINDS.includes(entry.artifactKind)) ||
      (schemaRevisionId && entry.artifactKind !== 'schema') || !Array.isArray(fixture.boundaryIds) ||
      !fixture.boundaryIds.length || fixture.boundaryIds.some(id => !entry.boundaryIds?.includes(id))) {
    fail('FIXTURE_TARGET', 'BR2.3', 'Fixture target is absent, wrong kind or outside its boundary');
  }
  if (!['valid', 'invalid', 'compatibility'].includes(fixture.scenarioType) ||
      !['pass', 'fail'].includes(fixture.expectedOutcome) ||
      (fixture.scenarioType === 'valid' && fixture.expectedOutcome !== 'pass') ||
      (fixture.scenarioType === 'invalid' && fixture.expectedOutcome !== 'fail')) {
    fail('FIXTURE_SHAPE', 'BR2.3', 'Fixture scenario and outcome conflict');
  }
  if (fixture.expectedOutcome === 'pass') {
    if (fixture.expectedFailureCode !== undefined || fixture.expectedFailureRuleId !== undefined ||
        fixture.expectedFailurePath !== undefined || fixture.expectedFailureTrigger !== undefined ||
        fixture.expectedFailures !== undefined || findings.length) {
      fail('FIXTURE_UNEXPECTED_FAILURE', 'BR2.3', 'Positive fixture has an oracle or observed finding');
    }
    return true;
  }
  const declared = declaredFailures(fixture);
  // Every observed finding must sit on the fixture's own target and element,
  // so a violation elsewhere can never be mistaken for the declared one.
  if (findings.some(finding => finding.revisionId !== revisionId ||
      finding.contractElementId !== fixture.contractElementId)) {
    fail('FIXTURE_ORACLE_MISMATCH', 'NFR8.13', 'Findings must exactly match the declared code, rule, revision, element and location');
  }
  const observed = new Set(findings.map(finding =>
    failureKey(finding.findingCode, finding.ruleId, finding.instancePath, finding.dependencyTrigger)));
  if (observed.size !== declared.size || [...declared].some(key => !observed.has(key))) {
    fail('FIXTURE_ORACLE_MISMATCH', 'NFR8.13', 'Findings must exactly match the declared code, rule, revision, element and location');
  }
  return true;
}
