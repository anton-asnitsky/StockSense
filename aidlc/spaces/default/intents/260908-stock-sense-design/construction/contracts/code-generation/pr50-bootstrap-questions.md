# PR #50 protected-ledger bootstrap decision

Draft [PR #50](https://github.com/anton-asnitsky/StockSense/pull/50)
changes only `security/image-exceptions.json`. It replaces the prior candidate
digest with the owner's approved revised PR #48 digest
`sha256:ce87da745fe33c5300bff56d107282fe9ea177a6a6b4b30437ff8bca67df470b`.
The exact head is `5ad6a83b1438a19d34b80e4df140e5969779e6cb`;
protected `main` is `45fbd6622a4f7919840b7bc10a3f8e1e8d4848ad`.
The [immutable question](https://github.com/anton-asnitsky/StockSense/blob/686c596b19719f77c6eaf5542365f858c62e7c47/aidlc/spaces/default/intents/260908-stock-sense-design/construction/contracts/code-generation/pr48-image-exception-a2fd7bf-questions.md)
and [audit](https://github.com/anton-asnitsky/StockSense/blob/686c596b19719f77c6eaf5542365f858c62e7c47/aidlc/spaces/default/intents/260908-stock-sense-design/audit/anton-pc-e91d12f789b9.md)
prove decision, human reply, and answer in order. The independent process
review found no Major approval-trace inconsistency.

On this exact head, [hosted run 40553484026](https://github.com/anton-asnitsky/StockSense/actions/runs/40553484026)
passed `U1 contracts` and `Vulnerability scan`. `U2 protected-base PR policy`
failed solely because its rule refuses ledger edits. Main currently requires
a PR, strict status checks, admin enforcement, `U1 contracts`, `Vulnerability
scan`, and `U2 protected-base PR policy`; force pushes and deletion are
disabled. Its U2 app ID is 15368, U1 has null app binding, and Vulnerability
has app ID 15368.

`CONTRIBUTING.md` requires explicit owner approval for each concrete merge.

## Decision

May I temporarily remove only `U2 protected-base PR policy` from required
checks, retaining every other protection above; mark only PR #50 ready;
squash-merge it into `main`; immediately restore U2 and its app binding;
verify protection and main-push evidence; then rerun PR #48's blocked U1
check? The temporary change affects all PRs to main while it is active.
Approval covers this specific PR and sequence only. It does not approve PR
#48's merge, U1 acceptance, or C01 release.

- Approve PR #50 bootstrap and temporary U2 check change
- Request changes

[Answer]: Work in D:\Git\StockSense. I authorize merging PR #50 only if its head is still 5ad6a83b1438a19d34b80e4df140e5969779e6cb. Record this approval through the pending AI-DLC pr50-bootstrap-questions.md gate and verify the audit order. Recheck the PR, checks, and main protection. Temporarily remove only U2 protected-base PR policy from required checks; keep the required PR, U1, Vulnerability, strict checks, and admin enforcement. Squash-merge PR #50, immediately restore U2 with its app binding, verify protection and main-push checks, then rerun PR #48. Preserve unrelated work. Do not merge PR #48 or accept U1.

Receipt verified: DECISION_RECORDED 2026-10-27T17:52:26Z precedes HUMAN_TURN 2026-10-27T19:00:58Z, which precedes QUESTION_ANSWERED 2026-10-27T19:04:48Z. The answer was recorded through `aidlc engine log answer` for code-generation / contracts. Independent process-steward review found no blocking or major inconsistency. This decision does not advance the lifecycle or accept U1.
