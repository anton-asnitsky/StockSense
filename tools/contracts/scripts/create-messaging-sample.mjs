import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { buildSourceInventory } from '../src/catalogue.mjs';
import { digest } from '../src/package-loader.mjs';

const root = process.argv[2] ? resolve(process.argv[2]) : resolve(import.meta.dirname, '../../..');
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
const messagingFixtures = JSON.parse(await readFile(join(root,
  'contracts/fixtures/messaging-platform/v1/example-fixture.json'), 'utf8'));
const fixtures = { fixtureVersion: '1.1.0', syntheticOnly: true,
  fixtures: [...c01Fixtures.fixtures, ...messagingFixtures.fixtures] };
const generation = { generationProfileVersion: '1.1.0', sourceRevision: inventory.sourceRevision,
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
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes);
  manifest.governedArtifacts.push({ kind, owner, boundaryIds, document,
    semanticVersion: '1.0.0', contentDigest: digest(bytes), sourceRevision: inventory.sourceRevision });
}

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
process.stdout.write(`messaging candidate bound to ${inventory.sourceRevision}; releaseReady=false\n`);
