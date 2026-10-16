import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSbom } from '../src/sbom.mjs';

// Emit the CycloneDX SBOM the release `sbom` gate requires, and print its
// digest so a caller can record it as the gate's reportDigest. Deterministic:
// the same lockfile always produces the same bytes and the same digest.
//
// usage: build-sbom.mjs [output-path]

const packageRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
const output = resolve(process.argv[2] ?? join(packageRoot, 'sbom.cdx.json'));

const { bytes, digest, components } = await buildSbom(join(packageRoot, 'pnpm-lock.yaml'), {
  name: manifest.name ?? 'stocksense-contracts',
  version: manifest.version ?? '1.0.0',
  generator: 'stocksense-contracts-sbom'
});
await writeFile(output, bytes);
process.stdout.write(`${digest}\n`);
process.stderr.write(`CycloneDX 1.6, ${components} components -> ${output}\n`);
