#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { verifyPackageBundle } from '../src/package-bundle.mjs';

// The identity and subject checks must succeed before parsing any package
// content. GitHub CLI verifies the signature, certificate and exact file digest.
const [bundlePath, repository, sourceCommit] = process.argv.slice(2);
if (process.argv.length !== 5 || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '') ||
    !/^[0-9a-f]{40}$/.test(sourceCommit ?? '')) {
  process.stderr.write('Usage: node scripts/verify-candidate-bundle.mjs <bundle-file> <owner/repo> <signing-source-commit>\n');
  process.exit(2);
}

const artifact = resolve(bundlePath);
const signer = `${repository}/.github/workflows/release-evidence.yml`;
const verified = spawnSync('gh', ['attestation', 'verify', artifact, '--repo', repository,
  '--signer-workflow', signer, '--source-digest', sourceCommit,
  '--source-ref', 'refs/heads/main', '--deny-self-hosted-runners', '--format', 'json'],
{ encoding: 'utf8', shell: false, windowsHide: true, timeout: 60_000, maxBuffer: 4 * 1024 * 1024 });
if (verified.error || verified.status !== 0) {
  process.stderr.write(JSON.stringify({ code: 'ATTESTATION_UNVERIFIED', ruleId: 'BR6.6',
    message: 'The package subject and trusted signing identity could not be verified' }) + '\n');
  process.exit(1);
}

try {
  const attestations = JSON.parse(verified.stdout);
  if (!Array.isArray(attestations) || !attestations.length) throw new Error('No verified attestation');
  const bytes = await readFile(artifact);
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
} catch {
  process.stderr.write(JSON.stringify({ code: 'PACKAGE_UNVERIFIED', ruleId: 'BR6.6',
    message: 'Package contents did not match the verified subject and manifest' }) + '\n');
  process.exitCode = 1;
}
