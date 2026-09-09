# StockSense requirements

Date: 2026-09-09
Stage: requirements-analysis
Status: Draft for independent review and owner stage approval.
Input summary: owner confirmed `Looks correct`; receipt recorded by AI-DLC.
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
| FR1 | The system shall authenticate local demo users and support Google OIDC federation through Duende IdentityServer. | Seeded local login works without Google credentials; configured federation works; invalid login, callback/state and expired-session cases cannot grant access. | S2; ADRs 0002, 0005; SS-08/09 |
| FR2 | The backend shall authorize every business request against the user's current retailer membership and role. | Authorized retailer access succeeds; substituted retailer/entity IDs, missing tenant context and revoked memberships are denied, including with a still-valid session. | S1/S2; SS-07/09/11 |
| FR3 | The system shall generate and import reproducible synthetic sales, inventory and supplier data for the agreed demo. | Same seed/configuration reproduces the dataset; all three retailers and declared history are present; invalid and duplicate imports have explicit outcomes without duplicate stock effects. | S1/S2/S4; ADR 0004; SS-10 |
| FR4 | The planner shall inspect inventory and stock-movement history within the selected authorized retailer. | Inventory view exposes current quantities and history with loading/empty/error states; receipts and adjustments reconcile to the ledger; cross-retailer lookup fails. | S4/S5; SS-10/11 |
| FR5 | The system shall produce daily, versioned 28-day demand forecasts and expose run status and freshness. | Results identify model/data/configuration versions; repeated scheduling for a retailer-local date does not create duplicate business effects; failed or stale runs are visible rather than presented as current. | S2/S4; ADRs 0004, 0010; SS-13/20 |
| FR6 | Replenishment calculations shall use inventory position, forecast demand, dated inbound stock, supplier lead time, minimum order quantities, pack sizes and configurable buffer-day safety stock. | Reviewed examples demonstrate shortages and quantities, including zero demand, pack rounding and minimum orders; inventory/term version changes invalidate stale proposals before approval. | S2/S5; ADR 0011; SS-14/15 |
| FR7 | Planners shall compare replenishment scenarios and create draft proposals; the backend shall enforce draft/submit/approve/receive purchasing transitions. | Valid transitions complete; invalid transitions and concurrent approvals fail safely; an authorized manager must approve before simulated fulfillment. | S2/S4/S5; SS-14/15/16 |
| FR8 | Simulated supplier delivery and receipt shall update stock exactly once per accepted receipt operation. | Duplicate message/request and restart/replay scenarios produce one ledger effect; unauthorized, invalid or repeated receipt operations cannot inflate inventory. | S4/S5; SS-12/15/16 |
| FR9 | The system shall provide on-demand inventory review with three accepted requests per retailer per local calendar day, shared by all its users. | First three distinct accepted requests consume slots atomically; a fourth is denied; concurrent requests cannot exceed the quota; scheduled reviews are excluded; local-day/DST boundaries are tested. | S2/S3; ADR 0011; SS-35 |
| FR9.1 | Only one review shall be active per retailer; duplicate requests shall return the existing job. | Concurrent duplicate requests reuse the job and do not spend multiple slots; authority is checked before returning job details. | S2; ADR 0011; SS-35 |
| FR9.2 | Failed accepted reviews shall retain their consumed slot; retry/replay of the same job shall not consume another slot. | Failure followed by retry preserves quota count; requests rejected before acceptance consume nothing. Retries operate on the original accepted job across local-day boundaries. | S3 Q10; SS-35 |
| FR9.3 | Manual review shall use current inventory/terms and a valid forecast, without triggering model retraining. | Job evidence identifies the input versions; no valid forecast produces an explicit unavailable/failure outcome, not invented demand. The precise validity threshold remains OQ2. | S2; ADR 0011; SS-35 |
| FR10 | Supplier ingestion shall accept CSV offers and text-based PDF catalogs/terms, preserve source versions and report extraction/validation errors. | Supported fixtures retain source/page provenance; malformed CSV, scans and partially extractable PDFs produce explicit outcomes; unvalidated terms do not silently become authoritative. | S2; ADRs 0008, 0009; SS-21 |
| FR10.1 | MongoDB shall retain supplier submissions/extraction records; accepted normalized terms shall enter PostgreSQL through authorized routines. | Each accepted term traces to its source version; duplicate jobs are idempotent; access to documents and normalized data is tenant-scoped. | S2; ADR 0008; SS-21 |
| FR11 | The system shall enforce one currency and one time zone per retailer, with UTC timestamps and retailer-local aggregation/scheduling. | Mismatched-currency offers are rejected; no implicit FX conversion occurs; date-boundary and DST fixtures preserve scheduling and quota semantics; lead times use calendar days. | S2; ADR 0010; SS-10/13/14/35 |
| FR12 | The ML workflow shall compare at least one trained candidate with seasonal-naive and moving-average baselines using reproducible temporal backtests. | Splits exclude future data leakage; identical simulated conditions support forecast and inventory comparisons; reports retain unsuccessful candidates and state synthetic-data limits. | S2/S4/S5; ADR 0008; SS-17/18 |
| FR13 | MLflow and job metadata shall connect datasets, code, configuration, model versions, evaluations, promotion and rollback. | A result is traceable to a recorded run; failed jobs recover explicitly; promotion has evaluation evidence; rollback selects a known model and preserves prior provenance. | S2/S4; ADR 0008; SS-19/20 |
| FR14 | The assistant shall explain recommendations with authorized evidence and invoke bounded tools for reads, deterministic calculations and draft proposals. | Responses cite applicable source/data versions; missing evidence is disclosed; injected instructions, tenant switching, fabricated citations and attempts to approve orders are rejected in evaluation. | S2/S4; ADR 0014; SS-22/23 |
| FR15 | Generation shall run locally initially through Python Strands, with an extension boundary for explicitly configured external providers such as Bedrock. | A real CPU inference path works without owner GPU/secrets; provider failures are explicit; no automatic external fallback occurs; optional external configuration preserves StockSense API contracts. | S2; ADRs 0012-0014; SS-36 |
| FR16 | Authorized retrieval shall use standalone Qdrant collections per retailer and embedding-model/configuration version. | Backend routing rejects client-selected arbitrary collections; wrong-model, cross-tenant and deleted-source tests fail safely; reindex/cutover/rollback reconcile source versions and deletions. | S2; ADRs 0007, 0018; SS-33/34 |
| FR16.1 | EmbeddingGemma-300M and Qwen3-Embedding-0.6B shall be compared on held-out English retrieval fixtures before choosing the default. | Report quality, citations, CPU latency, memory and setup reproducibility for both candidates; separate indexes prevent mixed dimensions/configurations; multilingual extension remains possible. | S2; ADR 0015; SS-33/34 |
| FR17 | Business audit entries shall commit atomically with required business changes and outbox records; OpenSearch shall receive an idempotent searchable projection through RabbitMQ. | Audit-write failure rolls back the mutation; index outage leaves authoritative records intact; retries do not duplicate indexed events; lag and replay are observable; retained records can rebuild the index. | S2; ADR 0019; SS-37/38 |
| FR17.1 | Audit history shall cover inventory/purchasing changes, memberships, manual reviews, model promotion, privileged operations and agent tool actions, with actor, tenant, target, outcome and provenance. | Each demonstrated sensitive flow yields the expected event; rejected attempts use a path that survives business rollback; tenant audit queries cannot disclose another retailer's history. | S2; ADR 0019; SS-37/38 |
| FR18 | Operational logs and searchable audits shall be available through OpenSearch/Dashboards, with operator-only dashboards initially and tenant-authorized business audit APIs. | Correlation connects API, job/message and agent operations; ordinary users cannot access operator-wide searches; required audit recording remains independent of optional telemetry delivery. | S2; ADR 0019; SS-24/38 |
| FR19 | Redis shall provide disposable tenant-scoped application caching without becoming authoritative for permissions, orders or review quotas. | Cache outage, cold start and stale-fill/invalidation scenarios preserve business correctness; cache keys and access cannot mix retailers. | S2; ADR 0007; SS-32 |
| FR20 | Operators shall demonstrate backup/restore, message replay, application/model rollback and migration of one tenant from shared to dedicated storage. | Restore into a clean environment, reconcile record counts/stock/provenance, rebuild audit/vector projections, switch tenant placement, and reject stale jobs/routing after cutover. Document movement of documents and artifacts. | S1/S2/S4/S5; SS-26/27 |

## Non-functional requirements

| ID | Requirement and acceptance criterion | Source / planned tasks |
| --- | --- | --- |
| NFR1 | Ordinary inventory/purchasing reads shall achieve p95 below 1 second with five concurrent local users, the agreed seeded dataset and a warmed running stack. Include normal authentication/authorization. Publish the read mix, sample count, duration, hardware and measured result; LLM generation, downloads and startup are measured separately. Benchmark parameters are fixed before running the acceptance test. | S3 Q8; SS-24 |
| NFR2 | The full demonstrated cluster workload, including OpenSearch/Dashboards, Vault/VSO, Redis, Qdrant, agent services and one active ML job, shall fit the 16 GB RAM / 3 CPU planning envelope. Measure sustained/peak usage and Kubernetes/VM overhead; an unmeasured table is insufficient. Extra host RAM/CPU is not pre-authorized. | S1/S2; SS-24/36 |
| NFR3 | Tenant isolation shall hold across HTTP, messaging, SQL routines/RLS, document/vector storage, caches, artifact access and audit searches. Negative tests shall cover missing context, identifier substitution, pooled-connection reuse and stale placement generations. | S1/S2/S5; SS-07/12/27/32/34/38 |
| NFR4 | PostgreSQL application roles shall use parameterized stored procedures/functions exclusively, without direct table reads/writes or EF Core. Runtime roles shall not bypass tenant controls or update/delete audit history; migrations and controlled retention use separate privileges. | S2; SS-07/08/37 |
| NFR5 | Browser identity shall use a BFF with authorization code/PKCE, secure HttpOnly cookies, server-side tokens and CSRF protection. Machine callers shall have narrow scopes/audiences and validated job authority. Test invalid callbacks, session expiry, revocation and unauthorized machine calls. | S2/S5; ADR 0002; SS-08/09/12 |
| NFR6 | Vault shall run persistently inside Kubernetes, with workload-scoped access and VSO synchronization to Kubernetes Secrets. No secrets shall enter Git or Terraform state. Consumers shall have tested credential reload/rotation behavior; backup/unseal/key recovery material shall be protected outside the cluster. | S2; ADRs 0006, 0017; SS-29/30/31 |
| NFR7 | Async integration shall use durable RabbitMQ messaging with transactional outbox/inbox, idempotent consumers, publication confirms, acknowledgement after business commit, bounded retries and dead-letter replay. Demonstrate broker/worker failure without duplicate stock effects; do not claim exactly-once transport. | S2/S5; SS-12/26 |
| NFR8 | Every REST integration, including internal APIs, shall have versioned OpenAPI contracts; every async integration shall have AsyncAPI contracts. CI shall validate examples and compatibility; invalid contracts shall block the applicable change. | S2; SS-04/05 |
| NFR9 | Operational logs default to 7 days and business audit to 90 days, configurable per deployment. Audit expiry shall apply consistently to PostgreSQL and OpenSearch through controlled maintenance. Expired data shall not reappear through rebuild/rollback; backup expiry is explicitly specified before recovery implementation. | S3 Q9; SS-37/38/26 |
| NFR10 | Logs shall exclude credentials, tokens, raw supplier documents, full prompts and hidden reasoning by default. Structured fields shall support correlation without unbounded metric cardinality. Telemetry buffering shall be bounded with observable loss; operational log outage shall not block business work. | S2; ADR 0019; SS-24/38 |
| NFR11 | A reviewer shall reproduce setup and the complete demo from a clean checkout without owner credentials, cached models or the owner's GPU. Pin versions/checksums, document model terms/download steps and verify real CPU inference; fixtures alone do not satisfy this requirement. | S2; ADR 0013; SS-28/36 |
| NFR12 | Infrastructure delivery shall be reproducible through Terraform/Terragrunt and Helm, with local state as a default and an explicitly configurable reviewer backend. Protect state outside ephemeral workspaces, serialize applies and demonstrate backup/migration; do not provision a cloud backend implicitly. | S2; ADR 0016; SS-06/25 |
| NFR13 | CI shall run applicable build/test, contract, migration and security checks. Deploy only trusted revisions through an isolated local runner; never execute public PR code on that runner. Flyway migration failure blocks rollout; rollback uses compatible schema and immutable application versions. | S2/S7; ADR 0003; SS-05/25 |
| NFR14 | Core browser flows shall expose loading, empty, failure and stale-data states and support keyboard operation. First-release documents/queries are English; preserve original text and extensibility for multilingual retrieval. No additional language or accessibility certification is claimed. | S2/S5; ADR 0015; SS-11/16/23 |
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

## Assumptions & Open Questions

Assumptions below are disclosed implementation premises, not owner-selected
numerical requirements. None permits weakening the confirmed scope.

| ID | Assumption / risk | Validation and owner |
| --- | --- | --- |
| A1 | A solo developer can deliver the staged portfolio; no delivery deadline is set. | Owner/delivery planning confirms availability and any interview deadline before calendar commitments. |
| A2 | A complete local stack and usable CPU model can fit the budget; this is not yet demonstrated. | Implementer measures SS-24/36. If infeasible, present measured alternatives to the owner; do not silently omit services or increase resources. |
| A3 | Synthetic fixtures adequately demonstrate correctness and comparison methodology. | Product/ML evaluation reports limitations; actual commercial savings require separate real-world validation. |
| A4 | Normal local sessions and installations have sufficient persistent disk. | Reviewer/implementer verifies disk requirements before model/data downloads and SS-06 deployment. |

| ID | Open decision | Needed before / consequence |
| --- | --- | --- |
| OQ1 | Exact local generation model/artifact, runtime placement, context/concurrency limits and embedding winner | SS-36/34; compare candidates with memory/latency/tool-use evidence and reproducible downloads. No additional host budget assumed. |
| OQ2 | Forecast validity/freshness threshold and behavior when no usable forecast exists | SS-13/14/35; require explicit unavailable outcome meanwhile, and define exact acceptance cases before implementation. |
| OQ3 | Buffer-day defaults, seeded currency/time-zone choices and detailed replenishment examples | SS-10/14; derive buffer choices from simulation, preserving confirmed calendar/currency rules. |
| OQ4 | Upload size/page/row limits, CSV schema and extraction quality limits | SS-21; bounded processing and explicit partial/unsupported outcomes required before ingestion ships. |
| OQ5 | Recovery time/data-loss objectives, backup frequency/expiry and persistent disk limits | SS-06/26/38; 90-day live audit retention does not establish backup retention or recovery guarantees. |
| OQ6 | Metrics/trace storage, ingestion component versions, log disk limits, queue/backlog caps and lag alert thresholds | SS-24/38; OpenSearch selection alone does not select all telemetry components. |
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

## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-09-09T04:56:59Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/inception/requirements-analysis/requirements.md > FR7 and FR8 | "Valid transitions" and "invalid" receipts have no defined state/quantity rules. The draft design proposes rejection, cancellation, partial receipt and immutable approved lines, but these are neither selected nor explicitly deferred here. Distinct receipt IDs could over-receive an order while satisfying the stated per-operation idempotency check. | Define the initial permitted transitions and actors, treatment of approved-line edits, and receipt quantity limits. Explicitly include or defer rejection, cancellation and partial receipt; add acceptance examples for invalid transitions and cumulative over-receipt. Do not silently adopt the draft design's proposals. | New |
| R-02 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/inception/requirements-analysis/requirements.md > FR3, FR12 and Intent analysis | The intent promises measurement of lost demand, but FR3/FR12 omit ADR 0004's explicit requirement to preserve observed sales separately from lost demand. They also leave the forecast-error and inventory-value measures undefined. A reproducible comparison using stockout-censored sales alone could satisfy the rows while misrepresenting the stated business outcome. | Carry the separate sales/lost-demand requirement into acceptance evidence with a stockout fixture. Define the reported error and inventory measures, aggregation and zero-demand handling, or register their selection as a decision required before evaluation implementation. No improvement percentage needs to be promised. | New |
| R-03 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/inception/requirements-analysis/requirements.md > FR6 and FR9-FR9.3 | ADR 0011 requires daily inventory review, retailer buffer defaults with product overrides, and a UI showing last successful review, input versions, active job, remaining allowance and reset time. FR6/FR9 specify calculations and quota enforcement but omit these observable capabilities; daily forecasts in FR5 do not require daily replenishment review. Backend-only manual review could pass these rows. | Add traceable acceptance evidence for scheduled daily replenishment, retailer/product buffer precedence, and the named planner-visible review status and quota fields. Preserve Q10's confirmed failed-job charging policy. | New |
| R-04 | Minor | aidlc/spaces/default/intents/260908-stock-sense-design/inception/requirements-analysis/requirements.md > FR1 and NFR5 | The authentication acceptance list omits ADR 0005's explicit prohibition on automatic account linking by matching email and its logout/account-linking tests. The cited ADR supplies a workaround, but downstream tests derived only from these rows can miss this identity boundary. | Explicitly carry ADR 0005's no-email-auto-link rule and logout/account-linking acceptance into the downstream identity criteria, or make the ADR acceptance section an explicit required part of FR1 verification. | New |

### Summary

The baseline clearly bounds the local portfolio release and distinguishes confirmed choices from open decisions. Three Major findings leave purchasing behavior, outcome evaluation and confirmed replenishment capabilities insufficiently testable; this single advisory pass returns those findings for owner triage without changing scope or initiating a repair loop.
