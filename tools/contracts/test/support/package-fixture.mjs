import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { digest } from '../../src/package-loader.mjs';
import { FIXED_REVISION } from '../config.mjs';

export async function makePackage({ change } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-contracts-'));
  const files = {
    'common/v1/message-envelope.schema.json': JSON.stringify({ $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object' }),
    'common/v1/global-identity-audit-envelope.schema.json': JSON.stringify({ $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object' }),
    'policy.json': JSON.stringify({ contractPackagePolicyVersion: '1.0.0' }),
    'examples.json': JSON.stringify({ fixtures: [] }),
    'generation.json': JSON.stringify({ profiles: [] })
  };
  const canonical = ['common/v1/message-envelope.schema.json', 'common/v1/global-identity-audit-envelope.schema.json'];
  const sidecars = ['policy.json', 'examples.json', 'generation.json'];
  const schemaEntry = path => ({ owner: 'U1 Contracts', boundaryIds: ['C01'], document: path, semanticVersion: '1.0.0', contentDigest: digest(Buffer.from(files[path])) });
  const sidecarEntry = (path, kind) => ({ kind, owner: 'U1 Contracts', boundaryIds: ['C01'], document: path, semanticVersion: '1.0.0', contentDigest: digest(Buffer.from(files[path])), sourceRevision: FIXED_REVISION });
  const manifest = {
    packageVersion: '1.0.0', manifestStatus: 'candidate', sourceRevision: FIXED_REVISION,
    openapi: [], asyncapi: [], schemas: canonical.map(schemaEntry),
    governedArtifacts: [sidecarEntry('policy.json', 'contract-package-policy'), sidecarEntry('examples.json', 'example-fixture'),
      sidecarEntry('generation.json', 'generation-profile')],
    boundaryCoverage: [{ boundaryId: 'C01', canonicalDocuments: canonical, sidecars }]
  };
  if (change) await change({ root, manifest, files });
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content);
  }
  await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return { root, manifest, files };
}
