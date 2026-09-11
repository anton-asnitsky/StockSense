# StockSense team allocation

Date: 2026-09-11
Stage: Delivery Planning
Status: Generated from the confirmed Delivery Planning summary

## Allocation basis

A **Bolt** is one build pass over a coherent piece of work that ends in something runnable. A **mob** is the delivery group accountable for that Bolt. Team Formation was skipped under the classic scope, so one coordinated AI implementation mob led by `aidlc-developer-agent` owns every Bolt and one repository-owner approval stream. Project-local specialist subagents perform bounded development tasks beneath that coordinator; they do not own units or approval gates independently. This file is the lightweight **Program Board**, the cross-Bolt view of ownership, hand-offs, and safe concurrency.

Sources: `unit-of-work.md`, `unit-of-work-dependency.md`, `unit-of-work-story-map.md`, `contract-summary.md`, `stories.md`, and `bolt-plan.md`.

## Bolt ownership

| Bolt | Accountable mob | Lead implementation role | Required specialist input | Approval owner |
| --- | --- | --- | --- | --- |
| 1 — Runnable retail walking skeleton | StockSense AI implementation mob | `aidlc-developer-agent` | Architect, DevSecOps, quality, pipeline/deploy | Repository owner at applicable AI-DLC gates |
| 2 — Platform trust, isolation, and tenant mobility | StockSense AI implementation mob | `aidlc-developer-agent` | AWS/platform, architect, DevSecOps, quality, operations | Repository owner at applicable AI-DLC gates |
| 3 — Supplier knowledge and retrieval | StockSense AI implementation mob | `aidlc-developer-agent` | Architect, quality, DevSecOps | Repository owner at applicable AI-DLC gates |
| 4 — Model lifecycle and forecasting | StockSense AI implementation mob | `aidlc-developer-agent` | Architect, quality, operations | Repository owner at applicable AI-DLC gates |
| 5 — Complete replenishment and governed purchasing | StockSense AI implementation mob | `aidlc-developer-agent` | Architect, quality, DevSecOps | Repository owner at applicable AI-DLC gates |
| 6 — Safe agentic assistance | StockSense AI implementation mob | `aidlc-developer-agent` | Architect, quality, DevSecOps | Repository owner at applicable AI-DLC gates |
| 7 — Portfolio evidence, operations, and clean-room release | StockSense AI implementation mob | `aidlc-developer-agent` | Quality, pipeline/deploy, operations, DevSecOps | Repository owner at applicable AI-DLC gates |

## Role responsibilities

| Role | Delivery responsibility |
| --- | --- |
| `aidlc-developer-agent` | Owns application changes, unit integration, migrations, tests, and runnable Bolt evidence |
| `aidlc-architect-agent` | Protects component, contract, tenancy, stored-routine, and authority boundaries |
| `aidlc-aws-platform-agent` | Designs portable Kubernetes, Terraform/Terragrunt, Helm, Vault, storage, and resource placement; AWS examples remain optional |
| `aidlc-devsecops-agent` | Checks identity, tenant isolation, secrets, software supply chain, runner isolation, and agent tool boundaries |
| `aidlc-quality-agent` | Defines and reviews acceptance, concurrency, leakage, recovery, performance, and clean-room evidence |
| `aidlc-pipeline-deploy-agent` | Owns CI and local deployment/release mechanics; no cloud provisioning follows without explicit approval |
| `aidlc-operations-agent` | Owns observability, retention, replay, recovery, incident, and resource/performance readiness |
| Repository owner | Approves AI-DLC gates and every merge, and separately authorizes cloud cost or real external effects |

## Development subagent roster

The specialist definitions live under `.codex/agents/`; `docs/development-agent-team.md` records their operating and dispatch contract. The project retains delegation depth one, so only the coordinating session dispatches subagents.

| Specialist | Project-local agent | Primary scope | Mandatory hand-off |
| --- | --- | --- | --- |
| Technical lead | `stocksense-technical-lead-agent` | Implementation planning, design conformance, cross-unit integration, engineering standards | Reviewed plan/diff, findings, integration order, required fixes |
| Frontend | `stocksense-frontend-agent` | React/TypeScript, Vite, Ant Design, BFF/generated clients, accessibility, browser tests | UI states, changed files, browser/component checks, contract issues |
| .NET services | `stocksense-dotnet-service-agent` | .NET services and BFF, Dapper/Npgsql routine calls, REST/events, outbox/inbox | Changed files, unit/integration/contract checks, migration or contract needs |
| Data and persistence | `stocksense-data-persistence-agent` | Flyway, PostgreSQL routines/RLS, MongoDB, Redis, Qdrant, tenant placement | Migration order, grants, isolation/recovery checks, ownership risks |
| ML and MLOps | `stocksense-ml-mlops-agent` | Leakage-safe data, forecasting, MLflow, artifacts, promotion/rollback, CPU inference | Experiment lineage, metrics, checksums, resource results, limitations |
| Agentic AI and RAG | `stocksense-agentic-rag-agent` | Strands, Qwen, embeddings, retrieval, typed tools, citations, evaluations | Retrieval/tool evaluations, provenance, model/resource results, safety findings |
| Platform and DevOps | `stocksense-platform-devops-agent` | Kubernetes, Terraform/Terragrunt, Helm, Vault/VSO, CI/CD, clean-room operation | Plan/diff, deployment checks, resource measurements, recovery evidence |
| Security and identity | `stocksense-security-identity-agent` | Duende/OIDC/BFF, Google federation, tenant authorization, Vault, threat-driven tests | Findings, negative-test evidence, required fixes, residual risk |
| Quality and reliability | `stocksense-quality-reliability-agent` | Acceptance, contracts, concurrency, resilience, performance, recovery, clean-room evidence | Reproducible commands/results, findings, measured limitations |
| AI-DLC process steward | `stocksense-aidlc-process-steward-agent` | Lifecycle correctness, traceability, stale-document and consistency review | Gate-readiness verdict, exact findings, affected paths, remediation |

Lifecycle-required `aidlc-architect-agent`, `aidlc-devsecops-agent`, `aidlc-quality-agent`, and `aidlc-operations-agent` remain available for independent design, security, quality, and operational review. They do not approve their own implementation contribution.

## Subagent dispatch rules

- Every brief names the Unit, Bolt, approved inputs, exclusive write set, read-only files, acceptance checks, resource constraints, and expected hand-off.
- The coordinator owns shared-contract changes, cross-unit decisions, integration, final checks, and conflict resolution.
- Specialists report required changes outside their write set rather than editing another specialist's area.
- No specialist delegates further. Parallel work is limited to dependency-ready tasks with disjoint write sets.
- Shared contracts, migrations, generated clients, cluster mutations, and evidence manifests have one active owner at a time.
- The AI-DLC process steward reviews traceability and artifact freshness before every lifecycle gate and may not manufacture approvals, edit lifecycle records manually, or override failed sensors.

## Specialist participation by Bolt

| Bolt | Primary specialists | Independent review |
| --- | --- | --- |
| 1 — Runnable retail walking skeleton | Technical lead, frontend, .NET, data, platform | Security/identity, quality/reliability, AI-DLC steward |
| 2 — Platform trust, isolation, and tenant mobility | Technical lead, platform, .NET, data, security/identity | Quality/reliability, operations, AI-DLC steward |
| 3 — Supplier knowledge and retrieval | Technical lead, agentic/RAG, data, platform | Security/identity, quality/reliability, AI-DLC steward |
| 4 — Model lifecycle and forecasting | Technical lead, ML/MLOps, data, platform | Quality/reliability, operations, AI-DLC steward |
| 5 — Complete replenishment and governed purchasing | Technical lead, .NET, data, frontend | Security/identity, quality/reliability, AI-DLC steward |
| 6 — Safe agentic assistance | Technical lead, agentic/RAG, .NET, frontend, data | Security/identity, quality/reliability, AI-DLC steward |
| 7 — Portfolio evidence, operations, and clean-room release | All development specialists | Quality/reliability and AI-DLC steward final independent passes |

## Controlled parallel lanes

Parallelism applies to tasks, not to conflicting ownership. The mob may work concurrently only when the dependency DAG says the inputs are ready, write sets are disjoint, and integration remains ordered.

| Lane | Work that may overlap | Serialization point |
| --- | --- | --- |
| Contract and generated-client lane | Provider OpenAPI/AsyncAPI examples and consumer mocks | Compatibility checks before integration |
| Platform packaging lane | Helm/Terragrunt modules that do not modify the same state or release | One serialized local apply/upgrade |
| Service implementation lane | Dependency-ready units in separate directories/worktrees | Contract tests and ordered merge |
| UI lane | Ant Design views against approved examples/mocks | BFF integration and browser smoke tests |
| Evidence lane | Deterministic fixture generators and evidence schema | Evidence collection against one immutable revision |

ML training, model download, full-cluster startup, performance runs, backup/restore, replay, migration, and recovery exercises run serially so the 16 GB RAM and 3 CPU budget remains meaningful.

## Hand-off rules

- U1 provider contracts precede consumer integration. A mock generated from an approved contract can unblock development but cannot close the provider's Definition of Done.
- A producer owns business semantics and examples; consumers own compatibility tests and explicit degraded-state behavior.
- U4 tenant and placement authority precedes U5-U9 business integrations. No consumer may authorize from cached claims alone.
- U5 accepted terms and U7 usable forecast contracts precede final U8 planning/purchasing acceptance.
- U4/U5/U7/U8 governed tools precede U9 assistant side-effect tests.
- U10 may build its generic inbox/projection path early, but final completion waits for each U3-U9 publisher's authoritative event examples and replay evidence.
- U11/U12 may develop against U1 examples; final UI claims wait for real provider integration.
- U13 prepares scenario/evidence structure early and closes only after clean-room verification of the assembled system.

## Git and review ownership

- Work uses short-lived working branches and Conventional Commits under `CONTRIBUTING.md`.
- Each user story has its own branch and PR, identified by story ID. A branch has
  one primary story, starts from the current Bolt integration branch, and targets
  that Bolt branch with its PR.
- Cross-story contracts, migrations, generated clients, or platform foundations
  use separate focused child branches and merge into the Bolt branch before
  dependent stories.
- The agent may commit and push completed working-branch changes. Every merge remains an explicit repository-owner decision.
- Construction Bolt worktrees base on and target `main`; completed Bolt branches
  squash-merge only after the required AI-DLC reviews and owner approval.
- Unrelated changes are preserved, staged changes are inspected, and no generated secret, state file, downloaded model, or generated dataset is committed.
