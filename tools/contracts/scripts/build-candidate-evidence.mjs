#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCandidateEvidence } from '../src/candidate-provenance.mjs';
import { toDiagnostic } from '../src/diagnostics.mjs';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const [bundle, sbom, imageDirectory, securityDirectory, candidateRevision, output] = process.argv.slice(2);
if (process.argv.length !== 8) {
  process.stderr.write('Usage: node scripts/build-candidate-evidence.mjs <bundle> <sbom> <image-dir> <security-dir> <candidate-commit> <output>\n');
  process.exit(2);
}
try {
  const record = await buildCandidateEvidence({ repoRoot, bundlePath: resolve(bundle), sbomPath: resolve(sbom),
    imageDirectory: resolve(imageDirectory), securityDirectory: resolve(securityDirectory), candidateRevision,
    validatorImageId: process.env.STOCKSENSE_STANDARDS_IMAGE,
    kiotaImageId: process.env.STOCKSENSE_KIOTA_IMAGE });
  const destination = resolve(output);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
  process.stdout.write(JSON.stringify({ artifact: destination, candidateRevision,
    bundleDigest: record.bundleDigest, outputs: 107, releaseReady: false }) + '\n');
} catch (error) {
  process.stderr.write(JSON.stringify(toDiagnostic(error, { repoRoot })) + '\n');
  process.exitCode = 1;
}
