# PR #65 exact ledger proposal — 2026-10-29

The owner approved only a temporary exception for draft PR #61's exact
ledger-excluded candidate digest
`sha256:edaa5c022e7f69492ac68c237419e122aa2eee92b0cbd1ba086216e3f38c2a69`.
The answered question is in immutable commit
`75cf8442a25e85a834d1813610fa3e66d0839aa9`; audit order is
`DECISION_RECORDED` 2026-10-29T10:58:48Z → `HUMAN_TURN` 11:24:25Z →
`QUESTION_ANSWERED` 11:25:16Z. This authorized preparing a protected-main
ledger proposal, not merging it.

Draft [PR #65](https://github.com/anton-asnitsky/StockSense/pull/65) has
head `219105f95e75a17a88b23289bb0012b4c3cd79dc` and base `main`
`8b0b7ae88a89edd717f7899a3723dff952fb8f03`. Its only changed file is
`security/image-exceptions.json`: it replaces the stale `c77932d0…` row's
candidate digest, approval reference and creation time. The one Medium Kiota
MessagePack finding, expiry 2026-11-25, and compensating controls are unchanged.
The revised row passed `verifyImageDispositions` against retained hosted scans:
validator 0 findings/0 dispositions, Kiota 1 finding/1 exact disposition.

[Hosted run 40865933895](https://github.com/anton-asnitsky/StockSense/actions/runs/40865933895)
passed Vulnerability but failed U1 at `Inventory and scan the exact built
images`: old `main` still runs Node 24.19.0 and its validator scan has an
incomplete generic finding (`IMAGE_SCAN/BR6.5`).
[U2 run 40865934012](https://github.com/anton-asnitsky/StockSense/actions/runs/40865934012)
failed because the PR changes the protected ledger path. Neither red result
is credited as passing. Expect the interim `main` push's U1 check to remain
red until the separately governed Node fix lands. `main` still requires a pull request and the three
strict checks: Vulnerability scan (app 15368), U2 protected-base PR policy
(app 15368), and U1 contracts (unbound app); admin enforcement is on and
force pushes/deletions are off. No protection change has been made.

A PR #65 merge or temporary required-check change needs separate owner
approval. PR #61 remains draft and unmerged. U1 candidate READY, R-14–R-16,
source-manifest/traceability reconciliation, and C01 release remain open.
