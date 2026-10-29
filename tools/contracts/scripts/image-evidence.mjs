import { spawnSync } from 'node:child_process';
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { IMAGE_NAMES, SCANNERS, inspectImageSbom, inspectImageScan, readImageEvidence, retainRawImageScan, sha256, verifyRawImageScan } from '../src/image-evidence.mjs';
import { candidateTreeDigestFromGit, fetchImageLedger, verifyBoundImageEvidence } from '../src/image-ledger.mjs';

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
const run = (args, label, maxBuffer = 64 * 1024 * 1024, trimOutput = true) => {
  const result = spawnSync(docker, args, { encoding: 'utf8', windowsHide: true, shell: false,
    maxBuffer, timeout: 12 * 60 * 1000 });
  if (result.error || result.status !== 0) throw new Error(`${label} failed`);
  return trimOutput ? result.stdout.trim() : result.stdout;
};
const parse = (value, label) => {
  try { return JSON.parse(value); } catch { throw new Error(`${label} did not return JSON`); }
};
const env = ['-e', 'GRYPE_DB_AUTO_UPDATE=true', '-e', 'GRYPE_DB_REQUIRE_UPDATE_CHECK=true',
  '-e', 'GRYPE_DB_VALIDATE_AGE=true', '-e', 'GRYPE_DB_MAX_ALLOWED_BUILT_AGE=120h',
  '-e', 'GRYPE_DB_CACHE_DIR=/work/grype-cache', '-e', 'GRYPE_CHECK_FOR_APP_UPDATE=false',
  '-e', 'TMPDIR=/work/tmp'];

if (command === 'verify') {
  const source = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', shell: false,
    windowsHide: true, timeout: 10_000 });
  if (source.error || source.status !== 0) throw new Error('Candidate Git revision is unavailable');
  const checkout = spawnSync('git', ['status', '--porcelain=v1', '--untracked-files=all', '--',
    'tools/contracts/src', 'tools/contracts/scripts', 'tools/contracts/Dockerfile.validator',
    'tools/contracts/Dockerfile.generator-kiota', 'tools/contracts/package.json',
    'tools/contracts/pnpm-lock.yaml', 'tools/contracts/pnpm-workspace.yaml',
    'tools/contracts/.npmrc', 'tools/contracts/.pnpmfile.cjs'],
  { encoding: 'utf8', shell: false, windowsHide: true, timeout: 10_000 });
  if (checkout.error || checkout.status !== 0 || checkout.stdout.trim()) {
    throw new Error('Candidate image and scanner sources differ from the checked-out revision');
  }
  const revision = source.stdout.trim();
  const tree = spawnSync('git', ['rev-parse', `${revision}^{tree}`], { encoding: 'utf8', shell: false,
    windowsHide: true, timeout: 10_000 });
  const listing = spawnSync('git', ['ls-tree', '-r', '-z', '--full-tree', revision],
    { shell: false, windowsHide: true, timeout: 10_000, maxBuffer: 32 * 1024 * 1024 });
  if (tree.error || tree.status !== 0 || listing.error || listing.status !== 0) {
    throw new Error('Candidate immutable Git tree is unavailable');
  }
  const candidateTreeDigest = candidateTreeDigestFromGit(listing.stdout);
  for (const name of IMAGE_NAMES) {
    const sbomDigest = sha256(await readFile(join(directory, `${name}.cdx.json`)));
    await verifyRawImageScan(directory, { name, imageId: imageIds[name], sbomDigest, revision });
  }
  process.stdout.write(`Candidate ${revision}, tree ${tree.stdout.trim()}, source manifest ${candidateTreeDigest}\n`);
  const ledger = await fetchImageLedger({ repository: process.env.GITHUB_REPOSITORY,
    token: process.env.GITHUB_TOKEN, candidateRevision: process.env.GITHUB_SHA,
    candidateGitTreeSha: tree.stdout.trim() });
  const result = await verifyBoundImageEvidence({ directory, imageIds, ledger,
    expectedRevision: process.env.GITHUB_SHA, actualRevision: revision,
    candidateTreeDigest });
  await writeFile(join(directory, 'ledger-verification.json'), JSON.stringify(result, null, 2) + '\n');
  process.stdout.write(`Verified image scans against main ${result.mainSha}, ledger blob ${result.ledgerBlobSha}\n`);
} else if (command === 'build') {
  await mkdir(directory, { recursive: true });
  const source = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', shell: false,
    windowsHide: true, timeout: 10_000 });
  if (source.error || source.status !== 0 || !/^[0-9a-f]{40}$/.test(source.stdout.trim()) ||
      process.env.GITHUB_SHA && process.env.GITHUB_SHA !== source.stdout.trim()) {
    throw new Error('Candidate source revision is unavailable or differs from the checkout');
  }
  const revision = source.stdout.trim();
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
      const rawText = run([...common, `sbom:/scan/${name}.cdx.json`, '-o', 'json'],
        'Grype image scan', 64 * 1024 * 1024, false);
      const databaseText = run([...common, 'db', 'status', '-o', 'json'],
        'Grype database status', 1024 * 1024, false);
      await retainRawImageScan(directory, { name, imageId, sbomDigest: sha256(sbomBytes),
        revision, scanText: rawText, databaseText });
      const raw = parse(rawText, 'Grype');
      if (!Array.isArray(raw.matches) || (raw.ignoredMatches?.length ?? 0) !== 0) {
        throw new Error('Grype scan returned incomplete or suppressed matches');
      }
      const db = parse(databaseText, 'Grype DB');
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
  // Validate the retained reports; the separate verify step fetches main's ledger.
  await readImageEvidence(directory, imageIds, { requireClean: false });
} else throw new Error('Usage: image-evidence.mjs build|verify [output-directory]');
