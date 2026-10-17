import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { ContractError, canonicalJson } from './package-loader.mjs';
import { readImageEvidence, SCANNERS } from './image-evidence.mjs';

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
 * @param {{ name: string, version: string, generator: string, validatorImageDigest?: string, kiotaImageDigest?: string, imageEvidenceDirectory?: string }} subject
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
  const [validator, kiota, differ, manifest, requiredWorkflow, releaseWorkflow] = await Promise.all([
    'Dockerfile.validator', 'Dockerfile.generator-kiota', 'scripts/setup-oasdiff.mjs',
    'package.json', '../../.github/workflows/contracts-required.yml',
    '../../.github/workflows/release-evidence.yml'
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
  if (pkg.engines?.node !== '24.19.0' || pkg.packageManager !== 'pnpm@11.25.0') {
    fail('SBOM_TOOL_PIN', 'BR6.5', 'Node and pnpm must match the reviewed CI toolchain');
  }
  add('container', 'validator-node-image', pkg.engines.node, nodeDigest, 'Dockerfile.validator');
  add('container', 'kiota-dotnet-sdk-image', 'sdk', sdkDigest, 'Dockerfile.generator-kiota');
  add('application', 'Microsoft.OpenApi.Kiota', kiotaPin[2], kiotaPin[1], 'Dockerfile.generator-kiota');
  add('application', 'oasdiff-linux-amd64-archive', oasVersion, oasLinux, 'scripts/setup-oasdiff.mjs');
  for (const [name, value] of [['validator-image', subject.validatorImageDigest],
    ['kiota-image', subject.kiotaImageDigest]]) {
    if (value !== undefined) {
      if (!/^sha256:[0-9a-f]{64}$/.test(value)) fail('SBOM_TOOL_PIN', 'BR6.5', `Invalid ${name} digest`);
      add('container', name, 'local-build', value.slice(7), 'verified CI build');
    }
  }
  if (subject.validatorImageDigest || subject.kiotaImageDigest || subject.imageEvidenceDirectory) {
    if (!subject.imageEvidenceDirectory) fail('IMAGE_MISSING', 'Built image inventory and scan directory is required');
    const images = await readImageEvidence(subject.imageEvidenceDirectory, {
      validator: subject.validatorImageDigest, kiota: subject.kiotaImageDigest
    });
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
