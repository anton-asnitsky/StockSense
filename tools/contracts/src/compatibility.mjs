import { spawnSync } from 'node:child_process';
import { realpathSync, statSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContractError, digest } from './package-loader.mjs';
import { preflightCanonicalReferences } from './reference-preflight.mjs';
import { materializeOfflineReferences } from './validate.mjs';

/** @returns {never} */
const fail = (code, rule, message) => { throw new ContractError(code, rule, message); };
const object = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const string = value => typeof value === 'string' && value.length > 0;

const COMMIT = /^[0-9a-f]{40}([0-9a-f]{24})?$/;
const PACKAGE_VERSION = /^([0-9]+)\.[0-9]+\.[0-9]+$/;
const OVERLAP_DATE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}Z)?$/;
const DIFFABLE = new Set(['openapi', 'asyncapi', 'schema']);
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const oasdiff = resolve(repoRoot, '.tools', 'oasdiff', '1.28.0', `${process.platform}-${process.arch}`,
  process.platform === 'win32' ? 'oasdiff.exe' : 'oasdiff');
const oasdiffConfig = resolve(repoRoot, 'tools', 'contracts', 'oasdiff.yaml');

const approvedOverlap = value => {
  if (!string(value) || !OVERLAP_DATE.test(value)) return false;
  const instant = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(instant.getTime())) return false;
  // Date.parse normalizes dates such as February 30 instead of rejecting them.
  const normalized = instant.toISOString();
  return value.length === 10 ? normalized.slice(0, 10) === value :
    `${normalized.slice(0, 19)}Z` === value;
};

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
 * reason. Every baseline identity must also be consumed, so an unexplained
 * removal cannot be read as "nothing changed" or as a first release.
 */
export function bindPredecessors(candidateEntries, baselineEntries, { firstRelease = {}, approvals = {} } = {}) {
  if (!Array.isArray(candidateEntries) || !Array.isArray(baselineEntries)) {
    fail('COMPATIBILITY_INPUT', 'BR4.2', 'Candidate and baseline entries are required');
  }
  const bindings = [];
  const candidateIds = new Set();
  const baselineById = new Map();
  const consumedBaselineIds = new Set();
  for (const entry of baselineEntries) {
    if (!DIFFABLE.has(entry.artifactKind)) continue;
    if (baselineById.has(entry.logicalId)) {
      fail('PREDECESSOR_AMBIGUOUS', 'BR4.2', 'A canonical logical identity must have one immutable predecessor');
    }
    baselineById.set(entry.logicalId, entry);
  }
  for (const entry of candidateEntries) {
    if (!DIFFABLE.has(entry.artifactKind)) continue;
    if (candidateIds.has(entry.logicalId)) {
      fail('CANDIDATE_IDENTITY_AMBIGUOUS', 'BR4.2', 'A canonical logical identity must appear once in the candidate');
    }
    candidateIds.add(entry.logicalId);
    const approval = approvals[entry.logicalId];
    const predecessorLogicalId = object(approval) ? approval.predecessorLogicalId : undefined;
    if (predecessorLogicalId !== undefined && (!string(predecessorLogicalId) ||
        predecessorLogicalId === entry.logicalId)) {
      fail('PREDECESSOR_MAPPING_INVALID', 'BR4.1', 'A replacement needs a distinct predecessor logical identity');
    }
    const predecessor = baselineById.get(predecessorLogicalId ?? entry.logicalId);
    if (predecessor) {
      if (predecessor.artifactKind !== entry.artifactKind) {
        fail('PREDECESSOR_KIND', 'BR4.2', 'A predecessor must have the same canonical kind');
      }
      if (consumedBaselineIds.has(predecessor.logicalId)) {
        fail('PREDECESSOR_REUSED', 'BR4.1', 'A baseline identity cannot be replaced by multiple candidates');
      }
      if (predecessorLogicalId && (approval.predecessorRevisionId !== predecessor.revisionId ||
          !string(approval.approvedBy) || !approvedOverlap(approval.overlapUntil))) {
        fail('PREDECESSOR_MAPPING_UNAPPROVED', 'BR4.1',
          'A replacement needs approval bound to the exact predecessor revision and overlap');
      }
      consumedBaselineIds.add(predecessor.logicalId);
      bindings.push({
        logicalId: entry.logicalId,
        document: entry.document,
        ...(predecessorLogicalId ? {
          predecessorLogicalId,
          predecessorDocument: predecessor.document
        } : {}),
        artifactKind: entry.artifactKind,
        candidateRevisionId: entry.revisionId,
        predecessorRevisionId: predecessor.revisionId,
        unchanged: predecessor.revisionId === entry.revisionId
      });
      continue;
    }
    if (predecessorLogicalId) {
      fail('PREDECESSOR_MAPPING_INVALID', 'BR4.1', 'The mapped predecessor is absent from the immutable baseline');
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
  if ([...baselineById.keys()].some(id => !consumedBaselineIds.has(id))) {
    fail('PREDECESSOR_UNACCOUNTED', 'BR4.1',
      'A canonical baseline identity was removed or renamed without a mapped successor');
  }
  return bindings;
}

/**
 * The pinned OpenAPI differ consumes only immutable local source files.
 * Changed AsyncAPI and JSON Schema documents use explicit, predecessor-bound
 * approval instead of being passed through an OpenAPI-only differ.
 * @param {string} artifactKind
 * @param {object} binding
 * @param {Function} resolveSource
 * @returns {Promise<{breakingChanges: Array<{id:string,level:number,operation:string|null,path:string}>}>}
 */
async function runPinnedDiff(artifactKind, binding, resolveSource, localReferencesVerified = false) {
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
    ['breaking', base, candidate,
      `--allow-external-refs=${localReferencesVerified}`,
      '--format', 'json', '--config', oasdiffConfig],
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
 * Build a differ for two complete, private source snapshots. Both graphs are
 * verified here, inside the same closure that enables local reference loading;
 * a caller of assessCompatibility cannot enable it with an untrusted flag.
 */
export async function createPreflightedSnapshotDiffer({ predecessorRoot, predecessorEntries,
  candidateRoot, candidateEntries }) {
  const scratch = await mkdtemp(join(tmpdir(), 'stocksense-diff-'));
  const beforeRoot = join(scratch, 'before');
  const afterRoot = join(scratch, 'after');
  try {
    for (const [sourceRoot, entries, targetRoot] of [
      [predecessorRoot, predecessorEntries, beforeRoot],
      [candidateRoot, candidateEntries, afterRoot]
    ]) {
      const offlineReferences = [];
      await preflightCanonicalReferences(sourceRoot, entries, { offlineReferences });
      for (const entry of entries) {
        const bytes = await readFile(join(sourceRoot, entry.document));
        if (digest(bytes) !== entry.contentDigest) {
          fail('DIFF_SOURCE_CHANGED', 'BR4.3', 'Source changed after reference preflight');
        }
        const target = join(targetRoot, entry.document);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, materializeOfflineReferences(bytes, entry.document, offlineReferences));
      }
    }
  } catch (error) {
    await rm(scratch, { recursive: true, force: true });
    throw error;
  }
  const before = new Set(predecessorEntries.map(entry => entry.document));
  const after = new Set(candidateEntries.map(entry => entry.document));
  const runDiff = (artifactKind, binding) => {
    const predecessorDocument = binding.predecessorDocument ?? binding.document;
    if (!before.has(predecessorDocument) || !after.has(binding.document)) {
      fail('DIFF_SOURCE', 'BR4.3', 'Diff pair is absent from the verified source snapshots');
    }
    return runPinnedDiff(artifactKind, binding, async () => ({
      predecessorPath: join(beforeRoot, predecessorDocument),
      candidatePath: join(afterRoot, binding.document)
    }), true);
  };
  return { runDiff, cleanup: () => rm(scratch, { recursive: true, force: true }) };
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
    if (binding.artifactKind === 'asyncapi' || binding.artifactKind === 'schema') {
      const approval = approvals[binding.logicalId];
      if (!object(approval) || approval.predecessorRevisionId !== binding.predecessorRevisionId ||
          !string(approval.approvedBy) || !approvedOverlap(approval.overlapUntil)) {
        fail('NON_OPENAPI_CHANGE_UNAPPROVED', 'BR4.4',
          'A changed AsyncAPI or schema document needs explicit predecessor-bound approval and overlap');
      }
      assessments.push({
        ...binding,
        outcome: 'change-approved',
        breakingChanges: [],
        approvedBy: approval.approvedBy,
        overlapUntil: approval.overlapUntil
      });
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
        !string(approval.approvedBy) || !approvedOverlap(approval.overlapUntil)) {
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
