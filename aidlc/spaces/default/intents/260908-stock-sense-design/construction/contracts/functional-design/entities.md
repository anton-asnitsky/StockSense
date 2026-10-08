# Contracts Functional Entity Model

Unit: U1 Contracts (`contracts`)

Sources: `inception/units-generation/unit-of-work.md`, `inception/units-generation/unit-of-work-story-map.md`, `inception/requirements-analysis/requirements.md`, `inception/domain-design/components.md`, `inception/contract-design/contract-summary.md`, and the confirmed `functional-design-questions.md`.

The YAML block is the source of truth for the Contracts unit entity model. These are specification and evidence records; they do not grant runtime authority or define shared application persistence.

```yaml
schemaVersion: "1.0.0"
unit: contracts
entities:
  - name: ContractPackage
    description: A versioned, reviewable release candidate containing canonical contract documents, shared schemas, examples, and generation inputs.
    attributes:
      - name: packageId
        logicalType: Identifier
        required: true
        unique: true
        constraints: Stable across metadata corrections; never reused for another package.
      - name: packageVersion
        logicalType: SemanticVersion
        required: true
        unique: true
        constraints: Major version changes when an approved breaking contract is released.
      - name: lifecycleStatus
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [draft, validated, released, superseded]
        default: draft
      - name: sourceRevision
        logicalType: RevisionIdentifier
        required: true
        unique: false
        constraints: Identifies the immutable source revision evaluated by validation.
      - name: createdAt
        logicalType: Instant
        required: true
        unique: false
    entityConstraints:
      - A released package is immutable; corrections produce another package version.
      - A package may be released only after its required validation run passes.

  - name: ContractDocument
    description: A provider-owned OpenAPI or producer-owned AsyncAPI description governed by the canonical package.
    attributes:
      - name: documentId
        logicalType: Identifier
        required: true
        unique: true
      - name: packageId
        logicalType: Identifier
        required: true
        unique: false
        references: ContractPackage.packageId
      - name: ownerUnit
        logicalType: UnitIdentifier
        required: true
        unique: false
        constraints: The provider or producer owns contract semantics.
      - name: documentKind
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [openapi, asyncapi]
      - name: specificationVersion
        logicalType: Version
        required: true
        unique: false
        allowedValues: ["3.1.2", "3.0.0"]
        constraints: OpenAPI uses 3.1.2; AsyncAPI uses 3.0.0.
      - name: semanticVersion
        logicalType: SemanticVersion
        required: true
        unique: false
      - name: canonicalPath
        logicalType: WorkspaceRelativePath
        required: true
        unique: true
        constraints: Must resolve inside the canonical contract package.
      - name: contentDigest
        logicalType: Digest
        required: true
        unique: false
      - name: lifecycleStatus
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [draft, validated, published, deprecated, retired]
        default: draft
    entityConstraints:
      - One provider service owns each OpenAPI document and one producer owns each AsyncAPI document.
      - U1 governs packaging, validation, compatibility, and publication without taking semantic ownership.

  - name: SharedSchema
    description: A reusable JSON Schema definition referenced by contract documents and examples.
    attributes:
      - name: schemaId
        logicalType: URI
        required: true
        unique: true
      - name: packageId
        logicalType: Identifier
        required: true
        unique: false
        references: ContractPackage.packageId
      - name: schemaVersion
        logicalType: SemanticVersion
        required: true
        unique: false
      - name: dialect
        logicalType: URI
        required: true
        unique: false
        allowedValues: ["https://json-schema.org/draft/2020-12/schema"]
      - name: canonicalPath
        logicalType: WorkspaceRelativePath
        required: true
        unique: true
      - name: contentDigest
        logicalType: Digest
        required: true
        unique: false
      - name: lifecycleStatus
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [draft, validated, published, superseded]
        default: draft
    entityConstraints:
      - A published schema revision is immutable.
      - Breaking schema meaning requires a new major schema version or message identity.

  - name: ExampleFixture
    description: A checked-in valid or invalid payload used to demonstrate and test a contract outcome.
    attributes:
      - name: fixtureId
        logicalType: Identifier
        required: true
        unique: true
      - name: documentId
        logicalType: Identifier
        required: true
        unique: false
        references: ContractDocument.documentId
      - name: schemaId
        logicalType: URI
        required: false
        unique: false
        references: SharedSchema.schemaId
      - name: contractElementId
        logicalType: String
        required: true
        unique: false
        constraints: Names an operation, message, or schema element in the owning document.
      - name: scenarioType
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [valid, invalid, compatibility]
      - name: expectedOutcome
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [pass, fail]
      - name: canonicalPath
        logicalType: WorkspaceRelativePath
        required: true
        unique: true
      - name: contentDigest
        logicalType: Digest
        required: true
        unique: false
    entityConstraints:
      - Every fixture declares its expected outcome and the contract element it exercises.
      - Valid examples must pass; invalid and breaking fixtures must fail for their declared reason.

  - name: GenerationProfile
    description: A reproducible instruction set for deriving consumer-local types or clients from one canonical document.
    attributes:
      - name: profileId
        logicalType: Identifier
        required: true
        unique: true
      - name: documentId
        logicalType: Identifier
        required: true
        unique: false
        references: ContractDocument.documentId
      - name: consumerUnit
        logicalType: UnitIdentifier
        required: true
        unique: false
      - name: targetLanguage
        logicalType: String
        required: true
        unique: false
      - name: generatorName
        logicalType: String
        required: true
        unique: false
      - name: generatorVersion
        logicalType: ExactVersion
        required: true
        unique: false
        constraints: Floating version selectors are prohibited.
      - name: configurationDigest
        logicalType: Digest
        required: true
        unique: false
      - name: outputPath
        logicalType: WorkspaceRelativePath
        required: true
        unique: false
        constraints: Must be inside the consumer that compiles the generated output.
    entityConstraints:
      - Profiles may produce consumer-local outputs but cannot create a mandatory shared runtime library.

  - name: GeneratedArtifactManifest
    description: Provenance and drift status for an output produced from a generation profile.
    attributes:
      - name: manifestId
        logicalType: Identifier
        required: true
        unique: true
      - name: profileId
        logicalType: Identifier
        required: true
        unique: false
        references: GenerationProfile.profileId
      - name: sourceDigest
        logicalType: Digest
        required: true
        unique: false
      - name: generatorVersion
        logicalType: ExactVersion
        required: true
        unique: false
      - name: outputDigest
        logicalType: Digest
        required: false
        unique: false
      - name: driftStatus
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [current, stale, missing]
      - name: generatedAt
        logicalType: Instant
        required: false
        unique: false
    entityConstraints:
      - Generated outputs are never authoritative over canonical specifications.
      - A stale or missing required output fails the applicable validation run.

  - name: CompatibilityAssessment
    description: The result of comparing a candidate contract with the baseline selected by its integration level.
    attributes:
      - name: assessmentId
        logicalType: Identifier
        required: true
        unique: true
      - name: documentId
        logicalType: Identifier
        required: true
        unique: false
        references: ContractDocument.documentId
      - name: integrationLevel
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [story, bolt, release]
      - name: baselineReference
        logicalType: RevisionReference
        required: true
        unique: false
      - name: candidateReference
        logicalType: RevisionReference
        required: true
        unique: false
      - name: result
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [compatible, breaking-unapproved, breaking-approved-major]
      - name: approvalReference
        logicalType: ApprovalReference
        required: false
        unique: false
        constraints: Required only for an approved major-version break.
      - name: assessedAt
        logicalType: Instant
        required: true
        unique: false
    entityConstraints:
      - Story changes compare with the Bolt branch, Bolt changes with main, and releases with the latest release tag.
      - A breaking result cannot pass without a new major version and explicit approval.

  - name: ValidationRun
    description: An immutable execution record for contract syntax, examples, generation drift, policy, and compatibility checks.
    attributes:
      - name: validationRunId
        logicalType: Identifier
        required: true
        unique: true
      - name: packageId
        logicalType: Identifier
        required: true
        unique: false
        references: ContractPackage.packageId
      - name: sourceRevision
        logicalType: RevisionIdentifier
        required: true
        unique: false
      - name: triggerContext
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [local, pull-request, bolt, release]
      - name: lifecycleStatus
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [queued, running, passed, failed, superseded]
        default: queued
      - name: startedAt
        logicalType: Instant
        required: false
        unique: false
      - name: completedAt
        logicalType: Instant
        required: false
        unique: false
    entityConstraints:
      - Passed means every check required for the trigger context passed.
      - Failed findings remain visible and cannot be rewritten as a pass.

  - name: ValidationFinding
    description: A stable, actionable result emitted by one check in a validation run.
    attributes:
      - name: findingId
        logicalType: Identifier
        required: true
        unique: true
      - name: validationRunId
        logicalType: Identifier
        required: true
        unique: false
        references: ValidationRun.validationRunId
      - name: category
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [syntax, example, policy, generation-drift, compatibility, coverage]
      - name: severity
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [information, warning, error]
      - name: artifactPath
        logicalType: WorkspaceRelativePath
        required: true
        unique: false
      - name: location
        logicalType: String
        required: false
        unique: false
      - name: ruleId
        logicalType: RuleIdentifier
        required: true
        unique: false
      - name: message
        logicalType: String
        required: true
        unique: false
    entityConstraints:
      - Every error finding makes its required validation run fail.

  - name: EvidenceRecord
    description: A revision-bound trace from acceptance criteria and boundaries to actual contract validation outcomes.
    attributes:
      - name: evidenceId
        logicalType: Identifier
        required: true
        unique: true
      - name: validationRunId
        logicalType: Identifier
        required: true
        unique: false
        references: ValidationRun.validationRunId
      - name: acceptanceCriterionIds
        logicalType: IdentifierSet
        required: true
        unique: false
        minItems: 1
      - name: boundaryIds
        logicalType: IdentifierSet
        required: true
        unique: false
        minItems: 1
      - name: sourceRevision
        logicalType: RevisionIdentifier
        required: true
        unique: false
      - name: evidenceCategory
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [contract-result, model-data-card, rejected-candidate, resource-finding, recovery-finding, synthetic-limitation]
      - name: artifactReference
        logicalType: WorkspaceRelativePathOrImmutableURI
        required: true
        unique: false
      - name: outcome
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [passed, failed, limited, not-run]
      - name: limitations
        logicalType: StringList
        required: false
        unique: false
      - name: releaseReference
        logicalType: ReleaseReference
        required: false
        unique: false
      - name: ownerApprovalReference
        logicalType: ApprovalReference
        required: false
        unique: false
      - name: lifecycleStatus
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [incomplete, complete, owner-approved, published]
        default: incomplete
    entityConstraints:
      - Evidence cannot claim a successful run or release without its immutable source and outcome.
      - Foundation fixtures cannot stand in for missing boundary-specific evidence.
      - Owner-approved and published states require explicit approval plus immutable release identity.

  - name: CoverageEntry
    description: The release-coverage obligation and evidence status for one delivered boundary or sensitive business flow.
    attributes:
      - name: coverageEntryId
        logicalType: Identifier
        required: true
        unique: true
      - name: packageId
        logicalType: Identifier
        required: true
        unique: false
        references: ContractPackage.packageId
      - name: boundaryOrFlowId
        logicalType: Identifier
        required: true
        unique: false
      - name: requiredEvidenceKinds
        logicalType: EnumSet
        required: true
        unique: false
        minItems: 1
        allowedValues: [contract, authorization, audit, retry, runtime]
      - name: lifecycleStatus
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [required, contract-present, contract-validated, runtime-evidence-verified, accepted]
        default: required
      - name: limitation
        logicalType: String
        required: false
        unique: false
    entityConstraints:
      - Accepted requires every applicable evidence kind for this specific boundary or flow.
      - A representative or foundation fixture cannot advance an unrelated entry.

relationships:
  - from: ContractPackage
    to: ContractDocument
    cardinality: one-to-many
    direction: package-contains-documents
  - from: ContractPackage
    to: SharedSchema
    cardinality: one-to-many
    direction: package-contains-schemas
  - from: ContractDocument
    to: SharedSchema
    cardinality: many-to-many
    direction: document-references-schemas
  - from: ContractDocument
    to: ExampleFixture
    cardinality: one-to-many
    direction: document-is-exercised-by-fixtures
  - from: SharedSchema
    to: ExampleFixture
    cardinality: one-to-many
    direction: schema-validates-fixtures
  - from: ContractDocument
    to: GenerationProfile
    cardinality: one-to-many
    direction: document-drives-generation
  - from: GenerationProfile
    to: GeneratedArtifactManifest
    cardinality: one-to-many
    direction: profile-produces-manifests
  - from: ContractDocument
    to: CompatibilityAssessment
    cardinality: one-to-many
    direction: document-has-assessments
  - from: ContractPackage
    to: ValidationRun
    cardinality: one-to-many
    direction: package-is-evaluated-by-runs
  - from: ValidationRun
    to: ValidationFinding
    cardinality: one-to-many
    direction: run-emits-findings
  - from: ValidationRun
    to: EvidenceRecord
    cardinality: one-to-many
    direction: run-supports-evidence
  - from: ContractPackage
    to: CoverageEntry
    cardinality: one-to-many
    direction: package-declares-coverage
  - from: CoverageEntry
    to: EvidenceRecord
    cardinality: many-to-many
    direction: coverage-is-supported-by-evidence
```

## Entity summary

| Entity | Purpose | Authority boundary |
| --- | --- | --- |
| ContractPackage | Groups a release candidate and binds it to a source revision | Cannot grant runtime access or own provider semantics |
| ContractDocument | Represents one provider OpenAPI or producer AsyncAPI description | Provider/producer owns meaning; U1 owns governance |
| SharedSchema | Defines reusable message and payload shapes | Published revisions are immutable |
| ExampleFixture | Proves valid, invalid, and compatibility outcomes | Declares expected validation only; it is not runtime evidence by itself |
| GenerationProfile | Makes consumer-local generation reproducible | Cannot create a shared runtime release dependency |
| GeneratedArtifactManifest | Records generator provenance and drift | Canonical documents remain authoritative |
| CompatibilityAssessment | Compares candidate and integration baseline | A major break needs explicit approval |
| ValidationRun / ValidationFinding | Records deterministic checks and actionable failures | Failed required checks cannot be relabeled as passing |
| EvidenceRecord | Connects ACs and boundaries to contract, model/data, resource, recovery, and limitation evidence | Cannot fabricate a run, release, or observed outcome |
| CoverageEntry | Tracks evidence completeness for each delivered boundary or sensitive flow | Foundation fixtures cannot satisfy unrelated entries |
