# ADR 0003: GitHub Actions and local deployment runner

Date: 2026-09-08
Status: Accepted. Owner agreed to GitHub Actions with a dedicated self-hosted
runner for deployment to Docker Desktop Kubernetes.

## Decision

GitHub Actions orchestrates CI/CD. Terraform/Terragrunt manage infrastructure and
delivery, Helm packages Kubernetes resources, and Flyway owns schema migrations.
Use GitHub-hosted runners for PR checks and a dedicated self-hosted runner with
scoped credentials for trusted local-cluster deployments. Retain local validation
commands for development and times when the deployment machine is offline.

## Implementation requirements and open details

- Never execute untrusted PR code on the deployment runner. GitHub cautions against
  self-hosted runners in public repositories. Establish an enforceable isolation
  arrangement before registration; a private deployment repository is a proposal,
  not an approved repository creation. Labels alone do not provide isolation.
- Deploy reviewed revisions and immutable images; serialize infrastructure applies.
  Preserve the owner's merge approval rule. Migration failure blocks rollout.
- Local Terraform state is confirmed in ADR 0016; state paths/backups, runner
  operating environment, credential storage
  and deployment trigger details remain implementation decisions to resolve.
- Runner execution consumes machine resources; measure it against the agreed
  local budget and avoid competing builds/training during deployment.
- No workflow or runner has been provisioned by this decision.

The owner's agreement applies to the CI/CD question, not all other options in
the preceding remaining-decisions table.

## Reference

[GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use)
