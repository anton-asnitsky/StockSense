# U1 validator runtime screening — unchanged unknown findings

Completed during the November 26–27, 2026 CI closure work. Result: **approved-plan stop condition reached; do not roll out this candidate**. The newest inspected same-family runtime still produces all five policy-ineligible unknown glibc findings. No finding was suppressed, reclassified or accepted. No PR head, main authority or required check was changed.

## Scope and exact candidate

Worktree `.aidlc/worktrees/u1-ci-validator`, branch `codex/u1-ci-validator`, base `e70f9a78c465468c17a47407b0385e1c9c54c67b`. The only tracked edit is the final `Dockerfile.validator` base digest. It remains an uncommitted isolated experiment, not a rollout commit. Existing untracked hook artifacts are preserved.

The official registry's `cgr.dev/chainguard/glibc-dynamic:latest` resolved to index `sha256:ae815f889199ee018b0072f05939ecef65b1b3a831d1c768fa82d1860f889942`, with Linux/amd64 manifest `sha256:f2f261fb5b67206f6d31c27ca0001837743b253d96744620f0fee280ffaaf5b9`. The candidate uses that immutable manifest instead of the prior `3d6b3b0d...` manifest. Registry resolution/pull establishes the content identity; this screening did not independently verify a vendor signature or transparency-log attestation.

The normal production build script succeeded and verified final source-marker bytes, the approved Node binary hash and offline/non-root execution. Actual local image ID: `sha256:518e0f9f17cc2993aa8a11f238aa90dba8081b46f5ad5c73eb606c8b3913b13c`. Source marker: `sha256:ffc3aa016eb4f9fe27a005ab2922b0d6bdd6220ac590ef2aff998b36e94ba99a`. Dockerfile SHA-256: `239ddb03864fc43e116a6b6a984632027ba6b95fc766c3e3f22cb76fce7bb71e`.

The SBOM inventories `glibc-2.44@2.44-r28`, replacing the prior r21, and the unchanged `node@24.22.3`. Node binary SHA-256 remains `a7ec1b37e6ff9d187e4198c5b6df9a4eb1c74dd31804fb3bac55cc4ceca1ac01`. Dependency layers were cached; this run does not newly prove npm availability or a fresh dependency download. No package-manager, lockfile, generator or scanner pin changed.

## Retained scan evidence

Files are retained under `.local-data/u1-ci-validator/`. The exact built image was exported to `validator.tar`; pinned Syft inventoried that archive and pinned Grype scanned exactly the retained CycloneDX bytes. Syft manifest: `sha256:3eb5379ba7b409c3f4069b686110527af0c47df993fa5c10d13e7cf34f49b1aa`. Grype manifest: `sha256:e4a44ef45d285b829ce6efe2642980329661bd2d18eab5fc539138d4adaebbbe` (reported version 0.120.1).

| File | SHA-256 |
|---|---|
| validator.cdx.json | 42e227a81b214810cfc99f02ffa7715815dffbc807499066d2350b0eb9cc0ba8 |
| validator.grype-raw.json | 023d0e5bb36c289dddf7507917f10307faefafdf9a79635a3246e2f4f58dddbd |
| validator.grype-db.json | d3bf44def6e5bde54a65b3294d7aa90f7afade4b90b445c53587a7ae62c1ef91 |

The SBOM has 683 components, including file components; Grype gathered 314 packages. The fresh database receipt reports schema v6.1.10, built `2026-11-26T06:22:34Z`, `valid:true`. Database auto-update, required update check, age validation and 120-hour maximum age remained enabled. `validator.scan.json` was produced using the unchanged production normalizer. `screening.json` explicitly records `screeningOnly:true`, `protectedReceipt:false`, the base revision and dirty Dockerfile; it must not be presented as immutable hosted candidate proof or ordinary U1 success.

All rows bind the exact package name, version and PURL `pkg:apk/wolfi/glibc-2.44@2.44-r28?arch=x86_64&distro=wolfi-20230201`. All five raw rows have namespace `nvd:cpe`, `apk-matcher`, CPE `cpe:2.3:a:gnu:glibc:2.44:*:*:*:*:*:*:*`, fix state `""` and an empty fixed-version list. Production normalization correctly retains `unknown`.

| CVE | Severity | Raw matched version constraint | Result |
|---|---|---|---|
| CVE-2026-121758 | Medium | >= 2.2, <= 2.44 (unknown) | Remains unknown |
| CVE-2026-124024 | Medium | >= 2.3.3, <= 2.44 (unknown) | Remains unknown |
| CVE-2026-115819 | Medium | >= 2.2, <= 2.44 (unknown) | Remains unknown |
| CVE-2026-126765 | Low | <= 2.44 (unknown) | Remains unknown |
| CVE-2026-100290 | Low | >= 2.3, <= 2.44 (unknown) | Remains unknown |

No old Node findings reappeared. Zero High/Critical rows is not sufficient to pass: all five unknown findings remain ineligible for an exception under the approved policy.

## Execution limits and first failed attempt

Baseline `node --test test/unit/image-evidence.test.mjs` passed 10/10, zero failures/skips/TODOs, under verified Node 24.22.3 before the pin edit. Normal build completed successfully. Scanners were serialized and limited to one CPU and 2 GiB RAM; Syft used network-none and read-only root, and Grype used read-only root with the database update network access required by the production checks.

The first Grype attempt timed out after the helper's 12-minute bound, after Syft had written the complete SBOM. A 2,912,727,040-byte database file was present. The original helper surfaced ETIMEDOUT but did not retain its scanner stderr, so the exact cause is not established; do not label this definitively a filesystem or network failure. The timeout container was identified by its exact scanner image and exclusive `.local-data/u1-ci-validator` bind mount, then removed. No unrelated container was touched.

A permitted diagnostic retry reused the same SBOM and scanner, copied the cache to an isolated Docker-managed volume and used Linux tmpfs for temporary files. Cache copy completed in 248.215 seconds. Grype completed successfully in 113.971 seconds; its retained stderr records a fresh database download taking 73.710 seconds, successful installation/validation and five matches. Database-status retrieval completed in 3.145 seconds. These operational storage changes did not change scanner semantics, image bytes, fix states or age controls. Per-command execution records and stderr are retained as `*.execution.json` and `*.stderr.log`. No hosted retry was needed after this conclusive local result. The diagnostic cache volume is named `stocksense-u1-validator-grype-cache-20261126` and is retained for reproducibility.

## Vendor status and bounded alternative

The [official glibc-dynamic vulnerability page](https://images.chainguard.dev/directory/image/glibc-dynamic/vulnerabilities), checked during this task, still lists four of these advisories for an older r25 package. The [Wolfi recipe](https://raw.githubusercontent.com/wolfi-dev/os/main/glibc-2.44.yaml) returned version 2.44/epoch26 while the actual immutable candidate inventory is r28. These differing snapshots do not establish remediation or a false positive for r28. No exact-candidate vendor-supported fix or not-affected conclusion was established for any of the five rows.

Simply switching to another glibc distribution may change the scanner namespace or fix-state classification while retaining the affected upstream code. The broad raw constraints above include ordinary older Debian/Ubuntu glibc versions; such a switch is not itself a security fix. Do not choose a distribution merely because it makes these rows exception-eligible or absent from one feed.

One possible comparison is a minimal official Debian Bookworm-compatible glibc runtime retaining the same verified Node 24.22.3 binary, because the existing builder is Bookworm-based. It is not the preferred remediation proposal without per-CVE authenticated vendor patch/applicability evidence: if it only changes reporting, reject it. Waiting for a verifiable same-family vendor fix remains the option that preserves the existing runtime design. The coordinator additionally requested the read-only musl feasibility comparison below; implementing either alternative requires a focused amendment.

## Read-only Alpine/musl feasibility comparison

The official `node:24.22.3-alpine` manifest exists. Registry index: `sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5`; Linux/amd64 manifest: `sha256:d8d97e479cdc64f052f81f129362168717c59783ade8dcc1abd22e1cca8dbd7c`. Registry annotations identify Alpine 3.24 base manifest `sha256:0f49f331d9212aff11b932863be4eb01cdf962969aa86dab7d1ee21ac6f5f52b` and docker-node source revision `1274f3ee37d4d0e59d308ea25b83d9e21e4db862`. These annotations are discovery evidence, not independently verified signatures or proof of the binary contents.

The [exact pinned Dockerfile](https://raw.githubusercontent.com/nodejs/docker-node/1274f3ee37d4d0e59d308ea25b83d9e21e4db862/24/alpine3.24/Dockerfile), fetched and retained as `node-alpine-pinned.Dockerfile`, hashes to `0643d976290ebb8c229271196cc6d9c189ec7d49dd11950dd435907cd2278197`. Its x64 route downloads the musl archive directly from nodejs.org, verifies the signed release checksum list with GPG, then checks the archive digest. It does **not** use unofficial-builds for this selected release/architecture. Do not carry forward an assumption based on older Dockerfile behavior.

The [published Node 24.22.3 checksum list](https://nodejs.org/dist/v24.22.3/SHASUMS256.txt), independently fetched via HTTPS and retained as `node24223-published-SHASUMS256.txt`, lists:

| Archive | Published SHA-256 |
|---|---|
| node-v24.22.3-linux-x64-musl.tar.xz | 601b3e1930a593f3d44af2d0dca978dad4bd8b4594c4f8268b67a33553b04c30 |
| node-v24.22.3.tar.xz | 48ca3aa8a9b02133356922ef4fc80200e00598c80a4ef446f7c39a459222593d |

The coordinator subsequently authorized read-only artifact authentication, which completed successfully. Actual downloaded musl archive bytes match `601b3e1930a593f3d44af2d0dca978dad4bd8b4594c4f8268b67a33553b04c30`. Fresh `SHASUMS256.txt.asc` verification returned GOODSIG and VALIDSIG for `5BE8A3F6C8A5C01D106C0AD820B1A390B168D356`, using the unchanged official Node release keyring SHA-256 `610b8d249da3d5733f5a128def2dd0294dbbf5b5713e6ca2529db8db419dee00` from pinned repository commit `481637f813e912c4aa3622d7964ab426c97b8e8d`. The verified checksum text binds this exact musl archive. GPG reports TRUST_UNDEFINED: signer authorization relies on the previously reviewed official vendor keyring fetched over HTTPS, not an independently established web of trust. Raw GPG output is retained in `musl-checksum-gpg.log`, with signed input and verified plaintext beside it.

The extracted musl `bin/node` SHA-256 is **`7e027679034844bb06f53bead732673553cf5bb0de424bbbd257b35c989d34b0`**. The exact official Alpine amd64 manifest above was pulled; `/usr/local/bin/node` was copied from an **unstarted** inspection container and has the identical digest. Only that owned inspection container was removed afterward. The binary was not executed, and no musl validator was built or scanned. The source archive checksum remains a published fallback input; its archive bytes were not downloaded or verified in this comparison.

The [official docker-node support documentation](https://github.com/nodejs/docker-node/blob/main/README.md#musl-builds-for-alpine) still describes amd64 musl as Experimental. Authentication and binary equality do not establish runtime compatibility, a clean vulnerability scan or support equivalence to the existing glibc runtime.

Recommended focused amendment: evaluate the authenticated official x64-musl archive first, retaining Node version 24.22.3, npm/pnpm lockfiles and generator versions. Verify signed release checksums against reviewed pinned release keys, actual archive bytes, extracted binary hash and equality to the independently pulled immutable official image binary; record any provenance limitation and reject a mismatch. If that route cannot be authenticated, the alternative is a build from the separately authenticated official source archive with an immutable, authenticated Alpine/musl toolchain and package closure, not an unreviewed prebuilt binary. The source-build path adds build reproducibility and toolchain validation obligations and must be explicit in the amendment.

A musl candidate could remove the affected glibc component rather than merely change its advisory namespace, but that must be proven from the actual filesystem, ELF dependencies and complete SBOM. Do not silently add glibc/gcompat or other compatibility packages to make it run. Require non-root/read-only/offline execution, normal dependency installation, all validator engines and C01–C27 fixtures, complete raw scans and unknown/fixed High/Critical refusal, generated-output compatibility and two independently reviewed candidate builds before any rollout. No clean result, binary hash, runtime compatibility or support equivalence is claimed before those checks. No Alpine/musl implementation was performed here.

The current approved plan explicitly stops if unknown findings remain or a distribution/libc change is needed. That stop applies now. No ledger-authority implementation can clear these unknown rows, and no owner risk acceptance has been inferred. R-15 remains open; there is no U1 acceptance, C01 release, merge or next-gate advancement.
