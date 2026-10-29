# US8.7 reusable image exception: hosted proof checkpoint

## Source identity

- U1 Bolt sync PR #70 merged as `ac0a2f5a8ddaa205b176bf2c4f4468a82dfe91e9` after the owner's exact base/head approval and U2 pass.
- Story PR #72 head: `3db2391c61198ed38df9e9ba28abc66cf5e0dcb4`, based on the U1 Bolt; draft, unmerged.
- Proof PR #71 head: `19747e7343aaf5cdb7982fffface38acdec9f8d5`, based on main; draft, unmerged.
- Both heads have Git tree `b97618c28f6540f0d767cf4a9cbfa85332a11948`.
- U1 Code Generation plan approval fingerprint `sha256:71be9ce061ef26cfa02fa6fe235ee3c0f34045105da361ddf014b2210cb5f609` remains valid: `testing-posture verify --unit contracts` returned `approved: true`, `fingerprintValid: true`, `receiptValid: true`.

## Independent hosted image builds

Run [40961343256](https://github.com/anton-asnitsky/StockSense/actions/runs/40961343256) executed twice on the same PR #71 source tree. The retained image-evidence artifacts were inspected by their unique IDs to avoid confusing same-named artifacts from reruns.

| Attempt | Artifact ID | Kiota image ID | Runtime digest | Validator findings | Kiota findings |
| --- | ---: | --- | --- | ---: | --- |
| 1 | `12936431424` | `sha256:4f57b3f07ffc9ff26b1510b5b09890318006413aa09ec597870bb99d11170b80` | `sha256:70a0ef0fcb93807a86bae1fcbc81ee2d8c7e15dca01a7afdfe58c5ce9cfc082e` | 0 | 1 Medium |
| 2 | `12935848555` | `sha256:b8f1497ec62f60ada44cd41d8b4338bccd3432428c4e4f1ac63642def47fd018` | `sha256:70a0ef0fcb93807a86bae1fcbc81ee2d8c7e15dca01a7afdfe58c5ce9cfc082e` | 0 | 1 Medium |

Each Kiota scan names its own exact image ID and reports `GHSA-qhrr-8q5h-9q3h` in bundled MessagePack `2.5.302`, fixed in `2.5.303`. Each runtime manifest has 2,390 entries and 218,922,397 file bytes. The two image IDs differ while the complete runtime digest is identical. The raw artifact records are retained by GitHub for 30 days.

Both U1 jobs stopped at the expected protected-main image-ledger check. The existing v1 row is bound to an older candidate tree, so neither run is a passing U1 check or an approval of the finding. Vulnerability scans passed. PR #72's U2 check remains red because its protected paths have no exact base/head owner approval comment.

## Local and review evidence

- Contracts unit suite on the Bolt-based story branch: 332 passed, 2 skipped, 0 failed. Focused archive/ledger tests, lint and type check passed. Local Node was 24.22.1; hosted CI pinned 24.22.2.
- At story head `3db2391`, the local `verifyBoundImageEvidence` code accepted the **proposed** v2 row against each downloaded artifact by unique ID. Both calls returned `stocksense-image-ledger-verification-v2`, validator disposition `0`, Kiota disposition `1`, execution fingerprint `sha256:fc4168f931fc3773e7b1401c400afbc38811cc6b96d2693fef06fddf52903bca` and runtime digest `sha256:70a0ef0fcb93807a86bae1fcbc81ee2d8c7e15dca01a7afdfe58c5ce9cfc082e`. The calls used the PR #71 merge revision `82d744d92353d6d465d6eff19b136903c6dcade6` and its identical story Git tree `b97618c28f6540f0d767cf4a9cbfa85332a11948`; `readKiotaRuntimeEvidence` recomputed each runtime digest from its retained SBOM. Because PR #73 is unmerged, the test supplied placeholder main/blob provenance to exercise the finding disposition and runtime checks. It did **not** verify an immutable protected-main v2 blob or make either hosted U1 job pass.
- Independent security review found no Major or Blocking code issue with the bounded archive parser and required two hosted builds before proposing v2 activation; those builds are recorded above.
- Process review found stale source-manifest and traceability wording. Five missing story paths were added to `source-manifest.json`, and `traceability.json` now records the renewed approval and proof. Its 95-ID mapping and GAP rows remain historical; this checkpoint does not claim full traceability or U1 candidate READY.

## Open decisions

The owner approved the reusable exception design, implementation plan and the exact v2 finding for preparing a protected-main ledger PR; the ordered finding answer is recorded at 2026-10-29T22:12:23Z in [the question](../construction/contracts/code-generation/u1-v2-reusable-image-exception-questions.md). Draft [PR #73](https://github.com/anton-asnitsky/StockSense/pull/73) contains that single ledger replacement. Its merge, the exact U2 protected-path comment, any protection change, PR #72 merge, U1 acceptance and C01 release remain separate decisions. R-14 through R-16 and 95-ID reconciliation remain open.
