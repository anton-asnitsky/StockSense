# Retail Data Technology Decisions

Unit: U4 Retail Data (`retail-data`)

## Decisions

| Concern | Selection | Rationale and constraints |
| --- | --- | --- |
| Runtime | Modular C#/.NET application containing separate U4 and U8 modules | Preserves logical ownership while enabling the approved one-connection/one-transaction receipt invariant in v1. |
| Persistence | PostgreSQL with Dapper/Npgsql invoking owned parameterized stored procedures/functions | Supports atomic ledger/position/audit/outbox work, tenant controls, expected versions, and future shared-to-dedicated placement. Direct SQL and EF Core are prohibited. |
| Migration | Flyway | Separates ordered schema/routine authority from runtime roles and blocks rollout on failure. |
| Cache | Redis cache-aside with versioned server-built keys and compare-and-set version pointers | Improves reads without becoming authoritative; 60-second TTL, outbox invalidation, and bounded PostgreSQL fallback handle races/outage. |
| Messaging | RabbitMQ with transactional outbox/inbox | Provides durable at-least-once publication, confirms, bounded retry, DLQ, audited replay, and exact-redelivery deduplication. |
| Raw sources | S3-compatible local object storage selected by platform profile | Retains immutable raw import objects and digests independently from normalized PostgreSQL records; exact product/version is pinned during implementation. |
| Contracts | OpenAPI 3.1, AsyncAPI 3.0, JSON Schema 2020-12 | Formalizes REST/import/job/event boundaries and supports CI example/compatibility checks. |
| Telemetry | OpenTelemetry .NET SDK/Collector with OpenSearch/Dashboards | Produces portable operational evidence while PostgreSQL audit/outbox remains authoritative. |
| Deployment | Helm on Docker Desktop Kubernetes; Terraform/Terragrunt for platform configuration | Fits the approved local cloud-native profile and resource quota. |
| Secrets | HashiCorp Vault and Vault Secrets Operator | Keeps workload credentials outside Git and Terraform state and supports scoped reload/rotation. |

## Rejected alternatives

- Separate U4/U8 network services in v1 are rejected because the approved receipt
  invariant requires one atomic PostgreSQL transaction.
- Redis authority, best-effort movement history, partial import commit, and
  asynchronous receipt posting are rejected by confirmed correctness rules.
- Cross-unit table access and shared ORM entities are rejected; public module
  ports and owned routines preserve extraction seams.

## Implementation parameters to pin

Record exact .NET, Dapper, Npgsql, Flyway, PostgreSQL, Redis client, RabbitMQ
client, OpenTelemetry, object-storage client, base-image, and contract-tool
versions/checksums. Record connection-pool, command-timeout, chunk-size,
prefetch, object encryption, archive tier, probe, and cleanup settings without
weakening the approved NFRs.
