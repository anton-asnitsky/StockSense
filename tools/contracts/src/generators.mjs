import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContractError, canonicalJson, digest } from './package-loader.mjs';
import { LIMITS } from './preflight.mjs';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const openapiTypescriptBin = resolve(packageRoot, 'node_modules/openapi-typescript/bin/cli.js');

/**
 * Pinned generator invocations. A consumer names one of these; the arguments
 * live here rather than in the package so a profile cannot smuggle flags into
 * the generator.
 */
export const GENERATORS = Object.freeze({
  'openapi-typescript': Object.freeze({
    version: '7.13.0',
    bin: openapiTypescriptBin,
    /** @param {string} sourcePath @param {string} outputPath */
    args: (sourcePath, outputPath) => [sourcePath, '--output', outputPath]
  })
});

/** The exact configuration a run is bound to, so drift in flags is visible. */
export function generatorConfigurationDigest(name, outputPath) {
  const generator = GENERATORS[name];
  if (!generator) {
    throw new ContractError('GENERATOR_UNKNOWN', 'BR3.1', `No pinned generator is registered as ${name}`);
  }
  return digest(Buffer.from(canonicalJson({
    generator: name,
    version: generator.version,
    outputPath,
    args: generator.args('<source>', outputPath)
  })));
}

/**
 * Run a pinned generator into a disposable workspace. The generator reads the
 * locked source document and writes only inside that workspace.
 * @param {string} repoRoot
 * @returns {(consumer: any, workspace: string) => void}
 */
export function createPinnedGeneratorRunner(repoRoot) {
  return function runPinned(consumer, workspace) {
    const generator = GENERATORS[consumer.generator];
    if (!generator) {
      throw new ContractError('GENERATOR_UNKNOWN', 'BR3.1', `No pinned generator is registered as ${consumer.generator}`);
    }
    if (consumer.generatorVersion !== generator.version) {
      throw new ContractError('GENERATOR_VERSION', 'BR3.1',
        `Consumer ${consumer.consumerId} pins ${consumer.generator}@${consumer.generatorVersion} but ${generator.version} is vendored`);
    }
    const outputPath = Object.keys(consumer.expectedOutputs)[0];
    const expectedConfig = generatorConfigurationDigest(consumer.generator, outputPath);
    if (consumer.configurationDigest !== expectedConfig) {
      throw new ContractError('GENERATOR_CONFIGURATION', 'BR3.1',
        `Consumer ${consumer.consumerId} declares a configuration digest that does not match the pinned invocation`);
    }
    const sourcePath = resolve(repoRoot, 'contracts/source', consumer.sourceDocument);
    const result = spawnSync(process.execPath, [generator.bin, ...generator.args(sourcePath, join(workspace, outputPath))], {
      cwd: workspace, encoding: 'utf8', timeout: LIMITS.generatorMs, maxBuffer: 1024 * 1024,
      env: { ...process.env, NO_UPDATE_NOTIFIER: '1' }
    });
    if (result.error || result.status !== 0) {
      throw new ContractError('GENERATION_FAILED', 'BR3.1',
        `The pinned generator failed for ${consumer.consumerId}`);
    }
  };
}
