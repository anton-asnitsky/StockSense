# U1 policy-repair renewed finding-binding proposal — November 27, 2026

**Preparation only. No renewed owner finding decision or operative ledger.** The reviewed policy repair changes CI authority consumption and execution fingerprints. Prior finding decisions do not automatically transfer, even though the runtime and generation invocation remain unchanged. The owner-approved verification deviation authorizes rollout only; it does not renew risk decisions. Fresh ordinary per-PR source/test-merge/raw/SBOM/runtime evidence is now bound in the final addendum; independent review of these exact proposal bytes remains required before the owner question. No expiry extension is proposed.

## Frozen proposed candidate bindings

| PR | Proposed head | Git tree | Candidate digest | Execution fingerprint |
|---|---|---|---|---|
| 74 | `a9f44242e3428bb163509357ac2038e9c76ee35e` | `20ad87f9e74eaf96608870cf44138b5f6c7d4d96` | `sha256:9bbf8d4db9eb12eaffa4c133825ae90df2c81d3e56c6acf8ead1e6d538ecdc1d` | `sha256:e558f16701a94dd0502d98fddb59d58b6dbcb11a4ea175913e5eb9635fbbe545` |
| 75 | `8861ef6de43e96a876f4756064e571c3ffc251c2` | `d460d228127907a502384eb1ab410fc9beaa0d6b` | `sha256:8b99a6f8cd24577e0243a25c62628f3ac44e928ffd35ab65317d67cd987b5044` | `sha256:925634ae326c4b13b06650a4f7d304b0fd70b7acef8373bd508e99ec4497af91` |
| 76 | `c6fba14749b20b307fd8bb9d68cca9611fcb8afd` | `20ad87f9e74eaf96608870cf44138b5f6c7d4d96` | `sha256:9bbf8d4db9eb12eaffa4c133825ae90df2c81d3e56c6acf8ead1e6d538ecdc1d` | `sha256:e558f16701a94dd0502d98fddb59d58b6dbcb11a4ea175913e5eb9635fbbe545` |

PR75 remains a distinct execution group. Normalized runtime for both groups is `sha256:1c7fc5fd4df187a3571460bf807e860f1be6bfd704c3fd9fe037c641adea5340`. Ordinary new-head test-merge identities and artifacts are recorded in the final addendum and remain distinct from diagnostic source revisions.

## Control invariance and remaining risk

Git comparisons against the formerly approved heads show the same11 changed paths on all three candidates: required workflow, package unit-test command, policy CLI/authority adapter, evidence/SBOM consumers and their tests/fixtures. Dockerfile.generator-kiota, build-kiota-image.mjs, bounded-generators.mjs, generators.mjs, preflight.mjs and pnpm-lock.yaml are unchanged. Package.json changes only the unit-test command; dependencies and generation profile remain unchanged. Source contract/input paths are absent from all three changed-path lists. The new consumer checks live PR authority and prevents changed-path default acceptance; this changes the authority boundary and therefore requires renewed binding.

The fixed Kiota1.38.0 generate profile retains network none, non-root, dropped capabilities, no-new-privileges, read-only root, bounded writable mounts,128PIDs,1MiB source/32MiB package,2GiB memory and120-second timeout/cleanup. These controls limit exposure and consequences; they do not prove native regex/scanf/glob/PEM/CMS/EVP/DANE/DTLS calls unreachable. Five implementation-absence cases remain temporary-risk decisions because binary/build-link exclusion was not fully established; no absence-based NA claim returns here. Memory pressure can trigger allocation-failure bugs, so resource caps are not a cure.

The original exact finding proposal753346d0 and subsequent two-row proposal64671762, their actual owner records, and immutable approval references below are historical evidence only. They are not authorization for these new execution fingerprints.

## Fresh package and vendor refresh

Refresh verified at `2026-11-27T19:17:16.183Z`. Both newly retrieved Noble InRelease files authenticate with Ubuntu2018 key `F6ECB3762474EDA9D21B7022871920D1991BC93C`; keyring SHA256 `sha256:5ebbeeb474034b1fa7e50abbe6f136e177fc826219e01f314b3623f7b3097e96`. Offline verification used `C:/Program Files/Git/usr/bin/gpgv.exe --homedir /d/Git/StockSense/.local-data/u1-ci-policy-renewed-findings/gnupg --keyring /d/Git/StockSense/.local-data/u1-ci-policy-renewed-findings/ubuntu-archive-key-2018.gpg <absolute-MSYS-InRelease-path>`. Both exit0 signature transcripts retained. Node24.22.3 refresh-index.mjs verifies compressed SHA256/length against signed entries.

- noble-security: signed Date `Fri, 27 Nov 2026  4:37:40 UTC`; InRelease SHA256 `a3849ffa5d069c5a6cc929dc55e1fd946aff6e3da4f97d88f20059b6b7d6d203`; Packages.gz SHA256 `d0eda781df4f6750c02d0157fa68baf3507fe1da876c5f7bd2c1d4f8c149e7f6`; no Valid-Until.
- noble-updates: signed Date `Fri, 27 Nov 2026  6:17:14 UTC`; InRelease SHA256 `10dc47ad967e0513d877e0d55621c7393568894c4dbba1049232251630cb43c7`; Packages.gz SHA256 `478fa07f243a3c3d46f8db24cf9f9f7e92f568833aaa203a421aebf51e0fd408`; no Valid-Until.

Versions/package hashes remain unchanged: libc6 `2.39-0ubuntu8.12` / `d821b41fc59cb4978ecd53bc83e5c964ac15d305c8d2ac4c8a35aebe55010fb9`; libicu74 `74.2-1ubuntu3.1` / `c9a70989678660eed9a1e904c74fa043da8bec8e2036856fc16e31ced79b04f8`; libssl3t64 `3.0.13-0ubuntu3.16` / `219f43b1cd836a4da550938db5fda93160d269d39a4edcf1f1ce698a470db797`; openssl same version / `675b84971ffd4467707008c25ef7520f90ea7c23ef27b7a76b0dccf1d7c4dc3f`. No genuine newer same-family fix was found. Runtime pins were not changed.

All22 fresh [Ubuntu CVE](https://ubuntu.com/security/cves) status tables match the retained previous tables. All three primary OpenSSL advisories remain byte-identical: [Nov10](https://openssl-library.org/news/secadv/20261110.txt), [Nov17](https://openssl-library.org/news/secadv/20261117.txt), [Nov24](https://openssl-library.org/news/secadv/20261124.txt). Nine CVEs explicitly exclude3.0 and support18 version-based NA proposals; supported affected upstream releases are scheduled December1, not evidence of an available Noble patch. Ubuntu Needs evaluation/not-fixed remain unresolved classifications. An initial request for CVE-2026-100290 timed out; bounded retry succeeded and all22 tables were compared. Retained vendor-status-comparison.json SHA256 `sha256:fe4171aeaf50f0b6cc5493e67c533ec03fc6fad723727ab52faea6eb983b0434`.

## Hosted diagnostic evidence

Both lanes of [C137 proof46006627434 attempt2](https://github.com/anton-asnitsky/StockSense/actions/runs/46006627434/attempts/2) and both lanes of [distinct PR75 proof46014352398](https://github.com/anton-asnitsky/StockSense/actions/runs/46014352398) have independently reviewed actual raw/SBOM/runtime evidence. This assessment rechecks all36 exact identities against each normalized scan and verifies SBOM/raw scan/database receipt hashes. These are diagnostic proofs, not ordinary PR CI or renewed authority receipts.

### Run 46006627434, lane 1

Source `c1375dcaa03bec40f7915a2117ad0614856579b3`; harness `3ae9df2e97b976ef4e3fe36a1756f77ba98106f1`.

| Binding | Value |
|---|---|
| imageId | `sha256:9f0c5b690a8d034e1709d6060bb353286670d7cc06e8c61910d3170ddda59f9d` |
| sbomDigest | `sha256:5f2fe919b50c4493219b799a113720ce81d9905b268581c98a5e3e128114a02a` |
| normalizedScanDigest | `sha256:4cb84faf73457a0b2fdab043c6e11adbed788cc11f57d8226ab52ba70c69a784` |
| scanDigest | `sha256:9870650a3caac6d684ca80a682115724a0fe0a20db939b9fde0c7d3a8a5b4541` |
| databaseDigest | `sha256:afc06074e938a8cb3a92823379c75446366f6023a0f2da34b500c8cbce3c8b44` |
| runtimeEvidenceDigest | `sha256:9eb642022acb89456fd08e91cb15e61f605967f930fc3e40b7925e409f5d1dc6` |
| runtimeManifestDigest | `sha256:1c7fc5fd4df187a3571460bf807e860f1be6bfd704c3fd9fe037c641adea5340` |

Raw scan receipt binds source `c1375dcaa03bec40f7915a2117ad0614856579b3`; DB schema `v6.1.10`, built `2026-11-27T06:22:11Z`, status `valid`, source `https://grype.anchore.io/databases/v6/vulnerability-db_v6.1.10_2026-11-27T00:21:50Z_1795760531.tar.zst?checksum=sha256%3Ab1f986487adf96493a3f0f2a11c1617ceb00f2a78fa3ee1a7ddbb42c2eb001cf`.

### Run 46006627434, lane 2

Source `c1375dcaa03bec40f7915a2117ad0614856579b3`; harness `3ae9df2e97b976ef4e3fe36a1756f77ba98106f1`.

| Binding | Value |
|---|---|
| imageId | `sha256:6ee0184c838e5d80511ba9186c6c1d4533d57cccad5bd59ef598303cc1b823b4` |
| sbomDigest | `sha256:446b0e1534dfe4de6fdd8e14af63db29bea4be3aa404bbe1057ef730e24abaae` |
| normalizedScanDigest | `sha256:2372289e90f8277efedc2a0cc714491f5deb1eec80b8a9705e08ea07c77cdfdc` |
| scanDigest | `sha256:c7af6ec56b17703a3ad0d21fd76459bbdba7146a2874b85f8f329af8b4e3d3f4` |
| databaseDigest | `sha256:afc06074e938a8cb3a92823379c75446366f6023a0f2da34b500c8cbce3c8b44` |
| runtimeEvidenceDigest | `sha256:460a7f1cec5b3ce0fce8d9f6ac9f23339a67c927c29643eca80939de40b93703` |
| runtimeManifestDigest | `sha256:1c7fc5fd4df187a3571460bf807e860f1be6bfd704c3fd9fe037c641adea5340` |

Raw scan receipt binds source `c1375dcaa03bec40f7915a2117ad0614856579b3`; DB schema `v6.1.10`, built `2026-11-27T06:22:11Z`, status `valid`, source `https://grype.anchore.io/databases/v6/vulnerability-db_v6.1.10_2026-11-27T00:21:50Z_1795760531.tar.zst?checksum=sha256%3Ab1f986487adf96493a3f0f2a11c1617ceb00f2a78fa3ee1a7ddbb42c2eb001cf`.

### Run 46014352398, lane 1

Source `8861ef6de43e96a876f4756064e571c3ffc251c2`; harness `1955118be67f12f87b56c75162e0fbf71f836a6b`.

| Binding | Value |
|---|---|
| imageId | `sha256:caa03a78eddafb4d83ef1cb280ce14dc62d7f30568a436b1a547966f65f267c5` |
| sbomDigest | `sha256:9b4dbee6d8c0ed5b06c3470e7458f548928958aa9f86ef99c03edff629316426` |
| normalizedScanDigest | `sha256:fed8067e5e7bc02ea2fcaeed62d59b61f131b16487cc4a430882440448a82646` |
| scanDigest | `sha256:6d7ffb51c20edff03e0e52c00d4cc5783e5f2ee1f4f12f56b92d180840595e80` |
| databaseDigest | `sha256:afc06074e938a8cb3a92823379c75446366f6023a0f2da34b500c8cbce3c8b44` |
| runtimeEvidenceDigest | `sha256:c46afe017866d4d931f775fb1c0fb023748080fa4a3529fcb2a8dd0bb14086fa` |
| runtimeManifestDigest | `sha256:1c7fc5fd4df187a3571460bf807e860f1be6bfd704c3fd9fe037c641adea5340` |

Raw scan receipt binds source `8861ef6de43e96a876f4756064e571c3ffc251c2`; DB schema `v6.1.10`, built `2026-11-27T06:22:11Z`, status `valid`, source `https://grype.anchore.io/databases/v6/vulnerability-db_v6.1.10_2026-11-27T00:21:50Z_1795760531.tar.zst?checksum=sha256%3Ab1f986487adf96493a3f0f2a11c1617ceb00f2a78fa3ee1a7ddbb42c2eb001cf`.

### Run 46014352398, lane 2

Source `8861ef6de43e96a876f4756064e571c3ffc251c2`; harness `1955118be67f12f87b56c75162e0fbf71f836a6b`.

| Binding | Value |
|---|---|
| imageId | `sha256:8a07aa012c5929885a98c9963fae6800f1c6e3ea8cc05590d460a3c564e32af8` |
| sbomDigest | `sha256:a3e372c2676fccad0b71c24ab81589d9001957eaabe956e2a545f1788e04180f` |
| normalizedScanDigest | `sha256:7de332b6cb8a883f89703e9319faba7116b294bf61740b918d21e4a73dbac903` |
| scanDigest | `sha256:31d019f2e6c3539c3b92102f07228b91e7e74412960d99879d017dae0823e213` |
| databaseDigest | `sha256:afc06074e938a8cb3a92823379c75446366f6023a0f2da34b500c8cbce3c8b44` |
| runtimeEvidenceDigest | `sha256:3e9e635b2801ec02ca06ea0e146697474fc57229eae11867037c7e280bdff66b` |
| runtimeManifestDigest | `sha256:1c7fc5fd4df187a3571460bf807e860f1be6bfd704c3fd9fe037c641adea5340` |

Raw scan receipt binds source `8861ef6de43e96a876f4756064e571c3ffc251c2`; DB schema `v6.1.10`, built `2026-11-27T06:22:11Z`, status `valid`, source `https://grype.anchore.io/databases/v6/vulnerability-db_v6.1.10_2026-11-27T00:21:50Z_1795760531.tar.zst?checksum=sha256%3Ab1f986487adf96493a3f0f2a11c1617ceb00f2a78fa3ee1a7ddbb42c2eb001cf`.

## Exact renewed per-finding proposals

Every row below applies separately to the two new execution groups, subject to final ordinary artifact binding. Owner: **anton-asnitsky**. Renewed decision: **absent** for every row. Fixed expiries remain **2026-12-04T00:00:00Z** for18 version-based NA rows and **2026-11-30T00:00:00Z** for18 temporary-risk rows. Earliest combined ledger/publication authority limit remains November30; no clock restarts or automatic extension. Unknown fix states and fixed High/Critical findings remain ineligible. Relevant identity/vendor changes invalidate any eventual decision.

### 1. CVE-2026-124709 / libssl3t64

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **version-based non-applicability**, expires **2026-12-04T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed finding-specific non-applicability; not a claim that the package is fixed. The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Controls: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-124709](https://ubuntu.com/security/CVE-2026-124709); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 2. CVE-2026-124709 / openssl

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **version-based non-applicability**, expires **2026-12-04T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed finding-specific non-applicability; not a claim that the package is fixed. The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Controls: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-124709](https://ubuntu.com/security/CVE-2026-124709); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 3. CVE-2026-107494 / libssl3t64

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **version-based non-applicability**, expires **2026-12-04T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed finding-specific non-applicability; not a claim that the package is fixed. The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Controls: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-107494](https://ubuntu.com/security/CVE-2026-107494); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 4. CVE-2026-107494 / openssl

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **version-based non-applicability**, expires **2026-12-04T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed finding-specific non-applicability; not a claim that the package is fixed. The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Controls: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-107494](https://ubuntu.com/security/CVE-2026-107494); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 5. CVE-2026-121481 / libssl3t64

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **temporary risk**, expires **2026-11-30T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed temporary risk; non-applicability is not proven. Near-INT_MAX EVP_EncodeBlock size can overflow; input bounds alone do not prove every native intermediate encoding size.
- Controls: 1 MiB source/32 MiB package bounds, 2 GiB memory and timeout reduce exposure; retain uncertainty about native intermediates. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-121481](https://ubuntu.com/security/CVE-2026-121481); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 6. CVE-2026-121481 / openssl

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **temporary risk**, expires **2026-11-30T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed temporary risk; non-applicability is not proven. Near-INT_MAX EVP_EncodeBlock size can overflow; input bounds alone do not prove every native intermediate encoding size.
- Controls: 1 MiB source/32 MiB package bounds, 2 GiB memory and timeout reduce exposure; retain uncertainty about native intermediates. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-121481](https://ubuntu.com/security/CVE-2026-121481); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 7. CVE-2026-121482 / libssl3t64

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **version-based non-applicability**, expires **2026-12-04T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed finding-specific non-applicability; not a claim that the package is fixed. The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Controls: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-121482](https://ubuntu.com/security/CVE-2026-121482); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 8. CVE-2026-84786 / libssl3t64

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **temporary risk**, expires **2026-11-30T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed temporary risk; non-applicability is not proven. DANE-enabled TLS client trigger; actual offline invocation blocks external connectivity, but complete absence of native DANE calls is not proven.
- Controls: Network none, no host networking or sockets, fixed input/profile and isolated process; do not claim package immunity. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-84786](https://ubuntu.com/security/CVE-2026-84786); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 9. CVE-2026-121482 / openssl

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **version-based non-applicability**, expires **2026-12-04T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed finding-specific non-applicability; not a claim that the package is fixed. The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Controls: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-121482](https://ubuntu.com/security/CVE-2026-121482); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 10. CVE-2026-84786 / openssl

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **temporary risk**, expires **2026-11-30T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed temporary risk; non-applicability is not proven. DANE-enabled TLS client trigger; actual offline invocation blocks external connectivity, but complete absence of native DANE calls is not proven.
- Controls: Network none, no host networking or sockets, fixed input/profile and isolated process; do not claim package immunity. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-84786](https://ubuntu.com/security/CVE-2026-84786); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 11. CVE-2026-95692 / libssl3t64

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **version-based non-applicability**, expires **2026-12-04T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed finding-specific non-applicability; not a claim that the package is fixed. The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Controls: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-95692](https://ubuntu.com/security/CVE-2026-95692); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 12. CVE-2026-95692 / openssl

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **version-based non-applicability**, expires **2026-12-04T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed finding-specific non-applicability; not a claim that the package is fixed. The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Controls: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-95692](https://ubuntu.com/security/CVE-2026-95692); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 13. CVE-2026-126765 / libc6

- Identity: image `kiota`; version `2.39-0ubuntu8.12`; type `deb`; PURL `pkg:deb/ubuntu/libc6@2.39-0ubuntu8.12?arch=amd64&distro=ubuntu-24.04&upstream=glibc`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **temporary risk**, expires **2026-11-30T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed temporary risk; non-applicability is not proven. glob allocation-failure double free remains potentially reachable; fixed paths do not prove native glob absence.
- Controls: Keep fixed paths and isolated disposable process; timeout/memory controls bound consequences but memory pressure may trigger failure. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-126765](https://ubuntu.com/security/CVE-2026-126765); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 14. CVE-2026-100290 / libc6

- Identity: image `kiota`; version `2.39-0ubuntu8.12`; type `deb`; PURL `pkg:deb/ubuntu/libc6@2.39-0ubuntu8.12?arch=amd64&distro=ubuntu-24.04&upstream=glibc`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **temporary risk**, expires **2026-11-30T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed temporary risk; non-applicability is not proven. POSIX regcomp/regexec allocation-failure cleanup remains potentially reachable in native dependencies; no complete native-call proof.
- Controls: 120-second timeout and 2 GiB bound limit effects, but memory pressure can trigger the bug; retain process isolation and reviewed input. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-100290](https://ubuntu.com/security/CVE-2026-100290); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 15. CVE-2026-121758 / libc6

- Identity: image `kiota`; version `2.39-0ubuntu8.12`; type `deb`; PURL `pkg:deb/ubuntu/libc6@2.39-0ubuntu8.12?arch=amd64&distro=ubuntu-24.04&upstream=glibc`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **temporary risk**, expires **2026-11-30T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed temporary risk; non-applicability is not proven. Complete binary/build-link exclusion has not been established. The following absence evidence reduces exposure but does not prove non-applicability: Upstream glibc maps ISO-2022-CN-EXT to a separate module; both payloads lack gconv and ISO-2022-CN-EXT.so.
- Controls: Retain immutable filesystem/no network/no additional mounts; do not generalize to other libc conversion routines. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-121758](https://ubuntu.com/security/CVE-2026-121758); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 16. CVE-2026-124024 / libc6

- Identity: image `kiota`; version `2.39-0ubuntu8.12`; type `deb`; PURL `pkg:deb/ubuntu/libc6@2.39-0ubuntu8.12?arch=amd64&distro=ubuntu-24.04&upstream=glibc`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **temporary risk**, expires **2026-11-30T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed temporary risk; non-applicability is not proven. Complete binary/build-link exclusion has not been established. The following absence evidence reduces exposure but does not prove non-applicability: Upstream glibc builds IBM1390/1399 conversions as separate modules; both payloads lack gconv and IBM1390.so/IBM1399.so.
- Controls: Retain immutable filesystem/no network/no additional mounts; source evidence and payload absence are not an exhaustive static call graph. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-124024](https://ubuntu.com/security/CVE-2026-124024); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 17. CVE-2026-121757 / libc6

- Identity: image `kiota`; version `2.39-0ubuntu8.12`; type `deb`; PURL `pkg:deb/ubuntu/libc6@2.39-0ubuntu8.12?arch=amd64&distro=ubuntu-24.04&upstream=glibc`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **temporary risk**, expires **2026-11-30T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed temporary risk; non-applicability is not proven. Complete binary/build-link exclusion has not been established. The following absence evidence reduces exposure but does not prove non-applicability: Upstream glibc maps CP949 to the separate UHC gconv module; both payloads lack gconv and UHC.so.
- Controls: Retain immutable filesystem/no network/no additional mounts; a custom embedded conversion implementation was not exhaustively disproved. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-121757](https://ubuntu.com/security/CVE-2026-121757); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 18. CVE-2026-107496 / libssl3t64

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **temporary risk**, expires **2026-11-30T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed temporary risk; non-applicability is not proven. OpenSSL 3.0 is affected by CMS encryption with abnormal EC group order; absence of CMS calls is not proven.
- Controls: No intended CMS encryption input, no network, 120-second kill/cleanup and resource limits bound denial-of-service impact. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-107496](https://ubuntu.com/security/CVE-2026-107496); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 19. CVE-2026-107496 / openssl

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **temporary risk**, expires **2026-11-30T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed temporary risk; non-applicability is not proven. OpenSSL 3.0 is affected by CMS encryption with abnormal EC group order; absence of CMS calls is not proven.
- Controls: No intended CMS encryption input, no network, 120-second kill/cleanup and resource limits bound denial-of-service impact. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-107496](https://ubuntu.com/security/CVE-2026-107496); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 20. CVE-2026-95690 / libssl3t64

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **temporary risk**, expires **2026-11-30T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed temporary risk; non-applicability is not proven. DTLS fragment buffering trigger; offline invocation reduces practical exposure, but no exhaustive proof excludes internally constructed DTLS data.
- Controls: Network none, fixed contract input, timeout/cleanup and memory bounds; source-level no-DTLS intent is not a full call graph. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-95690](https://ubuntu.com/security/CVE-2026-95690); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 21. CVE-2026-95690 / openssl

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **temporary risk**, expires **2026-11-30T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed temporary risk; non-applicability is not proven. DTLS fragment buffering trigger; offline invocation reduces practical exposure, but no exhaustive proof excludes internally constructed DTLS data.
- Controls: Network none, fixed contract input, timeout/cleanup and memory bounds; source-level no-DTLS intent is not a full call graph. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-95690](https://ubuntu.com/security/CVE-2026-95690); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 22. CVE-2026-115819 / libc6

- Identity: image `kiota`; version `2.39-0ubuntu8.12`; type `deb`; PURL `pkg:deb/ubuntu/libc6@2.39-0ubuntu8.12?arch=amd64&distro=ubuntu-24.04&upstream=glibc`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **temporary risk**, expires **2026-11-30T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed temporary risk; non-applicability is not proven. Specific wide-scanf conversion overflow remains potentially reachable; absence of a CLI does not exclude libc calls.
- Controls: Fixed generation profile, bounded source input, non-root/no capabilities/read-only filesystem limit exposure and impact, not memory-corruption possibility. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-115819](https://ubuntu.com/security/CVE-2026-115819); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 23. CVE-2026-95691 / libssl3t64

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **version-based non-applicability**, expires **2026-12-04T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed finding-specific non-applicability; not a claim that the package is fixed. The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Controls: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-95691](https://ubuntu.com/security/CVE-2026-95691); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 24. CVE-2026-95691 / openssl

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **version-based non-applicability**, expires **2026-12-04T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed finding-specific non-applicability; not a claim that the package is fixed. The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Controls: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-95691](https://ubuntu.com/security/CVE-2026-95691); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 25. CVE-2026-88823 / libssl3t64

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **version-based non-applicability**, expires **2026-12-04T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed finding-specific non-applicability; not a claim that the package is fixed. The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Controls: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-88823](https://ubuntu.com/security/CVE-2026-88823); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 26. CVE-2026-88823 / openssl

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **version-based non-applicability**, expires **2026-12-04T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed finding-specific non-applicability; not a claim that the package is fixed. The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Controls: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-88823](https://ubuntu.com/security/CVE-2026-88823); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 27. CVE-2026-35190 / libssl3t64

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **version-based non-applicability**, expires **2026-12-04T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed finding-specific non-applicability; not a claim that the package is fixed. The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Controls: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-35190](https://ubuntu.com/security/CVE-2026-35190); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 28. CVE-2026-35190 / openssl

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **version-based non-applicability**, expires **2026-12-04T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed finding-specific non-applicability; not a claim that the package is fixed. The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Controls: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-35190](https://ubuntu.com/security/CVE-2026-35190); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 29. CVE-2026-88822 / libssl3t64

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **version-based non-applicability**, expires **2026-12-04T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed finding-specific non-applicability; not a claim that the package is fixed. The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Controls: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-88822](https://ubuntu.com/security/CVE-2026-88822); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 30. CVE-2026-88822 / openssl

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **version-based non-applicability**, expires **2026-12-04T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed finding-specific non-applicability; not a claim that the package is fixed. The applicable retained OpenSSL advisory explicitly lists the 3.0 series as unaffected. Actual package is 3.0.13-0ubuntu3.16 and both runtime payloads preserve the reviewed library objects. This is version-specific, not inferred from Ubuntu Needs evaluation.
- Controls: Preserve exact OpenSSL package/object hashes; invalidate on version, feature, vendor-status or finding changes. No missing-CLI argument is used. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-88822](https://ubuntu.com/security/CVE-2026-88822); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 31. CVE-2016-20013 / libc6

- Identity: image `kiota`; version `2.39-0ubuntu8.12`; type `deb`; PURL `pkg:deb/ubuntu/libc6@2.39-0ubuntu8.12?arch=amd64&distro=ubuntu-24.04&upstream=glibc`; severity **Negligible**; fix state `wont-fix`; fix versions `[]`.
- Renewed proposal: **temporary risk**, expires **2026-11-30T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed temporary risk; non-applicability is not proven. Complete binary/build-link exclusion has not been established. The following absence evidence reduces exposure but does not prove non-applicability: glibc 2.39 removed libcrypt; both complete payloads lack libcrypt/libxcrypt. No corresponding library file was found, but statically embedded implementation has not been excluded.
- Controls: Preserve exact payload and prohibit adding crypt providers; absence inspection does not exhaustively rule out embedded third-party implementations. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2016-20013](https://ubuntu.com/security/CVE-2016-20013); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 32. CVE-2025-5222 / libicu74

- Identity: image `kiota`; version `74.2-1ubuntu3.1`; type `deb`; PURL `pkg:deb/ubuntu/libicu74@74.2-1ubuntu3.1?arch=amd64&distro=ubuntu-24.04&upstream=icu`; severity **Low**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **temporary risk**, expires **2026-11-30T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed temporary risk; non-applicability is not proven. Complete binary/build-link exclusion has not been established. The following absence evidence reduces exposure but does not prove non-applicability: Official ICU corrective commit changes only tools/genrb/parse.cpp; both complete payloads lack genrb. ICU runtime libraries remain present and are not declared fixed.
- Controls: Keep build tools out of runtime and retain exact inventory; this is a tool-specific conclusion, not package-wide immunity. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2025-5222](https://ubuntu.com/security/CVE-2025-5222); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 33. CVE-2026-107493 / libssl3t64

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **temporary risk**, expires **2026-11-30T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed temporary risk; non-applicability is not proven. OpenSSL 3.0 is affected by caller-supplied non-null PEM X509_INFO stack reuse; native PEM call paths are not fully proven absent.
- Controls: No intentional attacker PEM input; fixed reviewed contracts, no network and isolated process reduce exposure. libcrypto remains present. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-107493](https://ubuntu.com/security/CVE-2026-107493); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 34. CVE-2026-107493 / openssl

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **temporary risk**, expires **2026-11-30T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed temporary risk; non-applicability is not proven. OpenSSL 3.0 is affected by caller-supplied non-null PEM X509_INFO stack reuse; native PEM call paths are not fully proven absent.
- Controls: No intentional attacker PEM input; fixed reviewed contracts, no network and isolated process reduce exposure. libcrypto remains present. Kiota1.38.0 fixed generate; no network; non-root; no capabilities; no-new-privileges; read-only root; bounded mounts;128PIDs;1MiB source/32MiB package;2GiB/120s cleanup. Recheck vendor fixes; identity changes invalidate.
- Primary vendor status: [CVE-2026-107493](https://ubuntu.com/security/CVE-2026-107493); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner anton-asnitsky finding decision: https://github.com/anton-asnitsky/StockSense/blob/8304b42748911a722ebf05e5d7f2ee5b11d2e2da/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-ci-finding-approval-2026-11-27.md; approved proposal SHA256 753346d0b1ec5cf8e9f6badb7ebf6640b49a71f4b79462d3e98a374d378f101e. QUESTION_ANSWERED 2026-11-27T09:16:27Z audit/anton-pc-bdb2a6a5dca8.md:1084; separate PR publication authority required.

### 35. CVE-2026-84785 / libssl3t64

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **version-based non-applicability**, expires **2026-12-04T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed finding-specific version-based non-applicability for CVE-2026-84785. The official OpenSSL November 24 advisory explicitly excludes 3.0; the exact installed package is 3.0.13-0ubuntu3.16. This is not a claim that the package is fixed or free of other vulnerabilities. Ubuntu Needs evaluation is retained; changed vendor applicability or package/runtime/execution/finding identity invalidates this decision.
- Controls: Keep exact package/runtime/execution and Kiota1.38.0 fixed generate profile; network none, non-root, dropped capabilities, no-new-privileges, read-only root, bounded mounts,128PIDs,1MiB source/32MiB package,2GiB memory/120-second cleanup. Version evidence is the basis, not absence of a CLI or an incomplete native call graph. Reassess on vendor/package changes; no extension of old temporary-risk expiry.
- Primary vendor status: [CVE-2026-84785](https://ubuntu.com/security/CVE-2026-84785); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner contextual decision 'Unblock it.': https://github.com/anton-asnitsky/StockSense/blob/f93489e5293f5c954acbea704c894151d826e8ba/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-kiota-new-finding-approval-2026-11-27.md; approved proposal SHA256 64671762eb7a0f7066eeb578a3563ea000b089f760a64fc92c59233095ac20da. Separate immutable PR publication authority required.

### 36. CVE-2026-84785 / openssl

- Identity: image `kiota`; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Renewed proposal: **version-based non-applicability**, expires **2026-12-04T00:00:00Z**; no renewed owner decision.
- Rationale/remaining uncertainty: Proposed finding-specific version-based non-applicability for CVE-2026-84785. The official OpenSSL November 24 advisory explicitly excludes 3.0; the exact installed package is 3.0.13-0ubuntu3.16. This is not a claim that the package is fixed or free of other vulnerabilities. Ubuntu Needs evaluation is retained; changed vendor applicability or package/runtime/execution/finding identity invalidates this decision.
- Controls: Keep exact package/runtime/execution and Kiota1.38.0 fixed generate profile; network none, non-root, dropped capabilities, no-new-privileges, read-only root, bounded mounts,128PIDs,1MiB source/32MiB package,2GiB memory/120-second cleanup. Version evidence is the basis, not absence of a CLI or an incomplete native call graph. Reassess on vendor/package changes; no extension of old temporary-risk expiry.
- Primary vendor status: [CVE-2026-84785](https://ubuntu.com/security/CVE-2026-84785); freshly compared unchanged status.
- Historical approval reference, **not transferred**: Owner contextual decision 'Unblock it.': https://github.com/anton-asnitsky/StockSense/blob/f93489e5293f5c954acbea704c894151d826e8ba/aidlc/spaces/default/intents/260908-stock-sense-design/verification/u1-kiota-new-finding-approval-2026-11-27.md; approved proposal SHA256 64671762eb7a0f7066eeb578a3563ea000b089f760a64fc92c59233095ac20da. Separate immutable PR publication authority required.

## Required completion before an owner question

The final addendum supplies fresh ordinary bindings and confirms the same36 identities; obtain independent technical and steward review of the frozen proposal. Ask the owner separately to renew these exact decisions for the new fingerprints with unchanged absolute expiries. Only after that decision may an operative ledger update and separate immutable publication authority be prepared. No merge, U1 acceptance, C01 release or gate advancement is included.

Evidence is retained in `.local-data/u1-ci-policy-renewed-findings/`; renewal-bindings.json SHA256 `sha256:292a3c609b6f3bbd00ec074c33eedc600c4d2b534d32cdc81719acb9f84c46a7`. This report changes no source, runtime pin or operative ledger.

## Final ordinary candidate and artifact bindings

Production verification at `2026-11-27T19:22:39.605Z`: verification.json SHA256 `sha256:eea7e2ebe7068be15b39d92170110697b1cf76dcd3438b8f46e4938cc2f1a433`; frozen parent/tree bindings SHA256 `sha256:66a00a00f4cc6975f543357f9df551584cc0dfb27b30d11c71f1fe797adf7907`; successful current-head U2 summary SHA256 `sha256:2b49190d8da40730be606d8fcbef201ed932ea0ad75fdfed9a93f176076db0ba`. All files are under `.local-data/u1-ci-policy-ordinary-rollout-2026-11-27/`. The earlier final-pr-bindings diagnostic flag perPrScanIdentitiesVerified=false reflects its earlier Git-only computation; the later production verification supplies the actual scan binding.

This assessment independently compared all36 exact current normalized identities and fixVersions with the historical36, then matched each to raw package/PURL/version/severity/fix state. All three validator scans have zero findings. Receipt/source/image/SBOM/normalized/raw/database hashes match for both images on all three PRs. Runtime remains1c7fc5. Successful U2 references below are separate owner/code-change authority and do not renew finding decisions.

### PR #74: ordinary run 46055522996, attempt 1

[Ordinary run](https://github.com/anton-asnitsky/StockSense/actions/runs/46055522996/attempts/1). Jobs: Vulnerability scan `140696946021` (success); U1 contracts `140696946487` (failure). Failure/skip statuses are preserved; this is not a green-CI claim.

| Subject | Exact binding |
|---|---|
| head | `a9f44242e3428bb163509357ac2038e9c76ee35e` |
| base | `402ace3b195c291a756ed230a24a73199ef8349a` |
| testMerge | `c35554b1ff31398a2e3802960645462bd10a9d52` |
| orderedParents | `402ace3b195c291a756ed230a24a73199ef8349a, a9f44242e3428bb163509357ac2038e9c76ee35e` |
| gitTree | `20ad87f9e74eaf96608870cf44138b5f6c7d4d96` |
| candidateTreeDigest | `sha256:9bbf8d4db9eb12eaffa4c133825ae90df2c81d3e56c6acf8ead1e6d538ecdc1d` |
| executionFingerprint | `sha256:e558f16701a94dd0502d98fddb59d58b6dbcb11a4ea175913e5eb9635fbbe545` |
| sourceDigest | `sha256:baf81b6d6cd15a269ee5f0bd7a5ee0eb48e26c6859c04e8e9a88b3182bffce29` |
| runtimeManifestDigest | `sha256:1c7fc5fd4df187a3571460bf807e860f1be6bfd704c3fd9fe037c641adea5340` |

| Artifact binding | Validator | Kiota |
|---|---|---|
| imageId | `sha256:5421f4cf805471ad80eb24e6be324baa9bf4a8218c7e424059147d2cd74169e4` | `sha256:be5a2d9b4ec84cfbc1f93cdf46c7355c74ad1b38e152eca92467ca9a4fa89685` |
| sbomDigest | `sha256:b1cd5aade8cbb1fc671516a040282221f312bffac6f2a47d830d67dd5cb2b91c` | `sha256:77ee6543120aa00d53bcca5d92efb2e473d894f07c920bb728be9218cf8afdc4` |
| normalizedScanDigest | `sha256:6a6a30d6698953434ddd0bcef8f341b50540911ad7edc66b7706c00eac713e85` | `sha256:f401ffa384c8cfc7a2122748484ad35ee37f14782deb2f20994d82a06e9d6895` |
| scanDigest | `sha256:0ad2710e4437b5c1f102a0f9ffb3a3fa5da724cbd0d9a96bf3314ee96061869a` | `sha256:1ee68302eb7c388b538a8d0ec4f08cc8df127a64b506380bbbf3e9f8fa53b131` |
| databaseDigest | `sha256:afc06074e938a8cb3a92823379c75446366f6023a0f2da34b500c8cbce3c8b44` | `sha256:afc06074e938a8cb3a92823379c75446366f6023a0f2da34b500c8cbce3c8b44` |
| rawReceiptDigest | `sha256:da150570e11120f76724eceedd8bdc4d94c88e1533188185411b00be629fc6ed` | `sha256:1867f0c6745b74fb76a24926bbfd796516c208cff43a91274538e733b2ba3d59` |

Kiota runtime evidence JSON SHA256 `sha256:b88b646d39e230357f275c9788dfeef9ee46b3c47f18385756fb04007d3a5fb9` (separate from normalized runtime digest).

validator scanner `ghcr.io/anchore/grype@sha256:e4a44ef45d285b829ce6efe2642980329661bd2d18eab5fc539138d4adaebbbe`; DB schema `v6.1.10`, built `2026-11-27T06:22:11Z`, status `valid`, source `https://grype.anchore.io/databases/v6/vulnerability-db_v6.1.10_2026-11-27T00:21:50Z_1795760531.tar.zst?checksum=sha256%3Ab1f986487adf96493a3f0f2a11c1617ceb00f2a78fa3ee1a7ddbb42c2eb001cf`.

kiota scanner `ghcr.io/anchore/grype@sha256:e4a44ef45d285b829ce6efe2642980329661bd2d18eab5fc539138d4adaebbbe`; DB schema `v6.1.10`, built `2026-11-27T06:22:11Z`, status `valid`, source `https://grype.anchore.io/databases/v6/vulnerability-db_v6.1.10_2026-11-27T00:21:50Z_1795760531.tar.zst?checksum=sha256%3Ab1f986487adf96493a3f0f2a11c1617ceb00f2a78fa3ee1a7ddbb42c2eb001cf`.

U2 current-head verification: [run 46055520864, attempt 2, job 140698730129](https://github.com/anton-asnitsky/StockSense/actions/runs/46055520864/job/140698730129), conclusion **success**, head `a9f44242e3428bb163509357ac2038e9c76ee35e`.

### PR #75: ordinary run 46055525570, attempt 1

[Ordinary run](https://github.com/anton-asnitsky/StockSense/actions/runs/46055525570/attempts/1). Jobs: Vulnerability scan `140696954090` (success); U1 contracts `140696954501` (failure). Failure/skip statuses are preserved; this is not a green-CI claim.

| Subject | Exact binding |
|---|---|
| head | `8861ef6de43e96a876f4756064e571c3ffc251c2` |
| base | `402ace3b195c291a756ed230a24a73199ef8349a` |
| testMerge | `14b351e8c29f79b486a6b8592ad9d6718e594b2c` |
| orderedParents | `402ace3b195c291a756ed230a24a73199ef8349a, 8861ef6de43e96a876f4756064e571c3ffc251c2` |
| gitTree | `d460d228127907a502384eb1ab410fc9beaa0d6b` |
| candidateTreeDigest | `sha256:8b99a6f8cd24577e0243a25c62628f3ac44e928ffd35ab65317d67cd987b5044` |
| executionFingerprint | `sha256:925634ae326c4b13b06650a4f7d304b0fd70b7acef8373bd508e99ec4497af91` |
| sourceDigest | `sha256:15ef3370ad6c09f71244b2edab1ccbfc65e3475d61a83f244c782cc92c9dc48d` |
| runtimeManifestDigest | `sha256:1c7fc5fd4df187a3571460bf807e860f1be6bfd704c3fd9fe037c641adea5340` |

| Artifact binding | Validator | Kiota |
|---|---|---|
| imageId | `sha256:041e44959c86085c59fbc31d39ebc59571b7b9927468fc0bff2274049dc803d2` | `sha256:7b46c5dc0f607d219531793a18a89cb192f57010709f7abc5942a76c16e4228d` |
| sbomDigest | `sha256:d01ff181360e2e1d88fda5c8ba85e4b3511635275fc93732ebff956bf6174975` | `sha256:6d5b3ac56a1a1d26a9d37117a332cc30df52c9c23c8312acb395b7f90d8f8a5d` |
| normalizedScanDigest | `sha256:f301e15fc62003e90263a2a69f9082492077a6f7898fd6c672e72c21c8662af0` | `sha256:11b3587aa1bda730d6beab5af91fe2a3eae4286d943c05ea1c668f61261c74f9` |
| scanDigest | `sha256:afed158b52187948e6845aa770242c73f3231d5b51ce4f34764fd1f659a0d44d` | `sha256:2c976410b9b1c3c3d69271e0e06325b87eecc9525b6a010a45819498bd982441` |
| databaseDigest | `sha256:afc06074e938a8cb3a92823379c75446366f6023a0f2da34b500c8cbce3c8b44` | `sha256:afc06074e938a8cb3a92823379c75446366f6023a0f2da34b500c8cbce3c8b44` |
| rawReceiptDigest | `sha256:4217396fa85f2a705a6683086223523afa54ba2524d4a2e21ec9d8d8a03185d3` | `sha256:53889a3451698138bde8b7a3947afc83442507c753fde7247750fe213ea8dc85` |

Kiota runtime evidence JSON SHA256 `sha256:7382f8b504d14730ed2978cf1c78172062e6fdf5b56aadace6e37bdb48bed421` (separate from normalized runtime digest).

validator scanner `ghcr.io/anchore/grype@sha256:e4a44ef45d285b829ce6efe2642980329661bd2d18eab5fc539138d4adaebbbe`; DB schema `v6.1.10`, built `2026-11-27T06:22:11Z`, status `valid`, source `https://grype.anchore.io/databases/v6/vulnerability-db_v6.1.10_2026-11-27T00:21:50Z_1795760531.tar.zst?checksum=sha256%3Ab1f986487adf96493a3f0f2a11c1617ceb00f2a78fa3ee1a7ddbb42c2eb001cf`.

kiota scanner `ghcr.io/anchore/grype@sha256:e4a44ef45d285b829ce6efe2642980329661bd2d18eab5fc539138d4adaebbbe`; DB schema `v6.1.10`, built `2026-11-27T06:22:11Z`, status `valid`, source `https://grype.anchore.io/databases/v6/vulnerability-db_v6.1.10_2026-11-27T00:21:50Z_1795760531.tar.zst?checksum=sha256%3Ab1f986487adf96493a3f0f2a11c1617ceb00f2a78fa3ee1a7ddbb42c2eb001cf`.

U2 current-head verification: [run 46055521850, attempt 2, job 140698752997](https://github.com/anton-asnitsky/StockSense/actions/runs/46055521850/job/140698752997), conclusion **success**, head `8861ef6de43e96a876f4756064e571c3ffc251c2`.

### PR #76: ordinary run 46055525630, attempt 1

[Ordinary run](https://github.com/anton-asnitsky/StockSense/actions/runs/46055525630/attempts/1). Jobs: Vulnerability scan `140696954716` (success); U1 contracts `140696955136` (failure). Failure/skip statuses are preserved; this is not a green-CI claim.

| Subject | Exact binding |
|---|---|
| head | `c6fba14749b20b307fd8bb9d68cca9611fcb8afd` |
| base | `402ace3b195c291a756ed230a24a73199ef8349a` |
| testMerge | `7b42be8e891c555271e521320769d0bc43e1fbc2` |
| orderedParents | `402ace3b195c291a756ed230a24a73199ef8349a, c6fba14749b20b307fd8bb9d68cca9611fcb8afd` |
| gitTree | `20ad87f9e74eaf96608870cf44138b5f6c7d4d96` |
| candidateTreeDigest | `sha256:9bbf8d4db9eb12eaffa4c133825ae90df2c81d3e56c6acf8ead1e6d538ecdc1d` |
| executionFingerprint | `sha256:e558f16701a94dd0502d98fddb59d58b6dbcb11a4ea175913e5eb9635fbbe545` |
| sourceDigest | `sha256:baf81b6d6cd15a269ee5f0bd7a5ee0eb48e26c6859c04e8e9a88b3182bffce29` |
| runtimeManifestDigest | `sha256:1c7fc5fd4df187a3571460bf807e860f1be6bfd704c3fd9fe037c641adea5340` |

| Artifact binding | Validator | Kiota |
|---|---|---|
| imageId | `sha256:f80c29ff0cb5a7ecf958d92604d6fa6699fb0737b3bec3f6eee124974c76f89e` | `sha256:2550183ce7a3f035864a34ea9da3ea1ee5626287524f301bfa9b4f9e3a6260ab` |
| sbomDigest | `sha256:efe8717c89371ef8f5cbff1a13deff56e548c5e4b3d08a6705e4c590c6f9c52d` | `sha256:ed7eea7efebb02db2a1d6f346a7d7ee3d3e60b747bd2f1577109384f92f8c422` |
| normalizedScanDigest | `sha256:17347ecde24c0e2ce6151c475a1a30ee7b5c7085fdf487c4500e9e98c096ad25` | `sha256:bb5885274a42bcf3a01096c6e70a31cb0df3a3eba42d52d92bce32322e24f64e` |
| scanDigest | `sha256:8d040ba9f913d0cdff136a4392f89e4764a5a3ec1269a14d201d78fd1295e1c1` | `sha256:be1bf15e5a323d2347c936fd34bc55432b8cbe525a9bfcea93527212cbfca3d3` |
| databaseDigest | `sha256:afc06074e938a8cb3a92823379c75446366f6023a0f2da34b500c8cbce3c8b44` | `sha256:afc06074e938a8cb3a92823379c75446366f6023a0f2da34b500c8cbce3c8b44` |
| rawReceiptDigest | `sha256:cef7f31f972787b15e2846f7dcd22f4f452c228df2c22f70ad4c720259c758c5` | `sha256:a22de1deb6ef0e595166504c14640a490447e6cc6ee2f7936a2433df75ebfda7` |

Kiota runtime evidence JSON SHA256 `sha256:46efde5931968944e00d3fd21f896fe451c857150fba0a2ec1df1c566cac6f0f` (separate from normalized runtime digest).

validator scanner `ghcr.io/anchore/grype@sha256:e4a44ef45d285b829ce6efe2642980329661bd2d18eab5fc539138d4adaebbbe`; DB schema `v6.1.10`, built `2026-11-27T06:22:11Z`, status `valid`, source `https://grype.anchore.io/databases/v6/vulnerability-db_v6.1.10_2026-11-27T00:21:50Z_1795760531.tar.zst?checksum=sha256%3Ab1f986487adf96493a3f0f2a11c1617ceb00f2a78fa3ee1a7ddbb42c2eb001cf`.

kiota scanner `ghcr.io/anchore/grype@sha256:e4a44ef45d285b829ce6efe2642980329661bd2d18eab5fc539138d4adaebbbe`; DB schema `v6.1.10`, built `2026-11-27T06:22:11Z`, status `valid`, source `https://grype.anchore.io/databases/v6/vulnerability-db_v6.1.10_2026-11-27T00:21:50Z_1795760531.tar.zst?checksum=sha256%3Ab1f986487adf96493a3f0f2a11c1617ceb00f2a78fa3ee1a7ddbb42c2eb001cf`.

U2 current-head verification: [run 46055521859, attempt 2, job 140698778052](https://github.com/anton-asnitsky/StockSense/actions/runs/46055521859/job/140698778052), conclusion **success**, head `c6fba14749b20b307fd8bb9d68cca9611fcb8afd`.

Final independent extraction/assertion evidence: `.local-data/u1-ci-policy-renewed-findings/ordinary-final-bindings.json`, SHA256 `sha256:0f41d2a0044acc01d5d220c1f77e60c4331eb57396a34186edc1aad2cbe5c428`. Fresh vendor check19:17UTC above remains unchanged; no new vendor fix or status delta was found. All36 detailed rows, rationales, control limits, historical references and absolute expiries above remain unchanged.

**The actual additional owner decision required is to renew these exact new bindings**:18 version-based non-applicability findings through2026-12-04T00:00:00Z and18 temporary-risk findings through2026-11-30T00:00:00Z, each for the two specified new execution groups and actual three-PR evidence. This is a separate finding decision, not a plan exception or automatic consequence of the approved rollout/deviation. No renewed decision is recorded here. Earliest combined publication authority remains2026-11-30T00:00:00Z. A later operative ledger and immutable publication authority still require their own exact reviewed bytes.
