# StockSense domain design questions

Date: 2026-09-10
Stage: Domain Design
Status: Awaiting consolidated summary confirmation
Mode: Guided, one question at a time

This stage defines logical code components, their responsibilities, owned entities,
and interactions. It does not decide deployable units or reopen the approved
technology stack. The following decisions carry forward unchanged: strict retailer
isolation, backend-enforced authorization, deterministic purchasing rules,
PostgreSQL routine-only access, RabbitMQ integration events, OpenAPI and AsyncAPI
contracts, transactional audit/outbox writes, and human approval for purchases.

## Q1. Component granularity

How should the initial domain be divided into logical components?

- A. Business-capability components (Recommended) — separate Identity Access,
  Tenant Directory, Inventory, Supplier Knowledge, Forecasting, Model Lifecycle,
  Replenishment, Purchasing, Assistant, Audit Evidence, Demo Evidence, and Web
  Experience boundaries. This keeps ownership explicit while Units Generation can
  still combine components into a small number of deployables.
- B. Coarse product areas — combine related capabilities into roughly five larger
  components, reducing interfaces but increasing internal coupling and mixed
  responsibilities.
- C. Fine-grained feature components — create a component for each major workflow
  or aggregate, maximizing isolation at the cost of many dependencies.
- X. Other (please specify)

[Answer]: A. Business-capability components (Recommended) — confirmed 2026-09-10; **Mode:** guided

## Q2. Identity, membership, and retailer ownership

Which component should own retailer membership and role assignments?

- A. Tenant Directory owns retailers, memberships, roles, retailer configuration,
  and store placement; Identity Access owns accounts, credentials, federation, and
  sessions (Recommended). This separates authentication from current business
  authorization while requiring both on protected requests.
- B. Identity Access owns accounts, memberships, roles, and retailer assignments;
  Tenant Directory owns only retailer configuration.
- C. A single Identity and Tenancy component owns all identity, authorization, and
  retailer records.
- X. Other (please specify)

[Answer]: A. Tenant Directory owns retailers, memberships, roles, retailer configuration, and store placement; Identity Access owns accounts, credentials, federation, and sessions (Recommended) — confirmed 2026-09-10; **Mode:** guided

## Q3. Product catalog ownership

Where should the initial product catalog live?

- A. Inventory owns products, stock positions, and stock movements (Recommended) —
  appropriate for the one-store initial scope while preserving a later extraction
  path for a richer catalog.
- B. A separate Catalog component owns products and classification; Inventory
  references product identifiers.
- C. Supplier Knowledge owns products together with offers and terms.
- X. Other (please specify)

[Answer]: A. Inventory owns products, stock positions, and stock movements, with a documented extraction path for a richer Catalog component (Recommended) — confirmed 2026-09-10; **Mode:** guided

## Q4. Supplier documents and retrieval

How should supplier source documents and retrieval responsibilities be divided?

- A. Supplier Knowledge owns source documents, extraction, validation, accepted
  terms, and authorized retrieval indexing; Assistant owns conversations and tool
  orchestration and consumes retrieval results (Recommended).
- B. Assistant owns document ingestion, vector indexing, retrieval, and
  conversations; Supplier Knowledge owns only normalized supplier terms.
- C. Create a separate Knowledge Retrieval component between Supplier Knowledge
  and Assistant.
- X. Other (please specify)

[Answer]: A. Supplier Knowledge owns source documents, extraction, validation, accepted terms, and authorized retrieval indexing; Assistant owns conversations and tool orchestration and consumes retrieval results (Recommended) — confirmed 2026-09-10; **Mode:** guided

## Q5. Forecasting and model lifecycle

How should operational forecasts be separated from ML experimentation?

- A. Forecasting owns forecast requests, runs, results, versions, and freshness;
  Model Lifecycle owns datasets, experiments, evaluations, candidate registrations,
  and promotions (Recommended).
- B. One Forecasting component owns both operational forecasts and the full model
  lifecycle.
- C. Forecasting owns operational results while model lifecycle remains an
  infrastructure concern without a domain component.
- X. Other (please specify)

[Answer]: A. Forecasting owns forecast requests, runs, results, versions, and freshness; Model Lifecycle owns datasets, experiments, evaluations, candidate registrations, and promotions (Recommended) — confirmed 2026-09-10; **Mode:** guided

## Q6. Replenishment and purchasing ownership

Should recommendation generation and purchase execution remain separate domains?

- A. Keep them separate (Recommended) — Replenishment owns reviews, scenarios,
  recommendations, evidence snapshots, and manual-review allowance; Purchasing owns
  proposals, orders, approval/rejection/cancellation transitions, and receipts.
- B. Combine them into one Supply Planning component.
- C. Put scenarios in Forecasting and retain only Purchasing as a separate
  transactional component.
- X. Other (please specify)

[Answer]: A. Replenishment owns reviews, scenarios, recommendations, evidence snapshots, and manual-review allowance; Purchasing owns proposals, orders, approval/rejection/cancellation transitions, and receipts (Recommended) — confirmed 2026-09-10; **Mode:** guided

## Q7. Audit ownership

How should authoritative audit writing and searchable audit history be modeled?

- A. Each business component writes its own authoritative audit and outbox records
  in the same transaction; Audit Evidence owns ingestion status, the rebuildable
  search projection, and tenant-scoped audit queries (Recommended).
- B. Every business component calls a central Audit component synchronously before
  completing a mutation.
- C. Treat audit as a platform-only concern without a logical application
  component.
- X. Other (please specify)

[Answer]: A. Each business component writes its own authoritative audit and outbox records in the same transaction; Audit Evidence owns ingestion status, the rebuildable search projection, and tenant-scoped audit queries (Recommended) — confirmed 2026-09-10; **Mode:** guided

## Q8. Cross-component interaction rule

Which default should govern component communication?

- A. Use explicit synchronous contracts for immediate commands and queries, and
  domain events for asynchronous propagation; prohibit shared data access across
  owners (Recommended).
- B. Prefer synchronous calls for most interactions, reserving events for long
  jobs only.
- C. Prefer events for nearly all cross-component interactions, including request
  workflows that could otherwise complete synchronously.
- X. Other (please specify)

[Answer]: A. Use explicit synchronous contracts for immediate commands and queries, and domain events for asynchronous propagation; prohibit shared data access across owners (Recommended) — confirmed 2026-09-10; **Mode:** guided

## Q9. Web experience and reviewer evidence

How should presentation workflows and portfolio demonstration concerns appear in
the logical design?

- A. Web Experience owns the role-aware UI shell, view composition, and workflow
  state without owning business entities; Demo Evidence owns reproducible scenarios,
  setup verification, and evidence manifests (Recommended).
- B. Web Experience is split into one logical component per business capability;
  demonstration behavior remains distributed across those components.
- C. Keep one Web Experience component and treat all demo/reviewer behavior as
  scripts outside the logical component model.
- X. Other (please specify)

[Answer]: A. Web Experience owns the role-aware UI shell, view composition, and workflow state without owning business entities; Demo Evidence owns reproducible scenarios, setup verification, and evidence manifests (Recommended) — confirmed 2026-09-10; **Mode:** guided

## Q10. Demand-history ownership

Sales observations, lost demand, promotions, and synthetic true demand feed both
forecasting and model evaluation but are not inventory ledger records. Which
component should own them?

- A. Add a Demand History component (Recommended) — it owns demand observations,
  promotion observations, demand-import batches, and protected synthetic evaluation
  truth. Inventory remains responsible for products, stock, and movements.
- B. Inventory owns demand history together with products and stock records.
- C. Forecasting owns imported demand history as part of its input data.
- X. Other (please specify)

[Answer]: A. Add a Demand History component that owns demand observations, promotion observations, demand-import batches, and protected synthetic evaluation truth (Recommended) — confirmed 2026-09-10; **Mode:** guided

## Mandatory ambiguity scan

- All discovered business-data families now have a proposed single owner.
- Retailer configuration in Tenant Directory covers currency, time zone, stores,
  memberships, roles, and storage placement. Replenishment owns planning-policy
  settings such as buffer-day defaults and product overrides.
- Each business component owns its append-only authoritative audit records and
  outbox entries. Audit Evidence owns the derived search projection, indexing
  checkpoints, replay status, and authorized audit-query model.
- Accepted synthetic records enter their owning business components; Demo Evidence
  owns scenario definitions, generation runs, setup verification, and portfolio
  evidence manifests.
- Deployment topology remains intentionally deferred to Units Generation.
- Infrastructure products remain external dependencies or adapters, not domain
  entities.
- Metrics/traces storage, retention schedules, document-processing limits, and the
  exact model provider remain later decisions because they do not alter the agreed
  logical boundaries.

## Consolidated design summary

1. Use business-capability components and allow Units Generation to combine them
   into a smaller number of deployables.
2. Identity Access owns authentication accounts, credentials, federation, and
   sessions. Tenant Directory owns retailers, memberships, roles, retailer
   configuration, stores, and storage placement.
3. Inventory owns products, stock positions, and stock movements, with a documented
   extraction path for a future richer Catalog component.
4. Demand History separately owns sales, lost demand, promotions, import batches,
   and protected synthetic evaluation truth.
5. Supplier Knowledge owns source documents, extraction, validation, normalized
   accepted terms, provenance, and authorized retrieval indexing. Assistant consumes
   retrieval through its contract.
6. Forecasting owns operational forecast requests, runs, results, versions, and
   freshness. Model Lifecycle owns datasets, experiments, evaluations, candidates,
   promotions, and rollbacks.
7. Replenishment owns scheduled/manual reviews, quotas, scenarios,
   recommendations, evidence snapshots, and planning-policy settings. Purchasing
   owns proposals, orders, approvals, rejections, cancellations, and receipts.
8. Each business component commits its business change, local audit entry, and
   outbox entry atomically. Audit Evidence builds and serves the authorized,
   rebuildable search projection.
9. Components use synchronous contracts for immediate commands and queries and
   RabbitMQ events for asynchronous propagation. Cross-component storage access is
   prohibited.
10. Web Experience owns UI composition and client workflow state without business
    entities. Demo Evidence owns reproducible scenarios, setup verification, and
    evidence manifests.

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]:
