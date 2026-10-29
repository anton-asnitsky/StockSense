# PR #67 protected image-ledger bootstrap decision

Draft [PR #67](https://github.com/anton-asnitsky/StockSense/pull/67) has exact head `a27baeeb8b7916b571a1781ec54a02d0b70c2a14` against `main` `bffd780237455ff2ba03f65e4fb624d330c90c88`. It changes only `security/image-exceptions.json`, replacing the prior candidate digest with PR #66's approved exact digest `sha256:24d34f5394aaedb15d768ecbedc93ac760c0861b8eacb3b52a765da66ae17b76`. The finding, controls, and `2026-11-25T00:00:00Z` expiry are unchanged; the approval reference now points to the [immutable owner answer](https://github.com/anton-asnitsky/StockSense/blob/1dfc0fd4bbc46735a1fc144e6d829fc74b395937/aidlc/spaces/default/intents/260908-stock-sense-design/construction/contracts/code-generation/pr66-image-exception-questions.md) and [retained scan](https://github.com/anton-asnitsky/StockSense/actions/runs/40907744878). The PR #66 head remains `7adcf1295fdb002a7b429dae62b13c9e22096b4c`, with that same main base. The exception approval authorizes this proposal, not its merge.

PR #67's hosted [U1 and Vulnerability checks](https://github.com/anton-asnitsky/StockSense/actions/runs/40915309776) passed. Its [U2 check](https://github.com/anton-asnitsky/StockSense/actions/runs/40915369194) failed solely because the current base-owned policy unconditionally rejects `security/image-exceptions.json` edits. Independent process review found no Major blocker to presenting a separate owner decision. Main protection currently requires a PR, strict checks and admin enforcement; it requires U1 contracts, Vulnerability scan and U2 protected-base PR policy (U2 app ID `15368`), and forbids force-pushes and deletions.

If approved, recheck exact PR head, main base, checks, and protection. Temporarily remove **only U2 protected-base PR policy** from required checks. Keep the required PR, U1, Vulnerability, strict/admin enforcement, and force-push/deletion blocks. Mark **only PR #67** ready and squash-merge it into main. Restore U2 with app ID `15368` immediately, including if merge fails. Verify the complete protection settings and main-push results, then rerun PR #66's checks against the new protected ledger. The temporary change affects every PR to main while active. Do not merge PR #66, accept U1, or release C01 under this decision. `CONTRIBUTING.md` requires explicit owner approval for this concrete merge and protection change.

## Decision

Approve this exact PR #67 bootstrap and temporary U2 required-check change?

- Approve PR #67 bootstrap and temporary U2 check change
- Request changes

[Answer]: Pending
