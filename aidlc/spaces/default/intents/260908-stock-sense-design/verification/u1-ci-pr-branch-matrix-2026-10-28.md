# U1 PR branch and CI cleanup verification

## Open PR cleanup

Closed 15 superseded draft or disposable proof PRs: #9–#16, #22, #23,
#32, #37, #39, #40, and #54. Their remote source branches were retained, so
the proposals remain recoverable. PR #51 is the active U1 story PR and remains
open. No story or Bolt merge was performed by this cleanup.

## Hosted check matrix

| Context | PR #51 into U1 Bolt | Ordinary PR #57 into main | Main push `36c5474` |
| --- | --- | --- | --- |
| U1 contracts | Passed, run [40685726261 attempt 2](https://github.com/anton-asnitsky/StockSense/actions/runs/40685726261/attempts/2) | Passed, run [40707891142](https://github.com/anton-asnitsky/StockSense/actions/runs/40707891142) | Passed, run [40702747511](https://github.com/anton-asnitsky/StockSense/actions/runs/40702747511) |
| Vulnerability scan | Passed in the same PR #51 run | Passed in the same PR #57 run | Passed in the same main run |
| U2 protected-base PR policy | Not triggered for a Bolt target | Passed, run [40707891407](https://github.com/anton-asnitsky/StockSense/actions/runs/40707891407) | Not a push check |
| Release evidence | Not triggered on untrusted PRs | Not triggered on untrusted PRs | Passed, run [40702746980](https://github.com/anton-asnitsky/StockSense/actions/runs/40702746980) |

PR #57 changed only a disposable Markdown probe on source branch
`chore/ci-source-branch-proof`. It was closed after all three applicable PR
checks passed; its remote branch and clean local worktree were removed. The
closed PR and hosted runs retain the evidence.

The red `public-pr-policy` runs on protected ledger or `.github` changes are
intentional fail-closed decisions, not source-branch trigger failures. U2
executes protected-base code for PRs targeting `main`; `contracts-required`
uses `pull_request` without a source-branch filter; `release-evidence` runs
only on trusted `main` pushes because it requests attestation write scopes.
There is no failing ordinary-PR workflow to repair in the current tree.
