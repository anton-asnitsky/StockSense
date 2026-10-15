import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { generateMessageModels } from '../../src/modelina-message-generator.mjs';

const repoRoot = fileURLToPath(new URL('../../../../', import.meta.url));
const source = join(repoRoot, 'contracts/source/messaging-platform/v1/transport-conformance.asyncapi.yaml');

test('C23 Modelina models preserve required fields, wire keys and nullable causation', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'stocksense-modelina-'));
  try {
    await generateMessageModels(source, workspace);
    const tenant = await readFile(join(workspace, 'tenant-envelope.ts'), 'utf8');
    const global = await readFile(join(workspace, 'global-identity-audit-envelope.ts'), 'utf8');
    assert.match(tenant, /export interface MessageEnvelope \{/);
    assert.match(tenant, /\n  messageId: string;/);
    assert.match(tenant, /\n  type: ActorType;/);
    assert.match(tenant, /\n  data: Record<string, unknown>;/);
    assert.match(global, /export interface GlobalIdentityAuditEnvelope \{/);
    assert.match(global, /\n  causationId: string \| null;/);
    assert.doesNotMatch(tenant + global, /reservedType|Map<string/);
  } finally { await rm(workspace, { recursive: true, force: true }); }
});

test('Modelina refuses a changed canonical AsyncAPI source before generation', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'stocksense-modelina-refuse-'));
  try {
    const changed = join(workspace, 'changed.asyncapi.yaml');
    await writeFile(changed, (await readFile(source, 'utf8')).replace('stocksense.audit.v1', 'changed.route.v1'));
    await assert.rejects(generateMessageModels(changed, join(workspace, 'out')),
      /Modelina profile or source is unsupported/);
  } finally { await rm(workspace, { recursive: true, force: true }); }
});
