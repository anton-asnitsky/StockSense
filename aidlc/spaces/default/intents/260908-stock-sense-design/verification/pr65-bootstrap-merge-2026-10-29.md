# PR #65 protected-ledger bootstrap merge — 2026-10-29

The owner authorized the one-time bootstrap of
[PR #65](https://github.com/anton-asnitsky/StockSense/pull/65) at exact head
`219105f95e75a17a88b23289bb0012b4c3cd79dc` into `main`
`8b0b7ae88a89edd717f7899a3723dff952fb8f03`. The answered question is
`construction/contracts/code-generation/pr65-bootstrap-questions.md` in
commit `2f83771`; audit order is `DECISION_RECORDED` 11:41:20Z,
`HUMAN_TURN` 14:00:16Z, then `QUESTION_ANSWERED` 14:01:07Z. That authorization
covers only this ledger merge and the temporary required-check change.

Immediately before execution, the live PR head/base, its only changed file
`security/image-exceptions.json`, the passed Vulnerability check, both red
checks and the full branch-protection snapshot matched the proposal. PR #65
was marked ready. A guarded script temporarily required only `Vulnerability
scan` (app 15368), retaining the required PR, strict checks, admin
enforcement, and force-push/deletion blocks. It squash-merged only PR #65 as
[`6fb5b64b710a95e8f41749d1654e203d95fcb8c9`](https://github.com/anton-asnitsky/StockSense/commit/6fb5b64b710a95e8f41749d1654e203d95fcb8c9).
The script restored `U2 protected-base PR policy` (app 15368) and `U1
contracts` (unbound app) in its `finally` path. Its normalized before/after
snapshot was identical. An independent GitHub API read confirmed the three
required checks, strict mode, required PR, admin enforcement and force-push/
deletion blocks all matched the original. The live `main` ref equals the PR's
merge commit.

The interim `main` [U1 run 40887737409](https://github.com/anton-asnitsky/StockSense/actions/runs/40887737409)
and [release-evidence run 40887737022](https://github.com/anton-asnitsky/StockSense/actions/runs/40887737022)
failed at `Inventory and scan the exact built images` on old Node 24.19.0;
the U1 run's Vulnerability job passed. These red results remain visible.

Draft PR #61 was refreshed by a normal merge from new `main` to head
`44d439060606878c9b3a4ff014279e0437d88147`. Its Git tree is
`7804a5b10f7b13fe07a3ec6054d3efe195680b40`, and the repository's
ledger-excluded digest remains the approved
`sha256:edaa5c022e7f69492ac68c237419e122aa2eee92b0cbd1ba086216e3f38c2a69`.
Its [hosted run 40888120625](https://github.com/anton-asnitsky/StockSense/actions/runs/40888120625)
passed image scanning, protected-ledger binding and Vulnerability, then
failed the expected protected-workflow CI policy before tests. Proof-only
PR #64's base and head were refreshed without rewriting history; its head
tree is exactly `7804a5b1…`, the same as PR #61's prospective merge tree.
Its [hosted run 40888350016](https://github.com/anton-asnitsky/StockSense/actions/runs/40888350016)
passed U1 and Vulnerability. U1 passed protected-ledger binding, CI policy,
lint, type-check, unit tests, integration tests and the 80% coverage floor.
GitHub's synthetic proof commit
`6cd59aaf1df3815ff2be9db5ac4a60389a6fb2e0` has parents exactly the
proof base `bc8ecea5d9f6202f9e75372123e262e796775e1d` and head
`5f310683d377428bbf8f1ae75533f1b0bb73bf63`, and tree exactly
`7804a5b10f7b13fe07a3ec6054d3efe195680b40`. These passing checks prove
the identical candidate tree; they do not turn PR #61's own
protected-workflow checks green.

No PR #61 or proof PR #64 merge, U1 acceptance, or C01 release was performed.
