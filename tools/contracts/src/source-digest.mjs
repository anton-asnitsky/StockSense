import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Digest of the tool sources the standards image carries.
 *
 * The image bakes in a copy of this directory, so the oracle that runs inside
 * it is the oracle as of the build. A stale image reports a stale tool's
 * verdict, and nothing in a passing run says which tool produced it - a
 * two-day-old image once rejected a valid package for a feature it simply did
 * not have, and an older one would just as happily have passed a package the
 * current rules reject. Both sides compute this the same way so the runner can
 * refuse an image that does not match the tree it is being asked to speak for.
 *
 * Every `.mjs` in the directory counts, including the host-only modules.
 * Narrowing it to the files the container executes would mean maintaining that
 * list by hand, and getting it wrong fails open.
 *
 * @param {string} [directory] defaults to this module's own directory
 * @returns {Promise<string>} `sha256:` digest over every source path and its bytes
 */
export async function sourceTreeDigest(directory = fileURLToPath(new URL('.', import.meta.url))) {
  const names = (await readdir(directory)).filter(name => name.endsWith('.mjs')).sort();
  const hash = createHash('sha256');
  for (const name of names) {
    hash.update(name);
    hash.update('\0');
    hash.update(createHash('sha256').update(await readFile(join(directory, name))).digest('hex'));
    hash.update('\n');
  }
  // The pinned validators themselves live in the image's node_modules, so the
  // dependency manifests decide which Redocly, AsyncAPI CLI and Ajv a run was
  // judged by. Digesting only the sources left that half unguarded: upgrading
  // the AsyncAPI CLI pin changed the validator inside the image while the
  // digest stayed identical, so a stale image would still have been accepted.
  // Both files sit one level above this directory in the repository and in the
  // image alike.
  for (const manifest of ['package.json', 'pnpm-lock.yaml']) {
    hash.update(manifest);
    hash.update('\0');
    hash.update(createHash('sha256').update(await readFile(join(directory, '..', manifest))).digest('hex'));
    hash.update('\n');
  }
  return 'sha256:' + hash.digest('hex');
}

// Invoked directly during the image build to record the digest of the sources
// being copied in. Keep the output a bare digest on one line.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.stdout.write(await sourceTreeDigest() + '\n');
}
