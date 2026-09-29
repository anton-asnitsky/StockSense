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

## Test coverage

Run with Node's built-in runner on Node 24.21.0.

| Suite | Result |
| --- | --- |
| unit | 60 pass, 0 todo, 1 skipped (Windows symlink case) |
| integration | 19 pass, 1 todo |
| coverage | 79 pass, 1 todo, 1 skipped; **93.46% lines**, 81.91% branches, 98.33% functions |

At the inherited checkpoint this was 42 pass, 5 todo, 91.75% lines. The 80% line
floor is met and was not lowered.

## Deviations and limitations

- `pnpm` is not on PATH in this environment, so the suites were run through
  their underlying `node --test` commands rather than the `pnpm --dir` scripts.
  `node_modules` was already installed. **No clean-room install was performed**,
  and the lockfile has still not been verified by `pnpm install --frozen-lockfile`
  in a clean environment.
- **No CI run exists.** `assertCiPolicy` defines the public-PR policy U1 owns;
  U2 must enforce it from a protected base workflow before it can be credited.
  R-01 remains an explicit U2 enforcement dependency.
- **The C01-C27 canonical catalogue is absent.** Only the illustrative C01
  candidate exists. Its all-zero `sourceRevision` is a fixture placeholder, not
  Git provenance. It is not a release package and proves no C01-C27 conformance.
- The pinned OpenAPI and AsyncAPI validators are invoked through a real seam but
  have still not been exercised on a complete package.
- No release scans, SBOM, attestation or provider conformance has been run.
- `tools/contracts/test/config.mjs` exports an unused `PACKAGE_ROOT` pointing at
  `contracts/packages/walking-skeleton/`, which does not exist. `FIXED_REVISION`
  from the same file is used. The stale export is noted, not yet removed.

## Traceability

`traceability.json` enumerates 95 identifiers: 21 acceptance criteria, 40
business rules and 34 detailed NFRs. **43 are `OK` and 52 are `GAP`.** `OK` is
claimed only where a workspace file implements and tests the identifier; every
`GAP` names the missing catalogue, tooling, CI or release evidence behind it.
