# R-15 image scan and SBOM reconciliation

## Original integrated scan

The [PR #76 U1 scan](https://github.com/anton-asnitsky/StockSense/actions/runs/44090953475/job/134065588018) stopped at `validator scan has an incomplete finding` for test-merge `370d5a744997d7f5a68989a60dff6c8aadb742a6`. The [image artifact](https://github.com/anton-asnitsky/StockSense/actions/runs/44090953475/artifacts/14331802564) contains the validator CycloneDX inventory, raw Grype matches, database status and raw receipt. The independent security reviewer recomputed the inventory, raw scan and database hashes against that receipt. The database build was 2026-11-17T06:20:58Z.

| Validator evidence | SHA-256 |
| --- | --- |
| Built image | ced80bb15f7f7ed44dc164b9c0e274a3e09c0231bf7ed79f8b124358ae1c8f9a |
| CycloneDX bytes | d3e89bfb4a918d68553d174403e95b3e88c27609e8bfd8aac51d7efff3de51ef |
| Raw scan | 267b4731297ea9b9ed675ed547a280d92351d8ce0767d2adfc22580752498611 |
| Database status | 496b86aa16bf26139b3023ed51c4b975e84666e3bc7b663e0edc328b300ed2fc |

All seven matches joined to four of the 683 CycloneDX components by exact package URL. Six matches were complete Wolfi APK records. The identity validator understood Debian, npm and NuGet package types and rejected APK before disposition. The failure stopped the run before Kiota's inventory and scan.

| Finding | Observed packages | Grype fix |
| --- | --- | --- |
| CVE-2026-84243, High | glibc-2.44, glibc-2.44-locale-posix and ld-linux-2.44 at 2.44-r9 | 2.44-r16 |
| GHSA-8rvm-662m-jvqv, Unknown | Same three Wolfi packages at 2.44-r9 | 2.44-r16 |
| GHSA-474x-hrwr-fgx4, Low | Production fast-xml-parser 5.11.2 | 5.12.0 |

The separate [security reports](https://github.com/anton-asnitsky/StockSense/actions/runs/44090953475/artifacts/14331122806) bound a clean secret scan and a completed pnpm audit to the same revision. The audit returned two Moderate GHSA-g3hv-75wg-m249 paths to minimatch 10.2.6, directly through ESLint and through its @eslint/config-array dependency. The disposition job correctly failed.

## Repairs and final hosted replay

[US8.7 PR #75](https://github.com/anton-asnitsky/StockSense/pull/75) contains the repairs at `8e44978078965cd0350579d90f223853211a6606`. [Combined PR #76](https://github.com/anton-asnitsky/StockSense/pull/76) carries them at `0d9461a607e2d83becd55ac7bbcd97124cc6fb1b`. GitHub tested merge candidate `2ec5269eadd852a0badc3172278c00db4c41f2d8` against Bolt base `402ace3b195c291a756ed230a24a73199ef8349a`.

The scanner recognizes APK identities, compares normalized scan/database records with the receipt-bound raw reports, and requires each finding to match the exact CycloneDX package URL and version. Replay of the original raw evidence retained all seven matches, including the Unknown severities, and correctly blocked disposition. The validator now pins the linux/amd64 glibc-dynamic manifest `sha256:3d6b3b0d4dfb6dceb5f0ce1db5143b4de8658b89578a911cadba5ed39ef61633`, with all three affected packages at 2.44-r21. The frozen dependency graph selects fast-xml-parser 5.12.0 and ESLint 10.15.0 with minimatch 11.0.8 and the supported Ajv 6 API. Focused image-evidence/SBOM tests passed 36/36; SBOM/source-digest tests passed 26/26. The latter suites overlap. Local frozen install, audit, lint and type check passed.

The [integrated hosted run](https://github.com/anton-asnitsky/StockSense/actions/runs/44094830641) built, inventoried and scanned both images. The secret and dependency reports had zero findings. An independent replay using the integrated verifier rechecked the raw-report receipts, SCAN-to-SBOM digest bindings, normalized findings and inventory membership. The [retained reconciliation](r15-actions-44094830641.json) contains the exact image IDs, database digests, findings, versions, PURLs and fix versions derived from the [hosted image evidence](https://github.com/anton-asnitsky/StockSense/actions/runs/44094830641/artifacts/14333981364) and [security reports](https://github.com/anton-asnitsky/StockSense/actions/runs/44094830641/artifacts/14333965837).

| Final image | CycloneDX components | Components with name, version and PURL | Grype matches |
| --- | ---: | ---: | --- |
| Validator | 683 | 314 | 0 |
| Kiota | 1,945 | 118 | 6 High, 1 Medium, 6 Unknown |

The six High Kiota matches cover four glibc-family packages at 2.44-r9 and two advisories on libexpat1 2.9.0-r0. The reported fixes are 2.44-r16 and 2.10.0-r0 respectively. Six Unknown matches also name those installed components. The Medium match is MessagePack 2.5.302, with 2.5.303 listed as fixed. The run retained all 13 matches; counts describe scanner matches and may include related advisories.

The [protected-main ledger step](https://github.com/anton-asnitsky/StockSense/actions/runs/44094830641/job/134079090551) rejected the candidate binding. The [U2 protected-path check](https://github.com/anton-asnitsky/StockSense/actions/runs/44094825309/job/134079075360) also failed. The [US8.7 story run](https://github.com/anton-asnitsky/StockSense/actions/runs/44094821974) passed its vulnerability job and failed its U1 check. The integrated lockfile/tool-recipe CycloneDX inventory alone has 447 components, all pnpm entries hashed. Building the governed combined image-and-lockfile SBOM with the final evidence returned `IMAGE_LEDGER / BR6.5` because no successful current ledger verification exists.

**R-15 remains open.** The original parser defect and validator/dependency findings have fresh passing evidence. The next repair concerns Kiota's pinned runtime and generator, which the approved plan binds in Steps 17–18. Replacing those pins requires a reviewed plan change, new generator-output and runtime equivalence checks, and fresh scans. A prior finding-specific exception cannot dispose of the six new High matches. Current combined SBOM attestation remains outstanding.

## Kiota 1.38.0 follow-up

The owner approved plan fingerprint `sha256:91e8b0ba0d52570d5a6ba671b6f45efa940e1d879a989334556ccdc2d820a389`. Native testing-posture verification in the root checkout returned true for approval, contract, fingerprint, and protected receipt. The story head is `c5157d34845b33c863f6e2d1c3e8f81a25fb6b21`. The integrated head is `6638de5303c95c3a50fa66d550be33de4627c6a8`, and the test merge is `836fd77abbe0daec025d8c471385681c0dc20a3c`. [Integrated checks](https://github.com/anton-asnitsky/StockSense/actions/runs/44114996835)

Both worktrees reproduced 107 consumer output paths across two clean runs. All 103 C# sources remained byte-identical to their respective 1.35.0 baselines. Only the Kiota version field changed in the generated lock. Each worktree passed 14/14 generation tests without skips. Both generated .NET clients compiled and exercised an in-memory GET session, response deserialization and review-request serialization. The integrated .NET output tree digest is `sha256:f582db3de87bf45a3c947b7c17acd74b9ec11ba5858bf62323e1efa73ffb3fd1`; the story digest is `sha256:af4fcf9fa7910dfb5f6fae394979e8062eeb39c4362f242b2623dd5d1a0a97d8`.

The two hosted builds of integrated revision `836fd77abbe0daec025d8c471385681c0dc20a3c` produced distinct Kiota image IDs and the same normalized runtime digest, `sha256:d701920b3075f3b892078cdfd498abb25f731ec561c8c9ec1d07134cfcac9188`. Each raw scan reconciles to the same 20 Kiota matches (18 Medium, one Low, one Negligible). The validator, secret and pnpm reports were clean in each attempt. Ubuntu libc6 2.39-0ubuntu8.9 accounts for six Medium matches with a fix in 2.39-0ubuntu8.12. MessagePack 2.5.307 appears in inventory with zero matches. See the [machine evidence for both attempts](u1-r15-kiota-138-pr76-44114996835.json).

Both ordinary U1 attempts failed protected-main ledger verification, blocking the governed combined SBOM and attestation. U2 requires a fresh exact-revision owner comment. Removing the historical 1.35.0 exception would leave the current OS findings unresolved. R-15 remains open. [Hosted U1 and vulnerability jobs](https://github.com/anton-asnitsky/StockSense/actions/runs/44114996835/attempts/2) · [U2 policy job](https://github.com/anton-asnitsky/StockSense/actions/runs/44114989150/job/134150526298)

### Current PR head after C18 regression repair

Commit `e284f99d5629dfcbfcb2935b0005c48c40c3d2e9` checks the expected outcome by name for all four C01 and seven C18 fixtures. The local package suite passed 16/16. Both lanes of the [hosted consumer and coverage proof](https://github.com/anton-asnitsky/StockSense/actions/runs/44120057419) passed against test merge `46325b340caa23f203227eae0f92a97b2c818c9c`.

Both attempts of the [ordinary PR workflow](https://github.com/anton-asnitsky/StockSense/actions/runs/44119539218) reproduced the same Kiota runtime digest and 20 OS findings. Both passed the vulnerability job and failed U1 at the protected ledger. The [current raw evidence comparison](u1-r15-kiota-138-pr76-44119539218.json) binds the artifact hashes, inventories, findings and image IDs for both attempts. [U2](https://github.com/anton-asnitsky/StockSense/actions/runs/44119532357) requires an owner-authored comment on the current base and head. No governed combined SBOM or attestation has been established for this revision. The [ledger retirement proposal](u1-r15-kiota-138-ledger-retirement-proposal-2026-11-17.md) records the conditions for revisiting the obsolete row.

The owner authorized isolated screening of the pinned Azure Linux alternative. The assembled image passed bounded offline execution and produced zero Grype matches. Microsoft advisory evidence mapped the 20 Ubuntu rows to 16 affected Azure Linux rows, one fixed ICU row, and three unresolved rows. The positive control confirmed a working distro feed. The screened digest is unsuitable for promotion. See the [isolated screening record](r15-azurelinux-isolated-screen-2026-11-17.md) and [hosted positive control](https://github.com/anton-asnitsky/StockSense/actions/runs/44121530430).
