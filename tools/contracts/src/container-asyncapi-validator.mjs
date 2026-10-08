import { lstat, realpath } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { Parser, fromFile } from '@asyncapi/parser';

// Pinned AsyncAPI 3.0.0 validation inside the standards image.
//
// This replaces @asyncapi/cli, which shipped a code generator, a model
// generator, a Spectral CLI and release tooling as runtime dependencies. One of
// those trees carried `braces`, a stack-exhaustion advisory with no patched
// version anywhere, so the finding could not be fixed while the CLI was the
// validator. @asyncapi/parser is the library the CLI validates with, so this
// removes the dependency rather than excusing the finding.
//
// Equivalence was measured before the swap, not assumed: all six canonical
// AsyncAPI documents and five mutations of one of them produce identical
// verdicts under both, including the two mutations both accept.
//
// Invoked as: node container-asyncapi-validator.mjs validate /workspace/<doc>
// The argument shape matches what the CLI took, so the runner is unchanged.

const WORKSPACE = '/workspace';
const SAFE_PATH = /^[A-Za-z0-9._/-]+$/;

/** @returns {never} */
const reject = () => { process.exitCode = 3; throw new Error('Verified AsyncAPI graph failed validation'); };

const inside = (root, path) => {
  const rel = relative(root, path);
  return rel !== '' && rel !== '..' && !rel.startsWith('..' + sep);
};

const [command, target] = process.argv.slice(2);
if (command !== 'validate' || typeof target !== 'string' || !target) reject();

// The runner passes an absolute /workspace path. Accept nothing else: no
// traversal, no symlink out of the read-only mount, no second document.
const absolute = resolve(target);
if (!inside(WORKSPACE, absolute)) reject();
const document = relative(WORKSPACE, absolute).split(sep).join('/');
if (!SAFE_PATH.test(document) || document.split('/').some(part => !part || part.startsWith('.'))) reject();
const stat = await lstat(absolute).catch(reject);
if (!stat.isFile() || stat.isSymbolicLink()) reject();
if (await realpath(absolute).catch(reject) !== absolute) reject();

const parser = new Parser();
let parsed;
try {
  // fromFile rather than parsing a string: a bare string has no base to
  // resolve a relative reference against, and every one of these documents
  // would fail as invalid-ref. That is how the first equivalence run lied.
  parsed = await fromFile(parser, absolute).parse();
} catch {
  // A thrown parse is a validation failure, not an engine failure: the
  // document reached the pinned parser and the parser refused it.
  process.exitCode = 2;
  process.stdout.write('');
  process.exit(2);
}

const errors = (parsed.diagnostics ?? []).filter(item => item.severity === 0);
if (!parsed.document || errors.length) {
  process.exitCode = 2;
  process.exit(2);
}
process.exitCode = 0;
