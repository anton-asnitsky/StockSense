#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { assessCatalogueAgainstBaseline } from '../src/baseline-compatibility.mjs';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const args = process.argv.slice(2);
const commit = args[0];
const requirePinnedDiffer = args.includes('--require-assessment') || args.includes('--require-differ');
const approvalsAt = args.indexOf('--approvals-file');
if (!commit || commit.startsWith('--')) {
  process.stdout.write('Usage: assess-baseline <40-character-commit> [--require-assessment] [--approvals-file <json>]\n');
  process.exitCode = 2;
} else {
  try {
    let approvals = {};
    if (approvalsAt !== -1) {
      const path = args[approvalsAt + 1];
      if (!path || path.startsWith('--')) throw new Error('An approvals JSON path is required');
      let raw;
      try { raw = await readFile(path, 'utf8'); }
      catch { throw new Error('Approvals JSON cannot be read'); }
      if (Buffer.byteLength(raw) > 64 * 1024) throw new Error('Approvals JSON exceeds 64 KiB');
      approvals = JSON.parse(raw);
      if (!approvals || typeof approvals !== 'object' || Array.isArray(approvals)) {
        throw new Error('Approvals JSON must be a map keyed by logical identity');
      }
    }
    const { baseline, candidateRevision, assessments, tally, undiffable } =
      await assessCatalogueAgainstBaseline(repoRoot, commit, { requirePinnedDiffer, approvals });
    process.stdout.write(`baseline  : ${baseline.commit}\ncandidate : ${candidateRevision}\n`);
    process.stdout.write(`outcomes  : ${JSON.stringify(tally)}\n`);
    for (const row of assessments.filter(item => item.outcome === 'breaking-approved' || item.breakingChanges.length)) {
      process.stdout.write(`   breaking ${row.document}: ${row.breakingChanges.map(change => change.id).join(', ')}\n`);
    }
    for (const row of undiffable) {
      process.stdout.write(`   approval-required ${row.document} (${row.artifactKind}): changed without explicit predecessor approval\n`);
    }
  } catch (error) {
    process.stdout.write(`refused: ${error.code ?? error.name}/${error.ruleId ?? '-'}: ${error.message}\n`);
    process.exitCode = 1;
  }
}
