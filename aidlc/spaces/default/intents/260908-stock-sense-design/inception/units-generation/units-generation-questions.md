# StockSense units-generation questions

Date: 2026-09-10
Stage: Units Generation
Status: Awaiting owner answers

These questions decide how the approved logical components become independently testable construction and deployment units. They define topology only; Delivery Planning will choose implementation sequence later.

## Q1. Overall unit boundary strategy

StockSense must demonstrate clear service boundaries while remaining practical on the 16 GB, 3 CPU local Kubernetes target. Which packaging strategy should govern the first release?

- A. Hybrid portfolio architecture: separate units at runtime, technology, security, and scaling boundaries; retain approved logical modules inside coarser services where separation adds little value (Recommended)
- B. Coarse architecture: minimize deployables by combining most backend capabilities into one modular service plus workers
- C. Fine architecture: make nearly every approved logical component an independently deployable service
- X. Other (please specify)

[Answer]: A. Hybrid portfolio architecture: separate units at runtime, technology, security, and scaling boundaries; retain approved logical modules inside coarser services where separation adds little value (Recommended)

## Q2. Retail operations boundary

The approved dependency graph places retailer, inventory, and demand data upstream of forecasting and planning. How should the transactional .NET business capabilities be packaged without creating a cyclic unit dependency graph?

- A. Use a foundational Retail Data service for Tenant Directory, Inventory, and Demand History, and a separate Planning and Purchasing service for Replenishment and Purchasing (Recommended)
- B. Put all five capabilities in one Retail Operations service, accepting a coarser dependency boundary
- C. Use one service for each of the five logical components
- X. Other (please specify)

[Answer]: A. Use a foundational Retail Data service for Tenant Directory, Inventory, and Demand History, and a separate Planning and Purchasing service for Replenishment and Purchasing (Recommended)

## Q3. ML serving and lifecycle boundary

Model Lifecycle and Forecasting are separate logical components but share the Python and MLflow runtime and a closely coupled model-version contract. How should they be deployed initially?

- A. One ML and Forecasting service with separate internal modules and explicit ports, preserving a future extraction seam (Recommended)
- B. Separate Model Lifecycle and Forecasting services from the first release
- C. Combine them with Supplier Knowledge into one broad Intelligence service
- X. Other (please specify)

[Answer]: B. Separate Model Lifecycle and Forecasting services from the first release

## Q4. Supplier knowledge boundary

Supplier ingestion and retrieval use MongoDB, Qdrant, document extraction, and embedding workflows that differ from the relational .NET path. Where should this capability live?

- A. A separate Supplier Knowledge service that owns ingestion, accepted-term provenance, and authorized retrieval (Recommended)
- B. Include it in the ML and Forecasting service
- C. Include it in the foundational Retail Data service
- X. Other (please specify)

[Answer]: A. A separate Supplier Knowledge service that owns ingestion, accepted-term provenance, and authorized retrieval (Recommended)

## Q5. Browser integration boundary

The approved security requirements use a backend-for-frontend session pattern, while the React application spans all business capabilities. How should browser traffic reach backend services?

- A. Create a dedicated Web BFF service; the React UI calls only the BFF, which enforces the session, retailer context, and API composition (Recommended)
- B. Embed the BFF in the Planning and Purchasing service
- C. Let the React UI call each backend service directly with browser-held access tokens
- X. Other (please specify)

[Answer]: A. Create a dedicated Web BFF service; the React UI calls only the BFF, which enforces the session, retailer context, and API composition (Recommended)

## Q6. Shared contracts

OpenAPI and AsyncAPI are authoritative integration contracts and must be validated independently of any one implementation. How should they be packaged for Construction?

- A. Create a dedicated Contracts specification unit consumed by every service and the UI (Recommended)
- B. Keep each contract only inside its owning service and aggregate documentation during CI
- C. Generate a shared runtime library that all services must import
- X. Other (please specify)

[Answer]: A. Create a dedicated Contracts specification unit consumed by every service and the UI (Recommended)

## Q7. Platform and portfolio evidence

Terraform/Terragrunt, Helm, local Kubernetes setup, seeded scenarios, setup verification, and reviewer evidence share the goal of reproducible evaluation. How should this work be grouped?

- A. One Platform and Demo packaging unit containing IaC, deployment packaging, deterministic seed/setup tools, verification, and evidence manifests (Recommended)
- B. Split Platform Infrastructure and Demo Evidence into two packaging units
- C. Keep deployment assets and demo scripts inside each application unit
- X. Other (please specify)

[Answer]: B. Split Platform Infrastructure and Demo Evidence into two packaging units

## Q8. Independent development topology

The dependency artifact can expose independent branches of work without selecting a preferred delivery order. How much parallelism should the unit graph preserve?

- A. Preserve all safe parallel branches; units depend only on contracts or capabilities they actually consume (Recommended)
- B. Add conservative dependencies so each unit has one strict topological predecessor
- C. Optimize for maximum independence even when that duplicates integration adapters
- X. Other (please specify)

[Answer]: A. Preserve all safe parallel branches; units depend only on contracts or capabilities they actually consume (Recommended)

## Mandatory ambiguity scan

- The hybrid strategy and the selected service boundaries are consistent with the approved logical component DAG.
- Separate Model Lifecycle and Forecasting services remove the only ambiguity introduced by the initial combined-service recommendation.
- Splitting Platform Infrastructure from Demo Evidence gives each a distinct construction responsibility and keeps reviewer evidence independent from deployment implementation.
- Identity Access remains independently deployable because authentication is a security and technology boundary established by ADR-DD-002.
- Assistant and Audit Evidence remain independently deployable because they have distinct runtimes, authority limits, data stores, and scaling/failure characteristics.
- No unresolved contradiction, vague dependency direction, or missing deployment choice remains.

## Proposed decomposition plan

The plan defines 13 construction units:

| Unit | Kind | Approved logical scope |
| --- | --- | --- |
| Contracts | `spec` | Authoritative OpenAPI and AsyncAPI definitions, common envelopes, compatibility checks, and generated-client inputs |
| Identity Access | `service` | IdentityAccess |
| Retail Data | `service` | TenantDirectory, Inventory, DemandHistory |
| Supplier Knowledge | `service` | SupplierKnowledge |
| Model Lifecycle | `service` | ModelLifecycle |
| Forecasting | `service` | Forecasting |
| Planning and Purchasing | `service` | Replenishment, Purchasing |
| Assistant | `service` | Assistant |
| Audit Evidence | `service` | AuditEvidence projections, replay, retention, and authorized search; authoritative audit writes remain local to business transactions |
| Web BFF | `service` | Browser session boundary, retailer-context enforcement, and API composition |
| Web Application | `ui` | WebExperience React/Vite/Ant Design client |
| Platform Infrastructure | `packaging` | Terraform/Terragrunt, Helm, local Kubernetes dependencies, workload configuration, and delivery packaging |
| Demo Evidence | `packaging` | DemoEvidence scenarios, deterministic data generation, setup verification, measurements, and evidence manifests |

The dependency graph will preserve safe parallel branches and include only direct contract/capability dependencies. The Contracts specification and platform foundations can evolve independently; Retail Data follows the identity and contract boundaries; Supplier Knowledge and Model Lifecycle consume authorized foundation data; Forecasting consumes promoted models and demand data; Planning and Purchasing consumes forecasts, supplier terms, and inventory; Assistant invokes governed capabilities; Audit Evidence consumes emitted events; Web BFF composes authorized APIs; Web Application consumes the BFF; Demo Evidence verifies the assembled system.

## Decomposition plan approval

Does this 13-unit decomposition correctly define the scope for Units Generation?

- A. Approve Plan
- B. Revise Plan
- X. Other (please specify)

[Answer]: Approve Plan

## Consolidated unit-decomposition summary

- Use a hybrid portfolio architecture that separates runtime, technology, security, and scaling boundaries while preserving approved logical modules inside suitable shared services.
- Package Tenant Directory, Inventory, and Demand History in a foundational Retail Data service.
- Package Replenishment and Purchasing in a separate Planning and Purchasing service so advice, human approval, and receipt invariants remain cohesive downstream of forecasts and supplier terms.
- Deploy Model Lifecycle and Forecasting as separate services from the first release.
- Deploy Supplier Knowledge as a separate service for document ingestion, provenance, embeddings, Qdrant indexing, and authorized retrieval.
- Put a dedicated Web BFF between the React application and backend services; the browser calls only the BFF.
- Maintain OpenAPI and AsyncAPI definitions in a dedicated Contracts specification unit without a mandatory shared runtime library.
- Split Platform Infrastructure from Demo Evidence so infrastructure automation and reviewer evidence have independent construction scopes.
- Preserve every safe parallel branch in the dependency DAG and declare only direct dependencies that a unit actually consumes.
- Generate 13 units: Contracts, Identity Access, Retail Data, Supplier Knowledge, Model Lifecycle, Forecasting, Planning and Purchasing, Assistant, Audit Evidence, Web BFF, Web Application, Platform Infrastructure, and Demo Evidence.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
