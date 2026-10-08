import { readFile, writeFile } from 'node:fs/promises';
import YAML from 'yaml';

// Quote comma-bearing plain scalars inside single-line YAML flow mappings.
//
// A plain scalar inside `{ ... }` cannot contain a comma: YAML reads the comma
// as a key separator, so the tail of a sentence silently becomes sibling keys
// with null values. `{ description: Grant missing, revoked, inactive, or
// subject ineligible }` parses as a description of "Grant missing" plus three
// null keys, and the rest of the sentence is gone. Block-style scalars are
// unaffected - a comma is legal there - so only flow mappings are touched.
//
// The repair adds quotes and nothing else. Every line is verified after the
// edit: the mapping must parse, no prose key may remain null, and the quoted
// description must reproduce the original byte span exactly. A line that fails
// any of those is left alone and reported, because guessing where a sentence
// ends in an approved contract is not a repair.

const SIBLING_KEY = /^,\s+[A-Za-z_][A-Za-z0-9_.-]*:\s/;

/** The end of the description span: the next real sibling key, or the close. */
function describeSpanEnd(flow, from) {
  let depth = 0;
  for (let index = from; index < flow.length; index += 1) {
    const char = flow[index];
    if (char === '{' || char === '[') depth += 1;
    else if (char === ']') depth -= 1;
    else if (char === '}') {
      if (depth === 0) return index;
      depth -= 1;
    } else if (char === ',' && depth === 0 && SIBLING_KEY.test(flow.slice(index))) return index;
  }
  return -1;
}

const quote = value => `'${value.replace(/'/g, "''")}'`;

/**
 * @param {string} line one source line
 * @returns {{line: string, repaired: boolean, reason?: string}}
 */
export function repairLine(line) {
  const open = line.indexOf('{');
  const close = line.lastIndexOf('}');
  if (open === -1 || close < open || !line.includes('description:')) return { line, repaired: false };
  const flow = line.slice(open, close + 1);
  let before;
  try { before = YAML.parse(flow); }
  catch { return { line, repaired: false, reason: 'flow mapping does not parse at all' }; }
  if (!before || typeof before !== 'object' || Array.isArray(before)) return { line, repaired: false };
  const broken = Object.entries(before).filter(([key, value]) => value === null && /\s/.test(key));
  if (!broken.length) return { line, repaired: false };

  const marker = flow.indexOf('description:');
  if (marker === -1) return { line, repaired: false, reason: 'description is nested deeper than this repair handles' };
  const valueStart = marker + 'description:'.length;
  const leading = flow.slice(valueStart).match(/^\s*/)?.[0] ?? '';
  const spanStart = valueStart + leading.length;
  if (['\'', '"'].includes(flow[spanStart])) return { line, repaired: false };
  const spanEnd = describeSpanEnd(flow, spanStart);
  if (spanEnd === -1) return { line, repaired: false, reason: 'no sibling key or closing brace found' };
  const span = flow.slice(spanStart, spanEnd).trimEnd();
  if (!span.includes(',')) return { line, repaired: false };

  const repairedFlow = flow.slice(0, spanStart) + quote(span) + flow.slice(spanStart + span.length);
  let after;
  try { after = YAML.parse(repairedFlow); }
  catch { return { line, repaired: false, reason: 'repaired mapping does not parse' }; }
  if (Object.values(after).some(value => value === null)) {
    return { line, repaired: false, reason: 'a null-valued key survived the repair' };
  }
  if (after.description !== span) {
    return { line, repaired: false, reason: 'quoted description does not reproduce the original text' };
  }
  return { line: line.slice(0, open) + repairedFlow + line.slice(close + 1), repaired: true };
}

const target = process.argv[2];
const apply = process.argv.includes('--apply');
if (!target) {
  process.stderr.write('usage: repair-flow-descriptions.mjs <file> [--apply]\n');
  process.exit(2);
}
const original = await readFile(target, 'utf8');
// Split keeping each terminator, because a document may legitimately mix them:
// this one carries 4333 LF and 32 CRLF lines, and normalising them would turn
// a 34-line repair into a whole-file rewrite of an approved contract.
const parts = original.split(/(\r\n|\n|\r)/);
const repaired = [];
const skipped = [];
let lineNumber = 1;
const output = parts.map((part, index) => {
  if (index % 2 === 1) { lineNumber += 1; return part; }
  const result = repairLine(part);
  if (result.repaired) repaired.push(lineNumber);
  else if (result.reason) skipped.push({ line: lineNumber, reason: result.reason });
  return result.line;
});

process.stdout.write(`repaired flow mappings : ${repaired.length}\n`);
if (repaired.length) process.stdout.write(`lines                  : ${repaired.join(', ')}\n`);
if (skipped.length) {
  process.stdout.write(`left alone             : ${skipped.length}\n`);
  for (const item of skipped) process.stdout.write(`  L${item.line}: ${item.reason}\n`);
}
// Quoting only: the two texts must differ by nothing but added quote characters.
const strip = value => value.replace(/['"]/g, '');
if (strip(output.join("")) !== strip(original)) {
  process.stderr.write('refusing to write: the change is not quoting-only\n');
  process.exit(1);
}
process.stdout.write('quoting-only check     : passed\n');
if (apply && repaired.length) {
  await writeFile(target, output.join(""));
  process.stdout.write(`written                : ${target}\n`);
} else process.stdout.write('dry run; pass --apply to write\n');
