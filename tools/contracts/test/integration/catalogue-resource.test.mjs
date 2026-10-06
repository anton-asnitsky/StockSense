import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import YAML from 'yaml';
import { ALL_BOUNDARIES, CANONICAL_KINDS, FIXED_PATHS, digest } from '../../src/package-loader.mjs';
import { LIMITS, inspectContent } from '../../src/preflight.mjs';
import { preflightCanonicalReferences } from '../../src/reference-preflight.mjs';
import { DIALECTS, detectDialect } from '../../src/validators.mjs';

const repository = resolve(import.meta.dirname, '../../../..');
const sourceRoot = join(repository, 'contracts/source');
const c18 = 'web-bff/v1/browser-api.openapi.yaml';

// Construction inventory. Empty rows are explicit gaps, not invented contracts.
// Update this map as real canonical sources arrive; the file-set assertion below
// prevents a new source from silently escaping the measured package graph.
const sourcesByBoundary = Object.freeze({
  C01: ['common/v1/contract-package.shared-schema.yaml', 'common/v1/message-envelope.schema.json', 'common/v1/global-identity-audit-envelope.schema.json'],
  C02: ['identity-access/v1/identity-metadata.openapi.yaml', 'identity-access/v1/platform-operator-grant.schema.json'],
  C03: ['retail-data/v1/supplier-reference.openapi.yaml', 'retail-data/v1/retail-reference-changed.asyncapi.yaml'],
  C04: ['retail-data/v1/dataset-exports.openapi.yaml'],
  C05: ['model-lifecycle/v1/supplier-policy-evaluations.openapi.yaml', 'common/v1/supplier-authority-head.shared-schema.yaml'],
  C06: ['retail-data/v1/forecast-inputs.openapi.yaml'],
  C07: ['model-lifecycle/v1/heavy-work.openapi.yaml', 'model-lifecycle/v1/finalize-heavy-work.shared-schema.yaml', 'supplier-knowledge/v1/embedding-build-quiesced.asyncapi.yaml'],
  C08: ['retail-data/v1/inventory-operations.shared-schema.yaml'],
  C09: ['common/v1/supplier-authority-head.shared-schema.yaml', 'supplier-knowledge/v1/accepted-terms.openapi.yaml'],
  C10: ['forecasting/v1/planning-forecasts.openapi.yaml'],
  C11: ['retail-data/v1/assistant-inventory.openapi.yaml'],
  C12: ['supplier-knowledge/v1/assistant-retrieval.openapi.yaml'],
  C13: ['forecasting/v1/assistant-forecasts.openapi.yaml'],
  C14: ['planning-purchasing/v1/assistant-purchasing.openapi.yaml'],
  C15: ['common/v1/global-identity-audit-envelope.schema.json', 'audit-evidence/v1/authoritative-audit.asyncapi.yaml'],
  C16: ['web-bff/v1/identity-session.openapi.yaml', 'identity-access/v1/bff-integration.shared-schema.yaml'],
  C17: ['web-bff/v1/provider-registry.shared-schema.yaml', 'identity-access/v1/global-audit-read.openapi.yaml'],
  C18: [c18],
  C19: ['demo-evidence/v1/evidence-manifest.shared-schema.yaml'],
  C20: ['identity-access/v1/google-federation.shared-schema.yaml'],
  C21: ['assistant/v1/generation-port.shared-schema.yaml', 'supplier-knowledge/v1/embedding-port.shared-schema.yaml'],
  C22: ['messaging-platform/v1/protocol-compatibility.shared-schema.yaml'],
  C23: ['messaging-platform/v1/platform-profile.shared-schema.yaml', 'messaging-platform/v1/transport-conformance.asyncapi.yaml'],
  C24: ['recovery-coordination/v1/bootstrap-participant.openapi.yaml'],
  C25: ['recovery-coordination/v1/participant-protocol.asyncapi.yaml'],
  C26: ['recovery-coordination/v1/control-status.openapi.yaml'],
  C27: ['recovery-coordination/v1/recovery-audit.asyncapi.yaml']
});

async function sourceFiles(root, prefix = '') {
  const files = [];
  for (const item of await readdir(join(root, prefix), { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) files.push(...await sourceFiles(root, relative));
    else if (item.isFile()) files.push(relative);
    else assert.fail(`Nonregular canonical source: ${relative}`);
  }
  return files.sort();
}

function kindOf(path) {
  if (path.endsWith('.openapi.yaml')) return 'openapi';
  if (path.endsWith('.asyncapi.yaml')) return 'asyncapi';
  if (path.endsWith('.schema.json') || path.endsWith('.shared-schema.yaml')) return 'schema';
  assert.fail(`Unclassified canonical source: ${path}`);
}

async function entriesFor(paths, root = sourceRoot) {
  return Promise.all(paths.map(async document => ({
    document, artifactKind: kindOf(document), contentDigest: digest(await readFile(join(root, document)))
  })));
}

function expectBudgetError(error, code) {
  assert.equal(error?.code, code);
  assert.equal(error?.ruleId, 'NFR10.1');
  return true;
}

test('C01-C27 inventory maps every present canonical source and exposes missing kinds', async t => {
  assert.deepEqual(Object.keys(sourcesByBoundary), ALL_BOUNDARIES);
  const actual = await sourceFiles(sourceRoot);
  const inventoried = [...new Set(Object.values(sourcesByBoundary).flat())].sort();
  assert.deepEqual(actual, inventoried);
  const requiredKinds = Object.fromEntries(ALL_BOUNDARIES.map(id => [id,
    Object.entries(CANONICAL_KINDS).filter(([, ids]) => ids.split(' ').includes(id)).map(([kind]) => kind)]));
  const gaps = ALL_BOUNDARIES.filter(id => requiredKinds[id].some(kind =>
    !sourcesByBoundary[id].some(path => kindOf(path) === kind)));
  t.diagnostic(`present=${actual.length}; incomplete=${gaps.join(',')}; required kinds=${JSON.stringify(requiredKinds)}`);
  assert.deepEqual(gaps, [], 'every required canonical kind must have a real source');
  assert.deepEqual(requiredKinds.C18, ['openapi']);
});

test('every present source selects its declared dialect without profile fallback', async () => {
  const policy = { requiredCanonicalPaths: FIXED_PATHS };
  for (const path of await sourceFiles(sourceRoot)) {
    const boundaryIds = ALL_BOUNDARIES.filter(id => sourcesByBoundary[id].includes(path));
    const artifactKind = kindOf(path);
    const { dialect } = detectDialect({ document: path, artifactKind, boundaryIds },
      await readFile(join(sourceRoot, path)), policy);
    if (artifactKind === 'openapi') assert.equal(dialect, DIALECTS.openapi, path);
    else if (artifactKind === 'asyncapi') assert.equal(dialect, DIALECTS.asyncapi, path);
    else if (path.endsWith('/finalize-heavy-work.shared-schema.yaml')) assert.equal(dialect, DIALECTS.typedPort, path);
    else if (path.endsWith('/supplier-authority-head.shared-schema.yaml')) assert.equal(dialect, DIALECTS.governedRecord, path);
    else if (path.endsWith('/inventory-operations.shared-schema.yaml')) assert.equal(dialect, DIALECTS.inProcessPort, path);
    else assert.equal(dialect, DIALECTS.schema, path);
  }
});

test('draft canonical sources and governed profile candidates pass the protected-content gate', async () => {
  for (const root of [sourceRoot, join(repository, 'contracts/profiles')]) {
    for (const path of await sourceFiles(root)) {
      const bytes = await readFile(join(root, path));
      assert.doesNotThrow(() => inspectContent(path, bytes), path);
    }
  }
});

test('actual present sources stay within the package-wide 1024 reference cap', async t => {
  assert.equal(LIMITS.references, 1024);
  assert.equal(LIMITS.referenceDepth, 32);
  const paths = await sourceFiles(sourceRoot);
  let rawOccurrences = 0;
  for (const path of paths) {
    const content = await readFile(join(sourceRoot, path), 'utf8');
    const parsed = path.endsWith('.json') ? JSON.parse(content) : YAML.parse(content, { strict: true, uniqueKeys: true });
    const pending = [parsed];
    while (pending.length) {
      const node = pending.pop();
      if (!node || typeof node !== 'object') continue;
      for (const [key, value] of Object.entries(node)) {
        if (['$ref', '$dynamicRef', '$recursiveRef'].includes(key)) rawOccurrences++;
        pending.push(value);
      }
    }
  }
  assert.ok(rawOccurrences <= LIMITS.references);
  const started = performance.now();
  const count = await preflightCanonicalReferences(sourceRoot, await entriesFor(paths), { offlineReferences: [] });
  t.diagnostic(`present-source graph: ${count} references, ${(performance.now() - started).toFixed(1)} ms, ${paths.length} files`);
  assert.equal(count, rawOccurrences);
});

test('reference depth 32 passes and 33 fails with a stable finding', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-depth-budget-'));
  try {
    for (const depth of [32, 33]) {
      const definitions = Object.fromEntries(Array.from({ length: depth }, (_, i) =>
        [`node${i}`, i === depth - 1 ? { type: 'string' } : { $ref: `#/$defs/node${i + 1}` }]));
      const bytes = Buffer.from(JSON.stringify({ $schema: 'https://json-schema.org/draft/2020-12/schema',
        $ref: '#/$defs/node0', $defs: definitions }));
      await writeFile(join(root, 'depth.schema.json'), bytes);
      const entries = [{ document: 'depth.schema.json', artifactKind: 'schema', contentDigest: digest(bytes) }];
      if (depth === 32) assert.equal(await preflightCanonicalReferences(root, entries), depth);
      else await assert.rejects(preflightCanonicalReferences(root, entries), error => expectBudgetError(error, 'REFERENCE_DEPTH_LIMIT'));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('real C18 source accepts 1024 occurrences and rejects 1025 with a stable finding', async t => {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-catalogue-budget-'));
  try {
    const original = await readFile(join(sourceRoot, c18), 'utf8');
    const existing = (original.match(/\$ref\s*:/g) ?? []).length;
    assert.ok(existing > 0 && existing < 1024, 'test must extend a real, nonempty canonical source');
    for (const target of [1024, 1025]) {
      const added = Array.from({ length: target - existing }, () => '  - { $ref: "#/components/schemas/SessionResponse" }').join('\n');
      const bytes = Buffer.from(`${original}\nx-reference-budget:\n${added}\n`);
      await writeFile(join(root, 'browser.openapi.yaml'), bytes);
      const entries = [{ document: 'browser.openapi.yaml', artifactKind: 'openapi', contentDigest: digest(bytes) }];
      const started = performance.now();
      if (target === 1024) assert.equal(await preflightCanonicalReferences(root, entries), target);
      else await assert.rejects(preflightCanonicalReferences(root, entries), error => expectBudgetError(error, 'REFERENCE_LIMIT'));
      t.diagnostic(`C18-derived ${target}: ${(performance.now() - started).toFixed(1)} ms`);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('pinned C18 validator reports elapsed time and its own peak RSS below retained bounds', t => {
  const validator = join(repository, 'tools/contracts/node_modules/@redocly/cli/bin/cli.js');
  const config = join(repository, 'tools/contracts/redocly.yaml');
  const marker = 'STOCKSENSE_PEAK_RSS_BYTES=';
  const preload = `process.on('exit',()=>process.stderr.write('${marker}'+process.resourceUsage().maxRSS*1024+'\\n'))`;
  const started = performance.now();
  const result = spawnSync(process.execPath,
    ['--import', `data:text/javascript;base64,${Buffer.from(preload).toString('base64')}`,
      validator, 'lint', join(sourceRoot, c18), '--config', config, '--format', 'json'],
    { cwd: join(repository, 'tools/contracts'), encoding: 'utf8', timeout: LIMITS.validatorMs, maxBuffer: 4 * 1024 * 1024 });
  const elapsedMs = performance.now() - started;
  const match = result.stderr?.match(new RegExp(`${marker}(\\d+)`));
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.ok(match, 'validator process must report its own measured peak RSS');
  const peakRssBytes = Number(match[1]);
  t.diagnostic(`C18 Redocly: ${elapsedMs.toFixed(1)} ms; peak RSS ${peakRssBytes} bytes; exit ${result.status}`);
  assert.ok(elapsedMs <= LIMITS.validatorMs);
  assert.ok(peakRssBytes > 0 && peakRssBytes <= LIMITS.processBytes);
  assert.equal(LIMITS.validatorMs, 60_000);
  assert.equal(LIMITS.processBytes, 2_147_483_648);
});

test('full C01-C27 catalogue resource acceptance awaits real required canonical kinds', async t => {
  const missing = ALL_BOUNDARIES.filter(id => Object.entries(CANONICAL_KINDS).some(([kind, ids]) =>
    ids.split(' ').includes(id) && !sourcesByBoundary[id].some(path => kindOf(path) === kind)));
  assert.deepEqual(missing, [], 'canonical kind inventory must stay complete');
  // Kind inventory alone cannot establish BR1.3 validation, revision-bound
  // fixtures, sidecars, or a full-catalogue supervised resource measurement.
  t.todo('full-catalogue package validation and process-RSS measurement remain required');
});
