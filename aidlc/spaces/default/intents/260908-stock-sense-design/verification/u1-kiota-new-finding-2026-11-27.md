# New Kiota finding assessment: CVE-2026-84785

Status: **two new finding proposals only**. Previous owner approval of34 rows does not cover these rows. Owner: anton-asnitsky; no decision recorded for these two rows. No source, pin or operative ledger changes.

## Why the authorized run fails

The fresh PR74 scan uses database built `2026-11-27T06:22:11Z` and adds CVE-2026-84785 to both libssl3t64 and openssl. Existing34 approvals cannot dispose of these new exact identities. The initial assessment bound PR74; the final addendum below now binds all three reconciled ordinary runs and independently checks both new normalized identities against their raw Grype fields.

- Source test-merge: `e4a464ab38831f0e5f9d399b102f96cd127a671e`
- Image: `sha256:7cf15564446b42f9200653409275b6fbf1f48523f194b6b77f7e7b9aa1e787c3`
- SBOM: `sha256:ce8c613084daef5484a6e0a092dec16565a400c335071ba426586902fa935e41`
- Normalized scan: `sha256:297fb361a454f19ecbdc6ada1f5afe925ce8a8202ec5b38a70b7477453f49141`
- Raw scan: `sha256:1160684ff56a7e65de3de3137ac1236699201a6dc80be7504d6efc1b8a30eb87`
- Raw database evidence: `sha256:afc06074e938a8cb3a92823379c75446366f6023a0f2da34b500c8cbce3c8b44`
- Runtime evidence JSON: `sha256:489f7e88dc4d08a83fa1ae01fdc6c3b399c582c3878765c0c05ae66222191975`
- Scanner: `ghcr.io/anchore/grype@sha256:e4a44ef45d285b829ce6efe2642980329661bd2d18eab5fc539138d4adaebbbe`
- DB: schema `v6.1.10`, status `valid`, archive `https://grype.anchore.io/databases/v6/vulnerability-db_v6.1.10_2026-11-27T00:21:50Z_1795760531.tar.zst?checksum=sha256%3Ab1f986487adf96493a3f0f2a11c1617ceb00f2a78fa3ee1a7ddbb42c2eb001cf`.

## Primary vendor applicability and fix

The [OpenSSL November24 advisory](https://openssl-library.org/news/secadv/20261124.txt) identifies a QUIC reassembly memory-exhaustion path: a peer sends separated fragments while withholding the stream prefix, retaining nodes when incoming peer streams are accepted. Default rejection avoids the trigger. Upstream identifies supported4.1/4.0/3.5 branches as affected and explicitly excludes3.0 (also1.1.1/1.0.2). The exact installed3.0.13-0ubuntu3.16 packages belong to the excluded3.0 series. This is version-based non-applicability evidence, not an inference from missing executables or an incomplete native call graph. The existing offline generation profile further limits exposure but is not the basis of the version conclusion.

Upstream lists fixes4.1.1/4.0.4/3.5.10 and says releases are scheduled for December1; public source fixes already exist. No3.0 upgrade is prescribed for this CVE. Unsupported3.1/3.2/3.3/3.4/3.6 were not analyzed. The [Ubuntu advisory](https://ubuntu.com/security/CVE-2026-84785) still marks Noble openssl Needs evaluation. Its scanner Medium severity is retained unchanged despite upstream Low classification. Needs evaluation is neither owner acceptance nor proof of vulnerability in every OpenSSL branch. Retained official files: openssl-20261124.txt `sha256:370945815429db4a94eae07603cbef690b4b1d2de0312060f35be7d6bd7a32e3`; ubuntu.html `sha256:b2f847a7761a3aa0822b6fe2a54a051244d5104c300ea4d28125cec954b0130e`.

## Authenticated same-family package availability

Fresh check `2026-11-27T09:44:39.466Z` fetched InRelease and main/binary-amd64/Packages.gz from archive.ubuntu.com/ubuntu/dists/{noble-security,noble-updates}/. Both signatures passed Git gpgv using the previously authenticated Ubuntu2018 key `F6ECB3762474EDA9D21B7022871920D1991BC93C`, copied from the retained prior keyring; keyring digest `sha256:5ebbeeb474034b1fa7e50abbe6f136e177fc826219e01f314b3623f7b3097e96`. Reproducer: `C:/Program Files/Git/usr/bin/gpgv.exe --homedir /d/Git/StockSense/.local-data/u1-kiota-cve-2026-84785/gnupg --keyring /d/Git/StockSense/.local-data/u1-kiota-cve-2026-84785/ubuntu-archive-key-2018.gpg /d/Git/StockSense/.local-data/u1-kiota-cve-2026-84785/noble-security.InRelease`, repeated for updates. Signature transcripts retained. Node24.22.3 refresh-index.mjs verified compressed index SHA256 and length against signed release entries.

- noble-security: signed Date `Fri, 27 Nov 2026  4:37:40 UTC`; release `a3849ffa5d069c5a6cc929dc55e1fd946aff6e3da4f97d88f20059b6b7d6d203`; compressed index `d0eda781df4f6750c02d0157fa68baf3507fe1da876c5f7bd2c1d4f8c149e7f6`; no Valid-Until field.
- noble-updates: signed Date `Fri, 27 Nov 2026  6:17:14 UTC`; release `10dc47ad967e0513d877e0d55621c7393568894c4dbba1049232251630cb43c7`; compressed index `478fa07f243a3c3d46f8db24cf9f9f7e92f568833aaa203a421aebf51e0fd408`; no Valid-Until field.

Both suites still offer libssl3t64 and openssl3.0.13-0ubuntu3.16. Package SHA256s remain `219f43b1cd836a4da550938db5fda93160d269d39a4edcf1f1ce698a470db797` and `675b84971ffd4467707008c25ef7520f90ea7c23ef27b7a76b0dccf1d7c4dc3f`, respectively. No genuine newer same-family patch is available in these authenticated indexes; no rebuild of identical bytes is warranted. New signed metadata dates were observed; that does not imply a new affected package.

## Concrete two-row proposals

Proposed route for each row: **finding-specific version-based non-applicability**. Proposed fixed expiry for each: **2026-12-04T00:00:00Z**, within seven days of the current November27 assessment and before the December10 sunset. Owner approval is required separately; this document records none. The previous18 temporary-risk expiry is not extended.

### CVE-2026-84785 / libssl3t64

- Identity: image kiota; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/libssl3t64@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04&upstream=openssl`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Rationale: official OpenSSL advisory explicitly excludes3.0; current exact package and runtime binding use3.0.13. No claim that the entire package is fixed or that other vulnerabilities are absent.
- Controls: retain exact package/runtime/execution; fixed Kiota1.38.0 generate profile, no network, non-root, dropped capabilities, no-new-privileges, read-only root, bounded mounts/128PIDs/1MiB source/32MiB package/2GiB memory/120-second cleanup.
- Limits: this conclusion is specific to CVE-2026-84785 and these exact identities. Changed vendor applicability, package, runtime, execution or finding fields invalidate it. Ubuntu Needs evaluation remains unresolved vendor classification. Final per-PR raw/source/runtime reconciliation is recorded below; independent review must precede presentation of a bound owner decision.
- Owner anton-asnitsky; decision absent; proposed expiry2026-12-04T00:00:00Z.

### CVE-2026-84785 / openssl

- Identity: image kiota; version `3.0.13-0ubuntu3.16`; type `deb`; PURL `pkg:deb/ubuntu/openssl@3.0.13-0ubuntu3.16?arch=amd64&distro=ubuntu-24.04`; severity **Medium**; fix state `not-fixed`; fix versions `[]`.
- Rationale: official OpenSSL advisory explicitly excludes3.0; current exact package and runtime binding use3.0.13. No claim that the entire package is fixed or that other vulnerabilities are absent.
- Controls: retain exact package/runtime/execution; fixed Kiota1.38.0 generate profile, no network, non-root, dropped capabilities, no-new-privileges, read-only root, bounded mounts/128PIDs/1MiB source/32MiB package/2GiB memory/120-second cleanup.
- Limits: this conclusion is specific to CVE-2026-84785 and these exact identities. Changed vendor applicability, package, runtime, execution or finding fields invalidate it. Ubuntu Needs evaluation remains unresolved vendor classification. Final per-PR raw/source/runtime reconciliation is recorded below; independent review must precede presentation of a bound owner decision.
- Owner anton-asnitsky; decision absent; proposed expiry2026-12-04T00:00:00Z.

Evidence directory `.local-data/u1-kiota-cve-2026-84785/` includes exact raw/new-row bindings in `new-findings.json`. Ledger changes, publication authorization, merges, U1 acceptance, C01 release and gate advancement are excluded.

## Final three-PR binding addendum

Platform production verification completed at `2026-11-27T09:46:45.523Z`, retained as `.local-data/u1-owner-authorized-reruns-2026-11-27/verification.json` (SHA256 `sha256:dae274783d3366d7d01d96bd6f186cc85bb65c7cd7c1903416d8026fd6403468`). This is the consolidated final verification file; separate verification-75/76.json files are not present. Platform confirms all three have validator0 and Kiota36 exact rows: prior34 unchanged plus the two proposed new rows. Each source test-merge and normalized runtime is verified. This assessment independently checked new-row raw identities and receipt/image/source/hash bindings for all three.

### PR #74, attempt 2

[Run 45925886026](https://github.com/anton-asnitsky/StockSense/actions/runs/45925886026/attempts/2).

| Binding | Exact value |
|---|---|
| head | `cf83316fa3b63b5cf1e3d730b172212fe8a8ee58` |
| merge | `e4a464ab38831f0e5f9d399b102f96cd127a671e` |
| candidateGitTreeSha | `bad2e5fc922d92028b9a51c12d7d6e189d911e58` |
| candidateTreeDigest | `sha256:1b15122ba01caa63d35aef6fd9e95abdd9fadd055d7ae90516586c2687bdcad2` |
| executionFingerprint | `sha256:0c1a93a688ce84661656de6dd3ae45de661521a6a368f26e4c326e54802489f9` |
| runtimeManifestDigest | `sha256:1c7fc5fd4df187a3571460bf807e860f1be6bfd704c3fd9fe037c641adea5340` |
| imageId | `sha256:7cf15564446b42f9200653409275b6fbf1f48523f194b6b77f7e7b9aa1e787c3` |
| sbomDigest | `sha256:ce8c613084daef5484a6e0a092dec16565a400c335071ba426586902fa935e41` |
| normalizedScanDigest | `sha256:297fb361a454f19ecbdc6ada1f5afe925ce8a8202ec5b38a70b7477453f49141` |
| rawScanDigest | `sha256:1160684ff56a7e65de3de3137ac1236699201a6dc80be7504d6efc1b8a30eb87` |
| rawDatabaseDigest | `sha256:afc06074e938a8cb3a92823379c75446366f6023a0f2da34b500c8cbce3c8b44` |
| runtimeEvidenceDigest | `sha256:489f7e88dc4d08a83fa1ae01fdc6c3b399c582c3878765c0c05ae66222191975` |
| receiptDigest | `sha256:61dd8aad4df7141edc996dcaeb42a2375c8a87c04a7ec4ecb0ae9b183556d9bc` |

Both new rows retain exactly the advisory/package/version/type/PURL/severity/fixState/fixVersions identities stated above; no separate or widened package matching is permitted.

### PR #75, attempt 2

[Run 45925886385](https://github.com/anton-asnitsky/StockSense/actions/runs/45925886385/attempts/2).

| Binding | Exact value |
|---|---|
| head | `a186e332345678268713ae63bd09ba40dd2af7df` |
| merge | `502379759cfc5698307d5b6788e5959d0a3ed875` |
| candidateGitTreeSha | `6ec28c8b14e4a367c3521309cd351ceeef7579c1` |
| candidateTreeDigest | `sha256:29f2fc7c7255a85dc57b4b4426c256b62dc0c083df7d81445ef22799784df37c` |
| executionFingerprint | `sha256:6d197e6749e73469c0944ebdbfade4f6668726e092801fe8ea02d4794a6796ef` |
| runtimeManifestDigest | `sha256:1c7fc5fd4df187a3571460bf807e860f1be6bfd704c3fd9fe037c641adea5340` |
| imageId | `sha256:67c38dceedf716891033d2a64eed056e0ef782bb7c95c30a955e3c89cd6d7874` |
| sbomDigest | `sha256:4d6b9a3c1d77b5023a9506894512fafb4ad99894ef5503b9988c5a94896a709b` |
| normalizedScanDigest | `sha256:7dde0a554a2a8a7954ad5a4639652a91e87ce2d41ba6f8eb83d8b4e42d80469e` |
| rawScanDigest | `sha256:db6904b02c53f21f15022ce9841b0dcd76120a771e68fc2e841796c0de033d95` |
| rawDatabaseDigest | `sha256:afc06074e938a8cb3a92823379c75446366f6023a0f2da34b500c8cbce3c8b44` |
| runtimeEvidenceDigest | `sha256:6ee894fe95b229f2747e53d029340cf91aee12be978097796726ba8fdb0db726` |
| receiptDigest | `sha256:78a1dcac2cc503a74d770f69579ecbee95c6ec409f428a20bb5415078e72a8d6` |

Both new rows retain exactly the advisory/package/version/type/PURL/severity/fixState/fixVersions identities stated above; no separate or widened package matching is permitted.

### PR #76, attempt 2

[Run 45925886242](https://github.com/anton-asnitsky/StockSense/actions/runs/45925886242/attempts/2).

| Binding | Exact value |
|---|---|
| head | `20b42a9c7ef344095552925ebbf6df7ce6c5f1cd` |
| merge | `7ba906cfbbaf386820eb4c8fa97cfcfdb2d16a89` |
| candidateGitTreeSha | `bad2e5fc922d92028b9a51c12d7d6e189d911e58` |
| candidateTreeDigest | `sha256:1b15122ba01caa63d35aef6fd9e95abdd9fadd055d7ae90516586c2687bdcad2` |
| executionFingerprint | `sha256:0c1a93a688ce84661656de6dd3ae45de661521a6a368f26e4c326e54802489f9` |
| runtimeManifestDigest | `sha256:1c7fc5fd4df187a3571460bf807e860f1be6bfd704c3fd9fe037c641adea5340` |
| imageId | `sha256:97ed69a51a22b9a1830d43f668e0ee459e791f304aeb44937e1097d4bacd09c7` |
| sbomDigest | `sha256:01480122157fb26addb93faffd834e42ce426a06c85e18d07081bbdcabc3b58a` |
| normalizedScanDigest | `sha256:ce064cfa95a5f58c53110dae1b0a54b20d91067da266b2fbf90534495d6d7b6f` |
| rawScanDigest | `sha256:b0b1fbaca589032a7e3b934f143ba1f8101e2013ee1102006c27a763f88276dd` |
| rawDatabaseDigest | `sha256:afc06074e938a8cb3a92823379c75446366f6023a0f2da34b500c8cbce3c8b44` |
| runtimeEvidenceDigest | `sha256:bb5b220c8e2d82864af4c78ac3b7a47debb228aeb1e60e62a1e4cd251fac8f13` |
| receiptDigest | `sha256:dc68c8d265fc7acde8aa012cd899180da29c7b7d89a8cee1475b3ea8468c08ac` |

Both new rows retain exactly the advisory/package/version/type/PURL/severity/fixState/fixVersions identities stated above; no separate or widened package matching is permitted.

PR75 preserves its distinct execution fingerprint `sha256:6d197e6749e73469c0944ebdbfade4f6668726e092801fe8ea02d4794a6796ef`; PR74/76 retain `sha256:0c1a93a688ce84661656de6dd3ae45de661521a6a368f26e4c326e54802489f9`. The two proposed finding decisions would require exact rows for each of these two groups, not a wildcard approval. Full extraction/assertions are retained in `all-pr-bindings.json`, digest `sha256:ae29474ea88298a4d8eb732fe4ef7a1974bc52497dd1f66cc5ca36dfde9122df`.

The proposed new-row expiry remains **2026-12-04T00:00:00Z**. The earliest combined ledger/publication authorization limit remains **2026-11-30T00:00:00Z**, because the existing temporary-risk decisions expire then; this proposal does not extend them or authorize publication. Both new rows still require an explicit separate owner finding decision and subsequent exact immutable publication authority. No operative ledger or source change was made.
