import { ContractError } from './package-loader.mjs';

// Turn a refusal into a diagnostic that is safe to publish.
//
// NFR10.1 requires a published diagnostic to retain the rule, a
// repository-relative path, a bounded location, a severity and a remediation
// summary - and to strip tokens, credential-like strings, raw document or
// prompt content, absolute runner paths, terminal controls and annotation
// syntax. A refusal message is composed here, not by a tool, but it can still
// quote a path or a value that came from the package under inspection, so every
// message passes through the same sanitiser.
//
// If no safe, actionable diagnostic can be produced the run still fails: the
// code and rule are always emitted, because those are ours.

const MESSAGE_LIMIT = 512;
const LOCATION_LIMIT = 256;

// Remediation is keyed by rule, so a new finding code inherits a useful summary
// instead of silently emitting none. A code-specific entry wins where the rule
// covers materially different failures.
const REMEDIATION_BY_RULE = Object.freeze({
  'BR1.1': 'Correct the manifest so its entries, boundary rows and required kinds agree with the package contents.',
  'BR1.3': 'Declare each canonical document under a supported kind and dialect.',
  'BR1.7': 'Stamp the package with the commit that contains the exact bytes it ships.',
  'BR2.1': 'Pass a readable package root; see the command usage.',
  'BR2.4': 'Fix the canonical schema so it compiles under the pinned validator.',
  'BR2.5': 'Restate the enforced boundary and kind matrix without weakening it.',
  'BR2.6': 'Declare a candidate scope and sidecar matrix the manifest actually carries.',
  'BR2.7': 'Give every bindable canonical document a positive and a negative fixture.',
  'BR2.8': 'Point each fixture at an element its declared document contains.',
  'BR2.9': 'Mark fixture payloads synthetic.',
  'BR3.1': 'Pin the generator version and configuration the registry declares.',
  'BR3.2': 'Record a SHA-256 digest for every generated output path.',
  'BR3.3': 'Regenerate the consumer and re-pin its output manifest.',
  'BR4.1': 'Name the baseline as an exact 40-character commit, not a branch or tag.',
  'BR4.2': 'Bind each candidate to its same-kind predecessor, or give an explicit first-release reason.',
  'BR4.3': 'Make the pinned differ available for this canonical kind before assessing it.',
  'BR4.4': 'Record an approval naming the exact predecessor revision and its overlap.',
  'BR6.7': 'Bring the workflow back within the CI policy: trusted triggers, pinned actions and least privilege.',
  'NFR6.1': 'Remove protected content from the generated output.',
  'NFR6.2': 'Rebuild the pinned standards image from this tree and pass its exact digest.',
  'NFR8.4': 'Make the schema compile under the pinned 2020-12 validator.',
  'NFR8.5': 'Resolve the standards finding in the named document.',
  'NFR8.6': 'Correct the AsyncAPI payload so it validates under the pinned dialect.',
  'NFR10.1': 'Bring the input within the declared size, reference and runtime bounds.'
});

const REMEDIATION_BY_CODE = Object.freeze({
  SOURCE_NOT_COMMITTED: 'Commit the canonical sources, then stamp the package with that commit.',
  SOURCE_REVISION_MISMATCH: 'Re-stamp the package, or ship the bytes the recorded commit contains.',
  SOURCE_REVISION_UNKNOWN: 'Fetch the full history so the recorded commit is present, then retry.',
  GIT_UNAVAILABLE: 'Run where Git and the repository history are available.',
  STANDARDS_IMAGE_PIN: 'Pass the pinned standards image by its exact SHA-256 digest.',
  STANDARDS_IMAGE_STALE: 'Rebuild the pinned standards image from this tree.',
  STANDARDS_ENGINE: 'Start a local Linux Docker engine and retry.',
  GENERATOR_UNAVAILABLE: 'Restore the pinned generator toolchain before verifying outputs.',
  DIFFER_UNAVAILABLE: 'Install the pinned differ, or exclude kinds it cannot read from the assessment.',
  FIXTURE_COVERAGE: 'Add the missing positive or negative fixture for the named boundary.',
  FIXTURES_MISSING: 'Include an example-fixture sidecar that declares at least one fixture.'
});

// Terminal controls, workflow-annotation syntax and credential shapes. Each is
// replaced rather than removed, so a stripped diagnostic never reads as though
// the value had not been there.
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g;
const ESCAPE = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;
const ANNOTATION = /(?:^|\n)\s*(?:::|##\[)[^\n]*/g;
const WINDOWS_PATH = /[A-Za-z]:[\\/][^\s"'`]*/g;
const POSIX_PATH = /(?:^|(?<=[\s"'`(]))\/(?:[^\s"'`/]+\/)+[^\s"'`/]*/g;
const CREDENTIAL = [
  /\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{10,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bey[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
  /\b(?:bearer|token|secret|password|passwd|api[_-]?key)\b\s*[:=]\s*\S+/gi,
  /\b[A-Za-z0-9+/]{40,}={0,2}\b/g
];

/**
 * A repository-relative, bounded path. Anything that is not a safe relative
 * path inside the repository becomes a placeholder rather than leaking a
 * runner's absolute layout.
 */
export function boundedLocation(value, repoRoot) {
  if (typeof value !== 'string' || !value.trim()) return null;
  let path = value.replace(CONTROL, '').replace(ESCAPE, '').replace(/\\/g, '/').trim();
  const root = typeof repoRoot === 'string' ? repoRoot.replace(/\\/g, '/').replace(/\/+$/, '') : '';
  if (root && path.toLowerCase().startsWith(root.toLowerCase() + '/')) path = path.slice(root.length + 1);
  // An absolute path that is not inside the repository, or one that climbs out
  // of it, says nothing useful and discloses the runner's layout.
  if (/^([A-Za-z]:)?\//.test(path) || path.split('/').includes('..')) return null;
  if (!path) return null;
  return path.length > LOCATION_LIMIT ? path.slice(0, LOCATION_LIMIT - 1) + '…' : path;
}

/**
 * Strip everything NFR10.1 forbids from a message, then bound its length.
 * @param {unknown} value
 * @param {string} [repoRoot]
 */
export function sanitizeText(value, repoRoot) {
  if (typeof value !== 'string') return '';
  let text = value.replace(ESCAPE, '').replace(ANNOTATION, ' ').replace(CONTROL, ' ');
  const root = typeof repoRoot === 'string' ? repoRoot.replace(/\\/g, '/').replace(/\/+$/, '') : '';
  const relative = match => {
    const normalised = match.replace(/\\/g, '/');
    if (root && normalised.toLowerCase().startsWith(root.toLowerCase() + '/')) {
      return normalised.slice(root.length + 1);
    }
    return '<path>';
  };
  text = text.replace(WINDOWS_PATH, relative).replace(POSIX_PATH, relative);
  for (const pattern of CREDENTIAL) text = text.replace(pattern, '<redacted>');
  text = text.replace(/\s+/g, ' ').trim();
  return text.length > MESSAGE_LIMIT ? text.slice(0, MESSAGE_LIMIT - 1) + '…' : text;
}

/**
 * The publishable diagnostic for a refusal.
 * @param {unknown} error
 * @param {{ repoRoot?: string }} [options]
 * @returns {{severity: string, code: string, ruleId: string, location: string|null,
 *   remediation: string, message: string}}
 */
export function toDiagnostic(error, { repoRoot } = {}) {
  const contract = error instanceof ContractError;
  // An unexpected failure must still refuse with a stable shape; its own text
  // is discarded because nothing here composed it.
  const code = contract && typeof error.code === 'string' ? error.code : 'INPUT_IO';
  const ruleId = contract && typeof error.ruleId === 'string' ? error.ruleId : 'BR2.1';
  const message = contract
    ? sanitizeText(error.message, repoRoot) || 'The package was refused; see the named rule.'
    : 'Package input could not be read safely.';
  return {
    severity: 'error',
    code,
    ruleId,
    location: boundedLocation(contract ? error.location : null, repoRoot),
    remediation: REMEDIATION_BY_CODE[code] ?? REMEDIATION_BY_RULE[ruleId]
      ?? 'Resolve the named rule and retry.',
    message
  };
}
