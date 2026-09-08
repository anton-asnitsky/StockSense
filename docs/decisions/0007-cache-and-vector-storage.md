# ADR 0007: Redis cache and standalone vector storage

Date: 2026-09-08
Status: Redis and standalone vector storage accepted; vector product pending.

## Decision

Use Redis for application caching. Use a separately deployed vector database for
RAG, superseding the earlier Valkey and pgvector proposals. Qdrant is recommended
for evaluation, not yet selected by the owner.

## Cache design

Deploy one Redis instance initially through Terraform/Terragrunt and Helm. Keep
credentials in Vault, restrict network access and apply service ACLs. Use bounded
memory with explicit eviction and TTLs. Treat cached data as disposable; database
records remain authoritative. Tenant-scoped keys are enforced by server code,
not trusted client input. Never expose Redis directly to browsers.

Use cache-aside reads, versioned keys and invalidation after committed changes.
Test stale-fill races, invalidation loss, tenant isolation, cold starts and Redis
outages; fallback must not overload PostgreSQL. Recheck permissions and purchasing
state authoritatively before actions. Keep identity sessions, grants and signing
keys outside the evictable application-cache instance.

## Standalone vector service

The service stores embeddings and source/chunk/version metadata. A trusted backend
retrieval adapter applies tenant and document authorization on every search and
mutation. Tenant filtering alone is not a database-enforced equivalent of SQL RLS.
For Qdrant evaluation, compare shared-collection payload filtering with per-tenant
collections for the three-retailer demo; never accept arbitrary collection names
or search filters from a client. Credentials and privileged operations remain
server-side. Validate authorized retrieval before any chunk enters an LLM prompt.

Version source, chunking and embedding models. Index asynchronously over RabbitMQ,
with idempotent upserts, deletion/replacement handling, reconciliation and a
rebuild procedure. PostgreSQL routines track job state and MongoDB remains the
proposed source-document store. Vector data uses the vector service API; the
PostgreSQL routine-only rule still applies to all PostgreSQL access.

Evaluate retrieval recall, citation accuracy, stale/deleted documents and tenant
leakage. Add the vector service and Redis to the resource budget before deployment;
do not claim they fit the remaining CPU/memory without measurement.

## Reference for proposed vector product

[Qdrant multitenancy](https://qdrant.tech/documentation/manage-data/multitenancy/)
