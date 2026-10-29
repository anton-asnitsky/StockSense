# PR #68 protected PR policy bootstrap verification — 2026-10-29

## Authorization and source

- The owner approved bootstrapping [PR #68](https://github.com/anton-asnitsky/StockSense/pull/68) at exact head `2ff344f720dd4cede61e3fc72ca06f05987aa1e4` against main `c9abe61de1eaf816c8da8ce0d07b96604bc8295d`, with only U1 and U2 temporarily removed from required checks. The [answered gate](../construction/contracts/code-generation/pr68-main-bootstrap-questions.md) and audit record show `DECISION_RECORDED` 20:30:39Z, `HUMAN_TURN` 20:31:51Z, and `QUESTION_ANSWERED` 20:32:07Z in order. The independent [image reassessment](pr68-image-reassessment-2026-10-29.md) found the same owner-approved candidate digest and finding under the fresh scan.
- Live preflight confirmed PR head/base, the four changed paths, red U1 and U2 checks, passing Vulnerability, required PRs, strict checks, admin enforcement, original app bindings, and blocked force-push/deletion. The PR was marked ready and squash-merged as `8cce4f8040ad0767fca1b1ab14a00bb067a66b76` at 20:33:47Z. The resulting main tree `6f3bad800617f5aa09e6c5630cab61cbb8ef7a0b` exactly equals the approved PR head and synthetic merge tree; its diff from `c9abe61` contains only the four named files.

## Protection restoration and owner disposition

- During the merge, the only temporary required-check change removed U1 and U2; Vulnerability remained required with GitHub Actions app ID `15368`. The required PR, strict checks, admin enforcement and force-push/deletion blocks remained. The guarded script restored all three required contexts immediately after merge, including U2 with original app ID `15368`.
- GitHub auto-associated the restored U1 check with app ID `15368` rather than its captured original `null`. The script reported this mismatch instead of claiming exact restoration. An attempted correction to `app_id: -1` was **rejected by automatic approval review** because [GitHub documents](https://docs.github.com/en/rest/branches/branch-protection?apiVersion=2022-11-28) that value as allowing any app to set the check, an unapproved persistent change. It was not retried or carried out. The independent process steward found the stricter Actions binding safe to present for owner disposition.
- The owner chose to keep U1 bound to GitHub Actions app ID `15368`. The [answered disposition](../construction/contracts/code-generation/pr68-u1-app-binding-questions.md) and audit show `DECISION_RECORDED` 20:39:14Z, `HUMAN_TURN` 20:39:50Z, and `QUESTION_ANSWERED` 20:40:10Z in order. Final live protection requires U1, U2 and Vulnerability, all with app ID `15368`, plus required PRs, strict checks, admin enforcement, and force-push/deletion blocks. Other protection values match the preflight snapshot.

## Hosted verification and cleanup

- The [main-push contracts run](https://github.com/anton-asnitsky/StockSense/actions/runs/40950139508) passed U1 and Vulnerability; the [main-push release-evidence run](https://github.com/anton-asnitsky/StockSense/actions/runs/40950139467) passed. The previous interim red main-push runs after ledger-only PR #67 remain historical failures, not current main results.
- [U2 run 40951510408](https://github.com/anton-asnitsky/StockSense/actions/runs/40951510408) executed the newly merged base-owned script on protected-path PR #66 and rejected it specifically for missing exact-head owner approval. The focused policy tests passed 9/9 locally, including the exact-comment allow path. The owner-comment allow path has **not** received a hosted proof on a separate PR; no comment was posted on the owner's behalf.
- Draft PR #66, superseded by the identical patch in merged PR #68, and old proof PR #64 were closed without merging. No open PR remains. GitHub automatically removed the remote merged branches for PR #67 and PR #68. Their closed/merged PRs and commit histories remain accessible. The old unmerged branch behind closed PR #66 was retained.

## Remaining work

- The current `security/image-exceptions.json` row is bound to one complete candidate-tree digest excluding only the ledger file. `verifyBoundImageEvidence` rejects any row whose digest differs from the current candidate. Therefore an ordinary future PR that changes another tracked file can still fail U1 while the one Medium Kiota finding persists. This candidate-specific ledger design needs a separate approved remediation or a fixed Kiota toolchain before claiming that arbitrary branch PRs pass all CI.
- U1 candidate acceptance and C01 release remain separate gates. This record does not grant either.
