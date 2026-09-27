# StockSense requirements

Date: 2026-09-27
Stage: requirements-analysis
Status: Revised draft after the 2026-09-27 formal backward jump. The 2026-09-21
owner gate is historical and does not approve these revised bytes.
Input summary: the owner confirmed the lifecycle-reconciliation summary as
`Looks correct` on 2026-09-21 and the modified summary on 2026-09-27.
Revision: authoritative requirements now include the accepted construction NFR
decisions needed to repair stale contracts and downstream inconsistencies.
Scope: classic; standard depth and test strategy.

## Intent analysis

StockSense helps a planner in non-perishable specialty retail decide what to
reorder, when and why. Demand forecasts, current inventory and supplier constraints
produce deterministic replenishment proposals; an assistant explains evidence and
can help draft proposals. An authenticated manager retains purchasing authority.
The first release simulates ordering and receipt rather than sending real orders.

The owner's primary goal is an independently runnable portfolio demonstrating
AI-DLC, React, .NET, relational and NoSQL databases, ML/MLOps, bounded agent tools,
DevOps and cloud-native delivery. The product must demonstrate a complete journey:
import -> inspect inventory -> forecast -> review shortages -> draft -> approve
-> simulated receipt -> inventory update -> evaluate outcomes.

Measure forecast error, simulated lost demand and inventory value against declared
baselines. No percentage improvement or real-world savings is promised before
evaluation. Failed model candidates remain part of the evidence.

## Sources

- S1: `requirements-analysis-questions.md`, Q1-Q7 and their clarifications:
  retail domain, tenant boundaries, Kubernetes, resources and synthetic data.
- S2: that file's subsequent confirmed decisions and consolidated summary:
  reconciled owner decisions, explicitly confirmed before this document.
- S3: that file, Q8-Q10: performance, retention and failed-review quota defaults.
- S4: `docs/product-brief.md`: business intent, journey and release boundary.
- S5: `docs/design.md`: draft design and proposed verification scenarios.
- S6: `docs/decisions/0002-identity-provider.md` and ADRs 0003-0019:
  accepted technology and policy decisions; refer to each ADR number below.
- S7: `CONTRIBUTING.md`: accepted Git rules and publication authority.
- S8: `docs/execution-plan.md`: planned tasks SS-01 through SS-38.
- S10: `requirements-analysis-questions.md`, owner purchasing-policy selection
  (2026-09-09); explicit authorization to resolve review findings R-01 through R-04.
- S9: `requirements-analysis-questions.md`, owner frontend revision (2026-09-09):
  Ant Design component library and Vite development/build tooling.
- S11: `requirements-analysis-questions.md`, lifecycle-reconciliation summary
  confirmed on 2026-09-21: contract, messaging, evidence, model, recovery,
  supplier-quality, resource, reliability, browser and clean-run decisions.
- S12: owner instruction on 2026-09-22 to resolve Domain Design review findings
  R-01 through R-07, including the implementation-blocking recovery deadlines.
- S13: owner instruction on 2026-09-27 to put Supplier Knowledge embedding-index
  builds into the shared heavy-work slot, followed by confirmation of the
  revised Requirements Analysis summary. The owner also chose formal lifecycle
  redo from the earliest stale Inception stage; that is a process decision, not
  an application feature.

The original generated `project-description.json` contains only `Let's`; it is
insufficient as a standalone product description. It is retained as historical
input, not expanded or silently rewritten. S1-S4 supply the substantive owner
intent. S5 is a proposal where not confirmed by S1-S3 or an accepted ADR. The
operating defaults in S3 supersede earlier wording calling those values open.

## Actors and release boundary

| Actor | Required capability and boundary |
| --- | --- |
| Planner | Inspect authorized retailer inventory, review shortages, compare scenarios and draft purchasing proposals |
| Manager | Review and approve proposals within an authorized retailer; identity and current membership checked by backend |
| Platform operator | Provision and operate the local environment; privileged and cross-tenant operations audited |
| Portfolio reviewer | Reproduce setup, log in locally and run the documented demo without owner credentials or GPU |
| Worker/agent service | Act only under validated service/job authority; cannot infer tenant authority from model output or approve purchases |

Planner and manager are roles, not necessarily different people. No separation-of-
duties rule preventing a manager from approving their own draft has been selected.

Initial data covers three independent retailers, one store and 100 products each,
with 18 months of reproducible daily history. Forecast horizon is 28 days, refreshed
daily. Seasonality, promotions and intermittent demand must be represented.

## Functional requirements

All FRs below are required for the initial portfolio release unless a subclause
explicitly says optional. They are delivered incrementally; the complete simulated
purchasing journey precedes trained-model and assistant integration. Each row
states observable acceptance evidence, not a claim that a test already exists.

| ID | Requirement | Acceptance evidence, including failure/boundary cases | Source / planned tasks |
| --- | --- | --- | --- |
| FR1 | The system shall authenticate local demo users and support Google OIDC federation through Duende IdentityServer, without automatic account linking by matching email. | Both login paths and every acceptance item in ADR 0005 are mandatory: a Google identity with the same email as an existing local user must not acquire that account or its memberships; invalid callbacks/expired sessions fail; logout invalidates the StockSense BFF session and replay of its old cookie cannot authorize a request. Account-linking tests cover a verified authorized linkage and deny email-only, unauthenticated and wrong-account linkage. Logout does not promise to end the upstream Google session. | S2; ADRs 0002, 0005; SS-08/09 |
| FR2 | The backend shall authorize every business request against the user's current retailer membership and role. | Authorized retailer access succeeds; substituted retailer/entity IDs, missing tenant context and revoked memberships are denied, including with a still-valid session. | S1/S2; SS-07/09/11 |
| FR3 | The system shall generate and import reproducible synthetic sales, inventory and supplier data, preserving observed sales and lost demand separately. | Same seed/configuration reproduces all three retailers and history; invalid/duplicate imports have explicit outcomes without duplicate stock effects. A stockout fixture with demand 10 and available stock 6 records sales 6 and lost demand 4, not demand 6. Zero-demand days record both as zero. Synthetic true demand equals sales plus lost demand and is retained as evaluation truth, not leaked into model inputs. | S1/S2/S4; ADR 0004; SS-10/17 |
| FR4 | The planner shall inspect inventory and stock-movement history within the selected authorized retailer. | Inventory view exposes current quantities and history with loading/empty/error states; receipts and adjustments reconcile to the ledger; cross-retailer lookup fails. | S4/S5; SS-10/11 |
| FR5 | The system shall produce daily, versioned 28-day demand forecasts and expose run status and freshness. | Results identify model/data/configuration versions; repeated scheduling for a retailer-local date does not create duplicate business effects; failed or stale runs are visible rather than presented as current. | S2/S4; ADRs 0004, 0010; SS-13/20 |
| FR6 | Replenishment shall use inventory position, forecast demand, dated inbound stock, supplier lead time, minimum order quantities, pack sizes and configurable buffer-day safety stock. | Product buffer overrides take precedence over retailer defaults; products without overrides inherit the retailer setting. Fixtures cover an explicit zero-day override, no override, zero demand, pack rounding and minimum orders. Inventory/term version changes invalidate stale proposals before approval. Numerical buffer defaults remain OQ3. | S2/S5; ADR 0011; SS-14/15 |
| FR7 | Planners shall compare scenarios and create/edit drafts; purchasing shall enforce the permitted transitions and actors below, including rejection and cancellation before any receipt. | Submitted/approved lines cannot be edited. An authorized manager approves/rejects a submitted proposal or cancels a submitted/approved order before any receipt. Invalid transitions and concurrent changes fail atomically; every purchase requires manager approval. | S2/S10; SS-14/15/16 |
| FR8 | Authorized planners/managers shall record partial or full simulated receipts against approved quantities, exactly once per accepted operation. | Every received quantity is positive and cumulative receipts per line cannot exceed its approved quantity, even with distinct receipt IDs and concurrent requests. Receipt, order status, stock ledger and audit/outbox changes commit atomically. For an approved line of 10, receive 6 then 4; reject 6 then 5. Duplicate replay changes nothing; changed payload with the same key fails. Cancelled/rejected/unapproved orders cannot receive. | S4/S10; SS-12/15/16 |
| FR9 | The system shall provide on-demand inventory review with three accepted requests per retailer per local calendar day, shared by all its users. | First three distinct accepted requests consume slots atomically; a fourth is denied; concurrent requests cannot exceed the quota; scheduled reviews are excluded; local-day/DST boundaries are tested. | S2/S3; ADR 0011; SS-35 |
| FR9.1 | Only one review shall be active per retailer; duplicate requests shall return the existing job. | Concurrent duplicate requests reuse the job and do not spend multiple slots; authority is checked before returning job details. | S2; ADR 0011; SS-35 |
| FR9.2 | Failed accepted reviews shall retain their consumed slot; retry/replay of the same job shall not consume another slot. | Failure followed by retry preserves quota count; requests rejected before acceptance consume nothing. Retries operate on the original accepted job across local-day boundaries. | S3 Q10; SS-35 |
| FR9.3 | Manual review shall use current inventory/terms and a valid forecast, without triggering model retraining. | Job evidence identifies the input versions; no valid forecast produces an explicit unavailable/failure outcome, not invented demand. The precise validity threshold remains OQ2. | S2; ADR 0011; SS-35 |
| FR9.4 | Each retailer shall receive a scheduled daily inventory/replenishment review, independently of daily forecast production. | One logical scheduled review per retailer-local date recomputes suggestions; scheduler retries/restarts do not duplicate effects or consume manual allowance. Serialize scheduled and manual execution to retain one active review per retailer; retain a due scheduled job for execution after the active job ends. Record local date, trigger, input versions and outcome; unavailable forecasts yield explicit status. | S2; ADR 0011; SS-14/35 |
| FR9.5 | The planner UI shall expose manual review and current review status for the authorized retailer. | Display last successful review time, forecast/inventory/supplier-input versions, active/queued job and outcome, remaining allowance and next reset time in the retailer time zone. Display never-run/failure/unavailable states explicitly. Quota exhaustion disables the action with an explanation; server-side authorization/quota checks still apply. Failed accepted jobs keep their slot and retry the same job, as FR9.2 requires. | S2/S3; ADR 0011; SS-11/35 |
| FR10 | Supplier ingestion shall accept CSV offers and text-based PDF catalogs/terms, preserve source versions and report extraction/validation errors. | Supported fixtures retain source/page provenance; malformed CSV, scans and partially extractable PDFs produce explicit outcomes; unvalidated terms do not silently become authoritative. | S2; ADRs 0008, 0009; SS-21 |
| FR10.1 | MongoDB shall retain supplier submissions/extraction records; accepted normalized terms shall enter PostgreSQL through authorized routines. | Each accepted term traces to its source version; duplicate jobs are idempotent; access to documents and normalized data is tenant-scoped. | S2; ADR 0008; SS-21 |
| FR10.2 | Supplier extraction shall classify every versioned golden-corpus result as Validated, PartiallyValidated, Failed or Unsupported using fixed CSV and text-PDF gates. | CSV is Validated only when all required columns exist and at least 99% of rows are valid; 95% to below 99% is PartiallyValidated; missing required columns or below 95% is Failed. Text PDF is Validated only when every page is readable, all required golden terms are found and at least 98% of expected text anchors match; at least 90% readable pages and anchors is PartiallyValidated with every omission identified; lower quality is Failed. Scanned/encrypted input is Unsupported. Only Validated extraction may publish accepted terms automatically. | S11; SS-21 |
| FR11 | The system shall enforce one currency and one time zone per retailer, with UTC timestamps and retailer-local aggregation/scheduling. | Mismatched-currency offers are rejected; no implicit FX conversion occurs; date-boundary and DST fixtures preserve scheduling and quota semantics; lead times use calendar days. | S2; ADR 0010; SS-10/13/14/35 |
| FR12 | The ML workflow shall compare a trained candidate with seasonal-naive and moving-average baselines through reproducible temporal backtests and the evaluation definitions below. | Splits exclude future-data leakage; identical exogenous demand/supply scenarios support comparisons. Reports include uncensored synthetic demand truth, observed sales and lost demand separately, MAE, WAPE with zero-denominator handling, and inventory value per retailer/currency. Retain unsuccessful candidates and synthetic-data limitations. | S2/S4/S5; ADRs 0004, 0008; SS-17/18 |
| FR13 | MLflow and job metadata shall connect datasets, code, configuration, model versions, evaluations, promotion and rollback. | A result is traceable to a recorded run; failed jobs recover explicitly; promotion has evaluation evidence; rollback selects a known model and preserves prior provenance. | S2/S4; ADR 0008; SS-19/20 |
| FR13.1 | Model Lifecycle shall coordinate training, evaluation, Forecasting batches and Supplier Knowledge embedding-index builds through one durable global heavy-work slot and a versioned lease interface, and shall publish verifiable promoted-model packages. | Authenticated request/acquire/renew/release operations support idempotency, queue/deadline outcomes, fencing tokens and restore reconciliation. Concurrent U5 embedding builds and U6/U7 heavy jobs cannot hold overlapping active slots; uncertain expiry blocks reassignment until the authoritative local fence is reconciled. Each promoted release resolves an immutable `skops.io` artifact, canonical manifest, SHA-256 digest, Ed25519 signature, signer key status, trusted-type allowlist version and retained-release revocation/overlap behavior. Forecasting refuses an unfenced lease or unverifiable package. | S11/S13; SS-18/19/20/34 |
| FR14 | The assistant shall explain recommendations with authorized evidence and invoke bounded tools for reads, deterministic calculations and draft proposals. | Responses cite applicable source/data versions; missing evidence is disclosed; injected instructions, tenant switching, fabricated citations and attempts to approve orders are rejected in evaluation. | S2/S4; ADR 0014; SS-22/23 |
| FR14.1 | After a visible, payload-bound confirmation, the assistant may create a new purchase Draft only; it shall not edit an existing Draft, submit, approve, reject, cancel or receive. | The create command binds action-draft identity, confirmation proof, canonical payload hash, expected context/version and idempotency identity. Changed payload, expired confirmation, replay conflict, stale context and unauthorized authority fail without effect. Any later Draft edit is performed by an authorized Planner through the normal purchasing interface. | S11; SS-22/23 |
| FR15 | Generation shall run locally initially through Python Strands, with an extension boundary for explicitly configured external providers such as Bedrock. | A real CPU inference path works without owner GPU/secrets; provider failures are explicit; no automatic external fallback occurs; optional external configuration preserves StockSense API contracts. | S2; ADRs 0012-0014; SS-36 |
| FR16 | Authorized retrieval shall use standalone Qdrant collections per retailer and embedding-model/configuration version. | Backend routing rejects client-selected arbitrary collections; wrong-model, cross-tenant and deleted-source tests fail safely; reindex/cutover/rollback reconcile source versions and deletions. | S2; ADRs 0007, 0018; SS-33/34 |
| FR16.1 | EmbeddingGemma-300M and Qwen3-Embedding-0.6B shall be compared on held-out English retrieval fixtures before choosing the default. | Report quality, citations, CPU latency, memory and setup reproducibility for both candidates; separate indexes prevent mixed dimensions/configurations; multilingual extension remains possible. | S2; ADR 0015; SS-33/34 |
| FR16.2 | Supplier Knowledge shall own one durable active-index route per retailer and embedding configuration in PostgreSQL, independently of Qdrant. | Routine-only compare-and-swap uses an expected route version and permits exactly one active generation. Activation verifies tenant/configuration/dimension/count/digest consistency; backup/restore preserves the route; startup/crash reconciliation keeps retrieval unavailable until the route and Qdrant generation agree. | S11; SS-33/34 |
| FR16.3 | Supplier Knowledge embedding-index builds shall obtain and honor a Model Lifecycle heavy-work lease, while Supplier Knowledge alone validates and activates index generations. | A U5 index build starts only with the current authenticated `embedding-index` lease and fencing token; lost, expired, revoked or recovery-fenced work cannot mark its build complete. Partial/stale Qdrant generations remain inactive and are reconciled or rebuilt. Activation uses U5's independent tenant, source, configuration, generation and expected-route checks; the U6 shared-transaction Forecasting finalizer is neither required nor granted to U5. A concurrent U5 build and U6/U7 job demonstrate the single global slot without treating a lease as index-route authority. | S13; SS-33/34 |
| FR17 | Business audit entries shall commit atomically with required business changes and outbox records; OpenSearch shall receive an idempotent searchable projection through RabbitMQ. | Audit-write failure rolls back the mutation; index outage leaves authoritative records intact; retries do not duplicate indexed events; lag and replay are observable; retained records can rebuild the index. | S2; ADR 0019; SS-37/38 |
| FR17.1 | Audit history shall cover inventory/purchasing changes, memberships, manual reviews, model promotion, privileged operations and agent tool actions, with actor, tenant, target, outcome and provenance. | Each demonstrated sensitive flow yields the expected event; rejected attempts use a path that survives business rollback; tenant audit queries cannot disclose another retailer's history. | S2; ADR 0019; SS-37/38 |
| FR18 | Operational logs and searchable audits shall be available through OpenSearch/Dashboards, with operator-only dashboards initially and tenant-authorized business audit APIs. | Correlation connects API, job/message and agent operations; ordinary users cannot access operator-wide searches; required audit recording remains independent of optional telemetry delivery. | S2; ADR 0019; SS-24/38 |
| FR19 | Redis shall provide disposable tenant-scoped application caching without becoming authoritative for permissions, orders or review quotas. | Cache outage, cold start and stale-fill/invalidation scenarios preserve business correctness; cache keys and access cannot mix retailers. | S2; ADR 0007; SS-32 |
| FR19.1 | Supplier Knowledge may cache only authorized retrieval and accepted-term comparison results for five minutes. | Keys include retailer, placement generation, contract version, source version and active-index generation. Source/index events invalidate entries. Outage, cold start and stale-fill races fall back to authoritative stores and never serve stale or foreign data. | S11; SS-21/32/34 |
| FR20 | Operators shall demonstrate backup/restore, message replay, application/model rollback and migration of one tenant from shared to dedicated storage. | Restore into a clean environment, reconcile record counts/stock/provenance, rebuild audit/vector projections, switch tenant placement, and reject stale jobs/routing after cutover. Document movement of documents and artifacts. | S1/S2/S4/S5; SS-26/27 |
| FR20.1 | A versioned platform recovery barrier shall create a consistent PostgreSQL/RabbitMQ recovery cut for queues included in a backup. | The barrier fences every affected producer, consumer, outbox relay, acknowledgement and topology mutation; records PostgreSQL LSN/transaction evidence and per-queue identities/digests; takes only a broker-supported quiesced snapshot; and applies recovery policy v1 deadlines: class A authority/bootstrap participants 30/30/30/60 seconds, class B transactional participants 60/60/60/120 seconds, and class C asynchronous/data/compute participants 120/180/60/180 seconds for prepare/close/abort/resume. Global registration, prepare, close/drain/evidence, snapshot, abort and resume/reconciliation limits are 60 seconds, 5 minutes, 5 minutes, 30 minutes, 5 minutes and 10 minutes. Prepare dispatch is recorded durably before send; abort/reconciliation covers every participant to which prepare may have been delivered even when acknowledgement is lost. A durable terminal-phase guard suppresses prepare/close that arrives after abort, and a lost-acknowledgement/abort-before-prepare schedule must pass before `Aborted` is claimable. Abort or resume timeout fails closed with the unresolved participant retained in the terminal fencing inventory. | S11/S12; SS-06/26 |

### Purchasing transitions and receipt boundaries (FR7/FR8)

Owner-selected purchasing policy (S10). Tenant membership, role and expected order
version are checked by the backend on every command. Manager users may also carry
the planner role; manager approval never follows from agent/service authority.

| From | Action and actor | To / invariant |
| --- | --- | --- |
| None | Planner creates proposal | Draft |
| Draft | Planner edits or submits | Draft or Submitted; submit locks commercial lines |
| Submitted | Manager approves after revalidation | Approved |
| Submitted | Manager rejects | Rejected, terminal; correction requires a new linked draft |
| Submitted / Approved | Manager cancels, provided no receipt has committed | Cancelled, terminal |
| Approved | Planner/manager records valid receipt | PartiallyReceived if any line remains outstanding; Received if all lines are fulfilled |
| PartiallyReceived | Planner/manager records valid receipt | PartiallyReceived or Received by the same line-completion rule |

All unlisted transitions are denied, including cancellation after any partial
receipt and receipt after Received. A no-change replay of an already accepted
idempotency key returns the original result without a new transition. No draft
cancellation, reopen, return, over-receipt tolerance or post-receipt cancellation
is included in v1. A replacement draft links to its source and requires fresh
submission and approval; it cannot mutate approved lines or silently replace an
active order. Simulation dispatch is delivery metadata, not a separate state or
permission to bypass approval. Serialize cancel/receipt races so only a valid
result commits; validate all receipt lines before committing any part of a receipt.
For multiple lines, fulfilling one line alone cannot mark the whole order Received.

### Evaluation definitions (FR3/FR12)

These acceptance definitions are included in the owner-confirmed revised summary;
requirements-stage approval remains pending. No measured improvement is claimed.

- Evaluation unit: retailer, product, forecast origin and horizon day (1-28).
  Score only complete held-out horizons on the same origins/products for all
  candidates; publish dates, sample counts, missing-data exclusions and versions.
  Report each retailer separately and equal-weight daily observations within it.
- Forecast target y is generated true demand (observed sales + lost demand).
  Training features use only observations available at forecast time; simulator
  latent demand is reserved as evaluation truth. Report MAE = sum(abs(y - forecast))
  / number of observations, in units/day, and WAPE = 100 * sum(abs(y - forecast))
  / sum(y). Zero-demand observations remain in MAE. If sum(y) is zero, WAPE is
  N/A with a zero-demand flag, never zero or infinity; MAE still reports false demand.
- Inventory-policy evaluation uses a chronological simulation once per scenario,
  not one summed simulation per overlapping forecast origin. All candidates use
  the same exogenous true demand, initial stock, supplier constraints, lead times,
  review/ordering policy and cost fixture; only the forecast changes. Report total
  lost units and lost-demand rate = 100 * lost units / true demand units. A zero
  denominator is N/A; show zero lost units separately.
- Inventory value is daily closing on-hand units multiplied by a fixed versioned
  unit acquisition-cost fixture for each product, summed across that retailer.
  Report its arithmetic mean across all evaluated calendar days (including zero
  stock days). Exclude inbound stock and sales revenue. Report in the retailer's
  currency, with no aggregation across currencies; this is a simulation measure,
  not an accounting valuation claim.
- Hand-check fixtures: demand 10, forecast 8 gives MAE 2 and WAPE 20%; stock 6
  against demand 10 yields 4 lost units and 40% lost-demand rate. Demand 0 and
  forecast 2 gives MAE 2, WAPE N/A. Closing inventory values 12 and 8 yield mean 10.

## Non-functional requirements

| ID | Requirement and acceptance criterion | Source / planned tasks |
| --- | --- | --- |
| NFR1 | Ordinary inventory/purchasing reads shall achieve p95 below 1 second with five concurrent local users, the agreed seeded dataset and a warmed running stack. Include normal authentication/authorization. Publish the read mix, sample count, duration, hardware and measured result; LLM generation, downloads and startup are measured separately. Benchmark parameters are fixed before running the acceptance test. | S3 Q8; SS-24 |
| NFR1.1 | Retail import evidence shall report upload admission, queue delay and active processing separately. Admission is below 500 ms; admitted work starts within ten minutes; the 1,000-row/2 MiB inventory import completes active processing within 30 seconds and the 100,000-row/25 MiB demand import within three minutes. | S11; SS-10/24 |
| NFR1.2 | The Retail Data local reliability profile shall run for 30 warmed minutes with no more than 1% unexpected errors/timeouts, readiness within 60 seconds and restart recovery within two minutes, excluding only declared maintenance. Fix and publish a versioned workload profile before the run: operation mix, attempted-request volume, tenant distribution and fixture state. The error rate is unexpected failures plus timeouts divided by all attempted profile operations; expected validation/authorization denials are classified separately and cannot be removed from the denominator. Report counts by operation and the aggregate, including excluded maintenance windows. This is portfolio evidence, not a production availability SLA. | S11; SS-10/24 |
| NFR2 | The full demonstrated cluster workload, including OpenSearch/Dashboards, Vault/VSO, Redis, Qdrant, agent services and one active heavy-work job (model or embedding-index build), shall fit the 16 GB RAM / 3 CPU planning envelope. Measure sustained/peak usage and Kubernetes/VM overhead for both job profiles; an unmeasured table is insufficient. Extra host RAM/CPU is not pre-authorized. | S1/S2/S13; SS-24/34/36 |
| NFR2.1 | Each Supplier Knowledge embedding candidate artifact shall be no larger than 1.5 GiB and each measured evaluation process shall remain at or below 1.5 GiB peak RSS inside the 2 GiB U5 pod limit. Candidate loading, ingestion/build and serving benchmarks are serialized and the whole cluster must still satisfy NFR2. | S11; SS-24/34 |
| NFR3 | Tenant isolation shall hold across HTTP, messaging, SQL routines/RLS, document/vector storage, caches, artifact access and audit searches. Negative tests shall cover missing context, identifier substitution, pooled-connection reuse and stale placement generations. | S1/S2/S5; SS-07/12/27/32/34/38 |
| NFR4 | PostgreSQL application roles shall use parameterized stored procedures/functions exclusively, without direct table reads/writes or EF Core. Runtime roles shall not bypass tenant controls or update/delete audit history; migrations and controlled retention use separate privileges. | S2; SS-07/08/37 |
| NFR5 | Browser identity shall use a BFF with authorization code/PKCE, secure HttpOnly cookies, server-side tokens and CSRF protection. Machine callers shall have narrow scopes/audiences and validated job authority. Test invalid callbacks, session expiry, revocation and unauthorized machine calls. | S2/S5; ADR 0002; SS-08/09/12 |
| NFR6 | Vault shall run persistently inside Kubernetes, with workload-scoped access and VSO synchronization to Kubernetes Secrets. No secrets shall enter Git or Terraform state. Consumers shall have tested credential reload/rotation behavior; backup/unseal/key recovery material shall be protected outside the cluster. | S2; ADRs 0006, 0017; SS-29/30/31 |
| NFR7 | Async integration shall use durable RabbitMQ messaging with transactional outbox/inbox, idempotent consumers, publication confirms, acknowledgement after business commit, bounded retries and dead-letter replay. Demonstrate broker/worker failure without duplicate stock effects; do not claim exactly-once transport. | S2/S5; SS-12/26 |
| NFR7.1 | The shared messaging contract shall require authenticated producer binding, a canonical payload digest, a 64 KiB envelope limit, no more than five total deliveries, deterministic contract-defined backoff bounded from one to 30 seconds, seven-day DLQ retention and authorized replay batches of at most 100. Attempt counting includes the initial delivery; acceptance evidence covers exact replay, changed-payload conflict, poison messages, expiry and reconciliation to authoritative state. | S11; SS-05/12/26 |
| NFR8 | Every REST integration, including internal APIs, shall have versioned OpenAPI contracts; every async integration shall have AsyncAPI contracts. CI shall validate examples and compatibility; invalid contracts shall block the applicable change. | S2; SS-04/05 |
| NFR8.1 | The versioned browser/BFF OpenAPI contract shall define no-store CSRF bootstrap and rotation, CSRF on every mutation, one idempotency identity per logical command, typed HTTP 200 aggregate/section states, bounded reads/uploads, operation handles/status/reconciliation, purchasing operations, assistant SSE/resume/snapshot, bounded audit/evidence queries, contract metadata and stable RFC 9457 problems. | S11; SS-04/05/11 |
| NFR8.2 | The versioned evidence schema shall permit exactly `passed`, `failed`, `limited`, `rejected`, `unavailable` and `not-run`, with reason, expected/actual result, stable trace IDs, immutable revision, environment, timing, command profile, artifacts/checksums and limitations. Demo Evidence owns semantics and approved examples; Contracts owns canonical JSON Schema packaging, generation, compatibility validation and distribution. | S11; SS-02/04/28 |
| NFR8.3 | The shared contract catalogue shall include the Model Lifecycle lease API, promoted-model manifest/signature fields and platform recovery-barrier protocol from FR13.1 and FR20.1. Code generation shall fail while only legacy or unresolved placeholders exist. | S11; SS-04/05/18/26 |
| NFR9 | Operational logs default to 7 days and business audit to 90 days, configurable per deployment. Audit expiry shall apply consistently to PostgreSQL and OpenSearch through controlled maintenance. Expired data shall not reappear through rebuild/rollback; backup expiry is explicitly specified before recovery implementation. | S3 Q9; SS-37/38/26 |
| NFR10 | Logs shall exclude credentials, tokens, raw supplier documents, full prompts and hidden reasoning by default. Structured fields shall support correlation without unbounded metric cardinality. Telemetry buffering shall be bounded with observable loss; operational log outage shall not block business work. | S2; ADR 0019; SS-24/38 |
| NFR11 | A reviewer shall reproduce setup and the complete demo from a clean checkout without owner credentials, cached models or the owner's GPU. Pin versions/checksums, document model terms/download steps and verify real CPU inference; fixtures alone do not satisfy this requirement. | S2; ADR 0013; SS-28/36 |
| NFR11.1 | On the documented reference host/network, every one of three clean runs shall complete prerequisite checks, verified downloads, build, deployment, seed and core demo within 90 minutes; after verified downloads, every run shall complete build/deploy/seed/core demo within 45 minutes. Report each run and phase directly rather than interpolating p95 from three samples. | S11; SS-28/36 |
| NFR12 | Infrastructure delivery shall be reproducible through Terraform/Terragrunt and Helm, with local state as a default and an explicitly configurable reviewer backend. Protect state outside ephemeral workspaces, serialize applies and demonstrate backup/migration; do not provision a cloud backend implicitly. | S2; ADR 0016; SS-06/25 |
| NFR13 | CI shall run applicable build/test, contract, migration and security checks. Deploy only trusted revisions through an isolated local runner; never execute public PR code on that runner. Flyway migration failure blocks rollout; rollback uses compatible schema and immutable application versions. | S2/S7; ADR 0003; SS-05/25 |
| NFR14 | Core browser flows shall expose loading, empty, failure and stale-data states and support keyboard operation. First-release documents/queries are English; preserve original text and extensibility for multilingual retrieval. No additional language or accessibility certification is claimed. | S2/S5; ADR 0015; SS-11/16/23 |
| NFR14.1 | The supported browser profile shall cover the latest two stable Chrome, Firefox and Microsoft Edge releases plus the current Safari major through standards-compatible behavior and Playwright WebKit evidence. Exact tested versions/channels and 360x800, 768x1024 and 1440x900 viewports shall be recorded. | S11; SS-03/11/28 |
| NFR15 | Portfolio evidence shall link stable requirement IDs to later stories, designs, tasks and tests. Publish actual measured results, recovery limitations and rejected model candidates. No lifecycle gate, commercial benefit or successful test shall be claimed without its evidence. | S4/S7/S8; SS-02/28 |

## Constraints

- C1: Initial deployment is Docker Desktop Kubernetes, not a selected managed cloud.
- C2: The release demonstrates non-perishable specialty retail and simulated supplier
  fulfillment. Multiple stores, payments, perishables, autonomous ordering, real
  supplier integrations, price optimization and public signup are excluded.
- C3: Selected technologies and roles are binding as recorded in S2 and S6.
  PostgreSQL owns normalized business data; MongoDB owns document/extraction
  records; Qdrant owns retrieval indexes; Redis is disposable application cache.
- C4: The .NET backend retains business authorization and deterministic quantities;
  Python Strands and the LLM cannot grant membership or approve purchases.
- C5: Shared storage must allow tenant extraction without requiring a wholesale
  redesign. Initial shared storage does not mean physical database sharding.
- C6: An external LLM provider is optional and requires explicit configuration,
  credentials and a spend policy before activation. No automatic remote fallback.
- C7: The owner reports an AMD Radeon RX 6700 XT with 12 GB VRAM; support and
  placement must be measured. It is an optional acceleration path, not a reviewer
  prerequisite or proof of compatibility with a particular model/runtime.
- C8: Git uses short-lived working branches, Conventional Commits and reviewed
  changes. Agent commits/pushes are authorized; each merge needs owner approval.
- C9: No secret, state file, downloaded model binary or generated dataset belongs
  in Git. Track generators, manifests and reproducibility instructions instead.
- C10: Formal requirements approval does not authorize real orders, cloud spending,
  deployments or silently skipping later lifecycle approvals.

- C11: The frontend shall use React and TypeScript with Ant Design as its UI
  component library and Vite for development and production builds (S9; SS-03/11).
  Acceptance evidence: a clean checkout starts the development server, renders an
  Ant Design component, and produces a production build served by the local
  ASP.NET Core deployment. Pin compatible dependency versions during SS-03.

## Assumptions & Open Questions

Assumptions below are disclosed implementation premises, not owner-selected
numerical requirements. None permits weakening the confirmed scope.

| ID | Assumption / risk | Validation and owner |
| --- | --- | --- |
| A1 | A solo developer can deliver the staged portfolio; no delivery deadline is set. | Owner/delivery planning confirms availability and any interview deadline before calendar commitments. |
| A2 | A complete local stack and usable CPU model can fit the budget; this is not yet demonstrated. | Implementer measures SS-24/36. If infeasible, present measured alternatives to the owner; do not silently omit services or increase resources. |
| A3 | Synthetic fixtures adequately demonstrate correctness and comparison methodology. | Product/ML evaluation reports limitations; actual commercial savings require separate real-world validation. |
| A4 | Normal local sessions and installations have sufficient persistent disk. | Reviewer/implementer verifies disk requirements before model/data downloads and SS-06 deployment. |

Resolved decision: OQ4's initial supplier file sizes and extraction gates are
fixed by S11/FR10.2. FR20.1 fixes recovery-barrier participant and global phase
deadlines; NFR9 fixes the seven-day operational-log and 90-day business-audit
retention defaults. Neither establishes an RPO, RTO or backup-expiry period.
OQ5 retains those open decisions and the local disk-capacity question. OQ6's
messaging retries/DLQ/replay and initial U5 queue/process limits are fixed by
S11 and NFR2.1; only telemetry capacity and versioning remain open under OQ6.
These IDs are preserved for downstream traceability.

| ID | Open decision | Needed before / consequence |
| --- | --- | --- |
| OQ1 | Exact local generation model/artifact, runtime placement, context/concurrency limits and embedding winner | SS-36/34; compare candidates with memory/latency/tool-use evidence and reproducible downloads. No additional host budget assumed. |
| OQ2 | Forecast validity/freshness threshold and behavior when no usable forecast exists | SS-13/14/35; require explicit unavailable outcome meanwhile, and define exact acceptance cases before implementation. |
| OQ3 | Buffer-day defaults, seeded currency/time-zone choices and detailed replenishment examples | SS-10/14; derive buffer choices from simulation, preserving confirmed calendar/currency rules. |
| OQ5 | Recovery point objective (RPO), recovery time objective (RTO), backup-expiry period and total persistent-disk capacity for the full local backup/restore profile | Confirm RPO, RTO and backup expiry with the owner before SS-06/26 recovery implementation; SS-06/26/38 must measure the complete local footprint before deployment. Do not infer these values from FR20.1 barrier deadlines or NFR9 log/audit retention. |
| OQ6 | Telemetry metric/trace versions and storage allocation | SS-24/38 resolves remaining telemetry capacity before implementation. |
| OQ7 | Google registration/redirects, session lifetimes, signing-key stores/rotation and recovery integration | SS-08/09/31; exact values/interfaces must be verified, with local demo login independent of Google. |
| OQ8 | Local runner isolation, reviewer-specific state paths/backend credentials and supported software versions | SS-03/05/06/25; implementation prerequisites, with no cloud account required for the default demo. |
| OQ9 | Future supported languages and cross-language evaluation criteria | Later multilingual increment; English is the initial acceptance language. |
| OQ10 | Retention maintenance schedule and tolerable expiry lag for local logs/audits | SS-37/38; enforce accepted 7/90-day defaults with documented cleanup/rebuild/backup behavior. |

## Out of scope

The first release excludes production high availability, an availability SLA,
administrator-proof audit immutability, real supplier transactions/payments,
OCR/scanned-document support, public self-registration, FX conversion, multiple
stores per retailer, expiry/cold-chain planning and autonomous purchasing. A managed
cloud deployment and additional validated languages require later decisions.
Optional external-provider support does not require spending or an active Bedrock
account to complete the default reviewer demo.

## Traceability and completion evidence

FR/NFR identifiers above are permanent. Later User Stories and design stages must
reference these exact identifiers. S8 task references are planning mappings, not
approved units or completed implementation. Tests/story/unit references will be
added by their owning stages; none is fabricated here.

Initial release acceptance requires the complete simulated journey for isolated
retailers, adversarial tenant/agent tests, repeatable baseline/model comparisons,
contract/routine checks, measured performance/resources and clean-environment
setup/recovery evidence. Every OQ must be resolved before its affected task ships.
The owner may review this requirements baseline with those later decisions explicit;
approval does not make their unknown values known.

Revision note: this draft incorporates the owner-confirmed 2026-09-21 lifecycle
reconciliation and the 2026-09-27 shared heavy-work decision. Independent
verification of the current bytes is required before a new gate.


## Lifecycle status reconciliation

The authoritative audit record contains `GATE_APPROVED` and `STAGE_COMPLETED`
receipts for the earlier Requirements Analysis baseline at
2026-09-21T16:36:58Z. The owner accepted then-current findings R-01 through
R-04 as recorded risks. On 2026-09-27, the owner chose a formal redo and the
orchestrator jumped backward to Requirements Analysis, resetting its completion
and downstream stages. Those prior receipts and finding dispositions remain
historical evidence; they do not approve this revised requirements artifact.
The new review and gate must evaluate the current bytes.

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-09-27T08:30:12Z
**Iteration:** 1
**Request Challenge:** review:90139c93066833555111feb7db3feee0

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/inception/requirements-analysis/requirements.md > Assumptions & Open Questions > OQ5 | OQ5 now leaves RPO, RTO, backup expiry and disk capacity open. The preceding resolved-decision text assigns only barrier phase deadlines to FR20.1 and seven-day log/ninety-day audit defaults to NFR9; Q9 and the confirmed barrier summary support that distinction. No unsupported recovery or backup-retention value is stated. | Obtain owner-confirmed RPO, RTO and backup-expiry values before SS-06/26 recovery implementation, as OQ5 requires. | Resolved |
| R-02 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/inception/requirements-analysis/requirements.md > NFR1.2 | The revised criterion defines a versioned workload profile, attempted-operation denominator and classification of expected denials; the original testability gap remains addressed. | Publish the operation mix, volume, tenant distribution and fixture state before SS-10/24 acceptance runs. | Resolved |
| R-03 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/inception/requirements-analysis/requirements.md > FR20.1 | Participant/global abort and resume deadlines, a terminal-phase guard and fenced unresolved-participant outcomes remain specified; the original unbounded-outcome gap remains addressed. | Exercise lost acknowledgements, abort-before-prepare, partial snapshot failure and timeout against these deadlines and terminal outcomes in SS-06/26. | Resolved |
| R-04 | Minor | aidlc/spaces/default/intents/260908-stock-sense-design/inception/requirements-analysis/requirements.md > Assumptions & Open Questions > OQ4-OQ6 | Resolved OQ4 and OQ6 portions remain outside the open-decision table, while OQ5 and the remaining OQ6 decision stay open with stable IDs. | Preserve the resolved/open distinction when the IDs are carried into downstream artifacts. | Resolved |

### Summary

The owner's requested R-01 correction is present and traceable: barrier deadlines and log/audit retention are distinct from the unconfirmed RPO, RTO and backup-expiry decisions. The prior R-02 through R-04 fixes remain intact, and no new approval-relevant contradiction was found; historical Accepted risk dispositions do not approve this revision.