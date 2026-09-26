# Platform Infrastructure Security Requirements

Date: 2026-09-18  
Stage: NFR Requirements  
Unit: platform-infrastructure  
Status: Draft for review

## Scope and security posture

These requirements govern the portable StockSense deployment on Docker Desktop
Kubernetes. The cluster is a single-node local environment for portfolio review,
not a production high-availability or Internet-facing service. Browser traffic
terminates at the local Web BFF; service APIs, data stores, brokers, Vault, model
runtimes, telemetry endpoints, and operator dashboards remain cluster-internal.
No control in this artifact authorizes a public endpoint, cloud resource, paid
service, real supplier order, or use of reviewer credentials without an explicit
later decision.

The controls derive from inception NFR1-NFR15, the confirmed NFR questions, ADRs
0003, 0006, 0016, 0017, and 0019, and contract C19. Acceptance evidence must be
bound to the tested Git revision and must record failures or limitations rather
than turn them into successful claims.

## Security boundaries

| Boundary | Trusted side | Untrusted or less-trusted side | Required enforcement |
| --- | --- | --- | --- |
| Browser ingress | Web BFF server-side session | Browser input, cookies, uploaded files, route identifiers | Local TLS, authorization code with PKCE, secure HttpOnly cookie, CSRF validation, input limits, and current membership checks |
| Workload identity | Named Kubernetes service account and narrow machine identity | Pod name, namespace name, tenant identifier, and network location | Kubernetes RBAC, Vault role binding, issuer/audience/scope validation, and provider-side authorization |
| Kubernetes admission | Reviewed, rendered Helm output | Chart values, generated manifests, and development images | Pod Security Admission `restricted`, Conftest policy checks, schema validation, and documented exceptions |
| Cluster network | Explicitly allowed service path | Every other pod-to-pod or pod-to-host path | Default-deny NetworkPolicy manifests and proof that the Docker Desktop networking implementation enforces them before isolation is claimed |
| Secrets | Vault integrated storage and protected external recovery material | Git, Terraform state/plan, CI artifacts, logs, shell output, and container images | Protected bootstrap, workload-scoped Vault policies, VSO synchronization, Kubernetes RBAC, read-only mounts, and redaction checks |
| Deployment runner | Protected `main` revision and approved/manual deployment | Public pull-request code and `pull_request_target` checkout content | Separate GitHub-hosted PR jobs, dedicated self-hosted labels/environment, scoped credentials, revision verification, and workflow concurrency |
| Software supply chain | Digest-pinned image with trusted CI provenance | Mutable tags and unsigned local development builds | SPDX SBOM, Trivy gate, keyless Cosign signature/attestation, digest-only release values, and provenance verification |
| Persistent state | Durable host state and encrypted/protected backups outside the managed cluster | Checkout, runner workspace, caches, logs, and ephemeral Kubernetes volumes | Stable paths, restrictive permissions, serialized mutation, checksums, restore tests, and retention/expiry policy |
| Tenant and data plane | Provider-authorized retailer context and owned storage interface | Client-selected retailer IDs, indexes, collections, cache keys, or database routes | Application authorization, placement generation, provider-owned routing, least-privilege credentials, and negative isolation tests |

## Detailed requirements

| ID | Requirement | Measurable acceptance evidence |
| --- | --- | --- |
| NFR3.1 | Application, platform, observability, and operator workloads shall use separate namespaces and dedicated service accounts. RBAC shall grant only the verbs and namespaced resources required by each controller or workload; default service-account token mounting shall be disabled unless a documented integration needs it. | Automated RBAC inspection shows no application service account with cluster-admin, wildcard verbs/resources, or access to another workload's Secrets. Negative `kubectl auth can-i` probes fail across the declared boundaries. |
| NFR3.2 | Checked-in ingress and egress NetworkPolicy shall default-deny application namespaces and allow only documented service, DNS, telemetry, and control-plane paths. StockSense shall not claim network isolation until positive and negative probes demonstrate enforcement by the active Docker Desktop Kubernetes networking implementation. | A revision-bound probe report identifies Docker Desktop/Kubernetes/networking versions, proves every allowed path, proves representative denied cross-namespace and direct-data-store paths, and records `limited` if denied traffic still succeeds. A failed proof blocks the isolation claim and requires a supported networking alternative or an explicit limitation. |
| NFR3.3 | Kubernetes namespaces, Secret names, network location, database names, cache prefixes, Qdrant collections, MongoDB collections, object keys, and OpenSearch indexes shall be treated as defense-in-depth selectors rather than tenant authority. Provider-owned routing and application authorization shall remain mandatory. | Cross-retailer tests substitute identifiers and placement generations through HTTP, messaging, pooled database connections, cache, Qdrant, MongoDB, object storage, and audit search. Every probe is denied or returns no cross-tenant data. |
| NFR4.1 | PostgreSQL application credentials delivered by Vault shall map to roles that can execute approved parameterized procedures/functions but cannot directly select, insert, update, or delete application or audit tables. Flyway migration and controlled-retention roles shall be separate and unavailable to runtime pods. | Database privilege tests run under every runtime role, demonstrate successful routine calls, and demonstrate failed direct-table and audit-mutation attempts. Rendered manifests show migration credentials absent from runtime workloads. |
| NFR5.1 | The local browser entry point shall expose only the Web BFF. Runtime service APIs, Duende administrative surfaces, data stores, RabbitMQ management, Vault, MLflow, object storage, Qdrant, OpenSearch, Dashboards, and telemetry administration shall use ClusterIP or operator-controlled local access. | Service/Ingress inventory contains only the approved local BFF route. A port and route probe from the host and an unprivileged pod cannot reach administrative or data-plane endpoints except through documented operator procedures. |
| NFR5.2 | Machine identities shall have narrow issuer, audience, scope, workload, and job authority and shall never inherit a human role or authorize purchase approval, rejection, cancellation, or receipt. | Token-negative tests reject wrong issuer/audience/scope/workload and attempts to invoke human-only purchasing commands. Results include stable denial codes and correlation IDs without token contents. |
| NFR6.1 | Vault shall run as one persistent TLS-enabled, integrated-storage instance, never in development mode. Initialization and manual unseal shall be separate from Terraform apply; recovery material shall remain outside the cluster and repository; the initial root token shall be revoked after scoped administration is established. | Helm/Terraform render checks prove persistent storage, TLS, and non-development configuration. A bootstrap checklist records initialization, successful manual unseal, scoped admin authentication, root-token revocation, seal/restart behavior, and Raft snapshot creation without recording secret values. |
| NFR6.2 | Secret values, unseal/recovery material, root or workload tokens, signing private keys, data-protection keys, and credentials shall not enter Git, Terraform/Terragrunt state or plans, generated evidence, CI artifacts, logs, or command output. Terraform shall manage references, policies, and mounts but shall not manage secret values. | Repository, rendered artifact, plan/state metadata, log, and CI-artifact scans find no seeded canary secret. The protected loading procedure emits only identifiers and redacted status. State inspection records field paths and redaction outcomes, never values. |
| NFR6.3 | Vault Secrets Operator shall synchronize only workload-scoped secrets into Kubernetes Secrets. Vault shall remain authoritative; Terraform shall not also own synchronized values. Each consumer shall declare mounted-file reload or controlled-rollout behavior and safe behavior during Vault/VSO outage or stale synchronization. | RBAC and Vault-policy tests deny cross-workload reads. Rotation tests prove the consuming process adopts the new credential, the old credential is revoked after any declared overlap, sync health exposes age/error without values, existing pods behave as documented, and new pods fail safely when required material is unavailable. |
| NFR6.4 | Protected bootstrap shall create local-only Duende signing certificates and ASP.NET Core data-protection material outside Terraform state, store them in Vault, and deliver them through VSO as read-only mounted files. Signing rotation shall support an overlap window, and the data-protection key ring shall persist across restart and restore. | Tests authenticate before and after pod restart, decrypt a pre-restart protected payload, rotate to a new signing key while validating tokens signed by the overlapping prior key, reject the retired key after the configured overlap, and repeat the checks after Vault and application restore. Private material is absent from evidence. |
| NFR9.1 | The deployment shall enforce configurable defaults of seven days for operational logs and 90 days for authoritative business audit and its OpenSearch projection. Controlled expiry shall cover PostgreSQL, OpenSearch, rebuild inputs, and backups so expired records do not reappear. | Time-shifted or fixture-based maintenance tests expire eligible records in both stores, rebuild the projection, and prove expired records remain absent. The evidence records cleanup lag, backup retention/expiry, and any legal hold configuration. |
| NFR10.1 | Logs, traces, metrics, audit projections, workflow output, and evidence shall exclude credentials, tokens, raw supplier documents, full prompts, hidden reasoning, signing keys, unseal material, and secret values by default. Tenant, actor, job, message, and correlation fields shall be bounded and authorized. | Automated redaction tests inject canaries into every prohibited field and find none in collector output, OpenSearch, Dashboards exports, CI logs, or evidence. Cardinality tests show no unbounded product, document, user, or prompt label. |
| NFR10.2 | Operational telemetry delivery shall use bounded buffers and shall not block business transactions. Required business auditing shall continue through the transactional PostgreSQL/outbox path independently of OpenSearch or collector availability. | Collector/OpenSearch outage tests show bounded queue or drop behavior with loss counters, successful business commits with durable audit/outbox rows, observable projection lag, and successful replay after recovery. |
| NFR13.1 | Public pull-request checks shall run only on GitHub-hosted runners. The dedicated self-hosted local deployment runner shall accept protected `main` revisions through an approved GitHub environment or explicit manual dispatch, use scoped short-lived credentials where possible, and never execute checked-out `pull_request_target` code. | Workflow policy tests and repository search prove no public-PR event can select self-hosted labels. A deployment run records protected revision, actor, approval/manual trigger, environment, runner identity, credential scope, and concurrency group without exposing credentials. |
| NFR13.2 | Application namespaces shall enforce built-in Pod Security Admission `restricted`. Conftest shall reject rendered Helm output that violates the profile, omits required security context/resource declarations, exposes prohibited services, uses mutable release tags, or requests undocumented privilege. Exceptions shall be namespace/workload-specific, justified, time-bounded where practical, and tested. | Namespace labels and rendered manifests pass server-side dry-run and Conftest. Negative fixtures for privileged containers, root execution, privilege escalation, host namespaces/paths, added capabilities, mutable tags, missing limits, and public service types fail CI. An exception register links each exception to owner, rationale, scope, and compensating test. |
| NFR13.3 | Trusted CI shall build from pinned base-image digests, generate SPDX SBOMs, scan images and filesystems with Trivy, sign images and provenance attestations with keyless Cosign, and publish digest-pinned deployment values. Unsigned local rebuilds shall be labeled development-only and shall not satisfy release evidence or trusted deployment policy. | CI evidence contains the source revision, image digest, base digests, SPDX checksum, Trivy result and policy threshold, Cosign identity/issuer verification, provenance predicate, and rendered digest-only values. Tampered, unsigned, wrong-identity, mutable-tag, and vulnerable-above-threshold fixtures are rejected. |
| NFR13.4 | Cluster mutation shall be serialized. Deployment shall verify the exact protected revision, signatures/attestations, policy results, Terraform plan, selected state backend, Helm diff/render, and Flyway migration outcome before rollout. Migration failure shall stop rollout; rollback shall select immutable application artifacts compatible with the current schema. | A controlled failure at each gate prevents subsequent mutation. Concurrency tests admit one apply/deploy at a time. Rollback evidence records prior/new revisions, image digests, Helm release revisions, schema compatibility decision, elapsed time, and final readiness. |
| NFR15.1 | Security evidence shall be immutable or checksummed, revision-bound, timestamped, and explicit about environment, command, outcome, and limitations. A failed or unproven control shall be reported as `failed` or `limited`, never omitted or reported as passed. | The C19 evidence-manifest validator accepts the manifest; every artifact checksum resolves; requirement IDs in checks resolve to this artifact; rerunning against a different revision creates a distinct manifest; and a seeded failed probe remains visible. |

## Threat and failure considerations

- The single Docker Desktop node, its VM, host disk, local state directory, and
  operator account are shared failure and trust domains. Namespace, RBAC, and
  NetworkPolicy controls do not defend against a malicious host administrator.
- A single Vault instance, RabbitMQ instance, PostgreSQL deployment, and local
  object store cannot provide production availability. Restart and restore are
  required evidence; zero-downtime failover is outside this release.
- VSO copies secret values into the Kubernetes API. Access to those copies and
  the cluster's actual at-rest protection must be measured and documented; Vault
  authority does not erase synchronized copies.
- Keyless signing establishes CI workload provenance under the verified issuer
  and identity. It does not make an unreviewed revision trusted or replace branch,
  environment, vulnerability, and deployment controls.
- NetworkPolicy manifests are intent until enforcement is demonstrated on the
  exact Docker Desktop networking version used for the evidence run.
- Backups stored only on the Docker Desktop VM or managed cluster volume do not
  survive the failure being tested and cannot satisfy recovery evidence.

## Open implementation parameters

Exact supported Kubernetes, Terraform, Terragrunt, Helm, Vault, VSO, Cosign,
Trivy, Conftest, and workload versions are selected and checksum-locked during
implementation. The Trivy release threshold, key-overlap duration, secret reload
deadlines, backup encryption mechanism, retention-maintenance schedule, and
tested NetworkPolicy implementation must be fixed before their corresponding
acceptance tests run. None of these parameters may weaken the controls above.

## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-21T12:16:24Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Critical | aidlc/spaces/default/intents/260908-stock-sense-design/construction/platform-infrastructure/nfr-requirements/ > review evidence for the artifact set | The review was stopped before any artifact content or shared-contract content was inspected. The only established evidence is that the four declared unit outputs exist, so implementability, measurable acceptance criteria, C15/C18/C19 consistency, local Kubernetes constraints, Terraform/Terragrunt and Helm ownership, Vault/VSO behavior, recovery, resource bounds, security, observability, and traceability cannot be verified. A READY verdict would therefore be unsupported. | Request Changes at the approval gate and run a fresh bounded advisory review of the permitted artifacts before approval. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Bounded artifact inventory | PASS: `nfr-requirements-questions.md`, `security-requirements.md`, `tech-stack-decisions.md`, and `traceability.json` were present | Confirms artifact presence only; it does not establish content quality or contract consistency |
| Content and contract validation | NOT RUN: the owner directed the reviewer to stop further analysis before artifact reads completed | Confirms finding R-01; no evidence supports approval |

### Summary

The artifact files exist, but their contents and contract alignment were not reviewed. The owner should request changes and require a fresh bounded review before approving this gate.
