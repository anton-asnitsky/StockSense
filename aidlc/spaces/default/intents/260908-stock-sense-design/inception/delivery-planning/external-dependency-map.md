# StockSense external dependency map

Date: 2026-09-11
Stage: Delivery Planning
Status: Generated from the confirmed Delivery Planning summary

## Purpose and delivery posture

A **Bolt** is one build pass over a coherent piece of work that ends in something runnable. This map identifies services, downloads, credentials, approvals, and hand-offs that the StockSense implementation team does not control completely. It distinguishes dependencies required for the clean local portfolio path from optional integrations that may not block delivery.

Sources: `requirements.md`, `stories.md`, `components.md`, `unit-of-work.md`, `unit-of-work-dependency.md`, `unit-of-work-story-map.md`, `contract-summary.md`, `bolt-plan.md`, and `delivery-planning-questions.md`.

The required demonstration runs on Docker Desktop Kubernetes with no Google credentials, AWS credentials, cloud spending, cached model files, or owner GPU. Optional providers are activated explicitly and never become silent fallbacks.

## Blocking dependencies for the reproducible local path

| Dependency or gate | External owner | Needed by | Readiness signal | Lead-time posture | If unavailable or late |
| --- | --- | --- | --- | --- | --- |
| Supported host with Docker Desktop Kubernetes, 16 GB allocatable RAM, and up to 3 CPU units | Portfolio reviewer / workstation owner | Bolt 1 onward | Preflight validates Kubernetes, storage, networking, RAM, CPU, and required host features | Validate before build and at clean-room review | Fail early with exact remediation; do not claim the supported Kubernetes demo on an undersized host |
| Internet access to pinned language packages, container images, Helm charts, and tool distributions | Package and registry providers; reviewer network | Bolts 1, 2, and 7 | Checksums/digests resolve and a clean cache can restore every pinned dependency | Preflight before each clean-room run; caches may speed development but cannot be required | Retry boundedly; report the unavailable artifact. An offline bundle is outside current scope unless later approved |
| Local model and embedding artifact downloads for Qwen generation, EmbeddingGemma-300M, and Qwen3-Embedding-0.6B candidates | Model publishers and artifact host | Bolts 3, 6, and 7 | Terms and download steps are documented; exact revisions/checksums load and run on CPU from an empty cache | Acquire before the affected Bolt's acceptance run | A failed download blocks only the model-dependent acceptance evidence; never substitute an external API automatically |
| Duende IdentityServer package availability and continued project eligibility for the selected license | Duende and repository owner | Bolts 1, 2, and 7 | Pinned package restores; license basis and version are documented for reviewer use | Confirm before identity implementation and on material version changes | Stop the affected release and reassess the identity package/license; local authentication cannot be removed silently |
| Synthetic retail, supplier CSV/text-PDF, and demand fixtures stored or generated from the repository | StockSense implementation mob | Bolts 1, 3, 4, 5, and 7 | Deterministic seeds create three isolated retailers, one store and 100 products each, plus 18 months of history | Generate during setup; no third-party business data approval required | Fail the scenario with reproducibility diagnostics; external retailer data is not needed for acceptance |
| Repository-owner approval at AI-DLC gates and before every merge | Repository owner | Every Bolt integration | Required artifact review is approved and Git diff/checks are visible | No calendar SLA assumed | Keep work on its working branch; do not merge or represent the Bolt as accepted |

## Optional external integrations

| Optional dependency | External owner | Consuming Bolt(s) | Activation and readiness | Fallback and non-blocking rule |
| --- | --- | --- | --- | --- |
| Google OIDC client registration, consent configuration, and exact redirect URIs | Google Cloud project owner | Bolts 2 and 7 | Explicit configuration supplies client credentials through Vault and passes federation/linking tests | Seeded Duende local accounts remain the required login path; Google absence does not block the local demo |
| Amazon Bedrock account credentials, model access, region availability, and spend policy | AWS account owner | Bolts 6 and 7 | Reviewer explicitly selects Bedrock, provides Vault-managed credentials, and authorizes spend | Local Qwen remains the default; no automatic fallback or credential probing |
| AMD Radeon RX 6700 XT acceleration and compatible host runtime | Workstation owner and runtime maintainers | Bolts 3, 4, 6, and 7 | Optional benchmark identifies the runtime, driver, model revision, and measured result | CPU execution remains required and authoritative for reproducibility |
| AWS or another managed-cloud Terraform/Terragrunt backend and target services | Cloud account owner | Future extension after Bolts 2 and 7 | Explicit cloud target, credentials, backend, budget, and provisioning approval exist | Local state and Docker Desktop Kubernetes remain the accepted implementation; no cloud resource is provisioned implicitly |
| Real retailer or supplier files and associated usage approval | Data owner | Optional extension of Bolts 3-5 | Data classification, tenant, retention, and permission are recorded before ingestion | Repository-owned synthetic fixtures remain sufficient for portfolio acceptance |
| Public ingress, DNS, and trusted certificates | Domain/account owner | Optional remote demonstration | Endpoint ownership, certificate issuance, and exposure approval exist | Use local ingress and documented local hostnames for the required demo |

## Internal hand-offs that gate Bolt completion

These hand-offs occur inside the repository but behave like delivery dependencies because a consumer cannot close against an unfinished provider.

| Producer hand-off | Consumer | Bolt impact | Acceptance evidence |
| --- | --- | --- | --- |
| U1 approved OpenAPI/AsyncAPI contracts, examples, and compatibility policy | U3-U12 | Bolt 1 onward | Syntax, examples, generated clients, provider/consumer compatibility checks |
| U4 tenant context, placement generation, inventory, and demand authority | U5-U10 | Bolts 2-6 | Cross-tenant negative tests, stale-placement rejection, routine/RLS checks |
| U5 normalized accepted supplier terms and provenance | U6-U9 | Bolts 3-6 | Versioned term contract, citation, deletion, and partial/failure evidence |
| U6 promoted model manifest and immutable artifacts | U7 | Bolt 4 | Reproducible run lineage, evaluation, promotion, rollback, checksum evidence |
| U7 usable forecast and freshness contract | U8 and U9 | Bolts 4-6 | Forecast status/freshness examples and unavailable/failure behavior |
| U8 governed review and purchase commands | U9 | Bolts 5-6 | Authorization, idempotency, transition, concurrency, and audit evidence |
| U3-U9 authoritative event examples | U10 audit/telemetry projection | Bolts 1-7 | Inbox idempotency, lag, replay, retention, and rebuild evidence |

Contract doubles may unblock dependent development when generated from an approved U1 contract. They do not close the provider hand-off or satisfy the final consumer integration evidence.

## Approval and escalation rules

- Cloud provisioning, paid APIs, public exposure, real external data, and real purchase-order transmission each require separate explicit owner authorization.
- A dependency failure must be reported as unavailable, partial, or blocked. It cannot be hidden by stale data, a different model/provider, or an unapproved service.
- Versions, checksums, license/terms links, setup steps, and known platform limitations are captured with the immutable clean-room evidence revision.
- Exact lead times are not invented because no calendar commitment or external service-level agreement has been approved. Readiness is managed through preflight checks and Bolt entry criteria.
