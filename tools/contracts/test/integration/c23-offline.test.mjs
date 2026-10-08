import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { digest } from '../../src/package-loader.mjs';
import { preflightCanonicalReferences } from '../../src/reference-preflight.mjs';
import { materializeOfflineReferences, readOfflineSchemaRegistry } from '../../src/validate.mjs';
import { runContainerStandardsValidator } from '../../src/container-standards-runner.mjs';
import { validateCanonical } from '../../src/validators.mjs';

const require = createRequire(import.meta.url);
const cliRequire = createRequire(require.resolve('@asyncapi/cli/package.json'));
const { Parser } = cliRequire('@asyncapi/parser');
const event = 'messaging-platform/v1/transport-conformance.asyncapi.yaml';
const envelopes = [
  'common/v1/message-envelope.schema.json',
  'common/v1/global-identity-audit-envelope.schema.json'
];

test('C23 pinned AsyncAPI runner binds both C01 envelopes offline', async t => {
  if (!process.env.STOCKSENSE_STANDARDS_IMAGE) {
    t.skip('exact local standards image ID required for isolated integration validation');
    return;
  }
  const root = await mkdtemp(join(tmpdir(), 'stocksense-verified-graph-'));
  const source = resolve(import.meta.dirname, '../../../../contracts/source');
  try {
    const bytesByPath = new Map();
    for (const path of [...envelopes, event]) {
      const bytes = await readFile(join(source, path));
      bytesByPath.set(path, bytes);
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), bytes);
    }
    const entries = [...envelopes.map(document => ({
      artifactKind: 'schema', document, contentDigest: digest(bytesByPath.get(document))
    })), { artifactKind: 'asyncapi', document: event,
      contentDigest: digest(bytesByPath.get(event)), revisionId: 'c23-offline-test-v1' }];
    const offlineReferences = [];
    const count = await preflightCanonicalReferences(root, entries, { offlineReferences });
    assert.ok(count > 0 && count < 1024);
    assert.equal(offlineReferences.length, 2);
    const identityToPath = new Map(envelopes.map(path => [
      JSON.parse(bytesByPath.get(path).toString('utf8')).$id, path
    ]));
    const reads = [];
    const parser = new Parser({ __unstable: { resolver: { resolvers: [{ schema: 'https', order: -1,
      async read(uri) {
        const path = identityToPath.get(uri.toString());
        assert.ok(path, `unexpected identity: ${uri}`);
        const bytes = await readFile(join(root, path));
        assert.equal(digest(bytes), digest(bytesByPath.get(path)));
        reads.push(uri.toString());
        return bytes.toString('utf8');
      } }] } } });
    const parsed = await parser.parse(bytesByPath.get(event).toString('utf8'),
      { source: pathToFileURL(join(root, event)).href });
    assert.ok(parsed.document);
    assert.deepEqual(new Set(reads), new Set(identityToPath.keys()));
    await writeFile(join(root, event),
      materializeOfflineReferences(bytesByPath.get(event), event, offlineReferences));
    const snapshotDigests = new Map(envelopes.map(path => [path, digest(bytesByPath.get(path))]));
    const files = [...envelopes, event].map(document => ({
      document, digest: document === event ? undefined : snapshotDigests.get(document),
      artifactKind: document === event ? 'asyncapi' : 'schema'
    }));
    files[files.length - 1].digest = digest(await readFile(join(root, event)));
    const runTool = dialect => runContainerStandardsValidator(dialect, event,
      { graphRoot: root, files, image: process.env.STOCKSENSE_STANDARDS_IMAGE });
    const result = await validateCanonical(entries[entries.length - 1], join(root, event), {
      offlineSchemas: await readOfflineSchemaRegistry(root, entries, snapshotDigests),
      offlineReferences, runTool
    });
    assert.equal(result.valid, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
