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
const digest = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const fail = (code, message) => { throw new ContractError(code, 'BR6.5', message); };

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

export function inspectImageScan(report, name, imageId, sbomDigest) {
  if (!report || report.schema !== 'stocksense-image-scan-v1' || report.image !== name ||
      report.imageId !== imageId || report.sbomDigest !== sbomDigest ||
      report.scanner !== SCANNERS.grype || report.status !== 'completed' ||
      !Array.isArray(report.findings) || report.database?.status !== 'valid' ||
      !/^v?6\.\d+\.\d+$/.test(report.database?.schemaVersion ?? '') ||
      typeof report.database?.source !== 'string' ||
      !report.database.source.startsWith('https://grype.anchore.io/databases/') ||
      !Number.isFinite(Date.parse(report.database?.built))) {
    fail('IMAGE_SCAN', `${name} scan is missing, stale or incomplete`);
  }
  const age = Date.now() - Date.parse(report.database.built);
  if (age < 0 || age > 120 * 60 * 60 * 1000) fail('IMAGE_SCAN', `${name} vulnerability database is stale`);
  for (const finding of report.findings) {
    if (!/^(?:CVE-\d{4}-\d{4,}|GHSA-[\w-]+)$/.test(finding.id) ||
        !/^(?:Unknown|Negligible|Low|Medium|High|Critical)$/.test(finding.severity) ||
        !finding.package || !finding.version || !finding.type) {
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
