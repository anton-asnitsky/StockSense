import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import YAML from 'yaml';
import { ALL_BOUNDARIES, BOUNDARY_SIDECARS, CANONICAL_KINDS, FIXED_PATHS,
  ContractError, deriveIdentity, digest } from './package-loader.mjs';
import { buildSourceInventory } from './catalogue.mjs';
import { DIALECTS, createSchemaValidator } from './validators.mjs';
import { asyncApiFixtureSchema, asyncApiMessageElements, mapSchemaFindings,
  openApiFixtureSchema, openApiInlineResponseElements } from './policy.mjs';
import { negativeCandidates, omitRequired, propertyPointer, synthesize } from './instance-synthesis.mjs';

const TENANT_ENVELOPE_ID = 'https://contracts.stocksense.local/common/v1/message-envelope.schema.json';

// Assemble the complete C01-C27 candidate package from the committed canonical
// sources. Until now only the thin C01/C18 walking skeleton was ever packaged,
// so every rule that is per-boundary or whole-catalogue - required kinds, fixed
// paths, per-boundary sidecars, the fixture pair rule, cross-document reference
// resolution and the resource bounds - had never been exercised against the
// real catalogue at once.
//
// Nothing here invents contract content. Canonical bytes are copied verbatim,
// the governed sidecars come from the committed profiles, and fixture payloads
// are derived from the canonical schemas and then verified by the same oracle
// that will judge them.

/** @returns {never} */
const fail = (code, rule, message) => { throw new ContractError(code, rule, message); };
const object = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const ownerKeyFor = kind => (kind === 'openapi' ? 'provider' : kind === 'asyncapi' ? 'producer' : 'owner');

// The governed sidecars that already exist as committed profiles. A sidecar is
// copied, never generated, so the package cannot claim a profile the repository
// does not hold.
const SIDECAR_SOURCES = Object.freeze({
  'protocol-compatibility-manifest': 'contracts/profiles/messaging-platform/v1/protocol-compatibility.profile.yaml',
  'messaging-conformance-profile': 'contracts/profiles/messaging-platform/v1/platform.profile.yaml',
  'recovery-policy': 'contracts/profiles/recovery-coordination/v1/recovery.policy.yaml'
});

const parseSource = (document, text) => (document.endsWith('.json')
  ? JSON.parse(text)
  : YAML.parse(text, { strict: true, uniqueKeys: true }));

/**
 * The single element a schema or OpenAPI document binds fixtures through: a
 * titled 2020-12 schema, or a component or inline JSON response. AsyncAPI
 * documents are expanded into every channel message by bindTargets below.
 */
function bindTarget(entry, source) {
  if (entry.artifactKind === 'schema') {
    if (source?.$schema !== DIALECTS.schema || typeof source.title !== 'string' || !source.title) return null;
    return { element: source.title, schema: source, root: source };
  }
  if (entry.artifactKind !== 'openapi') return null;
  const components = source?.components?.schemas;
  // Try each candidate element in declaration order, since a component may be
  // bindable while an earlier one refuses to compile or reaches outside the
  // component graph. The oracle's own builder decides, not a local rewrite.
  const reasons = [];
  for (const name of Object.keys(object(components) ? components : {})) {
    if (!Array.isArray(components[name]?.required) || !components[name].required.length) continue;
    try {
      const schema = openApiFixtureSchema(source, name);
      return { element: name, schema, root: schema };
    } catch (error) { reasons.push(`${name}: ${error.code ?? error.name}`); }
  }
  // Fall back to inline JSON responses for documents without a bindable
  // component. The operation/status/media-type identity is revision-bound.
  for (const element of openApiInlineResponseElements(source)) {
    try {
      const schema = openApiFixtureSchema(source, element);
      return { element, schema, root: schema };
    } catch (error) { reasons.push(`${element}: ${error.code ?? error.name}`); }
  }
  if (!object(components) || !Object.keys(components).length) {
    return reasons.length ? { element: null, reason: `no response binds (${reasons.slice(0, 3).join('; ')})` } : null;
  }
  if (!reasons.length) return { element: null, reason: 'declares no component with required properties' };
  return { element: null, reason: `no component binds (${reasons.slice(0, 3).join('; ')})` };
}

/** Return every fixture target in a document; AsyncAPI has one per channel message. */
function bindTargets(entry, source) {
  if (entry.artifactKind === 'asyncapi') {
    return asyncApiMessageElements(source).map(element => {
      const schema = asyncApiFixtureSchema(source, element);
      return { element, schema, root: schema };
    });
  }
  const target = bindTarget(entry, source);
  return target ? [target] : null;
}

// Only a top-level tenant envelope (possibly composed through allOf) gives
// the message its C01 fields. A nested data property is not an envelope.
function bindsTenantEnvelope(schema) {
  return schema?.$ref === TENANT_ENVELOPE_ID ||
    (Array.isArray(schema?.allOf) && schema.allOf.some(bindsTenantEnvelope));
}

/**
 * Derive verified fixtures for one canonical element. The positive is
 * synthesized from the schema; each negative is accepted only after the pinned
 * oracle rejects it with its declared finding. A document that cannot produce
 * its required fixtures is reported, never silently credited.
 */
export function fixturePair(entry, target, registry) {
  const refused = problem => ({ problem, fixtures: [] });
  const validate = createSchemaValidator(target.schema, registry,
    { openApiComponents: entry.artifactKind !== 'schema' });
  const positive = synthesize(target.schema, { root: target.root, registry });
  if (!validate(positive)) {
    return refused(`synthesized payload rejected at ${validate.errors?.[0]?.instancePath || '/'}`);
  }
  const subject = entry.artifactKind === 'openapi' ? target.schema.$defs[target.element] : target.schema;
  const negative = omitRequired(subject, positive, { root: target.root, registry });
  if (!negative) return refused('the bound element declares no required property to omit');
  if (validate(negative.payload)) return refused('the negative payload still satisfies the schema');
  const findings = mapSchemaFindings(validate.errors ?? [], {
    revisionId: entry.revisionId, contractElementId: target.element
  });
  if (findings.length !== 1 || findings[0].findingCode !== 'SCHEMA_REQUIRED' ||
      findings[0].ruleId !== 'BR2.4' || findings[0].instancePath !== negative.pointer) {
    return refused('the negative payload did not produce exactly its declared required finding');
  }

  // The image worker caps fixture IDs at 128 characters. Keep the full message
  // element readable while replacing the long document path with its owning
  // domain and a digest, so two documents under one owner cannot collide.
  const idParts = entry.artifactKind === 'asyncapi'
    ? [entry.document.split('/')[0], target.element, digest(Buffer.from(entry.document)).slice(7, 19)]
    : [entry.document];
  const slug = idParts.join('-').replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-|-$/g, '');
  const binding = entry.artifactKind === 'schema' ? {} : { documentRevisionId: entry.revisionId };
  // A negative declares its oracle either as single fields or as an
  // expectedFailures set, so the array holds both shapes.
  /** @type {Record<string, any>[]} */
  const fixtures = [
    { fixtureId: `${slug}-positive`, boundaryIds: [...entry.boundaryIds], contractElementId: target.element,
      ...binding, scenarioType: 'valid', expectedOutcome: 'pass', payload: positive },
    { fixtureId: `${slug}-negative`, boundaryIds: [...entry.boundaryIds], contractElementId: target.element,
      ...binding, scenarioType: 'invalid', expectedOutcome: 'fail',
      expectedFailureCode: 'SCHEMA_REQUIRED', expectedFailureRuleId: 'BR2.4',
      expectedFailurePath: negative.pointer, payload: negative.payload }
  ];

  if (entry.artifactKind === 'asyncapi' && bindsTenantEnvelope(target.schema)) {
    const required = registry.get(TENANT_ENVELOPE_ID)?.required;
    if (!Array.isArray(required) || !required.length || new Set(required).size !== required.length) {
      return refused('the canonical tenant envelope has no unique required-field set');
    }
    // A digest of both document and channel message keeps IDs short even for
    // the longest message name, while retaining a readable field suffix.
    const fieldSlug = `${entry.document.split('/')[0]}-${digest(Buffer.from(`${entry.document}:${target.element}`)).slice(7, 19)}`;
    for (const field of required) {
      if (typeof field !== 'string' || !Object.hasOwn(positive, field)) {
        return refused(`the positive tenant envelope does not carry required field ${String(field)}`);
      }
      const payload = { ...positive };
      delete payload[field];
      const path = propertyPointer(field);
      if (validate(payload)) return refused(`omitting tenant envelope field ${field} still satisfies the schema`);
      const findings = mapSchemaFindings(validate.errors ?? [], {
        revisionId: entry.revisionId, contractElementId: target.element
      });
      if (findings.length !== 1 || findings[0].findingCode !== 'SCHEMA_REQUIRED' ||
          findings[0].ruleId !== 'BR2.4' || findings[0].instancePath !== path) {
        return refused(`omitting tenant envelope field ${field} did not produce its exact required finding`);
      }
      fixtures.push({
        fixtureId: `${fieldSlug}-envelope-${field}`,
        boundaryIds: [...entry.boundaryIds], contractElementId: target.element,
        ...binding, scenarioType: 'invalid', expectedOutcome: 'fail',
        expectedFailureCode: 'SCHEMA_REQUIRED', expectedFailureRuleId: 'BR2.4',
        expectedFailurePath: path, payload
      });
    }
  }

  // Negatives that violate something other than `required`. Every one is put
  // through the same oracle and declared from the findings that oracle actually
  // produced, mapped by mapSchemaFindings - the same mapper that will judge it -
  // so a mutation which violates nothing, or which only trips `required` again,
  // is discarded rather than counted as boundary coverage.
  for (const candidate of negativeCandidates(subject, positive, { root: target.root, registry })) {
    if (validate(candidate.payload)) continue;
    const findings = mapSchemaFindings(validate.errors ?? [], {
      revisionId: entry.revisionId, contractElementId: target.element
    });
    if (!findings.length || findings.every(finding => finding.findingCode === 'SCHEMA_REQUIRED')) continue;
    fixtures.push({
      fixtureId: `${slug}-negative-${candidate.kind}`,
      boundaryIds: [...entry.boundaryIds],
      contractElementId: target.element,
      ...binding,
      scenarioType: 'invalid',
      expectedOutcome: 'fail',
      expectedFailures: findings.map(finding => ({
        code: finding.findingCode,
        ruleId: finding.ruleId,
        path: finding.instancePath,
        ...(finding.dependencyTrigger === undefined ? {} : { trigger: finding.dependencyTrigger })
      })),
      payload: candidate.payload
    });
  }
  return { problem: null, fixtures };
}

/**
 * Assemble the full candidate package under `outRoot`.
 * @param {string} repoRoot
 * @param {string} outRoot
 * @returns {Promise<{ manifest: any, problems: Array<{document: string, reason: string}>, bound: number, exempt: number }>}
 */
export async function buildFullPackage(repoRoot, outRoot, { allowIncomplete = false } = {}) {
  const inventory = await buildSourceInventory(repoRoot);
  const sourceRoot = join(repoRoot, 'contracts/source');

  // Identity first: a fixture binds an API document by revision, so the
  // revision has to be derived before any fixture can name it.
  const entries = inventory.entries.map(entry => ({
    ...entry,
    semanticVersion: '1.0.0',
    ...deriveIdentity(entry.artifactKind, entry.semanticOwner, entry.document, '1.0.0', entry.contentDigest)
  }));

  const sources = new Map();
  for (const entry of entries) {
    sources.set(entry.document, parseSource(entry.document, await readFile(join(sourceRoot, entry.document), 'utf8')));
  }

  // The cross-document registry the oracle itself builds, so a synthesized
  // payload resolves shared references exactly as validation will.
  const registry = new Map();
  for (const entry of entries.filter(item => item.artifactKind === 'schema')) {
    const source = sources.get(entry.document);
    if (source?.$schema === DIALECTS.schema && source.$id) {
      if (registry.has(source.$id)) fail('FULL_PACKAGE_IDENTITY', 'NFR8.4', 'Two canonical schemas share one identity');
      registry.set(source.$id, source);
    }
  }

  const fixtures = [];
  const problems = [];
  let bound = 0;
  let exempt = 0;
  for (const entry of entries) {
    let targets;
    try { targets = bindTargets(entry, sources.get(entry.document)); }
    catch (error) {
      problems.push({ document: entry.document, reason: `${error.code ?? error.name}: ${error.message}` });
      continue;
    }
    if (!targets) { exempt += 1; continue; }
    for (const target of targets) {
      if (!target.element) {
        problems.push({ document: entry.document,
          reason: ('reason' in target ? target.reason : undefined) ?? 'the document cannot bind a fixture' });
        continue;
      }
      let pair;
      try { pair = fixturePair(entry, target, registry); }
      catch (error) { pair = { problem: `${error.code ?? error.name}: ${error.message}`, fixtures: [] }; }
      if (pair.problem) {
        problems.push({ document: entry.document, reason: `${target.element}: ${pair.problem}` });
        continue;
      }
      fixtures.push(...pair.fixtures);
      bound += 1;
    }
  }

  // Write nothing if the package could not be complete: a partially assembled
  // package root invites a later run to validate a stale tree and read the
  // result as proof. `allowIncomplete` writes it anyway, so that the
  // validator's own refusal can be recorded as the evidence for why the full
  // catalogue is not yet packageable.
  if (problems.length && !allowIncomplete) return { manifest: null, problems, bound, exempt };

  for (const entry of entries) {
    const destination = join(outRoot, entry.document);
    await mkdir(dirname(destination), { recursive: true });
    await cp(join(sourceRoot, entry.document), destination);
  }

  const governance = join(outRoot, 'governance');
  await mkdir(governance, { recursive: true });
  const sidecars = [];
  const record = async (kind, name, bytes, boundaryIds) => {
    await writeFile(join(governance, name), bytes);
    sidecars.push({ kind, owner: 'U1 Contracts', boundaryIds, document: `governance/${name}`,
      semanticVersion: '1.0.0', contentDigest: digest(bytes), sourceRevision: inventory.sourceRevision });
  };

  const policy = {
    contractPackagePolicyVersion: '1.0.0',
    requiredBoundaryIds: [...ALL_BOUNDARIES],
    requiredCanonicalKinds: Object.fromEntries(Object.entries(CANONICAL_KINDS).map(([kind, ids]) => [kind, ids.split(' ')])),
    requiredCanonicalPaths: Object.fromEntries(Object.entries(FIXED_PATHS).map(([id, paths]) => [id, [...paths]])),
    requiredSidecarKinds: {
      candidateEveryBoundary: ['example-fixture'],
      releaseEveryBoundary: ['example-fixture', 'compatibility-assessment', 'validation-run', 'evidence-record'],
      candidateForCanonicalDocuments: ['generation-profile'],
      releaseForGeneratedConsumers: ['generated-output-manifest'],
      candidateByBoundary: Object.fromEntries(Object.entries(BOUNDARY_SIDECARS).map(([id, kind]) => [id, [kind]]))
    },
    // The whole catalogue is in scope now, and this is still a candidate: no
    // release claim is made here and none of the release-only sidecars exist.
    candidateScope: [...ALL_BOUNDARIES],
    releaseReady: false
  };
  await record('contract-package-policy', 'contract-package-policy.json',
    Buffer.from(JSON.stringify(policy, null, 2) + '\n'), [...ALL_BOUNDARIES]);

  await record('example-fixture', 'example-fixture.json',
    Buffer.from(JSON.stringify({ fixtureVersion: '1.1.0', syntheticOnly: true, fixtures }, null, 2) + '\n'),
    [...ALL_BOUNDARIES]);

  const profile = JSON.parse(await readFile(join(repoRoot,
    'contracts/samples/walking-skeleton/governance/generation-profile.json'), 'utf8'));
  await record('generation-profile', 'generation-profile.json',
    Buffer.from(JSON.stringify({ ...profile, sourceRevision: inventory.sourceRevision }, null, 2) + '\n'),
    [...ALL_BOUNDARIES]);

  for (const [kind, path] of Object.entries(SIDECAR_SOURCES)) {
    const boundaryIds = ALL_BOUNDARIES.filter(id => BOUNDARY_SIDECARS[id] === kind);
    if (!boundaryIds.length) continue;
    const name = path.split('/').pop();
    await record(kind, name, await readFile(join(repoRoot, path)), boundaryIds);
  }

  const canonicalOf = kind => entries.filter(entry => entry.artifactKind === kind).map(entry => ({
    [ownerKeyFor(kind)]: entry.semanticOwner,
    boundaryIds: [...entry.boundaryIds],
    document: entry.document,
    semanticVersion: entry.semanticVersion,
    contentDigest: entry.contentDigest
  }));

  const manifest = {
    packageVersion: '1.0.0',
    manifestStatus: 'candidate',
    sourceRevision: inventory.sourceRevision,
    openapi: canonicalOf('openapi'),
    asyncapi: canonicalOf('asyncapi'),
    schemas: canonicalOf('schema'),
    governedArtifacts: sidecars,
    boundaryCoverage: ALL_BOUNDARIES.map(boundaryId => ({
      boundaryId,
      canonicalDocuments: entries.filter(entry => entry.boundaryIds.includes(boundaryId)).map(entry => entry.document),
      sidecars: sidecars.filter(entry => entry.boundaryIds.includes(boundaryId)).map(entry => entry.document)
    }))
  };
  await writeFile(join(outRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return { manifest, problems, bound, exempt };
}
