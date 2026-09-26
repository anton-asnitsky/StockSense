# Audit Evidence Observability Requirements

Unit: U10 Audit Evidence (`audit-evidence`)

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR10.2 | Emit bounded OpenTelemetry logs, metrics, and traces with safe tenant hash, correlation, producer/message class, event state, projection generation/checkpoint, query class, replay/retention/operator-control state, recovery phase, and dependency context across C15 ingress, RabbitMQ, PostgreSQL routines, OpenSearch, query API/BFF, Vault/VSO, and recovery tooling. | W3C propagation, cardinality, redaction, canary, bounded-buffer, dependency-failure, and telemetry-loss tests prove end-to-end correlation without prohibited content. | Aggregate/drop unsafe attributes, count telemetry loss, expose observability-degraded state, and never block authoritative producer work. |
| NFR10.3 | Dashboards shall show admission and projection latency, lag/freshness, validation/quarantine, duplicate/mismatch counts, queue/DLQ/replay, query latency/results, generation/rollover/rebuild, retention/no-resurrection, recovery, resources, and telemetry loss. Warn at 30-second lag; a ten-minute breach of 750 ms 30-day or two-second 90-day query p95; 80% disk; or 90% CPU/RAM for five minutes. Alert on five-minute unavailability, any dead letter, event-ID digest mismatch, cross-tenant result, prohibited-content retention, checkpoint/route inconsistency, failed generation activation, retention/recovery reconciliation over one hour, backup age over 24 hours, or missing required evidence. | Synthetic probes trigger and resolve every threshold with severity, correlation, affected retailer/component, safe context, runbook link, notification evidence, and no foreign data. | Missing telemetry cannot be interpreted as healthy; raise degraded or unavailable state and preserve retained evidence and control records. |
| NFR10.4 | Each application process shall cap in-memory telemetry buffering at 16 MiB. The shared local collector shall cap in-memory queued telemetry at 64 MiB and its encrypted disk spool at 256 MiB, using batches of at most 512 records. At 70% buffer usage it warns and increases bounded sampling only for successful low-priority traces; at 80% it drops oldest low-priority operational telemetry while preserving error/security/audit counters; at 90% or exporter unavailability it reports observability-degraded through health and a bounded loss counter. | Saturation tests cross every threshold for logs, metrics, and traces, verify memory/disk byte ceilings, priority order, no secret/tenant leak in spool, loss counters and alerts, exporter recovery, spool replay without duplication claims, and no impact to retained audit ingestion or producer commits. | Never apply unbounded buffering or block authoritative processing. Drop only according to the declared priority, expose exact loss/age/capacity, and reject an evidence claim whose required telemetry was lost. |
| NFR15.3 | Dashboards and C19 v2 checksummed evidence manifests shall link stable requirement IDs to revision, deterministic scenario, environment/configuration digests, events, inbox receipts, projection documents/checkpoints/generations, queries/freshness, validation/quarantine, messages/DLQ/replay, retention watermarks/tombstones, operator controls, resources, recovery, tests, outcomes, and limitations. | Exports validate against C19 v2, resolve every stable ID, verify artifact SHA-256 values, and preserve the distinct outcomes passed, failed, limited, rejected, unavailable, and not-run without lossy mapping. Counts, digests, route versions, and sample queries remain independently reproducible. | Reject incomplete or legacy-baseline evidence and prohibit performance, capacity, isolation, retention, recovery, or success claims without supporting artifacts. |

## Runbooks

Runbooks cover invalid or prohibited events, digest mismatch, projection lag,
OpenSearch outage, dead letter and replay, queue backlog, failed rebuild or route
activation, stale placement, retention mismatch/no-resurrection failure,
cross-tenant detection, backup age, restore reconciliation, resource pressure,
credential rotation, and telemetry loss.

## SLI/SLO interpretation

Freshness, latency, and processing measurements exclude declared startup and
maintenance windows only when the evidence identifies the window and reason.
Failed, stale, unavailable, and missing-evidence samples remain visible and
cannot be removed to improve a result.
