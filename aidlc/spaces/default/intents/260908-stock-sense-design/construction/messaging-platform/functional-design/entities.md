# Messaging Platform Functional Entity Model

Unit: U14 Messaging Platform (`messaging-platform`)

Sources: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `contract-summary.md`, and the confirmed `functional-design-questions.md`.

The YAML is the source of truth for U14's logical protocol objects. These are transient values and package/conformance records, not U14-owned business tables. Each domain service owns its durable outbox, inbox, authorization, audit and effects; U2 owns RabbitMQ topology.

## Closed C01 wire envelopes

The tenant and retailerless identity-audit envelopes are separate closed wire shapes. Every named attribute below is a JSON top-level property; `actor` and `producer` have the nested fields stated in their constraints. No adapter metadata is serialized into either envelope. U1's versioned JSON Schemas are the final validators.

```yaml
schemaVersion: "1.0.0"
unit: messaging-platform
entities:
  - name: TenantEnvelope
    description: Exact C01 tenant wire envelope; no scope or transport metadata is allowed.
    attributes:
      - { name: messageId, logicalType: Identifier, required: true, unique: true }
      - { name: messageType, logicalType: VersionedIdentifier, required: true, unique: false }
      - { name: schemaVersion, logicalType: SemanticVersion, required: true, unique: false }
      - { name: occurredAt, logicalType: Instant, required: true, unique: false }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false }
      - { name: actor, logicalType: TenantActor, required: true, unique: false }
      - { name: correlationId, logicalType: Identifier, required: true, unique: false }
      - { name: causationId, logicalType: Identifier, required: true, unique: false }
      - { name: idempotencyKey, logicalType: Identifier, required: true, unique: false }
      - { name: placementGeneration, logicalType: PositiveInteger, required: true, unique: false }
      - { name: producer, logicalType: ProducerIdentity, required: true, unique: false }
      - { name: payloadDigest, logicalType: SHA256Digest, required: true, unique: false }
      - { name: traceparent, logicalType: String, required: false, unique: false }
      - { name: data, logicalType: Object, required: true, unique: false }
    entityConstraints:
      - Only the thirteen required C01 tenant fields and optional traceparent are permitted; scope, profile and serializedBytes are forbidden on the wire.
      - messageId, retailerId, correlationId and causationId are UUIDs; causationId cannot be null; placementGeneration is at least one; idempotencyKey has 16 to 128 characters.
      - actor is a closed object with required type in [user, service, scheduler] and subjectId string.
      - producer is a closed object with required serviceId, subjectId, audience and protocolVersion; serviceId follows the C01 service pattern and protocolVersion is a semantic version.
      - Digest equals SHA-256 of RFC 8785-canonicalized data; immutable envelope fields and payload cannot change under a reused messageId or idempotencyKey.
      - Producer identity is derived from an authenticated registered workload, not a caller-supplied override.

  - name: GlobalIdentityAuditEnvelope
    description: Exact C01/C15 retailerless identity-audit wire envelope on its dedicated route.
    attributes:
      - { name: scope, logicalType: ConstantGlobal, required: true, unique: false }
      - { name: messageId, logicalType: Identifier, required: true, unique: true }
      - { name: messageType, logicalType: ConstantIdentityGlobalAuditRecorded, required: true, unique: false }
      - { name: schemaVersion, logicalType: ConstantVersion100, required: true, unique: false }
      - { name: occurredAt, logicalType: Instant, required: true, unique: false }
      - { name: actor, logicalType: GlobalAuditActor, required: true, unique: false }
      - { name: correlationId, logicalType: Identifier, required: true, unique: false }
      - { name: causationId, logicalType: NullableIdentifier, required: true, unique: false }
      - { name: idempotencyKey, logicalType: Identifier, required: true, unique: false }
      - { name: producer, logicalType: IdentityAccessProducer, required: true, unique: false }
      - { name: payloadDigest, logicalType: SHA256Digest, required: true, unique: false }
      - { name: traceparent, logicalType: String, required: false, unique: false }
      - { name: data, logicalType: Object, required: true, unique: false }
    entityConstraints:
      - Only the twelve required C01 global fields and optional traceparent are permitted; retailerId, placementGeneration, profile and serializedBytes are forbidden on the wire.
      - scope is global; messageType is identity.global.audit.recorded; schemaVersion is 1.0.0; messageId and correlationId are UUIDs; causationId is a UUID or null only for a root decision; idempotencyKey has 16 to 128 characters.
      - actor is a closed object with type anonymous and subjectId anonymous, or type in [user, service, scheduler] with a nonempty subjectId of at most 200 characters.
      - producer is a closed object with serviceId identity-access and required subjectId, audience and protocolVersion; subjectId and audience are nonempty strings of at most 200 characters and protocolVersion is a semantic version.
      - Digest, immutable identity and authenticated-producer rules are the same as for the tenant envelope.

  - name: EnvelopeTransportMetadata
    description: Adapter and broker metadata outside the closed C01 serialized envelope.
    attributes:
      - { name: profile, logicalType: Enum, required: true, unique: false, allowedValues: [tenant, global-identity-audit] }
      - { name: route, logicalType: Identifier, required: true, unique: false }
      - { name: serializedBytes, logicalType: NonNegativeInteger, required: true, unique: false, max: 65536 }
    entityConstraints:
      - Select one profile from the validated wire shape and authenticated route; compute serializedBytes from the full UTF-8 wire envelope, never from broker headers or an estimate.
      - Global identity-audit messages use their dedicated route and dead-letter path; neither profile is coerced into the other.

  # Delivery, replay and conformance objects

  - name: ProducerBinding
    description: Verification of the registered workload against protocol identity and route.
    attributes:
      - { name: serviceId, logicalType: Identifier, required: true, unique: false }
      - { name: subjectId, logicalType: Identifier, required: true, unique: false }
      - { name: audience, logicalType: Identifier, required: true, unique: false }
      - { name: allowedMessageTypes, logicalType: IdentifierSet, required: true, unique: false }
      - { name: allowedRoutes, logicalType: IdentifierSet, required: true, unique: false }
      - { name: supportedProtocolRange, logicalType: VersionRange, required: true, unique: false }
    entityConstraints:
      - Token subject, client, audience, registered producer, route and message type must agree before publish and before consumer acceptance.
      - A producer binding never establishes human or retailer authority.

  - name: DeliveryCycle
    description: Transport-only attempt identity for an immutable message; authoritative state stays with broker or domain owner.
    attributes:
      - { name: messageId, logicalType: Identifier, required: true, unique: false }
      - { name: cycleId, logicalType: Identifier, required: true, unique: false }
      - { name: currentAttempt, logicalType: Integer, required: true, unique: false, min: 1, max: 5 }
      - { name: disposition, logicalType: Enum, required: true, unique: false, allowedValues: [pending, confirmed, delivered, dead-lettered] }
      - { name: canonicalEnvelopeDigest, logicalType: SHA256Digest, required: true, unique: false }
    entityConstraints:
      - Initial delivery is attempt one; attempts two through five wait 1, 2, 4 and 8 seconds without jitter.
      - Attempt six cannot be delivered. Replay starts a new bounded cycle but retains messageId and canonical envelope.

  - name: DeadLetterEntry
    description: Transport evidence for a message exhausted at attempt five.
    attributes:
      - { name: messageId, logicalType: Identifier, required: true, unique: false }
      - { name: profile, logicalType: Enum, required: true, unique: false, allowedValues: [tenant, global-identity-audit] }
      - { name: deadLetteredAt, logicalType: Instant, required: true, unique: false }
      - { name: expiresAt, logicalType: Instant, required: true, unique: false }
      - { name: failureClass, logicalType: SafeCode, required: true, unique: false }
    entityConstraints:
      - Retention lasts seven days; global identity-audit entries keep a separate route.
      - Expiration yields evidence and a request for authoritative-state reconciliation, never a claim that business state was repaired.

  - name: ReplayInstruction
    description: A bounded transport instruction issued only after the owning authority audited and authorized replay.
    attributes:
      - { name: replayRequestId, logicalType: Identifier, required: true, unique: true }
      - { name: messageIds, logicalType: IdentifierList, required: true, unique: false, minItems: 1, maxItems: 100, uniqueItems: true }
      - { name: authorizedScope, logicalType: Enum, required: true, unique: false, allowedValues: [tenant, global-identity-audit] }
      - { name: authorityEvidenceRef, logicalType: Reference, required: true, unique: false }
      - { name: requestDigest, logicalType: SHA256Digest, required: true, unique: false }
      - { name: ownerReplayLedgerRef, logicalType: Reference, required: true, unique: false }
    entityConstraints:
      - U14 verifies a valid owner-issued replay authorization reference; U10 or the domain owner checks current platform or retailer Operator authority.
      - The owning service persists the audited replay request, request digest, deterministic per-message cycle identities, and pending state before dispatch; it stores the exact final or partial result when known. U14 is stateless and uses owner-supplied prior state on retry.
      - Exact retry of replayRequestId and requestDigest returns the prior owner result without starting another cycle; changed batch or scope under that ID conflicts. In-progress retries resume the same cycle identities after broker/owner reconciliation.
      - A lost broker confirmation may cause at-least-once physical redelivery under the same cycleId; the owner ledger and consumer inbox prevent a second logical cycle or business effect rather than promising broker exactly-once.
      - Changed payload, mixed unauthorized scopes and batches over 100 are rejected atomically.

  - name: PackageConformanceRecord
    description: Version-bound result from U1-governed fixtures for each independent language package.
    attributes:
      - { name: language, logicalType: Enum, required: true, unique: false, allowedValues: [dotnet, python] }
      - { name: packageVersion, logicalType: SemanticVersion, required: true, unique: false }
      - { name: protocolRange, logicalType: VersionRange, required: true, unique: false }
      - { name: fixtureVersion, logicalType: SemanticVersion, required: true, unique: false }
      - { name: result, logicalType: Enum, required: true, unique: false, allowedValues: [passed, failed, limited, not-run] }
      - { name: evidenceDigest, logicalType: SHA256Digest, required: true, unique: false }
    entityConstraints:
      - Both package implementations must pass the same applicable fixture version before release.
      - U13 receives versioned U14 results plus separate U3/U4 bootstrap publisher results; U14 cannot claim their tests as its own.
relationships:
  - { from: ProducerBinding, to: TenantEnvelope, cardinality: "1:many", direction: validates-before-publish-and-consume }
  - { from: ProducerBinding, to: GlobalIdentityAuditEnvelope, cardinality: "1:many", direction: validates-before-publish-and-consume }
  - { from: TenantEnvelope, to: DeliveryCycle, cardinality: "1:many", direction: retains-identity-across-replay }
  - { from: GlobalIdentityAuditEnvelope, to: DeliveryCycle, cardinality: "1:many", direction: retains-identity-across-replay }
  - { from: DeliveryCycle, to: DeadLetterEntry, cardinality: "1:zero-or-one", direction: exhausts-at-attempt-five }
  - { from: ReplayInstruction, to: DeliveryCycle, cardinality: "1:one-to-one-hundred", direction: starts-new-cycle }
```

## Delivery ownership and conformance

The two envelope entities describe mutually exclusive wire shapes, while `EnvelopeTransportMetadata` and `DeliveryCycle` describe out-of-band route, size and retry mechanics. None is a U14 database. The owning producer/consumer and broker persist the necessary delivery and effect state. The owning service durably stores replay request/result state and deterministic cycle identities before/after dispatch as applicable; U14 consults those owner-supplied values and holds no replay ledger. `PackageConformanceRecord` is release evidence, while U1 retains protocol governance.
