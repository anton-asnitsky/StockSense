# U1 Contracts Code Generation Summary

This is an in-progress Construction record, not an implementation acceptance or release claim. The current Plan Approval verifies at fingerprint `sha256:6705bd49bc11e014c4698466da0958b3c3dcfd7612aaf0affff908e321eaef0f`: `approved`, `contractValid`, `fingerprintValid`, and `receiptValid` are all true. It permits the Node security remediation under the revised plan and test instructions. The newest checkpoint below supersedes earlier implementation snapshots retained as history; no record below accepts U1, releases C01, or authorizes a Bolt-to-main merge.

## 2026-10-29 patched Node candidate checkpoint (in progress)

Draft [PR #61](https://github.com/anton-asnitsky/StockSense/pull/61) is at head `4df61602acfa52ee722d9d5c828c7bbf44ca377c` against `main` `68bb426590ccd529ccdfcb2dfcaa8ea701ed46e9`. It fixes the SBOM path, pins Node 24.22.2 across validator, package and CI, preserves checksum-bound raw Grype and database-status diagnostics, and enforces the local 80% coverage floor. Its ledger-excluded candidate digest is `sha256:c77932d01cec9d9dbd57177504f8c4dc416affb63ab2c48bf635835f05907d34`. Hosted run `40849263065` built and scanned exact images: validator zero findings with Node 24.22.2 in its SBOM, Kiota one Medium MessagePack 2.5.302 finding. Vulnerability passed; U1 stopped at the old protected-main ledger binding and U2 rejected protected workflow edits. Draft PR #62, bound to the old digest, was closed unmerged. The full local unit suite passed 317 tests with two Windows skips; focused new tests, type check and lint passed. See `verification/u1-node-security-scan-2026-10-29.md` for image IDs, raw hashes and limits. A new finding-specific owner decision is pending; source-manifest, traceability, R-14–R-16 and independent final-source review remain open. No U1 READY or C01 release claim is made.

## 2026-10-27 merged Bolt source snapshot and local verification

PR #48 is merged into the U1 Bolt at `9885068ad4098c1a7a1999adb4dda86552383331`; protected `main` is `8a415cfd6dfc124edbd7b84c9b7e22553e3064a2`. The working AI-DLC checkout now mirrors all 181 declared U1 source paths from that Bolt, except the image-exception ledger, which matches protected `main`. A blob comparison found zero mismatches. The 95-ID traceability map has 50 `OK` and 45 `GAP` entries; all 45 explicitly named test files are in the source manifest. U2's three protected-base policy files remain outside the U1 manifest. The checkout mirror is uncommitted, so its two provenance-sensitive unit tests correctly reject it with `SOURCE_NOT_COMMITTED`. In a separate detached worktree at the committed Bolt head, lint and type-check passed and the complete unit command passed 299 tests with two skips and zero failures. The exact merged Bolt tree also passed hosted U1 and Vulnerability checks on PR #48. See `verification/u1-source-snapshot-2026-10-27.md` for the source and test boundary. R-14–R-16 and formal source-bound review remain open; candidate READY and C01 release are unclaimed.

## 2026-10-27 candidate SBOM and generation preparation

The committed Bolt assembled the 40-source C01–C27 package with 38 bound elements, 10 declared exemptions and zero fixture problems. The focused generation integration suite passed 14/14 tests for the three declared consumers and 107 output digests. PR #48's retained image inventories, scans and protected-main ledger receipt produced a local combined CycloneDX candidate SBOM with 3,078 components, SHA-256 `164da92aa3df6c79702425784bcd32bc9363362299c95cf8f99b33488ab4e51f`. All 432 pnpm components have hashes; 446 image/tool entries lack individual hashes but remain inventoried under exact image IDs and retained image-SBOM digests. The independent security read found one remaining Major R-15 provenance gap: no retained hosted attestation for this combined candidate SBOM. R-16 also lacks one machine-verified candidate record binding the current package, all generated outputs and scan/SBOM evidence, followed by a clean-consumer check. See `verification/u1-candidate-evidence-prep-2026-10-27.md`. The local preparation does not close R-14–R-16 or change the candidate/release boundary.

## 2026-10-27 US8.2 PR #44 merged into the U1 Bolt

The owner approved PR #44 head `62d5ab3` into Bolt `e7079f1`; the AI-DLC audit recorded `QUESTION_ANSWERED` at `2026-10-27T13:46:08Z`. The story merged as `8348810570612624149ff3fb03ac100611c46214`, with the approved Bolt and story heads as parents. The integrated Git tree exactly matches the passing hosted synthetic-merge tree `6809dd15356f794c99a30414519181a42cc04cb6`. The remote merged story branch was removed; `main` remained at `b85ed4b`. See `verification/u1-pr44-story-merge-2026-10-27.md` for the approval, checks, and ref proof. No separate Bolt push workflow was listed. R-14–R-16, the source/traceability reconciliation, U1 candidate READY, and C01 release remain open. Earlier PR #44 descriptions below are historical.

## 2026-10-27 US8.2 PR #44 hosted-green merge gate

The owner approved the exact PR #44 temporary MessagePack exception, then separately approved draft ledger PR #47 head `69e6a63` for a protected-main bootstrap. `aidlc engine log answer` recorded the latter as `QUESTION_ANSWERED` at `2026-10-27T13:25:39Z`. PR #47 passed hosted U1 and Vulnerability; U2 rejected its protected ledger edit as designed. Only U2 was temporarily removed from required checks, PR #47 squash-merged to `main` as `b85ed4bce359fa10345c13d74fbb92b92adcf1bd`, and U2 and its app binding were immediately restored. Strict PRs, admin enforcement, all three checks, and force-push/deletion blocks were verified. The `main` push release-evidence run `40512476123` and U1/Vulnerability run `40512476272` passed.

PR #44 remains draft at `62d5ab3a9761274a5b0753e7e5d6a9ad208e6113`, targeting U1 Bolt `e7079f1bf96a541c1b3e47ba72de905ba5547c88`. Its [hosted rerun attempt 2](https://github.com/anton-asnitsky/StockSense/actions/runs/40506044379/attempts/2) passed U1 and Vulnerability on the same synthetic merge and exact candidate-tree digest recorded below. The independent process review found no confirmed Blocking or Major inconsistency in the 17-file story change. The owner decision to merge PR #44 is pending in `pr44-merge-questions.md`; a story merge would not complete U1 READY, merge the Bolt to `main`, or release C01. R-14–R-16 and source/traceability reconciliation remain open. The prior checkpoint below records the earlier failed-hosted state and is historical.

## 2026-10-27 US8.2 PR #44 current-head checkpoint (in progress)

Draft [PR #44](https://github.com/anton-asnitsky/StockSense/pull/44) advanced to story head `62d5ab3a9761274a5b0753e7e5d6a9ad208e6113` with a focused correction: compatibility tests now use current U1 Bolt `e7079f1bf96a541c1b3e47ba72de905ba5547c88`, the canonical-kind test no longer claims unfinished fixture/release coverage, and the README states U4 owns import-message semantics while C23 provides shared transport conformance. The changed baseline/resource integration suites passed 15 tests with one image-dependent skip; the unit suite passed 290 with two Windows skips; baseline assessment reported 38 unchanged and two first-release documents; lint and type checks passed. A full local integration invocation without immutable image IDs passed 85, failed eight with image-pin errors, skipped five and retained one TODO; it does not establish complete integration success.

Hosted run `40506044379` checked synthetic merge `3fec410de7dc12ddbd6a24bc2c4cbfae3757e7fd` against the updated Bolt parent and independently confirmed candidate-tree digest `sha256:2d132afa596f7d4b861b640cfeadba53a4257cccefa4bf53349c716fe3bd113e`. The vulnerability job passed. U1 built and scanned both exact images but stopped before tests because protected `main` still holds the PR #45 row for a different candidate tree. Retained scans show zero validator findings and one Kiota Medium `GHSA-qhrr-8q5h-9q3h` in MessagePack 2.5.302, fixed in 2.5.303; both image package/version inventories match PR #45's retained scans (316 validator and 120 Kiota distinct entries). The Kiota Dockerfile, build script, fixed invocation and image-gate sources are unchanged from PR #45. An independent security review found no new Kiota reachability or control change, but requires a new exact-tree owner disposition. The owner approved the exact PR #44 temporary exception in `pr44-image-exception-questions.md`; the AI-DLC audit records `QUESTION_ANSWERED` at `2026-10-27T13:03:39Z`. This permits preparing a protected-main ledger PR only. PR #44 remains draft; R-14–R-16, U1 acceptance, and C01 release remain open.

## 2026-10-27 PR #45 U1 Bolt merge checkpoint

The owner explicitly approved [PR #45](https://github.com/anton-asnitsky/StockSense/pull/45) head `a113e050b91ae5bb94885086cf3ef207487fe8fb` into the U1 Bolt at `9c86ccb9aba07bf5a81b9770885bd452b5749363`. The answer is in `pr45-merge-questions.md`, and `aidlc engine log answer` emitted `QUESTION_ANSWERED` after the human reply. Before merge, the exact head/base remained mergeable and its `U1 contracts` and `Vulnerability scan` checks were successful. The PR was marked ready and squash-merged on 2026-10-27T12:20:51Z as `e7079f1bf96a541c1b3e47ba72de905ba5547c88`; the remote `bolt/u1-candidate-ready` ref independently resolved to that commit. Protected `main` still requires strict PRs, `Vulnerability scan`, `U1 contracts`, and `U2 protected-base PR policy`, with admin enforcement and force-push/deletion blocks. This is the shared Docker-context prerequisite only. Draft US8.2 [PR #44](https://github.com/anton-asnitsky/StockSense/pull/44) remains open with a failing prior U1 check against the old Bolt base; it requires fresh validation and any candidate-tree-specific image disposition. R-14–R-16 remain open, and no U1 acceptance or C01 release is claimed.

## 2026-10-26 US8.2 import-contract checkpoint (in progress)

Draft [PR #44](https://github.com/anton-asnitsky/StockSense/pull/44), head `20c9e27`, targets the U1 Bolt and adds the inventory-import requested/completed/failed messages, authoritative audit event, exact revision-bound examples, and current-base compatibility tests. The story branch also documents the assembled 40-source C01–C27 candidate and its separate release gate. Its preceding code-equivalent head passed 290 local unit tests with two existing skips, focused import and compatibility integration tests, lint, and type checks. Hosted run `40268696049` passed Vulnerability scan but stopped U1 before tests because the protected-main image exception belongs to another candidate tree. The validator-image build-context change was split into shared-prerequisite draft [PR #45](https://github.com/anton-asnitsky/StockSense/pull/45); its local pinned-image build passed and hosted run `40268537404` stopped at the same ledger binding. Neither hosted U1 success nor a new finding exception is inferred.

On 2026-10-27, the owner approved the exact Medium Kiota MessagePack finding exception for PR #45 candidate tree `sha256:24e8749221f6a08f4c22d50bd20bed3ca5f393174c7fb18ae5b4a28e6ddcfed8`, expiring 2026-11-25. The audit recorded `QUESTION_ANSWERED` at 08:41:14Z after the owner's human reply. Focused [PR #46](https://github.com/anton-asnitsky/StockSense/pull/46), head `be84acb`, replaced the old protected-main ledger binding with this one and included the exact audit receipt, answered question, and reconciled current/historical evidence records. Hosted run `40478512727` passed U1 contracts and Vulnerability scan on that head; U2 protected-base policy run `40478632183` rejected the ledger edit as designed. Independent process review resolved two Major record findings. The owner separately approved the exact bootstrap, recorded as `QUESTION_ANSWERED` in `pr46-bootstrap-questions.md`. PR #46 squash-merged to `main` as `dda480b6bb1e49859718a1ef70e9f77d85daa7e7`; only U2 was temporarily removed from required checks, then immediately restored. Strict required PRs, U1 and Vulnerability checks, admin enforcement, and blocked force pushes/deletion were verified after restoration. The `main` push `release-evidence` run `40487936170` and U1/Vulnerability run `40487936202` passed. PR #45's rerun (attempt 2 of `40268537404`) passed U1 and Vulnerability checks on its unchanged source head. Its retained `ledger-verification.json` binds candidate revision `ccc8d870f0ff1c5080b4e0fdfa21402d078b4a58`, the approved tree digest, protected `main` commit `dda480b`, and validator 0/0 plus Kiota 1/1 findings/dispositions. The rebuilt image IDs changed, but the two runs' Kiota package inventories matched exactly (120 distinct package/version entries) and validator inventories matched (316), with the same single finding. No PR #44 exception, PR #45 merge, or U1 acceptance is implied.

The AI-DLC root checkout and its 169-path source manifest remain at the earlier candidate. The 95-ID traceability ledger still describes inventory-import contracts as absent from that checkout. Reconcile those artifacts against the eventual integrated U1 source before requesting a source-bound READY review; until then, R-14 stays open. R-15 security disposition and R-16 complete consumer-output and candidate provenance evidence also remain open.

## 2026-10-16 review and failed-check merge-blocking checkpoint

The first independent review of this exact checkout recorded `NOT-READY`, with R-14 through R-16 and R-20 open. It resolved the earlier empty-source and omitted-manifest findings R-18/R-19 after checking all 169 claimed paths against protected `main`; C18 syntax R-17 remains resolved. The review appendix in `code-generation-plan.md` is the current formal finding record. After that receipt, BR6.2's traceability target was corrected to the enforcing U1 workflow; this post-review edit requires a new source-bound review before any gate. The 95-ID ledger now has 47 `OK` and 48 explicit `GAP` entries.

The non-draft [probe PR #21](https://github.com/anton-asnitsky/StockSense/pull/21) changed one workflow comment and was `BLOCKED` while the required U1 and base-owned U2 checks failed. Live `main` protection retained strict required checks, required PRs, admin enforcement, and blocked force pushes/deletion; squash merge was available. The owner-approved 2026-10-09 audit decision had already resolved U1's public-PR runner-isolation clause while leaving later deployment-runner state/backend matters with U2/U13. These facts support AC8.7.2 and AC8.7.3; NFR13.4 remains GAP for the complete released-revision trust path. Exact checks, heads, settings, and cleanup are in `verification/u1-required-check-block-2026-10-16.md`.

R-14 and R-16 still require U1-owned inventory-import messages, complete applicable compatibility and consumer-generation evidence, and truthful candidate-versus-release boundaries. Provider runtime and recovery proof require their owning units. The candidate is still `releaseReady: false`; no C01 release or U1 acceptance is claimed. C16's inception callback excerpt and U3's platform Operator grant invariant remain draft design corrections requiring formal reconciliation.

## Earlier 2026-10-16 merged-source and trusted-CI checkpoint (superseded)

Owner-approved [PR #17](https://github.com/anton-asnitsky/StockSense/pull/17) merged the U1 candidate and U2 trust controls to protected `main` as `581b70a1020e5ae36d631625a41392fddf30dbfb`. On that exact push, [U1 contracts and Vulnerability scan](https://github.com/anton-asnitsky/StockSense/actions/runs/38876246986) passed. The separate [release-evidence run](https://github.com/anton-asnitsky/StockSense/actions/runs/38876247058) built and validated a C01-C27 **candidate** bundle, built an SBOM, passed secret and vulnerability scans, attested both subjects, and uploaded them. A clean checkout downloaded the candidate and verified the signed package subject, signer workflow, `main` source ref and commit, and package contents. The verifier returned artifact digest `sha256:84c14ec8b593180b364fa9d21fb4e107d138561be587020ff4888f25c07a79e9`, 45 files and `releaseReady: false`. Full evidence is in `verification/u1-bootstrap-2026-10-16.md`.

The base-owned `U2 protected-base PR policy` check passed an ordinary docs-only [probe PR #19](https://github.com/anton-asnitsky/StockSense/pull/19) and rejected a `.github`-changing [probe PR #20](https://github.com/anton-asnitsky/StockSense/pull/20) for the expected protected-path reason. Both disposable PRs were closed without merging. `main` now requires that uniquely named check in addition to the restored `U1 contracts` and `Vulnerability scan` checks, with strict PR and admin protection retained.

The active AI-DLC checkout now has all 169 claimed U1 manifest paths plus the five U2 guard paths copied from that exact `main` tree in commit `7e0a779`. All 174 worktree byte hashes and staged Git blobs matched `origin/main` at import, with no local source edits. The U1 manifest has no duplicate or missing path on `main`. This repairs the old empty-checkout precondition for a **new** review request; it does not retroactively repair the 2026-10-13 review receipt or prove every manifest claim is correctly owned by U1.

The 95-ID traceability ledger and current source still need an independent final-source reconciliation. In particular, provider/runtime behavior remains separate from U1's candidate tooling; C16's inception callback excerpt and U3's platform Operator grant invariant are draft design corrections awaiting their own formal reconciliation. The old formal Code Generation review remains NOT-READY until a fresh review binds these exact source bytes, tests, artifacts, and remaining findings. No C01 release, U1 acceptance, or broader Construction gate is claimed.

## Earlier 2026-10-15 generator and message-model checkpoint (superseded)

Commit `a68e1b4` on `feat/u1-generator-resource-limits` is pushed as draft PR #12, stacked on PR #11. It enforces the 120-second/2 GiB generator envelope in network-disabled Linux containers, measures cgroup peak, cleans up timed-out containers, checks immutable images and Kiota's exact 1.35.0 package bytes, and normalizes host-dependent Kiota output before digest comparison. The source manifest now claims 160 paths, including the new bounded-runner unit test. Local lint, type-check, 242 unit passes (two Windows skips), 88 integration passes (two TODOs), 95.16% line coverage, and the full C01–C27 candidate package passed. Hosted PR #12 run `38763232211` passed `U1 contracts` and `Vulnerability scan`, including its clean pinned Kiota image build, unit, integration and coverage steps. Exact local measurements and the offline-image limitation are in `verification/u1-generation-2026-10-15.md`.

The owner selected pinned `@asyncapi/modelina` 5.10.1 for consumer-local TypeScript message models instead of the deferred AsyncAPI template/CLI generation entry point. The choice is recorded in Contracts Technology Stack Decisions and U2's CI/CD Pipeline Design; implementation and clean hosted proof remain open. `testing-posture verify --unit contracts` still reports `approved: true`, `fingerprintValid: true`, and `receiptValid: true`. U1 is not READY: base-owned public-PR policy, package-subject attestation and clean-consumer verification, non-OpenAPI compatibility, remaining traceability/source-bound review, and Modelina generation proof still require resolution.

## Earlier 2026-10-15 U1 execution checkpoint (superseded)

The AsyncAPI fixture change is committed as `7f2bfbb` on `feat/u1-asyncapi-fixtures` and pushed as draft PR #11, stacked on PR #10. It adds revision-bound positive and exact negative fixtures for all 12 channel messages across six canonical AsyncAPI documents. The complete C01-C27 candidate has 34 bound elements and 10 exempt documents, zero assembly problems and no uncovered boundaries. The final source-digest-matched local container validation passed after the worker gained a guard against deleting and re-digesting all AsyncAPI fixture pairs. The earlier full suites passed 236 unit tests (two Windows symlink skips), 87 integration tests (two existing TODOs), lint, type-check and 95.52% line coverage; the final guard's focused negative test, lint and type-check also passed. The local validator image was test-only because the official Dockerfile build could not download pinned pnpm through Corepack. Draft PR #11's official hosted `U1 contracts` and `Vulnerability scan` jobs passed in run `38749998101`. A fresh independent review and U1 acceptance remain outstanding. The 2 GiB generator-process bound is still not enforced.

The seven OpenAPI documents without bindable JSON responses have a revision-bound operation-profile regression at `f2cd9c5` on `feat/u1-exemption-evidence`, stacked as draft PR #10 on PR #9. It pins source digests, revisions, operations, parameters, statuses, and absent response media; a C04 operationId mutation must fail Redocly's exact rule. The targeted test passed 8/8 and local lint passed. PR #10's hosted `U1 contracts` and `Vulnerability scan` checks passed in run `38737673084`. `testing-posture verify --unit contracts` still reports `approved: true` and `receiptValid: true`. The declared TypeScript and .NET consumer generation suite passed 13/13 locally, including reproducible 104-file Kiota output and exact digest comparison. This does not prove the generator's 2 GiB memory bound or broader provider behavior.

A disposable full-catalogue candidate produced generation-profile source revision `77d429379c7b3a97c16338febcec1e2ae7c4ff93`; both declared consumers regenerated with exact output digests. TypeScript took 12,627 ms for one output and Kiota took 17,292 ms for 104 outputs, each below the pinned 120-second timeout. The runner does not yet enforce the 2 GiB process limit, so this remains partial Step 13 evidence. The measured result and limitation are in `verification/u1-generation-2026-10-15.md`.

The focused worktree assembles a candidate package from 38 canonical sources spanning C01-C27. Before the AsyncAPI patch, it bound 22 documents to revision-specific positive and negative fixtures, including two identity OpenAPI documents with inline JSON response schemas, while 16 documents were exempt. The nine-file fixture patch was committed as `39e226a`, followed by the CLI catalogue regression at `5b0e282` on `feat/u1-inline-response-fixtures`. Both were pushed to draft PR #9 against `main`. The former Bolt branch is already behind the merged U1 foundation on `main`; targeting it would reintroduce 219 files into the PR diff.

An independent quality review found that a response with required fields composed through `allOf` could previously gain the inline-fixture exemption. The patch now treats every inline JSON response schema as a fixture candidate: composed responses can bind a verified positive/negative pair, while an optional-only response fails package construction explicitly rather than gaining an exemption. The regression validates the composed pair and the fail-closed discovery rule. With the rebuilt local standards image `sha256:db03d90a189b1341e2c18e0ff5a03bff035764b7fe47a1332955852abe897117`, `package:full` passed with zero assembly problems, `test:unit` passed 229 tests with two Windows symlink skips, `test:integration` passed 76 tests with two TODOs, and lint and type-check passed. `test:coverage` passed at 95.69% line coverage, above the required 80% floor. The catalogue check measured 332 reference occurrences, a slowest validator run of 5,183 ms, and 149,118,976 bytes peak RSS. Local Node is 24.21.0 while the package pins 24.19.0. Hosted PR #9 run `38730251765` passed `U1 contracts` and `Vulnerability scan` for this patch; those checks do not by themselves close the broader U1 trust-path and provenance gaps.

The follow-up CLI regression validates the complete source-bound C01-C27 candidate through the public command and rejects a canonical edit even when its package digest is re-written. It passed as a targeted test and through the normal integration script, measuring 72-96 seconds end-to-end across local runs; the individual validator's 60-second and 2 GiB bounds remain unchanged. After registering the test in `package.json`, the official local Dockerfile rebuild could not download pinned pnpm from npm because Docker's network was unavailable. A test-only offline image layered the changed package script onto the previously verified image, with unchanged validator sources and lockfile; its exact ID is `sha256:f5d667f01f878fb1641cbb3e3247b57c43b37e841db31d35030dc0c7568b2fa0`. On that image, 229 unit tests passed (two Windows symlink skips), 78 integration tests passed (two existing TODOs), lint and type-check passed, and line coverage remained 95.69%. This local image does not establish release-build provenance. PR #9's hosted run `38733480446` passed both `U1 contracts` and `Vulnerability scan` at head `5b0e282`; the hosted U1 log confirms a normal pinned-image build, execution of the new CLI regression, and 95.67% line coverage across 311 tests. It does not establish a base-owned public-PR policy or release attestation.

`source-manifest.json` now claims 154 paths: the original U1 foundation inventory plus the CLI catalogue, exempt OpenAPI and AsyncAPI oracle tests. All 154 claimed files exist in the focused checkout, and all 37 test paths referenced by `package.json` are claimed. That local reconciliation addresses the known R-19 omissions but does not close R-18 or R-19 without a fresh source-bound formal review. The traceability map currently has 44 `OK` and 51 `GAP` IDs. The exact 10 exemptions are recorded in `verification/u1-fixture-exemptions-2026-10-15.md`: seven OpenAPI documents without bindable JSON responses (shape-tested) and three closed shared schemas. R-14 still needs applicable runtime behavior evidence and the enforced 2 GiB generator bound. R-15 still needs trusted PR-policy enforcement; a passing `pull_request` workflow is derived from the PR merge commit and cannot by itself prove a base-owned policy. R-16 still needs clean-consumer provenance and the remaining toolchain evidence. No implementation acceptance, release or merge is claimed.

The read-only R-15 check in `verification/u1-ci-trust-2026-10-15.md` confirmed that `main` requires both named checks, but the U1 policy job is not base-owned and PR #11's passing run omitted the policy step. The stacked PR target branches are unprotected. The R-16 check found that the current attestation subject is the lockfile-derived SBOM rather than the exact contract package, Kiota tests can skip when the tool is absent, and the AsyncAPI message generator template remains an explicitly deferred owner choice. Existing synthetic tests cannot stand in for a clean-consumer provenance run or non-OpenAPI compatibility proof.

## Ordered plan steps

| Step | Current state |
| --- | --- |
| 1-2: branch, runner, immutable loader | The U1 foundation on `main` includes the runnable contract package and loader; the newer integrated candidate is on the U1 Bolt at `9885068`. Final source-bound review remains open. |
| 3-4: preflight, protected content, validators, fixture oracle | The focused R-12 and R-13 checks found the bounded controls READY; the full-catalogue candidate passed hosted checks. Applicability to provider/runtime behavior remains for the new review. |
| 5 and 13: C01-C27 catalogue and fixtures | A full 27-boundary candidate package validates in hosted CI, including the merged inventory-import messages. The recorded fixture inventory and exemptions require fresh source-bound review; this is candidate evidence, not provider/runtime conformance or release. |
| 6 and 14: compatibility and toolchain | Pinned local generation and validation, the conservative approval rule for changed AsyncAPI/JSON Schema, hosted SBOM and attestations, and exact clean-consumer candidate verification have evidence. The review must assess their coverage and remaining runtime obligations. |
| 7-8 and 11: generation, protected content and release evidence | The merged source and hosted release-evidence workflow passed candidate checks; the verifier reported `releaseReady: false`. No C01 release or U1 acceptance is claimed. |
| 9 and 15-16: CI, traceability, review | Protected `main` requires U1, vulnerability, and base-owned U2 policy checks. Non-draft PR #21 proved a failed required check blocks merge. The current 95-ID ledger has 50 `OK` and 45 explicit `GAP` entries; a fresh source-bound review is required. |

## Earlier files and candidate scope (historical)

The implementation is in the focused worktree at D:/Git/StockSense/.aidlc/worktrees/contracts-governance-foundation on branch feat/contracts-governance-foundation. The 38-source catalogue expansion, governed C22/C23 profile candidates, C08 in-process validator and tests were pushed as 20dc934. The versioned boundary-source map and inventory builder followed as 6bd8eca, the owning-unit map as 1494bf3, and C22/C23 fixture candidates as 062b7df. Strict Ajv rejected the draft C01 package schema's conditional `minItems` fields; the array-type correction and regression test were pushed as 6ad2c03. The inventory now binds all 38 canonical sources to that revision and reports its own map digest. The separate C01/C22/C23 package candidate was validated and pushed as 42746a4. Git initially refused one object write, but a later write and staging retry succeeded without permission changes. This AI-DLC summary remains in the active lifecycle checkout. The source-manifest.json file lists the application paths. Full 27-boundary packaging and release evidence remain open.

The original walking-skeleton sample still declares candidate status, C01/C18 coverage and releaseReady false. Newly authored C02-C07 and C09 sources have not been inserted into it. C03's AsyncAPI source uses the specification's payload schemaFormat/schema object. The offline resolver now maps its C01 HTTPS schema identity to digest-checked packaged bytes in a temporary validation graph. The candidate CLI snapshots and rechecks that graph, then runs the pinned OpenAPI/AsyncAPI standards tools in a digest-addressed, local Linux container with no network, a 60-second wall limit, and a 2 GiB memory/swap limit. It fails closed without an exact image ID. A separate offline Ajv 2020 compilation pass confirms the payload uses the registered C01 bytes and rejects an invalid target. Real pinned AsyncAPI parser tests assert that the resolver reads the same declared C01 identity and digest. The walking-skeleton manifest's existing sourceRevision continues to bind only its unchanged sources from the prior commit.

The separate messaging-profiles candidate covers C01/C22/C23 only. Its manifest binds six canonical documents to 6ad2c03, declares the C22/C23 governed profile sidecars, and runs eight positive/negative envelope and messaging-profile fixtures. The pinned Docker validation and Git blob comparison pass with `sourceBinding: verified`, `releaseReady: false`, and 24 boundaries explicitly uncovered. Its generation profile records that consumer generation is unverified; no cross-language or provider-runtime conformance is claimed.

## Earlier verification (historical)

Local Node 24.21.0 and pnpm 11.25.0:

| Check | Current result |
| --- | --- |
| Exact `pnpm --dir tools/contracts test:unit` with system CA | 194 tests: 192 pass, 2 Windows symlink privilege skips, 0 fail. |
| Exact `pnpm --dir tools/contracts test:integration` | 56 tests: 54 pass, 0 fail, 0 skip, 2 TODO. Every container-backed test now executes: the Docker engine is running and the standards image is built from this tree. No test is skipped for a missing image. |
| Coverage (`test:coverage`, unit and integration) | 250 tests, 246 pass, 0 fail. 94.56% U1 lines, 85.31% branches, 92.06% functions; the 80% line floor remains enforced and was not lowered. |
| ESLint and TypeScript check | Pass |
| Targeted Secretlint scan | Pass |
| Lockfile and frozen install | Current lockfile passed pnpm's supply-chain verification with NODE_OPTIONS=--use-system-ca; a clean frozen install then completed using pnpm's temporary trustLockfile setting for this already verified lockfile and an engine-strict override for local Node 24.21.0 |
| Pinned oasdiff | Exact local Windows binary verified by published SHA-256; identical-spec and breaking-path integration tests pass |
| Pinned Kiota | Exact 1.35.0 restored from the checked-in tool manifest and exercised through the pinned runner: two clean workspaces produce byte-identical output, 104 C# files, tree digest `sha256:a12f3847`. Not wired into a consumer output manifest; see the deviations below. |
| Standards validation | The whole C01-C27 catalogue now validates: all 38 canonical sources pass the validator each one's own dialect selects (17 OpenAPI, 6 AsyncAPI with their payload pass, 12 JSON Schema, 3 closed dialects), measured under the retained bounds at 332 reference occurrences against the 1024 cap, slowest single document 7.0 s against the 60 s validator bound, peak RSS 151 MB against the 2 GiB process bound. The C01/C18 and C01/C22/C23 candidates both validate end to end with `sourceBinding: verified`. Full 27-boundary **packaging** - sidecars and revision-bound fixtures for every boundary - remains open; this is catalogue validation, not a release package. |
| Standards image | No image digest is pinned in this record. The image bakes in a copy of `tools/contracts/src`, the build is not bit-reproducible, and the runner refuses an image whose recorded tool-source digest does not match the tree (`STANDARDS_IMAGE_STALE`/`NFR6.2`), so every environment builds its own with `pnpm --dir tools/contracts build:standards-image`. |

The clean install first stalled while removing a partial prior virtual store. After clearing only this worktree's generated node_modules, the frozen install completed from the verified lockfile, and the post-upgrade local suite above passed. An initial pnpm-script check attempted online metadata refresh and failed certificate verification. With NODE_OPTIONS=--use-system-ca, the exact pnpm unit and integration scripts executed; direct invocation of installed local binaries produced the coverage, lint, type-check and Secretlint results. The pinned package engine version 24.19.0 has not been reproduced on this host; the temporary install overrides are not hosted CI evidence.

## Earlier traceability (historical)

The existing traceability map contains 95 upstream identifiers. The last reviewed baseline had 43 OK and 52 GAP. This checkpoint adds local source evidence but does not automatically upgrade any GAP without the required exact fixture, owner-runtime, CI, or release proof.

R-12's technical finding has focused independent READY review. All 38 present canonical sources enter package reference preflight with 1024-occurrence and 32-depth tests. The declared C01 HTTPS identities map to digest-checked graph bytes; pinned AsyncAPI resolver, containerized CLI and offline Ajv tests cover both tenant and global envelopes. The actual candidate CLI has no host standards-tool fallback. Preflight rejects fragment-only references whose nested `$id` changes the selected physical node. Canonical JSON Schema, AsyncAPI payload, and fixture Ajv compilation run against digest-checked snapshots inside the 60-second/2 GiB container profile; C07 typed-port, C08 in-process-port and governed-record YAML do not enter the JSON Schema fixture oracle. Step 10's remaining acceptance clause is now met: `tools/contracts/test/integration/catalogue-resource.test.mjs` validates all 38 canonical sources through their selected dialects and records 332 reference occurrences against the 1024 cap, a slowest single document of 7.0 s against the 60 s bound, and 151 MB peak RSS against the 2 GiB bound. Step 10 itself stays unchecked only because the approved plan files are byte-bound to the protected approval and no checklist mark may be made here. R-13's local source gates reject short and punctuation-only credential assignments, protected generated bytes and filenames before hashing, executable Deno/package manifests, undeclared or nested evidence fields, and caller-controlled diagnostic identifiers. Release publication remains unimplemented and fail-closed, so R-13 and Step 11 are not closed. R-14 is partly closed: full-catalogue validation and the supervised resource measurement now exist and pass. It remains open because the C01/C18 and C01/C22/C23 candidates still do not provide sidecars or revision-bound fixtures for all 27 boundaries. C16's registered `/signin-oidc` redirect and `/auth/callback` continuation now align in draft sources and U3's accepted functional design, but the inception C16 OpenAPI excerpt still needs formal reconciliation. R-15 remains open because the protected U2 required check, hosted CI and vulnerability disposition are absent. The 2026-10-05 lockfile audit recorded 47 advisories, including 26 High/Critical, in verification/u1-vulnerability-audit-2026-10-05.json. A 2026-10-07 scan fails with 55 advisories (4 low, 20 moderate, 25 high, 6 critical), every path tracing to the approved-plan pin `@asyncapi/cli`; the older inventory is historical and needs finding-specific refresh and an owner disposition. R-16 is partly closed: `openapi-diff` is gone, oasdiff 1.28.0 is pinned and exercised, and Kiota 1.35.0 now runs reproducibly through the pinned runner. It remains open because the SBOM generator, AsyncAPI template, runner/scanner versions and attestation action are unpinned pending the owning CI Design decision, and because the .NET client is not bound to a declared consumer output manifest. R-17's C18 comma-bearing flow descriptions were quoted without changing their values in the upstream design and canonical source; final U1 review has not closed it.

The C22/C23 fixture candidates now contain one positive and one exact required-field negative for each canonical schema. The local fixture oracle binds the expected finding code, rule, element and revision; the generated file is reproducible from the governed profile candidates. This is four schema examples, not cross-language or provider-runtime conformance evidence.

## Earlier independent architecture review (historical)

The latest formal U1 review remains NOT-READY. Focused independent R-12 and R-13 source-gate reviews on 2026-10-05 found no remaining Major technical gap in those bounded controls and marked them READY. The 2026-10-06 independent architecture review found the expanded sources READY for a draft-source checkpoint with no new Major inconsistency. It kept two existing Major items open: C16's approved inception excerpt still lacks the registered OIDC callback paths now present in the draft source and U3 design, and U3's platform-Operator grant entity rules still need a one-active-grant and monotonic-version invariant. These bounded reviews are not U1 acceptance or a gate decision; the full-catalogue resource proof, publication and other findings remain open.

## Earlier next-work list (historical)

Use the source-bound inventory as package-assembly input. Build the full C01-C27 package with required C22/C23 governed sidecars and exact positive/negative fixtures. Reconcile C16's inception excerpt and the U3 grant invariant, complete full-catalogue resource proof, toolchain and hosted CI evidence with U2, update traceability, then request a fresh independent architecture and AI-DLC process review. Do not merge or claim U1 acceptance while the open findings remain.

## 2026-10-06 U1 execution checkpoint

The walking-skeleton C01/C18 package now carries six C18 request-body examples: three passing and three exact negative fixtures for manual review, reconciliation and assistant turns. `tools/contracts/src/policy.mjs` resolves each OpenAPI component through the declared `documentRevisionId`, checks local component references, and rejects an absent revision, missing element, remote reference or unrelated expected finding. The source fixture file is reusable by `tools/contracts/scripts/create-sample.mjs`, which rejects a stale C18 revision before refreshing the sample sidecar digest. `tools/contracts/test/unit/policy.test.mjs`, `tools/contracts/test/unit/container-fixture-oracle.test.mjs` and `tools/contracts/test/integration/cli.package.test.mjs` exercise this path. C18 CSRF, idempotency, dashboard, SSE, audit and runtime behavior still lack full evidence, so NFR8.11 remains `GAP`.

The unit command passes (191 tests, 189 pass, 2 Windows symlink skips) and the integration command passes with every container-backed test executing (56 tests, 54 pass, 0 fail, 0 skip, 2 TODO). Combined coverage is 94.53% lines, 85.23% branches, 92.06% functions over 247 tests. The full-catalogue supervised run now exists: 38 canonical sources, 332 reference occurrences, slowest document 7.0 s, peak RSS 151 MB, all inside the retained bounds. ESLint, TypeScript and Secretlint pass. The vulnerability scan still fails with 55 advisories, 31 of them High or Critical; no exception or upgrade disposition was invented.

The changed application paths are listed exactly in `source-manifest.json`, now 130 entries after adding `contracts/fixtures/common/v1/example-fixture.json`, `tools/contracts/src/source-digest.mjs` and `tools/contracts/scripts/build-standards-image.mjs`; the recorded set is set-equal to the branch diff against the Bolt base. `traceability.json` still has 43 `OK` and 52 `GAP` entries; stale claims that the draft C01-C27 and C22-C27 sources or C18 examples were absent have been corrected without upgrading unsupported outcomes. The approved plan and unit-test instructions remain byte-for-byte unchanged to preserve the protected approval fingerprint. Step 12 has quote-only repair, parser/lint/bundle checks and focused independent review evidence, ready for final reviewer confirmation before a checklist change. Steps 10-11 and 13-16 are still incomplete. R-14 needs the complete package and exact fixtures, R-15 needs U2's independently protected hosted check and vulnerability disposition, and R-16 needs the remaining approved toolchain and clean-consumer provenance runs. Targeted local oasdiff compatibility tests passed 3/3 and TypeScript generation tests passed 10/10. Kiota 1.35.0 is now restored and generates a reproducible 104-file C# client through the pinned runner, proven by two clean workspaces; it is not credited as consumer-local drift evidence because it is not bound to a declared output manifest. All 130 source-manifest paths exist in the focused worktree. AC8.7.1 and the U2 hosted check remain `GAP`; no U1 acceptance or release claim is made.

## Defects found by running the container for the first time

Every container-backed check had been unexercised until the Docker engine and a
matching standards image were both available. Running them surfaced five
defects that no local run could have shown, four of them in work that had
already passed review.

- **A stale standards image silently answers for an older tool.** The image
  bakes in a copy of `tools/contracts/src`, so the oracle inside it is the
  oracle as of the build. The image on the development host was two days old,
  had no `documentRevisionId` support, and rejected a valid package for a
  feature it did not have; an equally old image would have passed a package the
  current rules reject, and the run would have looked identical. The build now
  records a tool-source digest into the image and the runner reads it back out
  and refuses a mismatch with `STANDARDS_IMAGE_STALE`. Because the build is not
  bit-reproducible, the stable identity is that digest, not the image ID: no
  image ID can be committed and every environment builds its own with
  `pnpm --dir tools/contracts build:standards-image`.
- **One closed dialect failed every schema in the package.** The container's
  shared Ajv registry was built from every entry declared `artifactKind:
  schema`, which includes C07's typed port, C08's in-process port and the
  C05/C09 governed record - inventory-correct, but not JSON Schema. Compiling
  one failed the shared registry, so a single such document failed *all* schema
  and AsyncAPI-payload validation rather than only its own. No sample package
  contains a typed port, so only the full catalogue reached it.
- **One uncompilable source had the same whole-package effect.**
  `demo-evidence/v1/evidence-manifest.shared-schema.yaml` did not compile under
  the pinned strict validator. `cpuLimit` and `memoryLimitGiB` declared
  `maximum` with no `type`, so a string value bypassed the limit entirely - a
  real defect, not a notation preference. Its `allOf`, `if`, `then` and `else`
  branches used `properties` without `type: object`; the parent already
  declares it, so stating it changes nothing. Recorded as a repair, not an
  approval: no Contract Design disposition was sought, so C01-C27 source
  approval stays `GAP` exactly as Step 12 requires for the C18 repair.
- **Provenance ran after the containers.** A fixture binds its target by a
  revision derived from the document digest, so tampering a canonical document
  breaks that binding and the fixture oracle spoke first: a drifted C18
  document was rejected as `STANDARDS_VALIDATION`, saying nothing about
  provenance, and the test written to prove the source-revision binding was
  asserting a verdict it could never reach. Provenance is now verified before
  any container runs, which also means no validator ever runs over bytes the
  package has not yet shown it is entitled to ship.
- **The messaging-sample test asserted a stale fixture inventory.** It expected
  eight fixture outcomes after the C01 package-manifest pair took the sidecar
  to ten. It is skipped without the image, so it passed locally and would have
  failed the first hosted run.

## What a hosted run still needs

`assertCiPolicy` - the policy this unit defines - refuses a pull request that
changes `.github/workflows` with `CI_WORKFLOW_CHANGE`/`BR6.7`, because the
protected base workflow must already exist to judge its own introduction.
Authoring that workflow is therefore U2's unit and the owner's decision, not
something this branch can self-certify. What U1 owes it is in place: the build
script that produces the exact image ID a job must pass as
`STOCKSENSE_STANDARDS_IMAGE`, and `assertCiPolicy` itself to judge the workflow
once it exists. AC8.7.1 and AC8.7.2-AC8.7.3 stay `GAP` until a hosted run is
recorded.

## Owner decisions this record does not make

1. Disposition for the 55 vulnerability advisories, 31 High or Critical, all
   tracing to the approved-plan pin `@asyncapi/cli`.
2. Whether U2 authors the protected workflow, and whether hosted CI minutes are
   authorized.
3. Contract Design disposition for two canonical-source repairs: the C18
   quoting repair (R-17) and the demo-evidence strict-mode repair above.
4. The SBOM generator, AsyncAPI template, runner/scanner versions and
   attestation action, which Step 14 assigns to the owning CI Design decision.

## Owner decisions of 2026-10-08 and what they changed

All four were recorded through the engine as `DECISION_RECORDED` against this
stage; none of them is inferred.

**The AsyncAPI validator pin was upgraded, not excused.** 6.0.2 to 6.2.0,
inside the approved major line. 6.2.0 drops `@asyncapi/studio`, the only
reason Next.js was in the tree. Advisories fall **55 to 12** and
High-or-Critical **31 to 8**; both Next.js unauthenticated-RCE criticals are
gone, with the `tar` decompression DoS and one `simple-git` critical. All 38
canonical sources still validate under the upgraded validator, so the change
is behaviour-preserving here. The 12 survivors all arrive through
`@asyncapi/generator`, `@asyncapi/modelina-cli` or `@asyncapi/converter` -
the generate and convert subcommands - while this project invokes only
`validate`, in a container with no network, a read-only filesystem, no
secrets and a dropped capability set. That is an exposure argument and not a
disposition: the gate still fails, `scan:vuln` still exits 1, and BR6.2 still
blocks.

**The upgrade exposed a gap in the stale-image guard.** The digest covered the
tool sources but not the dependency manifests, yet the pinned validators live
in the image's `node_modules` - so changing the pin swapped the validator
inside the image while the digest stayed identical. A stale image would have
been accepted for precisely the change most in need of a rebuild.
`package.json` and `pnpm-lock.yaml` now count, and
`test/unit/source-digest.test.mjs` pins the whole behaviour.

**U2's required check is drafted and policy-verified, not merged.**
`.github/workflows/contracts-required.yml` on `feat/us8-7-trusted-hosted-ci`,
checked against U1's own `assertCiPolicy`: accepted on an ordinary pull
request, and the policy refuses `pull_request_target`, a self-hosted runner on
an untrusted trigger, a write permission, and a pull request editing the
workflow. Two read-only jobs, every action pinned to a 40-character commit,
each building its own standards image, with the 80% line floor enforced rather
than reported. Attestation is deliberately absent: it needs `id-token: write`,
which the policy rejects while `pull_request` is a trigger, so build
provenance belongs in a separate push-only release workflow. Branch protection
and the required-check selection are repository settings and remain the
owner's. AC8.7.1-AC8.7.3 stay `GAP` because no hosted run is recorded.

**Both source repairs are dispositioned, and the upstream pass is done.** The
C18 repair is quoting-only; the demo-evidence repair adds type declarations, of
which `cpuLimit` and `memoryLimitGiB` are a genuine tightening the owner
accepts as the intended meaning. The approved contract summary had **34**
broken flow mappings, now corrected by
`tools/contracts/scripts/repair-flow-descriptions.mjs` as a standalone commit.
**Correction:** the figure reported earlier in this record as "roughly
thirty-five", then revised upward to fifty-seven, is 34. The fifty-seven came
from a text pattern that also matched block-style scalars, where a comma is
legal and nothing is wrong; the original estimate was right. NFR8.17 stays
`GAP` on a different clause - it also requires example and compatibility
checks for every OpenAPI document, and only C18 carries fixtures.

**Only what the required check needs is pinned.** secretlint 13.0.6 and
`pnpm audit` stay as the secret-scan and vulnerability-scan gates.
`actions/attest-build-provenance` is identified and SHA-pinned for the future
release workflow. The SBOM generator and the AsyncAPI template stay unpinned
and their gates stay `unavailable` with reasons, which is better evidence than
a tool pinned on faith and never exercised.

## The first hosted run, and what it settles

`main` is at `1820225`, the squash of pull request 4. The run on that protected
base reports **`U1 contracts` green**; `Vulnerability scan` fails, by design,
and is deliberately not a required context.

Hosted evidence on Linux: unit **194 of 194** with nothing skipped, integration
**56 tests, 53 passing, 0 failing**, one skip for the absent .NET tool, and
coverage over 250 tests with 247 passing. The whole C01-C27 catalogue validates
through the pinned validators at 332 reference occurrences against the 1024
cap, a slowest single document of 6.4 s against the 60 s bound and 192 MB peak
RSS against the 2 GiB bound. oasdiff 1.28.0 was fetched and verified against
its published SHA-256 for `linux-x64`, and both compatibility tests passed.

Three rounds were needed, and each failure was a real defect that no run on the
development host could have shown:

1. The pull-request branch was two commits stale, so the required check audited
   AsyncAPI CLI 6.0.2 and its 55 advisories instead of 6.2.0 and its 12, and the
   source-digest tests did not exist to run.
2. Provenance cannot resolve its recorded commit under a shallow clone, so the
   source-revision binding failed outright until the checkout fetched full
   history.
3. The standards container could not traverse its own bind mounts on Linux:
   `mkdtemp` creates 0700 owned by the invoking user while the container runs as
   a fixed non-root uid. A Docker Desktop mount reports permissive modes and hid
   this entirely, which is why 56 integration tests passed here and 12 failed on
   a runner.

**`AC8.7.1` moves to `OK`.** Its criterion is that hosted PR CI reports
applicable build, test, contract and security results, and it now does. The
target names `.github/workflows/contracts-required.yml`, which is tracked on
the trunk rather than in this unit's worktree, because that is where the
evidence legitimately lives.

Three related identifiers stay `GAP`, each for a reason the hosted run does not
touch:

- **`AC8.7.2`** also requires branch safeguards verified under SS-01, and a
  formally evaluated and recorded merge readiness against a failed required
  check. A red check did leave pull request 4 unmergeable through two runs, but
  that was never recorded as an evaluation.
- **`AC8.7.3`** requires that OQ8 resolve runner isolation. OQ8 is open and
  scheduled for Bolt 2 under U2/U13, to define trusted-runner and state/backend
  controls before CI deployment. A synthetic workflow-changing pull request has
  also not been exercised against the protected base.
- **`NFR11.3`** requires regenerating *all* required outputs and recording
  source, configuration and output digests as evidence. The pinned Kiota
  generation skipped on the runner because the .NET tool is absent, and no
  evidence record is produced while release evidence is unimplemented.

Traceability is now **44 `OK` and 51 `GAP`** of 95. No U1 acceptance is claimed.
