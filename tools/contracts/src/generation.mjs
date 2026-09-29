import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { ContractError, digest } from './package-loader.mjs';

const fail = (code, rule, message) => { throw new ContractError(code, rule, message); };
const object = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const string = value => typeof value === 'string' && value.length > 0;
const SEMVER = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const SHA = /^sha256:[0-9a-f]{64}$/;

/**
 * A generation profile declares what each consumer regenerates and the exact
 * output it expects. An empty consumer list is allowed only with a stated
 * limitation, so silence is never read as "generation passed".
 */
export function assertGenerationProfile(profile) {
  if (!object(profile) || !SEMVER.test(String(profile.generationProfileVersion))) {
    fail('GENERATION_PROFILE_SHAPE', 'BR3.1', 'Generation profile shape or version is invalid');
  }
  if (!Array.isArray(profile.consumers)) fail('GENERATION_PROFILE_SHAPE', 'BR3.1', 'Generation profile needs a consumer list');
  if (!profile.consumers.length) {
    if (!string(profile.limitation)) fail('GENERATION_LIMITATION', 'BR3.1', 'An empty consumer list needs a stated limitation');
    return { consumers: [], limitation: profile.limitation, verified: false };
  }
  for (const consumer of profile.consumers) {
    if (!object(consumer) || !string(consumer.consumerId) || !string(consumer.generator) ||
        !SEMVER.test(String(consumer.generatorVersion)) || !string(consumer.sourceDocument) ||
        !SHA.test(String(consumer.configurationDigest)) || !object(consumer.expectedOutputs)) {
      fail('GENERATION_CONSUMER_SHAPE', 'BR3.1', 'Each consumer needs a pinned generator, source, configuration digest and expected outputs');
    }
    for (const value of Object.values(consumer.expectedOutputs)) {
      if (!SHA.test(String(value))) fail('GENERATION_OUTPUT_DIGEST', 'BR3.2', 'Expected outputs must be SHA-256 digests');
    }
    if (!Object.keys(consumer.expectedOutputs).length) {
      fail('GENERATION_OUTPUT_DIGEST', 'BR3.2', 'A declared consumer must expect at least one output');
    }
  }
  return { consumers: profile.consumers, limitation: profile.limitation ?? null, verified: true };
}

/** Digest every generated file relative to its clean output directory. */
export async function digestDirectory(root) {
  const observed = {};
  const walk = async current => {
    for (const item of await readdir(current, { withFileTypes: true })) {
      const full = join(current, item.name);
      if (item.isDirectory()) await walk(full);
      else if (item.isFile()) observed[relative(root, full).split(sep).join('/')] = digest(await readFile(full));
      else fail('GENERATED_ENTRY', 'BR3.2', 'A generated entry is not a regular file');
    }
  };
  await walk(root);
  return observed;
}

/** Any missing, extra or changed output is drift. The comparison is symmetric. */
export function assertNoDrift(expected, observed, consumerId = 'consumer') {
  const expectedPaths = Object.keys(expected).sort();
  const observedPaths = Object.keys(observed).sort();
  const missing = expectedPaths.filter(path => !(path in observed));
  const extra = observedPaths.filter(path => !(path in expected));
  const changed = expectedPaths.filter(path => path in observed && observed[path] !== expected[path]);
  if (missing.length || extra.length || changed.length) {
    fail('GENERATION_DRIFT', 'BR3.3',
      `Generated output for ${consumerId} drifted: ${missing.length} missing, ${extra.length} extra, ${changed.length} changed`);
  }
  return true;
}

/** The pinned generators are not vendored in this package, so they fail closed. */
function runPinnedGenerator() {
  fail('GENERATOR_UNAVAILABLE', 'BR3.1', 'The pinned generator is not available in this environment');
}

/**
 * Regenerate one consumer in a disposable clean directory and compare the
 * result with its declared output manifest. The directory is always removed,
 * so a later run can never observe an earlier run's files.
 */
export async function regenerateConsumer(consumer, { runGenerator = runPinnedGenerator } = {}) {
  const workspace = await mkdtemp(join(tmpdir(), 'stocksense-generation-'));
  try {
    await runGenerator(consumer, workspace);
    const observed = await digestDirectory(workspace);
    assertNoDrift(consumer.expectedOutputs, observed, consumer.consumerId);
    return {
      consumerId: consumer.consumerId,
      generator: consumer.generator,
      generatorVersion: consumer.generatorVersion,
      sourceDocument: consumer.sourceDocument,
      configurationDigest: consumer.configurationDigest,
      outputs: observed
    };
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}
