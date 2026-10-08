import { ContractError, canonicalJson, digest } from './package-loader.mjs';
import { inspectContent } from './preflight.mjs';

const fail = (code, rule, message) => { throw new ContractError(code, rule, message); };
const object = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const string = value => typeof value === 'string' && value.length > 0;
const identifier = value => string(value) && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value);
const COMMIT = /^[0-9a-f]{40}$/;
const SHA = /^sha256:[0-9a-f]{64}$/;
const protectedLabel = /(?:^|[^A-Za-z0-9])(?:rawSupplierDocument|supplierSourceContent|supplierDocumentBase64|supplierPdfBytes|raw_catalog_text|fullPrompt|systemPromptText|promptTranscript|completePrompt|hiddenReasoning|chainOfThought|privateReasoning|reasoningTrace|client_secret|access_token|api_key)(?:$|[^A-Za-z0-9])/i;
const protectedStem = /(?:rawsupplierdocument|suppliersourcecontent|supplierdocumentbase64|supplierpdfbytes|rawcatalogtext|fullprompt|systemprompttext|prompttranscript|completeprompt|hiddenreasoning|chainofthought|privatereasoning|reasoningtrace|clientsecret|accesstoken|apikey)/i;
const allowed = Object.freeze({
  input: new Set(['revision', 'packageDigest', 'checks', 'gates', 'artifacts', 'limitations']),
  record: new Set(['evidenceVersion', 'revision', 'packageDigest', 'checks', 'gates', 'artifacts', 'limitations', 'releaseReady']),
  check: new Set(['checkId', 'outcome', 'reason', 'expectedResult', 'actualResult', 'startedAt', 'completedAt', 'limitations', 'artifactIds']),
  gate: new Set(['outcome', 'reason', 'expectedResult', 'actualResult', 'startedAt', 'completedAt', 'limitations', 'reportDigest']),
  summary: new Set(['gate', 'outcome']),
  artifact: new Set(['artifactId', 'contentDigest']),
  receipt: new Set(['recordDigest', 'revision', 'packageDigest'])
});
function exactFields(value, fields) {
  if (!object(value) || Object.keys(value).some(key => !allowed[fields].has(key))) {
    fail('EVIDENCE_FIELD', 'BR6.1', 'Evidence contains an undeclared field');
  }
}

/** C19 declares these six outcomes exhaustive. */
export const C19_OUTCOMES = Object.freeze(['passed', 'failed', 'limited', 'rejected', 'unavailable', 'not-run']);
/** Every gate must be represented; an absent scan is reported, never assumed clean. */
export const REQUIRED_GATES = Object.freeze(['secret-scan', 'sbom', 'vulnerability-scan']);

/**
 * C19 keeps reason, expected/actual result, timing and limitations required
 * even for rejected, unavailable and not-run, so a negative outcome still has
 * to say what was missing.
 */
export function assertCheckResult(check) {
  if (!object(check) || !identifier(check.checkId) || !C19_OUTCOMES.includes(check.outcome)) {
    fail('CHECK_OUTCOME', 'BR6.1', 'Each check needs an id and one of the six C19 outcomes');
  }
  for (const field of ['reason', 'expectedResult', 'actualResult', 'startedAt', 'completedAt']) {
    if (!string(check[field])) fail('CHECK_DETAIL', 'BR6.1', `Check detail is missing ${field}`);
  }
  if (!Array.isArray(check.limitations) || check.limitations.some(item => typeof item !== 'string')) {
    fail('EVIDENCE_FIELD', 'BR6.1', 'Check limitations must be text');
  }
  return true;
}

/** A scan gate that did not run is unavailable or not-run, never passed. */
export function assertScanGates(gates) {
  if (!object(gates)) fail('SCAN_GATES', 'BR6.2', 'Scan gates are required');
  for (const name of REQUIRED_GATES) {
    const gate = gates[name];
    if (!object(gate)) fail('SCAN_MISSING', 'BR6.2', `Required gate ${name} is absent`);
    assertCheckResult({ ...gate, checkId: name });
    if (gate.outcome === 'passed' && !SHA.test(String(gate.reportDigest))) {
      fail('SCAN_REPORT_DIGEST', 'BR6.2', `Gate ${name} claims a pass without a report digest`);
    }
  }
  return REQUIRED_GATES.map(name => ({ gate: name, outcome: gates[name].outcome }));
}

/**
 * An exception suspends exactly one finding on one revision until a stated
 * expiry. A blanket or expired exception is not an exception.
 */
export function assertException(exception, now = new Date()) {
  if (!object(exception) || !string(exception.findingCode) || !string(exception.ruleId) ||
      !SHA.test(String(exception.revisionId)) || !string(exception.approvedBy) || !string(exception.reason)) {
    fail('EXCEPTION_SHAPE', 'BR6.3', 'An exception must name one finding, rule, revision, approver and reason');
  }
  const expiry = new Date(exception.expiresAt);
  if (Number.isNaN(expiry.getTime())) fail('EXCEPTION_EXPIRY', 'BR6.3', 'An exception needs a valid expiry');
  if (expiry.getTime() <= now.getTime()) fail('EXCEPTION_EXPIRED', 'BR6.3', 'An expired exception does not suspend a finding');
  return true;
}

/** Findings survive unless a live exception names that exact finding and revision. */
export function applyExceptions(findings, exceptions = [], now = new Date()) {
  if (!Array.isArray(findings)) fail('FINDING_SHAPE', 'BR6.3', 'Findings must be an array');
  for (const exception of exceptions) assertException(exception, now);
  return findings.filter(finding => !exceptions.some(exception =>
    exception.findingCode === finding.findingCode &&
    exception.ruleId === finding.ruleId &&
    exception.revisionId === finding.revisionId));
}

/**
 * Build the revision-bound record and its detached receipt. The receipt digest
 * covers the canonical record bytes, so any later edit breaks it.
 */
export function buildEvidenceRecord(input) {
  assertEvidenceContentSafe(input);
  exactFields(input, 'input');
  const { revision, packageDigest, checks, gates, artifacts = [], limitations = [] } = input;
  if (!string(revision) || !COMMIT.test(revision)) fail('EVIDENCE_REVISION', 'BR6.1', 'Evidence must bind an immutable commit');
  if (!SHA.test(String(packageDigest))) fail('EVIDENCE_PACKAGE_DIGEST', 'BR6.1', 'Evidence must bind the package manifest digest');
  if (!Array.isArray(checks) || !checks.length) fail('EVIDENCE_CHECKS', 'BR6.1', 'Evidence needs at least one check');
  if (!Array.isArray(limitations) || limitations.some(item => typeof item !== 'string')) fail('EVIDENCE_FIELD', 'BR6.1', 'Limitations must be text');
  for (const check of checks) {
    exactFields(check, 'check');
    assertCheckResult(check);
    if (check.artifactIds !== undefined && (!Array.isArray(check.artifactIds) || check.artifactIds.some(id => !string(id)))) {
      fail('EVIDENCE_FIELD', 'BR6.1', 'Check artifact ids must be text');
    }
  }
  if (object(gates)) {
    if (Object.keys(gates).some(name => !REQUIRED_GATES.includes(name))) {
      fail('EVIDENCE_FIELD', 'BR6.1', 'Evidence contains an undeclared scan gate');
    }
    for (const gate of Object.values(gates)) exactFields(gate, 'gate');
  }
  const gateSummary = assertScanGates(gates);
  if (!Array.isArray(artifacts)) fail('EVIDENCE_ARTIFACTS', 'BR6.4', 'Artifacts must be an array');
  const artifactIds = new Set();
  for (const artifact of artifacts) {
    exactFields(artifact, 'artifact');
    if (!object(artifact) || !string(artifact.artifactId) || !SHA.test(String(artifact.contentDigest))) {
      fail('EVIDENCE_ARTIFACTS', 'BR6.4', 'Each artifact needs an id and a SHA-256 digest');
    }
    if (artifactIds.has(artifact.artifactId)) fail('EVIDENCE_ARTIFACTS', 'BR6.4', 'Artifact ids must be unique');
    artifactIds.add(artifact.artifactId);
  }
  // Every digest a check references must resolve to a listed artifact.
  for (const check of checks) {
    for (const id of check.artifactIds ?? []) {
      if (!artifactIds.has(id)) fail('EVIDENCE_ARTIFACT_UNRESOLVED', 'BR6.4', 'Check references an unlisted artifact');
    }
  }
  const record = {
    evidenceVersion: '1.0.0',
    revision,
    packageDigest,
    checks,
    gates: gateSummary,
    artifacts,
    limitations,
    releaseReady: false
  };
  assertEvidenceContentSafe(record);
  const recordDigest = digest(Buffer.from(canonicalJson(record)));
  return { record, receipt: { recordDigest, revision, packageDigest } };
}

/** A receipt verifies only against the exact canonical bytes it was cut from. */
export function verifyReceipt(record, receipt) {
  if (!object(record) || !object(receipt) || !SHA.test(String(receipt.recordDigest))) {
    fail('RECEIPT_SHAPE', 'BR6.5', 'A detached receipt needs a record digest');
  }
  assertEvidenceContentSafe({ record, receipt });
  exactFields(record, 'record');
  exactFields(receipt, 'receipt');
  if (!Array.isArray(record.checks) || !Array.isArray(record.gates) || !Array.isArray(record.artifacts) || !Array.isArray(record.limitations)) {
    fail('EVIDENCE_FIELD', 'BR6.1', 'Evidence record arrays are malformed');
  }
  for (const check of record.checks) { exactFields(check, 'check'); assertCheckResult(check); }
  for (const gate of record.gates) {
    exactFields(gate, 'summary');
    if (!REQUIRED_GATES.includes(gate.gate) || !C19_OUTCOMES.includes(gate.outcome)) {
      fail('EVIDENCE_FIELD', 'BR6.1', 'Evidence gate summary is malformed');
    }
  }
  for (const artifact of record.artifacts) {
    exactFields(artifact, 'artifact');
    if (!string(artifact.artifactId) || !SHA.test(String(artifact.contentDigest))) {
      fail('EVIDENCE_FIELD', 'BR6.1', 'Evidence artifact is malformed');
    }
  }
  if (record.limitations.some(item => typeof item !== 'string')) fail('EVIDENCE_FIELD', 'BR6.1', 'Evidence limitations must be text');
  if (digest(Buffer.from(canonicalJson(record))) !== receipt.recordDigest) {
    fail('RECEIPT_DIGEST_MISMATCH', 'BR6.5', 'The detached receipt does not match the evidence record');
  }
  if (record.revision !== receipt.revision || record.packageDigest !== receipt.packageDigest) {
    fail('RECEIPT_BINDING', 'BR6.5', 'The receipt is bound to a different revision or package');
  }
  return true;
}

/** An attestation must name the exact subject digest and an expected identity. */
export function verifyAttestation(attestation, { subjectDigest, expectedIdentities }) {
  if (!object(attestation) || !SHA.test(String(attestation.subjectDigest)) || !string(attestation.identity)) {
    fail('ATTESTATION_SHAPE', 'BR6.6', 'An attestation needs a subject digest and identity');
  }
  if (!Array.isArray(expectedIdentities) || !expectedIdentities.length) {
    fail('ATTESTATION_POLICY', 'BR6.6', 'Expected attestation identities must be configured');
  }
  if (attestation.subjectDigest !== subjectDigest) {
    fail('ATTESTATION_SUBJECT_MISMATCH', 'BR6.6', 'The attestation subject is not this artifact');
  }
  if (!expectedIdentities.includes(attestation.identity)) {
    fail('ATTESTATION_IDENTITY', 'BR6.6', 'The attestation identity is not trusted');
  }
  return true;
}

/** Published evidence must not leak protected content. */
export function assertEvidenceContentSafe(record) {
  inspectContent('evidence-record', Buffer.from(canonicalJson(record)));
  const pending = [record];
  const seen = new Set();
  while (pending.length) {
    const value = pending.pop();
    if (typeof value === 'string' && (protectedLabel.test(value) || protectedStem.test(value.replace(/[^a-z0-9]/gi, '')))) {
      fail('PROTECTED_CONTENT', 'NFR6.1', 'Protected content is prohibited in evidence');
    }
    if (!value || typeof value !== 'object' || seen.has(value)) continue;
    seen.add(value);
    for (const [key, child] of Object.entries(value)) {
      if (protectedLabel.test(key) || protectedStem.test(key.replace(/[^a-z0-9]/gi, ''))) {
        fail('PROTECTED_CONTENT', 'NFR6.1', 'Protected field is prohibited in evidence');
      }
      pending.push(child);
    }
  }
  return true;
}

/**
 * U1 owns the policy a public pull-request workflow must satisfy. U2 enforces
 * it from a protected base workflow; this check alone credits nothing.
 */
/**
 * @param {any} workflow a parsed workflow document
 * @param {{ changedPaths?: string[] }} [options] the pull request's changed
 *   paths, supplied by the caller rather than read from the workflow, so a
 *   pull request cannot describe itself as touching nothing
 */
export function assertCiPolicy(workflow, { changedPaths = [] } = {}) {
  if (!object(workflow) || !object(workflow.jobs)) fail('CI_POLICY_SHAPE', 'BR6.7', 'Workflow needs a jobs map');
  const triggers = Array.isArray(workflow.on) ? workflow.on : Object.keys(workflow.on ?? {});
  const untrusted = triggers.includes('pull_request_target') || triggers.includes('pull_request');
  if (triggers.includes('pull_request_target')) {
    fail('CI_UNTRUSTED_TRIGGER', 'BR6.7', 'pull_request_target runs untrusted code with repository secrets');
  }
  for (const [name, job] of Object.entries(workflow.jobs)) {
    if (!object(job)) fail('CI_POLICY_SHAPE', 'BR6.7', `Job ${name} is malformed`);
    const runsOn = [].concat(job['runs-on'] ?? []);
    if (untrusted && runsOn.some(label => String(label).includes('self-hosted'))) {
      fail('CI_UNTRUSTED_RUNNER', 'BR6.7', `Job ${name} runs untrusted changes on a self-hosted runner`);
    }
    const permissions = job.permissions ?? workflow.permissions;
    if (untrusted) {
      if (!object(permissions)) fail('CI_PERMISSIONS_UNSET', 'BR6.7', `Job ${name} does not pin read-only permissions`);
      for (const [scope, level] of Object.entries(permissions)) {
        if (level !== 'read' && level !== 'none') fail('CI_EXCESSIVE_PERMISSIONS', 'BR6.7', `Job ${name} grants ${scope}: ${level}`);
      }
    }
    for (const step of job.steps ?? []) {
      if (object(step) && string(step.uses) && !/@[0-9a-f]{40}$/.test(step.uses)) {
        fail('CI_UNPINNED_ACTION', 'BR6.7', `Job ${name} uses an action that is not pinned to a commit`);
      }
    }
  }
  // A pull request editing the policy cannot be the run that credits it.
  if (changedPaths.some(path => path.startsWith('.github/workflows/'))) {
    fail('CI_WORKFLOW_CHANGE', 'BR6.7', 'A pull request changing workflow configuration needs the protected base workflow to decide');
  }
  return true;
}
