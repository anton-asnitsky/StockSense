# PR #59 main-merge readiness — 2026-10-28

PR #60's separately approved ledger bootstrap merged to `main` as
`a277d1766eec477177387e341bd44e807dbb64fe`, restored full protection,
and passed main-push U1, Vulnerability, and release-evidence checks. See
[the PR #60 receipt](pr60-bootstrap-merge-2026-10-28.md). PR #59 was then
updated from old head `2c77ca3ce480a08a38992744a17040036b446b69`
using GitHub's `update-branch` with that exact expected head. Its new head
`a2c2e48d70b8f6f67355f4b036b7306c5ee7003c` targets current `main`.
The new tree `df713ba93a710222f78635c5399061cbdf0d8fb3` is the same
conflict-free synthetic merge tree computed before the update. Its
ledger-excluded digest is unchanged at
`sha256:9847509d6ee3930bdca0707e8c4478118bb6e045701528e5d2340957c1b15add`.
The isolated worktree is clean. Relative to the tested U1 Bolt, the
application and CI paths are identical; only three main-owned verification
documents are added and the protected image-exception ledger differs.

The [updated-head PR #59 U1 run](https://github.com/anton-asnitsky/StockSense/actions/runs/40751768919)
passed exact image-ledger verification, then failed CI policy because PR #59
changes protected workflows; later lint, unit, integration and coverage steps
were skipped. The [updated-head U2 run](https://github.com/anton-asnitsky/StockSense/actions/runs/40751765063)
passed its protected-base policy test, then rejected protected PR paths at
the metadata step. The updated-head Vulnerability scan passed. The
[U1 Bolt run 40685726261](https://github.com/anton-asnitsky/StockSense/actions/runs/40685726261)
passed U1 and Vulnerability, including integration and coverage, on the
matching application and CI bytes. This is supporting evidence, not an exact
PR #59 full-check pass.

In the isolated Windows checkout, lint and type-check passed. Its checkout
initially had CRLF working bytes despite LF Git blobs, so nine byte-bound
unit tests failed. Restoring exact Git blob bytes and refreshing the clean
index yielded 313 passed, zero failed, two skipped. Eleven focused CI-policy
and oasdiff integration tests passed. The full local integration run remained
incomplete: temporary Git fixture repositories encountered write denials,
and Docker Desktop's Linux engine disappeared during container tests. A
focused package/catalogue run passed 24 of 30; six container-backed tests
failed with `STANDARDS_ENGINE` after the engine became unavailable. These
local failures are recorded as an environment limit, not counted as passing
application tests.

The independent AI-DLC steward found two Major disclosures for a one-time
merge proposal: U1 and U2 must be temporarily removed despite red PR status,
and U1 candidate acceptance remains unproven. The passing Vulnerability job
is PR-authored because PR #59 changes that workflow. `main` protection at
preparation time required a PR, strict checks, administrator enforcement,
Vulnerability (app `15368`), U1 (unbound app), and U2 (app `15368`), with
force pushes and deletion blocked. The proposed [decision](../construction/contracts/code-generation/pr59-main-bootstrap-questions.md)
states the temporary exposure, exact pins, restoration, and postmerge proof.
R-14–R-16, 45 traceability gaps, U1 acceptance, and C01 release remain open.
The source-bound U1 plan still describes PR #59's old head and an earlier
47/48 traceability count. Its approval receipt verifies for those unchanged
plan bytes, but the document needs reconciliation and renewed approval before
candidate READY; this merge decision does not repair that drift.

No PR #59 merge or protection change has been made by this preparation.
