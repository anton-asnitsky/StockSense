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
import { validateCanonical } from '../../src/validators.mjs';
import { runContainerStandardsValidator } from '../../src/container-standards-runner.mjs';

// The parser is a direct dependency now that it is the pinned validator, so
// it is imported rather than reached through another package's tree.
const require = createRequire(import.meta.url);
const { Parser } = require('@asyncapi/parser');

for (const event of [
  'retail-data/v1/retail-reference-changed.asyncapi.yaml',
  'supplier-knowledge/v1/embedding-build-quiesced.asyncapi.yaml'
]) test(`pinned AsyncAPI validation and offline schema compilation bind C01 for ${event}`, async t => {
  if (!process.env.STOCKSENSE_STANDARDS_IMAGE) {
    t.skip('exact local standards image ID required for isolated integration validation');
    return;
  }
  const root = await mkdtemp(join(tmpdir(), 'stocksense-verified-graph-'));
  const repository = resolve(import.meta.dirname, '../../../..');
  const envelope = 'common/v1/message-envelope.schema.json';
  try {
    const envelopeBytes = await readFile(join(repository, 'contracts/source', envelope));
    const eventBytes = await readFile(join(repository, 'contracts/source', event));
    for (const [path, bytes] of [[envelope, envelopeBytes], [event, eventBytes]]) {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), bytes);
    }
    const entries = [
      { artifactKind: 'schema', document: envelope, contentDigest: digest(envelopeBytes) },
      { artifactKind: 'asyncapi', document: event, contentDigest: digest(eventBytes), revisionId: 'event-test-v1' }
    ];
    const offlineReferences = [];
    assert.equal(await preflightCanonicalReferences(root, entries, { offlineReferences }),
      event.startsWith('retail-data/') ? 2 : 5);
    const identity = JSON.parse(envelopeBytes.toString('utf8')).$id;
    const reads = [];
    const parser = new Parser({ __unstable: { resolver: { resolvers: [{ schema: 'https', order: -1,
      async read(uri) {
        assert.equal(uri.toString(), identity);
        const target = await readFile(join(root, envelope));
        assert.equal(digest(target), entries[0].contentDigest);
        reads.push({ identity: uri.toString(), contentDigest: digest(target) });
        return target.toString('utf8');
      } }] } } });
    const parsed = await parser.parse(eventBytes.toString('utf8'),
      { source: pathToFileURL(join(root, event)).href });
    assert.ok(parsed.document, 'The pinned parser must resolve the declared event');
    assert.deepEqual(reads, [{ identity, contentDigest: entries[0].contentDigest }]);
    await writeFile(join(root, event), materializeOfflineReferences(eventBytes, event, offlineReferences));
    const eventSnapshot = await readFile(join(root, event));
    const runTool = dialect => runContainerStandardsValidator(dialect, event,
      { graphRoot: root, files: [{ document: envelope, digest: digest(envelopeBytes), artifactKind: 'schema' },
        { document: event, digest: digest(eventSnapshot), artifactKind: 'asyncapi' }],
        image: process.env.STOCKSENSE_STANDARDS_IMAGE });
    const snapshotDigests = new Map([[envelope, digest(envelopeBytes)]]);
    const options = { offlineSchemas: await readOfflineSchemaRegistry(root, entries, snapshotDigests), offlineReferences, runTool };
    assert.equal((await validateCanonical(entries[1], join(root, event), options)).valid, true);
    const envelopeSchema = JSON.parse(envelopeBytes.toString('utf8'));
    const invalid = { ...envelopeSchema, type: 'not-a-json-schema-type' };
    const invalidBytes = Buffer.from(JSON.stringify(invalid));
    await writeFile(join(root, envelope), invalidBytes);
    await assert.rejects(readOfflineSchemaRegistry(root, entries, snapshotDigests),
      error => error.code === 'DIGEST_MISMATCH');
    snapshotDigests.set(envelope, digest(invalidBytes));
    const invalidRunTool = dialect => runContainerStandardsValidator(dialect, event,
      { graphRoot: root, files: [{ document: envelope, digest: digest(invalidBytes), artifactKind: 'schema' },
        { document: event, digest: digest(eventSnapshot), artifactKind: 'asyncapi' }],
        image: process.env.STOCKSENSE_STANDARDS_IMAGE });
    await assert.rejects(validateCanonical(entries[1], join(root, event),
      { ...options, runTool: invalidRunTool }),
    error => error.code === 'STANDARDS_VALIDATION');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
