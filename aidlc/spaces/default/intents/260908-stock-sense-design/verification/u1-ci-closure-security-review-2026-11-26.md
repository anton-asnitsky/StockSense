# Independent security and technical review: U1 CI closure plan

Verdict: no blocking planning findings in the reviewed closure plan. Conditional implementation readiness only; this review is not an implementation approval, finding disposition, ledger authorization, merge approval or claim of green U1.

Reviewed `u1-ci-closure-plan-2026-11-26.md`, SHA-256 `97d65b6e528e12b132baadcd735cd5a165cbc463fbdd548fdc31f322cb1a45fa`, the proposed authority-transition design, retained validator/Kiota scan review, current image-ledger/image-evidence implementation and actual GitHub U2 provenance. Independently checked the final latest-attempt race rejection, conditional provenance disclaimer, probe reference and pinned-command clarification. See `u1-u2-provenance-probe-2026-11-26.md` for independently observed API/log evidence. This review does not cover later unreviewed scope changes.

## Findings resolved at plan level

- Five unknown validator glibc findings remain disposition-ineligible. The plan requires actual runtime remediation and fresh assembled-image evidence. It explicitly stops if no compliant same-family runtime is available, preserving unknown rejection and requiring a new amendment for distribution/libc/tool/dependency strategy changes.
- All 34 Kiota rows require current applicability/remediation assessment. Scanner not-fixed and vendor Needs evaluation are insufficient. Residual eligible findings need distinct real owner decisions; plan approval and ledger publication do not grant blanket risk acceptance.
- The new PR ledger trust choice is explicit: reviewed candidate code interprets separate owner-authenticated immutable-ledger authorization, guarded by independently sourced exact-revision U2. It is not falsely described as a semantic verifier already deployed on protected main.
- PR eligibility is restricted to three named PRs, same repository, exact target/base and pull_request context. Seven-day maximum authorization lifetime and absolute 2026-12-10T23:59:59Z sunset prevent an indefinite alternate authority. Main/release reject PR authority.
- Exact ledger bytes, live owner identity/comments, complete bounded pagination, duplicate/conflict rejection, immutable hashes, whole-ledger validation, raw scans and independently recomputed SBOM/runtime bindings remain mandatory.
- The plan freezes final candidate revisions before asking for final U2/publication comments. Any later code change invalidates these bindings instead of transferring approval forward.

## Mandatory implementation review conditions

The real U2 probe found that old successful run/check nested PR head fields advance to new revisions. Only top-level run, exact-attempt job and check head identities can bind historical candidate execution; PR association is a separate identity check. The matcher must reject the observed old-success/new-nested-head pattern and races between rerun attempts.

Actual U2 checks execute default-main policy code while comparing the Bolt target base. Keep these identities separate. Pin and independently verify the reviewed trusted policy commit and workflow/script blobs. Run API metadata does not expose an authoritative workflow-source SHA. Existing checkout and successful policy-summary logs can support a narrow fail-closed matcher under the documented GitHub trusted-execution assumption; they are not a signed workflow-source attestation. Require exact retained grammar/identities and reject absent, ambiguous, truncated or inconsistent source evidence. If that assurance cannot be implemented robustly, stop instead of replacing it with a matching display name or silently changing U2.

Whole-ledger validation, unknown/fixed High-Critical refusal and context-specific receipt rejection must survive all implementation layers. Do not copy findings between independently bound runtime/execution baselines, or infer validator cleanliness from an updated image tag.

## Verification required before rollout

Run the plan's pinned tests, coverage, C01-C27 CLI, unchanged generated-consumer reproduction and two actual assembled-image proofs. Add meaningful adversarial tests for owner/repository substitution, stale revisions, mutable nested PR metadata, wrong or raced run attempts, spoofed app/workflow/check, missing trusted source evidence, altered ledger bytes, API truncation/failure, stale/edited/deleted/conflicting comments, expired unrelated ledger groups and main/release replay. Verify each final PR's ordinary U1/U2/Vulnerability checks and live revisions independently; diagnostic successes do not substitute.

Independent exact-runtime/code/artifact review is still required after implementation. Owner finding decisions and exact final GitHub comments remain external dependencies. A compliant runtime may not exist; the plan appropriately makes this a reported blocker rather than a promise of clean images. No tests were executed by this reviewer during this plan-only assessment, and no implementation or existing owner work was modified.
