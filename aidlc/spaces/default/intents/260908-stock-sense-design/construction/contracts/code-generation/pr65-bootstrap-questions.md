# PR #65 protected-main ledger bootstrap decision

Draft [PR #65](https://github.com/anton-asnitsky/StockSense/pull/65) at exact
head `219105f95e75a17a88b23289bb0012b4c3cd79dc` targets protected
`main` at `8b0b7ae88a89edd717f7899a3723dff952fb8f03`. It changes only
`security/image-exceptions.json`, replacing the old PR #61 candidate digest
with the owner's approved exact
`sha256:edaa5c022e7f69492ac68c237419e122aa2eee92b0cbd1ba086216e3f38c2a69`
row for one Medium Kiota MessagePack finding, expiring 2026-11-25. Its
approval reference points to the immutable answered question and audit.

Hosted Vulnerability passed. U2 failed solely because it protects ledger
edits. U1 failed while scanning old `main`'s Node 24.19.0 validator image:
`IMAGE_SCAN/BR6.5`, incomplete generic finding. The new row cannot repair
old Node; PR #61 carries the separately governed Node 24.22.2 patch and is
not part of this merge. Expect the interim `main` push's U1 check to remain
red until the separately governed Node fix lands. Neither red PR check is
treated as a pass.

The proposed one-time sequence is:

1. Recheck exact PR #65 head and `main` base, its one-file diff, check results,
   and full branch protection snapshot. Require no intervening `main` change.
2. Mark only PR #65 ready. Temporarily remove only `U1 contracts` and
   `U2 protected-base PR policy` from required checks, keeping the required
   PR, `Vulnerability scan`, strict checks, admin enforcement, and force-push/
   deletion blocks. This temporary change affects every PR to `main` while
   active and does not retroactively validate either failed check.
3. Squash-merge only PR #65. In a `finally` path, immediately restore U1
   with its original unbound app ID and U2 with app ID 15368, even if merging
   fails. Re-read all protection settings and require exact equality with the
   original snapshot.
4. Verify the merge commit, `main` push checks, and rerun draft PR #61 and
   proof PR #64 against the new protected ledger. Report any red outcome
   honestly; do not merge either PR.

This decision would authorize only PR #65's bootstrap and temporary check
change. It would not accept U1, authorize PR #61's merge, or release C01.

## Decision

Do you approve this exact PR #65 bootstrap sequence and temporary U1/U2
required-check change?

- Approve PR #65 bootstrap and temporary U1/U2 check change
- Request changes

[Answer]: Pending
