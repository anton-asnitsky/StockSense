import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveIdentity, digest } from '../src/package-loader.mjs';
import { assertSourcesCommitted, resolveSourceRevision, verifySourceBinding } from '../src/provenance.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const sourceRoot = join(root, 'contracts/source');
const sampleRoot = join(root, 'contracts/samples/walking-skeleton');
const manifestPath = join(sampleRoot, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

// The thin Bolt 1 scope. Widening it is a deliberate change, not a side effect
// of regenerating digests, and it must never become a release claim here.
const THIN_SCOPE = ['C01', 'C18'];
const covered = manifest.boundaryCoverage.map(row => row.boundaryId);
if (manifest.manifestStatus !== 'candidate' || covered.length > THIN_SCOPE.length ||
    covered.some(id => !THIN_SCOPE.includes(id))) {
  throw new Error(`The thin candidate must stay within ${THIN_SCOPE.join('/')} and must not be treated as a release`);
}

// Bolt 1 requires the thin package to be bound to an immutable Git revision.
// Refuse to stamp one while the sources are dirty: the commit would then
// describe bytes other than the ones being packaged.
const canonical = [...manifest.openapi, ...manifest.asyncapi, ...manifest.schemas];
const fixtureSourcePath = 'contracts/fixtures/web-bff/v1/example-fixture.json';
const fixtureSidecarPath = 'contracts/samples/walking-skeleton/governance/example-fixture.json';
const policySidecarPath = 'contracts/samples/walking-skeleton/governance/contract-package-policy.json';
// Exactly the paths the validator binds at this revision. If the stamp were
// resolved over a narrower set, a later change to a bound-but-unresolved
// sidecar would stamp an older commit and then fail its own binding.
const sourcePaths = [
  ...canonical.map(entry => 'contracts/source/' + entry.document),
  fixtureSourcePath,
  fixtureSidecarPath,
  policySidecarPath
];
assertSourcesCommitted(root, sourcePaths);
const revision = resolveSourceRevision(root, sourcePaths);
const c18 = canonical.find(entry => entry.document === 'web-bff/v1/browser-api.openapi.yaml');
if (!c18) throw new Error('The thin candidate needs the C18 OpenAPI source');
const c18Digest = digest(await readFile(join(sourceRoot, c18.document)));
const c18Revision = deriveIdentity('openapi', c18.provider, c18.document,
  c18.semanticVersion, c18Digest).revisionId;
const c18FixtureBytes = await readFile(join(root, fixtureSourcePath));
const c18Fixtures = JSON.parse(c18FixtureBytes.toString('utf8'));
if (c18Fixtures.syntheticOnly !== true || !Array.isArray(c18Fixtures.fixtures) ||
    c18Fixtures.fixtures.length !== 6 || c18Fixtures.fixtures.some(fixture =>
      fixture.boundaryIds?.join(',') !== 'C18' || fixture.documentRevisionId !== c18Revision)) {
  throw new Error('C18 fixtures must bind the current immutable OpenAPI revision');
}
const fixturePath = join(sampleRoot, 'governance/example-fixture.json');
const sampleFixtures = JSON.parse(await readFile(fixturePath, 'utf8'));
const c01Fixtures = sampleFixtures.fixtures.filter(fixture => fixture.boundaryIds?.join(',') === 'C01');
if (c01Fixtures.length !== 4 || new Set([...c01Fixtures, ...c18Fixtures.fixtures].map(fixture => fixture.fixtureId)).size !== 10) {
  throw new Error('The thin candidate fixture inventory has missing or duplicate examples');
}
const expectedFixtureBytes = Buffer.from(JSON.stringify({ fixtureVersion: '1.1.0', syntheticOnly: true,
  fixtures: [...c01Fixtures, ...c18Fixtures.fixtures] }, null, 2) + '\n');
if (digest(await readFile(fixturePath)) !== digest(expectedFixtureBytes)) {
  throw new Error('The committed candidate fixture sidecar must match its committed fixture source');
}

manifest.sourceRevision = revision;
for (const entry of canonical) {
  await mkdir(dirname(join(sampleRoot, entry.document)), { recursive: true });
  await copyFile(join(sourceRoot, entry.document), join(sampleRoot, entry.document));
  entry.contentDigest = digest(await readFile(join(sampleRoot, entry.document)));
}

// Prove the stamp before writing it: every shipped canonical document must
// match the blob recorded at that commit.
verifySourceBinding(root, revision, [
  ...canonical.map(entry => ({
    sourcePath: 'contracts/source/' + entry.document,
    contentDigest: entry.contentDigest
  })),
  { sourcePath: fixtureSourcePath, contentDigest: digest(c18FixtureBytes) },
  { sourcePath: fixtureSidecarPath, contentDigest: digest(expectedFixtureBytes) },
  { sourcePath: policySidecarPath, contentDigest: digest(await readFile(join(root, policySidecarPath))) }
]);

for (const entry of manifest.governedArtifacts) {
  entry.sourceRevision = revision;
  const path = join(sampleRoot, entry.document);
  if (entry.kind === 'generation-profile') {
    const profile = JSON.parse(await readFile(path, 'utf8'));
    profile.sourceRevision = revision;
    await writeFile(path, JSON.stringify(profile, null, 2) + '\n');
  }
  entry.contentDigest = digest(await readFile(path));
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
process.stdout.write(`sample bound to source revision ${revision}\n`);
