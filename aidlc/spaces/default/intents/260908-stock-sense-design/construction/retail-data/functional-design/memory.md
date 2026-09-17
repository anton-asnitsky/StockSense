<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. -->
> This file is kept up to date while the stage runs. Observations capture reusable method lessons rather than replacing approved artifacts.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

2026-09-12T09:45:50Z — Treated U4 Retail Data and U8 Planning/Purchasing as separate logical modules and schemas inside one transaction-capable v1 deployment. This preserves the accepted atomic receipt invariant while retaining public-port and REST extraction seams.

2026-09-12T09:45:50Z — Normalized the earlier singular membership role into independent Planner and Manager role grants because one confirmed demo identity holds both roles.

2026-09-12T09:45:50Z — Kept on-hand stock under Inventory authority and dated inbound under Purchasing authority. A planning snapshot references both versions without copying ownership.

2026-09-12T09:45:50Z — Assigned `retail.reference.changed` semantics to U4, with Supplier Knowledge and other downstream units as consumers of that versioned reference event.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

2026-09-12T09:45:50Z — The confirmed transaction-boundary decision supersedes the inception unit catalogue's statement that U4 and U8 are separately deployed services in v1. Their logical unit identities remain stable for lifecycle ownership and later extraction.

2026-09-12T09:45:50Z — The architecture reviewer did not complete either the initial bounded attempt or its one permitted retry. The workflow recorded a terminal NOT-READY fallback finding instead of claiming that architecture review passed.

2026-09-12T09:45:50Z — A Mermaid command-line validator is unavailable in the repository environment. All seven diagrams use standard stateDiagram-v2 or erDiagram syntax, have balanced fences, and are paired with authoritative prose or tables.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

2026-09-12T09:45:50Z — Chose all-or-nothing import batches and bounded diagnostics over partial row acceptance. Corrections create immutable versions, simplifying conservation, replay, and reviewer evidence at the cost of re-uploading a corrected file.

2026-09-12T09:45:50Z — Chose a drain-and-copy tenant extraction with mutation downtime for the selected retailer. This keeps one authority and makes rollback rules explicit instead of introducing dual-write conflict resolution.

2026-09-12T09:45:50Z — Chose 60-second versioned cache entries with compare-and-set stale-fill protection. The design accepts authoritative fallback cost while prohibiting Redis from influencing authorization or purchasing correctness.

2026-09-12T09:45:50Z — Chose immutable stock movements plus transactionally maintained positions rather than ledger-only reads. This adds reconciliation obligations but supports bounded local reviewer performance and explainability.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

2026-09-12T09:45:50Z — U1 Contracts must add provider-side inventory and demand import intake/status schemas, correct C03 event ownership, and describe the C08 in-process v1 receipt path versus its future REST extraction seam.

2026-09-12T09:45:50Z — Later NFR stages must set recovery objectives, archive and backup-expiry periods, queue retry/backoff/DLQ limits, safe fallback load, and measurable performance thresholds.

2026-09-12T09:45:50Z — Physical separation of U4 and U8 requires a newly reviewed consistency and ownership decision; replacing the in-process port with a network call does not preserve receipt atomicity.
