# Demo Evidence Technology Decisions

Unit: U13 Demo Evidence (`demo-evidence`)

## Decisions

| Concern | Selection | Rationale and constraints |
| --- | --- | --- |
| Harness runtime | Python 3.12 with a locked `uv` environment | The project already requires Python for ML services, and one cross-platform runtime can implement deterministic orchestration, schema validation, hashing, redaction, sampling, and reporting on the reviewer host. Exact patch and package hashes are pinned before implementation. |
| Command interface | Typed Python CLI with Typer and a closed in-code command registry | Exposes versioned `preflight`, `download`, `deploy`, `seed`, `smoke`, `full`, `profile`, `backup`, `recover`, `rollback`, and `collect-evidence` commands. Manifests select IDs and structured arguments; they never supply arbitrary shell. |
| Configuration and validation | Pydantic models plus JSON Schema 2020-12 validation for C19 and scenario/command profiles | Provides closed schemas, bounded values, clear validation errors, and generated examples. U13 owns C19 semantics and approved examples; U1 owns canonical packaging, generated schema, and validation distribution. Unknown fields and outcome values fail closed. |
| Dependency and input lock | `uv.lock` plus a checksummed dependency/model/tool manifest | Pins Python packages, downloaded binaries, models, charts, images, browser artifacts, licenses/terms references, and source URLs without requiring an owner cache. |
| Dataset generation | Versioned Python generator using an explicit deterministic PRNG, stable locale/time-zone inputs, canonical JSON Lines, and SHA-256 | Produces repeatable logical datasets and per-tenant/whole-scenario hashes while retaining true-demand/evaluation fields separately from model inputs. Canonicalization rules are versioned and narrowly exclude declared volatile metadata. |
| Browser validation | Consume U12 Playwright, axe-core, browser-matrix, and sanitized trace/report outputs through their supported test entry points | Avoids a second browser automation stack and proves the same deployed same-origin UI. U13 orchestrates and packages results but does not duplicate U12 assertions or hold browser tokens. |
| API and load validation | k6 for the five-session API/read profile and existing generated clients/contract fixtures for functional probes | Provides repeatable request mixes and latency percentiles with bounded virtual users. Governed mutations use explicit fixture code and idempotency; no generic load script replays them. |
| Harness tests | pytest, pytest-timeout, Hypothesis for schema/profile properties, and golden sanitized C19 fixtures | Covers command allowlisting, determinism, canonical hashing, redaction, six-state outcomes, interruption, timeouts, invalid contracts, missing artifacts, and report generation. |
| Resource collection | Python `psutil`, Docker Engine statistics, Kubernetes API status/resource data, filesystem/PVC probes, and RabbitMQ Management API queue metrics | Supports one-second host/VM/container/workload sampling and records source availability and gaps. Configured requests/limits and actual usage are separate measurements. |
| Timekeeping | UTC wall-clock timestamps plus monotonic elapsed timers | Prevents clock adjustment from corrupting duration while retaining auditable start/end instants. Host clock source and skew check are recorded in the environment fingerprint. |
| Evidence format | Versioned C19 JSON manifest, canonical JSON for signing, CSV/JSON measurements, JUnit XML test reports, Markdown summaries, and small SVG/PNG charts | Keeps machine and human evidence linked. Every published artifact carries SHA-256 and media type; success is derived from the check result, not artifact presence. |
| Manifest signing | Cosign blob signing and verification | Trusted release evidence uses keyless GitHub Actions OIDC identity and a verification policy. Local clean runs generate an ephemeral run key, publish only its public key, and label the manifest `local-reviewer`; they cannot claim trusted release provenance. |
| Redaction and secret scanning | Central allowlist-first redaction pipeline plus Gitleaks/Trivy secret checks and seeded canary tests | One output gate scans manifests, logs, Markdown, JSON, charts, browser artifacts, and CI output before publication. Raw values are not copied into redaction diagnostics. |
| Vault/VSO evidence | Supported U2 Vault and Vault Secrets Operator status/policy interfaces plus Kubernetes metadata; value reads are prohibited | Records safe state, policy and resource identifiers, generations, rotation versions, denial outcomes, synchronization/reload observations, and recovery checksums without exposing secrets or recovery material. |
| Infrastructure entry points | Checked-in Terraform/Terragrunt and Helm commands supplied by U2; kubectl and Flyway only through owned platform profiles | U13 orchestrates supported operations and captures evidence without owning IaC, migrations, state, or cluster credentials. Cloud targets require separate explicit authorization. |
| Service and messaging contracts | U1 OpenAPI 3.1, AsyncAPI 3.0, JSON Schema 2020-12, generated clients, and compatibility reports | The harness cannot invent a missing operation, event, error, or state. Contract validation runs before any dependent scenario. |
| Local AI execution | Validated CPU-capable Qwen generation profile and compatible EmbeddingGemma/Qwen embedding profiles; Bedrock opt-in only | The reviewer chooses among available pinned local profiles. The manifest records runtime, model, license, checksum, quantization/dimensions, and actual inference. There is no automatic remote fallback. |
| Public evidence location | Stable repository index with compact revision directories; external raw-artifact store for bulky/sensitive data | Git contains reviewable manifests, summaries, tables, sanitized excerpts, reports, and charts. Raw traces, media, backups, models, and sensitive diagnostics remain external with 30-day default retention and explicit expired/unavailable status. |
| CI execution | GitHub Actions hosted runners for PR validation; isolated self-hosted local runner for protected real-cluster evidence | Prevents public PR code from reaching Docker Desktop Kubernetes, Vault, Terraform state, backups, or deployment credentials. Full and recovery tiers run for release evidence. |

## Command profile

The checked-in command profile is data, not executable code. Each entry maps a
stable ID to an implementation compiled into the harness:

| Command | Side-effect class | Required authority | Deadline/evidence |
| --- | --- | --- | --- |
| `preflight` | read-only | none beyond local inspection | Versions, limits, network/model prerequisites, clock, clean state |
| `download` | bounded external read and local artifact write | public source or explicit provider credential | Source, license, bytes, checksum, elapsed time |
| `deploy` | cluster/IaC mutation | protected local runner and U2 profile | Revision, state backend, plan/diff, lock, migration, readiness |
| `seed` | application mutation | seeded operator through supported API | Scenario hash, idempotency, accepted/rejected counts |
| `smoke` | bounded application interaction | seeded user/service authority | Step outcomes, versions, correlation, 15-minute deadline |
| `full` | bounded validation suite | seeded users plus narrow operator controls | Capability matrix, 45-minute deadline after readiness |
| `profile` | bounded load and observation | read/test profiles only | One-second samples, 30 minutes, thresholds and peaks |
| `backup` | protected persistence read/write | U2/U10 backup profiles | Scope, revision, encryption, checksum, expiry |
| `recover` | destructive isolated-environment reconstruction | approved release drill | RPO/RTO, restore/rebuild/replay order, smoke result |
| `rollback` | protected deployment mutation | approved release drill | Old/new revisions, contract/schema compatibility, elapsed time |
| `collect-evidence` | local read and publication write | evidence publisher profile | Validation, redaction, canonicalization, hashes, signature |

All subprocess calls use argument arrays, explicit working directories,
allowlisted environment-variable names, fixed executable identities, output
caps, cancellation, and per-command deadlines. No command value is evaluated
by a shell.

## Reference host and portability

The initial verified reference is Windows 11 x64 with WSL2-backed Docker
Desktop Kubernetes and the configured 16 GiB/3 CPU limit. The Python harness
and schema/report layers remain cross-platform, but macOS or native Linux is
supported only after a clean run records a separate passing host profile.
Docker Desktop, WSL, Kubernetes, filesystem, CPU architecture, free disk,
network, and virtualization details are part of the environment fingerprint.

## Rejected alternatives

- Free-form YAML/shell workflows are excluded because a manifest must not
  become an arbitrary-code execution surface.
- Direct database, MongoDB, Qdrant, Redis, object-store, OpenSearch, RabbitMQ,
  or Kubernetes-secret writes are excluded because U13 verifies supported
  boundaries and owns no business or platform state.
- A handwritten README-only result is excluded because claims require
  machine-readable revision-bound evidence.
- Git LFS for backups, models, raw browser traces, and complete logs is excluded
  because it expands the public data and supply-chain surface and does not
  replace retention or access control.
- One opaque all-or-nothing script is excluded because phase timing, partial
  failure, recovery, and six-state outcomes must remain visible.
- A second UI automation framework is excluded; U13 consumes the U12
  Playwright/axe evidence contract.
- Owner caches, GPU-only execution, automatic Bedrock fallback, mutable model
  aliases, and unchecksummed downloads are excluded from the clean-reviewer
  path.

## Implementation parameters to pin

Pin Python and `uv`, Typer, Pydantic, JSON Schema validator, pytest,
Hypothesis, k6, Playwright/browser artifacts consumed from U12, Cosign,
Gitleaks, Trivy, GitHub Actions, Docker Desktop/WSL/Kubernetes, Terraform,
Terragrunt, Helm, kubectl, Flyway, Vault/VSO, RabbitMQ management API,
OpenTelemetry/resource sources, chart/image/model digests, Qwen and embedding
profiles, canonicalization version, command deadlines, output caps, network
reference, raw-artifact location/retention, signing identities, and every
verification-policy checksum. Version changes require a new environment or
profile fingerprint and cannot rewrite prior evidence.
