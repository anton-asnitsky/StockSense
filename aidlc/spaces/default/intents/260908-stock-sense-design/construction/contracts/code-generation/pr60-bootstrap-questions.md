# PR #60 protected-ledger bootstrap decision

[Draft PR #60](https://github.com/anton-asnitsky/StockSense/pull/60) has exact
head `0db613197b294ab1101066cb36283f9a54d7df54` and targets `main` at
`36c54749790c6288553018e15989beca7418f5f9`. It changes only
`security/image-exceptions.json`, replacing the previous candidate's row with
the finding-specific PR #59 exception already approved by the owner. The
[answered question](https://github.com/anton-asnitsky/StockSense/blob/fdd9d1f837b65ab4a42f7344b69369dbaf52f8bb/aidlc/spaces/default/intents/260908-stock-sense-design/construction/contracts/code-generation/pr59-image-exception-questions.md)
and [audit receipt](https://github.com/anton-asnitsky/StockSense/blob/b8b364d/aidlc/spaces/default/intents/260908-stock-sense-design/audit/anton-pc-e91d12f789b9.md)
are at immutable commits. PR #59 remains open at exact head
`2c77ca3ce480a08a38992744a17040036b446b69`.

PR #60 is conflict-free. At this head, [hosted U1 and Vulnerability checks](https://github.com/anton-asnitsky/StockSense/actions/runs/40735392969)
passed. U2 failed because its protected-base policy rejects the sole changed
ledger path; the [failure log](https://github.com/anton-asnitsky/StockSense/actions/runs/40735387831)
names only `security/image-exceptions.json`. Current `main` protection requires
a PR, strict checks, and administrator enforcement. The required checks are
`Vulnerability scan` (app 15368), `U1 contracts` (unbound app), and
`U2 protected-base PR policy` (app 15368). Force pushes and deletion are
blocked.

The proposed one-time sequence is:

1. Recheck the exact PR #60 head, `main` base, changed path, hosted checks and
   full protection settings. Stop if any pin or condition changed.
2. Temporarily remove **only** `U2 protected-base PR policy` from required
   checks. Preserve the PR requirement, strict checks, administrator
   enforcement, the passing U1 and Vulnerability requirements, and the
   force-push/deletion blocks. This temporary change affects every PR to
   `main` while active.
3. Mark only PR #60 ready and squash-merge it into `main`.
4. Immediately restore U2 with app ID `15368`, including if the merge fails;
   verify the full protection settings against the saved original.
5. Verify `main` push checks, then rerun PR #59 checks against the new
   protected-main ledger. Record the exact results.

The U1 plan approval is now valid at fingerprint
`sha256:6eaee7692bd383b01bdd37a665004d22bdf06828ce19a4ed0b1877cedb1dd89c`,
but it does not authorize this merge. This decision does not authorize merging
PR #59, accepting U1, or releasing C01.

## Decision

Do you approve this exact PR #60 bootstrap and temporary U2 required-check
change?

- Approve PR #60 bootstrap and temporary U2 check change
- Request changes

[Answer]: Approve PR #60 bootstrap and temporary U2 check change
