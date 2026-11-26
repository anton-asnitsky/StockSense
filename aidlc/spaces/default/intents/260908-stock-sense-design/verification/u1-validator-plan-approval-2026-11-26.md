# Validator repair protected approval

The owner selected `Approve Plan` on 2026-11-26 after the first response binding was refused. The first refusal was not treated as authority. Native `engine log answer` subsequently emitted `PLAN_APPROVAL_RECORDED`; immediately afterward `engine testing-posture verify --unit contracts` returned:

```json
{
  "ok": true,
  "unit": "contracts",
  "reason": "approved",
  "planExists": true,
  "instructionsExist": true,
  "approved": true,
  "contractValid": true,
  "fingerprintValid": true,
  "receiptValid": true,
  "contractHash": "sha256:e36cd685382e2c5f5742ca1ccf6fd71475f191e30c58bc27eb30ea803e969c32",
  "approvalFingerprint": "sha256:499b02fc9448292b8f1691ccc6918f6b8626fa18be3abb490a0d38784813674d",
  "directiveEpoch": "sha256:54bf5d47388e4a5129f6be1c0de7e0841e2b975576a4a9e82c4c479e6e5acad8"
}
```

Runtime session: 01a1e957-9445-7512-895e-1f6860e35c76. Normative plan: u1-validator-remediation-plan-2026-11-26.md, SHA256 69c10236761db40480a69d244392c64048e4422d96b0f86fd78485aace267fc0. Independent security and steward reviews are retained beside this report. The plan's proposed label is retained to preserve its approved bytes; this later receipt records approval.

Only after successful verification was isolated branch codex/u1-validator-repair created at reviewed ledger/SBOM candidate 3fef097f5a7f87885d6453dfd3017ec23751a1b1. No exception, ledger-authority transition, protected-main change, merge, U1 acceptance, C01 release or next-gate advancement is authorized. The owner retains all merges; failing required checks remain blocking.
