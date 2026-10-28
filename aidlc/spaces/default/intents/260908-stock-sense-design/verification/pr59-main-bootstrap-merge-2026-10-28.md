# PR #59 main bootstrap merge — 2026-10-28

The owner approved the exact [PR #59 bootstrap question](../construction/contracts/code-generation/pr59-main-bootstrap-questions.md).
The audit shard records `DECISION_RECORDED` at `19:23:05Z`, a `HUMAN_TURN`
at `19:23:28Z`, and `QUESTION_ANSWERED` at `19:24:06Z`. The approval was for
head `a2c2e48d70b8f6f67355f4b036b7306c5ee7003c` into `main` at
`a277d1766eec477177387e341bd44e807dbb64fe`, with only U1 and U2
temporarily removed from required checks and immediately restored.

Preflight pinned the PR and main heads, remote Git tree
`df713ba93a710222f78635c5399061cbdf0d8fb3`, and ledger-excluded
candidate digest
`sha256:9847509d6ee3930bdca0707e8c4478118bb6e045701528e5d2340957c1b15add`.
The updated-head Vulnerability check passed. U1's image build, scan and
protected-main ledger verification passed, then its workflow-change policy
failed; U2 rejected protected paths. The full prechange protection response
was saved locally. The guarded sequence temporarily removed only U1 and U2,
kept Vulnerability, the required PR, strict checks, administrator enforcement,
and force-push/deletion blocks, marked [PR #59](https://github.com/anton-asnitsky/StockSense/pull/59)
ready, and squash-merged it as `68bb426590ccd529ccdfcb2dfcaa8ea701ed46e9`.
Live `main` points to that commit and its Git tree is exactly the pinned
candidate tree.

The restoration call initially re-added U1 with GitHub Actions app ID `15368`
instead of its original unbound setting. The guarded script detected the
mismatch and returned failure despite the successful merge. A subsequent
attempt combining `contexts` and `checks` briefly omitted U1 from the
required list; U1 was immediately re-added. GitHub's documented `app_id: -1`
then restored U1's any-app setting, which the API reports as `null`. A fresh
full-protection response, compared with sorted context/check arrays against
the saved original, returned `PROTECTION_MATCHES_ORIGINAL`: required U1
(unbound), U2 (app `15368`) and Vulnerability (app `15368`), strict checks,
required PR, administrator enforcement, and force-push/deletion blocks all
match. No other `main` commit appeared during this correction.

[Main-push contracts and Vulnerability run 40754287503](https://github.com/anton-asnitsky/StockSense/actions/runs/40754287503)
passed both jobs. [Release-evidence run 40754286140](https://github.com/anton-asnitsky/StockSense/actions/runs/40754286140)
failed at `Build the CycloneDX SBOM` with `IMAGE_MISSING`; its earlier image
build, scan, and ledger steps passed. The workflow passed a repository-relative
image-evidence path to `pnpm --dir tools/contracts`, whose script runs from the
`tools/contracts` directory. A focused correction changing that path to
`dist/image-evidence` was committed as `374f9113e9d49e67a6bc579a0fc8cd6aa33d77cf`
and opened as [draft PR #61](https://github.com/anton-asnitsky/StockSense/pull/61).
Using the exact retained image inventory, scans, and ledger receipt from the
failed main run, the original path reproduced `IMAGE_MISSING`; the corrected
path generated a CycloneDX 1.6 SBOM with 3,078 components. PR #61 is a
separate forward fix and has not been merged. Its protected workflow edit and
new candidate digest require their own review and owner decisions.

This merge does not accept U1, mark it candidate READY, or release C01.
R-14–R-16, the 45 traceability gaps, and the stale approval-bound U1 plan
remain open for reconciliation and renewed review.
