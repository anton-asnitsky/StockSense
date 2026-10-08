import { spawnSync } from 'node:child_process';
import { realpathSync, statSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContractError } from './package-loader.mjs';

/** @returns {never} */
const fail = (code, rule, message) => { throw new ContractError(code, rule, message); };
const object = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const string = value => typeof value === 'string' && value.length > 0;

const COMMIT = /^[0-9a-f]{40}([0-9a-f]{24})?$/;
const PACKAGE_VERSION = /^([0-9]+)\.[0-9]+\.[0-9]+$/;
const DIFFABLE = new Set(['openapi', 'asyncapi', 'schema']);
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const oasdiff = resolve(repoRoot, '.tools', 'oasdiff', '1.28.0', `${process.platform}-${process.arch}`,
  process.platform === 'win32' ? 'oasdiff.exe' : 'oasdiff');
const oasdiffConfig = resolve(repoRoot, 'tools', 'contracts', 'oasdiff.yaml');

/**
 * The integration baseline must be an exact immutable commit. A branch or tag
 * name can move after the assessment and would not bind the comparison.
 */
export function assertIntegrationBaseline(baseline) {
  if (!object(baseline) || !string(baseline.commit) || !COMMIT.test(baseline.commit)) {
    fail('BASELINE_NOT_IMMUTABLE', 'BR4.1', 'Integration baseline must be an exact commit identity');
  }
  if (baseline.ref !== undefined && !string(baseline.ref)) {
    fail('BASELINE_SHAPE', 'BR4.1', 'Baseline ref must be a string when present');
  }
  return Object.freeze({ commit: baseline.commit, ref: baseline.ref ?? null });
}

/** The C01 package major is fixed at 1; a 2.x.x candidate is rejected outright. */
export function assertPackageMajor(candidateVersion, baselineVersion) {
  for (const [value, label] of [[candidateVersion, 'candidate'], [baselineVersion, 'baseline']]) {
    if (value === undefined && label === 'baseline') continue;
    const match = PACKAGE_VERSION.exec(String(value));
    if (!match) fail('PACKAGE_VERSION_SHAPE', 'BR4.4', 'Package version must be semantic');
    if (match[1] !== '1') fail('PACKAGE_MAJOR_REJECTED', 'BR4.4', 'C01 package major 2.x.x is not accepted');
  }
  return true;
}

/**
 * Bind every diffable candidate entry to its same-kind predecessor in the
 * baseline. A missing predecessor is allowed only with an explicit first-release
 * reason, so an unexplained gap can never be read as "nothing changed".
 */
export function bindPredecessors(candidateEntries, baselineEntries, { firstRelease = {} } = {}) {
  if (!Array.isArray(candidateEntries) || !Array.isArray(baselineEntries)) {
    fail('COMPATIBILITY_INPUT', 'BR4.2', 'Candidate and baseline entries are required');
  }
  const bindings = [];
  for (const entry of candidateEntries) {
    if (!DIFFABLE.has(entry.artifactKind)) continue;
    const predecessor = baselineEntries.find(item => item.logicalId === entry.logicalId);
    if (predecessor) {
      if (predecessor.artifactKind !== entry.artifactKind) {
        fail('PREDECESSOR_KIND', 'BR4.2', 'A predecessor must have the same canonical kind');
      }
      bindings.push({
        logicalId: entry.logicalId,
        document: entry.document,
        artifactKind: entry.artifactKind,
        candidateRevisionId: entry.revisionId,
        predecessorRevisionId: predecessor.revisionId,
        unchanged: predecessor.revisionId === entry.revisionId
      });
      continue;
    }
    const reason = firstRelease[entry.logicalId];
    if (!string(reason)) {
      fail('PREDECESSOR_MISSING', 'BR4.2', 'A candidate without a predecessor needs an explicit first-release reason');
    }
    bindings.push({
      logicalId: entry.logicalId,
      document: entry.document,
      artifactKind: entry.artifactKind,
      candidateRevisionId: entry.revisionId,
      predecessorRevisionId: null,
      firstReleaseReason: reason,
      unchanged: false
    });
  }
  return bindings;
}

/**
 * The pinned OpenAPI differ consumes only immutable local source files.
 * Other canonical kinds stay unavailable until an approved pinned policy exists.
 * @param {string} artifactKind
 * @param {object} binding
 * @param {Function} resolveSource
 * @returns {Promise<{breakingChanges: Array<{id:string,level:number,operation:string|null,path:string}>}>}
 */
async function runPinnedDiff(artifactKind, binding, resolveSource) {
  if (artifactKind !== 'openapi' || typeof resolveSource !== 'function') {
    fail('DIFFER_UNAVAILABLE', 'BR4.3', 'A pinned differ and immutable local source resolver are required');
  }
  const paths = await resolveSource(binding);
  const localFile = value => {
    if (typeof value !== 'string' || !isAbsolute(value)) {
      fail('DIFF_SOURCE', 'BR4.3', 'Diff inputs must be absolute local files');
    }
    try {
      const path = realpathSync(value);
      if (!statSync(path).isFile()) fail('DIFF_SOURCE', 'BR4.3', 'Diff input is not a regular file');
      return path;
    } catch {
      fail('DIFF_SOURCE', 'BR4.3', 'Diff input cannot be read');
    }
  };
  const base = localFile(paths?.predecessorPath);
  const candidate = localFile(paths?.candidatePath);
  const result = spawnSync(oasdiff,
    ['breaking', base, candidate, '--allow-external-refs=false', '--format', 'json', '--config', oasdiffConfig],
    { cwd: repoRoot, encoding: 'utf8', timeout: 60_000, maxBuffer: 1024 * 1024, windowsHide: true });
  if (result.error || result.status !== 0) {
    fail('DIFFER_UNAVAILABLE', 'BR4.3', 'Pinned OpenAPI differ failed; inspect the local tool setup');
  }
  let changes;
  try { changes = JSON.parse(result.stdout); }
  catch { fail('DIFF_RESULT_SHAPE', 'BR4.3', 'Pinned differ returned malformed JSON'); }
  if (!Array.isArray(changes) || changes.some(change => !object(change) ||
      typeof change.id !== 'string' || !/^[a-z0-9-]+$/.test(change.id) ||
      !Number.isInteger(change.level) || typeof change.path !== 'string')) {
    fail('DIFF_RESULT_SHAPE', 'BR4.3', 'Pinned differ returned malformed changes');
  }
  return { breakingChanges: changes.map(change => ({
    id: change.id, level: change.level,
    operation: typeof change.operation === 'string' ? change.operation : null,
    path: change.path
  })) };
}

/**
 * Assess every bound pair. A breaking identity is accepted only with an
 * approval that names the exact predecessor revision and declares an overlap.
 * @param {{ bindings?: any[], approvals?: Record<string, any>, runDiff?: Function, resolveSource?: Function }} [options]
 */
export async function assessCompatibility({ bindings, approvals = {}, runDiff = runPinnedDiff, resolveSource } = {}) {
  if (!Array.isArray(bindings)) fail('COMPATIBILITY_INPUT', 'BR4.3', 'Bindings are required');
  const assessments = [];
  for (const binding of bindings) {
    if (binding.unchanged) {
      assessments.push({ ...binding, outcome: 'unchanged', breakingChanges: [] });
      continue;
    }
    if (binding.predecessorRevisionId === null) {
      assessments.push({ ...binding, outcome: 'first-release', breakingChanges: [] });
      continue;
    }
    const diff = await runDiff(binding.artifactKind, binding, resolveSource);
    if (!object(diff) || !Array.isArray(diff.breakingChanges)) {
      fail('DIFF_RESULT_SHAPE', 'BR4.3', 'The differ must report a breaking-change list');
    }
    if (!diff.breakingChanges.length) {
      assessments.push({ ...binding, outcome: 'compatible', breakingChanges: [] });
      continue;
    }
    const approval = approvals[binding.logicalId];
    if (!object(approval) || approval.predecessorRevisionId !== binding.predecessorRevisionId ||
        !string(approval.approvedBy) || !string(approval.overlapUntil)) {
      fail('BREAKING_CHANGE_UNAPPROVED', 'BR4.4',
        'A breaking identity needs an approval naming its exact predecessor and overlap');
    }
    assessments.push({
      ...binding,
      outcome: 'breaking-approved',
      breakingChanges: diff.breakingChanges,
      approvedBy: approval.approvedBy,
      overlapUntil: approval.overlapUntil
    });
  }
  return assessments;
}
