# Project-Level Rules

> Project-specific specialisation and corrections. Loaded after `org.md` and
> `team.md` as strict-additive guidance; contradictions with broader policy
> are rejected. Populated by practices-discovery and the self-learning loop.
>
> Use sparingly: most teams don't need a project layer. Reach for it
> only when this specific project needs stable, durable guidance beyond the
> team practice (for example, package-specific release checks or an additional
> regression suite for a legacy component).

## Way of Working

StockSense is a solo portfolio product. Read `docs/product-brief.md` for the
business intent, proposed architecture, delivery sequence, and open decisions.
Keep requirements, architecture decisions, acceptance criteria and validation
evidence linked. Record actual owner decisions and substantive corrections.
The initial profile is classic, standard depth, standard test strategy.
Installation does not mean inception has been completed or approved.

<!-- Project-specific specialisation. Example: -->
<!-- This monorepo requires package-scoped branch names and a package owner -->
<!-- review in addition to the team's normal merge policy. -->

## Walking Skeleton

The first business slice imports data, displays inventory, calculates baseline
replenishment, and supports draft/approve/receive purchasing with simulated
supplier delivery. Add trained models and the agent after this workflow works.

<!-- Project-specific specialisation. Example: -->
<!-- The walking skeleton must exercise the legacy service adapter as well -->
<!-- as the new service boundary. -->

## Testing Posture

Prioritize inventory conservation, idempotency, concurrent approval, stale
recommendations, pack sizes, minimum orders, temporal leakage, model baselines,
agent tool boundaries, recovery and rollback. Use focused tests for material
behavior. Do not claim model improvement before measuring it.

<!-- Project-specific specialisation. -->

## Deployment

Retain operations in scope. Provide reproducible local development, CI/CD,
infrastructure as code and telemetry. Cloud provider and budget remain open;
Initial deployment is Docker Desktop Kubernetes; no managed cloud is selected. AWS-oriented framework examples are not a
requirement to deploy to AWS. Initial purchasing integrations are simulated.

<!-- Project-specific specialisation. -->

## Code Style

<!-- Project-specific specialisation. -->

## Tech Stack

Required portfolio coverage: React, .NET, relational DB, NoSQL DB, ML/MLOps,
agentic applications, DevOps and cloud-native delivery. PostgreSQL is confirmed;
MongoDB, Python and MLflow are confirmed for the roles in ADR 0008. The initial
deployment is Docker Desktop Kubernetes; a managed-cloud provider remains open.
The agent explains and proposes; domain services calculate and enforce approvals.

<!-- Technology choices locked for this project. -->

## Decided

DECIDED: Duende IdentityServer is the identity provider (owner conversation,
2026-09-08; ADR 0002). Use a dedicated .NET service and separate identity database
with custom Dapper/stored-routine persistence and Flyway migrations, no EF Core.
OIDC federation first; Google and seeded local demo accounts are selected (ADR 0005). This supersedes Keycloak.

DECIDED: The product is StockSense (owner conversation, 2026-09-08).
DECIDED: AWS Labs AI-DLC Workflows 2.8.0 with the Codex integration was selected
under the owner's instruction to choose and install the best-fitting framework
(ADR 0001, 2026-09-08).

<!-- Decisions made in earlier stages that should not be re-asked. -->
<!-- Format: DECIDED: [decision] (Stage [slug], [date]) -->

## Scope Overrides

<!-- Custom scope rules for this project. -->

## Forbidden

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: NEVER [behavior] (affirmed [date]) -->
<!-- Example: NEVER throw exceptions across service layer boundaries (affirmed 2026-05-17) -->

## Mandated

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: ALWAYS [behavior] (affirmed [date]) -->
<!-- Example: ALWAYS use Result<T,E> for fallible operations in service layer (affirmed 2026-05-17) -->

## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
- Manage each user story on its own short-lived branch and pull request; treat Bolts as delivery milestones, and deliver shared cross-story prerequisites through separate focused branches. (learned 2026-09-11) <!-- cid:260908-stock-sense-design:delivery-planning:2dd8a0fbb60d7cee2cbd21abf049e86270f479c74ed892a92e5f8ca08bd228be -->
