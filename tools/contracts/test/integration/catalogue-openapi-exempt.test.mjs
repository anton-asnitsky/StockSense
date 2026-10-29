import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
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
    contentDigest: 'sha256:c83f22253db60d193396c922cd367779b6c8f7b7bf7a6aafe747defbebebfc71',
    revisionId: 'sha256:18e36511272611d96f34db2fff06d80902a54b025f081ed6c24c11868047e4f9',
    operations: [
      [`${route}/supplier-reference`, 'get', 'getSupplierReferenceData',
        ['path:retailerId!:string:uuid', 'query:productIds:array[200]<string:uuid>'], ['200', '403', '409']]
    ]
  },
  {
    boundary: 'C04', owner: 'U4 Retail Data', document: 'retail-data/v1/dataset-exports.openapi.yaml',
    contentDigest: 'sha256:4892ed672893f62b40b35c6d9d28d999a25d8e0e1675e129303e951e3865e604',
    revisionId: 'sha256:53b9d0a0ee2ed385e249e80fcccb575689370a525bd7d1cefa52bf00ba52b4e6',
    operations: [
      [`${route}/dataset-exports`, 'post', 'requestRetailDatasetExport',
        ['header:Idempotency-Key!:string', 'path:retailerId!:string:uuid'], ['202', '409']],
      [`${route}/dataset-exports/{jobId}`, 'get', 'getRetailDatasetExport',
        ['path:jobId!:string:uuid', 'path:retailerId!:string:uuid'], ['200', '404']]
    ]
  },
  {
    boundary: 'C06', owner: 'U4 Retail Data', document: 'retail-data/v1/forecast-inputs.openapi.yaml',
    contentDigest: 'sha256:f34a5af2fa21105a80eec84e5d453cffa79686e939a2b02f5b010066471c7e29',
    revisionId: 'sha256:74e1c0c261a8e60b5bdb57d742fb8feef509f41760dcff0bf5ea5563b9521b0f',
    operations: [
      [`${route}/forecast-inputs`, 'get', 'getForecastInputs',
        ['path:retailerId!:string:uuid', 'query:asOf!:string:date-time', 'query:sourceVersion!:string'],
        ['200', '403', '409']]
    ]
  },
  {
    boundary: 'C11', owner: 'U4 Retail Data', document: 'retail-data/v1/assistant-inventory.openapi.yaml',
    contentDigest: 'sha256:860badc1b048703053ec7ce11023cb5f4ed4b114fcc399acba742ad97b40ca47',
    revisionId: 'sha256:de69653425e0eb528d835741c38d565bf52b581428fac412c40da37f062bba52',
    operations: [
      [`${route}/assistant-tools/inventory-query`, 'post', 'queryInventoryForAssistant',
        ['path:retailerId!:string:uuid'], ['200', '403']],
      [`${route}/assistant-tools/demand-query`, 'post', 'queryDemandForAssistant',
        ['path:retailerId!:string:uuid'], ['200', '422']]
    ]
  },
  {
    boundary: 'C12', owner: 'U5 Supplier Knowledge', document: 'supplier-knowledge/v1/assistant-retrieval.openapi.yaml',
    contentDigest: 'sha256:8300dbd99901f6d5b1df85d9667041b9ae36b45f301bb357cfdaf208d8865d90',
    revisionId: 'sha256:8f00e36af95fc609c13122e322f861024e02c2bcc4a8b5ffb62ed21c9eb89588',
    operations: [
      [`${route}/assistant-tools/supplier-search`, 'post', 'searchSupplierEvidence',
        ['path:retailerId!:string:uuid'], ['200', '409']],
      [`${route}/assistant-tools/compare-suppliers`, 'post', 'compareAcceptedSupplierTerms',
        ['path:retailerId!:string:uuid'], ['200', '422']]
    ]
  },
  {
    boundary: 'C14', owner: 'U8 Planning Purchasing', document: 'planning-purchasing/v1/assistant-purchasing.openapi.yaml',
    contentDigest: 'sha256:14e23d0f47961df9ee407dfe87296ab86e15a1f05c5aa7118281f1247655f429',
    revisionId: 'sha256:b5fa775afdea7583ee44d9ad25d309befcd7b1291ef15dbf8e84d02883c59e8c',
    operations: [
      [`${route}/assistant-tools/reviews:request`, 'post', 'requestManualReviewForAssistant',
        ['header:Idempotency-Key!:string', 'path:retailerId!:string:uuid'], ['202', '409', '429']],
      [`${route}/assistant-tools/purchase-drafts`, 'post', 'createPurchaseDraftForAssistant',
        ['header:Idempotency-Key!:string', 'path:retailerId!:string:uuid'], ['201', '403', '422']]
    ]
  },
  {
    boundary: 'C16', owner: 'U11 Web BFF', document: 'web-bff/v1/identity-session.openapi.yaml',
    contentDigest: 'sha256:4a0af856c4a74d1730e600296440eb7353950de056982b213edb1624dd8d4877',
    revisionId: 'sha256:3d4b4944cfdc97c462b837288785173df5243dae7bc26f346cb11a56f28086fc',
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

/** Check operation-only examples against the exact declared parameters and outcomes. */
function verifyOperationExamples(source) {
  const examples = source['x-contract-operation-examples'];
  assert.ok(Array.isArray(examples) && examples.length > 0,
    'an operation-only contract needs named request/status examples');
  const operations = new Map();
  for (const pathItem of Object.values(source.paths)) {
    for (const operation of Object.values(pathItem)) {
      if (operation?.operationId) {
        assert.equal(operations.has(operation.operationId), false, 'operation IDs must be unique');
        operations.set(operation.operationId, { operation, pathItem });
      }
    }
  }
  const ajv = new Ajv2020({ strict: false });
  addFormats(ajv);
  const names = new Set();
  const covered = new Set();
  for (const example of examples) {
    assert.deepEqual(Object.keys(example).sort(),
      ['name', 'operationId', 'request', 'responseStatus'].sort());
    assert.match(example.name, /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);
    assert.equal(names.has(example.name), false, `duplicate example ${example.name}`);
    names.add(example.name);
    const match = operations.get(example.operationId);
    assert.ok(match, `${example.name}: operation is absent`);
    covered.add(example.operationId);
    assert.equal(typeof example.responseStatus, 'string');
    assert.ok(Object.hasOwn(match.operation.responses, example.responseStatus),
      `${example.name}: response status is absent`);
    assert.ok(example.request && typeof example.request === 'object' &&
      !Array.isArray(example.request));
    assert.ok(Object.keys(example.request).every(key => ['path', 'query', 'headers'].includes(key)));
    const supplied = new Map();
    for (const [location, values] of Object.entries(example.request)) {
      assert.ok(values && typeof values === 'object' && !Array.isArray(values));
      for (const [name, value] of Object.entries(values)) {
        const key = `${location}:${name}`;
        assert.equal(supplied.has(key), false);
        supplied.set(key, value);
      }
    }
    for (const parameter of [...(match.pathItem.parameters ?? []),
      ...(match.operation.parameters ?? [])]) {
      const location = parameter.in === 'header' ? 'headers' : parameter.in;
      const key = `${location}:${parameter.name}`;
      if (parameter.required) assert.ok(supplied.has(key), `${example.name}: missing ${key}`);
      if (!supplied.has(key)) continue;
      const validate = ajv.compile(parameter.schema);
      assert.equal(validate(supplied.get(key)), true,
        `${example.name}: ${key} fails its declared schema: ${ajv.errorsText(validate.errors)}`);
      supplied.delete(key);
    }
    assert.deepEqual([...supplied.keys()], [], `${example.name}: undeclared parameter`);
  }
  assert.deepEqual([...covered].sort(), [...operations.keys()].sort(),
    'every exempt operation needs a named request/status example');
  return examples;
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
    verifyOperationExamples(source);
    if (spec.boundary === 'C16') {
      assert.deepEqual(source.security, [{ bffSession: [] }]);
      assert.deepEqual(source.components.securitySchemes.bffSession,
        { type: 'apiKey', in: 'cookie', name: '__Host-stocksense-session' });
      for (const name of ['beginLogin', 'completeLogin', 'receiveRegisteredOidcRedirect',
        'receiveRegisteredOidcLogoutCallback']) {
        const operation = Object.values(source.paths).flatMap(pathItem => Object.values(pathItem))
          .find(item => item?.operationId === name);
        assert.deepEqual(operation.security, [], `${name} must permit the browser continuation`);
      }
    } else {
      assert.deepEqual(source.security, [{ serviceToken: [] }]);
      assert.deepEqual(source.components.securitySchemes.serviceToken,
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' });
    }
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

test('operation-only examples fail if a required parameter or declared status changes', async () => {
  const document = 'retail-data/v1/dataset-exports.openapi.yaml';
  const source = YAML.parse(await readFile(join(sourceRoot, document), 'utf8'));
  const changed = JSON.parse(JSON.stringify(source));
  delete changed.paths[`${route}/dataset-exports`].post.responses['409'];
  assert.throws(() => verifyOperationExamples(changed));
  const missingHeader = JSON.parse(JSON.stringify(source));
  missingHeader.paths[`${route}/dataset-exports`].post.parameters =
    missingHeader.paths[`${route}/dataset-exports`].post.parameters.filter(
      parameter => parameter.name !== 'Idempotency-Key');
  assert.throws(() => verifyOperationExamples(missingHeader));
});
