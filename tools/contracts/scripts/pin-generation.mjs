// Record the generation-profile pins for the sample package. Run from the
// repository root after changing a canonical source or the pinned generator:
//   node tools/contracts/scripts/pin-generation.mjs
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPinnedGeneratorRunner, generatorConfigurationDigest } from '../src/generators.mjs';
import { digestDirectory } from '../src/generation.mjs';
import { resolveSourceRevision } from '../src/provenance.mjs';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const profilePath = join(repoRoot, 'contracts/samples/walking-skeleton/governance/generation-profile.json');

// Both pinned consumers. The .NET client emits a directory tree rather than one
// file, which is why it had never been pinned: nothing was wrong with the
// manifest machinery - digestDirectory already walks a tree - but no profile
// recorded the tree, so drift over the .NET client was never actually compared.
const CONSUMERS = [
  { consumerId: 'web-application', generator: 'openapi-typescript', generatorVersion: '7.13.0',
    sourceDocument: 'web-bff/v1/browser-api.openapi.yaml', output: 'browser-api.d.ts' },
  { consumerId: 'dotnet-operations-client', generator: 'kiota', generatorVersion: '1.35.0',
    sourceDocument: 'web-bff/v1/browser-api.openapi.yaml', output: 'dotnet-client' }
];

const runGenerator = createPinnedGeneratorRunner(repoRoot);

/**
 * Generate into a clean workspace twice and return the agreed output manifest.
 * A generator whose output is not reproducible cannot support drift detection,
 * so determinism is proven before any digest is recorded.
 */
async function pin(consumer) {
  const passes = [];
  for (let pass = 0; pass < 2; pass += 1) {
    const workspace = await mkdtemp(join(tmpdir(), 'stocksense-pin-'));
    try {
      await runGenerator(consumer, workspace);
      passes.push(await digestDirectory(workspace));
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  }
  const [first, second] = passes.map(outputs => JSON.stringify(Object.keys(outputs).sort()
    .map(path => [path, outputs[path]])));
  if (first !== second) {
    throw new Error(`${consumer.generator} is not reproducible across two clean workspaces`);
  }
  return passes[0];
}

const pinned = [];
for (const { output, ...rest } of CONSUMERS) {
  const consumer = {
    ...rest,
    configurationDigest: generatorConfigurationDigest(rest.generator, output),
    expectedOutputs: { [output]: 'sha256:' + '0'.repeat(64) }
  };
  const outputs = await pin(consumer);
  if (!Object.keys(outputs).length) throw new Error(`${consumer.generator} produced no output`);
  pinned.push({ ...consumer, expectedOutputs: Object.fromEntries(Object.keys(outputs).sort()
    .map(path => [path, outputs[path]])) });
}

const profile = JSON.parse(await readFile(profilePath, 'utf8'));
profile.generationProfileVersion = '1.1.0';
profile.sourceRevision = resolveSourceRevision(repoRoot, ['contracts/source']);
profile.consumers = pinned;
delete profile.limitation;
await writeFile(profilePath, JSON.stringify(profile, null, 2) + '\n');

for (const consumer of pinned) {
  const paths = Object.keys(consumer.expectedOutputs);
  process.stdout.write(`pinned ${consumer.generator}@${consumer.generatorVersion}\n`);
  process.stdout.write(`  configuration ${consumer.configurationDigest}\n`);
  process.stdout.write(`  outputs       ${paths.length} file${paths.length === 1 ? '' : 's'} (reproducible across two passes)\n`);
}
process.stdout.write(`  revision      ${profile.sourceRevision}\n`);
