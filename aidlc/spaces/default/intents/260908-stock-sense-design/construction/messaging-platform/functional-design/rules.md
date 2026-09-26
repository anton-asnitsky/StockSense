# Messaging Platform Functional Rules

Unit: U14 Messaging Platform (`messaging-platform`)

Sources: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `contract-summary.md`, and the confirmed `functional-design-questions.md`.

The YAML is the source of truth. U14 enforces transport and package invariants; the domain owner retains business authority and the durable atomic effect.

## Authoritative transport and replay rules

```yaml
schemaVersion: "1.0.0"
unit: messaging-platform
rules:
  - id: BR1.1
    statement: Tenant envelopes require the closed C01 tenant profile and current placement context.
    category: validation
    appliesTo: [TenantEnvelope, EnvelopeTransportMetadata]
    trigger: A tenant message is published or accepted.
    logic: "IF every required field of the closed C01 tenant wire schema, real retailerId, placementGeneration and the authenticated tenant route validate, and scope/profile/serializedBytes are absent from wire bytes, THEN process without adding or changing authority fields."
    violationBehaviour: Reject or quarantine without a business effect.
    source: [C01, C15, NFR3, AC8.2.2]
  - id: BR1.2
    statement: Retailerless identity audit uses only the closed global envelope and separate route.
    category: validation
    appliesTo: [GlobalIdentityAuditEnvelope, EnvelopeTransportMetadata, DeadLetterEntry]
    trigger: A global identity-security event is accepted or dead-lettered.
    logic: "IF every required field of the closed C01 global wire schema, scope global, identity.global.audit.recorded type and dedicated route match, and retailer/placement/profile/serializedBytes fields are absent from wire bytes, THEN accept the profile; never synthesize tenant context."
    violationBehaviour: Reject cross-profile substitution and keep global dead letters isolated.
    source: [C01, C15, C22, C23]
  - id: BR1.3
    statement: Producer identity is bound to the authenticated registered workload at both edges.
    category: authorization
    appliesTo: [ProducerBinding, TenantEnvelope, GlobalIdentityAuditEnvelope]
    trigger: Before broker publish or consumer inbox acceptance.
    logic: "IF workload subject, client, audience, registered service, message type, route and protocol range agree THEN derive producer fields from that binding, not caller input."
    violationBehaviour: Reject unbound or mismatched producer and emit a safe diagnostic.
    source: [C01, C23, NFR5, AC8.5.3]
  - id: BR1.4
    statement: Canonical payload digest and the serialized 65,536-byte ceiling apply at publish and receive.
    category: validation
    appliesTo: [TenantEnvelope, GlobalIdentityAuditEnvelope, EnvelopeTransportMetadata]
    trigger: Envelope creation, publish, or consume.
    logic: "IF the SHA-256 digest of RFC 8785-canonicalized data matches and the entire serialized UTF-8 envelope is at most 65,536 bytes THEN admit it."
    violationBehaviour: Reject 65,537 bytes or digest mismatch before publication or business effect.
    source: [C01, C23, NFR7.1, AC8.5.3]
  - id: BR1.5
    statement: A message or idempotency identity cannot be reused with changed immutable content.
    category: constraint
    appliesTo: [TenantEnvelope, GlobalIdentityAuditEnvelope]
    trigger: Duplicate publication, delivery or replay.
    logic: "IF canonical envelope and payload equal the durable prior identity THEN return its prior result; if any immutable field or payload differs THEN quarantine a conflict."
    violationBehaviour: Never overwrite prior content or create another business effect.
    source: [C01, C23, AC8.5.2, AC8.5.4]

  - id: BR2.1
    statement: Publisher confirmation advances an owner-held outbox only after durable broker acceptance.
    category: constraint
    appliesTo: [DeliveryCycle]
    trigger: An owner-provided outbox record is relayed.
    logic: "IF the broker confirms the immutable message THEN report confirmed to the owning producer; otherwise leave its authoritative outbox pending for the same-identity retry."
    violationBehaviour: Never claim publication from a send attempt alone.
    source: [C23, NFR7, AC8.5.1]
  - id: BR2.2
    statement: Consumer acknowledgment follows its own inbox and business-effect commit.
    category: constraint
    appliesTo: [DeliveryCycle]
    trigger: A delivery reaches an owner-provided consumer handler.
    logic: "IF the owning consumer has durably committed inbox uniqueness, current authority and its atomic effect/outbox result THEN acknowledge; otherwise leave delivery eligible for redelivery."
    violationBehaviour: Do not acknowledge before commit or treat transport deduplication as business exactly-once.
    source: [C23, AC8.5.1, AC8.5.2, AC8.5.4]
  - id: BR2.3
    statement: A delivery cycle has five attempts with deterministic bounded waits.
    category: policy
    appliesTo: [DeliveryCycle]
    trigger: Transient delivery failure.
    logic: "IF attempt one fails THEN attempts two through five wait 1, 2, 4 and 8 seconds; each delivery retains messageId and canonical digest; there is no jitter or sixth delivery."
    violationBehaviour: Move failed attempt five to the matching dead-letter path.
    source: [C23, NFR7.1, AC8.5.3]
  - id: BR2.4
    statement: Dead letters retain seven-day evidence in their original profile.
    category: policy
    appliesTo: [DeadLetterEntry]
    trigger: Attempt five fails or dead-letter retention expires.
    logic: "IF delivery exhausts THEN retain the dead-letter entry for 604,800 seconds on the tenant or separate global route; on expiry retain safe expiry evidence and request authoritative-state reconciliation."
    violationBehaviour: Never silently discard uncertainty or claim that transport expiry repaired state.
    source: [C15, C23, AC8.5.3]
  - id: BR2.5
    statement: Replay is bounded, audited, durable and idempotent at the owning authority before U14 executes mechanics.
    category: authorization
    appliesTo: [ReplayInstruction, DeliveryCycle]
    trigger: An Operator requests dead-letter replay.
    logic: "IF the owner durably records current audited authority, request digest and deterministic cycle IDs for exactly 1 to 100 messages in one permitted profile THEN U14 starts only those cycles, preserving each canonical envelope and messageId. An exact replayRequestId/requestDigest retry returns the owner's durable prior result; an in-progress retry resumes the same cycle IDs after broker/owner reconciliation."
    violationBehaviour: Reject 101, duplicate message IDs or mixed unauthorized items atomically; conflict on changed batch or scope under one replayRequestId; never create a second logical cycle for an exact retry or let a retailer Operator replay global identity audit.
    source: [C23, AC8.5.3, AC9.11.4]
  - id: BR2.6
    statement: Expired or replayed deliveries require owner reconciliation before closure.
    category: policy
    appliesTo: [DeadLetterEntry, ReplayInstruction]
    trigger: Replay or dead-letter expiry is closed.
    logic: "IF the owning service has reconciled authoritative state and recorded the outcome THEN the replay request may close; U14 exposes delivery evidence only."
    violationBehaviour: Keep reconciliation unresolved rather than manufacturing a business success.
    source: [C23, AC8.5.2, AC8.5.4]

  - id: BR3.1
    statement: U1 owns protocol versions while U14 versions .NET and Python packages independently.
    category: policy
    appliesTo: [PackageConformanceRecord]
    trigger: A package is selected, built or released.
    logic: "IF each package declares a compatible U1 protocol range and the same C22 fixture version passes in both languages THEN release its independent semantic version."
    violationBehaviour: Block incompatible or unproven package integration.
    source: [C22, AC8.2.2, AC8.2.3, AC8.2.4]
  - id: BR3.2
    statement: Applicable conformance suites cover both envelopes and failure behavior.
    category: validation
    appliesTo: [PackageConformanceRecord]
    trigger: Package or bootstrap-publisher evidence is claimed.
    logic: "IF tenant/global envelopes, cross-profile rejection, producer binding, confirms, exact replay, conflict, poison, expiry, dead letter, authorized replay, reconciliation, ordering, size and telemetry fixtures pass THEN report the exact versioned result."
    violationBehaviour: Missing or failed suite blocks the corresponding package or publisher claim; U3/U4 evidence remains separate.
    source: [C22, C23, AC8.2.4, AC8.5.4, AC10.2.4]
  - id: BR3.3
    statement: The library stays stateless and does not own domain persistence, authority or effects.
    category: constraint
    appliesTo: [TenantEnvelope, GlobalIdentityAuditEnvelope, DeliveryCycle]
    trigger: A producer or consumer integrates the adapter.
    logic: "IF the owner supplies its schema, outbox/inbox, authority and effect boundary THEN U14 handles only protocol and broker mechanics; U2 supplies topology."
    violationBehaviour: Reject integration that requires U14 to read domain storage or grant business authority.
    source: [C23, AC8.5.2, AC8.5.4]
  - id: BR3.4
    statement: U3 and U4 bootstrap publishers conform independently without depending on U14.
    category: policy
    appliesTo: [PackageConformanceRecord]
    trigger: Shared conformance or integration evidence is assembled.
    logic: "IF U3/U4 service-local adapters and U14 packages each pass their applicable C22 suites THEN U13 receives separately attributed evidence."
    violationBehaviour: Do not substitute a U14 package result for either bootstrap publisher.
    source: [C15, C22, C23, AC10.2.4]

  - id: BR4.1
    statement: Recovery fencing covers relays, consumers, acknowledgments and topology mutation before snapshot.
    category: constraint
    appliesTo: [DeliveryCycle]
    trigger: U15's versioned recovery barrier fences messaging activity.
    logic: "IF the relevant owner or U2 fence generation is current THEN only permitted drain/checkpoint work proceeds; stale generations cannot resume a relay, consumer, acknowledgment or topology change."
    violationBehaviour: Keep the affected flow fenced until the owning participant and coordinator reconcile.
    source: [C24, C25, NFR9, AC9.11.1, AC9.11.3]
  - id: BR4.2
    statement: Broker queue identities and digests join U15's cut through U2, not a U14 business snapshot.
    category: validation
    appliesTo: [DeliveryCycle]
    trigger: A quiesced recovery cut is assembled.
    logic: "IF U2 supplies broker-supported per-queue identities and digests and each domain supplies checkpoints THEN U15 binds them with PostgreSQL LSN/transaction evidence."
    violationBehaviour: U14 cannot declare the whole cut complete from library telemetry.
    source: [C24, C25, AC9.11.2]

  - id: BR5.1
    statement: Package build and clean reviewer use expose reproducible health and diagnostics.
    category: validation
    appliesTo: [PackageConformanceRecord]
    trigger: A clean checkout or representative consumer boots.
    logic: "IF pinned .NET/Python and broker prerequisites are available THEN build both packages and run versioned smoke/conformance checks with actionable failure output."
    violationBehaviour: Mark missing prerequisites or failed integration as not-run/failed; never claim the full application is ready.
    source: [AC8.1.1, AC8.3.3, AC10.1.1, AC10.1.3]
  - id: BR5.2
    statement: CI and trusted release bind package versions to validation and immutable inputs.
    category: validation
    appliesTo: [PackageConformanceRecord]
    trigger: Pull request or trusted package delivery.
    logic: "IF applicable builds, security, protocol, conformance and compatibility checks pass in an isolated runner THEN report exact revision, package version and evidence digest."
    violationBehaviour: Block release on failed required checks; untrusted PR code receives no local runner or deployment secrets.
    source: [AC8.7.1, AC8.7.2, AC8.7.3, AC8.8.1, AC10.2.3]
  - id: BR5.3
    statement: Messaging telemetry is correlated, bounded and secret-free without blocking business commits.
    category: policy
    appliesTo: [DeliveryCycle, PackageConformanceRecord]
    trigger: Publish, delivery, retry, dead letter, replay or telemetry outage.
    logic: "IF the versioned telemetry profile exists THEN emit correlation, causation, attempt, delay and safe outcome within its cardinality/buffer policy; business commits continue on diagnostic telemetry loss."
    violationBehaviour: Record telemetry loss and limitations without credentials, tokens, supplier text, prompts or hidden reasoning; absent profile is blocked-prerequisite.
    source: [AC9.3.1, AC9.3.2, AC9.3.3, AC9.4.2]
  - id: BR5.4
    statement: U14 publishes scoped evidence for U13's complete performance and portfolio claims.
    category: validation
    appliesTo: [PackageConformanceRecord]
    trigger: Resource, recovery or portfolio evidence is assembled.
    logic: "IF U14 measurements and fixture results exist THEN expose actual broker-message latency, retries, resource use, recovery fencing and package revision; U13 evaluates whole-stack budgets and release coverage with other units."
    violationBehaviour: Mark missing U14 evidence limited/not-run; never infer whole-system p95, capacity, clean-run duration or recovery success.
    source: [AC9.4.1, AC9.4.2, AC9.4.3, AC9.4.4, AC9.4.5, AC10.1.5, AC10.2.1, AC10.2.2, AC10.2.5]
```

## Rules summary

| Concern | Rules | U14 obligation |
| --- | --- | --- |
| Envelope and producer | BR1.1-BR1.5 | Validate the two closed profiles, producer binding, canonical digest, size and immutable identity. |
| Delivery and replay | BR2.1-BR2.6 | Confirm before outbox advancement, ack after owner commit, use five attempts and seven-day DLQ, and require owner-held durable idempotency for authorized replay. |
| Packages and ownership | BR3.1-BR3.4 | Keep U1 protocol governance separate from U14 .NET/Python package conformance and domain-owned effects. |
| Recovery | BR4.1-BR4.2 | Respect versioned fencing and provide broker-side evidence without claiming U15's cut. |
| Reviewer and evidence | BR5.1-BR5.4 | Produce reproducible scoped validation, safe telemetry and measured inputs for U13. |
