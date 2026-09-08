# ADR 0017: Vault Secrets Operator

Date: 2026-09-08
Status: Accepted by the owner.

## Decision

Use Vault Secrets Operator to synchronize application secrets from Vault into
Kubernetes Secrets. Vault remains authoritative. Applications consume the
synchronized secrets using workload-specific references; no per-pod Vault Agent
injection is required by the initial design.

Deploy the operator and its configuration through Terraform/Terragrunt and Helm.
Version references, policies and synchronization configuration, not secret values.
The operator owns synchronized Secret contents; Terraform must not also manage
those values. Use a protected bootstrap path for Vault and the operator's initial
authentication so neither depends on a secret it cannot yet synchronize.

## Boundaries and rotation

Bind Vault roles/policies and Kubernetes permissions to the intended workloads
and namespaces. Deny cross-workload secret access; do not treat a namespace or
Secret name alone as a security boundary. Synchronized values also exist in the
Kubernetes API store. Verify RBAC and actual at-rest protection in the target
cluster, and include secret copies in backup/access-control considerations.

For each consuming service, explicitly choose mounted-file reload or controlled
rollout behavior. Synchronizing a Secret does not by itself guarantee the process
has adopted the new credential, especially when injected as an environment value.
Test rotation end to end, including connection pools, overlapping credentials
where supported, revoked credentials and operator/Vault outages.

Report synchronization health and staleness without logging values. Do not
automatically delete usable credentials or silently bypass authentication during
an outage. Document how existing pods and new pods behave when synchronization
is unavailable; fail safely for missing or invalid required credentials.

Duende signing/data-protection key lifecycle remains an explicit integration
design, not automatically solved by synchronizing ordinary application secrets.

## Task impact

SS-29 includes operator resource usage in the revised budget. SS-30 deploys the
operator, authentication and scoped synchronization resources. SS-31 verifies
rotation, outage and recovery behavior. SS-28 includes this bootstrap sequence
in the clean reviewer setup. Product/version compatibility is pinned and tested
during implementation. No operator has been installed by this decision.
