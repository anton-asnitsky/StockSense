import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadPackage, ContractError } from './package-loader.mjs';
import { enforcePackageBudget, inspectContent, inspectReferences, LIMITS } from './preflight.mjs';
import { validateCanonical } from './validators.mjs';
import { assertDeclaredPolicy, runFixtureOracle } from './policy.mjs';
import { verifySourceBinding } from './provenance.mjs';

function collectReferences(value, from, references) {
  if (Array.isArray(value)) {
    for (const item of value) collectReferences(item, from, references);
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (key === '$ref' && typeof item === 'string') references.push({ from, to: item });
      else collectReferences(item, from, references);
    }
  }
}

/**
 * @param {string} root package root
 * @param {{ repoRoot?: string }} [options] when the package sits inside its own
 *   repository, its recorded sourceRevision is verified against the real blobs
 */
export async function validateCandidate(root, { repoRoot } = {}) {
  const manifestBytes = await readFile(join(root, 'manifest.json'));
  inspectContent('manifest.json', manifestBytes);
  const loaded = await loadPackage(root, {
    sourceByteLimit: LIMITS.sourceBytes,
    packageByteLimit: LIMITS.packageBytes,
    inspectBytes: (entry, bytes) => inspectContent(entry.document, bytes)
  });
  // This command implements candidate validation only. A syntactically complete
  // release manifest is not evidence of scans, provenance or provider conformance.
  if (loaded.manifest.manifestStatus === 'release') {
    throw new ContractError('RELEASE_EVIDENCE_REQUIRED', 'BR6.7', 'Release verification has not been implemented');
  }
  enforcePackageBudget(loaded);
  const references = [];
  for (const entry of loaded.entries) {
    if (!entry.document.endsWith('.json')) continue;
    const content = await readFile(join(root, entry.document), 'utf8');
    let object;
    try { object = JSON.parse(content); }
    catch { throw new ContractError('SOURCE_PARSE', 'BR2.1', 'A JSON input is malformed'); }
    collectReferences(object, entry.document, references);
  }
  inspectReferences(references);
  const policyEntry = loaded.entries.find(entry => entry.kind === 'contract-package-policy');
  if (!policyEntry) throw new ContractError('POLICY_MISSING', 'BR1.4', 'Contract package policy is required');
  let policy;
  try { policy = JSON.parse(await readFile(join(root, policyEntry.document), 'utf8')); }
  catch { throw new ContractError('POLICY_PARSE', 'BR1.4', 'Contract package policy is malformed'); }
  const declaredPolicy = assertDeclaredPolicy(policy, loaded);
  const validatedCanonical = [];
  for (const entry of loaded.entries.filter(item => item.artifactKind !== 'sidecar')) {
    const result = await validateCanonical(entry, join(root, entry.document), { policy });
    validatedCanonical.push({ document: entry.document, dialect: result.dialect, revisionId: result.revisionId });
  }
  const fixtureResults = await runFixtureOracle(root, loaded);
  // A recorded revision is only a binding if the shipped bytes match its blobs.
  let sourceBinding = 'unverified-no-repository';
  if (repoRoot) {
    // Every canonical document, not just the schemas. BR1.1 requires a
    // source-revision mismatch on any declared artifact to fail, so narrowing
    // this to one kind would leave the others unbound.
    verifySourceBinding(repoRoot, loaded.manifest.sourceRevision, loaded.entries
      .filter(entry => ['openapi', 'asyncapi', 'schema'].includes(entry.artifactKind))
      .map(entry => ({ sourcePath: 'contracts/source/' + entry.document, contentDigest: entry.contentDigest })));
    sourceBinding = 'verified';
  }
  return {
    sourceBinding,
    packageVersion: loaded.manifest.packageVersion,
    sourceRevision: loaded.manifest.sourceRevision,
    manifestDigest: loaded.manifestDigest,
    coveredBoundaries: loaded.boundaryIds,
    candidateScope: declaredPolicy.candidateScope,
    uncoveredBoundaries: declaredPolicy.uncoveredBoundaries,
    validatedCanonical,
    fixtureResults,
    releaseReady: false,
    validationLevel: 'candidate-canonical-and-fixture-validation',
    limitations: ['Compatibility, release scans, SBOM, attestation and provider conformance have not run. Consumer-local generation is verified separately against the generation profile, not by this command.']
  };
}
