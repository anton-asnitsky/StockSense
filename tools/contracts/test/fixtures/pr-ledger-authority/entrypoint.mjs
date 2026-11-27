import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readSbomSourceContext } from '../../../src/sbom-context.mjs';
import { normalizeImageScan, retainRawImageScan, sha256 } from '../../../src/image-evidence.mjs';
import { normalizeKiotaRuntimeManifest } from '../../../src/kiota-runtime-manifest.mjs';
import { BASE, REPO } from './scenario.mjs';

const packageRoot = fileURLToPath(new URL('../../../', import.meta.url));
const repositoryRoot = fileURLToPath(new URL('../../../../../', import.meta.url));
const fixtureModule = new URL('./scenario.mjs', import.meta.url).href;
const image = `sha256:${'a'.repeat(64)}`;
export const fixtureTime = '2026-11-28T00:00:00.000Z';
function run(file, args, cwd, env = process.env) {
  return spawnSync(file, args, { cwd, env, encoding: 'utf8', windowsHide: true,
    shell: false, timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
}
function git(root, args) {
  const env = { ...process.env, GIT_AUTHOR_DATE: fixtureTime, GIT_COMMITTER_DATE: fixtureTime };
  const result = run('git', ['-c', `core.hooksPath=${join(root, '.no-test-hooks')}`,
    '-c', 'user.name=PR evidence fixture', '-c', 'user.email=pr-fixture@example.invalid', ...args], root, env);
  if (result.error || result.status !== 0) throw new Error(`Isolated fixture Git failed: ${result.stderr}`);
  return result.stdout.trim();
}

/** Creates only isolated test refs/objects, actual ordered merge parents and inert HTTP evidence. */
export async function createPrEntrypointFixture() {
  const root = await mkdtemp(join(tmpdir(), 'stocksense-pr-entrypoint-'));
  const repoRoot = join(root, 'repo');
  const contracts = join(repoRoot, 'tools/contracts');
  const cleanup = async () => {
    if (dirname(resolve(root)) !== resolve(tmpdir()) || !basename(root).startsWith('stocksense-pr-entrypoint-')) {
      throw new Error('Unsafe test fixture cleanup target');
    }
    await unlink(join(contracts, 'node_modules')).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await rm(root, { recursive: true, force: true });
  };
  try {
    const cloned = run('git', ['clone', '--shared', '--no-checkout', '--quiet', repositoryRoot, repoRoot], root);
    if (cloned.error || cloned.status !== 0) throw new Error(`Isolated clone failed: ${cloned.stderr}`);
    git(repoRoot, ['checkout', '--quiet', '--detach', BASE]);
    for (const path of ['src', 'scripts', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml',
      'Dockerfile.validator', 'Dockerfile.generator-kiota', 'kiota-runtime-inputs.json']) {
      await cp(join(packageRoot, path), join(contracts, path), { recursive: true, force: true });
    }
    await symlink(join(packageRoot, 'node_modules'), join(contracts, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir');
    git(repoRoot, ['add', 'tools/contracts']);
    git(repoRoot, ['commit', '--quiet', '-m', 'synthetic reviewed PR head']);
    const head = git(repoRoot, ['rev-parse', 'HEAD']);
    const tree = git(repoRoot, ['rev-parse', 'HEAD^{tree}']);
    const revision = git(repoRoot, ['commit-tree', tree, '-p', BASE, '-p', head, '-m', 'synthetic PR test merge']);
    git(repoRoot, ['checkout', '--quiet', '--detach', revision]);
    const context = readSbomSourceContext(repoRoot, revision);
    const directory = join(root, 'image-evidence'); await mkdir(directory);
    let runtimeManifestDigest;
    for (const name of ['validator', 'kiota']) {
      const sbom = { bomFormat: 'CycloneDX', specVersion: '1.6',
        metadata: { properties: [{ name: 'stocksense:imageId', value: image }] },
        components: [{ type: 'library', name: name === 'kiota' ? 'Microsoft.OpenApi.Kiota' : 'yaml',
          version: '1.0.0', purl: name === 'kiota' ? 'pkg:nuget/Microsoft.OpenApi.Kiota@1.0.0' : 'pkg:npm/yaml@1.0.0' }] };
      const bytes = Buffer.from(JSON.stringify(sbom) + '\n');
      const sbomDigest = sha256(bytes); await writeFile(join(directory, `${name}.cdx.json`), bytes);
      const db = { valid: true, built: fixtureTime, schemaVersion: 'v6.1.9',
        from: 'https://grype.anchore.io/databases/v6/example' };
      const raw = { matches: [] };
      await writeFile(join(directory, `${name}.scan.json`), JSON.stringify(normalizeImageScan(raw, db, name, image, sbomDigest)) + '\n');
      await retainRawImageScan(directory, { name, imageId: image, sbomDigest, revision,
        scanText: JSON.stringify(raw), databaseText: JSON.stringify(db) });
      if (name === 'kiota') {
        const normalized = normalizeKiotaRuntimeManifest({ entries: [
          { path: 'rootfs', kind: 'directory', mode: 0o755 },
          { path: 'rootfs/kiota', kind: 'file', mode: 0o755, size: 5, sha256: sha256('kiota') }
        ], config: { Entrypoint: ['/kiota'], Cmd: null, Env: [], User: '65532', WorkingDir: '/' }, sbom });
        runtimeManifestDigest = normalized.digest;
        await writeFile(join(directory, 'kiota.runtime.json'), JSON.stringify({ imageId: image, sbomDigest,
          ...normalized }, null, 2) + '\n');
      }
    }
    const configurationPath = join(root, 'http-fixture.json');
    const requestLog = join(root, 'http-requests.jsonl');
    const configuration = { contextOverride: { sourceRevision: revision, candidateGitTreeSha: context.candidateGitTreeSha,
      headSha: head, candidateTreeDigest: context.candidateTreeDigest,
      executionFingerprint: context.executionFingerprint, runtimeManifestDigest }, scenario: 'success' };
    const updateScenario = async changes => {
      Object.assign(configuration, changes); await writeFile(configurationPath, JSON.stringify(configuration));
    };
    await updateScenario({});
    const preload = join(root, 'http-preload.mjs');
    await writeFile(preload, `import {fixture,P} from ${JSON.stringify(fixtureModule)};
import {readFileSync,appendFileSync} from 'node:fs';
import fsp from 'node:fs/promises';
import {syncBuiltinESMExports} from 'node:module';
const NativeDate=Date;
globalThis.Date=class extends NativeDate { constructor(...args){super(...(args.length?args:[${JSON.stringify(fixtureTime)}]));} static now(){return NativeDate.parse(${JSON.stringify(fixtureTime)});} };
const cfg=JSON.parse(readFileSync(${JSON.stringify(configurationPath)},'utf8'));
const f=fixture(cfg);
if(cfg.scenario==='missing-u2')f.comments[1].body='not an approval';
if(cfg.scenario==='rename-failure'){const original=fsp.rename;fsp.rename=async(...args)=>{if(['ledger-verification.json','combined-sbom.json'].some(name=>String(args[1]).endsWith(name))){const error=new Error('synthetic rename failure');error.code='EACCES';throw error;}return original(...args);};syncBuiltinESMExports();}
const counts=new Map();
globalThis.fetch=async(url,options)=>{
 const u=new URL(url);const path=u.pathname+u.search;
 appendFileSync(${JSON.stringify(requestLog)},JSON.stringify({host:u.hostname,path})+'\\n');
 if(u.hostname==='logs.blob.core.windows.net'){if(options.headers)throw new Error('Credential leak to storage');return new Response(f.data.get(P+'/actions/jobs/333/logs'));}
 if(u.hostname!=='api.github.com'||options.headers.Authorization!=='Bearer synthetic-unit-token')throw new Error('Unexpected HTTP boundary');
 const count=(counts.get(path)||0)+1;counts.set(path,count);
 if(cfg.scenario==='revoked-final'&&path===P+'/issues/comments/501'&&count>=3)return new Response('',{status:404});
 if(path.endsWith('/actions/jobs/333/logs'))return new Response(null,{status:302,headers:{location:'https://logs.blob.core.windows.net/log?sig=synthetic'}});
 const format=u.searchParams.has('per_page')?'page':'json';
 const payload=await f.input.request(path,'synthetic-unit-token',format);
 return new Response(JSON.stringify(format==='page'?payload.data:payload),{headers:format==='page'&&payload.link?{link:payload.link}:{}});
};
`);
    const env = { ...process.env, GITHUB_EVENT_NAME: 'pull_request', GITHUB_REPOSITORY: REPO,
      GITHUB_SHA: revision, GITHUB_RUN_ID: '111', GITHUB_RUN_ATTEMPT: '1', GITHUB_TOKEN: 'synthetic-unit-token',
      STOCKSENSE_LEDGER_AUTHORITY: 'owner-authorized-pr-ledger-v1', STOCKSENSE_PR_NUMBER: '74',
      STOCKSENSE_PR_BASE_SHA: BASE, STOCKSENSE_PR_HEAD_SHA: head,
      STOCKSENSE_STANDARDS_IMAGE: image, STOCKSENSE_KIOTA_IMAGE: image,
      STOCKSENSE_IMAGE_EVIDENCE_DIR: directory, STOCKSENSE_CANDIDATE_REVISION: revision };
    const receiptPath = join(directory, 'ledger-verification.json');
    const execute = (script = 'image-evidence.mjs', args = ['verify', directory]) => run(process.execPath,
      ['--import', pathToFileURL(preload).href, join(contracts, 'scripts', script), ...args], repoRoot, env);
    return { root, repoRoot, contracts, directory, context, head, revision, runtimeManifestDigest,
      imageIds: { validator: image, kiota: image }, env, preload, configuration, requestLog,
      execute, updateScenario, receiptPath, readReceipt: async () => JSON.parse(await readFile(receiptPath, 'utf8')), cleanup };
  } catch (error) { await cleanup(); throw error; }
}
