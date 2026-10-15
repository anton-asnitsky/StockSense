import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createBoundedGeneratorRunner } from '../../src/bounded-generators.mjs';
import { regenerateConsumer } from '../../src/generation.mjs';
import { verifySourceBinding } from '../../src/provenance.mjs';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const profile = JSON.parse(await readFile(new URL('../../../../contracts/samples/walking-skeleton/governance/generation-profile.json',
  import.meta.url), 'utf8'));

test('all declared consumers regenerate under 120 seconds and a 2 GiB cgroup', async () => {
  const sampleManifest = JSON.parse(await readFile(new URL('../../../../contracts/samples/walking-skeleton/manifest.json',
    import.meta.url), 'utf8'));
  assert.equal(profile.sourceRevision, sampleManifest.sourceRevision,
    'the generation profile and candidate package must bind the same revision');
  const measurements = [];
  const runGenerator = createBoundedGeneratorRunner(repoRoot, {
    standardsImage: process.env.STOCKSENSE_STANDARDS_IMAGE,
    kiotaImage: process.env.STOCKSENSE_KIOTA_IMAGE,
    onMeasurement: value => measurements.push(value)
  });
  const consumerEvidence = [];
  const sourceBindings = [];
  for (const consumer of profile.consumers) {
    const result = await regenerateConsumer(consumer, { runGenerator });
    const source = await readFile(join(repoRoot, 'contracts/source', consumer.sourceDocument));
    const sourceDigest = 'sha256:' + createHash('sha256').update(source).digest('hex');
    sourceBindings.push({ sourcePath: 'contracts/source/' + consumer.sourceDocument,
      contentDigest: sourceDigest });
    consumerEvidence.push({ ...result,
      sourceRevision: profile.sourceRevision,
      sourceDigest });
  }
  verifySourceBinding(repoRoot, profile.sourceRevision, sourceBindings);
  assert.deepEqual(measurements.map(item => item.consumerId).sort(), profile.consumers.map(item => item.consumerId).sort());
  for (const measurement of measurements) {
    assert.ok(measurement.elapsedMs <= 120_000);
    assert.ok(measurement.peakBytes > 0 && measurement.peakBytes <= 2 * 1024 ** 3);
  }
  assert.deepEqual(consumerEvidence.map(item => item.consumerId).sort(),
    profile.consumers.map(item => item.consumerId).sort());
  process.stdout.write(JSON.stringify({ boundedGeneration: measurements.map(({ consumerId, generator, image, elapsedMs, peakBytes }) =>
    ({ consumerId, generator, image, elapsedMs, peakBytes })),
  consumerEvidence }) + '\n');
});
