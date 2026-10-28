# Revised PR #51 image scan and candidate tree (2026-10-28)

This checkpoint supports a new finding-specific owner decision. It does not
approve an exception, merge a PR, accept U1, or release C01.

Draft [PR #51](https://github.com/anton-asnitsky/StockSense/pull/51) now has
story head `4fe574f0349d89bce584ba09bccf33d096658020`. The matching proof-only
[PR #54](https://github.com/anton-asnitsky/StockSense/pull/54) has head
`4405d2e607ec1407ef053fac4f57896c6d162552` atop workflow child
[PR #53](https://github.com/anton-asnitsky/StockSense/pull/53) at
`9133c9efacb3443a9c3cd56c17ab3ad81f0e76a5`. Both PR #51 and #54 have
Git tree `d9339f019736f97f1b6ee47883d089762fa3e0e6` and U1's
ledger-excluded candidate digest
`sha256:15e1b80226d07916a0cab6dd81e00c00d502ec077ad7faa095d6a0b111d8abba`.
The proof diff from PR #53's head contains nine application, documentation,
and test paths and no `.github` workflow path.

In [PR #51 hosted run 40664060724](https://github.com/anton-asnitsky/StockSense/actions/runs/40664060724),
the Vulnerability job passed. U1 built and scanned both pinned images, then
stopped at protected-main ledger verification because `main` still binds the
older PR #51 tree. Its retained image-evidence artifact is `12804434439`:

| Image | Image ID | SBOM SHA-256 | Scan file SHA-256 | Findings |
| --- | --- | --- | --- | --- |
| validator | `sha256:2099e215717fe0f033971799db2f3e6dc40c6403db7473b1f1bebf431232a742` | `sha256:0e0f486ad16052ce6452ec4fce6292b1ac1691867a28f2eeb0182cf18587ed19` | `a612522c113cfc46cc44dacee4c2c3a940ba85efe0dafc746953e4ed0b23c2d9` | 0 |
| kiota | `sha256:9015e4be50e636ad9481e89d111d29e491626ccc8699ed853dfb3fe854a55b43` | `sha256:0bca05ffecfcc5c8b5ccafc8f34b1451112a26c54dfd40b2eaf797644771f489` | `fa149b4d3188a2e3f42032112a73fff38c99264843cbb4a8ad852a98e1152d07` | 1 |

The sole finding is `GHSA-qhrr-8q5h-9q3h`, Medium, bundled
`MessagePack` 2.5.302 (`pkg:nuget/MessagePack@2.5.302`), with a fix listed
in 2.5.303. Local SHA-256 checks confirmed each retained SBOM matches its
scan reference. The existing main ledger row expires
`2026-11-25T00:00:00Z` but covers only the prior candidate digest
`sha256:eb1645b7df20d5681c8200dd0ec6587621c12cebc58decb2aad317792a5d2c21`.
An updated row would replace it; the old tree would then lack a current
exception.

PR #51's first run stopped at the old ledger and skipped later checks. After
PR #52 merged the prior exception, its rerun reached CI policy and rejected
the workflow change. PR #53 isolates that workflow change in the Bolt, but its
workflow-only tree fails the ledger by design. The first proof PR #54 run
reached integration tests and found that clean-checkout regeneration used the
host .NET tool instead of the pinned Kiota image. PR #51 now passes exact
image IDs to the bounded runner for candidate evidence; focused local tests
regenerated all 107 outputs, with lint and type check passing. The code change
created the revised digest above. The updated PR #54 run also stops at the
ledger; full hosted tests are still pending a new exact-tree disposition.

An independent security review recomputed the revised candidate digest from
`4fe574f`, verified the retained SBOM/scan relationship and single finding,
and found no Kiota package or fixed-invocation change. Routing clean
regeneration through the existing bounded image runner strengthens the
candidate proof but does not remove the vulnerable dependency or prove it
unreachable. A missed deserialization route or future invocation/input change
remains a risk and requires reassessment. The main session confirmed via the
GitHub API that live `main` still has ledger blob
`42f8ea20a1bda7007b8051df4f90aaa412411196` (the PR #52 row) and that
retained scan artifact `12804434439` is present and unexpired.
