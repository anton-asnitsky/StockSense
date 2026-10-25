import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { runContainerStandardsValidator } from '../../src/container-standards-runner.mjs';
import { deriveIdentity } from '../../src/package-loader.mjs';
import { sourceTreeDigest } from '../../src/source-digest.mjs';

const hostSourceDigest = await sourceTreeDigest();
const digestContainerId = 'd'.repeat(64);

const image = 'ghcr.io/stocksense/contracts-tools@sha256:' + 'a'.repeat(64);
const docker = process.platform === 'win32'
  ? 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe' : '/usr/bin/docker';
const hash = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const localContext = process.platform === 'win32' ? 'npipe:////./pipe/dockerDesktopLinuxEngine' : 'unix:///var/run/docker.sock';
const ok = stdout => ({ status: 0, stdout, stderr: '', error: undefined, signal: null });
const expectCode = (promise, code, rule) => assert.rejects(promise,
  error => error.code === code && error.ruleId === rule);

async function withGraph(action) {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-verified-graph-'));
  const document = 'api/v1/canonical.openapi.yaml';
  const bytes = Buffer.from('openapi: 3.1.2\ninfo:\n  title: Synthetic\n  version: 1.0.0\npaths: {}\n');
  await mkdir(dirname(join(root, document)), { recursive: true });
  await writeFile(join(root, document), bytes);
  try {
    return await action({ graphRoot: root, sourceDocument: document,
      files: [{ document, digest: hash(bytes) }], image });
  } finally { await rm(root, { recursive: true, force: true }); }
}

async function withFixtureGraph(action) {
  await withGraph(async options => {
    const declared = [
      { artifactKind: 'openapi', document: options.sourceDocument,
        bytes: await readFile(join(options.graphRoot, options.sourceDocument)) },
      { artifactKind: 'schema', document: 'common/v1/message-envelope.schema.json',
        bytes: Buffer.from('{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object"}') },
      { artifactKind: 'sidecar', kind: 'example-fixture', document: 'governance/example-fixture.json',
        bytes: Buffer.from('{"version":1}') }
    ];
    const entries = [];
    const files = [];
    for (const item of declared) {
      const contentDigest = hash(item.bytes);
      const semanticOwner = 'Synthetic';
      const semanticVersion = '1.0.0';
      const entry = { artifactKind: item.artifactKind, ...(item.kind ? { kind: item.kind } : {}),
        document: item.document, semanticOwner, semanticVersion, contentDigest, boundaryIds: ['C01'],
        ...deriveIdentity(item.kind ?? item.artifactKind, semanticOwner, item.document,
          semanticVersion, contentDigest) };
      entries.push(entry);
      files.push({ document: item.document, digest: contentDigest, artifactKind: item.artifactKind });
      const target = join(options.graphRoot, ...item.document.split('/'));
      await mkdir(dirname(target), { recursive: true });
      if (item.document !== options.sourceDocument) await writeFile(target, item.bytes);
    }
    const sourceDocument = entries.find(entry => entry.kind === 'example-fixture').document;
    await action({ ...options, entries, files, sourceDocument });
  });
}

// The runner reads the tool-source digest out of the image before it runs any
// validator. That read is answered here and deliberately kept out of `calls`,
// so the exact-Docker-profile assertions below stay about the validator
// invocation they are describing. `the standards image must carry this tree's
// tool sources` covers the check itself.
function seam(run = () => ok(''), digest = hostSourceDigest) {
  const calls = [];
  const spawn = (command, argv, options) => {
    if (argv[0] === 'create') return ok(digestContainerId + '\n');
    if (argv[0] === 'cp') {
      writeFileSync(argv[2], digest + '\n');
      return ok('');
    }
    if (argv[0] === 'rm' && argv[2] === digestContainerId) return ok('');
    calls.push({ command, argv, options });
    if (argv[0] === 'context') return ok(localContext + '\n');
    if (argv[0] === 'info') return ok('linux\n');
    if (argv[0] === 'rm') return ok('');
    return run(argv, options);
  };
  return { calls, spawn };
}

test('OpenAPI launches the exact constrained Docker profile and binds only snapshotted files', async () => {
  await withGraph(async options => {
    let snapshot;
    let configDir;
    const fake = seam(argv => {
      const mounts = argv.flatMap((item, i) => item === '--mount' ? [argv[i + 1]] : []);
      snapshot = mounts[0].split(',')[1].slice('source='.length);
      configDir = mounts[1].split(',')[1].slice('source='.length);
      assert.equal(readFileSync(join(snapshot, options.sourceDocument), 'utf8'),
        readFileSync(join(options.graphRoot, options.sourceDocument), 'utf8'));
      assert.match(readFileSync(join(configDir, 'redocly.yaml'), 'utf8'), /no-unresolved-refs: error/);
      return ok('');
    });
    assert.deepEqual(await runContainerStandardsValidator('openapi:3.1.2', options.sourceDocument,
      { ...options, spawn: fake.spawn }), { dialect: 'openapi:3.1.2', valid: true });
    assert.equal(fake.calls.length, 4);
    assert.ok(fake.calls.every(call => call.command === docker));
    assert.deepEqual(fake.calls.map(call => call.argv[0]), ['context', 'info', 'run', 'rm']);
    const name = fake.calls[2].argv[3];
    assert.match(name, /^stocksense-standards-[0-9a-f-]{36}$/);
    assert.deepEqual(fake.calls[2].argv, ['run', '--pull=never', '--name', name, '--network=none', '--read-only',
      '--security-opt=no-new-privileges=true', '--cap-drop=ALL', '--pids-limit=64',
      '--memory=2147483648', '--memory-swap=2147483648', '--user=65532:65532', '--workdir=/workspace',
      '--tmpfs=/tmp:rw,noexec,nosuid,size=67108864', '--env=HOME=/tmp', '--env=NO_UPDATE_NOTIFIER=1',
      '--mount', `type=bind,source=${snapshot},target=/workspace,readonly`,
      '--mount', `type=bind,source=${configDir},target=/config,readonly`,
      '--entrypoint=/nodejs/bin/node', image,
      '/opt/contracts/node_modules/@redocly/cli/bin/cli.js', 'lint', '/workspace/' + options.sourceDocument,
      '--config', '/config/redocly.yaml', '--format', 'json']);
    assert.deepEqual(fake.calls[3].argv, ['rm', '--force', name]);
    assert.equal(fake.calls[2].options.timeout, 60_000);
    assert.equal(fake.calls[2].options.maxBuffer, 1_048_576);
    assert.equal(fake.calls[2].options.shell, false);
    assert.equal(fake.calls[2].options.env.DOCKER_HOST, undefined);
    await assert.rejects(readFile(join(snapshot, options.sourceDocument)), { code: 'ENOENT' });
  });
});

test('AsyncAPI has a separate fixed binary and no untrusted config mount', async () => {
  await withGraph(async options => {
    const fake = seam();
    await runContainerStandardsValidator('asyncapi:3.0.0', options.sourceDocument, { ...options, spawn: fake.spawn });
    const argv = fake.calls[2].argv;
    assert.equal(argv.filter(item => item === '--mount').length, 1);
    // The pinned AsyncAPI validator is now the in-image parser worker rather
    // than the CLI, which shipped a generator, a Spectral CLI and release
    // tooling as runtime dependencies. The argument shape is unchanged.
    assert.deepEqual(argv.slice(-4), [image, '/opt/contracts/src/container-asyncapi-validator.mjs',
      'validate', '/workspace/' + options.sourceDocument]);
  });
});

test('schema and AsyncAPI payload modes use the fixed in-image Ajv worker and declared registry', async () => {
  await withGraph(async options => {
    const schemaDocument = 'common/v1/item.schema.json';
    const schemaBytes = Buffer.from(JSON.stringify({ $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://contracts.stocksense.local/common/v1/item.schema.json', type: 'object' }));
    const asyncDocument = 'events/v1/changed.asyncapi.yaml';
    const asyncBytes = Buffer.from('asyncapi: 3.0.0\ncomponents:\n  messages: {}\n');
    const sidecarDocument = 'governance/example-fixture.json';
    const sidecarBytes = Buffer.from('{"syntheticOnly":true}');
    for (const [document, bytes] of [[schemaDocument, schemaBytes], [asyncDocument, asyncBytes],
      [sidecarDocument, sidecarBytes]]) {
      await mkdir(dirname(join(options.graphRoot, document)), { recursive: true });
      await writeFile(join(options.graphRoot, document), bytes);
    }
    const files = [
      { ...options.files[0], artifactKind: 'openapi' },
      { document: schemaDocument, digest: hash(schemaBytes), artifactKind: 'schema' },
      { document: asyncDocument, digest: hash(asyncBytes), artifactKind: 'asyncapi' },
      { document: sidecarDocument, digest: hash(sidecarBytes), artifactKind: 'sidecar' }
    ];
    for (const [dialect, sourceDocument, mode] of [
      ['https://json-schema.org/draft/2020-12/schema', schemaDocument, 'schema:2020-12'],
      ['asyncapi-payloads:2020-12', asyncDocument, 'asyncapi-payloads:2020-12']
    ]) {
      let snapshot;
      let configDir;
      const fake = seam(argv => {
        const mounts = argv.flatMap((item, i) => item === '--mount' ? [argv[i + 1]] : []);
        snapshot = mounts[0].split(',')[1].slice('source='.length);
        configDir = mounts[1].split(',')[1].slice('source='.length);
        assert.deepEqual(JSON.parse(readFileSync(join(configDir, 'schema-index.json'), 'utf8')), {
          version: 1,
          source: { document: sourceDocument, digest: files.find(file => file.document === sourceDocument).digest,
            artifactKind: mode === 'schema:2020-12' ? 'schema' : 'asyncapi' },
          schemas: [{ document: schemaDocument, digest: hash(schemaBytes) }]
        });
        return ok('VALID\n');
      });
      assert.deepEqual(await runContainerStandardsValidator(dialect, sourceDocument,
        { ...options, files, spawn: fake.spawn }), { dialect, valid: true });
      const name = fake.calls[2].argv[3];
      assert.deepEqual(fake.calls[2].argv, ['run', '--pull=never', '--name', name, '--network=none', '--read-only',
        '--security-opt=no-new-privileges=true', '--cap-drop=ALL', '--pids-limit=64',
        '--memory=2147483648', '--memory-swap=2147483648', '--user=65532:65532', '--workdir=/workspace',
        '--tmpfs=/tmp:rw,noexec,nosuid,size=67108864', '--env=HOME=/tmp', '--env=NO_UPDATE_NOTIFIER=1',
        '--mount', `type=bind,source=${snapshot},target=/workspace,readonly`,
        '--mount', `type=bind,source=${configDir},target=/config,readonly`,
        '--entrypoint=/nodejs/bin/node', image, '/opt/contracts/src/container-schema-validator.mjs', mode, sourceDocument]);
      assert.equal(fake.calls[2].options.timeout, 60_000);
    }
  });
});

test('schema worker exit status 2 maps to a stable dialect finding; other exits are engine failures', async () => {
  await withGraph(async options => {
    for (const [dialect, status, code, rule] of [
      ['https://json-schema.org/draft/2020-12/schema', 2, 'STANDARDS_VALIDATION', 'NFR8.4'],
      ['asyncapi-payloads:2020-12', 2, 'STANDARDS_VALIDATION', 'NFR8.6'],
      ['https://json-schema.org/draft/2020-12/schema', 1, 'STANDARDS_ENGINE', 'NFR6.2']
    ]) {
      const fake = seam(() => ({ status, stderr: 'attacker-controlled detail' }));
      const files = [{ ...options.files[0], artifactKind: dialect === 'asyncapi-payloads:2020-12' ? 'asyncapi' : 'schema' }];
      await expectCode(runContainerStandardsValidator(dialect, options.sourceDocument,
        { ...options, files, spawn: fake.spawn }), code, rule);
    }
  });
});

test('schema modes require explicit canonical kinds before invoking Docker', async () => {
  await withGraph(async options => {
    for (const dialect of ['https://json-schema.org/draft/2020-12/schema', 'asyncapi-payloads:2020-12']) {
      const fake = seam();
      await expectCode(runContainerStandardsValidator(dialect, options.sourceDocument,
        { ...options, spawn: fake.spawn }), 'STANDARDS_GRAPH', 'NFR6.2');
      assert.equal(fake.calls.length, 0);
    }
  });
});

test('local image ID can pin an unpublished validator image without a mutable tag', async () => {
  await withGraph(async options => {
    const localId = 'sha256:' + 'b'.repeat(64);
    const fake = seam();
    await runContainerStandardsValidator('openapi:3.1.2', options.sourceDocument,
      { ...options, image: localId, spawn: fake.spawn });
    assert.equal(fake.calls[2].argv.includes(localId), true);
    assert.equal(fake.calls[2].argv.includes('--pull=never'), true);
  });
});

test('mutable, unqualified and malformed image names fail before Docker is contacted', async () => {
  await withGraph(async options => {
    const absent = seam();
    await expectCode(runContainerStandardsValidator('openapi:3.1.2', options.sourceDocument,
      { ...options, image: undefined, spawn: absent.spawn }), 'STANDARDS_IMAGE_PIN', 'NFR6.2');
    assert.equal(absent.calls.length, 0);
    for (const bad of ['', 'ghcr.io/stocksense/contracts-tools:latest', 'contracts-tools@sha256:' + 'a'.repeat(64),
      'ghcr.io/stocksense/contracts-tools:latest@sha256:' + 'a'.repeat(64)]) {
      const fake = seam();
      await expectCode(runContainerStandardsValidator('openapi:3.1.2', options.sourceDocument,
        { ...options, image: bad, spawn: fake.spawn }), 'STANDARDS_IMAGE_PIN', 'NFR6.2');
      assert.equal(fake.calls.length, 0);
    }
  });
});

test('unsafe graph paths and changed bytes fail before Docker is contacted', async () => {
  await withGraph(async options => {
    const cases = [
      { sourceDocument: '../api.yaml' },
      { files: [{ document: options.sourceDocument, digest: 'sha256:' + '0'.repeat(64) }] },
      { files: [{ document: '../api.yaml', digest: options.files[0].digest }] },
      { files: [{ document: options.sourceDocument, digest: options.files[0].digest }, ...options.files] }
    ];
    for (const changed of cases) {
      const fake = seam();
      await expectCode(runContainerStandardsValidator('openapi:3.1.2', changed.sourceDocument ?? options.sourceDocument,
        { ...options, ...changed, spawn: fake.spawn }), 'STANDARDS_GRAPH', 'NFR6.2');
      assert.equal(fake.calls.length, 0);
    }
  });
});

test('symlinked graph member is refused', async t => {
  await withGraph(async options => {
    const link = join(options.graphRoot, 'linked.yaml');
    try { await symlink(join(options.graphRoot, options.sourceDocument), link); }
    catch (error) {
      if (process.platform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) return t.skip('Windows symlink privilege unavailable');
      throw error;
    }
    const fake = seam();
    await expectCode(runContainerStandardsValidator('openapi:3.1.2', 'linked.yaml',
      { ...options, files: [{ document: 'linked.yaml', digest: options.files[0].digest }], spawn: fake.spawn }),
    'STANDARDS_GRAPH', 'NFR6.2');
    assert.equal(fake.calls.length, 0);
  });
});

test('remote or Windows-container engine fails closed', async () => {
  await withGraph(async options => {
    for (const [phase, stdout] of [['context', 'tcp://example.org:2376\n'], ['info', 'windows\n']]) {
      const fake = seam();
      const spawn = (command, argv, opts) => argv[0] === phase ? ok(stdout) : fake.spawn(command, argv, opts);
      await expectCode(runContainerStandardsValidator('openapi:3.1.2', options.sourceDocument,
        { ...options, spawn }), 'STANDARDS_ENGINE', 'NFR6.2');
      assert.equal(fake.calls.some(call => call.argv[0] === 'run'), false);
    }
  });
});

test('engine, timeout, OOM, validator rejection and cleanup errors have stable codes', async () => {
  await withGraph(async options => {
    for (const [result, code, rule] of [
      [{ status: 125 }, 'STANDARDS_ENGINE', 'NFR6.2'],
      [{ status: 127 }, 'STANDARDS_ENGINE', 'NFR6.2'],
      [{ error: { code: 'ETIMEDOUT' }, status: null }, 'STANDARDS_LIMIT', 'NFR10.1'],
      [{ status: 137 }, 'STANDARDS_LIMIT', 'NFR10.1'],
      [{ status: 1, stderr: 'secret supplied by untrusted tool' }, 'STANDARDS_VALIDATION', 'NFR8.5']
    ]) {
      const fake = seam(() => result);
      await expectCode(runContainerStandardsValidator('openapi:3.1.2', options.sourceDocument,
        { ...options, spawn: fake.spawn }), code, rule);
      assert.equal(fake.calls.at(-1).argv[0], 'rm');
    }
    const fake = seam();
    const spawn = (command, argv, opts) => argv[0] === 'rm' ? { status: 1 } : fake.spawn(command, argv, opts);
    await expectCode(runContainerStandardsValidator('openapi:3.1.2', options.sourceDocument,
      { ...options, spawn }), 'STANDARDS_ENGINE', 'NFR6.2');
  });
});

test('fixture mode mounts the full verified graph and returns only bounded revision-bound rows', async () => {
  await withFixtureGraph(async options => {
    const schema = options.entries.find(entry => entry.artifactKind === 'schema');
    const row = { fixtureId: 'fixture-1', contractElementId: 'MessageEnvelope', revisionId: schema.revisionId,
      scenarioType: 'valid', observed: 'pass' };
    let snapshot;
    let configDir;
    const fake = seam(argv => {
      const mounts = argv.flatMap((item, i) => item === '--mount' ? [argv[i + 1]] : []);
      snapshot = mounts[0].split(',')[1].slice('source='.length);
      configDir = mounts[1].split(',')[1].slice('source='.length);
      const index = JSON.parse(readFileSync(join(configDir, 'fixture-index.json'), 'utf8'));
      assert.equal(index.sourceDocument, options.sourceDocument);
      assert.deepEqual(index.files, options.files);
      assert.deepEqual(index.entries, options.entries);
      assert.equal(readFileSync(join(snapshot, options.sourceDocument), 'utf8'),
        readFileSync(join(options.graphRoot, options.sourceDocument), 'utf8'));
      return ok(JSON.stringify({ version: 1, fixtureResults: [row] }) + '\n');
    });
    assert.deepEqual(await runContainerStandardsValidator('fixture-oracle:2020-12', options.sourceDocument,
      { ...options, spawn: fake.spawn }), { dialect: 'fixture-oracle:2020-12', valid: true, fixtureResults: [row] });
    const name = fake.calls[2].argv[3];
    assert.deepEqual(fake.calls[2].argv, ['run', '--pull=never', '--name', name, '--network=none', '--read-only',
      '--security-opt=no-new-privileges=true', '--cap-drop=ALL', '--pids-limit=64',
      '--memory=2147483648', '--memory-swap=2147483648', '--user=65532:65532', '--workdir=/workspace',
      '--tmpfs=/tmp:rw,noexec,nosuid,size=67108864', '--env=HOME=/tmp', '--env=NO_UPDATE_NOTIFIER=1',
      '--mount', `type=bind,source=${snapshot},target=/workspace,readonly`,
      '--mount', `type=bind,source=${configDir},target=/config,readonly`,
      '--entrypoint=/nodejs/bin/node', image, '/opt/contracts/src/container-fixture-oracle.mjs',
      options.sourceDocument]);
    assert.equal(fake.calls[2].options.timeout, 60_000);
    assert.deepEqual(fake.calls[3].argv, ['rm', '--force', name]);
  });
});

test('fixture mode rejects metadata and snapshot mismatches before Docker', async () => {
  await withFixtureGraph(async options => {
    const cases = [
      { entries: options.entries.slice(1) },
      { files: options.files.slice(1) },
      { entries: options.entries.map((entry, i) => i ? entry : { ...entry, artifactKind: 'sidecar' }) },
      { entries: options.entries.map(entry => entry.document === options.sourceDocument
        ? { ...entry, revisionId: 'sha256:' + '0'.repeat(64) } : entry) },
      { files: options.files.map(file => file.document === options.sourceDocument
        ? { ...file, digest: 'sha256:' + '0'.repeat(64) } : file) }
    ];
    for (const changed of cases) {
      const fake = seam();
      await expectCode(runContainerStandardsValidator('fixture-oracle:2020-12', options.sourceDocument,
        { ...options, ...changed, spawn: fake.spawn }), 'STANDARDS_GRAPH', 'NFR6.2');
      assert.equal(fake.calls.length, 0);
    }
  });
});

test('fixture mode rejects malformed results and maps worker failure statuses', async () => {
  await withFixtureGraph(async options => {
    const schema = options.entries.find(entry => entry.artifactKind === 'schema');
    const row = { fixtureId: 'fixture-1', contractElementId: 'MessageEnvelope', revisionId: schema.revisionId,
      scenarioType: 'valid', observed: 'pass' };
    for (const [result, code, rule] of [
      [ok('not JSON'), 'STANDARDS_OUTPUT', 'NFR6.2'],
      [ok(JSON.stringify({ version: 1, fixtureResults: [{ ...row, message: 'untrusted raw output' }] })),
        'STANDARDS_OUTPUT', 'NFR6.2'],
      [ok(JSON.stringify({ version: 1, fixtureResults: [{ ...row, revisionId: 'sha256:' + '0'.repeat(64) }] })),
        'STANDARDS_OUTPUT', 'NFR6.2'],
      [{ status: 2, stderr: 'raw policy diagnostic' }, 'STANDARDS_VALIDATION', 'BR2.7'],
      [{ status: 3, stderr: 'raw graph diagnostic' }, 'STANDARDS_GRAPH', 'NFR6.2'],
      [{ status: 4, stderr: 'raw worker diagnostic' }, 'STANDARDS_ENGINE', 'NFR6.2']
    ]) {
      const fake = seam(() => result);
      await expectCode(runContainerStandardsValidator('fixture-oracle:2020-12', options.sourceDocument,
        { ...options, spawn: fake.spawn }), code, rule);
      assert.equal(fake.calls.at(-1).argv[0], 'rm');
    }
  });
});

test('fixture mode accepts only the governed inline response result identity', async () => {
  await withFixtureGraph(async options => {
    const entry = options.entries.find(item => item.artifactKind === 'openapi');
    const row = { fixtureId: 'inline-response', contractElementId: 'response:getIdentity:200:application-json',
      revisionId: entry.revisionId, scenarioType: 'valid', observed: 'pass' };
    const accepted = seam(() => ok(JSON.stringify({ version: 1, fixtureResults: [row] })));
    assert.deepEqual((await runContainerStandardsValidator('fixture-oracle:2020-12', options.sourceDocument,
      { ...options, spawn: accepted.spawn })).fixtureResults, [row]);
    for (const contractElementId of ['response:getIdentity:200:application-json:extra',
      'response:getIdentity:200:application-xml']) {
      const rejected = seam(() => ok(JSON.stringify({ version: 1,
        fixtureResults: [{ ...row, contractElementId }] })));
      await expectCode(runContainerStandardsValidator('fixture-oracle:2020-12', options.sourceDocument,
        { ...options, spawn: rejected.spawn }), 'STANDARDS_OUTPUT', 'NFR6.2');
    }
  });
});

test('fixture mode accepts channel-qualified AsyncAPI results and rejects malformed message elements', async () => {
  await withFixtureGraph(async options => {
    const document = 'events/v1/changed.asyncapi.yaml';
    const bytes = Buffer.from('asyncapi: 3.0.0\ninfo: {title: Synthetic, version: 1.0.0}\n');
    const contentDigest = hash(bytes);
    const entry = { artifactKind: 'asyncapi', semanticOwner: 'Synthetic', boundaryIds: ['C23'],
      document, semanticVersion: '1.0.0', contentDigest,
      ...deriveIdentity('asyncapi', 'Synthetic', document, '1.0.0', contentDigest) };
    await mkdir(dirname(join(options.graphRoot, document)), { recursive: true });
    await writeFile(join(options.graphRoot, document), bytes);
    options.entries.push(entry);
    options.files.push({ document, digest: contentDigest, artifactKind: 'asyncapi' });
    const row = { fixtureId: 'asyncapi-message', contractElementId: 'message:tenantMessages:tenantEnvelope',
      revisionId: entry.revisionId, scenarioType: 'valid', observed: 'pass' };
    const accepted = seam(() => ok(JSON.stringify({ version: 1, fixtureResults: [row] })));
    assert.deepEqual((await runContainerStandardsValidator('fixture-oracle:2020-12', options.sourceDocument,
      { ...options, spawn: accepted.spawn })).fixtureResults, [row]);
    for (const contractElementId of ['message:tenantMessages:tenantEnvelope:extra',
      'message:tenant messages:tenantEnvelope']) {
      const rejected = seam(() => ok(JSON.stringify({ version: 1,
        fixtureResults: [{ ...row, contractElementId }] })));
      await expectCode(runContainerStandardsValidator('fixture-oracle:2020-12', options.sourceDocument,
        { ...options, spawn: rejected.spawn }), 'STANDARDS_OUTPUT', 'NFR6.2');
    }
  });
});

test('the standards image must carry exact source bytes without a shell', async () => {
  await withGraph(async options => {
    const run = (subject, spawn) => runContainerStandardsValidator('openapi:3.1.2', options.sourceDocument,
      { ...options, image: subject, spawn });
    const subject = letter => 'ghcr.io/stocksense/contracts-tools@sha256:' + letter.repeat(64);
    const reading = (marker, failure) => {
      const calls = [];
      const spawn = (_command, argv) => {
        calls.push(argv);
        if (argv[0] === 'context') return ok(localContext + '\n');
        if (argv[0] === 'info') return ok('linux\n');
        if (argv[0] === 'create') return failure === 'create' ? { status: 125 } : ok(digestContainerId + '\n');
        if (argv[0] === 'cp') {
          if (failure === 'cp') return { status: 1 };
          if (failure === 'cp-error') return { error: { code: 'ETIMEDOUT' }, status: null };
          writeFileSync(argv[2], marker);
          return ok('');
        }
        if (argv[0] === 'rm') return failure === 'rm' && argv[2] === digestContainerId
          ? { status: 1 } : ok('');
        return ok('');
      };
      return { calls, spawn };
    };
    for (const [letter, marker, failure, code] of [
      ['c', 'sha256:' + 'b'.repeat(64) + '\n', undefined, 'STANDARDS_IMAGE_STALE'],
      ['d', '', 'cp', 'STANDARDS_IMAGE_STALE'],
      ['3', '', 'cp-error', 'STANDARDS_ENGINE'],
      ['e', hostSourceDigest + '\n\n', undefined, 'STANDARDS_IMAGE_STALE'],
      ['f', hostSourceDigest + '\n', 'create', 'STANDARDS_ENGINE'],
      ['1', hostSourceDigest + '\n', 'rm', 'STANDARDS_ENGINE']
    ]) {
      const fake = reading(marker, failure);
      await expectCode(run(subject(letter), fake.spawn), code, 'NFR6.2');
      assert.equal(fake.calls.some(argv => argv[0] === 'run'), false);
      if (failure !== 'create') assert.ok(fake.calls.some(argv => argv[0] === 'rm' && argv[2] === digestContainerId));
    }
    const matching = reading(hostSourceDigest + '\n');
    assert.deepEqual(await run(subject('2'), matching.spawn), { dialect: 'openapi:3.1.2', valid: true });
    assert.deepEqual(matching.calls.map(argv => argv[0]), ['context', 'info', 'create', 'cp', 'rm', 'run', 'rm']);
    assert.ok(matching.calls[2].includes('--network=none'));
    assert.ok(matching.calls[2].includes('--pull=never'));
    assert.ok(matching.calls[2].includes('--read-only'));
    assert.equal(matching.calls.flat().some(arg => arg === '/bin/sh' || arg === '/bin/cat'), false);
    const again = reading('');
    assert.deepEqual(await run(subject('2'), again.spawn), { dialect: 'openapi:3.1.2', valid: true });
    assert.equal(again.calls.some(argv => argv[0] === 'create' || argv[0] === 'cp'), false);
  });
});
