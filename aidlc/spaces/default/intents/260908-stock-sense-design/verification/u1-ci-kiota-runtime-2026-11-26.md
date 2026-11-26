# Kiota runtime remediation and residual-finding proposals

Status: screening and proposals only. No finding is accepted, suppressed or removed. No runtime pin changed. The approved CI closure plan requires final candidate/execution/runtime binding and separate owner decisions before any proposed disposition can be used.

## Result

The current authenticated Ubuntu Noble security and updates indexes contain exactly the versions and package bytes already used by the reviewed Kiota runtime. There is no newer same-family package update for any of the four packages responsible for the 34 retained findings. Rebuilding unchanged inputs would not establish remediation; the coordinator directed that no pointless rebuild be performed. A distribution, libc, generator or dependency strategy change remains outside this bounded implementation without a focused plan amendment.

The isolated worktree `codex/u1-ci-kiota` remains at `e70f9a78c465468c17a47407b0385e1c9c54c67b` with no tracked source changes. Baseline `kiota-runtime-manifest.test.mjs` passed 10/10 tests under verified Node 24.22.3, with zero failures, skips or TODOs. No new image, fresh image scan, full-suite pass or generated-output proof is claimed by this screening.

## Authenticated package availability

Downloaded `https://archive.ubuntu.com/ubuntu/dists/{noble-security,noble-updates}/InRelease` and each suite's `main/binary-amd64/Packages.gz` on November 26. Offline `gpgv` verified both InRelease signatures using Ubuntu's archive keyring in the existing Ubuntu image. Signing key: `F6ECB3762474EDA9D21B7022871920D1991BC93C`, Ubuntu Archive Automatic Signing Key (2018). The security signature was dated 19:52:30 UTC and updates 20:17:16 UTC. Compressed index size and SHA-256 matched the signed InRelease records. This is archive-key authentication, not an independent web-of-trust claim.

| Package | Current Noble version = installed version | Current package SHA-256 = pinned package SHA-256 |
|---|---|---|
| libc6 | 2.39-0ubuntu8.12 | d821b41fc59cb4978ecd53bc83e5c964ac15d305c8d2ac4c8a35aebe55010fb9 |
| libssl3t64 | 3.0.13-0ubuntu3.16 | 219f43b1cd836a4da550938db5fda93160d269d39a4edcf1f1ce698a470db797 |
| openssl | 3.0.13-0ubuntu3.16 | 675b84971ffd4467707008c25ef7520f90ea7c23ef27b7a76b0dccf1d7c4dc3f |
| libicu74 | 74.2-1ubuntu3.1 | c9a70989678660eed9a1e904c74fa043da8bec8e2036856fc16e31ced79b04f8 |

Evidence is retained under `.local-data/u1-ci-kiota/`: both InRelease and Packages.gz files, `*.signature.txt`, `current-package-comparison.json`, and the reproducible read-only `check-packages.py`. InRelease SHA-256 values are `eba08d23a480b15f0a4bcb59924d69123d06c350d95fb3f83014cdf1543816ca` (security) and `66d10b3449f84e69bc20ae9cef30cd0a6d646761a1056652e1c88bf63112d5c7` (updates). Packages.gz hashes are `d0eda781df4f6750c02d0157fa68baf3507fe1da876c5f7bd2c1d4f8c149e7f6` and `aa1ea3696765834af5820e529c6a97aefc0c3b0f73b55c51ff672264151e2402` respectively.

### Signature-verification reproducibility addendum

The actual signature commands used local immutable image ID prefix `2198e4c65076`, resolved by local Docker inspection to image ID and repository digest `ubuntu@sha256:2198e4c65076e9cb0b3d695219df667c0e3b0072da64ca3c2648aca17dcecaf5`. A subsequent offline check of that same immutable image measured keyring `/usr/share/keyrings/ubuntu-archive-keyring.gpg` SHA-256 `80a36b0a6de2f69f49d2df75ef473ccde121e9e190b9ea01d20a4f63778d5c31` and verifier `/usr/bin/gpgv` SHA-256 `f14d026b9eae172c432e015bce227483293b4966f2f3fdcfa582f71d3dbb2ae8`. This identifies the local verification environment; it does not claim a newly verified image signature or independent trust enrollment for that image.

Actual invocation, repeated with `noble-updates.InRelease` for the second signature:

```powershell
& 'C:/Program Files/Docker/Docker/resources/bin/docker.exe' run --rm --pull=never --network=none --read-only --cpus=0.5 --memory=128m -v 'D:/Git/StockSense/.local-data/u1-ci-kiota:/evidence:ro' 2198e4c65076 /usr/bin/gpgv --keyring /usr/share/keyrings/ubuntu-archive-keyring.gpg /evidence/noble-security.InRelease
```

For reproduction, the short local ID can be replaced with the complete immutable repository digest above; no mutable tag is required. Both actual commands returned exit zero, and their retained transcripts are `noble-security.signature.txt` and `noble-updates.signature.txt`. No package pin, source file, finding decision or image build changed during this clarification.

## Exact retained subject and controls

Assessment uses the actual PR76 artifact from run `45871258618`, test-merge `661e7d5071e2162d25ec0f3c87891cc4ec6eb96a`, retained in `.local-data/u1-validator-45871258618/verified-image-evidence/`. Image ID is `sha256:d28e88ff9100f6df37890cbb88bc0509159fcabbe44d76013942e84c29efd65d`; normalized runtime is `sha256:1c7fc5fd4df187a3571460bf807e860f1be6bfd704c3fd9fe037c641adea5340`. Prior independent raw/SBOM/source binding is documented in `u1-validator-fresh-scan-review-2026-11-26.md`; this assessment does not replace that verification.

The 1775-entry retained runtime manifest has no `genrb`, `/usr/bin/openssl`, `libcrypt.so*` or `gconv/` module entries. It does retain `libcrypto.so.3`, `libssl.so.3`, libc and ICU libraries. Package metadata is deliberately retained: absence of a CLI is not a reason to delete package findings, and library presence remains relevant. `runtime-surface.json` records these queries. `all-34-findings.json` retains every exact advisory/package/version/PURL, severity, fix state and source description: seven libc6, one libicu74, thirteen libssl3t64 and thirteen openssl rows. All are unresolved; 33 have `not-fixed`, CVE-2016-20013 has `wont-fix`.

The reviewed generator invocation in `src/bounded-generators.mjs` enforces no network, read-only root filesystem, non-root identity, no-new-privileges, dropped capabilities, 128 PIDs, bounded writable mounts, 2 GiB memory/swap and 120-second supervision with cleanup and measured peak memory. These controls limit exposure and consequences; they do not prove that every vulnerable library function is unreachable. Final proposals must verify these controls against the final execution fingerprint and actual hosted invocation, rather than reuse this source observation indefinitely.

## Every current finding: proposed investigation/disposition route

Rows marked **NA candidate** are proposals for a separately reviewed, owner-approved exact-image non-applicability decision, not current acceptance. Rows marked **risk review** need stronger call-path evidence or a genuine temporary risk decision; no non-applicability claim is made for them. An unknown fix state or fixed High/Critical row remains ineligible regardless of this table.

OpenSSL rows below each apply separately to both `libssl3t64` and `openssl` at the exact versions/PURLs in `all-34-findings.json`. This accounts for 26 rows; libc/ICU account for the other eight.

| Advisory | Rows | Primary evidence and bounded proposal |
|---|---:|---|
| [CVE-2016-20013](https://ubuntu.com/security/CVE-2016-20013) | 1 libc6 | Noble glibc status is Ignored, not owner acceptance. Password-hashing CPU exhaustion. No libcrypt file is inventoried; **NA candidate** only after final symbol/call-path proof that the described password hashing implementation is absent. Otherwise risk review. |
| [CVE-2025-5222](https://ubuntu.com/security/CVE-2025-5222) | 1 libicu74 | Noble remains Vulnerable; issue is in genrb. No genrb executable exists in the retained image. **NA candidate** for absent affected tool, with final inventory and payload checks. |
| [CVE-2026-100290](https://ubuntu.com/security/CVE-2026-100290) | 1 libc6 | Needs evaluation. POSIX regex allocation-failure cleanup. **Risk review**: establish managed/native regex boundary; memory limits can create pressure and are not proof of non-applicability. |
| [CVE-2026-115819](https://ubuntu.com/security/CVE-2026-115819) | 1 libc6 | Needs evaluation. Specific wide-scanf conversion overflow. **Risk review** pending proof that final invocation/native dependencies do not expose this conversion to source input. |
| [CVE-2026-121757](https://ubuntu.com/security/CVE-2026-121757) | 1 libc6 | Needs evaluation. CP949 conversion with ignored invalid input. No gconv modules inventoried. **NA candidate**, conditional on confirming affected implementation is absent rather than built into another shipped object. |
| [CVE-2026-121758](https://ubuntu.com/security/CVE-2026-121758) | 1 libc6 | Needs evaluation. ISO-2022-CN-EXT decoder. Same absent-module proof requirement; **NA candidate**, not a package suppression. |
| [CVE-2026-124024](https://ubuntu.com/security/CVE-2026-124024) | 1 libc6 | Needs evaluation. UCS-4 to IBM1390/1399 conversion. Same final affected-module proof; **NA candidate**. |
| [CVE-2026-126765](https://ubuntu.com/security/CVE-2026-126765) | 1 libc6 | Needs evaluation. glob allocation-failure double free. **Risk review**: prove bounded fixed paths and native glob usage; resource limits alone do not establish unreachability. |
| CVE-2026-107493 | 2 OpenSSL | Upstream includes 3.0; caller-supplied non-null PEM stack is the trigger. **Risk review** or NA only after exact native-call proof; no attacker PEM/certificate input is intentionally exposed by the generator. |
| CVE-2026-107494 | 2 OpenSSL | Upstream explicitly excludes 3.0. **NA candidate** after final package/feature identity check. |
| CVE-2026-107496 | 2 OpenSSL | Upstream includes 3.0; CMS encryption to an abnormal EC group. **Risk review** pending proof of no CMS encryption surface; timeout bounds impact but is not a fix. |
| CVE-2026-121481 | 2 OpenSSL | Caller-controlled near-INT_MAX base64 encoding size. **Risk review**: prove exact input-size and native-call bounds; do not infer a fix from the memory limit. |
| CVE-2026-121482 | 2 OpenSSL | Upstream explicitly excludes 3.0. **NA candidate** after final package/feature identity check. |
| CVE-2026-124709 | 2 OpenSSL | Upstream explicitly excludes 3.0. **NA candidate** after final package/feature identity check. |
| CVE-2026-35190 | 2 OpenSSL | Upstream explicitly excludes 3.0. **NA candidate** after final package/feature identity check. |
| CVE-2026-84786 | 2 OpenSSL | Upstream includes 3.0; DANE-enabled TLS client. **NA candidate** only for verified offline invocation and absence of DANE call paths; otherwise risk review. |
| CVE-2026-88822 | 2 OpenSSL | Upstream explicitly excludes 3.0. **NA candidate** after final package/feature identity check. |
| CVE-2026-88823 | 2 OpenSSL | Upstream explicitly excludes 3.0. **NA candidate** after final package/feature identity check. |
| [CVE-2026-95690](https://ubuntu.com/security/CVE-2026-95690) | 2 OpenSSL | DTLS-only fragment buffering. **NA candidate** only for final verified offline/no-DTLS invocation; do not infer package-wide immunity. |
| CVE-2026-95691 | 2 OpenSSL | Upstream explicitly excludes 3.0. **NA candidate** after final package/feature identity check. |
| CVE-2026-95692 | 2 OpenSSL | Upstream explicitly excludes 3.0. **NA candidate** after final package/feature identity check. |

OpenSSL primary sources: [November 10 advisory](https://openssl-library.org/news/secadv/20261110.txt), [November 17 advisory](https://openssl-library.org/news/secadv/20261117.txt), [November 24 advisory](https://openssl-library.org/news/secadv/20261124.txt), [vendor vulnerability index](https://openssl-library.org/news/vulnerabilities/), and Ubuntu pages for every exact CVE. Upstream schedules the listed release fixes for December 1; this is not evidence that a corrected Noble package is already available. Ubuntu's OpenSSL source-package status remains Needs evaluation, distinct from nodejs rows on the same pages. All 21 Ubuntu pages and three OpenSSL texts were successfully retained; `vendor-fetch-results.json` records successful fetches, including pages that had timed out through the browser tool.

## Required final proposal fields and decision boundary

For each exact row, the coordinator must supply the final candidate digest, execution fingerprint, normalized runtime, actual image/SBOM/raw-scan/database bindings, exact package PURL/version, current vendor evidence, distinct rationale and independently verified exposure test. Owner is the repository owner, anton-asnitsky; no owner decision exists in this report. Do not generate an operative ledger from this unbound table.

Suggested expiry limits for review: non-applicability decisions at most seven days and within the plan's December 10 sunset; temporary risk decisions at most 72 hours and no later than December 3, with mandatory reassessment when December 1 vendor releases/package updates appear. These are proposed maxima, not granted exceptions. An actual decision may be stricter. If required call-path proof is unavailable, present the remaining uncertainty explicitly rather than label the row not affected. If the owner declines eligible risk, keep U1 red until a genuine fix or separately approved strategy exists.

All decisions invalidate on relevant runtime, execution, package, finding-set or authority changes. Final two-build scans and independent review remain required. No finding approval transfers from the historical MessagePack exception. This work creates no PR comment, ledger publication, merge, U1 acceptance, C01 release or gate advancement.
