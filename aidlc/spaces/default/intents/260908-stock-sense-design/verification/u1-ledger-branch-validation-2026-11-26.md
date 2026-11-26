# U1 ledger and SBOM branch validation

Independent quality/reliability verification on 2026-11-26 (Asia/Jerusalem). Scope: the reviewed implementation from `3fef097f5a7f87885d6453dfd3017ec23751a1b1` applied to isolated PR74 and PR75 validation branches. The coordinator separately reverified the approved plan receipt. This report supplies test evidence, not a new approval or a hosted U1 success.

| Branch baseline | Tested isolated commit | Focused tests | Lint | Type check |
| --- | --- | --- | --- | --- |
| PR74 `edeec8b54a4ee2d019349befbb005b944dce901d`, with existing v2 receipt prerequisite | `8c1e343677c9b7d5537c394cdd6a84af0d7e8394` | 57/57 passed; zero failures, skips, cancellations or TODOs; 46.154 seconds | exit 0 | exit 0 |
| PR75 `bd0241d3313a998039cce4a37059d188e502fda2` | `1bd8e2aca14ea060da6c097575091fb3836d2037` | 57/57 passed; zero failures, skips, cancellations or TODOs; 45.074 seconds | exit 0 | exit 0 |

## Reproducible commands

Run in each isolated worktree's `tools/contracts` directory:

```powershell
node --test test/unit/image-ledger.test.mjs test/unit/image-evidence.test.mjs test/unit/sbom.test.mjs test/unit/candidate-evidence.test.mjs test/integration/sbom-context.test.mjs
pnpm lint
pnpm type-check
```

The exact Node runtime was **v24.22.1**, with **pnpm11.25.0**. pnpm correctly warned that the package pins Node24.22.2. This local check does not satisfy the pinned hosted-runtime requirement; the coordinator owns that separate verification. Existing dependencies and `.pnpm/lock.yaml` were present and the suites resolved and ran successfully. No reinstall, dependency update or lockfile edit was needed during this verification.

## Reviewed-byte and preservation checks

For each isolated HEAD, `git diff --exit-code 3fef097f5a7f87885d6453dfd3017ec23751a1b1 HEAD -- <nine paths below>` returned exit0. Thus the committed shared implementation/test blobs exactly match the independently reviewed candidate:

- `tools/contracts/scripts/build-sbom.mjs`
- `tools/contracts/src/candidate-provenance.mjs`
- `tools/contracts/src/image-evidence.mjs`
- `tools/contracts/src/image-ledger.mjs`
- `tools/contracts/src/sbom.mjs`
- `tools/contracts/src/sbom-context.mjs`
- `tools/contracts/test/unit/image-ledger.test.mjs`
- `tools/contracts/test/unit/sbom.test.mjs`
- `tools/contracts/test/integration/sbom-context.test.mjs`

Each branch retained its story-specific package configuration. Both tracked worktrees were clean before and after validation. Their preexisting untracked `tools/contracts/aidlc/` directories were preserved. No product source, package lock, runtime pin, security policy or protected receipt was edited; no commit, push or merge was performed by this validator.

## Evidence and limits

Raw local command output is retained under `.local-data/u1-ledger-branch-validation-20261126/pr74/` and `pr75/`, each containing `tests.log`, `lint.log`, `types.log` and `result.json`. The command results are summarized above for versioned traceability; these scratch logs are not hosted provenance or authoritative scan receipts.

The focused suite covers ledger, raw image evidence, SBOM and candidate evidence units plus the real isolated-Git production SBOM CLI integration. The v1 compatibility regression and v2 dirty/no-Git and valid-format digest tampering tests pass on both branch candidates. This is not a new full coverage, image build, canonical package, scan, attestation or per-PR hosted result. The current PR heads must be advanced separately and their new source bindings and applicable CI results recorded before rollout can be called verified. Finding dispositions, protected-main publication, R-15/R-16 closure, U1 acceptance and C01 release remain outside this validation.
