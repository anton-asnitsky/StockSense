# StockSense delivery-planning questions

Date: 2026-09-25
Stage: Delivery Planning
Status: Awaiting confirmation of approved-contract reconciliation

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

## Historical summary confirmation (2026-09-11)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct

## Reconciliation with approved contracts and units (2026-09-24)

The confirmation above covered the original U1-U13 plan. The subsequently approved Unit catalogue and Contract Design add U14 Messaging Platform and U15 Recovery Coordination. The prior seven-Bolt sequence remains the proposed shape, with these changes before the four delivery artifacts are refreshed:

- **Bolt 1:** Include a thin U14 implementation of the approved envelope and RabbitMQ delivery protocol so the runnable audit path uses shared broker mechanics. U14 is not complete at this point; U15 is represented by contract fixtures only.
- **Bolt 2:** Complete U14 conformance (publisher confirms, retry/DLQ/replay, duplicate and size guards, .NET/Python equivalence). Start U15's authoritative run state, registration, fencing, operator authority, and the U3/U4 participant path needed for tenant migration. U15 remains open until every required participant is integrated.
- **Bolts 3-6:** Each new provider implements its U15 recovery participant checkpoints and generation guards as it is built; U14 remains the shared transport, while each domain unit owns its outbox/inbox and business effects.
- **Bolt 7:** Complete U15's eleven-participant recovery coordination, browser status/projection through U11/U12, manifest verification, terminal reconciliation, and evidence through U10/U13. Demonstrate the approved 24-hour RPO, two-hour RTO, and 30-day backup retention. The latest C26 contract fixes these objectives; they are no longer an open planning parameter.
- **Traceability:** Re-run the phase-boundary audit against the current 58 requirement IDs, 67 stories, and 15 Units. The 2026-09-11 report's 43/63/13 counts cannot be reused.

The first-Bolt walking skeleton, CPU-only local path, one story per branch, owner-approved merges, and risk-weighted sequencing remain as previously answered. Relative effort and confidence for Bolts 2 and 7 will be re-estimated in the refreshed plan; no calendar deadline is inferred.

Derived planning result after confirmation: Bolt 7 grows from relative size 5 to 8 and its score changes from 2.00 to 1.25. Bolt 2 already sits at the scale's maximum size 8, so its score remains 1.14 while the plan explicitly splits U14/U15 work into small story branches and later participant increments. The original ranking table above is the historical pre-reconciliation proposal; the refreshed rationale is authoritative for the current ranking.

Does this reconciliation look correct before I update the delivery artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct

## Historical Consolidated Summary Confirmation (2026-09-24)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct

## Proposed contract-finalization changes (2026-09-24)

The approved seven-Bolt sequence, weighted risk-first ranking, CPU-only local path, one-story-per-branch rule, and owner-approved merges remain unchanged. This modification only makes the final C01 and C24 contract obligations explicit in the delivery plan:

- **Bolt 1 / U1:** The thin walking-skeleton contract package is a `candidate`, tied to an immutable Git `sourceRevision`. Every included canonical OpenAPI, AsyncAPI, or JSON Schema document and governed sidecar has an owner, boundary IDs, semantic version, package path, and verified `sha256:` content digest. Contract validation and generated-client inputs for the demonstrated slice must pass before consumer integration.
- **Bolt 2 / U1:** Final U1 acceptance requires a `release` manifest with exactly one coverage row for every C01-C27 boundary, the fixed canonical-kind and sidecar policy, clean reconstruction from `sourceRevision`, generated-output manifests for declared consumers, compatibility assessments, validation runs, and evidence records. Later provider changes produce new package versions and rerun the same release checks.
- **Bolt 2 / U3, U4, U15:** Identity Access and Tenant Directory implement C24's provider-owned synchronous bootstrap port; Recovery Coordination consumes it. Provider and consumer conformance tests cover durable `200` replay, required correlation/idempotency headers, typed `401`/`403`/`409`/`422`/`503` problems, a rejected close without a matching checkpoint, abort-before-late-prepare suppression, idempotency conflicts, and persistence failure that returns `RECOVERY_PERSISTENCE_UNAVAILABLE` without inventing a durable result. A `200` participant result is never treated as coordinator-wide recovery success.
- **Bolt 7 / U13:** Clean-room evidence verifies the complete C01 release package and C24 failure-path tests against one pinned revision, alongside the already approved eleven-participant recovery demonstration.
- **Ownership and risk:** U1 owns package policy and release checks; U3/U4 own their durable C24 participant behavior; U15 owns consumer validation and orchestration. The risk register and dependency map name false-green package publication and unsafe bootstrap recovery as explicit integration risks. No external service or new calendar deadline is introduced.

These changes preserve the previously confirmed per-Bolt demonstrations and final acceptance points. Bolt 2 remains relative size 8 (the coarse upper bound), and Bolt 7 remains size 8; the scores and order do not change.

## Reconciliation with approved C01/C15/C17/C18/C22/C23 revision (2026-09-25)

The owner-approved Contract Design adds an explicit exception for U3/U4 bootstrap publishers and a distinct platform identity-audit read boundary. The previously approved seven-Bolt order, first runnable purchasing slice, CPU-only local profile, one-story-per-branch rule, and owner-approved merges remain unchanged. This reconciliation updates ownership and acceptance within the existing Bolts:

- **Bolt 1:** U3 Identity Access and U4 Retail Data publish audit events through their own C23-conformant bootstrap adapters; they do not acquire an U14 package dependency. U3's retailerless identity denials use the closed global C01/C15 envelope and route, while tenant events retain real retailer and placement metadata. The thin U14 adapter serves the U10 consumer/inbox path. This corrects any wording that routed U3/U4 publication through U14.
- **Bolt 2:** U3/U4 publisher adapters pass every applicable C22 fixture, including atomic audit/outbox, authenticated producer binding, confirms, replay/conflict, retry/DLQ, size and telemetry. U13 records their results alongside U14's .NET/Python package conformance. U3 establishes the revocable human platform-Operator grant and C02 current-grant check; U10 builds the separate C17 global identity-audit query; U11/U12 expose the no-store C18 platform view. Tests deny retailer-only Operators, machine principals, revoked grants, wrong audience/client/scope, unavailable grant checks, and tenant-query leakage.
- **Later Bolts:** Each provider keeps its own event semantics, transactional state and recovery participant behavior. Final Bolt 7 evidence reruns the U3/U4/U14 messaging and global-read negative cases with the assembled system and clean-checkout revision.

No new external dependency or calendar deadline is introduced. U3 owns grants and its publisher, U4 owns its publisher, U10 owns projection and authoritative global-read enforcement, U11/U12 own the browser boundary, U14 owns shared packages for its existing consumers, and U13 collects conformance evidence.

## Historical Consolidated Summary Confirmation (C01/C15/C17/C18/C22/C23)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct

## Consolidated Summary Confirmation

Reconciliation with approved C07/C10/C13 contract (2026-09-25):

The approved seven-Bolt sequence, risk-weighted ranking, CPU-only local path, and one-story-per-branch rule remain unchanged. The latest approved Contract Design adds four concrete acceptance obligations to the existing plan:

- **Bolt 2 / U1:** Package C07's typed shared-transaction finalization port and its positive/negative fixtures; include the typed C10 run-history response and bounded C10/C13 product-set request and coverage schemas in the canonical contract release.
- **Bolt 4 / U6 and U7:** Prove that a forecast run, route pin, request, first queued attempt, and first lease share immutable identifiers; retries use a new attempt only after the prior lease is terminal or fenced. U7's publication, audit, outbox, U6 lease finalization and U6-owned pin closure must commit together in one retailer-local transaction, with exact replay and failure-race evidence.
- **Bolt 4 / U6 and U7:** Prove that pin admission races safely with route draining, and promotion or rollback waits for verified pin closure before atomically completing the evaluation lease and changing the route. Reconcile the central heavy-work slot only after retailer-local terminal proof. A timeout alone never clears a pin or slot.
- **Bolts 4-7 / U7, U8, U11-U13:** Test typed forecast run history and bounded distinct product sets with exact covered/unavailable partition, per-product reason, and 28 dated values only for covered products; carry those states through planning, browser, and clean-room evidence. No stale or failed result is silently treated as a successful forecast.

These are direct acceptance and hand-off consequences of the approved contract, not a new Bolt or an unapproved product decision. The existing external dependency posture and relative scores remain unchanged.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
