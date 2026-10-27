# PR #50 bootstrap merge verification

## Authorization and audit order

The owner authorized only PR #50 at head `5ad6a83b1438a19d34b80e4df140e5969779e6cb`, with temporary removal of only the U2 required check and immediate restoration. The exact authorization is retained in `construction/contracts/code-generation/pr50-bootstrap-questions.md` and the engine-owned audit shard `audit/anton-pc-e91d12f789b9.md`.

Verified order (UTC):

- DECISION_RECORDED: 2026-10-27T17:52:26Z, code-generation / contracts, PR #50 bootstrap.
- HUMAN_TURN: 2026-10-27T19:00:58Z, session `01a17ebc-7578-7153-a03f-9d970d88bfa8`.
- Independent process-steward review: no blocking or major inconsistency.
- QUESTION_ANSWERED: 2026-10-27T19:04:48Z, emitted through `aidlc engine log answer` with the exact owner message and question-file path.
- GitHub merge: 2026-10-27T19:06:36Z.

No lifecycle stage approval or U1 acceptance was recorded.

## Preflight and merge

[PR #50](https://github.com/anton-asnitsky/StockSense/pull/50) was open, draft, mergeable, targeting main at `45fbd6622a4f7919840b7bc10a3f8e1e8d4848ad`. Its sole changed file was `security/image-exceptions.json`. U1 contracts and Vulnerability scan passed in [run 40553484026](https://github.com/anton-asnitsky/StockSense/actions/runs/40553484026). The U2 failure in [run 40553484055](https://github.com/anton-asnitsky/StockSense/actions/runs/40553484055) was specifically `Protected CI paths changed: security/image-exceptions.json`.

Marked PR #50 ready, then rechecked the exact head, open state, main target, mergeability, and successful U1/Vulnerability checks. A narrow PATCH changed only required status checks; a full protection comparison verified that the temporary configuration differed solely by removal of U2. The squash merge API included the owner's exact SHA as its expected-head condition.

Merged commit: [`8a415cfd6dfc124edbd7b84c9b7e22553e3064a2`](https://github.com/anton-asnitsky/StockSense/commit/8a415cfd6dfc124edbd7b84c9b7e22553e3064a2). Its single parent is the prior main commit. The main ref was verified at the new commit.

## Protection restoration

The merge script's finally block immediately restored the original required status checks. Full JSON comparison of the fetched protection responses before and after succeeded, including all unrelated fields. Local raw snapshots and the execution script are retained under `.cache/pr50-merge/`.

| Protection | Before and after | During merge |
| --- | --- | --- |
| Required pull request | Enabled, zero approving reviews, dismiss stale reviews | Unchanged |
| Strict status checks | Enabled | Unchanged |
| Admin enforcement | Enabled | Unchanged |
| U1 contracts | Required, null app binding | Unchanged |
| Vulnerability scan | Required, app ID 15368 | Unchanged |
| U2 protected-base PR policy | Required, app ID 15368 | Temporarily removed |
| Force pushes / deletions | Disabled / disabled | Unchanged |

## Hosted verification

GitHub delayed creation of main-push Actions runs. Repeated initial checks found no runs; Actions were enabled and both push workflows active. Runs subsequently appeared on the exact merged main SHA:

- [contracts-required 40566407812](https://github.com/anton-asnitsky/StockSense/actions/runs/40566407812): **success**, both U1 contracts and Vulnerability scan passed.
- [release-evidence 40566407802](https://github.com/anton-asnitsky/StockSense/actions/runs/40566407802): **success**.

After protection restoration and checking main-push status, reran only the failed job in [PR #48 run 40550767567](https://github.com/anton-asnitsky/StockSense/actions/runs/40550767567), at unchanged head `a2fd7bff83a713fe83fc015cb8158f25eaddfeb2`. Main-push results were still pending when this rerun was requested. PR #48 remains open against `bolt/u1-candidate-ready`; no merge was requested or performed.

Unrelated working-tree changes were preserved. No branch checkout, reset, staging, commit, or push was performed.

A final independent fetch of main protection again compared exactly equal to the original snapshot. Main remained at the merge commit, and PR #48 remained OPEN at its original head.

PR #48 rerun **attempt 2 succeeded**: U1 contracts passed, and the existing successful Vulnerability scan remained successful. The image inventory/scan, protected-main ledger verification, integration tests, and coverage all passed. This is hosted check evidence only, not U1 lifecycle acceptance or authorization to merge PR #48.
