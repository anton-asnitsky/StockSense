# U2 protected-base public-PR policy candidate (2026-10-15)

This is a bootstrap proposal, not an active required check or U1 acceptance.
The current `main` rule is strict, applies to administrators, and requires
`U1 contracts` (no app binding) and `Vulnerability scan` (GitHub Actions app
15368). It does not yet require `U2 protected-base PR policy`.

The proposed `pull_request_target` workflow runs only on PRs targeting `main`,
with read-only `contents` and `pull-requests` permissions on a GitHub-hosted
runner. It checks out `github.sha`, the protected base revision, and executes
only code from that checkout. The script reads the live PR identity, then reads
the immutable base and fork-head Git trees by commit/tree SHA. It fails closed
on missing or truncated trees, changed base/head identity, and any difference
under `.github/`, including a workflow with a colliding job name. No PR code
is checked out or executed. U1's generic `pull_request_target` ban remains;
its CLI accepts only this exact reviewed workflow file by SHA-256, and still
rejects a PR that changes workflow paths.

Local checks: four guard tests and eight U1 CI-policy integration tests passed;
the full workflow directory passed the pinned U1 policy command; lint and
TypeScript no-emit passed. A read-only API exercise accepted historical PR #7
with 89 changed paths and refused workflow-changing PR #6, naming the changed
`.github` paths. Those historical calls used the local Windows trust store;
they do not prove a hosted run.

The [GitHub event reference](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
states that `pull_request_target` runs in the base repository context. The
[security guide](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target)
warns against executing or checking out PR-head code in that context. The
[required-check guide](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks)
requires a current successful check and allows selection of a specific app.

The bootstrap PR changes `.github`, so the current required U1 job correctly
refuses it as a workflow change. Because administrators are subject to the rule,
the owner must explicitly approve a coordinated bootstrap: temporarily remove
only `U1 contracts` from required checks, leave `Vulnerability scan` and the
PR rule active, merge this reviewed PR, and immediately restore `U1 contracts`
with a GitHub Actions app binding. Then verify the protected-base guard on an
ordinary and a workflow-changing probe PR before adding the unique
`U2 protected-base PR policy` context with the same app binding. If hosted
proof fails, keep the original U1 and vulnerability checks required, and keep
R-15 open while repairing the guard. The temporary
rule change and merge are not authorized by this document. Until that live
proof, R-15 remains open. No branch rule has been changed by this branch.
