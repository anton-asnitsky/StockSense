# PR #63 ledger bootstrap merge — 2026-10-29

The owner approved only the exact [PR #63 bootstrap
question](../construction/contracts/code-generation/pr63-bootstrap-questions.md).
The audit records `DECISION_RECORDED` at `10:04:58Z`, `HUMAN_TURN` at
`10:09:03Z`, and `QUESTION_ANSWERED` at `10:09:56Z`. The answered question
was committed as `33e532b1c6e31ac844b04231fbfd524f4a6bfdf3` before any
protection change.

Preflight confirmed PR #63 exact head
`4b55c87800215a9d7f1106cf397491994c72f90e` against `main`
`68bb426590ccd529ccdfcb2dfcaa8ea701ed46e9`, with only
`security/image-exceptions.json` changed. Vulnerability was green. U1 was red
at the old Node 24.19.0 validator scan, before ledger verification; U2 was
red because the ledger is protected. The required PR, strict checks, admin
enforcement, and force-push/deletion blocks were active. Required checks
were Vulnerability (app ID `15368`), U2 (app ID `15368`) and U1 (unbound).

The guarded operation temporarily required only Vulnerability, verified the
other protection settings and exact main/PR refs remained unchanged, then
squash-merged [PR #63](https://github.com/anton-asnitsky/StockSense/pull/63)
as `8b0b7ae88a89edd717f7899a3723dff952fb8f03`. Its `finally` block
immediately restored U1 with the unbound app setting and U2 with app ID
`15368`. A full normalized protection response matched the saved original.
An independent remote read confirmed main points to that merge commit and
again showed required PRs, strict checks, admin enforcement, all three
required check/app bindings, and force-push/deletion blocks unchanged. The
local before/after snapshots and guarded script are retained outside Git
under `.aidlc/tmp/pr63-bootstrap-execution/` and
`.aidlc/tmp/pr63-bootstrap-merge.ps1`.

The new [main-push contracts run](https://github.com/anton-asnitsky/StockSense/actions/runs/40855874365)
and [release-evidence run](https://github.com/anton-asnitsky/StockSense/actions/runs/40855874320)
both completed red while scanning the old Node image, as the approved plan
anticipated; Vulnerability passed. Neither U1 nor release-evidence reached
later candidate checks. These checks are not claimed green. The ledger-first
red interval must end
through the separately reviewed Node-patched source/workflow change.

Draft [PR #61](https://github.com/anton-asnitsky/StockSense/pull/61) remains
unmerged. A normal no-tree-change commit `ea509c00cfc4b23e799eec3bbb1916461def4cbc`
refreshed its hosted checks against the merged ledger. Its new synthetic
merge commit `b8c0e3f15ae4e6a0f959eaa6b2cdd9f0c6d825c7` has parents
`8b0b7ae` and `ea509c0`, tree `5073fc04143fed37b482e004e4ea70faeaadf431`,
and the independently calculated ledger-excluded digest remains exactly
`sha256:c77932d01cec9d9dbd57177504f8c4dc416affb63ab2c48bf635835f05907d34`.
PR #61 needs fresh scans, tests, independent review and its own owner merge
decision. U1 candidate READY and C01 release remain unclaimed.
