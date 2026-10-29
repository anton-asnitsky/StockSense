# PR #63 protected-ledger bootstrap decision

The owner approved only preparing the temporary, finding-specific exception
for draft PR #61's Node-patched candidate digest
`sha256:c77932d01cec9d9dbd57177504f8c4dc416affb63ab2c48bf635835f05907d34`.
Its [immutable answer](https://github.com/anton-asnitsky/StockSense/blob/c4630d24765469045550479c7cf31860a7e89d61/aidlc/spaces/default/intents/260908-stock-sense-design/construction/contracts/code-generation/pr61-node-patch-image-exception-questions.md)
and ordered audit receipt do not approve a merge or protection change.

[Draft PR #63](https://github.com/anton-asnitsky/StockSense/pull/63), exact head
`4b55c87800215a9d7f1106cf397491994c72f90e`, targets protected `main`
at `68bb426590ccd529ccdfcb2dfcaa8ea701ed46e9`. It changes only
`security/image-exceptions.json` and replaces the prior candidate row with
the approved exact digest and one Medium Kiota MessagePack 2.5.302 finding,
expiring `2026-11-25T00:00:00Z`. The owner-approved [scan run
40849263065](https://github.com/anton-asnitsky/StockSense/actions/runs/40849263065)
shows Node 24.22.2 in PR #61's validator image with zero findings and one
Kiota finding. Local current-finding policy verification returned validator
`0/0` and Kiota `1/1`.

PR #63's [hosted run 40853107731](https://github.com/anton-asnitsky/StockSense/actions/runs/40853107731)
passed `Vulnerability scan`. `U1 contracts` failed at validator image scanning
because this ledger-only PR still builds Node 24.19.0 from `main`. `U2
protected-base PR policy` failed because it forbids ledger edits. These are
real red checks; no full U1 pass or exception for the old Node image is claimed.

Main currently requires a PR, strict checks and admin enforcement. It blocks
force pushes and deletion. The required checks are `Vulnerability scan` (app
ID `15368`), `U2 protected-base PR policy` (app ID `15368`), and `U1
contracts` (no app binding). The approved U1 plan explicitly calls for the
ledger-first sequence and warns that its interim main push may fail U1 and
release-evidence until the separately approved patched story lands.

## Proposed exact operation

After rechecking the exact head, base, check results and protection, remove
**only U1 and U2** temporarily from required status checks. Keep the required
PR, `Vulnerability scan`, strict checks, admin enforcement, and force-push and
deletion blocks. Mark only PR #63 ready and squash-merge it to `main`. Restore
U1 and U2 immediately afterward with their original app bindings, even if the
merge fails. Verify the complete protection settings and record the main-push
check results without treating an interim red run as U1 readiness. The
temporary change affects every PR to `main` while active. Do not merge PR
#61, accept U1, release C01 or claim the protected story checks passed. PR
#61 requires its own fresh hosted proof, independent review, and owner merge
decision afterward.

[Verification record](../../../verification/pr63-ledger-proposal-2026-10-29.md)
contains the exact evidence and limits.

## Decision

Do you approve this exact PR #63 bootstrap and temporary U1/U2 required-check
change?

- Approve PR #63 bootstrap and temporary U1/U2 check change
- Request changes

[Answer]:
