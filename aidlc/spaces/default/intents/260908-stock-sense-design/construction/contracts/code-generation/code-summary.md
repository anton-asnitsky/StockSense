# U1 Contracts Code Generation Summary

Branch `feat/contracts-governance-foundation`, worktree
`.aidlc/worktrees/contracts-governance-foundation`, based on
`origin/bolt-runnable-retail-walking-skeleton` (`524d7d3`).

This summary describes partial development evidence. It is not an implementation
acceptance claim. The plan's acceptance boundary is not met.

## Ordered plan steps

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

Thirty-five paths, enumerated in `source-manifest.json`. New in this pass:

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
| unit | 60 pass, 0 todo, 1 skipped (Windows symlink case) |
| integration | 19 pass, 1 todo |
| coverage | 79 pass, 1 todo, 1 skipped; **93.61% lines**, 82.05% branches, 98.33% functions |
| `pnpm lint` (eslint 10.11.0) | exit 0 |
| `pnpm type-check` (tsc 7.0.2) | exit 0 |
| `pnpm scan:secrets` (secretlint 13.0.6) | exit 0 |
| `pnpm scan:vuln` (pnpm audit) | **exit 1 — 46 vulnerabilities** |

At the inherited checkpoint this was 42 pass, 5 todo, 91.75% lines, with no
lint, type-check or scanner able to run at all. The 80% line floor is met and
was not lowered.

### Vulnerability scan finding

`pnpm audit` reports **46 vulnerabilities: 3 low, 19 moderate, 20 high, 4
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
Vendored and working: `eslint`, `typescript` with `@types/node`, `secretlint`
with the recommended preset, `pnpm audit`, and `openapi-diff@0.24.1`, whose
`diffSpecs` entry point imports cleanly.

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
  candidate exists. Its all-zero `sourceRevision` is a fixture placeholder, not
  Git provenance. It is not a release package and proves no C01-C27 conformance.
- The pinned OpenAPI and AsyncAPI validators, and the newly vendored differ and
  generators, are invoked through real seams but **none has been exercised on a
  complete package**, because there are no catalogue documents to run them
  against. They stay fail-closed until the catalogue exists.
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
