# Planning and Purchasing Security Requirements

Unit: U8 Planning and Purchasing (`planning-purchasing`)

## Authority boundary

Planning/Purchasing owns policy and preferred-term selections, review admission
and results, scenarios, recommendations, purchase proposals and orders,
receipts, idempotency, audit, and outbox/inbox state. Retail Data remains
authoritative for inventory and stock movements, Supplier Knowledge for
accepted terms, Forecasting for forecast evidence, and Identity Access for
current membership and roles. Redis, messages, clients, assistants, and read
models are untrusted selectors and never sources of authority.

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR3.1 | Every read, command, retry, replay, worker attempt, cache access, retention action, and restore shall revalidate current tenant, membership or machine scope, role, resource ownership, placement generation, expected version, operation identity, and contract version at BFF/API, message, stored-routine, cache, and module-port boundaries. | Negative tests cover missing context, retailer/store/product/supplier/review/scenario/proposal/order/receipt substitution, revoked membership, wrong audience/scope, stale placement, pooled connections, forged versions, and direct routine calls. | Deny with stable safe errors and no foreign existence, content, timing-sensitive detail, allowance disclosure, or state effect. |
| NFR3.2 | Current Planners may request/compare reviews, manage Drafts, submit, and record permitted receipts; current Managers are required for saved policy, preferred term, approval, rejection, and cancellation. Schedulers/workers receive only job authority. Under C14, the assistant may request a manual review or create one new Draft from an authorized recommendation, but it has no Draft-edit operation and cannot submit, decide, cancel, or receive; a current Planner must perform every later Draft edit through the ordinary Planner contract. | Role-matrix tests exercise every allowed and forbidden operation, combined roles, expired sessions, revoked roles, assistant tool substitution, attempted assistant Draft edit, worker lease forgery, and machine-to-human privilege escalation. C14 contract tests require Draft identity, source recommendation/version, operation key and request hash for creation and expose no assistant edit route. | Deny before business-state disclosure or mutation; no recommendation or assistant output becomes purchase authority. |
| NFR3.3 | Redis keys, idempotency rows, queue messages, immutable evidence, traces, and operation results shall be scoped by retailer, placement generation, actor authorization version, resource/version, operation, and payload digest as applicable. Positive cache TTL is at most 30 seconds and unavailable TTL five seconds; commits invalidate affected keys. | Cross-tenant fixtures substitute every identifier, cache component, message envelope, idempotency key/payload, page cursor, and correlation value. Direct Redis or foreign-schema access is denied and cache outage exercises governed fallback. | Quarantine or evict the entry/message, preserve authoritative state, return a safe conflict/denial, and raise an integrity alert. |
| NFR3.4 | Approval, rejection, cancellation, and receipt decisions shall serialize on the purchase aggregate. One transaction through owned module ports shall validate all receipt lines and atomically commit Purchasing receipt/order state, Retail Data movements/positions, audit, and outbox effects. | Concurrency tests cover approve/approve, approve/reject, cancel/receipt, receipt/receipt, stale order/stock versions, line substitution, cumulative 6+4 success, 6+5 rejection, broker interruption, and exact/changed-payload replay. | Exactly one valid race winner commits; every loser returns a stable conflict and no partial receipt, stock movement, order transition, audit, or event. |
| NFR4.1 | .NET runtime access shall use parameterized U8- and U4-owned stored procedures/functions through Dapper/Npgsql only. Application roles shall have no direct table DML/DDL, arbitrary SQL, migration rights, RLS bypass, cross-unit table access, or audit update/delete privilege. Flyway owns schema migration under separate credentials. | Static, grant, integration, pooled-connection, and migration tests prove only approved routines and public module ports are reachable and that the co-located receipt transaction preserves logical ownership. | Fail the operation or readiness check and never retry with broader credentials or direct SQL. |
| NFR5.1 | Browser calls shall arrive through the BFF OIDC session with authorization code/PKCE, secure HttpOnly cookies, server-side tokens, and CSRF protection. Internal callers shall use narrow issuer, audience, scope, retailer, operation, and job/lease claims. | Tests cover invalid callbacks, expired/revoked sessions, missing/forged CSRF, wrong audience/scope, assistant and worker escalation, stale lease, and direct browser access to domain services. | Deny and preserve allowance, review, proposal, order, receipt, inventory, audit, and outbox state. |
| NFR6.1 | HTTP, PostgreSQL, RabbitMQ, Redis, object access, and module extraction seams shall use TLS 1.2 or later with validated service identity. Persistent volumes, database backups, Redis persistence when enabled, and exported evidence shall be encrypted. Distinct least-privilege credentials shall be delivered through Vault/VSO with tested reload, rotation, revocation, backup, and recovery; no secret shall enter Git, images, Terraform state, manifests, telemetry, or evidence. | Connection tests reject plaintext, expired/untrusted/wrong-name certificates and foreign identities. Secret scans, RBAC/mount checks, canaries, rotation/restart tests, and restore drills prove isolation and fail-closed behavior. | Keep the capability unready, deny access, rotate suspected exposure, and emit only safe diagnostics; never downgrade transport or mount unencrypted persistence. |
| NFR8.1 | REST boundaries shall use OpenAPI 3.1 and asynchronous commands/events AsyncAPI 3.0 with bounded products/lines/pages/responses, scale-four decimals, tenant and role context, placement/version fields, idempotency key and payload digest, purchase state, allowance, provenance, pagination, stable errors, and complete/partial/failed/stale/unavailable states. C14 is create-only for assistant Drafts. C15 v2 is the construction baseline; its authenticated producer binding, canonical digest, 64 KiB envelope, five total delivery attempts, one-to-30-second backoff, seven-day DLQ, and bounded replay supersede the legacy unresolved v1 retry placeholder. | CI validates syntax, examples, compatibility, generated clients, replay/conflict behavior, authorization matrices, numeric/size bounds, receipt fixtures, absence of an assistant-edit route, and C08-C10/C14/C15-v2/C17-C18 semantics. | Block the applicable change; a valid contract never grants runtime authority. |
| NFR10.1 | Logs, traces, metrics, errors, and evidence shall exclude credentials, tokens, CSRF values, raw supplier documents, full prompts, hidden reasoning, foreign tenant data, and unbounded product/order/receipt payloads. High-cardinality actor, job, review, scenario, proposal, order, receipt, event, and version identifiers are allowed only in access-controlled logs/traces; metrics use bounded statuses, operation classes, and tenant hashing. | Canary, cardinality, redaction, exception, problem-detail, cache-diagnostic, and evidence-bundle tests verify the signal-specific attribute policy. | Redact/drop unsafe fields, count telemetry loss, reject unsafe evidence publication, and preserve authoritative work. |
| NFR13.1 | CI shall run unit/integration, OpenAPI/AsyncAPI, Dapper/stored-routine/Flyway, tenant/role, numeric/calculation, idempotency/concurrency, cache, messaging, receipt conservation, recovery, secret, container, dependency, and supply-chain checks on hosted untrusted runners. | Workflow policy proves public PR code receives no local runner, cluster, Vault, PostgreSQL, Redis, RabbitMQ, deployment, or owner credentials. | Block release/deployment and retain failed-control evidence. |

## Explicit limitations

Synthetic data does not relax tenant, encryption, role, or credential controls.
Autonomous purchase submission or approval, direct cross-module table access,
post-receipt cancellation, and assistant receipt authority are outside v1.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-21T13:26:09Z
**Iteration:** 1
**Request Challenge:** review:422716c06c857eb962d0a6d3fa8e77ae

### Findings

No gate-relevant Critical, Major, or Minor findings.

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Read-only NFR ID and traceability check | PASS: 30 unique detailed NFR IDs; no missing targets or orphan IDs | The stage traceability covers every detailed requirement declared by this unit. |
| Read-only revision assertions | PASS: combined contention profile, fixed one-pod/three-slot capacity, C14 create-only authority, and C15 v2 supersession are present | Confirms the three requested prior repairs directly in the revised artifacts. |
| Cross-artifact architecture review | PASS | Purchase/receipt atomicity, role boundaries, payload-bound idempotency, performance, resources, reliability, recovery, observability, and upstream traceability are implementable and consistent with the passed contracts. |

### Summary

The revised requirements define a bounded, testable local operating profile and preserve atomic purchase/receipt behavior under retries, races, failures, and recovery. The named prior gaps are resolved, with no remaining approval-relevant defect found in this advisory pass.
