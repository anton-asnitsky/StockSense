# Model Lifecycle Functional Entity Model

Unit: U6 Model Lifecycle (model-lifecycle)

Decision basis: confirmed Model Lifecycle Functional Design answers dated 2026-09-13.

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

  - name: ModelJob
    description: A logical asynchronous dataset, training, evaluation, registration, or restore job.
    attributes:
      - { name: modelJobId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: jobType, logicalType: Enum, required: true, unique: false, allowedValues: [publishDataset, trainCandidate, evaluateForecast, evaluatePolicy, registerRelease, restoreReconcile] }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [requested, queued, running, succeeded, failed, cancelled, superseded], default: requested }
      - { name: requestHash, logicalType: Sha256, required: true, unique: false }
      - { name: submittedBy, logicalType: ExternalIdentifier, required: true, unique: false }
      - { name: submittedAt, logicalType: Instant, required: true, unique: false }
      - { name: completedAt, logicalType: Instant, required: false, unique: false }
      - { name: safeFailureCode, logicalType: String, required: false, unique: false }
      - { name: version, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
    entityConstraints:
      - A job never changes the active model route directly.
      - At most one resource-intensive Model Job holds the cluster-wide execution lease.

  - name: ModelJobAttempt
    description: One immutable leased attempt under a logical Model Job.
    attributes:
      - { name: attemptId, logicalType: Identifier, required: true, unique: true }
      - { name: modelJobId, logicalType: Identifier, required: true, unique: false, references: ModelJob.modelJobId }
      - { name: attemptNumber, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [queued, leased, running, succeeded, failed, interrupted, cancelled] }
      - { name: leaseOwner, logicalType: String, required: false, unique: false }
      - { name: leaseExpiresAt, logicalType: Instant, required: false, unique: false }
      - { name: heartbeatAt, logicalType: Instant, required: false, unique: false }
      - { name: checkpointDigest, logicalType: Sha256, required: false, unique: false }
      - { name: startedAt, logicalType: Instant, required: false, unique: false }
      - { name: completedAt, logicalType: Instant, required: false, unique: false }
    entityConstraints:
      - The pair modelJobId and attemptNumber is unique.
      - Retry appends an attempt and reuses only verified inputs or checkpoints.

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

  - name: EvaluationReport
    description: Immutable comparable evidence for one or more model definitions over one Dataset Version.
    attributes:
      - { name: evaluationReportId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: datasetVersionId, logicalType: Identifier, required: true, unique: false, references: DatasetVersion.datasetVersionId }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [building, complete, incomplete, failed], default: building }
      - { name: commonOriginsDigest, logicalType: Sha256, required: true, unique: false }
      - { name: commonProductsDigest, logicalType: Sha256, required: true, unique: false }
      - { name: sampleCount, logicalType: NonNegativeInteger, required: false, unique: false }
      - { name: exclusionCount, logicalType: NonNegativeInteger, required: false, unique: false }
      - { name: limitationNotes, logicalType: Text, required: true, unique: false }
      - { name: completedAt, logicalType: Instant, required: false, unique: false }
    entityConstraints:
      - Promotion eligibility requires a complete comparable report including both baselines.

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

  - name: PromotionDecision
    description: An immutable Operator decision to activate or roll back a retailer model route.
    attributes:
      - { name: promotionDecisionId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: decisionType, logicalType: Enum, required: true, unique: false, allowedValues: [promote, rollback] }
      - { name: targetReleaseId, logicalType: Identifier, required: true, unique: false, references: ModelRelease.modelReleaseId }
      - { name: priorReleaseId, logicalType: Identifier, required: false, unique: false, references: ModelRelease.modelReleaseId }
      - { name: evaluationReportId, logicalType: Identifier, required: true, unique: false, references: EvaluationReport.evaluationReportId }
      - { name: rationale, logicalType: Text, required: true, unique: false }
      - { name: decidedBy, logicalType: ExternalIdentifier, required: true, unique: false }
      - { name: decidedAt, logicalType: Instant, required: true, unique: false }
      - { name: expectedRouteVersion, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
    entityConstraints:
      - The decision cannot be altered or deleted through ordinary runtime authority.

  - name: ActiveModelRoute
    description: The authoritative single active forecasting release for one retailer.
    attributes:
      - { name: retailerId, logicalType: Identifier, required: true, unique: true, references: Retailer.retailerId }
      - { name: activeReleaseId, logicalType: Identifier, required: true, unique: false, references: ModelRelease.modelReleaseId }
      - { name: promotionDecisionId, logicalType: Identifier, required: true, unique: true, references: PromotionDecision.promotionDecisionId }
      - { name: routeVersion, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: activatedAt, logicalType: Instant, required: true, unique: false }
      - { name: availability, logicalType: Enum, required: true, unique: false, allowedValues: [available, unavailable, reconciling], default: available }
      - { name: unavailabilityReason, logicalType: String, required: false, unique: false }
    entityConstraints:
      - Exactly one route record exists per retailer after first activation.
      - Route changes use expected-route-version concurrency.

  - name: ForecastReleaseResolution
    description: The immutable release snapshot pinned when Forecasting admits a run.
    attributes:
      - { name: resolutionId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: forecastRunId, logicalType: Identifier, required: true, unique: true }
      - { name: modelReleaseId, logicalType: Identifier, required: true, unique: false, references: ModelRelease.modelReleaseId }
      - { name: routeVersion, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: artifactChecksum, logicalType: Sha256, required: true, unique: false }
      - { name: runtimeProfileVersion, logicalType: String, required: true, unique: false }
      - { name: inputSchemaDigest, logicalType: Sha256, required: true, unique: false }
      - { name: outputSchemaDigest, logicalType: Sha256, required: true, unique: false }
      - { name: resolvedAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - Retries for the same Forecast Run reuse the same resolution.

  - name: RestoreManifest
    description: A checksummed recovery set linking lifecycle records, MLflow metadata, and object snapshots.
    attributes:
      - { name: restoreManifestId, logicalType: Identifier, required: true, unique: true }
      - { name: createdAt, logicalType: Instant, required: true, unique: false }
      - { name: controlStoreSnapshot, logicalType: OpaqueLocator, required: true, unique: false }
      - { name: experimentMetadataSnapshot, logicalType: OpaqueLocator, required: true, unique: false }
      - { name: objectStoreSnapshot, logicalType: OpaqueLocator, required: true, unique: false }
      - { name: manifestChecksum, logicalType: Sha256, required: true, unique: true }
      - { name: retentionPolicyVersion, logicalType: String, required: true, unique: false }
    entityConstraints:
      - Snapshot locators and checksums are immutable.

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
      - { name: operationType, logicalType: Enum, required: true, unique: false, allowedValues: [publishDataset, train, evaluate, register, promote, rollback, restore] }
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
  - { from: TemporalSplit, to: FeatureAvailabilityEvidence, cardinality: "one-to-many", direction: "TemporalSplit carries feature availability proof" }
  - { from: ModelJob, to: ModelJobAttempt, cardinality: "one-to-many", direction: "ModelJob retains attempts" }
  - { from: ModelJobAttempt, to: ExperimentRun, cardinality: "one-to-one-or-zero", direction: "ModelJobAttempt creates experiment evidence" }
  - { from: ExperimentRun, to: DatasetVersion, cardinality: "many-to-one", direction: "ExperimentRun pins a DatasetVersion" }
  - { from: ExperimentRun, to: ModelArtifact, cardinality: "one-to-many", direction: "ExperimentRun publishes finalized artifacts" }
  - { from: EvaluationReport, to: ForecastMetric, cardinality: "one-to-many", direction: "EvaluationReport contains forecast metrics" }
  - { from: EvaluationReport, to: InventoryPolicyReport, cardinality: "one-to-many", direction: "EvaluationReport contains policy outcomes" }
  - { from: ModelRelease, to: ModelArtifact, cardinality: "many-to-one", direction: "ModelRelease pins immutable bytes" }
  - { from: ModelRelease, to: EvaluationReport, cardinality: "many-to-one", direction: "ModelRelease pins comparable evidence" }
  - { from: PromotionDecision, to: ModelRelease, cardinality: "many-to-one", direction: "PromotionDecision targets one release" }
  - { from: ActiveModelRoute, to: ModelRelease, cardinality: "one-to-one", direction: "ActiveModelRoute selects one retailer release" }
  - { from: ForecastReleaseResolution, to: ActiveModelRoute, cardinality: "many-to-one-snapshot", direction: "ForecastReleaseResolution snapshots a route version" }
  - { from: RestoreManifest, to: RestoreReconciliation, cardinality: "one-to-many", direction: "RestoreManifest is reconciled per retailer" }
  - { from: RetentionTombstone, to: DatasetObject, cardinality: "one-to-one-or-zero", direction: "Tombstone preserves expired dataset object identity" }
  - { from: RetentionTombstone, to: ModelArtifact, cardinality: "one-to-one-or-zero", direction: "Tombstone preserves expired model artifact identity" }
```

## Entity summary

| Area | Authoritative entities | Purpose |
| --- | --- | --- |
| Dataset identity | DatasetExportReference, DatasetVersion, DatasetObject, TemporalSplit | Rebuild exactly the same tenant-scoped inputs and held-out horizons. |
| Leakage control | FeatureSpecification, FeatureAvailabilityEvidence | Prove every feature and transformation was available at forecast origin. |
| Work execution | ModelJob, ModelJobAttempt, ExperimentRun | Separate stable logical jobs from leased retries and immutable experiment evidence. |
| Evaluation | EvaluationReport, ForecastMetric, InventoryPolicyReport | Compare candidates with common origins and exogenous scenarios. |
| Release control | ModelDefinition, ModelArtifact, ModelRelease, PromotionDecision, ActiveModelRoute | Separate algorithm identity, bytes, evidence, lifecycle, and production routing. |
| Forecast handoff | ForecastReleaseResolution | Pin the exact release used by each Forecast Run. |
| Recovery and retention | RestoreManifest, RestoreReconciliation, RetentionTombstone | Restore and reconcile before activation while preserving expired identity. |
| Reliability and audit | IdempotencyRecord, IntegrationOutbox, IntegrationInbox, BusinessAuditEntry | Make mutation, replay, and evidence behavior deterministic. |

## Sources

- inception/units-generation/unit-of-work.md
- inception/units-generation/unit-of-work-story-map.md
- inception/requirements-analysis/requirements.md
- inception/domain-design/components.md
- inception/contract-design/contract-summary.md
- construction/model-lifecycle/functional-design/functional-design-questions.md

## Assumptions & Open Questions

- Exact baseline periods, rolling-origin cadence beyond three complete horizons, retry budgets, retention durations, recovery objectives, and resource requests are deferred to NFR and implementation stages.
- The first candidate's dependency revision is pinned during implementation; this design fixes the algorithm family, Poisson loss, feature classes, and deterministic provenance.
