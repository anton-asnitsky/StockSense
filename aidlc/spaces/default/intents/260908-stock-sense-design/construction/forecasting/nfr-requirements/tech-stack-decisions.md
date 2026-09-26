# Forecasting Technology Decisions

Unit: U7 Forecasting (`forecasting`)

## Decisions

| Concern | Selection | Rationale and constraints |
| --- | --- | --- |
| Service and worker | Separate Python Forecasting API, scheduler, and worker deployment | Preserves the approved boundary from Model Lifecycle and supports CPU-first deterministic inference. Pin Python, base image, package lock, locale, time-zone database, and thread settings. |
| Model execution | Adapter for promoted seasonal-naive, moving-average, and signed `skops.io` scikit-learn releases | Executes only a server-resolved immutable compatible release. Verifies the canonical manifest, artifact SHA-256, Vault-owned Ed25519 signer, runtime/schema digests, retailer, and explicit trusted-type allowlist before loading; pickle/joblib/cloudpickle and code-bearing payloads are prohibited. |
| Forecast authority | PostgreSQL control/series schema behind U7 stored procedures/functions and Flyway | Owns immutable requests, runs, attempts, product series, publications, acknowledgements, pointers, idempotency, audit, and outbox/inbox. Python invokes parameterized routines only; direct table access is denied. |
| Read cache | Redis cache-aside with versioned tenant/authorization keys | Maximum 60-second positive and five-second unavailable TTL; commit-driven invalidation; cold/unavailable Redis falls back to governed reads. |
| Model artifacts | S3-compatible local object storage via Model Lifecycle references | Forecasting verifies immutable URI/checksum/runtime/schema metadata and reads only the pinned release. |
| Messaging and heavy-compute coordination | RabbitMQ transactional outbox/inbox plus U6-owned PostgreSQL-backed coordination API | RabbitMQ supports deterministic scheduling, bounded retries, and DLQ/replay. The internal U6 coordination API owns the singleton cross-unit lease, durable queue decisions, monotonic fencing tokens, renewal, fairness, and fail-closed recovery without cross-unit database access or an exactly-once claim. |
| Numeric representation | Scale-four decimal strings, round-half-to-even at publication | Makes cross-runtime serialization and downstream arithmetic deterministic; raw nonfinite/negative/overflow values fail explicitly. |
| Contracts | OpenAPI 3.1, AsyncAPI 3.0, JSON Schema 2020-12 | Defines versioned admission, status, series, publication, freshness, coverage, provenance, events, limits, and stable errors. |
| Telemetry | OpenTelemetry plus OpenSearch/Dashboards | Correlates schedules, runs, attempts, product outcomes, pointers, freshness, recovery, and resource evidence while authoritative audit remains in PostgreSQL/outbox. |
| Secrets and transport | Vault/VSO, TLS 1.2+, encrypted persistence | Provides workload-scoped credentials, trusted internal channels, and recoverable protected storage. |
| Deployment | Helm on Docker Desktop Kubernetes; Terraform/Terragrunt platform | Reproduces the local cloud-native profile, resource limits, persistent dependencies, and recovery evidence. |

## Rejected alternatives

Mutable latest inputs, arbitrary model/artifact selection, silent baseline or
prior-forecast fallback, invalid-value clipping/filling, direct table access,
Redis authority, automatic partial publication, duplicate daily runs,
unbounded retries/queues, and owner-GPU-only proof are excluded.

## Implementation parameters to pin

Pin Python, numerical/data/scikit-learn and serialization libraries,
PostgreSQL/RabbitMQ/Redis/object clients, time-zone database, OpenTelemetry,
contract tools, base images, schema digests, decimal context, thread counts,
timeouts, connection pools, certificate trust, encryption configuration,
cache serialization, and cleanup schedules. Verify dependency licenses and
model artifact safety before loading serialized content.
