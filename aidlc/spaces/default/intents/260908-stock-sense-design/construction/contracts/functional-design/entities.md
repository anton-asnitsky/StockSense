# Contracts Functional Entity Model

Unit: U1 Contracts (`contracts`)

Sources: `inception/units-generation/unit-of-work.md`, `inception/units-generation/unit-of-work-story-map.md`, `inception/requirements-analysis/requirements.md`, `inception/domain-design/components.md`, `inception/contract-design/contract-summary.md`, and the confirmed `functional-design-questions.md`.

The YAML block is the source of truth for the Contracts unit entity model. These are specification and evidence records; they do not grant runtime authority or define shared application persistence.

```yaml
schemaVersion: "1.0.0"
unit: contracts
entities:
  - name: ContractPackage
    description: A versioned, reviewable candidate or release containing canonical contract documents, shared schemas, and governed package-local sidecars.
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
      - name: releasedManifestDigest
        logicalType: Digest
        required: false
        unique: false
        constraints: Detached publication-registry field, not serialized inside the manifest it hashes; set after final manifest bytes and governed result sidecars are fixed, then verified against a detached passing validation receipt.
      - name: boundaryCoverage
        logicalType: BoundaryInventory
        required: true
        unique: false
        constraints: Candidate rows name each delivered C01-C27 boundary; release rows cover every C01-C27 boundary and pass the fixed required-kind policy.
      - name: governedArtifacts
        logicalType: Set<GovernedArtifactReference>
        required: true
        unique: false
        constraints: Each package-local sidecar identifies its kind, owner, boundary IDs, semantic version, safe relative path, SHA-256 content digest, and the package source revision; generated code itself remains consumer-local.
      - name: createdAt
        logicalType: Instant
        required: true
        unique: false
    entityConstraints:
      - A released package is immutable; corrections produce another package version.
      - A package may be released only after its required validation run passes for the exact releasedManifestDigest; a changed manifest requires a new validation receipt.
      - Candidate coverage follows the fixed C01 policy for declared boundaries; release coverage contains exactly C01-C27 with every required canonical kind and governed sidecar.
      - Every declared artifact digest is recomputed from exact bytes and canonical inputs are reconstructed from sourceRevision; missing, duplicate, extra, symlinked, or source-mismatched entries prohibit release.

  - name: ContractDocument
    description: A provider-owned OpenAPI or producer-owned AsyncAPI description governed by the canonical package.
    attributes:
      - name: documentId
        logicalType: Identifier
        required: true
        unique: false
        constraints: Stable lowercase SHA-256 logicalId derived from the manifest kind, owner and normalized path; unique together with documentRevisionId.
      - name: documentRevisionId
        logicalType: Identifier
        required: true
        unique: true
        constraints: Identifies one immutable revision of this documentId, including its semantic version and content digest; it is distinct from the shared Git sourceRevision.
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
        unique: false
        constraints: Unique within one package revision and resolved inside that package; later revisions may use the same logical path.
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
      - One documentId may have multiple immutable documentRevisionId values, but only one revision of that logical document may occupy a given package version.
      - C01/C15 tenant and retailerless global identity-audit documents and examples use separate closed schemas and routes.
      - C22 protocol compatibility is governed by U1 while U14 owns its .NET and Python package releases and conformance results.
      - C24-C27 remain separate recovery documents owned by their bootstrap providers, U15 coordinator, and recovery event producer; U1 does not acquire participant state.

  - name: SharedSchema
    description: A reusable canonical payload or typed-port definition referenced by contract documents and examples.
    attributes:
      - name: schemaId
        logicalType: URI
        required: true
        unique: false
        constraints: Stable URI urn:stocksense:schema:<logicalId>, where logicalId is the lowercase SHA-256 value derived from the manifest kind, owner and normalized path; unique together with schemaRevisionId.
      - name: schemaRevisionId
        logicalType: Identifier
        required: true
        unique: true
        constraints: Identifies one immutable revision of this schemaId and exact content digest; it is distinct from the shared Git sourceRevision.
      - name: ownerUnit
        logicalType: UnitIdentifier
        required: true
        unique: false
        constraints: The owning unit retains schema semantics; U1 governs package validation.
      - name: schemaVersion
        logicalType: SemanticVersion
        required: true
        unique: false
      - name: dialect
        logicalType: URI
        required: true
        unique: false
        allowedValues: ["https://json-schema.org/draft/2020-12/schema", "urn:stocksense:dialect:typed-port:1"]
        constraints: The typed-port dialect covers the canonical entries whose approved form is a typed port signature rather than a JSON Schema document, namely C07 model_lifecycle.finalize_heavy_work_v1 and the C08 RetailOperationsInventoryPort. C01 lists both under its schema kind.
      - name: canonicalPath
        logicalType: WorkspaceRelativePath
        required: true
        unique: false
        constraints: Unique within one package revision; old and new package revisions may retain the same logical path.
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
      - A schemaId may retain multiple immutable schemaRevisionId values; a package resolves each reference to exactly one revision.
      - Breaking schema meaning requires a new major schema version or message identity.

  - name: PackageInclusion
    description: A package-local binding of one canonical manifest entry to one reusable immutable document or schema revision.
    attributes:
      - name: packageId
        logicalType: Identifier
        required: true
        unique: false
        references: ContractPackage.packageId
      - name: artifactKind
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [openapi, asyncapi, json-schema, typed-port]
      - name: logicalId
        logicalType: Identifier
        required: true
        unique: false
        constraints: Derived from the canonical artifact kind, semantic owner and normalized safe package path.
      - name: revisionId
        logicalType: Identifier
        required: true
        unique: false
        constraints: Derived from logicalId, semantic version and verified content digest; resolves to exactly one ContractDocument or SharedSchema revision.
      - name: canonicalPath
        logicalType: WorkspaceRelativePath
        required: true
        unique: false
      - name: boundaryIds
        logicalType: Set<BoundaryIdentifier>
        required: true
        unique: false
      - name: manifestEntryDigest
        logicalType: Digest
        required: true
        unique: false
        constraints: SHA-256 of the manifest entry's RFC 8785 canonical JSON bytes; derived IDs are not added to or hashed inside the approved C01 entry.
    entityConstraints:
      - The tuple of packageId and logicalId is unique; one package cannot bind two revisions of one logical contract.
      - Exactly one of ContractDocument or SharedSchema resolves for an inclusion according to artifactKind; openapi and asyncapi resolve a ContractDocument while json-schema and typed-port resolve a SharedSchema. documentId equals logicalId and schemaId equals urn:stocksense:schema:<logicalId>.
      - A revision may be included by multiple package versions without changing its immutable revision record.
      - A package load recomputes every derived ID from the manifest entry and rejects missing, ambiguous or changed mappings before resolving fixtures or generation profiles.

  - name: ExampleFixture
    description: A checked-in valid or invalid payload used to demonstrate and test a contract outcome.
    attributes:
      - name: fixtureId
        logicalType: Identifier
        required: true
        unique: true
      - name: documentRevisionId
        logicalType: Identifier
        required: false
        unique: false
        references: ContractDocument.documentRevisionId
        constraints: Required for an element of an OpenAPI or AsyncAPI document. A typed-port fixture omits it and binds schemaRevisionId to that exact immutable port revision instead; exactly one of the two resolves for any fixture.
      - name: schemaRevisionId
        logicalType: Identifier
        required: false
        unique: false
        references: SharedSchema.schemaRevisionId
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
      - name: documentRevisionId
        logicalType: Identifier
        required: true
        unique: false
        references: ContractDocument.documentRevisionId
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
      - name: documentRevisionId
        logicalType: Identifier
        required: true
        unique: false
        references: ContractDocument.documentRevisionId
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
      - name: manifestDigest
        logicalType: Digest
        required: true
        unique: false
        constraints: Exact SHA-256 digest of the finalized manifest validated by this run; retained in a detached immutable receipt to avoid self-reference through governed result sidecars.
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
      - A passing release run is bound to one exact manifestDigest and sourceRevision; publication recomputes and compares both before assigning released status.
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
      - name: ruleIds
        logicalType: IdentifierSet
        required: true
        unique: false
        minItems: 1
        constraints: Every ID resolves to one versioned U1 rules-catalogue entry in the validated source revision.
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
        allowedValues: [passed, failed, limited, rejected, unavailable, not-run]
      - name: reason
        logicalType: String
        required: true
        unique: false
        constraints: Nonempty explanation of the recorded outcome.
      - name: expectedResult
        logicalType: JsonValue
        required: true
        unique: false
      - name: actualResult
        logicalType: JsonValue
        required: true
        unique: false
      - name: traceIds
        logicalType: IdentifierSet
        required: true
        unique: false
        minItems: 1
      - name: environmentReference
        logicalType: WorkspaceRelativePathOrImmutableURI
        required: true
        unique: false
      - name: commandProfileVersion
        logicalType: SemanticVersion
        required: true
        unique: false
      - name: command
        logicalType: String
        required: true
        unique: false
      - name: startedAt
        logicalType: Instant
        required: true
        unique: false
      - name: completedAt
        logicalType: Instant
        required: true
        unique: false
      - name: durationMs
        logicalType: NonnegativeInteger
        required: true
        unique: false
      - name: artifactDigests
        logicalType: DigestSet
        required: true
        unique: false
      - name: limitations
        logicalType: StringList
        required: true
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
      - Every outcome, including rejected and unavailable, retains a nonempty reason, expected and actual results, trace IDs, environment, timing, command profile, artifact checksums, and limitations; unavailable and not-run never imply a passing check.
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
      - US9.11 recovery coverage names C24-C27 separately and retains runtime evidence for registration, fencing, checkpoint closure, abort/resume, Operator confirmation, and terminal outcomes.

relationships:
  - from: ContractPackage
    to: PackageInclusion
    cardinality: one-to-many
    direction: package-declares-inclusions
  - from: PackageInclusion
    to: ContractDocument
    cardinality: many-to-one
    direction: inclusion-binds-document-revision
  - from: PackageInclusion
    to: SharedSchema
    cardinality: many-to-one
    direction: inclusion-binds-schema-revision
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

## Revision and release identity

`documentId` and `schemaId` name logical contracts; `documentRevisionId` and `schemaRevisionId` identify immutable versions. The C01 manifest already carries kind, owner, canonical path, semantic version and content digest. U1 derives `logicalId = SHA-256("logical\0" || kind || "\0" || owner || "\0" || normalizedPath)` and `revisionId = SHA-256("revision\0" || logicalId || "\0" || semanticVersion || "\0" || contentDigest)`, using UTF-8 bytes, lowercase canonical kind, exact registered owner, slash-normalized case-sensitive safe path, and lowercase `sha256:` hex. `ContractDocument.documentId` equals `logicalId`; `SharedSchema.schemaId` equals `urn:stocksense:schema:<logicalId>`. A JSON Schema `$id` inside the canonical document is independently validated as a reference URI and is not rewritten by U1. `PackageInclusion.manifestEntryDigest` is SHA-256 of the manifest entry's RFC 8785 canonical JSON bytes; no derived ID is added to the approved C01 entry. U1 validates this mapping against each manifest entry at package load; path changes create a new logical identity. `PackageInclusion` binds the package to that revision and carries package-specific coverage, so an unchanged revision can appear in another package version without mutation. Fixtures, generation profiles and compatibility assessments bind to revision IDs, and a package resolves each logical ID to exactly one revision.

`ValidationRun.manifestDigest` binds a passing result to the finalized manifest bytes. The run receipt is detached from the governed manifest sidecars so the manifest does not hash a file that contains its own digest. Publication verifies the manifest digest and source revision again; any changed byte requires a new run.

## Entity summary

| Entity | Purpose | Authority boundary |
| --- | --- | --- |
| ContractPackage | Groups a release candidate and binds its exact manifest digest to a source revision | Cannot grant runtime access or own provider semantics |
| PackageInclusion | Binds one manifest entry and package-specific boundary coverage to a reusable immutable revision | Rejects ambiguous or changed manifest-to-revision identity |
| ContractDocument | Represents an immutable revision of one provider OpenAPI or producer AsyncAPI logical description | Provider/producer owns meaning; U1 owns governance |
| SharedSchema | Defines immutable revisions of reusable message and payload shapes | Published revisions remain addressable |
| ExampleFixture | Proves valid, invalid, and compatibility outcomes | Declares expected validation only; it is not runtime evidence by itself |
| GenerationProfile | Makes consumer-local generation reproducible | Cannot create a shared runtime release dependency |
| GeneratedArtifactManifest | Records generator provenance and drift | Canonical documents remain authoritative |
| CompatibilityAssessment | Compares candidate and integration baseline | A major break needs explicit approval |
| ValidationRun / ValidationFinding | Records deterministic checks, exact manifest binding, and actionable failures | Failed required checks cannot be relabeled as passing |
| EvidenceRecord | Connects ACs and boundaries to contract, model/data, resource, recovery, and limitation evidence | Cannot fabricate a run, release, or observed outcome |
| CoverageEntry | Tracks evidence completeness for each delivered boundary or sensitive flow | Foundation fixtures cannot satisfy unrelated entries |
