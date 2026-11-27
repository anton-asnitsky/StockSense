import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const source = join(process.env.GITHUB_WORKSPACE, 'candidate');
const root = join(process.env.RUNNER_TEMP, 'u1-integrated');
const proof = join(root, 'proof');
const images = join(root, 'images');
const run = args => execFileSync('/usr/bin/docker', args, { encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024 });
const { verifyValidatorRuntimeArchive } = await import(pathToFileURL(join(source, 'tools/contracts/src/validator-runtime.mjs')));
const { sourceTreeDigest } = await import(pathToFileURL(join(source, 'tools/contracts/src/source-digest.mjs')));
const ids = { validator: process.env.STOCKSENSE_STANDARDS_IMAGE, kiota: process.env.STOCKSENSE_KIOTA_IMAGE };
for (const [name, id] of Object.entries(ids)) {
  assert.match(id, /^sha256:[a-f0-9]{64}$/);
  const inspect = JSON.parse(run(['image', 'inspect', id]));
  assert.equal(inspect[0].Id, id);
  assert.equal(inspect[0].Architecture, 'amd64');
  assert.equal(inspect[0].Config.User, '65532:65532');
  await writeFile(join(proof, `${name}-inspect.json`), JSON.stringify(inspect, null, 2));
  run(['save', '--output', join(images, `${name}.tar`), id]);
  const container = run(['create', '--pull=never', '--network=none', '--read-only', id]).trim();
  assert.match(container, /^[a-f0-9]{64}$/);
  try {
    const archive = join(images, `${name}-rootfs.tar`);
    run(['export', '--output', archive, container]);
    if (name === 'validator') {
      const actual = verifyValidatorRuntimeArchive(await readFile(archive));
      const built = JSON.parse(await readFile(join(proof, 'validator-runtime.json')));
      assert.equal(built.imageId, id);
      assert.equal(built.sourceDigest, await sourceTreeDigest());
      assert.deepEqual(actual.binaries, built.binaries);
      assert.equal(actual.apkDatabaseSha256, built.apkDatabaseSha256);
      await writeFile(join(proof, 'validator-retained-runtime.json'), JSON.stringify({ imageId: id,
        sourceDigest: built.sourceDigest, ...actual }, null, 2));
    } else {
      run(['cp', `${container}:/var/lib/dpkg/status`, join(proof, 'kiota-dpkg-status')]);
      run(['cp', `${container}:/var/lib/chisel/manifest.wall`, join(proof, 'kiota-chisel-manifest.wall')]);
    }
  } finally { run(['rm', container]); }
}
const guard = ['run', '--rm', '--pull=never', '--network=none', '--read-only', '--user=65532:65532',
  '--cap-drop=ALL', '--security-opt=no-new-privileges', '--cpus=1', '--memory=2g', '--memory-swap=2g', '--pids-limit=128'];
const nodeProbe = `const a=require('node:assert/strict');a.equal(process.version,'v24.22.3');a.equal(process.getuid(),65532);a.equal(process.env.REDOCLY_SUPPRESS_UPDATE_NOTICE,'true');a.equal(process.env.REDOCLY_TELEMETRY,'off');a.equal(new Intl.NumberFormat('de-DE').format(1234.5),'1.234,5');a.ok(new Intl.Collator('sv').compare('z','ä')<0);a.equal(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jerusalem',hour:'2-digit',hourCycle:'h23'}).format(new Date('2026-07-01T12:00:00Z')),'15');a.equal(new Intl.DateTimeFormat('en-GB',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'}).format(new Date('2026-01-01T12:00:00Z')),'07');a.ok(Object.values(require('node:os').networkInterfaces()).flat().every(x=>x.internal));a.throws(()=>require('node:fs').writeFileSync('/tmp/write-probe','x'),e=>['EROFS','EACCES'].includes(e.code));console.log(JSON.stringify({node:process.version,uid:process.getuid(),icu:process.versions.icu,tz:process.versions.tz,offline:true,readOnly:true}));`;
await writeFile(join(proof, 'validator-smoke.json'), run([...guard, ids.validator, '-e', nodeProbe]));
const version = run([...guard, ids.kiota, '--version']);
assert.match(version, /^1\.38\.0(?:\+|\s|$)/);
await writeFile(join(proof, 'kiota-version.txt'), version);
const probe = join(proof, 'kiota-globalization');
await mkdir(probe);
await writeFile(join(probe, 'Smoke.csproj'), '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net10.0</TargetFramework><UseAppHost>false</UseAppHost></PropertyGroup></Project>');
await writeFile(join(probe, 'Program.cs'), `using System;using System.Globalization;
if(Environment.GetEnvironmentVariable("DOTNET_LTTng")!="0"||Environment.GetEnvironmentVariable("COMPlus_LTTng")!="0")return 2;
foreach(var line in System.IO.File.ReadLines("/proc/self/maps"))if(line.Contains("libcoreclrtraceptprovider")||line.Contains("liblttng-ust"))return 3;
var jan=new DateTime(2026,1,15,12,0,0,DateTimeKind.Utc);var tz=TimeZoneInfo.FindSystemTimeZoneById("Asia/Jerusalem");
if(jan.ToString("MMMM",CultureInfo.GetCultureInfo("fr-FR"))!="janvier"||tz.GetUtcOffset(jan).TotalHours!=2||tz.GetUtcOffset(jan.AddMonths(6)).TotalHours!=3)return 1;
Console.WriteLine("fr-FR janvier; Jerusalem January +02, July +03; optional LTTng disabled");return 0;`);
run(['run', '--rm', '--pull=never', '--network=none', '--user', `${process.getuid()}:${process.getgid()}`,
  '--cpus=1', '--memory=2g', '-e', 'HOME=/tmp', '-e', 'DOTNET_CLI_HOME=/tmp', '-v', `${probe}:/probe`, '-w', '/probe',
  process.env.SDK, 'dotnet', 'publish', '-c', 'Release', '-o', '/probe/out', '-p:RestoreIgnoreFailedSources=true']);
const globalization = run([...guard, '-v', `${probe}:/probe:ro`, '--entrypoint=/usr/share/dotnet/dotnet', ids.kiota, '/probe/out/Smoke.dll']);
assert.match(globalization, /fr-FR janvier; Jerusalem January \+02, July \+03; optional LTTng disabled/);
await writeFile(join(proof, 'kiota-globalization.txt'), globalization);
