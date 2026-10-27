# U1 PR #49 ledger bootstrap — 2026-10-27

This records the protected-main exception-ledger merge. It does not accept U1,
merge PR #48, or release C01.

The owner first reconfirmed the PR #48 finding-specific exception for candidate
digest `sha256:af3d8c73886af2a8560b36fe5ee2aff09c0a487b68ad575b1de77334d799edce`.
The [exact question](https://github.com/anton-asnitsky/StockSense/blob/095bde6da61714289f8fd2e16a7305681927951b/aidlc/spaces/default/intents/260908-stock-sense-design/construction/contracts/code-generation/pr48-image-exception-reconfirmation-questions.md)
and [AI-DLC audit](https://github.com/anton-asnitsky/StockSense/blob/095bde6da61714289f8fd2e16a7305681927951b/aidlc/spaces/default/intents/260908-stock-sense-design/audit/anton-pc-e91d12f789b9.md)
were published at immutable commit `095bde6da61714289f8fd2e16a7305681927951b`.
The audit order is `DECISION_RECORDED` 16:03:44Z, `HUMAN_TURN` 16:04:17Z,
`QUESTION_ANSWERED` 16:06:09Z. An independent process review found no remaining
Major approval-trace issue.

The owner separately approved the exact [PR #49](https://github.com/anton-asnitsky/StockSense/pull/49)
bootstrap and temporary U2 required-check change. Its AI-DLC audit order is
`DECISION_RECORDED` 16:18:53Z, `HUMAN_TURN` 16:56:07Z, `QUESTION_ANSWERED`
16:56:42Z. The approved head was
`5a571db82e3508e012fd1bdd8298daae9a329391` on main
`b85ed4bce359fa10345c13d74fbb92b92adcf1bd`; the PR changed only
`security/image-exceptions.json`. Its hosted U1 and Vulnerability checks
passed. U2 refused the ledger edit under the intended protected-path rule.

The temporary protection update removed only `U2 protected-base PR policy`
from required checks. It retained strict status checking, required PRs,
admin enforcement, `U1 contracts`, `Vulnerability scan`, and blocked force
pushes/deletion. PR #49 was marked ready and squash-merged into main as
`45fbd6622a4f7919840b7bc10a3f8e1e8d4848ad`. The U2 check was restored
immediately, including its GitHub app ID 15368. A read-back confirmed the
original three required contexts and app bindings, strict mode, required PRs,
admin enforcement, and force-push/deletion blocks.

The protected-main [release-evidence run 40546260937](https://github.com/anton-asnitsky/StockSense/actions/runs/40546260937)
and [main U1/Vulnerability run 40546260882](https://github.com/anton-asnitsky/StockSense/actions/runs/40546260882)
both passed on the merge commit. The previously blocked
[PR #48 run 40532815840](https://github.com/anton-asnitsky/StockSense/actions/runs/40532815840)
was rerun with `--failed` as attempt 2. It passed the current ledger check,
image scan and lint, then failed type-check in `src/policy.mjs`: two nullable
regex matches and one possibly undefined media key. A later `never` annotation
exposed a possibly undefined stack pop to TypeScript as well.

Story commit `a2fd7bf` fixes those narrowings without changing the fixture
policy. Local type-check and lint passed; unit tests passed 299 with two
skips; policy tests passed 37; full-package integration passed 11; baseline
compatibility passed 9. The broad local integration attempt passed 90, skipped
5, had one TODO and failed 8 because local immutable image IDs were absent
and sandbox/temp package paths could not satisfy committed-source checks. This
is not a hosted integration pass. The story head was pushed to PR #48 for a
new hosted run. Its candidate tree digest changes, so the former exact
exception cannot authorize the revised head. Current scan, digest, and a
separate owner disposition are required before its U1 check can pass.
