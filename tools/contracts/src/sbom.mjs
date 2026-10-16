import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import YAML from 'yaml';
import { ContractError, canonicalJson } from './package-loader.mjs';

// A CycloneDX 1.6 SBOM built from the pnpm lockfile.
//
// The obvious choice was @cyclonedx/cdxgen, but it is 13.9 MB unpacked with 29
// direct dependencies, and adding that to the tool that polices this project's
// supply chain - immediately after deleting a sprawling dependency tree to
// reach zero advisories - would buy an SBOM at the cost of the property the
// SBOM exists to demonstrate. @cyclonedx/cyclonedx-npm is not an option
// either: it shells out to `npm ls` and cannot read a pnpm-managed tree.
//
// The lockfile already carries every resolved version and 337 integrity
// hashes, so the SBOM is derived rather than discovered. That also makes it
// deterministic: the same lockfile yields byte-identical output, which is what
// lets a report digest mean anything.

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
 * @param {{ name: string, version: string, generator: string }} subject
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

  const components = [];
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
        { name: 'stocksense:componentsWithoutHash', value: String(withoutHash) }
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
