#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { basename, resolve } from 'node:path';
import { verifyPackageBundle } from '../src/package-bundle.mjs';
import { withPrivateBundleSnapshot } from '../src/bundle-snapshot.mjs';

// The identity and subject checks must succeed before parsing any package
// content. GitHub CLI verifies the signature, certificate and exact file digest.
const TRUSTED_REPOSITORY = 'anton-asnitsky/StockSense';
const TRUSTED_WORKFLOW = `${TRUSTED_REPOSITORY}/.github/workflows/release-evidence.yml`;
const [bundlePath, sourceCommit] = process.argv.slice(2);
if (process.argv.length !== 4 || !/^[0-9a-f]{40}$/.test(sourceCommit ?? '')) {
  process.stderr.write('Usage: node scripts/verify-candidate-bundle.mjs <bundle-file> <signing-source-commit>\n');
  process.exit(2);
}

const artifact = resolve(bundlePath);
class VerificationFailure extends Error {
  constructor(code, ruleId, message) { super(message); this.code = code; this.ruleId = ruleId; }
}
try {
  const { bytes, result: attestations } = await withPrivateBundleSnapshot(artifact, snapshot => {
    const verified = spawnSync('gh', ['attestation', 'verify', snapshot, '--repo', TRUSTED_REPOSITORY,
      '--signer-workflow', TRUSTED_WORKFLOW, '--source-digest', sourceCommit,
      '--source-ref', 'refs/heads/main', '--deny-self-hosted-runners', '--format', 'json'],
    { encoding: 'utf8', shell: false, windowsHide: true, timeout: 60_000, maxBuffer: 4 * 1024 * 1024 });
    if (verified.error || verified.status !== 0) {
      throw new VerificationFailure('ATTESTATION_UNVERIFIED', 'BR6.6',
        'The package subject and trusted signing identity could not be verified');
    }
    return JSON.parse(verified.stdout);
  });
  if (!Array.isArray(attestations) || !attestations.length) throw new Error('No verified attestation');
  const subjectDigest = attestations.flatMap(row => row?.verificationResult?.statement?.subject ?? [])
    .find(subject => subject?.name === basename(artifact) &&
      /^([0-9a-f]{64})$/.test(subject?.digest?.sha256 ?? ''))?.digest?.sha256;
  if (!subjectDigest) throw new Error('Verified attestation lacks the exact package subject');
  const bundle = verifyPackageBundle(bytes, { expectedDigest: `sha256:${subjectDigest}` });
  const manifest = JSON.parse(bundle.files.get('manifest.json').toString('utf8'));
  process.stdout.write(JSON.stringify({ artifactDigest: bundle.artifactDigest,
    manifestDigest: bundle.manifestDigest, signingSourceCommit: sourceCommit,
    canonicalSourceRevision: manifest.sourceRevision, fileCount: bundle.fileCount,
    totalBytes: bundle.totalBytes, releaseReady: false }) + '\n');
} catch (error) {
  const failure = error instanceof VerificationFailure ||
    ['BUNDLE_SIZE_LIMIT', 'BUNDLE_CHANGED'].includes(error?.code) ? error :
    new VerificationFailure('PACKAGE_UNVERIFIED', 'BR6.6',
      'Package contents did not match the verified subject and manifest');
  process.stderr.write(JSON.stringify({ code: failure.code, ruleId: failure.ruleId,
    message: failure.message }) + '\n');
  process.exitCode = 1;
}
