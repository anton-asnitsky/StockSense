# PR #52 protected-ledger bootstrap decision

Draft [PR #52](https://github.com/anton-asnitsky/StockSense/pull/52) proposes
the one-row protected-main ledger replacement for the exact PR #51 candidate
digest `sha256:eb1645b7df20d5681c8200dd0ec6587621c12cebc58decb2aad317792a5d2c21`.
Its head is `7e494b9e6ad56e9917ad03d6f5231a95859c4249` and its main base is
`8a415cfd6dfc124edbd7b84c9b7e22553e3064a2`. The owner approved
preparing this finding-specific proposal in
`pr51-image-exception-questions.md`; that answer did not approve a merge or a
branch-protection change.

[Hosted run 40654841730](https://github.com/anton-asnitsky/StockSense/actions/runs/40654841730)
passed `U1 contracts` and `Vulnerability scan` on PR #52. The separate
`U2 protected-base PR policy` check failed because it deliberately protects
`security/image-exceptions.json` from PR changes. Main currently requires all
three checks with strict status checks; U2 is bound to GitHub Actions app ID
`15368`. The required pull request, admin enforcement, and force-push/deletion
blocks must be reverified immediately before any change and after restoration.

## Decision

May I mark PR #52 ready and bootstrap its exact head into main by temporarily
removing **only** `U2 protected-base PR policy` from required checks, retaining
the required pull request, strict checks, admin enforcement, `U1 contracts`,
`Vulnerability scan`, and force-push/deletion blocks; squash-merge **only**
PR #52; immediately restore U2 with app ID `15368`; verify main protection and
main-push checks; then rerun PR #51? The temporary protection change affects
every PR to main while active. `CONTRIBUTING.md` requires explicit owner
approval for this concrete merge.

This decision does not merge PR #51, accept U1, or release C01.

- Approve PR #52 bootstrap and temporary U2 check change
- Request changes

[Answer]:
