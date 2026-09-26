# Supplier Knowledge Technology Decisions

Unit: U5 Supplier Knowledge (`supplier-knowledge`)

## Decisions

| Concern | Selection | Rationale and constraints |
| --- | --- | --- |
| Service runtime | .NET control/API boundary plus Python ingestion, embedding, and retrieval worker | The .NET boundary owns PostgreSQL accepted-term/fence access through Dapper; Python owns document/model adapters without direct PostgreSQL table access. Contracts and RabbitMQ preserve the unit boundary. |
| Source metadata | MongoDB with transactional source-state outbox | Owns versioned submissions, attempts, extraction, diagnostics, candidates, chunks, tombstones, and cleanup state. |
| Original bytes | S3-compatible local object storage | Stores immutable CSV/PDF bytes; MongoDB retains references and SHA-256 checksums. |
| Accepted terms/fence | PostgreSQL behind the .NET Dapper/Npgsql boundary, stored procedures/functions, and Flyway | Keeps commercial authority and deletion dependency fence transactional and routine-only; Python workers use versioned service/message contracts and never access PostgreSQL tables directly. |
| Vectors | Stand-alone Qdrant | Rebuildable tenant/model/config-specific projection with server-owned generation routes. |
| Embeddings | EmbeddingGemma-300M and Qwen3-Embedding-0.6B candidates | Separate collections and held-out English evaluation select one default; ordinary retrieval never queries both. |
| Messaging | RabbitMQ transactional outbox/inbox | Coordinates stores/projections without distributed transactions and supports bounded retry/DLQ/replay. |
| Contracts | OpenAPI 3.1, AsyncAPI 3.0, JSON Schema 2020-12 | Formal versioned boundaries, examples, compatibility, provenance, and stable errors. |
| Telemetry | OpenTelemetry plus OpenSearch/Dashboards | Portable signals and portfolio evidence; authoritative audit remains in owning stores/outboxes. |
| Secrets | Vault and Vault Secrets Operator | Workload-scoped credentials outside Git and Terraform state. |
| Deployment | Helm on Docker Desktop Kubernetes; Terraform/Terragrunt platform | Approved reproducible local cloud-native profile and resource envelope. |

## Rejected alternatives

Distributed MongoDB/PostgreSQL transactions, Qdrant authority, in-place active
index rebuild, client-selected collections, silent translation, OCR, and model
generated commercial truth are excluded.

## Implementation parameters to pin

Pin Python/framework, MongoDB driver/server, PostgreSQL client/Flyway, RabbitMQ,
Qdrant client/server, object-store client/server, PDF/CSV parser, tokenizer,
EmbeddingGemma/Qwen artifacts, OpenTelemetry, base images, and contract tools.
Record model dimensions, preprocessing, chunking, batch sizes, timeouts,
connection pools, object encryption, and cleanup schedules.
