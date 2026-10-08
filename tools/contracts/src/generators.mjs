import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContractError, canonicalJson, digest } from './package-loader.mjs';
import { LIMITS } from './preflight.mjs';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const openapiTypescriptBin = resolve(packageRoot, 'node_modules/openapi-typescript/bin/cli.js');
// Kiota is a .NET local tool, not a Node CLI. Resolve the host the same way the
// standards runner resolves Docker: an absolute path, not a PATH search, so an
// untrusted checkout cannot put its own `dotnet` ahead of the real one.
export const DOTNET_HOST = process.env.STOCKSENSE_DOTNET_PATH ?? (process.platform === 'win32'
  ? 'C:\\Program Files\\dotnet\\dotnet.exe' : '/usr/bin/dotnet');

/**
 * Pinned generator invocations. A consumer names one of these; the arguments
 * live here rather than in the package so a profile cannot smuggle flags into
 * the generator.
 */
export const GENERATORS = Object.freeze({
  'openapi-typescript': Object.freeze({
    version: '7.13.0',
    bin: openapiTypescriptBin,
    // Where the pinned invocation writes. The output location is part of the
    // configuration, not something to infer from a consumer's manifest: a
    // generator that emits a tree lists files beneath this path, so inferring
    // it from the first declared output produced the wrong target entirely.
    outputPath: 'browser-api.d.ts',
    /** @param {string} sourcePath @param {string} outputPath */
    args: (sourcePath, outputPath) => [sourcePath, '--output', outputPath]
  }),
  // The approved .NET generator. It runs through the dotnet host from the
  // repository root, because `dotnet tool run` resolves the pinned version
  // from `.config/dotnet-tools.json` by walking up from its working
  // directory; it still writes only into the disposable workspace that
  // --output names. Class and namespace are fixed here with every other
  // argument, so a consumer profile cannot steer the generated surface.
  kiota: Object.freeze({
    version: '1.35.0',
    command: DOTNET_HOST,
    cwd: 'repository',
    outputPath: 'dotnet-client',
    /** @param {string} sourcePath @param {string} outputPath */
    // --log-level None suppresses the .kiota.log diagnostic file. It is not
    // part of the generated client, and a dot-prefixed, non-declarative file
    // is refused by the generated-output policy - correctly, since that policy
    // exists to stop a generator writing anything but reviewable client code.
    args: (sourcePath, outputPath) => ['tool', 'run', 'kiota', '--', 'generate',
      '--openapi', sourcePath, '--language', 'CSharp', '--output', outputPath,
      '--class-name', 'BrowserApiClient', '--namespace-name', 'StockSense.WebBff',
      '--clean-output', '--log-level', 'None']
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
    const outputPath = generator.outputPath;
    const expectedConfig = generatorConfigurationDigest(consumer.generator, outputPath);
    if (consumer.configurationDigest !== expectedConfig) {
      throw new ContractError('GENERATOR_CONFIGURATION', 'BR3.1',
        `Consumer ${consumer.consumerId} declares a configuration digest that does not match the pinned invocation`);
    }
    const sourcePath = resolve(repoRoot, 'contracts/source', consumer.sourceDocument);
    const target = join(workspace, outputPath);
    // A Node generator is spawned through this process's own runtime; a .NET
    // one through its resolved host. Either way the argument vector comes from
    // the registry above, never from the consumer profile.
    const file = generator.command ?? process.execPath;
    const argv = generator.command ? generator.args(sourcePath, target)
      : [generator.bin, ...generator.args(sourcePath, target)];
    const result = spawnSync(file, argv, {
      cwd: generator.cwd === 'repository' ? repoRoot : workspace,
      encoding: 'utf8', timeout: LIMITS.generatorMs, maxBuffer: 1024 * 1024,
      env: { ...process.env, NO_UPDATE_NOTIFIER: '1', DOTNET_CLI_TELEMETRY_OPTOUT: '1' }
    });
    if (result.error || result.status !== 0) {
      throw new ContractError('GENERATION_FAILED', 'BR3.1',
        `The pinned generator failed for ${consumer.consumerId}`);
    }
  };
}
