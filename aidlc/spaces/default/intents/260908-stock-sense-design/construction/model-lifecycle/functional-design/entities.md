# Model Lifecycle Functional Entity Model

Unit: U6 Model Lifecycle (model-lifecycle)

Decision basis: confirmed Model Lifecycle Functional Design answers dated 2026-09-13 and reconciliation confirmed 2026-09-25, followed by owner-directed C07 safety corrections pending review.

The YAML block is the source of truth for the logical entity model. Every dataset, run, fitted artifact, evaluation, and active route belongs to one retailer. Object storage owns immutable bytes, MLflow records experiment evidence, and Model Lifecycle control records own lifecycle state and production activation.

## Source-of-truth entity model

```yaml source-of-truth
schemaVersion: "1.0.0"
unit: model-lifecycle
entities:
  - name: DatasetExportReference
    description: A tenant-authorized immutable upstream export used to assemble a dataset.
    attributes:
      - { name: exportReferenceId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: provider, logicalType: Enum, required: true, unique: false, allowedValues: [retailData, supplierKnowledge] }
      - { name: upstreamJobId, logicalType: Identifier, required: true, unique: false }
      - { name: sourceRevision, logicalType: String, required: true, unique: false }
      - { name: objectReference, logicalType: OpaqueLocator, required: true, unique: false }
      - { name: checksum, logicalType: Sha256, required: true, unique: false }
      - { name: placementGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: availableAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - The upstream job, source revision, and checksum are immutable.
      - The object reference is resolved server-side and never grants storage authority.

  - name: DatasetVersion
    description: The immutable manifest identifying one retailer-scoped training and evaluation dataset.
    attributes:
      - { name: datasetVersionId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: versionNumber, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [building, published, invalid, retained, expired], default: building }
      - { name: availabilityCutoff, logicalType: Instant, required: true, unique: false }
      - { name: featureSchemaVersion, logicalType: String, required: true, unique: false }
      - { name: splitConfigurationDigest, logicalType: Sha256, required: true, unique: false }
      - { name: manifestChecksum, logicalType: Sha256, required: false, unique: true }
      - { name: rowCount, logicalType: NonNegativeInteger, required: false, unique: false }
      - { name: exclusionCount, logicalType: NonNegativeInteger, required: false, unique: false }
      - { name: createdAt, logicalType: Instant, required: true, unique: false }
      - { name: publishedAt, logicalType: Instant, required: false, unique: false }
    entityConstraints:
      - The pair retailerId and versionNumber is unique.
      - Published content and manifest fields are immutable.
      - Training-visible content is physically or logically separated from evaluation-only truth.

  - name: DatasetObject
    description: A checksummed immutable object that forms part of a Dataset Version.
    attributes:
      - { name: datasetObjectId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: datasetVersionId, logicalType: Identifier, required: true, unique: false, references: DatasetVersion.datasetVersionId }
      - { name: purpose, logicalType: Enum, required: true, unique: false, allowedValues: [trainingFeatures, trainingLabels, evaluationTruth, supplierPolicyInputs, manifest] }
      - { name: objectReference, logicalType: OpaqueLocator, required: true, unique: true }
      - { name: checksum, logicalType: Sha256, required: true, unique: false }
      - { name: byteLength, logicalType: NonNegativeInteger, required: true, unique: false }
      - { name: availability, logicalType: Enum, required: true, unique: false, allowedValues: [staged, available, missing, corrupt, expired], default: staged }
    entityConstraints:
      - A published object checksum cannot change.
      - An unavailable object cannot be substituted by another version.

  - name: TemporalSplit
    description: A versioned expanding-window split definition for comparable rolling-origin evaluation.
    attributes:
      - { name: temporalSplitId, logicalType: Identifier, required: true, unique: true }
      - { name: datasetVersionId, logicalType: Identifier, required: true, unique: false, references: DatasetVersion.datasetVersionId }
      - { name: splitOrdinal, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: trainingStartDate, logicalType: LocalDate, required: true, unique: false }
      - { name: trainingEndDate, logicalType: LocalDate, required: true, unique: false }
      - { name: forecastOriginDate, logicalType: LocalDate, required: true, unique: false }
      - { name: horizonDays, logicalType: PositiveInteger, required: true, unique: false, min: 28, max: 28 }
      - { name: completeHorizon, logicalType: Boolean, required: true, unique: false }
      - { name: exclusionReason, logicalType: String, required: false, unique: false }
    entityConstraints:
      - Training ends strictly before the forecast origin.
      - A scored evaluation contains at least three complete 28-day splits.

  - name: EvaluationConfiguration
    description: Immutable versioned comparison profile shared by every baseline and trained candidate in one report.
    attributes:
      - { name: evaluationConfigurationId, logicalType: Identifier, required: true, unique: true }
      - { name: version, logicalType: String, required: true, unique: true }
      - { name: configurationDigest, logicalType: Sha256, required: true, unique: true }
      - { name: seasonalNaivePeriodDays, logicalType: PositiveInteger, required: true, unique: false, default: 7 }
      - { name: movingAverageWindowDays, logicalType: PositiveInteger, required: true, unique: false, default: 28 }
      - { name: originStrideDays, logicalType: PositiveInteger, required: true, unique: false, default: 28 }
      - { name: horizonDays, logicalType: PositiveInteger, required: true, unique: false, default: 28 }
      - { name: minimumCompleteOrigins, logicalType: PositiveInteger, required: true, unique: false, default: 3 }
      - { name: missingHistoryPolicy, logicalType: Enum, required: true, unique: false, allowedValues: [excludeProductOrigin] }
    entityConstraints:
      - Version 1 repeats the seven observed days immediately before origin for all 28 forecast days; horizon day h reads origin minus 7 plus (h minus 1 modulo 7), never held-out truth.
      - Version 1 moving average is the arithmetic mean of the 28 observed days before origin, held constant for all 28 forecast days; origins are 28 days apart with nonoverlapping held-out horizons.
      - Missing any required observed day excludes that product-origin for every compared model.
      - A configuration change creates a new version and digest; reports with different digests are not directly comparable.

  - name: FeatureSpecification
    description: The immutable feature contract shared by a model package and its datasets.
    attributes:
      - { name: featureSpecificationId, logicalType: Identifier, required: true, unique: true }
      - { name: version, logicalType: String, required: true, unique: true }
      - { name: schemaChecksum, logicalType: Sha256, required: true, unique: true }
      - { name: features, logicalType: OrderedStringList, required: true, unique: false }
      - { name: targetDefinition, logicalType: String, required: true, unique: false }
      - { name: missingValuePolicy, logicalType: String, required: true, unique: false }
      - { name: availabilityPolicyVersion, logicalType: String, required: true, unique: false }
    entityConstraints:
      - The initial feature set covers lagged observed sales, shifted rolling statistics, calendar fields, known promotions, product identity, and horizon day.
      - Latent demand and lost-demand truth are prohibited as model inputs.

  - name: FeatureAvailabilityEvidence
    description: Fold-level proof that a feature or transformation was knowable at its forecast origin.
    attributes:
      - { name: evidenceId, logicalType: Identifier, required: true, unique: true }
      - { name: temporalSplitId, logicalType: Identifier, required: true, unique: false, references: TemporalSplit.temporalSplitId }
      - { name: featureSpecificationId, logicalType: Identifier, required: true, unique: false, references: FeatureSpecification.featureSpecificationId }
      - { name: featureName, logicalType: String, required: true, unique: false }
      - { name: latestPermittedSourceTime, logicalType: Instant, required: true, unique: false }
      - { name: observedLatestSourceTime, logicalType: Instant, required: true, unique: false }
      - { name: outcome, logicalType: Enum, required: true, unique: false, allowedValues: [passed, failed] }
      - { name: reason, logicalType: String, required: false, unique: false }
    entityConstraints:
      - Failed availability evidence prevents evaluation eligibility.

  - name: HeavyWorkRequest
    description: U6-owned durable C07 coordination request shared by training, evaluation, embedding-index and batch-forecast workers.
    attributes:
      - { name: requestId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: workType, logicalType: Enum, required: true, unique: false, allowedValues: [training, evaluation, embedding-index, batch-forecast] }
      - { name: ownerService, logicalType: Enum, required: true, unique: false, allowedValues: [modelLifecycle, supplierKnowledge, forecasting] }
      - { name: ownerWorkReference, logicalType: OpaqueIdentifier, required: true, unique: false }
      - { name: forecastRunId, logicalType: Identifier, required: false, unique: false }
      - { name: forecastRoutePinId, logicalType: Identifier, required: false, unique: false, references: ForecastRoutePin.pinId }
      - { name: initialForecastAttemptId, logicalType: Identifier, required: false, unique: false }
      - { name: requestHash, logicalType: Sha256, required: true, unique: false }
      - { name: idempotencyKey, logicalType: String, required: true, unique: false }
      - { name: priority, logicalType: NonNegativeInteger, required: true, unique: false }
      - { name: admissionSequence, logicalType: PositiveInteger, required: true, unique: true, min: 1 }
      - { name: deadlineAt, logicalType: Instant, required: true, unique: false }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [queued, leased, completed, failed, cancelled, deadlineExpired] }
      - { name: attemptCount, logicalType: NonNegativeInteger, required: true, unique: false }
      - { name: maxAttempts, logicalType: PositiveInteger, required: true, unique: false, default: 3 }
      - { name: placementGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: recoveryGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: resultDigest, logicalType: Sha256, required: false, unique: false }
    entityConstraints:
      - Idempotency is unique by retailer, work type, owner service, and key; changed canonical request hash conflicts.
      - Priority is retained for contract compatibility but version 1 dispatches by admissionSequence FIFO for all four work types.
      - Owner service identity and current retailer job authority are checked at each operation; an external request is not a ModelJob.
      - Batch-forecast requires run, pin and initial-attempt IDs matching U6's admitted pin; other work types carry none of these fields.

  - name: HeavyWorkLease
    description: U6-owned C07 lease with one central global-slot reservation and an authoritative retailer-local finalization fence.
    attributes:
      - { name: leaseId, logicalType: Identifier, required: true, unique: true }
      - { name: requestId, logicalType: Identifier, required: true, unique: false, references: HeavyWorkRequest.requestId }
      - { name: forecastRunId, logicalType: Identifier, required: false, unique: false }
      - { name: forecastRoutePinId, logicalType: Identifier, required: false, unique: false, references: ForecastRoutePin.pinId }
      - { name: forecastAttemptId, logicalType: Identifier, required: false, unique: false }
      - { name: workerId, logicalType: ExternalIdentifier, required: true, unique: false }
      - { name: fencingToken, logicalType: PositiveInteger, required: true, unique: true, min: 1 }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [active, released, completed, failed, cancelled, expired, superseded, recoveryFenced] }
      - { name: acquiredAt, logicalType: Instant, required: true, unique: false }
      - { name: expiresAt, logicalType: Instant, required: true, unique: false }
      - { name: heartbeatAt, logicalType: Instant, required: true, unique: false }
      - { name: placementGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: recoveryGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
    entityConstraints:
      - At most one global slot is granted cluster-wide across all four work types; it remains reserved until retailer-local terminal/fence evidence is reconciled.
      - Tokens increase globally on every acquisition and are never reused.
      - Finalization in an owner schema invokes U6's EXECUTE-only finalize_heavy_work_v1 within the same retailer-local transaction; no caller has direct lease-table access. Recovery and expiry serialize on that local fence row.
      - Batch-forecast leases bind run, pin and attempt IDs; first acquisition uses the request's initial attempt and only a terminal/fenced retry can use a distinct later attempt.

  - name: GlobalHeavyWorkSlot
    description: U6 central one-slot reservation and globally monotonic token allocator, separate from tenant-local finalization authority.
    attributes:
      - { name: slotId, logicalType: Identifier, required: true, unique: true }
      - { name: requestId, logicalType: Identifier, required: false, unique: false, references: HeavyWorkRequest.requestId }
      - { name: leaseId, logicalType: Identifier, required: false, unique: false, references: HeavyWorkLease.leaseId }
      - { name: fencingToken, logicalType: NonNegativeInteger, required: true, unique: false, min: 0 }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [free, reserved, granted, reconciling] }
    entityConstraints:
      - Exactly one slot exists for the cluster; reserved is not worker authority.
      - A slot is granted only after its matching retailer-local fence is durable and is freed only after local terminal/fenced proof reconciles.
      - Unknown local state keeps the slot reserved or reconciling and blocks another acquisition.

  - name: RetailerLeaseFence
    description: U6-owned authoritative tenant-local fence co-located with U5/U7 publication state.
    attributes:
      - { name: leaseId, logicalType: Identifier, required: true, unique: true, references: HeavyWorkLease.leaseId }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: workerId, logicalType: ExternalIdentifier, required: true, unique: false }
      - { name: workType, logicalType: Enum, required: true, unique: false, allowedValues: [training, evaluation, embedding-index, batch-forecast] }
      - { name: forecastRunId, logicalType: Identifier, required: false, unique: false }
      - { name: forecastRoutePinId, logicalType: Identifier, required: false, unique: false, references: ForecastRoutePin.pinId }
      - { name: forecastAttemptId, logicalType: Identifier, required: false, unique: false }
      - { name: fencingToken, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [active, completed, failed, cancelled, expired, superseded, recoveryFenced] }
      - { name: expiresAt, logicalType: Instant, required: true, unique: false }
      - { name: placementGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: recoveryGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: terminalResultId, logicalType: Identifier, required: false, unique: true, references: HeavyWorkTerminalResult.terminalResultId }
      - { name: terminalResultDigest, logicalType: Sha256, required: false, unique: false }
    entityConstraints:
      - U5/U7 owner publication and this fence are in the same retailer-local database and commit through the C07 port in one transaction.
      - Expiry, cancellation, supersession, recovery fencing and owner finalization serialize on this row under the database clock.
      - A completed or otherwise terminal/fenced lease points to exactly one durable terminal result; evaluation completion, route switch and decision commit together, while external-owner completion, publication and pin closure commit together.

  - name: HeavyWorkTerminalResult
    description: Immutable U6-owned retailer-local C07 result for owner finalization or an atomic route decision and evaluation-lease disposition.
    attributes:
      - { name: terminalResultId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: requestId, logicalType: Identifier, required: true, unique: false, references: HeavyWorkRequest.requestId }
      - { name: leaseId, logicalType: Identifier, required: true, unique: true, references: HeavyWorkLease.leaseId }
      - { name: callerService, logicalType: Enum, required: true, unique: false, allowedValues: [modelLifecycle, supplierKnowledge, forecasting] }
      - { name: workType, logicalType: Enum, required: true, unique: false, allowedValues: [training, evaluation, embedding-index, batch-forecast] }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [completed, failed, cancelled, expired, superseded, recoveryFenced] }
      - { name: workerId, logicalType: ExternalIdentifier, required: true, unique: false }
      - { name: fencingToken, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: placementGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: recoveryGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: operationId, logicalType: Identifier, required: true, unique: false }
      - { name: idempotencyKey, logicalType: String, required: true, unique: false }
      - { name: expectedOwnerVersion, logicalType: NonNegativeInteger, required: true, unique: false, min: 0 }
      - { name: resultDigest, logicalType: Sha256, required: true, unique: false }
      - { name: forecastRunId, logicalType: Identifier, required: false, unique: false }
      - { name: forecastAttemptId, logicalType: Identifier, required: false, unique: false }
      - { name: closedPinId, logicalType: Identifier, required: false, unique: false, references: ForecastRoutePin.pinId }
      - { name: promotionIntentId, logicalType: Identifier, required: false, unique: false, references: PromotionIntent.promotionIntentId }
      - { name: promotionDecisionId, logicalType: Identifier, required: false, unique: true, references: PromotionDecision.promotionDecisionId }
      - { name: drainId, logicalType: Identifier, required: false, unique: false, references: ForecastRouteDrain.drainId }
      - { name: routeGeneration, logicalType: NonNegativeInteger, required: false, unique: false, min: 0 }
      - { name: committedAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - Lease ID is unique and a completed fence references this immutable result; retailer, owner, operation ID and idempotency key identify exact replay with the same canonical arguments and digest.
      - For batch-forecast the result binds run, attempt and closed pin; embedding-index has none of those fields. A pin may be closed by only this result or an authorized terminal nonpublication release.
      - A completed evaluation result binds promotion intent, drain, decision, expected route generation and the next route generation; promotion or rollback writes it with the fence transition, signed package, route switch, drain commitment, decision, audit and outbox in one retailer-local transaction. Exact replay returns the same decision and result, never a second route change.
      - Failed, expired, cancelled or recovery-fenced evaluation results bind the lease and drain but no committed route decision; central slot reconciliation requires this local proof. Training results use U6-owned completion without external owner publication.
      - An external-owner terminal result is written in the caller-owned retailer-local transaction with the U5/U7 publication pointer, audit and outbox; a rollback leaves no result or pin closure.

  - name: ModelJob
    description: A logical asynchronous dataset, training, evaluation, registration, or restore job.
    attributes:
      - { name: modelJobId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: jobType, logicalType: Enum, required: true, unique: false, allowedValues: [publishDataset, trainCandidate, evaluateForecast, evaluatePolicy, registerRelease, restoreReconcile] }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [requested, queued, running, succeeded, failed, cancelled, superseded, deadlineExpired], default: requested }
      - { name: requestHash, logicalType: Sha256, required: true, unique: false }
      - { name: c07RequestId, logicalType: Identifier, required: false, unique: true, references: HeavyWorkRequest.requestId }
      - { name: recoveryGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: placementGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: submittedBy, logicalType: ExternalIdentifier, required: true, unique: false }
      - { name: submittedAt, logicalType: Instant, required: true, unique: false }
      - { name: completedAt, logicalType: Instant, required: false, unique: false }
      - { name: safeFailureCode, logicalType: String, required: false, unique: false }
      - { name: version, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
    entityConstraints:
      - A job never changes the active model route directly.
      - Heavy Model Jobs share the one cluster-wide lease with external embedding-index and batch-forecast work.
      - Training and evaluation heavy jobs have a C07 request projection of queued, leased, then completed, failed, cancelled, or deadline-expired; a logical retry stays under the same request and job identity. Dataset publication, registration, and restore reconciliation remain separate job types and do not invent a C07 work type.

  - name: ModelJobAttempt
    description: One immutable leased attempt under a logical Model Job.
    attributes:
      - { name: attemptId, logicalType: Identifier, required: true, unique: true }
      - { name: modelJobId, logicalType: Identifier, required: true, unique: false, references: ModelJob.modelJobId }
      - { name: attemptNumber, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [queued, leased, running, succeeded, failed, interrupted, cancelled] }
      - { name: leaseOwner, logicalType: String, required: false, unique: false }
      - { name: leaseId, logicalType: Identifier, required: false, unique: true, references: HeavyWorkLease.leaseId }
      - { name: fencingToken, logicalType: PositiveInteger, required: false, unique: false, min: 1 }
      - { name: placementGeneration, logicalType: PositiveInteger, required: false, unique: false, min: 1 }
      - { name: recoveryGeneration, logicalType: PositiveInteger, required: false, unique: false, min: 1 }
      - { name: leaseExpiresAt, logicalType: Instant, required: false, unique: false }
      - { name: heartbeatAt, logicalType: Instant, required: false, unique: false }
      - { name: checkpointDigest, logicalType: Sha256, required: false, unique: false }
      - { name: startedAt, logicalType: Instant, required: false, unique: false }
      - { name: completedAt, logicalType: Instant, required: false, unique: false }
    entityConstraints:
      - The pair modelJobId and attemptNumber is unique.
      - Retry appends an attempt and reuses only verified inputs or checkpoints.
      - Renew, release, completion, and publication require the current lease ID and fencing token; expiration, cancellation, supersession, or recovery fencing invalidates the token forever.

  - name: ExperimentRun
    description: Immutable experiment evidence corresponding to one job attempt and candidate configuration.
    attributes:
      - { name: experimentRunId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: attemptId, logicalType: Identifier, required: true, unique: true, references: ModelJobAttempt.attemptId }
      - { name: datasetVersionId, logicalType: Identifier, required: true, unique: false, references: DatasetVersion.datasetVersionId }
      - { name: featureSpecificationId, logicalType: Identifier, required: true, unique: false, references: FeatureSpecification.featureSpecificationId }
      - { name: codeRevision, logicalType: String, required: true, unique: false }
      - { name: runtimeDigest, logicalType: Sha256, required: true, unique: false }
      - { name: configurationDigest, logicalType: Sha256, required: true, unique: false }
      - { name: deterministicSeed, logicalType: Integer, required: true, unique: false }
      - { name: externalRunReference, logicalType: OpaqueIdentifier, required: true, unique: true }
      - { name: outcome, logicalType: Enum, required: true, unique: false, allowedValues: [succeeded, failed, cancelled] }
      - { name: safeFailureCode, logicalType: String, required: false, unique: false }
    entityConstraints:
      - Experiment evidence remains tenant-scoped and immutable after completion.
      - Failed and cancelled runs remain inspectable.

  - name: ModelDefinition
    description: The immutable algorithm and configuration identity for a baseline or trained candidate.
    attributes:
      - { name: modelDefinitionId, logicalType: Identifier, required: true, unique: true }
      - { name: modelKind, logicalType: Enum, required: true, unique: false, allowedValues: [seasonalNaive, movingAverage, histogramGradientBoosting] }
      - { name: algorithmVersion, logicalType: String, required: true, unique: false }
      - { name: configurationDigest, logicalType: Sha256, required: true, unique: false }
      - { name: dependencyLockDigest, logicalType: Sha256, required: true, unique: false }
      - { name: description, logicalType: String, required: true, unique: false }
    entityConstraints:
      - Baselines and trained algorithms use the same release and evaluation vocabulary.

  - name: ModelArtifact
    description: A finalized immutable baseline configuration or fitted-model object.
    attributes:
      - { name: modelArtifactId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: experimentRunId, logicalType: Identifier, required: true, unique: false, references: ExperimentRun.experimentRunId }
      - { name: modelDefinitionId, logicalType: Identifier, required: true, unique: false, references: ModelDefinition.modelDefinitionId }
      - { name: objectReference, logicalType: OpaqueLocator, required: true, unique: true }
      - { name: checksum, logicalType: Sha256, required: true, unique: true }
      - { name: artifactFormat, logicalType: String, required: true, unique: false }
      - { name: runtimeProfileVersion, logicalType: String, required: true, unique: false }
      - { name: inputSchemaDigest, logicalType: Sha256, required: true, unique: false }
      - { name: outputSchemaDigest, logicalType: Sha256, required: true, unique: false }
      - { name: availability, logicalType: Enum, required: true, unique: false, allowedValues: [staged, available, missing, corrupt, expired], default: staged }
      - { name: finalizedAt, logicalType: Instant, required: false, unique: false }
    entityConstraints:
      - Staging is finalized only after checksum and metadata verification.
      - Artifact objects are never overwritten in place.
      - The artifact is skops.io bytes and immutable checksum evidence; promotion-specific generation, release status, validity and signature are not known at training finalization.

  - name: EvaluationReport
    description: Immutable comparable evidence for one or more model definitions over one Dataset Version.
    attributes:
      - { name: evaluationReportId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: datasetVersionId, logicalType: Identifier, required: true, unique: false, references: DatasetVersion.datasetVersionId }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [building, complete, incomplete, failed], default: building }
      - { name: commonOriginsDigest, logicalType: Sha256, required: true, unique: false }
      - { name: commonProductsDigest, logicalType: Sha256, required: true, unique: false }
      - { name: evaluationConfigurationId, logicalType: Identifier, required: true, unique: false, references: EvaluationConfiguration.evaluationConfigurationId }
      - { name: sampleCount, logicalType: NonNegativeInteger, required: false, unique: false }
      - { name: exclusionCount, logicalType: NonNegativeInteger, required: false, unique: false }
      - { name: limitationNotes, logicalType: Text, required: true, unique: false }
      - { name: completedAt, logicalType: Instant, required: false, unique: false }
    entityConstraints:
      - Promotion eligibility requires a complete comparable report including both baselines.
      - Candidate and both baselines share the exact dataset, complete origins, products, horizon, truth, availability cutoff, and evaluation-configuration digest.

  - name: ForecastMetric
    description: Per-retailer forecast error evidence for one evaluated model.
    attributes:
      - { name: forecastMetricId, logicalType: Identifier, required: true, unique: true }
      - { name: evaluationReportId, logicalType: Identifier, required: true, unique: false, references: EvaluationReport.evaluationReportId }
      - { name: modelDefinitionId, logicalType: Identifier, required: true, unique: false, references: ModelDefinition.modelDefinitionId }
      - { name: meanAbsoluteError, logicalType: NonNegativeDecimal, required: true, unique: false }
      - { name: weightedAbsolutePercentageError, logicalType: Percentage, required: false, unique: false }
      - { name: zeroDemandDenominator, logicalType: Boolean, required: true, unique: false }
      - { name: observationCount, logicalType: NonNegativeInteger, required: true, unique: false }
    entityConstraints:
      - A zero total-demand denominator yields no WAPE value and keeps MAE.

  - name: InventoryPolicyReport
    description: Chronological inventory outcome evidence under one evaluated forecast candidate.
    attributes:
      - { name: inventoryPolicyReportId, logicalType: Identifier, required: true, unique: true }
      - { name: evaluationReportId, logicalType: Identifier, required: true, unique: false, references: EvaluationReport.evaluationReportId }
      - { name: modelDefinitionId, logicalType: Identifier, required: true, unique: false, references: ModelDefinition.modelDefinitionId }
      - { name: scenarioDigest, logicalType: Sha256, required: true, unique: false }
      - { name: lostUnits, logicalType: NonNegativeDecimal, required: true, unique: false }
      - { name: lostDemandRate, logicalType: Percentage, required: false, unique: false }
      - { name: zeroDemandDenominator, logicalType: Boolean, required: true, unique: false }
      - { name: meanClosingInventoryValue, logicalType: Money, required: true, unique: false }
      - { name: currency, logicalType: CurrencyCode, required: true, unique: false }
      - { name: evaluatedDayCount, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
    entityConstraints:
      - All candidates use identical exogenous inputs and policy configuration.
      - Currency values are never aggregated across retailers.

  - name: ModelRelease
    description: An immutable retailer-scoped releasable baseline or trained model package.
    attributes:
      - { name: modelReleaseId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: releaseVersion, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: modelArtifactId, logicalType: Identifier, required: true, unique: false, references: ModelArtifact.modelArtifactId }
      - { name: evaluationReportId, logicalType: Identifier, required: true, unique: false, references: EvaluationReport.evaluationReportId }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [candidate, validated, rejected, active, superseded, retired], default: candidate }
      - { name: validatedAt, logicalType: Instant, required: false, unique: false }
      - { name: version, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
    entityConstraints:
      - The pair retailerId and releaseVersion is unique.
      - A release remains immutable even when lifecycle status changes through recorded transitions.

  - name: PromotedModelPackage
    description: Immutable C07 signed package produced for one explicit activation or rollback generation.
    attributes:
      - { name: packageId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: modelReleaseId, logicalType: Identifier, required: true, unique: false, references: ModelRelease.modelReleaseId }
      - { name: modelArtifactId, logicalType: Identifier, required: true, unique: false, references: ModelArtifact.modelArtifactId }
      - { name: promotionGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: releaseStatus, logicalType: Enum, required: true, unique: false, allowedValues: [active, overlap, revoked] }
      - { name: validFrom, logicalType: Instant, required: true, unique: false }
      - { name: overlapUntil, logicalType: Instant, required: false, unique: false }
      - { name: manifestDigest, logicalType: Sha256, required: true, unique: true }
      - { name: signature, logicalType: OpaqueSignature, required: true, unique: false }
      - { name: signerKeyId, logicalType: Identifier, required: true, unique: false }
      - { name: trustPolicyDigest, logicalType: Sha256, required: true, unique: false }
      - { name: signedAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - Signature and digest cover the complete immutable C07 manifest except manifestDigest, signature and live verification; the bytes, release status, validity and generation cannot be edited.
      - Version 1 uses no previous-release overlap. Promotion and rollback wait for all old pins to become provably terminal under C07's drain; a run deadline alone never clears a pin. Rollback creates a newly signed active package.
      - Current authoritative signer and trust-policy checks still apply at resolution and before deserialization.

  - name: PromotionDecision
    description: An immutable Operator decision to activate or roll back a retailer model route.
    attributes:
      - { name: promotionDecisionId, logicalType: Identifier, required: true, unique: true }
      - { name: promotionIntentId, logicalType: Identifier, required: false, unique: true, references: PromotionIntent.promotionIntentId }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: decisionType, logicalType: Enum, required: true, unique: false, allowedValues: [promote, rollback] }
      - { name: targetReleaseId, logicalType: Identifier, required: true, unique: false, references: ModelRelease.modelReleaseId }
      - { name: priorReleaseId, logicalType: Identifier, required: false, unique: false, references: ModelRelease.modelReleaseId }
      - { name: evaluationReportId, logicalType: Identifier, required: true, unique: false, references: EvaluationReport.evaluationReportId }
      - { name: rationale, logicalType: Text, required: true, unique: false }
      - { name: decidedBy, logicalType: ExternalIdentifier, required: true, unique: false }
      - { name: decidedAt, logicalType: Instant, required: true, unique: false }
      - { name: expectedRouteVersion, logicalType: NonNegativeInteger, required: true, unique: false, min: 0 }
      - { name: packageId, logicalType: Identifier, required: true, unique: true, references: PromotedModelPackage.packageId }
      - { name: promotionLeaseId, logicalType: Identifier, required: true, unique: false, references: HeavyWorkLease.leaseId }
      - { name: evaluationTerminalResultId, logicalType: Identifier, required: true, unique: true, references: HeavyWorkTerminalResult.terminalResultId }
      - { name: drainId, logicalType: Identifier, required: true, unique: false, references: ForecastRouteDrain.drainId }
    entityConstraints:
      - The decision cannot be altered or deleted through ordinary runtime authority.
      - The first promotion compare-and-creates an absent route at expected version zero and writes version one.
      - The decision and completed evaluation terminal result reference each other and commit with the route and lease status in one transaction; exact replay returns their original identities.

  - name: PromotionIntent
    description: Durable explicit Operator instruction queued for a freshly fenced C07 eligibility evaluation before activation.
    attributes:
      - { name: promotionIntentId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: targetReleaseId, logicalType: Identifier, required: true, unique: false, references: ModelRelease.modelReleaseId }
      - { name: evaluationEvidenceDigest, logicalType: Sha256, required: true, unique: false }
      - { name: expectedPromotionGeneration, logicalType: NonNegativeInteger, required: true, unique: false, min: 0 }
      - { name: rationale, logicalType: Text, required: true, unique: false }
      - { name: actorId, logicalType: ExternalIdentifier, required: true, unique: false }
      - { name: operationKey, logicalType: String, required: true, unique: false }
      - { name: requestHash, logicalType: Sha256, required: true, unique: false }
      - { name: drainId, logicalType: Identifier, required: false, unique: true, references: ForecastRouteDrain.drainId }
      - { name: c07RequestId, logicalType: Identifier, required: false, unique: true, references: HeavyWorkRequest.requestId }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [draining, queued, evaluating, committed, failed, cancelled] }
      - { name: createdAt, logicalType: Instant, required: true, unique: false }
      - { name: completedAt, logicalType: Instant, required: false, unique: false }
    entityConstraints:
      - The Operator chooses target and rationale before the drain; C07 evaluation work is requested only after zero outstanding pins are proven. Current Operator authority is rechecked immediately before route commit.
      - Failed or expired intent never changes a route and cannot be replayed under a different payload.

  - name: ForecastRouteControl
    description: U6-owned retailer-local guard row created at retailer bootstrap, including before first activation.
    attributes:
      - { name: retailerId, logicalType: Identifier, required: true, unique: true, references: Retailer.retailerId }
      - { name: promotionGeneration, logicalType: NonNegativeInteger, required: true, unique: false, min: 0 }
      - { name: admissionState, logicalType: Enum, required: true, unique: false, allowedValues: [inactive, open, draining, unavailable] }
      - { name: currentDrainId, logicalType: Identifier, required: false, unique: false, references: ForecastRouteDrain.drainId }
      - { name: placementGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: recoveryGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
    entityConstraints:
      - pins:admit, drains:start, promotion, rollback and drain abort lock this row to serialize admission with route changes.
      - Generation zero is inactive and has no package or pins; first activation drains the guard before compare-and-create of ActiveModelRoute version one.

  - name: ForecastRoutePin
    description: Durable C07 admission for one Forecast Run and one route generation.
    attributes:
      - { name: pinId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: ForecastRouteControl.retailerId }
      - { name: forecastRunId, logicalType: Identifier, required: true, unique: true }
      - { name: initialForecastAttemptId, logicalType: Identifier, required: true, unique: true }
      - { name: promotionGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: placementGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: recoveryGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [active, completed, failed, cancelled, recoveryFenced] }
      - { name: admittedAt, logicalType: Instant, required: true, unique: false }
      - { name: terminalAt, logicalType: Instant, required: false, unique: false }
      - { name: closedByTerminalResultId, logicalType: Identifier, required: false, unique: true, references: HeavyWorkTerminalResult.terminalResultId }
    entityConstraints:
      - Admission and drain start serialize on ForecastRouteControl; an active or uncertain pin counts against route switch.
      - Only U6's finalizer closes a verified pin inside U7's owner transaction, or U6 closes it after a committed nonpublication disposition is proven; elapsed time alone never closes a pin.
      - A finalizer-closed pin records the terminal result ID; exact replay returns already-closed only for that same result, and closure by any other result conflicts.

  - name: ForecastRouteDrain
    description: Durable no-overlap barrier for promotion or rollback, before evaluation lease acquisition.
    attributes:
      - { name: drainId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: ForecastRouteControl.retailerId }
      - { name: expectedPromotionGeneration, logicalType: NonNegativeInteger, required: true, unique: false, min: 0 }
      - { name: purpose, logicalType: Enum, required: true, unique: false, allowedValues: [promote, rollback] }
      - { name: evaluationRequestId, logicalType: Identifier, required: false, unique: true, references: HeavyWorkRequest.requestId }
      - { name: evaluationLeaseId, logicalType: Identifier, required: false, unique: true, references: HeavyWorkLease.leaseId }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [draining, committed, aborted, recoveryRequired] }
      - { name: deadlineAt, logicalType: Instant, required: true, unique: false }
      - { name: createdAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - There is at most one active drain per retailer, and switch requires zero provably outstanding pins under the route-control lock.
      - Evaluation request and lease identities are attached only after zero old-route pins are proven; the evaluation request deadline cannot extend the drain deadline.
      - The transition to `committed` is written in the same retailer-local transaction as the completed evaluation terminal result, route switch and decision; a drain never reaches `committed` without that result.
      - Deadline or restart never silently clears a pin; unsafe abort leaves the route unavailable for recovery.

  - name: ActiveModelRoute
    description: The authoritative single active forecasting release for one retailer.
    attributes:
      - { name: retailerId, logicalType: Identifier, required: true, unique: true, references: Retailer.retailerId }
      - { name: activeReleaseId, logicalType: Identifier, required: true, unique: false, references: ModelRelease.modelReleaseId }
      - { name: promotionDecisionId, logicalType: Identifier, required: true, unique: true, references: PromotionDecision.promotionDecisionId }
      - { name: packageId, logicalType: Identifier, required: true, unique: false, references: PromotedModelPackage.packageId }
      - { name: routeVersion, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: activatedAt, logicalType: Instant, required: true, unique: false }
      - { name: availability, logicalType: Enum, required: true, unique: false, allowedValues: [available, unavailable, reconciling], default: available }
      - { name: unavailabilityReason, logicalType: String, required: false, unique: false }
    entityConstraints:
      - Exactly one route record exists per retailer after first activation.
      - Route changes use expected-route-version concurrency.
      - An absent route has logical version zero only for compare-and-create; ForecastRouteControl still exists to serialize first activation.

  - name: ForecastReleaseResolution
    description: The immutable release snapshot pinned when Forecasting admits a run.
    attributes:
      - { name: resolutionId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: forecastRunId, logicalType: Identifier, required: true, unique: true }
      - { name: modelReleaseId, logicalType: Identifier, required: true, unique: false, references: ModelRelease.modelReleaseId }
      - { name: packageId, logicalType: Identifier, required: true, unique: false, references: PromotedModelPackage.packageId }
      - { name: routeVersion, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: routePinId, logicalType: Identifier, required: true, unique: true, references: ForecastRoutePin.pinId }
      - { name: artifactChecksum, logicalType: Sha256, required: true, unique: false }
      - { name: packageManifestDigest, logicalType: Sha256, required: true, unique: false }
      - { name: signerKeyId, logicalType: Identifier, required: true, unique: false }
      - { name: trustPolicyDigest, logicalType: Sha256, required: true, unique: false }
      - { name: runtimeProfileVersion, logicalType: String, required: true, unique: false }
      - { name: inputSchemaDigest, logicalType: Sha256, required: true, unique: false }
      - { name: outputSchemaDigest, logicalType: Sha256, required: true, unique: false }
      - { name: resolvedAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - Retries for the same Forecast Run reuse the same resolution.
      - An uncertain or active route pin remains outstanding for drain purposes even after a run deadline until a proven terminal disposition closes it.

  - name: RestoreManifest
    description: A checksummed recovery set linking lifecycle records, MLflow metadata, and object snapshots.
    attributes:
      - { name: restoreManifestId, logicalType: Identifier, required: true, unique: true }
      - { name: recoveryRunId, logicalType: Identifier, required: true, unique: false }
      - { name: createdAt, logicalType: Instant, required: true, unique: false }
      - { name: controlStoreSnapshot, logicalType: OpaqueLocator, required: true, unique: false }
      - { name: controlStoreSnapshotChecksum, logicalType: Sha256, required: true, unique: false }
      - { name: experimentMetadataSnapshot, logicalType: OpaqueLocator, required: true, unique: false }
      - { name: experimentMetadataSnapshotChecksum, logicalType: Sha256, required: true, unique: false }
      - { name: objectStoreSnapshot, logicalType: OpaqueLocator, required: true, unique: false }
      - { name: objectStoreSnapshotChecksum, logicalType: Sha256, required: true, unique: false }
      - { name: c25RecoveryManifestDigest, logicalType: Sha256, required: true, unique: false }
      - { name: recoveryCutId, logicalType: Identifier, required: true, unique: false }
      - { name: ledgerCheckpoint, logicalType: OpaqueIdentifier, required: true, unique: false }
      - { name: objectInventoryDigest, logicalType: Sha256, required: true, unique: false }
      - { name: experimentInventoryDigest, logicalType: Sha256, required: true, unique: false }
      - { name: manifestChecksum, logicalType: Sha256, required: true, unique: true }
      - { name: retentionPolicyVersion, logicalType: String, required: true, unique: false }
    entityConstraints:
      - Snapshot locators and checksums are immutable.
      - The C25 barrier manifest and checkpoint set prove a single cut; lifecycle, MLflow, and object snapshots each retain their own checksum and inventory evidence.
      - Recovery-policy-v1 retains complete recovery sets for 30 days with a 24-hour RPO and 2-hour RTO objective; incomplete or unmatched cuts cannot make routes available.

  - name: RestoreReconciliation
    description: Tenant-by-tenant validation proving whether restored releases and routes are usable.
    attributes:
      - { name: restoreReconciliationId, logicalType: Identifier, required: true, unique: true }
      - { name: restoreManifestId, logicalType: Identifier, required: true, unique: false, references: RestoreManifest.restoreManifestId }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [pending, validating, reconciled, failed], default: pending }
      - { name: validatedReleaseCount, logicalType: NonNegativeInteger, required: false, unique: false }
      - { name: missingArtifactCount, logicalType: NonNegativeInteger, required: false, unique: false }
      - { name: corruptArtifactCount, logicalType: NonNegativeInteger, required: false, unique: false }
      - { name: selectedFallbackReleaseId, logicalType: Identifier, required: false, unique: false, references: ModelRelease.modelReleaseId }
      - { name: completedAt, logicalType: Instant, required: false, unique: false }
      - { name: safeFailureCode, logicalType: String, required: false, unique: false }
    entityConstraints:
      - Active routes remain unavailable until reconciliation succeeds.
      - A fallback requires an explicit authorized decision and audit evidence.

  - name: RetentionTombstone
    description: Preserved identity and dependency evidence after policy-driven byte expiry.
    attributes:
      - { name: tombstoneId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: targetType, logicalType: Enum, required: true, unique: false, allowedValues: [datasetObject, modelArtifact] }
      - { name: targetId, logicalType: Identifier, required: true, unique: false }
      - { name: checksum, logicalType: Sha256, required: true, unique: false }
      - { name: retentionPolicyVersion, logicalType: String, required: true, unique: false }
      - { name: expiredAt, logicalType: Instant, required: true, unique: false }
      - { name: dependencyDigest, logicalType: Sha256, required: true, unique: false }
    entityConstraints:
      - The pair targetType and targetId is unique.
      - Tombstones are immutable and never authorize substitute bytes.

  - name: IdempotencyRecord
    description: The tenant-scoped operation key, canonical request hash, and original result reference.
    attributes:
      - { name: idempotencyRecordId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: operationType, logicalType: Enum, required: true, unique: false, allowedValues: [publishDataset, train, evaluate, register, promote, rollback, restore, finalizeHeavyWork] }
      - { name: operationKey, logicalType: String, required: true, unique: false }
      - { name: requestHash, logicalType: Sha256, required: true, unique: false }
      - { name: resultReference, logicalType: OpaqueIdentifier, required: true, unique: false }
      - { name: recordedAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - The tuple retailerId, operationType, and operationKey is unique.

  - name: IntegrationOutbox
    description: An immutable message intent committed with an authoritative Model Lifecycle mutation.
    attributes:
      - { name: eventId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: eventType, logicalType: String, required: true, unique: false }
      - { name: aggregateId, logicalType: Identifier, required: true, unique: false }
      - { name: aggregateVersion, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: payloadDigest, logicalType: Sha256, required: true, unique: false }
      - { name: occurredAt, logicalType: Instant, required: true, unique: false }
      - { name: publishedAt, logicalType: Instant, required: false, unique: false }
    entityConstraints:
      - Business state, audit evidence, and required outbox entries commit together.

  - name: IntegrationInbox
    description: A tenant-scoped record of a consumed async message and committed effect.
    attributes:
      - { name: consumerName, logicalType: String, required: true, unique: false }
      - { name: eventId, logicalType: Identifier, required: true, unique: false }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: effectDigest, logicalType: Sha256, required: true, unique: false }
      - { name: processedAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - The pair consumerName and eventId is unique.

  - name: RecoveryParticipantState
    description: Durable C25 Class C command disposition and generation fence for U6 work and messaging.
    attributes:
      - { name: commandId, logicalType: Identifier, required: true, unique: true }
      - { name: commandDigest, logicalType: Sha256, required: true, unique: false }
      - { name: recoveryRunId, logicalType: Identifier, required: true, unique: false }
      - { name: registrationId, logicalType: Identifier, required: true, unique: false }
      - { name: rosterDigest, logicalType: Sha256, required: true, unique: false }
      - { name: placementGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: recoveryGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: disposition, logicalType: Enum, required: true, unique: false, allowedValues: [preparing, prepared, closed, aborted, reconciling, resumed, unsafe] }
      - { name: checkpointDigest, logicalType: Sha256, required: false, unique: false }
      - { name: jobFencePosition, logicalType: OpaqueIdentifier, required: false, unique: false }
      - { name: messagingFencePosition, logicalType: OpaqueIdentifier, required: false, unique: false }
      - { name: closedAt, logicalType: Instant, required: false, unique: false }
    entityConstraints:
      - Repeated command identity returns its persisted disposition; changed digest conflicts.
      - Aborted generations are permanently closed and delayed prepare cannot reopen them.
      - Current generation gates job finalizers, relays, consumers, and route availability.

  - name: BusinessAuditEntry
    description: Immutable business evidence for accepted and rejected sensitive Model Lifecycle actions.
    attributes:
      - { name: auditEntryId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: actorId, logicalType: ExternalIdentifier, required: true, unique: false }
      - { name: action, logicalType: String, required: true, unique: false }
      - { name: targetType, logicalType: String, required: true, unique: false }
      - { name: targetId, logicalType: Identifier, required: false, unique: false }
      - { name: outcome, logicalType: Enum, required: true, unique: false, allowedValues: [accepted, rejected, failed] }
      - { name: provenanceDigest, logicalType: Sha256, required: true, unique: false }
      - { name: correlationId, logicalType: Identifier, required: true, unique: false }
      - { name: occurredAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - Runtime authority cannot update or delete audit entries.
relationships:
  - { from: DatasetVersion, to: DatasetExportReference, cardinality: "one-to-many", direction: "DatasetVersion references its source exports" }
  - { from: DatasetVersion, to: DatasetObject, cardinality: "one-to-many", direction: "DatasetVersion contains immutable objects" }
  - { from: DatasetVersion, to: TemporalSplit, cardinality: "one-to-many", direction: "DatasetVersion declares rolling-origin splits" }
  - { from: EvaluationReport, to: EvaluationConfiguration, cardinality: "many-to-one", direction: "EvaluationReport pins one immutable comparison profile" }
  - { from: TemporalSplit, to: FeatureAvailabilityEvidence, cardinality: "one-to-many", direction: "TemporalSplit carries feature availability proof" }
  - { from: ModelJob, to: ModelJobAttempt, cardinality: "one-to-many", direction: "ModelJob retains attempts" }
  - { from: HeavyWorkRequest, to: HeavyWorkLease, cardinality: "one-to-many", direction: "One shared C07 request retains all fenced lease acquisitions" }
  - { from: HeavyWorkLease, to: HeavyWorkTerminalResult, cardinality: "one-to-one-or-zero", direction: "A terminal retailer-local lease has one immutable result" }
  - { from: PromotionDecision, to: HeavyWorkTerminalResult, cardinality: "one-to-one", direction: "A committed route decision shares the completed evaluation result" }
  - { from: HeavyWorkTerminalResult, to: ForecastRoutePin, cardinality: "one-to-one-or-zero", direction: "Batch finalization closes exactly its verified pin" }
  - { from: ModelJob, to: HeavyWorkRequest, cardinality: "one-to-one-or-zero", direction: "Heavy U6 jobs link to a shared C07 request" }
  - { from: ModelJobAttempt, to: ExperimentRun, cardinality: "one-to-one-or-zero", direction: "ModelJobAttempt creates experiment evidence" }
  - { from: ExperimentRun, to: DatasetVersion, cardinality: "many-to-one", direction: "ExperimentRun pins a DatasetVersion" }
  - { from: ExperimentRun, to: ModelArtifact, cardinality: "one-to-many", direction: "ExperimentRun publishes finalized artifacts" }
  - { from: EvaluationReport, to: ForecastMetric, cardinality: "one-to-many", direction: "EvaluationReport contains forecast metrics" }
  - { from: EvaluationReport, to: InventoryPolicyReport, cardinality: "one-to-many", direction: "EvaluationReport contains policy outcomes" }
  - { from: ModelRelease, to: ModelArtifact, cardinality: "many-to-one", direction: "ModelRelease pins immutable bytes" }
  - { from: PromotedModelPackage, to: ModelRelease, cardinality: "many-to-one", direction: "Each activation generation signs one release and artifact" }
  - { from: PromotionIntent, to: HeavyWorkRequest, cardinality: "one-to-one-or-zero", direction: "Operator promotion obtains a fresh C07 evaluation request only after its drain reaches zero pins" }
  - { from: PromotionDecision, to: PromotionIntent, cardinality: "one-to-one-or-zero", direction: "Committed promotion records its explicit Operator intent" }
  - { from: ModelRelease, to: EvaluationReport, cardinality: "many-to-one", direction: "ModelRelease pins comparable evidence" }
  - { from: PromotionDecision, to: ModelRelease, cardinality: "many-to-one", direction: "PromotionDecision targets one release" }
  - { from: ActiveModelRoute, to: ModelRelease, cardinality: "one-to-one", direction: "ActiveModelRoute selects one retailer release" }
  - { from: ForecastReleaseResolution, to: ActiveModelRoute, cardinality: "many-to-one-snapshot", direction: "ForecastReleaseResolution snapshots a route version" }
  - { from: RestoreManifest, to: RestoreReconciliation, cardinality: "one-to-many", direction: "RestoreManifest is reconciled per retailer" }
  - { from: RecoveryParticipantState, to: RestoreManifest, cardinality: "many-to-one-by-recovery-run", direction: "RecoveryParticipantState checkpoints the run identified by RestoreManifest" }
  - { from: RetentionTombstone, to: DatasetObject, cardinality: "one-to-one-or-zero", direction: "Tombstone preserves expired dataset object identity" }
  - { from: RetentionTombstone, to: ModelArtifact, cardinality: "one-to-one-or-zero", direction: "Tombstone preserves expired model artifact identity" }
```

## Entity summary

| Area | Authoritative entities | Purpose |
| --- | --- | --- |
| Dataset identity | DatasetExportReference, DatasetVersion, DatasetObject, TemporalSplit | Rebuild exactly the same tenant-scoped inputs and held-out horizons. |
| Leakage control | FeatureSpecification, FeatureAvailabilityEvidence | Prove every feature and transformation was available at forecast origin. |
| Work execution | HeavyWorkRequest, HeavyWorkLease, HeavyWorkTerminalResult, ModelJob, ModelJobAttempt, ExperimentRun | One C07 arbiter serves four work types; retailer-local terminal results prove both external-owner publication and U6 route evaluation while U6 jobs retain their own attempts and experiment evidence. |
| Evaluation | EvaluationConfiguration, EvaluationReport, ForecastMetric, InventoryPolicyReport | Compare candidates with one versioned baseline profile, common origins and exogenous scenarios. |
| Release control | ModelDefinition, ModelArtifact, ModelRelease, PromotedModelPackage, PromotionIntent, PromotionDecision, ActiveModelRoute | Separate algorithm identity, unsigned candidate bytes, signed activation packages, human decisions, and production routing. |
| Forecast handoff | ForecastReleaseResolution | Pin the exact release used by each Forecast Run. |
| Recovery and retention | RestoreManifest, RestoreReconciliation, RecoveryParticipantState, RetentionTombstone | Fence all Class C effects, restore one consistent cut, and reconcile before activation while preserving expired identity. |
| Reliability and audit | IdempotencyRecord, IntegrationOutbox, IntegrationInbox, BusinessAuditEntry | Make mutation, replay, and evidence behavior deterministic. |

## Sources

- inception/units-generation/unit-of-work.md
- inception/units-generation/unit-of-work-story-map.md
- inception/requirements-analysis/requirements.md
- inception/domain-design/components.md
- inception/contract-design/contract-summary.md
- construction/model-lifecycle/functional-design/functional-design-questions.md

## Assumptions & Open Questions

- Evaluation periods, origin cadence, job deadline/attempt budgets, retention duration, and recovery objectives are fixed by the versioned profiles above; measured resource requests and queue capacity remain NFR/implementation values.
- The first candidate's dependency revision is pinned during implementation; this design fixes the algorithm family, Poisson loss, feature classes, and deterministic provenance.
