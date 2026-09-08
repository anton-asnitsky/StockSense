# ADR 0019: OpenSearch investigations and transactional business auditing

Date: 2026-09-08
Status: Accepted by the owner.

## Decision

Use OpenSearch and OpenSearch Dashboards for operational logs and searchable
business-audit history. This replaces the proposed Loki log backend. Retain
PostgreSQL as the authoritative store for business-audit events, committed with
the business operation. Elasticsearch was considered; OpenSearch is selected.
OpenTelemetry remains the instrumentation/collection boundary. Metrics and trace
storage choices are not settled by this decision.

## Transaction and indexing boundary

Approved PostgreSQL routines write the business change, append-only audit entry
and outbox event in one transaction. Required audit-write failure rolls back the
business mutation. Dapper calls routines; application roles cannot directly access
tables or update/delete audit records. Flyway manages schema and permissions.

The outbox publisher sends versioned AsyncAPI events through RabbitMQ. An audit
indexing worker uses a stable event ID for idempotent indexing and acknowledges
only after successful indexing. Bounded retries, dead-letter handling and replay
must be observable. Search is eventually consistent; expose indexing lag and
preserve an authoritative tenant-scoped audit API through OpenAPI and SQL routines.
Rejected attempts need a separate durable recording path because a rolled-back
business transaction cannot retain their audit entries.

OpenSearch outages do not invalidate committed operations: events remain available
for retry, and indexes can be rebuilt from retained authoritative audit records.
There is no atomic transaction across PostgreSQL, RabbitMQ and OpenSearch and no
exactly-once delivery claim. Neither ordinary database tables nor search indexes
provide administrator-proof immutability.

## Access, content and lifecycle

Structured .NET/Python logs carry timestamp, severity, service, environment,
trace/request ID and authorized tenant/actor/job/message context where applicable.
Audit events identify actor, tenant, action, target, outcome, occurrence time and
relevant input/model/source versions. Include inventory changes, purchasing
transitions, membership changes, manual reviews, model promotions, privileged
operations and agent tool actions. Do not store hidden reasoning, credentials,
tokens, full prompts or raw supplier documents in logs by default.

Separate log and audit indexes, write permissions and retention policies. Backend
authorization restricts retailer audit searches; clients cannot choose arbitrary
indexes or unfiltered queries. Dashboards are operator-only initially. Validate
cross-tenant access independently of index naming. Redaction/deletion and retention
must cover searchable copies, rebuilds and backups as well as source records.

Operational telemetry uses bounded buffering with explicit loss counters and
must not block business operations. Required business auditing uses the durable
transactional path. Define retention durations, disk limits and backlog limits
during implementation; none are assumed approved here.

## Delivery and acceptance

SS-37 establishes transactional audit routines/contracts before inventory and
purchasing mutations ship. SS-38 deploys persistent OpenSearch/Dashboards through
Terraform/Terragrunt and Helm, integrates Vault credentials, log ingestion and
audit indexing, and tests replay, isolation, redaction and search lag.

SS-24 measures the full stack, including search, ingestion and Dashboards, within
the existing 16 GB RAM / 3 CPU envelope. No increased allocation or optional-search
release profile is implied. If measured requirements exceed that envelope, return
with concrete sizing/profile alternatives. SS-26 proves audit recovery and index
rebuild. Exact versions, ingestion components and retention values remain open.

## References

- [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [OpenSearch search visibility](https://docs.opensearch.org/latest/api-reference/index-apis/refresh/)
- [OpenSearch Docker deployment](https://docs.opensearch.org/latest/install-and-configure/install-opensearch/docker/)
