<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-09-12T09:45:50Z — Treat logical unit boundaries and deployment boundaries separately when an invariant requires one transaction. U4 Retail Data and U8 Planning/Purchasing retain separate entities, schemas, and ports while sharing one v1 deployment for atomic receipts.

- 2026-09-13T00:00:00Z — Separate supplier source authority by content and metadata rather than by one database label. Immutable original bytes live in S3-compatible object storage while MongoDB remains authoritative for source versions, extraction records, checksums, object references, candidates, and tombstones.

- 2026-09-13T06:40:00Z — Separate Model Lifecycle authority into immutable object bytes, MLflow experiment evidence, and a transactional retailer-scoped release ledger. Only the ledger controls the active Forecasting route.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-09-12T09:45:50Z — Record an explicit incomplete-review finding when the independent review cannot finish its initial attempt and one permitted retry. Do not infer readiness or silently skip the receipt.

- 2026-09-13T00:00:00Z — Model cross-store consistency with local authoritative transactions, transactional outboxes, idempotent consumers, and reconciliation. Do not invent a distributed transaction across object, document, relational, messaging, and vector stores.

- 2026-09-13T06:40:00Z — Do not infer automatic model promotion or a universal improvement threshold. Require complete comparable evidence plus an explicit Operator rationale, and permit a validated baseline to remain active.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-09-12T09:45:50Z — Prefer immutable all-or-nothing import versions and a drain-and-verify tenant cutover for the portfolio baseline. This trades partial progress and uninterrupted tenant writes for simpler conservation, replay, evidence, and single-authority guarantees.

- 2026-09-13T00:00:00Z — Preserve valid and rejected supplier items in one partial validation result while granting neither population business authority automatically. This trades a simpler all-or-nothing ingestion result for better correction evidence without weakening Manager-controlled term acceptance.

- 2026-09-13T06:40:00Z — Use one retailer-scoped multi-product fitted model instead of one model per product. This reduces local artifacts and training cost while preserving strict tenant isolation and per-product baseline evidence.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-09-12T09:45:50Z — U1 Contracts must add provider-side inventory and demand import/status schemas, correct C03 event ownership, and distinguish the C08 in-process v1 receipt path from its future REST seam.

- 2026-09-12T09:45:50Z — Later NFR stages must set recovery, retention, retry, load-protection, and performance values before implementation claims are complete.

- 2026-09-13T00:00:00Z — Later contract and ADR maintenance must reflect S3-compatible original-source storage, Manager-only accepted-term mutations, source-deletion fencing, and server-owned retrieval generation routes.

- 2026-09-13T00:00:00Z — Later NFR and evaluation work must set retry budgets, source/index retention, query/top-k limits, parser and runtime versions, embedding thresholds, and measured local resource requirements.

- 2026-09-13T06:40:00Z — Later NFR and implementation work must pin baseline periods, rolling-origin cadence beyond three complete horizons, job deadlines/retries, resource requests, retention, and recovery objectives; Forecasting still owns the freshness threshold.

- 2026-09-13T06:40:00Z — Before the Functional Design stage gate, repair the supplier-knowledge review findings for cross-store deletion fencing, a validated-but-inactive index state, and independently persisted object/index cleanup progress.
