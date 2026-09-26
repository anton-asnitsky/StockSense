# Audit Evidence Security Requirements

Unit: U10 Audit Evidence (`audit-evidence`)

## Authority boundary

Producing services remain authoritative for business audit, outbox records,
aggregate state, actor decisions, and rejections. U10 owns only its validated
delivery receipts, retained derived event ledger, projection generations and
checkpoints, operator-control records, retention/replay coordination, query
freshness, and recovery evidence. PostgreSQL retained events and OpenSearch are
derived evidence and cannot authorize, repair, reverse, or validate a producer
mutation.

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR3.1 | Every producer event shall be authenticated and validated for issuer, audience, scope, workload identity, producer/message type, schema, retailer, placement generation, event identity/digest, size, field allowlist, and semantic invariants before retention. Every query/page/citation shall revalidate current actor, tenant membership, role, resource scope, placement, route, and freshness. | Negative tests substitute producer, audience, scope, retailer, placement, event ID, digest, schema, actor, resource, page cursor, route, and index name, including pooled-connection reuse and revoked membership. | Reject or quarantine with safe codes and no foreign existence, content, timing detail, retention, indexing, or query result. |
| NFR3.2 | Replay, rebuild, retention, quarantine repair, investigation, route activation, rollback, and evidence publication require narrow current Platform Operator scopes, bounded purpose/reason and retailer/time scope, expected request/route/policy versions, and payload-bound idempotency. Denied, failed, cancelled, and completed attempts are append-only self-audited. | Role and operation matrices cover missing/expired authority, cross-retailer scope, stale versions, changed-payload replay, cancellation before/after cutover, denied controls, and machine-to-human privilege escalation. | Deny before effect, return the original result for an exact replay or conflict for changed content, and never broaden scope or bypass self-audit. |
| NFR3.3 | Server-owned tenant aliases and role mappings shall isolate business-audit indexes, operational-log indexes, PostgreSQL rows/routines, RabbitMQ topology, quarantine/DLQ metadata, backups, and evidence. Clients and event payloads cannot name an index or supply authority-bearing placement. | Cross-tenant tests substitute identifiers through HTTP, C15, stored routines, index aliases, Dashboards, replay, restore, and tenant movement. Prove foreign direct index and database access is denied. | Hide foreign resources, fence stale placement, keep affected work unavailable, and raise an integrity alert without exposing foreign data. |
| NFR3.4 | Credentials, tokens, CSRF values, raw supplier documents, full prompts, hidden reasoning, unrestricted exceptions, and fields outside event-type allowlists shall never enter retained events, projections, quarantine diagnostics, telemetry, evidence, or operator results. | Canary and mutation tests place prohibited content in envelopes, error paths, exceptions, correlation fields, replay, and evidence publication. Validate pre-retention rejection and post-processing scans. | Reject or safely quarantine metadata without the raw payload, redact/drop unsafe diagnostics, and alert on any prohibited-content retention. |
| NFR4.1 | .NET runtime access shall use parameterized U10-owned PostgreSQL procedures/functions through Dapper/Npgsql only. Application roles have no direct table DML/DDL, arbitrary SQL, migration rights, RLS bypass, cross-unit table access, or audit update/delete privilege. Flyway uses separate migration/maintenance credentials. | Static, grant, integration, pooled-connection, migration, retention, and direct-call tests prove only approved routines and public contracts are reachable. | Fail the operation or readiness check and never retry with broader credentials or direct SQL. |
| NFR5.1 | Browser audit queries shall arrive through the BFF OIDC session using authorization code/PKCE, secure HttpOnly cookies, server-side tokens, and CSRF protection for mutations. Internal producers and operators use narrow issuer, audience, scope, workload, retailer, and operation claims. | Tests cover invalid callback, expired/revoked session, missing/forged CSRF, wrong audience/scope, producer impersonation, operator escalation, and direct browser access to U10 or Dashboards. | Deny without retaining an event, revealing a tenant resource, or executing a control. |
| NFR6.1 | HTTP, RabbitMQ, PostgreSQL, OpenSearch, telemetry, Vault/VSO, backup, and evidence paths shall use TLS 1.2+ with validated identity. Persistence and backups are encrypted. Distinct least-privilege credentials are delivered through Vault/VSO with tested reload, rotation, revocation, backup, and recovery; secrets never enter Git, images, Terraform state, manifests, telemetry, or evidence. | Connection, certificate, secret-scan, RBAC/mount, canary, rotation, restart, revocation, unseal/recovery, and restore tests prove fail-closed isolation. | Keep the capability unready, deny access, rotate suspected exposure, and emit only safe diagnostics; never downgrade transport or mount unencrypted persistence. |
| NFR8.1 | REST/query/operator boundaries shall use OpenAPI 3.1 and durable events AsyncAPI 3.0 with JSON Schema 2020-12. C15 v2 is the ingestion baseline and carries authenticated issuer/audience/scope/workload and producer/message binding, canonical SHA-256 payload digest, immutable tenant/event/schema/correlation identity, 64 KiB encoded-envelope limit, five total delivery attempts, one-to-30-second backoff, seven-day DLQ, and bounded replay. C18 v2 owns the audit-query shape: maximum 90-day range, opaque stable cursor, 50/200 page defaults/limits, five filters, 1 MiB response, typed HTTP 200 Fresh/Stale/partial/Unavailable body, RFC 9457 failures, route/checkpoint/lag/generation fields, and operation reconciliation. C19 v2 owns evidence outcomes `passed`, `failed`, `limited`, `rejected`, `unavailable`, and `not-run` plus revision/scenario/environment/artifact digests and validation rules; v1 forms remain legacy compatibility only. | CI validates syntax, examples, generated clients, compatibility and overlap, producer/consumer bindings, authorization matrices, digest/size/retry/DLQ/replay behavior, bounded C18 cursor/range/page/filter/response and freshness fixtures, all six C19 outcomes, duplicate/mismatch cases, and explicit rejection of legacy v1 fields as a construction baseline. | Block the applicable change; a valid contract never grants runtime authority. |
| NFR10.1 | Logs, traces, metrics, errors, and evidence shall use safe tenant hashes and bounded labels. Raw tenant, actor, event, query, route, generation, and correlation IDs may appear only in access-controlled logs/traces where required; metrics use bounded operation/status classes. Telemetry buffers are bounded and loss is observable. | Cardinality, redaction, canary, exception, problem-detail, buffer-overflow, and telemetry-outage tests validate each signal policy. | Aggregate, redact, or drop unsafe signals, expose telemetry loss and observability-degraded state, and preserve authoritative processing. |
| NFR13.1 | CI shall run unit/integration, OpenAPI/AsyncAPI/JSON Schema, Flyway/routine/grant, tenant/role, idempotency, RabbitMQ failure, OpenSearch route/mapping, retention/no-resurrection, recovery, secret, container, dependency, and supply-chain checks on hosted untrusted runners. | Workflow policy proves public PR code receives no local runner, cluster, Vault, database, broker, OpenSearch, deployment, backup, or owner credential. | Block release and deployment and retain failed-control evidence. |

## Threat considerations

Acceptance covers spoofed producers, tenant/index substitution, replay mismatch,
stale placement, event-ID collision, unsafe payload retention, privilege
escalation, operator repudiation, telemetry leakage, direct storage access,
restore-based resurrection, and dependency or supply-chain compromise.

## Explicit limitations

Synthetic portfolio data does not relax tenant, credential, transport,
encryption, or audit controls. OpenSearch document-level security and Dashboards
roles are defense in depth; the U10 application remains the business-query
authorization boundary.

## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-21T14:07:25Z
**Iteration:** 1
**Request Challenge:** review:e33ebd3bd8f138299724280a97bd4f17

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Critical | aidlc/spaces/default/intents/260908-stock-sense-design/construction/audit-evidence/nfr-requirements/security-requirements.md > NFR8.1; aidlc/spaces/default/intents/260908-stock-sense-design/inception/contract-design/contract-summary.md > C15, C18, and C19 | NFR8.1 declares C15 v2, C18 v2, and C19 v2 to be the construction baseline, but the passed contract catalogue defines only v1: C15 remains version 1.0.0 with `maxRetries: unresolved-OQ-C15-01` and no authenticated producer binding, canonical digest, or 64 KiB limit; C18 version 1.0.0 has an untyped audit response with no query bounds, cursor, freshness body, checkpoint/generation fields, or operation reconciliation; and C19 v1 permits only `passed`, `failed`, and `limited`. The detailed NFRs state the intended v2 semantics, but no referenced v2 schemas or operations exist for generated clients, compatibility checks, or implementation. | Add concrete C15 v2 AsyncAPI, C18 v2 OpenAPI, and C19 v2 JSON Schema definitions to the shared contract catalogue, including the complete fields, bounds, six outcomes, authentication/authorization bindings, delivery and reconciliation behavior, examples, and v1 overlap/deprecation rules; then make NFR8.1 and its CI acceptance point to those resolvable definitions. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Detailed-NFR traceability cross-check | PASS: all 31 detailed NFR IDs referenced by `traceability.json` resolve, with no missing targets or orphan requirement rows | The stage has complete mechanical NFR1-NFR15 coverage, including justified N/A mappings for NFR12 and NFR14. |
| Shared-contract version and shape cross-check | FAIL: C15, C18, and C19 are all version 1.0.0; the catalogue contains no v2 definitions | Confirms R-01; prose references to v2 do not provide an implementable contract boundary. |
| Capacity and failure-bound review | PASS: finite queue, telemetry, storage, resource, retry, DLQ, replay, rollover, retention, recovery, and backpressure thresholds are present | The revised NFRs close the previously qualitative operating limits and retain explicit failure behavior. |

### Summary

The revised NFRs are strong on tenant authorization, immutable derived evidence, OpenSearch projection authority, checkpoint-before-ack idempotency, no-resurrection retention, recovery, local limits, backpressure, and traceability. Approval should still be withheld because all three claimed v2 contract baselines are unresolved cross-references to schemas that do not exist in the passed contract catalogue.
