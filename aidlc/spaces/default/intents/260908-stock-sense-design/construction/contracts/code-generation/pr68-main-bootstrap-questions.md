# PR #68 current-base protected CI bootstrap decision

Draft [PR #68](https://github.com/anton-asnitsky/StockSense/pull/68) has exact head `2ff344f720dd4cede61e3fc72ca06f05987aa1e4` against current protected main `c9abe61de1eaf816c8da8ce0d07b96604bc8295d`. It changes only `.github/scripts/public-pr-policy.mjs`, its focused tests, `CONTRIBUTING.md`, and ADR 0020. It carries the same reviewed policy patch as the now-behind PR #66, without rewriting or merging that branch. GitHub's synthetic merge commit `3053a34d50455652a0cff91ea8ac47d7180f561d` has those exact parents and tree `6f3bad800617f5aa09e6c5630cab61cbb8ef7a0b`.

The [fresh image reassessment](../../../verification/pr68-image-reassessment-2026-10-29.md) is recorded at immutable documentation commit `482b966` and independently reviewed by the security and AI-DLC process specialists. PR #68 and the prior candidate differ only in the protected ledger blob. Their ledger-excluded candidate digest is the same owner-approved `sha256:24d34f5394aaedb15d768ecbedc93ac760c0861b8eacb3b52a765da66ae17b76`. [Hosted run 40947556271](https://github.com/anton-asnitsky/StockSense/actions/runs/40947556271) retained fresh exact-source scans: zero validator findings and the same one Medium Kiota MessagePack 2.5.302 finding, with valid database and verified raw receipts. Its image-ledger step passed. The existing time-limited finding exception, controls, and 2026-11-25 expiry remain; the independent reviews found no new finding-specific owner approval necessary.

PR #68's Vulnerability check passed. Its required **U1 contracts check is red** because U1 intentionally rejects `.github` changes before lint, unit, integration and coverage steps; its required **U2 protected-base PR policy check is red** because the old base policy rejects protected script edits. Neither red check is represented as passed. The focused new U2 policy tests pass locally (9/9), and the exact new candidate tree/digest are verified. The current `main` push U1 and release-evidence runs are also red at candidate-specific ledger binding after PR #67; these must be retested after this merge. Main protection currently requires a PR; strict checks and admin enforcement are enabled; Vulnerability scan (app ID `15368`), U1 contracts (app ID `null`), and U2 protected-base PR policy (app ID `15368`) are required; force-pushes and deletion are blocked.

If approved, recheck all exact pins, the four-file scope, check outcomes, main protection and main ref. Mark **only PR #68** ready. Temporarily remove **only U1 contracts and U2 protected-base PR policy** from required checks, keeping Vulnerability scan with app ID `15368`, the required PR, strict checks, admin enforcement, and force-push/deletion blocks. Squash-merge only PR #68 with an expected-head guard. Immediately restore U1 with its original null app binding and U2 with app ID `15368` even if the merge fails; verify every protection setting by value (check display order is immaterial). Verify the resulting main commit, main-push U1/Vulnerability and release-evidence runs, and the new base-owned U2 check on a protected-path PR. A hosted owner-comment allow-path proof needs its own exact PR and comment. The temporary change affects every PR to main while active and does **not** make PR #68's red checks pass. Any unexpected head/base/protection drift aborts the operation before changing protection. PR #66 remains unmerged; closing it is separate cleanup. U1 candidate acceptance and C01 release are separate.

`CONTRIBUTING.md` requires explicit owner approval for this concrete merge and protection change.

## Decision

Approve bootstrapping this exact PR #68 with temporary removal of only U1 and U2 required checks?

- Approve PR #68 bootstrap and temporary U1/U2 check change
- Request changes

[Answer]: Approve PR #68 bootstrap and temporary U1/U2 check change
