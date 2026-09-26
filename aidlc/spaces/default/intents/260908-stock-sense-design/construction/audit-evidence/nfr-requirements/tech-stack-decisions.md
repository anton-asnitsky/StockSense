# Audit Evidence Technology Decisions

Unit: U10 Audit Evidence (`audit-evidence`)

## Decisions

| Concern | Selection | Rationale and constraints |
| --- | --- | --- |
| Service runtime | ASP.NET Core on the pinned project .NET runtime | Fits the service portfolio and supports explicit APIs/workers, OpenTelemetry, health checks, and bounded background processing. |
| Data access | Dapper/Npgsql invoking parameterized U10-owned PostgreSQL stored procedures/functions only | Enforces the prohibition on EF Core and direct SQL. Runtime roles receive routine execution only; Flyway uses separate credentials. |
| Retained derived evidence | PostgreSQL for inbox receipts, immutable derived events, checkpoints, routes, replay/retention/operator controls, expiry watermarks, tombstones, idempotency, self-audit, and outbox | Provides durable transactions, uniqueness, versions, and a rebuild source without becoming producer business authority. |
| Search projection | Standalone OpenSearch with server-owned per-retailer aliases and immutable generations; OpenSearch Dashboards for operator-only diagnostics | Provides portfolio-grade search, correlation, and rebuild/cutover behavior while keeping application authorization and PostgreSQL evidence authoritative. Local profile uses one primary shard and zero replicas. |
| Messaging | RabbitMQ implementing C15 v2 with durable queues, authenticated producer binding, canonical digest, 64 KiB envelope, confirms, inbox deduplication, checkpoint-before-ack, five total deliveries, one-to-30-second backoff, seven-day DLQ, audited 100-event replay, and 5,000-message/256 MiB queue caps | Implements the construction baseline at-least-once delivery without an exactly-once claim, removes the legacy unresolved retry profile, and makes local overflow behavior testable. |
| Index lifecycle | Rollover at 1 GiB or seven days; separate business-audit and operational-log patterns; inactive-generation rebuild and expected-version alias cutover | Bounds local data growth and prevents partial rebuilds or client-selected indexes from entering the active query route. |
| Migrations | Flyway for PostgreSQL schema, routines, grants, compatibility, and controlled retention privileges | Separates migration authority from runtime and supports deterministic clean setup and rollout blocking. |
| Contracts | OpenAPI 3.1, AsyncAPI 3.0, and JSON Schema 2020-12 using C15 v2, C18 v2, and C19 v2 | Defines authenticated/digested event ingestion, bounded typed audit query/freshness/operation reconciliation, and six-state checksummed evidence without relying on legacy v1 placeholders. |
| Identity | Duende IdentityServer through the BFF for users; narrow workload identities for producers and operators | Supports OIDC/OAuth, federation, current user authorization, and machine scopes without granting human role authority to services. |
| Secrets and encryption | In-cluster HashiCorp Vault with Vault Secrets Operator, TLS 1.2+, encrypted persistence and backups | Supports IaC-managed least-privilege secret delivery, rotation, revocation, and recovery without secrets in Git or Terraform state. |
| Telemetry | OpenTelemetry with OpenSearch-backed operational logs and Dashboards; U10 PostgreSQL/self-audit remains authoritative evidence | Correlates ingestion, query, maintenance, retention, and recovery while preserving business-audit and operational-log separation. |
| Deployment | Helm on Docker Desktop Kubernetes, orchestrated by Terraform/Terragrunt under the project platform boundary | Reproduces local topology and limits. U10 contributes chart settings and validation; platform state/backend/apply ownership remains U2. |

## Rejected alternatives

A shared client-filtered multi-tenant index, client-selected index names, direct
OpenSearch business authority, Elasticsearch/OpenSearch as the sole retained
audit source, EF Core, ad hoc SQL, direct table access, unbounded retries,
in-place generation rebuilds, silent stale results, indefinite retention,
exactly-once transport claims, and owner-only cloud/GPU dependencies are
excluded.

## Implementation parameters to pin

Pin .NET SDK/runtime and base images, ASP.NET Core, Dapper, Npgsql, Flyway,
PostgreSQL, RabbitMQ, OpenSearch and Dashboards, OpenTelemetry components,
OpenAPI/AsyncAPI/JSON Schema validators and generators, Vault/VSO, Helm,
Terraform/Terragrunt, index templates/mappings/analyzers, queue arguments,
retry jitter, connection pools, transaction isolation, certificates, backup
format, retention schedules, the NFR2.5 storage/queue allocations, NFR10.4
telemetry limits, and every container/chart checksum.
