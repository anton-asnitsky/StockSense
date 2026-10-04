# U1 Contracts Code Generation Summary

Branch `feat/contracts-governance-foundation`, worktree
`.aidlc/worktrees/contracts-governance-foundation`, based on
`origin/bolt-runnable-retail-walking-skeleton` (`524d7d3`).

This summary describes partial development evidence. It is not an implementation
acceptance claim. The plan's acceptance boundary is not met.

## Ordered plan steps

### Bolt 1 Definition-of-Done items owned by U1

Bolt 1 asks for U1's **thin** contract package, not the full C01-C27 catalogue.

| Bolt 1 requirement | State |
| --- | --- |
| Thin package is a `candidate` | Met — `manifestStatus: candidate`, `releaseReady: false` |
| Bound to an immutable Git `sourceRevision` | **Met** — bound to `8b2970fe`, and every canonical document (OpenAPI and schemas) is verified against its blob at that commit |
| Documents and sidecars identify owner, boundary IDs, version, path, verified `sha256:` digest | Met — enforced by the loader |
| Demonstrated clients generated from validated inputs before integration | **Met** — C18 validates, and openapi-typescript 7.13.0 regenerates the declared output reproducibly with drift detection |

### Ordered plan steps

| Step | State |
| --- | --- |
| 1 — Work branch and runnable test runner | Complete |
| 2 — C01 package model and immutable loader | Complete |
| 3 — Untrusted-input preflight and protected-content gate | Complete |
| 4 — Pinned validators and exact fixture oracle | Complete |
| 5 — Canonical contract catalogue and policy fixtures | Policy and fixture oracle complete; **catalogue absent** |
| 6 — Immutable compatibility checks | Logic complete; **differ not vendored** |
| 7 — Consumer-local regeneration and drift | Logic complete; **generators not vendored** |
| 8 — Evidence, release integrity and trust-path checks | Local logic complete; **scans, SBOM, attestation and CI absent** |
| 9 — Reproducible validation, documentation and traceability | Record artifacts written; **clean-room install and CI run absent** |

## Files

Forty-six paths, enumerated in `source-manifest.json`. New in the governance pass:

- `tools/contracts/src/policy.mjs` — declared-policy check, finding mapping, fixture oracle runner
- `tools/contracts/src/compatibility.mjs` — baseline binding, predecessor binding, breaking-change approval
- `tools/contracts/src/generation.mjs` — generation profile, disposable-workspace regeneration, drift
- `tools/contracts/src/evidence.mjs` — C19 outcomes, scan gates, exceptions, receipts, attestation, CI policy
- `tools/contracts/test/unit/{policy,compatibility,generation,evidence}.test.mjs` — replacing the four unit `todo` placeholders
- `tools/contracts/test/integration/cli.release.test.mjs` — real fail-closed release test

Modified: `package-loader.mjs` (exports the enforced matrix), `validate.mjs` (runs
policy and fixtures), `cli.package.test.mjs`, and the sample's
`example-fixture.json` and `manifest.json`.

## Key implementation decisions

- **Unavailable tooling fails closed.** The compatibility differ and the code
  generators are not vendored here and fetching them is not authorized, so
  `runPinnedDiff` and `runPinnedGenerator` raise `DIFFER_UNAVAILABLE` and
  `GENERATOR_UNAVAILABLE` rather than reporting a result they did not compute.
  Both stay injected seams, matching how the OpenAPI and AsyncAPI validators
  were already structured.
- **The enforced matrix is exported, not duplicated.** A package's declared
  `contract-package-policy.json` is compared against the loader's own constants,
  so a declared policy can restate the rules but never weaken them, and the two
  cannot drift.
- **The sample fixtures could not previously have run.** They declared expected
  outcomes but carried no payloads and no revision binding. They now carry
  synthetic payloads exercising the C15 closed-envelope rule: the tenant
  envelope requires `retailerId`, the global identity-audit envelope forbids it.
- **Fixture element ids follow the canonical schema titles.** The authored
  fixtures said `TenantMessageEnvelope` while the schema title is
  `MessageEnvelope`. Renaming a canonical schema title would be a contract
  change, so the fixture was aligned to the document instead.
- **A negative outcome still has to explain itself.** C19's six outcomes are
  exhaustive and `reason`, `expectedResult`, `actualResult`, timing and
  `limitations` remain required for `rejected`, `unavailable` and `not-run`.
- **An absent scan is reported, not assumed clean.** A gate may report
  `unavailable`, but it cannot claim a pass without a report digest.

## Verification

Node 24.21.0, pnpm 11.25.0 provisioned through corepack.

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | exit 0, clean, no network error |
| unit | 65 pass, 0 todo, 1 skipped (Windows symlink case) |
| integration | 26 pass, 1 todo |
| coverage | 91 pass, 1 todo, 1 skipped; **94.44% lines**, 82.76% branches, 99.25% functions |
| `pnpm lint` (eslint 10.11.0) | exit 0 |
| direct `tsc --noEmit` (tsc 5.9.3) | exit 0, with `strictNullChecks: true` |
| `pnpm scan:secrets` (secretlint 13.0.6) | exit 0 |
| `pnpm scan:vuln` (pnpm audit) | **exit 1 — 46 vulnerabilities** |

At the inherited checkpoint this was 42 pass, 5 todo, 91.75% lines, with no
lint, type-check or scanner able to run at all. The 80% line floor is met and
was not lowered.

### Vulnerability scan finding

The last recorded `pnpm audit` reports **46 vulnerabilities: 3 low, 19 moderate, 20 high, 4
critical**. Every one of the 91 advisory paths traces to a single pinned
dependency, `@asyncapi/cli@6.0.2`, which pulls a large transitive tree including
`@asyncapi/studio`, `next` and `postcss`.

This matters more here than in an ordinary package: BR6.2 requires a failed
required contract check to block the corresponding integration decision, and
this unit is the one that enforces supply-chain rules on everyone else. The
AsyncAPI validator pin is part of the approved plan, so replacing or upgrading
it is an owner decision rather than a code-generation fix.

## Vendored tooling

The owner authorized vendoring the pinned differ, generators and scanners.
Vendored and working: `eslint`, `typescript@5.9.3` with `@types/node`,
`secretlint` with the recommended preset, `pnpm audit`, `openapi-diff@0.24.1`
(its `diffSpecs` entry point imports cleanly), and `openapi-typescript@7.13.0`,
now wired through a pinned invocation and proven reproducible.

The TypeScript pin was initially `7.0.2`, chosen because it was latest. That
violated `openapi-typescript`'s `^5.x` peer range and broke generation outright:
TypeScript 7 is the native port and no longer exposes the `ts.factory` API the
generator uses. pnpm warned about peer-dependency issues and the warning was not
followed up. Repinned to `5.9.3`.

Three were deliberately **not** vendored, each for a stated reason:

- **oasdiff**, the differ the plan names. The npm package of that name is
  `0.0.1-security`, a squatting placeholder rather than the tool. The real
  oasdiff is a Go binary published to GitHub releases; vendoring an unsigned
  cross-platform binary is a separate supply-chain decision. `openapi-diff` is
  vendored in its place and is **not** the tool the plan named.
- **Kiota**. Only a preview release is published to npm. Pinning a preview into
  a governance toolchain warrants an explicit owner decision.
- **CycloneDX SBOM**. `@cyclonedx/cyclonedx-npm` shells out to `npm ls` and
  cannot read a pnpm-managed tree. It was removed rather than left broken, so
  **SBOM generation remains unimplemented**; `@cyclonedx/cdxgen` is the
  pnpm-compatible candidate for the next pass.

## Deviations and limitations

- **No CI run exists.** `assertCiPolicy` defines the public-PR policy U1 owns;
  U2 must enforce it from a protected base workflow before it can be credited.
  R-01 remains an explicit U2 enforcement dependency.
- **The C01-C27 canonical catalogue is absent.** Only the illustrative C01
  candidate exists. Its `sourceRevision` is a real verified
  commit and it now covers C01 and C18, but that is two boundaries of 27. It is not a release package and proves no C01-C27 conformance.
- The pinned OpenAPI validator and the openapi-typescript generator are now
  exercised on a real document: C18 validates inside the pipeline and its client
  regenerates reproducibly with drift detection. The AsyncAPI validator, the
  differ and Kiota are still unexercised and stay fail-closed, because no
  AsyncAPI document, predecessor revision or .NET consumer exists yet.
- No release scans, SBOM, attestation or provider conformance has been run.
- Tests are outside `checkJs`; the reason is recorded in `tsconfig.json`.
- `package.json` pins `engines.node` to exactly `24.19.0` while the installed
  runtime is `24.21.0`, so every pnpm command prints an unsupported-engine
  warning. Harmless, but the pin is stale.

## Traceability

`traceability.json` enumerates 95 identifiers: 21 acceptance criteria, 40
business rules and 34 detailed NFRs. **43 are `OK` and 52 are `GAP`.** `OK` is
claimed only where a workspace file implements and tests the identifier; every
`GAP` names the missing catalogue, tooling, CI or release evidence behind it.

## Independent architecture review, iteration 1

Verdict **NOT-READY** (advisory), recorded as `REVIEW_COMPLETED`. Five Major and
six Minor findings; the full table is appended to `code-generation-plan.md`. The
reviewer reproduced the pre-correction test numbers; the current numbers above
were rerun after the R-02/R-11 changes and await independent re-check.

Acted on before the gate:

- **R-01, Major.** `verifySourceBinding` was called with the schema entries only,
  so the C18 OpenAPI document was never byte-verified against `sourceRevision`
  while this summary and `contracts/README.md` both claimed every canonical
  document was. The call now covers openapi, asyncapi and schema entries, and an
  integration test tampers the C18 document *with a matching digest* to prove
  only the source binding can catch it.
- **R-03, R-04, R-05, Major.** Three identifiers were marked `OK` without
  substantiation and are now `GAP`: NFR11.3 needs a clean hosted run that does
  not exist; NFR8.11's C18 behaviour is unexercised because no fixture targets
  C18 and `runFixtureOracle` resolves schema entries only; NFR10.1's diagnostic
  shape is not emitted, and `sanitizeFinding`, `limitFindings`,
  `LIMITS.validatorMs` and `LIMITS.processBytes` are unused in production.
- **R-07, R-10, Minor.** Corrected: this summary said thirty-five paths against
  the manifest's forty-six and named `cda7f793` where the manifest records
  `8b2970fe`; and the BR5.1 and BR5.10 GAP reasons cited the messaging catalogue
  rather than their real blockers.

Corrected after the first review, awaiting a fresh review receipt:

- **R-02, Major.** The approved U1 `rules.md` YAML assigns package completeness,
  duplicate paths, boundary inventory, required kinds/sidecars, unsafe paths,
  symlinks, unlisted files and digest mismatches to BR1.1; duplicate logical
  identity belongs to BR1.6. `package-loader.mjs` now emits those IDs, and its
  unit and CLI integration assertions check the pair of finding code and rule ID.
- **R-11, Minor.** Production `checkJs` now enables `strictNullChecks: true`.
  Direct TypeScript 5.9.3 checking passes. The other strictness flags remain off;
  tests remain outside `checkJs` for the reason documented in `tsconfig.json`.

The corrected source is pushed as `9901084` on
`feat/contracts-governance-foundation`. The first advisory NOT-READY verdict is
still the recorded review outcome until the permitted stale-receipt recovery
is requested and completed. Do not present these two fixes as independently
reviewed yet.

## Undisclosed decisions now recorded

- **The approved C18 YAML is malformed, and the package transcription repairs
  it.** Fifteen lines differ from the C18 block in `contract-summary.md`, all
  adding quotes around `description` scalars and changing nothing semantically.
  Unquoted descriptions containing commas inside a YAML flow mapping parse as
  sibling null keys, which is what produced thirteen structural validator errors.
  **The same pattern occurs roughly thirty-five more times in
  `contract-summary.md`**, so every later C02-C27 transcription inherits it. The
  upstream document needs correcting; this package's copy is a faithful repair,
  not a contract change.
- **The redocly ruleset is pinned by the tool, not the package.**
  `tools/contracts/redocly.yaml` keeps `struct`, `operation-operationId` and
  `no-unresolved-refs` as errors and turns `operation-summary` off, because the
  approved contract authors no per-operation summaries and inventing prose here
  would put this copy out of step with the contract it transcribes. Locating it
  in the tool means a package cannot relax the rules judging it.
