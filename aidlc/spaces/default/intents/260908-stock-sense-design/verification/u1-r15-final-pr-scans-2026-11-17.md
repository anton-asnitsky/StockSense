# R-15 final ordinary PR scan evidence

Recorded 2026-11-17 after PR #76 attempt 2 completed at 19:18:46 UTC. The ordinary workflows built and scanned the current test-merge revisions on all three PRs. The raw receipt verifier and complete image evidence reader passed for every retained validator and Kiota image, with `requireClean=false` preserving the findings for disposition.

| PR | Working head | Test-merge revision | Run | Attempts retained |
| --- | --- | --- | --- | --- |
| 74 | edeec8b54a4ee2d019349befbb005b944dce901d | 8856f2d6c1990dd0df3bfb1ae63553e21bfb7b49 | 44155488252 | 1 |
| 75 | bd0241d3313a998039cce4a37059d188e502fda2 | 20add1080680567a75692e857b98b2c225d81dde | 44155493632 | 1 |
| 76 | 0f5db4d25cc9364f825eb752dad05c037c7b9944 | 9fc0a9b55f9b0b35b483816beb67052fcb4a3581 | 44155502137 | 1 and 2 |

Base is `402ace3b195c291a756ed230a24a73199ef8349a`. PR #76's test-merge tree is `54c472fba572fffddaa15b3e4e96edfaa6868691`, exactly the production tree independently exercised twice in full proof run 44153396174. That full proof passed lint, types, 452 tests per lane with one existing release-only TODO, and the C01–C27 package with 27 boundaries, 40 documents and 355 fixture outcomes. See `u1-r15-production-noble-44153396174.md` and its machine-readable companion.

## Findings and gate outcomes

All four ordinary scan executions produced the identical normalized Kiota runtime digest `sha256:1c7fc5fd4df187a3571460bf807e860f1be6bfd704c3fd9fe037c641adea5340`. Each retained 14 Kiota findings, zero validator findings and zero secret findings. The six fixed libc6 findings remain absent. Every pnpm audit retained one high finding, `GHSA-fc5q-39xc-vjpf`, for picomatch 4.0.7 through `.>secretlint>@secretlint/walker>picomatch`.

U1 failed at `Verify current findings against protected main ledger`. The vulnerability job failed at `Require current clean or approved finding-specific scans`. Scanner report status `passed` records successful scanning. The finding-specific gates still fail. Ordinary lint, types and tests downstream of the image gate were skipped. The separate full proof above supplies the tested integrated-tree evidence.

PR #76 attempt 2 independently rebuilt both images. Its Kiota image is `sha256:110fdcd646e26ebd7b3408d64d48fa44e9ce02c9fc7bec299280b5ba3461daf8`; attempt 1 was `sha256:9bc5cebd5758b9fb6a17ea407f91ddbd17f96de2a36d7cc05a9c4c874ce04716`. Their normalized runtime identities agree. Attempt 2 U1 job 134298533448 and vulnerability job 134298533800 reached the same explicit finding gates. Exactly two ordinary executions were retained for this final integrated revision.

U2 requires renewed owner approval for each final working head. The earlier passing U2 receipts belong to earlier heads. These scan records confer no approval or finding disposition. R-15 remains open with the 14 runtime rows and the newly published picomatch finding requiring resolution.

## Retention and integrity

`u1-r15-final-pr-scans-2026-11-17.json` records the three first attempts, artifact IDs and GitHub digests, exact source identities, image IDs, SBOM and normalized scan hashes, all findings, and security report bytes' hashes. `u1-r15-final-pr76-attempt2-2026-11-17.json` records the second attempt separately. All raw scan receipts and inventory bindings were verified using the production verifier against their exact merge revisions.

Raw artifacts are retained under `.local-data/r15-final-pr74-44155488252`, `.local-data/r15-final-pr75-44155493632`, and `.local-data/r15-final-pr76-44155502137`, with the second attempt in the last directory's `attempt-2` subdirectory. Original ZIP hashes were verified for PRs #74 and #75 and PR #76 attempt 2. PR #76 attempt 1's extracted raw evidence and verified receipts were retained before rerunning. GitHub replaced its artifact IDs before the original outer ZIP could be fetched, so its recorded GitHub ZIP digest has no locally retained ZIP verification. The per-file receipt verification succeeded.

PR #76 attempt 2 image artifact 14362255865 has verified ZIP digest `sha256:f377d54a9f8f20ebd3bf0d9cbd1cbade53d454fbc6b3feb6ebabe91e5159f07f`. Security artifact 14360907774 has verified ZIP digest `sha256:38aa93f727ed85b6c5d6079ee8128386c338c05350869e2600ab1b2525ef5aa0`.

Hosted records are [PR #74 run](https://github.com/anton-asnitsky/StockSense/actions/runs/44155488252), [PR #75 run](https://github.com/anton-asnitsky/StockSense/actions/runs/44155493632), and [PR #76 attempt 2](https://github.com/anton-asnitsky/StockSense/actions/runs/44155502137/attempts/2).
