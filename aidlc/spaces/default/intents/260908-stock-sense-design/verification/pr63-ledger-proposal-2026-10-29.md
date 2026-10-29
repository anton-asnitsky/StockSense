# PR #63 protected-ledger proposal — 2026-10-29

This is preparation for a separate owner merge decision. It is not merge
authorization, U1 acceptance, or C01 release.

The owner answered the exact PR #61 Node-patched exception question. The
audit order is `DECISION_RECORDED`
`09:42:25Z` → `HUMAN_TURN` `09:48:12Z` → `QUESTION_ANSWERED` `09:49:20Z`.
The answered question is in immutable commit `c4630d24765469045550479c7cf31860a7e89d61`.
The U1 plan receipt still returned `approved: true`, `fingerprintValid: true`
and `receiptValid: true` at
`sha256:6705bd49bc11e014c4698466da0958b3c3dcfd7612aaf0affff908e321eaef0f`.
The exception answer permits this ledger proposal only.

[Draft PR #63](https://github.com/anton-asnitsky/StockSense/pull/63) head
`4b55c87800215a9d7f1106cf397491994c72f90e` targets `main` at
`68bb426590ccd529ccdfcb2dfcaa8ea701ed46e9`. Its only changed file is
`security/image-exceptions.json`. It replaces the old candidate row with
`sha256:c77932d01cec9d9dbd57177504f8c4dc416affb63ab2c48bf635835f05907d34`,
retains the single Medium Kiota MessagePack 2.5.302 finding and the fixed
invocation controls, cites the immutable answer and retained scan, and expires
`2026-11-25T00:00:00Z`. Against PR #61's retained scan, local
`verifyImageDispositions` returned validator `0/0` and Kiota `1/1` findings
and dispositions. The [source scan](https://github.com/anton-asnitsky/StockSense/actions/runs/40849263065)
contains a Node 24.22.2 validator with zero findings.

PR #63's [hosted run 40853107731](https://github.com/anton-asnitsky/StockSense/actions/runs/40853107731)
passed Vulnerability and failed U1 at `Inventory and scan the exact built
images`: the unchanged `main` source still runs Node 24.19.0, and its
validator report contains an incomplete, blocked finding. U2 separately
failed because the PR edits the protected ledger path. The red U1 and U2
checks are genuine and are not counted as passes.

Main protection at inspection required PRs, strict status checks, admin
enforcement, and blocked force pushes and deletion. Its required checks were
`Vulnerability scan` (app ID `15368`), `U2 protected-base PR policy` (app ID
`15368`) and `U1 contracts` (no app binding). No protection has been changed.

The approved U1 plan specifies a ledger-first bootstrap. A potential owner
decision would authorize temporarily removing only U1 and U2 from required
checks, while keeping the PR requirement, Vulnerability, strict/admin
enforcement and force-push/deletion blocks; merging only exact PR #63; and
immediately restoring U1 and U2 with their original app bindings, including
on failure. That temporary weakening affects every PR to `main` while active.
The interim `main` push may fail U1 and release-evidence because the ledger
would name the patched candidate while `main` still has Node 24.19.0. This
must be recorded as a red interval, not U1 readiness. PR #61 would then need
a fresh hosted scan, identical-tree proof, independent review and its own
owner-approved workflow/source merge before final passing main-push checks.
