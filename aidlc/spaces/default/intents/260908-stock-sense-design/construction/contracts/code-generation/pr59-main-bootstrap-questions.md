# PR #59 U1 Bolt integration into main

[Draft PR #59](https://github.com/anton-asnitsky/StockSense/pull/59) was updated
with protected `main` at `a277d1766eec477177387e341bd44e807dbb64fe`.
Its current head is `a2c2e48d70b8f6f67355f4b036b7306c5ee7003c` and its
Git tree is `df713ba93a710222f78635c5399061cbdf0d8fb3`. The update changed
only `security/image-exceptions.json` in the candidate checkout. The complete
ledger-excluded candidate-tree digest remains
`sha256:9847509d6ee3930bdca0707e8c4478118bb6e045701528e5d2340957c1b15add`,
the digest in the owner's [finding-specific temporary exception](pr59-image-exception-questions.md)
and the protected-main ledger. The exception covers one Medium Kiota-bundled
MessagePack 2.5.302 finding, with the recorded container limits and expiry on
`2026-11-25T00:00:00Z`; an unidentified deserialization path remains a risk.

PR #59 changes `.github` workflows and CI authority code. Its
[updated-head hosted U1 run](https://github.com/anton-asnitsky/StockSense/actions/runs/40751768919)
built and scanned both images, passed the protected-main image-ledger
verification, then failed at its CI workflow-change policy; lint, unit,
integration and coverage were skipped by that job. The
[updated-head U2 run](https://github.com/anton-asnitsky/StockSense/actions/runs/40751765063)
passed its protected-base policy test, then rejected the PR's protected paths
at the metadata step. The updated-head Vulnerability scan passed. Both U1 and U2 are required on `main`, so PR #59
cannot be merged through the ordinary green-check path. The Vulnerability
job itself is defined in the PR-authored workflow, so retaining its passing
status does not provide independent protection against a malicious workflow
edit. Temporarily removing U1 and U2 from required checks affects every PR to
`main` while the change is active.

The [U1 Bolt hosted run](https://github.com/anton-asnitsky/StockSense/actions/runs/40685726261)
passed U1 and Vulnerability, including integration and the line-coverage gate,
on the same application and CI bytes. Local lint, type-check, 313 unit tests,
and 11 focused policy/compatibility integration tests passed in the isolated
PR #59 worktree. A complete local integration run did not pass: Docker
Desktop's Linux engine disappeared during the run, and temporary Git fixture
repositories encountered local write denials. PR #59 has **not** passed its
complete hosted U1 check. The independent AI-DLC steward classified the
red-check bootstrap and incomplete U1 evidence as Major disclosures.

The proposed one-time sequence is:

1. Recheck PR #59's exact head, `main` base, mergeability, full changed-path
   list, hosted check results, the matching candidate digest, and all current
   protection settings. Stop if any pin or condition changed.
2. Save the complete protection response. Temporarily remove **only**
   `U1 contracts` and `U2 protected-base PR policy` from required checks.
   Retain the required PR, `Vulnerability scan` with app ID `15368`, strict
   checks, administrator enforcement, and force-push/deletion blocks.
3. Mark only PR #59 ready and squash-merge this exact head into `main`.
4. Immediately restore U1 (its existing unbound app setting) and U2 (app ID
   `15368`), including if the merge fails. Compare the full protection
   response to the saved original.
5. Verify the new `main` commit and hosted main-push U1, Vulnerability, and
   release-evidence results. If any fail, stop the promotion and prepare a
   separately reviewed forward fix or revert. Record the results and delete
   the merged branch only after verification.

This is a **merge exception for one reviewed Bolt candidate**, not evidence
that its two red PR checks passed. R-14–R-16, the 45 open traceability gaps,
U1 candidate READY/acceptance, and C01 release remain separate work and
decisions. The approval-bound U1 plan still cites PR #59's old head and an
earlier 47/48 traceability count; its receipt remains valid for those exact
plan bytes, but the plan must be reconciled and reapproved before candidate
READY. The current U1 plan approval does not authorize this merge.

## Decision

Do you approve this exact PR #59 bootstrap, including the temporary U1 and U2
required-check change and squash merge of head
`a2c2e48d70b8f6f67355f4b036b7306c5ee7003c` into `main` at
`a277d1766eec477177387e341bd44e807dbb64fe`?

- Approve PR #59 bootstrap and temporary U1/U2 check change
- Request changes

[Answer]: Approve PR #59 bootstrap and temporary U1/U2 check change
