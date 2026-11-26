# Independent security review: U1 validator remediation plan

Date: 2026-11-26. Reviewer: StockSense security/identity specialist, independently dispatched for read-only plan review. Reviewed `u1-validator-remediation-plan-2026-11-26.md`, the current scan review and primary-source plan inputs, plus the existing candidate Dockerfile and image-evidence validation rules. No implementation was performed or approved.

## Verdict

**Plan ready for the owner's protected approval gate. No blocking or major technical plan findings.** This is plan readiness only, not a protected approval receipt, implementation approval, green-CI claim, risk acceptance, or merge authorization.

## Assessment and implementation acceptance criteria

- **Node consistency:** The plan updates the validator, immutable builder, relevant host/workflow expectations together and requires vendor checksum, actual binary/platform/provenance verification. The existing Dockerfile copies `/usr/local/bin/node` from its builder into the final image; implementation evidence must therefore bind the copied builder binary to the verified release distribution, not merely verify an unrelated downloaded archive or a version string. Stop on unverifiable distribution. Preserve the existing pinned final runtime unless separately authorized.
- **Package identity:** Generic PURL support is explicitly restricted to the observed binary Node identity, with exact name/version and independent SBOM membership. This appropriately avoids making every arbitrary generic/binary identity admissible. Include duplicate/ambiguous identity and encoded/malformed PURL cases where relevant to the chosen parser; do not weaken existing package-type checks.
- **Unknown fix metadata:** Reporting an explicitly empty scanner state as unknown preserves the row. The plan keeps unknown disposition exception-ineligible and requires the ordinary gate to remain failed where unresolved findings remain. Existing exception validation accepts only fixed/not-fixed/wont-fix, while reporting permits unknown; preserve that distinction. A missing fix object or malformed metadata must not become an accepted empty state. No dropped rows or invented fixes are allowed.
- **Tests:** The named raw fixtures, identity/binding failures, missing/empty fix cases, fixed High/Critical controls, row conservation, existing v1/v2 regressions, full suites/coverage, pinned CLI and generated consumer checks are proportionate. Both hosted proof lanes must retain failure artifacts. Final success still requires ordinary checks on actual story heads; local/simulated evidence is insufficient.
- **Scope:** Fresh audit of the unchanged lockfile is appropriate for the withdrawn picomatch advisory. No speculative dependency update, blind Wolfi update, Kiota runtime change, suppression, risk exception, required-check change, candidate-issued approval, protected-main publication, merge, U1 acceptance or C01 release is authorized. Unresolved glibc and expired/incompatible ledger authority explicitly prevent a promise of green CI from this plan alone.

## Residual risk

The exact five glibc dispositions and the separate protected-ledger publication dependency remain open. The owner must receive a truthful blocked result if either prevents ordinary checks passing. Subsequent implementation and retained scan evidence require independent review; this plan review cannot substitute for it.
