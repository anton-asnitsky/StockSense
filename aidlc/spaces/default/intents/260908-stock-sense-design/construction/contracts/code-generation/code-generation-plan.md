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
