import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ContractError } from './package-loader.mjs';

// Linux/amd64 is the hosted ubuntu-24.04 runner architecture. These are OCI
// manifest digests, not mutable tags or installer scripts.
export const SCANNERS = Object.freeze({
  syft: 'ghcr.io/anchore/syft@sha256:3eb5379ba7b409c3f4069b686110527af0c47df993fa5c10d13e7cf34f49b1aa',
  grype: 'ghcr.io/anchore/grype@sha256:e4a44ef45d285b829ce6efe2642980329661bd2d18eab5fc539138d4adaebbbe'
});
export const IMAGE_NAMES = Object.freeze(['validator', 'kiota']);
const HEX = /^sha256:[0-9a-f]{64}$/;
const ADVISORY = /^(?:CVE-\d{4}-\d{4,}|GHSA-[A-Za-z0-9]{4}(?:-[A-Za-z0-9]{4}){2})$/;
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const EXCEPTION_FIELDS = new Set(['id', 'image', 'package', 'version', 'type', 'purl', 'severity',
  'fixState', 'owner', 'rationale', 'compensatingControl', 'approvalReference',
  'createdAt', 'expiresAt']);
const digest = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const fail = (code, message) => { throw new ContractError(code, 'BR6.5', message); };
const exactText = (value, limit = 512) => typeof value === 'string' && value.length > 0 &&
  value.length <= limit && value === value.trim() && !/[\x00-\x1f\x7f*]/.test(value);
const exactIdentityText = (value, limit) => exactText(value, limit) && !value.includes('?');
const PURL = /^pkg:([a-z][a-z0-9.+-]*)\/([^?#]+)(?:\?([^#]+))?(?:#(.+))?$/;
const safePurlPart = value => value.length > 0 && !/[\s/?#*%\x00-\x1f\x7f]/.test(value);

function purlMatches(record) {
  if (!exactText(record.purl, 2048) || !exactIdentityText(record.package, 256) ||
      !exactIdentityText(record.version, 256)) return false;
  const match = PURL.exec(record.purl);
  if (!match) return false;
  const [, type, path, qualifiers, subpath] = match;
  if ({ deb: 'deb', apk: 'apk', npm: 'npm', dotnet: 'nuget' }[record.type] !== type) return false;
  const versionAt = path.lastIndexOf('@');
  if (versionAt < 1 || versionAt === path.length - 1) return false;
  try {
    // Decode each path segment separately so an encoded slash cannot invent a namespace.
    const segments = path.slice(0, versionAt).split('/').map(decodeURIComponent);
    const version = decodeURIComponent(path.slice(versionAt + 1));
    if (!segments.every(safePurlPart) || !safePurlPart(version) ||
        qualifiers !== undefined && !decodeURIComponent(qualifiers) ||
        subpath !== undefined && !decodeURIComponent(subpath)) return false;
    const packageName = type === 'npm' && segments.length === 2 && segments[0].startsWith('@')
      ? segments.join('/') : (segments.at(-1) ?? '');
    if (type === 'npm' && segments.length !== (segments[0].startsWith('@') ? 2 : 1)) return false;
    if (type === 'nuget' && segments.length !== 1) return false;
    if (type === 'apk' && (segments.length !== 2 || segments[0] !== 'alpine')) return false;
    const agrees = type === 'nuget'
      ? packageName.toLowerCase() === record.package.toLowerCase()
      : packageName === record.package;
    return agrees && version === record.version;
  } catch (error) {
    if (error instanceof URIError) return false;
    throw error;
  }
}
const identity = (record, image) => JSON.stringify([record.id, image, record.package,
  record.version, record.type, record.purl, record.fixState, record.severity]);

function utcTime(value) {
  if (typeof value !== 'string' || !UTC.test(value)) return NaN;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return NaN;
  const canonical = new Date(time).toISOString();
  return canonical === value || canonical.replace('.000Z', 'Z') === value ? time : NaN;
}

/** Validate current scan findings against candidate records; approval provenance is caller-owned.
 * @param {{image?: string, imageId?: string, sbomDigest?: string, now?: Date}} [options]
 */
export function verifyImageDispositions(report, exceptions, options = {}) {
  const { image, imageId, sbomDigest, now = new Date() } = options;
  if (typeof image !== 'string' || !IMAGE_NAMES.includes(image) || !Array.isArray(exceptions)) {
    fail('IMAGE_EXCEPTION', 'Image disposition input is invalid');
  }
  const findings = inspectImageScan(report, image, imageId, sbomDigest, now);
  const current = new Map();
  for (const finding of findings) {
    if (!finding || !ADVISORY.test(finding.id ?? '') ||
        !['Negligible', 'Low', 'Medium', 'High', 'Critical'].includes(finding.severity) ||
        !exactIdentityText(finding.package, 256) || !exactIdentityText(finding.version, 256) ||
        !exactIdentityText(finding.type, 128) || !purlMatches(finding) ||
        !['fixed', 'not-fixed', 'wont-fix'].includes(finding.fixState)) {
      fail('IMAGE_SCAN', 'Image finding cannot be identified or safely disposed');
    }
    const key = identity(finding, image);
    if (current.has(key)) fail('IMAGE_SCAN', 'Duplicate or ambiguous current image finding');
    current.set(key, finding);
    if (finding.fixState === 'fixed' && ['High', 'Critical'].includes(finding.severity)) {
      fail('IMAGE_FINDINGS', 'A fixed High or Critical image finding blocks the gate');
    }
  }
  const disposed = new Set();
  for (const exception of exceptions) {
    if (!exception || typeof exception !== 'object' || Array.isArray(exception) ||
        Object.keys(exception).length !== EXCEPTION_FIELDS.size ||
        Object.keys(exception).some(field => !EXCEPTION_FIELDS.has(field)) ||
        !ADVISORY.test(exception.id ?? '') || !IMAGE_NAMES.includes(exception.image) ||
        !exactIdentityText(exception.package, 256) || !exactIdentityText(exception.version, 256) ||
        !exactIdentityText(exception.type, 128) || !purlMatches(exception) ||
        !['Negligible', 'Low', 'Medium', 'High', 'Critical'].includes(exception.severity) ||
        !['fixed', 'not-fixed', 'wont-fix'].includes(exception.fixState) ||
        ['owner', 'rationale', 'compensatingControl', 'approvalReference']
          .some(field => !exactText(exception[field]))) {
      fail('IMAGE_EXCEPTION', 'Image exception is malformed or broad');
    }
    const created = utcTime(exception.createdAt);
    const expires = utcTime(exception.expiresAt);
    if (!Number.isFinite(created) || !Number.isFinite(expires) ||
        created > now.getTime() || expires <= now.getTime() || created >= expires) {
      fail('IMAGE_EXCEPTION', 'Image exception is future, expired or has invalid times');
    }
    const key = identity(exception, exception.image);
    if (!current.has(key) || disposed.has(key)) {
      fail('IMAGE_EXCEPTION', 'Image exception is unmatched or duplicates a disposition');
    }
    disposed.add(key);
  }
  if (disposed.size !== current.size) {
    fail('IMAGE_FINDINGS', 'Current image findings lack a permitted disposition');
  }
  return { findings: current.size, disposed: disposed.size };
}

export function inspectImageSbom(document, name, imageId) {
  if (!document || document.bomFormat !== 'CycloneDX' || !/^1\.[456]$/.test(document.specVersion) ||
      !Array.isArray(document.components) || document.components.length === 0) {
    fail('IMAGE_SBOM', `${name} image inventory is absent or malformed`);
  }
  const props = document.metadata?.properties;
  if (!Array.isArray(props) || !props.some(p => p.name === 'stocksense:imageId' && p.value === imageId)) {
    fail('IMAGE_STALE', `${name} inventory is not bound to the built image ID`);
  }
  const packages = document.components.filter(c => typeof c.name === 'string' && c.name &&
    typeof c.version === 'string' && c.version && typeof c.purl === 'string');
  if (!packages.length || name === 'kiota' && !packages.some(c => c.purl.startsWith('pkg:nuget/')) ||
      name === 'validator' && !packages.some(c => c.purl.startsWith('pkg:npm/'))) {
    fail('IMAGE_SBOM', `${name} inventory lacks its expected package ecosystem`);
  }
  return packages;
}

export function inspectImageScan(report, name, imageId, sbomDigest, now = new Date()) {
  if (!HEX.test(imageId ?? '') || !HEX.test(sbomDigest ?? '') ||
      !(now instanceof Date) || !Number.isFinite(now.getTime()) ||
      !report || report.schema !== 'stocksense-image-scan-v2' || report.image !== name ||
      report.imageId !== imageId || report.sbomDigest !== sbomDigest ||
      report.scanner !== SCANNERS.grype || report.status !== 'completed' ||
      !Array.isArray(report.findings) || report.database?.status !== 'valid' ||
      !/^v?6\.\d+\.\d+$/.test(report.database?.schemaVersion ?? '') ||
      typeof report.database?.source !== 'string' ||
      !report.database.source.startsWith('https://grype.anchore.io/databases/') ||
      !Number.isFinite(Date.parse(report.database?.built))) {
    fail('IMAGE_SCAN', `${name} scan is missing, stale or incomplete`);
  }
  const age = now.getTime() - Date.parse(report.database.built);
  if (age < 0 || age > 120 * 60 * 60 * 1000) fail('IMAGE_SCAN', `${name} vulnerability database is stale`);
  for (const finding of report.findings) {
    if (!finding || !ADVISORY.test(finding.id) ||
        !/^(?:Unknown|Negligible|Low|Medium|High|Critical)$/.test(finding.severity) ||
        !finding.package || !finding.version || !finding.type || !purlMatches(finding) ||
        !['fixed', 'not-fixed', 'wont-fix', 'unknown'].includes(finding.fixState) ||
        !Array.isArray(finding.fixVersions) ||
        finding.fixVersions.some(version => typeof version !== 'string' || !version.trim()) ||
        (finding.fixState === 'fixed') !== (finding.fixVersions.length > 0)) {
      fail('IMAGE_SCAN', `${name} scan has an incomplete finding`);
    }
  }
  return report.findings;
}

export async function readImageEvidence(directory, imageIds, { requireClean = true } = {}) {
  const components = [];
  const records = [];
  for (const name of IMAGE_NAMES) {
    const imageId = imageIds[name];
    if (!HEX.test(imageId ?? '')) fail('IMAGE_STALE', `Missing exact ${name} image ID`);
    let sbomBytes = Buffer.alloc(0), scanBytes = Buffer.alloc(0);
    try {
      [sbomBytes, scanBytes] = await Promise.all([
        readFile(join(directory, `${name}.cdx.json`)), readFile(join(directory, `${name}.scan.json`))
      ]);
    } catch { fail('IMAGE_MISSING', `Missing ${name} image inventory or scan`); }
    let sbom, scan;
    try { sbom = JSON.parse(sbomBytes.toString('utf8')); scan = JSON.parse(scanBytes.toString('utf8')); }
    catch { fail('IMAGE_FORMAT', `Invalid ${name} image evidence JSON`); }
    const packages = inspectImageSbom(sbom, name, imageId);
    const sbomDigest = digest(sbomBytes);
    const findings = inspectImageScan(scan, name, imageId, sbomDigest);
    records.push({ name, imageId, sbomDigest, scanDigest: digest(scanBytes), packages: packages.length,
      findings: findings.length });
    for (const component of sbom.components) {
      components.push({ ...component,
        'bom-ref': `stocksense:image:${name}:${imageId}:${component['bom-ref'] ?? component.purl ?? components.length}`,
        properties: [...(component.properties ?? []),
          { name: 'stocksense:image', value: name }, { name: 'stocksense:imageId', value: imageId }] });
    }
  }
  if (requireClean && records.some(record => record.findings)) {
    fail('IMAGE_FINDINGS', 'Image vulnerability findings require disposition before the gate can pass');
  }
  return { components, records };
}

export const sha256 = digest;
