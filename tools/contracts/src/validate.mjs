import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadPackage, ContractError } from './package-loader.mjs';
import { enforcePackageBudget, inspectContent, inspectReferences, LIMITS } from './preflight.mjs';
import { validateCanonical } from './validators.mjs';

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

export async function validateCandidate(root) {
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
  const validatedCanonical = [];
  for (const entry of loaded.entries.filter(item => item.artifactKind !== 'sidecar')) {
    const result = await validateCanonical(entry, join(root, entry.document), { policy });
    validatedCanonical.push({ document: entry.document, dialect: result.dialect, revisionId: result.revisionId });
  }
  return {
    packageVersion: loaded.manifest.packageVersion,
    sourceRevision: loaded.manifest.sourceRevision,
    manifestDigest: loaded.manifestDigest,
    coveredBoundaries: loaded.boundaryIds,
    validatedCanonical,
    releaseReady: false,
    validationLevel: 'candidate-canonical-validation',
    limitations: ['Only supplied canonical kinds are validated; fixture oracle, compatibility, generation, release scans and provenance have not run.']
  };
}
