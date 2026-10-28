# PR #61 SBOM forward-fix readiness — 2026-10-28

The owner-approved [PR #59](https://github.com/anton-asnitsky/StockSense/pull/59)
bootstrap merged into `main` as `68bb426590ccd529ccdfcb2dfcaa8ea701ed46e9`.
[Main-push U1 and Vulnerability run 40754287503](https://github.com/anton-asnitsky/StockSense/actions/runs/40754287503)
passed. [Main-push release-evidence run 40754286140](https://github.com/anton-asnitsky/StockSense/actions/runs/40754286140)
failed at `Build the CycloneDX SBOM` with `IMAGE_MISSING`; the earlier image
build, scan, and protected-ledger steps passed. U1 acceptance and C01 release
remain blocked.

`pnpm --dir tools/contracts` executes the SBOM script from `tools/contracts`.
The workflow's old `STOCKSENSE_IMAGE_EVIDENCE_DIR` value,
`tools/contracts/dist/image-evidence`, therefore resolved one directory too
deep. Using the exact image inventories, scans and ledger receipt retained by
the failed main run, the old value reproduced `IMAGE_MISSING`. The corrected
value, `dist/image-evidence`, generated a CycloneDX 1.6 SBOM with 3,078
components and digest
`sha256:e3f9e47ca5da96b6ff0ba3e8f16fd11ebaacae49a27797c41c5ef38cf884e06f`.
The local source-tree digest was checked against the hosted receipt before
this reproduction. `git diff --check` passed. This is a focused path fix,
not a full local integration run.

The fix is committed and pushed on `fix/us8-7-sbom-evidence-path` at
`374f9113e9d49e67a6bc579a0fc8cd6aa33d77cf` and opened as
[draft PR #61](https://github.com/anton-asnitsky/StockSense/pull/61).
Its only tracked change is `.github/workflows/release-evidence.yml`.
The exact ledger-excluded candidate-tree digest is
`sha256:9f9ab01d75178ac20df7eba78b697f2f3a7cf74b5cce372f402b4b54a7ff2259`;
the hosted PR U1 log independently printed the same digest.

[PR #61 hosted run 40756484537](https://github.com/anton-asnitsky/StockSense/actions/runs/40756484537)
retained image artifact `12844954707`. The validator scan has no findings.
The Kiota scan has one Medium `GHSA-qhrr-8q5h-9q3h` finding in bundled
MessagePack 2.5.302. The Kiota scan-file SHA-256 is
`1430b2c0a7a71ca58ffe99a7f53041878ac7936fdb2386bd376a862cecf47af4`.
Vulnerability passed; U1 stopped at the protected-main image-ledger mismatch,
and U2 rejected the protected workflow edit. The previous exception is bound
to a different candidate tree and cannot cover PR #61.

Next decisions are separate: an owner decision on a temporary finding-specific
exception for this exact candidate; owner approval for a protected-main ledger
PR and any temporary protection change; then a distinct owner decision on
merging PR #61. Afterward the complete main-push release-evidence workflow
must pass before any acceptance claim. R-14–R-16, 45 traceability gaps and
stale approval-bound U1 planning artifacts remain open.
