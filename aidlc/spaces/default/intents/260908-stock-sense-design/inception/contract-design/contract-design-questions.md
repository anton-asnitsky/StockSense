# StockSense contract-design questions

Date: 2026-09-10
Stage: Contract Design
Status: Awaiting owner answers

These questions define the formal REST and asynchronous agreements between the approved units. Existing decisions already require OpenAPI for every REST boundary, AsyncAPI for every RabbitMQ boundary, a dedicated Contracts specification unit, a browser-only Web BFF boundary, strict tenant validation, and no cross-unit storage access.

## Q1. Externally consumed HTTP surface

The React client is already required to call only the Web BFF. Should the first release expose any other application API to consumers outside StockSense?

- A. Expose only the Web BFF to the browser; keep domain APIs cluster-internal and document Google OIDC plus optional model providers as external dependencies rather than public StockSense APIs (Recommended)
- B. Also expose selected read-only domain APIs for portfolio demonstrations
- C. Publish a general external partner API in the first release
- X. Other (please specify)

[Answer]: A. Expose only the Web BFF to the browser; keep domain APIs cluster-internal and document Google OIDC plus optional model providers as external dependencies rather than public StockSense APIs (Recommended)

## Q2. Specification versions

OpenAPI 3.2.0 is the current published OpenAPI version, while ASP.NET Core .NET 10 generates OpenAPI 3.1 by default; AsyncAPI 3.0.0 is the current published AsyncAPI specification. Which compatibility baseline should StockSense use?

- A. OpenAPI 3.1.x and AsyncAPI 3.0.0, with exact patch/tool versions pinned in the repository (Recommended)
- B. OpenAPI 3.2.0 and AsyncAPI 3.0.0, accepting newer-tooling compatibility work
- C. OpenAPI 3.0.x and AsyncAPI 2.6.x for older tooling compatibility
- X. Other (please specify)

[Answer]: A. OpenAPI 3.1.x and AsyncAPI 3.0.0, with exact patch/tool versions pinned in the repository (Recommended)

References: [OpenAPI 3.2.0 specification](https://spec.openapis.org/oas/latest.html), [ASP.NET Core OpenAPI support](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/openapi/aspnetcore-openapi?view=aspnetcore-10.0), [AsyncAPI 3.0.0 specification](https://www.asyncapi.com/docs/reference/specification/v3.0.0).

## Q3. Specification partition and ownership

The Contracts unit is the canonical specification package, but providers must remain accountable for the semantics they implement. How should documents and ownership be divided?

- A. One OpenAPI document per provider service and one AsyncAPI document per event-producing service; the provider owns semantics, while the Contracts unit owns canonical packaging, validation, and release governance (Recommended)
- B. One monolithic OpenAPI document and one monolithic AsyncAPI document owned entirely by the Contracts unit
- C. One separate specification for every provider-consumer edge, jointly owned by both units
- X. Other (please specify)

[Answer]: A. One OpenAPI document per provider service and one AsyncAPI document per event-producing service; the provider owns semantics, while the Contracts unit owns canonical packaging, validation, and release governance (Recommended)

## Q4. Synchronous API style

StockSense includes resource queries, state transitions, uploads, and long-running jobs. Which HTTP pattern should be consistent across services?

- A. Resource-oriented REST for reads and CRUD, explicit command subresources for governed transitions, multipart uploads where needed, and `202 Accepted` plus a job resource for long-running work (Recommended)
- B. RPC-style POST endpoints for every operation
- C. REST resources only, representing every transition as ordinary resource replacement
- X. Other (please specify)

[Answer]: A. Resource-oriented REST for reads and CRUD, explicit command subresources for governed transitions, multipart uploads where needed, and `202 Accepted` plus a job resource for long-running work (Recommended)

## Q5. Asynchronous contract shape

RabbitMQ carries durable jobs and domain/audit events. How should these message categories be represented?

- A. Separate command/job and immutable event message types, all using one versioned envelope with message, tenant, actor, correlation, causation, idempotency, occurrence, and schema metadata (Recommended)
- B. Use domain events only; workers infer requested jobs from state changes
- C. Use command messages only; consumers query current state instead of receiving domain events
- X. Other (please specify)

[Answer]: A. Separate command/job and immutable event message types, all using one versioned envelope with message, tenant, actor, correlation, causation, idempotency, occurrence, and schema metadata (Recommended)

## Q6. API and message evolution

How should StockSense handle compatible additions, deprecation, and unavoidable breaking changes?

- A. Major API version in the HTTP path, semantic specification versions, additive changes within a major version, time-bounded deprecation, and immutable event schemas with a new type or major schema version for breaking changes (Recommended)
- B. Semantic versions only in document metadata, with unversioned HTTP paths and message types
- C. Replace contracts in place and coordinate all consumers in one release
- X. Other (please specify)

[Answer]: A. Major API version in the HTTP path, semantic specification versions, additive changes within a major version, time-bounded deprecation, and immutable event schemas with a new type or major schema version for breaking changes (Recommended)

## Q7. Errors, timeouts, and retries

Remote failures must remain explicit without causing duplicate business effects. Which common policy should every synchronous contract adopt?

- A. RFC 9457 Problem Details with stable error codes and correlation IDs; declared per-operation timeouts; automatic retries only for safe/idempotent operations; mutation retries require the same idempotency key and request hash (Recommended)
- B. Service-specific error bodies and retry decisions
- C. Return HTTP 200 for business failures and encode success/failure in each response body
- X. Other (please specify)

[Answer]: A. RFC 9457 Problem Details with stable error codes and correlation IDs; declared per-operation timeouts; automatic retries only for safe/idempotent operations; mutation retries require the same idempotency key and request hash (Recommended)

## Q8. Tenant and authority context across services

Client-supplied retailer identifiers must never become authority by themselves. How should contracts carry and validate tenant context?

- A. Put the retailer identifier in the resource route where applicable; authenticate the caller separately; revalidate current membership in the authoritative service; propagate retailer, actor, placement generation, and correlation metadata on internal calls/messages without trusting arbitrary browser headers (Recommended)
- B. Treat a signed access-token retailer claim as sufficient authority until token expiry
- C. Trust a gateway-injected retailer header in downstream services without further membership validation
- X. Other (please specify)

[Answer]: A. Put the retailer identifier in the resource route where applicable; authenticate the caller separately; revalidate current membership in the authoritative service; propagate retailer, actor, placement generation, and correlation metadata on internal calls/messages without trusting arbitrary browser headers (Recommended)

## Ambiguity Scan

The selected answers are mutually consistent and cover the required contract boundaries. No unresolved ambiguity blocks contract generation. Exact OpenAPI 3.1 patch and validator/tool versions will be selected and pinned with the canonical contract package; this is an implementation-level compatibility choice within the approved baseline.

## Consolidated Summary

- **External surface:** The browser accesses StockSense only through the Web BFF. Domain APIs remain cluster-internal. Google OIDC and optional local or managed model providers are documented as external dependencies.
- **Specification baseline:** REST contracts use OpenAPI 3.1.x and asynchronous contracts use AsyncAPI 3.0.0. Exact patch and tool versions are pinned in the repository.
- **Partition and ownership:** Each provider service owns the semantics of its OpenAPI document, and each event producer owns the semantics of its AsyncAPI document. The Contracts unit owns canonical packaging, validation, and release governance.
- **Synchronous style:** APIs use resource-oriented REST for reads and CRUD, explicit command subresources for governed state transitions, multipart uploads where required, and `202 Accepted` with job resources for long-running work.
- **Asynchronous style:** RabbitMQ uses distinct job/command and immutable event message types with a shared versioned envelope carrying message, tenant, actor, correlation, causation, idempotency, occurrence, and schema metadata.
- **Evolution:** API major versions appear in HTTP paths. Specifications use semantic versions, compatible additions remain within a major version, deprecations are time-bounded, and breaking event changes require a new event type or major schema version.
- **Failures and retries:** APIs use RFC 9457 Problem Details, stable error codes, correlation IDs, and declared operation-specific timeouts. Automatic retries are limited to safe or idempotent operations; mutation retries reuse the same idempotency key and request hash.
- **Tenant authority:** Retailer identifiers appear in applicable resource routes but never grant authority by themselves. Services authenticate callers, revalidate current retailer membership at the authoritative boundary, and propagate retailer, actor, placement generation, and correlation metadata internally without trusting arbitrary browser headers.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
