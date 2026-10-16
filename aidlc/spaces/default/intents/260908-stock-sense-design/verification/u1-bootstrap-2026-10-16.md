# U1/U2 protected-base bootstrap verification — 2026-10-16

This is implementation and CI evidence, not U1 acceptance or a C01 release. The owner explicitly approved the concrete PR #17 bootstrap in this chat, including the temporary required-check change and exact-head squash merge. The separate U1 Code Generation approval receipt was not used as merge authorization.

## Merge and protection

- Draft [PR #17](https://github.com/anton-asnitsky/StockSense/pull/17) was rechecked at head `4a0f6efaff42b1095594f8e01d6bff0b1702f27c`, marked ready, and squash-merged into `main` as `581b70a1020e5ae36d631625a41392fddf30dbfb`.
- Immediately before the merge, `main` had strict required checks `U1 contracts` (unbound provider) and `Vulnerability scan` (GitHub Actions app 15368), required PRs, admin enforcement, and disabled force pushes/deletions. Only `U1 contracts` was temporarily removed from the required set. A `finally` restoration put it back immediately after the merge. GitHub initially auto-bound it to app 15368; a follow-up PATCH using the documented `app_id: -1` returned it to the original unbound-provider semantics (`app_id: null`). No other pre-existing protection was relaxed.
- After hosted guard probes, the unique `U2 protected-base PR policy` GitHub Actions check was added as a third strict required check. A final API read returned the original two checks plus this new check, required PRs and admin enforcement still active, and force pushes/deletions still disabled.
- This temporary exception was necessary because PR #17 installed `.github` workflows and the old U1 policy rejected any workflow change. Child [PR #18](https://github.com/anton-asnitsky/StockSense/pull/18) had passed both hosted checks on a code/workflow tree that differs from PR #17 only by a verification note in a direct tree comparison.

## Trusted main-push package evidence

- The [`contracts-required` push run 38876246986](https://github.com/anton-asnitsky/StockSense/actions/runs/38876246986) passed both `U1 contracts` and `Vulnerability scan` at the merge commit.
- The [`release-evidence` push run 38876247058](https://github.com/anton-asnitsky/StockSense/actions/runs/38876247058) passed frozen install, SBOM build, secret and vulnerability scans, pinned standards-image build, C01–C27 candidate-bundle validation, candidate-bundle and SBOM provenance attestations, and artifact uploads.
- A separate clean checkout of the exact `main` commit downloaded the uploaded `candidate.bundle.json` and ran `node tools/contracts/scripts/verify-candidate-bundle.mjs artifacts/candidate.bundle.json 581b70a1020e5ae36d631625a41392fddf30dbfb`. It verified the exact package subject against repository `anton-asnitsky/StockSense`, signer `.github/workflows/release-evidence.yml`, source commit, `refs/heads/main`, and a non-self-hosted runner. The verifier reported artifact digest `sha256:84c14ec8b593180b364fa9d21fb4e107d138561be587020ff4888f25c07a79e9`, manifest digest `sha256:d28d593e62cd2571c02400627461c4717730e02ae838039d7561cf01a074168e`, canonical source revision `1820225f36f578c45d29c0c2746dc9e3e9def187`, 45 files, 530127 bytes, and `releaseReady: false`.

## Protected-base guard probes

- Disposable draft [PR #19](https://github.com/anton-asnitsky/StockSense/pull/19) changed only a `docs/verification` file. Its base-owned [`public-pr-policy` run 38877147106](https://github.com/anton-asnitsky/StockSense/actions/runs/38877147106) passed. Its vulnerability check passed; the long U1 check is not credited here.
- Disposable draft [PR #20](https://github.com/anton-asnitsky/StockSense/pull/20) added only a comment to `.github/workflows/contracts-required.yml`. Its base-owned [`public-pr-policy` run 38877362788](https://github.com/anton-asnitsky/StockSense/actions/runs/38877362788) failed with `Protected CI paths changed: .github, .github/workflows, .github/workflows/contracts-required.yml`. The U1 check also failed and the vulnerability check passed. Both probe PRs were closed and their remote branches deleted without merging.

## Remaining gates

The candidate is not a released C01 package and U1 is not READY. Reconcile the final `main` source in U1's Code Generation summary, traceability, and source-bound formal review; the older formal review bound an empty checkout source listing. Resolve the remaining R-14–R-19 findings against this exact source and hosted evidence, distinguishing U1 implementation proof from provider/runtime and U2 ownership. The C16 callback excerpt and U3 platform Operator grant corrections remain draft working-tree edits pending formal design-stage reconciliation; do not claim the earlier design approvals cover their new bytes. Keep the AI-DLC approval fingerprint intact and use the engine-directed route for further lifecycle gates.
