import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp, copyFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(process.env.GITHUB_WORKSPACE, 'candidate');
const proof = join(process.env.RUNNER_TEMP, 'noble/proof');
const scratch = await mkdtemp(join(process.env.RUNNER_TEMP, 'noble-consumers-'));
const execute = (file, args, cwd) => execFileSync(file, args, { cwd, encoding: 'utf8', maxBuffer: 20_000_000, stdio: ['ignore', 'pipe', 'pipe'] });
const imported = async (tree, file) => import(pathToFileURL(join(tree, 'tools/contracts/src', file)));
const { createBoundedGeneratorRunner } = await imported(source, 'bounded-generators.mjs');
const { generatorConfigurationDigest } = await imported(source, 'generators.mjs');
const { normalizeGeneratedConsumer, digestDirectory } = await imported(source, 'generation.mjs');
const heads = [
  [74, 'edeec8b54a4ee2d019349befbb005b944dce901d'],
  [75, 'bd0241d3313a998039cce4a37059d188e502fda2'],
  [76, '0f5db4d25cc9364f825eb752dad05c037c7b9944']
];
const results = [];
for (const [pr, head] of heads) {
  const tree = join(scratch, 'pr'+pr);
  execute('git', ['fetch', 'origin', head], source);
  execute('git', ['worktree', 'add', '--detach', tree, head], source);
  assert.equal(execute('git', ['rev-parse','HEAD'], tree).trim(), head);
  execute('pnpm', ['install','--frozen-lockfile'], join(tree,'tools/contracts'));
  execute('dotnet', ['tool','restore'], tree);
  const standardsImage = execute(process.execPath, ['scripts/build-standards-image.mjs'], join(tree,'tools/contracts')).trim();
  assert.match(standardsImage,/^sha256:[0-9a-f]{64}$/);
  const profileBytes=await readFile(join(tree,'contracts/samples/walking-skeleton/governance/generation-profile.json'));
  const profile=JSON.parse(profileBytes);
  const {createPinnedGeneratorRunner}=await imported(tree,'generators.mjs');
  const host=createPinnedGeneratorRunner(tree);
  const measurements=[];
  const bounded=createBoundedGeneratorRunner(tree,{standardsImage,kiotaImage:process.env.IMG,onMeasurement:m=>measurements.push(m)});
  const consumers=[];
  for(const original of profile.consumers) {
    const candidate=structuredClone(original);
    if(candidate.generator==='kiota') {
      candidate.generatorVersion='1.38.0';
      candidate.configurationDigest=generatorConfigurationDigest('kiota','dotnet-client');
    }
    const baseline=join(scratch,'baseline'+pr,original.consumerId);
    await mkdir(baseline,{recursive:true});
    host(original,baseline);
    await normalizeGeneratedConsumer(original,baseline);
    const before=await digestDirectory(baseline);
    assert.deepEqual(before,original.expectedOutputs);
    const runs=[];
    let candidateTree;
    for(let pass=1;pass<=2;pass++){
      const folder=join(scratch,'candidate'+pr+'-'+pass,original.consumerId);
      await mkdir(folder,{recursive:true});
      bounded(candidate,folder);
      await normalizeGeneratedConsumer(candidate,folder);
      const after=await digestDirectory(folder);
      assert.deepEqual(Object.keys(after).sort(),Object.keys(before).sort());
      const differences=Object.keys(before).filter(p=>before[p]!==after[p]);
      if(pr===74 && candidate.generator==='kiota'){
        assert.deepEqual(differences,['dotnet-client/kiota-lock.json']);
        const oldLock=JSON.parse(await readFile(join(baseline,differences[0])));
        const newLock=JSON.parse(await readFile(join(folder,differences[0])));
        assert.equal(oldLock.kiotaVersion,'1.35.0');
        assert.equal(newLock.kiotaVersion,'1.38.0');
        newLock.kiotaVersion=oldLock.kiotaVersion;
        assert.deepEqual(newLock,oldLock);
      }else{assert.deepEqual(differences,[]);}
      runs.push(after);
      candidateTree=folder;
    }
    assert.deepEqual(runs[0],runs[1]);
    if(candidate.generator==='kiota'){
      const compile=join(scratch,'compile'+pr);
      await mkdir(compile);
      await copyFile(join(here,'consumer-fixture.cs'),join(compile,'Program.cs'));
      await writeFile(join(compile,'Check.csproj'),'<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net10.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings><Nullable>enable</Nullable></PropertyGroup><ItemGroup><PackageReference Include="Microsoft.Kiota.Bundle" Version="2.1.6"/><Compile Include="/generated/**/*.cs"/></ItemGroup></Project>');
      const mounts=['--rm','--user',process.getuid()+':'+process.getgid(),'-e','HOME=/tmp','-e','DOTNET_CLI_HOME=/tmp','-e','NUGET_PACKAGES=/check/packages','-v',compile+':/check','-v',join(candidateTree,'dotnet-client')+':/generated:ro','-w','/check'];
      execute('docker',['run',...mounts,process.env.SDK,'dotnet','restore','Check.csproj'],scratch);
      const transcript=execute('docker',['run',...mounts,'--network=none',process.env.SDK,'dotnet','run','--no-restore','--project','Check.csproj'],scratch);
      assert.match(transcript,/Session request, response deserialization and review payload serialization passed/);
      await writeFile(join(proof,'consumer-compile-pr'+pr+'.txt'),transcript);
    }
    consumers.push({id:original.consumerId,previousVersion:original.generatorVersion,version:candidate.generatorVersion,before,after:runs[0]});
  }
  assert.equal(consumers.reduce((n,c)=>n+Object.keys(c.after).length,0),107);
  assert.equal(measurements.length,6);
  for(const m of measurements){assert.ok(m.elapsedMs<=120000 && m.peakBytes>0 && m.peakBytes<=2147483648);}
  results.push({pr,head,standardsImage,kiotaImage:process.env.IMG,profileSourceRevision:profile.sourceRevision,profileBlob:execute('git',['rev-parse','HEAD:contracts/samples/walking-skeleton/governance/generation-profile.json'],tree).trim(),consumers,measurements});
  await writeFile(join(proof,'consumer-proof.json'),JSON.stringify({results},null,2)+'\n');
  console.log('PR '+pr+' passed two actual bounded 107-output generations and generated client compile fixture');
}
