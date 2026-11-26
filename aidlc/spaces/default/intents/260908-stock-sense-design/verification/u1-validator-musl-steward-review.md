# Independent steward review: focused validator musl amendment

Date: 2026-11-27 (Asia/Jerusalem). Status: final substantive review complete; protected-question binding remains pending. This report grants no implementation approval, finding acceptance, merge, U1 acceptance or release authority.

## Lifecycle and stop-point review

The existing intent remains Construction / code-generation, unit contracts in progress, classic scope and standard testing. The parent CI closure plan is immutable at SHA256 `97d65b6e528e12b132baadcd735cd5a165cbc463fbdd548fdc31f322cb1a45fa`; its approval report records native protected verification for fingerprint `33ae249de4db4b3e9b3ee57f22eea5559e992bd96a747a80a2987d3ccc7579d7` before isolated evaluation. That approval explicitly required a new amendment for a distribution/libc change and must not be reused for musl.

Reviewed the closure approval report, local baseline report, same-family validator report, independent runtime review, proposed musl amendment, current question/state and native audit. The independent runtime review confirms that the tested Wolfi `glibc-2.44@2.44-r28` image retains all five unknown findings, with complete raw/SBOM/database/image bindings. The plan's stop point was therefore correctly invoked. Neither zero High/Critical rows nor a new distro namespace can substitute for actual remediation.

This reviewer changed only this report. No implementation, workflow, owner comment, lifecycle state, audit, diary, receipt or protected file was changed, and no approval was fabricated.

## Current CI independently checked

Live GitHub metadata still shows the same base `402ace3b195c291a756ed230a24a73199ef8349a` and unchanged PR heads:

| PR | Head | U1 failed job | U2 successful job | Vulnerability successful job |
|---|---|---|---|---|
| 74 | 2252d2109d47d3f26c6d6d0a035cea9be96ded81 | 140086969525 | 140166253947 | 140086968999 |
| 75 | d592dff7483ee6af2c12d9639c4b23332eaea2a6 | 140086967756 | 140166258790 | 140086967997 |
| 76 | e70f9a78c465468c17a47407b0385e1c9c54c67b | 140086958825 | 140166243153 | 140086958218 |

U1 failures remain assigned to the coordinator's runtime/ledger remediation. U2 successes do not authorize future changed heads. No diagnostic screening result clears ordinary U1 or establishes all-green CI.

## Substantive findings

No blocking or major defect found in the proposed bounded evaluation strategy. It explicitly changes the validator distribution/libc and consequential Node binary hash while preserving Node 24.22.3, pnpm/dependency graph, Kiota version, scanner semantics and the unchanged Testing Contract. Experimental amd64 musl support is disclosed as a material owner choice; it is not presented as equivalent upstream support.

The proposal requires authentication of the exact official musl archive, signed checksum/key provenance and equality to the immutable official image's actual binary. Registry annotations and published hashes alone are not sufficient. Native-addon/ELF dependency closure, final non-root/offline/read-only behavior and actual absence of glibc, loaders and gcompat are required. Complete package metadata/SBOM/raw scan matching must remain; removing scanner coverage is not remediation. Independent exact-candidate review precedes rollout.

The existing 180-second C01 timeout remains a real local failure. The reported 347 unit passes, two existing Windows symlink skips and corrected 15 compatibility passes do not establish full integration or coverage success. The amendment correctly requires diagnosis and complete Linux/hosted execution without raising limits, suppressing cases or narrowing fixture coverage. Historical same-tree hosted passes do not replace this missing result.

The 34 Kiota rows remain separate unresolved evidence. No musl plan approval creates an exception or exact-ledger publication authority. Unknown and fixed High/Critical refusal, full C01-C27/consumer checks, two hosted builds, final frozen-head approvals, all nine ordinary checks and main/release boundaries remain intact. The parent plan's expiry/sunset is not extended.

## Remaining pre-gate checks

1. Freeze and independently review the actual authenticated provenance result and final amendment bytes. If the direct official archive authenticates, omit an unnecessary source-build fallback or make any retained expansion explicit; neither path may use an unreviewed toolchain.
2. Append the exact final amendment hash to both existing plan and unit-test instructions without changing historical approved artifacts. Preserve the complete Testing Contract.
3. Reset the Plan Approval answer, generate the new fingerprint, register the exact native decision and present the material Experimental-support/libc/binary change. Only the real owner's answer and verified current protected receipt permit implementation.
4. Keep traceability honest: runtime screening stopped; musl has no completed implementation, compatibility or clean-scan result; U1 and R-15 remain open.

Final gate-readiness addendum follows after these checks. Read-only review did not run implementation tests or lifecycle-mutating sensors; it makes no new test-pass or receipt-validity claim.

## Frozen amendment and provenance review

Independently recalculated amendment SHA256 `4eb38b1e81d5fbd1b7bd48581fead4fe6022cf6bc0c0bc84842f7b65333bf60d` and its referenced runtime screening/provenance report SHA256 `9d0d5d63692fee2553c78bc086745880940c4d7cc212f334f9cd1c0f2a559a1d`. The final amendment removes the unnecessary source-build fallback; only the exact authenticated official prebuilt route is proposed. All other parent-plan constraints remain unchanged.

Independently hashed retained archive bytes to `601b3e1930a593f3d44af2d0dca978dad4bd8b4594c4f8268b67a33553b04c30` and extracted Node bytes to `7e027679034844bb06f53bead732673553cf5bb0de424bbbd257b35c989d34b0`. Inspected the retained verified checksum text and GPG transcript: the exact archive hash is listed, GOODSIG/VALIDSIG identify `5BE8A3F6C8A5C01D106C0AD820B1A390B168D356`, and TRUST_UNDEFINED is preserved. This steward inspected the specialist's signature evidence and independently recomputed content hashes; it did not independently execute GPG or claim a new key enrollment.

Minor wording clarification for the frozen provenance report: its late phrase that no binary hash is claimed before final checks is historical/general limitation wording. The authenticated upstream musl executable hash above is established. An assembled final-validator image/runtime identity, compatibility result or clean vulnerability scan is not established. The amendment correctly makes this distinction, so no material provenance finding blocks the plan and the historical report bytes remain preserved.

No blocking or major substantive finding remains. Exact candidate authentication, complete Alpine package/ELF inventory and all compatibility/security checks still precede rollout; this proposal is not acceptance of an unbuilt image.

## Plan/test linkage and gate setup checkpoint

Independently read both final plan and test-instruction appendices: each binds exact amendment SHA256 `4eb38b1e81d5fbd1b7bd48581fead4fe6022cf6bc0c0bc84842f7b65333bf60d`, preserves the parent closure plan and Testing Contract, and explicitly excludes source-build fallback, unknown reclassification, limit relaxation, main publication, merges, acceptance and release. The blank proposed question states Experimental support and the authenticated musl binary route clearly. Independently hashed the retained official-image executable to the same `7e027679034844bb06f53bead732673553cf5bb0de424bbbd257b35c989d34b0` as the authenticated archive's executable.

The initially generated fingerprint `7fe6fba5241adba82903f6f409349e334df4702882ca57318b6d9f8cc83c29ac` is not usable gate authority: the coordinator reports native decision registration refused a pre-planning source-floor mismatch after evidence commits. No owner question was presented and no approval or implementation was inferred. The coordinator must refresh through supported native routing, regenerate the binding and successfully register the exact prompt before presenting it. This setup issue does not require changing the reviewed normative amendment bytes. Substantive review is complete; final gate presentation remains pending that native binding repair and its final review.
