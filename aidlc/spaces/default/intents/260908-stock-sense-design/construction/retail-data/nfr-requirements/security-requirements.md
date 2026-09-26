# Retail Data Security Requirements

Unit: U4 Retail Data (`retail-data`)

## Authority boundary

Retailer identifiers in routes, payloads, cache keys, messages, imports, or
manifests are context, never authority. U4 Tenant Directory resolves current
membership, independent role grants, placement target, and generation. U4 owns
on-hand stock and demand history; U8 owns purchase lifecycle and dated inbound
supply, while their v1 modules share one deployment only for atomic receipts.

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR3.1 | Every human, machine, import, snapshot, assistant-tool, receipt, and administrative operation shall revalidate current identity, membership/role, retailer ownership, scope/job authority, and placement generation. | Negative tests cover missing context, retailer/resource substitution, revoked membership, wrong role/scope, assistant-supplied authority, and stale jobs. | Deny without disclosing foreign data; no cache, token claim, route ID, or model input may override current authority. |
| NFR3.2 | PostgreSQL routines and connection handling shall bind retailer and placement context per operation and prevent leakage through pooled-connection reuse. Shared storage uses enforced tenant predicates/RLS; dedicated placement accepts only its current generation. | Alternating-tenant pool tests, missing/reset-context tests, malicious identifiers, copied jobs, and post-cutover stale requests return no cross-tenant value or effect. | Abort the transaction, discard unsafe connection state, and record a bounded security outcome. |
| NFR3.3 | Synthetic true demand shall be accessible only through an explicit evaluation-purpose contract. Operational, training, forecasting-input, UI, cache, assistant, and ordinary snapshot ports exclude it. | Contract, routine, snapshot-purpose, export, and cache tests prove absent truth outside authorized evaluation and preserve sales/lost demand separately. | Deny or omit the protected field with an explicit limitation; never silently substitute it into features. |
| NFR4.1 | Runtime roles shall call parameterized U4/U8-owned stored procedures/functions through Dapper/Npgsql only. Direct table SQL, EF Core, arbitrary SQL, cross-unit schema access, RLS bypass, and runtime audit deletion are prohibited; Flyway uses separate authority. | Static and integration tests deny direct DML/DDL, foreign schemas, migration rights, and audit mutation while proving approved modular receipt routines share one connection/transaction. | Fail request or readiness; never retry with broader credentials. |
| NFR5.1 | Browser calls arrive through U11's authenticated BFF session and CSRF boundary; machine callers use narrow issuer/audience/scope/job authority. U4 remains authoritative for retailer membership and role. | Tests reject expired/revoked sessions, invalid CSRF on mutations, wrong machine audience/scope, and machine attempts to perform human approval or membership administration. | Deny without business effect and return stable problem details. |
| NFR6.1 | Database, broker, object-store, Redis, and signing/transport credentials shall be workload-scoped Vault/VSO deliveries, absent from Git, Terraform state, imports, logs, and evidence, with tested reload/rotation. | Repository/state scans, RBAC/mount tests, rotation/restart tests, and canaries prove secret isolation and redaction. | Keep the dependent capability unready or fail closed; rotate suspected exposure. |
| NFR8.1 | U4 REST/admin/import/snapshot boundaries shall use versioned OpenAPI 3.1 contracts and durable events AsyncAPI 3.0, with provider-owned schemas, bounded examples, compatibility checks, idempotency, placement, and error semantics. | CI validates syntax, examples, generated clients, compatibility, C03/C08 refinements, upload/diagnostic limits, and event envelopes. | Block the applicable change; contract conformance cannot bypass runtime authorization. |
| NFR10.1 | Logs, traces, metrics, events, diagnostics, and evidence shall exclude credentials, tokens, raw import content, protected synthetic truth, foreign tenant identifiers, and unbounded row values. | Canary tests inspect all outputs; safe diagnostics retain bounded row/field location, rule ID, outcome, correlation, batch/version, and authorized tenant pseudonym. | Suppress unsafe detail and fail evidence publication when a safe actionable record cannot be produced. |
| NFR13.1 | CI shall run build/test, OpenAPI/AsyncAPI, Flyway/routine permission, tenant-isolation, migration, secret, dependency, and container checks on hosted untrusted runners; only trusted immutable revisions reach the isolated deployment runner. | Workflow policy and malicious fixtures prove public PR code receives no cluster/Vault/state credentials and cannot execute on the self-hosted runner. | Block release/deployment and record the failed control. |

## Threat and failure considerations

- Raw imports are untrusted: enforce byte/row/schema limits before expensive
  parsing, prevent formula/terminal injection in diagnostics, and verify object
  digests before processing or restore.
- Lock positions/orders in deterministic order; expected versions and
  idempotency hashes protect concurrent receipts and adjustments.
- Cache keys are server-built from verified retailer, placement generation,
  schema/entity version, and query shape. Cache data never authorizes a request.
- Tenant extraction copies protected data only to a verified destination and
  exposes it only after complete reconciliation and atomic directory cutover.

## Explicit limitations

U12 owns browser loading/empty/failure/stale states and keyboard behavior, so
inception NFR14 is not implemented by this service unit. This unit supplies
stable status/version/error contracts that U11/U12 consume.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-21T12:39:41Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/construction/retail-data/nfr-requirements/performance-requirements.md > NFR1.3 and aidlc/spaces/default/intents/260908-stock-sense-design/construction/retail-data/nfr-requirements/scalability-requirements.md > NFR2.2 | The 30-second/three-minute import completion targets do not define whether elapsed time starts at admission or active processing, while an admitted job may wait up to ten minutes. The same conforming run can therefore pass or fail depending on an unstated measurement boundary. | Define separate admission-to-start and active-processing clocks, state which clock the completion SLO uses, and require evidence for both. | New |
| R-02 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/construction/retail-data/nfr-requirements/reliability-requirements.md > Requirements | The reliability requirements define recovery and degraded behavior but no measurable service availability, readiness, restart-recovery, or error-budget objective for the Retail Data application. A developer cannot derive a pass/fail availability test or rollout criterion. | Add a portfolio-profile availability objective with measurement window and exclusions, plus bounded readiness/restart recovery criteria and acceptance evidence. | New |
| R-03 | Minor | aidlc/spaces/default/intents/260908-stock-sense-design/construction/retail-data/nfr-requirements/reliability-requirements.md > NFR7.1 | Five delivery attempts with exponential backoff “from one to 30 seconds” does not fix the delay sequence, jitter policy, or whether the initial delivery counts as an attempt, so independent implementations can produce materially different retry and DLQ timing. | Specify attempt counting and the deterministic backoff/jitter bounds used by acceptance tests. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| PowerShell JSON parse and traceability target resolution | PASS: 15 upstream IDs, 15 coverage rows, no missing detailed NFR targets | Traceability structure and referenced detailed requirement IDs resolve. |
| Terminal review-heading check | PASS: no existing `## Review` section | This iteration can append exactly one terminal review section. |

### Summary

Tenant isolation, PostgreSQL routine-only access, Flyway separation, Redis degradation, RabbitMQ durability, extraction, recovery, observability, and traceability are concrete enough to proceed. The two major measurement gaps should be resolved before implementation tests and rollout criteria are finalized.
