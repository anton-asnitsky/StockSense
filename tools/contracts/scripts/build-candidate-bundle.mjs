#!/usr/bin/env node
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFullPackage } from '../src/full-package.mjs';
import { validateCandidate } from '../src/validate.mjs';
import { buildPackageBundle, verifyPackageBundle } from '../src/package-bundle.mjs';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const output = process.argv[2] ? resolve(process.argv[2]) : null;
if (!output || process.argv.length !== 3) {
  process.stderr.write('Usage: node scripts/build-candidate-bundle.mjs <output-file>\n');
  process.exit(2);
}

const packageRoot = await mkdtemp(join(tmpdir(), 'stocksense-bundle-source-'));
try {
  const assembled = await buildFullPackage(repoRoot, packageRoot);
  if (!assembled.manifest || assembled.problems.length) {
    throw new Error(`Full candidate package is incomplete (${assembled.problems.length} fixture problems)`);
  }
  const validation = await validateCandidate(packageRoot,
    { repoRoot, standardsImage: process.env.STOCKSENSE_STANDARDS_IMAGE });
  if (validation.releaseReady !== false || validation.uncoveredBoundaries.length) {
    throw new Error('Candidate validation did not confirm complete C01-C27 coverage');
  }
  const bytes = await buildPackageBundle(packageRoot);
  const verified = verifyPackageBundle(bytes);
  if (verified.manifestDigest !== validation.manifestDigest) {
    throw new Error('Bundle manifest differs from the validated candidate');
  }
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, bytes, { flag: 'wx' });
  process.stdout.write(JSON.stringify({
    artifact: output,
    artifactDigest: verified.artifactDigest,
    manifestDigest: verified.manifestDigest,
    sourceRevision: validation.sourceRevision,
    fileCount: verified.fileCount,
    totalBytes: verified.totalBytes,
    releaseReady: false
  }) + '\n');
} catch (error) {
  process.stderr.write(JSON.stringify({ code: error?.code ?? 'BUNDLE_FAILED',
    ruleId: error?.ruleId ?? 'BR6.6', message: 'Candidate bundle construction failed' }) + '\n');
  process.exitCode = 1;
} finally {
  await rm(packageRoot, { recursive: true, force: true });
}
