# Supplier Knowledge Observability Requirements

Unit: U5 Supplier Knowledge (`supplier-knowledge`)

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR10.2 | Emit bounded OpenTelemetry signals for upload/admission, queue/lease, object I/O, parse/page outcomes, validation, chunking, embedding, Mongo/PostgreSQL routines, outbox/inbox/DLQ/replay, deletion fences/cleanup branches, index builds/routes, retrieval/citations, and telemetry loss. | Cardinality/canary tests prove required signals without source text, product/supplier IDs, user IDs, raw errors, or model prompts as labels. | Aggregate/drop unsafe labels, count loss, and preserve authoritative work. |
| NFR10.3 | Alert at 30 seconds of outbox or processing lag, on queue deadline/overflow, any deletion-fence or cleanup reconciliation failure, missing active route, checksum/count mismatch, and when NFR1 latency remains breached ten minutes. | Synthetic probes trigger/resolve every alert with threshold, revision, runbook, and notification evidence. | Missing telemetry creates an observability-degraded alert, never a healthy state. |
| NFR15.1 | Dashboards show processing phases/outcomes, queues/leases, parser/page quality, embedding throughput/RAM, candidate evaluation, Qdrant generations/routes/counts, retrieval latency/quality/citations, deletion fences/cleanup joins, messaging, recovery, and resource use. | Checksummed dashboard export and seeded scenario prove panels, no-data/stale states, and tenant-safe filters. | Mark missing/stale data explicitly; do not infer zero failures. |
| NFR15.3 | NFR and embedding-evaluation evidence shall bind requirement IDs, revision, environment/configuration/model/corpus/query digests, commands, outcomes, limitations, and artifact checksums. | Manifest resolves every ID/file and preserves passed, failed, limited, rejected, and not-run results. | Reject incomplete evidence and prohibit promotion or success claims. |

## Runbooks

Runbooks cover stuck leases/queues, object mismatch, parser failure, model load,
outbox/DLQ, deletion fence, partial cleanup, Qdrant route/count mismatch,
retrieval quality regression, restore/rebuild, and telemetry loss.
