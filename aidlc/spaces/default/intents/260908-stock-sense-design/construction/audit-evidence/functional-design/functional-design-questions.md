# StockSense audit-evidence functional-design questions

Date: 2026-09-15
Stage: Functional Design
Unit: audit-evidence
Status: Confirmed

These questions resolve the remaining behavior choices for the U10 Audit Evidence service. Accepted boundaries remain fixed: each business service owns its authoritative audit row and outbox event in the same transaction as the business change; rejected attempts use a durable producer-owned path; U10 consumes immutable C15 events through RabbitMQ, owns only rebuildable projection and query state, cannot make a mutation valid, exposes tenant-authorized business-audit APIs and operator-only investigation views, uses PostgreSQL through Flyway/Dapper stored routines, projects to OpenSearch, keeps operational logs separate from business audit, applies configurable 90-day business-audit and 7-day operational-log defaults, excludes secrets/full prompts/hidden reasoning/raw supplier documents, and supports observable replay, lag, retention, restore, and tenant-migration evidence.

## Interaction mode

The owner's standing preference from the current Functional Design stage is retained:

- A. Guide me through each question (Recommended)
- B. I will edit this file directly
- C. Answer all questions in chat
- X. Other (please specify)

[Answer]: A. Guide me through each question (Recommended)

## Q1. Projection source and durable ingestion boundary

What should U10 retain so OpenSearch can be rebuilt without taking authority from producing services?

- A. Producers remain authoritative; after C15 validation, U10 commits an immutable derived event envelope and unique inbox receipt to its PostgreSQL store before projection, then treats OpenSearch as disposable; U10 never edits producer facts or uses its copy to validate a business mutation (Recommended)
- B. Treat the OpenSearch document as the authoritative audit record after successful indexing
- C. Keep only a RabbitMQ delivery tag and require every query to read producer databases directly
- X. Other (please specify)

[Answer]: A. Producers remain authoritative; after C15 validation, U10 commits an immutable derived event envelope and unique inbox receipt to its PostgreSQL store before projection, then treats OpenSearch as disposable; U10 never edits producer facts or uses its copy to validate a business mutation (Recommended)

## Q2. Event identity, ordering, and duplicate delivery

How should duplicate and out-of-order audit events be handled?

- A. Deduplicate globally by immutable event ID; also retain producer, aggregate/resource identity, aggregate version or producer sequence, occurred time, accepted time, correlation, and causation; require ordering only within a declared producer/aggregate stream and use stable time-plus-event ordering for queries, without inventing a global business order (Recommended)
- B. Order all retailers and producers by RabbitMQ arrival time and reject any later-arriving older event
- C. Permit duplicate indexed documents when the same event is redelivered
- X. Other (please specify)

[Answer]: A. Deduplicate globally by immutable event ID; also retain producer, aggregate/resource identity, aggregate version or producer sequence, occurred time, accepted time, correlation, and causation; require ordering only within a declared producer/aggregate stream and use stable time-plus-event ordering for queries, without inventing a global business order (Recommended)

## Q3. Tenant isolation in OpenSearch

How should business-audit indexes separate retailers while retaining operator-wide investigation capability?

- A. Use server-routed per-retailer business-audit indexes or data streams keyed by current placement generation, plus a separate operator-only operational-log stream; tenant APIs never accept an index name, and operator-wide access uses a distinct privileged route and identity (Recommended)
- B. Put all business audits in one index and rely only on a client-supplied retailer filter
- C. Give planners read access to OpenSearch Dashboards and let saved searches enforce tenancy
- X. Other (please specify)

[Answer]: A. Use server-routed per-retailer business-audit indexes or data streams keyed by current placement generation, plus a separate operator-only operational-log stream; tenant APIs never accept an index name, and operator-wide access uses a distinct privileged route and identity (Recommended)

## Q4. Tenant-authorized business-audit query behavior

What query surface should planners and managers receive?

- A. Expose bounded paged API queries for the current authorized retailer with date range and optional actor, action, target type/ID, outcome, source service, and correlation filters; reauthorize every request; return projection freshness/lag and explicit unavailable state rather than silently incomplete results (Recommended)
- B. Expose unrestricted query-string access to OpenSearch through the BFF
- C. Return results without projection freshness because business audit is eventually consistent
- X. Other (please specify)

[Answer]: A. Expose bounded paged API queries for the current authorized retailer with date range and optional actor, action, target type/ID, outcome, source service, and correlation filters; reauthorize every request; return projection freshness/lag and explicit unavailable state rather than silently incomplete results (Recommended)

## Q5. Event validation and sensitive-data defense

What should happen when an event is incompatible, malformed, or contains prohibited content?

- A. Producers publish an allowlisted minimal envelope; U10 validates schema/version and applies a second field allowlist/redaction check; incompatible or unsafe events are not indexed, receive a durable failed/quarantined receipt with safe diagnostics, and follow bounded DLQ handling without storing prohibited payload content (Recommended)
- B. Index every field first and rely on later OpenSearch ingest-pipeline redaction
- C. Drop invalid events silently so the audit search remains available
- X. Other (please specify)

[Answer]: A. Producers publish an allowlisted minimal envelope; U10 validates schema/version and applies a second field allowlist/redaction check; incompatible or unsafe events are not indexed, receive a durable failed/quarantined receipt with safe diagnostics, and follow bounded DLQ handling without storing prohibited payload content (Recommended)

## Q6. OpenSearch outage, retries, and dead letters

How should projection failure affect event delivery and business work?

- A. Business commits remain unaffected; U10 first commits the unique inbox receipt, projects idempotently using the event ID, commits the projection checkpoint, and only then acknowledges C15 delivery; a crash between steps safely repeats projection, while bounded retries eventually dead-letter the event with visible lag and a safe reason (Recommended)
- B. Block the originating business transaction until OpenSearch acknowledges the document
- C. Acknowledge every delivery before durable U10 state exists and ignore lost projection work
- X. Other (please specify)

[Answer]: A. Business commits remain unaffected; U10 first commits the unique inbox receipt, projects idempotently using the event ID, commits the projection checkpoint, and only then acknowledges C15 delivery; a crash between steps safely repeats projection, while bounded retries eventually dead-letter the event with visible lag and a safe reason (Recommended)

## Q7. Replay and projection rebuild

How should an operator rebuild or repair audit projection state?

- A. Rebuild into a new projection generation from U10's retained immutable event ledger; if a retained range is missing or corrupt, request republishing through a versioned producer-owned replay contract; validate authority, retention, schema support, tenant route, counts, checksums, and expiry state before switching the active generation (Recommended)
- B. Delete the active index and republish every queue message directly into it without a validation stage
- C. Let ordinary tenant users start arbitrary global replays
- X. Other (please specify)

[Answer]: A. Rebuild into a new projection generation from U10's retained immutable event ledger; if a retained range is missing or corrupt, request republishing through a versioned producer-owned replay contract; validate authority, retention, schema support, tenant route, counts, checksums, and expiry state before switching the active generation (Recommended)

## Q8. Coordinated retention and no-resurrection rule

How should the 90-day business-audit cutoff remain consistent across authoritative PostgreSQL rows, U10 copies, OpenSearch, rebuilds, and restored backups?

- A. Use one versioned deployment retention policy and cutoff; each producer executes controlled retention through its own privileged boundary and returns a receipt; U10 records coordination, removes only eligible derived copies/projections, persists expiry tombstones or cutoff watermarks needed by rebuild, and blocks activation when reconciliation could resurrect expired events (Recommended)
- B. Delete OpenSearch documents only and leave all PostgreSQL audit rows indefinitely
- C. Let every service calculate its own unrecorded cutoff independently
- X. Other (please specify)

[Answer]: A. Use one versioned deployment retention policy and cutoff; each producer executes controlled retention through its own privileged boundary and returns a receipt; U10 records coordination, removes only eligible derived copies/projections, persists expiry tombstones or cutoff watermarks needed by rebuild, and blocks activation when reconciliation could resurrect expired events (Recommended)

## Q9. Operational logs, traces, and correlation

How should operational telemetry relate to business audit?

- A. Keep operational logs/traces in separate operator-only streams with the 7-day default; correlate them to business audit by bounded identifiers such as correlation, causation, service, job, and event ID; telemetry loss/backpressure is explicit and bounded but never suppresses required business audit or blocks business work (Recommended)
- B. Store business audit only as application logs and infer sensitive actions from message text
- C. Copy full prompts, supplier documents, tokens, and exception payloads into operator logs for easier debugging
- X. Other (please specify)

[Answer]: A. Keep operational logs/traces in separate operator-only streams with the 7-day default; correlate them to business audit by bounded identifiers such as correlation, causation, service, job, and event ID; telemetry loss/backpressure is explicit and bounded but never suppresses required business audit or blocks business work (Recommended)

## Q10. Privileged controls and audit of U10 itself

Who may run replay, retention, quarantine repair, or cross-tenant investigation, and how are those actions recorded?

- A. Require a distinct current Platform Operator workload/user authority with narrow scopes and expected policy/request versions; tenant roles cannot invoke these controls; U10 records accepted, denied, failed, and completed control attempts in an append-only self-audit/outbox path that cannot make producer events valid (Recommended)
- B. Permit any manager to run cross-tenant replay and retention from the business-audit screen
- C. Treat replay and retention as unaudited maintenance because they do not change business entities
- X. Other (please specify)

[Answer]: A. Require a distinct current Platform Operator workload/user authority with narrow scopes and expected policy/request versions; tenant roles cannot invoke these controls; U10 records accepted, denied, failed, and completed control attempts in an append-only self-audit/outbox path that cannot make producer events valid (Recommended)

## Q11. Recovery, tenant movement, and portfolio evidence

What evidence should U10 produce for restore, tenant extraction, and the reviewer journey?

- A. Record revision-bound manifests for inbox/projection counts, retained/expired ranges, checkpoints, replay/retention request versions, index generation and placement generation, lag, checksums, failures, and redacted query samples; after restore or tenant movement, reconcile and activate the intended tenant route before serving it; expose bounded evidence to U13 through C19 without transferring U10 ownership (Recommended)
- B. Consider recovery complete when OpenSearch starts, without reconciling retained ranges or tenant routing
- C. Export unrestricted raw audit and log payloads as portfolio evidence
- X. Other (please specify)

[Answer]: A. Record revision-bound manifests for inbox/projection counts, retained/expired ranges, checkpoints, replay/retention request versions, index generation and placement generation, lag, checksums, failures, and redacted query samples; after restore or tenant movement, reconcile and activate the intended tenant route before serving it; expose bounded evidence to U13 through C19 without transferring U10 ownership (Recommended)

## Assumptions & Open Questions

- Exact C15 retry counts, backoff, processing deadline, queue/backlog capacity, DLQ retention, replay batch size, and projection-lag thresholds remain bounded implementation parameters under OQ6.
- Exact recovery objectives, backup frequency/expiry, persistent-disk limits, and allowed retention lag remain implementation prerequisites under OQ5/OQ10.
- The deployment starts with three synthetic retailers. Index/data-stream rollover sizes, shard/replica counts, and resource limits must fit the accepted 16 GB RAM / 3 CPU cluster envelope and are resolved in NFR and infrastructure design.
- The exact operator identity/scopes and control API schemas remain contract refinements; they cannot weaken the confirmed operator-only boundary.

## Sources

- `inception/units-generation/unit-of-work.md` and `unit-of-work-story-map.md` — U10 ownership, boundaries, and 33 assigned stories.
- `inception/requirements-analysis/requirements.md` — FR17, FR17.1, FR18, FR20, NFR3, NFR4, NFR7-NFR11, NFR15, OQ5, OQ6, and OQ10.
- `inception/user-stories/stories.md` — acceptance criteria for all U10-assigned business, agent, platform, audit, recovery, and reviewer stories.
- `inception/domain-design/components.md` — AuditEvidence responsibilities, dependencies, entity seeds, storage ownership, and acyclic component graph.
- `inception/contract-design/contract-summary.md` — C15 audit-event contract, C17/C18 query composition, C19 evidence handoff, authority rules, and retry profiles.

## Consolidated Summary Confirmation

The selected functional behavior is:

1. Producing services remain authoritative for audit rows and business meaning. After validating C15, U10 stores an immutable derived event envelope and unique inbox receipt in its PostgreSQL store. OpenSearch is disposable, and U10's copy never validates a business mutation.
2. U10 deduplicates by immutable event ID and retains producer, resource, version/sequence, occurred/accepted time, correlation, and causation. Ordering is defined only within declared producer/resource streams; cross-stream query order uses a stable time-and-event-ID key.
3. Business audit uses server-routed per-retailer OpenSearch indexes or data streams tied to placement generation. Operational telemetry uses separate operator-only streams. Clients never select indexes, and cross-retailer access uses distinct operator authority.
4. Planner/manager business-audit queries are bounded, paginated, and reauthorized for the current retailer. Supported filters cover date, actor, action, target, outcome, source service, and correlation. Results expose projection freshness/lag or explicit unavailability.
5. Producers use a minimal allowlisted event envelope, and U10 applies schema/version validation plus a second allowlist/redaction check. Invalid or unsafe events are not indexed; U10 retains safe quarantine/failure metadata and uses bounded DLQ handling without retaining prohibited payload content.
6. OpenSearch failure never blocks producer business transactions. U10 commits the inbox receipt, projects idempotently by event ID, commits its projection checkpoint, and then acknowledges RabbitMQ. Crashes safely repeat projection; exhausted bounded retries dead-letter with visible lag and a safe reason.
7. Rebuilds create a new projection generation from U10's retained event ledger. A proven missing/corrupt range uses a versioned producer-owned replay contract. Authority, retention, schema, tenant route, counts, checksums, and expiry state must reconcile before active-generation cutover.
8. One versioned retention policy and cutoff governs authoritative producer rows, U10 copies, OpenSearch, replay, and restore. Producers execute privileged deletion behind their own boundaries and return receipts. U10 applies the same cutoff, tracks reconciliation, and preserves cutoff watermarks/tombstones so expired events cannot reappear.
9. Operational logs and traces have separate operator-only streams and the configurable seven-day default. Bounded correlation identifiers connect them to business audit. Telemetry loss/backpressure is visible and bounded but never suppresses required audit or blocks business work.
10. Replay, retention, quarantine repair, and cross-retailer investigations require current Platform Operator authority, narrow scopes, and expected versions. Tenant roles cannot invoke them. U10 records accepted, denied, failed, and completed control attempts in its append-only self-audit/outbox path.
11. U10 produces revision-bound recovery and portfolio evidence for counts, retained/expired ranges, checkpoints, replay/retention versions, index and placement generations, lag, checksums, failures, and redacted samples. Restored or moved tenant routes are reconciled before service; bounded evidence is published to U13 through C19 without transferring ownership.

Mandatory ambiguity analysis found no vague answers, contradictions, or missing functional decisions. Numeric retry, capacity, timing, retention-lag, recovery, and storage limits remain explicitly assigned to NFR and infrastructure design under OQ5, OQ6, and OQ10; they do not permit unbounded behavior.

[Answer]: Looks correct
