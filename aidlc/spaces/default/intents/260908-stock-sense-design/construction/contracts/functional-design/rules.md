# Contracts Business Rules

Unit: U1 Contracts (`contracts`)

Sources: U1 ownership and constraints; US8.2, US8.5, US8.7, and US10.2; NFR3, NFR5, NFR7, NFR8, NFR13, NFR15, and FR12; C01 and C15 from Contract Design; and the confirmed Functional Design decisions.

The YAML block is the source of truth for U1 rules. Rules that mention runtime delivery describe what contracts and evidence must declare and validate. Runtime units remain responsible for implementing authorization, persistence, publication, consumption, and side effects.

```yaml
schemaVersion: "1.0.0"
unit: contracts
rules:
  - id: BR1.1
    statement: Every candidate package contains all canonical documents, referenced schemas, fixtures, and generation profiles declared by its manifest.
    category: constraint
    appliesTo: [ContractPackage]
    trigger: A package is submitted for validation.
    logic: "IF a declared artifact is absent, duplicated, unreadable, or outside the package boundary THEN the package is incomplete."
    violationBehaviour: "Fail package validation with an artifact-specific finding."
    source: [NFR8]

  - id: BR1.2
    statement: Providers and producers own contract semantics while U1 owns packaging, validation, compatibility, and publication governance.
    category: policy
    appliesTo: [ContractDocument, ContractPackage]
    trigger: A contract is created, changed, or published.
    logic: "IF U1 packages a provider or producer contract THEN ownership metadata must retain that unit as semantic owner."
    violationBehaviour: "Reject documents with missing or conflicting ownership; do not transfer runtime authority to U1."
    source: [NFR8]

  - id: BR1.3
    statement: Canonical descriptions and schemas use the approved specification baselines and exact semantic versions.
    category: validation
    appliesTo: [ContractDocument, SharedSchema]
    trigger: A document or schema enters validation.
    logic: "IF the artifact kind is OpenAPI THEN its specification version is 3.1.2; IF AsyncAPI THEN 3.0.0; IF shared JSON Schema THEN its dialect is 2020-12."
    violationBehaviour: "Fail validation and identify the unsupported baseline."
    source: [NFR8]

  - id: BR1.4
    statement: Released package, document, schema, validation, and evidence identities remain immutable and revision-bound.
    category: constraint
    appliesTo: [ContractPackage, ContractDocument, SharedSchema, ValidationRun, EvidenceRecord]
    trigger: A released or completed record would be changed.
    logic: "IF released content or completed evidence changes THEN create a new version or run rather than rewriting the prior record."
    violationBehaviour: "Reject in-place mutation and retain the prior record."
    source: [NFR15]

  - id: BR2.1
    statement: The initial inventory-import OpenAPI boundary specifies payloads, authentication expectations, tenant context, successful responses, and stable error responses.
    category: validation
    appliesTo: [ContractDocument, ExampleFixture]
    trigger: The initial inventory-import REST contract is validated.
    logic: "IF any required request, response, authentication, tenant, or error shape is absent or unexercised THEN the boundary is incomplete."
    violationBehaviour: "Fail the applicable contract check with the missing boundary element."
    source: [NFR8]

  - id: BR2.2
    statement: The initial asynchronous fixture validates requested, completed, and failed inventory-import messages plus one authoritative inventory-import audit event.
    category: validation
    appliesTo: [ContractDocument, ExampleFixture, SharedSchema]
    trigger: The initial AsyncAPI fixture suite runs.
    logic: "IF any required message or its valid example does not conform to the declared operation, payload, and common envelope THEN the suite fails."
    violationBehaviour: "Fail async validation and name the message, example, and schema mismatch."
    source: [NFR8, NFR7]

  - id: BR2.3
    statement: Valid examples pass and deliberately invalid examples fail for their declared reason.
    category: validation
    appliesTo: [ExampleFixture, ValidationRun]
    trigger: Example validation runs.
    logic: "IF a valid fixture fails, an invalid fixture passes, or failure occurs for an undeclared reason THEN validation is unsuccessful."
    violationBehaviour: "Fail the validation run and preserve the observed finding."
    source: [NFR8]

  - id: BR2.4
    statement: Applicable contracts carry and validate tenant, actor, placement-generation, correlation, causation, idempotency, and stable error metadata.
    category: authorization
    appliesTo: [ContractDocument, SharedSchema, ExampleFixture]
    trigger: A REST mutation, internal call, job, or event contract is validated.
    logic: "IF required context is missing, client context is represented as authority, or an error lacks its stable envelope THEN the contract fails policy validation."
    violationBehaviour: "Reject the contract candidate; runtime access is never granted by contract metadata alone."
    source: [NFR3, NFR5, NFR7, NFR8]

  - id: BR3.1
    statement: Generated clients and message models are consumer-local derivatives of canonical documents.
    category: policy
    appliesTo: [GenerationProfile, GeneratedArtifactManifest]
    trigger: A generation profile is created or executed.
    logic: "IF generated output is required by a consumer THEN its output path is inside that consumer and it does not become a mandatory shared runtime library."
    violationBehaviour: "Reject the profile or generated output layout."
    source: [NFR8]

  - id: BR3.2
    statement: Required generated outputs must reproduce byte-equivalent normalized results from canonical inputs and pinned configuration.
    category: validation
    appliesTo: [GenerationProfile, GeneratedArtifactManifest, ValidationRun]
    trigger: Local or CI regeneration runs.
    logic: "IF regenerated output is missing or differs from the tracked consumer output after normalization THEN its drift status is stale or missing."
    violationBehaviour: "Fail the applicable validation run; manual edits cannot satisfy the check."
    source: [NFR8, NFR13]

  - id: BR3.3
    statement: Every generated output records exact generator, source, configuration, and output provenance.
    category: constraint
    appliesTo: [GenerationProfile, GeneratedArtifactManifest]
    trigger: A generated artifact is recorded.
    logic: "IF an exact generator version, source digest, configuration digest, or output digest is absent THEN provenance is incomplete."
    violationBehaviour: "Mark the output invalid and fail any check that requires it."
    source: [NFR8, NFR15]

  - id: BR4.1
    statement: Compatibility checks select the baseline that matches the actual integration level.
    category: policy
    appliesTo: [CompatibilityAssessment]
    trigger: A candidate contract is compared.
    logic: "IF the context is story THEN compare with its Bolt branch; IF Bolt THEN compare with main; IF release THEN compare with the latest release tag."
    violationBehaviour: "Fail the assessment before judging compatibility."
    source: [NFR8, NFR13]

  - id: BR4.2
    statement: Compatible additions may remain within a major version and consumers must tolerate declared optional additions.
    category: policy
    appliesTo: [ContractDocument, SharedSchema, CompatibilityAssessment]
    trigger: A candidate adds contract elements.
    logic: "IF the change is additive and optional under the approved compatibility policy THEN it may be compatible within the current major version."
    violationBehaviour: "Classify any non-additive or newly required effect under the breaking-change rule."
    source: [NFR8]

  - id: BR4.3
    statement: An intentional breaking contract requires a new major version and explicit owner approval.
    category: authorization
    appliesTo: [CompatibilityAssessment, ContractPackage]
    trigger: A compatibility assessment detects a breaking change.
    logic: "IF the result is breaking AND either the major version is unchanged or approval evidence is absent THEN the change is unapproved."
    violationBehaviour: "Fail integration or release and retain the breaking findings."
    source: [NFR8, NFR13, NFR15]

  - id: BR4.4
    statement: Published event schemas are immutable; breaking event meaning uses a new message type or major routing identity.
    category: constraint
    appliesTo: [ContractDocument, SharedSchema, CompatibilityAssessment]
    trigger: A published event contract would change incompatibly.
    logic: "IF a published event change breaks existing consumers THEN preserve the old event and introduce a new type or major identity."
    violationBehaviour: "Reject replacement in place and fail compatibility validation."
    source: [NFR7, NFR8]

  - id: BR5.1
    statement: Jobs and immutable events use distinct message identities and the approved common envelope.
    category: validation
    appliesTo: [ContractDocument, SharedSchema, ExampleFixture]
    trigger: An asynchronous message is defined or validated.
    logic: "IF a message conflates requested work with an observed event or omits the required envelope fields THEN the message contract is invalid."
    violationBehaviour: "Fail validation and identify the missing category or envelope field."
    source: [NFR7, NFR8]

  - id: BR5.2
    statement: Reliable-message contracts declare durable publication with confirms, transactional outbox/inbox boundaries, and acknowledgement only after consumer commit.
    category: constraint
    appliesTo: [ContractDocument, ExampleFixture]
    trigger: A durable job or event flow is documented.
    logic: "IF the flow lacks publication confirmation, commit boundaries, or acknowledgement semantics THEN its reliability contract is incomplete."
    violationBehaviour: "Fail the reliability-policy check; U1 does not claim runtime delivery from documentation alone."
    source: [NFR7]

  - id: BR5.3
    statement: Redelivery contracts require deduplication by message identity and revalidation of tenant, placement, actor, and job authority before an effect.
    category: authorization
    appliesTo: [ContractDocument, SharedSchema, ExampleFixture]
    trigger: A redelivery or duplicate-message scenario is validated.
    logic: "IF identity or authority context is absent, stale, or represented as trusted client assertion THEN the scenario must not describe a successful effect."
    violationBehaviour: "Fail the fixture or contract and require the owning runtime unit to prove one committed effect."
    source: [NFR3, NFR5, NFR7]

  - id: BR5.4
    statement: Messaging contracts declare bounded retries, observable dead letters, audited replay, and no exactly-once transport claim.
    category: policy
    appliesTo: [ContractDocument, ExampleFixture]
    trigger: A message exhausts its configured processing attempts.
    logic: "IF retries are unbounded, dead-letter/replay outcomes are absent, or transport is described as exactly once THEN the contract is invalid."
    violationBehaviour: "Fail reliability-policy validation and expose the unsupported claim or missing outcome."
    source: [NFR7]

  - id: BR6.1
    statement: Pull-request validation reports every applicable contract check alongside the other required hosted CI categories.
    category: policy
    appliesTo: [ValidationRun, EvidenceRecord]
    trigger: A pull request changes a contract, schema, example, generator input, or generated output.
    logic: "IF an applicable syntax, example, policy, generation, compatibility, or coverage check is omitted THEN contract CI is incomplete."
    violationBehaviour: "Record the validation run as failed or not-run; do not report contract readiness."
    source: [NFR8, NFR13]

  - id: BR6.2
    statement: Any failed required contract check blocks the corresponding integration decision.
    category: constraint
    appliesTo: [ValidationRun, ValidationFinding, CompatibilityAssessment]
    trigger: Merge or release readiness is evaluated.
    logic: "IF a required check has an error, stale generated output, unapproved break, or missing result THEN readiness is false."
    violationBehaviour: "Block integration and retain actionable findings."
    source: [NFR13]

  - id: BR6.3
    statement: Contract validation for untrusted contributions runs without deployment credentials or access to isolated deployment execution.
    category: authorization
    appliesTo: [ValidationRun, EvidenceRecord]
    trigger: An untrusted public pull request starts validation.
    logic: "IF the run requires deployment secrets, owner credentials, or an isolated deployment runner THEN the run configuration violates the trust boundary."
    violationBehaviour: "Deny the privileged path and report the CI configuration failure."
    source: [NFR13]

  - id: BR6.4
    statement: Contract evidence uses stable links from requirements and acceptance criteria through boundaries, rules, revisions, and validation outcomes.
    category: policy
    appliesTo: [EvidenceRecord]
    trigger: Contract evidence is published or inspected.
    logic: "IF a required source ID, boundary ID, rule ID, revision, or run cannot be resolved THEN traceability is incomplete."
    violationBehaviour: "Mark evidence incomplete and prohibit a complete-coverage claim."
    source: [NFR15]

  - id: BR6.5
    statement: Evidence preserves model and data cards, rejected candidates, resource and recovery findings, synthetic limitations, and every failed, limited, rejected, or not-run outcome.
    category: policy
    appliesTo: [ValidationRun, ValidationFinding, EvidenceRecord]
    trigger: A result is recorded or summarized.
    logic: "IF a required evidence category, unsuccessful or limited outcome, or disclosed limitation is hidden, rewritten, or omitted from the referenced evidence THEN the summary is invalid."
    violationBehaviour: "Reject the evidence summary and retain the original outcome."
    source: [NFR15, FR12]

  - id: BR6.6
    statement: Versioned release evidence identifies an immutable revision, tag, and package version only after explicit owner approval.
    category: authorization
    appliesTo: [ContractPackage, EvidenceRecord]
    trigger: Contract evidence is labeled as released.
    logic: "IF approval, revision, tag, or package identity is absent THEN the evidence cannot be labeled as an approved release."
    violationBehaviour: "Keep the package or evidence unreleased and report the missing authority or identity."
    source: [NFR15]

  - id: BR6.7
    statement: Every delivered REST boundary, asynchronous boundary, and sensitive flow supplies its own passing evidence before final coverage is complete.
    category: constraint
    appliesTo: [EvidenceRecord, ContractPackage]
    trigger: Release-wide coverage is evaluated.
    logic: "IF a delivered boundary or sensitive flow lacks its own passing contract, authorization, audit, or retry evidence THEN final coverage is incomplete."
    violationBehaviour: "Fail the coverage matrix; a foundation fixture cannot substitute for the missing evidence."
    source: [NFR15]
```

## Rules summary

| Group | Rules | Summary |
| --- | --- | --- |
| Package and ownership | BR1.1-BR1.4 | Packages are complete, standards-based, immutable after release, and preserve provider semantic ownership. |
| Contract validation | BR2.1-BR2.4 | Initial REST/async fixtures and shared context/error rules must validate, including expected failures. |
| Generated outputs | BR3.1-BR3.3 | Generation is consumer-local, reproducible, provenance-rich, and checked for drift. |
| Compatibility | BR4.1-BR4.4 | The comparison baseline follows the Git integration path; breaking changes need a new major version and approval. |
| Reliable messaging | BR5.1-BR5.4 | Contracts distinguish jobs/events and declare outbox/inbox, authority, deduplication, bounded retry, DLQ, and replay semantics. |
| CI and evidence | BR6.1-BR6.7 | Hosted checks block unsafe integration and provide truthful, stable, boundary-specific portfolio evidence. |
