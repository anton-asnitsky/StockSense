# Independent technical review: U1 multi-baseline ledger plan

Reviewed 2026-11-17 by the StockSense technical lead. This is a plan review, not implementation approval, vulnerability acceptance, merge approval, U1 acceptance or C01 release.

## Reviewed sources

- `verification/u1-multi-baseline-ledger-plan-review-2026-11-17.md`.
- PR76 worktree `tools/contracts/src/image-ledger.mjs`, `src/image-evidence.mjs`, `src/sbom.mjs`, `scripts/build-sbom.mjs`, `scripts/image-evidence.mjs` and `test/unit/sbom.test.mjs`.
- PR74 worktree `tools/contracts/src/sbom.mjs`.
- Repository contribution policy, project brief, ADR0001, project memory and runtime setup guidance.

## Findings and required correction

**Major: the proposed altered-digest SBOM test needs an explicit implementation change.** Current PR76 `verifyImageLedgerReceipt` checks v2 execution/runtime values for SHA-256 syntax but does not compare them to independently computed expected values. Its existing tests reject malformed values; a different syntactically valid SHA passes this portion. Copying that support to PR74 alone cannot meet the plan's promise that altered execution/runtime fields fail. Add the following narrowly scoped comparison work to the protected implementation plan before presentation.

1. In the production `build-sbom.mjs` entry point, obtain HEAD, its Git tree SHA and its complete NUL-delimited `git ls-tree -r -z --full-tree HEAD` listing through bounded, shell-disabled Git calls. Require the supplied candidate revision to equal HEAD and reject dirty or untracked files in the protected execution roots/files. Derive the complete candidate-tree digest and execution fingerprint using the existing pure functions. Pass these independently computed expected bindings to the SBOM builder, never values copied from the receipt or caller-provided digest environment variables.
2. For v2 image evidence, require that expected context and compare receipt candidate tree SHA, candidate-tree digest and execution fingerprint to it. Missing expected context must fail closed. Preserve v1 behavior unless the final approved scope explicitly includes strengthening it too.
3. Recompute runtime identity in the SBOM receipt validator with `readKiotaRuntimeEvidence(directory, verifiedKiotaRecord.imageId)`. This helper normalizes retained runtime entries/config against the exact retained `kiota.cdx.json`, verifies its canonical representation and binds the actual image and SBOM digest. Compare its result to the receipt runtime digest. Do not use the receipt runtime value to create expected input. This is an independent consistency check within the existing trusted same-job evidence boundary; it does not turn arbitrary local files into protected evidence.
4. Cover both production callers: `scripts/build-sbom.mjs` and `src/candidate-provenance.mjs:368`. The latter already derives Git tree, execution and runtime bindings later in `buildCandidateEvidence`; move or share that derivation before its SBOM build, pass the same independently computed context, and retain its later protected-main re-verification. Do not leave an optional v2 bypass or break candidate evidence reconstruction. A shared bounded Git-context helper may avoid divergent derivation across the two entry points and must itself remain fingerprinted.
5. Add cases for changed but syntactically valid execution/runtime/tree digests, missing expected context, changed runtime manifest/config/SBOM bytes, different image identity, and Git revision/dirty-protected-path mismatch. Unit fixtures may supply explicitly constructed expected bindings; at least one integration path must exercise the real entry point and Git-derived values. Existing image evidence/raw-scan verification and live-main receipt provenance remain required.

**Publication blocker remains explicit.** Main's v1-only implementation cannot consume the proposed v2 ledger; its own runtime does not match the three candidate groups. A ledger-only main PR is therefore not a safe complete publication path. The reviewed scope may prepare the three working candidates and an inert proposal while merges are prohibited. Before any future main publication, a separately reviewed compatibility/runtime prerequisite and its applicable passing checks are required. Do not bypass that dependency or describe local simulated-main proofs as hosted U1 success.

## Sound aspects of the proposed design

Exact execution-fingerprint plus normalized-runtime selection preserves the intended v2 authority boundary. Runtime alone, branch names or PR numbers cannot select approval. Validate every row before filtering; then enforce exact finding reconciliation and totals only within the selected group. Preserve v1 semantics, strict fields, immutable protected-main blob provenance and the exclusion of only the ledger itself from binding. Expired or malformed non-selected rows should fail as explicitly designed. Reject a nonempty ledger with no matching group.

All newly changed verifier/helper/test paths must remain in the execution fingerprint. Final candidate identities must be recomputed after implementation, with new owner U2 comments for changed heads. Dispositions and dates must reflect actual owner decisions. New picomatch findings remain separately open.

## Verdict and checks

Suitable for protected plan presentation after the major correction above is incorporated and the publication blocker is disclosed. No code was changed and no tests were run for this read-only review. Implementation requires the proposed selector adversarial tests, strengthened SBOM binding tests, relevant package checks, independent final review and per-head hosted evidence. No PR may be merged under the current instruction.
