# StockSense domain design decisions

Date: 2026-09-23
Stage: Domain Design
Status: Reconciled draft for independent review
Summary confirmation: Looks correct (R-02/R-09/R-10/R-11 resolution cycle, 2026-09-23)
Confirmation receipt: recorded after owner response on 2026-09-23

These ADRs define logical code boundaries. Units Generation owns deployment packaging, and existing project ADRs remain authoritative for technology choices.

## ADR-001: Organize the domain by business capability

### Context

A single-reviewer portfolio needs explicit ownership without premature microservices.

### Decision

Use fourteen logical capability components with acyclic contracts; let Units Generation package them.

### Consequences

Ownership and extraction seams are visible, but interfaces require discipline even in one deployable.

### Alternatives Rejected

Five coarse areas hide authority; feature-level components create excessive coordination.

## ADR-002: Separate authentication from retailer authorization

### Context

A valid session does not grant retailer access, and membership or placement can change independently.

### Decision

IdentityAccess owns accounts, federation, sessions, and keys. TenantDirectory owns retailers, stores, memberships, roles, regional settings, and placement. Protected work requires both.

### Consequences

Revocation can take effect before session expiry and stale placement generations are rejected.

### Alternatives Rejected

Identity-owned memberships and a combined component couple federation to business tenancy.

## ADR-003: Keep product with stock and separate demand history

### Context

The initial catalog is simple, while sales, lost demand, promotions, and synthetic truth have a different lifecycle from stock.

### Decision

Inventory owns products and the stock ledger. DemandHistory owns demand observations and imports. Preserve a Catalog extraction seam.

### Consequences

Stock consistency stays cohesive and analytical inputs remain independently versioned.

### Alternatives Rejected

A first-release Catalog adds little value; Inventory or Forecasting ownership of demand mixes responsibilities.

## ADR-004: Keep supplier provenance and retrieval together

### Context

Accepted terms and vector chunks must trace to tenant-authorized CSV/PDF source versions.

### Decision

SupplierKnowledge owns submissions, extraction, offers, accepted terms, chunks, and retrieval-index lifecycle. Assistant consumes typed retrieval results.

### Consequences

Qdrant remains rebuildable and agent changes cannot bypass source authorization.

### Alternatives Rejected

Assistant ownership weakens authority; a separate retrieval component adds an unproven boundary.

## ADR-005: Separate operational forecasting from model lifecycle

### Context

Daily forecasts need stable status and freshness while experiments must retain failed candidates and evaluation evidence.

### Decision

ModelLifecycle owns datasets, experiments, evaluations, models, promotion, and rollback. Forecasting owns operational requests, runs, series, and freshness.

### Consequences

Experimentation can evolve without destabilizing serving; versions connect the components.

### Alternatives Rejected

One ML component mixes reliability models; infrastructure-only MLOps omits governed promotion behavior.

## ADR-006: Separate replenishment advice from purchasing authority

### Context

Planning computes recommendations; purchasing enforces human approval and receipt invariants.

### Decision

Replenishment owns policies, review jobs, quotas, scenarios, recommendations, and evidence. Purchasing owns proposals, orders, transitions, and receipts and revalidates evidence.

### Consequences

Recommendations can expire without changing orders; Purchasing keeps one state machine.

### Alternatives Rejected

A combined planning component mixes advice and authority; Forecasting does not own supplier/inventory policy.

## ADR-007: Keep authoritative audit records with business transactions

### Context

Required audit must be atomic, while OpenSearch is eventual and can be unavailable.

### Decision

Each mutating component appends local authoritative audit/outbox records. AuditEvidence owns projection, checkpoints, replay, retention, and authorized queries.

### Consequences

Search outages do not invalidate commits and indexes can be rebuilt; common event governance is required.

### Alternatives Rejected

A synchronous central audit component adds failure coupling; platform logs cannot satisfy business audit.

## ADR-008: Use contracts and prohibit cross-component storage access

### Context

Shared databases today must not prevent tenant or component extraction tomorrow.

### Decision

Use synchronous contracts for immediate work and RabbitMQ events for durable propagation. Components mutate only owned stores through owned routines.

### Consequences

Boundaries stay testable; consumers must handle eventual consistency and idempotency.

### Alternatives Rejected

Mostly synchronous integration under-serves jobs/projections; eventing every request weakens immediate and atomic workflows.

## ADR-009: Keep agents outside business authority

### Context

Model output is untrusted but the assistant must investigate and prepare governed actions.

### Decision

Assistant owns conversations, turns, tools, citations, and action drafts. Every tool rechecks tenant authority; Purchasing alone creates governed proposals and approvals.

### Consequences

Providers can change safely and retries cannot duplicate effects when business idempotency is used.

### Alternatives Rejected

Prompt-enforced rules and assistant-owned purchasing duplicate or weaken business authority.

## ADR-010: Separate UI composition from reproducibility evidence

### Context

The UI spans capabilities, while the portfolio requires stable scenarios, measurements, and clean-environment evidence.

### Decision

WebExperience owns shell/composition/transient state and no business entities. DemoEvidence owns scenarios, generation/verification runs, and evidence manifests.

### Consequences

Cross-capability UX stays coherent and evidence remains revision-bound without bypassing domain contracts.

### Alternatives Rejected

Per-domain frontends fragment approved workflows; unrelated scripts weaken traceability.

## ADR-011: Give tenant recovery an explicit coordination boundary

### Context

Tenant backup, restore, rollback, and recovery must coordinate PostgreSQL and RabbitMQ while preventing concurrent work from crossing a recovery boundary. Demo scripts cannot own production-shaped fencing, destructive confirmation, or terminal recovery outcomes.

### Decision

RecoveryCoordination owns tenant-scoped recovery runs, registrations, monotonic recovery generations, barriers, participant checkpoint sets, manifests, destructive confirmations, and terminal reconciliation. IdentityAccess and TenantDirectory expose synchronous, idempotent `prepare`, `close`, `abort`, and `resume` bootstrap ports for identity-store and placement fencing; each operation carries run/generation/command identity, policy version, and deadline and returns durable status. Every other mutable producer, consumer, outbox relay, acknowledgement handler, finalizer, and topology owner consumes the equivalent asynchronous commands, validates the active generation on its own effects, and submits checkpoint acknowledgements. Participants retain ownership of business state and expose contracts rather than storage access.

Recovery policy v1 assigns authority/bootstrap participants 30/30/30/60-second prepare/close/abort/resume limits, transactional participants 60/60/60/120 seconds, and asynchronous/data/compute participants 120/180/60/180 seconds. Global limits are 60 seconds for registration, five minutes for prepare, five minutes for close/drain/evidence, 30 minutes for the local snapshot, five minutes for abort, ten minutes for resume/reconciliation, and two minutes to resume durable coordination after a coordinator restart. Before dispatching prepare, the coordinator durably records the participant in a write-ahead dispatch inventory; abort targets every such participant whether or not its prepare acknowledgement arrived. Each participant durably advances a run/generation command state, so abort-before-prepare creates a terminal guard and any late prepare/close returns the terminal disposition without acquiring or recreating a fence. A missing or invalid response cannot satisfy a barrier. Abort or resume timeout produces `Failed` and leaves the unresolved participant in the terminal fencing inventory for explicit operator reconciliation; only complete abort acknowledgements with cleared-or-suppressed fence dispositions produce `Aborted`, and only complete resume acknowledgements plus reconciliation produce `Safely resumed`.

### Consequences

Recovery has one auditable state machine, an explicit participant roster, a conservative write-ahead dispatch inventory, measurable local deadlines, and consistent stale-work rejection. Each participant must implement a bounded, idempotent checkpoint/quiescence contract, a durable terminal-phase guard, and generation checks on its mutations and message acknowledgements. The conformance suite must exercise lost prepare acknowledgements and abort-before-delayed-prepare ordering for every participant contract. The conservative timeout policy can keep part of a tenant fenced until an operator reconciles it, but it prevents an uncertain participant from being silently reopened. Deployment-specific deadline profiles may be versioned later while preserving these lifecycle semantics.

### Alternatives Rejected

DemoEvidence ownership confuses verification with authority; distributing orchestration among components leaves no single barrier or terminal result; a storage-only restore cannot reconcile queued messages.

## ADR-012: Centralize shared heavy-work leases in ModelLifecycle

### Context

Training and forecasting contend for limited local CPU, memory, and optional GPU capacity. Process-local locks cannot survive restarts, and an expired worker must not publish after another worker has taken ownership.

### Decision

ModelLifecycle owns a PostgreSQL-backed heavy-work queue and renewable leases with deadlines and monotonic fencing tokens. Training and forecast workers acquire, heartbeat, release, or reconcile leases through its contract; every finalizer presents the active fencing token.

### Consequences

Resource arbitration is restart-safe and deterministic, and stale workers cannot overwrite current results. ModelLifecycle becomes a runtime dependency for heavy forecast execution and must keep lease operations small and highly available.

### Alternatives Rejected

In-memory semaphores fail across replicas and restarts; RabbitMQ delivery alone does not fence stale finalizers; separate training and forecasting locks can overcommit the same machine.

## ADR-013: Keep retrieval routes authoritative in SupplierKnowledge

### Context

Qdrant collections and Redis entries may be rebuilt, renamed, or lost. Retrieval must still resolve one authorized embedding profile, vector dimension, source-set digest, and active index generation per tenant without treating cache state as authority.

### Decision

SupplierKnowledge owns the durable ActiveRetrievalRoute and RetrievalIndexVersion records, reconciles Qdrant content against them, and invalidates Redis route caches whenever a route generation changes. Redis and Qdrant remain disposable projections.

### Consequences

Retrieval routing survives cache loss and exposes explicit mismatch diagnostics. Route promotion must verify dimensions, point counts, source digests, and authorization before activation.

### Alternatives Rejected

Redis-authoritative routing loses decisions on eviction; Qdrant collection names alone do not carry governed source provenance; Assistant ownership would bypass supplier-source authority.

## ADR-014: Treat compatibility and replay results as immutable demo evidence

### Context

A portfolio reviewer needs reproducible proof for supported browser profiles and concurrency/replay behavior, not only screenshots or transient test output.

### Decision

DemoEvidence owns immutable BrowserProfileEvidence and ConcurrencyReplayEvidence records tied to a revision, environment profile, execution seed, initial-state digest, synchronization barrier, competing command set, allowed and observed winner counts, final-state digest, audit/outbox/inbox/idempotency counts, exact replay response, expected and actual outcome digests, and a checksummed evidence artifact. WebExperience renders compatibility guidance and evidence without owning it.

### Consequences

Claims can be traced to repeatable runs and compared across revisions. Evidence generation must record failures and unsupported profiles as explicit outcomes.

### Alternatives Rejected

UI-owned evidence disappears with transient state; CI logs alone are weakly structured and hard to compare; AuditEvidence describes business activity rather than controlled compatibility experiments.

## ADR-015: Keep dated inbound-supply authority with Inventory

### Context

Time-phased replenishment must subtract dated outstanding supply and must see approval, cancellation, partial-receipt, and full-receipt changes without creating a Replenishment-to-Purchasing dependency cycle. An undated aggregate on InventoryPosition cannot establish the expected-arrival schedule or its version.

### Decision

Inventory owns `InboundSupplyCommitment`, including source order identities, approved, received, and open quantities, expected arrival date, status, version, and update time. Purchasing commands creation on approval, closure on cancellation before receipt, and quantity reduction or closure on partial or full receipt through the Inventory port. Receipt stock movement and remaining-inbound updates share the accepted co-located transaction boundary. Replenishment reads versioned positions and dated inbound commitments from Inventory; Purchasing retains order authority and links each approved line to its Inventory commitment.

### Consequences

There is one dated inbound authority, time-phased shortage calculations receive a versioned schedule, and the component graph remains acyclic. Inventory must reject stale or duplicate transition commands, while Purchasing must preserve exact replay and atomic transition evidence.

### Alternatives Rejected

Purchasing ownership would require Replenishment to depend on Purchasing as Purchasing already depends on Replenishment, creating a logical cycle. Keeping only `InventoryPosition.inbound` loses arrival dates and transition history. Replenishment ownership would mix advisory calculations with transactional supply commitments.

## ADR-016: Give shared asynchronous messaging code one platform owner

### Context

The AsyncAPI contracts require one common envelope, delivery identity, publisher confirms, retries, dead-letter handling, replay, payload limits, and observability. RabbitMQ is broker infrastructure, and DemoEvidence verifies behavior; neither identifies who implements and versions the reusable protocol code.

### Decision

MessagingPlatform is a logical shared-code component that owns the versioned envelope library, RabbitMQ adapter, topology conventions, publisher-confirm behavior, delivery identity, retry/DLQ/replay policy, payload-size enforcement, telemetry hooks, and protocol conformance fixtures. Domain components retain their own message schemas, transactional outbox/inbox records, authorization, duplicate handling, and atomic business effects. DemoEvidence consumes conformance outputs and records proof without owning the implementation.

### Consequences

Shared broker mechanics have one accountable implementation boundary and can be tested independently across .NET and Python consumers. Domain teams still must prove their own inbox/outbox and effect semantics, and the platform library cannot become a generic business workflow owner.

### Alternatives Rejected

Duplicating mechanics in every component invites protocol drift. Assigning them to DemoEvidence confuses verification with implementation. Treating RabbitMQ itself as the owner omits application-level envelope, confirmation, replay, and conformance behavior.

