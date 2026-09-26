# Supplier Knowledge Functional Entity Model

Unit: U5 Supplier Knowledge (supplier-knowledge)

Decision basis: confirmed Supplier Knowledge Functional Design answers dated 2026-09-13.

The YAML block is the source of truth for the logical entity model. Original source bytes are immutable objects outside the document database; source, extraction, validation, and processing metadata remain document records. Accepted commercial terms are authoritative relational records. Retrieval indexes are rebuildable projections.

## Source-of-truth entity model

```yaml source-of-truth
schemaVersion: "1.0.0"
unit: supplier-knowledge
entities:
  - name: Supplier
    description: A retailer-owned commercial counterparty whose offers may become accepted terms.
    attributes:
      - { name: supplierId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: supplierCode, logicalType: String, required: true, unique: false }
      - { name: displayName, logicalType: String, required: true, unique: false }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [active, suspended, retired], default: active }
      - { name: version, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
    entityConstraints:
      - The pair retailerId and supplierCode is unique.
      - Retirement preserves source, term, comparison, and audit history.
      - A status or display-name mutation that changes comparison eligibility or ordering writes the MongoDB source recovery fence and advances the retailer's SupplierSourceGeneration in the same transaction; exact replay does not advance it again.

  - name: SupplierSubmission
    description: One immutable retailer-scoped upload request and its source identity.
    attributes:
      - { name: submissionId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: supplierId, logicalType: Identifier, required: true, unique: false, references: Supplier.supplierId }
      - { name: sourceKind, logicalType: Enum, required: true, unique: false, allowedValues: [csvOffer, textPdf] }
      - { name: originalFileName, logicalType: String, required: true, unique: false }
      - { name: mediaType, logicalType: String, required: true, unique: false }
      - { name: languageCode, logicalType: LanguageCode, required: false, unique: false }
      - { name: rawChecksum, logicalType: Sha256, required: true, unique: false }
      - { name: normalizedChecksum, logicalType: Sha256, required: false, unique: false }
      - { name: sourceVersion, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [received, queued, processing, validated, partiallyValidated, failed, superseded, deleted], default: received }
      - { name: submittedBy, logicalType: ExternalIdentifier, required: true, unique: false }
      - { name: submittedAt, logicalType: Instant, required: true, unique: false }
      - { name: placementGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: version, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
    entityConstraints:
      - The tuple retailerId, supplierId, sourceKind, sourceVersion is unique.
      - The tuple retailerId, rawChecksum and processing configuration identifies exact-content replay.
      - A submission never becomes an authoritative commercial term by status transition alone.

  - name: SourceObject
    description: The immutable object-storage reference for original supplier bytes.
    attributes:
      - { name: sourceObjectId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: submissionId, logicalType: Identifier, required: true, unique: true, references: SupplierSubmission.submissionId }
      - { name: objectLocator, logicalType: OpaqueLocator, required: true, unique: true, constraints: "Server-owned; never returned as storage authority." }
      - { name: byteLength, logicalType: NonNegativeInteger, required: true, unique: false }
      - { name: checksum, logicalType: Sha256, required: true, unique: false }
      - { name: availability, logicalType: Enum, required: true, unique: false, allowedValues: [available, quarantined, deleted, missing], default: available }
      - { name: retainedUntil, logicalType: Instant, required: false, unique: false }
    entityConstraints:
      - Object bytes must match the submission rawChecksum before processing.
      - A deleted or missing object cannot be substituted with another source version.

  - name: ProcessingAttempt
    description: An immutable leased attempt to extract or validate one submission.
    attributes:
      - { name: attemptId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: submissionId, logicalType: Identifier, required: true, unique: false, references: SupplierSubmission.submissionId }
      - { name: attemptNumber, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: purpose, logicalType: Enum, required: true, unique: false, allowedValues: [extract, validate, deleteReconcile] }
      - { name: configurationDigest, logicalType: Sha256, required: true, unique: false }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [queued, leased, succeeded, partiallySucceeded, failed, interrupted] }
      - { name: leaseExpiresAt, logicalType: Instant, required: false, unique: false }
      - { name: startedAt, logicalType: Instant, required: false, unique: false }
      - { name: completedAt, logicalType: Instant, required: false, unique: false }
      - { name: safeFailureCode, logicalType: String, required: false, unique: false }
    entityConstraints:
      - The pair submissionId and attemptNumber is unique.
      - Retry appends an attempt and never overwrites prior evidence.

  - name: ExtractionRecord
    description: The versioned parser result for one source and processing configuration.
    attributes:
      - { name: extractionId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: submissionId, logicalType: Identifier, required: true, unique: false, references: SupplierSubmission.submissionId }
      - { name: attemptId, logicalType: Identifier, required: true, unique: true, references: ProcessingAttempt.attemptId }
      - { name: parserName, logicalType: String, required: true, unique: false }
      - { name: parserVersion, logicalType: String, required: true, unique: false }
      - { name: configurationDigest, logicalType: Sha256, required: true, unique: false }
      - { name: detectedLanguage, logicalType: LanguageCode, required: false, unique: false }
      - { name: outcome, logicalType: Enum, required: true, unique: false, allowedValues: [complete, partial, unsupported, failed] }
      - { name: extractedTextChecksum, logicalType: Sha256, required: false, unique: false }
      - { name: createdAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - The source version, parser identity, and configuration digest determine extraction identity.
      - Unsupported or partial extraction is never represented as complete.

  - name: PageExtraction
    description: Page-level text and quality evidence from a PDF extraction.
    attributes:
      - { name: pageExtractionId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: extractionId, logicalType: Identifier, required: true, unique: false, references: ExtractionRecord.extractionId }
      - { name: pageNumber, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: outcome, logicalType: Enum, required: true, unique: false, allowedValues: [usable, empty, scanned, malformed, encrypted, failed] }
      - { name: text, logicalType: Text, required: false, unique: false }
      - { name: textChecksum, logicalType: Sha256, required: false, unique: false }
      - { name: qualityFlags, logicalType: StringSet, required: false, unique: false }
    entityConstraints:
      - The pair extractionId and pageNumber is unique.
      - A page without usable text produces an explicit outcome and no invented text.

  - name: ValidationResult
    description: Immutable validation totals and disposition for one submission and configuration.
    attributes:
      - { name: validationResultId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: submissionId, logicalType: Identifier, required: true, unique: false, references: SupplierSubmission.submissionId }
      - { name: attemptId, logicalType: Identifier, required: true, unique: true, references: ProcessingAttempt.attemptId }
      - { name: schemaVersion, logicalType: String, required: true, unique: false }
      - { name: configurationDigest, logicalType: Sha256, required: true, unique: false }
      - { name: outcome, logicalType: Enum, required: true, unique: false, allowedValues: [valid, partiallyValid, invalid, unsupported, failed] }
      - { name: candidateCount, logicalType: NonNegativeInteger, required: true, unique: false }
      - { name: rejectedCount, logicalType: NonNegativeInteger, required: true, unique: false }
      - { name: diagnosticCount, logicalType: NonNegativeInteger, required: true, unique: false }
      - { name: diagnosticsTruncated, logicalType: Boolean, required: true, unique: false, default: false }
      - { name: completedAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - Candidate and rejected counts cover every parsed row or extracted candidate in scope.
      - Validation produces evidence only and never grants authoritative status.

  - name: ValidationDiagnostic
    description: A safe row, field, page, or source-level correction reason.
    attributes:
      - { name: diagnosticId, logicalType: Identifier, required: true, unique: true }
      - { name: validationResultId, logicalType: Identifier, required: true, unique: false, references: ValidationResult.validationResultId }
      - { name: locatorKind, logicalType: Enum, required: true, unique: false, allowedValues: [source, row, field, page] }
      - { name: locator, logicalType: String, required: true, unique: false }
      - { name: code, logicalType: String, required: true, unique: false }
      - { name: severity, logicalType: Enum, required: true, unique: false, allowedValues: [error, warning] }
      - { name: message, logicalType: String, required: true, unique: false }
    entityConstraints:
      - At most 100 diagnostics are returned to one caller; total counts remain accurate.
      - Diagnostic text excludes secrets and raw document bodies.

  - name: SupplierOfferCandidate
    description: A non-authoritative validated offer candidate derived from a source locator.
    attributes:
      - { name: candidateId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: supplierId, logicalType: Identifier, required: true, unique: false, references: Supplier.supplierId }
      - { name: submissionId, logicalType: Identifier, required: true, unique: false, references: SupplierSubmission.submissionId }
      - { name: productId, logicalType: Identifier, required: false, unique: false, references: Product.productId }
      - { name: sourceLocator, logicalType: String, required: true, unique: false }
      - { name: unitPrice, logicalType: MoneyAmount, required: false, unique: false, min: 0 }
      - { name: currencyCode, logicalType: CurrencyCode, required: false, unique: false }
      - { name: leadTimeDays, logicalType: NonNegativeInteger, required: false, unique: false }
      - { name: minimumOrderQuantity, logicalType: PositiveInteger, required: false, unique: false, min: 1 }
      - { name: packSize, logicalType: PositiveInteger, required: false, unique: false, min: 1 }
      - { name: effectiveFrom, logicalType: Instant, required: false, unique: false }
      - { name: effectiveTo, logicalType: Instant, required: false, unique: false }
      - { name: validationStatus, logicalType: Enum, required: true, unique: false, allowedValues: [valid, rejected, pendingMapping] }
    entityConstraints:
      - A candidate is never returned as an accepted term.
      - Product mapping, currency, required numeric fields, and effective dates must be valid before acceptance.

  - name: AcceptedSupplierTerm
    description: An immutable authoritative commercial term accepted by a Manager.
    attributes:
      - { name: termId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: supplierId, logicalType: Identifier, required: true, unique: false, references: Supplier.supplierId }
      - { name: productId, logicalType: Identifier, required: true, unique: false, references: Product.productId }
      - { name: candidateId, logicalType: Identifier, required: true, unique: false, references: SupplierOfferCandidate.candidateId }
      - { name: sourceVersion, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: sourceChecksum, logicalType: Sha256, required: true, unique: false }
      - { name: sourceLocator, logicalType: String, required: true, unique: false }
      - { name: unitPrice, logicalType: MoneyAmount, required: true, unique: false, min: 0 }
      - { name: currencyCode, logicalType: CurrencyCode, required: true, unique: false }
      - { name: leadTimeDays, logicalType: NonNegativeInteger, required: true, unique: false }
      - { name: minimumOrderQuantity, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: packSize, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: effectiveFrom, logicalType: Instant, required: true, unique: false }
      - { name: effectiveTo, logicalType: Instant, required: false, unique: false }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [accepted, superseded, revoked], default: accepted }
      - { name: acceptedBy, logicalType: ExternalIdentifier, required: true, unique: false }
      - { name: acceptedAt, logicalType: Instant, required: true, unique: false }
      - { name: version, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
    entityConstraints:
      - Accepted effective periods cannot overlap for the same retailer, supplier, and product.
      - Currency equals the retailer currency and lead time uses calendar days.
      - Corrections append a superseding or revoking version and preserve history.

  - name: TermTransition
    description: The immutable reasoned transition linking accepted, superseded, or revoked terms.
    attributes:
      - { name: transitionId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: priorTermId, logicalType: Identifier, required: false, unique: false, references: AcceptedSupplierTerm.termId }
      - { name: resultingTermId, logicalType: Identifier, required: false, unique: false, references: AcceptedSupplierTerm.termId }
      - { name: transitionKind, logicalType: Enum, required: true, unique: false, allowedValues: [accept, supersede, revoke] }
      - { name: reasonCode, logicalType: String, required: true, unique: false }
      - { name: actorId, logicalType: ExternalIdentifier, required: true, unique: false }
      - { name: occurredAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - A transition cannot cross retailer, supplier, or product identity.
      - Revocation has no resulting current term unless another term is accepted in the same governed action.

  - name: SourceDeletionGuard
    description: PostgreSQL authority that serializes term eligibility and deletion of one exact source version.
    attributes:
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: submissionId, logicalType: Identifier, required: true, unique: false, references: SupplierSubmission.submissionId }
      - { name: sourceVersion, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: fenceGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: state, logicalType: Enum, required: true, unique: false, allowedValues: [open, reserved, tombstoned], default: open }
      - { name: deletionRequestId, logicalType: Identifier, required: false, unique: false }
      - { name: sourceChecksum, logicalType: Sha256, required: true, unique: false }
      - { name: updatedAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - The tuple retailerId, submissionId, sourceVersion is unique and is created before a source becomes eligible for term acceptance.
      - Term acceptance, term dependency removal, and deletion reservation lock this row in PostgreSQL with current-term dependency rows.
      - Reserved and tombstoned states deny new acceptance; a tombstoned guard is never reopened.
      - A committed reservation is irreversible: reconciliation retries the matching MongoDB tombstone and never reopens the guard, including after worker uncertainty.

  - name: SourceTombstone
    description: MongoDB deletion authority for a source whose bytes and projections must stay absent.
    attributes:
      - { name: tombstoneId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: submissionId, logicalType: Identifier, required: true, unique: true, references: SupplierSubmission.submissionId }
      - { name: sourceChecksum, logicalType: Sha256, required: true, unique: false }
      - { name: deletedBy, logicalType: ExternalIdentifier, required: true, unique: false }
      - { name: deletedAt, logicalType: Instant, required: true, unique: false }
      - { name: reasonCode, logicalType: String, required: true, unique: false }
      - { name: deletionRequestId, logicalType: Identifier, required: true, unique: true }
      - { name: fenceGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: objectCleanupState, logicalType: Enum, required: true, unique: false, allowedValues: [pending, running, complete, failed], default: pending }
      - { name: indexCleanupState, logicalType: Enum, required: true, unique: false, allowedValues: [pending, running, complete, failed], default: pending }
      - { name: deletionState, logicalType: Enum, required: true, unique: false, allowedValues: [tombstoned, complete], default: tombstoned }
      - { name: objectCleanupEvidenceDigest, logicalType: Sha256, required: false, unique: false }
      - { name: indexCleanupEvidenceDigest, logicalType: Sha256, required: false, unique: false }
    entityConstraints:
      - A tombstone survives object and index deletion.
      - Rebuild logic excludes every tombstoned source.
      - Completion requires both cleanup branches complete, matching fence generation, and reconciled evidence; failed branches alone retry without resetting a completed branch.

  - name: DocumentChunk
    description: An immutable page-aware piece of extracted source text used to build retrieval projections.
    attributes:
      - { name: chunkId, logicalType: DeterministicIdentifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: submissionId, logicalType: Identifier, required: true, unique: false, references: SupplierSubmission.submissionId }
      - { name: extractionId, logicalType: Identifier, required: true, unique: false, references: ExtractionRecord.extractionId }
      - { name: pageStart, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: pageEnd, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: sectionLocator, logicalType: String, required: false, unique: false }
      - { name: ordinal, logicalType: NonNegativeInteger, required: true, unique: false }
      - { name: text, logicalType: Text, required: true, unique: false }
      - { name: textHash, logicalType: Sha256, required: true, unique: false }
      - { name: tokenCount, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: languageCode, logicalType: LanguageCode, required: true, unique: false }
      - { name: chunkingConfigurationDigest, logicalType: Sha256, required: true, unique: false }
      - { name: qualityFlags, logicalType: StringSet, required: false, unique: false }
    entityConstraints:
      - Chunk identity derives from source version, locator, text hash, and chunking configuration.
      - Text remains untrusted evidence and never becomes executable instruction.

  - name: EmbeddingConfiguration
    description: A pinned model and preprocessing identity whose vectors are mutually compatible.
    attributes:
      - { name: embeddingConfigurationId, logicalType: Identifier, required: true, unique: true }
      - { name: modelId, logicalType: String, required: true, unique: false }
      - { name: modelRevision, logicalType: String, required: true, unique: false }
      - { name: vectorDimension, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: preprocessingDigest, logicalType: Sha256, required: true, unique: false }
      - { name: pooling, logicalType: String, required: true, unique: false }
      - { name: normalization, logicalType: String, required: true, unique: false }
      - { name: precision, logicalType: String, required: true, unique: false }
      - { name: queryFormatting, logicalType: String, required: true, unique: false }
      - { name: documentFormatting, logicalType: String, required: true, unique: false }
      - { name: artifactChecksum, logicalType: Sha256, required: true, unique: false }
    entityConstraints:
      - Any material configuration change creates a new identity.
      - Query and document vectors must use the same configuration identity.

  - name: RetrievalIndexGeneration
    description: One isolated rebuildable collection generation for a retailer and embedding configuration.
    attributes:
      - { name: indexGenerationId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: embeddingConfigurationId, logicalType: Identifier, required: true, unique: false, references: EmbeddingConfiguration.embeddingConfigurationId }
      - { name: generation, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: collectionLocator, logicalType: OpaqueLocator, required: true, unique: true, constraints: "Server-owned and never client-selected." }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [planned, building, validating, validated, active, superseded, failed, deleted], default: planned }
      - { name: sourceManifestDigest, logicalType: Sha256, required: false, unique: false }
      - { name: expectedChunkCount, logicalType: NonNegativeInteger, required: false, unique: false }
      - { name: indexedChunkCount, logicalType: NonNegativeInteger, required: false, unique: false }
      - { name: tombstoneCount, logicalType: NonNegativeInteger, required: false, unique: false }
      - { name: createdAt, logicalType: Instant, required: true, unique: false }
      - { name: validatedAt, logicalType: Instant, required: false, unique: false }
    entityConstraints:
      - The tuple retailerId, embeddingConfigurationId, generation is unique.
      - At most one generation is active per retailer and embedding configuration.
      - Activation requires complete source, deletion, count, checksum, and tenant reconciliation.
      - Validation leaves the route unchanged; a separate route-authority transaction activates only a validated generation.

  - name: ActiveIndexRoute
    description: The authoritative server-side pointer to one validated retrieval generation.
    attributes:
      - { name: routeId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: embeddingConfigurationId, logicalType: Identifier, required: true, unique: false, references: EmbeddingConfiguration.embeddingConfigurationId }
      - { name: indexGenerationId, logicalType: Identifier, required: true, unique: false, references: RetrievalIndexGeneration.indexGenerationId }
      - { name: routeVersion, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: activatedBy, logicalType: ExternalIdentifier, required: true, unique: false }
      - { name: activatedAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - The pair retailerId and embeddingConfigurationId has one current route.
      - Route changes use expected versions and cannot cross tenants or configurations.

  - name: IndexBuildJob
    description: An idempotent rebuild, validation, deletion reconciliation, activation, rollback, or retirement job.
    attributes:
      - { name: indexJobId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: indexGenerationId, logicalType: Identifier, required: true, unique: false, references: RetrievalIndexGeneration.indexGenerationId }
      - { name: jobKind, logicalType: Enum, required: true, unique: false, allowedValues: [build, validate, deleteReconcile, activate, rollback, retire] }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [queued, running, succeeded, failed, deadLettered] }
      - { name: checkpoint, logicalType: String, required: false, unique: false }
      - { name: requestHash, logicalType: Sha256, required: true, unique: false }
      - { name: startedAt, logicalType: Instant, required: false, unique: false }
      - { name: completedAt, logicalType: Instant, required: false, unique: false }
      - { name: safeFailureCode, logicalType: String, required: false, unique: false }
    entityConstraints:
      - Exact job replay resumes or returns the same logical result.
      - Interrupted work cannot activate a partially reconciled generation.

  - name: RetrievalCitation
    description: A value object that identifies the exact authorized evidence returned by retrieval.
    attributes:
      - { name: citationId, logicalType: DeterministicIdentifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: submissionId, logicalType: Identifier, required: true, unique: false, references: SupplierSubmission.submissionId }
      - { name: sourceVersion, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: documentName, logicalType: String, required: true, unique: false }
      - { name: pageOrRowLocator, logicalType: String, required: true, unique: false }
      - { name: chunkId, logicalType: DeterministicIdentifier, required: true, unique: false, references: DocumentChunk.chunkId }
      - { name: excerpt, logicalType: Text, required: true, unique: false }
      - { name: availabilityStatus, logicalType: Enum, required: true, unique: false, allowedValues: [available, partial, deleted, missing] }
      - { name: qualityFlags, logicalType: StringSet, required: false, unique: false }
    entityConstraints:
      - Citation identity never redirects to a different source version.
      - Deleted or missing evidence reports status instead of substituted content.

  - name: EmbeddingEvaluation
    description: A reproducible comparison of approved embedding configurations over one held-out corpus.
    attributes:
      - { name: evaluationId, logicalType: Identifier, required: true, unique: true }
      - { name: corpusVersion, logicalType: String, required: true, unique: false }
      - { name: querySetVersion, logicalType: String, required: true, unique: false }
      - { name: chunkingConfigurationDigest, logicalType: Sha256, required: true, unique: false }
      - { name: candidateConfigurationIds, logicalType: IdentifierSet, required: true, unique: false, references: EmbeddingConfiguration.embeddingConfigurationId }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [planned, running, completed, failed] }
      - { name: limitations, logicalType: StringSet, required: false, unique: false }
      - { name: createdAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - Candidate configurations use identical source and query versions.
      - Evaluation completion does not automatically select a production default.

  - name: EmbeddingCandidateResult
    description: The measured quality and resource result for one candidate in an embedding evaluation.
    attributes:
      - { name: candidateResultId, logicalType: Identifier, required: true, unique: true }
      - { name: evaluationId, logicalType: Identifier, required: true, unique: false, references: EmbeddingEvaluation.evaluationId }
      - { name: embeddingConfigurationId, logicalType: Identifier, required: true, unique: false, references: EmbeddingConfiguration.embeddingConfigurationId }
      - { name: recallAtK, logicalType: Decimal, required: true, unique: false, min: 0, max: 1 }
      - { name: rankingMetrics, logicalType: MetricSet, required: true, unique: false }
      - { name: citationCorrectness, logicalType: Decimal, required: true, unique: false, min: 0, max: 1 }
      - { name: cpuLatencyMetrics, logicalType: MetricSet, required: true, unique: false }
      - { name: ingestionThroughput, logicalType: Decimal, required: true, unique: false, min: 0 }
      - { name: peakMemoryBytes, logicalType: NonNegativeInteger, required: true, unique: false }
      - { name: downloadBytes, logicalType: NonNegativeInteger, required: true, unique: false }
      - { name: setupReproducible, logicalType: Boolean, required: true, unique: false }
    entityConstraints:
      - The pair evaluationId and embeddingConfigurationId is unique.
      - A selected default references recorded evidence and a human decision.

  - name: AcceptedTermExport
    description: An immutable manifest of accepted supplier terms for an authorized downstream purpose.
    attributes:
      - { name: exportId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: purpose, logicalType: Enum, required: true, unique: false, allowedValues: [modelEvaluation, planningSnapshot, evidence] }
      - { name: effectiveAt, logicalType: Instant, required: true, unique: false }
      - { name: termVersionIds, logicalType: IdentifierSet, required: true, unique: false, references: AcceptedSupplierTerm.termId }
      - { name: contentDigest, logicalType: Sha256, required: true, unique: false }
      - { name: createdAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - Every exported term belongs to the same retailer and is authorized for the declared purpose.
      - The manifest is immutable and reproducible.

  - name: IdempotencyRecord
    description: The tenant-scoped request identity and original outcome for one command or job.
    attributes:
      - { name: idempotencyRecordId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: operationKind, logicalType: String, required: true, unique: false }
      - { name: idempotencyKey, logicalType: String, required: true, unique: false }
      - { name: requestHash, logicalType: Sha256, required: true, unique: false }
      - { name: resultReference, logicalType: OpaqueReference, required: false, unique: false }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [accepted, completed, failed] }
      - { name: createdAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - The tuple retailerId, operationKind, idempotencyKey is unique.
      - Key reuse with a different request hash conflicts.

  - name: IntegrationOutboxRecord
    description: An immutable event staged atomically with its owning source or term change.
    attributes:
      - { name: outboxRecordId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: aggregateType, logicalType: String, required: true, unique: false }
      - { name: aggregateId, logicalType: Identifier, required: true, unique: false }
      - { name: aggregateVersion, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: eventType, logicalType: String, required: true, unique: false }
      - { name: payloadDigest, logicalType: Sha256, required: true, unique: false }
      - { name: occurredAt, logicalType: Instant, required: true, unique: false }
      - { name: publishedAt, logicalType: Instant, required: false, unique: false }
    entityConstraints:
      - The business change, audit entry, and outbox record share one authoritative-store transaction.
      - Publication retry never changes event identity.

  - name: IntegrationInboxRecord
    description: The durable consumer receipt that prevents duplicate message effects.
    attributes:
      - { name: inboxRecordId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: messageId, logicalType: Identifier, required: true, unique: false }
      - { name: consumerName, logicalType: String, required: true, unique: false }
      - { name: payloadDigest, logicalType: Sha256, required: true, unique: false }
      - { name: outcome, logicalType: Enum, required: true, unique: false, allowedValues: [applied, ignoredReplay, rejected, deadLettered] }
      - { name: processedAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - The tuple consumerName and messageId is unique.
      - A repeated message with changed bytes conflicts rather than applying.

  - name: RecoveryParticipantState
    description: Durable C25 Class C command disposition and local checkpoint for supplier-knowledge.
    attributes:
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: runId, logicalType: Identifier, required: true, unique: false }
      - { name: recoveryGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: registrationId, logicalType: Identifier, required: true, unique: false }
      - { name: rosterDigest, logicalType: Sha256, required: true, unique: false }
      - { name: state, logicalType: Enum, required: true, unique: false, allowedValues: [unprepared, prepared, closed, aborted, resumed, unresolved] }
      - { name: terminalAbortGuard, logicalType: Boolean, required: true, unique: false, default: false }
      - { name: checkpointDigest, logicalType: Sha256, required: false, unique: false }
      - { name: businessDrainCursor, logicalType: Digest, required: false, unique: false }
      - { name: controlInboxCursor, logicalType: Digest, required: false, unique: false }
      - { name: controlOutboxCursor, logicalType: Digest, required: false, unique: false }
      - { name: lastCommandId, logicalType: Identifier, required: true, unique: false }
    entityConstraints:
      - The tuple retailerId, runId, recoveryGeneration is unique; later generations cannot be overwritten by stale commands.
      - An abort received before prepare persists a terminal guard so delayed prepare cannot reacquire a fence.
      - A closed disposition requires both durable store-local fences and drained worker/relay/consumer/acknowledgement permits, then separate MongoDB, PostgreSQL and messaging checkpoints for the same generation.
      - The checkpoint covers MongoDB source/tombstone state, PostgreSQL terms/guards and message receipts, immutable-object digests, and rebuildable vector projection status.
      - Business drain cursors exclude allowlisted C25 recovery-control command and acknowledgement messages. Control inbox/outbox cursors and stable message IDs are bound separately to the checkpoint and U15 manifest, so a close acknowledgement does not need to be included in its own business cut.

  - name: RecoveryControlReceipt
    description: PostgreSQL-owned durable C25 control inbox/outbox and exact response identity that remains operable while business writes are fenced.
    attributes:
      - { name: controlReceiptId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: runId, logicalType: Identifier, required: true, unique: false }
      - { name: recoveryGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: commandId, logicalType: Identifier, required: true, unique: false }
      - { name: commandMessageId, logicalType: Identifier, required: true, unique: false }
      - { name: acknowledgementMessageId, logicalType: Identifier, required: true, unique: true }
      - { name: payloadDigest, logicalType: Sha256, required: true, unique: false }
      - { name: checkpointBindingDigest, logicalType: Sha256, required: false, unique: false }
      - { name: state, logicalType: Enum, required: true, unique: false, allowedValues: [recorded, confirmed, acknowledged, failed] }
    entityConstraints:
      - Only authenticated C25 recovery commands and their corresponding acknowledgements use this allowlisted lane; no supplier business message, worker or outbox event can enter it.
      - The control inbox, recovery state and acknowledgement outbox commit through a generation-checked owned PostgreSQL routine even while the term business fence is active. A separate control relay publishes to the contracted C25 acknowledgement route with confirms and a stable message ID, then acknowledges the C25 command. It cannot clear either business fence merely by delivering a message.
      - Partial MongoDB or PostgreSQL fence uncertainty leaves the control result failed or unresolved; retries return the exact durable disposition and never claim a closed cut.

  - name: SupplierSourceRecoveryFence
    description: MongoDB authority for U5 source and processing writes during a C25 cut.
    attributes:
      - { name: retailerId, logicalType: Identifier, required: true, unique: true, references: Retailer.retailerId }
      - { name: runId, logicalType: Identifier, required: true, unique: false }
      - { name: recoveryGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: state, logicalType: Enum, required: true, unique: false, allowedValues: [active, fenced, closed, terminal, unresolved] }
      - { name: inFlightPermits, logicalType: NonNegativeInteger, required: true, unique: false }
      - { name: checkpointDigest, logicalType: Sha256, required: false, unique: false }
    entityConstraints:
      - Every MongoDB source, tombstone, extraction, worker and local inbox/outbox mutation writes or compares this fence document in its own transaction; concurrent prepare changes conflict rather than crossing the cut.
      - New permits stop at prepare; close waits for all prior permits, outbox confirms and broker acknowledgements to settle before recording its source checkpoint.

  - name: SupplierTermRecoveryFence
    description: PostgreSQL authority for U5 term, deletion-guard and route writes during a C25 cut.
    attributes:
      - { name: retailerId, logicalType: Identifier, required: true, unique: true, references: Retailer.retailerId }
      - { name: runId, logicalType: Identifier, required: true, unique: false }
      - { name: recoveryGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: state, logicalType: Enum, required: true, unique: false, allowedValues: [active, fenced, closed, terminal, unresolved] }
      - { name: inFlightPermits, logicalType: NonNegativeInteger, required: true, unique: false }
      - { name: checkpointDigest, logicalType: Sha256, required: false, unique: false }
    entityConstraints:
      - Every PostgreSQL term, dependency, deletion-guard, route and local inbox/outbox mutation locks this fence row through an owned routine in the same transaction as its effect.
      - New permits stop at prepare; close waits for all prior permits, outbox confirms and broker acknowledgements to settle before recording its term checkpoint.

  - name: SupplierSourceGeneration
    description: MongoDB retailer-scoped authority for source-version and supplier-comparison eligibility freshness.
    attributes:
      - { name: retailerId, logicalType: Identifier, required: true, unique: true, references: Retailer.retailerId }
      - { name: generation, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: updatedAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - Increment in the same MongoDB transaction as every upload, new version, supersession, deletion, processing transition that changes source/evidence availability, or supplier status/display-name change that changes comparison eligibility or ordering; exact replay does not increment again.

  - name: SupplierTermGeneration
    description: PostgreSQL retailer-scoped authority for accepted-term freshness.
    attributes:
      - { name: retailerId, logicalType: Identifier, required: true, unique: true, references: Retailer.retailerId }
      - { name: generation, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: updatedAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - Increment through an owned PostgreSQL routine in the same transaction as every term acceptance, supersession, revocation or eligibility-affecting transition; exact replay does not increment again.

  - name: SupplierResultCacheEntry
    description: Disposable Redis projection for an authorized retrieval or comparison result.
    attributes:
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: queryDigest, logicalType: Sha256, required: true, unique: false }
      - { name: placementGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: contractVersion, logicalType: String, required: true, unique: false }
      - { name: sourceGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: activeIndexGeneration, logicalType: PositiveInteger, required: false, unique: false, min: 1 }
      - { name: acceptedTermGeneration, logicalType: PositiveInteger, required: false, unique: false, min: 1 }
      - { name: expiresAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - TTL is five minutes; cached data never grants authorization or supersedes current source, term, tombstone or route authority.
      - The source and term generations are authoritative retailer-scoped records in MongoDB and PostgreSQL; activeIndexGeneration is the server-owned route generation. Read the current applicable vector before every hit and again before fill.
      - A generation mismatch, stale fill, missing authority, missing Redis service or invalidation forces an authoritative read or explicit unavailable result; never serve an unverified cached value.

  - name: BusinessAuditEntry
    description: Immutable actor, tenant, target, outcome, and provenance evidence for a Supplier Knowledge action.
    attributes:
      - { name: auditEntryId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false, references: Retailer.retailerId }
      - { name: actorId, logicalType: ExternalIdentifier, required: false, unique: false }
      - { name: action, logicalType: String, required: true, unique: false }
      - { name: targetType, logicalType: String, required: true, unique: false }
      - { name: targetId, logicalType: Identifier, required: false, unique: false }
      - { name: outcome, logicalType: Enum, required: true, unique: false, allowedValues: [succeeded, rejected, failed] }
      - { name: provenanceDigest, logicalType: Sha256, required: false, unique: false }
      - { name: correlationId, logicalType: Identifier, required: true, unique: false }
      - { name: occurredAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - Successful business mutations append audit and outbox evidence atomically.
      - Rejected attempts use a durable path that survives business rollback.
      - Runtime actors cannot alter or delete audit history.

relationships:
  - { from: Retailer, to: Supplier, cardinality: "1:N", direction: "Retailer owns Suppliers" }
  - { from: Supplier, to: SupplierSubmission, cardinality: "1:N", direction: "Supplier receives Submissions" }
  - { from: SupplierSubmission, to: SourceObject, cardinality: "1:1", direction: "Submission references immutable original bytes" }
  - { from: SupplierSubmission, to: ProcessingAttempt, cardinality: "1:N", direction: "Submission has processing attempts" }
  - { from: ProcessingAttempt, to: ExtractionRecord, cardinality: "1:0..1", direction: "Attempt produces extraction" }
  - { from: ExtractionRecord, to: PageExtraction, cardinality: "1:N", direction: "Extraction describes pages" }
  - { from: ProcessingAttempt, to: ValidationResult, cardinality: "1:0..1", direction: "Attempt produces validation" }
  - { from: ValidationResult, to: ValidationDiagnostic, cardinality: "1:N", direction: "Validation explains findings" }
  - { from: SupplierSubmission, to: SupplierOfferCandidate, cardinality: "1:N", direction: "Submission yields non-authoritative candidates" }
  - { from: SupplierOfferCandidate, to: AcceptedSupplierTerm, cardinality: "1:0..N", direction: "Manager acceptance creates immutable term versions" }
  - { from: AcceptedSupplierTerm, to: TermTransition, cardinality: "1:N", direction: "Transitions preserve term history" }
  - { from: SupplierSubmission, to: SourceTombstone, cardinality: "1:0..1", direction: "Deletion creates durable exclusion" }
  - { from: SupplierSubmission, to: SourceDeletionGuard, cardinality: "1:1", direction: "PostgreSQL serializes term acceptance and deletion reservation" }
  - { from: Retailer, to: SupplierSourceRecoveryFence, cardinality: "1:1", direction: "MongoDB source mutations share the generation fence" }
  - { from: Retailer, to: SupplierTermRecoveryFence, cardinality: "1:1", direction: "PostgreSQL term mutations share the generation fence" }
  - { from: RecoveryParticipantState, to: RecoveryControlReceipt, cardinality: "1:N", direction: "C25 control results publish separately from business-drained messages" }
  - { from: Retailer, to: SupplierSourceGeneration, cardinality: "1:1", direction: "MongoDB source changes advance cache authority" }
  - { from: Retailer, to: SupplierTermGeneration, cardinality: "1:1", direction: "PostgreSQL term changes advance cache authority" }
  - { from: ExtractionRecord, to: DocumentChunk, cardinality: "1:N", direction: "Extraction is deterministically chunked" }
  - { from: EmbeddingConfiguration, to: RetrievalIndexGeneration, cardinality: "1:N", direction: "Configuration defines compatible generations" }
  - { from: RetrievalIndexGeneration, to: IndexBuildJob, cardinality: "1:N", direction: "Jobs build and govern a generation" }
  - { from: ActiveIndexRoute, to: RetrievalIndexGeneration, cardinality: "N:1", direction: "Server route selects validated generation" }
  - { from: DocumentChunk, to: RetrievalCitation, cardinality: "1:N", direction: "Authorized retrieval returns exact citations" }
  - { from: EmbeddingEvaluation, to: EmbeddingCandidateResult, cardinality: "1:N", direction: "Evaluation records candidate evidence" }
  - { from: AcceptedTermExport, to: AcceptedSupplierTerm, cardinality: "N:N", direction: "Manifest fixes exported term versions" }
  - { from: SupplierSubmission, to: BusinessAuditEntry, cardinality: "1:N", direction: "Source actions emit immutable evidence" }
  - { from: AcceptedSupplierTerm, to: BusinessAuditEntry, cardinality: "1:N", direction: "Term actions emit immutable evidence" }
```

## Human-readable summary

Supplier files, source processing, and extraction evidence form one immutable provenance chain. Original bytes are addressed by opaque object references; document records retain the checksums and configuration needed to prove and reproduce every extraction. Valid candidates remain distinct from accepted commercial terms.

Accepted terms are effective-dated, retailer-wide records. Manager actions create term transitions rather than updating history. A PostgreSQL deletion guard closes the race with source deletion before MongoDB tombstoning. Retrieval generations isolate each retailer and embedding configuration; validated generations remain inactive until an atomic server-owned route switch. Tombstones track independent object and index cleanup branches so partial progress remains retryable during rebuild.

Idempotency, inbox/outbox records, and audit entries are modeled explicitly because correctness spans several stores without a distributed transaction. Each authoritative store commits only its own state and evidence; repeatable projection workflows reconcile the rest. Store-local recovery fences prevent a write or message effect from crossing a class-C cut, while retailer-scoped source and term generations keep Redis entries bound to current authority.

## Sources

- inception/units-generation/unit-of-work.md
- inception/units-generation/unit-of-work-story-map.md
- inception/requirements-analysis/requirements.md
- inception/domain-design/components.md
- inception/contract-design/contract-summary.md
- construction/supplier-knowledge/functional-design/functional-design-questions.md

## Assumptions & Open Questions

- Exact parser, object-store implementation, language detector, and model runtime versions are implementation decisions that must be pinned and verified later.
- Index-generation retention duration and source-byte retention duration are NFR decisions.
- The default embedding configuration remains intentionally unresolved until the approved comparison is complete.
