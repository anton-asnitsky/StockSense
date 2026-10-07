import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { buildSourceInventory } from '../src/catalogue.mjs';
import { digest } from '../src/package-loader.mjs';
import { assertSourcesCommitted, resolveSourceRevision, verifySourceBinding } from '../src/provenance.mjs';

const COMMON_FIXTURE_PATH = 'contracts/fixtures/common/v1/example-fixture.json';
const SAMPLE_PATH = 'contracts/samples/messaging-profiles';
// A generation profile names the revision in its own bytes, so it cannot be
// bound to that revision without a fixpoint. Every other sidecar can.
const UNBOUND_SIDECARS = Object.freeze(['generation-profile']);

// Regenerating a bound sidecar and stamping a revision over it cannot happen in
// one pass: the write dirties the very path the stamp is resolved from. So
// authoring is an explicit first phase - `--rewrite-sidecars` writes the
// sidecars and stops, you commit them, and the default run then stamps and
// proves the binding against those committed bytes.
const rewriteSidecars = process.argv.includes('--rewrite-sidecars');
const positional = process.argv.slice(2).filter(argument => !argument.startsWith('--'));
const root = positional[0] ? resolve(positional[0]) : resolve(import.meta.dirname, '../../..');
const sample = join(root, 'contracts/samples/messaging-profiles');
const scope = ['C01', 'C22', 'C23'];
const inventory = await buildSourceInventory(root);
const canonical = inventory.entries.filter(entry => entry.boundaryIds.some(id => scope.includes(id)))
  .map(entry => ({ ...entry, boundaryIds: entry.boundaryIds.filter(id => scope.includes(id)) }));
/** @typedef {{document:string,boundaryIds:string[],semanticVersion:string,contentDigest:string,
 * artifactKind?:string,kind?:string,owner?:string,provider?:string,producer?:string,sourceRevision?:string}} ManifestEntry */
/** @type {{packageVersion:string,manifestStatus:string,sourceRevision:string,openapi:ManifestEntry[],
 * asyncapi:ManifestEntry[],schemas:ManifestEntry[],governedArtifacts:ManifestEntry[],
 * boundaryCoverage:Array<{boundaryId:string,canonicalDocuments:string[],sidecars:string[]}>}} */
const manifest = { packageVersion: '1.0.0', manifestStatus: 'candidate',
  sourceRevision: inventory.sourceRevision, openapi: [], asyncapi: [], schemas: [],
  governedArtifacts: [], boundaryCoverage: [] };

for (const entry of canonical) {
  const target = join(sample, entry.document);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(join(root, 'contracts/source', entry.document), target);
  const ownerKey = entry.artifactKind === 'openapi' ? 'provider' :
    entry.artifactKind === 'asyncapi' ? 'producer' : 'owner';
  const row = { [ownerKey]: entry.semanticOwner, boundaryIds: entry.boundaryIds,
    document: entry.document, semanticVersion: '1.0.0', contentDigest: entry.contentDigest };
  if (entry.artifactKind === 'schema') manifest.schemas.push(row);
  else if (entry.artifactKind === 'asyncapi') manifest.asyncapi.push(row);
  else if (entry.artifactKind === 'openapi') manifest.openapi.push(row);
  else throw new Error('Canonical inventory contains an unsupported artifact kind');
}

const policy = JSON.parse(await readFile(join(root,
  'contracts/samples/walking-skeleton/governance/contract-package-policy.json'), 'utf8'));
policy.candidateScope = scope;
policy.releaseReady = false;
const c01Fixtures = JSON.parse(await readFile(join(root,
  'contracts/samples/walking-skeleton/governance/example-fixture.json'), 'utf8'));
// This candidate covers the package meta-schema as well as the two envelopes,
// and every bindable canonical document needs its own positive and negative
// example, so the manifest examples come in alongside the envelope ones.
const commonFixtures = JSON.parse(await readFile(join(root, COMMON_FIXTURE_PATH), 'utf8'));
const messagingFixtures = JSON.parse(await readFile(join(root,
  'contracts/fixtures/messaging-platform/v1/example-fixture.json'), 'utf8'));
const fixtures = { fixtureVersion: '1.1.0', syntheticOnly: true,
  fixtures: [...c01Fixtures.fixtures.filter(fixture =>
    fixture.boundaryIds?.length === 1 && fixture.boundaryIds[0] === 'C01'),
  ...commonFixtures.fixtures, ...messagingFixtures.fixtures] };
// This candidate's stamp has to be a binding, not a label. Resolve it from the
// paths it actually ships - the canonical sources, the fixture sources and the
// package's own bound sidecars - and refuse to stamp while any of them is
// uncommitted, because no commit would then describe the bytes being packaged.
const boundSidecarPaths = [
  `${SAMPLE_PATH}/governance/contract-package-policy.json`,
  `${SAMPLE_PATH}/governance/example-fixture.json`,
  `${SAMPLE_PATH}/governance/protocol-compatibility.profile.yaml`,
  `${SAMPLE_PATH}/governance/platform.profile.yaml`
];
const boundPaths = [
  ...canonical.map(entry => 'contracts/source/' + entry.document),
  COMMON_FIXTURE_PATH,
  'contracts/fixtures/messaging-platform/v1/example-fixture.json',
  ...boundSidecarPaths
];
if (!rewriteSidecars) assertSourcesCommitted(root, boundPaths);
const revision = rewriteSidecars ? null : resolveSourceRevision(root, boundPaths);
const generation = { generationProfileVersion: '1.1.0', sourceRevision: revision,
  consumers: [], limitation: 'Candidate schema and messaging validation only; consumer generation remains unverified.' };
/** @type {Array<[string,string,string[],string,Buffer]>} */
const sidecars = [
  ['contract-package-policy', 'U1 Contracts', ['C01'], 'governance/contract-package-policy.json',
    Buffer.from(JSON.stringify(policy, null, 2) + '\n')],
  ['example-fixture', 'U1 Contracts', scope, 'governance/example-fixture.json',
    Buffer.from(JSON.stringify(fixtures, null, 2) + '\n')],
  ['generation-profile', 'U1 Contracts', scope, 'governance/generation-profile.json',
    Buffer.from(JSON.stringify(generation, null, 2) + '\n')],
  ['protocol-compatibility-manifest', 'U14 Messaging Platform', ['C22'],
    'governance/protocol-compatibility.profile.yaml',
    await readFile(join(root, 'contracts/profiles/messaging-platform/v1/protocol-compatibility.profile.yaml'))],
  ['messaging-conformance-profile', 'U14 Messaging Platform', ['C23'],
    'governance/platform.profile.yaml',
    await readFile(join(root, 'contracts/profiles/messaging-platform/v1/platform.profile.yaml'))]
];
for (const [kind, owner, boundaryIds, document, bytes] of sidecars) {
  const target = join(sample, document);
  const unbound = UNBOUND_SIDECARS.includes(kind);
  await mkdir(dirname(target), { recursive: true });
  // The authoring pass writes the bound sidecars, whose bytes the stamp is
  // resolved from; the stamping pass writes the unbound ones, whose bytes
  // depend on the stamp. Writing both in either pass would either dirty the
  // paths being resolved or record a revision that is not yet known.
  if (rewriteSidecars ? !unbound : unbound) await writeFile(target, bytes);
  else if (!unbound && digest(await readFile(target)) !== digest(bytes)) {
    throw new Error(`The committed ${document} does not match what this builder produces; ` +
      're-run with --rewrite-sidecars, commit the result, then stamp');
  }
  manifest.governedArtifacts.push({ kind, owner, boundaryIds, document,
    semanticVersion: '1.0.0', contentDigest: digest(bytes), sourceRevision: revision ?? '' });
}

if (rewriteSidecars || revision === null) {
  process.stdout.write('messaging sidecars rewritten; commit them, then re-run without --rewrite-sidecars to stamp\n');
  process.exit(0);
}
manifest.sourceRevision = revision;

// Prove the stamp before writing it: every bound path must match its blob at
// the recorded commit.
verifySourceBinding(root, revision, [
  ...canonical.map(entry => ({ sourcePath: 'contracts/source/' + entry.document, contentDigest: entry.contentDigest })),
  ...sidecars.filter(([kind]) => !UNBOUND_SIDECARS.includes(kind))
    .map(([, , , document, bytes]) => ({ sourcePath: `${SAMPLE_PATH}/${document}`, contentDigest: digest(bytes) }))
]);

const entries = [
  ...manifest.openapi.map(entry => ({ ...entry, artifactKind: 'openapi' })),
  ...manifest.asyncapi.map(entry => ({ ...entry, artifactKind: 'asyncapi' })),
  ...manifest.schemas.map(entry => ({ ...entry, artifactKind: 'schema' })),
  ...manifest.governedArtifacts.map(entry => ({ ...entry, artifactKind: 'sidecar' }))
];
manifest.boundaryCoverage = scope.map(boundaryId => ({
  boundaryId,
  canonicalDocuments: entries.filter(entry => entry.artifactKind !== 'sidecar' && entry.boundaryIds.includes(boundaryId))
    .map(entry => entry.document).sort(),
  sidecars: entries.filter(entry => entry.artifactKind === 'sidecar' && entry.boundaryIds.includes(boundaryId))
    .map(entry => entry.document).sort()
}));
await writeFile(join(sample, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
process.stdout.write(`messaging candidate bound to ${revision}; releaseReady=false\n`);
