# U1 validator scan independent review — 2026-11-26

Reviewer: StockSense security and identity specialist. Scope: read-only diagnosis of the new proof scan; this report is the only assigned write. No runtime, dependency, scanner policy, exception, or implementation change is approved by this review.

## Decision

The proof remains blocked. The raw validator scan contains 20 findings, including seven fixed High Node vulnerabilities. Two normalization limitations explain the immediate `IMAGE_SCAN: validator scan has an incomplete finding` error, but repairing those limitations alone cannot make the candidate pass the existing vulnerability policy. Keep the ledger/SBOM candidate isolated pending a separately reviewed and protected plan for the newly required changes.

This new proof failure is distinct from the unchanged November 17 checks on PRs #74–#76: those reported the earlier ledger candidate mismatch and picomatch vulnerability failures; U2 passed. Do not attribute those earlier PR failures to this new scan.

## Evidence and provenance

- Reviewed implementation: `3fef097f5a7f87885d6453dfd3017ec23751a1b1`.
- Diagnostic proof commit: `4b1ddb6772175692974d08afc932e49200cf99fe`.
- [Proof run 45851142043](https://github.com/anton-asnitsky/StockSense/actions/runs/45851142043), lane 2 job `140017505681`: 462 tests registered, 461 passed, zero failed, one existing release-only TODO; C01–C27 validation passed; image scan failed before SBOM simulation.
- [Raw artifact 15133553936](https://github.com/anton-asnitsky/StockSense/actions/runs/45851142043/artifacts/15133553936), local `.local-data/u1-ledger-45851142043/u1-ledger-proof-2.zip`. ZIP SHA256 independently matched GitHub metadata: `4656c1a02a2771e49f4a2d5c3f88ae4118342e138b68cc04f181cb1af7d2101e`.
- Receipt schema: `stocksense-image-raw-v1`; image `validator`; source revision equals the reviewed implementation above.
- Image ID: `sha256:441dfe0576e821bbb86623a68b0e4107684e26f322174d24fb67af876e643aad`.
- SBOM digest: `sha256:375d2f4f5d29926e91f1df7670a8c202aa2480b10ec3b9d9f9dd6a47a030040b`.
- Raw scan digest: `sha256:574ff840ccc320963fbc37d0a7778992170d5fc008a4273da3af5f53000a4384`.
- Database receipt digest: `sha256:6b4e66db9d3f69837170ad6a1e145580f70b013b6a67a80f1b458da52fbd0805`.
- Scanner: `ghcr.io/anchore/grype@sha256:e4a44ef45d285b829ce6efe2642980329661bd2d18eab5fc539138d4adaebbbe`.

Actual artifact file hashes matched the raw receipt. Database status recorded schema `v6.1.10`, built `2026-11-26T06:22:34Z`, valid `true`. The SBOM contains both implicated package identities: `pkg:generic/node@24.22.2` and `pkg:apk/wolfi/glibc-2.44@2.44-r21?arch=x86_64&distro=wolfi-20230201`.

No normalized `validator.scan.json` was emitted: inspection failed before its write. Consequently this review does **not** claim the normal `verifyRawImageScan` pipeline passed. These are independent raw-byte, receipt-binding, and SBOM-membership checks.

## Findings by severity

### Blocking: fixed High vulnerabilities in Node 24.22.2

The raw scan reports 15 Node findings, with `type: binary`, the exact generic PURL above, and fix state `fixed`. Every row lists 24.22.3 among its fixed versions.

| Severity | CVEs |
| --- | --- |
| High (7) | CVE-2026-126051, CVE-2026-123874, CVE-2026-123865, CVE-2026-123863, CVE-2026-123866, CVE-2026-123872, CVE-2026-123864 |
| Medium (6) | CVE-2026-123828, CVE-2026-123875, CVE-2026-123868, CVE-2026-123877, CVE-2026-123871, CVE-2026-123867 |
| Low (2) | CVE-2026-123862, CVE-2026-123829 |

The [official Node 24.22.3 release](https://nodejs.org/en/blog/release/v24.22.3), dated November 11, 2026, confirms the security release and all 15 identifiers. It publishes Linux x64 archive `node-v24.22.3-linux-x64.tar.xz` with SHA256 `4f2b175a6d53a5c617a80dba2676238a0688cef28c6da4eba35c7d844e66fcfb`. This verifies availability and the vendor-published checksum, **not** downloaded archive bytes or a signature. Existing policy forbids exceptions for fixed High/Critical findings; normalization repairs cannot discharge these seven findings.

### Major: report normalization cannot represent these scanner rows

In the reviewed `tools/contracts/src/image-evidence.mjs`, `normalizeImageScan` carries through artifact type/PURL and fix state. `purlMatches` recognizes apk, deb, npm, and dotnet/nuget, but lacks binary/generic support. All 15 Node rows therefore fail identity validation despite matching the SBOM.

The five glibc rows have explicit `fix: { versions: [], state: "" }`. `inspectImageScan` accepts fixed, not-fixed, wont-fix, and unknown, but rejects the empty state. Their package identity is present; the missing information is fix disposition. The guard appropriately fails closed at line 264.

Any proposed repair must preserve every raw finding, require exact supported type/PURL/version binding, reject malformed or mismatched identities, and preserve fixed High/Critical blocking. An explicit unknown reporting representation must not automatically become eligible for a vulnerability exception.

### Unresolved: five upstream glibc CPE findings

For `glibc-2.44` version `2.44-r21`, the scan reports Medium CVE-2026-121758, CVE-2026-124024, CVE-2026-115819, and Low CVE-2026-126765, CVE-2026-100290. All five have the empty fix state described above. Total scan severity counts are seven High, nine Medium, four Low.

The inspected CVE-2026-121758 row uses `nvd:cpe`, `cpe-match`, and `apk-matcher`, with GNU glibc CPE 2.44 and a matching version constraint through 2.44. This establishes the scanner match, not Wolfi package patch status. Vendor package/advisory reconciliation remains required; neither false-positive status, an available package fix, nor an accepted disposition is established here.

## Minimal next scope and verification requirements

1. Obtain a separately reviewed protected plan covering Node runtime/pin changes, the reporting identity/fix-metadata behavior, and resolution of the five Wolfi/glibc matches. The existing ledger/SBOM approval excludes runtime, dependency, and scanner-policy changes.
2. Verify selected runtime archive bytes against the vendor checksum and applicable signature policy; keep validator, host checks, package engine constraints, and workflow pins consistent. Rebuild and independently bind the resulting image/SBOM/raw scans.
3. Add targeted negative and positive checks for binary/generic identity and incomplete fix metadata without losing rows, permitting unknown dispositions, or weakening vulnerability thresholds. Preserve the old vulnerable candidate as a positive control.
4. Reconcile Wolfi package patch evidence or prove a corrected pinned image through its exact SBOM and fresh scan. Rerun relevant tests and both proof lanes before any approved working-branch rollout, then verify hosted checks at the actual PR heads.

No risk acceptance is granted. R-15/U1 closure, U1 acceptance, C01 release, protected-main changes, and all PR merges remain unauthorized. This report diagnoses the blocker; it does not establish passing integrated CI.
