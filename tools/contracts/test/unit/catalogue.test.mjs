import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { ALL_BOUNDARIES, CANONICAL_KINDS } from '../../src/package-loader.mjs';
import { buildSourceInventory } from '../../src/catalogue.mjs';

const repository = resolve(import.meta.dirname, '../../../..');

test('full source inventory binds every canonical kind to committed bytes', async () => {
  const inventory = await buildSourceInventory(repository);
  assert.match(inventory.sourceRevision, /^[0-9a-f]{40}$/);
  assert.match(inventory.mapDigest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(inventory.entries.length, 38);
  assert.ok(inventory.entries.every(entry => /^U(1|3|4|5|6|7|8|9|10|11|13|14|15) /.test(entry.semanticOwner)));
  assert.equal(inventory.entries.find(entry => entry.document === 'common/v1/message-envelope.schema.json')?.semanticOwner,
    'U1 Contracts');
  assert.equal(inventory.entries.find(entry => entry.document === 'web-bff/v1/browser-api.openapi.yaml')?.semanticOwner,
    'U11 Web BFF');
  const covered = new Set(inventory.entries.flatMap(entry => entry.boundaryIds));
  assert.deepEqual([...covered].sort(), [...ALL_BOUNDARIES]);
  for (const id of ALL_BOUNDARIES) {
    for (const [kind, ids] of Object.entries(CANONICAL_KINDS)) {
      if (ids.split(' ').includes(id)) {
        assert.ok(inventory.entries.some(entry => entry.boundaryIds.includes(id) && entry.artifactKind === kind),
          `${id} lacks ${kind}`);
      }
    }
  }
});
