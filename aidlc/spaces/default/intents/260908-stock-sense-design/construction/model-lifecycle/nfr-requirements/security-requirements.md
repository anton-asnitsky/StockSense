# Model Lifecycle Security Requirements

Unit: U6 Model Lifecycle (`model-lifecycle`)

## Authority boundary

PostgreSQL control records own lifecycle state and active routes, MLflow owns
experiment evidence, and S3-compatible object storage owns immutable bytes.
None grants tenant membership or Operator authority. Production callers resolve
server-owned routes and cannot provide arbitrary artifact locations.

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR3.1 | Every dataset, job, attempt, run, evaluation, artifact, release, route, promotion, rollback, retention, and restore operation shall revalidate current identity, retailer scope, role/job authority, and placement generation at API, message, control-store routine, object-prefix, manifest, and MLflow boundaries. | Negative tests cover missing context, identifier substitution, foreign object/run/release IDs, pooled-client reuse, stale placement, revoked authority, and forged job claims. | Deny without disclosing foreign existence, metadata, timing-sensitive detail, or content. |
| NFR3.2 | Training rows, fitted parameters, artifacts, metrics, MLflow runs, manifests, and routes shall remain retailer-isolated. Shared algorithm code and feature specifications may be reused, but no learned state or row may cross retailers. | Train all three seeded retailers and verify distinct dataset/artifact hashes, storage prefixes, MLflow filters, model packages, and active routes; inject cross-tenant references at every boundary. | Quarantine the affected job/release, keep routes unavailable, and raise an immediate integrity alert. |
| NFR3.3 | Immutable objects and model releases shall be accepted only after SHA-256, format, schema, runtime, tenant, and provenance validation. Dataset manifests shall separate training inputs from evaluation-only latent demand and lost-demand truth. | Corrupt, swapped, truncated, foreign, future-leaking, and incompatible fixtures fail before fitting, validation, activation, or inference. | Mark evidence corrupt/ineligible and never substitute, repair in place, or broaden access. |
| NFR3.4 | MLflow shall be an internal evidence dependency, not a user-facing authorization boundary. Its service remains ClusterIP-only and NetworkPolicy permits calls only from the U6 API/worker identities. Human inspection flows through the BFF and U6 API, which revalidates Operator and retailer authority and resolves server-owned run identifiers; the MLflow UI/API and metadata/object credentials are never exposed directly. | Service/Ingress inventory and NetworkPolicy probes deny browser, host, foreign namespace, and non-U6 workload access. Authorization tests substitute retailer/run identifiers through the U6 evidence API, revoked Operators lose access immediately, and MLflow queries always include the server-resolved retailer/run scope. | Deny the request and expose no foreign run existence; keep MLflow unreachable rather than bypass U6 authorization. |
| NFR4.1 | PostgreSQL runtime access shall use parameterized U6-owned stored procedures/functions only. The Python service may invoke those routines through its pinned driver but shall perform no direct table DML/DDL or arbitrary SQL; .NET services retain Dapper/Npgsql and EF Core remains prohibited. | Static and integration checks deny table privileges, dynamic SQL, migration rights, cross-unit schema access, RLS bypass, and audit mutation while approved routines pass. | Fail the request or readiness check; never retry with broader credentials. |
| NFR5.1 | Human administration shall arrive through the BFF OIDC session/CSRF boundary and require current Operator authority. Workers and Forecasting use narrow issuer, audience, scope, retailer, operation, and job claims. | Tests cover invalid callback/session/CSRF, expiry/revocation, wrong audience/scope, Planner/Manager promotion attempts, worker route changes, and Forecasting-selected artifact URIs. | Deny with stable problem details and preserve all lifecycle and route state. |
| NFR6.1 | PostgreSQL, MLflow, object-store, RabbitMQ, signing, encryption, and telemetry credentials shall use distinct least-privilege workload identities and Vault/VSO-managed short-lived delivery. Secrets shall be absent from Git, images, Terraform state, manifests, logs, and evidence. | Secret scans, identity/mount tests, rotation/reload tests, canaries, and clean setup prove isolation and redaction. | Keep the dependent capability unready, revoke/rotate suspected exposure, and preserve safe diagnostics. |
| NFR6.2 | All U6 traffic carrying commands, tenant context, credentials, datasets, metrics, artifacts, or lifecycle evidence shall use authenticated TLS 1.2 or later with hostname verification, including PostgreSQL, RabbitMQ, MLflow, object storage, Vault/VSO, and OTLP. PostgreSQL/MLflow metadata, RabbitMQ durable data, object bytes, recovery snapshots, and backups shall be encrypted at rest by the declared local platform mechanism; object and backup encryption keys are Vault-owned, versioned, access-scoped, rotated without losing retained reads, and recoverable only through the documented recovery procedure. | Automated configuration and connection probes reject plaintext, untrusted, expired, wrong-host, and revoked certificates at every channel. Storage inspection and restore tests prove encrypted persistent bytes and backups, workload denial of key access, key-version evidence, successful rotation overlap, recovery after restart, and fail-closed behavior when trust or key material is unavailable. | Refuse the connection or keep the dependency unready; never downgrade to plaintext, disable certificate verification, persist unencrypted fallback bytes, or destroy a key still required by retained data. |
| NFR8.1 | REST boundaries shall use OpenAPI 3.1 and asynchronous commands/events AsyncAPI 3.0 with bounded schemas, tenant/job authority, operation keys, request hashes, expected route versions, provenance, and stable errors. | CI validates syntax, examples, compatibility, generated clients, replay/conflict behavior, and field bounds. | Block the applicable change; schema conformance never grants runtime authority. |
| NFR10.1 | Signals shall exclude credentials, tokens, signed object URLs, source rows, model bytes, raw feature vectors, hidden prompts/reasoning, and foreign tenant data. Identifiers shall be safe and bounded. | Canary and cardinality tests inspect logs, traces, metrics, MLflow tags, exceptions, and evidence bundles. | Redact/drop unsafe detail, count telemetry loss, and reject unsafe evidence publication. |
| NFR13.1 | CI shall run unit/integration, contract, stored-routine/Flyway, temporal-leakage, tenant, artifact-integrity, dependency, secret, container, and software-supply-chain checks on hosted untrusted runners. | Workflow policy proves public PR code receives no local runner, cluster, Vault, object-store, MLflow, or deployment credentials. | Block release/deployment and retain the failed control evidence. |

## Explicit limitations

Synthetic data does not reduce tenant or secret controls. Optional remote ML,
automatic cloud fallback, arbitrary production artifact selection, and automatic
promotion or rollback are outside v1.

## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-21T12:58:46Z
**Iteration:** 1
**Request Challenge:** review:e171342d71951cfc6f462450312d92a5

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/construction/model-lifecycle/nfr-requirements/security-requirements.md > transport and storage protection requirements | The review was stopped before the revised artifact could be loaded, so there is no checkable evidence that TLS boundaries and at-rest encryption responsibilities, key authority, and measurable acceptance tests resolve the prior finding. | Specify every protected hop and persisted store, the encryption and key authority for each, and executable acceptance evidence for TLS and encryption at rest. | New |
| R-02 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/construction/model-lifecycle/nfr-requirements/security-requirements.md > MLflow tenant authorization requirements | The review was stopped before the revised artifact could be loaded, so there is no checkable evidence that MLflow tenant isolation has an implementable authorization topology across MLflow, object storage, and PostgreSQL. | Define the enforcing identity and policy point for every MLflow API, artifact-store, and metadata-store access path, including denial tests for cross-tenant access. | New |
| R-03 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/construction/model-lifecycle/nfr-requirements outputs > queue reliability requirements | The review was stopped before the revised outputs could be loaded, so queue expiry, retry, redelivery, deduplication, and stable request identity semantics cannot be verified against RabbitMQ authority or promotion and rollback safety. | Define message identity across retries and redeliveries, expiry and dead-letter behavior, retry limits and backoff, idempotency ownership, and measurable duplicate and stale-message acceptance tests. | New |
| R-04 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/construction/model-lifecycle/nfr-requirements outputs > performance requirements | The review was stopped before the revised outputs could be loaded, so sample size, warm-up, percentile calculation, workload mix, resource envelope, and deadline semantics cannot be verified for the local 16 GiB and 3 CPU constraint. | Define a reproducible benchmark protocol with sample and exclusion rules, end-to-end deadline boundaries, workload and concurrency, percentile method, fixed 16 GiB/3 CPU limits, and pass/fail thresholds. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Stage-declared validation tools | NOT RUN: the stage file was not loaded before the review was terminated | No structural validation evidence is available for this advisory verdict. |

### Summary

The four previously identified risks cannot be cleared from the evidence gathered in this pass. Because all four affect implementability and production safety, the approval gate should treat them as unresolved until the revised requirements and their measurable acceptance criteria are verified.
