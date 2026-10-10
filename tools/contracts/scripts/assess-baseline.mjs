#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { assessCatalogueAgainstBaseline } from '../src/baseline-compatibility.mjs';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const commit = process.argv.slice(2).find(item => !item.startsWith("--"));
const requirePinnedDiffer = process.argv.includes("--require-differ");
if (!commit) {
  process.stdout.write('Usage: assess-baseline <40-character-commit>\n');
  process.exitCode = 2;
} else {
  try {
    const { baseline, candidateRevision, assessments, tally, undiffable } =
      await assessCatalogueAgainstBaseline(repoRoot, commit, { requirePinnedDiffer });
    process.stdout.write(`baseline  : ${baseline.commit}\ncandidate : ${candidateRevision}\n`);
    process.stdout.write(`outcomes  : ${JSON.stringify(tally)}\n`);
    for (const row of assessments.filter(item => item.outcome === 'breaking-approved' || item.breakingChanges.length)) {
      process.stdout.write(`   breaking ${row.document}: ${row.breakingChanges.map(change => change.id).join(', ')}\n`);
    }
    for (const row of undiffable) {
      process.stdout.write(`   undiffable ${row.document} (${row.artifactKind}): changed with no pinned differ\n`);
    }
  } catch (error) {
    process.stdout.write(`refused: ${error.code ?? error.name}/${error.ruleId ?? '-'}: ${error.message}\n`);
    process.exitCode = 1;
  }
}
