import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest } from '../src/package-loader.mjs';
import { assertSourcesCommitted, resolveSourceRevision, verifySourceBinding } from '../src/provenance.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const sourceRoot = join(root, 'contracts/source');
const sampleRoot = join(root, 'contracts/samples/walking-skeleton');
const manifestPath = join(sampleRoot, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

if (manifest.manifestStatus !== 'candidate' || manifest.boundaryCoverage.length !== 1 ||
    manifest.boundaryCoverage[0].boundaryId !== 'C01') {
  throw new Error('The illustrative C01 candidate must not be treated as a release');
}

// Bolt 1 requires the thin package to be bound to an immutable Git revision.
// Refuse to stamp one while the sources are dirty: the commit would then
// describe bytes other than the ones being packaged.
const sourcePaths = manifest.schemas.map(entry => 'contracts/source/' + entry.document);
assertSourcesCommitted(root, sourcePaths);
const revision = resolveSourceRevision(root, sourcePaths);

manifest.sourceRevision = revision;
for (const entry of manifest.schemas) {
  await copyFile(join(sourceRoot, entry.document), join(sampleRoot, entry.document));
  entry.contentDigest = digest(await readFile(join(sampleRoot, entry.document)));
}

// Prove the stamp before writing it: every shipped canonical document must
// match the blob recorded at that commit.
verifySourceBinding(root, revision, manifest.schemas.map(entry => ({
  sourcePath: 'contracts/source/' + entry.document,
  contentDigest: entry.contentDigest
})));

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
