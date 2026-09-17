# Retail Data Functional Entity Model

Unit: U4 Retail Data (`retail-data`)

Decision basis: confirmed Retail Data Functional Design answers dated 2026-09-12.

Sources: `inception/units-generation/unit-of-work.md`, `inception/units-generation/unit-of-work-story-map.md`, `inception/requirements-analysis/requirements.md`, `inception/domain-design/components.md`, `inception/contract-design/contract-summary.md`, and the confirmed `functional-design-questions.md`.

The YAML block is the source of truth for the Tenant Directory, Inventory, and Demand History logical model. Planning and Purchasing retain ownership of proposals, orders, receipts, and inbound supply. The shared v1 deployment permits an atomic receipt transaction without transferring entity ownership.

## Source-of-truth entity model

```yaml source-of-truth
schemaVersion: "1.0.0"
unit: retail-data
entities:
  - name: Retailer
    description: An isolated commercial tenant and the root of all Retail Data authority.
    attributes:
      - { name: retailerId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerCode, logicalType: String, required: true, unique: true, constraints: "Stable, case-normalized operator-facing code." }
      - { name: displayName, logicalType: String, required: true, unique: false }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [active, suspended, retired], default: active }
      - { name: createdAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - Every tenant-owned entity carries retailerId and belongs to exactly one Retailer.
      - Retirement preserves identifiers, settings, memberships, and business history.

  - name: RetailerSettingVersion
    description: An immutable effective-dated currency and time-zone configuration for one retailer.
    attributes:
      - { name: settingVersionId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: version, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: currencyCode, logicalType: CurrencyCode, required: true, unique: false, constraints: "ISO 4217 code." }
      - { name: timeZoneId, logicalType: TimeZoneId, required: true, unique: false, constraints: "Canonical IANA time-zone identifier." }
      - { name: effectiveFrom, logicalType: Instant, required: true, unique: false }
      - { name: effectiveLocalDate, logicalType: LocalDate, required: true, unique: false }
      - { name: supersededAt, logicalType: Instant, required: false, unique: false }
    entityConstraints:
      - The pair retailerId and version is unique.
      - Effective intervals cannot overlap and cannot reinterpret an existing local date.
      - Currency cannot change after the retailer has any accepted monetary record.

  - name: Store
    description: A retailer-owned stocking location.
    attributes:
      - { name: storeId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: storeCode, logicalType: String, required: true, unique: false }
      - { name: displayName, logicalType: String, required: true, unique: false }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [active, retired], default: active }
    entityConstraints:
      - The pair retailerId and storeCode is unique.
      - A retired store remains referentially available to historical movements and observations.

  - name: Membership
    description: An explicit effective-dated association between an authenticated account and a retailer.
    attributes:
      - { name: membershipId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: accountId, logicalType: ExternalIdentifier, required: true, unique: false, constraints: "Stable account reference supplied by Identity Access." }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [pending, active, revoked], default: pending }
      - { name: effectiveFrom, logicalType: Instant, required: false, unique: false }
      - { name: revokedAt, logicalType: Instant, required: false, unique: false }
      - { name: version, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
    entityConstraints:
      - The pair retailerId and accountId is unique among non-revoked memberships.
      - Only active memberships authorize retailer access.
      - Revocation is immediately authoritative and does not erase prior activity.

  - name: MembershipRole
    description: One explicit role grant attached to a membership.
    attributes:
      - { name: membershipRoleId, logicalType: Identifier, required: true, unique: true }
      - { name: membershipId, logicalType: Identifier, required: true, unique: false, references: Membership.membershipId }
      - { name: role, logicalType: Enum, required: true, unique: false, allowedValues: [planner, manager] }
      - { name: grantedAt, logicalType: Instant, required: true, unique: false }
      - { name: revokedAt, logicalType: Instant, required: false, unique: false }
    entityConstraints:
      - The pair membershipId and role is unique while the grant is current.
      - A membership may hold Planner and Manager concurrently.

  - name: RetailerPlacement
    description: The authoritative current storage target and generation for one retailer's data plane.
    attributes:
      - { name: placementId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: true, references: Retailer.retailerId }
      - { name: targetKey, logicalType: String, required: true, unique: false, constraints: "Server-resolved target; never accepted as client authority." }
      - { name: generation, logicalType: PositiveInteger, required: true, unique: false, default: 1, min: 1 }
      - { name: state, logicalType: Enum, required: true, unique: false, allowedValues: [active, draining, validating, cutover, failed], default: active }
      - { name: lastChangedAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - Every target or lifecycle-state change increments generation atomically.
      - Tenant Directory retains this entity in the shared control plane after extraction.

  - name: PlacementTransition
    description: The immutable evidence and progress record for one tenant-placement change.
    attributes:
      - { name: transitionId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: fromGeneration, logicalType: PositiveInteger, required: true, unique: false }
      - { name: toGeneration, logicalType: PositiveInteger, required: true, unique: false }
      - { name: sourceTargetKey, logicalType: String, required: true, unique: false }
      - { name: destinationTargetKey, logicalType: String, required: true, unique: false }
      - { name: state, logicalType: Enum, required: true, unique: false, allowedValues: [requested, draining, copied, validated, committed, rolledBack, failed] }
      - { name: snapshotDigest, logicalType: Digest, required: false, unique: false }
      - { name: outboxWatermark, logicalType: Version, required: false, unique: false }
      - { name: firstDestinationWriteAt, logicalType: Instant, required: false, unique: false }
    entityConstraints:
      - At most one non-terminal transition exists for a retailer.
      - Rollback is permitted only before firstDestinationWriteAt is set.

  - name: Product
    description: A stable retailer-owned catalog item independent of its store positions.
    attributes:
      - { name: productId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: sku, logicalType: String, required: true, unique: false, constraints: "Case-normalized and never reused within the retailer." }
      - { name: name, logicalType: String, required: true, unique: false }
      - { name: category, logicalType: String, required: true, unique: false }
      - { name: acquisitionUnitCost, logicalType: Money, required: true, unique: false, min: 0 }
      - { name: currencyCode, logicalType: CurrencyCode, required: true, unique: false }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [active, retired], default: active }
      - { name: version, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
    entityConstraints:
      - The pair retailerId and sku is unique for all time.
      - Product currency equals the retailer currency effective when the product version is accepted.
      - Retirement blocks new operational effects but preserves history.

  - name: InventoryPosition
    description: The transactionally maintained current on-hand projection for one product at one store.
    attributes:
      - { name: positionId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: storeId, logicalType: Identifier, required: true, unique: false, references: Store.storeId }
      - { name: productId, logicalType: Identifier, required: true, unique: false, references: Product.productId }
      - { name: onHandUnits, logicalType: NonNegativeInteger, required: true, unique: false, default: 0, min: 0 }
      - { name: version, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: inventoryWatermark, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: observedAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - The tuple retailerId, storeId, and productId is unique.
      - The quantity equals the prior position plus all committed movement quantities.
      - Inbound and purchasing state are referenced snapshot inputs, not owned quantities.

  - name: StockMovement
    description: An immutable authoritative change to one inventory position.
    attributes:
      - { name: movementId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: positionId, logicalType: Identifier, required: true, unique: false, references: InventoryPosition.positionId }
      - { name: movementType, logicalType: Enum, required: true, unique: false, allowedValues: [openingImport, reconciliationAdjustment, receipt, simulationSale] }
      - { name: quantityDelta, logicalType: Integer, required: true, unique: false, constraints: "Non-zero except an explicitly recorded no-change reconciliation result." }
      - { name: resultingOnHandUnits, logicalType: NonNegativeInteger, required: true, unique: false, min: 0 }
      - { name: reasonCode, logicalType: String, required: true, unique: false }
      - { name: sourceType, logicalType: Enum, required: true, unique: false, allowedValues: [inventoryImport, receipt, simulation, compensatingAdjustment] }
      - { name: sourceId, logicalType: Identifier, required: true, unique: false }
      - { name: occurredAt, logicalType: Instant, required: true, unique: false }
      - { name: actorId, logicalType: ExternalIdentifier, required: true, unique: false }
    entityConstraints:
      - Movements cannot be updated or deleted through business behavior.
      - Source identity plus source type is unique for effects that must occur once.

  - name: ImportBatch
    description: The common immutable identity, evidence, and outcome for one inventory or demand CSV submission.
    attributes:
      - { name: batchId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: storeId, logicalType: Identifier, required: false, unique: false, references: Store.storeId }
      - { name: importKind, logicalType: Enum, required: true, unique: false, allowedValues: [inventory, demand] }
      - { name: version, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: rawSourceReference, logicalType: ObjectReference, required: true, unique: true }
      - { name: rawDigest, logicalType: Digest, required: true, unique: false }
      - { name: normalizedDigest, logicalType: Digest, required: true, unique: false }
      - { name: rowCount, logicalType: NonNegativeInteger, required: true, unique: false, min: 0 }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [pending, validating, accepted, rejected, failed] }
      - { name: acceptedAt, logicalType: Instant, required: false, unique: false }
      - { name: resultingWatermark, logicalType: Version, required: false, unique: false }
    entityConstraints:
      - Exact retailer, store, kind, and normalized-digest replay returns the original batch result.
      - Accepted and rejected results are immutable; corrected content creates a new batch version.
      - Accepted batches are all-or-nothing.

  - name: ImportDiagnostic
    description: A bounded field or row explanation produced while validating an import.
    attributes:
      - { name: diagnosticId, logicalType: Identifier, required: true, unique: true }
      - { name: batchId, logicalType: Identifier, required: true, unique: false, references: ImportBatch.batchId }
      - { name: rowNumber, logicalType: PositiveInteger, required: false, unique: false }
      - { name: fieldName, logicalType: String, required: false, unique: false }
      - { name: code, logicalType: String, required: true, unique: false }
      - { name: message, logicalType: String, required: true, unique: false }
      - { name: severity, logicalType: Enum, required: true, unique: false, allowedValues: [error, warning] }
    entityConstraints:
      - At most 100 diagnostics are returned or persisted per batch result; truncation is explicit.
      - Diagnostics reveal no foreign-tenant values.

  - name: DemandObservation
    description: An immutable source-versioned observed sales and lost-demand fact for one local date.
    attributes:
      - { name: demandObservationId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: storeId, logicalType: Identifier, required: true, unique: false, references: Store.storeId }
      - { name: productId, logicalType: Identifier, required: true, unique: false, references: Product.productId }
      - { name: localDate, logicalType: LocalDate, required: true, unique: false }
      - { name: settingVersionId, logicalType: Identifier, required: true, unique: false, references: RetailerSettingVersion.settingVersionId }
      - { name: salesUnits, logicalType: NonNegativeInteger, required: true, unique: false, min: 0 }
      - { name: lostDemandUnits, logicalType: NonNegativeInteger, required: true, unique: false, min: 0 }
      - { name: sourceBatchId, logicalType: Identifier, required: true, unique: false, references: ImportBatch.batchId }
      - { name: sourceVersion, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: supersedesObservationId, logicalType: Identifier, required: false, unique: false, references: DemandObservation.demandObservationId }
      - { name: effective, logicalType: Boolean, required: true, unique: false, default: true }
    entityConstraints:
      - At most one observation is effective for a retailer/store/product/local-date key.
      - A correction appends a new observation and preserves the superseded lineage.
      - True observed demand equals salesUnits plus lostDemandUnits without erasing either component.

  - name: PromotionObservation
    description: An immutable promotion fact available at its recorded business time.
    attributes:
      - { name: promotionObservationId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: storeId, logicalType: Identifier, required: true, unique: false, references: Store.storeId }
      - { name: productId, logicalType: Identifier, required: true, unique: false, references: Product.productId }
      - { name: localDate, logicalType: LocalDate, required: true, unique: false }
      - { name: promotionType, logicalType: String, required: true, unique: false }
      - { name: intensity, logicalType: Decimal, required: true, unique: false, min: 0, max: 1 }
      - { name: knownAt, logicalType: Instant, required: true, unique: false }
      - { name: sourceBatchId, logicalType: Identifier, required: true, unique: false, references: ImportBatch.batchId }
      - { name: effective, logicalType: Boolean, required: true, unique: false, default: true }
    entityConstraints:
      - Temporal consumers may use only promotions known at their allowed cutoff.
      - Corrections append and supersede rather than update history in place.

  - name: SyntheticDemandTruth
    description: Protected latent demand used only for explicit synthetic evaluation.
    attributes:
      - { name: truthId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: storeId, logicalType: Identifier, required: true, unique: false, references: Store.storeId }
      - { name: productId, logicalType: Identifier, required: true, unique: false, references: Product.productId }
      - { name: localDate, logicalType: LocalDate, required: true, unique: false }
      - { name: trueDemandUnits, logicalType: NonNegativeInteger, required: true, unique: false, min: 0 }
      - { name: scenarioVersion, logicalType: Version, required: true, unique: false }
      - { name: sourceBatchId, logicalType: Identifier, required: true, unique: false, references: ImportBatch.batchId }
    entityConstraints:
      - Operational, forecasting-input, training, and assistant ports cannot return this entity.
      - Only an authorized evaluation-purpose contract may read it.

  - name: RetailDataSnapshotManifest
    description: An immutable reproducibility boundary for authorized downstream reads.
    attributes:
      - { name: snapshotId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: placementGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: purpose, logicalType: Enum, required: true, unique: false, allowedValues: [forecasting, modelEvaluation, replenishment, assistantEvidence, recoveryVerification] }
      - { name: sourceVersions, logicalType: VersionMap, required: true, unique: false }
      - { name: inventoryWatermark, logicalType: PositiveInteger, required: true, unique: false }
      - { name: localDateFrom, logicalType: LocalDate, required: false, unique: false }
      - { name: localDateTo, logicalType: LocalDate, required: false, unique: false }
      - { name: createdAt, logicalType: Instant, required: true, unique: false }
      - { name: contentDigest, logicalType: Digest, required: true, unique: false }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [available, archived, purged] }
    entityConstraints:
      - Manifest content and version references do not change after publication.
      - Purged or unavailable content is reported explicitly and never silently substituted.

  - name: IdempotencyRecord
    description: The payload-bound outcome of one accepted or rejected mutation key.
    attributes:
      - { name: idempotencyRecordId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: operation, logicalType: String, required: true, unique: false }
      - { name: idempotencyKey, logicalType: String, required: true, unique: false }
      - { name: requestDigest, logicalType: Digest, required: true, unique: false }
      - { name: outcomeReference, logicalType: Identifier, required: true, unique: false }
      - { name: completedAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - The tuple retailerId, operation, and idempotencyKey is unique.
      - Matching retries return the recorded outcome; digest mismatch is a conflict.

  - name: BusinessAuditRecord
    description: An immutable authoritative account of a Retail Data decision or attempted privileged action.
    attributes:
      - { name: auditId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: actorType, logicalType: Enum, required: true, unique: false, allowedValues: [human, service, system] }
      - { name: actorId, logicalType: ExternalIdentifier, required: true, unique: false }
      - { name: action, logicalType: String, required: true, unique: false }
      - { name: targetType, logicalType: String, required: true, unique: false }
      - { name: targetId, logicalType: Identifier, required: false, unique: false }
      - { name: outcome, logicalType: Enum, required: true, unique: false, allowedValues: [accepted, rejected, failed] }
      - { name: correlationId, logicalType: Identifier, required: true, unique: false }
      - { name: placementGeneration, logicalType: PositiveInteger, required: true, unique: false }
      - { name: provenance, logicalType: Metadata, required: true, unique: false }
      - { name: occurredAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - Accepted mutation audit records commit with the business effect.
      - Rejected-attempt records use an independent bounded transaction and contain no foreign data.
      - Runtime behavior cannot update or delete audit history.

  - name: OutboxMessage
    description: A durable event publication record committed with an authoritative Retail Data mutation.
    attributes:
      - { name: messageId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: messageType, logicalType: String, required: true, unique: false }
      - { name: schemaVersion, logicalType: Version, required: true, unique: false }
      - { name: payloadDigest, logicalType: Digest, required: true, unique: false }
      - { name: placementGeneration, logicalType: PositiveInteger, required: true, unique: false }
      - { name: occurredAt, logicalType: Instant, required: true, unique: false }
      - { name: publicationState, logicalType: Enum, required: true, unique: false, allowedValues: [pending, published, deadLettered], default: pending }
      - { name: attemptCount, logicalType: NonNegativeInteger, required: true, unique: false, default: 0 }
    entityConstraints:
      - The business mutation, accepted audit record, and outbox message share one commit boundary.
      - Publication status does not alter the committed business effect.

  - name: InboxReceipt
    description: A consumer-side deduplication and processing result for one received message.
    attributes:
      - { name: inboxReceiptId, logicalType: Identifier, required: true, unique: true }
      - { name: consumer, logicalType: String, required: true, unique: false }
      - { name: messageId, logicalType: Identifier, required: true, unique: false }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: placementGeneration, logicalType: PositiveInteger, required: true, unique: false }
      - { name: requestDigest, logicalType: Digest, required: true, unique: false }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [processing, completed, rejected, failed] }
      - { name: completedAt, logicalType: Instant, required: false, unique: false }
    entityConstraints:
      - The pair consumer and messageId is unique.
      - Acknowledgement follows the inbox and business commit.

relationships:
  - { from: Retailer, to: RetailerSettingVersion, cardinality: "1:N", direction: "Retailer owns setting history" }
  - { from: Retailer, to: Store, cardinality: "1:N", direction: "Retailer owns stores" }
  - { from: Retailer, to: Membership, cardinality: "1:N", direction: "Retailer grants memberships" }
  - { from: Membership, to: MembershipRole, cardinality: "1:N", direction: "Membership carries role grants" }
  - { from: Retailer, to: RetailerPlacement, cardinality: "1:1", direction: "Retailer has current placement" }
  - { from: RetailerPlacement, to: PlacementTransition, cardinality: "1:N", direction: "Placement accumulates transitions" }
  - { from: Retailer, to: Product, cardinality: "1:N", direction: "Retailer owns products" }
  - { from: Store, to: InventoryPosition, cardinality: "1:N", direction: "Store holds positions" }
  - { from: Product, to: InventoryPosition, cardinality: "1:N", direction: "Product may be stocked at many stores" }
  - { from: InventoryPosition, to: StockMovement, cardinality: "1:N", direction: "Position is explained by movements" }
  - { from: ImportBatch, to: ImportDiagnostic, cardinality: "1:N", direction: "Batch reports bounded diagnostics" }
  - { from: ImportBatch, to: StockMovement, cardinality: "1:N", direction: "Accepted inventory batch creates movements" }
  - { from: ImportBatch, to: DemandObservation, cardinality: "1:N", direction: "Accepted demand batch creates observations" }
  - { from: DemandObservation, to: DemandObservation, cardinality: "0..1:N", direction: "Correction supersedes prior observation" }
  - { from: Retailer, to: RetailDataSnapshotManifest, cardinality: "1:N", direction: "Retailer publishes immutable snapshots" }
  - { from: BusinessAuditRecord, to: OutboxMessage, cardinality: "1:0..N", direction: "Accepted decisions publish events" }
```

## Entity summary

| Module | Authoritative entities | Key invariant |
| --- | --- | --- |
| Tenant Directory | Retailer, RetailerSettingVersion, Store, Membership, MembershipRole, RetailerPlacement, PlacementTransition | Explicit current grants and generation-checked placement decide authority. |
| Inventory | Product, InventoryPosition, StockMovement | Immutable movements conserve non-negative integer stock; positions are a transactional projection. |
| Demand History | DemandObservation, PromotionObservation, SyntheticDemandTruth | Observed data remains versioned and synthetic truth stays behind an evaluation-only boundary. |
| Import and snapshot boundary | ImportBatch, ImportDiagnostic, RetailDataSnapshotManifest | Inputs and downstream reads are immutable, checksummed, bounded, and reproducible. |
| Reliability evidence | IdempotencyRecord, BusinessAuditRecord, OutboxMessage, InboxReceipt | Retries are payload-bound and accepted effects commit with audit and outbox evidence. |

Purchasing-owned receipt and order entities reference Inventory products and positions through public module ports. Redis contains only disposable versioned views and is intentionally absent from the authoritative entity model.
