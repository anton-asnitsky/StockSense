# StockSense contract-design questions

Date: 2026-09-24
Stage: Contract Design
Status: Awaiting renewed summary confirmation after owner-requested contract changes

These questions define the formal REST and asynchronous agreements between the approved units. Existing decisions already require OpenAPI for every REST boundary, AsyncAPI for every RabbitMQ boundary, a dedicated Contracts specification unit, a browser-only Web BFF boundary, strict tenant validation, and no cross-unit storage access.

Questions Q1-Q8 retain the owner's confirmed answers from the original 13-unit design. Questions Q9-Q12 cover only the contract decisions introduced or exposed by the approved 15-unit revision.

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

## Q9. Cross-language Messaging Platform compatibility

The Messaging Platform unit (U14) supplies equivalent reusable RabbitMQ mechanics to .NET and Python services while the Contracts unit (U1) remains authoritative for envelopes and AsyncAPI schemas. How should specification and package compatibility be versioned?

- A. Give the U1 protocol its own semantic version and let U14's .NET and Python packages version independently; every package declares its supported protocol range and must pass the same cross-language conformance fixtures (Recommended)
- B. Use one lockstep version for the protocol specification and both language packages
- C. Generate source adapters directly into each service without versioned reusable packages
- X. Other (please specify)

[Answer]: A. Give the U1 protocol its own semantic version and let U14's .NET and Python packages version independently; every package declares its supported protocol range and must pass the same cross-language conformance fixtures (Recommended)

## Q10. Recovery progress delivery to the browser

Recovery is long-running, but the first release must remain portable and resource-conscious. How should the Operator receive progress through the Web BFF?

- A. The BFF starts recovery through U15's REST API, receives `202 Accepted` with a job resource, and polls a versioned status/manifest endpoint; participant commands and acknowledgements still use RabbitMQ except for the approved synchronous Identity Access and Tenant Directory bootstrap ports (Recommended)
- B. Add Server-Sent Events from the BFF for progress, retaining GET polling as a fallback
- C. Add a WebSocket recovery channel in the first release
- X. Other (please specify)

[Answer]: A. The BFF starts recovery through U15's REST API, receives `202 Accepted` with a job resource, and polls a versioned status/manifest endpoint; participant commands and acknowledgements still use RabbitMQ except for the approved synchronous Identity Access and Tenant Directory bootstrap ports (Recommended)

## Q11. Destructive recovery confirmation

An Operator must explicitly confirm a destructive snapshot or recovery action after reviewing its scope and manifest summary. What should bind that confirmation to the reviewed operation?

- A. Use a short-lived, single-use server token bound to the Operator, retailer, operation, manifest digest, and expected placement/recovery generation; the command also carries an idempotency key, and stale or mismatched confirmation returns `409` (Recommended)
- B. Accept a boolean `confirmed: true` in the recovery request after showing the preview
- C. Require the browser to sign the manifest summary before submission
- X. Other (please specify)

[Answer]: A. Use a short-lived, single-use server token bound to the Operator, retailer, operation, manifest digest, and expected placement/recovery generation; the command also carries an idempotency key, and stale or mismatched confirmation returns `409` (Recommended)

## Q12. Recovery participant roster

The coordinator must know every required participant before it may prepare a consistent PostgreSQL/RabbitMQ cut. How should the required roster be established for each run?

- A. U15 owns a versioned policy roster; deployed participants register their identity, protocol version, command route, acknowledgement route, and deadline class; each run snapshots the required roster and stops before prepare if any required registration is missing or incompatible (Recommended)
- B. Build each run's roster only from whichever participants register dynamically during the registration window
- C. Keep a static code list in the coordinator and do not require participant capability registration
- X. Other (please specify)

[Answer]: A. U15 owns a versioned policy roster; deployed participants register their identity, protocol version, command route, acknowledgement route, and deadline class; each run snapshots the required roster and stops before prepare if any required registration is missing or incompatible (Recommended)

## Owner-directed revision — 2026-09-24

The owner requested changes to resolve all four findings R-01 through R-04 from the Contracts Functional Design review. The previously approved answers remain in force. This revision will (1) align all inline OpenAPI examples to the confirmed 3.1.2 patch baseline, (2) define C24's durable success and RFC 9457 error schemas with positive and negative fixtures, (3) extend C01's versioned, closed package manifest to locate and validate governed sidecars including C22/C23 and recovery policy, and (4) carry all six NFR8.2 evidence outcomes into the downstream Contracts entity model with reasons and observed results for unsuccessful outcomes.

## Owner-directed identity revision — 2026-09-24

The owner requested corrections for Identity Access Functional Design findings R-02, R-05, and R-06. R-02 needs a shared contract correction here; R-05 (assigned acceptance-criteria traceability) and R-06 (U3 recovery participant lifecycle) will be repaired when Functional Design resumes. The previous answers Q1-Q12 remain in force except where the new global identity-audit profile below narrows the shared-envelope rule.

### Proposed C01/C15 correction for retailerless identity events

- Keep the existing closed C01 tenant envelope unchanged for messages with a real `retailerId` and `placementGeneration`. Never invent a retailer UUID or placement generation for a global event.
- Add a separately versioned, closed `global-identity-audit-envelope` schema to the U1 package. It requires explicit `scope: global`, immutable message and idempotency identities, occurrence time, actor, correlation ID, authenticated producer binding, RFC 8785/SHA-256 payload digest, and redacted `data`, but forbids `retailerId` and `placementGeneration`. `causationId` is a UUID for a causally linked message or null for a root identity decision; the serialized envelope retains the 65,536-byte limit.
- In C15, use the new message type `identity.global.audit.recorded` for U3's retailerless identity outcomes. Keep `identity.audit.recorded` on the tenant envelope only when a genuine retailer context exists. Both branches have their own positive and negative fixtures; cross-profile substitution, missing fields, fake tenant context, changed-payload replay, and unauthorized producer or consumer fail validation.
- A pre-authentication denial uses `actor: {type: anonymous, subjectId: anonymous}` and a correlation ID; it never copies the attempted email, credential, token, or raw provider claim into actor or data. Authenticated human, workload, and system actions use authenticated subject references. U3 commits every security-relevant identity audit record and exactly one outbox row atomically, including denied decisions; v1 has no locally retained-only identity security audit record. The outbox message and idempotency key derive from that committed audit identity, so replay preserves both.
- U10 stores global identity events in an Operator-only projection, separate from retailer-filtered business-audit queries. U14 validates the selected profile and producer binding but gains no global business authority. Package compatibility and event-type rules remain governed by C01/C15 rather than an in-place reinterpretation of an existing tenant event.

## Ambiguity Scan

The twelve selected answers are mutually consistent and cover the revised 15-unit boundaries. The U1 protocol version is independent from the U14 language-package versions, but package compatibility is explicit and enforced by shared conformance fixtures. U15's REST control plane and RabbitMQ participant plane preserve the approved long-running job and recovery-participant designs. The new global identity-audit profile is explicit rather than a fictitious tenant, so it preserves the tenant-envelope security rule while allowing retailerless identity outcomes. No unresolved ambiguity blocks contract generation after owner confirmation of this amendment. The confirmed Contracts Functional Design pins OpenAPI 3.1.2 and the validator/tool versions; this replay aligns Contract Design's examples to that patch baseline.

## Consolidated Summary

- **External surface:** The browser accesses StockSense only through the Web BFF. Domain APIs remain cluster-internal. Google OIDC and optional local or managed model providers are documented as external dependencies.
- **Specification baseline:** REST contracts use OpenAPI 3.1.2 and asynchronous contracts use AsyncAPI 3.0.0. Exact tool versions remain pinned in the repository.
- **Partition and ownership:** Each provider service owns the semantics of its OpenAPI document, and each event producer owns the semantics of its AsyncAPI document. The Contracts unit owns canonical packaging, validation, and release governance.
- **Synchronous style:** APIs use resource-oriented REST for reads and CRUD, explicit command subresources for governed state transitions, multipart uploads where required, and `202 Accepted` with job resources for long-running work.
- **Asynchronous style:** RabbitMQ uses distinct job/command and immutable event message types. Tenant messages retain the closed C01 envelope with real retailer and placement metadata. Retailerless U3 identity-audit events use a new closed global profile and message type, with no fabricated tenant fields; both profiles preserve actor, correlation, causation, idempotency, occurrence, producer binding, digest, and schema metadata.
- **Evolution:** API major versions appear in HTTP paths. Specifications use semantic versions, compatible additions remain within a major version, deprecations are time-bounded, and breaking event changes require a new event type or major schema version.
- **Failures and retries:** APIs use RFC 9457 Problem Details, stable error codes, correlation IDs, and declared operation-specific timeouts. Automatic retries are limited to safe or idempotent operations; mutation retries reuse the same idempotency key and request hash.
- **Tenant authority:** Retailer identifiers appear in applicable resource routes but never grant authority by themselves. Services authenticate callers, revalidate current retailer membership at the authoritative boundary, and propagate retailer, actor, placement generation, and correlation metadata internally without trusting arbitrary browser headers.
- **Messaging package compatibility:** U1 owns the semantic protocol version. U14's .NET and Python packages version independently, declare supported protocol ranges, and pass the same cross-language conformance fixtures. U3/U4 remain upstream bootstrap publishers and use service-owned C23-conformant adapters rather than adding U14 dependency edges; applicable fixture results are required for both.
- **Recovery control and progress:** The BFF invokes U15 through REST. Start requests return `202 Accepted` and a job resource; the browser polls versioned status and manifest endpoints. Participant commands and acknowledgements use RabbitMQ except for the approved synchronous Identity Access and Tenant Directory bootstrap ports.
- **Destructive confirmation:** U15 issues a short-lived, single-use token bound to the Operator, retailer, operation, manifest digest, and expected placement/recovery generation. The confirmed command is idempotent; stale or mismatched confirmation returns `409`.
- **Participant roster:** U15 owns a versioned required-participant policy. Participants register identity, protocol version, routes, and deadline class. Each run snapshots the roster and stops before prepare if a required registration is missing or incompatible.
- **Review corrections:** C24 gets typed durable results and RFC 9457 problems with valid/invalid fixtures. C01's versioned package manifest enumerates or links all governed inputs and evidence, including C22/C23 and recovery policy. NFR8.2's six outcomes remain representable and reasoned in Contracts evidence.
- **Identity review correction:** C01/C15 add the explicitly global identity-audit profile and event branch, including anonymous denial handling, atomic audit/outbox persistence and fail-closed cross-profile fixtures. U3 owns a separate revocable platform-Operator human grant. U10 checks that grant for each global read using the delegated BFF-held human token; U11 exposes a no-store platform route distinct from retailer dashboards. Retailer-only Operators and machine principals are denied. The R-05 traceability and R-06 recovery-participant corrections follow in U3 Functional Design.

## Prior Summary Confirmation (2026-09-24)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct

## Requested Changes Feedback

The owner selected **Request Changes** at the Contract Design gate to resolve review R-01 and R-02. The prior consolidated answer remains the confirmation of the C01/C15 global-envelope approach; this revision narrows the missing integration and authority boundaries without replacing that answer.

- **R-01:** U3 and U4 remain upstream bootstrap publishers in the approved unit DAG. Their service-owned publisher adapters must implement the same C01/C15/C23 wire and delivery guarantees, versioned applicable conformance fixtures, and U13 evidence as the U14 package path. They do not acquire a new U14 package dependency.
- **R-02:** A platform-wide, revocable human `platform-operator` grant owned by U3 is distinct from retailer Operator membership. U10 requires both a BFF-held delegated human token scoped to global identity audit and a fresh authoritative U3 grant check for each page. U11 exposes a separate no-store platform read route; a retailer dashboard, retailer Operator role, machine token, or grant-cache claim cannot authorize global reads.

### Cross-unit contract correction proposed 2026-09-25

The owner asked to resolve all blockers before Construction. The prior Q1-Q12 answers and identity correction remain approved. Independent Model Lifecycle and Forecasting reviews now identify the same C07 defects: a REST lease check cannot atomically fence a separate U5/U7 publication; and a no-overlap model promotion can wait on old Forecast Runs while the resolver keeps admitting more old-route runs. Forecasting also found that C10/C13 lack the explicit product-set and coverage shapes their consumers require. These are shared-contract defects, so the correction belongs here before the U5/U6/U7 unit designs are revised.

**C07 fenced publication — proposed decision.** U6 owns the global durable heavy-work queue and lease records in PostgreSQL. For v1, each retailer's U6 lease state and U5/U7 authoritative publication pointers, audit and outbox rows reside in the same tenant-shard PostgreSQL database and transaction domain, including after a tenant moves to its own database. U1 contracts a narrow `shared-schema` transactional port: U5/U7 call a U6-owned, versioned stored function from their own owner-controlled finalization routine in the same PostgreSQL transaction. The port accepts authenticated service identity, retailer, work type, request/lease IDs, worker, fencing token, placement/recovery generations, expected owner version, canonical result digest and operation identity; it row-locks and compares current active lease, unexpired deadline and all generations before marking a single idempotent terminal result. The owner routine then commits its publication pointer, business audit and outbox in that same transaction or everything rolls back. Grant only `EXECUTE` on the port to the named service roles; no cross-unit table reads or writes, no SQL outside stored routines/functions. U5's MongoDB objects and Qdrant index are staged and verified but not made authoritative until its PostgreSQL route pointer commits. U6's standalone service and U5/U7's standalone services retain separate code, schemas and release ownership. This is a documented narrow exception to the previous REST-only inter-unit rule, justified by the non-negotiable atomic fence; the unit boundary and tenant-placement documents must be reconciled before coding. Independent-store two-step REST finalization was rejected because expiry or recovery fencing can race the publication commit and cannot provide the stated atomic invariant.

**C07 no-overlap route change — proposed decision.** C07 adds versioned route-pin admission/release and drain/abort/status operations with idempotency, authority and recovery-generation checks. A Forecast Run obtains a durable pin atomically with checking that the active route is open; once promotion atomically sets that route to `draining`, new old-route pins fail explicitly and no fallback model is selected. The promoter starts the drain before acquiring the sole global evaluation lease, so queued old-run batch work can finish. It waits for every old pin to be terminally released or safely fenced and reconciled, then acquires the evaluation lease, rechecks the empty pin set and generations, signs the new promotion package and switches the route atomically. A 60-minute overall promotion-attempt deadline aborts the drain and keeps the old route if it cannot prove emptiness or obtain the lease. Restart reconstructs durable pins and drain state; uncertainty keeps the route unavailable. No previous-release overlap is introduced in v1.

**C10/C13 bounded forecast evidence — proposed decision.** C10 adds a versioned POST read operation for `latest-usable-current-publication` with an explicit de-duplicated product ID set (1–100); the existing run-history GET remains inspectable. C13's existing status/evidence POSTs gain explicit request bodies with the same bound. Responses name the requested set, exact covered and unavailable products, per-product reason, complete/partial/failed/stale/unpublished/unavailable status, current publication and run identity, 28-day series only for covered products, freshness boundary and pinned source/model/configuration/placement provenance. U7 authorizes every product against the retailer and returns a typed denial for foreign IDs without existence disclosure. No missing product becomes zero demand; U8 and U9 use the explicit coverage result. Because the package is still a design artifact with no deployed consumers, this is a prerelease v1 correction; U1 will update OpenAPI examples, generated-client inputs and compatibility fixtures together.

**Unit-level follow-through.** Forecasting will move first-attempt creation after input/model pinning and reuse that queued attempt on first lease acquisition; only a retry appends another. Supplier Knowledge will define its durable cross-store recovery fence and authoritative source-version cache key. Recovery Coordination will freeze complete roster values, recheck registration compatibility immediately before prepare dispatch, and persist the complete immutable manifest. These unit repairs follow the shared contract amendment and independent review; this confirmation does not mark them fixed yet.

## Prior Summary Confirmation (Request Changes, 2026-09-25)

Do these proposed C07, C10 and C13 contract corrections look correct before I update and review the shared contract artifact?

- Looks correct
- Request changes

[Answer]: Request changes

### Owner clarification (2026-09-25)

[Answer]: You should fix the four gaps you've mentioned just now

This directs correction of the four Forecasting review findings R-01 through R-04: C07 atomic finalization, C07 no-overlap route admission/drain, first-attempt creation, and C10/C13 explicit product-set and coverage schemas. The technical choices and review evidence must be made concrete in the shared contract and affected unit design before the next approval gate. The earlier `Request changes` is not approval of the rejected draft.

## Consolidated Summary Confirmation

The four owner-directed corrections are now written into the reviewable design:

1. **C07 finalization:** U6 retains one central heavy-work slot and monotonic token. The slot is reserved before a retailer-local lease fence is installed and is not released on uncertainty. U5/U7 owner routines invoke U6's EXECUTE-only `finalize_heavy_work_v1` stored function in the same retailer-local PostgreSQL transaction as owner publication, audit and outbox; U7 closes the route pin there. Expiry, recovery fencing, changed-payload replay and owner-version conflicts cannot publish stale output. Tenant moves co-locate the fence, route and owner publication rows in the destination database.
2. **C07 route safety:** A bootstrapped route-control row serializes `pins:admit` with `drains:start`, including generation-zero first activation. Promotion and rollback begin a durable drain before acquiring evaluation work, wait for zero proven old pins, then atomically recheck drain deadline, lease fence, package and route generation before switching. Deadline or restart never silently clears a pin; v1 has no previous-release overlap.
3. **First attempt:** WF2 creates a request and logical run only. WF3 pins input/model digests and creates queued attempt 1 once. The first lease updates that same attempt; only retry after a terminal attempt appends another.
4. **C10/C13 product sets:** The latest usable C10 read is a bounded POST and both C13 tools require 1–100 distinct product IDs. Typed responses return exact requested/covered/unavailable sets, per-product reasons, current run/publication and provenance; C10 and C13 evidence return exactly 28 dated values only for covered products, while C13 status omits series. Stale/unpublished/failed states are explicit and foreign products are denied without disclosure.

These are design corrections. Independent review and race-conformance evidence are still required before implementation can claim the safety behavior.

Does this revised summary accurately reflect the four fixes so I can record confirmation and run the required independent contract review?

- Looks correct
- Request changes

[Answer]: Looks correct
