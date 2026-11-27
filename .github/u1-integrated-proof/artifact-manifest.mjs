import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readdir, lstat, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
const root = join(process.env.RUNNER_TEMP, 'u1-integrated');
await mkdir(join(root, 'proof'), { recursive: true });
const files = [];
async function walk(directory) {
  for (const name of (await readdir(directory)).sort()) {
    const path = join(directory, name);
    if (path === join(root, 'proof/artifact-manifest.json')) continue;
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) throw new Error('Evidence must not contain symlinks');
    if (stat.isDirectory()) await walk(path);
    else if (stat.isFile()) {
      const hash = createHash('sha256');
      for await (const bytes of createReadStream(path)) hash.update(bytes);
      files.push({ path: relative(root, path).replaceAll('\\', '/'), bytes: stat.size, sha256: hash.digest('hex') });
    }
  }
}
await walk(root);
await writeFile(join(root, 'proof/artifact-manifest.json'), JSON.stringify({ diagnosticOnly: true,
  candidate: process.env.CANDIDATE, harnessRevision: process.env.GITHUB_SHA,
  repository: process.env.GITHUB_REPOSITORY, runId: process.env.GITHUB_RUN_ID,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT, job: process.env.GITHUB_JOB, lane: process.env.PROOF_LANE,
  note: 'Artifact presence is not a passing job or owner authorization; inspect actual job conclusion and logs.', files }, null, 2) + '\n');
