# StockSense delivery-planning questions

Date: 2026-09-11
Stage: Delivery Planning
Status: In progress

## Upstream basis

These questions use `requirements.md`, `stories.md`, `mockups.md`, `components.md`, `unit-of-work.md`, `unit-of-work-dependency.md`, `unit-of-work-story-map.md`, and `contract-summary.md`. The approved dependency graph remains authoritative; delivery order may expose a thin slice early, but no implementation may consume an unfinished dependency as if it were complete.

A **Bolt** is one build pass over a coherent piece of work that ends in something runnable and demonstrable. A **walking skeleton** is the first minimal end-to-end Bolt that touches the essential architectural layers and proves they work together.

## Interaction mode

How would you like to make the delivery-planning decisions?

- A. Guide me through one decision at a time, with a recommendation and its rationale (Recommended)
- B. Show all strategic questions at once
- C. Apply every recommended answer for this stage and present the consolidated plan for confirmation
- X. Other (please specify)

[Answer]: A. Guide me through one decision at a time, with a recommendation and its rationale (Recommended)

## Q1. Sequencing strategy

What should determine which work is built first?

- A. Start with the approved walking skeleton—import data, display inventory, calculate baseline replenishment, and complete simulated draft/approve/receive purchasing—then sequence later Bolts by technical risk and portfolio value (Recommended)
- B. Build infrastructure and the highest technical risks first, before an end-to-end business flow
- C. Build the most visible user features first, then integrate infrastructure and risk controls later
- X. Other (please specify)

[Answer]: A. Start with the approved walking skeleton—import data, display inventory, calculate baseline replenishment, and complete simulated draft/approve/receive purchasing—then sequence later Bolts by technical risk and portfolio value (Recommended)

## Q2. Ranking model

Should the remaining work receive an explicit prioritization score?

- A. Use a lightweight weighted WSJF-style score—business/portfolio value, urgency, and risk reduction divided by relative job size—with risk reduction weighted highest for the local distributed architecture (Recommended)
- B. Use standard unweighted WSJF, giving value, urgency, and risk reduction equal weight before dividing by size
- C. Do not score; justify the sequence qualitatively from dependencies, risks, and demonstrations
- X. Other (please specify)

[Answer]: A. Use a lightweight weighted WSJF-style score—business/portfolio value, urgency, and risk reduction divided by relative job size—with risk reduction weighted highest for the local distributed architecture (Recommended)

## Q2a. Ranking weights

Which weighting should the score use? Each numerator factor is scored from 1 to 10; relative job size uses the Fibonacci-like scale 1, 2, 3, 5, 8 as the denominator.

- A. 50% risk reduction, 35% portfolio value, and 15% urgency, divided by relative job size (Recommended)
- B. 40% risk reduction, 40% portfolio value, and 20% urgency, divided by relative job size
- C. 60% risk reduction, 25% portfolio value, and 15% urgency, divided by relative job size
- X. Other (please specify)

[Answer]: A. 50% risk reduction, 35% portfolio value, and 15% urgency, divided by relative job size (Recommended)

## Q3. Bolt size and composition

How should units be grouped into runnable delivery Bolts?

- A. Use a hybrid: one thin cross-unit walking skeleton first, then one unit or a small set of tightly related units per Bolt (Recommended)
- B. Keep every Bolt to exactly one Unit of Work
- C. Use broad cross-unit feature slices for every Bolt
- X. Other (please specify)

[Answer]: A. Use a hybrid: one thin cross-unit walking skeleton first, then one unit or a small set of tightly related units per Bolt (Recommended)

## Q4. Parallel execution

How much Construction work may proceed concurrently?

- A. Use controlled parallelism only for dependency-ready units with disjoint files and bounded local resource use; integrate in the planned sequence (Recommended)
- B. Run Bolts strictly one after another
- C. Maximize parallel work whenever the dependency graph permits it
- X. Other (please specify)

[Answer]: A. Use controlled parallelism only for dependency-ready units with disjoint files and bounded local resource use; integrate in the planned sequence (Recommended)

## Q5. External dependency posture

How should optional external services and downloadable dependencies affect delivery?

- A. Keep the clean CPU-only local path blocking and reproducible; treat Google OIDC registration, Bedrock, AMD GPU acceleration, and any cloud backend as optional non-blocking extensions with documented fallbacks (Recommended)
- B. Require Google OIDC and GPU acceleration for the main demonstration, while keeping Bedrock optional
- C. Require all local and external provider integrations before the first full demonstration
- X. Other (please specify)

[Answer]: A. Keep the clean CPU-only local path blocking and reproducible; treat Google OIDC registration, Bedrock, AMD GPU acceleration, and any cloud backend as optional non-blocking extensions with documented fallbacks (Recommended)

## Q6. Risks to retire first

Which risk cluster should receive the strongest early emphasis after the walking skeleton?

- A. Cross-service contracts, tenant isolation, purchasing correctness, local resource fit, and clean-checkout reproducibility (Recommended)
- B. Forecast quality and MLOps before platform and security risks
- C. Assistant quality and RAG relevance before deterministic business workflows
- X. Other (please specify)

[Answer]: A. Cross-service contracts, tenant isolation, purchasing correctness, local resource fit, and clean-checkout reproducibility (Recommended)

## Per-Bolt confirmation

After the strategic answers are complete, the proposed Bolt list will state for each Bolt: included units, walking-skeleton status, Definition of Done, confidence hypothesis, expected demonstration, and its owning AI delivery role. Those proposed per-Bolt answers will be included in the consolidated summary for confirmation before artifacts are generated.

## Ambiguity scan

The strategic answers are mutually consistent. The plan uses controlled parallelism for dependency-ready work, while resource-heavy local deployment and integration checks remain serial. The weighted score ranks only work that is currently dependency-ready; the walking skeleton is an explicit first-Bolt override, and downstream dependencies may force a lower-scoring Bolt to wait.

Large units may receive an early thin increment and later completion work. This does not duplicate ownership: a unit remains owned once, and it is considered complete only after all its responsibilities and dependency-backed integrations satisfy its final Definition of Done. Contract-backed test doubles may prove an early consumer path but never count an unfinished provider as complete.

No delivery deadline has been approved, so the plan uses relative size and dependency/risk order rather than calendar promises. External integrations remain optional unless they are required for the clean CPU-only local path.

## Proposed Bolt sequence

All Bolts are owned by `aidlc-developer-agent` because Team Formation was skipped for the classic scope. Supporting architecture and quality roles participate through their later stage assignments and reviews.

### Bolt 1 — Runnable retail walking skeleton

- **Primary units:** U1 Contracts, U2 Platform Infrastructure, U3 Identity Access, U4 Retail Data, U8 Planning and Purchasing, U11 Web BFF, U12 Web Application, U13 Demo Evidence; a minimal U10 audit projection is included. U5/U7 behavior is represented only by contract-backed deterministic fixtures.
- **Walking skeleton:** Yes. It proves browser → BFF → identity/tenant validation → stored-routine business services → PostgreSQL/outbox → RabbitMQ/audit projection → UI on Docker Desktop Kubernetes.
- **Definition of Done:** A clean local deployment supports seeded login, one retailer context, deterministic inventory import, inventory display, baseline replenishment, purchase draft, manager approval, simulated receipt, stock update, and correlated audit evidence. No direct SQL or cross-unit storage access is used.
- **Confidence hypothesis:** The selected architecture can complete one safe business journey within the local resource envelope without depending on ML, an external LLM, cloud credentials, or the owner GPU.
- **Expected demo:** Import a deterministic file, inspect stock, generate a baseline recommendation, approve and receive an order, and show the updated inventory and audit trail.

### Bolt 2 — Platform trust, isolation, and tenant mobility

- **Primary units:** Completion increments for U1, U2, U3, U4, U10, and U13.
- **Walking skeleton:** No.
- **Definition of Done:** All shared services are pinned and packaged; Vault/VSO, Duende local accounts, optional Google federation seam, PostgreSQL routines/RLS, tenant-aware RabbitMQ, Redis, MongoDB, Qdrant, object storage, MLflow, OpenSearch, and telemetry follow isolation rules. Negative tenant tests and shared-to-dedicated tenant placement migration pass. Resource usage is measured.
- **Confidence hypothesis:** Tenant isolation, secrets handling, routing generations, and the 16 GB/3 CPU constraint can survive realistic cross-service operation without redesign.
- **Expected demo:** Attempt cross-tenant access across HTTP, SQL, queues, cache, documents, vectors, artifacts, and audit; migrate one tenant placement; rotate a workload secret; display measured resource evidence.

### Bolt 3 — Supplier knowledge and retrieval

- **Primary units:** U5 Supplier Knowledge, with integration increments in U4, U10, U11, U12, and U13.
- **Walking skeleton:** No.
- **Definition of Done:** Bounded CSV/text-PDF ingestion, validation, accepted terms, source/page provenance, MongoDB extraction records, Qdrant projections, deletion reconciliation, and tenant-authorized retrieval are implemented through contracts. EmbeddingGemma and Qwen embedding candidates can be compared reproducibly.
- **Confidence hypothesis:** The mixed PostgreSQL/MongoDB/Qdrant design produces rebuildable, tenant-isolated evidence with citations and acceptable local resource use.
- **Expected demo:** Ingest supplier documents, resolve validation issues, accept terms, search and compare suppliers with page citations, then delete/rebuild a source projection.

### Bolt 4 — Reproducible model lifecycle and forecasting

- **Primary units:** U6 Model Lifecycle and U7 Forecasting, with contract integrations from U4/U5 and evidence/audit increments in U10-U13.
- **Walking skeleton:** No.
- **Definition of Done:** Leakage-safe datasets, baselines, candidate training, temporal and chronological evaluation, MLflow lineage, immutable checksummed artifacts, promotion/rollback, idempotent daily forecasting, 28-day series, freshness, and unavailable/failure states are implemented on the CPU path.
- **Confidence hypothesis:** The portfolio can train, compare, promote, serve, and roll back a model reproducibly while reporting limitations and never substituting a model silently.
- **Expected demo:** Rebuild a dataset, compare baseline and candidate metrics with hand-check fixtures, promote a compatible model, run forecasts, show provenance, then roll back and demonstrate an unavailable-model state.

### Bolt 5 — Complete replenishment and governed purchasing

- **Primary units:** Completion increment for U8 Planning and Purchasing, with U4/U5/U7 dependencies and U10-U13 integration.
- **Walking skeleton:** No.
- **Definition of Done:** Scheduled and three-per-local-day manual reviews, policies/overrides, deterministic scenarios, evidence snapshots, supplier/forecast freshness checks, proposal editing/submission, manager approval/rejection, pre-receipt cancellation, partial/full receipts, idempotency, and concurrency invariants pass their acceptance tests.
- **Confidence hypothesis:** High-impact inventory decisions remain explainable and correct under retries, stale evidence, concurrent cancellation/receipt attempts, and assistant-originated drafts.
- **Expected demo:** Compare scenarios, exhaust/reset the manual quota, submit and approve a proposal, record 6+4 units against an approved 10, reject a 6+5 over-receipt, and show denied invalid transitions.

### Bolt 6 — Safe agentic assistance

- **Primary units:** U9 Assistant, with governed tool integrations in U4/U5/U7/U8 and browser/audit/evidence increments in U10-U13.
- **Walking skeleton:** No.
- **Definition of Done:** Python Strands conversations, local Qwen generation, typed allowlisted tools, citations, interruption recovery, idempotent side effects, agent evaluations, and provider-neutral adapters are implemented. The assistant cannot approve purchases, grant authority, select arbitrary collections, or fall back to Bedrock automatically.
- **Confidence hypothesis:** A local CPU-capable agent can answer and draft useful actions while deterministic services retain authority and adversarial tenant/tool tests prevent privilege escalation.
- **Expected demo:** Ask for inventory, forecast, and supplier evidence; request a review; create a purchase draft; interrupt/recover a turn; attempt forbidden approval and cross-tenant retrieval; optionally repeat through Bedrock when explicitly configured.

### Bolt 7 — Portfolio evidence, operations, and clean-room release

- **Primary units:** Completion increments for U2, U10, U11, U12, and U13 across the assembled system.
- **Walking skeleton:** No.
- **Definition of Done:** Ant Design/Vite workflows expose loading, empty, stale, denied, partial, failure, and quota states; CI validates builds, tests, contracts, migrations, security, and artifacts; local deployment, backup/restore, message replay, application/model rollback, retention, projection rebuild, and clean-checkout CPU execution are documented and evidenced against the pinned revision.
- **Confidence hypothesis:** An independent specialist can reproduce the complete portfolio and verify its AI-DLC, application, data, ML/MLOps, agentic, DevOps, and cloud-native claims without owner-specific state.
- **Expected demo:** Run setup from a clean checkout, execute the complete scenario and failure/recovery suite, publish measured latency/resource results, and navigate requirement-to-test-to-evidence links.

## Ranking summary

Score = `(0.50 × risk reduction + 0.35 × portfolio value + 0.15 × urgency) ÷ relative job size`, with factors from 1-10 and size from 1, 2, 3, 5, 8. Bolt 1 is first by the approved walking-skeleton override; otherwise scores order only dependency-ready work.

| Bolt | Risk | Value | Urgency | Size | Score | Sequencing constraint |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 10 | 10 | 10 | 8 | 1.25 | Explicit walking-skeleton override |
| 2 | 10 | 8 | 9 | 8 | 1.14 | Hardens the foundation used by all later work |
| 3 | 7 | 8 | 6 | 5 | 1.44 | Requires the U4 tenant/product contract |
| 4 | 9 | 9 | 7 | 8 | 1.09 | Requires U4 and U5 versioned datasets/terms |
| 5 | 10 | 10 | 8 | 8 | 1.21 | Requires U4, U5, and usable U7 forecast contracts |
| 6 | 8 | 9 | 6 | 8 | 1.01 | Requires governed U4/U5/U7/U8 tools |
| 7 | 10 | 10 | 10 | 5 | 2.00 | Verification is finalized only after the assembled system exists |

## External dependency summary

- First-time container, package, and model downloads block affected local setup steps; U2/U13 own pinned versions, checksums, preflight checks, and documented manual recovery.
- Docker Desktop Kubernetes is required for the main deployment; setup validation fails early with actionable prerequisites.
- Google OIDC registration is optional and does not block seeded local accounts.
- Bedrock credentials, model access, and spend policy are optional and never trigger automatic fallback.
- AMD GPU acceleration is optional; the CPU path is required and measured.
- Model and embedding artifact licenses, versions, URLs, and checksums must be recorded before Bolts 3, 4, and 6 claim reproducibility.
- Duende licensing eligibility must be checked before any use beyond the approved portfolio/community scenario; it does not weaken the local authentication acceptance criteria.
- Cloud state or managed-service provisioning requires a later explicit decision and is not part of the default local release.

## Development team and Git operating model

- One coordinating Codex session integrates work from ten project-local
  specialists: technical lead, React UI, .NET services, data/persistence,
  ML/MLOps, agentic AI/RAG, platform/DevOps with Terraform/Terragrunt,
  security/identity, quality/reliability, and AI-DLC process stewardship.
- Specialists receive bounded write sets and may not delegate. The coordinator
  owns shared contracts, integration, lifecycle communication, and the single
  repository-owner approval stream.
- Each Bolt has an integration branch. Every user story is implemented on its
  own short-lived child branch and pull request into that Bolt branch.
- Shared cross-story prerequisites use separate focused child branches. After
  the assembled runnable Bolt passes its checks, the owner-approved Bolt branch
  is squash-merged to `main`.
- The AI-DLC process steward checks lifecycle correctness, traceability,
  document freshness, and internal consistency before lifecycle gates.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
