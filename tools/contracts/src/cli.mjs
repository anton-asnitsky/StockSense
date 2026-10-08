#!/usr/bin/env node
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ContractError } from './package-loader.mjs';
import { validateCandidate } from './validate.mjs';

export async function main(args) {
  const usage = { exitCode: 2, result: { code: 'USAGE', ruleId: 'BR2.1', message: 'Usage: validate <package-root> [--repo-root <path>]' } };
  if (args[0] !== 'validate' || (args.length !== 2 && args.length !== 4)) return usage;
  if (args.length === 4 && args[2] !== '--repo-root') return usage;
  const repoRoot = args.length === 4 ? resolve(args[3]) : undefined;
  try {
    return { exitCode: 0, result: await validateCandidate(resolve(args[1]),
      { repoRoot, standardsImage: process.env.STOCKSENSE_STANDARDS_IMAGE }) };
  } catch (error) {
    if (error instanceof ContractError) {
      return { exitCode: 1, result: { code: error.code, ruleId: error.ruleId, message: error.message } };
    }
    return { exitCode: 1, result: { code: 'INPUT_IO', ruleId: 'BR2.1', message: 'Package input could not be read safely.' } };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { exitCode, result } = await main(process.argv.slice(2));
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exitCode = exitCode;
}
