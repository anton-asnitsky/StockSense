# ADR 0018: Qdrant collections per retailer and embedding version

Date: 2026-09-08
Status: Accepted by the owner.

## Decision

Use separate Qdrant collections for each retailer and embedding-model version.
Include embedding configuration/index generation in collection identity so
incompatible dimensions, preprocessing or replacement indexes cannot be mixed.
The initial EmbeddingGemma/Qwen evaluation uses separate collections per candidate
for every retailer. Shared collections with tenant payload filtering are not the
initial design.

## Authorization and routing

Collection separation is a storage boundary, not automatic authorization. Only
trusted backend services receive Qdrant credentials. Resolve tenant and active
index generation from server-owned configuration/metadata after authenticating
and authorizing the request. Never accept a client/model-provided collection name
or arbitrary Qdrant filter. Enforce document-level permissions before returning
chunks to the agent. Operator-wide credentials are not exposed to application users.

Retain tenant, source-document/version and chunk metadata for validation and
provenance. Query embeddings must match the routed collection's model/configuration.
Fail explicitly when no valid tenant index is available; never fall back to another
retailer's collection or a shared unfiltered search.

## Index lifecycle and acceptance

Build replacement collections separately, validate completeness and retrieval,
then switch the server-owned active-index mapping. Keep rollback to a compatible
prior generation explicit. Reconcile deletion/revocation with old generations so
rollback cannot re-expose removed documents. Retire indexes through controlled
cleanup; use repeatable job IDs and idempotent writes for RabbitMQ retries.

SS-33 implements collection provisioning/routing and versioned reindexing. SS-34
tests cross-tenant identifiers, arbitrary collection names, wrong-model queries,
deleted documents and missing-index behavior. SS-27 includes collection routing
and ownership in the tenant migration procedure. SS-24 measures collection/index
overhead within the existing local resource budget.

This confirms the three-retailer demo layout, not a claim that collection-per-tenant
is the best layout at every scale. Revisit only with measured scale requirements.
