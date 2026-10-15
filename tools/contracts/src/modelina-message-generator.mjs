import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TypeScriptGenerator } from '@asyncapi/modelina';
import YAML from 'yaml';

const INPUTS = Object.freeze({
  source: 'e903fe65d0e577628a9a89554b7aab7fcbfc3a739ff4e49b99cf7d6c5298b43f',
  tenant: '817cadf7573bf718e6ff9d42f67162ce940c4a9a4272d139765a940b88eca9d0',
  global: '422b7cf345d91f1ce2a438e4bc0f5b8160cf2796a8d0cd121d09be9c581e17d8'
});
const SCHEMA_2020 = 'https://json-schema.org/draft/2020-12/schema';
const SCHEMA_7 = 'http://json-schema.org/draft-07/schema#';
const FORMAT_2020 = 'application/schema+json;version=draft-2020-12';
const ALLOWED = new Set(['$schema', '$id', 'title', 'type', 'description', 'required', 'properties',
  'additionalProperties', 'oneOf', 'allOf', 'anyOf', 'items', 'enum', 'const', 'format', 'pattern',
  'minLength', 'maxLength', 'minimum', 'maximum']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const refuse = () => { throw new Error('Modelina profile or source is unsupported'); };

async function pinnedJson(path, expected) {
  const bytes = await readFile(path);
  if (createHash('sha256').update(bytes).digest('hex') !== expected) refuse();
  return JSON.parse(bytes.toString('utf8'));
}

function checkCompatible(schema) {
  if (!object(schema)) refuse();
  for (const [key, value] of Object.entries(schema)) {
    if (!ALLOWED.has(key)) refuse();
    if (key === 'properties') {
      if (!object(value)) refuse();
      for (const [property, child] of Object.entries(value)) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(property)) refuse();
        checkCompatible(child);
      }
    } else if (['oneOf', 'allOf', 'anyOf'].includes(key)) {
      if (!Array.isArray(value) || !value.length) refuse();
      for (const child of value) checkCompatible(child);
    } else if (key === 'items' || (key === 'additionalProperties' && object(value))) {
      checkCompatible(value);
    }
  }
}

function assertMessage(source, key, schemaId) {
  const message = source?.components?.messages?.[key];
  if (!object(message) || !object(message.payload) || message.payload.schemaFormat !== FORMAT_2020 ||
      !object(message.payload.schema) || Object.keys(message.payload.schema).length !== 1 ||
      message.payload.schema.$ref !== schemaId) refuse();
}

async function render(schema) {
  if (schema.$schema !== SCHEMA_2020 || typeof schema.title !== 'string') refuse();
  checkCompatible(schema);
  const input = { ...schema, $schema: SCHEMA_7 };
  const generator = new TypeScriptGenerator({ modelType: 'interface', mapType: 'record',
    typeMapping: { Any: () => 'unknown' },
    constraints: { propertyKey: ({ objectPropertyModel }) => objectPropertyModel.propertyName } });
  const models = await generator.generate(input);
  if (!models.length || models[0].modelName !== schema.title ||
      new Set(models.map(model => model.modelName)).size !== models.length) refuse();
  const root = models[0].result;
  for (const property of schema.required ?? []) {
    if (!root.includes(`  ${property}:`)) refuse();
  }
  for (const model of models) {
    if (!/^(?:interface|enum) [A-Za-z_][A-Za-z0-9_]* \{/.test(model.result)) refuse();
  }
  return models.map(model => 'export ' + model.result).join('\n\n') + '\n';
}

/** Generate only the two C23/C15 envelope models under a closed offline profile. */
export async function generateMessageModels(sourcePath, outputPath) {
  const sourceBytes = await readFile(sourcePath);
  if (createHash('sha256').update(sourceBytes).digest('hex') !== INPUTS.source) refuse();
  const source = YAML.parse(sourceBytes.toString('utf8'), { uniqueKeys: true });
  if (!object(source) || source.asyncapi !== '3.0.0' ||
      Object.keys(source.components?.messages ?? {}).sort().join(',') !==
        'globalIdentityEnvelope,tenantEnvelope') refuse();
  const common = resolve(dirname(sourcePath), '../../common/v1');
  const definitions = [
    { key: 'tenantEnvelope', file: 'message-envelope.schema.json', sha: INPUTS.tenant,
      output: 'tenant-envelope.ts' },
    { key: 'globalIdentityEnvelope', file: 'global-identity-audit-envelope.schema.json',
      sha: INPUTS.global, output: 'global-identity-audit-envelope.ts' }
  ];
  await mkdir(outputPath, { recursive: true });
  for (const entry of definitions) {
    const schema = await pinnedJson(join(common, entry.file), entry.sha);
    assertMessage(source, entry.key, schema.$id);
    const generated = await render(schema);
    await writeFile(join(outputPath, entry.output), generated);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 4) refuse();
  await generateMessageModels(process.argv[2], process.argv[3]).catch(() => {
    process.stderr.write('Modelina generation refused for the pinned C23 profile\n');
    process.exitCode = 1;
  });
}
