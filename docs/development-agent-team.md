# StockSense development subagent team

## Operating model

StockSense uses one coordinating development session and ten project-local specialist subagents. The coordinator owns dispatch, shared-contract changes, integration, lifecycle communication, and the single repository-owner approval stream. Specialists receive bounded tasks with explicit inputs, write sets, acceptance checks, and hand-off requirements.

The project keeps `[agents] max_depth = 1` in `.codex/config.toml`: only the coordinator delegates, and no specialist may create another subagent. This prevents hidden work chains and keeps every result reviewable in the main AI-DLC workflow.

## Team roster

| Role | Project-local agent | Primary ownership |
| --- | --- | --- |
| AI-DLC execution coordinator | Main Codex session using `aidlc-developer-agent` where required | Dispatch, integration, lifecycle routing, gate presentation, owner communication |
| Technical lead | `stocksense-technical-lead-agent` | Work decomposition, design conformance, cross-unit integration, engineering standards |
| Frontend specialist | `stocksense-frontend-agent` | React, TypeScript, Vite, Ant Design, BFF clients, accessibility, browser behavior |
| .NET service specialist | `stocksense-dotnet-service-agent` | .NET services/BFF, Dapper/Npgsql, REST/events, outbox/inbox, domain behavior |
| Data and persistence specialist | `stocksense-data-persistence-agent` | Flyway, PostgreSQL routines/RLS, MongoDB, Redis, Qdrant, tenant placement |
| ML and MLOps specialist | `stocksense-ml-mlops-agent` | Forecasting, leakage-safe data, MLflow, artifacts, promotion/rollback, CPU inference |
| Agentic AI and RAG specialist | `stocksense-agentic-rag-agent` | Strands, Qwen, embeddings, retrieval, tools, citations, adversarial evaluation |
| Platform and DevOps specialist | `stocksense-platform-devops-agent` | Kubernetes, Terraform/Terragrunt, Helm, Vault/VSO, CI/CD, clean-room operation |
| Security and identity specialist | `stocksense-security-identity-agent` | Duende/OIDC/BFF, federation, tenant authorization, Vault, threat-driven verification |
| Quality and reliability specialist | `stocksense-quality-reliability-agent` | Acceptance, contracts, concurrency, resilience, performance, recovery, evidence |
| AI-DLC process steward | `stocksense-aidlc-process-steward-agent` | Lifecycle correctness, traceability, document freshness, consistency, gate readiness |

## Dispatch contract

Every specialist brief must contain:

1. The Unit of Work and Bolt being served.
2. Approved requirements, design, contracts, and dependencies to read.
3. An exclusive write set and files that are read-only.
4. Required tests, measurements, and evidence.
5. Resource, security, tenant, and external-effect constraints.
6. The expected hand-off format and unresolved-decision escalation path.

Specialists may run concurrently only when dependencies are ready and write sets are disjoint. Shared contracts, migrations, generated clients, deployment state, and evidence manifests have one active owner at a time.

## Integration and review

- Specialists return changed files, checks run, evidence, assumptions, and unresolved issues to the coordinator.
- The coordinator inspects diffs, resolves cross-role conflicts, runs integration checks, and keeps the AI-DLC artifact trail current.
- The technical lead, security/identity specialist, quality/reliability specialist, and AI-DLC process steward do not approve their own implementation contribution.
- Lifecycle-required AI-DLC architecture, security, quality, deployment, and operations agents remain available for independent stage reviews.
- The repository owner approves AI-DLC gates and every merge. Cloud provisioning, paid APIs, public exposure, real retailer data, and real order transmission require separate authorization.

## User-story branch model

- Each user story is implemented on a separate short-lived branch and submitted through its own pull request. The branch name includes the story ID.
- A story branch has one primary user story and starts from the current Bolt integration branch. Its pull request targets that Bolt branch.
- Shared contracts, migrations, generated clients, or platform foundations that unblock several stories use a separate focused child branch and PR into the Bolt branch.
- Specialists work within the branch assigned by the coordinator. The coordinator integrates their changes, verifies story acceptance criteria, and prepares the pull request.
- Dependencies merge in order, and story branches refresh from the Bolt branch before final validation when an upstream prerequisite changed.
- The assembled Bolt is validated as a runnable increment, then its owner-approved integration branch is squash-merged to `main`.

## Bolt participation

| Bolt | Primary specialists | Independent review |
| --- | --- | --- |
| 1 — Runnable retail walking skeleton | Technical lead, frontend, .NET, data, platform | Security/identity, quality/reliability, AI-DLC steward |
| 2 — Platform trust, isolation, and tenant mobility | Technical lead, platform, .NET, data, security/identity | Quality/reliability, AI-DLC steward |
| 3 — Supplier knowledge and retrieval | Technical lead, agentic/RAG, data, platform | Security/identity, quality/reliability, AI-DLC steward |
| 4 — Model lifecycle and forecasting | Technical lead, ML/MLOps, data, platform | Quality/reliability, AI-DLC steward |
| 5 — Complete replenishment and governed purchasing | Technical lead, .NET, data, frontend | Security/identity, quality/reliability, AI-DLC steward |
| 6 — Safe agentic assistance | Technical lead, agentic/RAG, .NET, frontend, data | Security/identity, quality/reliability, AI-DLC steward |
| 7 — Portfolio evidence and clean-room release | All development specialists | Quality/reliability and AI-DLC steward final independent passes |
