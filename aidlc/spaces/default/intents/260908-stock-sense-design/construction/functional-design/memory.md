<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-12T09:45:50Z — Treat logical unit boundaries and deployment boundaries separately when an invariant requires one transaction. U4 Retail Data and U8 Planning/Purchasing retain separate entities, schemas, and ports while sharing one v1 deployment for atomic receipts.

- 2026-09-13T00:00:00Z — Separate supplier source authority by content and metadata rather than by one database label. Immutable original bytes live in S3-compatible object storage while MongoDB remains authoritative for source versions, extraction records, checksums, object references, candidates, and tombstones.

- 2026-09-13T06:40:00Z — Separate Model Lifecycle authority into immutable object bytes, MLflow experiment evidence, and a transactional retailer-scoped release ledger. Only the ledger controls the active Forecasting route.


2026-09-11T09:55:00Z — Treated the Contracts Unit as the source of contract-governance obligations and evidence shapes. Runtime Units remain responsible for proving authorization, message delivery, atomicity, deduplication, CI isolation, and release behaviour.
<!-- aidlc-wave-memory:contracts:a6975524ba50b50d089adcc8c3d40d830f3933272e9926d06bcb6bec4a94ca70 -->

2026-09-11T09:55:00Z — Treated the inventory-import requested/completed/failed messages plus the authoritative audit event as an initial end-to-end fixture, while the coverage matrix keeps later boundaries visibly incomplete until their own evidence exists.
<!-- aidlc-wave-memory:contracts:24c09dc64a402e52f72b1268f95b3f5eb526d4f0b7bfd95b8ce69da3ec1883c6 -->

2026-09-11T20:01:07Z — Separated U3 authorization sessions and refresh families from the U11 browser cookie. U3 authenticates an account and issues bounded protocol artifacts; U11 owns cookie, CSRF, token storage, and browser-session presentation.
<!-- aidlc-wave-memory:identity-access:6f42c74b90ca3bf110f50743500c748013b3f8bf4289fd47cce4f72afd3c551f -->

2026-09-11T20:01:07Z — Kept retailer memberships, roles, placement generation, and current retailer authorization in U4 Tenant Directory. Identity tokens carry a stable account or workload reference and cannot convert tenant context into authority.
<!-- aidlc-wave-memory:identity-access:83beda755de02e51623a8894e35a868912c3008a32a081bf27f47810bde555ad -->

2026-09-11T20:01:07Z — Interpreted the owner-confirmed Google policy as explicit account linking by immutable external issuer and subject after recent local reauthentication. Matching email and unlinked Google sign-in create no account, membership, or session.
<!-- aidlc-wave-memory:identity-access:e730e372c080a9fd305d304b2f089f5a7a7d83ebe0aa98173bf9d9fdb3974586 -->

2026-09-12T09:45:50Z — Treated U4 Retail Data and U8 Planning/Purchasing as separate logical modules and schemas inside one transaction-capable v1 deployment. This preserves the accepted atomic receipt invariant while retaining public-port and REST extraction seams.
<!-- aidlc-wave-memory:retail-data:a4bde65873295a9f029a45c2d21ace4a81343adc209ef606e3370f5377b40120 -->

2026-09-12T09:45:50Z — Normalized the earlier singular membership role into independent Planner and Manager role grants because one confirmed demo identity holds both roles.
<!-- aidlc-wave-memory:retail-data:e8b3300c713994a56d966777bda9abf8a128898bce761f1bf0e5f3dcbc04ba6c -->

2026-09-12T09:45:50Z — Kept on-hand stock under Inventory authority and dated inbound under Purchasing authority. A planning snapshot references both versions without copying ownership.
<!-- aidlc-wave-memory:retail-data:4c30899ffe4007529fe1a2273d259c15204c890c02eae1cb7c40a8b2dd5fa22d -->

2026-09-12T09:45:50Z — Assigned `retail.reference.changed` semantics to U4, with Supplier Knowledge and other downstream units as consumers of that versioned reference event.
<!-- aidlc-wave-memory:retail-data:c2480d3c743a5423507a8cb14e5e6ff1f76db35dfc16cb3e025f784fe9e29893 -->
## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-09-12T09:45:50Z — Record an explicit incomplete-review finding when the independent review cannot finish its initial attempt and one permitted retry. Do not infer readiness or silently skip the receipt.

- 2026-09-13T00:00:00Z — Model cross-store consistency with local authoritative transactions, transactional outboxes, idempotent consumers, and reconciliation. Do not invent a distributed transaction across object, document, relational, messaging, and vector stores.

- 2026-09-13T06:40:00Z — Do not infer automatic model promotion or a universal improvement threshold. Require complete comparable evidence plus an explicit Operator rationale, and permit a validated baseline to remain active.


2026-09-11T09:55:00Z — The Mermaid CLI package could not be installed because the package registry connection failed. Used the local deterministic validator to parse the YAML/JSON sources, verify traceability and relationships, and structurally validate all nine Mermaid diagrams and text fallbacks.
<!-- aidlc-wave-memory:contracts:369883bdd93fa938f22ecaad24abb859d2a0006b77a1e72ab0ef2a6aa53f77c5 -->

2026-09-11T09:55:00Z — The declared architecture reviewer could not complete within its initial window or the one permitted retry because reviewer-scope enforcement blocked its broad shell target. Recorded the protocol-defined terminal NOT-READY fallback; no design defect was reported and no reviewer appendix was fabricated.
<!-- aidlc-wave-memory:contracts:d45032a4522b8efed30e82712ad5d8c37c89ed242337e8d35baba634b9e16f6a -->

2026-09-11T09:55:00Z — Reviewer attempts made before the engine fingerprint request were treated as unreceipted and excluded from lifecycle evidence. The valid request and bounded retry were recorded before their corresponding dispatches.
<!-- aidlc-wave-memory:contracts:1507e49251d6ab707c7637fdb02c637df10a63a0636c55b0aeb750f1b2ff0396 -->

2026-09-11T09:55:00Z — The resumed Unit reached final verification without an earlier UNIT_STARTED receipt. The lifecycle boundary cannot be backdated; start and completion receipts are recorded now around final verification, with the earlier artifact and question events retained in the audit.
<!-- aidlc-wave-memory:contracts:d8607e0002cf8ac83f789d27c8f5ace48fa37c814e3b49eb2e9da3c283085d58 -->

2026-09-11T20:01:07Z — The framework validity view continues to report advisory drift for earlier stages after the runtime graph was recompiled because authored inputs changed after their original receipts. The AI-DLC skill requires validity advisories to remain detection-only and forbids rerouting the active stage.
<!-- aidlc-wave-memory:identity-access:06cfd70e7f802c4d78cfd24eed07ddd5f8593ca6ca5b87eb97fd542f4433ee94 -->

2026-09-11T20:01:07Z — A repository-local Mermaid CLI was unavailable, so no new dependency was introduced on the design branch. Mermaid blocks were kept to standard state, sequence, and ER syntax with a text fallback for every diagram; the architecture reviewer inspected the rendered structure.
<!-- aidlc-wave-memory:identity-access:cdf92505f0d279913c48570f6435273af5c15a5666dfab71cb7660c382e4c5d9 -->

2026-09-11T20:01:07Z — The advisory architecture reviewer reported three major and one minor finding. Per the single-pass advisory review contract, the reviewed artifacts remain frozen and the findings are carried to the human decision instead of being silently repaired.
<!-- aidlc-wave-memory:identity-access:cf9efc36de7e4d763ce259cb043b4ae0b7fac40bafdb86c4b23c41a9898a0f27 -->

2026-09-12T09:45:50Z — The confirmed transaction-boundary decision supersedes the inception unit catalogue's statement that U4 and U8 are separately deployed services in v1. Their logical unit identities remain stable for lifecycle ownership and later extraction.
<!-- aidlc-wave-memory:retail-data:38193eadb6360d5bd2224cc5c29a6f7fb0760d5d80eca3f8287dba47a492d0eb -->

2026-09-12T09:45:50Z — The architecture reviewer did not complete either the initial bounded attempt or its one permitted retry. The workflow recorded a terminal NOT-READY fallback finding instead of claiming that architecture review passed.
<!-- aidlc-wave-memory:retail-data:c2ff8931d956b76ef9878d2adbb760303d79226769d7ac7ea8cec37f64dfba00 -->

2026-09-12T09:45:50Z — A Mermaid command-line validator is unavailable in the repository environment. All seven diagrams use standard stateDiagram-v2 or erDiagram syntax, have balanced fences, and are paired with authoritative prose or tables.
<!-- aidlc-wave-memory:retail-data:625596897dacbaec0448025a19b3c3e80c4bfcbe15b0de2cfaf70508181ec8ea -->
## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-09-12T09:45:50Z — Prefer immutable all-or-nothing import versions and a drain-and-verify tenant cutover for the portfolio baseline. This trades partial progress and uninterrupted tenant writes for simpler conservation, replay, evidence, and single-authority guarantees.

- 2026-09-13T00:00:00Z — Preserve valid and rejected supplier items in one partial validation result while granting neither population business authority automatically. This trades a simpler all-or-nothing ingestion result for better correction evidence without weakening Manager-controlled term acceptance.

- 2026-09-13T06:40:00Z — Use one retailer-scoped multi-product fitted model instead of one model per product. This reduces local artifacts and training cost while preserving strict tenant isolation and per-product baseline evidence.


2026-09-11T09:55:00Z — Chose consumer-local generated outputs with pinned generators and CI regeneration checks so each consumer owns its integration while drift remains detectable.
<!-- aidlc-wave-memory:contracts:489567d222601b818468f66e725f3650ca7640ab732423b6bb3339e39247a08b -->

2026-09-11T09:55:00Z — Chose the Bolt integration branch as the story comparison baseline, main as the Bolt PR baseline, and the latest release tag as the release baseline. Breaking changes require an explicit approved major-version exception.
<!-- aidlc-wave-memory:contracts:e85f5ddd2149581288616c7aa19cb6d5b9f7bc1ac4e0f6e4c9c85f698c3afa34 -->

2026-09-11T20:01:07Z — Chose a 30-minute idle and 8-hour absolute human authorization session with 10-minute access tokens and one-time rotating refresh credentials. Reuse revokes the refresh family and session, prioritizing replay containment over seamless recovery.
<!-- aidlc-wave-memory:identity-access:7fc22476bdcb87b1edfb03a8c5961e68e1d515f2249f86d6ca18b1900b7f7dbb -->

2026-09-11T20:01:07Z — Chose a 90-day key-rotation schedule with retention derived from the last issuance: 15 minutes for signing verification and 8 hours 5 minutes for session-data decryption. Missing required material fails closed and requires controlled recovery.
<!-- aidlc-wave-memory:identity-access:7e18f76f38ad7926f936633883f7db3407d185705669e9f5fc9ab5fbbcf04f34 -->

2026-09-11T20:01:07Z — Kept Google optional and fixed stable local HTTPS identities so a clean reviewer can complete local sign-in without owner secrets while the owner can record separate real-federation smoke evidence.
<!-- aidlc-wave-memory:identity-access:d9e152021e05d4c539e372136fda0f3c5b6e80fef11563b32448aa7d881bbc80 -->

2026-09-12T09:45:50Z — Chose all-or-nothing import batches and bounded diagnostics over partial row acceptance. Corrections create immutable versions, simplifying conservation, replay, and reviewer evidence at the cost of re-uploading a corrected file.
<!-- aidlc-wave-memory:retail-data:def6d698bfab7ba06520af8d4a7b40782ac48beb89fa954f3d8b4a37b8556d6f -->

2026-09-12T09:45:50Z — Chose a drain-and-copy tenant extraction with mutation downtime for the selected retailer. This keeps one authority and makes rollback rules explicit instead of introducing dual-write conflict resolution.
<!-- aidlc-wave-memory:retail-data:f2a2d2c38c4a6de6ebee5ee136d96fd681841bf232f67339568e1f439cc58c87 -->

2026-09-12T09:45:50Z — Chose 60-second versioned cache entries with compare-and-set stale-fill protection. The design accepts authoritative fallback cost while prohibiting Redis from influencing authorization or purchasing correctness.
<!-- aidlc-wave-memory:retail-data:ac4ed6b8fb1877ce0923f8102329da3e99940141d2e6c5e754e61b21d7bc56da -->

2026-09-12T09:45:50Z — Chose immutable stock movements plus transactionally maintained positions rather than ledger-only reads. This adds reconciliation obligations but supports bounded local reviewer performance and explainability.
<!-- aidlc-wave-memory:retail-data:151be070fff1e17fe539484accd3fc33eec11ebc4215ee20e4ce9fa1866f505e -->
## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-09-12T09:45:50Z — U1 Contracts must add provider-side inventory and demand import/status schemas, correct C03 event ownership, and distinguish the C08 in-process v1 receipt path from its future REST seam.

- 2026-09-12T09:45:50Z — Later NFR stages must set recovery, retention, retry, load-protection, and performance values before implementation claims are complete.

- 2026-09-13T00:00:00Z — Later contract and ADR maintenance must reflect S3-compatible original-source storage, Manager-only accepted-term mutations, source-deletion fencing, and server-owned retrieval generation routes.

- 2026-09-13T00:00:00Z — Later NFR and evaluation work must set retry budgets, source/index retention, query/top-k limits, parser and runtime versions, embedding thresholds, and measured local resource requirements.

- 2026-09-13T06:40:00Z — Later NFR and implementation work must pin baseline periods, rolling-origin cadence beyond three complete horizons, job deadlines/retries, resource requests, retention, and recovery objectives; Forecasting still owns the freshness threshold.

- 2026-09-13T06:40:00Z — Before the Functional Design stage gate, repair the supplier-knowledge review findings for cross-store deletion fencing, a validated-but-inactive index state, and independently persisted object/index cleanup progress.

2026-09-11T09:55:00Z — Quantitative retry, delivery, replay, and recovery limits remain for NFR Requirements and Infrastructure Design; this Functional Design requires every policy to be bounded and forbids unbounded processing.
<!-- aidlc-wave-memory:contracts:4baa760f903380ac3867909e1991cf33bf43408a184573242b98b4136f092504 -->

2026-09-11T09:55:00Z — The first release has no prior tag, so its compatibility baseline must be explicitly declared and approved before release evidence can pass.
<!-- aidlc-wave-memory:contracts:ec95030d205627d4c422e9045b59d99acca61ec5067ecd15d2bbbc711ca300a3 -->

2026-09-11T20:01:07Z — R-01 requires an explicit consumed refresh-token generation or retained-digest model so reuse can be distinguished from an unknown invalid token.
<!-- aidlc-wave-memory:identity-access:22c622100399a952c54305cf9130b69d4a9acdeaeb4f8ad1556d13e70af4794d -->

2026-09-11T20:01:07Z — R-02 requires a C15-compatible identity-event profile for retailerless activity, complete actor/idempotency/data mapping, and audit-to-outbox cardinality aligned with denied events.
<!-- aidlc-wave-memory:identity-access:fb0adeed22e5bb26509fee7822f15ddb9e4774aa0c2c96c908487168d0222e03 -->

2026-09-11T20:01:07Z — R-03 requires reconciliation between the confirmed registered BFF callback `/signin-oidc` and C16's browser-facing `/auth/callback` operation.
<!-- aidlc-wave-memory:identity-access:191d369fd22bdd61508e4623a51b052deeb6d2146cc8165e0d1e7f40326f8aee -->

2026-09-11T20:01:07Z — R-04 requires the exact atomic failure-counter reset behavior when a 15-minute credential lock expires, including concurrent attempts at the boundary.
<!-- aidlc-wave-memory:identity-access:dd22f8a2a1d2f7ef6093b599eff70ae5a602e3463d1886d3bba06af69026982e -->

2026-09-12T09:45:50Z — U1 Contracts must add provider-side inventory and demand import intake/status schemas, correct C03 event ownership, and describe the C08 in-process v1 receipt path versus its future REST extraction seam.
<!-- aidlc-wave-memory:retail-data:374dd706003b153ff7fee8ebdd9170bd2dac3366553b83b6b6e82b8b8aa558f3 -->

2026-09-12T09:45:50Z — Later NFR stages must set recovery objectives, archive and backup-expiry periods, queue retry/backoff/DLQ limits, safe fallback load, and measurable performance thresholds.
<!-- aidlc-wave-memory:retail-data:68906d6b41b6217fbb8f465e6be72f50a556509eca6635120fda921541ecca6e -->

2026-09-12T09:45:50Z — Physical separation of U4 and U8 requires a newly reviewed consistency and ownership decision; replacing the in-process port with a network call does not preserve receipt atomicity.
<!-- aidlc-wave-memory:retail-data:9bead89a8bd85d993162433eb1280083494db0934d94bb5b962ea14ccf31c8f3 -->
