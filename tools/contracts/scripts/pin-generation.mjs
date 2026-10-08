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
const outputPath = 'browser-api.d.ts';

const consumer = {
  consumerId: 'web-application',
  generator: 'openapi-typescript',
  generatorVersion: '7.13.0',
  sourceDocument: 'web-bff/v1/browser-api.openapi.yaml',
  configurationDigest: generatorConfigurationDigest('openapi-typescript', outputPath),
  expectedOutputs: { [outputPath]: 'sha256:' + '0'.repeat(64) }
};

const runGenerator = createPinnedGeneratorRunner(repoRoot);

// A generator whose output is not reproducible cannot support drift detection,
// so prove determinism across two clean workspaces before recording a digest.
const passes = [];
for (let pass = 0; pass < 2; pass += 1) {
  const workspace = await mkdtemp(join(tmpdir(), 'stocksense-pin-'));
  try {
    runGenerator(consumer, workspace);
    passes.push((await digestDirectory(workspace))[outputPath]);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}
if (passes[0] !== passes[1]) {
  throw new Error(`Generator is not reproducible: ${passes[0]} then ${passes[1]}`);
}

const profile = JSON.parse(await readFile(profilePath, 'utf8'));
profile.generationProfileVersion = '1.1.0';
profile.sourceRevision = resolveSourceRevision(repoRoot, ['contracts/source']);
profile.consumers = [{ ...consumer, expectedOutputs: { [outputPath]: passes[0] } }];
delete profile.limitation;
await writeFile(profilePath, JSON.stringify(profile, null, 2) + '\n');

process.stdout.write(`pinned ${consumer.generator}@${consumer.generatorVersion}\n`);
process.stdout.write(`  configuration ${consumer.configurationDigest}\n`);
process.stdout.write(`  output        ${passes[0]} (reproducible across two passes)\n`);
process.stdout.write(`  revision      ${profile.sourceRevision}\n`);
