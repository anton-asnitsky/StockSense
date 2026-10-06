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
| Direct Node unit and integration suite with exact local standards image | After the messaging candidate: 223 tests, 219 pass, 2 Windows symlink privilege skips, 2 TODOs (full release and full-catalogue package/resource acceptance), 0 fail; 93.70% lines, 84.38% branches. |
| ESLint and TypeScript check | Pass |
| Targeted Secretlint scan | Pass |
| Lockfile and frozen install | Current lockfile passed pnpm's supply-chain verification with NODE_OPTIONS=--use-system-ca; a clean frozen install then completed using pnpm's temporary trustLockfile setting for this already verified lockfile and an engine-strict override for local Node 24.21.0 |
| Pinned oasdiff | Exact local Windows binary verified by published SHA-256; identical-spec and breaking-path integration tests pass |
| Kiota | Exact 1.35.0 dotnet tool restored from the checked-in tool manifest and version command passed |
| Standards validation | C01/C18 and C01/C22/C23 candidate CLI checks, bounded Ajv schema and fixture compilation, and C03/C07/C23 offline-reference/payload cases pass through the pinned Docker image `sha256:0dfa6bb4607c1145acd1ca67070c413dcb02c1473da48bfb0dca9d9ac32ae8af`; missing image fails with `STANDARDS_IMAGE_PIN`. All 38 present sources select their declared dialect and resolve 332 references below the 1024 cap. All 17 OpenAPI drafts lint with zero errors. Protected-content checks cover draft sources, profiles and fixtures. C18 derived 1024/1025 cases and depth 32/33 pass. Full 27-boundary package validation, fixture coverage and resource acceptance remain TODO. |

The clean install first stalled while removing a partial prior virtual store. After clearing only this worktree's generated node_modules, the frozen install completed from the verified lockfile, and the post-upgrade local suite above passed. A later pnpm-script check attempted online metadata refresh and failed certificate verification; direct invocation of the installed local binaries produced the stated test, lint and type-check results. The pinned package engine version 24.19.0 has not been reproduced on this host; the temporary install overrides are not hosted CI evidence.

## Traceability

The existing traceability map contains 95 upstream identifiers. The last reviewed baseline had 43 OK and 52 GAP. This checkpoint adds local source evidence but does not automatically upgrade any GAP without the required exact fixture, owner-runtime, CI, or release proof.

R-12's technical finding has focused independent READY review. All 38 present canonical sources enter package reference preflight with 1024-occurrence and 32-depth tests. The declared C01 HTTPS identities map to digest-checked graph bytes; pinned AsyncAPI resolver, containerized CLI and offline Ajv tests cover both tenant and global envelopes. The actual candidate CLI has no host standards-tool fallback. Preflight rejects fragment-only references whose nested `$id` changes the selected physical node. Canonical JSON Schema, AsyncAPI payload, and fixture Ajv compilation run against digest-checked snapshots inside the 60-second/2 GiB container profile; C07 typed-port, C08 in-process-port and governed-record YAML do not enter the JSON Schema fixture oracle. The approved Step 10 remains unchecked until full-catalogue package validation and time/RSS proof run. R-13's local source gates reject short and punctuation-only credential assignments, protected generated bytes and filenames before hashing, executable Deno/package manifests, undeclared or nested evidence fields, and caller-controlled diagnostic identifiers. Release publication remains unimplemented and fail-closed, so R-13 and Step 11 are not closed. R-14 remains open because the three-boundary candidate does not provide all required sidecars, revision-bound fixtures or full validator/resource proof for C01-C27. C16's registered `/signin-oidc` redirect and `/auth/callback` continuation now align in draft sources and U3's accepted functional design, but the inception C16 OpenAPI excerpt still needs formal reconciliation. R-15 remains open because the protected U2 required check, hosted CI and vulnerability disposition are absent. The current lockfile audit reports 47 advisories, including 26 High/Critical, all through the pinned AsyncAPI CLI tree. The finding inventory is in verification/u1-vulnerability-audit-2026-10-05.json. R-16 remains open despite the oasdiff/Kiota pins because the remaining approved toolchain and release evidence are absent. R-17's C18 comma-bearing flow descriptions were quoted without changing their values in the upstream design and canonical source; final U1 review has not closed it.

The C22/C23 fixture candidates now contain one positive and one exact required-field negative for each canonical schema. The local fixture oracle binds the expected finding code, rule, element and revision; the generated file is reproducible from the governed profile candidates. This is four schema examples, not cross-language or provider-runtime conformance evidence.

## Independent architecture review

The latest formal U1 review remains NOT-READY. Focused independent R-12 and R-13 source-gate reviews on 2026-10-05 found no remaining Major technical gap in those bounded controls and marked them READY. The 2026-10-06 independent architecture review found the expanded sources READY for a draft-source checkpoint with no new Major inconsistency. It kept two existing Major items open: C16's approved inception excerpt still lacks the registered OIDC callback paths now present in the draft source and U3 design, and U3's platform-Operator grant entity rules still need a one-active-grant and monotonic-version invariant. These bounded reviews are not U1 acceptance or a gate decision; the full-catalogue resource proof, publication and other findings remain open.

## Next work

Use the source-bound inventory as package-assembly input. Build the full C01-C27 package with required C22/C23 governed sidecars and exact positive/negative fixtures. Reconcile C16's inception excerpt and the U3 grant invariant, complete full-catalogue resource proof, toolchain and hosted CI evidence with U2, update traceability, then request a fresh independent architecture and AI-DLC process review. Do not merge or claim U1 acceptance while the open findings remain.
