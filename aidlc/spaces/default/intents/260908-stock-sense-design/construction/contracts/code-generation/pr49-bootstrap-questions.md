# PR #49 protected-ledger bootstrap decision

Draft [PR #49](https://github.com/anton-asnitsky/StockSense/pull/49)
changes only `security/image-exceptions.json`, replacing the old candidate
exception with the owner's reconfirmed, temporary PR #48 exception. Its exact
head is `5a571db82e3508e012fd1bdd8298daae9a329391`; protected `main` is
`b85ed4bce359fa10345c13d74fbb92b92adcf1bd`. The immutable owner
[question](https://github.com/anton-asnitsky/StockSense/blob/095bde6da61714289f8fd2e16a7305681927951b/aidlc/spaces/default/intents/260908-stock-sense-design/construction/contracts/code-generation/pr48-image-exception-reconfirmation-questions.md)
and [audit](https://github.com/anton-asnitsky/StockSense/blob/095bde6da61714289f8fd2e16a7305681927951b/aidlc/spaces/default/intents/260908-stock-sense-design/audit/anton-pc-e91d12f789b9.md)
prove decision, human reply, and answer in order. The independent process
review found no remaining Major approval-trace issue.

On this head, hosted `U1 contracts` and `Vulnerability scan` passed. `U2
protected-base PR policy` failed because its rule refuses edits to the
protected ledger. Main currently requires a PR, strict status checks, admin
enforcement, `U1 contracts`, `Vulnerability scan`, and `U2 protected-base PR
policy`; force pushes and deletion are disabled.

## Decision

May I temporarily remove only `U2 protected-base PR policy` from required
checks, while retaining every other protection above; mark only PR #49 ready;
squash-merge it into `main`; immediately restore U2 as a required check; then
verify main protection and push evidence and rerun PR #48? The temporary
change affects all PRs to main while it is active. Approval covers this
specific PR and sequence only. It does not approve PR #48's merge, U1
acceptance, or C01 release.

- Approve PR #49 bootstrap and temporary U2 check change
- Request changes

[Answer]: Approve PR #49 bootstrap and temporary U2 check change
