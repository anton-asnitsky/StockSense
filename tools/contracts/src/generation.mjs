import { mkdtemp, readdir, rm, writeFile, lstat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { TextDecoder } from 'node:util';
import { ContractError, digest } from './package-loader.mjs';
import { inspectContent } from './preflight.mjs';

/** @returns {never} */
const fail = (code, rule, message) => { throw new ContractError(code, rule, message); };
const object = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const string = value => typeof value === 'string' && value.length > 0;
const SEMVER = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const SHA = /^sha256:[0-9a-f]{64}$/;
const CONSUMER_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const protectedLabel = /(?:^|[^A-Za-z0-9])(?:rawSupplierDocument|supplierSourceContent|supplierDocumentBase64|supplierPdfBytes|raw_catalog_text|fullPrompt|systemPromptText|promptTranscript|completePrompt|hiddenReasoning|chainOfThought|privateReasoning|reasoningTrace|client_secret|access_token|api_key)(?:$|[^A-Za-z0-9])/i;
const protectedStem = /(?:rawsupplierdocument|suppliersourcecontent|supplierdocumentbase64|supplierpdfbytes|rawcatalogtext|fullprompt|systemprompttext|prompttranscript|completeprompt|hiddenreasoning|chainofthought|privatereasoning|reasoningtrace|clientsecret|accesstoken|apikey)/i;
const safeGeneratorCodes = new Set(['GENERATOR_UNAVAILABLE', 'GENERATOR_UNKNOWN', 'GENERATOR_VERSION', 'GENERATOR_CONFIGURATION']);
const MAX_GENERATED_FILES = 4_096;
const MAX_GENERATED_FILE_BYTES = 16 * 1024 * 1024;
const MAX_GENERATED_TOTAL_BYTES = 256 * 1024 * 1024;

async function readGeneratedBytes(path, remaining = MAX_GENERATED_FILE_BYTES) {
  const cap = Math.min(MAX_GENERATED_FILE_BYTES, remaining);
  const stat = await lstat(path);
  if (!stat.isFile() || stat.size > cap) {
    fail('GENERATION_OUTPUT_LIMIT', 'NFR10.1', 'Generated output exceeds the safe byte limit');
  }
  const chunks = [];
  let length = 0;
  for await (const chunk of createReadStream(path, { highWaterMark: 64 * 1024 })) {
    length += chunk.length;
    if (length > cap) fail('GENERATION_OUTPUT_LIMIT', 'NFR10.1', 'Generated output exceeds the safe byte limit');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, length);
}

/** Kiota's newline and lock-path bytes vary by host; make the declared client portable. */
export async function normalizeGeneratedConsumer(consumer, workspace) {
  if (consumer.generator !== 'kiota') return;
  const decoder = new TextDecoder('utf-8', { fatal: true });
  // Use observed files, not declared ones: missing/extra manifest entries must
  // reach the drift check as such rather than failing during normalization.
  for (const path of Object.keys(await digestDirectory(workspace))) {
    if (!path.startsWith('dotnet-client/') || !/\.(?:cs|json)$/.test(path)) continue;
    let text;
    try { text = decoder.decode(await readGeneratedBytes(join(workspace, path))); }
    catch (error) {
      if (error instanceof ContractError) throw error;
      fail('GENERATION_FAILED', 'BR3.1', 'Kiota omitted a declared UTF-8 output');
    }
    if (path === 'dotnet-client/kiota-lock.json') {
      let lock;
      try { lock = JSON.parse(text); }
      catch { fail('GENERATION_FAILED', 'BR3.1', 'Kiota lock is malformed'); }
      const source = 'contracts/source/' + consumer.sourceDocument;
      if (!object(lock) || typeof lock.descriptionLocation !== 'string' ||
          !lock.descriptionLocation.replaceAll('\\', '/').endsWith(source)) {
        fail('GENERATION_FAILED', 'BR3.1', 'Kiota lock does not reference its declared source');
      }
      lock.descriptionLocation = source;
      text = JSON.stringify(lock, null, 2) + '\n';
    } else {
      text = text.replace(/\r\n/g, '\n');
    }
    await writeFile(join(workspace, path), text);
  }
}

function hasProtectedLabel(value) {
  return protectedLabel.test(value) || protectedStem.test(value.replace(/[^a-z0-9]/gi, ''));
}

function assertGeneratedPath(path) {
  if (hasProtectedLabel(path)) fail('PROTECTED_CONTENT', 'NFR6.1', 'Protected content is prohibited in generated filenames');
  if (typeof path !== 'string' || !/^[A-Za-z0-9_./-]+$/.test(path)) {
    fail('GENERATED_FILE_TYPE', 'NFR6.2', 'Generated output path is unsafe');
  }
  inspectContent('generated-path', Buffer.from(path));
}

function assertConsumerId(consumerId) {
  if (typeof consumerId !== 'string' || !CONSUMER_ID.test(consumerId)) {
    fail('GENERATION_CONSUMER_SHAPE', 'BR3.1', 'Consumer id is invalid');
  }
  if (hasProtectedLabel(consumerId)) fail('PROTECTED_CONTENT', 'NFR6.1', 'Protected content is prohibited in consumer id');
}

function assertGeneratedFilePath(path) {
  assertGeneratedPath(path);
  const parts = path.replace(/\\/g, '/').split('/');
  if (parts.some(part => !part || part === '.' || part === '..' || part.startsWith('.')) ||
      /^(?:(?:package|package-lock|pnpm-lock|yarn-lock)\.(?:json|yaml|yml)|deno\.json)$/i.test(parts.at(-1) ?? '') ||
      !/\.(?:d\.ts|ts|tsx|cs|json|yaml|yml)$/i.test(path)) {
    fail('GENERATED_FILE_TYPE', 'NFR6.2', 'Generated output must be a safe declarative file');
  }
}

function assertGenerationMetadataSafe(value) {
  const bytes = Buffer.from(JSON.stringify(value));
  inspectContent('generation-metadata', bytes);
  if (hasProtectedLabel(bytes.toString('utf8'))) {
    fail('PROTECTED_CONTENT', 'NFR6.1', 'Protected content is prohibited in generation results');
  }
}

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
    assertConsumerId(consumer.consumerId);
    for (const value of Object.values(consumer.expectedOutputs)) {
      if (!SHA.test(String(value))) fail('GENERATION_OUTPUT_DIGEST', 'BR3.2', 'Expected outputs must be SHA-256 digests');
    }
    if (!Object.keys(consumer.expectedOutputs).length) {
      fail('GENERATION_OUTPUT_DIGEST', 'BR3.2', 'A declared consumer must expect at least one output');
    }
    for (const path of Object.keys(consumer.expectedOutputs)) assertGeneratedFilePath(path);
  }
  return { consumers: profile.consumers, limitation: profile.limitation ?? null, verified: true };
}

/** Digest every generated file relative to its clean output directory. */
export async function digestDirectory(root) {
  const observed = {};
  let files = 0;
  let totalBytes = 0;
  const walk = async (current, depth = 0) => {
    if (depth > 32) fail('GENERATION_OUTPUT_LIMIT', 'NFR10.1', 'Generated output nesting exceeds the safe limit');
    for (const item of await readdir(current, { withFileTypes: true })) {
      const full = join(current, item.name);
      if (item.isDirectory()) await walk(full, depth + 1);
      else if (item.isFile()) {
        const path = relative(root, full).split(sep).join('/');
        assertGeneratedFilePath(path);
        files++;
        if (files > MAX_GENERATED_FILES) fail('GENERATION_OUTPUT_LIMIT', 'NFR10.1', 'Generated output has too many files');
        const bytes = await readGeneratedBytes(full, MAX_GENERATED_TOTAL_BYTES - totalBytes);
        totalBytes += bytes.length;
        inspectContent(path, bytes);
        if (hasProtectedLabel(bytes.toString('utf8'))) {
          fail('PROTECTED_CONTENT', 'NFR6.1', 'Protected content is prohibited in generated files');
        }
        observed[path] = digest(bytes);
      }
      else fail('GENERATED_ENTRY', 'BR3.2', 'A generated entry is not a regular file');
    }
  };
  await walk(root);
  return observed;
}

/** Any missing, extra or changed output is drift. The comparison is symmetric. */
export function assertNoDrift(expected, observed, consumerId = 'consumer') {
  assertConsumerId(consumerId);
  const expectedPaths = Object.keys(expected).sort();
  const observedPaths = Object.keys(observed).sort();
  for (const path of [...expectedPaths, ...observedPaths]) assertGeneratedFilePath(path);
  const missing = expectedPaths.filter(path => !(path in observed));
  const extra = observedPaths.filter(path => !(path in expected));
  const changed = expectedPaths.filter(path => path in observed && observed[path] !== expected[path]);
  if (missing.length || extra.length || changed.length) {
    fail('GENERATION_DRIFT', 'BR3.3',
      `Generated output drifted: ${missing.length} missing, ${extra.length} extra, ${changed.length} changed`);
  }
  return true;
}

/**
 * Default generator seam. A caller that supplies no runGenerator gets a closed
 * door rather than an empty output directory that would read as "no drift".
 * @param {object} _consumer
 * @param {string} _workspace
 * @returns {never} always throws
 */
function runPinnedGenerator(_consumer, _workspace) {
  throw new ContractError('GENERATOR_UNAVAILABLE', 'BR3.1', 'The pinned generator is not available in this environment');
}

/**
 * Regenerate one consumer in a disposable clean directory and compare the
 * result with its declared output manifest. The directory is always removed,
 * so a later run can never observe an earlier run's files.
 */
export async function regenerateConsumer(consumer, { runGenerator = runPinnedGenerator } = {}) {
  if (!object(consumer) || !object(consumer.expectedOutputs)) fail('GENERATION_CONSUMER_SHAPE', 'BR3.1', 'Generator consumer is malformed');
  assertGenerationMetadataSafe(consumer);
  assertConsumerId(consumer.consumerId);
  for (const path of Object.keys(consumer.expectedOutputs)) assertGeneratedFilePath(path);
  const workspace = await mkdtemp(join(tmpdir(), 'stocksense-generation-'));
  try {
    try {
      await runGenerator(consumer, workspace);
      await normalizeGeneratedConsumer(consumer, workspace);
    } catch (error) {
      // Tool diagnostics are untrusted; retain only a stable code and rule.
      if (error instanceof ContractError &&
          ['GENERATOR_LIMIT', 'GENERATION_OUTPUT_LIMIT'].includes(error.code) && error.ruleId === 'NFR10.1') {
        fail(error.code, 'NFR10.1', 'Generation exceeded a resource limit');
      }
      if (error instanceof ContractError && safeGeneratorCodes.has(error.code) && error.ruleId === 'BR3.1') {
        fail(error.code, 'BR3.1', 'Generation failed; inspect the named rule');
      }
      fail('GENERATOR_FAILED', 'BR3.1', 'Generation failed before output verification');
    }
    const observed = await digestDirectory(workspace);
    assertNoDrift(consumer.expectedOutputs, observed, consumer.consumerId);
    const result = {
      consumerId: consumer.consumerId,
      generator: consumer.generator,
      generatorVersion: consumer.generatorVersion,
      sourceDocument: consumer.sourceDocument,
      configurationDigest: consumer.configurationDigest,
      outputs: observed
    };
    assertGenerationMetadataSafe(result);
    return result;
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}
