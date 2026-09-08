# ADR 0006: HashiCorp Vault inside Kubernetes

Date: 2026-09-08
Status: Accepted by the owner: “Vault it is”.

## Decision

Run HashiCorp Vault inside Docker Desktop Kubernetes. Manage deployment through
the official Helm chart using Terraform/Terragrunt; configure mounts, policies and
authentication through the Vault Terraform provider after bootstrap.

Use a single persistent instance for the initial local deployment, with TLS and
integrated storage. This is not an HA deployment; do not use Vault development
mode. Separate infrastructure deployment, initialization/unsealing and Vault
configuration so dependent applications start only after secrets are available.

## Bootstrap and secrets

Start with a controlled initialization and manual-unseal procedure. Keep unseal
material and recovery instructions outside the cluster and repository; never make
Vault's recovery depend on reading secrets from that same sealed Vault. Revoke
the initial root token after scoped administration is established.

Manage configuration and access policies in IaC. Load actual secret values through
a separate protected procedure; do not read or write them through ordinary
Terraform resources/data sources that persist them in state. Sensitive marking
does not prevent state storage. Keep state, plans and bootstrap outputs out of Git.

Bind workload access to specific Kubernetes service accounts/namespaces with
least-privilege Vault policies. Select an injection mechanism during implementation
and include its resource footprint. Verify rotation, renewal/reload behavior and
failure handling for each consumer. Dynamic database credentials are a future
option, not required for the first release.

## Execution and recovery

- Add foundation tasks SS-29/30 for deployment, bootstrap and workload integration.
- Add SS-31 for secret rotation, sealed/restarted-server behavior, Raft snapshot
  backup and restore. Protect backups and retain required recovery material.
- Recalculate the complete workload budget before deployment, including Vault,
  injection components and CI activity. The existing resource table excludes Vault.
- Google OAuth credentials, database/broker credentials and future LLM keys are
  in scope. Select and validate Duende signing/data-protection key integration
  explicitly rather than assuming every key can be injected as an environment value.

Vault selection does not select pgvector or Valkey, which remain proposals.

## References

- [Helm deployment with Terraform](https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/terraform)
- [Kubernetes deployment guide](https://developer.hashicorp.com/vault/tutorials/kubernetes/kubernetes-raft-deployment-guide)
- [Terraform sensitive data](https://developer.hashicorp.com/terraform/language/manage-sensitive-data)
