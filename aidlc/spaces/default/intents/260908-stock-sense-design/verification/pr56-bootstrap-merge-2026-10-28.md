# PR #56 protected-ledger bootstrap verification

The owner approved the exact PR #56 bootstrap in
`construction/contracts/code-generation/pr56-bootstrap-questions.md`, committed
on `fix/approve-plan-regex` as `fdeb587`. The audit order was
`DECISION_RECORDED` at 2026-10-28T13:43:32Z, `HUMAN_TURN` at 14:01:00Z, and
`QUESTION_ANSWERED` at 14:02:49Z. The independent process steward found no
Major issue before the gate.

Before mutation, PR #56 was open with exact head
`4572e723a8a5eb5397e947e7dfdf15c2684fb8bd`, main base
`8b7f77f6506d847810ff053c42c9baaa0b4062e8`, and only
`security/image-exceptions.json` changed. Hosted U1 and Vulnerability checks
passed; U2 rejected the protected ledger edit. Main protection required a PR,
strict checks, admin enforcement, U1, Vulnerability and U2; U2 and
Vulnerability were bound to app ID `15368`. Force push and deletion were
disabled.

PR #56 was marked ready, then the pinned squash merge temporarily removed only
U2 from required checks. The execution script's `finally` path immediately
restored U2. Full pre/post protection JSON matched, and an independent GitHub
API read confirmed all three required checks, U2 app ID `15368`, and the other
original controls. PR #56 merged into main as
[`36c54749790c6288553018e15989beca7418f5f9`](https://github.com/anton-asnitsky/StockSense/commit/36c54749790c6288553018e15989beca7418f5f9).
Raw local snapshots and the execution script are in ignored
`.cache/pr56-merge/`.

Main-push [release evidence](https://github.com/anton-asnitsky/StockSense/actions/runs/40702746980)
and [contracts-required](https://github.com/anton-asnitsky/StockSense/actions/runs/40702747511)
both passed. The latter includes successful U1 and Vulnerability jobs. PR #51
run [40685726261](https://github.com/anton-asnitsky/StockSense/actions/runs/40685726261)
was rerun in full as attempt 2 on the unchanged head; its exact-image scan and
Vulnerability job passed. Its U1 job also passed, including integration tests
and the 80% line-coverage floor.

PR #51 remains open and unmerged at head
`d4aa5a6ddc13cce94f1077288971cf05a104511c`. U1 is not accepted and C01
is not released.
