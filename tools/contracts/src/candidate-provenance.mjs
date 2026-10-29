import { spawnSync } from 'node:child_process';
import { lstat, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContractError, ALL_BOUNDARIES, canonicalJson, digest } from './package-loader.mjs';
import { verifyPackageBundle, MAX_ARTIFACT_BYTES } from './package-bundle.mjs';
import { assertGenerationProfile, regenerateConsumer } from './generation.mjs';
import { createBoundedGeneratorRunner } from './bounded-generators.mjs';
import { createPinnedGeneratorRunner, DOTNET_HOST, GENERATORS, generatorConfigurationDigest } from './generators.mjs';
import { buildSbom } from './sbom.mjs';
import { readImageEvidence, IMAGE_NAMES } from './image-evidence.mjs';
import { candidateTreeDigestFromGit, executionFingerprintFromGit,
  fetchImageLedger, readKiotaRuntimeEvidence, verifyBoundImageEvidence } from './image-ledger.mjs';
import { verifySecurityReports } from './ci-policy.mjs';
import { assertEvidenceContentSafe } from './evidence.mjs';
import { toDiagnostic } from './diagnostics.mjs';
import { sourceTreeDigest } from './source-digest.mjs';
import { LIMITS } from './preflight.mjs';
import { validateCandidate } from './validate.mjs';

const SHA = /^sha256:[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const REPOSITORY = 'anton-asnitsky/StockSense';
const WORKFLOW = `${REPOSITORY}/.github/workflows/release-evidence.yml`;
const REF = 'refs/heads/main';
const PROFILE = 'governance/generation-profile.json';
const EXPECTED = Object.freeze({
  'web-application': ['openapi-typescript', 'web-bff/v1/browser-api.openapi.yaml'],
  'dotnet-operations-client': ['kiota', 'web-bff/v1/browser-api.openapi.yaml'],
  'messaging-typescript': ['modelina', 'messaging-platform/v1/transport-conformance.asyncapi.yaml']
});
const fail = (code, rule, message) => { throw new ContractError(code, rule, message); };
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const exact = (value, fields) => object(value) && Object.keys(value).length === fields.length &&
  fields.every(field => Object.hasOwn(value, field));

function run(file, args, cwd, code) {
  const result = spawnSync(file, args, { cwd, encoding: 'utf8', shell: false,
    windowsHide: true, timeout: 120_000, maxBuffer: 4 * 1024 * 1024 });
  if (result.error || result.status !== 0) fail(code, 'BR6.6', 'Required immutable provenance is unavailable');
  return result.stdout.trim();
}

async function boundedFile(path, limit) {
  const info = await stat(path).catch(() => {
    throw new ContractError('CANDIDATE_EVIDENCE_MISSING', 'BR6.5', 'Required evidence file is missing');
  });
  if (!info.isFile() || info.size > limit) fail('CANDIDATE_EVIDENCE_LIMIT', 'NFR10.1', 'Evidence file exceeds its bound');
  const bytes = await readFile(path);
  if (bytes.length !== info.size) fail('CANDIDATE_EVIDENCE_CHANGED', 'BR6.5', 'Evidence file changed while being read');
  return bytes;
}

/** Resolve committed bytes, never a possibly dirty working-tree source. */
function gitBlob(root, revision, path) {
  if (!COMMIT.test(revision) || !/^[A-Za-z0-9._/-]+$/.test(path) || path.includes('..')) {
    fail('CANDIDATE_SOURCE', 'BR3.1', 'Source revision or path is invalid');
  }
  const entry = run('git', ['ls-tree', revision, '--', path], root, 'CANDIDATE_SOURCE');
  if (!entry.startsWith('100644 blob ') || !entry.endsWith(`\t${path}`)) {
    fail('CANDIDATE_SOURCE', 'BR3.1', 'Canonical input is not a committed regular file');
  }
  const result = spawnSync('git', ['show', `${revision}:${path}`], { cwd: root, shell: false,
    windowsHide: true, timeout: 10_000, maxBuffer: 2 * 1024 * 1024 });
  if (result.error || result.status !== 0 || !Buffer.isBuffer(result.stdout)) {
    fail('CANDIDATE_SOURCE', 'BR3.1', 'Committed source blob is unavailable');
  }
  return result.stdout;
}

/** GitHub CLI checks the signature, certificate, repository, workflow, commit and ref. */
export async function verifyHostedSubject(path, candidateRevision, expectedDigest) {
  if (!COMMIT.test(candidateRevision) || !SHA.test(expectedDigest)) {
    fail('ATTESTATION_POLICY', 'BR6.6', 'Candidate subject policy is incomplete');
  }
  const original = await boundedFile(path, 64 * 1024 * 1024);
  if (digest(original) !== expectedDigest) {
    fail('ATTESTATION_SUBJECT_MISMATCH', 'BR6.6', 'Subject bytes changed before attestation verification');
  }
  const directory = await mkdtemp(join(tmpdir(), 'stocksense-candidate-subject-'));
  const snapshot = join(directory, basename(path));
  try {
    await writeFile(snapshot, original, { flag: 'wx', mode: 0o600 });
    const output = run('gh', ['attestation', 'verify', snapshot, '--repo', REPOSITORY,
      '--signer-workflow', WORKFLOW, '--source-digest', candidateRevision, '--source-ref', REF,
      '--deny-self-hosted-runners', '--format', 'json'], undefined, 'ATTESTATION_UNVERIFIED');
    let result;
    try { result = JSON.parse(output); } catch { fail('ATTESTATION_UNVERIFIED', 'BR6.6', 'Attestation result is malformed'); }
    if (!Array.isArray(result) || !result.some(row =>
      row?.verificationResult?.statement?.subject?.some(subject =>
        subject?.name === basename(path) && `sha256:${subject?.digest?.sha256}` === expectedDigest)) ||
        digest(await boundedFile(snapshot, 64 * 1024 * 1024)) !== expectedDigest) {
      fail('ATTESTATION_SUBJECT_MISMATCH', 'BR6.6', 'Verified attestation lacks the exact subject');
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
  return { identity: WORKFLOW, sourceCommit: candidateRevision, sourceRef: REF, subjectDigest: expectedDigest };
}

export function assertCandidateGenerationProfile(profile) {
  assertGenerationProfile(profile);
  const consumers = profile.consumers;
  if (consumers.length !== 3 || new Set(consumers.map(row => row.consumerId)).size !== 3 ||
      consumers.reduce((n, row) => n + Object.keys(row.expectedOutputs).length, 0) !== 107 ||
      consumers.some(row => !EXPECTED[row.consumerId] ||
        row.generator !== EXPECTED[row.consumerId][0] || row.sourceDocument !== EXPECTED[row.consumerId][1] ||
        row.generatorVersion !== GENERATORS[row.generator]?.version ||
        row.configurationDigest !== generatorConfigurationDigest(row.generator, GENERATORS[row.generator].outputPath))) {
    fail('CANDIDATE_CONSUMERS', 'BR3.1', 'Candidate must declare the three pinned consumers and 107 output hashes');
  }
  return profile;
}

function checkProfile(bundle) {
  const bytes = bundle.files.get(PROFILE);
  if (!bytes) fail('CANDIDATE_PROFILE', 'BR3.1', 'Candidate generation profile is missing');
  let profile;
  try { profile = JSON.parse(bytes.toString('utf8')); } catch {
    fail('CANDIDATE_PROFILE', 'BR3.1', 'Candidate generation profile is malformed');
  }
  assertCandidateGenerationProfile(profile);
  return { profile, digest: digest(bytes) };
}

function checkBundle(bytes) {
  const bundle = verifyPackageBundle(bytes);
  let manifest;
  try { manifest = JSON.parse(bundle.files.get('manifest.json').toString('utf8')); } catch {
    fail('CANDIDATE_MANIFEST', 'BR1.1', 'Candidate manifest is malformed');
  }
  if (!COMMIT.test(manifest.sourceRevision) ||
      canonicalJson(manifest.boundaryCoverage?.map(row => row.boundaryId)) !== canonicalJson(ALL_BOUNDARIES) ||
      manifest.openapi.length + manifest.asyncapi.length + manifest.schemas.length !== 40) {
    fail('CANDIDATE_SCOPE', 'BR1.1', 'Candidate lacks complete C01-C27 source coverage');
  }
  const generation = checkProfile(bundle);
  if (generation.profile.sourceRevision !== manifest.sourceRevision) {
    fail('CANDIDATE_SOURCE', 'BR3.1', 'Generation profile binds a different source revision');
  }
  return { bundle, manifest, generation };
}

function checkSourceBindings(root, parsed, candidateRevision) {
  const sourceDigests = {};
  for (const row of [...parsed.manifest.openapi, ...parsed.manifest.asyncapi, ...parsed.manifest.schemas]) {
    const path = row.document;
    const bytes = parsed.bundle.files.get(path);
    if (!bytes || !bytes.equals(gitBlob(root, parsed.manifest.sourceRevision, `contracts/source/${path}`)) ||
        !bytes.equals(gitBlob(root, candidateRevision, `contracts/source/${path}`))) {
      fail('CANDIDATE_SOURCE', 'BR3.1', 'Canonical source differs from the committed Git blob');
    }
    sourceDigests[path] = digest(bytes);
  }
  if (Object.keys(sourceDigests).length !== 40) {
    fail('CANDIDATE_SOURCE', 'BR3.1', 'Canonical source inventory is incomplete or duplicated');
  }
  return sourceDigests;
}

/** Validate the exact authenticated bundle bytes, not a mutable package directory. */
export async function validateBundledCandidate(bundle, repoRoot, standardsImage,
  validate = validateCandidate) {
  const packageRoot = await mkdtemp(join(tmpdir(), 'stocksense-candidate-validation-'));
  try {
    for (const [path, bytes] of bundle.files) {
      const destination = join(packageRoot, path);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, bytes, { flag: 'wx', mode: 0o600 });
    }
    const result = await validate(packageRoot, { repoRoot, standardsImage });
    if (result?.manifestDigest !== bundle.manifestDigest ||
        result?.validationLevel !== 'candidate-canonical-and-fixture-validation' ||
        result?.sourceBinding !== 'verified-canonical-package-outside-repository' ||
        result?.releaseReady !== false || result?.uncoveredBoundaries?.length !== 0 ||
        result?.coveredBoundaries?.length !== ALL_BOUNDARIES.length ||
        result?.validatedCanonical?.length !== 40 || !Array.isArray(result?.fixtureResults) ||
        result.fixtureResults.length === 0) {
      fail('CANDIDATE_VALIDATION', 'BR6.5', 'Bundled candidate validation is incomplete or mismatched');
    }
    return { resultDigest: digest(Buffer.from(canonicalJson(result))),
      manifestDigest: result.manifestDigest, validationLevel: result.validationLevel,
      canonicalDocuments: result.validatedCanonical.length,
      fixtureCases: result.fixtureResults.length, coveredBoundaries: result.coveredBoundaries.length };
  } finally { await rm(packageRoot, { recursive: true, force: true }); }
}

/** The pinned runner reads canonical files from a disposable checkout at the candidate commit. */
/** @param {{ validatorImageId: string, kiotaImageId: string } | null} [images] */
export async function regenerateFromCleanCheckout(root, revision, consumers, images = null) {
  if (!COMMIT.test(revision)) fail('CANDIDATE_REVISION', 'BR6.5', 'Candidate commit is invalid');
  const parent = await mkdtemp(join(tmpdir(), 'stocksense-clean-consumer-'));
  const checkout = join(parent, 'checkout');
  try {
    // A Git archive is an immutable, clean checkout of exactly this commit.
    // It needs no writable .git directory and cannot inherit uncommitted files.
    const archive = join(parent, 'checkout.tar');
    const sourcePaths = [...new Set(consumers.map(row => `contracts/source/${row.sourceDocument}`))];
    const inputs = ['.config/dotnet-tools.json', ...sourcePaths];
    for (const path of inputs) gitBlob(root, revision, path);
    const sourceTree = spawnSync('git', ['ls-tree', '-r', '-z', revision, '--', 'contracts/source'],
      { cwd: root, shell: false, windowsHide: true, timeout: 10_000, maxBuffer: 1024 * 1024 });
    const entries = sourceTree.stdout?.toString('utf8').split('\0');
    if (sourceTree.error || sourceTree.status !== 0 || !entries || entries.at(-1) !== '' ||
        entries.length !== 41 || entries.slice(0, -1).some(entry =>
          !/^100644 blob [0-9a-f]{40}\tcontracts\/source\/[A-Za-z0-9._/-]+$/.test(entry))) {
      fail('CLEAN_CHECKOUT', 'BR3.3', 'Committed source archive contains an unsafe or incomplete entry');
    }
    run('git', ['archive', '--format=tar', `--output=${archive}`, revision,
      '.config/dotnet-tools.json', 'contracts/source'], root, 'CLEAN_CHECKOUT');
    if ((await stat(archive)).size > 48 * 1024 * 1024) {
      fail('CLEAN_CHECKOUT', 'NFR10.1', 'Committed source archive exceeds its byte bound');
    }
    await mkdir(checkout);
    run('tar', ['-xf', archive, '-C', checkout], undefined, 'CLEAN_CHECKOUT');
    for (const path of inputs) {
      if (!(await lstat(join(checkout, path))).isFile()) {
        fail('CLEAN_CHECKOUT', 'BR3.3', 'Archived generator input is not a regular file');
      }
    }
    // Windows tar can mark extracted files as downloaded. The .NET tool host
    // refuses such a manifest, so replace it with the verified Git blob bytes.
    const toolManifest = join(checkout, '.config/dotnet-tools.json');
    await rm(toolManifest);
    await writeFile(toolManifest, gitBlob(root, revision, '.config/dotnet-tools.json'));
    const runner = images ? createBoundedGeneratorRunner(checkout, {
      standardsImage: images.validatorImageId, kiotaImage: images.kiotaImageId
    }) : createPinnedGeneratorRunner(checkout);
    const localManifest = join(root, '.config/dotnet-tools.json');
    if (process.platform === 'win32' &&
        (await readFile(localManifest)).toString('utf8').replace(/\r\n/g, '\n') !==
          gitBlob(root, revision, '.config/dotnet-tools.json').toString('utf8')) {
      fail('CLEAN_CHECKOUT', 'BR3.3', 'Local .NET tool manifest differs from the candidate commit');
    }
    const results = [];
    for (const consumer of consumers) {
      // Windows may attach Mark-of-the-Web to tar extraction. Kiota refuses
      // that manifest even when its bytes are valid; invoke the same pinned
      // args from the verified local manifest while reading archived sources.
      const runGenerator = !images && process.platform === 'win32' && consumer.generator === 'kiota'
        ? (_consumer, workspace) => {
          const target = join(workspace, GENERATORS.kiota.outputPath);
          const source = join(checkout, 'contracts/source', consumer.sourceDocument);
          const result = spawnSync(DOTNET_HOST, GENERATORS.kiota.args(source, target), {
            cwd: root, encoding: 'utf8', shell: false, windowsHide: true,
            timeout: LIMITS.generatorMs, maxBuffer: 1024 * 1024,
            env: { ...process.env, NO_UPDATE_NOTIFIER: '1', DOTNET_CLI_TELEMETRY_OPTOUT: '1' }
          });
          if (result.error || result.status !== 0) {
            fail('GENERATION_FAILED', 'BR3.1', 'Pinned Kiota generation failed');
          }
        } : runner;
      results.push(await regenerateConsumer(consumer, { runGenerator: /** @type {any} */ (runGenerator) }));
    }
    return results;
  } finally { await rm(parent, { recursive: true, force: true }); }
}

export function assertCandidateRecord(record) {
  if (!exact(record, ['schema', 'candidateRevision', 'sourceRevision', 'manifestDigest', 'bundleDigest',
    'profileDigest', 'sourceDigests', 'validation', 'consumers', 'sbomDigest', 'images', 'ledger', 'scans',
    'attestations', 'releaseReady']) || record.schema !== 'stocksense-candidate-evidence-v1' ||
      record.releaseReady !== false || !COMMIT.test(record.candidateRevision) ||
      !COMMIT.test(record.sourceRevision) || ![record.manifestDigest, record.bundleDigest,
        record.profileDigest, record.sbomDigest].every(value => SHA.test(value))) {
    fail('CANDIDATE_RECORD', 'BR6.5', 'Candidate record is incomplete or claims release readiness');
  }
  if (!object(record.sourceDigests) || Object.keys(record.sourceDigests).length !== 40 ||
      Object.values(record.sourceDigests).some(value => !SHA.test(value)) ||
      !exact(record.validation, ['resultDigest', 'manifestDigest', 'validationLevel',
        'canonicalDocuments', 'fixtureCases', 'coveredBoundaries']) ||
      !SHA.test(record.validation.resultDigest) ||
      record.validation.manifestDigest !== record.manifestDigest ||
      record.validation.validationLevel !== 'candidate-canonical-and-fixture-validation' ||
      record.validation.canonicalDocuments !== 40 ||
      !Number.isSafeInteger(record.validation.fixtureCases) ||
      record.validation.fixtureCases < 1 || record.validation.fixtureCases > 1024 ||
      record.validation.coveredBoundaries !== ALL_BOUNDARIES.length ||
      !Array.isArray(record.consumers) || record.consumers.length !== 3 ||
      record.consumers.reduce((n, row) => n + Object.keys(row?.outputs ?? {}).length, 0) !== 107 ||
      !Array.isArray(record.images) || record.images.length !== 2 ||
      record.images.some((row, index) => row?.name !== IMAGE_NAMES[index] ||
        ![row.imageId, row.sbomDigest, row.scanDigest].every(value => SHA.test(value))) ||
      !exact(record.ledger, ['digest', 'mainSha', 'ledgerBlobSha', 'candidateTreeDigest', 'sourceDigest']) ||
      ![record.ledger.digest, record.ledger.candidateTreeDigest, record.ledger.sourceDigest].every(value => SHA.test(value)) ||
      !COMMIT.test(record.ledger.mainSha) || !COMMIT.test(record.ledger.ledgerBlobSha) ||
      !object(record.scans) || !['secret-scan', 'vulnerability-scan'].every(kind =>
        exact(record.scans[kind], ['digest', 'findings', 'disposed']) && SHA.test(record.scans[kind].digest)) ||
      !object(record.attestations) || !exact(record.attestations, ['bundle', 'sbom', 'scans']) ||
      !exact(record.attestations.scans, ['secret-scan', 'vulnerability-scan']) ||
      !['bundle', 'sbom', 'secret-scan', 'vulnerability-scan'].every(kind => {
        const row = kind === 'bundle' || kind === 'sbom'
          ? record.attestations[kind] : record.attestations.scans[kind];
        return exact(row, ['identity', 'sourceCommit', 'sourceRef', 'subjectDigest']) &&
          row.identity === WORKFLOW && row.sourceCommit === record.candidateRevision &&
          row.sourceRef === REF && row.subjectDigest === (kind === 'bundle' ? record.bundleDigest
            : kind === 'sbom' ? record.sbomDigest : record.scans[kind].digest);
      })) {
    fail('CANDIDATE_RECORD', 'BR6.5', 'Candidate record has missing or mismatched evidence');
  }
  assertEvidenceContentSafe(record);
  return record;
}

/** Bind the retained protected-main receipt to current source, tree and scans. */
export function assertLedgerBinding(receipt, { candidateRevision, treeSha, treeDigest, sourceDigest,
  images, executionFingerprint = /** @type {string|null} */ (null),
  runtimeManifestDigest = /** @type {string|null} */ (null) }) {
  const v2 = receipt?.schema === 'stocksense-image-ledger-verification-v2';
  const fields = ['schema', 'candidateRevision', 'candidateGitTreeSha',
    'candidateTreeDigest', 'sourceDigest', 'mainSha', 'ledgerBlobSha', 'images',
    ...(v2 ? ['executionFingerprint', 'runtimeManifestDigest', 'ledgerSchema'] : [])];
  if (!exact(receipt, fields) ||
      !['stocksense-image-ledger-verification-v1',
        'stocksense-image-ledger-verification-v2'].includes(receipt.schema) ||
      v2 && (receipt.ledgerSchema !== 'stocksense-image-exceptions-v2' ||
        receipt.executionFingerprint !== executionFingerprint ||
        receipt.runtimeManifestDigest !== runtimeManifestDigest ||
        !SHA.test(receipt.executionFingerprint) || !SHA.test(receipt.runtimeManifestDigest)) ||
      receipt.candidateRevision !== candidateRevision || receipt.candidateGitTreeSha !== treeSha ||
      receipt.candidateTreeDigest !== treeDigest || receipt.sourceDigest !== sourceDigest ||
      !COMMIT.test(receipt.mainSha) || !COMMIT.test(receipt.ledgerBlobSha) ||
      !Array.isArray(receipt.images) || receipt.images.length !== IMAGE_NAMES.length ||
      receipt.images.some((row, index) => {
        const observed = images[index];
        return !exact(row, ['image', 'imageId', 'sbomDigest', 'scanDigest', 'findings', 'disposed']) ||
          row.image !== IMAGE_NAMES[index] || observed?.name !== row.image ||
          row.imageId !== observed.imageId || row.sbomDigest !== observed.sbomDigest ||
          row.scanDigest !== observed.scanDigest || row.findings !== observed.findings ||
          !Number.isSafeInteger(row.findings) || row.findings < 0 || row.disposed !== row.findings;
      })) {
    fail('IMAGE_LEDGER', 'BR6.5', 'Protected-main receipt is stale or disagrees with image evidence');
  }
  return true;
}

/** Build the record from exact artifact bytes; external proof is verified before credit. */
export async function buildCandidateEvidence({ repoRoot, bundlePath, sbomPath, imageDirectory,
  securityDirectory, candidateRevision, validatorImageId, kiotaImageId,
  verifySubject = verifyHostedSubject, regenerate = regenerateFromCleanCheckout,
  fetchLedger = fetchImageLedger, verifyImages = verifyBoundImageEvidence }) {
  if (!COMMIT.test(candidateRevision)) fail('CANDIDATE_REVISION', 'BR6.5', 'Candidate commit is invalid');
  const bundleBytes = await boundedFile(bundlePath, MAX_ARTIFACT_BYTES);
  const parsed = checkBundle(bundleBytes);
  const sourceDigests = checkSourceBindings(repoRoot, parsed, candidateRevision);
  const head = run('git', ['rev-parse', 'HEAD'], repoRoot, 'CANDIDATE_REVISION');
  if (head !== candidateRevision) fail('CANDIDATE_REVISION', 'BR6.5', 'Candidate revision differs from checkout');
  const validation = await validateBundledCandidate(parsed.bundle, repoRoot, validatorImageId);
  const consumers = await regenerate(repoRoot, candidateRevision, parsed.generation.profile.consumers,
    { validatorImageId, kiotaImageId });
  if (canonicalJson(consumers) !== canonicalJson(parsed.generation.profile.consumers.map(row => ({
    consumerId: row.consumerId, generator: row.generator, generatorVersion: row.generatorVersion,
    sourceDocument: row.sourceDocument, configurationDigest: row.configurationDigest,
    outputs: row.expectedOutputs
  })))) fail('GENERATION_DRIFT', 'BR3.3', 'Clean consumer result differs from the declared profile');

  const imageIds = { validator: validatorImageId, kiota: kiotaImageId };
  for (const name of IMAGE_NAMES) {
    await boundedFile(join(imageDirectory, `${name}.cdx.json`), 64 * 1024 * 1024);
    await boundedFile(join(imageDirectory, `${name}.scan.json`), 16 * 1024 * 1024);
  }
  for (const name of ['secret-scan', 'vulnerability-scan']) {
    await boundedFile(join(securityDirectory, `${name}.json`), 16 * 1024 * 1024);
  }
  await boundedFile(join(imageDirectory, 'ledger-verification.json'), 1024 * 1024);
  const image = await readImageEvidence(imageDirectory, imageIds, { requireClean: false });
  const sbom = await buildSbom(join(repoRoot, 'tools/contracts/pnpm-lock.yaml'), {
    name: '@stocksense/contracts-governance', version: '0.1.0', generator: 'stocksense-contracts-sbom',
    validatorImageDigest: validatorImageId, kiotaImageDigest: kiotaImageId,
    imageEvidenceDirectory: imageDirectory, candidateRevision
  });
  const sbomBytes = await boundedFile(sbomPath, 64 * 1024 * 1024);
  if (!sbom.bytes.equals(sbomBytes)) fail('CANDIDATE_SBOM', 'BR6.5', 'Candidate CycloneDX bytes differ from the pinned toolchain and image evidence');
  const ledgerBytes = await readFile(join(imageDirectory, 'ledger-verification.json'));
  let ledger;
  try { ledger = JSON.parse(ledgerBytes.toString('utf8')); } catch { fail('IMAGE_LEDGER', 'BR6.5', 'Image ledger receipt is malformed'); }
  const tree = run('git', ['rev-parse', `${candidateRevision}^{tree}`], repoRoot, 'IMAGE_LEDGER');
  const listing = spawnSync('git', ['ls-tree', '-r', '-z', '--full-tree', candidateRevision],
    { cwd: repoRoot, shell: false, windowsHide: true, timeout: 10_000, maxBuffer: 32 * 1024 * 1024 });
  if (!COMMIT.test(tree) || listing.error || listing.status !== 0) {
    fail('IMAGE_LEDGER', 'BR6.5', 'Protected-main receipt differs from the candidate Git tree');
  }
  const sourceDigest = await sourceTreeDigest();
  const treeDigest = candidateTreeDigestFromGit(listing.stdout);
  const executionFingerprint = executionFingerprintFromGit(listing.stdout);
  const runtimeManifestDigest = ledger.schema === 'stocksense-image-ledger-verification-v2'
    ? await readKiotaRuntimeEvidence(imageDirectory, kiotaImageId) : null;
  assertLedgerBinding(ledger, { candidateRevision, treeSha: tree,
    treeDigest, sourceDigest, images: image.records,
    executionFingerprint, runtimeManifestDigest });
  const currentLedger = await fetchLedger({ repository: REPOSITORY, token: process.env.GITHUB_TOKEN,
    candidateRevision, candidateGitTreeSha: tree });
  const currentReceipt = await verifyImages({ directory: imageDirectory, imageIds, ledger: currentLedger,
    expectedRevision: candidateRevision, actualRevision: head, candidateTreeDigest: treeDigest,
    executionFingerprint, runtimeManifestDigest });
  if (canonicalJson(currentReceipt) !== canonicalJson(ledger)) {
    fail('IMAGE_LEDGER', 'BR6.5', 'Retained receipt no longer matches protected main and current finding dispositions');
  }
  const scans = await verifySecurityReports(repoRoot, candidateRevision, securityDirectory);
  const attestations = {
    bundle: await verifySubject(bundlePath, candidateRevision, parsed.bundle.artifactDigest),
    sbom: await verifySubject(sbomPath, candidateRevision, sbom.digest),
    scans: {}
  };
  for (const kind of ['secret-scan', 'vulnerability-scan']) {
    attestations.scans[kind] = await verifySubject(join(securityDirectory, `${kind}.json`),
      candidateRevision, scans[kind].digest);
  }
  for (const kind of ['bundle', 'sbom', 'secret-scan', 'vulnerability-scan']) {
    const subject = kind === 'bundle' || kind === 'sbom' ? attestations[kind] : attestations.scans[kind];
    const expectedDigest = kind === 'bundle' ? parsed.bundle.artifactDigest :
      kind === 'sbom' ? sbom.digest : scans[kind].digest;
    if (!exact(subject, ['identity', 'sourceCommit', 'sourceRef', 'subjectDigest']) ||
        subject.identity !== WORKFLOW || subject.sourceCommit !== candidateRevision ||
        subject.sourceRef !== REF || subject.subjectDigest !== expectedDigest) {
      fail('ATTESTATION_SUBJECT_MISMATCH', 'BR6.6', 'Hosted subject identity or digest differs');
    }
  }
  const record = assertCandidateRecord({ schema: 'stocksense-candidate-evidence-v1', candidateRevision,
    sourceRevision: parsed.manifest.sourceRevision, manifestDigest: parsed.bundle.manifestDigest,
    bundleDigest: parsed.bundle.artifactDigest, profileDigest: parsed.generation.digest,
    sourceDigests, validation, consumers, sbomDigest: sbom.digest, images: image.records,
    ledger: { digest: digest(ledgerBytes), mainSha: ledger.mainSha,
      ledgerBlobSha: ledger.ledgerBlobSha, candidateTreeDigest: ledger.candidateTreeDigest,
      sourceDigest }, scans, attestations, releaseReady: false });
  return record;
}

/** Recompute the full record and compare every field, including attested subjects and scan bytes. */
export async function verifyCandidateEvidence(record, options) {
  assertCandidateRecord(record);
  const actual = await buildCandidateEvidence({ ...options, candidateRevision: record.candidateRevision });
  if (canonicalJson(actual) !== canonicalJson(record)) {
    fail('CANDIDATE_EVIDENCE_MISMATCH', 'BR6.5', 'Candidate evidence differs from current verified inputs');
  }
  return { candidateRevision: record.candidateRevision, bundleDigest: record.bundleDigest,
    manifestDigest: record.manifestDigest, consumers: record.consumers.length,
    outputs: record.consumers.reduce((count, row) => count + Object.keys(row.outputs).length, 0),
    releaseReady: false };
}

// This direct entry point is the protected U2 policy path. The scripts in
// scripts/ are convenience wrappers and must not be used as a required verdict.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
  const [command, ...args] = process.argv.slice(2);
  const usage = 'Usage: node src/candidate-provenance.mjs build <bundle> <sbom> <image-dir> <security-dir> <candidate-commit> <record> | verify <record> <bundle> <sbom> <image-dir> <security-dir>\n';
  if (command === 'build' && args.length !== 6 || command === 'verify' && args.length !== 5 ||
      !['build', 'verify'].includes(command)) {
    process.stderr.write(usage);
    process.exitCode = 2;
  } else {
    try {
      const common = { repoRoot, validatorImageId: process.env.STOCKSENSE_STANDARDS_IMAGE,
        kiotaImageId: process.env.STOCKSENSE_KIOTA_IMAGE };
      if (command === 'build') {
        const [bundle, sbom, imageDirectory, securityDirectory, candidateRevision, output] = args;
        const record = await buildCandidateEvidence({ ...common, bundlePath: resolve(bundle),
          sbomPath: resolve(sbom), imageDirectory: resolve(imageDirectory),
          securityDirectory: resolve(securityDirectory), candidateRevision });
        const destination = resolve(output);
        await mkdir(dirname(destination), { recursive: true });
        await writeFile(destination, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
        process.stdout.write(JSON.stringify({ candidateRevision, bundleDigest: record.bundleDigest,
          outputs: 107, releaseReady: false }) + '\n');
      } else {
        const [recordPath, bundle, sbom, imageDirectory, securityDirectory] = args;
        const record = JSON.parse((await boundedFile(resolve(recordPath), 1024 * 1024)).toString('utf8'));
        const result = await verifyCandidateEvidence(record, { ...common, bundlePath: resolve(bundle),
          sbomPath: resolve(sbom), imageDirectory: resolve(imageDirectory),
          securityDirectory: resolve(securityDirectory) });
        process.stdout.write(JSON.stringify(result) + '\n');
      }
    } catch (error) {
      process.stderr.write(JSON.stringify(toDiagnostic(error, { repoRoot })) + '\n');
      process.exitCode = 1;
    }
  }
}
