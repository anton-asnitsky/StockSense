# ADR 0020: Owner approval for protected CI changes

Date: 2026-10-29
Status: Approved design; implementation in draft PR #66 is not merged

## Context

The base-owned `public-pr-policy` check intentionally rejects all PR changes
to workflows, local Actions, scan authority and exception inputs. This kept
untrusted PR code from certifying itself, but even an explicitly reviewed
owner change required a one-time suspension of the U2 required check. The
owner approved a narrower contribution route in the StockSense AI-DLC
Infrastructure Design decision at 2026-10-29T16:00:28Z, after a recorded
question at 15:59:23Z and a human answer at 15:59:54Z.

## Decision

The protected-base U2 job may accept a protected-path change only when a
GitHub issue comment on that PR comes from the repository owner's user
account with GitHub's `OWNER` association and names both the exact current
PR base and head commit SHAs. The policy reads immutable Git trees using a
read-only token, executes only the default-branch policy code, and rechecks
the PR revision after reading the comment. A changed base or head needs a
new comment. Ordinary PRs need no such comment. Missing, stale, non-owner,
ambiguous or unavailable evidence fails closed. The job compares the actual
PR base SHA for U1 Bolt PRs; `GITHUB_SHA` under `pull_request_target` identifies
the default-branch revision and is not a reliable Bolt base.

This approval changes only the U2 contribution-policy decision. U1 retains
its separate workflow-content and image-evidence checks. A green U2 result
does not waive a red U1 or Vulnerability result, approve a merge, or authorize
a branch-protection change. Every merge still needs explicit owner approval
for the concrete PR. The first rollout of this policy is itself a protected
change and needs its own owner-approved bootstrap and verification.

## Relationship to existing design

For U2 Infrastructure Design, this ADR narrows the Stage 1 failure rule in
`aidlc/spaces/default/intents/260908-stock-sense-design/construction/platform-infrastructure/infrastructure-design/cicd-pipeline.md`:
unapproved unsafe or self-certifying changes still block, while an exact
base/head owner approval permits U2 to evaluate protected files without
letting candidate code decide the exception. The NFR13.1 trace remains tied
to the independent protected-base check. The existing design artifact is
preserved as the earlier baseline; this ADR records the approved correction.

## Implementation and verification

Draft [PR #66](https://github.com/anton-asnitsky/StockSense/pull/66) contains
the policy code, focused tests, and contributor instructions. Its source
revision, hosted checks, image exception and rollout protection must be
verified independently before a merge. This ADR records no U1 candidate READY
or C01 release decision.
