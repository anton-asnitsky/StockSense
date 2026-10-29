# U1 Contracts Code Generation Plan Approval — Node security amendment

The exact `code-generation-plan.md` and `unit-test-instructions.md` retain
test-after ordering, the Standard strategy, U1-scoped tests, at least 80%
line coverage, and CI execution before merge. Their old source-bound Plan
Approval no longer applies because this amendment changes the Node pin and
security tests. The Testing Contract itself is unchanged.

[Draft PR #62's hosted run 40839795810](https://github.com/anton-asnitsky/StockSense/actions/runs/40839795810)
and its unchanged rerun failed at the validator image scan. The retained
validator SBOM and a checksum-verified Grype 0.120.1 reproduction identify
eight fixed findings in Node 24.19.0: one Critical, three High, three Medium,
one Low. The current scanner rejects their `binary` / `pkg:generic` shape,
and the fixed High/Critical findings independently block acceptance. The
[verification record](../../../verification/u1-node-security-scan-2026-10-29.md)
contains the exact evidence and limits. Node's 24.22.1 security release fixes
the listed CVEs; the proposed target is immutable Node 24.22.2 LTS.

The revised plan updates all four CI Node pins, the validator image and its
version assertion, package engine, SBOM/CI policy assertions, and affected
tests. It retains raw scan and database evidence before normalization, keeps
the finding gate fail-closed, and requires exact Linux/amd64 image and
main-push proof. An independent security and technical lead review found
two Major plan gaps—protected-change integration sequencing and raw scan
retention—which are now explicit in the revised plan and test instructions.

Draft PR #61's workflow fix and draft PR #62's ledger row are **not** approved
for merge by this decision. The earlier MessagePack exception is bound to
PR #61's old candidate digest and cannot cover the upgraded tree. Any new
finding-specific exception, each protected-main merge, and any temporary
required-check change require separate owner decisions. R-14–R-16, the
45 traceability gaps, stale U1 summary/traceability, candidate READY, and
full C01 release remain open. This approval permits implementation and
remediation under the revised plan only.

## Plan Approval

Do you approve this exact `code-generation-plan.md` and
`unit-test-instructions.md` for continued U1 Contracts remediation?

[Approval Fingerprint]: sha256:32133bf0b4208892cfb6831e26d851f9fd6a5851e7148e497a5d76faecb68623

- Approve Plan — proceed to code generation
- Request Changes — revise the plan and instructions

[Answer]:
