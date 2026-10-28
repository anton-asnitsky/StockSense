# U1 Contracts Code Generation Plan Approval

The current `code-generation-plan.md` and `unit-test-instructions.md` retain
test-after ordering, the Standard strategy, the unit-scoped test commands,
at least 80% U1 line coverage, and CI execution before merge. The revised
plan records PR #51's merge into the U1 Bolt and draft PR #59's replay of its
implementation on current `main`. PR #59 at `2c77ca3ce480a08a38992744a17040036b446b69`
preserves main's audit records and has a new candidate digest,
`sha256:9847509d6ee3930bdca0707e8c4478118bb6e045701528e5d2340957c1b15add`.
The AI-DLC checkout is a divergent documentation mirror; a source-bound review
must use an exact source checkout.

The latest formal review remains `NOT-READY`. R-14–R-16 are open Major
findings. The 95-ID traceability map currently has 50 `OK` and 45 `GAP` rows.
PR #59's Vulnerability job passed; U1 stopped at the expected image-ledger
mismatch after retaining its scans, and U2 rejected protected CI edits.
The new candidate has no trusted-main attestation. Candidate `READY` and
full C01 release are separate gates. This Plan Approval permits continued
U1 remediation only; it does not resolve findings, accept U1, authorize a
merge, or release C01.

## Plan Approval

Approve this exact `code-generation-plan.md` and
`unit-test-instructions.md` for continued U1 Contracts remediation?

[Approval Fingerprint]: sha256:6eaee7692bd383b01bdd37a665004d22bdf06828ce19a4ed0b1877cedb1dd89c

- Approve Plan — proceed to code generation
- Request Changes — revise the plan and instructions

[Answer]: Approve Plan
