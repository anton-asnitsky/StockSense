# StockSense Platform Infrastructure NFR Requirements Questions

Date: 2026-09-17
Stage: NFR Requirements
Unit: platform-infrastructure
Status: In progress

The approved baseline is Docker Desktop Kubernetes, Terraform/Terragrunt and
Helm, GitHub Actions with a dedicated local deployment runner, a 16 GiB and
3-CPU total planning envelope, local Terraform state by default, persistent
non-development Vault with manual unseal, and Vault Secrets Operator. These
questions quantify the remaining platform security and technology constraints.

## Interaction mode

Continue with the established guided-question workflow.

- A. Guide me through each question (Recommended)
- B. I will edit this file directly
- C. Answer all questions in chat
- X. Other (please specify)

[Answer]: A. Guide me through each question (Recommended)

## Q1. Kubernetes policy enforcement

Which policy baseline should the local cluster enforce without adding another
always-on policy-controller workload?

- A. Enforce the built-in Pod Security Admission `restricted` profile for application namespaces, use narrowly documented namespace/workload exceptions, validate manifests with Conftest in CI, and test whether Docker Desktop networking enforces NetworkPolicy before claiming it (Recommended)
- B. Install Kyverno in the local cluster and enforce all workload and image policies at admission time
- C. Keep Kubernetes policy advisory and rely on code review and Helm validation
- X. Other (please specify)

[Answer]: A. Enforce the built-in Pod Security Admission `restricted` profile for application namespaces, use narrowly documented namespace/workload exceptions, validate manifests with Conftest in CI, and test whether Docker Desktop networking enforces NetworkPolicy before claiming it (Recommended)

## Q2. Container supply-chain evidence

Which portfolio-grade image controls should be required?

- A. Build with pinned bases, generate an SPDX SBOM, scan with Trivy, sign and attest trusted images with keyless Cosign in GitHub Actions, and deploy by digest; local-only rebuilds may use a clearly marked unsigned development profile (Recommended)
- B. Generate an SBOM and scan with Trivy, but omit image signing and attestations
- C. Pin base images and deploy by digest without SBOM or vulnerability scanning
- X. Other (please specify)

[Answer]: A. Build with pinned bases, generate an SPDX SBOM, scan with Trivy, sign and attest trusted images with keyless Cosign in GitHub Actions, and deploy by digest; local-only rebuilds may use a clearly marked unsigned development profile (Recommended)

## Q3. Vault-delivered identity keys

How should Duende signing certificates and ASP.NET Core data-protection keys be
handled in the local portfolio deployment?

- A. Create local-only certificates through the protected bootstrap, store them in Vault, synchronize/mount them read-only through VSO, support overlapping signing keys, persist the data-protection key ring, and verify rotation plus restore (Recommended)
- B. Use Kubernetes-generated Secrets for identity keys and reserve Vault for application credentials
- C. Generate new development signing and data-protection keys on every pod start
- X. Other (please specify)

[Answer]: A. Create local-only certificates through the protected bootstrap, store them in Vault, synchronize/mount them read-only through VSO, support overlapping signing keys, persist the data-protection key ring, and verify rotation plus restore (Recommended)

## Q4. Enforced local resource reserve

How much of the 16 GiB and 3-CPU allocation should remain unavailable to
application workloads for Docker Desktop/Kubernetes overhead and transient work?

- A. Reserve 3 GiB and 0.5 CPU; enforce an application namespace quota of 13 GiB memory and 2.5 CPU, serialize heavy jobs, and require measured evidence for the complete demo workload (Recommended)
- B. Reserve 2 GiB and 0.25 CPU; allow workloads up to 14 GiB and 2.75 CPU
- C. Set only per-workload requests and limits without an aggregate namespace quota
- X. Other (please specify)

[Answer]: A. Reserve 3 GiB and 0.5 CPU; enforce an application namespace quota of 13 GiB memory and 2.5 CPU, serialize heavy jobs, and require measured evidence for the complete demo workload (Recommended)

## Q5. Local recovery objectives

What baseline should the portfolio recovery drill target for authoritative local
state and configuration?

- A. RPO 24 hours and RTO 2 hours for the documented clean-cluster restore; back up state and Vault after controlled changes, back up authoritative databases daily, rebuild projections, and report any missed target as evidence (Recommended)
- B. RPO 24 hours and RTO 4 hours with the same evidence and rebuild requirements
- C. Demonstrate restore without a numeric RPO or RTO
- X. Other (please specify)

[Answer]: A. RPO 24 hours and RTO 2 hours for the documented clean-cluster restore; back up state and Vault after controlled changes, back up authoritative databases daily, rebuild projections, and report any missed target as evidence (Recommended)

## Q6. Self-hosted deployment-runner isolation

Which boundary should protect the local cluster runner from public pull-request
code?

- A. Public PR checks use GitHub-hosted runners only; the self-hosted runner accepts protected `main` revisions through an approved environment or manual dispatch, uses scoped short-lived credentials where possible, and never runs `pull_request_target` checkout code (Recommended)
- B. Permit maintainers to label selected pull requests for execution on the self-hosted runner
- C. Allow all repository workflows to use the self-hosted runner while restricting its credentials
- X. Other (please specify)

[Answer]: A. Public PR checks use GitHub-hosted runners only; the self-hosted runner accepts protected `main` revisions through an approved environment or manual dispatch, uses scoped short-lived credentials where possible, and never runs `pull_request_target` checkout code (Recommended)

## Ambiguity Scan

The choices form one compatible local security profile. Built-in admission and
CI policy checks avoid the memory cost of an additional policy controller.
Supply-chain attestations apply to trusted CI images while clearly labeled local
development images remain usable without being deployable as release evidence.
Vault remains authoritative for identity keys, and VSO synchronization does not
replace persistence, overlap, reload, or restore tests. The 13 GiB and 2.5 CPU
application quota fits inside the confirmed host allocation and leaves an explicit
reserve. The recovery objectives measure the documented portfolio drill rather
than claim production high availability. Runner isolation prevents untrusted code
from reaching cluster, Vault, state, or deployment credentials.

## Consolidated Summary

- **Kubernetes policy:** Application namespaces enforce Pod Security Admission
  `restricted`. Exceptions are narrow and documented. Conftest validates Helm
  output in CI. NetworkPolicy is claimed only after an enforcement test against
  the Docker Desktop cluster networking implementation.
- **Container provenance:** Release images use pinned bases, SPDX SBOMs, Trivy
  scanning, keyless Cosign signatures and attestations from trusted GitHub
  Actions, and digest-only deployment. Unsigned local builds are marked
  development-only and cannot satisfy release evidence.
- **Identity keys:** Protected bootstrap creates local signing certificates and
  data-protection material outside Terraform state. Vault stores the material;
  VSO synchronizes it to read-only mounts. Signing-key overlap, data-protection
  persistence, rotation, restart, and restore are tested.
- **Resource envelope:** Reserve 3 GiB and 0.5 CPU from the configured 16 GiB and
  3 CPU allocation. Enforce a 13 GiB and 2.5 CPU application-namespace quota,
  serialize heavy jobs, and publish measured complete-workload evidence.
- **Recovery:** Target RPO 24 hours and RTO 2 hours for a documented clean-cluster
  restore. Back up Terraform state and Vault after controlled changes, back up
  authoritative databases daily, rebuild projections, and retain measured misses.
- **Runner isolation:** Public pull-request checks use GitHub-hosted runners only.
  The self-hosted runner accepts protected `main` revisions through an approved
  environment or manual dispatch, uses scoped credentials, and never executes
  checked-out `pull_request_target` code.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct
