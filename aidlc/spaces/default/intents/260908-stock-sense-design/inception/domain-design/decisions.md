# StockSense domain design decisions

Date: 2026-09-10
Stage: Domain Design
Status: Draft for independent review

These ADRs define logical code boundaries. Units Generation owns deployment packaging, and existing project ADRs remain authoritative for technology choices.

## ADR-DD-001: Organize the domain by business capability

### Context

A single-reviewer portfolio needs explicit ownership without premature microservices.

### Decision

Use thirteen logical capability components with acyclic contracts; let Units Generation package them.

### Consequences

Ownership and extraction seams are visible, but interfaces require discipline even in one deployable.

### Alternatives Rejected

Five coarse areas hide authority; feature-level components create excessive coordination.

## ADR-DD-002: Separate authentication from retailer authorization

### Context

A valid session does not grant retailer access, and membership or placement can change independently.

### Decision

IdentityAccess owns accounts, federation, sessions, and keys. TenantDirectory owns retailers, stores, memberships, roles, regional settings, and placement. Protected work requires both.

### Consequences

Revocation can take effect before session expiry and stale placement generations are rejected.

### Alternatives Rejected

Identity-owned memberships and a combined component couple federation to business tenancy.

## ADR-DD-003: Keep product with stock and separate demand history

### Context

The initial catalog is simple, while sales, lost demand, promotions, and synthetic truth have a different lifecycle from stock.

### Decision

Inventory owns products and the stock ledger. DemandHistory owns demand observations and imports. Preserve a Catalog extraction seam.

### Consequences

Stock consistency stays cohesive and analytical inputs remain independently versioned.

### Alternatives Rejected

A first-release Catalog adds little value; Inventory or Forecasting ownership of demand mixes responsibilities.

## ADR-DD-004: Keep supplier provenance and retrieval together

### Context

Accepted terms and vector chunks must trace to tenant-authorized CSV/PDF source versions.

### Decision

SupplierKnowledge owns submissions, extraction, offers, accepted terms, chunks, and retrieval-index lifecycle. Assistant consumes typed retrieval results.

### Consequences

Qdrant remains rebuildable and agent changes cannot bypass source authorization.

### Alternatives Rejected

Assistant ownership weakens authority; a separate retrieval component adds an unproven boundary.

## ADR-DD-005: Separate operational forecasting from model lifecycle

### Context

Daily forecasts need stable status and freshness while experiments must retain failed candidates and evaluation evidence.

### Decision

ModelLifecycle owns datasets, experiments, evaluations, models, promotion, and rollback. Forecasting owns operational requests, runs, series, and freshness.

### Consequences

Experimentation can evolve without destabilizing serving; versions connect the components.

### Alternatives Rejected

One ML component mixes reliability models; infrastructure-only MLOps omits governed promotion behavior.

## ADR-DD-006: Separate replenishment advice from purchasing authority

### Context

Planning computes recommendations; purchasing enforces human approval and receipt invariants.

### Decision

Replenishment owns policies, review jobs, quotas, scenarios, recommendations, and evidence. Purchasing owns proposals, orders, transitions, and receipts and revalidates evidence.

### Consequences

Recommendations can expire without changing orders; Purchasing keeps one state machine.

### Alternatives Rejected

A combined planning component mixes advice and authority; Forecasting does not own supplier/inventory policy.

## ADR-DD-007: Keep authoritative audit records with business transactions

### Context

Required audit must be atomic, while OpenSearch is eventual and can be unavailable.

### Decision

Each mutating component appends local authoritative audit/outbox records. AuditEvidence owns projection, checkpoints, replay, retention, and authorized queries.

### Consequences

Search outages do not invalidate commits and indexes can be rebuilt; common event governance is required.

### Alternatives Rejected

A synchronous central audit component adds failure coupling; platform logs cannot satisfy business audit.

## ADR-DD-008: Use contracts and prohibit cross-component storage access

### Context

Shared databases today must not prevent tenant or component extraction tomorrow.

### Decision

Use synchronous contracts for immediate work and RabbitMQ events for durable propagation. Components mutate only owned stores through owned routines.

### Consequences

Boundaries stay testable; consumers must handle eventual consistency and idempotency.

### Alternatives Rejected

Mostly synchronous integration under-serves jobs/projections; eventing every request weakens immediate and atomic workflows.

## ADR-DD-009: Keep agents outside business authority

### Context

Model output is untrusted but the assistant must investigate and prepare governed actions.

### Decision

Assistant owns conversations, turns, tools, citations, and action drafts. Every tool rechecks tenant authority; Purchasing alone creates governed proposals and approvals.

### Consequences

Providers can change safely and retries cannot duplicate effects when business idempotency is used.

### Alternatives Rejected

Prompt-enforced rules and assistant-owned purchasing duplicate or weaken business authority.

## ADR-DD-010: Separate UI composition from reproducibility evidence

### Context

The UI spans capabilities, while the portfolio requires stable scenarios, measurements, and clean-environment evidence.

### Decision

WebExperience owns shell/composition/transient state and no business entities. DemoEvidence owns scenarios, generation/verification runs, and evidence manifests.

### Consequences

Cross-capability UX stays coherent and evidence remains revision-bound without bypassing domain contracts.

### Alternatives Rejected

Per-domain frontends fragment approved workflows; unrelated scripts weaken traceability.

