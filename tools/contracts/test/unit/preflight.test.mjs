import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { enforcePackageBudget, inspectContent, inspectReferences, limitFindings, LIMITS, sanitizeFinding } from '../../src/preflight.mjs';
import { preflightCanonicalReferences } from '../../src/reference-preflight.mjs';
import { digest } from '../../src/package-loader.mjs';
import { materializeOfflineReferences } from '../../src/validate.mjs';
import { createSchemaValidator } from '../../src/validators.mjs';

const code = (fn, expected) => assert.throws(fn, error => error.code === expected);

test('synthetic placeholder and ordinary schema text pass content gate', () => {
  assert.equal(inspectContent('schema.json', '{"example":"synthetic:credential-example","type":"object"}'), true);
});
test('per-source and package budgets reject oversized inputs', () => {
  code(() => inspectContent('large.json', Buffer.alloc(LIMITS.sourceBytes + 1, 65)), 'SOURCE_SIZE_LIMIT');
  code(() => enforcePackageBudget({ totalBytes: LIMITS.packageBytes + 1 }), 'PACKAGE_SIZE_LIMIT');
});
test('reference count and recursive graph are bounded', () => {
  assert.equal(inspectReferences(Array.from({ length: 1024 }, (_, i) => ({ from: 'a' + i, to: 'b' + i }))), 1024);
  code(() => inspectReferences(Array.from({ length: 1025 }, (_, i) => ({ from: 'a' + i, to: 'b' + i }))), 'REFERENCE_LIMIT');
  code(() => inspectReferences([{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }]), 'REFERENCE_CYCLE');
});
test('remote reference requires pinned HTTPS allowlist', () => {
  code(() => inspectReferences([{ from: 'a', to: 'http://example.invalid/schema' }]), 'REFERENCE_POLICY');
  assert.equal(inspectReferences([{ from: 'a', to: 'https://example.invalid/schema' }],
    { allowedRemote: { 'https://example.invalid/schema': 'sha256:' + 'a'.repeat(64) } }), 1);
});
test('protected supplier, prompt, reasoning and credential bytes are rejected', () => {
  for (const value of ['rawSupplierDocument: secret', 'fullPrompt: instructions', 'hiddenReasoning: trace',
    'client_secret: abcdefghijklmnop', '%PDF-1.7']) code(() => inspectContent('input', value), 'PROTECTED_CONTENT');
});
test('NFR6.1: short and punctuation-only credential assignments are protected', () => {
  for (const value of ['password=letmein9', 'const password = "letmein9";', 'password="!"', 'client_secret="!"']) {
    assert.throws(() => inspectContent('output.ts', value),
      error => error.code === 'PROTECTED_CONTENT' && error.ruleId === 'NFR6.1');
  }
  assert.equal(inspectContent('fixture.txt', 'password=synthetic:example'), true);
  assert.equal(inspectContent('fixture.txt', 'password="synthetic:example"'), true);
});
test('untrusted hooks and binary payloads are rejected', () => {
  code(() => inspectContent('input', 'postinstall: node install.js'), 'HOOK_FORBIDDEN');
  code(() => inspectContent('input', Buffer.from([0, 255])), 'BINARY_CONTENT');
});
test('NFR6.2: Deno executable tasks are rejected without banning ordinary task schemas', () => {
  assert.throws(() => inspectContent('deno.json', '{"tasks":{"build":"deno run build.ts"}}'),
    error => error.code === 'HOOK_FORBIDDEN' && error.ruleId === 'NFR6.2');
  assert.equal(inspectContent('schema.json', '{"properties":{"tasks":{"type":"array"}}}'), true);
});
test('diagnostics drop attacker-controlled annotation and source text', () => {
  const result = sanitizeFinding({ code: 'BAD_1', ruleId: 'NFR6.1', severity: 'error', path: 'common/schema.json', line: 2,
    message: '::error:: token=abcdefghijklmnop' });
  assert.equal(result.path, 'common/schema.json');
  assert.doesNotMatch(result.message, /token|::error::/);
  code(() => sanitizeFinding({ path: 'C:\\agent\\secret.txt' }), 'UNSAFE_DIAGNOSTIC');
});
test('diagnostic limit is a failing result', () => {
  code(() => limitFindings(Array.from({ length: 201 }, () => ({ code: 'BAD', ruleId: 'NFR10.1', path: 'a.json' }))), 'DIAGNOSTIC_LIMIT');
});

async function withCanonical(document, content, check) {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-ref-preflight-'));
  try {
    await mkdir(dirname(join(root, document)), { recursive: true });
    await writeFile(join(root, document), content);
    await check(root, [{ artifactKind: document.endsWith('.json') ? 'schema' : 'openapi', document }]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const rejected = (promise, expectedCode, expectedRule) => assert.rejects(promise,
  error => error.code === expectedCode && error.ruleId === expectedRule);

test('YAML local JSON pointer is resolved before standards validation', async () => {
  await withCanonical('api/v1/source.yaml', 'openapi: 3.1.2\nitem: { $ref: "#/defs/Item" }\ndefs: { Item: { type: object } }\n',
    async (root, entries) => assert.equal(await preflightCanonicalReferences(root, entries), 1));
});

test('a leading same-directory reference is allowed without permitting traversal', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-ref-local-'));
  try {
    await mkdir(join(root, 'api'));
    await writeFile(join(root, 'api/source.yaml'), 'openapi: 3.1.2\nitem: { $ref: "./target.json#/defs/Item" }\n');
    await writeFile(join(root, 'api/target.json'), JSON.stringify({ defs: { Item: { type: 'object' } } }));
    const entries = [{ artifactKind: 'openapi', document: 'api/source.yaml' },
      { artifactKind: 'schema', document: 'api/target.json' }];
    assert.equal(await preflightCanonicalReferences(root, entries), 1);
    await writeFile(join(root, 'api/source.yaml'), 'item: { $ref: "./../outside.json" }\n');
    await rejected(preflightCanonicalReferences(root, entries), 'REFERENCE_POLICY', 'NFR6.2');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('YAML and JSON remote references fail with the same stable rule', async () => {
  for (const [path, source] of [
    ['api/v1/source.yaml', 'openapi: 3.1.2\nitem: { $ref: "https://example.invalid/schema.yaml" }\n'],
    ['api/v1/source.json', JSON.stringify({ $ref: 'https://example.invalid/schema.json' })]
  ]) {
    await withCanonical(path, source, (root, entries) =>
      rejected(preflightCanonicalReferences(root, entries), 'REFERENCE_POLICY', 'NFR6.2'));
  }
});

test('absolute reference to the synthetic package origin cannot trigger validator network resolution', async () => {
  await withCanonical('api/v1/source.yaml',
    'item: { $ref: "https://stocksense-package.invalid/api/v1/source.yaml#/defs/Item" }\ndefs: { Item: { type: object } }\n',
    (root, entries) => rejected(preflightCanonicalReferences(root, entries), 'REFERENCE_POLICY', 'NFR6.2'));
});

test('YAML traversal and encoded traversal fail before local file access', async () => {
  for (const target of ['../outside.yaml', '%2e%2e/outside.yaml', 'file:///outside.yaml']) {
    await withCanonical('api/v1/source.yaml', `item: { $ref: "${target}" }\n`, (root, entries) =>
      rejected(preflightCanonicalReferences(root, entries), 'REFERENCE_POLICY', 'NFR6.2'));
  }
});

test('YAML reference count passes at 1024 and fails at 1025', async () => {
  for (const count of [LIMITS.references, LIMITS.references + 1]) {
    const refs = Array.from({ length: count }, () => '  - { $ref: "#/defs/Item" }').join('\n');
    await withCanonical('api/v1/source.yaml', `items:\n${refs}\ndefs: { Item: { type: object } }\n`,
      (root, entries) => count === LIMITS.references
        ? preflightCanonicalReferences(root, entries).then(actual => assert.equal(actual, count))
        : rejected(preflightCanonicalReferences(root, entries), 'REFERENCE_LIMIT', 'NFR10.1'));
  }
});

test('YAML recursive reference and missing target fail closed', async () => {
  await withCanonical('api/v1/source.yaml', 'item: { $ref: "#/defs/A" }\ndefs: { A: { $ref: "#/defs/A" } }\n',
    (root, entries) => rejected(preflightCanonicalReferences(root, entries), 'REFERENCE_CYCLE', 'NFR10.1'));
  await withCanonical('api/v1/source.yaml', 'item: { $ref: "missing.yaml#/defs/A" }\n',
    (root, entries) => rejected(preflightCanonicalReferences(root, entries), 'REFERENCE_TARGET', 'NFR6.2'));
});

test('OpenAPI, AsyncAPI, shared schema and typed-port references share one counter', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-ref-kinds-'));
  try {
    const sources = [
      ['rest.yaml', 'openapi', 'item: { $ref: "#/defs/Item" }\ndefs: { Item: { type: object } }\n'],
      ['events.yaml', 'asyncapi', 'item: { $ref: "#/defs/Item" }\ndefs: { Item: { type: object } }\n'],
      ['shared.json', 'schema', JSON.stringify({ item: { $ref: '#/defs/Item' }, defs: { Item: { type: 'object' } } })],
      ['port.yaml', 'schema', 'item: { $ref: "#/defs/Item" }\ndefs: { Item: { type: object } }\n']
    ];
    await Promise.all(sources.map(([path, , content]) => writeFile(join(root, path), content)));
    assert.equal(await preflightCanonicalReferences(root,
      sources.map(([document, artifactKind]) => ({ document, artifactKind }))), 4);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('repeated incoming references charge the target body once', async () => {
  await withCanonical('api/source.yaml', [
    'first: { $ref: "#/defs/A" }',
    'second: { $ref: "#/defs/A" }',
    'defs: { A: { next: { $ref: "#/defs/B" } }, B: { type: object } }', ''
  ].join('\n'), async (root, entries) => {
    assert.equal(await preflightCanonicalReferences(root, entries), 3);
  });
});

test('effective $id resolves only to a declared digest-checked schema', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-ref-id-'));
  try {
    const source = { $id: 'sub/source.json', $ref: 'target.json#/$defs/Item' };
    const target = { $defs: { Item: { type: 'object' } } };
    await mkdir(join(root, 'sub'));
    await writeFile(join(root, 'source.json'), JSON.stringify(source));
    await writeFile(join(root, 'sub/target.json'), JSON.stringify(target));
    const entries = [
      { artifactKind: 'schema', document: 'source.json' },
      { artifactKind: 'schema', document: 'sub/target.json', contentDigest: 'sha256:' + '0'.repeat(64) }
    ];
    await rejected(preflightCanonicalReferences(root, entries), 'DIGEST_MISMATCH', 'BR1.1');
    delete entries[1].contentDigest;
    await rejected(preflightCanonicalReferences(root, entries), 'REFERENCE_TARGET_MISMATCH', 'NFR6.2');
    source.$id = 'source.json';
    source.$ref = 'sub/target.json#/$defs/Item';
    await writeFile(join(root, 'source.json'), JSON.stringify(source));
    assert.equal(await preflightCanonicalReferences(root, entries), 1);
    source.$id = 'https://other.invalid/v1/source.json';
    await writeFile(join(root, 'source.json'), JSON.stringify(source));
    await rejected(preflightCanonicalReferences(root, entries), 'REFERENCE_POLICY', 'NFR6.2');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('schema $id cannot claim another declared physical URI in either manifest order', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-ref-id-conflict-'));
  try {
    await writeFile(join(root, 'a.json'), JSON.stringify({ $id: 'b.json', type: 'object' }));
    await writeFile(join(root, 'b.json'), JSON.stringify({ type: 'object' }));
    const a = { artifactKind: 'schema', document: 'a.json' };
    const b = { artifactKind: 'schema', document: 'b.json' };
    for (const entries of [[a, b], [b, a]]) {
      await rejected(preflightCanonicalReferences(root, entries), 'REFERENCE_ID_CONFLICT', 'NFR6.2');
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('relative references use the effective logical $id only when the physical package target agrees', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-ref-rebased-'));
  try {
    const base = 'https://contracts.stocksense.local/common/v1/';
    const source = 'common/v1/source.schema.json';
    const target = 'common/v1/target.schema.json';
    const sourceBytes = Buffer.from(JSON.stringify({ $id: base + 'source.schema.json',
      $ref: 'target.schema.json#/$defs/Item' }));
    const targetBytes = Buffer.from(JSON.stringify({ $id: base + 'target.schema.json',
      $defs: { Item: { type: 'object' } } }));
    await mkdir(dirname(join(root, source)), { recursive: true });
    await writeFile(join(root, source), sourceBytes);
    await writeFile(join(root, target), targetBytes);
    const entries = [
      { artifactKind: 'schema', document: source, contentDigest: digest(sourceBytes) },
      { artifactKind: 'schema', document: target, contentDigest: digest(targetBytes) }
    ];
    assert.equal(await preflightCanonicalReferences(root, entries), 1);
    const mismatchedSource = Buffer.from(JSON.stringify({ $id: base + 'source.schema.json',
      $ref: 'missing.schema.json#/$defs/Item' }));
    const mismatchedTarget = Buffer.from(JSON.stringify({ $id: base + 'missing.schema.json',
      $defs: { Item: { type: 'object' } } }));
    await writeFile(join(root, source), mismatchedSource);
    await writeFile(join(root, target), mismatchedTarget);
    entries[0].contentDigest = digest(mismatchedSource);
    entries[1].contentDigest = digest(mismatchedTarget);
    await rejected(preflightCanonicalReferences(root, entries), 'REFERENCE_TARGET_MISMATCH', 'NFR6.2');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('fragment-only references under a nested $id cannot bind a different physical node', async () => {
  const source = 'schema.json';
  const mismatched = { $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://contracts.stocksense.local/schema.json', $defs: { Item: { type: 'string' } },
    type: 'object', properties: {
      nested: { $id: 'https://contracts.stocksense.local/nested.schema.json',
        type: 'object', $defs: { Item: { type: 'number' } },
        properties: { value: { $ref: '#/$defs/Item' } } }
    } };
  const pinnedAjv = createSchemaValidator(mismatched);
  assert.equal(pinnedAjv({ nested: { value: 3 } }), true);
  assert.equal(pinnedAjv({ nested: { value: 'three' } }), false);
  await withCanonical(source, JSON.stringify(mismatched), (root, entries) =>
    rejected(preflightCanonicalReferences(root, entries), 'REFERENCE_TARGET_MISMATCH', 'NFR6.2'));
  const matching = { $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://contracts.stocksense.local/schema.json', $defs: { Item: { type: 'string' } },
    $ref: '#/$defs/Item' };
  await withCanonical(source, JSON.stringify(matching), async (root, entries) => {
    assert.equal(await preflightCanonicalReferences(root, entries), 1);
  });
});

test('digest-pinned C01 identity maps to packaged bytes without a network reference', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-ref-offline-'));
  try {
    const envelope = 'common/v1/message-envelope.schema.json';
    const event = 'retail-data/v1/changed.asyncapi.yaml';
    const id = 'https://contracts.stocksense.local/' + envelope;
    const envelopeBytes = Buffer.from(JSON.stringify({ $id: id, type: 'object' }));
    const eventBytes = Buffer.from(`asyncapi: 3.0.0\npayload: { $ref: "${id}" }\n`);
    await mkdir(dirname(join(root, envelope)), { recursive: true });
    await mkdir(dirname(join(root, event)), { recursive: true });
    await writeFile(join(root, envelope), envelopeBytes);
    await writeFile(join(root, event), eventBytes);
    const entries = [
      { artifactKind: 'schema', document: envelope, contentDigest: digest(envelopeBytes) },
      { artifactKind: 'asyncapi', document: event, contentDigest: digest(eventBytes) }
    ];
    await rejected(preflightCanonicalReferences(root, entries), 'REFERENCE_POLICY', 'NFR6.2');
    const offlineReferences = [];
    assert.equal(await preflightCanonicalReferences(root, entries, { offlineReferences }), 1);
    assert.deepEqual(offlineReferences, [{ sourceDocument: event, referenceValue: id,
      localReference: '../../common/v1/message-envelope.schema.json' }]);
    const materialized = materializeOfflineReferences(eventBytes, event, offlineReferences).toString('utf8');
    assert.match(materialized, /\.\.\/\.\.\/common\/v1\/message-envelope\.schema\.json/);
    assert.doesNotMatch(materialized, /https:\/\//);
    code(() => materializeOfflineReferences(Buffer.from('asyncapi: 3.0.0\n'), event, offlineReferences),
      'REFERENCE_TARGET_MISMATCH');
    await writeFile(join(root, envelope), JSON.stringify({ $id: id, type: 'not-a-json-schema-type' }));
    await rejected(preflightCanonicalReferences(root, entries, { offlineReferences: [] }), 'DIGEST_MISMATCH', 'BR1.1');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
