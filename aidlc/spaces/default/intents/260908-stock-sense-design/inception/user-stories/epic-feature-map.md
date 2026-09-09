# StockSense epic and feature map

Date: 2026-09-09
Status: Proposed grouping under the owner-selected epic -> feature -> story hierarchy.
Sources: approved requirements and `docs/execution-plan.md` (SS-01 through SS-38).

## Hierarchy and traceability

An epic groups a coherent outcome. Its features describe capabilities; each feature
will be split into small user stories with acceptance criteria. Technical work that
enables several stories is tracked as implementation tasks, not invented user value.
Operator and portfolio-reviewer outcomes are legitimate stories.

Example: EP06 Purchasing -> FE06.03 Record receipts -> separate stories for first
partial receipt, completing an order and safe retry/conflict handling. Exact story
IDs and boundaries follow elaboration; this example does not claim generated stories.

Each story records its epic, feature, upstream FR/NFR IDs and relevant SS task IDs.
Each acceptance criterion receives a stable ID. The required traceability.json
continues to map every FR/NFR to stories or a justified downstream allocation.
SS tasks can support multiple features; the references below are not one-to-one
ownership or a substitute for delivery dependencies.

## Proposed epics and features

| Epic | Features | Existing task references |
| --- | --- | --- |
| EP01 Secure access and retailer isolation | FE01.01 Local and Google sign-in, sessions and logout; FE01.02 Retailer membership and role enforcement; FE01.03 Identity persistence and key lifecycle | SS-07, SS-08, SS-09 |
| EP02 Inventory and reproducible demo data | FE02.01 Deterministic retail simulation; FE02.02 Validated imports; FE02.03 Inventory positions and movement history; FE02.04 Correct tenant-scoped caching | SS-10, SS-11, SS-32 |
| EP03 Supplier information | FE03.01 CSV offers and text-PDF ingestion; FE03.02 Versioned source documents and extraction; FE03.03 Validated commercial terms and provenance | SS-10, SS-21 |
| EP04 Demand forecasting and ML lifecycle | FE04.01 Versioned daily baseline forecasts; FE04.02 Datasets, temporal evaluation and outcome measures; FE04.03 Candidate training and MLflow tracking; FE04.04 Promotion, rollback, quality and freshness | SS-13, SS-17, SS-18, SS-19, SS-20 |
| EP05 Replenishment planning | FE05.01 Daily shortage and quantity calculations; FE05.02 Product buffers and scenario comparison; FE05.03 Quota-limited manual review and status UI | SS-14, SS-35 |
| EP06 Controlled purchasing and receipts | FE06.01 Draft and submit proposals; FE06.02 Manager approval, rejection and cancellation; FE06.03 Partial/full simulated receipts and stock reconciliation | SS-15, SS-16 |
| EP07 Evidence-backed assistant | FE07.01 Local inference and optional external-provider boundary; FE07.02 Tenant-authorized vector ingestion and retrieval; FE07.03 Strands tools and cited explanations; FE07.04 Retrieval and agent safety evaluations | SS-22, SS-23, SS-33, SS-34, SS-36 |
| EP08 Local platform and delivery | FE08.01 Reproducible application skeleton; FE08.02 OpenAPI/AsyncAPI contracts and reliable messaging; FE08.03 Kubernetes and Terraform/Terragrunt setup; FE08.04 Vault and workload credentials; FE08.05 CI and trusted deployment | SS-03, SS-04, SS-05, SS-06, SS-12, SS-25, SS-29, SS-30 |
| EP09 Observability, audit and recovery | FE09.01 Transactional audit and authorized audit search; FE09.02 Operational telemetry and resource validation; FE09.03 Backup, restore and secrets recovery; FE09.04 Shared-to-dedicated tenant migration | SS-24, SS-26, SS-27, SS-31, SS-37, SS-38 |
| EP10 Reviewer experience and portfolio evidence | FE10.01 Clean-checkout setup and demo; FE10.02 Versioned walkthrough, evaluation evidence and limitations | SS-28 |

## Cross-cutting obligations

Tenant isolation, routine-only PostgreSQL access, contract validation, business
auditing, secret handling and applicable UI states belong in every affected story.
Their epic placement does not defer them until that entire epic is delivered.
React/TypeScript, Ant Design and Vite constrain all browser implementation.

SS-01 (Git/setup publication) and SS-02 (requirements/design reconciliation) are
project-governance work rather than product features. Keep them in the execution
plan with their original acceptance conditions, dependencies and status.

## Delivery view

Preserve the planned sequence: foundation and secure inventory, complete simulated
purchasing, ML and assistant capabilities, then integrated operational/reviewer
proof. Features from several epics may be delivered together. Secrets, isolation,
audit and recovery design start with their dependent capabilities. Final resource
proof does not replace early feasibility checks. Story priorities cannot silently
remove approved first-release requirements. Detailed slices follow Delivery Planning.
