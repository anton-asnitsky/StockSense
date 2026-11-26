# Follow-up proposal for protected-main compatibility

Status: assessment only; unapproved. The verified U1 ledger/SBOM plan explicitly permits this proposal but excludes protected-main implementation, publication and every merge. No executable exception ledger or approval reference is created here.

## Why working-branch changes cannot clear U1 alone

The current protected main baseline is 8cce4f8040ad0767fca1b1ab14a00bb067a66b76. Its ledger schema is v1 and authorizes only the historical candidate tree sha256:24d34f5394aaedb15d768ecbedc93ac760c0861b8eacb3b52a765da66ae17b76 and MessagePack2.5.302 finding. The current main runtime is distinct from the patched Noble candidate. Its existing row expires November25; that date does not extend to a new candidate. PR73 is closed and its proposal is obsolete.

The reviewed working-branch change selects exact execution/runtime v2 pairs. A multi-baseline ledger on main would therefore also need a compatible main verifier and a separately measured main candidate. Adding only the three PR groups would fail main's own build. A draft PR does not become authoritative until its exact owner-approved merge; no draft or local simulation makes hosted U1 green.

## Proposed next scope, requiring a separate plan

Prepare a focused prerequisite from current main. Assess and port only the shared verifier/runtime-evidence/SBOM capabilities needed for v2, with the same whole-ledger validation and independent source/runtime comparisons reviewed here. Relevant paths include src/image-ledger.mjs, src/image-evidence.mjs, src/kiota-runtime-manifest.mjs, src/sbom-context.mjs, src/sbom.mjs, src/candidate-provenance.mjs, scripts/image-evidence.mjs and scripts/build-sbom.mjs, with their direct tests and test-script registration under tools/contracts. Do not copy the full Bolt or canonical contract changes into main.

Main's own toolchain must be screened afresh. Assess the already reviewed pinned validator and patched Noble Kiota recipes as a separate main-runtime prerequisite, including authenticated build inputs and generator/profile compatibility. Known fixed High/Critical findings cannot be waived. The main source, runtime, consumer outputs and execution fingerprint must be measured after that reviewed implementation; they cannot be inferred from the PRs' runtime equality. Preserve canonical inputs and obtain new generated-output evidence wherever main's own profile requires it.

After the main candidate and final PR scans exist, prepare a ledger proposal with exactly the needed final execution/runtime groups, including main's own group if different. Reuse no approval from the historical MessagePack row. The ten supported not-affected rows and four unresolved Medium rows require their own governed decisions for the measured runtime; picomatch remains a separate dependency finding. Retain actual findings, vendor evidence, controls, owner, validity period and real approval references. No assumed exception count, placeholder approval or invented expiry may enter the authoritative ledger.

Validate main and all three PR groups against their own retained raw scans and combined SBOM receipts; test missing/extra/expired/changed findings and cross-baseline borrowing. Run the main prerequisite's applicable hosted tests, scans and U2 exact-head owner check. Assess that PR's own green-CI feasibility before requesting any merge; do not disable required checks or use a local simulation as its result. Any remaining security-policy change requires explicit scope and independent review.

## Separate owner decisions

A new protected implementation-plan approval is needed for main changes. Finding-specific dispositions, exact-base/head U2 comments and an exact PR merge decision remain separate. The current instruction prohibits every merge, so this proposal remains inert. No U1 acceptance, R-15/R-16 completion or C01 release is inferred. The working-branch implementation and its final scan evidence should be reviewed first before opening the next plan gate.


## Resume verification, 2026-11-26

Live main still resolves to 8cce4f8040ad0767fca1b1ab14a00bb067a66b76. Its historical MessagePack row expired at 2026-11-25T00:00:00Z and cannot authorize a current run. This adds expiry to the previously recorded candidate/schema mismatch; no date extension or exception was made. The approved working-branch implementation receipt remains valid on resume.
