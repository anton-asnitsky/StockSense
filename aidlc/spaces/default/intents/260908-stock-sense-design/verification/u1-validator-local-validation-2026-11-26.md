# U1 validator repair local validation

Reviewed production commit: 59c34bae1e031c0db032f99f2ea1d12f67715e76, branch codex/u1-validator-repair, based on reviewed ledger/SBOM commit 3fef097f5a7f87885d6453dfd3017ec23751a1b1. Protected receipt and normative scope are in u1-validator-plan-approval-2026-11-26.md. Independent review: u1-validator-implementation-review-2026-11-26.md.

The coordinator used the verified Windows Node 24.22.3 executable recorded in u1-node24223-provenance-2026-11-26.md. The frozen pnpm11.25.0 installation completed without changing the lockfile. Its update-notification request failed, but all433 locked packages were available and installation exited0; no package-version change or audit suppression was used.

Validation:
- Full package ESLint and TypeScript checks: exit0.
- Node test command covering image-evidence.test.mjs, image-ledger.test.mjs, sbom.test.mjs and integration/sbom-context.test.mjs:50tests,50passed,0failed,0skipped,0TODO.
- Independent security reviewer separately ran23scan/ledger tests on Node24.22.3:allpassed.
- Normal build-standards-image.mjs built the actual validator, downloaded production packages through npm/pnpm, checked source binding, verified the signed-distribution binary hash and passed non-root offline version smoke.
- Final stable-recipe build returned image sha256:059e78e561ba9b7d2c7b73f81132573d255ca6eb4786e0df75e7de2e68a4efca and tool-source digest sha256:323aa96201e2473cf42423418a40e7ad53e2a869c57f02c63c4f90c48d83f0d8. Both builder and copied final binary match SHA256a7ec1b37e6ff9d187e4198c5b6df9a4eb1c74dd31804fb3bac55cc4ceca1ac01.
- git diff --check passed; only Git's CRLF-to-LF normalization notice appeared for the edited test file.

Three source-manifest entries now cover the historical20-match fixture, its provenance and the previously omitted image-evidence unit test. Manifest now has200distinct paths; all11repair paths are included. The historical fixture preserves all15Node findings and5unknown glibc findings; sevenfixedHigh findings still block. This historical fixture is not a fresh vulnerability report.

Hosted proof launched as run45866784501 from diagnostic commit23b50602da927d1a0dc0ac193e3315ff612ea87c. Both candidate pins equal production59c34bae1e031c0db032f99f2ea1d12f67715e76. Final proof workflow file SHA256fdba21e7e81fa8b001251bf6d8c1337b73031ec40de13c6d16ffa7ca0b7a34c0. Hosted results are pending and must be recorded separately; this local record does not establish full coverage, C01-C27 validation, fresh image disposition, ordinary U1 green, merge readiness, acceptance or release.
