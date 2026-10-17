# U1 Contracts Code Generation Plan Approval

This renewal covers the current `code-generation-plan.md` and
`unit-test-instructions.md` after source-bound independent review iteration 2.
The owner-approved PR #17 bootstrap put the U1 candidate and U2 protected-base
guard on `main` at `581b70a1020e5ae36d631625a41392fddf30dbfb`.
All 169 U1 source-manifest paths were mirrored into this AI-DLC checkout and
matched that commit. The 45-file attested bundle passed clean-consumer
verification but remains explicitly `releaseReady: false`.

The Testing Contract uses test-after ordering and the Standard strategy.
The exact unit command is `pnpm --dir tools/contracts test:unit`. The classic
scope also requires at least 80% U1 line coverage and CI execution before
merge. Those obligations remain in force even where the rendered Testing
Contract's scope-floor text is narrower.

The current formal review remains **NOT-READY**: R-14 through R-16 are Major
and unresolved, R-21 is Minor and addressed in the revised plan, and R-17
through R-20 are resolved. R-14 needs canonical import events, exact examples
and changed non-OpenAPI compatibility. R-15 needs a complete tool dependency
inventory, retained scan report and finding-specific dispositions. R-16 needs
complete declared consumer output digests and candidate provenance; its
full-release remainder stays at the separate C01 gate. Hosted U1,
vulnerability and protected-base checks plus a blocked non-draft workflow PR
support the recorded U1 CI claims, while NFR13.4 remains a release gap.
Earlier plan approval is historical: the new directive epoch and review
appendix invalidated its protected fingerprint and receipt.

On 2026-10-17 the owner explicitly chose verified candidate `READY`, with full
C01 release separately gated. The revised plan and test instructions use that
boundary. Approval of these exact files permits continued U1 remediation. It
does not accept the candidate, close review findings, authorize release, or
approve a merge.

## Plan Approval

Approve this exact `code-generation-plan.md` and
`unit-test-instructions.md` for continued U1 Contracts remediation?

[Approval Fingerprint]: sha256:5aa3558f1dd476766b058c82ee52448ca91b7b4e5fc2b1eaaccc7143f7d38789

- Approve Plan — proceed to code generation
- Request Changes — revise the plan and instructions

[Answer]:
