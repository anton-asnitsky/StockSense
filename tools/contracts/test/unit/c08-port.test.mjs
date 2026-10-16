import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import YAML from 'yaml';
import { C08_PORT_PATH, DIALECTS, detectDialect, validateCanonical } from '../../src/validators.mjs';

const sourcePath = resolve(import.meta.dirname, '../../../../contracts/source', C08_PORT_PATH);
const entry = { document: C08_PORT_PATH, artifactKind: 'schema', boundaryIds: ['C08'] };

async function source() {
  return YAML.parse(await readFile(sourcePath, 'utf8'), { strict: true, uniqueKeys: true });
}

async function validateVariant(change) {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-c08-'));
  try {
    const variant = await source();
    change(variant);
    const path = join(root, 'port.yaml');
    await writeFile(path, YAML.stringify(variant));
    return await validateCanonical(entry, path);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('C08 is a closed in-process port under one caller-owned transaction', async () => {
  const result = await validateCanonical(entry, sourcePath);
  assert.equal(result.dialect, DIALECTS.inProcessPort);
  assert.equal(result.valid, true);
});

test('C08 refuses cross-schema SQL or a split transaction', async () => {
  await assert.rejects(validateVariant(port => { port.transaction.crossSchemaSql = 'allowed'; }),
    { code: 'C08_PORT_SHAPE', ruleId: 'BR1.3' });
  await assert.rejects(validateVariant(port => { port.transaction.owner = 'retail-data-handler'; }),
    { code: 'C08_PORT_SHAPE', ruleId: 'BR1.3' });
});

test('C08 refuses weaker receipt and commitment invariants', async () => {
  await assert.rejects(validateVariant(port => { port.operations.recordReceipt.invariant = 'best-effort'; }),
    { code: 'C08_PORT_SHAPE', ruleId: 'BR1.3' });
  await assert.rejects(validateVariant(port => { delete port.operations.createApprovedCommitments.invariant; }),
    { code: 'C08_PORT_SHAPE', ruleId: 'BR1.3' });
});

test('C08 refuses undeclared operations and weakened errors', async () => {
  await assert.rejects(validateVariant(port => { port.operations.adjustStock = { input: ['quantity'] }; }),
    { code: 'C08_PORT_SHAPE', ruleId: 'BR1.3' });
  await assert.rejects(validateVariant(port => { port.errors['over-receipt'] = 'accepted'; }),
    { code: 'C08_PORT_SHAPE', ruleId: 'BR1.3' });
});

test('C08 rejects path, boundary, kind and dialect substitution', async () => {
  const bytes = await readFile(sourcePath);
  assert.throws(() => detectDialect({ ...entry, document: 'other/port.yaml' }, bytes),
    { code: 'C08_PATH', ruleId: 'BR1.3' });
  assert.throws(() => detectDialect({ ...entry, boundaryIds: ['C07'] }, bytes),
    { code: 'C08_DISPATCH', ruleId: 'BR1.3' });
  assert.throws(() => detectDialect({ ...entry, artifactKind: 'openapi' }, bytes),
    { code: 'C08_DISPATCH', ruleId: 'BR1.3' });
  assert.throws(() => detectDialect({ ...entry, schemaDialect: DIALECTS.schema }, bytes),
    { code: 'C08_DISPATCH', ruleId: 'BR1.3' });
});

test('C08 rejects a JSON Schema marker rather than falling back to another validator', async () => {
  await assert.rejects(validateVariant(port => { port.$schema = DIALECTS.schema; }),
    { code: 'C08_DISPATCH', ruleId: 'BR1.3' });
});
