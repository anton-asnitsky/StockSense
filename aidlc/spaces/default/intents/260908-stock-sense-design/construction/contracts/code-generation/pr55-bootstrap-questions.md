# PR #55 revised protected-ledger bootstrap decision

Draft [PR #55](https://github.com/anton-asnitsky/StockSense/pull/55) proposes
the one-row protected-main ledger replacement for revised PR #51 candidate
digest `sha256:15e1b80226d07916a0cab6dd81e00c00d502ec077ad7faa095d6a0b111d8abba`.
Its exact head is `ebfd0280df4b38f46d276a0474877327213d9f8e`; its main base is
`8d497caca1eac5d244a71bb498a3654527a0a4f0`. The owner approved
preparing this finding-specific proposal in
`pr51-revised-image-exception-questions.md`; that answer did not approve
this merge or any protection change.

[Hosted run 40672060420](https://github.com/anton-asnitsky/StockSense/actions/runs/40672060420)
passed `U1 contracts` and `Vulnerability scan` on PR #55. The separate
`U2 protected-base PR policy` check failed solely because the PR edits
`security/image-exceptions.json`. Main currently requires all three checks
with strict status checks; U2 and Vulnerability are bound to GitHub Actions
app ID `15368`. The required pull request, admin enforcement, and
force-push/deletion blocks must be reverified immediately before any change
and after restoration. The independent process review found no Major content
inconsistency, with the hosted U1 result and this separate gate pending at
review time; U1 has since passed.

## Decision

May I mark PR #55 ready and bootstrap its **exact head** into main by
temporarily removing **only** `U2 protected-base PR policy` from required
checks, retaining the required pull request, strict checks, admin
enforcement, `U1 contracts`, `Vulnerability scan`, and force-push/deletion
blocks; squash-merge **only** PR #55; immediately restore U2 with app ID
`15368`; verify main protection and main-push checks; then rerun PR #51 and
its identical-tree proof PR #54? The temporary protection change affects
every PR to main while active. `CONTRIBUTING.md` requires explicit owner
approval for this concrete merge.

This decision does not merge PR #53 or PR #51, accept U1, or release C01.

- Approve PR #55 bootstrap and temporary U2 check change
- Request changes

[Answer]:
