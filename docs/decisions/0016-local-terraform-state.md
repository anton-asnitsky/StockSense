# ADR 0016: Reviewer-selectable Terraform state with a local default

Date: 2026-09-08
Status: Accepted by the owner.

## Decision

Use local Terraform state by default for the owner's initial deployment, including
automation on the dedicated self-hosted runner. The executing reviewer chooses
their backend during setup: local or a remote backend they configure and control.
No cloud state service is required for the default demo. This supersedes the
earlier requirement to adopt a remote backend before any automated deployment.

Expose backend selection through documented Terragrunt environment configuration
and setup options. Keep application modules independent of the backend choice.
Ship a working local profile and document the inputs and prerequisites for remote
configuration; explicitly list which profiles have been tested. Do not provision
cloud storage, introduce charges or access reviewer credentials automatically.

## Local profile execution rules

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

## Remote selection and migration

Reviewers choosing remote state supply the backend, credentials and applicable
locking/access controls. Keep secrets out of committed backend configuration.
Serialize applies and protect state for either choice. Document deliberate state
migration so switching backends preserves existing resource ownership; never
silently initialize empty state against an already deployed environment.

## Task impact

SS-06 exposes reviewer-selectable backend configuration with a working local
default. SS-25 uses the selected backend consistently for manual and runner
operations and verifies serialized applies. SS-26 tests state recovery alongside
the existing backup/restore procedures. SS-28 explains backend choices, validates
the local default and distinguishes tested remote profiles from examples.
