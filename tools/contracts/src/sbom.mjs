import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import YAML from 'yaml';
import { ContractError, canonicalJson } from './package-loader.mjs';
import { IMAGE_NAMES, readImageEvidence, SCANNERS, verifyRawImageScan } from './image-evidence.mjs';
import { sourceTreeDigest } from './source-digest.mjs';
import { readKiotaRuntimeEvidence, verifyBoundImageEvidence } from './image-ledger.mjs';
import { verifyRetainedPrLedgerAuthority } from './pr-ledger-authority.mjs';
import { readPrLedgerReceipt } from './pr-ledger-context.mjs';

// A CycloneDX 1.6 SBOM built from the pnpm lockfile and pinned tool recipes.
//
// The obvious choice was @cyclonedx/cdxgen, but it is 13.9 MB unpacked with 29
// direct dependencies, and adding that to the tool that polices this project's
// supply chain - immediately after deleting a sprawling dependency tree to
// reach zero advisories - would buy an SBOM at the cost of the property the
// SBOM exists to demonstrate. @cyclonedx/cyclonedx-npm is not an option
// either: it shells out to `npm ls` and cannot read a pnpm-managed tree.
//
// The lockfile carries resolved package integrity hashes. Dockerfile and
// workflow pins supply the external tool closure; CI adds verified image IDs.

/** @returns {never} */
const fail = (code, rule, message) => { throw new ContractError(code, rule, message); };
const NAME_AT_VERSION = /^(?<name>(?:@[^/@]+\/)?[^@/][^@]*)@(?<version>[0-9]+\.[0-9]+\.[0-9]+[^@]*)$/;
const INTEGRITY = /^sha(256|512)-([A-Za-z0-9+/]+={0,2})$/;
const DIGEST = /^sha256:[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const exactFields = (value, fields) => value && typeof value === 'object' &&
  !Array.isArray(value) && Object.keys(value).length === fields.length &&
  fields.every(field => Object.hasOwn(value, field));

/** PR receipts require independently fetched live authority in this exact CI execution. */
async function verifyImageLedgerReceipt(directory, candidateRevision, records, sourceContext, prAuthorityInput) {
  if (!COMMIT.test(candidateRevision ?? '')) {
    fail('IMAGE_LEDGER', 'BR6.5', 'Candidate revision is required for image evidence');
  }
  let receipt;
  try {
    receipt = prAuthorityInput
      ? await readPrLedgerReceipt(join(directory, 'ledger-verification.json'))
      : JSON.parse(await readFile(join(directory, 'ledger-verification.json'), 'utf8'));
  } catch {
    fail('IMAGE_LEDGER', 'BR6.5', 'Successful image ledger verification is missing or malformed');
  }
  const pr = receipt?.schema === 'stocksense-image-ledger-verification-pr-v1';
  const v2 = pr || receipt?.schema === 'stocksense-image-ledger-verification-v2';
  if (Boolean(prAuthorityInput) !== pr) {
    fail('IMAGE_LEDGER', 'BR6.5', 'Image ledger authority differs from the explicitly selected context');
  }
  if (!exactFields(receipt, ['schema', 'candidateRevision', 'candidateGitTreeSha',
    'candidateTreeDigest', 'sourceDigest', ...(pr ? ['authority'] : ['mainSha']), 'ledgerBlobSha', 'images',
    ...(v2 ? ['executionFingerprint', 'runtimeManifestDigest', 'ledgerSchema'] : [])]) ||
    !['stocksense-image-ledger-verification-v1',
      'stocksense-image-ledger-verification-v2', 'stocksense-image-ledger-verification-pr-v1'].includes(receipt.schema) ||
    v2 && (receipt.ledgerSchema !== 'stocksense-image-exceptions-v2' ||
      !DIGEST.test(receipt.executionFingerprint) ||
      !DIGEST.test(receipt.runtimeManifestDigest)) ||
    receipt.candidateRevision !== candidateRevision ||
    !COMMIT.test(receipt.candidateGitTreeSha) || !DIGEST.test(receipt.candidateTreeDigest) ||
    !DIGEST.test(receipt.sourceDigest) || !pr && !COMMIT.test(receipt.mainSha) ||
    !COMMIT.test(receipt.ledgerBlobSha) ||
    receipt.sourceDigest !== await sourceTreeDigest() ||
    !Array.isArray(receipt.images) || receipt.images.length !== IMAGE_NAMES.length) {
    fail('IMAGE_LEDGER', 'BR6.5', 'Image ledger receipt is stale or incomplete');
  }
  for (const [index, name] of IMAGE_NAMES.entries()) {
    const row = receipt.images[index];
    const record = records[index];
    if (!exactFields(row, ['image', 'imageId', 'sbomDigest', 'scanDigest', 'findings', 'disposed']) ||
      row.image !== name || record.name !== name || row.imageId !== record.imageId ||
      row.sbomDigest !== record.sbomDigest || row.scanDigest !== record.scanDigest ||
      !Number.isSafeInteger(row.findings) || row.findings < 0 ||
      row.findings !== record.findings || row.disposed !== row.findings) {
      fail('IMAGE_LEDGER', 'BR6.5', `${name} image evidence lacks a matching successful ledger verification`);
    }
  }
  if (v2) {
    if (!exactFields(sourceContext, ['candidateRevision', 'candidateGitTreeSha',
      'candidateTreeDigest', 'executionFingerprint']) ||
        sourceContext.candidateRevision !== candidateRevision ||
        sourceContext.candidateGitTreeSha !== receipt.candidateGitTreeSha ||
        sourceContext.candidateTreeDigest !== receipt.candidateTreeDigest ||
        sourceContext.executionFingerprint !== receipt.executionFingerprint) {
      fail('IMAGE_LEDGER', 'BR6.5', 'Image ledger receipt differs from independent Git context');
    }
    let runtimeDigest;
    try {
      runtimeDigest = await readKiotaRuntimeEvidence(directory,
        records.find(record => record.name === 'kiota').imageId);
    } catch {
      fail('IMAGE_LEDGER', 'BR6.5', 'Image ledger runtime evidence is missing or inconsistent');
    }
    if (receipt.runtimeManifestDigest !== runtimeDigest) {
      fail('IMAGE_LEDGER', 'BR6.5', 'Image ledger receipt differs from independent runtime evidence');
    }
    if (pr) {
      if (prAuthorityInput.sourceRevision !== sourceContext.candidateRevision ||
          prAuthorityInput.candidateGitTreeSha !== sourceContext.candidateGitTreeSha ||
          prAuthorityInput.candidateTreeDigest !== sourceContext.candidateTreeDigest ||
          prAuthorityInput.executionFingerprint !== sourceContext.executionFingerprint ||
          prAuthorityInput.runtimeManifestDigest !== runtimeDigest) {
        fail('IMAGE_LEDGER', 'BR6.5', 'PR authority expectations differ from independent source/runtime evidence');
      }
      const live = await verifyRetainedPrLedgerAuthority(prAuthorityInput, receipt.authority);
      const imageIds = Object.fromEntries(records.map(record => [record.name, record.imageId]));
      for (const record of records) {
        await verifyRawImageScan(directory, { name: record.name, imageId: record.imageId,
          sbomDigest: record.sbomDigest, revision: candidateRevision });
      }
      const expected = await verifyBoundImageEvidence({ directory, imageIds, ledger: live.ledger,
        authority: live.authority, expectedRevision: candidateRevision, actualRevision: candidateRevision,
        candidateTreeDigest: sourceContext.candidateTreeDigest,
        executionFingerprint: sourceContext.executionFingerprint, runtimeManifestDigest: runtimeDigest,
        now: prAuthorityInput.now?.() ?? new Date() });
      if (!('authority' in expected)) {
        fail('IMAGE_LEDGER', 'BR6.5', 'Independent PR verification returned a different authority mode');
      }
      const bindings = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'authority'));
      const expectedBindings = bindings(expected);
      const retainedBindings = bindings(receipt);
      if (!isDeepStrictEqual(expectedBindings, retainedBindings)) {
        fail('IMAGE_LEDGER', 'BR6.5', 'PR receipt differs from independently reverified ledger and scans');
      }
      // A new valid comment/attempt cannot revive this receipt: live retains the
      // original strong identities and refuses changes, including revocation.
      await live.revalidate();
    }
  }
  return receipt;
}

/** CycloneDX wants hex; npm integrity is base64. */
function hashOf(integrity) {
  const match = INTEGRITY.exec(String(integrity ?? ''));
  if (!match) return null;
  return { alg: `SHA-${match[1]}`, content: Buffer.from(match[2], 'base64').toString('hex') };
}

/**
 * A package key is `name@version`, optionally carrying a peer-suffix in
 * parentheses, which is a resolution detail and not part of the identity.
 */
export function parsePackageKey(key) {
  const bare = String(key).replace(/\(.*\)$/, '');
  const match = NAME_AT_VERSION.exec(bare);
  if (!match?.groups) fail('SBOM_COMPONENT', 'BR6.5', `Lockfile key is not a name@version: ${key}`);
  return { name: match.groups.name, version: match.groups.version };
}

const purl = (name, version) =>
  `pkg:npm/${name.split('/').map(part => encodeURIComponent(part)).join('/')}@${encodeURIComponent(version)}`;

/**
 * @param {string} lockfilePath
 * @param {{ name: string, version: string, generator: string, validatorImageDigest?: string, kiotaImageDigest?: string, imageEvidenceDirectory?: string, candidateRevision?: string, sourceContext?: { candidateRevision: string, candidateGitTreeSha: string, candidateTreeDigest: string, executionFingerprint: string }, prAuthorityInput?: object }} subject
 * @returns {Promise<{ document: object, bytes: Buffer, digest: string, components: number }>}
 */
export async function buildSbom(lockfilePath, subject) {
  const text = await readFile(lockfilePath, 'utf8');
  let lock;
  try { lock = YAML.parse(text, { strict: true, uniqueKeys: true }); }
  catch { fail('SBOM_LOCKFILE', 'BR6.5', 'Lockfile is not well-formed YAML'); }
  if (!lock || typeof lock !== 'object' || !lock.packages || typeof lock.packages !== 'object') {
    fail('SBOM_LOCKFILE', 'BR6.5', 'Lockfile declares no resolved packages');
  }
  if (!String(lock.lockfileVersion ?? '').startsWith('9.')) {
    // A different lockfile layout would silently produce a partial SBOM, and a
    // partial SBOM is worse than an absent one because it looks complete.
    fail('SBOM_LOCKFILE', 'BR6.5', `Unsupported lockfile version ${lock.lockfileVersion}`);
  }

  /** @type {any[]} */
  const components = [];
  let imageRecords = [];
  let imageLedgerReceipt;
  let withoutHash = 0;
  for (const [key, value] of Object.entries(lock.packages).sort(([a], [b]) => (a < b ? -1 : 1))) {
    const { name, version } = parsePackageKey(key);
    const hash = hashOf(value?.resolution?.integrity);
    if (!hash) withoutHash += 1;
    components.push({
      type: 'library',
      'bom-ref': purl(name, version),
      name,
      version,
      purl: purl(name, version),
      ...(hash ? { hashes: [hash] } : {})
    });
  }
  if (!components.length) fail('SBOM_COMPONENT', 'BR6.5', 'An SBOM with no components is not evidence');

  // The pnpm graph is only one part of the toolchain. Read the actual build
  // recipes so a changed pin cannot leave a plausible but stale SBOM behind.
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const [validator, kiota, differ, manifest, requiredWorkflow, releaseWorkflow, runtimeRecipe, runtimeInputs] = await Promise.all([
    'Dockerfile.validator', 'Dockerfile.generator-kiota', 'scripts/setup-oasdiff.mjs',
    'package.json', '../../.github/workflows/contracts-required.yml',
    '../../.github/workflows/release-evidence.yml', 'scripts/build-kiota-runtime.py', 'kiota-runtime-inputs.json'
  ].map(path => readFile(resolve(root, path), 'utf8')));
  const required = (text, pattern, label) => {
    const match = pattern.exec(text);
    if (!match) fail('SBOM_TOOL_PIN', 'BR6.5', `Missing immutable ${label} pin`);
    return match;
  };
  const add = (type, name, version, hash, source) => components.push({
    type, 'bom-ref': `stocksense:tool:${name}:${version}`, name, version,
    hashes: [{ alg: 'SHA-256', content: hash }],
    properties: [{ name: 'stocksense:pinSource', value: source }]
  });
  const nodeDigest = required(validator, /FROM docker\.io\/library\/node@sha256:([0-9a-f]{64})/, 'validator Node image')[1];
  const sdkDigest = required(kiota, /FROM mcr\.microsoft\.com\/dotnet\/sdk@sha256:([0-9a-f]{64})/, '.NET SDK image')[1];
  const kiotaPin = required(kiota, /echo '([0-9a-f]{64})  \/opt\/kiota\/\.store\/microsoft\.openapi\.kiota\/([0-9.]+)\//, 'Kiota nupkg');
  const oasVersion = required(differ, /const version = '([0-9.]+)'/, 'oasdiff version')[1];
  const oasLinux = required(differ, /'linux-x64': \['linux_amd64', '([0-9a-f]{64})'\]/, 'oasdiff Linux archive')[1];
  const pkg = JSON.parse(manifest);
  if (pkg.engines?.node !== '24.22.3' || pkg.packageManager !== 'pnpm@11.25.0') {
    fail('SBOM_TOOL_PIN', 'BR6.5', 'Node and pnpm must match the reviewed CI toolchain');
  }
  add('container', 'validator-node-image', pkg.engines.node, nodeDigest, 'Dockerfile.validator');
  add('container', 'kiota-dotnet-sdk-image', 'sdk', sdkDigest, 'Dockerfile.generator-kiota');
  add('application', 'Microsoft.OpenApi.Kiota', kiotaPin[2], kiotaPin[1], 'Dockerfile.generator-kiota');
  add('application', 'oasdiff-linux-amd64-archive', oasVersion, oasLinux, 'scripts/setup-oasdiff.mjs');
  const runtimeBuilderDigest = required(kiota,
    /FROM --platform=linux\/amd64 python@sha256:([0-9a-f]{64}) AS runtime-build/, 'runtime builder image')[1];
  const runtimePayloadDigest = required(kiota,
    /FROM --platform=linux\/amd64 mcr\.microsoft\.com\/dotnet\/runtime@sha256:([0-9a-f]{64}) AS microsoft-payload/,
    'Microsoft runtime payload image')[1];
  let runtimeLock;
  try { runtimeLock = JSON.parse(runtimeInputs); }
  catch { fail('SBOM_TOOL_PIN', 'BR6.5', 'Kiota runtime input lock is malformed'); }
  if (runtimeLock?.schemaVersion !== 1 || !/^[0-9]{8}T[0-9]{6}Z$/.test(runtimeLock.snapshot) ||
      !exactFields(runtimeLock.tools, ['chisel', 'slices', 'wrapper'])) {
    fail('SBOM_TOOL_PIN', 'BR6.5', 'Kiota runtime input lock must identify its snapshot and tools');
  }
  add('container', 'kiota-runtime-builder-image', 'runtime-build', runtimeBuilderDigest, 'Dockerfile.generator-kiota');
  add('container', 'kiota-microsoft-runtime-payload-image', 'runtime-payload', runtimePayloadDigest, 'Dockerfile.generator-kiota');
  add('file', 'kiota-runtime-build-recipe', '1', createHash('sha256').update(runtimeRecipe).digest('hex'), 'scripts/build-kiota-runtime.py');
  add('file', 'kiota-runtime-input-lock', runtimeLock.snapshot, createHash('sha256').update(runtimeInputs).digest('hex'), 'kiota-runtime-inputs.json');
  for (const [name, pin] of Object.entries(runtimeLock.tools)) {
    const lengths = { sha256: 64, sha384: 96 };
    if (!exactFields(pin, ['algorithm', 'url', 'digest']) || !Object.hasOwn(lengths, pin.algorithm) ||
        typeof pin.digest !== 'string' || pin.digest.length !== lengths[pin.algorithm] ||
        !/^[0-9a-f]+$/.test(pin.digest) || typeof pin.url !== 'string' ||
        !/^https:\/\//.test(pin.url)) {
      fail('SBOM_TOOL_PIN', 'BR6.5', 'Kiota runtime tooling requires immutable download hashes');
    }
    components.push({
      type: 'application', 'bom-ref': `stocksense:tool:kiota-runtime-${name}:${pin.digest}`,
      name: `kiota-runtime-${name}`, version: pin.digest,
      hashes: [{ alg: pin.algorithm === 'sha384' ? 'SHA-384' : 'SHA-256', content: pin.digest }],
      externalReferences: [{ type: 'distribution', url: pin.url }],
      properties: [{ name: 'stocksense:pinSource', value: 'kiota-runtime-inputs.json' }]
    });
  }
  for (const [name, value] of [['validator-image', subject.validatorImageDigest],
    ['kiota-image', subject.kiotaImageDigest]]) {
    if (value !== undefined) {
      if (!/^sha256:[0-9a-f]{64}$/.test(value)) fail('SBOM_TOOL_PIN', 'BR6.5', `Invalid ${name} digest`);
      add('container', name, 'local-build', value.slice(7), 'verified CI build');
    }
  }
  if (subject.validatorImageDigest || subject.kiotaImageDigest || subject.imageEvidenceDirectory || subject.prAuthorityInput) {
    if (!subject.imageEvidenceDirectory) fail('IMAGE_MISSING', 'Built image inventory and scan directory is required');
    const images = await readImageEvidence(subject.imageEvidenceDirectory, {
      validator: subject.validatorImageDigest, kiota: subject.kiotaImageDigest
    }, { requireClean: false });
    imageLedgerReceipt = await verifyImageLedgerReceipt(
      subject.imageEvidenceDirectory, subject.candidateRevision, images.records, subject.sourceContext, subject.prAuthorityInput);
    imageRecords = images.records;
    components.push(...images.components);
    add('container', 'syft-image-scanner', 'v1.54.1', SCANNERS.syft.split('@sha256:')[1], 'image-evidence.mjs');
    add('container', 'grype-vulnerability-scanner', 'v0.120.1', SCANNERS.grype.split('@sha256:')[1], 'image-evidence.mjs');
  }
  for (const [file, source] of [[requiredWorkflow, 'contracts-required.yml'], [releaseWorkflow, 'release-evidence.yml']]) {
    for (const [, name, hash] of file.matchAll(/uses: ([\w-]+\/[\w-]+)@([0-9a-f]{40})/g)) {
      // Git commit IDs use SHA-1; retain them as explicit properties below.
      if (!components.some(c => c.name === name && c.properties?.[0]?.value === source)) {
        components.push({ type: 'application', 'bom-ref': `stocksense:action:${source}:${name}`,
          name, version: hash, properties: [{ name: 'stocksense:pinSource', value: source },
            { name: 'stocksense:gitCommitSha1', value: hash }] });
      }
    }
  }
  components.push({ type: 'operating-system', 'bom-ref': 'stocksense:runner:ubuntu-24.04',
    name: 'GitHub hosted runner', version: 'ubuntu-24.04',
    properties: [{ name: 'stocksense:mutableRunnerLabel', value: 'true' }] });

  // Deterministic: no timestamp, and the serial number is derived from the
  // content so the same lockfile always yields the same document. A wall-clock
  // field would make every run differ and make a report digest meaningless.
  const body = {
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    version: 1,
    metadata: {
      component: { type: 'application', name: subject.name, version: subject.version,
        'bom-ref': purl(subject.name, subject.version) },
      tools: { components: [{ type: 'application', name: subject.generator, version: subject.version }] },
      properties: [
        { name: 'stocksense:source', value: 'pnpm-lock.yaml' },
        { name: 'stocksense:lockfileVersion', value: String(lock.lockfileVersion) },
        { name: 'stocksense:pnpmComponentsWithoutHash', value: String(withoutHash) },
        { name: 'stocksense:componentsWithoutHash', value: String(components.filter(item => !item.hashes?.length).length) },
        ...(imageLedgerReceipt ? [
          ...(imageLedgerReceipt.schema === 'stocksense-image-ledger-verification-pr-v1'
            ? [{ name: 'stocksense:imageLedgerAuthority', value: imageLedgerReceipt.authority.type },
              { name: 'stocksense:imageLedgerOwnerComment', value: String(imageLedgerReceipt.authority.authorization.commentId) },
              { name: 'stocksense:imageLedgerCommit', value: imageLedgerReceipt.authority.ledger.commit },
              { name: 'stocksense:imageLedgerSha256', value: imageLedgerReceipt.authority.ledger.sha256 },
              { name: 'stocksense:imageLedgerRun', value: String(imageLedgerReceipt.authority.currentRunId) },
              { name: 'stocksense:imageLedgerRunAttempt', value: String(imageLedgerReceipt.authority.currentRunAttempt) }]
            : [{ name: 'stocksense:imageLedgerMainSha', value: imageLedgerReceipt.mainSha }]),
          { name: 'stocksense:imageLedgerBlobSha', value: imageLedgerReceipt.ledgerBlobSha },
          { name: 'stocksense:imageLedgerCandidateRevision', value: imageLedgerReceipt.candidateRevision },
          { name: 'stocksense:imageLedgerCandidateTreeDigest', value: imageLedgerReceipt.candidateTreeDigest },
          ...(['stocksense-image-ledger-verification-v2', 'stocksense-image-ledger-verification-pr-v1'].includes(imageLedgerReceipt.schema) ? [
            { name: 'stocksense:imageLedgerExecutionFingerprint', value: imageLedgerReceipt.executionFingerprint },
            { name: 'stocksense:imageLedgerRuntimeManifestDigest', value: imageLedgerReceipt.runtimeManifestDigest }
          ] : [])
        ] : []),
        ...imageRecords.flatMap(record => [
          { name: `stocksense:${record.name}:imageId`, value: record.imageId },
          { name: `stocksense:${record.name}:imageSbomDigest`, value: record.sbomDigest },
          { name: `stocksense:${record.name}:imageScanDigest`, value: record.scanDigest }
        ])
      ]
    },
    components
  };
  const fingerprint = createHash('sha256').update(canonicalJson(body)).digest('hex');
  const document = { ...body, serialNumber: `urn:uuid:${fingerprint.slice(0, 8)}-${fingerprint.slice(8, 12)}-` +
    `4${fingerprint.slice(13, 16)}-8${fingerprint.slice(17, 20)}-${fingerprint.slice(20, 32)}` };
  const bytes = Buffer.from(JSON.stringify(document, null, 2) + '\n');
  return { document, bytes, digest: 'sha256:' + createHash('sha256').update(bytes).digest('hex'),
    components: components.length };
}
