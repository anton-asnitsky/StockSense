#!/usr/bin/env node
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFullPackage } from '../src/full-package.mjs';
import { validateCandidate } from '../src/validate.mjs';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const flags = process.argv.slice(2).filter(item => item.startsWith("--"));
const argument = process.argv.slice(2).find(item => !item.startsWith("--"));
const outRoot = argument ? resolve(argument) : await mkdtemp(join(tmpdir(), 'stocksense-full-package-'));

try {
  const { manifest, problems, bound, exempt } = await buildFullPackage(repoRoot, outRoot,
    { allowIncomplete: flags.includes("--allow-incomplete") });
  process.stdout.write(`bound documents : ${bound}\nexempt documents: ${exempt}\nproblems        : ${problems.length}\n`);
  for (const { document, reason } of problems) process.stdout.write(`   - ${document.padEnd(56)} ${reason}\n`);
  if (!manifest) {
    process.stdout.write('\nThe package was not written: every canonical document must bind a fixture pair.\n');
    process.exitCode = 1;
  } else {
    process.stdout.write(`\nAssembled at ${outRoot}\nvalidating...\n`);
    const result = await validateCandidate(outRoot,
      { repoRoot, standardsImage: process.env.STOCKSENSE_STANDARDS_IMAGE });
    process.stdout.write(JSON.stringify(result, null, 2).slice(0, 4000) + '\n');
  }
} catch (error) {
  process.stdout.write(`refused: ${error.code ?? error.name}/${error.ruleId ?? '-'}: ${error.message}\n`);
  process.exitCode = 1;
} finally {
  if (!argument) await rm(outRoot, { recursive: true, force: true });
}
