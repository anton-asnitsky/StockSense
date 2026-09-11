# StockSense: project brief

Status: planning baseline captured from the owner's conversation, 2026-09-08.
The owner selected StockSense and requested business intent, architecture, and
an execution plan. Detailed implementation choices below are proposals, not
recorded approvals.

Confirmed by the owner during design discovery: non-perishable specialty retail
(such as household goods), multiple retailers with isolated data from the first
release, and a cloud-native design initially deployed to Kubernetes. These
decisions supersede the earlier single-retailer and Azure deployment proposals.

Further confirmed during discovery:
- Initial cluster: Docker Desktop Kubernetes, with 16 GB RAM allocated.
- CPU budget clarified as up to 25% of a 12-core machine: plan for 3 CPU units.
- Initially use shared databases with strictly enforced tenant boundaries and a
  migration path to separate tenant databases. Do not assume physical sharding.
- Start with reproducible synthetic sales, inventory, and supplier data.
- Use Terraform and Terragrunt for infrastructure delivery from the initial local
  deployment. GitHub Actions is selected, with a dedicated self-hosted deployment runner.
- Use Flyway for PostgreSQL migrations and Dapper/Npgsql for .NET access. Do not
  use EF Core. Application PostgreSQL access is exclusively through stored
  procedures/functions; direct table queries and writes are prohibited.
- Use RabbitMQ for asynchronous flows. All async integration contracts use AsyncAPI;
  all REST contracts, including internal APIs, use OpenAPI.
- Identity must use a dedicated standards-based solution with native OIDC/OAuth
  and straightforward federation. Duende IdentityServer is selected (ADR 0002),
  with a dedicated .NET service, custom Dapper/routine stores and Flyway-managed
  identity database.
- Google is the first external OIDC provider; seeded local demo accounts and
  local-only initial access are confirmed (ADR 0005).

- HashiCorp Vault runs inside Kubernetes, managed through Terraform/Terragrunt
  and Helm, with separate secure bootstrap and secret-loading procedures (ADR 0006).

- Redis is selected for caching; RAG requires a standalone vector database.
  Qdrant is selected as that vector database (ADR 0007).

- MongoDB for supplier documents/extraction records, Python for forecasting and
  training/evaluation, and MLflow for experiment/model management are confirmed
  (ADR 0008).

- Initial supplier formats are CSV offers and text-based PDF catalogs/terms;
  scanned PDFs and OCR are deferred (ADR 0009).

- One configurable currency/time zone per retailer; supplier prices use that
  currency without conversion. Store UTC timestamps, aggregate/schedule by local
  date, and use calendar-day supplier lead times (ADR 0010).

- Daily replenishment review uses supplier constraints and configurable buffer-day
  safety stock; manager approval is mandatory. Add limited on-demand reviews;
  quota is three per retailer/local day, shared across users; scheduled daily
  reviews are excluded (ADR 0011).

- Use a local LLM initially with a provider interface allowing future external
  APIs such as Bedrock. Runtime/model/placement and embeddings remain open;
  external calls require explicit configuration (ADR 0012).

- Reviewers must be able to run the project locally from a clean checkout without
  owner credentials or a specific GPU; validate scripted setup and CPU inference
  alongside optional acceleration (ADR 0013).

- Strands Agents in Python is the selected agent framework, with local llama.cpp
  and optional Bedrock providers behind StockSense API contracts (ADR 0014).
  Domain tools and purchase approval remain authorized by the .NET backend.

- EmbeddingGemma-300M and Qwen3-Embedding-0.6B are approved for comparative
  local embedding evaluation. Multilingual documents/queries are required; the
  default model remains open. English is the initial supported language, with
  additional language validation deferred (ADR 0015).

- Terraform state defaults to local, including initial single-host automation.
  The executing reviewer chooses local or their configured remote backend;
  protect state, serialize applies and document migration/backup (ADR 0016).

- Vault Secrets Operator synchronizes application secrets into Kubernetes Secrets;
  Vault remains authoritative and each consumer has explicit rotation handling
  (ADR 0017).

- Qdrant collections are separate per retailer and embedding-model version, with
  server-owned routing and backend authorization (ADR 0018).

- OpenSearch and OpenSearch Dashboards provide log/audit investigations; PostgreSQL
  retains transactional business-audit records, projected through outbox/RabbitMQ
  to OpenSearch. Validate tenant access, replay and full-stack sizing (ADR 0019).

## Business intent

Help a small retailer decide what to reorder, when, and why using demand
forecasts, inventory position, supplier constraints, and an AI planning assistant.
Reduce avoidable stockouts without disproportionate increases in inventory.

The planner reviews shortages and creates purchase proposals. The manager
approves purchasing decisions. V1 simulates supplier ordering and delivery.

## Core journey

Import sales and inventory -> forecast demand -> identify shortages -> compare
replenishment scenarios -> draft an order -> manager approval -> simulated
delivery -> inventory update and evaluation.

## Working scope

- Multiple retailers with isolated data from the first release, serving
  non-perishable specialty retail. Initial isolation uses shared databases with
  strict tenant boundaries and a path to separate databases per tenant.
- Confirmed demo: three retailers, one store and 100 products each; 18 months of
  reproducible daily history, daily refreshed 28-day forecasts, and seasonality,
  promotions and intermittent demand (ADR 0004). One developer remains assumed.
- Sales/inventory imports, supplier offers, batch forecasts, stockout worklist,
  scenario comparisons, purchasing approvals, receipts, and audit history.
- Defer payments, real supplier orders, multiple stores, perishables, autonomous
  purchasing, and price optimization.
- Portfolio must show React, .NET, SQL, NoSQL, ML/MLOps, agent tools, CI/CD,
  infrastructure as code, observability, and recovery.

## Architecture proposal

- React and TypeScript frontend using Ant Design components and Vite for development
  and production builds (owner decision, 2026-09-09); ASP.NET Core modular backend with Dapper/Npgsql
  calling stored procedures/functions, with Flyway-managed database migrations.
- PostgreSQL owns inventory, purchasing, normalized supplier terms and forecasts.
- MongoDB holds heterogeneous supplier submissions, extraction and validation
  records. Accepted terms link back from PostgreSQL to source versions.
- A separate Python worker performs reproducible training and batch forecasting;
  MLflow tracks experiments and model versions; object storage holds artifacts.
- RabbitMQ carries async commands/events with idempotent consumers, bounded retries
  and dead-letter handling. PostgreSQL outbox/inbox records connect messaging to
  business transactions; all database access remains through stored routines.
- Version and validate AsyncAPI message contracts and OpenAPI REST contracts in CI.
- The agent calls typed domain tools. Quantity calculations are deterministic;
  authenticated approval and revalidation are enforced by the backend.
- Initial deployment: Docker Desktop Kubernetes, with cloud-native design and
  16 GB RAM and a 3-CPU planning budget. Existing services need validation. The earlier Azure
  Container Apps/Jobs proposal is superseded; managed cloud services are not a
  prerequisite for the first deployment.
- Terraform modules and Terragrunt environment configuration support reproducible
  Kubernetes deployments. Helm packages application resources; GitHub Actions runs
  CI/CD with a dedicated self-hosted runner for local cluster deployment (ADR 0003).

## Evaluation and correctness

- Compare forecast candidates with seasonal-naive and moving-average baselines
  using time-based backtests. Do not leak future information into features.
- Measure lost demand and average inventory value under identical simulated
  conditions. Establish numeric targets after measuring the baseline.
- Track unfulfilled demand separately from sales in simulation; stockouts can
  censor observed demand in real data.
- Tie each recommendation to forecast, data, inventory and supplier versions.
- Cover duplicate imports/messages, concurrent approvals, stale inputs, pack
  sizes, minimum orders, inventory conservation and order transitions.
- Evaluate agent tool correctness, evidence support and handling of missing data.
- Demonstrate failed-job recovery, application rollback and model rollback.

## Delivery sequence

1. Inception: intent, stories, acceptance criteria, domain glossary and ADRs.
2. Foundation/data: local setup, CI, simulation, imports and inventory UI.
3. Vertical slice: baseline forecasts, replenishment, draft/approve/receive.
4. ML/MLOps: candidate evaluation, model management and batch pipeline.
5. Supplier documents/agent: ingestion, tools, explanations and evaluations.
6. Cloud/resilience: deployment, identity, telemetry and recovery exercises.
7. Portfolio release: reproducible demo, README, diagrams, model/data cards.

## Open decisions

See `docs/design.md` for the first complete design draft. Remaining decisions include
service-level policy, document processing limits and model provider when they
become relevant. Do not block framework installation on these choices.
