import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSbom } from '../src/sbom.mjs';
import { readSbomSourceContext } from '../src/sbom-context.mjs';
import { readKiotaRuntimeEvidence } from '../src/image-ledger.mjs';
import { readLedgerAuthorityMode, readPrLedgerInput, readPrLedgerReceipt } from '../src/pr-ledger-context.mjs';

// Emit the CycloneDX SBOM the release `sbom` gate requires, and print its
// digest so a caller can record it as the gate's reportDigest. The lockfile,
// tool recipes, workflow pins and supplied image IDs determine its bytes.
//
// usage: build-sbom.mjs [output-path]

const packageRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
const output = resolve(process.argv[2] ?? join(packageRoot, 'sbom.cdx.json'));
const mode = readLedgerAuthorityMode();
const pr = mode === 'owner-authorized-pr-ledger-v1';
// A failed new PR verification must not leave an older SBOM as current output.
if (pr) await rm(output, { force: true });
// The schema selects validation behavior only; no receipt value is an expected digest.
const receiptSchema = process.env.STOCKSENSE_IMAGE_EVIDENCE_DIR
  ? (pr ? await readPrLedgerReceipt(join(process.env.STOCKSENSE_IMAGE_EVIDENCE_DIR, 'ledger-verification.json'))
    : JSON.parse(await readFile(join(process.env.STOCKSENSE_IMAGE_EVIDENCE_DIR,
      'ledger-verification.json'), 'utf8'))).schema : undefined;
const sourceContext = pr || receiptSchema === 'stocksense-image-ledger-verification-v2'
  ? readSbomSourceContext(resolve(packageRoot, '../..'), process.env.STOCKSENSE_CANDIDATE_REVISION)
  : undefined;
let prAuthorityInput;
if (pr) {
  if (!process.env.STOCKSENSE_IMAGE_EVIDENCE_DIR) throw new Error('PR image evidence directory is required');
  const runtimeManifestDigest = await readKiotaRuntimeEvidence(process.env.STOCKSENSE_IMAGE_EVIDENCE_DIR,
    process.env.STOCKSENSE_KIOTA_IMAGE);
  prAuthorityInput = readPrLedgerInput({ sourceContext, runtimeManifestDigest });
}

const { bytes, digest, components } = await buildSbom(join(packageRoot, 'pnpm-lock.yaml'), {
  name: manifest.name ?? 'stocksense-contracts',
  version: manifest.version ?? '1.0.0',
  generator: 'stocksense-contracts-sbom',
  validatorImageDigest: process.env.STOCKSENSE_STANDARDS_IMAGE,
  kiotaImageDigest: process.env.STOCKSENSE_KIOTA_IMAGE,
  imageEvidenceDirectory: process.env.STOCKSENSE_IMAGE_EVIDENCE_DIR,
  candidateRevision: process.env.STOCKSENSE_CANDIDATE_REVISION,
  sourceContext, prAuthorityInput
});
if (pr) {
  const temporary = `${output}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, bytes, { flag: 'wx' });
    await rename(temporary, output);
  } finally { await rm(temporary, { force: true }); }
} else await writeFile(output, bytes);
process.stdout.write(`${digest}\n`);
process.stderr.write(`CycloneDX 1.6, ${components} components -> ${output}\n`);
