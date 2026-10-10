#!/usr/bin/env node
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateCandidate } from './validate.mjs';
import { toDiagnostic } from './diagnostics.mjs';

export async function main(args) {
  const usage = {
    exitCode: 2,
    result: {
      severity: 'error', code: 'USAGE', ruleId: 'BR2.1', location: null,
      remediation: 'Pass a readable package root; see the command usage.',
      message: 'Usage: validate <package-root> [--repo-root <path>]'
    }
  };
  if (args[0] !== 'validate' || (args.length !== 2 && args.length !== 4)) return usage;
  if (args.length === 4 && args[2] !== '--repo-root') return usage;
  const repoRoot = args.length === 4 ? resolve(args[3]) : undefined;
  try {
    return { exitCode: 0, result: await validateCandidate(resolve(args[1]),
      { repoRoot, standardsImage: process.env.STOCKSENSE_STANDARDS_IMAGE }) };
  } catch (error) {
    // Every refusal leaves here as a publishable diagnostic: a stable code and
    // rule, a severity, a repository-relative bounded location, a remediation
    // summary, and a message with runner paths, terminal controls, annotation
    // syntax and credential shapes stripped.
    return { exitCode: 1, result: toDiagnostic(error, { repoRoot: repoRoot ?? resolve(args[1]) }) };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { exitCode, result } = await main(process.argv.slice(2));
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exitCode = exitCode;
}
