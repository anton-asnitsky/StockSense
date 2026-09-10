# StockSense domain design questions

Date: 2026-09-10
Stage: Domain Design
Status: In progress
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

[Answer]:

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

[Answer]:

## Q3. Product catalog ownership

Where should the initial product catalog live?

- A. Inventory owns products, stock positions, and stock movements (Recommended) —
  appropriate for the one-store initial scope while preserving a later extraction
  path for a richer catalog.
- B. A separate Catalog component owns products and classification; Inventory
  references product identifiers.
- C. Supplier Knowledge owns products together with offers and terms.
- X. Other (please specify)

[Answer]:

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

[Answer]:

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

[Answer]:

## Q6. Replenishment and purchasing ownership

Should recommendation generation and purchase execution remain separate domains?

- A. Keep them separate (Recommended) — Replenishment owns reviews, scenarios,
  recommendations, evidence snapshots, and manual-review allowance; Purchasing owns
  proposals, orders, approval/rejection/cancellation transitions, and receipts.
- B. Combine them into one Supply Planning component.
- C. Put scenarios in Forecasting and retain only Purchasing as a separate
  transactional component.
- X. Other (please specify)

[Answer]:

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

[Answer]:

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

[Answer]:

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

[Answer]:

## Mandatory ambiguity scan

- Component names and exact entity inventories depend on the answers above.
- Deployment topology remains intentionally deferred to Units Generation.
- Infrastructure products remain external dependencies or adapters, not domain
  entities.
- Metrics/traces storage, retention durations, document limits, and exact model
  provider selection remain later implementation decisions unless they alter a
  component boundary.

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]:
