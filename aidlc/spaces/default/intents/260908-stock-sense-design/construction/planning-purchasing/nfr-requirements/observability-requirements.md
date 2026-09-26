# Planning and Purchasing Observability Requirements

Unit: U8 Planning and Purchasing (`planning-purchasing`)

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR10.2 | Emit bounded OpenTelemetry logs, metrics, and traces with safe tenant hash, correlation, operation class, job/attempt, review, scenario, proposal, order, receipt, event, state/version, and dependency context across BFF/API, scheduler, worker, RabbitMQ, PostgreSQL routines, Redis, Retail Data, Supplier Knowledge, Forecasting, audit publication, and recovery. Measure read/command/dependency latency, schedule/queue/lease age, job/product outcomes, allowance, purchase transitions/conflicts, approved/received/outstanding conservation, cache fallback, outbox/DLQ, reconciliation, and CPU/RAM/storage. | W3C-context, cardinality, redaction, canary, bounded-buffer, dependency, and telemetry-loss tests prove end-to-end correlation and the signal-specific attribute policy. | Aggregate/drop unsafe labels, expose telemetry loss and observability-degraded state, and preserve authoritative work. |
| NFR10.3 | Warn when eligible queue age exceeds ten minutes, read p95 exceeds 500 ms or command p95 750 ms for ten minutes, Redis outage or outbox lag exceeds 30 seconds, or resources exceed 90% for five minutes. Alert on missing 08:05 scheduled identity, 30-minute retained blockage, missed 08:10/08:11 healthy targets, 60 seconds without job progress, any dead letter, retry exhaustion, impossible purchase transition, over-receipt/conservation failure, reconciliation over one hour, backup age over 24 hours, or any tenant/integrity violation. | Synthetic probes trigger and resolve every threshold with severity, correlation, affected retailer/resource, runbook link, notification evidence, and no foreign data. | Missing telemetry cannot be interpreted as healthy; raise observability-degraded state and retain authoritative evidence. |
| NFR15.3 | Dashboards and evidence manifests shall link stable requirement IDs to environment/configuration digests, schedule and clock decisions, jobs/attempts, evidence versions, calculations, blocked products, allowance, scenarios, purchase state, decisions, receipts/movements, idempotency, messages/DLQ, cache, resources, recovery, tests, outcomes, and limitations. | Checksummed exports resolve every stable ID and preserve passed, failed, limited, rejected, and not-run outcomes. Calculation fixtures and receipt-conservation evidence remain independently reproducible. | Reject incomplete evidence and prohibit performance, schedule, recovery, capacity, isolation, purchase-integrity, or success claims without supporting artifacts. |

## Runbooks

Runbooks cover missed schedules, retained-work delay, lost worker lease, retry
exhaustion and DLQ, invalid or blocked product evidence, allowance conflicts,
stale purchase versions, impossible transitions, cancellation/receipt and
receipt/receipt races, conservation mismatch, Redis degradation, dependency
outage, restore/reconciliation, resource pressure, and telemetry loss.
