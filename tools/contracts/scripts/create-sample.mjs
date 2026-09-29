import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest } from '../src/package-loader.mjs';

// This fixture is deliberately not a source-bound release package. The zero
// revision cannot be mistaken for a Git commit containing these sources.
const FIXTURE_REVISION = '0'.repeat(40);
const root = fileURLToPath(new URL('../../../', import.meta.url));
const sourceRoot = join(root, 'contracts/source');
const sampleRoot = join(root, 'contracts/samples/walking-skeleton');
const manifestPath = join(sampleRoot, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

if (manifest.manifestStatus !== 'candidate' || manifest.boundaryCoverage.length !== 1 ||
    manifest.boundaryCoverage[0].boundaryId !== 'C01') {
  throw new Error('The illustrative C01 candidate must not be treated as a release');
}

manifest.sourceRevision = FIXTURE_REVISION;
for (const entry of manifest.schemas) {
  await copyFile(join(sourceRoot, entry.document), join(sampleRoot, entry.document));
  entry.contentDigest = digest(await readFile(join(sampleRoot, entry.document)));
}
for (const entry of manifest.governedArtifacts) {
  entry.sourceRevision = FIXTURE_REVISION;
  const path = join(sampleRoot, entry.document);
  if (entry.kind === 'generation-profile') {
    const profile = JSON.parse(await readFile(path, 'utf8'));
    profile.sourceRevision = FIXTURE_REVISION;
    await writeFile(path, JSON.stringify(profile, null, 2) + '\n');
  }
  entry.contentDigest = digest(await readFile(path));
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
