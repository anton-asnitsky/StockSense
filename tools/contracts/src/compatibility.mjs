import { ContractError } from './package-loader.mjs';

const fail = (code, rule, message) => { throw new ContractError(code, rule, message); };
const object = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const string = value => typeof value === 'string' && value.length > 0;

const COMMIT = /^[0-9a-f]{40}([0-9a-f]{24})?$/;
const PACKAGE_VERSION = /^([0-9]+)\.[0-9]+\.[0-9]+$/;
const DIFFABLE = new Set(['openapi', 'asyncapi', 'schema']);

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

/** The pinned differ is not vendored in this package, so it fails closed. */
function runPinnedDiff() {
  fail('DIFFER_UNAVAILABLE', 'BR4.3', 'The pinned compatibility differ is not available in this environment');
}

/**
 * Assess every bound pair. A breaking identity is accepted only with an
 * approval that names the exact predecessor revision and declares an overlap.
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
