# Retail Data Observability Requirements

Unit: U4 Retail Data (`retail-data`)

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR10.2 | OpenTelemetry signals shall expose bounded request latency/outcome, cache hit/miss/fallback/coalescing, PostgreSQL pool/routine latency, import queue/phase/duration, snapshot duration, receipt conflict/rollback, outbox/inbox/DLQ/replay, placement transition, restore checks, and telemetry loss. | Cardinality and canary tests inspect collector/OpenSearch output and prove all required signals without product, row, account, raw source, or unbounded error labels. | Aggregate/drop unsafe labels, count loss, and preserve authoritative business work. |
| NFR10.3 | Alert after 30 seconds of Redis unavailability or outbox lag, at 1,000 ready messages, on any stock-conservation/tenant-isolation/restore reconciliation failure, and when an NFR1 p95 target remains breached for ten minutes. | Synthetic scenarios trigger and resolve every alert with threshold, window, revision, runbook, and notification evidence. | Missing telemetry produces an observability-degraded alert, never a healthy state. |
| NFR15.1 | Dashboards shall show read/mutation latency, page sizes, cache behavior, database fallback saturation, import queue and phases, snapshot generation, receipt conflicts, stock-conservation probes, RabbitMQ/outbox/DLQ/replay, placement generation/transitions, retention jobs, restore/rebuild status, and resource use. | A checksummed dashboard export plus seeded scenario proves panels, no-data/stale states, data sources, and tenant-safe filters. | Mark missing/stale data explicitly and prohibit success claims from absent signals. |
| NFR15.3 | Every NFR run shall emit revision-bound evidence linking stable requirement IDs, environment/configuration digests, commands, timestamps, actual outcomes, limitations, and artifact checksums. | The evidence manifest resolves each ID/artifact and preserves passed, failed, limited, rejected, and not-run outcomes. | Reject incomplete evidence; no lifecycle or successful-control claim may rely on it. |

## Correlation and privacy

Correlation spans BFF request or job admission, stored routines, modular U4/U8
transaction, audit/outbox commit, broker delivery, consumer/inbox, and projection.
Operational signals use bounded categories; actor and retailer identifiers appear
only in authorized audit/search paths.

## Runbooks

Runbooks cover database saturation, Redis outage, import backlog/deadline,
outbox lag, DLQ/replay, stock reconciliation failure, stale placement traffic,
extraction failure, restore failure, and telemetry loss.
