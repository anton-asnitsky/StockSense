# Current PR failure diagnosis — 2026-11-26

Live GitHub checks were verified against current open PR heads. All three heads and their shared base 402ace3b195c291a756ed230a24a73199ef8349a are unchanged from November17. The failed checks displayed on these PRs are still the November17 executions, not the new diagnostic workflow.

| PR/current head | U1 failed job | Vulnerability failed job | U2 |
| --- | --- | --- | --- |
| #74 edeec8b54a4ee2d019349befbb005b944dce901d | [134294978016](https://github.com/anton-asnitsky/StockSense/actions/runs/44155488252/job/134294978016) | [134294978611](https://github.com/anton-asnitsky/StockSense/actions/runs/44155488252/job/134294978611) | Passed134306278951 |
| #75 bd0241d3313a998039cce4a37059d188e502fda2 | [134294996369](https://github.com/anton-asnitsky/StockSense/actions/runs/44155493632/job/134294996369) | [134294996908](https://github.com/anton-asnitsky/StockSense/actions/runs/44155493632/job/134294996908) | Passed134306284968 |
| #76 0f5db4d25cc9364f825eb752dad05c037c7b9944 | [134298533448](https://github.com/anton-asnitsky/StockSense/actions/runs/44155502137/job/134298533448) | [134298533800](https://github.com/anton-asnitsky/StockSense/actions/runs/44155502137/job/134298533800) | Passed134306294528 |

Each U1 log reports a ledger row belonging to a different candidate tree or execution baseline. Protected main remains8cce4f8040ad0767fca1b1ab14a00bb067a66b76 with the obsolete v1 MessagePack approval. Its November25 expiry is an additional current blocker, not the cause of the earlier November17 executions. Each vulnerability job refuses findings without a permitted disposition (SCAN_FINDINGS); the retained source-bound evidence identifies High picomatch4.0.7 GHSA-fc5q-39xc-vjpf. See the prior u1-r15-new-picomatch-finding-2026-11-17.md and final PR scan records. U2 is still green on these exact heads.

## Approved implementation and fresh proof

The approved ledger/SBOM change remains isolated at3fef097f5a7f87885d6453dfd3017ec23751a1b1. Independent review passed57/57; PR74 and PR75 isolated validation also each passed57/57, lint and types. Their actual PR heads were not advanced because rollout is conditional on the technical proof.

Old diagnostic run44270921213 passed full coverage and canonical validation but failed its scan revision environment. Proof-only commit4b1ddb6772175692974d08afc932e49200cf99fe repairs this by asserting actual HEAD equals the pinned candidate and passing that exact revision to the scan child process. No production guard was changed.

Fresh [run45851142043](https://github.com/anton-asnitsky/StockSense/actions/runs/45851142043) failed both lanes in normal production image scanning. The repaired SHA assertion passed. Lane2 retained462 tests:461 passed, zero failures/skips and one existing release-only TODO, plus C01-C27 validation. Its scanner then rejected an incomplete validator finding before the simulated SBOM proof could run.

The independently checked raw validator scan contains20 matches:15 Node24.22.2 binary/generic rows (7High,6Medium,2Low), with24.22.3 listed as fixed, plus5 Wolfi glibc-2.44@2.44-r21 rows (3Medium,2Low) with empty fix state. Binary/generic identity is unsupported by the current PURL validator; the glibc rows fail fix-state completeness. Package/version/PURL membership exists in the retained SBOM. These include real fixedHigh blockers, not just formatting noise. The official Node24.22.3 security release and published Linuxx64 checksum are confirmed; archive bytes and signature still need verification before adopting that pin. See u1-validator-scan-review-2026-11-26.md for exact raw provenance and limits.

The approved plan excludes runtime/dependency/scanner-policy changes. No guard was relaxed, no new disposition was granted, and no PR was merged. The remaining work requires a separately reviewed validator remediation scope, then fresh proof before the already approved conditional working-branch rollout; protected-main compatibility/publication and finding decisions remain separate. R-15/R-16 and NFR13.2/NFR13.5/NFR15.2 remain open.
