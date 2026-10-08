import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { validateSchemaGraph } from '../../src/container-schema-validator.mjs';

const DIALECT = 'https://json-schema.org/draft/2020-12/schema';
const hash = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const invalid = promise => assert.rejects(promise, error => error.message === 'Verified schema graph failed validation');

async function withGraph(action) {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-schema-worker-'));
  const indexPath = join(root, 'index.json');
  const entries = new Map();
  async function put(document, value) {
    const bytes = Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));
    const path = join(root, ...document.split('/'));
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
    entries.set(document, { document, digest: hash(bytes) });
    return entries.get(document);
  }
  async function run(mode, sourceDocument, schemaPaths) {
    const source = { ...entries.get(sourceDocument), artifactKind: mode === 'schema:2020-12' ? 'schema' : 'asyncapi' };
    const schemas = schemaPaths.map(path => entries.get(path));
    await writeFile(indexPath, JSON.stringify({ version: 1, source, schemas }));
    return validateSchemaGraph({ root, indexPath, sourceDocument, mode });
  }
  try { return await action({ root, indexPath, put, run, entries }); }
  finally { await rm(root, { recursive: true, force: true }); }
}

const schema = (name, additional = {}) => ({
  $schema: DIALECT, $id: `https://contracts.stocksense.local/common/${name}.schema.json`,
  type: 'object', ...additional
});

test('compiles every declared 2020-12 schema in one registry, including YAML', async () => {
  await withGraph(async ({ put, run }) => {
    await put('common/a.schema.json', schema('a', { properties: { value: { $ref: './b.schema.json' } } }));
    await put('common/b.schema.json', schema('b', { properties: { id: { type: 'string', format: 'uuid' } } }));
    await put('common/c.shared-schema.yaml', `$schema: ${DIALECT}\n$id: https://contracts.stocksense.local/common/c.shared-schema.yaml\ntype: object\nproperties:\n  value:\n    type: integer\n`);
    await put('model-lifecycle/v1/finalize-heavy-work.shared-schema.yaml',
      'kind: typed-port\nport: model_lifecycle.finalize_heavy_work_v1\n');
    assert.deepEqual(await run('schema:2020-12', 'common/a.schema.json',
      ['common/a.schema.json', 'common/b.schema.json', 'common/c.shared-schema.yaml',
        'model-lifecycle/v1/finalize-heavy-work.shared-schema.yaml']),
    { valid: true, compiled: 3 });
  });
});

test('an invalid sibling schema or conflicting ID blocks the selected schema', async () => {
  await withGraph(async ({ put, run }) => {
    await put('common/a.schema.json', schema('a'));
    await put('common/b.schema.json', schema('b', { type: 'not-a-type' }));
    await invalid(run('schema:2020-12', 'common/a.schema.json', ['common/a.schema.json', 'common/b.schema.json']));
    await put('common/b.schema.json', schema('a'));
    await invalid(run('schema:2020-12', 'common/a.schema.json', ['common/a.schema.json', 'common/b.schema.json']));
  });
});

test('missing, malformed and tampered schema declarations fail closed', async () => {
  await withGraph(async ({ put, run, indexPath, entries, root }) => {
    await put('common/a.schema.json', schema('a', { properties: { value: { $ref: './missing.schema.json' } } }));
    await invalid(run('schema:2020-12', 'common/a.schema.json', ['common/a.schema.json']));
    await put('common/a.schema.json', { $schema: 'https://json-schema.org/draft/2019-09/schema', type: 'object' });
    await invalid(run('schema:2020-12', 'common/a.schema.json', ['common/a.schema.json']));
    await put('common/a.schema.json', schema('a'));
    await writeFile(indexPath, JSON.stringify({ version: 1,
      source: { ...entries.get('common/a.schema.json'), artifactKind: 'schema' },
      schemas: [{ document: 'common/a.schema.json', digest: 'sha256:' + '0'.repeat(64) }] }));
    await invalid(validateSchemaGraph({ root, indexPath, sourceDocument: 'common/a.schema.json', mode: 'schema:2020-12' }));
    await writeFile(indexPath, JSON.stringify({ version: 1,
      source: { document: 'common/a.schema.json', digest: 'sha256:' + '0'.repeat(64), artifactKind: 'schema' },
      schemas: [entries.get('common/a.schema.json')] }));
    await invalid(validateSchemaGraph({ root, indexPath, sourceDocument: 'common/a.schema.json', mode: 'schema:2020-12' }));
  });
});

test('AsyncAPI mode compiles inline and reusable component payload schemas against local graph IDs', async () => {
  await withGraph(async ({ put, run }) => {
    await put('common/a.schema.json', schema('a', { required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } }));
    await put('events/v1/changed.asyncapi.yaml', `asyncapi: 3.0.0\nchannels:\n  changed:\n    messages:\n      Changed:\n        payload:\n          schemaFormat: application/schema+json;version=draft-2020-12\n          schema:\n            allOf:\n              - $ref: ../../common/a.schema.json\n              - type: object\ncomponents:\n  messages:\n    Reused:\n      payload:\n        schemaFormat: application/schema+json;version=draft-2020-12\n        schema:\n          type: object\n          properties:\n            id:\n              type: string\n`);
    assert.deepEqual(await run('asyncapi-payloads:2020-12', 'events/v1/changed.asyncapi.yaml',
      ['common/a.schema.json']), { valid: true, compiled: 3 });
  });
});

test('AsyncAPI mode refuses invalid reusable payloads, unsupported formats and outside-graph references', async () => {
  await withGraph(async ({ put, run }) => {
    await put('events/v1/changed.asyncapi.yaml', { asyncapi: '3.0.0', components: { messages: { Reused: {
      payload: { schemaFormat: 'application/schema+json;version=draft-2020-12', schema: { type: 'invalid' } }
    } } } });
    await invalid(run('asyncapi-payloads:2020-12', 'events/v1/changed.asyncapi.yaml', []));
    await put('events/v1/changed.asyncapi.yaml', { asyncapi: '3.0.0', components: { messages: { Reused: {
      payload: { schemaFormat: 'application/schema+json;version=draft-2019-09', schema: { type: 'object' } }
    } } } });
    await invalid(run('asyncapi-payloads:2020-12', 'events/v1/changed.asyncapi.yaml', []));
    await put('events/v1/changed.asyncapi.yaml', { asyncapi: '3.0.0', components: { messages: { Reused: {
      payload: { schemaFormat: 'application/schema+json;version=draft-2020-12',
        schema: { $ref: 'https://outside.example/schema.json' } }
    } } } });
    await invalid(run('asyncapi-payloads:2020-12', 'events/v1/changed.asyncapi.yaml', []));
  });
});
