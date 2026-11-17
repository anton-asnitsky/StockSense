# R-15 independent scan review and proposed ledger retirement

PR #76 head `6638de5303c95c3a50fa66d550be33de4627c6a8` and Bolt base `402ace3b195c291a756ed230a24a73199ef8349a` produced test merge `836fd77abbe0daec025d8c471385681c0dc20a3c`. Two full workflow attempts built this revision independently. Both vulnerability and secret reports passed with zero findings. Both U1 jobs failed at verification against the protected-main ledger. The first attempt was archived before the full rerun. The retained image and security archives were independently downloaded by unique artifact ID and verified against GitHub's SHA-256 digests. [Attempt 1](https://github.com/anton-asnitsky/StockSense/actions/runs/44114996835/attempts/1) · [Attempt 2](https://github.com/anton-asnitsky/StockSense/actions/runs/44114996835/attempts/2).

The repository's `verifyRawImageScan` matched each normalized report to its raw Grype output, database and receipt. `readImageEvidence` reconciled each finding to the image-specific CycloneDX PURL and version. `readKiotaRuntimeEvidence` reproduced the normalized runtime digest from each runtime manifest and its own SBOM. The exact image IDs differed across builds. Both normalized manifests contained 1,776 entries and produced `sha256:d701920b3075f3b892078cdfd498abb25f731ec561c8c9ec1d07134cfcac9188`. The [machine-readable comparison](u1-r15-kiota-138-pr76-44114996835.json) retains the scan and inventory bindings, all 20 finding identities and fix versions, package URLs and archive IDs.

| Hosted image | CycloneDX components | Packages with name, version and PURL | Findings per attempt |
| --- | ---: | ---: | --- |
| Validator | 683 | 314 | 0 |
| Kiota 1.38.0 | 420 | 95 | 18 Medium, 1 Low, 1 Negligible |

Both Kiota inventories contain `pkg:nuget/MessagePack@2.5.307`. Neither scan reported GHSA-qhrr-8q5h-9q3h. Both inventories identify Ubuntu libc6 2.39-0ubuntu8.9. Six Medium libc6 findings have a published fix in 2.39-0ubuntu8.12, including CVE-2026-84243. Thirteen findings have scanner fix state `not-fixed` and one has `wont-fix`. Those counts span libc6, libicu74, libssl3t64 and openssl. A Debian package and its source-package finding can appear as distinct PURLs. Both counts and the distinct identities are retained.

No libexpat package was enumerated in either Kiota SBOM. Neither hosted runtime manifest contains a pathname containing `expat`. A separate unstarted container created from immutable Linux/amd64 runtime base `sha256:e7e90bfc3ce16f9efdf18c25c7e4876af4ffba7ea50582878f6ea05b1e04a7ec` had 1,574 exported filesystem entries, zero paths containing `expat`, and explicit libc, loader and Chisel manifest paths. These checks concern installed packages and filesystem identities; they cannot detect every statically embedded implementation.

## Proposed protected-main change for later owner review

The v1 ledger at main commit `8cce4f8040ad0767fca1b1ab14a00bb067a66b76`, blob `8302aa82184068e1d6f741f669362e905490b495`, contains one row for the historical Kiota 1.35.0 / MessagePack 2.5.302 finding. Its candidate digest and package version differ from the tested Kiota 1.38.0 candidate. Both hosted jobs refused the ledger before producing a successful receipt. Neither attempt established an approved combined SBOM or release attestation.

1. Produce a reviewed runtime candidate that addresses the six fixable libc6 findings and reassess every remaining finding with exact image, package, version and current scanner evidence.
2. If a subsequent candidate has zero findings requiring disposition, propose a focused PR removing the obsolete row from `security/image-exceptions.json`, retaining its schema and an empty `exceptions` array. Validate that proposal as a draft against fresh evidence. Any candidate with residual findings requires remediation or separate owner review of each eligible finding under the existing policy.
3. Obtain the repository owner's exact-base/exact-head protected-path approval and separate merge decision before changing main. After the protected source is updated, rerun actual ledger verification, combined SBOM assembly and provenance against that protected blob.

Retiring the obsolete row by itself leaves 20 findings without a disposition on the tested revision. This proposal records no exception, ledger change, merge approval, or acceptance.
