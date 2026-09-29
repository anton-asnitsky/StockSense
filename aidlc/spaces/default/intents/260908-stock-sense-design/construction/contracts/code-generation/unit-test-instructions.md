# U1 Contracts Unit Test Instructions

This file specifies only U1 `contracts` commands. Test execution uses local synthetic fixtures and never requires a running Kubernetes cluster, owner credentials, live supplier data, a model, or a GPU.

## Runner and setup

Step 1 of `code-generation-plan.md` creates `tools/contracts/package.json`, its exact lockfile, and `tools/contracts/test/config.mjs`. Use Node's built-in `node:test` and `node:assert/strict` runner. The package's `test:unit` script enumerates only the seven U1 unit test files below, rather than discovering tests in other units. The `test:integration` script enumerates only U1 CLI/package/release fixtures. Pin Node, pnpm and all external validator/generator versions in the repository/CI contract before evidence is accepted. Run a clean locked install; never rely on owner cache.

The exact unit-scoped command, runnable after Step 1 prepares the package, is:

```powershell
pnpm --dir tools/contracts test:unit
```

The separate U1 integration command is:

```powershell
pnpm --dir tools/contracts test:integration
```

Both package scripts must use explicit paths under `tools/contracts/test/` so neither command runs another unit's tests. Before the first component's test-after cycle, execute the unit command once and record its baseline result. A missing runner or lockfile is a setup failure, not a skipped test.

## Test files and expected scope

| Test file | Component | Minimum meaningful cases |
| --- | --- | --- |
| `tools/contracts/test/unit/package-loader.test.mjs` | C01 manifest, ownership, digest, revision and sidecar loader | 5-8; complete subset, duplicate/missing boundary, wrong digest, unsafe path, revision reuse, detached receipt |
| `tools/contracts/test/unit/preflight.test.mjs` | resource/ref/hook/diagnostic and protected-content policy | 5-8; each budget, recursive reference, symlink escape, no hook, sanitized output, supplier/prompt/secret rejection |
| `tools/contracts/test/unit/validators.test.mjs` | standards dispatch and exact fixture oracle | 5-8; OpenAPI, AsyncAPI, JSON Schema, C07 typed port, wrong dialect, wrong expected finding |
| `tools/contracts/test/unit/policy.test.mjs` | tenant/global envelope and browser/machine contract policy | 5-8; C15 profile separation/digest/size/replay and C18 CSRF/idempotency/authority denial |
| `tools/contracts/test/unit/compatibility.test.mjs` | immutable same-kind predecessor and Git baseline | 5-8; no-prior reason, wrong kind, unapproved break, predecessor mapping, C01 1.x package version |
| `tools/contracts/test/unit/generation.test.mjs` | consumer-local clean generation and drift | 5-8; pinned template/config, matching output, manual edit, missing manifest, wrong source digest |
| `tools/contracts/test/unit/evidence.test.mjs` | C19 outcomes, scans, exception, digest and attestation verification | 5-8; six outcomes, forbidden seventh, expired exception, missing scan, forged subject, digest mismatch |
| `tools/contracts/test/integration/cli.package.test.mjs` | CLI against real synthetic C01 package and pinned validators | package validation, negative fixture, partial-coverage truth, malformed input, clean re-run |
| `tools/contracts/test/integration/cli.release.test.mjs` | release/consumer boundary and CI-policy fixtures | protected-content leak, changed PR workflow, unprivileged policy, missing evidence, clean verification |

Each component suite includes a success path and at least two genuine edge/failure cases. Tests assert stable error codes and rule IDs where the approved contract requires them; a test that accepts any nonzero exit is insufficient. No test may claim runtime authorization, broker delivery, or database behavior from schema fixtures.

## Coverage and verification

Require at least 80% line coverage for the U1 governance modules, with all mandatory security and compatibility negative cases exercised. The standard strategy also requires five to eight meaningful unit tests per component and integration tests for key boundaries. The unit and integration commands must run in CI before merge; a missing CI run or coverage below 80% blocks acceptance. Use Node's coverage collection scoped to `tools/contracts/src/`; report uncovered lines without lowering the threshold or excluding policy/error code solely to pass. `Build and Test` re-runs the U1 commands and verifies the mandatory floor.

Use deterministic, checked-in synthetic C01 examples only. Generate temporary packages under a disposable test directory, seed exact source revisions and expected hashes, and remove them afterward. Replace validator/generator subprocesses with narrow test doubles in unit tests to simulate timeouts and malformed output; integration tests execute the pinned real tools where their lockfile is available. Inject a fake clock for expiry/retention tests and fixed immutable revision IDs for compatibility tests. Never put real credentials, supplier documents, prompts, or hidden reasoning in fixtures or snapshots.

If a required external scanner, SBOM generator or GitHub attestation is not yet pinned/available, record its integration result as `not-run` or `unavailable` with a reason and keep release acceptance blocked. A local mock is valid for unit behavior only, not provenance or scanner evidence.
