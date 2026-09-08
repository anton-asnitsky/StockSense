# ADR 0016: Local Terraform state for initial deployment

Date: 2026-09-08
Status: Accepted by the owner.

## Decision

Keep Terraform state local for now, including initial automation on the dedicated
self-hosted deployment runner. No cloud state service is required. This supersedes
the earlier requirement to adopt a remote backend before any automated deployment.

## Execution rules

Use a durable host directory outside the Git checkout, runner job workspace,
Terragrunt cache and managed Kubernetes volumes. Each deployment machine has its
own state; do not copy the owner's state into the reviewer distribution. Version
backend configuration/templates, not state, backup files or plan artifacts.

Keep distinct stable state paths for independently applied infrastructure/Vault
configuration stacks. Manual operator commands and automated jobs for the same
environment must resolve to the same paths. Do not create fresh state per run.

Permit one apply at a time. Use workflow concurrency for automated deployments and
local backend locking for processes sharing the same state; never disable locks
to work around contention. Coordinate cross-stack operations on this single host.
This is not a distributed state-sharing solution for multiple runners/machines.

Restrict filesystem access and back up state securely outside the managed cluster.
State can contain sensitive values even when configuration marks them sensitive.
Document state/cluster recovery, and retain access to required bootstrap credentials
outside the failed deployment. Avoid logging state or uploading it as CI artifacts.

Revisit a protected remote backend if deployment moves to multiple machines or
shared automation. A future migration must preserve existing resource ownership.

## Task impact

SS-06 establishes persistent local state paths. SS-25 reuses them on the dedicated
runner and verifies serialized applies. SS-26 tests state recovery alongside the
existing backup/restore procedures. Reviewer setup remains independently local.
