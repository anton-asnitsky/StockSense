# StockSense execution plan

Date: 2026-09-08. Planning baseline: system design v0.6 and owner decisions.
Status: proposed backlog; no implementation or lifecycle gate completion implied.
All tasks below are **planned**, not started. Task IDs are local identifiers,
not GitHub issue numbers. Dependencies name prerequisite tasks.

Confirmed demo baseline (ADR 0004): three retailers, one store and 100 products
each; 18 months of reproducible daily history; 28-day forecasts refreshed daily;
seasonality, promotions and intermittent demand.

## Delivery approach

Deliver a secure inventory screen first, then a complete simulated purchasing
workflow, then trained models and an assistant. Add infrastructure when its slice
needs it. Keep one implementation task in progress for the solo developer;
independent documentation or contract review can proceed alongside it.

Each task is a reviewable outcome, normally one PR. Split larger tasks into PRs
before implementation, retaining their parent acceptance criteria. Do not assign
calendar dates until the first slice provides evidence of delivery speed.

Confirmed constraints: Duende IdentityServer; React/.NET; Dapper with PostgreSQL
stored procedures/functions exclusively and Flyway migrations; RabbitMQ; OpenAPI
and AsyncAPI; Terraform/Terragrunt; shared databases with strict tenant isolation
and a path to dedicated tenant databases; Docker Desktop Kubernetes, 16 GB RAM
and a 3-CPU planning envelope. MongoDB for supplier documents, Python for
forecasting/training/evaluation and MLflow for experiment/model management are
confirmed (ADR 0008). Detailed domain policies remain to be resolved in SS-02.

## Milestone 0 — Reviewable project foundation

| ID | Task and output | Depends on | Done when |
| --- | --- | --- | --- |
| SS-01 | Publish the existing setup/design and Git policy in focused PRs | — | Intended GitHub account has repository access; existing uncommitted files are reviewed for secrets/generated content and split by purpose; main protection, squash settings and available checks are verified; merges have actual owner approval |
| SS-02 | Reconcile AI-DLC requirements, stories, glossary, threat model and ADRs | — | Owner decisions and proposals are distinguished; inventory/purchasing journeys have acceptance criteria; tenant and identity trust boundaries are explicit; stale project guidance is corrected; actual review outcomes are recorded |
| SS-03 | Establish application skeleton and local validation commands | SS-02 | React, .NET API/worker/identity and Python project boundaries exist; supported versions and dependencies are pinned; clean checkout builds; health endpoints and smoke checks run; no EF dependency is introduced |
| SS-04 | Define initial OpenAPI/AsyncAPI contracts and validation | SS-02 | Inventory/import and job/message contracts include errors, authentication, tenant context and versioning; invalid examples fail validation; compatibility checks can run locally and later in CI |
| SS-05 | Implement CI baseline and repository checks | SS-01, SS-03, SS-04 | GitHub Actions executes applicable builds/tests, contract validation, secret/dependency scanning and migration checks; actual check names are required on main; failures block merge |

Exit evidence: reviewed baseline, reproducible skeleton and executable checks.
SS-02–04 can progress locally while GitHub authentication blocks SS-01/05.

## Secrets foundation — required before application credentials

These tasks extend the backlog without renumbering existing task IDs. Their
position in the dependency graph, rather than numeric ID, determines execution.
Vault is confirmed in ADR 0006. Redis and standalone vector storage are confirmed
in ADR 0007; Qdrant is the selected vector database.

| ID | Task and output | Depends on | Done when |
| --- | --- | --- | --- |
| SS-29 | Deploy persistent Vault with IaC | SS-06 | Pinned Helm chart and Terraform/Terragrunt deploy TLS-enabled Vault with persistent integrated storage; no dev mode; deployment/configuration states are separate; full resource budget is recalculated including injection components |
| SS-30 | Bootstrap Vault and integrate workloads | SS-29 | Initialization/unseal material is protected outside cluster/Git; root token is retired after scoped admin setup; Kubernetes auth binds policies to workload identities; chosen injection mechanism delivers credentials without Terraform-state exposure; unauthorized workloads are denied |
| SS-31 | Verify secrets rotation and disaster recovery | SS-30, SS-09, SS-12 | Consumers handle rotation and reload/renewal; sealed Vault and expired credentials fail safely; protected snapshot restoration and key recovery work in a clean environment; measured recovery procedure is documented |

SS-06 provisions infrastructure using a protected bootstrap credential procedure;
SS-30 then provisions workload secret access before SS-07/08 configure application
stores. Do not make Vault initialization depend on application database availability.

## Milestone 1 — Authenticated tenant inventory

| ID | Task and output | Depends on | Done when |
| --- | --- | --- | --- |
| SS-06 | Package minimal local Kubernetes infrastructure | SS-03 | Terraform/Terragrunt deploy PostgreSQL, API and identity prerequisites through Helm; local HTTPS, secrets, PVCs and probes work; state is untracked; node CPU/disk capacity and initial resources are measured |
| SS-07 | Establish business database and tenant access foundation | SS-02, SS-06, SS-30 | Flyway creates membership/placement and initial inventory schemas; application roles can execute approved routines but cannot query/write tables directly; Dapper adapters use parameterized routine calls; RLS and pooled-connection tests reject missing/cross-tenant context |
| SS-08 | Build Duende persistence and key lifecycle | SS-03, SS-06, SS-30 | Separate identity DB and Flyway chain exist; required configuration/grant/session stores use Dapper routines; identity roles cannot access business data; protected signing/data-protection keys survive restart; rotation and restore are verified |
| SS-09 | Implement login, federation and BFF sessions | SS-07, SS-08 | Google federation and seeded local demo accounts work with local-only access; code/PKCE flow, secure cookies, CSRF, exact redirects, logout and server-side tokens are verified; membership revocation denies access despite an existing session; account-linking abuse and refresh replay are covered |
| SS-10 | Create deterministic retail simulation and imports | SS-04, SS-07 | Seed/configuration reproduce sales, inventory and supplier terms; imports enforce retailer currency and local-day boundaries (ADR 0010); lost demand is separate from observed sales; invalid/duplicate imports are handled deterministically; inventory ledger conserves quantities and isolates tenants |
| SS-11 | Deliver React inventory workflow | SS-09, SS-10 | User signs in, chooses an authorized retailer, imports data and views inventory with loading/error/empty states; another retailer's identifiers cannot expose or mutate data; keyboard navigation and core browser flow pass |

Exit demo: sign in, import seeded data and inspect inventory for isolated retailers.
SS-08/09 should be split into storage, key management and browser integration PRs
if necessary; do not defer identity correctness until release.

## Milestone 2 — Complete simulated purchasing journey

| ID | Task and output | Depends on | Done when |
| --- | --- | --- | --- |
| SS-12 | Deliver RabbitMQ transport, outbox and inbox | SS-04, SS-06, SS-07 | Versioned AsyncAPI messages use durable queues, persistent publication and confirms; outbox publication, inbox deduplication, bounded retries and DLQ replay survive process/broker failures; acknowledgement follows business commit; tenant/job authority is verified |
| SS-13 | Implement baseline demand forecast | SS-10, SS-12 | Seasonal-naive and moving-average runs are reproducible, tenant-scoped and versioned; daily scheduling uses retailer-local dates with DST/idempotency coverage; temporal evaluation excludes future data; async status/results are visible; all persisted data uses approved routines or scoped APIs |
| SS-14 | Implement deterministic replenishment and scenarios | SS-13 | Daily review, calendar-day lead times, dated inbound stock, configurable buffer-day safety stock with retailer defaults/product overrides, minimum orders and pack rounding have reviewed examples; buffer defaults follow simulation (ADR 0011); stale input versions are detected; shortages and suggested quantities can be explained |
| SS-15 | Implement purchasing state machine and approvals | SS-07, SS-12, SS-14 | Draft/submit/approve/receive operate through transactional routines; role checks and version checks are server-side; concurrent approvals and duplicate receipts yield one valid business effect; supplier delivery remains simulated |
| SS-16 | Deliver purchasing UI and end-to-end demo | SS-11, SS-15, SS-35 | Planner reviews shortage/scenario and drafts order; authorized manager approves; simulated receipt updates stock; stale/rejected actions have clear UI; the entire journey passes automated smoke verification |

Exit demo: import → baseline forecast → shortage → draft → approve → receive.
This is the first complete product milestone and precedes agent implementation.

## Milestone 3 — ML/MLOps evidence

| ID | Task and output | Depends on | Done when |
| --- | --- | --- | --- |
| SS-17 | Implement versioned datasets and scoped artifact access | SS-12, SS-13 | Immutable dataset/split metadata and artifact checksums are recorded; Python accesses business data via scoped APIs, not table SQL; local PVC artifacts have tenant-authorized access and a documented object-storage adapter boundary |
| SS-18 | Train and evaluate one candidate model | SS-17 | Temporal backtests compare candidate with both baselines on identical scenarios; reproducible runs report forecast error and inventory/lost-demand tradeoffs; poor results are retained rather than claimed as improvements |
| SS-19 | Deploy MLflow and Kubernetes training/forecast jobs | SS-06, SS-18 | Runs/models link to data/code/config; MLflow has isolated metadata and operator access; one active ML job respects the cluster budget; promotion is evidence-based; model rollback and failed-job recovery preserve result provenance |
| SS-20 | Add forecast quality and freshness monitoring | SS-19 | UI/telemetry expose active model, forecast age, failures and evaluated quality; stale forecasts have explicit behavior; simulated drift is detected using a documented baseline and threshold |

Exit evidence: baseline comparison, model/data cards, tracked run and rollback demo.

## Milestone 4 — Supplier documents and constrained assistant

| ID | Task and output | Depends on | Done when |
| --- | --- | --- | --- |
| SS-21 | Add supplier document ingestion and MongoDB | SS-06, SS-12, SS-16 | CSV offers and text-based PDF catalogs/terms are validated and versioned (ADR 0009); scans/OCR are deferred; MongoDB queries are tenant-scoped; extracted offers retain source provenance; accepted normalized terms enter PostgreSQL through routines; duplicate/invalid uploads are covered |
| SS-22 | Implement Python Strands service and domain tools | SS-16, SS-21, SS-36 | Strands service exposes StockSense OpenAPI contracts and authenticated domain-tool calls; tools expose authorized reads, calculations and draft proposals; LLM cannot set tenant context or approve orders; tool schemas/contracts, time/call/cost limits and failure behavior are explicit; secrets remain server-side |
| SS-23 | Deliver assistant UI and adversarial evaluations | SS-20, SS-22, SS-34 | Answers cite relevant source/data versions; missing evidence and provider failures are handled; evaluations cover prompt injection, cross-tenant access, fabricated evidence and approval escalation; final approval remains the authenticated manager's action |

Exit demo: source-backed supplier comparison and draft proposal with a recorded
evaluation report. SS-21/22 can proceed alongside ML work after purchasing works.

## Milestone 5 — Operational proof and portfolio release

| ID | Task and output | Depends on | Done when |
| --- | --- | --- | --- |
| SS-24 | Complete telemetry and resource verification | SS-19, SS-23, SS-30, SS-32, SS-33 | Correlated traces/logs and bounded-cardinality metrics cover API, RabbitMQ, jobs and agent; full demo plus one ML job is measured within 16 GB/3 CPU; overhead and bottlenecks are documented |
| SS-25 | Implement delivery and schema rollout pipeline | SS-05, SS-16 | GitHub Actions publishes immutable images; a dedicated self-hosted runner deploys only trusted revisions to Docker Desktop; Terraform/Terragrunt delivery uses durable access-restricted local state outside job workspaces, shared by manual/runner operations on the same host, with serialized applies and local locking (ADR 0016); Flyway jobs validate/migrate before rollout; failed migration blocks release; application rollback is tested against compatible schema |
| SS-26 | Prove backup, restore and failure recovery | SS-19, SS-21, SS-25, SS-31 | Restore PostgreSQL, identity/key material, MongoDB and artifacts into a clean environment; broker/worker failure and replay do not duplicate stock effects; measured recovery steps/times and limitations are recorded |
| SS-27 | Exercise shared-to-dedicated tenant migration | SS-07, SS-12, SS-26 | Pause/drain one tenant, copy and validate data, switch placement generation, invalidate routing caches and reopen; stale jobs fail safely; isolation and reconciliation after post-cutover writes are verified; document document/artifact movement |
| SS-28 | Package reproducible portfolio release | SS-23, SS-24, SS-26, SS-27 | Clean-environment reviewer setup/demo succeeds without owner secrets, cached models or AMD GPU; scripted prerequisites/downloads/bootstrap, local login and real CPU inference are verified (ADR 0013); diagrams, ADRs, acceptance evidence, data/model cards and five-minute walkthrough exist; release notes state synthetic-data limitations; owner approves release PR before versioned tag/image publication |

Telemetry and backup design begin with each service; SS-24/26 integrate and prove
them rather than introducing them for the first time. A managed-cloud deployment
is a later backlog item until provider and budget are selected; initial release
demonstrates cloud-native behavior on the agreed Kubernetes environment.

Vault deployment/integration is part of the foundation, not deferred to release.

## Cache and RAG additions

These tasks extend existing IDs. Redis and Qdrant are selected. Both services
count toward the local resource cap.

| ID | Task and output | Depends on | Done when |
| --- | --- | --- | --- |
| SS-32 | Deploy Redis and implement application caching | SS-11, SS-30 | IaC, Vault credentials, ACLs and bounded memory/TTL work; tenant-scoped versioned keys, invalidation and stale-fill handling pass tests; outage/cold-start fallback preserves correctness; purchasing and authorization remain authoritative |
| SS-33 | Deploy Qdrant and vector ingestion | SS-21, SS-30 | Persistent Qdrant instance deployed with separate versioned indexes for EmbeddingGemma-300M and Qwen3-Embedding-0.6B evaluation (ADR 0015); IaC/PVC/credentials and isolation strategy verified; RabbitMQ drives versioned chunk/embedding upserts and deletion; job control uses SQL routines; retries/reindexing reconcile to authoritative source versions |
| SS-34 | Integrate and evaluate authorized RAG | SS-22, SS-33 | Retrieval adapter enforces tenant/document authorization; both approved embedding candidates are compared on held-out English queries/documents for retrieval quality, citations, CPU latency and memory; language-aware fixtures support future multilingual/cross-language evaluation; prompt injection, cross-tenant, stale/deleted-source cases pass; embedding model and cost limits are explicit; vector restore/rebuild is demonstrated |

## On-demand inventory review

| ID | Task and output | Depends on | Done when |
| --- | --- | --- | --- |
| SS-35 | Add quota-limited manual inventory review | SS-11, SS-12, SS-14 | Three manual reviews per retailer per local calendar day, shared across users and excluding scheduled reviews, are enforced atomically with job/outbox creation using SQL routines; OpenAPI/AsyncAPI describe request/status/job; worker uses latest inventory/terms and valid forecast without retraining; UI shows progress, freshness and allowance; concurrent users, retries, exhaustion, local-day reset and isolation pass tests |

## Local LLM and external integration boundary

Strands Agents in Python is selected (ADR 0014). Keep StockSense API contracts
independent of framework types; use Strands provider abstractions internally.

| ID | Task and output | Depends on | Done when |
| --- | --- | --- | --- |
| SS-36 | Integrate Strands model providers and local inference | SS-03, SS-30 | Portable CPU and optional accelerated profiles are validated; hardware/placement and model are selected from measured latency, memory and tool-use quality; Strands local provider satisfies capability-aware contract tests (ADR 0014); external adapter extension point and configuration/fixtures cover Bedrock integration without assuming API compatibility; cancellation, errors and no automatic remote fallback are verified |

Local inference is required for the initial release (ADR 0012). Its resource
allocation must be explicitly resolved before model deployment; do not increase
the Kubernetes budget or assume host resources without agreement. Embeddings
remain a separate choice. No external API provisioning is implied.

## Decisions needed at the point of use

| Decision | Needed before | Planning treatment |
| --- | --- | --- |
| GitHub access and deployment runner isolation | SS-05/25 | GitHub Actions and dedicated self-hosted deployment runner are confirmed (ADR 0003); use hosted PR CI and prevent public PR code reaching the deployment runner |
| Embedding default | SS-33/34 | English is the initial supported language; compare EmbeddingGemma-300M and Qwen3-Embedding-0.6B on English retrieval; keep multilingual extensibility and defer additional language acceptance (ADR 0015) |
| Qdrant tenant isolation layout | SS-33 | Verify collection strategy and authorized retrieval; keep model/configuration indexes separate |
| Buffer-day defaults | SS-14 | Compare defaults in simulation; daily review, buffer-day policy, manager approval and three manual reviews per retailer/local day are confirmed in ADR 0011 |
| Google client registration and local redirect setup | SS-09 | Google federation, seeded local accounts and local-only access are confirmed (ADR 0005); configure credentials outside Git and verify both login paths |
| PostgreSQL/MongoDB/Python/MLflow implementation versions | SS-03/06/19/21 | Pin supported versions after compatibility review |
| CSV schema and document processing limits | SS-21 | CSV and text-based PDF are confirmed (ADR 0009); define schema, limits and explicit unsupported-scan handling |
| Local inference hardware/runtime/model and placement | SS-36 | Local generation selected; RX 6700 XT with 12 GB VRAM confirmed by owner; runtime support, host versus Kubernetes placement and host RAM/CPU allocation remain open; benchmark before selecting model |
| External adapter activation and spend cap | Optional external integration | Prepare for APIs such as Bedrock; require explicit configuration/credentials and budget before external calls |
| Vault secret injection mechanism and key integration | SS-30 | Select workload delivery/rotation behavior and account for all supporting resources |
| Local state paths, backups and deployment credentials | SS-06/25 | Local state is confirmed for initial automation (ADR 0016); define durable host paths, restricted access and recovery; serialize applies |
| Cloud provider, hosted deployment budget and deadline | Later cloud increment | Not a prerequisite for the local release |

## Definition of done and Git execution

Before coding, link the task to a story/ADR and affected OpenAPI, AsyncAPI or
database routine contracts. Record actual AI-DLC review outcomes; keep proposals
distinct from owner decisions. At completion, attach relevant test/demo evidence,
update operational instructions and note residual risks. A task is not complete
merely because its code builds.

Use branches such as `feat/ss-07-tenant-storage` and Conventional Commits. Review
only task-related staged changes; preserve existing uncommitted work. Agents may
commit and push; every merge needs explicit owner approval. Do not rewrite
published history without approval. Never force-push main.

The existing Git-policy branch is separate from this planning branch. Restore
GitHub access before publishing PRs. Do not bundle the existing design/framework
files into this plan's commit merely because they are currently untracked.

References: [design](design.md), [brief](product-brief.md),
[Duende decision](decisions/0002-identity-provider.md),
[framework decision](decisions/0001-ai-dlc-framework.md).
