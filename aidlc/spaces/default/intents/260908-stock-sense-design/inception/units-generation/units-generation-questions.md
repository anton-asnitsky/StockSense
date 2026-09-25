# StockSense units-generation questions

Date: 2026-09-23
Stage: Units Generation
Status: Revision plan awaiting owner approval

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

## Historical baseline confirmation (2026-09-10)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct

## 2026-09-23 revision after Domain Design approval

The preceding answers remain the historical baseline. The approved Domain
Design now adds two logical boundaries that the 13-unit plan does not represent:
`MessagingPlatform` and `RecoveryCoordination`. It also confirms four stories
that are absent from the existing story map (`US3.4`, `US4.8`, `US9.11`, and
`US10.3`) and clarifies Inventory ownership of dated inbound-supply
commitments.

The project rule for the initial release also separates logical unit and
deployment boundaries: U4 Retail Data and U8 Planning/Purchasing remain distinct
construction units with separate entities, schemas, ports, and tests, while
their modules share one v1 Retail Operations deployment so approval,
cancellation, and receipt updates can use one PostgreSQL transaction through
owned routines.

### Revised boundary decisions

- Keep stable IDs U1-U13 and their existing responsibilities unless explicitly
  amended below.
- Add U14 `messaging-platform` as a `library`. It owns the reusable
  AsyncAPI-aligned envelope implementation, RabbitMQ adapter, publisher
  confirms, delivery identity, retry/DLQ/replay policy, payload limits,
  telemetry hooks, and conformance fixtures. U1 Contracts continues to own the
  authoritative OpenAPI/AsyncAPI specifications and domain message schemas;
  each producer and consumer continues to own its outbox, inbox, authorization,
  idempotency, and business effects.
- Add U15 `recovery-coordination` as a standalone `service`. It owns recovery
  runs, participant registration, deadline-versioned phase commands,
  checkpoint-set closure, manifest verification, generation fencing, and
  terminal recovery outcomes. Participant units retain their own data and
  recovery implementations.
- Amend U4 to own `InboundSupplyCommitment`. U8 commands U4 through the public
  Inventory port on approval, pre-receipt cancellation, and partial/full
  receipt. U4 and U8 share the initial Retail Operations deployment while
  preserving their unit boundaries.
- Add the four missing stories and update `US6.4` so cancellation includes U4's
  inbound-commitment change.

### Revised 15-unit decomposition plan

| Unit | Kind | Approved logical scope | Deployment change |
| --- | --- | --- | --- |
| U1 Contracts | `spec` | OpenAPI, AsyncAPI, schemas, compatibility, generated-client inputs | No change |
| U2 Platform Infrastructure | `packaging` | Terraform/Terragrunt, Helm, Kubernetes dependencies, Vault/VSO, delivery packaging | No change |
| U3 Identity Access | `service` | IdentityAccess | No change |
| U4 Retail Data | `service` | TenantDirectory, Inventory, DemandHistory, including dated inbound commitments | Shares the v1 Retail Operations deployment with U8 |
| U5 Supplier Knowledge | `service` | SupplierKnowledge | Consumes U14 messaging library |
| U6 Model Lifecycle | `service` | ModelLifecycle | Consumes U14 messaging library |
| U7 Forecasting | `service` | Forecasting | Consumes U14 messaging library |
| U8 Planning and Purchasing | `service` | Replenishment, Purchasing | Shares the v1 Retail Operations deployment with U4 and consumes U14 |
| U9 Assistant | `service` | Assistant | Consumes U14 messaging library |
| U10 Audit Evidence | `service` | AuditEvidence | Consumes U14 and recovery events from U15 |
| U11 Web BFF | `service` | Browser session boundary and API composition | Adds governed U15 recovery-status composition where exposed |
| U12 Web Application | `ui` | WebExperience | No direct service dependency; continues through U11 |
| U13 Demo Evidence | `packaging` | DemoEvidence | Adds U14 conformance and U15 recovery verification |
| U14 Messaging Platform | `library` | MessagingPlatform | New reusable library; no standalone runtime |
| U15 Recovery Coordination | `service` | RecoveryCoordination | New standalone coordinator runtime |

### Revised dependency structure

- U14 depends on U1 for the authoritative envelope and AsyncAPI contracts.
- U5, U6, U7, U8, U9, U10, and U15 depend on U14 for shared broker mechanics.
- U15 depends on U1, U3, U4, and U14 for recovery contracts, authenticated
  operator authority, retailer placement/fencing, and asynchronous participant
  commands.
- U10 depends on U15 for recovery audit evidence; U11 may compose U15 status;
  U13 verifies both U14 and U15.
- Existing direct domain dependencies remain. U2 stays an independent packaging
  root; consuming its documented platform conventions does not create a
  construction edge.
- The graph remains acyclic and preserves safe parallel branches. This plan
  describes topology only and does not select a delivery order.

### Revised story-map coverage

- `US3.4` maps primarily to U5, with U9 and U13 supporting cache-safe retrieval
  and evidence.
- `US4.8` maps primarily to U6, with U7 and U13 supporting fenced heavy-work
  coordination and verification.
- `US8.5` maps primarily to U14, with asynchronous producer/consumer units and
  U13 proving retry, replay, and duplicate-effect safety.
- `US9.11` maps primarily to U15, with U4, U10, U11, U12, U13, and recovery
  participants supporting the consistent-cut workflow and evidence.
- `US10.3` maps primarily to U13, with U11, U12, and U15 supporting browser and
  recovery-state evidence.
- `US6.4` continues to be owned by U8 and adds U4 as a participating unit for
  closure of the Inventory-owned inbound commitment.

### Revision ambiguity scan

- The new units follow explicit approved logical ownership and do not introduce
  a new product requirement.
- U14 is a library because it owns reusable code and has no standalone runtime;
  RabbitMQ itself remains platform-packaged by U2.
- U15 is a service because it owns authoritative recovery state and a runtime
  coordination protocol; placing it in U2 or U13 would mix business authority
  with infrastructure or evidence responsibilities.
- U4 and U8 retain separate construction ownership while sharing one initial
  deployment, as required by the affirmed project rule. This does not create a
  storage-access exception: both modules use public ports and owned routines.
- Stable existing IDs are retained; new IDs are appended, avoiding downstream
  identity churn.
- No unresolved boundary, dependency-direction, granularity, integration, or
  deployment ambiguity remains in the revised plan.

## Revised decomposition plan approval

Does this 15-unit revision correctly reconcile Units Generation with the
approved Domain Design?

- A. Approve Plan
- B. Revise Plan
- X. Other (please specify)

[Answer]: Approve plan

## Revised consolidated unit-decomposition summary

- Retain stable U1-U13 identities and add U14 Messaging Platform (`library`)
  and U15 Recovery Coordination (`service`).
- Keep U1 authoritative for OpenAPI/AsyncAPI schemas while U14 owns reusable
  RabbitMQ mechanics and conformance code; domain units retain their messages,
  outbox/inbox state, authorization, idempotency, and effects.
- Keep U4 Retail Data and U8 Planning/Purchasing as separate construction units
  that share the initial Retail Operations deployment for atomic approval,
  cancellation, receipt, stock, and inbound-commitment updates.
- Give U15 authoritative recovery-run, deadline, checkpoint, fencing, manifest,
  and terminal-outcome state while participants retain their data and recovery
  implementations.
- Preserve U2 Platform Infrastructure as an independent packaging root and U13
  Demo Evidence as the verifier of messaging conformance and recovery behavior.
- Expand the acyclic dependency DAG to 15 units and 65 direct edges without
  choosing an implementation order.
- Map every one of the 67 stories exactly once to a primary unit and all direct
  implementing units. Add `US3.4`, `US4.8`, `US9.11`, and `US10.3`; map
  `US8.5` primarily to U14, `US9.11` primarily to U15, and add U4 to `US6.4`.
- Keep traceability complete: 67 `OK` rows whose target primary unit appears on
  the corresponding story-map row.
- Validation passes: 15 declared units, valid kinds, all references resolved,
  cycle-free DAG, 67 unique stories, no unassigned stories, no empty units, and
  consistent primary-unit targets.

## Consolidated Summary Confirmation

Does this revised Units Generation summary look correct before I finalize the
artifacts for independent review?

- Looks correct
- Request changes

[Answer]: Looks correct
