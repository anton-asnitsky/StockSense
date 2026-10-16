import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import YAML from 'yaml';
import { deriveIdentity, digest } from '../../src/package-loader.mjs';
import { openApiInlineResponseElements } from '../../src/policy.mjs';

const repository = resolve(import.meta.dirname, '../../../..');
const sourceRoot = join(repository, 'contracts/source');
const toolRoot = join(repository, 'tools/contracts');
const route = '/api/v1/retailers/{retailerId}';

// These are the seven explicit exemptions in the 2026-10-15 inventory. A source
// edit must receive a new digest/revision and a deliberate contract review.
const cases = [
  {
    boundary: 'C03', owner: 'U4 Retail Data', document: 'retail-data/v1/supplier-reference.openapi.yaml',
    contentDigest: 'sha256:521dbc27982f6e11670356d7916c769bbf25b1b7517736d77e074e8a1decc982',
    revisionId: 'sha256:cd9231d2d10692e03568185a3ae795efdb73bda58f031a1b5059b3a8adc56c51',
    operations: [
      [`${route}/supplier-reference`, 'get', 'getSupplierReferenceData',
        ['path:retailerId!:string:uuid', 'query:productIds:array[200]<string:uuid>'], ['200', '403', '409']]
    ]
  },
  {
    boundary: 'C04', owner: 'U4 Retail Data', document: 'retail-data/v1/dataset-exports.openapi.yaml',
    contentDigest: 'sha256:dd0c9020254f6d19e9796f72ee4415ba797f79c112675e43465262ea31f8c407',
    revisionId: 'sha256:07d0237f23131f92f73e2488362a7280220078a3ca95725162162c1fce69df78',
    operations: [
      [`${route}/dataset-exports`, 'post', 'requestRetailDatasetExport',
        ['header:Idempotency-Key!:string', 'path:retailerId!:string:uuid'], ['202', '409']],
      [`${route}/dataset-exports/{jobId}`, 'get', 'getRetailDatasetExport',
        ['path:jobId!:string:uuid', 'path:retailerId!:string:uuid'], ['200', '404']]
    ]
  },
  {
    boundary: 'C06', owner: 'U4 Retail Data', document: 'retail-data/v1/forecast-inputs.openapi.yaml',
    contentDigest: 'sha256:9168908416c8b73eabeec219ddb3c068e9014abc95847c2ecdb164d448b099ea',
    revisionId: 'sha256:15898b059e259a235d0f4cb041709b960bb2546f07726343ab16beb173f2a531',
    operations: [
      [`${route}/forecast-inputs`, 'get', 'getForecastInputs',
        ['path:retailerId!:string:uuid', 'query:asOf!:string:date-time', 'query:sourceVersion!:string'],
        ['200', '403', '409']]
    ]
  },
  {
    boundary: 'C11', owner: 'U4 Retail Data', document: 'retail-data/v1/assistant-inventory.openapi.yaml',
    contentDigest: 'sha256:d7ebc0ad9fe59d60e07cbf9bc2eee882671b38b28a082210c70f0fdd9cb76635',
    revisionId: 'sha256:fa714895b3641f5449f4c193f19598af36cdfc802c4fcfa2bfcd5cef9124ab7c',
    operations: [
      [`${route}/assistant-tools/inventory-query`, 'post', 'queryInventoryForAssistant',
        ['path:retailerId!:string:uuid'], ['200', '403']],
      [`${route}/assistant-tools/demand-query`, 'post', 'queryDemandForAssistant',
        ['path:retailerId!:string:uuid'], ['200', '422']]
    ]
  },
  {
    boundary: 'C12', owner: 'U5 Supplier Knowledge', document: 'supplier-knowledge/v1/assistant-retrieval.openapi.yaml',
    contentDigest: 'sha256:e0f1679b135406f5be2d66a38ef9bceb5e5c12a08ed5364eebe4643efd9c3d33',
    revisionId: 'sha256:341c1e0c19d8929e560701f52b6f87aee2c3f6abbcb93520751525c5f83c7316',
    operations: [
      [`${route}/assistant-tools/supplier-search`, 'post', 'searchSupplierEvidence',
        ['path:retailerId!:string:uuid'], ['200', '409']],
      [`${route}/assistant-tools/compare-suppliers`, 'post', 'compareAcceptedSupplierTerms',
        ['path:retailerId!:string:uuid'], ['200', '422']]
    ]
  },
  {
    boundary: 'C14', owner: 'U8 Planning Purchasing', document: 'planning-purchasing/v1/assistant-purchasing.openapi.yaml',
    contentDigest: 'sha256:4cc1786896250b8b1dacbfa39c80a805ef5d3a0ce13e88c3a9487cf81aff7769',
    revisionId: 'sha256:4b177bfd575041879ef75965c358a7def9e7b37afa681afad5b07039d3b1f4ea',
    operations: [
      [`${route}/assistant-tools/reviews:request`, 'post', 'requestManualReviewForAssistant',
        ['header:Idempotency-Key!:string', 'path:retailerId!:string:uuid'], ['202', '409', '429']],
      [`${route}/assistant-tools/purchase-drafts`, 'post', 'createPurchaseDraftForAssistant',
        ['header:Idempotency-Key!:string', 'path:retailerId!:string:uuid'], ['201', '403', '422']]
    ]
  },
  {
    boundary: 'C16', owner: 'U11 Web BFF', document: 'web-bff/v1/identity-session.openapi.yaml',
    contentDigest: 'sha256:ade18a03e2b5dcfcec03e18ed233ffbd8f5a21d135440701883a377601719be9',
    revisionId: 'sha256:93a8f1dcda28a408ce40dc6c2cfd3af3b376eebae118e856ed854603bbde0a0d',
    operations: [
      ['/auth/login', 'get', 'beginLogin', ['query:returnUrl:string:^/'], ['302']],
      ['/auth/callback', 'get', 'completeLogin', [], ['302', '400']],
      ['/signin-oidc', 'get', 'receiveRegisteredOidcRedirect', [], ['302', '400']],
      ['/signout-callback-oidc', 'get', 'receiveRegisteredOidcLogoutCallback', [], ['302']],
      ['/auth/logout', 'post', 'logout', [], ['204']],
      ['/api/v1/session', 'get', 'getCurrentSession', [], ['200', '401']]
    ]
  }
];

function parameterSignature(parameter) {
  const schema = parameter.schema;
  const type = schema.type === 'array'
    ? `array[${schema.maxItems}]<${schema.items.type}:${schema.items.format}>`
    : `${schema.type}${schema.format ? `:${schema.format}` : ''}${schema.pattern ? `:${schema.pattern}` : ''}`;
  return `${parameter.in}:${parameter.name}${parameter.required ? '!' : ''}:${type}`;
}

function operationsOf(source) {
  const operations = [];
  for (const [path, pathItem] of Object.entries(source.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'].includes(method)) continue;
      const parameters = [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])]
        .map(parameterSignature).sort();
      operations.push([path, method, operation.operationId, parameters,
        Object.keys(operation.responses).sort()]);
    }
  }
  return operations.sort((a, b) => `${a[0]}:${a[1]}`.localeCompare(`${b[0]}:${b[1]}`));
}

for (const spec of cases) {
  test(`${spec.boundary} pins the exempt OpenAPI operation contract to its immutable revision`, async () => {
    const bytes = await readFile(join(sourceRoot, spec.document));
    assert.equal(digest(bytes), spec.contentDigest, `${spec.document} changed; review and repin this contract`);
    const source = YAML.parse(bytes.toString('utf8'), { strict: true, uniqueKeys: true });
    assert.equal(source.openapi, '3.1.2');
    assert.equal(source.info.version, '1.0.0');
    assert.equal(deriveIdentity('openapi', spec.owner, spec.document, source.info.version,
      spec.contentDigest).revisionId, spec.revisionId);
    assert.deepEqual(operationsOf(source), [...spec.operations].sort((a, b) =>
      `${a[0]}:${a[1]}`.localeCompare(`${b[0]}:${b[1]}`)));
    assert.deepEqual(openApiInlineResponseElements(source), [], 'a JSON response needs fixture evidence');
    assert.equal(Object.keys(source.components?.schemas ?? {}).length, 0,
      'a component schema needs fixture evidence');
    for (const pathItem of Object.values(source.paths)) {
      for (const operation of Object.values(pathItem)) {
        if (!operation?.responses) continue;
        for (const response of Object.values(operation.responses)) {
          assert.deepEqual(Object.keys(response.content ?? {}), [],
            'this revision declares no response media, JSON or non-JSON');
        }
      }
    }
    if (spec.boundary === 'C04') {
      assert.equal(source.paths[`${route}/dataset-exports`].post.responses['202'].headers.Location.schema.type,
        'string', 'accepted export identifies its job resource');
    }
  });
}

test('pinned Redocly rejects a C04 operation with no operationId under the exact rule', async () => {
  const spec = cases.find(item => item.boundary === 'C04');
  const bytes = await readFile(join(sourceRoot, spec.document));
  assert.equal(digest(bytes), spec.contentDigest);
  const changed = YAML.parse(bytes.toString('utf8'), { strict: true, uniqueKeys: true });
  delete changed.paths[`${route}/dataset-exports`].post.operationId;
  const scratch = await mkdtemp(join(tmpdir(), 'stocksense-exempt-openapi-'));
  try {
    const file = join(scratch, 'dataset-exports.openapi.yaml');
    await writeFile(file, YAML.stringify(changed));
    const result = spawnSync(process.execPath, [
      join(toolRoot, 'node_modules/@redocly/cli/bin/cli.js'), 'lint', file,
      '--config', join(toolRoot, 'redocly.yaml'), '--format', 'json'
    ], { cwd: toolRoot, encoding: 'utf8', timeout: 60_000, maxBuffer: 4 * 1024 * 1024 });
    assert.ifError(result.error);
    assert.equal(result.status, 1, result.stderr || result.stdout);
    const findings = JSON.parse(result.stdout);
    assert.deepEqual(findings.problems?.filter(finding => finding.severity === 'error')
      .map(finding => finding.ruleId), ['operation-operationId'], JSON.stringify(findings));
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
