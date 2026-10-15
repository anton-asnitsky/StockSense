import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createBoundedGeneratorRunner } from '../../src/bounded-generators.mjs';
import { regenerateConsumer } from '../../src/generation.mjs';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const profile = JSON.parse(await readFile(new URL('../../../../contracts/samples/walking-skeleton/governance/generation-profile.json',
  import.meta.url), 'utf8'));

test('all declared consumers regenerate under 120 seconds and a 2 GiB cgroup', async () => {
  const measurements = [];
  const runGenerator = createBoundedGeneratorRunner(repoRoot, {
    standardsImage: process.env.STOCKSENSE_STANDARDS_IMAGE,
    kiotaImage: process.env.STOCKSENSE_KIOTA_IMAGE,
    onMeasurement: value => measurements.push(value)
  });
  for (const consumer of profile.consumers) await regenerateConsumer(consumer, { runGenerator });
  assert.deepEqual(measurements.map(item => item.consumerId).sort(), profile.consumers.map(item => item.consumerId).sort());
  for (const measurement of measurements) {
    assert.ok(measurement.elapsedMs <= 120_000);
    assert.ok(measurement.peakBytes > 0 && measurement.peakBytes <= 2 * 1024 ** 3);
  }
  process.stdout.write(JSON.stringify({ boundedGeneration: measurements.map(({ consumerId, generator, image, elapsedMs, peakBytes }) =>
    ({ consumerId, generator, image, elapsedMs, peakBytes })) }) + '\n');
});
