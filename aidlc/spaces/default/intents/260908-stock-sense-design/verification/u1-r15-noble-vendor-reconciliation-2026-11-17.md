# R-15 Noble vendor reconciliation

## Scope and published fixes

The archived PR #75 Kiota baseline has 20 installed-package matches across 15 CVEs. Canonical's USN-9065-1 releases six glibc fixes in Noble libc6 2.39-0ubuntu8.12. The six IDs are CVE-2026-8674, CVE-2026-84243, CVE-2026-97399, CVE-2026-18374, CVE-2026-95818 and CVE-2026-86805. The candidate must prove the installed package, authenticated snapshot/dependency closure and current raw scan before those fixes receive credit. Canonical's publication API currently lists openssl 3.0.13-0ubuntu3.16 and libicu74 74.2-1ubuntu3.1. [Canonical update](https://ubuntu.com/security/notices/USN-9065-1) · [Exact baseline and advisory hashes](u1-r15-noble-vendor-reconciliation-2026-11-17.json)

## Fourteen residual rows across nine CVEs

All rows below retain the scanner's original severity, fix state and installed identity. Canonical reports 12 rows as needs-triage, one ICU row as needed and one glibc row as ignored. These are baseline rows. Final candidate versions and remaining findings require a new comparison.

| CVE | Installed package | Baseline version | Scanner severity | Scanner fix state | Canonical Noble status |
| --- | --- | --- | --- | --- | --- |
| CVE-2016-20013 | libc6 | 2.39-0ubuntu8.9 | Negligible | wont-fix | ignored |
| CVE-2025-5222 | libicu74 | 74.2-1ubuntu3.1 | Low | not-fixed | needed |
| CVE-2026-100290 | libc6 | 2.39-0ubuntu8.9 | Medium | not-fixed | needs-triage |
| CVE-2026-107496 | libssl3t64 | 3.0.13-0ubuntu3.16 | Medium | not-fixed | needs-triage |
| CVE-2026-107496 | openssl | 3.0.13-0ubuntu3.16 | Medium | not-fixed | needs-triage |
| CVE-2026-115819 | libc6 | 2.39-0ubuntu8.9 | Medium | not-fixed | needs-triage |
| CVE-2026-88822 | libssl3t64 | 3.0.13-0ubuntu3.16 | Medium | not-fixed | needs-triage |
| CVE-2026-88822 | openssl | 3.0.13-0ubuntu3.16 | Medium | not-fixed | needs-triage |
| CVE-2026-88823 | libssl3t64 | 3.0.13-0ubuntu3.16 | Medium | not-fixed | needs-triage |
| CVE-2026-88823 | openssl | 3.0.13-0ubuntu3.16 | Medium | not-fixed | needs-triage |
| CVE-2026-95691 | libssl3t64 | 3.0.13-0ubuntu3.16 | Medium | not-fixed | needs-triage |
| CVE-2026-95691 | openssl | 3.0.13-0ubuntu3.16 | Medium | not-fixed | needs-triage |
| CVE-2026-95692 | libssl3t64 | 3.0.13-0ubuntu3.16 | Medium | not-fixed | needs-triage |
| CVE-2026-95692 | openssl | 3.0.13-0ubuntu3.16 | Medium | not-fixed | needs-triage |

## Applicability evidence still needed

OpenSSL's November 10 advisory declares OpenSSL 3.0 unaffected by CVE-2026-88822, CVE-2026-88823, CVE-2026-95691 and CVE-2026-95692. Those four CVEs account for eight scanner rows. They concern QUIC or AES-GCM-SIV behavior. Ubuntu still marks all four needs-triage. Verify the actual 3.0 source/build, distro backports and absent affected feature before preparing a current, image-bound disposition. CVE-2026-107496 does affect OpenSSL 3.0 and has an upstream fix in 3.0.24. The published Noble version needs a source-patch check; its version suffix alone cannot establish the fix. [OpenSSL advisory](https://openssl-library.org/news/secadv/20261110.txt)

CVE-2025-5222 concerns ICU's genrb utility. Inspect the final filesystem and imported libraries for the affected binary/code before assessing reachability. CVE-2016-20013 concerns SHA-crypt password hashing; Canonical's ignored status and negligible priority need explanation tied to the installed glibc contents and actual Kiota execution. The two remaining glibc CVEs concern regex error paths under memory pressure and wide scanf conversions. A read-only root, no network and time/resource limits reduce exposure but do not prove these library paths absent. No exploit reproduction is needed for this review. [ICU record](https://ubuntu.com/security/CVE-2025-5222) · [SHA-crypt record](https://ubuntu.com/security/CVE-2016-20013) · [Regex record](https://ubuntu.com/security/CVE-2026-100290) · [Wide scanf record](https://ubuntu.com/security/CVE-2026-115819)

## Existing exception schema and remaining authority

The current image-evidence verifier accepts identifiable Negligible, Low, Medium, High and Critical severities with fixed, not-fixed or wont-fix states. Fixed High/Critical findings block the gate. Unknown severity or unknown fix state cannot be disposed. Each exception must exactly match advisory, image, package, version, type, PURL, severity and fix state. It additionally requires an owner, rationale, compensating control, approval reference, valid creation time and future expiry. Duplicate, unmatched and incomplete rows fail. The 14 residual baseline identities are representable by this schema; representation gives no approval.

The protected-main v1 ledger binds exceptions to the candidate Git tree. Its historical 1.35.0 MessagePack row cannot authorize a different current finding or candidate. The final raw report and SBOM must agree before an owner can review any finding-specific proposal. Candidate-bound applicability evidence, exact package provenance, compensating-control verification, expiry, approval and authoritative protected-main ledger verification remain required. Changes to protected main or any merge need separate owner decisions. R-15 remains open while U1 or governed combined SBOM/attestation evidence remains incomplete. [Disposition verifier](https://github.com/anton-asnitsky/StockSense/blob/e284f99d5629dfcbfcb2935b0005c48c40c3d2e9/tools/contracts/src/image-evidence.mjs) · [Protected-main ledger verifier](https://github.com/anton-asnitsky/StockSense/blob/8cce4f8040ad0767fca1b1ab14a00bb067a66b76/tools/contracts/src/image-ledger.mjs)
