# Contracts Technology Stack Decisions

Unit: U1 Contracts (`contracts`)

Sources: confirmed Contracts Functional Design and NFR Requirements questionnaires, inception NFR7-NFR8, NFR11, NFR13, and NFR15, and Contract Design C01/C15.

## Decision boundary

These decisions fix the contract formats and toolchain for U1. Exact versions are repository pins, not floating recommendations. Provider services and message producers retain semantic ownership; U1 owns canonical packaging, validation, compatibility checks, generation inputs, and release evidence. Generated runtime code remains consumer-local.

## Confirmed formats and tools

| ID | Selection | Exact baseline | Purpose and rationale | Acceptance evidence and failure behavior |
| --- | --- | --- | --- | --- |
| NFR8.3 | OpenAPI | 3.1.2 | Canonical synchronous REST descriptions with JSON Schema 2020-12 alignment. | Every OpenAPI document declares 3.1.2 and passes pinned lint, bundle, reference, example, and compatibility checks. Any other version or unresolved reference fails validation. |
| NFR7.2 | AsyncAPI | 3.0.0 | Canonical RabbitMQ job/event descriptions while preserving producer-owned semantics. | Every async document declares 3.0.0 and passes syntax, reference, example, operation, and diff checks. Missing reliability/envelope policy or an incompatible change blocks integration. |
| NFR8.4 | JSON Schema | 2020-12 | Shared envelopes, payloads, manifests, and concrete example validation. | Every schema declares or resolves to the approved dialect; invalid examples fail for the declared reason. Unsupported dialects and ambiguous external references fail closed. |
| NFR8.5 | Redocly CLI | `@redocly/cli` 2.51.2 | OpenAPI linting and deterministic bundling. | The exact package version is lockfile-pinned; clean CI emits the version and bundled-output digest. Lint/bundle errors or drift fail the run. |
| NFR8.6 | AsyncAPI CLI | `@asyncapi/cli` 6.0.2 | AsyncAPI validation and diffing, and the approved message-model generation entry point. | The exact version is lockfile-pinned and recorded in validation/generation evidence. Validation, diff, or generation failure blocks the applicable check. |
| NFR8.7 | Ajv and formats | Ajv 8.20.0; `ajv-formats` 3.0.1 | JSON Schema 2020-12 and positive/negative example validation. | CI records both exact versions and executes every declared fixture oracle. A valid fixture failure, invalid fixture success, or undeclared failure reason fails validation. |
| NFR8.8 | OpenAPI compatibility | `oasdiff` 1.28.0 | Dedicated breaking-change detection against the actual Git integration baseline. | Story branches compare with the Bolt branch, Bolt PRs with `main`, and releases with the latest release tag. An unresolved baseline or unapproved break fails closed. |
| NFR8.9 | Service client generation | Kiota 1.35.0 | Consumer-local typed service clients without a mandatory shared runtime library. | The exact generator, canonical source digest, configuration digest, and output digest are recorded. Clean regeneration must match normalized tracked output; missing or stale output fails CI. |
| NFR8.10 | Browser/BFF type generation | `openapi-typescript` 7.13.0 | Consumer-local TypeScript types for browser/BFF boundaries. | The exact version and all generation digests are recorded; manual edits and regeneration drift fail CI. |
| NFR11.2 | Reproducible installation | Repository manifests and lockfiles with exact versions; clean ephemeral CI installation | Makes validation and generation repeatable without owner cache, credentials, model, or GPU. | A clean hosted run installs only locked versions and emits each tool version. Missing lock data, floating tags, checksum failure where supplied, or environment-only success fails reproducibility. |
| NFR13.4 | CI trust split | GitHub-hosted unprivileged public-PR validation; isolated trusted release/deployment runner | Allows semantic checks on untrusted input without exposing deployment authority. | Public PR jobs have no deployment secrets, write-capable release token, self-hosted labels, arbitrary hooks, or unrestricted references. Any violation blocks before tool execution. |
| NFR13.5 | Supply-chain gates | Machine-readable SBOM, secret scan, vulnerability scan, and finding-specific expiring exceptions | Makes the pinned toolchain reviewable and blocks known remediable Critical/High risk. | CI retains the SBOM and scan results, reports zero unresolved secrets, blocks Critical/High findings with a fix available, and rejects absent/expired/mismatched exceptions. |
| NFR15.3 | Release digest manifest | SHA-256 manifest | Binds the release to its immutable revision, inputs, tools, configurations, outputs, SBOM, and validation result. | A clean verification recalculates every digest. Missing entries or any mismatch reject the package and cannot be waived. |
| NFR15.4 | Release provenance | GitHub artifact attestation | Supplies repository/workflow provenance for the exact published package. | Consumer verification checks attestation identity and subject digest before manifest verification. Missing, unverifiable, or mismatched attestation rejects the package. |
| NFR7.3 | C15 contract baseline | C15 v2 on AsyncAPI 3.0.0 and JSON Schema 2020-12 | Resolves producer binding, SHA-256 digest, 64 KiB envelope, five-attempt delivery, seven-day DLQ retention, and bounded audited replay for every downstream unit. | CI validates the binding construction delta, rejects the unresolved v1 retry placeholder for new consumers, and proves the one-release legacy-adapter window cannot bypass identity, digest, size, retry, or replay controls. |
| NFR8.11 | C18 browser API baseline | C18 v2 on OpenAPI 3.1.2 | Supplies generated browser/BFF contracts for `/signin-oidc`, CSRF bootstrap/rotation, all mutations and idempotent commands, typed HTTP `200` dashboard state, operation reconciliation, SSE/snapshot, bounded audit queries, evidence, limits, and RFC 9457 errors. | Generated clients and negative examples fail when any mutation lacks CSRF, any command lacks idempotency, HTTP `206` remains, or required operation/state/error schemas are absent. |
| NFR15.5 | C19 evidence baseline | C19 v2 on JSON Schema 2020-12 | Establishes the six-state evidence model while preserving U13 semantic ownership and U1 packaging/validation ownership. | Compatibility tests retain C19 v1 as explicitly legacy, validate all six outcomes and metadata, and reject reinterpretation or silent upgrade of old evidence. |

## Compatibility and generation rules

- Additive optional changes may remain within a major version when the approved compatibility policy permits them and consumers tolerate unknown fields.
- Breaking HTTP changes require a new major path and explicit owner approval; breaking message changes require a new message type or major routing identity. Published event schemas remain immutable.
- Kiota, `openapi-typescript`, and AsyncAPI-generated outputs live inside the consuming unit. Canonical sources and generator configuration live with U1; no shared runtime contract package may take over provider semantics.
- Generation runs in a clean temporary directory. Only explicitly declared nondeterministic metadata may be normalized; executable meaning and source-derived content may not be suppressed.
- Tool versions, source/configuration/output digests, and compatibility baselines are part of immutable validation evidence.
- C15 v2, C18 v2, and C19 v2 are the required construction baselines. Their semantic owners approve meaning; U1 enforces packaging, validation, compatibility, examples, and generated-output drift.

## Required execution order and failure semantics

1. Establish the immutable candidate revision and applicable baseline.
2. Install exact locked tools on the appropriate trust path and record versions.
3. Enforce public-PR isolation, reference restrictions, hook disablement, and secret scanning before processing untrusted content.
4. Lint, bundle, validate schemas/examples, regenerate consumer-local outputs, and run compatibility checks.
5. Produce the SBOM and vulnerability result; apply only current, finding-specific recorded exceptions.
6. Fail the validation run when any required result failed, is missing, is stale, or did not run.
7. For a trusted release only, create the SHA-256 manifest, create the GitHub artifact attestation, and verify both from a clean consumer context before publication.

No later step converts an earlier failure into success. In particular, an exception cannot authorize a secret, digest mismatch, missing attestation, wrong provenance identity, unresolved compatibility baseline, or unapproved breaking change.

## Open limitations and deferred selections

- No additional validator or generator may replace the confirmed tools without a new reviewed decision and regenerated compatibility/drift evidence.
- Node.js, .NET SDK, container image, operating-system runner image, SBOM generator, vulnerability scanner, secret scanner, attestation action, and their exact versions are not yet selected. NFR Design/CI Design must pin them before implementation evidence can pass.
- The exact AsyncAPI message-model template/package remains to be selected under the confirmed `@asyncapi/cli` 6.0.2 entry point; it must be integrity-pinned, hook-free for public PRs, and consumer-local.
- Numeric resource limits for untrusted schemas and generators remain open and must be bounded before enabling public contribution checks.
