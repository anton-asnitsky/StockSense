# Independent validator repair implementation review

Date: 2026-11-26. Reviewer: independently dispatched StockSense security/identity specialist. Production review base: `3fef097f5a7f87885d6453dfd3017ec23751a1b1`; working tree `.aidlc/worktrees/u1-validator-repair`. Diagnostic review base: `4b1ddb6772175692974d08afc932e49200cf99fe`; working tree `.aidlc/worktrees/u1-validator-proof`. Reviewed against approved plan `u1-validator-remediation-plan-2026-11-26.md`, exact SHA256 `69c10236761db40480a69d244392c64048e4422d96b0f86fd78485aace267fc0` and its protected approval report. No implementation, exception, merge or owner approval was performed by this reviewer.

## Verdict and resolved finding

No remaining blocking or major implementation findings in the reviewed production repair. The diagnostic proof issue below was fixed and reread. This supports committing the reviewed isolated candidate and running its hosted proof, not declaring PR CI green or authorizing rollout before the plan's remaining validation requirements pass.

The initial unknown-finding branch used an unconstrained `assert.rejects`, which could label an unrelated failure as proof of policy rejection. The final branch checks both `IMAGE_EXCEPTION` and exact message `Image exception is malformed or broad`. For each actual unknown row it separately checks rejection and uses a never-persisted in-memory schema control changing only fix state to establish that unknown is the rejection cause. The temporary incorrect `IMAGE_LEDGER` predicate was corrected before this verdict. No simulated disposition is published as policy or an owner receipt.

## Security assessment

- The binary identity extension accepts only exact canonical `pkg:generic/node@<numeric three-part version>` with artifact type `binary`, package `node`, matching version and no aliases, namespace, qualifiers or subpath. Bound SBOM lookup additionally requires one exact matching named component. Existing package ecosystems remain supported.
- Explicit empty fix state is converted to `unknown` only with an explicit empty versions array. Missing or malformed metadata remains invalid; removal of the former default empty array prevents absent fix-version metadata being silently completed. Every raw match is retained. Unknown remains rejected by disposition policy, and fixed High/Critical remains non-exemptible.
- The historical 63,945-byte raw fixture is source-documented and SHA-bound. Its 20 rows remain visible, including 15 Node findings, five unknown glibc rows and seven fixed High rows. It is plainly historical positive-control data, not a current database or approval claim.
- The immutable same-family Node builder, package engine, U1 workflow pins and source expectations consistently move to 24.22.3. Docker build checks the builder binary hash; the normal build entrypoint independently checks the final-image copied binary hash and preserves the offline, non-root version smoke check. Final distroless base, Kiota runtime, pnpm, lockfile and base-owned U2 are unchanged.
- Read the provenance report. Independently recomputed the Linux archive, checksum file, detached signature, vendor keyring and extracted binary hashes; all matched that report and approved archive digest. The Node specialist's GPG result establishes vendor-key signature validity with explicitly documented HTTPS/vendor-key trust and TRUST_UNDEFINED limitation; this reviewer did not independently rerun GPG. No registry-attestation signature claim is inferred.
- The proof remains distinct from ordinary U1. Fixed High/Critical abort it. When real unknown findings exist, it reports `ordinaryU1Passed:false`, `ownerApproval:false`, `protectedReceipt:false` and `positiveLedgerSbomProofCompleted:false`; complete raw verification occurs first. Current three PR baselines are used. The two candidate checkout pins still require replacement with the final reviewed commit before dispatch; their current historical values are not approval to run the old source as the new proof.

## Independently executed checks

Used verified Node `24.22.3` at `.local-data/node24223-verification/node-v24.22.3-win-x64/node.exe`:

- `--test test/unit/image-evidence.test.mjs test/unit/image-ledger.test.mjs`: 23 tests passed, zero failed/cancelled/skipped/TODO.
- `--check` on the diagnostic simulation and consumer proof scripts: passed. An earlier invocation through the host `node.cmd` wrapper could not locate its runtime; only the subsequent explicit verified executable results count.
- `git diff --check` in production and proof trees: passed. Git's CRLF-to-LF notice on the test file is a normalization notice, not a test failure.

Coordinator separately reports exact-version lint, type checks, 50 focused tests and final normal validator build with binary guard passing. Those were not rerun by this reviewer and do not replace the required full suites, coverage, two fresh hosted lanes, C01-C27 and consumer validation, complete scan reconciliation and ordinary PR CI.

## Reviewed working-byte hashes

SHA256 values bind the actual files reviewed before commit. Git may normalize line endings when staging; retain corresponding commit/blob bindings in the coordinator evidence.

| Production path | SHA256 |
|---|---|
| .github/workflows/contracts-required.yml | f7bd4ae3f1ac565796dbfd78c113c7a6f31cd9398f1642d3ce7dd543392ce652 |
| .github/workflows/release-evidence.yml | 9b0c5a02a6d5f52ece8ce92c9a94149bf47bc94042864207211b6581d4f33406 |
| tools/contracts/Dockerfile.validator | 93d12af5a39d0397480f788b5d2544115ed404dab8bf7be89240336dfbd576fc |
| tools/contracts/package.json | fc7fa9a0d065a32df0c14e71e71c5850c05ab8297605603e35f5f5970d26474b |
| tools/contracts/scripts/build-standards-image.mjs | 8516692ff475829d1fc48ce56872f50803cae8e8c651f4729a9c3a14013e9c1c |
| tools/contracts/src/ci-policy.mjs | ae7d826969cd707da75e9715c9e3d54b6fd6c1de9f30c4132dd511242d485243 |
| tools/contracts/src/image-evidence.mjs | 6cabb6d180598a1974b0bb0e1efeae4146c71d1915ebcf3bffcf987b0311b76f |
| tools/contracts/src/sbom.mjs | faa81f912eff8a048bf24a8958206bdb32adb4db88bc702f260965cfb891090f |
| tools/contracts/test/unit/image-evidence.test.mjs | 29a6ac8814e5f15b9c5a9b90fe6965d1a8ea78092c56dc03739d5ecbbdd4d022 |
| tools/contracts/test/fixtures/image-evidence/README.md | fc56f96d0ccfbc78235bc518c1f1f0bde5e54ad8f09dacc13c68eb4bc23bb392 |
| tools/contracts/test/fixtures/image-evidence/validator-node-24.22.2.grype-raw.json | 574ff840ccc320963fbc37d0a7778992170d5fc008a4273da3af5f53000a4384 |

| Diagnostic path | SHA256 |
|---|---|
| .github/workflows/r15-noble-screen.yml (before final candidate pin) | 2507f349be7366049bf8a219af7a3a3a1910ab2b626084e6ede0a7090eee44cb |
| .github/r15-noble/consumer-proof.mjs | 1a6e866ba6d8611c8fea73fa0029b035990a3083816bf21901359a4ef4fb4a2e |
| .github/u1-ledger/simulate-ledger.mjs | c314e669816477950fe449594518885fcb4c476fea6482868c2370f210f1d3aa |

## Residual blockers

Actual current image findings require complete retained scans and exact SBOM reconciliation. No glibc finding is accepted or suppressed. Protected main's expired/incompatible ledger remains a publication dependency. Changing PR heads requires genuine fresh U2 owner authorization. No diagnostic success clears those requirements. Keep R-15 and security/release traceability gaps open; no merges, U1 acceptance, C01 release or next-gate advancement are authorized by this review.

## Follow-up: current-baseline consumer proof correction

Independently reviewed the diagnostic-only correction after run 45866784501 reportedly failed both lanes at the former PR74 lock-difference assertion. Read the immutable generation profiles at heads edeec8b54a4ee2d019349befbb005b944dce901d, bd0241d3313a998039cce4a37059d188e502fda2 and 0f5db4d25cc9364f825eb752dad05c037c7b9944: all declare Kiota 1.38.0. The old special case requiring a 1.35.0-to-1.38.0 lock-only difference therefore described an obsolete baseline.

The revised script explicitly asserts the selected baseline Kiota version is 1.38.0, retains equality of the actual baseline against its checked-in expected outputs, retains exact output-path equality and two-run equality, and requires zero output digest differences for every consumer on all three heads, including kiota-lock.json. It does not alter or ignore the lock, relax comparison, or change production candidate source. No blocking or major finding in this correction. Node 24.22.3 syntax check and git diff --check passed; hosted execution must still be rerun and evaluated honestly.

Final corrected .github/r15-noble/consumer-proof.mjs working-byte SHA256: b1898b85aeaef7c794c9436d915c0ad71d4ef914d7aa7ff6a38cdc7f6e09dc6a. This supersedes only that file's prior review hash above. No full hosted success or ordinary PR readiness is inferred from this focused review.