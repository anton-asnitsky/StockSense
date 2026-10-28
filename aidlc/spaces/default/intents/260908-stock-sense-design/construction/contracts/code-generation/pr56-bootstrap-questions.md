# PR #56 exact ledger bootstrap decision

Draft [PR #56](https://github.com/anton-asnitsky/StockSense/pull/56) has head
`4572e723a8a5eb5397e947e7dfdf15c2684fb8bd` and targets protected `main`
at `8b7f77f6506d847810ff053c42c9baaa0b4062e8`. Its sole changed path is
`security/image-exceptions.json`: it replaces the old PR #51 candidate digest
with the owner-approved exact digest
`sha256:ae449a9062ba7ecb8acc196fcad442a21b26daf25e4d5df915249fe3e5b28e76`,
updates the immutable decision reference and creation time, and retains the
same one Medium Kiota MessagePack 2.5.302 finding, controls and
`2026-11-25T00:00:00Z` expiry. The owner approved preparation of this ledger
proposal in `pr51-d4aa5a6-image-exception-questions.md`; that answer did **not**
authorize a merge.

[Hosted run 40697748030](https://github.com/anton-asnitsky/StockSense/actions/runs/40697748030)
passed `U1 contracts` and `Vulnerability scan`. The separate
`U2 protected-base PR policy` check failed only because it deliberately
rejects edits to `security/image-exceptions.json`.

Protected `main` currently requires a PR, strict checks, admin enforcement,
`U1 contracts`, `Vulnerability scan`, and `U2 protected-base PR policy` with
GitHub Actions app ID `15368`. Force pushes and branch deletion are blocked.
To bootstrap this exact ledger update, the proposed sequence is:

1. Recheck PR #56's head, `main` base, one-file diff, final checks, and full
   branch protection immediately before mutation.
2. Temporarily remove **only** `U2 protected-base PR policy` from required
   checks. Keep the required PR, strict checks, admin enforcement, U1,
   Vulnerability, force-push block and deletion block. This temporary change
   affects every PR to `main` while it is active.
3. Mark only PR #56 ready and squash-merge it at the pinned head. In a
   `finally` path, immediately restore U2 with app ID `15368`, even if the
   merge attempt fails.
4. Compare full pre/post protection, verify the merge and main-push checks,
   then rerun PR #51's U1 and Vulnerability checks against the updated ledger.

This decision does not merge PR #51, accept U1, merge the U1 Bolt to `main`,
or release C01. If any pinned head, base, check or protection fact changes,
stop and obtain a fresh decision.

## Decision

Do you approve this exact PR #56 bootstrap and temporary U2-only required-check
change?

- Approve PR #56 bootstrap and temporary U2 check change
- Request changes

[Answer]: Approve PR #56 bootstrap and temporary U2 check change
