# Model Lifecycle Technology Decisions

Unit: U6 Model Lifecycle (`model-lifecycle`)

## Decisions

| Concern | Selection | Rationale and constraints |
| --- | --- | --- |
| Service and worker | Separate Python Model Lifecycle API and worker deployment | Preserves the approved unit boundary from Forecasting and supports CPU-first training/evaluation. Pin Python, base image, package lock, locale, time zone, and deterministic settings. |
| Candidate model | scikit-learn `HistGradientBoostingRegressor` with Poisson loss | Real trained candidate within the local CPU budget; uses only origin-available lag, shifted rolling, calendar, known-promotion, product identity, and horizon-day features. |
| Baselines/evaluation | Seven-day seasonal-naive, 28-observation moving average, and deterministic six-origin rolling backtest | Gives a reproducible common comparison with accepted MAE/WAPE and chronological inventory-policy evidence. |
| Experiment evidence | Internal MLflow with isolated metadata store behind the tenant-authorizing U6 API | MLflow records runs, parameters, metrics, model-version evidence, failures, and lineage. It is ClusterIP-only, permits only U6 API/worker workload identities, and has no direct browser or general workload path. Operators inspect retailer-scoped evidence through BFF-to-U6 APIs; MLflow tags never grant authorization or activate a production model. |
| Lifecycle authority | PostgreSQL control schema behind U6 stored procedures/functions and Flyway | Owns jobs, evaluations, release lifecycle, promotion history, active routes, idempotency, audit, and outbox. The Python driver invokes parameterized routines only; direct table access is denied. |
| Immutable bytes | S3-compatible local object storage | Owns checksummed dataset objects, candidate artifacts, evaluation outputs, and recovery snapshots; callers receive immutable server-resolved references. |
| Messaging | RabbitMQ with transactional outbox/inbox and fenced worker leases | Supports bounded asynchronous work, retries, dead letters, controlled replay, and duplicate-worker safety without an exactly-once claim. |
| Contracts | OpenAPI 3.1, AsyncAPI 3.0, JSON Schema 2020-12 | Defines versioned command, status, event, release-resolution, provenance, idempotency, and error boundaries. |
| Telemetry | OpenTelemetry plus OpenSearch/Dashboards | Correlates jobs, runs, artifacts, route decisions, recovery, drift, and resource evidence while keeping authoritative audit in PostgreSQL/outbox. |
| Secrets | Vault and Vault Secrets Operator | Provides workload-scoped short-lived credentials outside Git, images, and Terraform state. |
| Transport and storage encryption | TLS 1.2+ with hostname verification; declared encrypted local persistence and Vault-owned object/backup keys | Covers every U6 dependency channel and authoritative durable byte set. Plaintext fallback and disabled certificate verification are prohibited; key rotation retains access to in-policy historical artifacts and backups. |
| Deployment | Helm on Docker Desktop Kubernetes; Terraform/Terragrunt platform | Reproduces the local cloud-native profile, persistent dependencies, quotas, recovery assets, and resource measurements. |

## Rejected alternatives

Random train/test splits, per-run baseline tuning, cross-retailer fitted models,
MLflow-as-route-authority, mutable latest artifacts, direct table access,
automatic promotion/rollback, silent model substitution, owner-GPU-only proof,
and automatic remote ML fallback are excluded.

## Implementation parameters to pin

Pin Python, scikit-learn, numerical/data libraries, serialization format,
PostgreSQL driver, MLflow client/server, RabbitMQ and object-store clients,
OpenTelemetry libraries, contract tools, base images, feature schema,
missing-value policy, seed, thread counts, canonicalization rules, timeouts,
connection pools, storage encryption, and retention schedules. Verify dependency
licenses and model artifact safety before loading serialized content.
