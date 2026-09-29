import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import YAML from 'yaml';
import { ContractError } from './package-loader.mjs';

export const DIALECTS = Object.freeze({
  openapi: 'openapi:3.1.2',
  asyncapi: 'asyncapi:3.0.0',
  schema: 'https://json-schema.org/draft/2020-12/schema',
  typedPort: 'typed-port:1',
  governedRecord: 'governed-record:1'
});
export const C07_PORT_PATH = 'model-lifecycle/v1/finalize-heavy-work.shared-schema.yaml';
export const C07_PORT_NAME = 'model_lifecycle.finalize_heavy_work_v1';
const C07_REQUIRED_ARGUMENTS = ['callerService', 'retailerId', 'workType', 'requestId', 'leaseId', 'workerId',
  'fencingToken', 'placementGeneration', 'recoveryGeneration', 'resultDigest', 'operationId',
  'idempotencyKey', 'expectedOwnerVersion'];
const C07_BATCH_ARGUMENTS = ['forecastRunId', 'forecastAttemptId', 'forecastRoutePinId'];
const C07_REQUIRED_RESULTS = ['disposition', 'terminalResultId', 'resultDigest', 'closedPinId', 'pinClosureDisposition'];

const fail = (code, rule, message) => { throw new ContractError(code, rule, message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const string = value => typeof value === 'string' && value.trim().length > 0;
const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const redoclyBin = resolve(packageRoot, 'node_modules/@redocly/cli/bin/cli.js');
const asyncapiBin = resolve(packageRoot, 'node_modules/@asyncapi/cli/bin/run_bin');

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
  for (const field of ['kind', 'owner', 'store', 'cas', 'key', 'fields', 'states', 'digest', 'revision', 'rules', 'fixtures']) {
    if (source[field] === undefined || source[field] === null ||
        (typeof source[field] === 'string' && !source[field].trim())) {
      fail('GOVERNED_RECORD_SHAPE', 'BR1.3', `Governed record lacks ${field}`);
    }
  }
}

export function createSchemaValidator(schema) {
  if (!object(schema) || schema.$schema !== DIALECTS.schema) fail('DIALECT_CONFLICT', 'BR1.3', 'Expected JSON Schema 2020-12');
  const ajv = new Ajv2020({ strict: true, allErrors: true, validateFormats: true });
  addFormats(ajv);
  try { return ajv.compile(schema); }
  catch { fail('SCHEMA_INVALID', 'NFR8.4', 'JSON Schema does not compile with the pinned 2020-12 validator'); }
}

function runPinnedTool(dialect, sourcePath) {
  const [binary, args] = dialect === DIALECTS.openapi
    ? [redoclyBin, ['lint', sourcePath, '--format', 'json']]
    : [asyncapiBin, ['validate', sourcePath]];
  const result = spawnSync(process.execPath, [binary, ...args], {
    cwd: packageRoot, encoding: 'utf8', timeout: 120_000, maxBuffer: 1024 * 1024,
    env: { ...process.env, NO_UPDATE_NOTIFIER: '1' }
  });
  if (result.error || result.status !== 0) fail('STANDARDS_VALIDATION', dialect === DIALECTS.openapi ? 'NFR8.5' : 'NFR8.6',
    'Pinned standards validator rejected the canonical document');
}

/** Validate one already load-checked package entry at its exact file path. */
export async function validateCanonical(entry, sourcePath, { policy, runTool = runPinnedTool } = {}) {
  const bytes = await readFile(sourcePath);
  const { dialect, source } = detectDialect(entry, bytes, policy);
  if (dialect === DIALECTS.schema) createSchemaValidator(source);
  else if (dialect === DIALECTS.typedPort) validateTypedPort(source, entry);
  else if (dialect === DIALECTS.governedRecord) validateGovernedRecord(source);
  else await runTool(dialect, sourcePath);
  return { dialect, revisionId: entry.revisionId, valid: true };
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
  if (!entry || (documentRevisionId && !['openapi', 'asyncapi'].includes(entry.artifactKind)) ||
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
    if (fixture.expectedFailureCode !== undefined || fixture.expectedFailureRuleId !== undefined || findings.length) {
      fail('FIXTURE_UNEXPECTED_FAILURE', 'BR2.3', 'Positive fixture has an oracle or observed finding');
    }
    return true;
  }
  if (!string(fixture.expectedFailureCode) || !string(fixture.expectedFailureRuleId)) {
    fail('FIXTURE_ORACLE_MISSING', 'NFR8.13', 'Negative fixture needs a code and rule');
  }
  if (!findings.some(finding => finding.findingCode === fixture.expectedFailureCode &&
      finding.ruleId === fixture.expectedFailureRuleId && finding.revisionId === revisionId &&
      finding.contractElementId === fixture.contractElementId)) {
    fail('FIXTURE_ORACLE_MISMATCH', 'NFR8.13', 'No finding matches the declared code, rule, revision and element');
  }
  return true;
}
