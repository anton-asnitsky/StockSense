# U2 protected PR policy correction — decision proposal

## Context and evidence

The current protected-base `public-pr-policy` rejects every PR that changes `.github/` or scan-authority files. Recent red U2 runs for PR #61 and other protected-file changes are expected decisions from that rule, not a runner fault. The rule has repeatedly required a separately approved temporary required-check change to merge owner-approved CI updates.

Draft [PR #66](https://github.com/anton-asnitsky/StockSense/pull/66), initially prepared against protected `main` `bffd780237455ff2ba03f65e4fb624d330c90c88`, proposes a narrow owner approval route. Its current head must be rechecked before any merge. The base-owned job still runs only trusted default-branch code with a read-only token and reads immutable base and candidate trees through GitHub metadata. For a protected path, it accepts only an exact GitHub issue comment from repository owner `anton-asnitsky` with GitHub's `OWNER` association, containing both the current base and head commit IDs. It re-reads the PR after comment retrieval. A changed base or head invalidates the comment. The job also compares the actual U1 Bolt base SHA instead of treating `GITHUB_SHA` (the default branch revision for `pull_request_target`) as the PR base.

Ordinary PRs still pass without a comment. Unapproved protected changes, stale or non-owner comments, moved revisions, truncated Git trees and incomplete comment listings fail closed. The comment approves only this U2 check; explicit owner merge approval is still required. The current U1 check separately rejects workflow edits, and its image exception ledger is bound to a candidate tree. PR #66's existing U1 and U2 red results must not be represented as passing. The first merge of the new policy requires its own concrete owner-approved bootstrap with exact commit pins and full branch-protection restoration. No protection change or merge is authorized by this design decision.

## Decision

Approve the U2 design change in PR #66: exact-base-and-head repository-owner comment for protected-path PRs, with the fail-closed and separate-gate limits above?

- Approve U2 policy design
- Request changes

[Answer]: Approve U2 policy design
