# StockSense units of work

Date: 2026-09-23
Stage: Units Generation
Status: Draft for independent review
Summary confirmation: Looks correct (2026-09-23)

The unit identifiers are stable joins for later Construction artifacts. Their numeric order is identification only and does not select an implementation sequence.

## Upstream basis

This decomposition applies the logical ownership and acyclic interactions in `../domain-design/components.md`, the boundary constraints in `../domain-design/decisions.md`, the functional and non-functional obligations in `../requirements-analysis/requirements.md`, and all 67 stories in `../user-stories/stories.md`. Components remain logical business boundaries even when several are packaged in one unit. Stable U1-U13 identities are retained from the prior plan; U14 and U15 cover the newly approved MessagingPlatform and RecoveryCoordination boundaries.

## Unit catalogue

| Unit ID | Unit name | Directory | Kind | Deployment model | Complexity | Logical scope |
| --- | --- | --- | --- | --- | --- | --- |
| U1 | `contracts` | `u1-contracts` | `spec` | Shared, consumed in place and through generated artifacts | M | OpenAPI, AsyncAPI, domain schemas, envelope specifications, compatibility policy |
| U2 | `platform-infrastructure` | `u2-platform-infrastructure` | `packaging` | Shared cluster and delivery packaging | XL | Terraform/Terragrunt, Helm, Kubernetes dependencies, Vault bootstrap, CI/deployment packaging |
| U3 | `identity-access` | `u3-identity-access` | `service` | Standalone .NET service | L | IdentityAccess |
| U4 | `retail-data` | `u4-retail-data` | `service` | Module in the shared v1 Retail Operations .NET deployment with U8 | XL | TenantDirectory, Inventory, DemandHistory, including dated inbound commitments |
| U5 | `supplier-knowledge` | `u5-supplier-knowledge` | `service` | Standalone service | XL | SupplierKnowledge |
| U6 | `model-lifecycle` | `u6-model-lifecycle` | `service` | Standalone Python service and worker | XL | ModelLifecycle |
| U7 | `forecasting` | `u7-forecasting` | `service` | Standalone Python service and worker | L | Forecasting |
| U8 | `planning-purchasing` | `u8-planning-purchasing` | `service` | Module in the shared v1 Retail Operations .NET deployment with U4 | XL | Replenishment, Purchasing |
| U9 | `assistant` | `u9-assistant` | `service` | Standalone Python Strands service | XL | Assistant |
| U10 | `audit-evidence` | `u10-audit-evidence` | `service` | Standalone projection and query service | L | AuditEvidence |
| U11 | `web-bff` | `u11-web-bff` | `service` | Standalone .NET backend for frontend | L | Session boundary, retailer context, CSRF protection, API composition |
| U12 | `web-application` | `u12-web-application` | `ui` | Standalone React static web application | XL | WebExperience |
| U13 | `demo-evidence` | `u13-demo-evidence` | `packaging` | Shared reproducibility and evidence package | L | DemoEvidence |
| U14 | `messaging-platform` | `u14-messaging-platform` | `library` | Reusable code embedded in asynchronous producers and consumers | L | MessagingPlatform |
| U15 | `recovery-coordination` | `u15-recovery-coordination` | `service` | Standalone recovery coordinator service | XL | RecoveryCoordination |

## Unit responsibilities and boundaries

### U1 — Contracts

**Owns and delivers:** versioned OpenAPI definitions for every REST boundary, AsyncAPI definitions for RabbitMQ flows, authoritative domain message and envelope schemas, examples, compatibility rules, and generated-client inputs.

**Boundary:** it defines integration meaning but contains no business behavior, runtime authorization, transport broker, shared messaging implementation, or persistence model. U14 implements the common messaging protocol against these specifications. A generated artifact cannot grant access to another unit's storage.

**Implementation constraints:** validate syntax, examples, compatibility, tenant/correlation metadata, idempotency fields, and error envelopes in CI. Consumers may generate local types, but no mandatory shared runtime library couples their release cycles.

### U2 — Platform Infrastructure

**Owns and delivers:** Terraform/Terragrunt composition, local-state defaults and backend migration controls, Helm packaging, Docker Desktop Kubernetes prerequisites, namespaces, ingress, persistent volumes, Vault/VSO bootstrap, and packaging for PostgreSQL, RabbitMQ, Redis, MongoDB, Qdrant, MLflow, object storage, OpenSearch, and telemetry.

**Boundary:** it provisions and packages infrastructure; it does not own business data, demo truth, application behavior, or cloud provisioning without an explicit execution decision.

**Implementation constraints:** keep the full demonstrated workload within the 16 GB RAM and 3 CPU planning envelope; support a clean CPU-only reviewer path; keep secrets out of Git and Terraform state; pin versions and checksums; preserve optional GPU and future cloud adapters.

### U3 — Identity Access

**Owns and delivers:** Duende IdentityServer, local demo accounts, Google OIDC federation, explicit safe linking, sessions, signing-key lifecycle, machine credentials, and identity audit/outbox events.

**Boundary:** it authenticates identities but does not own retailer membership or business authorization. It owns its PostgreSQL schema and accesses it only through owned stored procedures/functions using Dapper/Npgsql.

**Implementation constraints:** persistent keys and identity data, authorization-code/PKCE support for the BFF, narrow machine scopes/audiences, Vault-sourced secrets, and negative tests for email-only linking, expired sessions, replayed cookies, and invalid callbacks.

### U4 — Retail Data

**Owns and delivers:** retailer/store/membership/role/placement management; product, stock position, movement ledger, dated inbound-supply commitments, and inventory imports; demand, lost-demand, promotion, synthetic-truth, and source-version imports.

**Boundary:** TenantDirectory, Inventory, and DemandHistory remain separate internal modules with explicit ports and owned schemas/routines. U4 owns `InboundSupplyCommitment`; U8 owns purchase orders and commands commitment changes through the Inventory port. The unit does not own supplier terms, forecasts, recommendations, purchases, or model artifacts.

**Implementation constraints:** .NET with Dapper/Npgsql and Flyway; runtime access only through parameterized stored procedures/functions; strict tenant and placement-generation checks; transactional audit/outbox writes; disposable Redis cache; preserved seam for Catalog extraction and per-tenant database placement. U4 and U8 ship in one v1 Retail Operations deployment so approval, cancellation, and receipt stock/commitment changes can use one PostgreSQL transaction while retaining owned routines and ports.

### U5 — Supplier Knowledge

**Owns and delivers:** supplier submissions, bounded CSV and text-PDF extraction, validation outcomes, offers, accepted commercial terms, source/page provenance, document chunks, and tenant/model-specific retrieval-index lifecycle.

**Boundary:** MongoDB owns source/extraction records, PostgreSQL routines own normalized accepted terms, and Qdrant is a rebuildable projection. The service does not own product identity, model experiments, assistant conversations, or purchasing decisions.

**Implementation constraints:** idempotent RabbitMQ jobs, explicit partial/scan failures, currency validation, authorized collection routing, source deletion reconciliation, EmbeddingGemma/Qwen comparison support, and no client-selected arbitrary collections.

### U6 — Model Lifecycle

**Owns and delivers:** leakage-safe dataset versions, baseline and candidate experiments, temporal forecast evaluation, chronological inventory-policy evaluation, model artifacts, MLflow lineage, promotion, and rollback.

**Boundary:** it governs training and model selection but does not produce operational forecasts or purchasing recommendations. It consumes versioned data and terms through contracts rather than direct storage access.

**Implementation constraints:** Python and MLflow; immutable checksummed artifacts in object storage; reproducible code/configuration/data lineage; retained failed candidates; seasonal-naive and moving-average baselines; explicit zero-denominator and synthetic-data limitations.

### U7 — Forecasting

**Owns and delivers:** idempotent daily forecast requests and runs, 28-day forecast series, run status, freshness, model/data/configuration provenance, and forecast lifecycle events.

**Boundary:** it serves only promoted compatible models and does not train, promote, or silently substitute models. It reads demand and model metadata through contracts and owns operational forecast persistence through stored routines.

**Implementation constraints:** Python runtime; retailer-local scheduling with UTC timestamps; explicit stale, unavailable, and failed states; no duplicate effects for repeated schedule triggers; CPU-compatible baseline and promoted-model inference.

### U8 — Planning and Purchasing

**Owns and delivers:** replenishment policies and overrides, scheduled/manual review jobs and quotas, scenarios, recommendations and evidence snapshots, purchase proposals/orders, manager decisions, cancellation, and partial/full receipts.

**Boundary:** Replenishment advises and Purchasing owns authority; both remain explicit internal modules. The unit never trains models, edits supplier terms, or bypasses Retail Data for stock or inbound-commitment updates. Approval, pre-receipt cancellation, and receipt coordination use public ports and owned routines without cross-component table access.

**Implementation constraints:** .NET with Dapper/Npgsql and Flyway; deterministic formulas; one active review per retailer; three accepted manual requests per retailer-local day; scheduled jobs excluded from quota; immutable submitted lines; manager approval; cumulative receipt limits and atomic stock, dated-inbound, audit, and outbox effects. U8 shares the v1 Retail Operations deployment with U4 while remaining a distinct construction unit.

### U9 — Assistant

**Owns and delivers:** bounded conversations, turns, typed tool orchestration, citations, action drafts, interruption recovery, agent evaluation hooks, and provider/LLM adapters.

**Boundary:** it treats model output as untrusted and holds no retailer or purchasing authority. Every tool rechecks current authority and invokes governed service contracts; only Planning and Purchasing creates proposals or records decisions.

**Implementation constraints:** Python Strands; local llama.cpp and Qwen generation candidate first; explicit optional Bedrock adapter; CPU-only reviewer route; no automatic external fallback; authorized Qdrant retrieval; idempotent side-effecting tools; prompts and hidden reasoning excluded from logs by default.

### U10 — Audit Evidence

**Owns and delivers:** idempotent consumption of authoritative audit events, OpenSearch projections, index checkpoints, replay requests, retention runs, operator correlation views, and tenant-authorized business-audit queries.

**Boundary:** business services own authoritative audit/outbox rows in their own transactions. This unit owns only rebuildable projection and query state and cannot make a mutation valid.

**Implementation constraints:** RabbitMQ inbox/idempotency, replay and lag telemetry, 90-day configurable business-audit retention, 7-day operational-log default, bounded telemetry buffering, sensitive-data redaction, and isolation across query APIs and indexes.

### U11 — Web BFF

**Owns and delivers:** browser login orchestration, secure HttpOnly session cookies, server-side tokens, CSRF protection, retailer-context enforcement, API composition, and browser-safe error/state translation.

**Boundary:** it owns no business entities and cannot authorize from cached claims alone. It calls service contracts under the current identity and membership and never gives the browser service credentials or raw access tokens.

**Implementation constraints:** .NET; authorization code with PKCE; old-cookie replay rejection; correlation propagation; typed clients generated from U1; explicit handling for loading, stale, unavailable, and partial downstream results.

### U12 — Web Application

**Owns and delivers:** the React/TypeScript/Vite application using Ant Design and Ant Design Charts, including the role-aware shell, retailer selector, operational dashboard, data workspaces, purchase review, assistant panel/workspace, and evidence views.

**Boundary:** it owns transient presentation state only and calls U11 exclusively. It does not store tokens, reproduce server authorization, or communicate directly with domain services.

**Implementation constraints:** WCAG 2.2 AA target; desktop/tablet workflows and mobile read/review essentials; keyboard operation; English first with multilingual extensibility; explicit loading, empty, failure, stale, denied, and quota-exhausted states.

### U13 — Demo Evidence

**Owns and delivers:** deterministic demo scenarios and dataset generation, clean-checkout setup verification, end-to-end smoke and recovery runs, resource/performance measurements, evidence manifests, and links from requirements to demonstrated results.

**Boundary:** it verifies through supported contracts and deployment interfaces; it does not seed by writing application tables directly, own infrastructure definitions, or turn an unmeasured claim into evidence.

**Implementation constraints:** three isolated retailers with one store and 100 products each, 18 months of history, repeatable seeds, CPU inference without owner secrets/cache/GPU, actual resource and latency measurements, recovery limitations, and revision-bound evidence.

### U14 — Messaging Platform

**Owns and delivers:** the reusable AsyncAPI-aligned envelope implementation, RabbitMQ adapter, publisher confirms, delivery identity, retry/dead-letter/replay policy, payload-size enforcement, telemetry hooks, topology conventions, and protocol conformance fixtures.

**Boundary:** U14 owns shared broker mechanics and reusable code, not domain message meaning or business authority. U1 owns authoritative schemas; every producer and consumer owns its message definitions, transactional outbox/inbox state, authorization, duplicate handling, and atomic business effects. RabbitMQ deployment remains in U2.

**Implementation constraints:** version the library independently; support .NET and Python consumers through generated or language-native packages with equivalent envelope semantics; prove confirm, retry, DLQ, replay, duplicate, ordering, size-limit, and telemetry behavior through conformance tests; keep the library stateless and tenant-agnostic except for validated envelope metadata.

### U15 — Recovery Coordination

**Owns and delivers:** tenant-scoped recovery runs, required-participant registration, write-ahead command inventory, versioned phase deadlines, checkpoint-set closure, manifest verification, generation fencing, destructive-confirmation evidence, participant acknowledgements, and terminal recovery outcomes.

**Boundary:** U15 coordinates recovery without owning participant business state or backup implementations. U3 retains identity/key recovery, U4 retains retailer placement and data recovery, every participant rejects stale or terminal generations locally, U10 projects recovery audit evidence, and U13 executes supported verification scenarios.

**Implementation constraints:** use PostgreSQL routines for authoritative coordinator state; issue commands and receive acknowledgements through U14; persist monotonic generation and terminal guards; fail closed on missing participants, missed deadlines, digest mismatch, or placement-generation drift; use Vault and object-storage references without placing secrets in manifests.

## Cross-unit rules

- Each runtime unit owns its persistence and routines; no unit reads or writes another unit's tables, collections, buckets, or vector collections directly.
- C07 has one narrow transaction-preserving exception: U5/U7 owner-controlled PostgreSQL finalization routines may invoke the U6-owned, versioned `model_lifecycle.finalize_heavy_work_v1` stored function with `EXECUTE` privilege inside their retailer-local transaction. They receive only a typed disposition, never table access; U6's tenant-local fence/route records and owner publication rows must stay in the same retailer database when a tenant is split. The central global slot is reconciled from the committed tenant-local terminal record and stays held on uncertainty.
- REST dependencies use U1 OpenAPI contracts. Durable asynchronous dependencies use RabbitMQ, U1 AsyncAPI contracts, and U14 shared broker mechanics. Domain units retain transactional outbox/inbox, authorization, idempotency, and atomic effects.
- Tenant identity, retailer identity, placement generation, actor, correlation, causation, idempotency key, contract version, and source/model versions cross boundaries explicitly where applicable.
- Redis, Qdrant, and OpenSearch are disposable projections. PostgreSQL business/audit records, MongoDB source records, and object/model artifacts remain authoritative under their owning units.
- U15 coordinates recovery barriers and terminal outcomes while every participant owns its state, checkpoint implementation, and generation guard.
- U2 supplies platform interfaces and base packaging; application units retain their own image build and service-specific deployment values. U13 consumes supported deployment and application interfaces, including U14 conformance and U15 recovery flows, to verify the assembled system.

## Complexity interpretation

- **M:** bounded specification work with broad consumers.
- **L:** one substantial service or package with defined integrations.
- **XL:** multiple complex workflows, data stores, safety invariants, or evidence obligations. The estimate is relative and does not select an implementation order.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-23T10:56:17Z
**Iteration:** 1

### Findings

No material findings.

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Stage-defined validation tools | No standalone validation tool declared | The stage declares gate sensors rather than a reviewer-invoked validation command. |
| Cross-artifact architecture review | PASS | The artifacts declare 15 valid units and kinds, preserve all approved logical boundaries, separate U14 contract/specification, infrastructure, and domain authority, limit U15 to recovery coordination while participants retain their state and implementations, preserve separate U4/U8 construction ownership with one v1 deployment, and prohibit direct cross-unit storage access. The prose and fenced YAML describe the same acyclic topology without choosing delivery order. |
| Story and traceability review | PASS | The story map contains all 67 stories, including US3.4, US4.8, US9.11, and US10.3. US6.4, US8.5, US9.11, and US10.3 match the approved assignments, and every traceability target is the declared primary unit on its story row. |

### Summary

The 15-unit decomposition is internally consistent, acyclic, complete against the approved 67-story scope, and explicit enough for downstream contract design and delivery planning without assigning an economic delivery sequence.

