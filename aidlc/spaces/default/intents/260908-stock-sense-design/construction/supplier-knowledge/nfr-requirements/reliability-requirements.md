# Supplier Knowledge Reliability Requirements

Unit: U5 Supplier Knowledge (`supplier-knowledge`)

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR7.1 | MongoDB and PostgreSQL transactions shall each commit their own authoritative state, audit, and outbox. RabbitMQ delivery uses confirms, inbox deduplication, acknowledgement after commit, five attempts with one-to-30-second backoff, seven-day DLQ retention, and audited replay batches of at most 100. | Interrupt object upload, Mongo commit, PostgreSQL acceptance/fence, publisher, consumer, embedding, and cleanup around every boundary. Prove exact-redelivery deduplication, changed-payload conflict, preserved identity, DLQ, and safe replay. | Preserve local committed work and expose reconciliation; never claim a cross-store distributed transaction or exactly-once transport. |
| NFR9.1 | Source/extraction metadata, accepted-term provenance, tombstones, and chunk manifests remain for the seeded dataset's life. Original bytes remain online 90 days and encrypted in archive one year; superseded valid indexes remain 30 days, audit 90 days, logs seven days, and backups 30 days. | Retention and restore tests preserve legal/reference fences and prove expired bytes, chunks, or generations cannot reappear or become active. | Retain data when dependencies or holds are unresolved; keep failed cleanup visible and retryable. |
| NFR11.1 | A clean reviewer shall download pinned embedding artifacts, ingest real CSV/text-PDF fixtures, build both candidate indexes, run the held-out evaluation, activate one default, retrieve citations, and compare accepted terms without owner credentials or GPU use. | Evidence records model terms/revisions/checksums, downloads, hardware, corpus/query checksums, quality/resource metrics, selected/rejected rationale, and actual CPU inference. | Mark reproducibility failed; cached models, fixtures-only retrieval, or owner-machine evidence cannot substitute. |
| NFR13.2 | Flyway failure, incompatible PostgreSQL routines, Mongo index/migration failure, or incompatible source/parser/vector schema shall block the affected rollout or generation activation. | CI/deployment tests cover migration failure, rollback compatibility, least privilege, model/dimension/config mismatch, and partial generation cleanup. | Stop rollout/activation; never repair by direct table access or in-place active-index mutation. |
| NFR15.2 | Restore MongoDB metadata, PostgreSQL terms/fences, and source objects within the inherited RPO 24 hours/RTO four hours; reconcile versions/checksums/tombstones/outbox/inbox, then fully rebuild and validate Qdrant before healthy retrieval. | A clean-target drill records elapsed time, data loss, source/object checksums, dependency fences, cleanup states, accepted-term provenance, rebuilt counts/digests, and route activation. | Keep retrieval unavailable and report missed targets or reconciliation gaps as failed/limited evidence. |

## Degraded behavior

Qdrant outage disables retrieval but not authoritative term reads. Object-store
loss quarantines affected sources and citations. MongoDB or PostgreSQL authority
failure rejects dependent mutations. Telemetry/OpenSearch outage cannot block
authoritative commits.
