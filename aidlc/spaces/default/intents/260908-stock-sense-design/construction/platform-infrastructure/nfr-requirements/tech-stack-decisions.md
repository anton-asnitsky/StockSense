# Platform Infrastructure Technology Stack Decisions

Date: 2026-09-18  
Stage: NFR Requirements  
Unit: platform-infrastructure  
Status: Draft for review

## Decision context

The supported release path is a portable, local, CPU-capable deployment on
Docker Desktop Kubernetes. Terraform and Terragrunt compose infrastructure and
configuration, Helm packages Kubernetes resources, and GitHub Actions separates
public pull-request validation from trusted deployment on a dedicated local
runner. The default path requires no cloud account, cloud credentials, owner GPU,
or paid service. Provider interfaces and configuration seams remain available for
a later explicitly authorized cloud deployment.

Technology names below record confirmed choices. Exact versions, image digests,
chart archives, provider packages, model artifacts, and checksums belong in a
machine-readable dependency lock produced during implementation; mutable tags and
unpinned downloads are not accepted release inputs.

## Platform decisions and acceptance requirements

| ID | Decision and requirement | Rationale | Measurable acceptance evidence |
| --- | --- | --- | --- |
| NFR1.1 | The platform acceptance profile shall run ordinary authenticated inventory/purchasing reads with five concurrent local users against the warmed, fully deployed seeded stack and shall achieve p95 below one second. LLM generation, downloads, startup, maintenance, and recovery are separate profiles. | Preserves the inception user-facing performance target while making platform overhead visible. | A revision-bound report records the read mix, sample count, warm-up, duration, hardware, Docker Desktop allocation, full pod inventory, authentication path, p50/p95/p99, errors, CPU/memory/storage pressure, and pass/fail result. |
| NFR2.1 | Docker Desktop shall be configured with no more than 16 GiB RAM and 3 CPU units for the supported profile. Application namespaces shall enforce aggregate ResourceQuota ceilings of 13 GiB memory and 2.5 CPU, for both declared requests and limits, leaving 3 GiB and 0.5 CPU unavailable to application workloads for Kubernetes/Docker Desktop overhead and transient platform work. Every workload shall declare requests and limits. | Turns the agreed host envelope and reserve into enforceable scheduling constraints. | Configuration capture proves the host allocation. ResourceQuota/LimitRange inspection and negative admission fixtures prove workloads cannot exceed aggregate or per-container rules. Metrics distinguish application usage from the 3 GiB/0.5 CPU reserve. |
| NFR2.2 | Builds, image scans, Terraform applies, Helm upgrades, backups/restores, projection rebuilds, model downloads, ML training, indexing, and other heavy jobs shall be serialized when they can overlap the complete demo workload. The supported steady-state profile shall include OpenSearch/Dashboards, Vault/VSO, PostgreSQL, RabbitMQ, Redis, MongoDB, Qdrant, MLflow, object storage, telemetry, application services, and one active ML job. | The three-CPU local host cannot safely treat all heavy work as concurrent. | A complete-workload soak publishes sustained and peak pod/namespace/node/VM/host CPU and memory, restart/OOM/throttle events, disk use, and job schedule. It passes inside the quota or records a measured failure for owner review; services are not silently omitted. |
| NFR7.1 | RabbitMQ shall provide durable exchanges/queues, persistent messages, publisher confirms, consumer acknowledgement only after business/inbox commit, bounded retries, dead-letter queues, and audited replay. | Implements the at-least-once contract without an exactly-once transport claim. | Broker and worker interruption tests preserve messages, deduplicate re-delivery, prevent duplicate stock effects, expose retry/DLQ depth, and replay an authorized batch with before/after counts and correlation IDs. |
| NFR8.1 | CI shall validate every provider-owned OpenAPI 3.1.x document, AsyncAPI 3.0.0 document, JSON Schema 2020-12 document, examples, generated-client input, and backward-compatibility rule with pinned tools. | Keeps runtime units independently implementable and prevents invalid integration changes. | Negative fixtures for syntax, incompatible schemas, invalid examples, missing tenant context, and missing correlation/idempotency fields fail the applicable change. The report records exact tool versions and checksums. |
| NFR9.2 | PostgreSQL authoritative audit, OpenSearch audit projection, operational-log indexes, backup sets, and projection rebuild inputs shall have separately configured retention and expiry. Defaults are seven days for operational logs and 90 days for business audit; backup retention shall be explicit before recovery ships. | Search retention alone cannot prevent expired data from returning through restore or rebuild. | Configuration export plus expiry/rebuild/restore tests show consistent deletion, measured maintenance lag, protected backup expiry, and no resurrection of expired records. |
| NFR11.1 | A dependency lock shall pin Terraform CLI and providers, Terragrunt, Helm, kubectl, Flyway, Conftest/policies, Trivy databases/tools, Cosign, every Helm chart, every container/base image by digest, and every downloaded binary/model by version and SHA-256 or stronger checksum. | A clean reviewer must receive the same inputs and supply-chain identity as CI. | An offline-verifiable manifest resolves every deployment input to a version, source, license/terms reference where applicable, digest/checksum, and update owner. Tampering with one archive or digest fails preflight. |
| NFR11.2 | Preflight, deploy, readiness, seed, smoke, evidence, backup, restore, upgrade, rollback, replay, and clean-room entry points shall run from a clean checkout without owner credentials, owner caches, or a GPU. Downloads shall be explicit and checksummed; real CPU inference shall be exercised. | Makes the portfolio independently reproducible and avoids hidden machine state. | A clean-machine or clean-VM run records prerequisites, elapsed time, downloaded checksums, selected backend, cluster readiness, CPU inference result, smoke journey, resource evidence, and all limitations. |
| NFR12.1 | Terraform modules shall express provider-neutral platform capabilities; Terragrunt shall compose the Docker Desktop local environment; Helm shall package Kubernetes workloads and configuration. Terraform shall not manage application secret values or seed business tables. | Preserves a later provider seam while keeping the local path deterministic. | Static checks and plans show clear module/provider boundaries, no cloud provider/resource in the local profile, no secret values, and no direct application-table seeding. Helm render and server-side dry-run pass before apply. |
| NFR12.2 | Terraform backend selection shall be reviewer-controlled. The shipped default shall use stable local state directories outside the checkout, runner workspace, Terragrunt cache, and managed cluster volumes. Reviewers may supply a remote backend they control; StockSense shall not provision one, access credentials automatically, or imply that an example backend was tested. | Implements ADR 0016 without requiring a cloud account or copying owner state. | Preflight displays the selected backend and absolute state roots without values. Local apply/reapply uses the same paths. A documented migration drill moves a fixture state to a reviewer-configured backend and back without orphaning or recreating managed resources. |
| NFR12.3 | Manual and automated mutation of one environment shall resolve to the same state roots and shall allow one Terraform/Terragrunt apply or Helm deployment at a time. State, plans, and backups shall not be logged or uploaded as general CI artifacts. | Local backend locking is host-local and cannot coordinate multiple machines by itself. | A concurrency test blocks a second mutation, lock bypass is absent, stack ordering is deterministic, and CI artifact inventory contains no state, plan, backup, or secret material. |
| NFR12.4 | Upgrades shall take pre-change backups, render and validate desired state, use immutable image digests and pinned charts, wait on explicit readiness, and retain the prior compatible release. Rollback shall restore the prior application/Helm revision when schema compatibility permits; destructive database rollback requires an explicit restore procedure. | Application rollback cannot safely pretend an incompatible migrated schema disappeared. | A controlled upgrade and failed-readiness drill record backups, plans/diffs, migration state, image/chart digests, readiness deadlines, rollback decision, elapsed time, and final smoke result. |
| NFR12.5 | Authoritative local state and configuration shall target RPO 24 hours and RTO 2 hours for a documented restore into a clean cluster. Terraform state and Vault shall be backed up after controlled changes; authoritative databases shall be backed up at least daily; Redis, Qdrant indexes, OpenSearch indexes, and other projections shall be rebuilt from authoritative sources where designed. | Quantifies the confirmed portfolio recovery drill without claiming production availability. | A timed clean-cluster exercise restores selected backend state, Vault snapshot plus external unseal/recovery material, PostgreSQL, MongoDB, RabbitMQ definitions/durable data as applicable, MLflow metadata/object artifacts, then rebuilds projections and runs reconciliation/smoke checks. Start/end timestamps calculate RPO/RTO; misses remain reported. |
| NFR12.6 | The local profile shall provision only Docker Desktop Kubernetes resources and durable host-local storage explicitly selected by the reviewer. It shall create no public load balancer, public DNS record, cloud bucket, hosted database, remote state service, external model call, or other chargeable resource. | Installation and lifecycle approval are not authorization for cloud access or spend. | Terraform provider/resource inventory and a no-cloud-credentials run prove zero cloud plans/calls. Kubernetes service inspection shows no public endpoint. Optional remote/backend or AI provider examples remain disabled until separately configured. |
| NFR12.7 | Cloud portability shall be maintained through Terraform module inputs, Helm values, OpenAPI/AsyncAPI contracts, S3-compatible artifact interfaces, and provider adapters. Local acceptance shall not require cloud credentials, and no automatic local-to-cloud fallback shall exist. | Keeps later deployment possible without coupling the initial release to a provider. | Interface tests select local implementations through configuration. Missing optional cloud configuration yields an explicit disabled/unavailable result and produces no network call or resource plan. |
| NFR13.5 | GitHub Actions shall use GitHub-hosted runners for public PR validation and a dedicated self-hosted runner only for the trusted deployment path. CI shall run build/test, contract, migration, IaC formatting/validation, Helm lint/render, Conftest, secret scan, SPDX generation, Trivy, and Cosign provenance checks as applicable. | Separates untrusted code execution from the local cluster, Vault, state, and deployment credentials. | Workflow-event/runner-label tests prove isolation; required checks block merge/deploy on failure; trusted deployment records the protected revision and verified image digest; runner credentials and workspaces are cleaned according to the documented procedure. |
| NFR15.2 | Every validation, deployment, upgrade, rollback, backup, restore, replay, and resource measurement shall emit C19-compatible evidence linked to stable NFR IDs, the immutable 40-character Git revision, deterministic scenario, environment limits, command outcome, and artifact SHA-256. | Reviewers need evidence that can be traced and reproduced rather than narrative claims. | Schema validation passes, every target ID resolves, artifact hashes verify, the seeded 3-retailer/1-store/100-product/18-month scenario is identified when applicable, and `failed`/`limited` outcomes remain present. |

## Component selections and packaging constraints

| ID | Capability | Selected technology or seam | Packaging and operational constraint |
| --- | --- | --- | --- |
| NFR12.8 | Cluster | Docker Desktop Kubernetes | Support one documented Kubernetes/Docker Desktop version set; preflight verifies context, node count, capacity, storage class, DNS, ingress, and networking before mutation. No multi-node or production-HA claim. |
| NFR3.4 | Relational authority | PostgreSQL with Flyway and routine-only Dapper/Npgsql access | Persistent storage, separate application/migration/retention roles, backup/restore, connection limits, tenant negative tests, and no direct application table access. |
| NFR7.2 | Durable messaging | RabbitMQ | Persistent volume, definitions/topology as code, confirms, bounded retry, DLQ/replay, readiness, backup/recovery limits, and no exactly-once claim. |
| NFR3.5 | Document authority | MongoDB | Persistent tenant-scoped document/extraction records, provider-owned access, backup/restore, indexes, and source-version reconciliation. |
| NFR3.6 | Disposable cache | Redis | Tenant-scoped keys and bounded memory/eviction; no authority for membership, purchasing, quota, audit, or recovery. Cold start and outage preserve correctness. |
| NFR3.7 | Retrieval projection | Qdrant | Separate collections per retailer and embedding-model/configuration version, server-owned routing, persistent local storage, rebuild/cutover/rollback, and no client-selected arbitrary collection. |
| NFR11.3 | Experiment/model metadata | MLflow | Persistent metadata linked to checksummed artifacts, local CPU-capable path, promotion/rollback evidence, and failed-run retention. |
| NFR11.4 | Artifact storage | Local S3-compatible object-storage interface | The concrete local implementation remains an implementation selection and must be pinned before deployment. It shall support checksums, scoped credentials, persistent storage, backup/restore, and later provider replacement without changing application contracts. No cloud bucket is provisioned by default. |
| NFR10.3 | Logs and audit investigation | OpenSearch and OpenSearch Dashboards | Persistent but rebuildable indexes, separate log/audit permissions and lifecycle policies, operator-only Dashboards, tenant-authorized audit API, bounded disk, observable lag, and replay. |
| NFR10.4 | Telemetry boundary | OpenTelemetry instrumentation and collection | Collector configuration is pinned, resource-limited, redacted, and bounded. OpenSearch is selected for logs/audit investigation; metrics and trace storage remain an explicit implementation selection and may not be silently inferred from ADR 0019. |
| NFR6.5 | Secrets | HashiCorp Vault with integrated storage plus Vault Secrets Operator | Official pinned charts/images, persistent TLS Vault, protected initialization/manual unseal, scoped Kubernetes auth, VSO-owned synchronized Secrets, rotation/outage/restore tests, and footprint included in quota evidence. |
| NFR8.2 | Contracts | OpenAPI 3.1.x, AsyncAPI 3.0.0, JSON Schema 2020-12 | Exact validators/generators are checksum-pinned; compatibility, examples, tenant context, correlation, idempotency, and problem-details checks block affected changes. |
| NFR13.6 | Policy and provenance | Pod Security Admission, Conftest, SPDX, Trivy, keyless Cosign | Admission uses `restricted`; CI validates rendered manifests and provenance. Release deployment uses verified digests. NetworkPolicy remains a conditional claim until runtime proof passes. |

## Deterministic deployment order

The supported order is preflight and dependency verification; backend selection
and state lock; namespace/RBAC/policy/storage foundations; Vault deployment and
manual bootstrap; Vault configuration and VSO; data, broker, object, search, and
telemetry services; migrations; application services; readiness; deterministic
seed; smoke/evidence. A failed prerequisite stops dependent steps. Cluster
mutations and heavy validation run serially within the 16 GiB/3 CPU envelope.

## Single-node limitations

- Docker Desktop, its Kubernetes node, local state, and host-local persistent
  data share a failure domain. The supported profile demonstrates deterministic
  recovery and rollback, not continuous availability or an SLA.
- Local Terraform locking coordinates processes that share one state path; it is
  not a distributed lock for multiple machines or runners.
- Single instances of Vault, PostgreSQL, RabbitMQ, MongoDB, object storage,
  OpenSearch, and other stateful services can be unavailable during restart,
  upgrade, host sleep, disk pressure, or restore.
- ResourceQuota constrains Kubernetes workloads but cannot reserve host resources
  from non-Kubernetes applications. Evidence must capture Docker Desktop VM and
  host pressure as well as pod metrics.
- Projection rebuilds can extend recovery time. RPO 24 hours and RTO 2 hours are
  drill objectives; a missed objective is evidence, not permission to omit a
  service or claim production resilience.

## Deferred bounded selections

The local S3-compatible object-storage implementation, metrics backend, trace
backend, exact ingress/TLS implementation, persistent-volume sizes, backup expiry,
and every exact tool/chart/image version remain implementation parameters. Each
must be selected, checksum-locked, licensed/terms-documented where applicable,
and validated before its dependent deployment check can pass. These selections
cannot add cloud resources, public exposure, automatic paid-provider fallback,
or a larger resource allocation without explicit owner authorization.
