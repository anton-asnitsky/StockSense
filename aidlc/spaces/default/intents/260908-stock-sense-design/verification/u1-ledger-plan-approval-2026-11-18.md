# U1 ledger and SBOM plan approval receipt

The owner answered **Approve Plan** to fingerprint `sha256:f6e34edf4a0333f3763f257b64f41cb41bcdcb130f2d1a2410b10878616cdef7`. The answer was recorded through the native plan-approval command in session `01a1e957-9445-7512-895e-1f6860e35c76`. Subsequent testing-posture verification returned `ok`, `approved`, `contractValid`, `fingerprintValid` and `receiptValid` all true. Contract hash: `sha256:e36cd685382e2c5f5742ca1ccf6fd71475f191e30c58bc27eb30ea803e969c32`; directive epoch: `sha256:3e1d31ecbbfb588883dafdd444d610228f4cf2a56db871d10037580c116711dd`.

Approved normative plan: [u1-ledger-remediation-plan-2026-11-17.md](u1-ledger-remediation-plan-2026-11-17.md), exact file SHA-256 `14399b2d0d29f1e3ae52af73bfe7195ddbb057e9608b98414152fbc9091d3429`. Its original proposed status is retained as the exact reviewed bytes; this receipt records the subsequent decision. [Independent gate review](u1-ledger-plan-gate-review-2026-11-17.md).

This authorizes reviewed and tested working-branch implementation of exact execution/runtime ledger selection and independently bound SBOM verification. Vulnerability exceptions, protected-main changes, every merge, U1 acceptance and C01 release remain excluded. R-15 and R-16 remain open until their evidence and decisions are complete.

Initial isolated implementation branch: `codex/u1-ledger-remediation`, based on PR76 head `0f5db4d25cc9364f825eb752dad05c037c7b9944`. PR74 starts at `edeec8b54a4ee2d019349befbb005b944dce901d`; PR75 at `bd0241d3313a998039cce4a37059d188e502fda2`. Existing untracked work in all three PR worktrees and unrelated root changes are preserved. This document records authorization, not implementation or test completion.
