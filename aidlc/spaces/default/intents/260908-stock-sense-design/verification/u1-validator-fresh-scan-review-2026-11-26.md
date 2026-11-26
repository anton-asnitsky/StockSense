# Independent fresh validator and Kiota scan review

Status: FINAL evidence reconciliation for corrected proof 45868206325, both lanes, is appended below. The first section retains the earlier preliminary archive assessment for chronology. The bounded Node/reporting repair is evidenced; unresolved image findings and protected-ledger publication still block ordinary U1. No finding acceptance or merge readiness is claimed.

## Preliminary archived Kiota evidence

Local artifact directory: `.local-data/u1-validator-proof-45866784501/lane2`. The archive scan contains 34 exact advisory/package rows across 21 CVEs: 32 Medium, one Low and one Negligible, zero High/Critical. All 34 match the bound SBOM by exact name, version and PURL. All use `ubuntu:distro:ubuntu:24.04`; 33 rows have scanner fix state `not-fixed`, and CVE-2016-20013 has `wont-fix`. No fixed version is reported. These scanner states are not owner dispositions.

Independently recomputed the runtime manifest from retained entries/config/SBOM and checked its image and SBOM hashes: normalized runtime remains `sha256:1c7fc5fd4df187a3571460bf807e860f1be6bfd704c3fd9fe037c641adea5340` (1775 entries, 96 inventoried packages), matching the historical patched Noble runtime. Image ID is `sha256:e69fd3d8643d9540ddebbc5ed0a301ec450ba3c6774bc2ec385e00b4800f23d8`. Retained DB v6.1.10 reports valid, built 2026-11-26T06:22:34Z.

| Archived file | SHA256 |
|---|---|
| grype-raw.json | 440ee0a61052cee2683f4814cd317529c332c2ab01c6a11c29005146c8d75135 |
| kiota.cdx.json | 45d2cc3d2cef220f31072f11fcf33169000505b060ce0efd3b69c89b25fcc4f6 |
| kiota.runtime.json | aa0355590ea8d50518e749519f764670e44822690e8820850a1c9d892ea75e69 |
| grype-db.json | c676d0c70da46a0930cec8f27082bdec5a9cccc2e5212f0ffe3d805fc7a48ea4 |

Comparison against the November 17 PR74 14-row record shows every historical identity remains and 20 rows were added: eight OpenSSL CVEs on each of libssl3t64 and openssl, and four glibc CVEs on libc6. This is an expanded current finding set against the same normalized runtime, not proof of a runtime change. Historical not-affected proposals remain unapproved and cannot be copied forward as current dispositions.

## Vendor status and every current advisory

Vendor pages were checked on 2026-11-26. OpenSSL rows refer to both Ubuntu binary packages at 3.0.13-0ubuntu3.16; glibc rows refer to libc6 2.39-0ubuntu8.12; ICU refers to libicu74 74.2-1ubuntu3.1. Every row remains unresolved for gate purposes.

| CVE and vendor source | Packages / rows | Historical or added | Noble vendor status observed |
|---|---|---|---|
| [CVE-2016-20013](https://ubuntu.com/security/CVE-2016-20013) | libc6 / 1 | Historical | Current vendor page unavailable after timeout; raw status retained, no new vendor conclusion |
| [CVE-2025-5222](https://ubuntu.com/security/CVE-2025-5222) | libicu74 / 1 | Historical | Vulnerable |
| [CVE-2026-100290](https://ubuntu.com/security/CVE-2026-100290) | libc6 / 1 | Historical | Current vendor page unavailable after timeout; raw status retained, no new vendor conclusion |
| [CVE-2026-107493](https://ubuntu.com/security/CVE-2026-107493) | libssl3t64, openssl / 2 | Added | Needs evaluation |
| [CVE-2026-107494](https://ubuntu.com/security/CVE-2026-107494) | libssl3t64, openssl / 2 | Added | Needs evaluation |
| [CVE-2026-107496](https://ubuntu.com/security/CVE-2026-107496) | libssl3t64, openssl / 2 | Historical | Needs evaluation |
| [CVE-2026-115819](https://ubuntu.com/security/CVE-2026-115819) | libc6 / 1 | Historical | Needs evaluation |
| [CVE-2026-121481](https://ubuntu.com/security/CVE-2026-121481) | libssl3t64, openssl / 2 | Added | Needs evaluation |
| [CVE-2026-121482](https://ubuntu.com/security/CVE-2026-121482) | libssl3t64, openssl / 2 | Added | Needs evaluation |
| [CVE-2026-121757](https://ubuntu.com/security/CVE-2026-121757) | libc6 / 1 | Added | Needs evaluation |
| [CVE-2026-121758](https://ubuntu.com/security/CVE-2026-121758) | libc6 / 1 | Added | Needs evaluation |
| [CVE-2026-124024](https://ubuntu.com/security/CVE-2026-124024) | libc6 / 1 | Added | Needs evaluation |
| [CVE-2026-124709](https://ubuntu.com/security/CVE-2026-124709) | libssl3t64, openssl / 2 | Added | Needs evaluation |
| [CVE-2026-126765](https://ubuntu.com/security/CVE-2026-126765) | libc6 / 1 | Added | Needs evaluation |
| [CVE-2026-35190](https://ubuntu.com/security/CVE-2026-35190) | libssl3t64, openssl / 2 | Added | Needs evaluation |
| [CVE-2026-84786](https://ubuntu.com/security/CVE-2026-84786) | libssl3t64, openssl / 2 | Added | Needs evaluation |
| [CVE-2026-88822](https://ubuntu.com/security/CVE-2026-88822) | libssl3t64, openssl / 2 | Historical | Needs evaluation |
| [CVE-2026-88823](https://ubuntu.com/security/CVE-2026-88823) | libssl3t64, openssl / 2 | Historical | Needs evaluation |
| [CVE-2026-95690](https://ubuntu.com/security/CVE-2026-95690) | libssl3t64, openssl / 2 | Added | Needs evaluation |
| [CVE-2026-95691](https://ubuntu.com/security/CVE-2026-95691) | libssl3t64, openssl / 2 | Historical | Needs evaluation |
| [CVE-2026-95692](https://ubuntu.com/security/CVE-2026-95692) | libssl3t64, openssl / 2 | Historical | Needs evaluation |

The vendor source package matters: the OpenSSL advisory pages also contain Noble nodejs rows marked Not affected; those are not the scanned libssl3t64/openssl packages. The scanned package status is Needs evaluation. Likewise scanner Medium severity follows the Ubuntu namespace and is not a claim that every upstream CVSS rating is Medium.

The [OpenSSL November 17 advisory](https://openssl-library.org/news/secadv/20261117.txt) explicitly describes OpenSSL 3.0 as unaffected by CVE-2026-35190 and schedules releases containing its listed fixes for December 1. This is useful applicability evidence, not a verified image-specific disposition or installed fix. New QUIC, DTLS, PEM, DANE, encoding and glibc matches require bounded applicability review against actual shipped code and invocation paths. No new exception or suppression is introduced here.

## Earlier pending-evidence checkpoint

Await both corrected-run normal production image directories and retained receipts. Verify source revision, exact raw/normalized equality, image/SBOM hashes, current database binding, every match and zero dropped rows. Confirm actual Node 24.22.3 SBOM inventory and absence of the old 15 binary findings rather than infer it from the version alone. Reconcile all remaining Wolfi and Kiota rows against those final bytes. Keep R-15 and security/release gaps open; no protected-main publication, merge, U1 acceptance, C01 release or next-gate advancement follows from this review.

## Final corrected-run evidence: both independent lanes

Corrected diagnostic [run 45868206325](https://github.com/anton-asnitsky/StockSense/actions/runs/45868206325), workflow commit `d454f2c161b948fd95ce6e5453cd120311999a8d`, builds exact production candidate `59c34bae1e031c0db032f99f2ea1d12f67715e76`. Both retained normal production image directories were independently verified with the reviewed production `readImageEvidence`, `verifyRawImageScan` and `readKiotaRuntimeEvidence` helpers under Node 24.22.3. Verification passed exact source revision, image ID, SBOM hash, raw report hash, database receipt hash and deep equality of recomputed normalization; every raw finding survived. Independently compared every finding by exact SBOM name/version/PURL.

The outer ZIP bytes independently match retained GitHub artifact digest metadata, workflow ID and proof commit. Each of the 79 extracted files in each verified-lane directory was separately hashed against its corresponding ZIP entry, so the reviewed extraction is bound to those archives. This is proof-artifact verification; the large separately uploaded image tar artifacts were not downloaded or byte-verified by this reviewer.

| Lane | Artifact | ZIP SHA256 |
|---|---|---|
| 1 | 15141907394 | sha256:313cba31aefa5d7dc6e4d827f8774e4a56385b909ca9adae371869a3a3a98319 |
| 2 | 15141503314 | sha256:4c344ce6fcce8ffc2aea3661e5ae058193cb4bd027fe5b99bfff1d107dba07f8 |

### Actual repair outcome

Both validator inventories contain exactly one Node component, `node@24.22.3`, PURL `pkg:generic/node@24.22.3`, and no old Node 24.22.2 component. Both scans contain zero binary Node findings: all 15 previous Node findings, including seven fixed High rows, are absent from these fresh scans. The retained old raw fixture still exercises detection and blocking; no suppression was added.

Both validators retain exactly five Wolfi `glibc-2.44@2.44-r21` rows: Medium CVE-2026-121758, CVE-2026-124024 and CVE-2026-115819; Low CVE-2026-126765 and CVE-2026-100290. Their raw namespace remains `nvd:cpe` and raw fix state is explicitly empty with empty versions; normalized fix state is `unknown`. All five exactly match the SBOM. Independently invoking disposition verification rejects them with `IMAGE_SCAN`; they do not become exception-eligible. No vendor-supported clean revision or candidate-specific not-affected decision was established. See the same-day primary-source research in `u1-security-remediation-plan-inputs-2026-11-26.md`; later Wolfi revisions appearing on vendor pages do not prove these exact bytes fixed.

Both Kiota scans retain exactly the same 34 identities listed above: 32 Medium, one Low, one Negligible; all remain in `ubuntu:distro:ubuntu:24.04`, with exact SBOM membership. Neither image in either lane contains a High or Critical scan row. All 39 findings per lane remain present. Kiota runtime normalization independently returns `sha256:1c7fc5fd4df187a3571460bf807e860f1be6bfd704c3fd9fe037c641adea5340` for both builds despite distinct actual image IDs.

The shared raw database receipt SHA256 in all four image records is `6b4e66db9d3f69837170ad6a1e145580f70b013b6a67a80f1b458da52fbd0805`; retained database schema v6.1.10 is valid and built 2026-11-26T06:22:34Z. No current database or receipt was fabricated.

| Lane / image | Actual image ID | SBOM SHA256 | Normalized scan SHA256 | Raw scan SHA256 |
|---|---|---|---|---|
| 1 / validator | sha256:6e29e0b44298dde38c3c69fdee7f4be8fe9628977fa7a283236353f77dd83bb6 | sha256:acf7c88d60a52f1fcea65c1dd74ccc3e492f176b38b61aa4f9cd2c6fe2f8bac5 | sha256:5aad6f98344f83c5445a5f9260a42ca6e5dd910ce66c3f9aee2b323e39c55a78 | sha256:60e2e520a52433502eb8532688edc953aa040c6ce72b91fb3256c7c881ca29c1 |
| 1 / kiota | sha256:7e0930d9ff30026918ba953bfd0a0802a00791f9122022e548d13c94588b862d | sha256:274892d4ab3fd419cd779bc0d3817a37ef18c1c2c4716a3b3cc84210497293b6 | sha256:b037f5c129b2756564d37383b03b8b3f4c784df86218bd10193aa5f8cebbd9a4 | sha256:ffa08e82054e0248a2019796b61f16d02e70ff20e0eae20aa23ed6fb4e11b5df |
| 2 / validator | sha256:71dace3f0c737795247ec8eb9c77d07750549a7cc6fffc6d96504d54d3228ed9 | sha256:ddca6106bedcc0e2e5244f750aa80f529d66b043915f8bf84b1fb82167a14fd4 | sha256:7ee23007acecf68e6ea476235f41d02f6b02bffde508e5ce5309ef04a8ff869a | sha256:6eb828f7fa9a20ae7b1db391a06524f63a081bd032e780975d8c4927fad2c405 |
| 2 / kiota | sha256:c5e72dd6f52c0fb5e5decdfdc467a82703dfa7b8fae68e668ac09d6f6c102a87 | sha256:e9ef01147cf38ed97059a8e0fdfcc3b7db75b6e7408f33bfc527dcacbe0a8777 | sha256:b70e453b81d1569286548cf76c2f281f6a3e1e6201f6bcfa2fa33e4449d17312 | sha256:6953dfd49e2d98de7ec01df8c77ca648f119aebd10b9cdb9bf10e191c32303bc |

### Security conclusion and limits

The bounded validator repair passes this independent retained-evidence review: the verified new Node binary removes the old binary findings, normalization completes without dropping unresolved rows, and disposition rejection remains active. This is not a clean image result. Five validator and 34 Kiota findings still lack permitted current dispositions, and the protected-main ledger remains expired/incompatible.

Both diagnostic simulation results explicitly contain `simulationOnly:true`, `protectedReceipt:false`, `ordinaryU1Passed:false`, `ownerApproval:false`, `unknownDispositionRejected:true` and `positiveLedgerSbomProofCompleted:false`. These flags were independently checked. A successful diagnostic workflow means the intended rejection was demonstrated; it cannot substitute for positive ledger/SBOM approval or ordinary U1 CI.

The coordinator owns full test/coverage, C01-C27 and consumer execution assessment and all subsequent exact-PR-head CI checks. This review does not assert those ordinary PR checks are green. New heads require genuine U2 owner approval. No finding exception, protected-main trust change, merge, U1 acceptance, C01 release, R-15 closure or next-gate advancement is authorized.

## Actual PR rollout evidence: independent follow-up

Independently reconciled the ordinary hosted artifacts after the reviewed repair was published to PRs #74-#76. This section concerns actual PR test merges rather than the isolated diagnostic candidate. GitHub commit API independently confirms each source below has exactly two parents: common base `402ace3b195c291a756ed230a24a73199ef8349a` and the listed new PR head. The source revisions equal both the artifact name suffixes and the raw receipt sourceRevision fields. GitHub artifact metadata also binds each workflow run to its listed PR head.

| PR | Published head | Actual test-merge source | GitHub tree |
|---|---|---|---|
| 74 | 2252d2109d47d3f26c6d6d0a035cea9be96ded81 | 3ec87945e6f537b2d4b5a0c79b08e4cc7fcfc39e | ab873f9e837e10df24580fa249a6e8d35272937c |
| 75 | d592dff7483ee6af2c12d9639c4b23332eaea2a6 | 3da4f6e640b672ae6ad2d8d81235e2da7b79267a | 632d12d33b689eccaf6f36e7c282d9abb8311634 |
| 76 | e70f9a78c465468c17a47407b0385e1c9c54c67b | 661e7d5071e2162d25ec0f3c87891cc4ec6eb96a | ab873f9e837e10df24580fa249a6e8d35272937c |

Independently hashed all three downloaded ZIP files against retained GitHub metadata. Independently hashed each of the 11 extracted files per artifact against its ZIP-entry bytes. The reviewed directories are `.local-data/u1-validator-<run>/verified-image-evidence/`.

| PR / ordinary run | Image artifact | Verified ZIP SHA256 |
|---|---|---|
| 74 / [45871261749](https://github.com/anton-asnitsky/StockSense/actions/runs/45871261749) | 15142653961 | sha256:9ed64994f6188ec45931d362b790189873882fe635317a664c6bda0ba4dd6350 |
| 75 / [45871261227](https://github.com/anton-asnitsky/StockSense/actions/runs/45871261227) | 15143695081 | sha256:c752f1bae40f40620b90675a678fb3bd79afffd8157ce9a082395dacdb8875e0 |
| 76 / [45871258618](https://github.com/anton-asnitsky/StockSense/actions/runs/45871258618) | 15143705153 | sha256:333f8e97f067c89a038a46f58e276cc0ab0f53a89017ac8887d81d3a7ac68729 |

Used reviewed production helpers under verified Node 24.22.3 to check all six actual image records: raw/normalized equality, exact source revision, image/SBOM/raw/database hashes, current database validity and exact package name/version/PURL membership. All checks passed. Every actual validator inventory contains only Node 24.22.3 for its Node component, and the old 15 binary findings remain absent. Each validator retains the same five unknown glibc findings and rejects attempted disposition. Each Kiota retains the same 34 finding identities, versions, types, PURLs, severities, fix states and fix-version lists as the reviewed corrected proof. Zero rows were dropped and no High/Critical row appears in these fresh scans. All three actual Kiota runtime manifests independently normalize to `sha256:1c7fc5fd4df187a3571460bf807e860f1be6bfd704c3fd9fe037c641adea5340`.

| PR / image | Actual image ID | SBOM SHA256 | Raw scan SHA256 | Normalized scan SHA256 |
|---|---|---|---|---|
| 74 / validator | sha256:f7ca0ae0856513f81f22e48745f4b33b4bd665930f40c2a132a695dd6f82b5d4 | sha256:cf5eea77ceab5c0c64c6f975678beaaade98cf0c22b4d1e5a17f19714c439fe1 | sha256:2645c5a09977069071676e84afe1d047a608026e362f62b4b31d6481be2d30bc | sha256:c53bd57a983b4b4a492913a144fcfdc378eeb1f615aba9b38d1d51ce6056cef2 |
| 74 / kiota | sha256:db30474c6df55f7890c201c8216fdf46fcbfb22070886dfa4cacbd86eca14383 | sha256:82d130209f8ed947a0ce25613b5c8bc7e3040629f1f89b5071c34ea7b62659d0 | sha256:69b4eec35b647d06cf07927779bace7c59d147032b8a7b6af42794f583217ce8 | sha256:9439458dc2b19ed3d4b0353829cc03ef8188d5f59dc6c2e6fe47b0ea35800377 |
| 75 / validator | sha256:3be19c4c3421eadc2896dfe14b26763280ab481d72ddda7c828bef2e7d396411 | sha256:ac906a1bbdf20f312ab04a0a432c1dae2d56debf193348b2da7184c1402ef2f0 | sha256:eaeabfe2349ed14e074c82216b26e0b3c2dba6ea2abfd8532a7569f32a21747e | sha256:2e93dddaf4563b1b68c977178b269e47d0f0e4c3a8f7c0e3347adffa649d2f90 |
| 75 / kiota | sha256:62f6275fe18aae110e52b7d8a19c39702e39de7e01046b19ed733c1e634394c9 | sha256:e56add6b2e706604b5018197ed36af342bb2c51f125ed4754bb58344880f471c | sha256:5dbc83344ecc3358f1f4b743df79c8aa58c656e702375ff74e1a32f06d5f35f0 | sha256:3de329c1fd821b9683960c2c6ae844d6926a88f5608ea6140b82df231d6c9e57 |
| 76 / validator | sha256:bc34d2585f72eca23dc5a00ae9ef05a6d9ad18628dea93f837de1578ac98ecb5 | sha256:1197abbb30172784bfa8ea4c61cbb6b069651c6cdd70f4bbaea549c30178cc29 | sha256:b4776dbbf58338a99f1b462142de257990c5b2245680126305a4c97e1d6647c8 | sha256:d839c2d7952ef9f1d95be2380980eb2cb174c354d46e011fc4da4a1e66aa4351 |
| 76 / kiota | sha256:d28e88ff9100f6df37890cbb88bc0509159fcabbe44d76013942e84c29efd65d | sha256:57245beab46c52ee4fef257b46ea462aca02831e7b41017f7dae0fe1f751851e | sha256:3063b654a13c3410db03952cb97b7455ed5c05b327d2f46dd74cf60d304f9456 | sha256:1ca112ed396c00533bd3ad89cb2119ca144b31b5790a7e6a6d67f19c03075b26 |

All six raw database receipt digests equal `sha256:6b4e66db9d3f69837170ad6a1e145580f70b013b6a67a80f1b458da52fbd0805`. This retains the actual database evidence rather than copying an approval between revisions.

### Ordinary CI remains blocked

Independently queried each run job list: Vulnerability scan succeeded on all three, while U1 contracts failed at `Verify current findings against protected main ledger`. Successful image scanning and complete retained evidence do not make that later policy step pass.

| PR | Vulnerability job: SUCCESS | U1 job: FAILURE |
|---|---|---|
| 74 | 140086968999 | 140086969525 |
| 75 | 140086967997 | 140086967756 |
| 76 | 140086958218 | 140086958825 |

No current finding disposition, ledger-authority change or U2 owner approval was inferred. The new heads require fresh genuine owner U2 comments; historical approvals cannot transfer. All 39 findings per PR remain represented, and the protected-main ledger remains a separate blocker. These ordinary artifacts confirm the validator repair on the actual PR test merges, not green overall CI, U1 acceptance or C01 release. All merges remain with the owner and the next gate stays on hold.
