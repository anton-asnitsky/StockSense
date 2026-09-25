# StockSense risk and sequencing rationale

Date: 2026-09-25
Stage: Delivery Planning
Status: Reconciled with the approved C01-C27 contract, including C07/C10/C13 finalization and product-set rules
Summary confirmation: Looks correct (2026-09-25)

## Decision basis

A **Bolt** is one build pass over a coherent piece of work that ends in something runnable. The sequence uses a weighted **WSJF-style score**, a lightweight Weighted Shortest Job First calculation that compares value, urgency, and risk reduction with relative size. It is a prioritization aid, not a substitute for the dependency DAG in `unit-of-work-dependency.md`.

Sources: `requirements.md`, `stories.md`, `mockups.md`, `components.md`, `unit-of-work.md`, `unit-of-work-dependency.md`, `unit-of-work-story-map.md`, `contract-summary.md`, and `delivery-planning-questions.md`.

## Scoring model

Each numerator factor is scored from 1 to 10. Relative size uses 1, 2, 3, 5, or 8.

`score = (0.50 × risk reduction + 0.35 × portfolio value + 0.15 × urgency) ÷ relative size`

Risk reduction receives the highest weight because failures in tenant isolation, contract compatibility, purchasing correctness, local resource fit, or clean-checkout reproducibility can invalidate large amounts of later work. Portfolio value remains material because the project must visibly demonstrate the requested technology and engineering skills. Urgency has the smallest weight because no delivery deadline was approved.

## Ranked Bolts and constrained sequence

| Planned order | Bolt | Risk | Value | Urgency | Size | Score | Why it occupies this position |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | Runnable retail walking skeleton | 10 | 10 | 10 | 8 | 1.25 | Explicit owner-approved first-Bolt override; proves a runnable path before depth |
| 2 | Platform trust, isolation, and tenant mobility | 10 | 8 | 9 | 8 | 1.14 | Retires redesign risks shared by every later unit |
| 3 | Supplier knowledge and retrieval | 7 | 8 | 6 | 5 | 1.44 | Highest score among dependency-ready product increments after U4 trust foundation |
| 4 | Reproducible model lifecycle and forecasting | 9 | 9 | 7 | 8 | 1.09 | Waits for versioned U4 demand and U5 term/provenance contracts |
| 5 | Complete replenishment and governed purchasing | 10 | 10 | 8 | 8 | 1.21 | Waits for U4 inventory, U5 accepted terms, and U7 usable forecasts |
| 6 | Safe agentic assistance | 8 | 9 | 6 | 8 | 1.01 | Waits for governed U4/U5/U7/U8 tools; avoids building authority on mocks |
| 7 | Portfolio evidence, operations, and clean-room release | 10 | 10 | 10 | 8 | 1.25 | U15 full-roster recovery and evidence increase relative size; final verification requires the assembled system |

The numerical ranking applies only among dependency-ready candidates. Bolt 7's size rises from 5 to 8 because it now includes U15's complete eleven-participant recovery proof; its score falls from 2.00 to 1.25. Bolt 2 remains at the scale's maximum size 8 after adding U14 conformance and U15's foundation, so that number is a coarse upper bound, not an assertion that the extra work is free. U15 is completed incrementally through Bolts 2-7, with story branches kept small. Bolt 5 scores above Bolt 4 but depends on the forecasting output completed in Bolt 4. Bolt 7 cannot close before the system it verifies exists. These are dependency constraints, not exceptions hidden from the score.

## Walking-skeleton rationale

The first Bolt is a **walking skeleton**, a minimal end-to-end implementation that touches the essential architecture. It intentionally uses deterministic U1-conformant fixtures for unfinished supplier and forecast providers. This proves browser/BFF security, tenant validation, stored-routine persistence, purchasing authority, RabbitMQ audit propagation, Kubernetes packaging, and evidence capture while keeping ML and LLM uncertainty out of the first integration result.

The skeleton does not mark U5, U6, U7, U9, U14, or U15 complete and does not claim that a contract double is production behavior. U3/U4 bootstrap audit publishers use their own C23-conformant adapters, while the thin U10 consumer uses U14; applicable C22 conformance follows in Bolt 2. U15 is a fixture only until its Bolt 2 foundation. Real provider integration and degraded-state behavior remain required in their later Bolts.

## Risk register and retirement points

| Risk | Impact | Earliest retirement evidence | Primary Bolt | Residual handling |
| --- | --- | --- | --- | --- |
| Cross-service contract drift | Consumers fail late or silently mis-handle versions | OpenAPI/AsyncAPI syntax, examples, generated clients, compatibility and provider-consumer tests | 1-2 | Every later contract change remains CI-gated |
| False-green C01 package release | Missing boundaries, stale generated clients, or unbound sidecars appear valid | Candidate checks in Bolt 1; Bolt 2 release validator reconstructs canonical inputs from the Git source revision, verifies every digest, fixed C01-C27 kind/sidecar coverage, generated outputs, and actual validation/evidence results | 1-2 | New provider revisions must publish a new validated package version; rerun in Bolt 7 |
| Shared messaging semantics diverge across .NET/Python | Retry, replay, deduplication, or payload limits corrupt cross-unit effects | U14 envelope and adapter conformance for confirms, ordering, retry/DLQ/replay, duplicate, size and telemetry; producer/consumer outbox/inbox tests | 1-2 | Re-run conformance for each later publisher and consumer |
| U3/U4 bootstrap audit publishers drift from C22/C23 | Identity or placement evidence is lost before U14 exists | Service-owned adapter fixtures pass applicable C22 cases; U13 captures producer receipts and recovery evidence | 1-2 | Re-run fixtures in Bolt 7 and on adapter changes; U14 does not own these bootstrap publishers |
| Tenant data or authority leakage | Portfolio becomes unsafe and architecturally invalid | Negative tests across HTTP, routines/RLS, pooled connections, queues, cache, documents, vectors, artifacts and audit | 2 | Repeat boundary tests in each later provider |
| Global identity audit is exposed through a retailer route or stale privilege | Pre-login outcomes leak to retailer users, machine principals, or revoked Operators | U3 live platform-Operator grant and C02 checks, U10 C17 per-page checks, and distinct U11/U12 C18 no-store view with negative tests | 2 | Recheck on each auth, BFF, projection, and UI change; never infer global access from a retailer Operator role |
| Tenant-placement migration races | Stale work reaches old/dedicated storage | Placement-generation rejection, controlled cutover, stale-job and rollback evidence | 2 | Exercise migration/recovery again in Bolt 7 |
| Purchasing state/concurrency defect | Incorrect stock or unauthorized order effects | Transition, idempotency, expected-version, cancel/receipt race, partial and over-receipt tests | 1 and 5 | Agent tools can create drafts only; adversarial tests in Bolt 6 |
| Local stack exceeds 16 GB/3 CPU | Reviewer cannot run the portfolio | Measured sustained/peak cluster and one-active-job profile | 2 | Serial heavy checks and tune requests/limits; owner decides any scope/budget change |
| Secret/key handling failure | Credentials leak or sessions fail after restart/rotation | Vault/VSO, persistent signing keys, scoped workload access, reload and recovery tests | 2 | Final rotation/recovery evidence in Bolt 7 |
| Supplier extraction/retrieval is not trustworthy | RAG answers lack usable evidence | Explicit partial/failure states, citations, deletion reconciliation, embedding comparison | 3 | Keep accepted terms authoritative in PostgreSQL; Qdrant rebuildable |
| Temporal leakage or misleading model claims | ML evidence is invalid | Chronological cutoffs, hand-check metrics, matched baselines, failed-candidate retention | 4 | Publish synthetic-data and zero-denominator limitations |
| C07 forecast lease or route races publish an unfenced result | A stale worker can publish a forecast or promotion after its authority has expired | U1 fixtures in Bolt 2; U6/U7 same-transaction finalizer, immutable attempt binding, U6-owned pin closure, admission/drain guard, atomic evaluation-lease route change, and local-terminal-before-central-slot tests in Bolt 4 | 2 and 4 | Re-run pre/postcommit crash, exact replay, recovery fence, promotion and rollback races in Bolt 7 |
| Forecast unavailable/stale behavior is hidden | Planning acts on invalid evidence | Explicit freshness/status contract and no-silent-substitution tests | 4-5 | U8 blocks or presents unavailable result according to resolved policy |
| C10/C13 product-set coverage or run history is ambiguous | Planning or UI can treat missing, stale or failed forecasts as complete | U1 typed response and request fixtures in Bolt 2; U7 exact covered/unavailable partition, per-product reason, 28 dated values only for covered products, and U8/U11/U12 consumer tests in Bolts 4-5 | 2, 4 and 5 | Re-run clean-room consumer and schema checks in Bolt 7 |
| LLM gains implicit authority or crosses tenants | Agent performs unsafe actions | Typed tools, per-call authorization, prompt-injection and cross-tenant adversarial tests | 6 | No approval tool; no automatic external fallback |
| Clean checkout depends on owner state | Portfolio review fails | CPU-only install from pinned revision without owner credentials/cache/GPU | 7 | Evidence manifest records limitations and checksums |
| Recovery barrier or terminal fence clears unsafely | Tenant data, audit, vector, or stock state becomes inconsistent | U15 registration, write-ahead inventory, eleven-participant checkpoints, deadline, digest, operator-binding and terminal reconciliation tests; restore/replay evidence | 2 and 7 | Measure 24-hour RPO, two-hour RTO and 30-day retention; report failed or limited evidence without relaxing targets |
| C24 bootstrap failure is mistaken for a durable acknowledgement | A coordinator clears a fence after failed persistence, changed retry, invalid authority, or late prepare | U3/U4 provider and U15 consumer fixtures assert durable `200` replay, typed `401`/`403`/`409`/`422`/`503`, checkpoint matching, abort-before-prepare suppression, and `RECOVERY_PERSISTENCE_UNAVAILABLE` fail-closed handling | 2 | Rerun failure-path fixtures with the full recovery roster in Bolt 7 |

## Parallelism rationale

Controlled parallelism is allowed for dependency-ready units with disjoint files: provider contracts and consumer mocks, independent Helm/Terragrunt modules, UI work against approved examples, and evidence-harness preparation. Integration remains ordered. Full-cluster execution, ML training, model download, performance measurement, migration, backup/restore, replay, and recovery are serialized so failures and resource measurements are attributable.

This stance preserves the benefit of parallel AI work without allowing simultaneous changes to the same contracts, migrations, state, or evidence revision.

## Alternatives considered

### Infrastructure and risk work before any business slice

This could reduce platform uncertainty sooner, but it delays the first runnable proof and encourages deep infrastructure work before verifying the business and integration seams. The chosen skeleton still exposes the highest architectural assumptions, followed immediately by full trust hardening.

### Visible UI and agent features first

This improves early screenshots but makes behavior depend on mocks and defers tenant, persistence, purchasing, and resource constraints. It creates a high chance of polished flows that cannot survive real integration.

### Strict one-unit Bolts

This gives clean ownership but cannot produce the approved first end-to-end journey without waiting for many isolated units. The hybrid plan uses one thin cross-unit skeleton, then one unit or a small related set as the primary increment.

### Maximum dependency-graph parallelism

This shortens theoretical elapsed time but increases merge, resource, and integration risk for a solo portfolio project. Controlled parallelism is easier to reproduce and review.

## Open planning parameters

Calendar dates remain unset because no deadline or weekly availability was approved. Open requirements and contract parameters are Bolt entry criteria: they must be resolved before the affected implementation starts, unless the approved requirement explicitly marks the capability as a later optional extension. They do not authorize unbounded defaults or defer a design decision until final acceptance.

| Decision group | Owning units | Entry gate | Required resolution before implementation |
| --- | --- | --- | --- |
| OQ1 and C21 — local generation/embedding artifacts, runtime, dimensions, context, concurrency, provider limits | U5, U9, with U2/U13 evidence | Bolts 3 and 6 | Pin candidate artifacts/runtimes/checksums and evaluation limits before retrieval or assistant adapters are implemented; Bedrock remains optional |
| OQ2 and C04/C06/C07/C10/C13 — forecast freshness, usable-model profile, export lifetime, unavailable behavior | U6, U7, U8, U11-U13 | Bolt 4 before U7 design/implementation; Bolt 5 consumes the result | Define remaining freshness/status and compatible artifact parameters before serving; implement the approved C07 finalizer/pin/drain/attempt rules and C10/C13 typed history and exact bounded product-set coverage without reopening those decisions |
| OQ3 and C08/C14/C18 — seeded currency/time zone, buffer defaults, schemas, versions, receipt examples | U4, U8, U11, U12, U13 | Bolt 1 for the deterministic slice; complete detail before Bolt 5 implementation | Fix the seed values and acceptance examples before their respective scenario, purchasing, and UI code |
| OQ4 and C03/C05/C12/C18 — CSV/PDF bounds, extraction thresholds, retrieval/citation limits | U5, U9, U11, U12 | Bolt 3 | Define schemas, row/page/size limits, partial outcomes, top-k, and citation limits before ingestion/retrieval implementation |
| C19/C24-C26 — recovery implementation details and storage profile; objectives already fixed | U2, U3, U4, U10, U13-U15 | Bolt 2 for coordinator foundation; full proof in Bolt 7 | Preserve the approved 24-hour RPO, two-hour RTO, 30-day backup retention, eleven required participants, deadline classes and `sha256:` manifest format. Pin local storage/expiry mechanisms and run the stated acceptance checks; no objective re-selection is pending |
| OQ6 and C15/C17/C18 — telemetry versions/capacity, queue caps, retries, lag, pagination and response budgets | U2, U10, U11, U12 | Bolt 2 | Pin numeric operating limits; preserve the already-approved global identity-audit route, live per-page platform authorization, and distinct no-store platform view |
| OQ7 and C02/C16/C20 — redirects, sessions/tokens, key storage/rotation/recovery, Google configuration | U3, U11, U2 | Bolt 1 for local identity; Bolt 2 for hardening | Define local session/key behavior before identity implementation; implement the approved revocable human platform-Operator grant and current-grant check in Bolt 2; Google-specific values are required only when the optional federation path is enabled |
| OQ8 and C19 — runner isolation, state paths/backend, supported host versions | U2, U13 | Bolt 2 | Define trusted-runner and state/backend controls before CI deployment and clean-room automation is implemented |
| OQ9 — future languages and multilingual criteria | U5, U9, U12 | Later optional increment | No first-release blocker; preserve original text and extension seams while English remains the acceptance language |
| OQ10 and C15/C22-C27 — implementation schedule for fixed retention/replay rules | U2, U3, U4, U10, U13, U14, U15 | Bolt 2, with full recovery proof in Bolt 7 | Pin maintenance jobs and resource settings around approved baselines; prove U3/U4 service-owned C23 publishers against applicable C22 fixtures and capture U13 evidence without assigning their bootstrap path to U14 |
| C01 — exact OpenAPI/AsyncAPI/JSON Schema validators, compatibility checker and generators | U1, U2 | Bolt 1 candidate; Bolt 2 release | Pin tool versions and checksums before canonical packaging. Validate source-bound SHA-256 digests, C01-C27 kind/sidecar coverage, generated-output manifests, and real validation/evidence results before the release manifest is published |

If an entry criterion is unresolved when its Bolt begins, implementation of the affected behavior pauses while unrelated dependency-ready work may continue within the approved parallelism rules.
