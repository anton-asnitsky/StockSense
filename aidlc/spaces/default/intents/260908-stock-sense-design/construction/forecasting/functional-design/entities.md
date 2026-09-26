# Forecasting Entity Model

Unit: U7 Forecasting (`forecasting`)

Confirmation basis: Forecasting consolidated summary reconfirmed as `Looks correct` on 2026-09-25; the owner then directed correction of four review findings. Revised C07/C10/C13 integration behavior awaits review and conformance evidence.

The YAML block is the source of truth for Forecasting data shape, invariants, and relationships. The entities are logical records and do not prescribe storage technology. References to Retail Data, Model Lifecycle, identity, Planning, Audit Evidence, and platform capabilities are contract references; Forecasting does not own those units' records or calculations.

```yaml source-of-truth
schemaVersion: "1.0.0"
unit: forecasting
entities:
  - name: ForecastRequest
    description: "The immutable business request for one retailer-local forecast date and one server-assigned revision."
    attributes:
      - name: forecastRequestId
        logicalType: Identifier
        required: true
        unique: true
        constraints: "Globally stable and never reused."
      - name: retailerId
        logicalType: Identifier
        required: true
        unique: false
        references: TenantDirectory.Retailer.retailerId
        constraints: "Selects tenant context but never grants authority."
      - name: retailerLocalDate
        logicalType: LocalDate
        required: true
        unique: false
        constraints: "Interpreted only with the pinned retailer calendar and time-zone version."
      - name: requestKind
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [scheduled, operatorRerun]
      - name: revision
        logicalType: PositiveInteger
        required: true
        unique: false
        minValue: 1
        constraints: "Server assigned and strictly increasing within retailerId and retailerLocalDate."
      - name: logicalScheduleKey
        logicalType: StableBusinessKey
        required: false
        unique: true
        constraints: "Required for the initial scheduled request, absent for Operator reruns, and deterministically represents retailerId and retailerLocalDate."
      - name: operationIdempotencyKey
        logicalType: IdempotencyKey
        required: true
        unique: false
        constraints: "Unique within retailer and operation family; stored with requestDigest."
      - name: requestDigest
        logicalType: Digest
        required: true
        unique: false
        constraints: "A replay under the same idempotency key must have the same digest."
      - name: requestedLocalTime
        logicalType: LocalTime
        required: true
        unique: false
        default: "02:00:00"
      - name: resolvedDueAtUtc
        logicalType: Instant
        required: true
        unique: false
        constraints: "Uses the deterministic invalid-time and ambiguous-time policy."
      - name: calendarVersion
        logicalType: VersionIdentifier
        required: true
        unique: false
        references: TenantDirectory.RetailerCalendar.calendarVersion
      - name: placementGeneration
        logicalType: PositiveInteger
        required: true
        unique: false
        minValue: 1
        references: TenantDirectory.RetailerPlacement.generation
      - name: requestedByActorType
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [scheduler, user]
      - name: requestedBySubjectId
        logicalType: SubjectIdentifier
        required: true
        unique: false
      - name: rerunReason
        logicalType: Text
        required: false
        unique: false
        constraints: "Required for operatorRerun and absent for scheduled requests."
      - name: correlationId
        logicalType: Identifier
        required: true
        unique: false
      - name: requestedAt
        logicalType: Instant
        required: true
        unique: false
    entityConstraints:
      - "The tuple retailerId, retailerLocalDate, revision is unique."
      - "Exactly one initial scheduled request exists for a retailer and local date; delivery time, retry count, and scheduler instance do not change its identity."
      - "A matching replay returns the existing request; a changed request digest under the same key conflicts and creates no request."
      - "An Operator rerun creates the next revision and never mutates an earlier request."

  - name: ForecastRun
    description: "The immutable logical execution for one ForecastRequest revision, with one pinned dependency snapshot and an aggregate terminal outcome."
    attributes:
      - name: forecastRunId
        logicalType: Identifier
        required: true
        unique: true
      - name: forecastRequestId
        logicalType: Identifier
        required: true
        unique: true
        references: ForecastRequest.forecastRequestId
      - name: retailerId
        logicalType: Identifier
        required: true
        unique: false
        references: ForecastRequest.retailerId
      - name: retailerLocalDate
        logicalType: LocalDate
        required: true
        unique: false
        references: ForecastRequest.retailerLocalDate
      - name: revision
        logicalType: PositiveInteger
        required: true
        unique: false
        minValue: 1
        references: ForecastRequest.revision
      - name: lifecycleStatus
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [admitted, queued, running, succeeded, partiallySucceeded, failed]
        default: admitted
      - name: availabilityStatus
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [pending, available, partiallyAvailable, unavailable]
        default: pending
      - name: admittedAt
        logicalType: Instant
        required: true
        unique: false
      - name: startedAt
        logicalType: Instant
        required: false
        unique: false
      - name: completedAt
        logicalType: Instant
        required: false
        unique: false
      - name: latestAttemptNumber
        logicalType: NonNegativeInteger
        required: true
        unique: false
        minValue: 0
        default: 0
      - name: totalProductCount
        logicalType: NonNegativeInteger
        required: true
        unique: false
        minValue: 0
      - name: succeededProductCount
        logicalType: NonNegativeInteger
        required: true
        unique: false
        minValue: 0
        default: 0
      - name: failedProductCount
        logicalType: NonNegativeInteger
        required: true
        unique: false
        minValue: 0
        default: 0
      - name: failureCode
        logicalType: StableReasonCode
        required: false
        unique: false
      - name: failureDetail
        logicalType: SafeText
        required: false
        unique: false
        constraints: "Excludes credentials, tokens, raw protected inputs, and cross-tenant details."
      - name: recordVersion
        logicalType: PositiveInteger
        required: true
        unique: false
        minValue: 1
        constraints: "Used for guarded transitions before the run reaches a terminal immutable state."
    entityConstraints:
      - "One ForecastRun belongs to exactly one ForecastRequest and reuses that request's retailer, local date, and revision."
      - "Succeeded, partiallySucceeded, and failed are terminal; retries append attempts rather than reopen or rewrite the run."
      - "Product counts reconcile to the pinned active product scope before a terminal outcome is recorded."
      - "A later request revision never changes this run's pinned inputs, outputs, or outcome."

  - name: ForecastInputSnapshot
    description: "The immutable Retail Data and configuration snapshot admitted for a ForecastRun."
    attributes:
      - name: inputSnapshotId
        logicalType: Identifier
        required: true
        unique: true
      - name: forecastRunId
        logicalType: Identifier
        required: true
        unique: true
        references: ForecastRun.forecastRunId
      - name: retailerId
        logicalType: Identifier
        required: true
        unique: false
        references: ForecastRun.retailerId
      - name: sourceVersion
        logicalType: VersionIdentifier
        required: true
        unique: false
        references: DemandHistory.SourceVersion.sourceVersion
      - name: sourceChecksum
        logicalType: Digest
        required: true
        unique: false
      - name: availabilityCutoff
        logicalType: Instant
        required: true
        unique: false
        constraints: "No observation first available after this instant may affect the run."
      - name: demandSchemaVersion
        logicalType: VersionIdentifier
        required: true
        unique: false
      - name: promotionSchemaVersion
        logicalType: VersionIdentifier
        required: true
        unique: false
      - name: calendarVersion
        logicalType: VersionIdentifier
        required: true
        unique: false
        references: ForecastRequest.calendarVersion
      - name: timeZoneIdentifier
        logicalType: TimeZoneIdentifier
        required: true
        unique: false
      - name: productScopeDigest
        logicalType: Digest
        required: true
        unique: false
        constraints: "Covers the complete ordered set of active retailer, store, and product identities admitted for the run."
      - name: activeProductCount
        logicalType: PositiveInteger
        required: true
        unique: false
        minValue: 1
      - name: forecastingConfigurationVersion
        logicalType: VersionIdentifier
        required: true
        unique: false
      - name: forecastingConfigurationDigest
        logicalType: Digest
        required: true
        unique: false
      - name: placementGeneration
        logicalType: PositiveInteger
        required: true
        unique: false
        minValue: 1
        references: ForecastRequest.placementGeneration
      - name: pinnedAt
        logicalType: Instant
        required: true
        unique: false
    entityConstraints:
      - "Exactly one snapshot is pinned before a run is queued."
      - "All attempts use this snapshot; mutable current data is never re-read as a replacement."
      - "Source, calendar, product scope, configuration, schemas, cutoff, and placement must all describe the same retailer context."

  - name: ForecastModelResolution
    description: "The immutable result of server-side active-model resolution supplied by Model Lifecycle for one ForecastRun."
    attributes:
      - name: modelResolutionId
        logicalType: Identifier
        required: true
        unique: true
      - name: forecastRunId
        logicalType: Identifier
        required: true
        unique: true
        references: ForecastRun.forecastRunId
      - name: retailerId
        logicalType: Identifier
        required: true
        unique: false
        references: ForecastRun.retailerId
      - name: modelReleaseId
        logicalType: Identifier
        required: true
        unique: false
        references: ModelLifecycle.ModelRelease.modelReleaseId
      - name: modelVersion
        logicalType: VersionIdentifier
        required: true
        unique: false
        references: ModelLifecycle.ModelVersion.modelVersion
      - name: modelKind
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [seasonalNaive, movingAverage, trained]
      - name: promotionId
        logicalType: Identifier
        required: true
        unique: false
        references: ModelLifecycle.ModelPromotion.promotionId
      - name: routeVersion
        logicalType: VersionIdentifier
        required: true
        unique: false
      - name: routePinId
        logicalType: Identifier
        required: true
        unique: true
        constraints: "C07 durable pin admitted under the open-route/drain lock for this run."
      - name: initialForecastAttemptId
        logicalType: Identifier
        required: true
        unique: true
        constraints: "Preallocated before C07 pin admission and reused by queued attempt 1 and its first lease."
      - name: artifactReference
        logicalType: ImmutableArtifactReference
        required: true
        unique: false
        constraints: "Resolved by the server and never supplied as caller routing authority."
      - name: artifactChecksum
        logicalType: Digest
        required: true
        unique: false
      - name: packageManifestDigest
        logicalType: Digest
        required: true
        unique: false
        constraints: "C07 signed manifest digest is pinned with the resolved promotion generation."
      - name: signerId
        logicalType: Identifier
        required: true
        unique: false
      - name: trustPolicyDigest
        logicalType: Digest
        required: true
        unique: false
      - name: runtimeProfile
        logicalType: VersionedRuntimeProfile
        required: true
        unique: false
        constraints: "Must include a supported CPU inference path."
      - name: inputSchemaDigest
        logicalType: Digest
        required: true
        unique: false
      - name: outputSchemaDigest
        logicalType: Digest
        required: true
        unique: false
      - name: evaluationSummaryReference
        logicalType: ImmutableEvidenceReference
        required: true
        unique: false
        references: ModelLifecycle.EvaluationRun.evaluationRunId
      - name: activatedAt
        logicalType: Instant
        required: true
        unique: false
      - name: resolvedAt
        logicalType: Instant
        required: true
        unique: false
    entityConstraints:
      - "Exactly one active compatible Model Release is resolved and pinned per run."
      - "Forecasting cannot create, promote, roll back, or silently replace a Model Release."
      - "A missing, unavailable, unvalidated, inactive, checksum-invalid, schema-incompatible, runtime-incompatible, or foreign-tenant release makes admission unavailable or failed."
      - "Before deserialization Forecasting verifies the signed skops.io manifest and artifact digests, Ed25519 signature, current signer status, trust-policy version and digest, schema and runtime compatibility, release state and validity window."
      - "C07 pins:admit and drains:start serialize on the same route row; a run admitted before drain counts as outstanding and no old-route pin is admitted afterward."

  - name: ForecastHeavyWorkRequest
    description: "U7's durable reference to a C07 batch-forecast request owned and queued by Model Lifecycle."
    attributes:
      - name: forecastRunId
        logicalType: Identifier
        required: true
        unique: true
        references: ForecastRun.forecastRunId
      - name: routePinId
        logicalType: Identifier
        required: true
        unique: false
        references: ForecastModelResolution.routePinId
      - name: initialForecastAttemptId
        logicalType: Identifier
        required: true
        unique: false
        references: ForecastAttempt.forecastAttemptId
      - name: requestId
        logicalType: Identifier
        required: true
        unique: true
      - name: requestHash
        logicalType: Digest
        required: true
        unique: false
      - name: deadlineAt
        logicalType: Instant
        required: true
        unique: false
      - name: placementGeneration
        logicalType: PositiveInteger
        required: true
        unique: false
      - name: recoveryGeneration
        logicalType: PositiveInteger
        required: true
        unique: false
    entityConstraints:
      - "C07 owns queue position, priority, lease state and the monotonic token; U7 stores the immutable request identity and returned evidence."
      - "A duplicate request with changed canonical payload conflicts and cannot create another Forecast Run."

  - name: ForecastHeavyWorkLease
    description: "Evidence of the current C07 execution authority for a ForecastAttempt; Model Lifecycle owns the authoritative lease."
    attributes:
      - name: forecastAttemptId
        logicalType: Identifier
        required: true
        unique: true
        references: ForecastAttempt.forecastAttemptId
      - name: requestId
        logicalType: Identifier
        required: true
        unique: false
        references: ForecastHeavyWorkRequest.requestId
      - name: leaseId
        logicalType: Identifier
        required: true
        unique: true
      - name: fencingToken
        logicalType: PositiveInteger
        required: true
        unique: false
      - name: expiresAt
        logicalType: Instant
        required: true
        unique: false
      - name: placementGeneration
        logicalType: PositiveInteger
        required: true
        unique: false
      - name: recoveryGeneration
        logicalType: PositiveInteger
        required: true
        unique: false
    entityConstraints:
      - "A stored lease is evidence, not authority by itself; C07 must still confirm current active status, token, generations and expiry at finalization."
      - "Loss, cancellation, expiry or recovery fencing permanently prevents that attempt from publishing."

  - name: ForecastAttempt
    description: "A retained execution-attempt identity under one ForecastRun and its unchanged pinned inputs; nonterminal lease/status fields advance until terminal."
    attributes:
      - name: forecastAttemptId
        logicalType: Identifier
        required: true
        unique: true
      - name: forecastRunId
        logicalType: Identifier
        required: true
        unique: false
        references: ForecastRun.forecastRunId
      - name: attemptNumber
        logicalType: PositiveInteger
        required: true
        unique: false
        minValue: 1
        constraints: "Strictly increasing within the run."
      - name: lifecycleStatus
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [queued, leased, running, succeeded, failed, interrupted, cancelled]
        default: queued
      - name: workerSubjectId
        logicalType: SubjectIdentifier
        required: false
        unique: false
      - name: leaseId
        logicalType: Identifier
        required: false
        unique: true
      - name: leaseExpiresAt
        logicalType: Instant
        required: false
        unique: false
      - name: fencingToken
        logicalType: PositiveInteger
        required: false
        unique: false
      - name: recoveryGeneration
        logicalType: PositiveInteger
        required: false
        unique: false
      - name: queuedAt
        logicalType: Instant
        required: true
        unique: false
      - name: startedAt
        logicalType: Instant
        required: false
        unique: false
      - name: endedAt
        logicalType: Instant
        required: false
        unique: false
      - name: failureCode
        logicalType: StableReasonCode
        required: false
        unique: false
      - name: failureDetail
        logicalType: SafeText
        required: false
        unique: false
      - name: executionEnvironmentReference
        logicalType: ImmutableEvidenceReference
        required: true
        unique: false
        constraints: "Identifies runtime and resource evidence separately from model output."
      - name: inputSnapshotDigest
        logicalType: Digest
        required: true
        unique: false
      - name: modelResolutionDigest
        logicalType: Digest
        required: true
        unique: false
      - name: stagedOutputDigest
        logicalType: Digest
        required: false
        unique: false
        constraints: "Present only when output was produced; staged output is not consumer-visible."
    entityConstraints:
      - "The tuple forecastRunId and attemptNumber is unique."
      - "Attempt 1 is created only after the input and model digests are pinned; WF2 request admission creates no attempt."
      - "First C07 lease acquisition updates the queued attempt 1 with lease evidence; it does not append an attempt."
      - "Only the current unexpired C07 lease owner and monotonic fencing token may finalize an attempt."
      - "Terminal attempts are immutable; only a retry after a terminal attempt appends the next number under the same run."
      - "An interrupted or failed attempt cannot publish staged output."

  - name: ForecastProductOutcome
    description: "The immutable validation outcome for one active retailer, store, and product in a ForecastRun."
    attributes:
      - name: productOutcomeId
        logicalType: Identifier
        required: true
        unique: true
      - name: forecastRunId
        logicalType: Identifier
        required: true
        unique: false
        references: ForecastRun.forecastRunId
      - name: retailerId
        logicalType: Identifier
        required: true
        unique: false
        references: ForecastRun.retailerId
      - name: storeId
        logicalType: Identifier
        required: true
        unique: false
        references: TenantDirectory.Store.storeId
      - name: productId
        logicalType: Identifier
        required: true
        unique: false
        references: Inventory.Product.productId
      - name: outcome
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [succeeded, failed]
      - name: availability
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [usable, unavailable]
      - name: failureCode
        logicalType: StableReasonCode
        required: false
        unique: false
      - name: failureDetail
        logicalType: SafeText
        required: false
        unique: false
      - name: validationDigest
        logicalType: Digest
        required: true
        unique: false
      - name: finalizedAt
        logicalType: Instant
        required: true
        unique: false
    entityConstraints:
      - "The tuple forecastRunId, storeId, and productId is unique."
      - "Every product in the pinned active scope has exactly one outcome."
      - "Succeeded requires one valid ForecastSeries; failed forbids a usable series and requires a safe reason."
      - "A failed product is never represented by zero demand or a shortened series."

  - name: ForecastSeries
    description: "One immutable daily expected-demand series for a successful product outcome."
    attributes:
      - name: forecastSeriesId
        logicalType: Identifier
        required: true
        unique: true
      - name: productOutcomeId
        logicalType: Identifier
        required: true
        unique: true
        references: ForecastProductOutcome.productOutcomeId
      - name: forecastRunId
        logicalType: Identifier
        required: true
        unique: false
        references: ForecastRun.forecastRunId
      - name: retailerId
        logicalType: Identifier
        required: true
        unique: false
        references: ForecastRun.retailerId
      - name: storeId
        logicalType: Identifier
        required: true
        unique: false
        references: ForecastProductOutcome.storeId
      - name: productId
        logicalType: Identifier
        required: true
        unique: false
        references: ForecastProductOutcome.productId
      - name: horizonStartLocalDate
        logicalType: LocalDate
        required: true
        unique: false
        constraints: "The first forecast date after retailerLocalDate."
      - name: horizonDays
        logicalType: PositiveInteger
        required: true
        unique: false
        allowedValues: [28]
        default: 28
        minValue: 28
        maxValue: 28
      - name: decimalPrecisionVersion
        logicalType: VersionIdentifier
        required: true
        unique: false
      - name: seriesDigest
        logicalType: Digest
        required: true
        unique: false
      - name: generatedAt
        logicalType: Instant
        required: true
        unique: false
    entityConstraints:
      - "The tuple forecastRunId, storeId, and productId is unique."
      - "A series contains exactly 28 ordered ForecastPoints for horizon days 1 through 28."
      - "Series are append-only and cannot be edited, clipped, filled, truncated, or recalculated in place."

  - name: ForecastPoint
    description: "One finite nonnegative expected-demand value for a single retailer-local horizon date."
    attributes:
      - name: forecastPointId
        logicalType: Identifier
        required: true
        unique: true
      - name: forecastSeriesId
        logicalType: Identifier
        required: true
        unique: false
        references: ForecastSeries.forecastSeriesId
      - name: horizonDay
        logicalType: PositiveInteger
        required: true
        unique: false
        minValue: 1
        maxValue: 28
      - name: retailerLocalDate
        logicalType: LocalDate
        required: true
        unique: false
      - name: expectedDemand
        logicalType: NonNegativeFiniteDecimal
        required: true
        unique: false
        minValue: 0
        constraints: "Uses the declared deterministic decimal precision; NaN and infinities are invalid."
    entityConstraints:
      - "The tuple forecastSeriesId and horizonDay is unique."
      - "The tuple forecastSeriesId and retailerLocalDate is unique."
      - "Dates are consecutive retailer-local calendar dates beginning at horizonStartLocalDate."

  - name: ForecastPublication
    description: "The immutable publication decision for an eligible ForecastRun revision."
    attributes:
      - name: forecastPublicationId
        logicalType: Identifier
        required: true
        unique: true
      - name: forecastRunId
        logicalType: Identifier
        required: true
        unique: true
        references: ForecastRun.forecastRunId
      - name: retailerId
        logicalType: Identifier
        required: true
        unique: false
        references: ForecastRun.retailerId
      - name: retailerLocalDate
        logicalType: LocalDate
        required: true
        unique: false
        references: ForecastRun.retailerLocalDate
      - name: revision
        logicalType: PositiveInteger
        required: true
        unique: false
        minValue: 1
        references: ForecastRun.revision
      - name: publicationStatus
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [unpublished, awaitingAcknowledgement, current, rejected, superseded]
        default: unpublished
      - name: coverageDigest
        logicalType: Digest
        required: true
        unique: false
      - name: coveredProductCount
        logicalType: PositiveInteger
        required: true
        unique: false
        minValue: 1
      - name: failedProductCount
        logicalType: NonNegativeInteger
        required: true
        unique: false
        minValue: 0
      - name: publishedAt
        logicalType: Instant
        required: false
        unique: false
      - name: supersededAt
        logicalType: Instant
        required: false
        unique: false
      - name: decisionReason
        logicalType: SafeText
        required: false
        unique: false
    entityConstraints:
      - "Succeeded runs may move directly to current after atomic finalization."
      - "PartiallySucceeded runs must remain awaitingAcknowledgement until an authorized Operator records an acknowledgement."
      - "Failed, unavailable, unreconciled, corrupt, or incompatible runs cannot be current."
      - "Publication changes selection only; it never modifies a run, outcome, series, or point."

  - name: PartialPublicationAcknowledgement
    description: "An immutable Operator decision acknowledging the exact coverage and limitations of a PartiallySucceeded revision."
    attributes:
      - name: acknowledgementId
        logicalType: Identifier
        required: true
        unique: true
      - name: forecastPublicationId
        logicalType: Identifier
        required: true
        unique: true
        references: ForecastPublication.forecastPublicationId
      - name: retailerId
        logicalType: Identifier
        required: true
        unique: false
        references: ForecastPublication.retailerId
      - name: operatorSubjectId
        logicalType: SubjectIdentifier
        required: true
        unique: false
      - name: decision
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [acknowledged, rejected]
      - name: acknowledgedCoverageDigest
        logicalType: Digest
        required: true
        unique: false
        references: ForecastPublication.coverageDigest
      - name: rationale
        logicalType: SafeText
        required: true
        unique: false
        constraints: "Records the coverage and limitation judgment without editing forecast values."
      - name: expectedPublicationVersion
        logicalType: PositiveInteger
        required: true
        unique: false
        minValue: 1
      - name: decidedAt
        logicalType: Instant
        required: true
        unique: false
    entityConstraints:
      - "Only a currently authorized Operator may create the acknowledgement."
      - "The acknowledged coverage digest must still match the immutable partial publication."
      - "Acknowledgement authorizes pointer selection only and cannot convert a failed product to succeeded."

  - name: CurrentForecastPointer
    description: "The server-owned current selection for one retailer and forecast local date."
    attributes:
      - name: currentForecastPointerId
        logicalType: Identifier
        required: true
        unique: true
      - name: retailerId
        logicalType: Identifier
        required: true
        unique: false
        references: TenantDirectory.Retailer.retailerId
      - name: retailerLocalDate
        logicalType: LocalDate
        required: true
        unique: false
      - name: forecastPublicationId
        logicalType: Identifier
        required: true
        unique: true
        references: ForecastPublication.forecastPublicationId
      - name: selectedRevision
        logicalType: PositiveInteger
        required: true
        unique: false
        minValue: 1
        references: ForecastPublication.revision
      - name: pointerStatus
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [available, reconciling, unavailable]
        default: available
      - name: version
        logicalType: PositiveInteger
        required: true
        unique: false
        minValue: 1
      - name: selectedAt
        logicalType: Instant
        required: true
        unique: false
      - name: unavailableReason
        logicalType: StableReasonCode
        required: false
        unique: false
    entityConstraints:
      - "The tuple retailerId and retailerLocalDate is unique."
      - "Only Forecasting may choose or advance the pointer; caller-supplied run identifiers do not define current selection."
      - "Advancement uses the expected pointer version and is atomic with publication, audit, and outbox records."
      - "A restored pointer is not exposed while reconciling or unavailable."

  - name: ForecastPointerHistory
    description: "An immutable record of every current-pointer selection, supersession, and recovery-status change."
    attributes:
      - name: pointerHistoryId
        logicalType: Identifier
        required: true
        unique: true
      - name: currentForecastPointerId
        logicalType: Identifier
        required: true
        unique: false
        references: CurrentForecastPointer.currentForecastPointerId
      - name: priorPublicationId
        logicalType: Identifier
        required: false
        unique: false
        references: ForecastPublication.forecastPublicationId
      - name: selectedPublicationId
        logicalType: Identifier
        required: false
        unique: false
        references: ForecastPublication.forecastPublicationId
      - name: transitionKind
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [initialSelection, supersession, reconciliationStarted, reconciliationPassed, reconciliationFailed]
      - name: reasonCode
        logicalType: StableReasonCode
        required: true
        unique: false
      - name: actorType
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [service, user]
      - name: actorSubjectId
        logicalType: SubjectIdentifier
        required: true
        unique: false
      - name: occurredAt
        logicalType: Instant
        required: true
        unique: false
    entityConstraints:
      - "History is append-only and orders all pointer transitions."
      - "Supersession retains both prior and selected publication identities and never deletes either revision."

  - name: ForecastAuditRecord
    description: "The immutable authoritative business audit record appended with a Forecasting decision or rejected attempt."
    attributes:
      - name: auditRecordId
        logicalType: Identifier
        required: true
        unique: true
      - name: retailerId
        logicalType: Identifier
        required: true
        unique: false
        references: TenantDirectory.Retailer.retailerId
      - name: action
        logicalType: StableActionCode
        required: true
        unique: false
      - name: resourceType
        logicalType: EntityName
        required: true
        unique: false
      - name: resourceId
        logicalType: Identifier
        required: true
        unique: false
      - name: outcome
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [accepted, denied, failed]
      - name: actorType
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [user, service, scheduler]
      - name: actorSubjectId
        logicalType: SubjectIdentifier
        required: true
        unique: false
      - name: correlationId
        logicalType: Identifier
        required: true
        unique: false
      - name: causationId
        logicalType: Identifier
        required: true
        unique: false
      - name: placementGeneration
        logicalType: PositiveInteger
        required: true
        unique: false
        minValue: 1
      - name: provenanceDigest
        logicalType: Digest
        required: true
        unique: false
      - name: occurredAt
        logicalType: Instant
        required: true
        unique: false
      - name: retentionClass
        logicalType: VersionedRetentionClass
        required: true
        unique: false
    entityConstraints:
      - "Accepted mutations append audit in the same authoritative transaction as the business effect and outbox record."
      - "Denied or rejected attempts use a separate durable path so their audit survives business rollback."
      - "Runtime actors cannot update or delete audit records; controlled retention has separate authority."

  - name: ForecastOutboxMessage
    description: "An immutable message pending or confirmed for publication after its authoritative Forecasting effect commits."
    attributes:
      - name: messageId
        logicalType: Identifier
        required: true
        unique: true
      - name: retailerId
        logicalType: Identifier
        required: true
        unique: false
        references: TenantDirectory.Retailer.retailerId
      - name: messageType
        logicalType: VersionedMessageType
        required: true
        unique: false
      - name: schemaVersion
        logicalType: SemanticVersion
        required: true
        unique: false
      - name: aggregateType
        logicalType: EntityName
        required: true
        unique: false
      - name: aggregateId
        logicalType: Identifier
        required: true
        unique: false
      - name: aggregateVersion
        logicalType: PositiveInteger
        required: true
        unique: false
        minValue: 1
      - name: actorType
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [user, service, scheduler]
      - name: actorSubjectId
        logicalType: SubjectIdentifier
        required: true
        unique: false
      - name: correlationId
        logicalType: Identifier
        required: true
        unique: false
      - name: causationId
        logicalType: Identifier
        required: true
        unique: false
      - name: idempotencyKey
        logicalType: IdempotencyKey
        required: true
        unique: false
      - name: placementGeneration
        logicalType: PositiveInteger
        required: true
        unique: false
        minValue: 1
      - name: payloadDigest
        logicalType: Digest
        required: true
        unique: false
      - name: publicationStatus
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [pending, confirmed, deadLettered]
        default: pending
      - name: occurredAt
        logicalType: Instant
        required: true
        unique: false
    entityConstraints:
      - "The outbox record commits with the business effect and matching audit record before publication."
      - "At-least-once delivery and publisher confirmation are recorded; transport is never described as exactly once."
      - "A pending record remains retryable and a dead-lettered record remains observable."

  - name: ForecastInboxReceipt
    description: "The idempotent receipt proving that a Forecasting consumer accepted one message identity under validated authority."
    attributes:
      - name: inboxReceiptId
        logicalType: Identifier
        required: true
        unique: true
      - name: messageId
        logicalType: Identifier
        required: true
        unique: true
      - name: retailerId
        logicalType: Identifier
        required: true
        unique: false
        references: TenantDirectory.Retailer.retailerId
      - name: messageType
        logicalType: VersionedMessageType
        required: true
        unique: false
      - name: schemaVersion
        logicalType: SemanticVersion
        required: true
        unique: false
      - name: placementGeneration
        logicalType: PositiveInteger
        required: true
        unique: false
        minValue: 1
      - name: effectDigest
        logicalType: Digest
        required: true
        unique: false
      - name: processingOutcome
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [accepted, duplicate, rejected, failed]
      - name: processedAt
        logicalType: Instant
        required: true
        unique: false
    entityConstraints:
      - "One message identity can commit at most one Forecasting business effect."
      - "Tenant, job authority, placement generation, contract identity, and aggregate version are validated before an accepted effect."
      - "The receipt and local effect commit before transport acknowledgement."

  - name: ForecastReadCacheEntry
    description: "A disposable bounded read projection for an authorized forecast response."
    attributes:
      - name: cacheEntryId
        logicalType: Identifier
        required: true
        unique: true
      - name: retailerId
        logicalType: Identifier
        required: true
        unique: false
        references: TenantDirectory.Retailer.retailerId
      - name: resourceIdentity
        logicalType: StableBusinessKey
        required: true
        unique: false
      - name: authoritativeVersion
        logicalType: VersionIdentifier
        required: true
        unique: false
      - name: productCoverageDigest
        logicalType: Digest
        required: true
        unique: false
      - name: authorizationContextDigest
        logicalType: Digest
        required: true
        unique: false
      - name: responseDigest
        logicalType: Digest
        required: true
        unique: false
      - name: cachedAt
        logicalType: Instant
        required: true
        unique: false
      - name: expiresAt
        logicalType: Instant
        required: true
        unique: false
    entityConstraints:
      - "The effective cache identity includes retailer, resource, authoritative version, product coverage, and authorization-relevant context."
      - "Cache data never grants authority or owns current selection, freshness, product coverage, or forecast values."
      - "Authoritative changes invalidate affected entries; cold or unavailable cache falls back to a fully authorized authoritative read."

  - name: ForecastReconciliation
    description: "An immutable recovery assessment that verifies restored Forecasting state before any current pointer is exposed."
    attributes:
      - name: reconciliationId
        logicalType: Identifier
        required: true
        unique: true
      - name: retailerId
        logicalType: Identifier
        required: true
        unique: false
        references: TenantDirectory.Retailer.retailerId
      - name: initiatedBySubjectId
        logicalType: SubjectIdentifier
        required: true
        unique: false
      - name: scope
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [retailer, fullForecastingStore]
      - name: lifecycleStatus
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [pending, running, passed, failed]
        default: pending
      - name: backupReference
        logicalType: ProtectedBackupReference
        required: true
        unique: false
      - name: backupDigest
        logicalType: Digest
        required: true
        unique: false
      - name: restoredRecordCountsDigest
        logicalType: Digest
        required: true
        unique: false
      - name: pointerHistoryDigest
        logicalType: Digest
        required: true
        unique: false
      - name: messageReplayPosition
        logicalType: ReplayPosition
        required: true
        unique: false
      - name: retentionPolicyVersion
        logicalType: VersionIdentifier
        required: true
        unique: false
      - name: mismatchCodes
        logicalType: StableReasonCodeSet
        required: true
        unique: false
        default: []
      - name: observedDataLoss
        logicalType: DurationOrRecordCount
        required: false
        unique: false
      - name: elapsedRecoveryTime
        logicalType: Duration
        required: false
        unique: false
      - name: limitations
        logicalType: SafeTextList
        required: true
        unique: false
        default: []
      - name: startedAt
        logicalType: Instant
        required: true
        unique: false
      - name: completedAt
        logicalType: Instant
        required: false
        unique: false
    entityConstraints:
      - "Current pointers remain reconciling and unavailable until all required checks pass."
      - "Checks cover tenant and placement, schedule identity, pinned inputs and model, checksums, schemas, runtime, product coverage, 28-point series, pointer history, acknowledgement, retention, and replay position."
      - "A restored running attempt becomes interrupted and follows ordinary retry eligibility; it is never assumed successful."
      - "Failed reconciliation never regenerates, mutates, or substitutes a forecast silently."

  - name: ForecastRecoveryDisposition
    description: "Durable C25 Class C participant response and monotonic command guard for a retailer recovery run."
    attributes:
      - name: commandId
        logicalType: Identifier
        required: true
        unique: true
      - name: runId
        logicalType: Identifier
        required: true
        unique: false
      - name: retailerId
        logicalType: Identifier
        required: true
        unique: false
        references: TenantDirectory.Retailer.retailerId
      - name: recoveryGeneration
        logicalType: PositiveInteger
        required: true
        unique: false
      - name: placementGeneration
        logicalType: PositiveInteger
        required: true
        unique: false
      - name: command
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [prepare, close, abort, resume]
      - name: fenceDisposition
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [active, cleared, terminally-suppressed, unresolved]
      - name: checkpointDigest
        logicalType: Digest
        required: false
        unique: false
    entityConstraints:
      - "The participant persists the command outcome before acknowledgement and replays the same disposition for the same command ID."
      - "Abort before delayed prepare creates a terminal guard; a late prepare cannot recreate the fence."
      - "Prepare and close fence Forecasting finalizers, inbox/outbox paths and current-publication exposure; resume requires U15-directed reconciliation."

relationships:
  - from: ForecastRequest
    to: ForecastRun
    cardinality: one-to-one
    direction: request-owns-logical-run
  - from: ForecastRun
    to: ForecastInputSnapshot
    cardinality: one-to-one
    direction: run-pins-input-snapshot
  - from: ForecastRun
    to: ForecastModelResolution
    cardinality: one-to-one
    direction: run-pins-model-resolution
  - from: ForecastRun
    to: ForecastAttempt
    cardinality: one-to-many
    direction: run-retains-attempts
  - from: ForecastRun
    to: ForecastHeavyWorkRequest
    cardinality: one-to-zero-or-one
    direction: run-requests-c07-batch-work
  - from: ForecastHeavyWorkRequest
    to: ForecastHeavyWorkLease
    cardinality: one-to-many
    direction: c07-request-retains-leases
  - from: ForecastAttempt
    to: ForecastHeavyWorkLease
    cardinality: one-to-zero-or-one
    direction: attempt-records-current-c07-authority
  - from: ForecastRun
    to: ForecastProductOutcome
    cardinality: one-to-many
    direction: run-classifies-products
  - from: ForecastProductOutcome
    to: ForecastSeries
    cardinality: one-to-zero-or-one
    direction: successful-outcome-yields-series
  - from: ForecastSeries
    to: ForecastPoint
    cardinality: one-to-exactly-28
    direction: series-contains-points
  - from: ForecastRun
    to: ForecastPublication
    cardinality: one-to-zero-or-one
    direction: eligible-run-has-publication
  - from: ForecastPublication
    to: PartialPublicationAcknowledgement
    cardinality: one-to-zero-or-one
    direction: partial-publication-has-operator-decision
  - from: CurrentForecastPointer
    to: ForecastPublication
    cardinality: one-to-one
    direction: pointer-selects-publication
  - from: CurrentForecastPointer
    to: ForecastPointerHistory
    cardinality: one-to-many
    direction: pointer-retains-transition-history
  - from: ForecastRun
    to: ForecastAuditRecord
    cardinality: one-to-many
    direction: run-decisions-append-audit
  - from: ForecastAuditRecord
    to: ForecastOutboxMessage
    cardinality: one-to-zero-or-many
    direction: accepted-audited-effects-produce-events
  - from: ForecastRun
    to: ForecastInboxReceipt
    cardinality: one-to-many
    direction: run-consumes-idempotent-work-messages
  - from: ForecastPublication
    to: ForecastReadCacheEntry
    cardinality: one-to-many
    direction: publication-may-have-disposable-read-projections
  - from: ForecastReconciliation
    to: CurrentForecastPointer
    cardinality: one-to-many
    direction: reconciliation-validates-pointers
  - from: ForecastReconciliation
    to: ForecastRun
    cardinality: one-to-many
    direction: reconciliation-validates-restored-runs
```

## Entity summary

| Entity | Purpose | Key invariant |
| --- | --- | --- |
| ForecastRequest / ForecastRun | Represent one local-date request revision and its logical execution | Requests, revisions, and terminal runs are immutable and tenant-scoped |
| ForecastInputSnapshot / ForecastModelResolution | Pin Retail Data, calendar, configuration, placement, and active Model Release provenance | Every attempt uses the same admitted snapshot; no silent substitution |
| ForecastAttempt | Retain each leased execution try | Retry appends an attempt under the same run |
| ForecastHeavyWorkRequest / ForecastHeavyWorkLease | Preserve C07 batch-forecast request and fencing evidence | U6 owns global queue and authoritative lease; stale tokens cannot publish |
| ForecastProductOutcome / ForecastSeries / ForecastPoint | Record explicit product availability and exactly 28 daily values | Invalid output fails the product and is never clipped, filled, shortened, or treated as zero |
| ForecastPublication / PartialPublicationAcknowledgement | Record publication eligibility and explicit Operator judgment of partial coverage | Partial output cannot become current without acknowledgement |
| CurrentForecastPointer / ForecastPointerHistory | Select and explain the current revision | Selection is server-owned, atomic, version-guarded, and history-preserving |
| ForecastAuditRecord / ForecastOutboxMessage / ForecastInboxReceipt | Preserve authoritative decisions and idempotent asynchronous effects | Business effect, audit, and outbox are atomic; consumers commit before acknowledgement |
| ForecastReadCacheEntry | Accelerate bounded authorized reads | Cache is tenant/version scoped and never authoritative |
| ForecastReconciliation | Prove restored state is safe to expose | Unresolved, corrupt, incompatible, or expired evidence stays unavailable |
| ForecastRecoveryDisposition | Retain C25 Class C command, fence and checkpoint evidence | Late prepare cannot undo abort; resume waits for reconciliation |

## Sources

- `inception/units-generation/unit-of-work.md` — U7 ownership, boundaries, and constraints.
- `inception/units-generation/unit-of-work-story-map.md` — U7 participation across 53 assigned acceptance criteria, including later heavy-work, messaging, recovery and demo-timing criteria.
- `inception/requirements-analysis/requirements.md` — FR2, FR5, FR11, FR13, FR17, FR19, FR20 and NFR3-NFR5, NFR7-NFR9, NFR11, NFR14-NFR15.
- `inception/user-stories/stories.md` — US4.1, US4.6, US5.1, US5.2, US7.6, US8.1-US8.3, US8.5, US9.1, US9.6, US9.9, and US10.1 acceptance criteria.
- `inception/domain-design/components.md` and `decisions.md` — Forecasting ownership and separation from Model Lifecycle, Replenishment, Purchasing, identity, and Audit Evidence.
- `inception/contract-design/contract-summary.md` — C06, C07, C10, C13, C15, C23 and C25 envelopes, signed packages, fencing, messaging, recovery and retry boundaries.
- `construction/forecasting/functional-design/functional-design-questions.md` — confirmed grain, schedule, pinning, partial outcome, validation, freshness, rerun, model availability, publication, authority, messaging/cache, and restore decisions.

## Assumptions & Open Questions

- C07 owns the bounded heavy-work lease, heartbeat, queue, deadline and attempt policy; C23 owns separate broker retry and DLQ bounds. Response bounds and decimal storage precision must be fixed before implementation acceptance.
- Recovery-policy-v1 fixes 24-hour RPO, two-hour RTO, 30-day backup retention and Class C prepare/close/abort/resume deadlines of 120/180/60/180 seconds. Reconciliation reports measured time, loss and limitations against those values.
- The six-hour freshness grace period after the next retailer-local 02:00 due time and the DST invalid/ambiguous-time choices are confirmed functional decisions.
- Planning owns inventory, supplier-term, MOQ, pack, buffer, review-quota, replenishment, and purchasing calculations. Forecasting supplies versioned series, coverage, freshness, and evidence only.
- Model Lifecycle owns dataset creation, training, evaluation, promotion, rollback, and artifact retention. Forecasting pins and verifies one promoted compatible release for operational inference.
- C07 now specifies the cross-unit atomic finalizer and route-admission/drain barrier. Forecasting cannot claim deployable publication or route switching until review and conformance evidence prove the expiry, recovery-fence and admission/drain races.
- The required reviewer path is real CPU inference. Optional acceleration is measured separately and cannot change entity meaning, authority, or publication behavior.
