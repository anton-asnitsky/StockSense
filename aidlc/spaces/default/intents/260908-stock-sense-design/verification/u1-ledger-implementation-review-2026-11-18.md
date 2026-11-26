# Independent implementation review: U1 ledger and SBOM binding

Review date: 2026-11-18. Reviewer: StockSense technical lead. Scope: uncommitted implementation in `.aidlc/worktrees/u1-ledger-remediation` against `verification/u1-ledger-remediation-plan-2026-11-17.md`. No implementation changes were made by this reviewer.

## Findings

**Major, resolved: unconditional strict Git context changed v1 production behavior.** The initial implementation invoked `readSbomSourceContext` whenever the CLI received an image evidence directory and unconditionally in candidate provenance. The SBOM library itself still accepted v1 receipts, but the CLI could no longer process an otherwise valid v1 receipt outside a Git checkout or with dirty protected paths. Candidate provenance already required a Git revision/tree, but acquired a new cleanliness restriction. The approved plan preserves v1 behavior. The coordinator and SBOM specialist were notified. The final correction uses receipt schema only to select validation behavior: strict independent context is required for v2, while the v1 CLI path retains its prior behavior and candidate provenance retains its original bounded immutable Git binding. The receipt never supplies expected digests. The real production CLI regression confirms v1 succeeds with dirty protected paths and without Git, while v2 refuses both. The correction was independently re-reviewed and the finding is resolved.

## Reviewed behavior

The v2 selector validates the shape of every row, groups by exact execution/runtime pair, validates all groups before filtering, and passes only the selected group's records to exact scan reconciliation. Missing groups, duplicate findings, malformed or expired unrelated rows, and fixed High/Critical dispositions fail closed. Selected totals are compared against the selected group. V1 candidate-tree selection and the empty clean-image case remain intact.

The SBOM library compares valid-format v2 tree SHA, candidate digest and execution fingerprint to independently supplied Git context. It independently recalculates runtime identity from canonical retained runtime and SBOM bytes bound to the verified Kiota image ID. All production SBOM callers were located: `scripts/build-sbom.mjs` and `src/candidate-provenance.mjs`. Both supply the new context; candidate provenance retains the later live-main retrieval and exact receipt comparison.

The context helper uses bounded shell-disabled Git calls, requires actual HEAD to match the candidate revision, derives the canonical committed tree/execution values, and checks HEAD plus protected-path cleanliness again after collection. No expected digest is sourced from the receipt or environment. Existing normal hosted outputs are ignored under `dist`; untracked unrelated local `tools/contracts/aidlc` work remains preserved and may correctly prevent a strict local v2 proof.

## Verification

An independent focused run passed 45 tests, zero failures/skips: image-ledger, image-evidence and SBOM unit tests plus the real isolated-checkout SBOM-context integration tests. These initial results precede the requested v1 correction. The initial sandbox Node wrapper was unavailable; the successful run used the installed `node.exe` directly. No successful sandbox test was claimed.

Broad package coverage, final clean candidate proof, two independent runtime builds, C01-C27 checks, scans and hosted per-PR runs belong to the coordinator's remaining verification. The focused result does not establish hosted U1 success.

## Authority and residual limits

No protected-main policy, runtime or dependency pin changes were present in the reviewed implementation diff. The new helper and tests remain under existing fingerprinted execution roots. No finding disposition, owner approval reference, main publication or merge is supplied by this review. PR74's separate v2 receipt compatibility prerequisite and final branch-specific integration still need verification. Main compatibility/publication, fourteen runtime findings, the separate picomatch finding, R-15 and R-16 remain open.

Final verdict: no remaining blocking or major implementation findings in the reviewed bytes. Suitable for commit/push to the isolated working branch and continued clean hosted verification under the approved plan. Branch-specific rollout remains conditional on the required technical checks and review. No PR merge, finding acceptance, U1 acceptance or C01 release is authorized.

## Final verification and reviewed bytes

After the v1 correction, an independent run passed 57/57 tests with zero failures, cancellations, skips or TODOs: image-ledger, image-evidence, SBOM and candidate-evidence unit tests plus sbom-context integration tests. The SBOM specialist separately reported focused tests, lint and type checks passing. Git diff --check passed. No further code edits are expected before commit; changes to these bytes require review.

```text
tools/contracts/package.json sha256:9021f2920a06de0f3a3255bc936f41be4d14a99676cd4c306b99bd1f637d3110
tools/contracts/scripts/build-sbom.mjs sha256:003d8446bab7703aa0abbcbc364d2708d3077c0c3994cf6c09f279283ade079b
tools/contracts/src/candidate-provenance.mjs sha256:3b633f18a6e2dcf13445b1160e74e779975502ca81215a2ad853799e92b4f20f
tools/contracts/src/image-evidence.mjs sha256:f67bc54207ee8618107559781c97c1682f5be725acccbaf613a8f5c574260fe6
tools/contracts/src/image-ledger.mjs sha256:3558d533d70bd1f542ad53fb479f48b406c382e1f33b17bea031831debd03224
tools/contracts/src/sbom.mjs sha256:4467c596affaa422e6e8559c5bc3313500ff546992883ba207168f5005fe0cd2
tools/contracts/src/sbom-context.mjs sha256:238decb3bccf6147499ca6be4933a11a1b263233e1b9212a2250a41b47b74268
tools/contracts/test/unit/image-ledger.test.mjs sha256:5b5af71d4bb19aa9edc448611b4314c2d540684cac5bae3ef75fdd07e0a0a811
tools/contracts/test/unit/sbom.test.mjs sha256:e14c6e90eda636d26612bbf9ed40c9ce37892c5d02a7961575fb005380b5a4fb
tools/contracts/test/integration/sbom-context.test.mjs sha256:e4688ff5950181420a9838585ae7fe8ccddc25cd327f6d1e82d5d7721a91e8d6
```
