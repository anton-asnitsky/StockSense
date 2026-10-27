#!/usr/bin/env node
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyCandidateEvidence } from '../src/candidate-provenance.mjs';
import { ContractError } from '../src/package-loader.mjs';
import { toDiagnostic } from '../src/diagnostics.mjs';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const [recordPath, bundle, sbom, imageDirectory, securityDirectory] = process.argv.slice(2);
if (process.argv.length !== 7) {
  process.stderr.write('Usage: node scripts/verify-candidate-evidence.mjs <record> <bundle> <sbom> <image-dir> <security-dir>\n');
  process.exit(2);
}
try {
  const path = resolve(recordPath);
  let size;
  try { size = (await stat(path)).size; } catch {
    throw new ContractError('CANDIDATE_EVIDENCE_MISSING', 'BR6.5', 'Candidate record is missing');
  }
  if (size > 1024 * 1024) throw new ContractError('CANDIDATE_EVIDENCE_LIMIT', 'NFR10.1', 'Candidate record exceeds its byte limit');
  const record = JSON.parse(await readFile(path, 'utf8'));
  const result = await verifyCandidateEvidence(record, { repoRoot, bundlePath: resolve(bundle),
    sbomPath: resolve(sbom), imageDirectory: resolve(imageDirectory),
    securityDirectory: resolve(securityDirectory),
    validatorImageId: process.env.STOCKSENSE_STANDARDS_IMAGE,
    kiotaImageId: process.env.STOCKSENSE_KIOTA_IMAGE });
  process.stdout.write(JSON.stringify(result) + '\n');
} catch (error) {
  process.stderr.write(JSON.stringify(toDiagnostic(error, { repoRoot })) + '\n');
  process.exitCode = 1;
}
