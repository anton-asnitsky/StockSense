import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import YAML from 'yaml';
import { ALL_BOUNDARIES, BOUNDARY_SIDECARS, CANONICAL_KINDS, FIXED_PATHS,
  ContractError, deriveIdentity, digest } from './package-loader.mjs';
import { buildSourceInventory } from './catalogue.mjs';
import { DIALECTS, createSchemaValidator } from './validators.mjs';
import { mapSchemaFindings, openApiFixtureSchema } from './policy.mjs';
import { negativeCandidates, omitRequired, synthesize } from './instance-synthesis.mjs';

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
 * The element each canonical document binds fixtures through: a titled 2020-12
 * schema by its title, an OpenAPI document by a component that declares
 * required properties, since a negative fixture needs something to omit.
 */
function bindTarget(entry, source) {
  if (entry.artifactKind === 'schema') {
    if (source?.$schema !== DIALECTS.schema || typeof source.title !== 'string' || !source.title) return null;
    return { element: source.title, schema: source, root: source };
  }
  if (entry.artifactKind !== 'openapi') return null;
  const components = source?.components?.schemas;
  // Exempt by kind, exactly as the oracle derives it: a document that declares
  // no components carries no payload to bind, so it is not a problem to report.
  if (!object(components) || !Object.keys(components).length) return null;
  // Try each candidate element in declaration order, since a component may be
  // bindable while an earlier one refuses to compile or reaches outside the
  // component graph. The oracle's own builder decides, not a local rewrite.
  const reasons = [];
  for (const name of Object.keys(components)) {
    if (!Array.isArray(components[name]?.required) || !components[name].required.length) continue;
    try {
      const schema = openApiFixtureSchema(source, name);
      return { element: name, schema, root: schema };
    } catch (error) { reasons.push(`${name}: ${error.code ?? error.name}`); }
  }
  if (!reasons.length) return { element: null, reason: 'declares no component with required properties' };
  return { element: null, reason: `no component binds (${reasons.slice(0, 3).join('; ')})` };
}

/**
 * Derive a verified positive and negative fixture for one canonical document.
 * The positive is synthesized from the schema and validated by the pinned
 * oracle; the negative removes one required property, which the same oracle
 * must then reject for exactly that pointer. A document that cannot produce
 * both is reported, never silently credited.
 */
function fixturePair(entry, target, registry) {
  const refused = problem => ({ problem, fixtures: [] });
  const validate = createSchemaValidator(target.schema, registry,
    { openApiComponents: entry.artifactKind === 'openapi' });
  const positive = synthesize(target.schema, { root: target.root, registry });
  if (!validate(positive)) {
    return refused(`synthesized payload rejected at ${validate.errors?.[0]?.instancePath || '/'}`);
  }
  const subject = entry.artifactKind === 'openapi' ? target.schema.$defs[target.element] : target.schema;
  const negative = omitRequired(subject, positive);
  if (!negative) return refused('the bound element declares no required property to omit');
  if (validate(negative.payload)) return refused('the negative payload still satisfies the schema');
  const required = (validate.errors ?? []).filter(error => error.keyword === 'required');
  if (required.length !== 1) {
    return refused(`the negative payload produced ${required.length} required findings, not one`);
  }

  const slug = entry.document.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-|-$/g, '');
  const binding = entry.artifactKind === 'openapi' ? { documentRevisionId: entry.revisionId } : {};
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

  // Identity first: a fixture binds an OpenAPI document by revision, so the
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
    const target = bindTarget(entry, sources.get(entry.document));
    if (!target) { exempt += 1; continue; }
    if (!target.element) {
      problems.push({ document: entry.document, reason: target.reason ?? 'the document cannot bind a fixture' });
      continue;
    }
    let pair;
    try { pair = fixturePair(entry, target, registry); }
    catch (error) { pair = { problem: `${error.code ?? error.name}: ${error.message}`, fixtures: [] }; }
    if (pair.problem) { problems.push({ document: entry.document, reason: pair.problem }); continue; }
    fixtures.push(...pair.fixtures);
    bound += 1;
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
