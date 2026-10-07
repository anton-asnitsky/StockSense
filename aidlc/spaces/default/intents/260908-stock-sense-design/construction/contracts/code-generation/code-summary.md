# U1 Contracts Code Generation Summary

This is an in-progress Construction record, not an implementation acceptance or release claim. The U1 plan and test instructions remain unchanged. The owner renewed Plan Approval for the reissued Code Generation directive on 2026-10-06; testing-posture verification confirms the current fingerprint and protected receipt before further implementation.

## Ordered plan steps

| Step | Current state |
| --- | --- |
| 1-2: branch, runner, immutable loader | Implemented in the focused worktree |
| 3-4: preflight, protected content, validators, fixture oracle | R-12 technical finding has focused independent READY review; full-catalogue resource acceptance remains dependent on R-14 |
| 5 and 13: C01-C27 catalogue and fixtures | Draft canonical sources cover every required C01-C27 kind; a separate C01/C22/C23 source-bound candidate with eight exact fixtures passes locally. Full 27-boundary package, remaining sidecars/fixtures and resource proof remain open |
| 6 and 14: compatibility and toolchain | Pinned oasdiff 1.28.0 and Kiota 1.35.0 exercised locally; AsyncAPI/schema comparison, SBOM, attestation, clean consumer and CI pins remain open |
| 7-8 and 11: generation, protected content and release evidence | Focused R-13 source-gate review READY; publication, release integrity and hosted evidence remain open |
| 9 and 15-16: CI, traceability, review | Local checks pass; no trusted hosted CI or final independent review yet |

## Files

The implementation is in the focused worktree at D:/Git/StockSense/.aidlc/worktrees/contracts-governance-foundation on branch feat/contracts-governance-foundation. The 38-source catalogue expansion, governed C22/C23 profile candidates, C08 in-process validator and tests were pushed as 20dc934. The versioned boundary-source map and inventory builder followed as 6bd8eca, the owning-unit map as 1494bf3, and C22/C23 fixture candidates as 062b7df. Strict Ajv rejected the draft C01 package schema's conditional `minItems` fields; the array-type correction and regression test were pushed as 6ad2c03. The inventory now binds all 38 canonical sources to that revision and reports its own map digest. The separate C01/C22/C23 package candidate was validated and pushed as 42746a4. Git initially refused one object write, but a later write and staging retry succeeded without permission changes. This AI-DLC summary remains in the active lifecycle checkout. The source-manifest.json file lists the application paths. Full 27-boundary packaging and release evidence remain open.

The original walking-skeleton sample still declares candidate status, C01/C18 coverage and releaseReady false. Newly authored C02-C07 and C09 sources have not been inserted into it. C03's AsyncAPI source uses the specification's payload schemaFormat/schema object. The offline resolver now maps its C01 HTTPS schema identity to digest-checked packaged bytes in a temporary validation graph. The candidate CLI snapshots and rechecks that graph, then runs the pinned OpenAPI/AsyncAPI standards tools in a digest-addressed, local Linux container with no network, a 60-second wall limit, and a 2 GiB memory/swap limit. It fails closed without an exact image ID. A separate offline Ajv 2020 compilation pass confirms the payload uses the registered C01 bytes and rejects an invalid target. Real pinned AsyncAPI parser tests assert that the resolver reads the same declared C01 identity and digest. The walking-skeleton manifest's existing sourceRevision continues to bind only its unchanged sources from the prior commit.

The separate messaging-profiles candidate covers C01/C22/C23 only. Its manifest binds six canonical documents to 6ad2c03, declares the C22/C23 governed profile sidecars, and runs eight positive/negative envelope and messaging-profile fixtures. The pinned Docker validation and Git blob comparison pass with `sourceBinding: verified`, `releaseReady: false`, and 24 boundaries explicitly uncovered. Its generation profile records that consumer generation is unverified; no cross-language or provider-runtime conformance is claimed.

## Verification

Local Node 24.21.0 and pnpm 11.25.0:

| Check | Current result |
| --- | --- |
| Exact `pnpm --dir tools/contracts test:unit` with system CA | 191 tests: 189 pass, 2 Windows symlink privilege skips, 0 fail. |
| Exact `pnpm --dir tools/contracts test:integration` | 56 tests: 54 pass, 0 fail, 0 skip, 2 TODO. Every container-backed test now executes: the Docker engine is running and the standards image is built from this tree. No test is skipped for a missing image. |
| Coverage (`test:coverage`, unit and integration) | 247 tests, 243 pass, 0 fail. 94.53% U1 lines, 85.23% branches, 92.06% functions; the 80% line floor remains enforced and was not lowered. |
| ESLint and TypeScript check | Pass |
| Targeted Secretlint scan | Pass |
| Lockfile and frozen install | Current lockfile passed pnpm's supply-chain verification with NODE_OPTIONS=--use-system-ca; a clean frozen install then completed using pnpm's temporary trustLockfile setting for this already verified lockfile and an engine-strict override for local Node 24.21.0 |
| Pinned oasdiff | Exact local Windows binary verified by published SHA-256; identical-spec and breaking-path integration tests pass |
| Pinned Kiota | Exact 1.35.0 restored from the checked-in tool manifest and exercised through the pinned runner: two clean workspaces produce byte-identical output, 104 C# files, tree digest `sha256:a12f3847`. Not wired into a consumer output manifest; see the deviations below. |
| Standards validation | The whole C01-C27 catalogue now validates: all 38 canonical sources pass the validator each one's own dialect selects (17 OpenAPI, 6 AsyncAPI with their payload pass, 12 JSON Schema, 3 closed dialects), measured under the retained bounds at 332 reference occurrences against the 1024 cap, slowest single document 7.0 s against the 60 s validator bound, peak RSS 151 MB against the 2 GiB process bound. The C01/C18 and C01/C22/C23 candidates both validate end to end with `sourceBinding: verified`. Full 27-boundary **packaging** - sidecars and revision-bound fixtures for every boundary - remains open; this is catalogue validation, not a release package. |
| Standards image | No image digest is pinned in this record. The image bakes in a copy of `tools/contracts/src`, the build is not bit-reproducible, and the runner refuses an image whose recorded tool-source digest does not match the tree (`STANDARDS_IMAGE_STALE`/`NFR6.2`), so every environment builds its own with `pnpm --dir tools/contracts build:standards-image`. |

The clean install first stalled while removing a partial prior virtual store. After clearing only this worktree's generated node_modules, the frozen install completed from the verified lockfile, and the post-upgrade local suite above passed. An initial pnpm-script check attempted online metadata refresh and failed certificate verification. With NODE_OPTIONS=--use-system-ca, the exact pnpm unit and integration scripts executed; direct invocation of installed local binaries produced the coverage, lint, type-check and Secretlint results. The pinned package engine version 24.19.0 has not been reproduced on this host; the temporary install overrides are not hosted CI evidence.

## Traceability

The existing traceability map contains 95 upstream identifiers. The last reviewed baseline had 43 OK and 52 GAP. This checkpoint adds local source evidence but does not automatically upgrade any GAP without the required exact fixture, owner-runtime, CI, or release proof.

R-12's technical finding has focused independent READY review. All 38 present canonical sources enter package reference preflight with 1024-occurrence and 32-depth tests. The declared C01 HTTPS identities map to digest-checked graph bytes; pinned AsyncAPI resolver, containerized CLI and offline Ajv tests cover both tenant and global envelopes. The actual candidate CLI has no host standards-tool fallback. Preflight rejects fragment-only references whose nested `$id` changes the selected physical node. Canonical JSON Schema, AsyncAPI payload, and fixture Ajv compilation run against digest-checked snapshots inside the 60-second/2 GiB container profile; C07 typed-port, C08 in-process-port and governed-record YAML do not enter the JSON Schema fixture oracle. Step 10's remaining acceptance clause is now met: `tools/contracts/test/integration/catalogue-resource.test.mjs` validates all 38 canonical sources through their selected dialects and records 332 reference occurrences against the 1024 cap, a slowest single document of 7.0 s against the 60 s bound, and 151 MB peak RSS against the 2 GiB bound. Step 10 itself stays unchecked only because the approved plan files are byte-bound to the protected approval and no checklist mark may be made here. R-13's local source gates reject short and punctuation-only credential assignments, protected generated bytes and filenames before hashing, executable Deno/package manifests, undeclared or nested evidence fields, and caller-controlled diagnostic identifiers. Release publication remains unimplemented and fail-closed, so R-13 and Step 11 are not closed. R-14 is partly closed: full-catalogue validation and the supervised resource measurement now exist and pass. It remains open because the C01/C18 and C01/C22/C23 candidates still do not provide sidecars or revision-bound fixtures for all 27 boundaries. C16's registered `/signin-oidc` redirect and `/auth/callback` continuation now align in draft sources and U3's accepted functional design, but the inception C16 OpenAPI excerpt still needs formal reconciliation. R-15 remains open because the protected U2 required check, hosted CI and vulnerability disposition are absent. The 2026-10-05 lockfile audit recorded 47 advisories, including 26 High/Critical, in verification/u1-vulnerability-audit-2026-10-05.json. A 2026-10-07 scan fails with 55 advisories (4 low, 20 moderate, 25 high, 6 critical), every path tracing to the approved-plan pin `@asyncapi/cli`; the older inventory is historical and needs finding-specific refresh and an owner disposition. R-16 is partly closed: `openapi-diff` is gone, oasdiff 1.28.0 is pinned and exercised, and Kiota 1.35.0 now runs reproducibly through the pinned runner. It remains open because the SBOM generator, AsyncAPI template, runner/scanner versions and attestation action are unpinned pending the owning CI Design decision, and because the .NET client is not bound to a declared consumer output manifest. R-17's C18 comma-bearing flow descriptions were quoted without changing their values in the upstream design and canonical source; final U1 review has not closed it.

The C22/C23 fixture candidates now contain one positive and one exact required-field negative for each canonical schema. The local fixture oracle binds the expected finding code, rule, element and revision; the generated file is reproducible from the governed profile candidates. This is four schema examples, not cross-language or provider-runtime conformance evidence.

## Independent architecture review

The latest formal U1 review remains NOT-READY. Focused independent R-12 and R-13 source-gate reviews on 2026-10-05 found no remaining Major technical gap in those bounded controls and marked them READY. The 2026-10-06 independent architecture review found the expanded sources READY for a draft-source checkpoint with no new Major inconsistency. It kept two existing Major items open: C16's approved inception excerpt still lacks the registered OIDC callback paths now present in the draft source and U3 design, and U3's platform-Operator grant entity rules still need a one-active-grant and monotonic-version invariant. These bounded reviews are not U1 acceptance or a gate decision; the full-catalogue resource proof, publication and other findings remain open.

## Next work

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
