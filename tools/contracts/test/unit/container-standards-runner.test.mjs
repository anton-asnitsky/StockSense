import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runContainerStandardsValidator } from '../../src/container-standards-runner.mjs';
import { loadPackage } from '../../src/package-loader.mjs';
import { sourceTreeDigest } from '../../src/source-digest.mjs';

const hostSourceDigest = await sourceTreeDigest();

const image = 'ghcr.io/stocksense/contracts-tools@sha256:' + 'a'.repeat(64);
const docker = process.platform === 'win32'
  ? 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe' : '/usr/bin/docker';
const hash = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const localContext = process.platform === 'win32' ? 'npipe:////./pipe/dockerDesktopLinuxEngine' : 'unix:///var/run/docker.sock';
const sampleRoot = fileURLToPath(new URL('../../../../contracts/samples/walking-skeleton/', import.meta.url));
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
    const loaded = await loadPackage(sampleRoot);
    const entries = JSON.parse(JSON.stringify(loaded.entries));
    for (const entry of entries) {
      const target = join(options.graphRoot, ...entry.document.split('/'));
      await mkdir(dirname(target), { recursive: true });
      await copyFile(join(sampleRoot, ...entry.document.split('/')), target);
    }
    const files = entries.map(entry => ({ document: entry.document,
      digest: entry.contentDigest, artifactKind: entry.artifactKind }));
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
    if (argv.includes('--entrypoint=/bin/cat')) return ok(digest + '\n');
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
      '--entrypoint=/usr/local/bin/node', image,
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
        '--entrypoint=/usr/local/bin/node', image, '/opt/contracts/container-schema-validator.mjs', mode, sourceDocument]);
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
      '--entrypoint=/usr/local/bin/node', image, '/opt/contracts/src/container-fixture-oracle.mjs',
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

test('the standards image must carry this tree\'s tool sources', async () => {
  await withGraph(async options => {
    // The image bakes in a copy of src, so a stale one answers with an older
    // tool's verdict and nothing in a passing run says which tool spoke.
    const digestRead = argv => argv.includes('--entrypoint=/bin/cat');
    const reading = reply => {
      const calls = [];
      const spawn = (command, argv) => {
        if (digestRead(argv)) { calls.push(argv); return reply(argv); }
        if (argv[0] === 'context') return ok(localContext + '\n');
        if (argv[0] === 'info') return ok('linux\n');
        return ok('');
      };
      return { calls, spawn };
    };
    // Its own pinned image, because the verdict is cached per image for the
    // process: under a pinned digest the image cannot change identity mid-run,
    // so re-reading it on every validator call would be waste.
    const subject = 'ghcr.io/stocksense/contracts-tools@sha256:' + 'c'.repeat(64);
    const run = spawn => runContainerStandardsValidator('openapi:3.1.2', options.sourceDocument,
      { ...options, image: subject, spawn });

    // A digest from different sources, and an image built before the marker
    // existed, are both the same instruction to the operator: rebuild.
    for (const reply of [
      () => ok('sha256:' + 'b'.repeat(64) + '\n'),
      () => ({ status: 1, stdout: '', stderr: 'No such file or directory', error: undefined, signal: null }),
      () => ok('not-a-digest\n')
    ]) await expectCode(run(reading(reply).spawn), 'STANDARDS_IMAGE_STALE', 'NFR6.2');

    // Docker failing to start the container is an environment fault, and must
    // not be reported as a stale image: it sends the operator somewhere else.
    for (const reply of [
      () => ({ status: 125, stdout: '', stderr: '', error: undefined, signal: null }),
      () => ({ status: null, stdout: '', stderr: '', error: new Error('spawn failed'), signal: null })
    ]) await expectCode(run(reading(reply).spawn), 'STANDARDS_ENGINE', 'NFR6.2');

    // The read is a minimal, network-less, read-only container.
    const matching = reading(() => ok(hostSourceDigest + '\n'));
    assert.deepEqual(await run(matching.spawn), { dialect: 'openapi:3.1.2', valid: true });
    assert.equal(matching.calls.length, 1);
    for (const flag of ['--rm', '--pull=never', '--network=none', '--read-only', '--cap-drop=ALL']) {
      assert.ok(matching.calls[0].includes(flag), flag);
    }
    assert.deepEqual(matching.calls[0].slice(-2), [subject, '/opt/contracts/source-digest.txt']);
    // Cached: a second validator call on the same pinned image does not re-read it.
    const again = reading(() => ok(hostSourceDigest + '\n'));
    assert.deepEqual(await run(again.spawn), { dialect: 'openapi:3.1.2', valid: true });
    assert.equal(again.calls.length, 0);
  });
});
