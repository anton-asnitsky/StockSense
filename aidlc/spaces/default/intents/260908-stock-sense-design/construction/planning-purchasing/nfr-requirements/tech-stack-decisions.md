# Planning and Purchasing Technology Decisions

Unit: U8 Planning and Purchasing (`planning-purchasing`)

## Decisions

| Concern | Selection | Rationale and constraints |
| --- | --- | --- |
| Service boundary | Separate Retail Data and Planning/Purchasing .NET modules co-deployed in one ASP.NET Core application for v1 | Preserves logical ownership and public module ports while allowing one relational transaction for receipt plus inventory movement. Future extraction keeps equivalent C08 semantics. |
| Data access | Dapper/Npgsql invoking parameterized module-owned PostgreSQL stored procedures/functions only | Enforces the prohibition on EF Core and direct table SQL. Runtime roles receive routine execution only; Flyway uses separate migration credentials. |
| Authoritative storage | PostgreSQL schemas for planning policies, preferences, allowance, reviews, scenarios, recommendations, purchase aggregates, receipts, idempotency, audit, and outbox/inbox | Supports strict transactions, versions, unique schedule keys, append-only evidence, concurrency locks, and future tenant extraction. Logical modules never read each other's tables directly. |
| Migrations | Flyway with versioned forward migrations and compatibility-tested rollback deployments | Provides deterministic schema/routine/grant installation and blocks rollout on migration or contract failure. |
| Messaging | RabbitMQ with transactional outbox/inbox, publisher confirms, bounded retry, DLQ, and audited replay | Provides at-least-once delivery while business idempotency and transaction locks prevent duplicate purchase, receipt, inventory, or allowance effects. |
| Read cache | Redis cache-aside for already-authorized versioned projections | Uses 30-second positive and five-second unavailable TTLs, authority/version-rich keys, commit invalidation, and bounded PostgreSQL fallback. Redis never authorizes or classifies a business resource. |
| Scheduling and workers | One Kubernetes-hosted co-deployed .NET application replica with scheduler and exactly three bounded Review Job worker slots, using PostgreSQL job/lease authority plus RabbitMQ delivery | Maintains one logical 08:00 job, one active job per retailer, three cluster-wide jobs, stable attempts, worker fencing, and a fixed contention profile that measures interactive traffic without hidden replicas or autoscaling. |
| Numeric representation | PostgreSQL/.NET decimal at scale four, invariant decimal-string contracts, round-half-to-even at declared boundaries | Keeps forecast, MOQ/pack, price, receipt, and evidence calculations deterministic across REST, messages, routines, and tests. |
| Contracts | OpenAPI 3.1, AsyncAPI 3.0, and JSON Schema 2020-12 | Defines C08-C10/C14-C15/C17-C18 request bounds, authority/version/idempotency context, state transitions, provenance, errors, events, and examples. |
| Telemetry and audit | OpenTelemetry to OpenSearch/Dashboards; PostgreSQL/outbox remains authoritative business audit | Supports correlated operational investigation and portfolio evidence without using the search projection to authorize or prove a mutation. |
| Identity and secrets | Duende IdentityServer through the BFF, workload credentials from Vault/VSO, TLS 1.2+, encrypted persistence | Separates human roles from machine job authority and keeps credentials, transport, backups, and evidence protected. |
| Deployment | Helm on Docker Desktop Kubernetes with Terraform/Terragrunt platform orchestration | Reproduces resource limits, dependencies, storage, configuration, and clean-target recovery on the reviewer-selectable local profile. |

## Rejected alternatives

EF Core, direct/ad hoc SQL, cross-module table reads, Redis authority,
unbounded queues or retries, in-memory-only scheduling/idempotency, separate v1
databases that break atomic receipts, autonomous purchasing, client-side
calculation, silent forecast/term substitution, and exactly-once transport
claims are excluded.

## Implementation parameters to pin

Pin .NET SDK/runtime and base images, ASP.NET Core, Dapper, Npgsql, Flyway,
PostgreSQL, RabbitMQ, Redis, OpenTelemetry, OpenAPI/AsyncAPI/JSON Schema tools,
time-zone database, locale, decimal context, connection pools, transaction
isolation and lock order, lease timers, retry jitter, certificate trust,
encryption configuration, cache serialization, retention schedules, and all
container/chart checksums.
