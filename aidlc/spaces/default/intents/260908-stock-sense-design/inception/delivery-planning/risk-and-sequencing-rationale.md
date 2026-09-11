# StockSense risk and sequencing rationale

Date: 2026-09-11
Stage: Delivery Planning
Status: Generated from the confirmed Delivery Planning summary

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
| 7 | Portfolio evidence, operations, and clean-room release | 10 | 10 | 10 | 5 | 2.00 | Preparation is continuous, but final verification requires the assembled system |

The numerical ranking applies only among dependency-ready candidates. Bolt 7 scores highest but cannot close before the system it verifies exists. Bolt 5 scores above Bolt 4 but depends on the forecasting output completed in Bolt 4. These are dependency constraints, not exceptions hidden from the score.

## Walking-skeleton rationale

The first Bolt is a **walking skeleton**, a minimal end-to-end implementation that touches the essential architecture. It intentionally uses deterministic U1-conformant fixtures for unfinished supplier and forecast providers. This proves browser/BFF security, tenant validation, stored-routine persistence, purchasing authority, RabbitMQ audit propagation, Kubernetes packaging, and evidence capture while keeping ML and LLM uncertainty out of the first integration result.

The skeleton does not mark U5, U6, U7, or U9 complete and does not claim that a contract double is production behavior. Real provider integration and degraded-state behavior remain required in their later Bolts.

## Risk register and retirement points

| Risk | Impact | Earliest retirement evidence | Primary Bolt | Residual handling |
| --- | --- | --- | --- | --- |
| Cross-service contract drift | Consumers fail late or silently mis-handle versions | OpenAPI/AsyncAPI syntax, examples, generated clients, compatibility and provider-consumer tests | 1-2 | Every later contract change remains CI-gated |
| Tenant data or authority leakage | Portfolio becomes unsafe and architecturally invalid | Negative tests across HTTP, routines/RLS, pooled connections, queues, cache, documents, vectors, artifacts and audit | 2 | Repeat boundary tests in each later provider |
| Tenant-placement migration races | Stale work reaches old/dedicated storage | Placement-generation rejection, controlled cutover, stale-job and rollback evidence | 2 | Exercise migration/recovery again in Bolt 7 |
| Purchasing state/concurrency defect | Incorrect stock or unauthorized order effects | Transition, idempotency, expected-version, cancel/receipt race, partial and over-receipt tests | 1 and 5 | Agent tools can create drafts only; adversarial tests in Bolt 6 |
| Local stack exceeds 16 GB/3 CPU | Reviewer cannot run the portfolio | Measured sustained/peak cluster and one-active-job profile | 2 | Serial heavy checks and tune requests/limits; owner decides any scope/budget change |
| Secret/key handling failure | Credentials leak or sessions fail after restart/rotation | Vault/VSO, persistent signing keys, scoped workload access, reload and recovery tests | 2 | Final rotation/recovery evidence in Bolt 7 |
| Supplier extraction/retrieval is not trustworthy | RAG answers lack usable evidence | Explicit partial/failure states, citations, deletion reconciliation, embedding comparison | 3 | Keep accepted terms authoritative in PostgreSQL; Qdrant rebuildable |
| Temporal leakage or misleading model claims | ML evidence is invalid | Chronological cutoffs, hand-check metrics, matched baselines, failed-candidate retention | 4 | Publish synthetic-data and zero-denominator limitations |
| Forecast unavailable/stale behavior is hidden | Planning acts on invalid evidence | Explicit freshness/status contract and no-silent-substitution tests | 4-5 | U8 blocks or presents unavailable result according to resolved policy |
| LLM gains implicit authority or crosses tenants | Agent performs unsafe actions | Typed tools, per-call authorization, prompt-injection and cross-tenant adversarial tests | 6 | No approval tool; no automatic external fallback |
| Clean checkout depends on owner state | Portfolio review fails | CPU-only install from pinned revision without owner credentials/cache/GPU | 7 | Evidence manifest records limitations and checksums |
| Recovery or retention resurrects expired/duplicate data | Audit, vector, or stock state becomes inconsistent | Restore, replay, DLQ, retention, projection rebuild and rollback evidence | 7 | Publish recovery objectives and remaining limits |

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
| OQ2 and C04/C06/C07/C10 — forecast freshness, usable-model profile, export lifetime, unavailable behavior | U6, U7, U8 | Bolt 4 before U7 design/implementation; Bolt 5 consumes the result | Define freshness/status and compatible artifact behavior before forecast serving or planning logic is implemented |
| OQ3 and C08/C14/C18 — seeded currency/time zone, buffer defaults, schemas, versions, receipt examples | U4, U8, U11, U12, U13 | Bolt 1 for the deterministic slice; complete detail before Bolt 5 implementation | Fix the seed values and acceptance examples before their respective scenario, purchasing, and UI code |
| OQ4 and C03/C05/C12/C18 — CSV/PDF bounds, extraction thresholds, retrieval/citation limits | U5, U9, U11, U12 | Bolt 3 | Define schemas, row/page/size limits, partial outcomes, top-k, and citation limits before ingestion/retrieval implementation |
| OQ5 and C19 — recovery objectives, backups, expiry, persistent disk | U2, U10, U13 | Bolt 2 before recovery mechanisms; final proof in Bolt 7 | Define objectives and storage/retention policy before backup, restore, or recovery automation is implemented |
| OQ6 and C15/C17/C18 — telemetry versions/capacity, queue caps, retries, lag, pagination and response budgets | U2, U10, U11 | Bolt 2 | Pin components and numeric operating limits before broker, telemetry, query, or BFF capacity behavior is implemented |
| OQ7 and C02/C16/C20 — redirects, sessions/tokens, key storage/rotation/recovery, Google configuration | U3, U11, U2 | Bolt 1 for local identity; Bolt 2 for hardening | Define local session/key behavior before identity implementation; Google-specific values are required only when the optional federation path is enabled |
| OQ8 and C19 — runner isolation, state paths/backend, supported host versions | U2, U13 | Bolt 2 | Define trusted-runner and state/backend controls before CI deployment and clean-room automation is implemented |
| OQ9 — future languages and multilingual criteria | U5, U9, U12 | Later optional increment | No first-release blocker; preserve original text and extension seams while English remains the acceptance language |
| OQ10 and C15 — retention schedule, expiry lag, replay/DLQ limits | U2, U10 | Bolt 2 | Define maintenance and replay limits before retention and recovery jobs are implemented |
| C01 — exact OpenAPI/AsyncAPI/JSON Schema validators, compatibility checker and generators | U1, U2 | Bolt 1 | Pin tool versions and checksums before canonical contract packaging or generated-client automation is implemented |

If an entry criterion is unresolved when its Bolt begins, implementation of the affected behavior pauses while unrelated dependency-ready work may continue within the approved parallelism rules.
