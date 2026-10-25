import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Runs a locked Node tool without a shell and reports the enclosing cgroup's
// peak after the tool exits. Docker's memory and wall limits remain authoritative.
export async function launchTool(args, { start = spawn,
  peak = () => readFile('/sys/fs/cgroup/memory.peak', 'utf8'),
  output = process.stderr } = {}) {
  if (!Array.isArray(args) || args.length < 1 || typeof args[0] !== 'string') return 125;
  let child;
  try {
    child = start(process.execPath, args, { stdio: ['ignore', 'inherit', 'inherit'], shell: false });
  } catch { return 125; }
  /** @type {Promise<{code: number | null, signal: NodeJS.Signals | null}>} */
  const waitForChild = new Promise(resolve => {
    child.once('error', () => resolve({ code: null, signal: null }));
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
  const completion = await waitForChild;
  let value;
  try { value = String(await peak()).trim(); }
  catch { return 125; }
  if (!/^(0|[1-9][0-9]*)$/.test(value) || !Number.isSafeInteger(Number(value))) return 125;
  output.write(`\nSTOCKSENSE_GENERATOR_PEAK=${value}\n`);
  if (completion.signal === 'SIGKILL') return 137;
  const code = completion.code;
  return typeof code === 'number' && Number.isInteger(code) && code >= 0 && code <= 255
    ? code : 125;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = await launchTool(process.argv.slice(2));
}
