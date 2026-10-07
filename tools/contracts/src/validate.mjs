import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative } from 'node:path';
import { loadPackage, ContractError, digest } from './package-loader.mjs';
import { enforcePackageBudget, inspectContent, LIMITS } from './preflight.mjs';
import { validateCanonical } from './validators.mjs';
import { assertDeclaredPolicy } from './policy.mjs';
import { verifySourceBinding } from './provenance.mjs';
import { preflightCanonicalReferences } from './reference-preflight.mjs';
import { runContainerStandardsValidator } from './container-standards-runner.mjs';
import YAML from 'yaml';

export function materializeOfflineReferences(bytes, document, references) {
  const replacements = new Map(references.filter(item => item.sourceDocument === document)
    .map(item => [item.referenceValue, item.localReference]));
  if (!replacements.size) return bytes;
  const source = bytes.toString('utf8');
  const tree = document.endsWith('.json') ? JSON.parse(source) : YAML.parse(source, { strict: true, uniqueKeys: true });
  let replaced = 0;
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      if (['$ref', '$dynamicRef', '$recursiveRef'].includes(key) && replacements.has(value)) {
        node[key] = replacements.get(value);
        replaced++;
      } else walk(value);
    }
  }
  walk(tree);
  if (replaced !== references.filter(item => item.sourceDocument === document).length) {
    throw new ContractError('REFERENCE_TARGET_MISMATCH', 'NFR6.2', 'Verified offline reference count changed before materialization');
  }
  return Buffer.from(document.endsWith('.json') ? JSON.stringify(tree) : YAML.stringify(tree));
}

/** Register only schema bytes copied into the immutable validation snapshot. */
export async function readOfflineSchemaRegistry(graphRoot, entries, snapshotDigests) {
  const schemas = new Map();
  for (const entry of entries.filter(item => item.artifactKind === 'schema')) {
    const bytes = await readFile(join(graphRoot, entry.document));
    if (digest(bytes) !== snapshotDigests.get(entry.document)) {
      throw new ContractError('DIGEST_MISMATCH', 'BR1.1', 'Offline schema changed in the validation graph');
    }
    let parsed;
    try {
      parsed = entry.document.endsWith('.json') ? JSON.parse(bytes.toString('utf8')) :
        YAML.parse(bytes.toString('utf8'), { strict: true, uniqueKeys: true });
    } catch {
      throw new ContractError('SOURCE_PARSE', 'BR1.3', 'Offline schema in the validation graph is malformed');
    }
    if (parsed?.$schema === 'https://json-schema.org/draft/2020-12/schema' && parsed.$id) {
      if (schemas.has(parsed.$id)) {
        throw new ContractError('REFERENCE_ID_CONFLICT', 'NFR6.2', 'Two graph schemas claim one identity');
      }
      schemas.set(parsed.$id, parsed);
    }
  }
  return schemas;
}

// A generation profile records the source revision inside its own bytes, so
// binding it to that revision has no fixpoint: stamping changes the bytes,
// which changes the commit, which changes the stamp. It stays stamped-but-
// unbound, and the result says so rather than implying it was verified.
const REVISION_BEARING_SIDECARS = Object.freeze(['generation-profile']);

/**
 * Bind a package's governed sidecars to the exact repository blobs it ships.
 *
 * Returns null when the package under validation does not live inside the
 * declared repository - a temporary copy, for instance. That is not a
 * provenance violation and must not be reported as one. Throwing here
 * pre-empted every genuine verdict, the canonical-document tamper check
 * included, because the throw happened while the binding list was still being
 * built; the caller now reports the unbound state instead of claiming a
 * verification it did not perform.
 */
export function governedSidecarSourceBindings(repoRoot, packageRoot, entries) {
  const packagePath = relative(repoRoot, packageRoot).replaceAll('\\', '/');
  if (!packagePath || packagePath === '..' || packagePath.startsWith('../') ||
      isAbsolute(packagePath)) {
    return null;
  }
  return entries
    .filter(entry => entry.artifactKind === 'sidecar' && !REVISION_BEARING_SIDECARS.includes(entry.kind))
    .map(entry => ({ sourcePath: `${packagePath}/${entry.document}`, contentDigest: entry.contentDigest }));
}

/**
 * @param {string} root package root
 * @param {{ repoRoot?: string, standardsImage?: string }} [options] when the package sits inside its own
 *   repository, its recorded sourceRevision is verified against the real blobs
 */
export async function validateCandidate(root, { repoRoot, standardsImage } = {}) {
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
  /** @type {Array<{sourceDocument:string, referenceValue:string, localReference:string}>} */
  const offlineReferences = [];
  await preflightCanonicalReferences(root, loaded.entries, { offlineReferences });
  const policyEntry = loaded.entries.find(entry => entry.kind === 'contract-package-policy');
  if (!policyEntry) throw new ContractError('POLICY_MISSING', 'BR1.4', 'Contract package policy is required');
  let policy;
  try { policy = JSON.parse(await readFile(join(root, policyEntry.document), 'utf8')); }
  catch { throw new ContractError('POLICY_PARSE', 'BR1.4', 'Contract package policy is malformed'); }
  const declaredPolicy = assertDeclaredPolicy(policy, loaded);
  const fixtureEntry = loaded.entries.find(item => item.kind === 'example-fixture');
  if (!fixtureEntry) throw new ContractError('FIXTURES_MISSING', 'BR2.7', 'A candidate package requires example fixtures');
  // Provenance before the standards containers, not after. A document whose
  // bytes drifted from the recorded commit should be rejected for that, and
  // the fixture oracle would otherwise speak first: a fixture binds its target
  // by a revision derived from the document digest, so tampering a canonical
  // document breaks the binding and the run ends on a validator code that says
  // nothing about provenance. Proving the bytes first also means no container
  // ever runs over bytes this package has not yet shown it is entitled to ship.
  let sourceBinding = 'unverified-no-repository';
  if (repoRoot) {
    // Every canonical document, not just the schemas. BR1.1 requires a
    // source-revision mismatch on any declared artifact to fail, so narrowing
    // this to one kind would leave the others unbound. These are verified
    // first, so a drifted canonical document reports its own provenance
    // verdict and is never pre-empted by a sidecar path question.
    verifySourceBinding(repoRoot, loaded.manifest.sourceRevision, loaded.entries
      .filter(entry => ['openapi', 'asyncapi', 'schema'].includes(entry.artifactKind))
      .map(entry => ({ sourcePath: 'contracts/source/' + entry.document, contentDigest: entry.contentDigest })));
    const sidecarBindings = governedSidecarSourceBindings(repoRoot, root, loaded.entries);
    if (sidecarBindings === null) sourceBinding = 'verified-canonical-package-outside-repository';
    else {
      verifySourceBinding(repoRoot, loaded.manifest.sourceRevision, sidecarBindings);
      sourceBinding = 'verified';
    }
  }
  const validatedCanonical = [];
  let fixtureResults;
  const graphRoot = await mkdtemp(join(tmpdir(), 'stocksense-verified-graph-'));
  try {
    const snapshotDigests = new Map();
    for (const entry of loaded.entries) {
      const bytes = await readFile(join(root, entry.document));
      if (digest(bytes) !== entry.contentDigest) {
        throw new ContractError('DIGEST_MISMATCH', 'BR1.1', 'Canonical source changed after preflight');
      }
      const target = join(graphRoot, entry.document);
      await mkdir(dirname(target), { recursive: true });
      const snapshot = materializeOfflineReferences(bytes, entry.document, offlineReferences);
      await writeFile(target, snapshot);
      snapshotDigests.set(entry.document, digest(snapshot));
    }
    await readOfflineSchemaRegistry(graphRoot, loaded.entries, snapshotDigests);
    const files = loaded.entries.map(entry =>
      ({ document: entry.document, digest: snapshotDigests.get(entry.document), artifactKind: entry.artifactKind }));
    for (const entry of loaded.entries.filter(item => item.artifactKind !== 'sidecar')) {
      const result = await validateCanonical(entry, join(graphRoot, entry.document),
        { policy,
          runTool: dialect => runContainerStandardsValidator(dialect, entry.document,
            { graphRoot, files, image: standardsImage }) });
      validatedCanonical.push({ document: entry.document, dialect: result.dialect, revisionId: result.revisionId });
    }
    const snapshotEntries = loaded.entries.map(entry =>
      ({ ...entry, contentDigest: snapshotDigests.get(entry.document) }));
    const fixtureRun = await runContainerStandardsValidator('fixture-oracle:2020-12', fixtureEntry.document,
      { graphRoot, files, image: standardsImage, entries: snapshotEntries });
    fixtureResults = fixtureRun.fixtureResults;
  } finally {
    await rm(graphRoot, { recursive: true, force: true });
  }
  // A recorded revision is only a binding if the shipped bytes match its blobs.
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
    limitations: [
      'Compatibility, release scans, SBOM, attestation and provider conformance have not run. Consumer-local generation is verified separately against the generation profile, not by this command.',
      'AsyncAPI documents and the closed non-payload schema dialects carry no payload fixtures: the fixture oracle has no extractor for them, so such a document is validated as a document only and its payloads are unexercised. A boundary whose canonical documents are all of those kinds therefore carries no fixture evidence at all, and this result does not name which boundaries those are.',
      'A generation-profile sidecar records the source revision in its own bytes, so it is stamped but not blob-bound to that revision.'
    ]
  };
}
