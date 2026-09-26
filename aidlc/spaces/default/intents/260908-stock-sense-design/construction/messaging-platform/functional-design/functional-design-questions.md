# StockSense Messaging Platform functional-design questions

Date: 2026-09-25
Stage: Functional Design
Unit: messaging-platform (U14)
Status: Confirmed for artifact generation

The approved U14 unit definition and C01/C23 contracts already settle the behavior-bearing choices. No new owner decision is needed for this pass. Any topology capacity, timeout, or package implementation detail not fixed by those contracts belongs to NFR design or code generation and will not be invented here.

## Decisions carried forward

- U14 supplies a stateless, reusable RabbitMQ adapter and independently versioned .NET and Python packages. U1 owns schemas and domain message meaning; U2 owns broker deployment; producers and consumers own transactional outbox/inbox records, current authority, fencing, and business effects.
- C01 has two closed authenticated envelope profiles: tenant events require real retailer and placement metadata; retailerless identity-security events use the separate global identity-audit profile and route, with no fabricated tenant fields. U14 validates both and preserves distinct dead-letter paths. Producer identity comes from the registered workload, the payload digest is RFC 8785/SHA-256 over `data`, and the serialized envelope may be at most 65,536 bytes. The adapter rejects oversized, unbound, altered, or conflicting messages without a business effect.
- Delivery is at least once with publisher confirms. A consumer acknowledges only after its own inbox and effect commit; redelivery preserves `messageId`. Exact replay returns the durable prior result; a changed payload under an existing identity is quarantined.
- The initial delivery is attempt one. Attempts two through five use deterministic 1, 2, 4, and 8 second backoff. A failed fifth attempt enters the dead-letter queue; attempt six is forbidden. Dead letters remain for seven days. Authenticated Operator replay is audited, accepts one to 100 messages, preserves the canonical envelope, and starts a new bounded delivery cycle.
- U1 governs the versioned C22 fixture and protocol-compatibility manifest. U14 declares independent .NET/Python package versions and protocol ranges, runs applicable fixtures, and exposes telemetry for exact replay, conflict, poison-to-DLQ, expiry, batch limits, both envelope profiles, and authoritative reconciliation. U3/U4 use service-local C23-conformant publisher adapters and give U13 separate fixture evidence; U14 is no dependency for them. A representative platform fixture does not substitute for each domain consumer's tenant, inbox, and atomic-effect tests (US8.5 AC8.5.1-4).

## Ambiguity Scan

The earlier “Request changes” answer preceded the approved C01/C15/C22/C23 revisions. The two closed envelopes, distinct global route, U3/U4 bootstrap-adapter ownership, and fixture obligations are now included above. No further owner-level behavior choice is apparent for U14 Functional Design. Detailed broker capacity and timeout values belong to NFR Requirements/Design. Domain-specific authority and persistence mechanisms remain with the owning units.

## Consolidated Summary

Messaging Platform will implement the approved C01/C22/C23 RabbitMQ mechanics as reusable, independently versioned .NET and Python packages. It validates distinct closed tenant and global identity-audit envelopes without inventing retailer context, binds authenticated producers, computes canonical digest within the 65,536-byte limit, uses publisher confirms and at-least-once delivery, and hands off acknowledgment only after the consumer's own commit. It enforces five total attempts with fixed backoff, seven-day dead letters, and audited Operator replay in batches of one to 100 while preserving the canonical envelope. U1 governs the versioned fixtures and compatibility profile; U14 proves package conformance and exposes telemetry. U3/U4 keep service-local conformant publishers and separate evidence. U14 owns no domain schema, tenant authority, business outbox/inbox state, or broker infrastructure; each consuming unit proves its own atomic effect and current authority under failure and redelivery.

## Historical Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct

## Review Reconciliation (2026-09-25)

The approved messaging decisions above remain unchanged. The next U14 design revision will close the three findings from its prior architecture review:

- R-01: Represent the exact C01 tenant and global identity-audit wire envelopes, including their distinct required fields and nullable values. Keep `profile` and serialized-byte count as adapter metadata outside the wire envelope, and validate both profiles against U1-owned schemas.
- R-02: Make C23 dead-letter replay idempotent at the owning service's durable request/result boundary. An exact retry of a `replayRequestId` returns its prior result without starting a new cycle; a changed batch under the same ID conflicts. U14 remains a stateless adapter and does not claim the owner ledger.
- R-03: Give the entities and rules documents meaningful section headings so their required-section checks pass without changing the approved behavior.

## Consolidated Summary Confirmation

Does this revised Messaging Platform summary look correct before I update its Functional Design artifacts and request a fresh review?

- Looks correct
- Request changes

[Answer]: Looks correct
