#!/usr/bin/env node
import { resolve } from 'node:path';
import { buildSourceInventory } from '../src/catalogue.mjs';

const root = process.argv[2] ? resolve(process.argv[2]) : resolve(import.meta.dirname, '../../..');
try {
  process.stdout.write(JSON.stringify(await buildSourceInventory(root), null, 2) + '\n');
} catch (error) {
  process.stderr.write(JSON.stringify({ code: error?.code ?? 'INPUT_IO', ruleId: error?.ruleId ?? 'BR1.1',
    message: error?.message ?? 'Canonical source inventory could not be built.' }) + '\n');
  process.exitCode = 1;
}
