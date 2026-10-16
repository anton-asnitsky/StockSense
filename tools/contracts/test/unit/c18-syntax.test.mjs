import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import YAML from 'yaml';

const c18 = new URL('../../../../contracts/source/web-bff/v1/browser-api.openapi.yaml', import.meta.url);

test('canonical C18 browser API parses with its comma-bearing descriptions intact', async () => {
  const source = await readFile(c18, 'utf8');
  const document = YAML.parseDocument(source, { strict: true, uniqueKeys: true });
  assert.deepEqual(document.errors, []);
  assert.equal(document.getIn(['paths', '/api/v1/session', 'get', 'responses', '200', 'description']),
    'Session, roles, authorized retailer choices and contract metadata');
});

test('an unquoted comma-bearing C18 flow description loses its intended value', () => {
  const malformed = "responses:\n  '200': { description: Session, roles, authorized retailer choices and contract metadata, content: {} }\n";
  const document = YAML.parseDocument(malformed, { strict: true, uniqueKeys: true });
  assert.notEqual(document.getIn(['responses', '200', 'description']),
    'Session, roles, authorized retailer choices and contract metadata');
});
