# Forecasting Security Requirements

Unit: U7 Forecasting (`forecasting`)

## Authority boundary

PostgreSQL owns immutable forecast requests, runs, attempts, series,
publications, acknowledgements, current pointers, audit, and outbox/inbox state.
Retail Data and Model Lifecycle remain authoritative for inputs and releases.
Redis is disposable and model objects are immutable dependencies, never sources
of tenant, role, freshness, or current-selection authority.

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR3.1 | Every schedule, rerun, attempt, read, publication, acknowledgement, repair, retention, and restore operation shall revalidate current tenant, placement generation, human role or machine scope, job/run ownership, product ownership, and contract version at HTTP, message, stored-routine, cache, and artifact boundaries. | Negative tests cover missing context, route/resource substitution, revoked authority, wrong audience/scope, stale placement, pooled connections, product expansion, and forged run/release/source IDs. | Deny with stable safe errors and no foreign existence, content, timing-sensitive detail, or state effect. |
| NFR3.2 | Cache keys, queue messages, staged output, model artifacts, forecast series, traces, and evidence shall remain retailer- and version-scoped. A server-resolved release and current pointer cannot be replaced by a caller-selected identifier or cached value. | Cross-tenant fixtures substitute every identifier, cache field, message envelope, object reference, coverage digest, and pointer version; direct Redis/object/PostgreSQL access is denied. | Quarantine the attempt or cache entry, preserve the authoritative pointer, and raise an immediate integrity alert. |
| NFR3.3 | HTTP, PostgreSQL, RabbitMQ, Redis, and object access shall use TLS 1.2 or later with validated service identity and configured trust roots. PostgreSQL/PVC data, backups, optional Redis persistence, and artifacts shall be encrypted at rest with platform-managed keys and documented rotation/recovery ownership. | Connection tests reject plaintext, expired/untrusted/wrong-name certificates and foreign service identities. Storage/config scans and restore/rotation drills verify encryption, key access, overlap, revocation, and fail-closed startup/readiness. | Keep the dependency or workload unready, deny access, preserve safe diagnostics, and never downgrade transport or mount unencrypted persistence. |
| NFR3.4 | Trained releases shall use the pinned `skops.io` artifact format with an explicit versioned trusted-type allowlist; pickle, joblib, cloudpickle, arbitrary Python imports, and embedded executable payloads are prohibited. Before parsing or loading, the worker shall verify the artifact SHA-256 and an Ed25519 signature over a canonical manifest containing retailer, release, model definition, training code/dependency lock digests, feature/input/output schema digests, runtime profile, artifact hash, signer key ID, and signing time. Signing keys are Vault-owned; verification keys are pinned with overlap for retained releases. | Positive fixtures load an approved signed baseline/trained release. Negative fixtures reject unsigned, altered, malformed, foreign-retailer, untrusted/expired/revoked signer, disallowed type, code-bearing, oversized, incompatible-runtime/schema, and checksum-valid-but-manifest-mismatched artifacts before deserialization. Rotation and rollback tests retain verification for every in-policy release. | Mark the release unavailable, quarantine the bytes and manifest, emit a safe integrity alert, and never fall back to another artifact or unsafe loader. |
| NFR4.1 | PostgreSQL runtime access shall use parameterized U7-owned stored procedures/functions only. The Python service may invoke those routines through its pinned driver but shall perform no direct table DML/DDL or arbitrary SQL; .NET services retain Dapper/Npgsql and EF Core remains prohibited. | Static and integration checks deny table privileges, dynamic SQL, migration rights, cross-unit schemas, RLS bypass, direct audit mutation, and foreign-tenant routine inputs while approved routines pass. | Fail the request/readiness check and never retry with broader credentials. |
| NFR5.1 | Browser-originated reads and Operator commands shall arrive through the BFF OIDC session/CSRF boundary. Scheduler, worker, Retail Data, Model Lifecycle, Planning, and assistant calls use narrow issuer, audience, scope, retailer, operation, and job claims. | Tests cover invalid/expired/revoked sessions, missing CSRF, Planner/Manager rerun or partial-ack attempts, worker publication without lease, assistant scope expansion, and Forecasting-selected human authority. | Deny and preserve requests, series, publication, and pointer state. |
| NFR6.1 | PostgreSQL, RabbitMQ, Redis, model-object, signing, encryption, and telemetry credentials shall use distinct least-privilege workload identities with Vault/VSO-managed short-lived delivery and tested reload/rotation. No secret shall enter Git, images, Terraform state, manifests, logs, traces, or evidence. | Secret scans, RBAC/mount tests, canaries, rotation/restart tests, and clean setup prove isolation and redaction. | Keep dependent capability unready, revoke/rotate suspected exposure, and record only safe diagnostics. |
| NFR8.1 | REST boundaries shall use OpenAPI 3.1 and asynchronous commands/events AsyncAPI 3.0 with bounded product/response schemas, decimal representation, tenant/job authority, operation keys, request hashes, expected pointer versions, provenance, freshness, coverage, and stable errors. | CI validates syntax, examples, compatibility, generated clients, replay/conflict behavior, field bounds, and complete/partial/failed/stale/unavailable states. | Block the applicable change; contract validity never grants runtime authority. |
| NFR10.1 | Signals shall exclude credentials, tokens, signed object URLs, raw source rows, model bytes, unbounded forecast series, hidden prompts/reasoning, and foreign tenant data. Metric labels shall use bounded status/version classes rather than product, user, run, or artifact IDs. | Canary/cardinality tests inspect logs, traces, metrics, exceptions, Redis diagnostics, and evidence bundles. | Redact/drop unsafe fields, count telemetry loss, and reject unsafe evidence publication. |
| NFR13.1 | CI shall run unit/integration, OpenAPI/AsyncAPI, stored-routine/Flyway, temporal/provenance, tenant, cache-isolation, artifact-integrity, scheduler/DST, idempotency/concurrency, dependency, secret, container, and supply-chain checks on hosted untrusted runners. | Workflow policy proves public PR code receives no local runner, cluster, Vault, database, Redis, model-object, or deployment credentials. | Block release/deployment and retain failed-control evidence. |

## Explicit limitations

Synthetic data does not relax tenant, encryption, or credential controls.
Automatic model fallback, caller-selected current forecasts, and direct access to
another unit's storage are outside v1.

## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-21T13:11:13Z
**Iteration:** 1
**Request Challenge:** review:3c80fc3aff7203cc7f2eeea3ae0b5634

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/construction/forecasting/nfr-requirements/scalability-requirements.md > NFR2.2 | The shared U6/U7 lease behavior is detailed, but its claimed U6-owned coordination API has no resolvable contract in the passed `contract-summary.md`: C07 defines only promoted-model lookup. Acquire/renew/release schemas, authentication, idempotency keys, status/error outcomes, version negotiation, queue inspection, and restore/recovery state are therefore undefined across independently implemented units. | Add the U6-owned versioned lease API to the shared contract baseline, including request/response schemas, authority, idempotency and conflict semantics, fencing-token propagation/finalization checks, queue/deadline outcomes, and restart/restore behavior; reference that contract from NFR2.2. | New |
| R-02 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/construction/forecasting/nfr-requirements/security-requirements.md > NFR3.4; inception/contract-design/contract-summary.md > C07 | Artifact verification correctly requires `skops.io`, SHA-256, Ed25519, and a trusted-type allowlist, but the producer-consumer boundary cannot carry the required proof: C07 returns only an artifact URI and checksum. The canonical manifest encoding/signature representation and manifest/signature/key metadata are also unspecified, so U6 and U7 can produce incompatible signed bytes or leave U7 unable to verify them. | Extend C07 with immutable manifest and signature references or fields, signer key ID/status and required digests; specify one canonical byte encoding and signature envelope; define trusted-type discovery and allowlist-version handling before load, including key revocation/overlap behavior for retained releases. | New |
| R-03 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/construction/forecasting/nfr-requirements/reliability-requirements.md > NFR15.2 | The recovery barrier pauses only U7 consumers and outbox relays while taking a RabbitMQ durable-volume/definitions snapshot. It does not freeze inbound publishers or other workloads that can mutate the broker, and it does not define a broker-supported atomic snapshot procedure. Queue counts and highest IDs cannot prove a consistent PostgreSQL/RabbitMQ cut when messages can change between the recorded watermark and volume snapshot. The U2-owned barrier is also absent from the passed contract baseline. | Define a versioned U2 recovery-barrier contract and a broker-supported quiescence/snapshot protocol that fences all producers, consumers, relays, acknowledgements, and topology changes affecting the captured queues; bind per-queue message identity/digests and PostgreSQL LSN/transaction evidence to the manifest, and specify abort/resume behavior for every partial barrier or snapshot failure. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| PowerShell JSON parse and NFR target-resolution check | PASS: `traceability.json` parsed; 15 upstream IDs and 15 coverage rows; every `OK` target resolved to a detailed NFR row | Structural traceability is complete for the declared upstream NFR set. |
| Review-section boundary check | PASS: no prior `## Review`; `## Explicit limitations` was the terminal heading | This review is appended once at the required terminal boundary. |
| Stage-declared sensors | Not rerun: the stage file lists sensor IDs but supplies no reviewer-invocable validation command | No tool failure is inferred; the direct structural check above supplements the artifact review. |

### Summary

Performance, resource, tenancy, durability/retention, and signal-specific telemetry requirements are measurable and implementable within U7. Approval should wait for shared contracts that make the U6 lease, signed model handoff, and PostgreSQL/RabbitMQ recovery cut independently implementable and consistent.
