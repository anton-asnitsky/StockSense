# PR #55 revised image-ledger bootstrap verification

## Authorization and exact scope

The owner approved the revised PR #51 finding-specific exception for candidate
digest `sha256:15e1b80226d07916a0cab6dd81e00c00d502ec077ad7faa095d6a0b111d8abba`.
The answer is committed at `4522bf53de7f19d0a4ff598ca4628ba96480615f` in
`construction/contracts/code-generation/pr51-revised-image-exception-questions.md`.
The audit order was `DECISION_RECORDED` 2026-10-28T09:42:16Z,
`HUMAN_TURN` 10:19:42Z, then `QUESTION_ANSWERED` 10:22:05Z.

The owner separately approved [PR #55](https://github.com/anton-asnitsky/StockSense/pull/55)
at exact head `ebfd0280df4b38f46d276a0474877327213d9f8e` into main
`8d497caca1eac5d244a71bb498a3654527a0a4f0`, with temporary removal
of **only** the U2 required check and immediate restoration. That answer is
committed at `94713d5bc5a8bc184420f9dcfd2a2bbf337f276d` in
`construction/contracts/code-generation/pr55-bootstrap-questions.md`.
Its audit order was `DECISION_RECORDED` 10:33:26Z, `HUMAN_TURN` 10:39:25Z,
then `QUESTION_ANSWERED` 10:40:04Z. The independent process review found
no Major or blocking finding before the owner gate.

## Merge and protection

PR #55 changed only `security/image-exceptions.json`, replacing the old
candidate digest, approval reference, and creation timestamp while retaining
the finding, controls, and `2026-11-25T00:00:00Z` expiry. Its hosted
[run 40672060420](https://github.com/anton-asnitsky/StockSense/actions/runs/40672060420)
passed `U1 contracts` and `Vulnerability scan`. U2 failed solely because it
protects the ledger path.

After rechecking the exact PR head, main base, one-file diff, passing checks,
and full main protection, the bootstrap temporarily removed only
`U2 protected-base PR policy` from required checks. It retained required PRs,
strict checking, admin enforcement, `U1 contracts`, `Vulnerability scan`, and
force-push/deletion blocks. The merge API was pinned to the approved head and
squash-merged PR #55 as
[`8b7f77f6506d847810ff053c42c9baaa0b4062e8`](https://github.com/anton-asnitsky/StockSense/commit/8b7f77f6506d847810ff053c42c9baaa0b4062e8).
The command's `finally` block immediately restored U2 with GitHub Actions
app ID `15368`. Full pre/post protection JSON comparison and an independent
GitHub read matched, including the U2 and Vulnerability app bindings. Raw
snapshots and the execution script are retained locally under
`.cache/pr55-merge/`.

On that exact main SHA, [contracts-required run 40674303715](https://github.com/anton-asnitsky/StockSense/actions/runs/40674303715)
passed U1 and Vulnerability, and
[release-evidence run 40674303774](https://github.com/anton-asnitsky/StockSense/actions/runs/40674303774)
passed.

## Authorized reruns and next gate

After main-push checks passed, the failed U1 jobs were rerun as attempt 2
on unchanged heads of [PR #51](https://github.com/anton-asnitsky/StockSense/pull/51)
and proof-only [PR #54](https://github.com/anton-asnitsky/StockSense/pull/54).
PR #51's [run 40664060724](https://github.com/anton-asnitsky/StockSense/actions/runs/40664060724)
passed exact image scan and protected-main ledger verification, then failed
CI policy because its workflow files still differ from the U1 Bolt base.
PR #54's [run 40664189658](https://github.com/anton-asnitsky/StockSense/actions/runs/40664189658)
passed U1 and Vulnerability, including integration and the coverage floor.
PR #54 head `4405d2e607ec1407ef053fac4f57896c6d162552` and PR #51 head
`4fe574f0349d89bce584ba09bccf33d096658020` have the same Git tree
`d9339f019736f97f1b6ee47883d089762fa3e0e6`.

PR #53 is a separate, workflow-only Bolt staging proposal. Its own U1 check
is red on the transitional tree and requires a separate owner decision that
explicitly accepts that red check before a Bolt merge. PR #51 and PR #54
remain open. This record does not accept U1, merge PR #53 or #51, or release C01.
