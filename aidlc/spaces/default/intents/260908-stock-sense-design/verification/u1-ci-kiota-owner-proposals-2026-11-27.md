# U1 Kiota residual finding proposals — November 27, 2026

Status: proposals only; no owner decision, accepted finding or operative ledger. Intended owner: **anton-asnitsky**. This document does not authorize merge, U1 acceptance, C01 release or gate advancement. Frozen PR candidate bindings and verified ordinary per-PR scan identities are recorded below. Owner decisions and subsequent CI closure remain pending.

## Exact assessed subject

Source: `4805da7edb746b955ab4efd04012fb01b4a959dd`. Execution fingerprint: `sha256:0c1a93a688ce84661656de6dd3ae45de661521a6a368f26e4c326e54802489f9`. Normalized runtime: `sha256:1c7fc5fd4df187a3571460bf807e860f1be6bfd704c3fd9fe037c641adea5340`. Hosted diagnostic proof [45922796941](https://github.com/anton-asnitsky/StockSense/actions/runs/45922796941), lanes 1 and 2. The coordinator's independent review matched all exact 34 finding fields to the historical assessment. This diagnostic run is not a claim of green PR CI.

### Lane 1

- Image: `sha256:100c3fdb47a0397f7ea308984a1bf62e336efc39290333cca397cfec08cdece9`
- SBOM: `sha256:fd88d72ddc0423fb4a1b53203744df912a041b3c49e4b7b5364adba861a17e29`
- Normalized scan: `sha256:4882f03300a2012894d2a5828cb056b0ffa34c970f82e5f15a7dbae2ea57c912`
- Raw scan: `sha256:13d26dc28df20f5f7a3fe2b207ab7dd61d9c20a641036cf28272b02226f4fb72`
- Raw database status evidence: `sha256:6b4e66db9d3f69837170ad6a1e145580f70b013b6a67a80f1b458da52fbd0805`
- Rootfs export: `sha256:1378db13f8ce7bf232e0833efae35542585f377c942cdd0d45943135ad6af32a`

### Lane 2

- Image: `sha256:ba83670e9ff0d2ed1f7a655670d15a29b2e5ab1fcc6fb134670f0675027a0b2f`
- SBOM: `sha256:86c2026b0f55be1dbaa592f97d59456d11c37f210e949446f963aea4a8eab97c`
- Normalized scan: `sha256:7bbf466a5f0d01afd3d6057720e077ba89b93090f5859be42622e9ed546284c4`
- Raw scan: `sha256:2ef2757335a23aaff584642ce102c21e1f090b7ee3fb72ac871c83f16ff8b3cb`
- Raw database status evidence: `sha256:6b4e66db9d3f69837170ad6a1e145580f70b013b6a67a80f1b458da52fbd0805`
- Rootfs export: `sha256:7ed080db71c6ffd49859d96c63b03a9622c056dc505b7a703bd6a40905145876`

Scanner: `ghcr.io/anchore/grype@sha256:e4a44ef45d285b829ce6efe2642980329661bd2d18eab5fc539138d4adaebbbe`. Both database records: schema `v6.1.10`, built `2026-11-26T06:22:34Z`, status valid; source `https://grype.anchore.io/databases/v6/vulnerability-db_v6.1.10_2026-11-25T17:53:22Z_1795674154.tar.zst?checksum=sha256%3A2e9c096bc66d4a8b766ee2d228230440ecd34c5d59714fc92a334cb8567da2c2`. Database archive checksum is the checksum in that URL, distinct from the raw database-status JSON digest. Raw receipts bind scan/database evidence to the exact source, image and SBOM.

## Actual payload checks and limits

Using candidate4805's bounded container-tar parser, this assessment directly read both hosted kiota-rootfs.tar archives without executing or extracting their contents. Each has 1,775 entries, deep-equal by every field to its recorded runtime entries. No genrb, libcrypt/libxcrypt, gconv directory or UHC/ISO-2022-CN-EXT/IBM1390/IBM1399 module appears. Present libc, libssl, libcrypto and ICU object paths and hashes are retained. Missing openssl CLI is deliberately not used to suppress library findings. No Docker build or image mutation was needed.

Reproduction: run `.local-data/u1-ci-kiota/refresh-2026-11-27/check-fresh-payload.mjs` with verified Node24.22.3. Result `fresh-payload-checks.json` SHA256 `sha256:66529cb9eb9ae62821a75799bb0df73bbf31c692c9095555972ea2e7674dd33a`. A complete path/hash inventory is stronger than a missing executable check, but not exhaustive proof that no third-party assembly statically embeds similar code.

Primary references and refreshed authenticated package evidence are in [the runtime assessment](u1-ci-kiota-runtime-2026-11-26.md), November27 addendum: all21 Ubuntu status tables unchanged; all3 OpenSSL advisory texts unchanged; signed Noble security/updates indexes offer no newer affected package bytes. Relevant sources: [OpenSSL Nov10](https://openssl-library.org/news/secadv/20261110.txt), [Nov17](https://openssl-library.org/news/secadv/20261117.txt), [Nov24](https://openssl-library.org/news/secadv/20261124.txt), [ICU genrb fix](https://github.com/unicode-org/icu/commit/2c667e31cfd0b6bb1923627a932fd3453a5bac77), [glibc NEWS](https://raw.githubusercontent.com/bminor/glibc/glibc-2.39/NEWS), [conversion mapping](https://raw.githubusercontent.com/bminor/glibc/glibc-2.39/iconvdata/gconv-modules-extra.conf), [module build rules](https://raw.githubusercontent.com/bminor/glibc/glibc-2.39/iconvdata/Makefile).

## Proposed decision bounds

**NA** below means a proposed finding-specific non-applicability decision, not an approved exception. Recommend at most seven days from an eventual explicit owner decision and never beyond 2026-12-10T00:00:00Z; if decided November27, recommend 2026-12-04T00:00:00Z or earlier. **Temporary risk** recommends at most72 hours from decision, and for a November27 decision no later than 2026-11-30T00:00:00Z. Use the earlier limit. Mandatory recheck at vendor/package updates, including the announced December1 OpenSSL release. Do not extend an expired decision implicitly.

All rows inherit only the observed fixed Kiota1.38.0 invocation: network none, non-root, dropped capabilities, no-new-privileges, read-only root, bounded writable mounts, 128PIDs, source1MiB/package32MiB, process2GiB and120-second cleanup. Changes to package/runtime/execution/finding identity invalidate a decision. Unknown or fixed High/Critical findings are refused, not eligible for these proposals. Each eventual decision requires current exact PR candidate bindings, independent review and the owner's explicit response. Decline or unresolved evidence means U1 remains blocked.

## Frozen PR candidate bindings

Source: `.local-data/u1-ci-per-pr-candidates/final-pr-bindings.json`, SHA256 `54107ce6ae5fbc8730fecb2400fcee3ce72828bb65e137ffde515436df17f3d2`, computed 2026-11-27T02:05:30.847Z. All rows share base `402ace3b195c291a756ed230a24a73199ef8349a`. Head and test-merge trees match within each row; parent order was verified. These are diagnostic bindings, not an operative ledger.

| PR | Head | Test merge | Tested tree | Candidate tree digest | Execution fingerprint |
|---|---|---|---|---|---|
| #74 | `cf83316fa3b63b5cf1e3d730b172212fe8a8ee58` | `e4a464ab38831f0e5f9d399b102f96cd127a671e` | `bad2e5fc922d92028b9a51c12d7d6e189d911e58` | `sha256:1b15122ba01caa63d35aef6fd9e95abdd9fadd055d7ae90516586c2687bdcad2` | `sha256:0c1a93a688ce84661656de6dd3ae45de661521a6a368f26e4c326e54802489f9` |
| #75 | `a186e332345678268713ae63bd09ba40dd2af7df` | `502379759cfc5698307d5b6788e5959d0a3ed875` | `6ec28c8b14e4a367c3521309cd351ceeef7579c1` | `sha256:29f2fc7c7255a85dc57b4b4426c256b62dc0c083df7d81445ef22799784df37c` | `sha256:6d197e6749e73469c0944ebdbfade4f6668726e092801fe8ea02d4794a6796ef` |
| #76 | `20b42a9c7ef344095552925ebbf6df7ce6c5f1cd` | `7ba906cfbbaf386820eb4c8fa97cfcfdb2d16a89` | `bad2e5fc922d92028b9a51c12d7d6e189d911e58` | `sha256:1b15122ba01caa63d35aef6fd9e95abdd9fadd055d7ae90516586c2687bdcad2` | `sha256:0c1a93a688ce84661656de6dd3ae45de661521a6a368f26e4c326e54802489f9` |

PR #75 has a distinct execution fingerprint (`sha256:6d197e6749e73469c0944ebdbfade4f6668726e092801fe8ea02d4794a6796ef`); it must not inherit the 4805/PR74/PR76 execution identity. The ordinary per-PR image/SBOM/scan/database identities are now verified in the addendum below. The two hosted 4805 lanes remain supplemental diagnostic evidence. Any changed head/base/test merge/tree/execution or findings requires rebinding and review before an owner decision is operationalized.

## Per-row proposals

The following34 rows preserve exact advisory, package, version, PURL, severity and fix state. All fixVersions arrays are empty; no row is asserted fixed. Sixteen upstream version-exclusion rows propose NA. Eighteen rows explicitly require temporary-risk decisions: the five affected-object/module absence rows are now mitigation evidence only because complete binary/build-link exclusion was not established, and thirteen further rows lack complete native-call exclusion. This revision resolves the reviewer's major finding by withdrawing all five absence-based NA proposals.

### 1. CVE-2026-124709 / libssl3t64

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **NA proposal — upstream excludes OpenSSL 3.0**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-12-04T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Mitigation and uncertainty: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-124709); retained primary source references and payload checks above.

### 2. CVE-2026-124709 / openssl

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **NA proposal — upstream excludes OpenSSL 3.0**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-12-04T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Mitigation and uncertainty: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-124709); retained primary source references and payload checks above.

### 3. CVE-2026-107494 / libssl3t64

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **NA proposal — upstream excludes OpenSSL 3.0**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-12-04T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Mitigation and uncertainty: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-107494); retained primary source references and payload checks above.

### 4. CVE-2026-107494 / openssl

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **NA proposal — upstream excludes OpenSSL 3.0**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-12-04T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Mitigation and uncertainty: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-107494); retained primary source references and payload checks above.

### 5. CVE-2026-121481 / libssl3t64

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **Temporary-risk proposal**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-11-30T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: Near-INT_MAX EVP_EncodeBlock size can overflow; input bounds alone do not prove every native intermediate encoding size.
- Mitigation and uncertainty: 1 MiB source/32 MiB package bounds, 2 GiB memory and timeout reduce exposure; retain uncertainty about native intermediates. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-121481); retained primary source references and payload checks above.

### 6. CVE-2026-121481 / openssl

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **Temporary-risk proposal**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-11-30T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: Near-INT_MAX EVP_EncodeBlock size can overflow; input bounds alone do not prove every native intermediate encoding size.
- Mitigation and uncertainty: 1 MiB source/32 MiB package bounds, 2 GiB memory and timeout reduce exposure; retain uncertainty about native intermediates. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-121481); retained primary source references and payload checks above.

### 7. CVE-2026-121482 / libssl3t64

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **NA proposal — upstream excludes OpenSSL 3.0**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-12-04T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Mitigation and uncertainty: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-121482); retained primary source references and payload checks above.

### 8. CVE-2026-84786 / libssl3t64

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **Temporary-risk proposal**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-11-30T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: DANE-enabled TLS client trigger; actual offline invocation blocks external connectivity, but complete absence of native DANE calls is not proven.
- Mitigation and uncertainty: Network none, no host networking or sockets, fixed input/profile and isolated process; do not claim package immunity. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-84786); retained primary source references and payload checks above.

### 9. CVE-2026-121482 / openssl

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **NA proposal — upstream excludes OpenSSL 3.0**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-12-04T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Mitigation and uncertainty: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-121482); retained primary source references and payload checks above.

### 10. CVE-2026-84786 / openssl

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **Temporary-risk proposal**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-11-30T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: DANE-enabled TLS client trigger; actual offline invocation blocks external connectivity, but complete absence of native DANE calls is not proven.
- Mitigation and uncertainty: Network none, no host networking or sockets, fixed input/profile and isolated process; do not claim package immunity. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-84786); retained primary source references and payload checks above.

### 11. CVE-2026-95692 / libssl3t64

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **NA proposal — upstream excludes OpenSSL 3.0**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-12-04T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Mitigation and uncertainty: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-95692); retained primary source references and payload checks above.

### 12. CVE-2026-95692 / openssl

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **NA proposal — upstream excludes OpenSSL 3.0**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-12-04T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Mitigation and uncertainty: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-95692); retained primary source references and payload checks above.

### 13. CVE-2026-126765 / libc6

- Exact identity: version `2.39-0ubuntu8.12`; type `deb`; PURL `pkg:deb/ubuntu/libc6@2.39-0ubuntu8.12?arch=amd64&distro=ubuntu-24.04&upstream=glibc`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **Temporary-risk proposal**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-11-30T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: glob allocation-failure double free remains potentially reachable; fixed paths do not prove native glob absence.
- Mitigation and uncertainty: Keep fixed paths and isolated disposable process; timeout/memory controls bound consequences but memory pressure may trigger failure. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-126765); retained primary source references and payload checks above.

### 14. CVE-2026-100290 / libc6

- Exact identity: version `2.39-0ubuntu8.12`; type `deb`; PURL `pkg:deb/ubuntu/libc6@2.39-0ubuntu8.12?arch=amd64&distro=ubuntu-24.04&upstream=glibc`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **Temporary-risk proposal**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-11-30T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: POSIX regcomp/regexec allocation-failure cleanup remains potentially reachable in native dependencies; no complete native-call proof.
- Mitigation and uncertainty: 120-second timeout and 2 GiB bound limit effects, but memory pressure can trigger the bug; retain process isolation and reviewed input. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-100290); retained primary source references and payload checks above.

### 15. CVE-2026-121758 / libc6

- Exact identity: version `2.39-0ubuntu8.12`; type `deb`; PURL `pkg:deb/ubuntu/libc6@2.39-0ubuntu8.12?arch=amd64&distro=ubuntu-24.04&upstream=glibc`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **Temporary-risk proposal — payload absence is mitigation only**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-11-30T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: Complete binary/build-link exclusion has not been established. The following absence evidence reduces exposure but does not prove non-applicability: Upstream glibc maps ISO-2022-CN-EXT to a separate module; both payloads lack gconv and ISO-2022-CN-EXT.so.
- Mitigation and uncertainty: Retain immutable filesystem/no network/no additional mounts; do not generalize to other libc conversion routines. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-121758); retained primary source references and payload checks above.

### 16. CVE-2026-124024 / libc6

- Exact identity: version `2.39-0ubuntu8.12`; type `deb`; PURL `pkg:deb/ubuntu/libc6@2.39-0ubuntu8.12?arch=amd64&distro=ubuntu-24.04&upstream=glibc`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **Temporary-risk proposal — payload absence is mitigation only**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-11-30T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: Complete binary/build-link exclusion has not been established. The following absence evidence reduces exposure but does not prove non-applicability: Upstream glibc builds IBM1390/1399 conversions as separate modules; both payloads lack gconv and IBM1390.so/IBM1399.so.
- Mitigation and uncertainty: Retain immutable filesystem/no network/no additional mounts; source evidence and payload absence are not an exhaustive static call graph. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-124024); retained primary source references and payload checks above.

### 17. CVE-2026-121757 / libc6

- Exact identity: version `2.39-0ubuntu8.12`; type `deb`; PURL `pkg:deb/ubuntu/libc6@2.39-0ubuntu8.12?arch=amd64&distro=ubuntu-24.04&upstream=glibc`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **Temporary-risk proposal — payload absence is mitigation only**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-11-30T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: Complete binary/build-link exclusion has not been established. The following absence evidence reduces exposure but does not prove non-applicability: Upstream glibc maps CP949 to the separate UHC gconv module; both payloads lack gconv and UHC.so.
- Mitigation and uncertainty: Retain immutable filesystem/no network/no additional mounts; a custom embedded conversion implementation was not exhaustively disproved. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-121757); retained primary source references and payload checks above.

### 18. CVE-2026-107496 / libssl3t64

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **Temporary-risk proposal**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-11-30T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: OpenSSL 3.0 is affected by CMS encryption with abnormal EC group order; absence of CMS calls is not proven.
- Mitigation and uncertainty: No intended CMS encryption input, no network, 120-second kill/cleanup and resource limits bound denial-of-service impact. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-107496); retained primary source references and payload checks above.

### 19. CVE-2026-107496 / openssl

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **Temporary-risk proposal**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-11-30T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: OpenSSL 3.0 is affected by CMS encryption with abnormal EC group order; absence of CMS calls is not proven.
- Mitigation and uncertainty: No intended CMS encryption input, no network, 120-second kill/cleanup and resource limits bound denial-of-service impact. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-107496); retained primary source references and payload checks above.

### 20. CVE-2026-95690 / libssl3t64

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **Temporary-risk proposal**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-11-30T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: DTLS fragment buffering trigger; offline invocation reduces practical exposure, but no exhaustive proof excludes internally constructed DTLS data.
- Mitigation and uncertainty: Network none, fixed contract input, timeout/cleanup and memory bounds; source-level no-DTLS intent is not a full call graph. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-95690); retained primary source references and payload checks above.

### 21. CVE-2026-95690 / openssl

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **Temporary-risk proposal**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-11-30T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: DTLS fragment buffering trigger; offline invocation reduces practical exposure, but no exhaustive proof excludes internally constructed DTLS data.
- Mitigation and uncertainty: Network none, fixed contract input, timeout/cleanup and memory bounds; source-level no-DTLS intent is not a full call graph. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-95690); retained primary source references and payload checks above.

### 22. CVE-2026-115819 / libc6

- Exact identity: version `2.39-0ubuntu8.12`; type `deb`; PURL `pkg:deb/ubuntu/libc6@2.39-0ubuntu8.12?arch=amd64&distro=ubuntu-24.04&upstream=glibc`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **Temporary-risk proposal**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-11-30T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: Specific wide-scanf conversion overflow remains potentially reachable; absence of a CLI does not exclude libc calls.
- Mitigation and uncertainty: Fixed generation profile, bounded source input, non-root/no capabilities/read-only filesystem limit exposure and impact, not memory-corruption possibility. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-115819); retained primary source references and payload checks above.

### 23. CVE-2026-95691 / libssl3t64

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **NA proposal — upstream excludes OpenSSL 3.0**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-12-04T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Mitigation and uncertainty: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-95691); retained primary source references and payload checks above.

### 24. CVE-2026-95691 / openssl

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **NA proposal — upstream excludes OpenSSL 3.0**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-12-04T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Mitigation and uncertainty: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-95691); retained primary source references and payload checks above.

### 25. CVE-2026-88823 / libssl3t64

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **NA proposal — upstream excludes OpenSSL 3.0**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-12-04T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Mitigation and uncertainty: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-88823); retained primary source references and payload checks above.

### 26. CVE-2026-88823 / openssl

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **NA proposal — upstream excludes OpenSSL 3.0**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-12-04T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Mitigation and uncertainty: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-88823); retained primary source references and payload checks above.

### 27. CVE-2026-35190 / libssl3t64

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **NA proposal — upstream excludes OpenSSL 3.0**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-12-04T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Mitigation and uncertainty: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-35190); retained primary source references and payload checks above.

### 28. CVE-2026-35190 / openssl

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **NA proposal — upstream excludes OpenSSL 3.0**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-12-04T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Mitigation and uncertainty: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-35190); retained primary source references and payload checks above.

### 29. CVE-2026-88822 / libssl3t64

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **NA proposal — upstream excludes OpenSSL 3.0**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-12-04T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Mitigation and uncertainty: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-88822); retained primary source references and payload checks above.

### 30. CVE-2026-88822 / openssl

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **NA proposal — upstream excludes OpenSSL 3.0**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-12-04T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Mitigation and uncertainty: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-88822); retained primary source references and payload checks above.

### 31. CVE-2016-20013 / libc6

- Exact identity: version `2.39-0ubuntu8.12`; type `deb`; PURL `pkg:deb/ubuntu/libc6@2.39-0ubuntu8.12?arch=amd64&distro=ubuntu-24.04&upstream=glibc`; severity **Negligible**; fix state `wont-fix`; fix versions `[]`.
- Proposed route: **Temporary-risk proposal — payload absence is mitigation only**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-11-30T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: Complete binary/build-link exclusion has not been established. The following absence evidence reduces exposure but does not prove non-applicability: glibc 2.39 removed libcrypt; both complete payloads lack libcrypt/libxcrypt. No corresponding library file was found, but statically embedded implementation has not been excluded.
- Mitigation and uncertainty: Preserve exact payload and prohibit adding crypt providers; absence inspection does not exhaustively rule out embedded third-party implementations. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2016-20013); retained primary source references and payload checks above.

### 32. CVE-2025-5222 / libicu74

- Exact identity: version `74.2-1ubuntu3.1`; type `deb`; PURL `pkg:deb/ubuntu/libicu74@74.2-1ubuntu3.1?arch=amd64&distro=ubuntu-24.04&upstream=icu`; severity **Low**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **Temporary-risk proposal — payload absence is mitigation only**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-11-30T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: Complete binary/build-link exclusion has not been established. The following absence evidence reduces exposure but does not prove non-applicability: Official ICU corrective commit changes only tools/genrb/parse.cpp; both complete payloads lack genrb. ICU runtime libraries remain present and are not declared fixed.
- Mitigation and uncertainty: Keep build tools out of runtime and retain exact inventory; this is a tool-specific conclusion, not package-wide immunity. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2025-5222); retained primary source references and payload checks above.

### 33. CVE-2026-107493 / libssl3t64

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **Temporary-risk proposal**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-11-30T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: OpenSSL 3.0 is affected by caller-supplied non-null PEM X509_INFO stack reuse; native PEM call paths are not fully proven absent.
- Mitigation and uncertainty: No intentional attacker PEM input; fixed reviewed contracts, no network and isolated process reduce exposure. libcrypto remains present. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-107493); retained primary source references and payload checks above.

### 34. CVE-2026-107493 / openssl

- Exact identity: version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Proposed route: **Temporary-risk proposal**. Owner: anton-asnitsky. Decision: **not recorded**. Expiry: **2026-11-30T00:00:00Z** (proposed only), subject to earlier bounds above.
- Rationale: OpenSSL 3.0 is affected by caller-supplied non-null PEM X509_INFO stack reuse; native PEM call paths are not fully proven absent.
- Mitigation and uncertainty: No intentional attacker PEM input; fixed reviewed contracts, no network and isolated process reduce exposure. libcrypto remains present. Common invocation restrictions above remain mandatory.
- Evidence: both exact lane bindings above; [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-107493); retained primary source references and payload checks above.


## Ordinary per-PR evidence binding — November 27, 2026

This addendum supersedes earlier pending-artifact statements. Production verification at `2026-11-27T04:08:10.727Z` is retained in `.local-data/u1-ci-closure-ordinary-2026-11-27/verification.json`, digest `sha256:97e9af61b7db449c0199157a23df4d4c2cfeaf03d6eec0beb9f4e998c44635d7`. This assessment independently checked every retained normalized scan and SBOM hash, raw scan/database receipt hash, exact source test-merge and image identity, and all34 exact Kiota finding fields against the assessed set. All three validator scans contain zero findings; all three Kiota scans contain the same34 unresolved rows. Normalized Kiota runtime remains `sha256:1c7fc5fd4df187a3571460bf807e860f1be6bfd704c3fd9fe037c641adea5340`. This proves evidence consistency, not green CI or accepted findings.

Concrete proposed expiries for every row: **2026-11-30T00:00:00Z for the18 temporary-risk rows; 2026-12-04T00:00:00Z for the16 version-based NA rows**. As of November27 these are within72 hours/seven days respectively and before the December10 sunset. Owner anton-asnitsky has not approved either disposition. Expired proposals cannot be used; later decision timing never extends these absolute timestamps automatically.

### PR #74 ordinary run 45925886026

[GitHub Actions evidence](https://github.com/anton-asnitsky/StockSense/actions/runs/45925886026). Head `cf83316fa3b63b5cf1e3d730b172212fe8a8ee58`; exact test-merge/source `e4a464ab38831f0e5f9d399b102f96cd127a671e`; candidate tree digest `sha256:1b15122ba01caa63d35aef6fd9e95abdd9fadd055d7ae90516586c2687bdcad2`; execution `sha256:0c1a93a688ce84661656de6dd3ae45de661521a6a368f26e4c326e54802489f9`.

| Binding | Validator | Kiota |
|---|---|---|
| imageId | `sha256:4c50fa0fe7bf0d17de21ee8ce42762e896c0559c18d093a5358407567db84b2d` | `sha256:da2f3c6fa6d301a4b52b72132c6939e191b83290630a520c1d0b03077bd774ba` |
| sbomDigest | `sha256:2e7ce07dea653d9186ec0bf991ef71c3ac899ab00a0dfedd30276eccb20d0662` | `sha256:77d5a4d5c0f03fb1347746184ca568f5f3641525f719fce3d33f2831d34950a3` |
| scanDigest | `sha256:0afe15d4d4b80f31203171df967a45e04d1458b6ed72d375b8a2fa93eefc9ce1` | `sha256:3a7dfb7ac558c2b7a0a9dcf6fb45f9e45009a31988f274b78b16462e4d8b9d36` |
| rawScanDigest | `sha256:a9cad824bbceb045d9770e8a98606abb8b486666be5632bbd4da3fabf6a6247b` | `sha256:5d99553a11a8daac49413bef2152c26b5334e8d645c64228ee917f2ddd75f1c6` |
| rawDatabaseDigest | `sha256:6b4e66db9d3f69837170ad6a1e145580f70b013b6a67a80f1b458da52fbd0805` | `sha256:6b4e66db9d3f69837170ad6a1e145580f70b013b6a67a80f1b458da52fbd0805` |
| receiptDigest | `sha256:8106eb57aadfeb76206c07ace16464591bf020c4eafdcf32c17da001f8978187` | `sha256:8653dc25a7ec01f215c6a42e1dbc5e28fa090b4e761f0fefc8030908f676993e` |

Kiota runtime evidence JSON digest: `sha256:5af35c1d406a63b66fa09373c73b15a63394bf23964c3d29a1381930525f0fb9` (distinct from normalized runtime digest).

validator scanner `ghcr.io/anchore/grype@sha256:e4a44ef45d285b829ce6efe2642980329661bd2d18eab5fc539138d4adaebbbe`; database schema `v6.1.10`, built `2026-11-26T06:22:34Z`, status `valid`, archive source `https://grype.anchore.io/databases/v6/vulnerability-db_v6.1.10_2026-11-25T17:53:22Z_1795674154.tar.zst?checksum=sha256%3A2e9c096bc66d4a8b766ee2d228230440ecd34c5d59714fc92a334cb8567da2c2`.

kiota scanner `ghcr.io/anchore/grype@sha256:e4a44ef45d285b829ce6efe2642980329661bd2d18eab5fc539138d4adaebbbe`; database schema `v6.1.10`, built `2026-11-26T06:22:34Z`, status `valid`, archive source `https://grype.anchore.io/databases/v6/vulnerability-db_v6.1.10_2026-11-25T17:53:22Z_1795674154.tar.zst?checksum=sha256%3A2e9c096bc66d4a8b766ee2d228230440ecd34c5d59714fc92a334cb8567da2c2`.

### PR #75 ordinary run 45925886385

[GitHub Actions evidence](https://github.com/anton-asnitsky/StockSense/actions/runs/45925886385). Head `a186e332345678268713ae63bd09ba40dd2af7df`; exact test-merge/source `502379759cfc5698307d5b6788e5959d0a3ed875`; candidate tree digest `sha256:29f2fc7c7255a85dc57b4b4426c256b62dc0c083df7d81445ef22799784df37c`; execution `sha256:6d197e6749e73469c0944ebdbfade4f6668726e092801fe8ea02d4794a6796ef`.

| Binding | Validator | Kiota |
|---|---|---|
| imageId | `sha256:fe43a63feb941c4060fcf59fd61cdecb016b34d22e658e74082ade696b922e69` | `sha256:14293f020ab4a97ff682fc07601b9279a4029079b5758dfbefee6c7c22e90a19` |
| sbomDigest | `sha256:45d4b7f1cbe89a7c54748d0976edb04aa2553cc4560f4be85b26d59ba3dbad6a` | `sha256:6591ec96a2bd5eed1efa62ddd1f378a86f0dbbe0b89e65a370c0b074ec94680a` |
| scanDigest | `sha256:ef7af8c79a2e10853f6ca5f17b555291f39695db3c7ba795289245ec2b04cd75` | `sha256:e1112b88c6f5a5480387d0645aa0cb39273960f0f3f1ae761cc920a43fddc2fe` |
| rawScanDigest | `sha256:ccdef8a2618bd17b8bffbbec62227323e776386a91a534847efdb0f8dd6321b6` | `sha256:33254a1588c10d5b8d91be59b5ec455082ce7a3888569550452bc8d53cb9ce25` |
| rawDatabaseDigest | `sha256:6b4e66db9d3f69837170ad6a1e145580f70b013b6a67a80f1b458da52fbd0805` | `sha256:6b4e66db9d3f69837170ad6a1e145580f70b013b6a67a80f1b458da52fbd0805` |
| receiptDigest | `sha256:0d9ec4d87cd899d1995c3fa8ce76a55b980c3764d212213de6f9340d2b6a3a06` | `sha256:b221327a8a2405e80961bb17145484b57997bb546246d9a18fa012cd6b379e35` |

Kiota runtime evidence JSON digest: `sha256:d3e878b64115d1cfe3735e057a62b1a84a1c15c2d9534761d9b47f0c668c4721` (distinct from normalized runtime digest).

validator scanner `ghcr.io/anchore/grype@sha256:e4a44ef45d285b829ce6efe2642980329661bd2d18eab5fc539138d4adaebbbe`; database schema `v6.1.10`, built `2026-11-26T06:22:34Z`, status `valid`, archive source `https://grype.anchore.io/databases/v6/vulnerability-db_v6.1.10_2026-11-25T17:53:22Z_1795674154.tar.zst?checksum=sha256%3A2e9c096bc66d4a8b766ee2d228230440ecd34c5d59714fc92a334cb8567da2c2`.

kiota scanner `ghcr.io/anchore/grype@sha256:e4a44ef45d285b829ce6efe2642980329661bd2d18eab5fc539138d4adaebbbe`; database schema `v6.1.10`, built `2026-11-26T06:22:34Z`, status `valid`, archive source `https://grype.anchore.io/databases/v6/vulnerability-db_v6.1.10_2026-11-25T17:53:22Z_1795674154.tar.zst?checksum=sha256%3A2e9c096bc66d4a8b766ee2d228230440ecd34c5d59714fc92a334cb8567da2c2`.

### PR #76 ordinary run 45925886242

[GitHub Actions evidence](https://github.com/anton-asnitsky/StockSense/actions/runs/45925886242). Head `20b42a9c7ef344095552925ebbf6df7ce6c5f1cd`; exact test-merge/source `7ba906cfbbaf386820eb4c8fa97cfcfdb2d16a89`; candidate tree digest `sha256:1b15122ba01caa63d35aef6fd9e95abdd9fadd055d7ae90516586c2687bdcad2`; execution `sha256:0c1a93a688ce84661656de6dd3ae45de661521a6a368f26e4c326e54802489f9`.

| Binding | Validator | Kiota |
|---|---|---|
| imageId | `sha256:48121336c85dfdd4372b70ea2d44083644d58e6d4d8574c0ed5a13fc99ee4c44` | `sha256:cd705b343a1981b490f5fd3e4ae8a99568cd1678d11b09a6c1ca85647eae4f49` |
| sbomDigest | `sha256:eeadc97b8a2185ac852151beabd1c58b26f4f7f3779b248f2036d22204828274` | `sha256:5fb43bc6a033bff8e88c2a82dd9db2c859ecc1104d70602693e0bba23b878a4c` |
| scanDigest | `sha256:08031d36aa89ad6e732a639843ac03ad30665e4abf725459587fa4a7c6538353` | `sha256:522b4120082277e1f3c9f9736922c13f722b518a12f2fbc3c6826b8e2daa8c1e` |
| rawScanDigest | `sha256:d0b0c2f38ce9d1dc78d42cab026552be01ffc7641b09838754f8dc340a9aaa7d` | `sha256:b643ce8deaa5f4caaee0c3faa930cc08de6ad9d2ebfb4a794f0040c8c28bda55` |
| rawDatabaseDigest | `sha256:6b4e66db9d3f69837170ad6a1e145580f70b013b6a67a80f1b458da52fbd0805` | `sha256:6b4e66db9d3f69837170ad6a1e145580f70b013b6a67a80f1b458da52fbd0805` |
| receiptDigest | `sha256:fd4206df1393791b5e884cbc47d6eef089c7a760fa75ddb33eaff7db37ad730c` | `sha256:72d9ae8f77d52f1998d08b58b5f51836a4a5c98fb959e062d34eb9e656b05d3a` |

Kiota runtime evidence JSON digest: `sha256:f4ee18690b2c4857e8d8ae177e0330978c9c06dbebcaacdcc4a771d14a41d552` (distinct from normalized runtime digest).

validator scanner `ghcr.io/anchore/grype@sha256:e4a44ef45d285b829ce6efe2642980329661bd2d18eab5fc539138d4adaebbbe`; database schema `v6.1.10`, built `2026-11-26T06:22:34Z`, status `valid`, archive source `https://grype.anchore.io/databases/v6/vulnerability-db_v6.1.10_2026-11-25T17:53:22Z_1795674154.tar.zst?checksum=sha256%3A2e9c096bc66d4a8b766ee2d228230440ecd34c5d59714fc92a334cb8567da2c2`.

kiota scanner `ghcr.io/anchore/grype@sha256:e4a44ef45d285b829ce6efe2642980329661bd2d18eab5fc539138d4adaebbbe`; database schema `v6.1.10`, built `2026-11-26T06:22:34Z`, status `valid`, archive source `https://grype.anchore.io/databases/v6/vulnerability-db_v6.1.10_2026-11-25T17:53:22Z_1795674154.tar.zst?checksum=sha256%3A2e9c096bc66d4a8b766ee2d228230440ecd34c5d59714fc92a334cb8567da2c2`.

Per-PR binding extraction and assertions are retained in `.local-data/u1-ci-kiota/refresh-2026-11-27/ordinary-bindings.json`, digest `sha256:9c1b8b3e65158f30bf35edcc2fd4a1e907dee1f0e037f7d4c3e2e1160a978e16`. PR75 keeps its distinct execution identity. Every one of the34 proposals binds separately to each exact Kiota image and evidence column above; none transfers to a changed head, base, test merge, runtime, package, execution or finding set. Route counts remain16 version-based NA /18 temporary risk. No operative ledger, owner decision, merge, U1 acceptance, C01 release or gate advancement is created.
