import { spawnSync } from 'node:child_process';
import { chmod, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { IMAGE_NAMES, SCANNERS, inspectImageSbom, inspectImageScan, readImageEvidence, sha256 } from '../src/image-evidence.mjs';

// Usage: image-evidence.mjs build|verify [output-directory]. Build scans the
// exact local IDs supplied by the two image build steps. No tag is a subject.
const [command, directoryArg] = process.argv.slice(2);
const directory = resolve(directoryArg ?? 'tools/contracts/dist/image-evidence');
const imageIds = { validator: process.env.STOCKSENSE_STANDARDS_IMAGE,
  kiota: process.env.STOCKSENSE_KIOTA_IMAGE };
const docker = process.platform === 'win32'
  ? 'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe' : '/usr/bin/docker';
// Write scanner caches as the host runner. Root-owned files in the bind mount
// cannot be removed by an unprivileged runner and can mask the scan result.
const scannerUser = typeof process.getuid === 'function' && typeof process.getgid === 'function'
  ? ['--user', `${process.getuid()}:${process.getgid()}`] : [];
const run = (args, label, maxBuffer = 64 * 1024 * 1024) => {
  const result = spawnSync(docker, args, { encoding: 'utf8', windowsHide: true, shell: false,
    maxBuffer, timeout: 12 * 60 * 1000 });
  if (result.error || result.status !== 0) throw new Error(`${label} failed`);
  return result.stdout.trim();
};
const parse = (value, label) => {
  try { return JSON.parse(value); } catch { throw new Error(`${label} did not return JSON`); }
};
const env = ['-e', 'GRYPE_DB_AUTO_UPDATE=true', '-e', 'GRYPE_DB_REQUIRE_UPDATE_CHECK=true',
  '-e', 'GRYPE_DB_VALIDATE_AGE=true', '-e', 'GRYPE_DB_MAX_ALLOWED_BUILT_AGE=120h',
  '-e', 'GRYPE_DB_CACHE_DIR=/work/grype-cache', '-e', 'GRYPE_CHECK_FOR_APP_UPDATE=false',
  '-e', 'TMPDIR=/work/tmp'];

if (command === 'verify') {
  // No exception input is accepted here until a protected source can prove
  // approval authority. readImageEvidence therefore blocks every finding.
  const evidence = await readImageEvidence(directory, imageIds);
  process.stdout.write(`Verified ${evidence.records.map(r => `${r.name}:${r.packages}`).join(' ')} image packages\n`);
} else if (command === 'build') {
  await mkdir(directory, { recursive: true });
  const scratch = await mkdtemp(join(tmpdir(), 'stocksense-image-evidence-'));
  try {
    for (const part of ['tmp', 'syft-cache', 'grype-cache']) {
      await mkdir(join(scratch, part), { recursive: true });
    }
    // A non-privileged hosted job pulls only these immutable scanner manifests.
    // Scans are sequential to fit the 3 CPU / 16 GiB development profile.
    for (const scanner of Object.values(SCANNERS)) run(['pull', '--platform', 'linux/amd64', scanner], 'scanner pull');
    for (const name of IMAGE_NAMES) {
      const imageId = imageIds[name];
      if (!/^sha256:[0-9a-f]{64}$/.test(imageId ?? '')) throw new Error(`Missing ${name} image ID`);
      const inspected = run(['image', 'inspect', imageId, '--format', '{{.Id}}'], 'built image inspect');
      if (inspected !== imageId) throw new Error(`${name} image ID changed`);
      const archive = join(scratch, `${name}.tar`);
      run(['save', '--output', archive, imageId], 'built image save', 1024 * 1024);
      await chmod(archive, 0o644);
      await chmod(scratch, 0o755);
      const sbomText = run(['run', '--rm', '--pull=never', '--platform', 'linux/amd64',
        ...scannerUser, '--network=none', '--cpus=1', '--memory=2g', '--read-only',
        '-e', 'SYFT_CHECK_FOR_APP_UPDATE=false', '-e', 'SYFT_CACHE_DIR=/work/syft-cache',
        '-e', 'TMPDIR=/work/tmp', '-v', `${scratch}:/scan:ro`, '-v', `${scratch}:/work`,
        SCANNERS.syft, `docker-archive:/scan/${name}.tar`, '-o', 'cyclonedx-json@1.6'], 'Syft image inventory');
      const sbom = parse(sbomText, 'Syft');
      sbom.metadata ??= {};
      sbom.metadata.properties = [...(sbom.metadata.properties ?? []),
        { name: 'stocksense:imageId', value: imageId },
        { name: 'stocksense:scanner', value: SCANNERS.syft }];
      inspectImageSbom(sbom, name, imageId);
      const sbomBytes = Buffer.from(JSON.stringify(sbom, null, 2) + '\n');
      await writeFile(join(directory, `${name}.cdx.json`), sbomBytes);
      // Grype reads precisely the retained SBOM bytes, not a fresh tag scan.
      const scanFile = join(scratch, `${name}.cdx.json`);
      await writeFile(scanFile, sbomBytes);
      await chmod(scanFile, 0o644);
      const mounts = ['-v', `${scratch}:/scan:ro`, '-v', `${scratch}:/work`];
      const common = ['run', '--rm', '--pull=never', '--platform', 'linux/amd64',
        ...scannerUser, '--cpus=1', '--memory=2g', '--read-only',
        ...env, ...mounts, SCANNERS.grype];
      const raw = parse(run([...common, `sbom:/scan/${name}.cdx.json`, '-o', 'json'], 'Grype image scan'), 'Grype');
      if (!Array.isArray(raw.matches) || (raw.ignoredMatches?.length ?? 0) !== 0) {
        throw new Error('Grype scan returned incomplete or suppressed matches');
      }
      const db = parse(run([...common, 'db', 'status', '-o', 'json'], 'Grype database status'), 'Grype DB');
      const report = { schema: 'stocksense-image-scan-v2', image: name, imageId,
        sbomDigest: sha256(sbomBytes), scanner: SCANNERS.grype, status: 'completed',
        // Grype v0.120.1 serializes ProviderStatus as `valid: boolean`.
        database: { built: db.built, source: db.from, schemaVersion: db.schemaVersion,
          status: db.valid === true && !db.error ? 'valid' : 'invalid' },
        findings: raw.matches.map(match => ({ id: match.vulnerability?.id,
          severity: match.vulnerability?.severity, package: match.artifact?.name,
          version: match.artifact?.version, type: match.artifact?.type,
          purl: match.artifact?.purl ?? null, fixState: match.vulnerability?.fix?.state,
          fixVersions: match.vulnerability?.fix?.versions ?? [] })) };
      inspectImageScan(report, name, imageId, report.sbomDigest);
      await writeFile(join(directory, `${name}.scan.json`), JSON.stringify(report, null, 2) + '\n');
      await rm(archive);
      process.stdout.write(`${name}: ${sbom.components.length} components, ${report.findings.length} findings\n`);
    }
  } finally { await rm(scratch, { recursive: true, force: true }); }
  // Retain the exact report, then fail closed on findings pending trusted disposition input.
  await readImageEvidence(directory, imageIds);
} else throw new Error('Usage: image-evidence.mjs build|verify [output-directory]');
