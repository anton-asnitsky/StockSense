# Assistant Technology Decisions

Unit: U9 Assistant (`assistant`)

## Decisions

| Concern | Selection | Rationale and constraints |
| --- | --- | --- |
| Agent harness | Python service using Strands Agents SDK behind a provider-neutral application boundary | Implements typed tool orchestration, streaming, provider adapters, and evaluation while keeping business authority in domain services. Pin Python, Strands, package lock, locale, time-zone data, and base image. |
| Local generation | Checked-in compatible Qwen profile registry with reviewer-selected quantized artifact/runtime | The executing reviewer chooses the exact supported profile from reproducible CPU benchmarks. Every profile pins model/runtime/container versions, checksums, terms, context, prompt template, tool format, resource envelope, and download instructions. |
| Optional external generation | Bedrock adapter conforming to C21, disabled by default | Requires explicit deployment configuration, Vault credentials, region/model allowlist, spend policy, and a new conversation binding. It is never an automatic fallback. |
| Orchestration API | FastAPI/ASGI service with durable turn jobs and ordered streaming endpoints | Provides typed OpenAPI, short admission, status/stream sequencing, cancellation, and explicit terminal states while long work runs through bounded workers. |
| Assistant authority | PostgreSQL U9 schema behind parameterized stored procedures/functions and Flyway | Owns conversations, turns, summaries, attempts, tools, citations, action drafts, GenUI, reconciliation, evaluation, audit, and outbox/inbox. The pinned Python driver invokes routines only; direct table SQL is denied. |
| Messaging | RabbitMQ transactional outbox/inbox with confirms, bounded retries, DLQ, and audited replay | Provides durable turn and audit work under at-least-once delivery while stable identities and business idempotency prevent duplicate tools or side effects. |
| Transient coordination | Redis for bounded queue/stream coordination and disposable authorized cache only | Redis never owns conversation, authority, confirmation, citation, invocation, or side-effect outcome. Loss falls back to durable state or explicit unavailability. |
| Retrieval | Typed C12 Supplier Knowledge API; no direct Qdrant, MongoDB, object, or source-store access | Supplier Knowledge owns EmbeddingGemma/Qwen embedding selection, collections, source lifecycle, retrieval, and citations. Assistant applies its eight-chunk/ten-citation response bounds and revalidates exact versions. |
| Domain tools | Generated typed clients for C11-C14 plus server-owned allowlist | Actor/tenant/placement and hidden arguments are injected by trusted code. Planning/Purchasing owns manual-review allowance and Draft create/edit; prohibited purchase transitions are absent. |
| GenUI | JSON Schema 2020-12 presentation documents rendered by the React/Ant Design web application through a server-owned component/action registry | Model output selects only validated declarative IDs and typed data. The browser executes no model code or hidden mutation fields and preserves accessible text/keyboard behavior. |
| Evaluation | Versioned JSON/JSONL scenario corpus and deterministic harness integrated with pytest and evidence manifests | Runs 100+ valid/adversarial cases against each profile and release-gates safety, confirmations, citations, usefulness, latency, and resources without storing hidden reasoning. |
| Contracts | OpenAPI 3.1, AsyncAPI 3.0, JSON Schema 2020-12 | Defines turns, streams, tools, provider ports, GenUI, evaluations, audit events, bounds, versions, and stable errors. |
| Telemetry and audit | OpenTelemetry to OpenSearch/Dashboards; PostgreSQL/outbox remains authoritative business audit | Correlates provider, turn, tool, citation, action, evaluation, recovery, and resource evidence without using search projections to authorize work. |
| Identity, secrets, and transport | Duende/BFF human session, narrow workload tokens, Vault/VSO, TLS 1.2+, encrypted persistence | Separates human confirmation from machine execution and protects local/optional external provider credentials and data. |
| Deployment | Helm on Docker Desktop Kubernetes with Terraform/Terragrunt platform orchestration | Reproduces local CPU resources, optional GPU configuration, persistent dependencies, model acquisition, contracts, evaluation, and recovery. |

## Rejected alternatives

Model-native or free-form tools, direct domain/database/vector/object access,
model-selected tenant/provider/index, automatic Bedrock fallback, unbounded
prompts or queues, model-produced executable UI, implicit side effects,
uncited authoritative claims, hidden-reasoning persistence, fixture-only AI
proof, and owner-GPU-only acceptance are excluded.

## Implementation parameters to pin

Pin Python, Strands, FastAPI/ASGI, provider adapters, tokenizer/template,
quantization/runtime builds, PostgreSQL/RabbitMQ/Redis clients, OpenTelemetry,
contract/evaluation tooling, model and container checksums, model terms,
thread/CPU/GPU settings, context and batch sizes, connection pools, queue and
lease settings, certificate trust, encryption, stream protocol, GenUI schemas,
redaction rules, and cleanup schedules for every supported profile.
