# U1 Contracts Code Generation Plan

Unit: `contracts` (spec). Scope: canonical contract sources and a reproducible governance CLI for the initial StockSense build. This is a shared cross-story prerequisite; implement on a focused child branch from the Bolt integration branch under `CONTRIBUTING.md`. Application sources live under `contracts/` and `tools/contracts/`, never in this AI-DLC record directory.

## Delivery boundary and dependencies

U1 owns contract syntax, examples, compatibility, packaging, generated-client inputs, and security evidence. It does not implement runtime authentication, RabbitMQ mechanics, business state, database access, Kubernetes resources, or provider-side effects. The initial package may be marked as an explicitly incomplete walking-skeleton candidate. Full release remains blocked until all C01-C27 canonical boundaries and required owner evidence are present. No fixture-only or schema-only result can be called full runtime conformance.

Two reviewed NFR Design findings must be handled before a release claim. R-02 is a U1 implementation requirement: reject protected supplier source content, full prompts, hidden reasoning, credentials, and other prohibited content in canonical inputs, examples, generated output, manifests, and evidence, using synthetic placeholders and negative fixtures. R-01 requires a protected required check whose policy comes from the trusted base revision and does not execute PR-controlled workflow code; U1 supplies policy/negative fixtures while U2 CI owns branch-protection and workflow enforcement. The current U1 design review records both as Major and open; the code review and later design gate must show their resolution or disclose the remaining gap. No locally self-attested PR job can count as proof of isolation.

Proposed U1 implementation uses Node.js modules and the already approved Redocly, AsyncAPI, Ajv, oasdiff, Kiota, and `openapi-typescript` tools at the exact NFR Requirements pins. `pnpm-lock.yaml` and `package.json` pin all additional test and validation dependencies. CI Design must pin and verify the runtime, runner image, scanners, SBOM format/tool, attestation action, and AsyncAPI template before any implementation acceptance claim. Do not replace an approved validator or generator without a reviewed decision.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run",
  "scope": "classic",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "project",
      "text": "Prioritize inventory conservation, idempotency, concurrent approval, stale\nrecommendations, pack sizes, minimum orders, temporal leakage, model baselines,\nagent tool boundaries, recovery and rollback. Use focused tests for material\nbehavior. Do not claim model improvement before measuring it."
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:8b7876f86a507a9407a6b8173d380eceee23863e028e65f1da5f0f2937569097",
  "contract_sha256": "sha256:e36cd685382e2c5f5742ca1ccf6fd71475f191e30c58bc27eb30ea803e969c32"
}
```

For this spec unit, data-model/database, repository, HTTP endpoint and frontend layers are inapplicable. Use the contract's `test-after` ordering for each applicable parser, policy, compatibility, generation and evidence component: implement it, then write and run its unit tests. Prepare the runner before the first test. Standard strategy requires five to eight substantive unit tests per component, plus integration tests for the package-loader, CLI, generation and release-verification boundaries. The rendered `scope_floor` entry saying no extra **new-test** floor concerns test volume; it does not waive the org rule retained in `applicable_notes`: classic scope requires **at least 80% line coverage and CI execution before merge**. Both are mandatory acceptance conditions. Do not weaken an NFR limit or test threshold to obtain a pass.

## Ordered implementation steps

- [ ] **Step 1 — Focused work branch and runnable test runner.** Preserve the current dirty AI-DLC workspace. Establish a focused U1 shared-prerequisite branch from the Bolt integration base without sweeping unrelated changes. Create the `tools/contracts/` package layout, exact package-manager lockfile, `package.json` test scripts, and `test/config.mjs` for Node's built-in test runner. Verify the unit-scoped `pnpm --dir tools/contracts test:unit` command before implementing the first component. **Trace:** US8.2, US8.7; NFR11.2-NFR11.3.
- [ ] **Step 2 — C01 package model and immutable loader.** Implement manifest and sidecar loading, safe relative path and symlink handling, required-kind/path inventory, one semantic owner, logical/revision ID derivation, digest verification, detached receipt/registry identities, and independent C01 `1.x.x` versus canonical semantic versions. Add a sample walking-skeleton package with explicit incomplete coverage, never a false release-ready package. Write/run five to eight `package-loader` unit tests and package fixture integration tests immediately afterward. **Trace:** US8.2/AC8.2.4; BR1.1-BR1.7; NFR3.1, NFR8.15-NFR8.16.
- [ ] **Step 3 — Untrusted-input preflight and protected-content gate.** Enforce approved 1 MiB/source, 32 MiB/package, 128-reference, depth-32, 60/120-second, 2 GiB/process, 200-diagnostic limits; allow only vendored or pinned allowlisted references; disable arbitrary hooks; sanitize findings. Reject prohibited credential, supplier, prompt and hidden-reasoning content from both sources and generated/release artifacts; fixtures use documented synthetic placeholders. Write/run five to eight budget/content-policy tests plus attack fixtures (path traversal, symlink escape, recursive reference, oversized input, malicious annotation, protected text). **Trace:** US8.2, US8.7; BR2.1-BR2.3, BR6.1-BR6.7; NFR6.1-NFR6.2, NFR10.1, NFR13.1. Resolves NFR Design R-02 if evidence passes.
- [ ] **Step 4 — Pinned validators and exact fixture oracle.** Dispatch OpenAPI 3.1.2, AsyncAPI 3.0.0, JSON Schema 2020-12, typed-port and governed-record content to the correct pinned validator before parsing. Fix the C07 path to `typed-port:1`; reject conflicting or fallback dialects. Require every positive example to pass and every negative example to fail for its declared code, rule, immutable revision and element. Write/run five to eight validator tests plus CLI integration fixtures. **Trace:** US8.2/AC8.2.4; BR2.1-BR2.9; NFR8.4-NFR8.7, NFR8.13-NFR8.14.
- [ ] **Step 5 — Canonical contract catalogue and policy fixtures.** Add versioned C01-C27 OpenAPI, AsyncAPI, shared-schema/typed-port, governed-record, and example inputs from the approved Contract Design, organized by semantic owner. Include closed tenant and retailerless-global C15 envelopes; C18 same-origin BFF/CSRF/idempotency and typed dashboard/operation/SSE/audit surfaces; C19 six outcomes and U13 ownership; U5/U6/U7 heavy-work evidence; C10/C13 product coverage; C22-C27 messaging/recovery. A walking-skeleton subset remains labeled incomplete until the full catalogue and owner-local conformance evidence exist. Write/run five to eight policy tests per validator/policy component and boundary-specific positive/negative fixture integration tests. **Trace:** US8.2/AC8.2.4, US8.5/AC8.5.4, US9.11, US10.2/AC10.2.5-AC10.2.6; BR2.4-BR2.9, BR5.1-BR5.10; NFR3.1, NFR5.1, NFR7.2-NFR7.4, NFR8.11, NFR15.5.
- [ ] **Step 6 — Immutable compatibility checks.** Select the exact Git integration baseline, bind candidate and same-kind predecessor revisions or an explicit first-release absence reason, require approval/predecessor mapping/overlap for a breaking identity, and reject C01 package-major `2.x.x`. Use pinned oasdiff for OpenAPI and equivalent approved AsyncAPI/schema policies. Write/run five to eight compatibility tests and branch/Bolt/release baseline integration fixtures. **Trace:** US8.2, US8.7; BR4.1-BR4.4; NFR8.8, NFR8.12.
- [ ] **Step 7 — Consumer-local regeneration and drift.** Run Kiota, `openapi-typescript`, and approved AsyncAPI templates in disposable clean directories from locked inputs; record generator, source, configuration and output digests. Compare generated files with each consumer's declared output manifest without creating a shared runtime dependency. Write/run five to eight generation tests and clean-room drift integration tests. **Trace:** US8.2, US8.7; BR3.1-BR3.3; NFR8.9-NFR8.11, NFR11.3.
- [ ] **Step 8 — Evidence, release integrity and trust-path checks.** Emit a revision-bound validation result and detached receipt with C19's six outcomes and separate finding-specific expiring exceptions. Add secret/SBOM/vulnerability gate interfaces, SHA-256 manifest construction, attestation subject/identity verification, and clean-consumer verification. Add U1's CI-policy fixture that rejects public-PR runner/permission/hook violations and a synthetic PR changing workflow configuration; U2 must enforce that policy from a protected base workflow/required check before it can be credited. Write/run five to eight evidence tests and integration tests for missing scan, expired exception, digest mismatch, forged subject, protected-content leak, and a changed PR workflow. **Trace:** US8.7, US10.2/AC10.2.5-AC10.2.6; BR6.1-BR6.7; NFR13.2-NFR13.5, NFR15.1-NFR15.5. R-01 remains an explicit U2 enforcement dependency until verified.
- [ ] **Step 9 — Reproducible validation, documentation and traceability.** Document local setup and exact commands without owner credentials or GPU. Run clean installation, unit and integration tests, contract validation, generation drift, security fixtures and applicable linters. Enforce at least 80% U1 line coverage and run the selected tests in CI before merge; a missing CI run or lower coverage blocks acceptance. Capture source, tool/configuration/output digests and truthful limitations. Create U1 `source-manifest.json`, `code-summary.md` and element-level `traceability.json` mapping every assigned AC, detailed NFR and BR to existing source/test paths; disclose any GAP rather than inventing completion. **Trace:** all U1 stories (US8.2, US8.5, US8.7, US9.11, US10.2); AC8.2.4, AC8.5.4, AC10.2.5-AC10.2.6; BR1.1-BR6.7; all U1 detailed NFRs.

## Acceptance boundary

The unit can claim a passing contract-governance implementation only when every applicable check executes, the sample package truthfully reports its boundary coverage, protected content is rejected, tests and sensors pass, and all mapped source paths exist. All deferred runtime, runner, scanner, SBOM, attestation and generator-template pins and required CI checks must be finalized and verified before any implementation acceptance claim, as required by NFR Design. Until then, local results are partial development evidence only; implementation acceptance, release/package provenance and public-PR isolation remain blocked, including on U2's independently anchored required check. No step creates live supplier orders or provisions cloud resources.

## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-02T15:19:07Z
**Iteration:** 1

Advisory pass. These findings go to the human at the approval gate; no fix-and-re-review loop follows. The implementation itself is substantially stronger than the record that describes it: every Major below is an unenforced invariant or an over-stated claim, not broken logic.

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | tools/contracts/src/validate.mjs > validateCandidate source-binding block | `verifySourceBinding` receives `loaded.entries.filter(entry => entry.artifactKind === 'schema')`, so only schema-kind documents are compared against their Git blobs. The C18 OpenAPI document in the candidate package is never byte-verified against the recorded `sourceRevision`, yet `contracts/README.md` states that "every shipped canonical document is compared against the blob at the recorded revision" and `code-summary.md` records the Bolt 1 row as "verified against real blobs". BR1.1 requires a source-revision mismatch on *any* declared artifact to fail the package. The bytes happen to match at `8b2970fe` today, so this is a latent hole rather than a live defect. | Extend the binding to every canonical kind (openapi, asyncapi, schema), or narrow both record claims to schema-kind documents and record the remainder as a disclosed limitation. | Unresolved |
| R-02 | Major | tools/contracts/src/package-loader.mjs > ContractError ruleId arguments | The `ruleId` attached to loader findings does not name the rule the check implements: `DIGEST_MISMATCH` emits BR1.6, `UNLISTED_FILE`/`SYMLINK`/`UNSAFE_PATH` emit BR1.5, `DUPLICATE_PATH` emits BR1.2, `REQUIRED_KIND`/`REQUIRED_PATH`/`REQUIRED_SIDECAR` emit BR1.4, and `BOUNDARY_INVENTORY`/`INCOMPLETE_RELEASE` emit BR1.3. rules.md assigns duplication, unlisted files, symlinks, boundary escape, digest mismatch, missing kinds/sidecars and incomplete release to BR1.1, and duplicate `logicalId` to BR1.6. BR6.4 makes `ruleIds` the evidence spine and BR2.3 makes `ruleId` half the negative-fixture oracle, so a mislabelled finding binds evidence to the wrong rule. | Re-map each ContractError `ruleId` to the rule whose `logic` the check implements, or publish an explicit mapping table that justifies every deviation. | Unresolved |
| R-03 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/construction/contracts/code-generation/traceability.json > NFR11.3 | NFR11.3 is `OK` against `tools/contracts/package.json`, but security-requirements.md NFR11.3 requires a reviewer to reproduce validation and generation "from a clean checkout" through "a clean hosted run", and its violation clause states that "cached local success or fixture-only evidence cannot substitute". `code-summary.md` Step 9 records "clean-room install and CI run absent". The record contradicts itself on this identifier. | Set NFR11.3 to `GAP` with the clean-checkout/CI reason, or produce the clean-room run the requirement defines. | Unresolved |
| R-04 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/construction/contracts/code-generation/traceability.json > NFR8.11; tools/contracts/src/policy.mjs > runFixtureOracle | NFR8.11 is `OK` against `contracts/source/web-bff/v1/browser-api.openapi.yaml`, but NFR8.11's verification clause requires fixtures covering CSRF bootstrap and rotation, missing/forged/stale CSRF, missing/reused/changed-payload idempotency, complete/partial/unavailable dashboards, operation reconciliation, SSE resume and snapshot, bounded audit queries and oversized responses. `example-fixture.json` carries four fixtures, all `boundaryIds: ["C01"]`, none for C18. `runFixtureOracle` builds its target map only from `artifactKind === 'schema'` entries and always binds `schemaRevisionId`, so an OpenAPI-targeted fixture cannot resolve at all and would fail `FIXTURE_TARGET`. C18 is validated syntactically; none of its NFR8.11 behaviour is exercised, and the oracle currently cannot exercise it. | Reduce NFR8.11 to `GAP`, and teach `runFixtureOracle` to bind `documentRevisionId` for openapi/asyncapi targets before any C18 fixture claim is made. | Unresolved |
| R-05 | Major | tools/contracts/src/preflight.mjs > LIMITS; tools/contracts/src/cli.mjs | Three limits that plan Step 3 names as enforced are declared and unused. `LIMITS.validatorMs` (60 s) is referenced nowhere — `validators.mjs` `runPinnedTool` hardcodes `timeout: 120_000`, the generator budget — and `LIMITS.processBytes` (2 GiB) is referenced nowhere. `sanitizeFinding` and `limitFindings` are exported and unit-tested but called from no production path, so `cli.mjs` emits only `{code, ruleId, message}` while NFR10.1 requires published diagnostics to retain "rule ID, relative artifact path, bounded location, severity, and remediation summary". NFR10.1 is nonetheless `OK` against preflight.mjs. | Enforce the validator timeout and the process-memory budget, route CLI output through `limitFindings`, or narrow the NFR10.1 claim to the implemented subset and record the rest as GAP. | Unresolved |
| R-06 | Minor | contracts/README.md | The shipped README is stale at HEAD `7068995`. It states that the sample "covers only C01", that it "exercises JSON Schema validation, but not an OpenAPI or AsyncAPI document", and that it "does not prove compatibility, generation, scan, attestation or provider conformance evidence". The manifest's `boundaryCoverage` now carries C01 and C18, redocly validates the C18 document inside `validateCandidate`, and `test/integration/generation.test.mjs` proves reproducible generation with drift detection. | Refresh the README for the C01+C18 scope, the OpenAPI validation now inside the pipeline, and the one verified generation consumer. | Unresolved |
| R-07 | Minor | aidlc/spaces/default/intents/260908-stock-sense-design/construction/contracts/code-generation/code-summary.md > Files; > Bolt 1 Definition-of-Done | Two gate-facing numbers are wrong. "Thirty-five paths, enumerated in `source-manifest.json`" against a manifest of 46 entries, and "bound to `cda7f793`" against `manifest.json` `sourceRevision: 8b2970febd48723afa1e9da3040287fd3cd368ee` (`cda7f793` is an earlier commit on the same branch). | Correct the count to 46 and the revision to `8b2970fe`. | Unresolved |
| R-08 | Minor | contracts/source/web-bff/v1/browser-api.openapi.yaml against aidlc/spaces/default/intents/260908-stock-sense-design/inception/contract-design/contract-summary.md > C18 | The transcription is faithful: byte-identical to the approved YAML block except that 15 `description` scalars gained quotes, and the quoting is a necessary repair, because an unquoted description containing commas inside a flow mapping parses as sibling null keys. The upstream defect is real but attributed nowhere — not in `code-summary.md` "Deviations and limitations", not in `contracts/README.md`, and not as a finding against `contract-summary.md`. Roughly 35 further occurrences of the same pattern remain in `contract-summary.md`, so every C02-C27 transcription inherits it. | Record the quoting deviation in `code-summary.md` and raise the unquoted flow-mapping descriptions as a defect against `contract-summary.md` before the next boundary is transcribed. | Unresolved |
| R-09 | Minor | tools/contracts/redocly.yaml | Pinning the ruleset in the tool instead of in the package under test is correct and closes a real hole, since a package could otherwise relax the rules that judge it. `operation-summary: off` is defensible — the approved C18 document authors no per-operation summaries, so the rule is purely editorial here — and `operation-4xx-response: warn` is covered by C18's `default: Problem` responses. The weakness is disclosure: the rationale exists only as a YAML comment, and neither the relocation out of `contracts/source/web-bff/v1/` nor the two relaxations appear in `code-summary.md`. | Record the pinned ruleset, its location, and each relaxation among `code-summary.md`'s key implementation decisions. | Unresolved |
| R-10 | Minor | aidlc/spaces/default/intents/260908-stock-sense-design/construction/contracts/code-generation/traceability.json > BR5.1, BR5.10 | Both GAPs give the reason "C22-C27 messaging and recovery contracts and their conformance fixtures are absent", but rules.md scopes BR5.1 to job/event message identity and the common envelope, and BR5.10 to the C02/C17/C18 global identity-audit read contracts. The GAP verdicts are right; the stated blockers are not, so the owner cannot tell what would unblock them. | Replace both reasons with the applicable blocker: an absent AsyncAPI document for BR5.1, and absent C02/C17/C18 route and platform-grant fixtures for BR5.10. | Unresolved |
| R-11 | Minor | tools/contracts/tsconfig.json | `"strict": false` under `checkJs` makes the `type-check` sensor's exit 0 a weak signal: null and undefined misuse in the governance modules passes unflagged. Tests are additionally outside `checkJs`, with a recorded reason. | Raise `strict`, or at minimum `strictNullChecks`, for `src/`, or record the reduced assurance as an explicit limitation. | Unresolved |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `source-manifest.json` against `git diff --name-only 524d7d3..HEAD` | PASS: 46 manifest paths, 46 diff paths, set-equal, no duplicates, no `repo` keys | The manifest is exactly complete and accurate for the worktree branch. Omitting `repo` is correct inside the Bolt worktree. |
| `traceability.json` structure | PASS: 95 ids, `upstream_ids` and `coverage` set-equal, no duplicates, 46 OK / 49 GAP, 21 AC + 40 BR + 34 NFR | Counts and structure match `code-summary.md`. |
| `traceability.json` OK-target existence | PASS: all 46 `OK` targets resolve to existing files in the worktree | Every target exists. Whether each target substantiates its identifier is R-03, R-04 and R-05. |
| `pnpm --dir tools/contracts test:unit` | PASS: 66 tests, 65 pass, 0 fail, 1 skipped, 0 todo | Reproduces the record exactly. The skip is the Windows symlink case. |
| `pnpm --dir tools/contracts test:integration` | PASS: 26 tests, 25 pass, 0 fail, 1 todo | Reproduces the record. The single todo is C01-C27 release verification, honestly marked. |
| `pnpm --dir tools/contracts test:coverage` | PASS: 94.42% lines, 82.76% branches, 99.25% functions | Clears the 80% line floor with no threshold relaxation. The branch figure differs trivially from the recorded 82.64%. |
| `pnpm lint` (eslint 10.11.0) | PASS: exit 0 | `linter` sensor satisfied. |
| `pnpm type-check` (tsc 5.9.3) | PASS: exit 0 | `type-check` sensor satisfied, but weakened by `strict: false` — see R-11. |
| `pnpm scan:secrets` (secretlint 13.0.6) | PASS: exit 0 | No credential findings in `src/`, `test/` or `scripts/`. |
| `pnpm scan:vuln` (`pnpm audit --audit-level moderate`) | FAIL: exit 1, 46 vulnerabilities — 3 low, 19 moderate, 20 high, 4 critical | Reproduces the record exactly. Every advisory path traces to the pinned `@asyncapi/cli@6.0.2`. The pin is part of the approved plan, so this is an owner decision, and it is disclosed rather than suppressed. |
| C18 transcription diff against `contract-summary.md` | PASS with deviation: 15 lines differ, all adding quotes to `description` scalars; no semantic change | Confirms R-08. |

### Reviewer notes on the dispatch questions

**Ordered steps and the acceptance boundary.** Steps 1-4 and Step 9's record artifacts are genuinely done. Steps 5-8 are partial exactly as `code-summary.md` states, and that summary opens by declaring itself partial development evidence that does not meet the plan's acceptance boundary. The framing is honest, and the plan's own boundary clause already blocks an acceptance claim until the CI toolchain pins and required checks are finalized. The record does not overstate step completion; it overstates four identifier claims (R-03, R-04, R-05) and two shipped descriptions (R-06, R-07).

**Under-claimed GAPs.** I found none. Every GAP I probed is genuinely blocked. Two carry the wrong blocker (R-10). The over-claiming runs in the other direction.

**The fail-closed seams.** Failing closed is the right design here, and the polarity is chosen correctly in each case. `validateCanonical`'s `runTool` defaults to the real pinned validator while tests inject doubles, whereas `regenerateConsumer`'s `runGenerator` and `assessCompatibility`'s `runDiff` default to a throwing stub — so a caller that forgets to wire a generator gets `GENERATOR_UNAVAILABLE` rather than an empty output directory that would read as "no drift". `assessCompatibility` also short-circuits `unchanged` and `first-release` bindings before reaching the differ, so `DIFFER_UNAVAILABLE` fires only for a genuinely changed artifact. No unexercised check can masquerade as passing. One residual: `cli.mjs` maps every `ContractError` to `exitCode: 1` with no outcome field, so "the tool is missing" and "the contract is broken" are indistinguishable at the CLI boundary, even though `evidence.mjs` defines C19's six outcomes and keeps `unavailable` and `not-run` separate from `failed`. That matters when the release path is built; it sits inside the BR6.5 and NFR13.x GAPs already declared.

**The pinned redocly ruleset.** Defensible, and moving it into the tool is a genuine improvement — see R-09. The disclosure, not the choice, is what is missing.

**C18 transcription and upstream attribution.** Faithful; the defect is real; the attribution is absent — see R-08. This one warrants the owner's attention beyond this Unit, because the same unquoted flow-mapping pattern recurs about 35 more times across `contract-summary.md` and will be transcribed again for every remaining boundary.

### Summary

The implementation is careful, genuinely fail-closed, and verifies as claimed: 65 unit and 25 integration tests pass, coverage is 94.42% lines with no threshold relaxation, lint, type-check and secretlint are clean, and `source-manifest.json` is exactly set-equal to the branch diff. The verdict is NOT-READY on five Major findings of a single shape — an invariant the record asserts but the code does not enforce (the source binding skips every non-schema kind; three declared preflight limits and the diagnostic sanitizer are dead code), a traceability spine whose rule IDs name the wrong rules, and two `OK` claims, NFR11.3 and NFR8.11, that the unit's own summary and fixture inventory contradict. None of this is broken logic, and the author already labels the work partial development evidence; the gap is between what the record claims and what the code enforces, which is exactly what a Request Changes at the gate would correct.
