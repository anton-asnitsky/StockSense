# Contracts Business Rules

Unit: U1 Contracts (`contracts`)

Sources: U1 ownership and constraints; US8.2, US8.5, US8.7, US9.11, and US10.2; NFR3, NFR5, NFR7, NFR8, NFR13, NFR15, FR12, and FR20.1; C01, C07, C10, C13, C15, and C22-C27 from Contract Design; and the confirmed Functional Design decisions.

The YAML block is the source of truth for U1 rules. Rules that mention runtime delivery describe what contracts and evidence must declare and validate. Runtime units remain responsible for implementing authorization, persistence, publication, consumption, and side effects.

```yaml
schemaVersion: "1.0.0"
unit: contracts
rules:
  - id: BR1.1
    statement: Every candidate package contains the canonical documents and candidate sidecars required for its declared C01-C27 boundaries; a release contains every boundary and all required result sidecars, bound to one immutable source revision.
    category: constraint
    appliesTo: [ContractPackage]
    trigger: A package is submitted for validation.
    logic: "IF any declared artifact is absent, duplicated, unreadable, unlisted, symlinked, outside the package boundary, digest-mismatched against exact bytes, or source-revision-mismatched against a clean reconstruction, OR a boundary lacks a canonical kind or sidecar required by the fixed C01 policy, OR a release omits or duplicates any C01-C27 boundary, THEN the package is incomplete. A success-labelled result sidecar without its actual validation evidence is also incomplete."
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
    logic: "IF the artifact kind is OpenAPI THEN its specification version is 3.1.2; IF AsyncAPI THEN 3.0.0; IF a shared JSON Schema THEN its dialect is 2020-12; IF a typed port THEN its dialect is the typed-port dialect and the port validator checks its port name, version, arguments, result, conflicts and locking rather than a JSON Schema validator."
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

  - id: BR1.5
    statement: Release validation and publication bind to the exact finalized manifest digest.
    category: constraint
    appliesTo: [ContractPackage, ValidationRun, EvidenceRecord]
    trigger: A final manifest is validated or published.
    logic: "IF the detached passing validation receipt lacks the exact manifest SHA-256 digest and source revision, OR publication recomputes a different digest, THEN the release is not validated. The detached receipt is not included in the manifest it hashes."
    violationBehaviour: "Block publication and require a new final validation run for the changed manifest."
    source: [NFR8, NFR15]

  - id: BR1.6
    statement: Manifest entries deterministically resolve to reusable immutable document and schema revisions through package-local inclusions.
    category: constraint
    appliesTo: [ContractPackage, PackageInclusion, ContractDocument, SharedSchema, ExampleFixture, GenerationProfile, CompatibilityAssessment]
    trigger: A C01 manifest is loaded or a document/schema revision is replaced or referenced.
    logic: "Derive logicalId as SHA-256 of the UTF-8 canonical kind, owner and normalized safe path with domain separator logical\\0; derive revisionId as SHA-256 of logicalId, semantic version and verified content digest with separator revision\\0. IF a manifest entry cannot reproduce those IDs, a package binds two revisions of one logicalId, a changed artifact reuses a published revision ID, or a fixture/profile/assessment resolves only a mutable logical ID, THEN revision identity is invalid. PackageInclusion, not the revision, owns package membership and boundary coverage, so the same unchanged revision may be reused by another package."
    violationBehaviour: "Reject the package or reference; retain predecessor revisions and create a new revision only when version or content changes."
    source: [NFR8, NFR15]

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
    logic: "IF required context is missing, client context is represented as authority, or an error lacks its stable envelope THEN the contract fails policy validation. Tenant events require real retailer and placement context; retailerless U3 identity-security events use only the distinct closed global profile and prohibit fabricated retailer or placement fields."
    violationBehaviour: "Reject the contract candidate; runtime access is never granted by contract metadata alone."
    source: [NFR3, NFR5, NFR7, NFR8]

  - id: BR2.5
    statement: The catalogue contains complete versioned schemas, security and idempotency rules, examples, and compatibility policy for every assigned boundary.
    category: validation
    appliesTo: [ContractPackage, ContractDocument, SharedSchema, ExampleFixture]
    trigger: U1 catalogue validation or dependent code generation.
    logic: "IF browser/BFF, messaging, evidence, heavy-lease, signed-model, or recovery-barrier boundaries retain a legacy placeholder or lack any required versioned schema, security/idempotency rule, example, or compatibility policy THEN catalogue validation fails."
    violationBehaviour: "Block dependent generation and name the incomplete boundary."
    source: [AC8.2.4, NFR8]

  - id: BR2.6
    statement: C07's typed shared-transaction port and fixtures prove the declared lease, attempt, pin, drain and route-change contract shape without claiming runtime atomicity from schema validation alone.
    category: validation
    appliesTo: [ContractPackage, SharedSchema, ExampleFixture, ValidationRun]
    trigger: C07 canonical package validation runs.
    logic: "IF the versioned EXECUTE-only finalizer signature, named U5/U7 caller roles, immutable run/pin/request/first-attempt/lease binding, terminal/fenced retry rule, one-transaction owner publication and U6 pin closure, replay/conflict, pin-admit/drain exclusion, atomic evaluation-lease route change, or local-terminal-before-central-slot positive and negative fixtures are missing or contradict the canonical C07 contract THEN validation fails."
    violationBehaviour: "Block C07 package publication with fixture-specific findings; U5/U6/U7/U15 separately prove live transaction and recovery behavior."
    source: [AC8.2.4, NFR8]

  - id: BR2.7
    statement: C10 typed run history and C10/C13 bounded product-set contracts preserve exact forecast coverage and unavailable outcomes.
    category: validation
    appliesTo: [ContractDocument, SharedSchema, ExampleFixture, ValidationRun]
    trigger: C10 or C13 canonical contract validation runs.
    logic: "IF ForecastRunHistoryResponse or a distinct bounded product-set request is untyped, duplicate or over-limit products pass, covered and unavailable products do not form an exact partition, an unavailable product lacks its reason, a covered product lacks 28 dated values, an unavailable product carries a fabricated series, or stale/unpublished/failed results are represented as success THEN validation fails."
    violationBehaviour: "Block C10/C13 publication and name the violating product, field and fixture."
    source: [AC8.2.4, NFR8]

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

  - id: BR5.5
    statement: Messaging package compatibility and recovery documents preserve the approved C22-C27 protocol boundaries.
    category: validation
    appliesTo: [ContractPackage, ContractDocument, SharedSchema, ExampleFixture]
    trigger: A messaging package or recovery contract is validated.
    logic: "IF the U14 package protocol range, shared conformance fixture, C01 envelope composition, provider ownership, or recovery document coverage is absent or incompatible THEN the package is incomplete. C24 additionally requires the correlation/idempotency headers, typed durable 200 result, and RFC 9457 401/403/409/422/503 problems with stable codes, including RECOVERY_PERSISTENCE_UNAVAILABLE."
    violationBehaviour: "Fail contract validation; do not attribute runtime conformance to a schema pass."
    source: [NFR7, NFR8, FR20.1]

  - id: BR5.6
    statement: Recovery fixtures require durable dispatch inventory, monotonic fencing, abort-before-late-prepare protection, and truthful partial-failure outcomes.
    category: constraint
    appliesTo: [ContractDocument, ExampleFixture, CoverageEntry]
    trigger: C24-C27 or US9.11 evidence is evaluated.
    logic: "IF a potentially delivered participant is omitted from abort, a late command can reacquire a fence, a closed result lacks a matching checkpoint digest, a changed idempotent retry returns a successful replay, persistence failure fabricates a durable result instead of 503, or unresolved participants are reported as recovered THEN the recovery contract or evidence fails."
    violationBehaviour: "Reject the fixture or coverage claim and name the affected participant and generation."
    source: [FR20.1, NFR8]

  - id: BR5.7
    statement: Operator recovery commands require current authorization and a single-use confirmation bound to the same subject, client, scope, roster, and manifest.
    category: authorization
    appliesTo: [ContractDocument, ExampleFixture]
    trigger: C26 preview or destructive start is validated.
    logic: "IF current Operator membership, placement generation, delegated human identity, or preview/start binding is absent or changed THEN destructive start is denied."
    violationBehaviour: "Fail the contract or negative example; a browser or service assertion alone never grants authority."
    source: [FR20.1, NFR3, NFR8]

  - id: BR5.8
    statement: Tenant and retailerless global identity-audit messages have separate closed envelopes, event types, routes, and negative fixtures.
    category: validation
    appliesTo: [ContractDocument, SharedSchema, ExampleFixture]
    trigger: C01/C15 audit contracts or examples are validated.
    logic: "IF a global identity outcome invents retailer or placement context, omits redacted pre-login denial examples, enters a tenant route, or a tenant event lacks real retailer and placement context THEN the contract fails."
    violationBehaviour: "Reject the event schema or fixture and name the violated profile."
    source: [NFR3, NFR7, NFR8]

  - id: BR5.9
    statement: U3/U4 bootstrap publisher profiles and U14 language packages prove their distinct C22/C23 conformance obligations.
    category: validation
    appliesTo: [ContractPackage, ContractDocument, ExampleFixture, EvidenceRecord]
    trigger: A publisher profile, consumer package, or domain-consumer fixture is evaluated.
    logic: "IF an applicable versioned C22 fixture is missing for U3/U4 service-owned C23 publishers, their U13 evidence is absent, or U14 package evidence is used to imply U3/U4 conformance THEN the claim fails. Parameterized duplicate, changed-payload, stale-authority, crash-before-commit and crash-after-commit schedules must be supplied; each domain consumer separately proves inbox uniqueness, current authority, and one atomic business effect/outbox result."
    violationBehaviour: "Fail the applicable conformance or coverage claim; the representative platform fixture cannot substitute for a domain consumer."
    source: [AC8.5.4, NFR7, NFR8]

  - id: BR5.10
    statement: Platform identity-audit reads remain distinct from retailer audit routes and require the approved live human grant checks.
    category: authorization
    appliesTo: [ContractDocument, ExampleFixture]
    trigger: C02/C17/C18 global identity-audit read contracts are validated.
    logic: "IF the U3 revocable human platform-Operator grant/current-check operation, U10 delegated-human per-page grant check, or separate U11 no-store platform route is absent, OR a retailer-only Operator, machine caller, revoked grant, invalid audience/client/scope, unavailable check, or tenant-route leakage is accepted THEN the contract fails."
    violationBehaviour: "Reject the contract or negative fixture; U1 validation does not grant runtime access."
    source: [NFR3, NFR5, NFR8]

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
    logic: "EvidenceRecord.ruleIds is a nonempty set of versioned BR identifiers. Resolve each against the U1 rules catalogue at the evidence sourceRevision, then require its acceptance criterion, boundary, immutable artifact revision and validationRunId to resolve to the same package; any missing, stale or cross-package link makes traceability incomplete."
    violationBehaviour: "Mark evidence incomplete and prohibit a complete-coverage claim."
    source: [NFR15]

  - id: BR6.5
    statement: Evidence preserves model and data cards, rejected candidates, resource and recovery findings, synthetic limitations, and all six passed, failed, limited, rejected, unavailable, and not-run outcomes with their reasons and observed results.
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

## Validation ownership

U1 validates canonical shapes, fixtures, package coverage, exact revision/digest binding, and evidence presence. U3/U4 own their bootstrap publishers, U14 owns shared language-package mechanics, U10 owns global-read enforcement, and each domain consumer proves its own atomic effects. A passing U1 schema or representative fixture never substitutes for those runtime results.

## Rules summary

| Group | Rules | Summary |
| --- | --- | --- |
| Package and ownership | BR1.1-BR1.6 | Packages are complete, standards-based, exact-manifest-bound, revision-addressable, immutable after release, and preserve provider semantic ownership. |
| Contract validation | BR2.1-BR2.5 | Initial REST/async fixtures, the complete versioned catalogue, and shared context/error rules must validate, including expected failures. |
| Generated outputs | BR3.1-BR3.3 | Generation is consumer-local, reproducible, provenance-rich, and checked for drift. |
| Compatibility | BR4.1-BR4.4 | The comparison baseline follows the Git integration path; breaking changes need a new major version and approval. |
| Reliable messaging | BR5.1-BR5.4 | Contracts distinguish jobs/events and declare outbox/inbox, authority, deduplication, bounded retry, DLQ, and replay semantics. |
| Messaging, audit, and recovery | BR5.5-BR5.10 | C01/C15/C17/C18/C22-C27 compatibility, bootstrap publisher evidence, global identity-audit separation, recovery fencing, partial failure, and Operator confirmation must be independently validated. |
| CI and evidence | BR6.1-BR6.7 | Hosted checks block unsafe integration and provide truthful, stable, boundary-specific portfolio evidence. |
