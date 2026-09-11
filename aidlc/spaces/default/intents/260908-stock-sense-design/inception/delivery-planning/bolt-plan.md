# StockSense Bolt plan

Date: 2026-09-11
Stage: Delivery Planning
Status: Generated from the confirmed Delivery Planning summary

## Purpose and sources

A **Bolt** is one build pass over a coherent piece of work that ends in something runnable and demonstrable. This plan converts the approved Units of Work into delivery slices; the engine still derives dependency-ready runtime batches from `unit-of-work-dependency.md`.

Sources: `requirements.md`, `stories.md`, `mockups.md`, `components.md`, `unit-of-work.md`, `unit-of-work-dependency.md`, `unit-of-work-story-map.md`, and `contract-summary.md`.

## Delivery rules

- Bolt 1 is the approved **walking skeleton**, a minimal end-to-end slice that touches the essential layers and proves they work together.
- A large unit may receive a thin increment in an early Bolt and completion work later. The unit has one owner and is complete only when its full responsibilities and dependency-backed integrations satisfy the final Definition of Done.
- A contract-backed test double may prove a consumer path early. It never counts an unfinished provider or integration as complete.
- The unit DAG remains authoritative. A Bolt may start only the portions whose dependencies are available through completed providers or explicit U1 contracts and test doubles.
- Controlled parallel work is limited to dependency-ready units with disjoint files. Resource-heavy cluster, ML, model, recovery, and performance checks run serially within the 16 GB RAM and 3 CPU budget.
- Every Bolt leaves the repository buildable, testable, deployable at its demonstrated scope, and traceable to the pinned Git revision.

## Sequence overview

| Bolt | Name | Primary unit increments | Expected outcome |
| --- | --- | --- | --- |
| 1 | Runnable retail walking skeleton | U1, U2, U3, U4, U8, U10, U11, U12, U13 | One safe end-to-end purchasing journey runs locally |
| 2 | Platform trust, isolation, and tenant mobility | U1, U2, U3, U4, U10, U13 | Isolation, secrets, placement migration, and resource fit are proven |
| 3 | Supplier knowledge and retrieval | U5 with U4/U10-U13 integration | Supplier evidence is ingested, indexed, cited, and rebuildable |
| 4 | Reproducible model lifecycle and forecasting | U6, U7 with U4/U5/U10-U13 integration | Models and forecasts are reproducible, governed, and observable |
| 5 | Complete replenishment and governed purchasing | U8 with U4/U5/U7/U10-U13 integration | Planning and purchasing rules survive stale data, retries, and races |
| 6 | Safe agentic assistance | U9 with U4/U5/U7/U8/U10-U13 integration | A local agent explains and drafts actions without gaining authority |
| 7 | Portfolio evidence, operations, and clean-room release | U2, U10-U13 across the assembled system | A reviewer reproduces and verifies the complete portfolio |

## Unit final acceptance map

Early Bolts may deliver contract-backed slices of a unit, but each Unit of Work has one final acceptance point. A later system-level Bolt may still verify integration without reopening the unit's owned implementation.

| Unit | Final acceptance Bolt | Outstanding work before final acceptance |
| --- | --- | --- |
| U1 Contracts | 2 | Canonical package, validation, compatibility policy, examples, and generated-client inputs for every approved boundary |
| U2 Platform Infrastructure | 7 | All runtime packaging, trusted delivery, recovery, resource evidence, and clean-checkout operation against the assembled system |
| U3 Identity Access | 2 | Local identity, BFF/OIDC integration, persistent keys, machine identity, negative tests, and optional Google seam |
| U4 Retail Data | 2 | Tenant/placement authority, inventory/demand behavior, routine/RLS enforcement, cache degradation, and tenant extraction |
| U5 Supplier Knowledge | 3 | Ingestion, provenance, accepted terms, retrieval, deletion reconciliation, and embedding comparison |
| U6 Model Lifecycle | 4 | Leakage-safe datasets, baselines/candidates, evaluation, MLflow lineage, promotion, rollback, and immutable artifacts |
| U7 Forecasting | 4 | Idempotent production, 28-day series, promoted-model serving, freshness, and unavailable/failure behavior |
| U8 Planning and Purchasing | 5 | Reviews/quotas/scenarios, evidence, purchasing transitions, concurrency, idempotency, and receipt invariants |
| U9 Assistant | 6 | Local Strands/Qwen operation, citations, safe tools, recovery, provider seam, and adversarial evaluation |
| U10 Audit Evidence | 7 | Every U3-U9 publisher integrated, with query authorization, lag, replay, retention, and rebuild evidence |
| U11 Web BFF | 7 | Every user-facing provider integrated with session, tenant, CSRF, error, and composition behavior |
| U12 Web Application | 7 | Every approved browser journey and state integrated, accessible, and evidenced |
| U13 Demo Evidence | 7 | Clean-room scenario, measurements, recovery limits, traceability, and immutable evidence for the assembled system |

## Bolt 1 — Runnable retail walking skeleton

**Walking skeleton:** Yes.

**Included units:** Thin increments of U1 Contracts, U2 Platform Infrastructure, U3 Identity Access, U4 Retail Data, U8 Planning and Purchasing, U11 Web BFF, U12 Web Application, and U13 Demo Evidence, plus a minimal generic U10 Audit Evidence projection. U5 Supplier Knowledge and U7 Forecasting behavior is represented only by U1-conformant deterministic fixtures.

**Definition of Done:**

- A clean local deployment starts on Docker Desktop Kubernetes through the supported infrastructure entry point.
- Seeded local login creates a secure BFF session and selects one authorized retailer context.
- A deterministic inventory file is imported through U11/U4, validated, persisted through Dapper/Npgsql stored routines, and shown in the Ant Design UI.
- A deterministic baseline produces a replenishment recommendation and purchase draft.
- A manager approves the draft; an authorized user records a simulated receipt; stock, audit, and outbox effects commit atomically.
- RabbitMQ carries the authoritative audit event to a minimal idempotent U10 projection with correlation evidence.
- Contract, migration, unit, integration, tenant-negative, and smoke checks for this slice pass; no direct SQL, cross-unit storage access, cloud credential, external LLM, or GPU is required.

**Confidence hypothesis:** The selected architecture can complete one safe business journey within the local resource envelope before ML, RAG, and agent complexity are introduced.

**Expected demo:** Import inventory, inspect stock, calculate baseline replenishment, create and approve a purchase, receive it, show updated stock, and follow one correlation ID into the audit view.

## Bolt 2 — Platform trust, isolation, and tenant mobility

**Walking skeleton:** No.

**Included units:** Final acceptance work for U1, U3, and U4; foundation and hardening increments for U2, U10, and U13. U2, U10, and U13 remain open until Bolt 7 because their final evidence depends on the assembled system.

**Definition of Done:**

- Terraform/Terragrunt and Helm pin and package PostgreSQL, RabbitMQ, Redis, MongoDB, Qdrant, MLflow, object storage, OpenSearch, telemetry, Vault, and VSO.
- Duende local accounts, BFF/PKCE, machine scopes/audiences, key persistence/rotation seams, and explicit Google-linking rules pass negative tests.
- Tenant boundaries hold across HTTP, stored routines/RLS, pooled connections, messages, caches, documents, vectors, artifacts, and audit queries.
- One retailer moves from shared placement to a dedicated database without stale jobs, routing generations, or cross-tenant exposure.
- Secret synchronization and workload-scoped credential reload are demonstrated without secrets in Git or Terraform state.
- Measured sustained and peak workload fit within 16 GB RAM and 3 CPU or produce an explicit failed/limited result requiring owner review.

**Confidence hypothesis:** Isolation, secrets, routing generations, and local resource limits can support the distributed design without a later platform rewrite.

**Expected demo:** Run cross-tenant attacks, migrate one retailer placement, rotate a workload secret, inspect audit isolation, and display measured cluster usage.

## Bolt 3 — Supplier knowledge and retrieval

**Walking skeleton:** No.

**Included units:** U5 Supplier Knowledge, with contract integration increments in U4, U10, U11, U12, and U13.

**Definition of Done:**

- Bounded CSV and text-PDF uploads produce explicit accepted, partial, unsupported, and failed outcomes.
- MongoDB stores source/extraction records; PostgreSQL stored routines own normalized accepted terms; Qdrant remains a rebuildable tenant/model-specific projection.
- Supplier offers, currencies, source revisions, pages, chunks, and accepted terms remain traceable.
- Retrieval rejects arbitrary client-selected collections and stale placement generations.
- Source deletion reconciles normalized terms and rebuildable vectors under the approved retention rules.
- EmbeddingGemma and Qwen embedding candidates can be compared with pinned artifacts, dimensions, latency, relevance evidence, and CPU resource measurements.

**Confidence hypothesis:** The mixed relational, document, and vector design yields tenant-isolated, cited, rebuildable supplier evidence on a reviewer-compatible machine.

**Expected demo:** Ingest documents, resolve validation, accept terms, compare suppliers with page citations, delete a source, and rebuild its vector projection.

## Bolt 4 — Reproducible model lifecycle and forecasting

**Walking skeleton:** No.

**Included units:** U6 Model Lifecycle and U7 Forecasting, with U4/U5 data contracts and U10-U13 evidence integrations.

**Definition of Done:**

- Dataset versions enforce chronological cutoffs and reserve simulator latent demand for evaluation truth.
- Seasonal-naive and moving-average baselines plus at least one candidate run through reproducible experiments with MLflow lineage.
- MAE, WAPE, lost units, lost-demand rate, and average daily closing inventory value match the approved hand-check fixtures and zero-denominator rules.
- Artifacts are immutable and checksummed; failed candidates remain visible; promotion and rollback are audited.
- Daily forecast requests are idempotent and retailer-local; 28-day output exposes model, data, configuration, freshness, stale, unavailable, and failed states.
- CPU inference is the required path; any AMD GPU result is labeled optional and measured.

**Confidence hypothesis:** StockSense can compare, promote, serve, and roll back models reproducibly without leakage, silent substitution, or unsupported hardware assumptions.

**Expected demo:** Rebuild a dataset, compare baseline/candidate evidence, promote a compatible model, run forecasts, show provenance, roll back, and demonstrate an unavailable-model state.

## Bolt 5 — Complete replenishment and governed purchasing

**Walking skeleton:** No.

**Included units:** Completion increment for U8, with U4 inventory, U5 terms, U7 forecasts, and U10-U13 integration.

**Definition of Done:**

- Scheduled reviews and three accepted manual requests per retailer-local day share one-active-review controls; scheduled work does not consume the manual allowance.
- Retailer policies, product overrides including explicit zero, deterministic scenarios, supplier constraints, forecast freshness, and evidence snapshots are versioned.
- Draft lines are editable only before submission; submission locks commercial lines.
- Managers approve/reject submitted proposals and cancel submitted/approved orders only before any receipt.
- Authorized planner/manager receipts support partial/full completion; cumulative line receipts never exceed approved quantities; invalid multi-line receipts commit nothing.
- Matching idempotency replays return the original result; request mismatch, stale evidence, over-receipt, and cancel/receipt races are rejected and audited.

**Confidence hypothesis:** High-impact decisions stay explainable and correct under quotas, stale evidence, retries, concurrent commands, and assistant-originated drafts.

**Expected demo:** Compare scenarios, exhaust/reset quota, submit and approve, receive 6+4 against 10, reject 6+5, cancel before receipt, and show denied invalid transitions.

## Bolt 6 — Safe agentic assistance

**Walking skeleton:** No.

**Included units:** U9 Assistant, with governed tools in U4/U5/U7/U8 and browser/audit/evidence increments in U10-U13.

**Definition of Done:**

- Python Strands runs bounded conversations through a provider-neutral generation port with local Qwen as the default.
- Typed allowlisted tools revalidate current tenant, actor, role, placement, input schema, and idempotency at the authoritative service.
- Answers and drafts cite inventory, forecast, supplier, recommendation, or purchase evidence; unsupported claims and unavailable sources are explicit.
- Interrupted turns resume safely without repeating side effects.
- The assistant may request reviews and create purchase drafts but cannot submit, approve, reject, cancel, receive, grant membership, or select arbitrary retrieval collections.
- Adversarial tool, prompt-injection, cross-tenant, and hidden-reasoning/log-redaction evaluations pass.
- Bedrock is opt-in with credentials and spend policy and is never an automatic fallback.

**Confidence hypothesis:** A CPU-capable local agent can provide useful cited assistance while deterministic services retain every business and authorization decision.

**Expected demo:** Ask for inventory, forecast, and supplier evidence; request a review; create a draft; recover an interrupted turn; and show forbidden approval and cross-tenant retrieval attempts being denied.

## Bolt 7 — Portfolio evidence, operations, and clean-room release

**Walking skeleton:** No.

**Included units:** Final acceptance for U2, U10, U11, U12, and U13 across all assembled runtime units, plus release-level verification of U1 and U3-U9 without reopening their owned implementation.

**Definition of Done:**

- The React/TypeScript/Vite application uses Ant Design and Ant Design Charts and exposes loading, empty, stale, denied, partial, failure, and quota-exhausted states with keyboard operation.
- CI validates applicable builds, tests, 80% line-coverage floors, contracts, migrations, generated clients, security checks, images, and evidence links.
- Deployment uses a trusted isolated local runner and immutable revision; public pull-request code cannot execute there.
- Backup/restore, outbox/inbox replay, projection rebuild, application/model rollback, retention, telemetry loss, and tenant-placement recovery are demonstrated with limitations.
- An independent clean checkout completes setup and the full scenario without owner credentials, cached models, owner GPU, or cloud spending.
- Evidence binds FR/NFR IDs to stories, units, designs, tests, measurements, recovery results, and immutable artifact checksums.

**Confidence hypothesis:** A reviewing specialist can reproduce and verify the complete AI-DLC, application, data, ML/MLOps, agentic, DevOps, and cloud-native portfolio claims.

**Expected demo:** Run the clean-room setup, complete the business and agent journeys, trigger recovery cases, inspect measured latency/resources, and navigate requirement-to-evidence links.

## Completion semantics

Bolt order is a planning sequence, while dependency-ready runtime batches remain derived from the approved DAG. Scores do not override dependency availability. A Bolt is complete only when its Definition of Done and expected demo have evidence at the current revision; prose, fixtures presented as production behavior, or an unmeasured claim cannot satisfy completion.
