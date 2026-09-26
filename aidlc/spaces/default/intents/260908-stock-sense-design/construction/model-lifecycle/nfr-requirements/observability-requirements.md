# Model Lifecycle Observability Requirements

Unit: U6 Model Lifecycle (`model-lifecycle`)

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR10.2 | Emit bounded OpenTelemetry logs, metrics, and traces with safe tenant, correlation, operation, job, attempt, run, dataset, release, and route identifiers across API, RabbitMQ, worker, PostgreSQL routine, object storage, and MLflow calls. Measure admission/queue/phase durations, lease age, retries, dead letters, artifact checks, route availability, recovery, and CPU/RAM/storage peaks. | Cardinality and canary tests prove end-to-end correlation, redaction, bounded buffering, explicit no-data/stale states, and observable telemetry loss. | Aggregate/drop unsafe labels, expose signal loss, and preserve authoritative work. |
| NFR10.3 | Warn when queue age exceeds five minutes or resource use exceeds 90% for five minutes. Alert when a running job makes no progress for 60 seconds, any dead letter appears, a backup is older than 24 hours, or reconciliation exceeds one hour; alert immediately for unavailable active routes, checksum/leakage/tenant-integrity failures, or failed promotion/rollback transactions. | Synthetic probes trigger and resolve every threshold with revision, correlation, runbook, and notification evidence. | Missing telemetry raises observability-degraded state and cannot be interpreted as healthy. |
| NFR15.2 | Weekly per-retailer monitoring shall recompute rolling 28-day MAE/WAPE after actuals are complete and compare the active release with validation and identical live baselines. Two consecutive defined-WAPE checks at least 20% worse warn; 35% worse is critical. PSI above 0.20 or unseen categorical values above 1% warn. | Seeded drift/quality fixtures cover defined and zero-denominator WAPE, delayed actuals, baseline changes, feature drift, and integrity faults. | Open retraining/evaluation review with evidence; never promote or roll back automatically. Leakage, schema, checksum, and tenant-integrity faults are immediately critical. |
| NFR15.3 | Dashboards and evidence manifests shall link stable requirement IDs to environment/configuration/data/code/model digests, jobs/runs, metrics, route decisions, thresholds, alerts, tests, actual outcomes, resource results, and limitations. | Checksummed dashboard/evidence exports resolve every ID and retain passed, failed, limited, rejected, and not-run outcomes. | Reject incomplete evidence and prohibit promotion, recovery, capacity, quality, or success claims without supporting artifacts. |

## Runbooks

Runbooks cover queue saturation, lost leases, duplicate workers, transient and
terminal failures, dead-letter replay, corrupt/missing artifacts, MLflow/control
disagreement, unavailable routes, quality/drift warnings, failed route changes,
restore/reconciliation, resource pressure, and telemetry loss.
