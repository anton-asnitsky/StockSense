# StockSense contract summary

Date: 2026-09-25
Stage: Contract Design  
Status: Draft for independent architecture review
Summary confirmation: Looks correct (2026-09-25; C07 atomic finalization and route drain, Forecasting first-attempt alignment, and C10/C13 product-set coverage; earlier C01/C15 identity-audit, U3/U4 publishing, and platform-Operator access decisions retained)
Owner-directed revision (2026-09-26): C07 no longer names U5 Supplier Knowledge as a heavy-work caller. `authorizedCallers` drops `supplier-knowledge-service` and the `workType` enum drops `embedding-index`, leaving U7 Forecasting as the sole external finalizer caller. The owner resolved this in favour of `unit-of-work-story-map.md`, which assigns US4.8 to U6/U7/U13 and does not assign heavy model work to U5; the earlier contract text over-reached. Raised as U5 functional-design review finding R-07.

## Purpose and baseline

This artifact defines the formal boundaries that let all 15 StockSense units be implemented independently. It follows the approved unit dependency topology, domain ownership model, and requirements FR1-FR20.1 and NFR1-NFR15. The specifications below are the design baseline for the canonical files that U1 Contracts will package and validate in CI.

Upstream sources: `unit-of-work.md`, `unit-of-work-dependency.md`, `components.md`, and `requirements.md`.

Only U11 Web BFF is exposed to the browser. Runtime service APIs remain cluster-internal. Synchronous APIs use the confirmed OpenAPI 3.1.2 baseline, asynchronous RabbitMQ contracts use AsyncAPI 3.0.0, and shared documents use JSON Schema 2020-12 or an explicitly typed shared-schema port. U4 and U8 use an in-process port and one PostgreSQL transaction inside the shared v1 Retail Operations deployment; C07 adds a separate EXECUTE-only U6 stored-function port inside U7 retailer-local finalization transactions. Neither port grants cross-schema table access. Validator versions are pinned by U1.

## Contracts

The table follows every direct integration point in the approved unit topology. A row aggregates repeated consumers only when they use the same provider-owned contract without changing its semantics.

| # | Provider Unit | Consumer | Mechanism | Owner |
| --- | --- | --- | --- | --- |
| C01 | U1 Contracts | U3-U15 runtime, library, packaging, and UI consumers | Shared schemas, examples, generated-client inputs | U1 governs packaging; each provider owns semantics |
| C02 | U3 Identity Access | U4 Retail Data and machine-token consumers | OIDC discovery, JWKS and token-validation profile | U3 Identity Access |
| C03 | U4 Retail Data | U5 Supplier Knowledge | REST/OpenAPI plus source/index lifecycle events | U4 owns REST; U5 owns emitted lifecycle events |
| C04 | U4 Retail Data | U6 Model Lifecycle | REST/OpenAPI asynchronous dataset-export jobs | U4 Retail Data |
| C05 | U5 Supplier Knowledge | U6 Model Lifecycle | REST/OpenAPI accepted-term dataset exports | U5 Supplier Knowledge |
| C06 | U4 Retail Data | U7 Forecasting | REST/OpenAPI demand observations and retailer calendar | U4 Retail Data |
| C07 | U6 Model Lifecycle | U7 Forecasting | REST/OpenAPI model, lease and route commands plus a versioned same-transaction PostgreSQL finalization port | U6 Model Lifecycle |
| C08 | U4 Retail Data | U8 Planning and Purchasing | In-process typed port and shared transaction schema | U4 owns inventory/commitment effects; U8 owns purchasing command |
| C09 | U5 Supplier Knowledge | U8 Planning and Purchasing | REST/OpenAPI accepted terms and provenance | U5 Supplier Knowledge |
| C10 | U7 Forecasting | U8 Planning and Purchasing | REST/OpenAPI 28-day forecast status and series | U7 Forecasting |
| C11 | U4 Retail Data | U9 Assistant | REST/OpenAPI authorized inventory and demand tools | U4 Retail Data |
| C12 | U5 Supplier Knowledge | U9 Assistant | REST/OpenAPI retrieval and supplier comparison with citations | U5 Supplier Knowledge |
| C13 | U7 Forecasting | U9 Assistant | REST/OpenAPI forecast status and evidence tools | U7 Forecasting |
| C14 | U8 Planning and Purchasing | U9 Assistant | REST/OpenAPI review-request and draft-proposal commands | U8 Planning and Purchasing |
| C15 | U3-U9 and U15 authoritative event publishers | U10 Audit Evidence | RabbitMQ/AsyncAPI immutable audit events | Each producer owns event semantics; U1 governs envelope; U3/U4 bootstrap publishers implement C23-conformant mechanics locally; U14 implements mechanics for U5-U9/U15 |
| C16 | U3 Identity Access | U11 Web BFF | OIDC authorization code with PKCE, logout and session profile | U3 Identity Access |
| C17 | U4-U10 and U15 domain services | U11 Web BFF | Provider-owned REST/OpenAPI documents | Each provider service |
| C18 | U11 Web BFF | U12 Web Application / External: browser | Same-origin REST/OpenAPI and secure cookie session | U11 Web BFF |
| C19 | U2-U12, U14 and U15 | U13 Demo Evidence | Deployment interface, supported service contracts, messaging conformance and evidence-manifest schema | U13 owns evidence schema; providers own commands and conformance outputs |
| C20 | External: Google OIDC | U3 Identity Access | OIDC federation profile | U3 owns adapter/linking; Google owns endpoint |
| C21 | External: local model runtimes or optional Bedrock | U9 Assistant and U5 Supplier Knowledge | Provider-neutral generation and embedding adapter schemas | U9 owns generation port; U5 owns embedding port |
| C22 | U1 Contracts | U14 Messaging Platform | Shared protocol-compatibility manifest | U1 owns protocol semantics; U14 declares package compatibility |
| C23 | U14 Messaging Platform | U5-U10, U13 and U15 asynchronous consumers; U3/U4 bootstrap publisher adapters conform independently | Versioned .NET/Python packages and conformance profile | U14 owns shared packages; U3/U4 own service-local conformant publisher adapters; domain units own messages and effects |
| C24 | U3 Identity Access and U4 Retail Data | U15 Recovery Coordination | Synchronous recovery-bootstrap OpenAPI profile | Each bootstrap provider owns its durable participant behavior |
| C25 | U15 Recovery Coordination and recovery participants | U4-U10 participant handlers | RabbitMQ/AsyncAPI recovery commands and acknowledgements | U15 owns lifecycle semantics; each participant owns fencing and checkpoints |
| C26 | U15 Recovery Coordination | U11 Web BFF | REST/OpenAPI recovery preview, confirmation, job status and manifest | U15 Recovery Coordination |
| C27 | U15 Recovery Coordination | U10 Audit Evidence | RabbitMQ/AsyncAPI immutable recovery events | U15 owns event semantics; U10 owns projection |

## Common contract vocabulary

### C01 — Canonical package and shared envelopes

U1 publishes provider-separated specifications, compatibility reports, examples, and generated-client inputs. It contains no runtime authorization logic and creates no shared persistence model.

```yaml
$schema: https://json-schema.org/draft/2020-12/schema
$id: https://contracts.stocksense.local/common/v1/contract-package.schema.json
title: StockSenseContractPackage
type: object
required: [packageVersion, manifestStatus, sourceRevision, openapi, asyncapi, schemas, governedArtifacts, boundaryCoverage]
properties:
  packageVersion: { type: string, pattern: '^1\.[0-9]+\.[0-9]+$' }
  manifestStatus: { enum: [candidate, release] }
  sourceRevision: { type: string, pattern: '^[0-9a-f]{40}([0-9a-f]{24})?$' }
  openapi:
    type: array
    items:
      type: object
      required: [provider, boundaryIds, document, semanticVersion, contentDigest]
      properties:
        provider: { type: string, minLength: 1 }
        boundaryIds: { $ref: '#/$defs/boundaryIds' }
        document: { $ref: '#/$defs/packagePath' }
        semanticVersion: { $ref: '#/$defs/semanticVersion' }
        contentDigest: { $ref: '#/$defs/contentDigest' }
      additionalProperties: false
  asyncapi:
    type: array
    items:
      type: object
      required: [producer, boundaryIds, document, semanticVersion, contentDigest]
      properties:
        producer: { type: string, minLength: 1 }
        boundaryIds: { $ref: '#/$defs/boundaryIds' }
        document: { $ref: '#/$defs/packagePath' }
        semanticVersion: { $ref: '#/$defs/semanticVersion' }
        contentDigest: { $ref: '#/$defs/contentDigest' }
      additionalProperties: false
  schemas:
    type: array
    items:
      type: object
      required: [owner, boundaryIds, document, semanticVersion, contentDigest]
      properties:
        owner: { type: string, minLength: 1 }
        boundaryIds: { $ref: '#/$defs/boundaryIds' }
        document: { $ref: '#/$defs/packagePath' }
        semanticVersion: { $ref: '#/$defs/semanticVersion' }
        contentDigest: { $ref: '#/$defs/contentDigest' }
      additionalProperties: false
  governedArtifacts:
    type: array
    description: Versioned, source-bound package-local sidecars.
    minItems: 1
    items:
      type: object
      required: [kind, owner, boundaryIds, document, semanticVersion, contentDigest, sourceRevision]
      properties:
        kind:
          enum: [contract-package-policy, example-fixture, generation-profile, generated-output-manifest, compatibility-assessment, validation-run, evidence-record, protocol-compatibility-manifest, messaging-conformance-profile, recovery-policy]
        owner: { type: string, minLength: 1 }
        boundaryIds: { $ref: '#/$defs/boundaryIds' }
        document: { $ref: '#/$defs/packagePath' }
        semanticVersion: { $ref: '#/$defs/semanticVersion' }
        contentDigest: { $ref: '#/$defs/contentDigest' }
        sourceRevision: { type: string, pattern: '^[0-9a-f]{40}([0-9a-f]{24})?$' }
      additionalProperties: false
  boundaryCoverage:
    type: array
    minItems: 1
    maxItems: 27
    description: One inventory row per delivered boundary; the release validator requires exactly C01-C27 and the required-kind matrix below.
    items:
      type: object
      required: [boundaryId, canonicalDocuments, sidecars]
      properties:
        boundaryId: { $ref: '#/$defs/boundaryId' }
        canonicalDocuments: { type: array, minItems: 1, uniqueItems: true, items: { $ref: '#/$defs/packagePath' } }
        sidecars: { type: array, minItems: 1, uniqueItems: true, items: { $ref: '#/$defs/packagePath' } }
      additionalProperties: false
allOf:
  - if: { properties: { manifestStatus: { const: release } }, required: [manifestStatus] }
    then:
      properties:
        openapi: { minItems: 1 }
        asyncapi: { minItems: 1 }
        schemas: { minItems: 1 }
        boundaryCoverage: { minItems: 27 }
$defs:
  boundaryId: { type: string, pattern: '^C(0[1-9]|1[0-9]|2[0-7])$' }
  boundaryIds: { type: array, minItems: 1, uniqueItems: true, items: { $ref: '#/$defs/boundaryId' } }
  packagePath: { type: string, pattern: '^(?!/)(?!.*(^|/)\.\.(/|$))(?!.*:)[A-Za-z0-9._/-]+$' }
  semanticVersion: { type: string, pattern: '^[1-9][0-9]*\.[0-9]+\.[0-9]+$' }
  contentDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
additionalProperties: false
```

`governedArtifacts` names package-local metadata and evidence sidecars. Every canonical OpenAPI, AsyncAPI, and schema entry (including C07's typed shared-transaction port) has an owner or producer, semantic version, package path, SHA-256 digest, and one or more C01-C27 boundary IDs. `sourceRevision` is the immutable Git commit used to build the package; every sidecar repeats it. The finalized release manifest is revalidated and immutable. The `generated-output-manifest` sidecar records each consumer-local generated path and its source, generator/configuration, and output digests; generated code itself remains in the consumer, never in U1.

The following U1 release policy is a versioned, machine-readable part of the contract package, not a set of optional manifest declarations. The validator reads this fixed policy from the U1 package revision named by `sourceRevision`. A candidate may contain a subset of C01-C27; a release must contain exactly one `boundaryCoverage` entry for every ID. Every listed document must exist in exactly one canonical or sidecar array, list that same boundary ID, and have the required kind; extra references, duplicate paths or IDs, and omitted kinds fail. A document may cover multiple boundaries by listing each ID. The policy's canonical-kind sets are additive for IDs in more than one set.

```yaml
contractPackagePolicyVersion: 1.0.0
requiredBoundaryIds: [C01, C02, C03, C04, C05, C06, C07, C08, C09, C10, C11, C12, C13, C14, C15, C16, C17, C18, C19, C20, C21, C22, C23, C24, C25, C26, C27]
requiredCanonicalKinds:
  schema: [C01, C02, C07, C08, C15, C16, C17, C19, C20, C21, C22, C23]
  openapi: [C03, C04, C05, C06, C07, C09, C10, C11, C12, C13, C14, C17, C18, C24, C26]
  asyncapi: [C03, C15, C23, C25, C27]
requiredCanonicalPaths:
  C01: [common/v1/message-envelope.schema.json, common/v1/global-identity-audit-envelope.schema.json]
  C07: [model-lifecycle/v1/finalize-heavy-work.shared-schema.yaml]
  C15: [common/v1/global-identity-audit-envelope.schema.json]
requiredSidecarKinds:
  candidateEveryBoundary: [example-fixture]
  releaseEveryBoundary: [example-fixture, compatibility-assessment, validation-run, evidence-record]
  candidateForCanonicalDocuments: [generation-profile]
  releaseForGeneratedConsumers: [generated-output-manifest]
  candidateByBoundary:
    C01: [contract-package-policy]
    C22: [protocol-compatibility-manifest]
    C23: [messaging-conformance-profile]
    C24: [recovery-policy]
    C25: [recovery-policy]
    C26: [recovery-policy]
    C27: [recovery-policy]
```

For `candidate`, the validator applies the candidate rows and canonical-kind matrix to the declared boundaries; for `release`, it applies both candidate and release rows to all C01-C27 boundaries. A generated consumer is any consumer declared in the C01 generation profile; its output manifest must name every generated path and input digest. The validator resolves paths beneath the package root without symlinks or traversal, recomputes SHA-256 over exact bytes, and checks that the canonical input digests match a clean reconstruction from `sourceRevision`. It rejects any entry whose declared source revision differs, any unlisted applicable file, missing generation output, missing result sidecar, or a result sidecar that reports success without evidence. `boundaryCoverage` is computed from the entries, then compared to the required matrix above; a release manifest cannot declare a smaller applicability set. CI publishes only the exact release manifest whose digest passed this validation.

The `requiredCanonicalPaths` entries above are mandatory in candidate manifests whenever their boundary is declared and in every release manifest. The global envelope schema entry lists both C01 and C15 as boundary IDs. C15's global AsyncAPI `$ref` must resolve to those packaged bytes; missing, changed, or unlisted files fail validation even if another schema of the required kind exists.

Synchronous requests carry `X-Correlation-ID`. Mutations also require `Idempotency-Key`; the provider stores the key with a request hash and returns the original result for a matching replay. Reusing a key with a different hash returns `409`. Retailer identifiers select a resource but never grant authority.

```yaml
$schema: https://json-schema.org/draft/2020-12/schema
$id: https://contracts.stocksense.local/common/v1/message-envelope.schema.json
title: MessageEnvelope
type: object
required:
  - messageId
  - messageType
  - schemaVersion
  - occurredAt
  - retailerId
  - actor
  - correlationId
  - causationId
  - idempotencyKey
  - placementGeneration
  - producer
  - payloadDigest
  - data
properties:
  messageId: { type: string, format: uuid }
  messageType: { type: string, pattern: '^[a-z][a-z0-9.]+$' }
  schemaVersion: { type: string, pattern: '^[1-9][0-9]*\.[0-9]+\.[0-9]+$' }
  occurredAt: { type: string, format: date-time }
  retailerId: { type: string, format: uuid }
  actor:
    type: object
    required: [type, subjectId]
    properties:
      type: { enum: [user, service, scheduler] }
      subjectId: { type: string }
    additionalProperties: false
  correlationId: { type: string, format: uuid }
  causationId: { type: string, format: uuid }
  idempotencyKey: { type: string, minLength: 16, maxLength: 128 }
  placementGeneration: { type: integer, minimum: 1 }
  producer:
    type: object
    required: [serviceId, subjectId, audience, protocolVersion]
    properties:
      serviceId: { type: string, pattern: '^[a-z][a-z0-9-]{2,63}$' }
      subjectId: { type: string, minLength: 1, maxLength: 200 }
      audience: { type: string, minLength: 1, maxLength: 200 }
      protocolVersion: { type: string, pattern: '^[1-9][0-9]*\.[0-9]+\.[0-9]+$' }
    additionalProperties: false
  payloadDigest:
    type: string
    pattern: '^sha256:[0-9a-f]{64}$'
    description: SHA-256 of the RFC 8785 canonical JSON representation of data.
  traceparent: { type: string }
  data: { type: object }
additionalProperties: false
```

The serialized UTF-8 tenant envelope is limited to 65,536 bytes. U1 publishes `common/v1/message-envelope.schema.json` with the exact `$id` above in the versioned contract package; build-time AsyncAPI resolvers map that logical URI to the packaged file and fail validation when it is missing or incompatible. All AsyncAPI payloads declare `application/schema+json;version=draft-2020-12`; U1 pins a resolver and validator supporting that format. The publishing adapter obtains a narrow machine token and binds `producer.serviceId`, `producer.subjectId`, and `producer.audience` to the validated token client/subject, audience, and registered producer identity before publish. Consumers repeat that binding check before accepting a delivery. `messageId`, `idempotencyKey`, and `payloadDigest` form the replay identity: byte-equivalent canonical payload replay returns the durable prior result, while a changed payload under the same message or idempotency identity is quarantined as a conflict and cannot produce a business effect. Tenant messages in C03, C15, C25 and C27 use `allOf` to reference this complete C01 tenant envelope and narrow `messageType`, `schemaVersion`, and `data`. Domain fields live inside `data`, so the closed top-level schema remains valid and no required tenant field can be relaxed. U1's conformance fixtures reject each tenant message with any one required envelope field removed.

Retailerless Identity Access security outcomes use a separate closed profile, never a fabricated tenant or placement value. It is a distinct canonical C01/C15 schema document in the same versioned package and has its own required-field and negative fixtures. Its new `identity.global.audit.recorded` type does not reinterpret the tenant-scoped `identity.audit.recorded` type.

```yaml
$schema: https://json-schema.org/draft/2020-12/schema
$id: https://contracts.stocksense.local/common/v1/global-identity-audit-envelope.schema.json
title: GlobalIdentityAuditEnvelope
type: object
required: [scope, messageId, messageType, schemaVersion, occurredAt, actor, correlationId, causationId, idempotencyKey, producer, payloadDigest, data]
properties:
  scope: { const: global }
  messageId: { type: string, format: uuid }
  messageType: { const: identity.global.audit.recorded }
  schemaVersion: { const: 1.0.0 }
  occurredAt: { type: string, format: date-time }
  actor:
    oneOf:
      - type: object
        required: [type, subjectId]
        properties:
          type: { const: anonymous }
          subjectId: { const: anonymous }
        additionalProperties: false
      - type: object
        required: [type, subjectId]
        properties:
          type: { enum: [user, service, scheduler] }
          subjectId: { type: string, minLength: 1, maxLength: 200 }
        additionalProperties: false
  correlationId: { type: string, format: uuid }
  causationId: { type: ['string', 'null'], format: uuid }
  idempotencyKey: { type: string, minLength: 16, maxLength: 128 }
  producer:
    type: object
    required: [serviceId, subjectId, audience, protocolVersion]
    properties:
      serviceId: { const: identity-access }
      subjectId: { type: string, minLength: 1, maxLength: 200 }
      audience: { type: string, minLength: 1, maxLength: 200 }
      protocolVersion: { type: string, pattern: '^[1-9][0-9]*\.[0-9]+\.[0-9]+$' }
    additionalProperties: false
  payloadDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
  traceparent: { type: string }
  data: { type: object }
additionalProperties: false
```

The global envelope is also limited to 65,536 serialized UTF-8 bytes. `payloadDigest` is SHA-256 of RFC 8785 canonical JSON `data`; the producer/consumer binding and replay-conflict rules above apply unchanged. `causationId` is null only for a root identity decision, otherwise a UUID linking its cause. The global schema forbids `retailerId` and `placementGeneration` through `additionalProperties: false`. The tenant schema forbids `scope`, so substituting either profile fails. Only the authenticated Identity Access workload may publish the global type. Its service-local publisher and U14's U10 consumer adapter each validate the selected profile without acquiring tenant or platform-Operator read authority.

## Identity contracts

### C02 — Identity discovery and machine-token validation

Services validate issuer, audience, signature, lifetime, token type, and narrow scopes locally from U3 discovery metadata and JWKS. Token identity does not establish retailer membership; the authoritative business service revalidates membership and placement generation. C26 additionally requires a U3-issued delegated human token with stable `sub`, `client_id=stocksense-web-bff`, and `aud=stocksense-recovery`; a machine token with the same scope cannot represent an Operator. Separately, U3 owns a revocable, platform-wide `platform-operator` human grant; it is never inferred from a retailer Operator membership. U3 provisions and revokes that grant through an owner-controlled, audited identity operation. For global identity-audit reads U3 issues a delegated human token only to the BFF client, with `aud=stocksense-audit-evidence`, stable `sub`, and `audit.identity.global.read` scope. U10 validates the token locally and then calls the U3 grant-check operation below for that token's `sub` on every page; a token claim, BFF header, or retailer role alone cannot establish current grant. An unavailable grant check fails closed.

```yaml
openapi: 3.1.2
info: { title: StockSense Identity Metadata API, version: 1.0.0 }
paths:
  /.well-known/openid-configuration:
    get:
      operationId: getOpenIdConfiguration
      responses:
        '200':
          description: Issuer metadata with authorization, token, end-session and JWKS endpoints
          content:
            application/json:
              schema:
                type: object
                required: [issuer, authorization_endpoint, token_endpoint, jwks_uri]
                properties:
                  issuer: { type: string, format: uri }
                  authorization_endpoint: { type: string, format: uri }
                  token_endpoint: { type: string, format: uri }
                  jwks_uri: { type: string, format: uri }
                  end_session_endpoint: { type: string, format: uri }
  /.well-known/openid-configuration/jwks:
    get:
      operationId: getJsonWebKeySet
      responses:
        '200': { description: Active and overlap-period public signing keys }
  /internal/v1/subjects/{subjectId}/platform-operator-grant:
    parameters:
      - { in: path, name: subjectId, required: true, schema: { type: string, minLength: 1, maxLength: 200 } }
    get:
      operationId: checkCurrentPlatformOperatorGrant
      security: [{ platformGrantReaderToken: [identity.platform-grant.read] }]
      responses:
        '200':
          description: Current active platform-wide human grant for the requested subject
          headers: { Cache-Control: { schema: { const: 'no-store' } } }
          content:
            application/json:
              schema:
                type: object
                required: [subjectId, grantVersion, checkedAt]
                properties:
                  subjectId: { type: string }
                  grantVersion: { type: integer, minimum: 1 }
                  checkedAt: { type: string, format: date-time }
                additionalProperties: false
        '403': { description: 'Grant missing, revoked, inactive, or subject ineligible; RFC 9457 problem' }
        '503': { description: Authoritative grant state unavailable; caller must deny access }
components:
  securitySchemes:
    platformGrantReaderToken:
      type: oauth2
      flows:
        clientCredentials:
          tokenUrl: /connect/token
          scopes:
            identity.platform-grant.read: Read current platform Operator grant for an authenticated human subject
```

### C16 — Browser login through the BFF

Only U11 acts as the OIDC client for browser users. It uses authorization code with PKCE, stores tokens server-side, rotates its secure HttpOnly session cookie, validates CSRF on mutations, and rejects replay of invalidated cookies. When the human Operator invokes C26 through the BFF, U11 presents its server-held U15-audience delegated user access token, never a client-credentials token or a caller-supplied subject header.

```yaml
openapi: 3.1.2
info: { title: StockSense BFF Identity Contract, version: 1.0.0 }
paths:
  /auth/login:
    get:
      operationId: beginLogin
      parameters:
        - in: query
          name: returnUrl
          schema: { type: string, pattern: '^/' }
      responses:
        '302': { description: Redirect to the configured identity provider }
  /auth/callback:
    get:
      operationId: completeLogin
      responses:
        '302': { description: Establish rotated BFF session and redirect locally }
        '400': { description: 'Invalid state, nonce, code or callback' }
  /auth/logout:
    post:
      operationId: logout
      responses:
        '204': { description: BFF session invalidated }
  /api/v1/session:
    get:
      operationId: getCurrentSession
      responses:
        '200': { description: Browser-safe identity and available retailer contexts }
        '401': { description: 'Session missing, expired, revoked or replayed' }
```

### C20 — Google federation adapter

Google is an optional upstream identity provider. U3 maps an externally verified identity to a local account only through explicit, audited linking. Matching email text never links accounts or grants membership.

```yaml
kind: oidc-federation-profile
version: 1.0.0
provider: google
flow: authorization_code
pkce: S256
requiredClaims: [iss, sub, aud, exp, iat]
optionalClaims: [email, email_verified, name]
localIdentityKey: [issuer, subject]
linking:
  automaticEmailLinking: prohibited
  explicitAuthorizedLink: required
  retailerMembershipInheritance: prohibited
failureBehavior:
  callbackValidationFailure: deny-and-audit
  providerUnavailable: preserve-local-demo-login
```

## Retail and knowledge contracts

### C03 — Retail reference data for Supplier Knowledge

```yaml
openapi: 3.1.2
info: { title: Retail Data Supplier-Knowledge API, version: 1.0.0 }
paths:
  /api/v1/retailers/{retailerId}/supplier-reference:
    get:
      operationId: getSupplierReferenceData
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: query, name: productIds, schema: { type: array, items: { type: string, format: uuid }, maxItems: 200 } }
      responses:
        '200': { description: 'Authorized retailer currency, products and source versions' }
        '403': { description: Current membership or placement validation failed }
        '409': { description: Requested source version is stale }
```

Retail Data publishes source-version changes; Supplier Knowledge uses them to reconcile derived indexes without gaining access to Retail Data storage.

```yaml
asyncapi: 3.0.0
info: { title: Retail Reference Events, version: 1.0.0 }
channels:
  retailReferenceChanged:
    address: stocksense.retail-data.reference.v1
    messages:
      retailReferenceChanged:
        payload:
          schemaFormat: 'application/schema+json;version=draft-2020-12'
          schema:
            allOf:
              - $ref: 'https://contracts.stocksense.local/common/v1/message-envelope.schema.json'
              - type: object
                properties:
                  messageType: { const: retail.reference.changed }
                  schemaVersion: { const: 1.0.0 }
                  data:
                    type: object
                    required: [sourceVersion, changedProductIds]
                    properties:
                      sourceVersion: { type: string }
                      changedProductIds: { type: array, items: { type: string, format: uuid } }
operations:
  receiveRetailReferenceChanged:
    action: receive
    channel: { $ref: '#/channels/retailReferenceChanged' }
```

### C04 — Retail dataset exports for Model Lifecycle

```yaml
openapi: 3.1.2
info: { title: Retail Data Model-Lifecycle Export API, version: 1.0.0 }
paths:
  /api/v1/retailers/{retailerId}/dataset-exports:
    post:
      operationId: requestRetailDatasetExport
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: header, name: Idempotency-Key, required: true, schema: { type: string } }
      responses:
        '202': { description: Immutable export job accepted; Location identifies the job resource }
        '409': { description: Idempotency conflict or stale source version }
  /api/v1/retailers/{retailerId}/dataset-exports/{jobId}:
    parameters:
      - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
      - { in: path, name: jobId, required: true, schema: { type: string, format: uuid } }
    get:
      operationId: getRetailDatasetExport
      responses:
        '200': { description: Job status and checksummed artifact reference }
        '404': { description: Job not visible in this retailer context }
```

### C05 — Accepted-term exports for Model Lifecycle

```yaml
openapi: 3.1.2
info: { title: Supplier Knowledge Model-Lifecycle API, version: 1.0.0 }
paths:
  /api/v1/retailers/{retailerId}/accepted-term-exports:
    post:
      operationId: requestAcceptedTermExport
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: header, name: Idempotency-Key, required: true, schema: { type: string } }
      responses:
        '202': { description: Versioned term/provenance export accepted }
        '422': { description: Accepted terms are incomplete or invalid for evaluation }
  /api/v1/retailers/{retailerId}/accepted-term-exports/{jobId}:
    parameters:
      - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
      - { in: path, name: jobId, required: true, schema: { type: string, format: uuid } }
    get:
      operationId: getAcceptedTermExport
      responses:
        '200': { description: 'Status, source revisions, currency and artifact checksum' }
```

### C06 — Demand and calendar data for Forecasting

```yaml
openapi: 3.1.2
info: { title: Retail Data Forecasting API, version: 1.0.0 }
paths:
  /api/v1/retailers/{retailerId}/forecast-inputs:
    get:
      operationId: getForecastInputs
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: query, name: asOf, required: true, schema: { type: string, format: date-time } }
        - { in: query, name: sourceVersion, required: true, schema: { type: string } }
      responses:
        '200': { description: 'Demand observations, promotions and retailer-local calendar through asOf' }
        '403': { description: Current membership or machine authority validation failed }
        '409': { description: Source version or placement generation is stale }
```

### C07 — Promoted models for Forecasting

Model Lifecycle arbitrates CPU/GPU-heavy work and publishes signed, immutable model packages. A lease is the only authority to finalize a heavy-work result. The current monotonic fencing token must accompany renew, release, completion, and publication; expiry, supersession, recovery-generation change, or revocation makes an older token permanently unable to publish.

```yaml
openapi: 3.1.2
info: { title: Model Lifecycle Forecasting API, version: 1.0.0 }
paths:
  /api/v1/retailers/{retailerId}/heavy-work-requests:
    post:
      operationId: requestHeavyWork
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: header, name: Idempotency-Key, required: true, schema: { type: string, minLength: 16, maxLength: 128 } }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/HeavyWorkRequest' }
      responses:
        '202': { description: Request accepted or matching durable request returned; Location identifies its resource, content: { application/json: { schema: { $ref: '#/components/schemas/HeavyWorkRequestStatus' } } } }
        '409': { description: Idempotency payload conflict or stale placement/recovery generation }
        '422': { description: Unsupported work type or deadline already elapsed }
  /api/v1/retailers/{retailerId}/heavy-work-requests/{requestId}:
    get:
      operationId: getHeavyWorkRequest
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: path, name: requestId, required: true, schema: { type: string, format: uuid } }
      responses:
        '200': { description: 'Queued, leased, completed, failed, cancelled, or deadline-expired request with immutable forecast binding', content: { application/json: { schema: { $ref: '#/components/schemas/HeavyWorkRequestStatus' } } } }
        '404': { description: Request absent or outside the authorized retailer context }
  /api/v1/retailers/{retailerId}/heavy-work-requests/{requestId}:cancel:
    post:
      operationId: cancelHeavyWorkRequest
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: path, name: requestId, required: true, schema: { type: string, format: uuid } }
        - { in: header, name: Idempotency-Key, required: true, schema: { type: string, minLength: 16, maxLength: 128 } }
      requestBody:
        required: true
        content:
          application/json:
            schema: { type: object, required: [placementGeneration, recoveryGeneration, reason], properties: { placementGeneration: { type: integer, minimum: 1 }, recoveryGeneration: { type: integer, minimum: 1 }, reason: { type: string, minLength: 1, maxLength: 1000 } }, additionalProperties: false }
      responses:
        '200': { description: Request cancelled and any active lease permanently fenced; matching replay returns this result }
        '409': { description: Request already completed or cancellation payload/generation conflicts }
  /api/v1/retailers/{retailerId}/heavy-work-requests/{requestId}/leases:acquire:
    post:
      operationId: acquireHeavyWorkLease
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: path, name: requestId, required: true, schema: { type: string, format: uuid } }
        - { in: header, name: Idempotency-Key, required: true, schema: { type: string, minLength: 16, maxLength: 128 } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [workerId, workType, requestedLeaseSeconds, placementGeneration, recoveryGeneration]
              if: { properties: { workType: { const: batch-forecast } }, required: [workType] }
              then: { required: [forecastRunId, forecastRoutePinId, forecastAttemptId] }
              else: { not: { anyOf: [ { required: [forecastRunId] }, { required: [forecastRoutePinId] }, { required: [forecastAttemptId] } ] } }
              properties:
                workerId: { type: string, minLength: 1, maxLength: 200 }
                workType: { enum: [training, evaluation, batch-forecast] }
                requestedLeaseSeconds: { type: integer, minimum: 30, maximum: 900 }
                placementGeneration: { type: integer, minimum: 1 }
                recoveryGeneration: { type: integer, minimum: 1 }
                forecastRunId: { type: string, format: uuid }
                forecastRoutePinId: { type: string, format: uuid }
                forecastAttemptId: { type: string, format: uuid }
              additionalProperties: false
      responses:
        '200':
          description: Lease acquired or the same idempotent acquisition returned
          content: { application/json: { schema: { $ref: '#/components/schemas/HeavyWorkLease' } } }
        '202': { description: Request remains queued; Retry-After gives the earliest allowed reacquisition time }
        '409': { description: 'Lease already held, stale generation, or acquisition payload conflict' }
        '410': { description: Request deadline elapsed or request was cancelled }
  /api/v1/retailers/{retailerId}/heavy-work-leases/{leaseId}:renew:
    post:
      operationId: renewHeavyWorkLease
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: path, name: leaseId, required: true, schema: { type: string, format: uuid } }
        - { in: header, name: Idempotency-Key, required: true, schema: { type: string, minLength: 16, maxLength: 128 } }
        - { in: header, name: X-Fencing-Token, required: true, schema: { type: integer, minimum: 1 } }
      responses:
        '200': { description: Lease expiry and heartbeat advanced for the current fencing token }
        '409': { description: 'Lease expired, superseded, fenced by recovery, or token does not match' }
  /api/v1/retailers/{retailerId}/heavy-work-leases/{leaseId}:complete:
    post:
      operationId: completeHeavyWorkLease
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: path, name: leaseId, required: true, schema: { type: string, format: uuid } }
        - { in: header, name: Idempotency-Key, required: true, schema: { type: string, minLength: 16, maxLength: 128 } }
        - { in: header, name: X-Fencing-Token, required: true, schema: { type: integer, minimum: 1 } }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [outcome, resultDigest]
              properties:
                outcome: { enum: [completed, failed, cancelled] }
                resultDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
                resultReference: { type: string, format: uri }
      responses:
        '200': { description: Terminal result accepted once and lease released }
        '409': { description: 'Terminal result conflicts, lease expired/superseded, or fencing token is stale' }
  /api/v1/retailers/{retailerId}/heavy-work-leases/{leaseId}:release:
    post:
      operationId: releaseHeavyWorkLease
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: path, name: leaseId, required: true, schema: { type: string, format: uuid } }
        - { in: header, name: Idempotency-Key, required: true, schema: { type: string, minLength: 16, maxLength: 128 } }
        - { in: header, name: X-Fencing-Token, required: true, schema: { type: integer, minimum: 1 } }
      responses:
        '204': { description: Current lease released; matching replay is idempotent }
        '409': { description: Release conflicts with a newer lease or terminal result }
  /api/v1/retailers/{retailerId}/heavy-work-leases:reconcile:
    post:
      operationId: reconcileHeavyWorkLeases
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: header, name: Idempotency-Key, required: true, schema: { type: string, minLength: 16, maxLength: 128 } }
      requestBody:
        required: true
        content:
          application/json:
            schema: { type: object, required: [recoveryRunId, placementGeneration, recoveryGeneration, checkpointDigest], properties: { recoveryRunId: { type: string, format: uuid }, placementGeneration: { type: integer, minimum: 1 }, recoveryGeneration: { type: integer, minimum: 1 }, checkpointDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' } }, additionalProperties: false }
      responses:
        '200': { description: 'Older-generation leases fenced, queue reconstructed, affected tokens advanced, and acquisition reopened atomically' }
        '403': { description: Recovery-authorized workload identity required }
        '409': { description: Recovery generation or checkpoint conflicts with durable state }
  /api/v1/retailers/{retailerId}/promoted-models/forecasting:
    get:
      operationId: getPromotedForecastModel
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: query, name: runtimeCompatibility, required: true, schema: { type: string } }
      responses:
        '200':
          description: Read-only package inspection; this response never admits or pins a Forecast Run
          content: { application/json: { schema: { $ref: '#/components/schemas/PromotedModelPackageManifest' } } }
        '404': { description: No compatible promoted model is available }
        '409': { description: 'Promotion metadata, signature, allowlist, or overlap state is inconsistent' }
        '410': { description: Selected release or signer has been revoked }
        '422': { description: Runtime does not support the package type or feature contract }
  /api/v1/retailers/{retailerId}/promoted-models/forecasting/pins:admit:
    post:
      operationId: admitForecastRoutePin
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: header, name: Idempotency-Key, required: true, schema: { type: string, minLength: 16, maxLength: 128 } }
      requestBody:
        required: true
        content: { application/json: { schema: { $ref: '#/components/schemas/ForecastRoutePinRequest' } } }
      responses:
        '201': { description: Durable pin and signed package admitted together, content: { application/json: { schema: { $ref: '#/components/schemas/ForecastRoutePin' } } } }
        '200': { description: Exact idempotent replay returns the original pin and package }
        '409': { description: 'Route draining, generation changed, or key reused with different payload' }
        '410': { description: Release or signer revoked or no longer valid }
        '503': { description: Route state cannot be checked authoritatively; no pin admitted }
  /api/v1/retailers/{retailerId}/promoted-models/forecasting/pins/{pinId}:release:
    post:
      operationId: releaseForecastRoutePin
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: path, name: pinId, required: true, schema: { type: string, format: uuid } }
        - { in: header, name: Idempotency-Key, required: true, schema: { type: string, minLength: 16, maxLength: 128 } }
      requestBody:
        required: true
        content: { application/json: { schema: { $ref: '#/components/schemas/ForecastRoutePinRelease' } } }
      responses:
        '200': { description: Current pin terminally released or exact replay returned }
        '409': { description: 'Pin owner, generation or payload conflicts; unresolved pin remains blocking' }
  /api/v1/retailers/{retailerId}/promoted-models/forecasting/drains:start:
    post:
      operationId: startForecastRouteDrain
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: header, name: Idempotency-Key, required: true, schema: { type: string, minLength: 16, maxLength: 128 } }
      requestBody:
        required: true
        content: { application/json: { schema: { $ref: '#/components/schemas/ForecastRouteDrainRequest' } } }
      responses:
        '202': { description: Route atomically closed to new old-generation pins, content: { application/json: { schema: { $ref: '#/components/schemas/ForecastRouteDrain' } } } }
        '200': { description: Exact replay returns the same drain resource, content: { application/json: { schema: { $ref: '#/components/schemas/ForecastRouteDrain' } } } }
        '409': { description: Expected generation stale or another drain is active }
  /api/v1/retailers/{retailerId}/promoted-models/forecasting/drains/{drainId}:
    get:
      operationId: getForecastRouteDrain
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: path, name: drainId, required: true, schema: { type: string, format: uuid } }
      responses:
        '200': { description: 'Durable route generation, state, deadline and exact outstanding pin count', content: { application/json: { schema: { $ref: '#/components/schemas/ForecastRouteDrain' } } } }
        '404': { description: Drain absent or outside retailer authority }
  /api/v1/retailers/{retailerId}/promoted-models/forecasting/drains/{drainId}:abort:
    post:
      operationId: abortForecastRouteDrain
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: path, name: drainId, required: true, schema: { type: string, format: uuid } }
        - { in: header, name: Idempotency-Key, required: true, schema: { type: string, minLength: 16, maxLength: 128 } }
      requestBody:
        required: true
        content: { application/json: { schema: { $ref: '#/components/schemas/ForecastRouteDrainAbort' } } }
      responses:
        '200': { description: Old route reopened only after current generation and release validity are rechecked; otherwise remains unavailable }
        '409': { description: 'Drain already committed, recovery fenced, or route cannot safely reopen' }
  /api/v1/retailers/{retailerId}/promoted-models/forecasting:promote:
    post:
      operationId: promoteForecastModel
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: header, name: Idempotency-Key, required: true, schema: { type: string, minLength: 16, maxLength: 128 } }
        - { in: header, name: X-Lease-Id, required: true, schema: { type: string, format: uuid } }
        - { in: header, name: X-Fencing-Token, required: true, schema: { type: integer, minimum: 1 } }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/PromoteModelRequest' }
      responses:
        '200': { description: Route activation and evaluation lease completion committed atomically; exact replay returns the same decision, content: { application/json: { schema: { $ref: '#/components/schemas/ForecastRouteChangeResult' } } } }
        '403': { description: Operator authority or model-promoter machine scope denied }
        '409': { description: 'Stale lease/fence, promotion generation, recovery generation or idempotency payload' }
        '410': { description: 'Lease, signer, allowlist or retained package is expired or revoked' }
        '422': { description: Evaluation evidence or package verification failed }
  /api/v1/retailers/{retailerId}/promoted-models/forecasting:rollback:
    post:
      operationId: rollbackForecastModel
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: header, name: Idempotency-Key, required: true, schema: { type: string, minLength: 16, maxLength: 128 } }
        - { in: header, name: X-Lease-Id, required: true, schema: { type: string, format: uuid } }
        - { in: header, name: X-Fencing-Token, required: true, schema: { type: integer, minimum: 1 } }
      requestBody:
        required: true
        content:
          application/json:
            schema: { type: object, required: [drainId, retainedModelVersion, expectedPromotionGeneration, placementGeneration, recoveryGeneration, evaluationEvidenceDigest, reason], properties: { drainId: { type: string, format: uuid }, retainedModelVersion: { type: string }, expectedPromotionGeneration: { type: integer, minimum: 1 }, placementGeneration: { type: integer, minimum: 1 }, recoveryGeneration: { type: integer, minimum: 1 }, evaluationEvidenceDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }, reason: { type: string, minLength: 1, maxLength: 1000 } }, additionalProperties: false }
      responses:
        '200': { description: Retained release activation and evaluation lease completion committed atomically; exact replay returns the same decision, content: { application/json: { schema: { $ref: '#/components/schemas/ForecastRouteChangeResult' } } } }
        '403': { description: Operator authority denied }
        '409': { description: Expected promotion generation is stale }
        '410': { description: 'Retained package, signer or overlap eligibility was revoked or expired' }
        '422': { description: 'Retained package no longer passes signature, trust or runtime compatibility checks' }
components:
  securitySchemes:
    modelLifecycleMachineToken: { type: oauth2, flows: { clientCredentials: { tokenUrl: /connect/token, scopes: { 'model-lifecycle.work': Acquire and finalize fenced work, 'model-lifecycle.read': Resolve promoted packages, 'model-lifecycle.recover': Reconcile leases, 'model-lifecycle.promote': Promote or roll back packages } } } }
  schemas:
    HeavyWorkRequest:
      type: object
      required: [workType, requestHash, priority, deadlineAt, placementGeneration, recoveryGeneration]
      properties:
        workType: { enum: [training, evaluation, batch-forecast] }
        requestHash: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
        priority: { type: integer, minimum: 0, maximum: 100 }
        deadlineAt: { type: string, format: date-time }
        placementGeneration: { type: integer, minimum: 1 }
        recoveryGeneration: { type: integer, minimum: 1 }
        forecastRunId: { type: string, format: uuid }
        forecastRoutePinId: { type: string, format: uuid }
        initialForecastAttemptId: { type: string, format: uuid }
      if: { properties: { workType: { const: batch-forecast } }, required: [workType] }
      then: { required: [forecastRunId, forecastRoutePinId, initialForecastAttemptId] }
      else: { not: { anyOf: [ { required: [forecastRunId] }, { required: [forecastRoutePinId] }, { required: [initialForecastAttemptId] } ] } }
      additionalProperties: false
    HeavyWorkRequestStatus:
      type: object
      required: [requestId, retailerId, workType, status, requestHash, deadlineAt, placementGeneration, recoveryGeneration, currentLeaseId]
      properties:
        requestId: { type: string, format: uuid }
        retailerId: { type: string, format: uuid }
        workType: { enum: [training, evaluation, batch-forecast] }
        status: { enum: [queued, leased, completed, failed, cancelled, deadline-expired] }
        requestHash: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
        deadlineAt: { type: string, format: date-time }
        placementGeneration: { type: integer, minimum: 1 }
        recoveryGeneration: { type: integer, minimum: 1 }
        currentLeaseId: { type: [string, 'null'], format: uuid }
        forecastRunId: { type: string, format: uuid }
        forecastRoutePinId: { type: string, format: uuid }
        initialForecastAttemptId: { type: string, format: uuid }
      if: { properties: { workType: { const: batch-forecast } }, required: [workType] }
      then: { required: [forecastRunId, forecastRoutePinId, initialForecastAttemptId] }
      else: { not: { anyOf: [ { required: [forecastRunId] }, { required: [forecastRoutePinId] }, { required: [initialForecastAttemptId] } ] } }
      additionalProperties: false
    HeavyWorkLease:
      type: object
      required: [leaseId, requestId, workerId, workType, acquiredAt, expiresAt, heartbeatAt, fencingToken, status, placementGeneration, recoveryGeneration]
      properties:
        leaseId: { type: string, format: uuid }
        requestId: { type: string, format: uuid }
        workerId: { type: string }
        workType: { enum: [training, evaluation, batch-forecast] }
        forecastRunId: { type: string, format: uuid }
        forecastRoutePinId: { type: string, format: uuid }
        forecastAttemptId: { type: string, format: uuid }
        acquiredAt: { type: string, format: date-time }
        expiresAt: { type: string, format: date-time }
        heartbeatAt: { type: string, format: date-time }
        fencingToken: { type: integer, minimum: 1 }
        status: { enum: [active, released, completed, failed, cancelled, expired, superseded, recovery-fenced] }
        placementGeneration: { type: integer, minimum: 1 }
        recoveryGeneration: { type: integer, minimum: 1 }
      if: { properties: { workType: { const: batch-forecast } }, required: [workType] }
      then: { required: [forecastRunId, forecastRoutePinId, forecastAttemptId] }
      else: { not: { anyOf: [ { required: [forecastRunId] }, { required: [forecastRoutePinId] }, { required: [forecastAttemptId] } ] } }
      additionalProperties: false
    PromotedModelPackageManifest:
      type: object
      required: [manifestVersion, manifestDigest, retailerId, modelVersion, promotionGeneration, artifact, featureContract, runtimeProfile, trustPolicy, signer, signature, release, verification]
      properties:
        manifestVersion: { const: 1.0.0 }
        manifestDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
        retailerId: { type: string, format: uuid }
        modelVersion: { type: string }
        promotionGeneration: { type: integer, minimum: 1 }
        artifact:
          type: object
          required: [uri, type, sha256, sizeBytes]
          properties:
            uri: { type: string, format: uri }
            type: { const: skops.io }
            sha256: { type: string, pattern: '^[0-9a-f]{64}$' }
            sizeBytes: { type: integer, minimum: 1 }
          additionalProperties: false
        featureContract:
          type: object
          required: [version, schemaSha256]
          properties: { version: { type: string }, schemaSha256: { type: string, pattern: '^[0-9a-f]{64}$' } }
          additionalProperties: false
        runtimeProfile:
          type: object
          required: [profileId, pythonVersion, scikitLearnVersion, skopsVersion, os, architecture, requiredDevice]
          properties: { profileId: { type: string }, pythonVersion: { type: string }, scikitLearnVersion: { type: string }, skopsVersion: { type: string }, os: { type: string }, architecture: { type: string }, requiredDevice: { const: cpu } }
          additionalProperties: false
        trustPolicy:
          type: object
          required: [trustedTypeAllowlistVersion, trustedTypeAllowlistSha256]
          properties: { trustedTypeAllowlistVersion: { type: string }, trustedTypeAllowlistSha256: { type: string, pattern: '^[0-9a-f]{64}$' } }
          additionalProperties: false
        signer:
          type: object
          required: [keyId, algorithm]
          properties:
            keyId: { type: string }
            algorithm: { const: Ed25519 }
          additionalProperties: false
        signature:
          type: object
          required: [value, signedAt]
          properties:
            value: { type: string, contentEncoding: base64 }
            signedAt: { type: string, format: date-time }
          additionalProperties: false
        release:
          type: object
          required: [status, validFrom, overlapUntil]
          properties:
            status: { enum: [active, overlap, revoked] }
            validFrom: { type: string, format: date-time }
            overlapUntil: { type: [string, 'null'], format: date-time }
            supersedesModelVersion: { type: [string, 'null'] }
            revokedAt: { type: [string, 'null'], format: date-time }
            revocationReason: { type: [string, 'null'] }
          additionalProperties: false
        verification:
          type: object
          required: [signerStatus, signerStatusCheckedAt]
          properties:
            signerStatus: { enum: [active, verify-only-overlap, revoked] }
            signerStatusCheckedAt: { type: string, format: date-time }
          additionalProperties: false
      additionalProperties: false
    PromoteModelRequest:
      type: object
      required: [drainId, expectedPromotionGeneration, placementGeneration, recoveryGeneration, evaluationEvidenceDigest, package]
      properties:
        drainId: { type: string, format: uuid }
        expectedPromotionGeneration: { type: integer, minimum: 0 }
        placementGeneration: { type: integer, minimum: 1 }
        recoveryGeneration: { type: integer, minimum: 1 }
        evaluationEvidenceDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
        package: { $ref: '#/components/schemas/PromotedModelPackageManifest' }
      additionalProperties: false
    ForecastRoutePinRequest:
      type: object
      required: [forecastRunId, initialForecastAttemptId, runtimeCompatibility, expectedPromotionGeneration, placementGeneration, recoveryGeneration]
      properties:
        forecastRunId: { type: string, format: uuid }
        initialForecastAttemptId: { type: string, format: uuid }
        runtimeCompatibility: { type: string, minLength: 1 }
        expectedPromotionGeneration: { type: integer, minimum: 1 }
        placementGeneration: { type: integer, minimum: 1 }
        recoveryGeneration: { type: integer, minimum: 1 }
      additionalProperties: false
    ForecastRoutePin:
      type: object
      required: [pinId, forecastRunId, initialForecastAttemptId, promotionGeneration, placementGeneration, recoveryGeneration, modelReleaseId, promotionDecisionId, modelKind, evaluationSummaryReference, evaluationEvidenceDigest, inputSchemaDigest, outputSchemaDigest, activatedAt, package]
      properties:
        pinId: { type: string, format: uuid }
        forecastRunId: { type: string, format: uuid }
        initialForecastAttemptId: { type: string, format: uuid }
        promotionGeneration: { type: integer, minimum: 1 }
        placementGeneration: { type: integer, minimum: 1 }
        recoveryGeneration: { type: integer, minimum: 1 }
        modelReleaseId: { type: string, format: uuid }
        promotionDecisionId: { type: string, format: uuid }
        modelKind: { enum: [seasonalNaive, movingAverage, trained] }
        evaluationSummaryReference: { type: string, format: uri }
        evaluationEvidenceDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
        inputSchemaDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
        outputSchemaDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
        activatedAt: { type: string, format: date-time }
        package: { $ref: '#/components/schemas/PromotedModelPackageManifest' }
      additionalProperties: false
    ForecastRoutePinRelease:
      type: object
      required: [forecastRunId, placementGeneration, recoveryGeneration, terminalReason]
      properties:
        forecastRunId: { type: string, format: uuid }
        placementGeneration: { type: integer, minimum: 1 }
        recoveryGeneration: { type: integer, minimum: 1 }
        terminalReason: { enum: [completed, failed, cancelled, recovery-fenced] }
      additionalProperties: false
    ForecastRouteDrainRequest:
      type: object
      required: [expectedPromotionGeneration, placementGeneration, recoveryGeneration, purpose]
      properties:
        expectedPromotionGeneration: { type: integer, minimum: 0 }
        placementGeneration: { type: integer, minimum: 1 }
        recoveryGeneration: { type: integer, minimum: 1 }
        purpose: { enum: [promote, rollback] }
      additionalProperties: false
    ForecastRouteDrain:
      type: object
      required: [drainId, retailerId, expectedPromotionGeneration, placementGeneration, recoveryGeneration, purpose, status, deadlineAt, outstandingPinCount, evaluationRequestId, evaluationLeaseId]
      properties:
        drainId: { type: string, format: uuid }
        retailerId: { type: string, format: uuid }
        expectedPromotionGeneration: { type: integer, minimum: 0 }
        placementGeneration: { type: integer, minimum: 1 }
        recoveryGeneration: { type: integer, minimum: 1 }
        purpose: { enum: [promote, rollback] }
        status: { enum: [draining, committed, aborted, recovery-required] }
        deadlineAt: { type: string, format: date-time }
        outstandingPinCount: { type: integer, minimum: 0 }
        evaluationRequestId: { type: [string, 'null'], format: uuid }
        evaluationLeaseId: { type: [string, 'null'], format: uuid }
      additionalProperties: false
    ForecastRouteDrainAbort:
      type: object
      required: [expectedPromotionGeneration, placementGeneration, recoveryGeneration, reason]
      properties:
        expectedPromotionGeneration: { type: integer, minimum: 0 }
        placementGeneration: { type: integer, minimum: 1 }
        recoveryGeneration: { type: integer, minimum: 1 }
        reason: { type: string, minLength: 1, maxLength: 1000 }
      additionalProperties: false
    ForecastRouteChangeResult:
      type: object
      required: [decisionId, drainId, retailerId, modelReleaseId, promotionGeneration, evaluationRequestId, evaluationLeaseId, evaluationTerminalResultId, evaluationResultDigest, evaluationLeaseStatus, placementGeneration, recoveryGeneration]
      properties:
        decisionId: { type: string, format: uuid }
        drainId: { type: string, format: uuid }
        retailerId: { type: string, format: uuid }
        modelReleaseId: { type: string, format: uuid }
        promotionGeneration: { type: integer, minimum: 1 }
        evaluationRequestId: { type: string, format: uuid }
        evaluationLeaseId: { type: string, format: uuid }
        evaluationTerminalResultId: { type: string, format: uuid }
        evaluationResultDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
        evaluationLeaseStatus: { const: completed }
        placementGeneration: { type: integer, minimum: 1 }
        recoveryGeneration: { type: integer, minimum: 1 }
      additionalProperties: false
security:
  - modelLifecycleMachineToken: []
x-contract-fixtures:
  - name: pin-admission-valid
    schemaRef: '#/components/schemas/ForecastRoutePinRequest'
    expectedValid: true
    value: { forecastRunId: 00000000-0000-4000-8000-000000000103, initialForecastAttemptId: 00000000-0000-4000-8000-000000000105, runtimeCompatibility: cpu-sklearn-v1, expectedPromotionGeneration: 1, placementGeneration: 1, recoveryGeneration: 1 }
  - name: pin-admission-missing-run-invalid
    schemaRef: '#/components/schemas/ForecastRoutePinRequest'
    expectedValid: false
    value: { initialForecastAttemptId: 00000000-0000-4000-8000-000000000105, runtimeCompatibility: cpu-sklearn-v1, expectedPromotionGeneration: 1, placementGeneration: 1, recoveryGeneration: 1 }
  - name: batch-lease-valid
    schemaRef: '#/components/schemas/HeavyWorkLease'
    expectedValid: true
    value: { leaseId: 00000000-0000-4000-8000-000000000101, requestId: 00000000-0000-4000-8000-000000000102, workerId: forecast-worker-1, workType: batch-forecast, forecastRunId: 00000000-0000-4000-8000-000000000103, forecastRoutePinId: 00000000-0000-4000-8000-000000000104, forecastAttemptId: 00000000-0000-4000-8000-000000000105, acquiredAt: '2026-09-25T10:00:00Z', expiresAt: '2026-09-25T10:05:00Z', heartbeatAt: '2026-09-25T10:00:00Z', fencingToken: 17, status: active, placementGeneration: 1, recoveryGeneration: 1 }
  - name: batch-lease-missing-attempt-invalid
    schemaRef: '#/components/schemas/HeavyWorkLease'
    expectedValid: false
    value: { leaseId: 00000000-0000-4000-8000-000000000101, requestId: 00000000-0000-4000-8000-000000000102, workerId: forecast-worker-1, workType: batch-forecast, forecastRunId: 00000000-0000-4000-8000-000000000103, forecastRoutePinId: 00000000-0000-4000-8000-000000000104, acquiredAt: '2026-09-25T10:00:00Z', expiresAt: '2026-09-25T10:05:00Z', heartbeatAt: '2026-09-25T10:00:00Z', fencingToken: 17, status: active, placementGeneration: 1, recoveryGeneration: 1 }
  - name: nonbatch-lease-valid
    schemaRef: '#/components/schemas/HeavyWorkLease'
    expectedValid: true
    value: { leaseId: 00000000-0000-4000-8000-000000000201, requestId: 00000000-0000-4000-8000-000000000202, workerId: evaluator-1, workType: evaluation, acquiredAt: '2026-09-25T10:00:00Z', expiresAt: '2026-09-25T10:05:00Z', heartbeatAt: '2026-09-25T10:00:00Z', fencingToken: 18, status: active, placementGeneration: 1, recoveryGeneration: 1 }
  - name: nonbatch-lease-with-attempt-invalid
    schemaRef: '#/components/schemas/HeavyWorkLease'
    expectedValid: false
    value: { leaseId: 00000000-0000-4000-8000-000000000201, requestId: 00000000-0000-4000-8000-000000000202, workerId: evaluator-1, workType: evaluation, forecastAttemptId: 00000000-0000-4000-8000-000000000105, acquiredAt: '2026-09-25T10:00:00Z', expiresAt: '2026-09-25T10:05:00Z', heartbeatAt: '2026-09-25T10:00:00Z', fencingToken: 18, status: active, placementGeneration: 1, recoveryGeneration: 1 }
```

Every C07 call requires an authenticated identity with a narrow audience/scope and current retailer authority; route `retailerId` is context only. Idempotent mutations store the canonical request SHA-256 and return the original durable result for an exact replay or `409` for a changed payload. Model Lifecycle owns the global durable heavy-work scheduler and one global slot, plus retailer-local PostgreSQL lease/fence and route state. Request lifecycle is `queued → leased → completed|failed|cancelled|deadline-expired`; lease lifecycle is `active → released|completed|failed|cancelled|expired|superseded|recovery-fenced`. Release, expiry, supersession, cancellation and recovery fencing permanently invalidate the token; every later acquisition receives a strictly greater token. The global slot is not reassigned solely because its timer elapsed: U6 must observe an authoritative retailer-local terminal/fenced disposition first. If that database is unavailable, U6 blocks new global acquisitions until reconciliation; it never declares capacity safe from a cached lease view.

#### C07 shared-transaction finalization port (version 1)

The C07 REST `:complete` command is for U6-owned work with no separate authoritative owner publication. It is **not** U7's publication authority. U7 owns its publication rows; its owner-controlled PostgreSQL stored routine invokes the U6-owned `model_lifecycle.finalize_heavy_work_v1` function in the **same retailer-local database transaction**, then writes its owner rows, audit and outbox, and commits once. The port is versioned and callable only by the named U7 database service role with `EXECUTE` grants; the routine verifies the authenticated database role as well as the caller service argument. For `batch-forecast`, run ID, attempt ID and route pin ID are mandatory. U6 row-locks the request, retailer-local lease/fence, route pin and route-control guard; verifies the request's immutable `(retailerId, forecastRunId, forecastRoutePinId, initialForecastAttemptId)`, the lease's `(requestId, forecastRunId, forecastRoutePinId, forecastAttemptId)`, the pin's `(retailerId, forecastRunId, initialForecastAttemptId, promotionGeneration, placementGeneration, recoveryGeneration)`, the supplied attempt ID and the current lease identity, worker, work type, active status, unexpired database-clock deadline, token, generations, non-cancelled request and canonical payload. First acquisition must use the request's initial attempt ID; a subsequent acquisition requires a distinct attempt ID and an authoritative terminal/fenced prior lease. U7 verifies that attempt row and expected owner version in its own routine. U6 records one terminal result and closes the verified U6-owned pin under those locks, returning the result identity and pin-closure disposition. A changed-payload replay or failed binding raises a transaction-aborting conflict. An exact replay returns the committed result and `already-closed` pin disposition; the U7 owner routine may return success only after verifying its **own publication** with that result identity, digest, attempt ID and expected version already committed. Any failure in owner rows, audit, outbox, U6 pin closure or finalization rolls back all effects. A crash before commit leaves the lease and pin active; a crash after commit is recovered by reading the same result identity and owner pointer, without republishing. HTTP checks, a `:complete` call followed by owner commit, or an outbox publish before commit cannot satisfy this contract.

```yaml shared-schema
port: model_lifecycle.finalize_heavy_work_v1
transaction: caller-owned retailer-local PostgreSQL transaction; no autonomous commit
authorizedCallers: [forecasting-service]
arguments:
  required: [callerService, retailerId, workType, requestId, leaseId, workerId, fencingToken, placementGeneration, recoveryGeneration, resultDigest, operationId, idempotencyKey, expectedOwnerVersion]
  conditionalRequiredForBatchForecast: [forecastRunId, forecastAttemptId, forecastRoutePinId]
  forbiddenForOtherWorkTypes: [forecastRunId, forecastAttemptId, forecastRoutePinId]
  postgresTypes:
    callerService: text
    retailerId: uuid
    workType: text
    requestId: uuid
    leaseId: uuid
    workerId: text
    fencingToken: bigint
    placementGeneration: bigint
    recoveryGeneration: bigint
    resultDigest: text
    operationId: uuid
    idempotencyKey: text
    expectedOwnerVersion: bigint
    forecastRunId: uuid nullable
    forecastAttemptId: uuid nullable
    forecastRoutePinId: uuid nullable
result:
  required: [disposition, terminalResultId, resultDigest, closedPinId, pinClosureDisposition]
  postgresTypes: { disposition: text, terminalResultId: uuid, resultDigest: text, closedPinId: uuid nullable, pinClosureDisposition: text }
  disposition: [finalized, idempotent-replay]
  pinClosureDisposition: [closed, already-closed, not-applicable]
conflicts: [wrong-caller, wrong-retailer, wrong-work-type, wrong-worker, wrong-run, wrong-attempt, stale-lease, stale-token, expired-lease, stale-generation, cancelled-request, changed-payload-replay, wrong-route-pin, pin-already-closed-by-other-result]
locking: retailer request, lease/fence, route-pin and route-control rows when batch; serializes with expiry, revocation, recovery fencing and route drain
ownerCommit: same transaction writes owner publication pointer, outcomes/series when U7, audit and outbox; only U6 finalizer mutates U6 pin
```

U6's global scheduler reservation stays central to enforce the single heavy-work slot. Acquisition first durably reserves the central slot and monotonic token without exposing worker authority, then installs the matching retailer-local fence, then marks the central lease granted and returns it. If any step is uncertain, the slot stays reserved and no worker receives a new lease until reconciliation proves and fences the local state. Its retailer-local fence row is the authority for finalization; all transitions that revoke, expire, supersede or recovery-fence it acquire the same row lock as `finalize_heavy_work_v1`. A global slot cannot be granted without first durably installing its matching retailer-local fence; after finalization, U6 reconciles the global reservation from the committed retailer-local terminal result before reassigning the slot. On ambiguity or partition, acquisitions fail closed. U15 recovery must fence the retailer-local row before U6 reopens the global slot. Tenant split moves that retailer's fence, route and owner publication rows together to the destination database under the placement fence; no cross-database transaction is claimed. Application access remains through versioned stored routines/functions, never direct SQL against another unit's tables. The U6 schema owner alone migrates this port with Flyway; U1 packages its typed signature and positive/negative conformance fixtures.

#### C07 route admission and no-overlap promotion

`pins:admit` is the **only** way U7 starts a Forecast Run on a model release; the read-only resolver cannot authorize work. U7 allocates immutable `forecastRunId` and `initialForecastAttemptId` UUIDs before admission. U6 locks a retailer-local route-control row (created at retailer bootstrap even when no model is active, at generation zero) and in one transaction checks open state, current promotion/placement/recovery generation, package and signer validity, and an unused `(retailerId, forecastRunId, initialForecastAttemptId)` pin identity before inserting the durable pin and returning its exact package. A competing `drains:start` locks the same guard row, so either the pin precedes the drain and must be counted, or admission sees `draining` and returns `409`; there is no interval that admits an old-route run after drain begins. An exact idempotent replay returns the same pin, never a new one. U7 stores the pin and immutable model/input digests, then creates queued attempt 1 with the preallocated ID before submitting the batch request. The batch request persists those three IDs and U6 rejects any mismatch with its pin. The first lease acquires and updates that same queued attempt 1; a retry after an authoritative terminal/fenced first lease appends attempt 2 with a new ID before reacquisition. A request or acquisition replay never creates another attempt.

Promotion and rollback both create a durable drain for the old route **before** requesting an evaluation lease. First activation drains the generation-zero inactive guard with zero pins. The drain has a 60-minute overall attempt deadline; it blocks new old-route pins while existing pins finish or are individually proven terminal/fenced through the shared-transaction finalizer or the authorized `pins/{pinId}:release` command. A release is allowed only after U7 has committed a terminal nonpublication disposition and proves the pin owner/generations; elapsed time alone never removes a pin. The promoter waits for zero outstanding pins, then obtains the sole evaluation lease and durably associates its request/lease IDs with the drain before performing evaluation, signing and package verification. The evaluation request's own deadline never extends the earlier drain deadline. The final promotion/rollback transaction locks the same route-control guard and U6 evaluation lease/fence rows and rechecks drain ID and unexpired deadline, zero pins, expected generations, evaluation fence/deadline, package/signer validity and idempotency. In that **one retailer-local transaction**, it records an immutable evaluation terminal result (`completed`, result ID and evidence digest), marks the evaluation lease completed, switches the route to the new generation, marks the drain committed, and records audit/outbox. It never calls the separate `:complete` command first. An exact replay reads and returns that committed decision and terminal result; a changed payload conflicts. A stale or unavailable check aborts without switching or terminalizing the lease.

On failed evaluation or package verification, U6 records `failed` or `cancelled` for the evaluation lease with its current fence in a retailer-local transaction; on expiry, supersession or recovery it records an authoritative `expired` or `recovery-fenced` disposition under the same fence lock. An abort after lease acquisition first proves one of these terminal/fenced outcomes before reopening a valid old route; an abort before acquisition has no evaluation lease to dispose. On 60-minute deadline, drain aborts only if the old route and signer remain valid; otherwise route remains unavailable for explicit recovery. Restart reads the durable route decision and local lease result: precommit crash leaves the old route and lease/drain authoritative, so U6 resumes or fences it; postcommit crash returns the same decision. U6 reconciles the central slot **only after** reading the retailer-local terminal/fenced lease/result and matching request, token and generation; ambiguous or unreachable local state keeps the slot reserved. Restart reconstructs drain and pins from durable state, reconciles terminal runs, and never assumes an uncertain pin is closed. V1 admits no previous-release overlap: already pinned old runs drain before the switch and new runs use only the new route.

`manifestDigest` is SHA-256 of the UTF-8 RFC 8785 canonical representation of the immutable manifest with `manifestDigest`, `signature`, and the live `verification` projection omitted; the Ed25519 signature covers those same canonical bytes. Forecasting verifies the manifest and artifact digests, signature, authoritative current signer status, `skops.io` type, trust-policy version/digest, feature schema, runtime profile, release state and validity window before deserializing. Signer status comes from authoritative trust metadata: `active` may sign/verify, `verify-only-overlap` may verify retained packages only, and `revoked` invalidates associated packages immediately. V1 permits exactly one active route and no previous-release overlap; the overlap fields remain in the manifest schema for future protocol versions but must be null/unused in v1. Rollback creates a new promotion generation after the same drain, evaluation and fence checks and requires the retained package to pass every check. Any failure returns explicit `model-unavailable` and prevents forecast publication; no alternate release, baseline, artifact type or provider is silently substituted. All failures use RFC 9457 with stable codes and correlation IDs: `401` unauthenticated, `403` retailer/worker/operator authority denied, `404` hidden resource or no active compatible release, `409` idempotency/generation/fence/finalizer conflict, `410` expired/cancelled/revoked/overlap-ended, `422` unsupported work or incompatible package, and `503` authoritative lease, trust metadata or artifact storage unavailable.

C07 conformance fixtures must prove: the `x-contract-fixtures` values validate against their named OpenAPI 3.1 schemas with the stated positive/negative results, including a valid pin admission and both batch/nonbatch lease branches; a pin, request, first queued attempt and first lease share immutable IDs, while a terminal retry uses a distinct attempt ID; mismatched run/pin/attempt IDs and an attempt-2 claim on a first lease conflict; expiry, supersession and recovery fencing racing U7 finalization yield either one fully committed current result or no owner result/audit/outbox/pin closure; identical replay returns the same result and `already-closed` pin while changed-digest replay conflicts; a crash before commit leaves the lease and pin active and a crash after commit is read back once; U6 alone closes its pin under route/lease row locks, with a pin-close/drain race yielding exactly one winner; global slot reassignment waits for tenant-local terminal proof even across database unavailability; pin/admit racing drain has exactly one winner and never admits an old-route pin after drain; promotion and rollback each atomically complete the evaluation lease and switch route, exact replay returns the same decision, and pre/postcommit crashes cannot free the slot before local proof; failed evaluation, abort and recovery fencing each produce a local terminal/fenced result before central reconciliation; promotion/rollback reject nonzero or uncertain pins, stale generations and expired evaluation leases; drain timeout and restart never clear a pin by time alone. U1 publishes these as positive/negative fixtures for U6/U7 and U15 recovery integration.

### C08 — Inventory and receipt posting for Planning and Purchasing

U4 and U8 remain separate construction and schema owners but ship in one v1 Retail Operations process. U8 authorizes and validates purchasing transitions; it invokes U4 through a typed in-process port inside the caller-owned transaction. U4 routines alone mutate stock and dated inbound commitments. Neither module queries the other's tables, and no HTTP or RabbitMQ hop splits the invariant.

```yaml shared-schema
kind: in-process-port
name: RetailOperationsInventoryPort
version: 1.0.0
deploymentBoundary: retail-operations-v1
transaction:
  owner: planning-purchasing-command-handler
  database: shared-postgresql-instance
  atomicEffects:
    - purchasing-state-and-idempotency-result
    - inventory-inbound-commitment
    - stock-movement-on-receipt
    - authoritative-audit-and-outbox
  crossSchemaSql: prohibited
operations:
  getInventorySnapshot:
    input: [retailerId, placementGeneration, asOf]
    output: [inventoryVersion, movementWatermark, positions, datedInboundCommitments]
  createApprovedCommitments:
    input: [retailerId, orderId, expectedOrderVersion, approvedLines]
    invariant: all-lines-or-none
  cancelOpenCommitments:
    input: [retailerId, orderId, expectedOrderVersion]
    invariant: rejected-after-any-receipt
  recordReceipt:
    input: [retailerId, orderId, expectedOrderVersion, idempotencyKey, receiptLines]
    invariant: cumulative-receipts-never-exceed-approved-quantity
errors:
  stale-authority: forbidden
  stale-placement-generation: conflict
  stale-order-version: conflict
  idempotency-hash-mismatch: conflict
  over-receipt: conflict
  validation-failed: unprocessable
```

### C09 — Accepted supplier terms for Planning and Purchasing

```yaml
openapi: 3.1.2
info: { title: Supplier Knowledge Planning-Purchasing API, version: 1.0.0 }
paths:
  /api/v1/retailers/{retailerId}/products/{productId}/accepted-terms:
    get:
      operationId: getAcceptedSupplierTerms
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: path, name: productId, required: true, schema: { type: string, format: uuid } }
        - { in: query, name: effectiveAt, required: true, schema: { type: string, format: date-time } }
      responses:
        '200': { description: 'Current terms, source revision, page citations and currency' }
        '404': { description: No accepted terms exist for this retailer product }
        '409': { description: Requested source revision is stale }
```

### C10 — Forecast evidence for Planning and Purchasing

```yaml
openapi: 3.1.2
info: { title: Forecasting Planning-Purchasing API, version: 1.0.0 }
paths:
  /api/v1/retailers/{retailerId}/forecasts/{forecastRunId}:
    get:
      operationId: getForecastRun
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: path, name: forecastRunId, required: true, schema: { type: string, format: uuid } }
      responses:
        '200':
          description: Inspectable historical run outcome and product evidence; stale, failed, partial and non-current runs remain readable
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ForecastRunHistoryResponse' }
              examples:
                succeeded:
                  value:
                    retailerId: 00000000-0000-4000-8000-000000000001
                    forecastRunId: 00000000-0000-4000-8000-000000000011
                    retailerLocalDate: '2026-09-01'
                    revision: 1
                    lifecycleStatus: succeeded
                    publicationStatus: current
                    isCurrent: true
                    freshnessStatus: fresh
                    freshnessBoundary: '2026-09-02T06:00:00Z'
                    generatedAt: '2026-09-01T02:05:00Z'
                    requestedProductIds: [00000000-0000-4000-8000-000000000021]
                    coveredProductIds: [00000000-0000-4000-8000-000000000021]
                    unavailableProductIds: []
                    provenance: { sourceRevision: source-1, calendarVersion: calendar-1, modelVersion: model-1, configurationVersion: config-1, inputSnapshotDigest: 'sha256:1111111111111111111111111111111111111111111111111111111111111111', modelManifestDigest: 'sha256:2222222222222222222222222222222222222222222222222222222222222222', configurationDigest: 'sha256:3333333333333333333333333333333333333333333333333333333333333333', placementGeneration: 1, recoveryGeneration: 1, routePinId: 00000000-0000-4000-8000-000000000031 }
                    products:
                      - productId: 00000000-0000-4000-8000-000000000021
                        coverageStatus: covered
                        reason: produced
                        series: [{ date: '2026-09-01', demand: 2 }, { date: '2026-09-02', demand: 3 }, { date: '2026-09-03', demand: 4 }, { date: '2026-09-04', demand: 2 }, { date: '2026-09-05', demand: 3 }, { date: '2026-09-06', demand: 4 }, { date: '2026-09-07', demand: 2 }, { date: '2026-09-08', demand: 3 }, { date: '2026-09-09', demand: 4 }, { date: '2026-09-10', demand: 2 }, { date: '2026-09-11', demand: 3 }, { date: '2026-09-12', demand: 4 }, { date: '2026-09-13', demand: 2 }, { date: '2026-09-14', demand: 3 }, { date: '2026-09-15', demand: 4 }, { date: '2026-09-16', demand: 2 }, { date: '2026-09-17', demand: 3 }, { date: '2026-09-18', demand: 4 }, { date: '2026-09-19', demand: 2 }, { date: '2026-09-20', demand: 3 }, { date: '2026-09-21', demand: 4 }, { date: '2026-09-22', demand: 2 }, { date: '2026-09-23', demand: 3 }, { date: '2026-09-24', demand: 4 }, { date: '2026-09-25', demand: 2 }, { date: '2026-09-26', demand: 3 }, { date: '2026-09-27', demand: 4 }, { date: '2026-09-28', demand: 2 }]
                staleFailed:
                  value:
                    retailerId: 00000000-0000-4000-8000-000000000001
                    forecastRunId: 00000000-0000-4000-8000-000000000012
                    retailerLocalDate: '2026-08-31'
                    revision: 1
                    lifecycleStatus: failed
                    publicationStatus: unpublished
                    isCurrent: false
                    freshnessStatus: stale
                    freshnessBoundary: '2026-09-01T06:00:00Z'
                    generatedAt: null
                    requestedProductIds: [00000000-0000-4000-8000-000000000022]
                    coveredProductIds: []
                    unavailableProductIds: [00000000-0000-4000-8000-000000000022]
                    provenance: { sourceRevision: source-0, calendarVersion: calendar-1, modelVersion: model-1, configurationVersion: config-1, inputSnapshotDigest: 'sha256:4444444444444444444444444444444444444444444444444444444444444444', modelManifestDigest: 'sha256:2222222222222222222222222222222222222222222222222222222222222222', configurationDigest: 'sha256:3333333333333333333333333333333333333333333333333333333333333333', placementGeneration: 1, recoveryGeneration: 1, routePinId: 00000000-0000-4000-8000-000000000032 }
                    products: [{ productId: 00000000-0000-4000-8000-000000000022, coverageStatus: unavailable, reason: failed-run }]
        '403': { description: Current retailer or product read authority denied }
        '404': { description: Forecast run is absent or outside the retailer context }
  /api/v1/retailers/{retailerId}/forecasts:latest:
    post:
      operationId: getLatestUsableForecast
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
      requestBody:
        required: true
        content: { application/json: { schema: { $ref: '#/components/schemas/ForecastProductSetRequest' } } }
      responses:
        '200': { description: Current publication with exact per-product coverage, content: { application/json: { schema: { $ref: '#/components/schemas/ForecastCoverageResponse' } } } }
        '403': { description: One or more products are outside current retailer authority; no foreign existence disclosure }
        '422': { description: 'Empty, duplicate, oversized or malformed product set' }
        '503': { description: Authoritative publication store unavailable; no silent model substitution }
components:
  schemas:
    ForecastRunHistoryResponse:
      type: object
      required: [retailerId, forecastRunId, retailerLocalDate, revision, lifecycleStatus, publicationStatus, isCurrent, freshnessStatus, freshnessBoundary, generatedAt, requestedProductIds, coveredProductIds, unavailableProductIds, provenance, products]
      properties:
        retailerId: { type: string, format: uuid }
        forecastRunId: { type: string, format: uuid }
        retailerLocalDate: { type: string, format: date }
        revision: { type: integer, minimum: 1 }
        lifecycleStatus: { enum: [admitted, queued, running, succeeded, partiallySucceeded, failed] }
        publicationStatus: { enum: [unpublished, awaitingAcknowledgement, current, rejected, superseded] }
        isCurrent: { type: boolean }
        freshnessStatus: { enum: [fresh, stale, unavailable] }
        freshnessBoundary: { type: [string, 'null'], format: date-time }
        generatedAt: { type: [string, 'null'], format: date-time }
        requestedProductIds: { type: array, minItems: 1, uniqueItems: true, items: { type: string, format: uuid } }
        coveredProductIds: { type: array, uniqueItems: true, items: { type: string, format: uuid } }
        unavailableProductIds: { type: array, uniqueItems: true, items: { type: string, format: uuid } }
        provenance: { $ref: '#/components/schemas/ForecastRunProvenance' }
        products: { type: array, minItems: 1, items: { $ref: '#/components/schemas/ForecastRunHistoryProduct' } }
      additionalProperties: false
    ForecastRunProvenance:
      type: object
      required: [sourceRevision, calendarVersion, modelVersion, configurationVersion, inputSnapshotDigest, modelManifestDigest, configurationDigest, placementGeneration, recoveryGeneration, routePinId]
      properties:
        sourceRevision: { type: [string, 'null'] }
        calendarVersion: { type: [string, 'null'] }
        modelVersion: { type: [string, 'null'] }
        configurationVersion: { type: [string, 'null'] }
        inputSnapshotDigest: { type: [string, 'null'], pattern: '^sha256:[0-9a-f]{64}$' }
        modelManifestDigest: { type: [string, 'null'], pattern: '^sha256:[0-9a-f]{64}$' }
        configurationDigest: { type: [string, 'null'], pattern: '^sha256:[0-9a-f]{64}$' }
        placementGeneration: { type: [integer, 'null'], minimum: 1 }
        recoveryGeneration: { type: [integer, 'null'], minimum: 1 }
        routePinId: { type: [string, 'null'], format: uuid }
      additionalProperties: false
    ForecastRunHistoryProduct:
      type: object
      required: [productId, coverageStatus, reason]
      if: { properties: { coverageStatus: { const: covered } }, required: [coverageStatus] }
      then: { properties: { reason: { const: produced } }, required: [series] }
      else: { properties: { reason: { not: { const: produced } } }, not: { required: [series] } }
      properties:
        productId: { type: string, format: uuid }
        coverageStatus: { enum: [covered, unavailable] }
        reason: { enum: [produced, no-series, partial-series, failed-run, model-unavailable, source-incompatible, recovery-blocked] }
        series:
          type: array
          minItems: 28
          maxItems: 28
          items:
            type: object
            required: [date, demand]
            properties: { date: { type: string, format: date }, demand: { type: number, minimum: 0 } }
            additionalProperties: false
      additionalProperties: false
    ForecastProductSetRequest:
      type: object
      required: [productIds]
      properties:
        productIds: { type: array, minItems: 1, maxItems: 100, uniqueItems: true, items: { type: string, format: uuid } }
      additionalProperties: false
    ForecastCoverageResponse:
      type: object
      required: [requestedProductIds, coveredProductIds, unavailableProductIds, publicationStatus, freshnessStatus, freshnessBoundary, freshnessReason, currentPublicationId, forecastRunId, latestRunId, generatedAt, sourceRevision, calendarVersion, modelVersion, configurationVersion, inputSnapshotDigest, modelManifestDigest, configurationDigest, placementGeneration, products]
      if: { properties: { coveredProductIds: { minItems: 1 } }, required: [coveredProductIds] }
      then:
        properties:
          freshnessStatus: { const: fresh }
          freshnessBoundary: { type: string, format: date-time }
          freshnessReason: { const: within-window }
          currentPublicationId: { type: string, format: uuid }
          forecastRunId: { type: string, format: uuid }
          generatedAt: { type: string, format: date-time }
          sourceRevision: { type: string }
          calendarVersion: { type: string }
          modelVersion: { type: string }
          configurationVersion: { type: string }
          inputSnapshotDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
          modelManifestDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
          configurationDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
          placementGeneration: { type: integer, minimum: 1 }
      properties:
        requestedProductIds: { type: array, minItems: 1, maxItems: 100, uniqueItems: true, items: { type: string, format: uuid } }
        coveredProductIds: { type: array, uniqueItems: true, items: { type: string, format: uuid } }
        unavailableProductIds: { type: array, uniqueItems: true, items: { type: string, format: uuid } }
        publicationStatus: { enum: [complete, partial, failed, stale, unpublished, unavailable] }
        freshnessStatus: { enum: [fresh, stale, unavailable] }
        freshnessBoundary: { type: [string, 'null'], format: date-time }
        freshnessReason: { enum: [within-window, due-time-passed, source-stale, model-stale, configuration-stale, recovery-blocked, no-publication] }
        currentPublicationId: { type: [string, 'null'], format: uuid }
        forecastRunId: { type: [string, 'null'], format: uuid }
        latestRunId: { type: [string, 'null'], format: uuid }
        generatedAt: { type: [string, 'null'], format: date-time }
        sourceRevision: { type: [string, 'null'] }
        calendarVersion: { type: [string, 'null'] }
        modelVersion: { type: [string, 'null'] }
        configurationVersion: { type: [string, 'null'] }
        inputSnapshotDigest: { type: [string, 'null'], pattern: '^sha256:[0-9a-f]{64}$' }
        modelManifestDigest: { type: [string, 'null'], pattern: '^sha256:[0-9a-f]{64}$' }
        configurationDigest: { type: [string, 'null'], pattern: '^sha256:[0-9a-f]{64}$' }
        placementGeneration: { type: [integer, 'null'], minimum: 1 }
        products: { type: array, minItems: 1, maxItems: 100, items: { $ref: '#/components/schemas/ForecastProductCoverage' } }
      additionalProperties: false
    ForecastProductCoverage:
      type: object
      required: [productId, coverageStatus, reason]
      if: { properties: { coverageStatus: { const: covered } }, required: [coverageStatus] }
      then: { properties: { reason: { const: usable } }, required: [series] }
      else: { properties: { reason: { not: { const: usable } } }, not: { required: [series] } }
      properties:
        productId: { type: string, format: uuid }
        coverageStatus: { enum: [covered, unavailable] }
        reason: { enum: [usable, no-publication, no-series, partial-series, failed-run, stale, model-unavailable, source-incompatible, recovery-blocked] }
        series:
          type: array
          minItems: 28
          maxItems: 28
          items:
            type: object
            required: [date, demand]
            properties:
              date: { type: string, format: date }
              demand: { type: number, minimum: 0 }
            additionalProperties: false
      additionalProperties: false
```

For C10, the server authorizes every requested product before returning any coverage; `403` is indistinguishable for absent and foreign IDs. On `200`, the three ID sets are exact: requested equals the disjoint union of covered and unavailable, and `products` contains exactly one entry per requested ID. `covered` requires `reason: usable`, a current fresh compatible reconciled publication, complete provenance and exactly 28 dated values; `unavailable` forbids `series` and has a non-usable reason. A stale, failed, unpublished or unavailable result remains `200` with explicit zero coverage when the authoritative store is reachable. U8 cannot convert a missing product to zero demand or a stale forecast to usable evidence. This POST is a bounded idempotent read; no deployed v1 latest-forecast GET consumer exists. The separate run-history GET is an inspectable historical read: its exact requested/covered/unavailable partition describes what that run produced, regardless of whether its publication is now current or fresh. Historical `covered` means a complete 28-day series was produced, **not** that U8 may use it for a new review. U8 may use only the `forecasts:latest` response for current planning evidence. For a failed run, history remains `200` with its terminal outcome, unavailable products and retained nullable provenance; absence of a run remains `404`.

C10 fixtures include a fully covered two-product request, a mixed covered/unavailable request, all-stale/all-unpublished outcomes, duplicate and 101-product rejection, foreign-product denial, and rejection of 27/29-value or series-on-unavailable responses. The run-history fixtures validate the typed successful and stale/failed examples, exact product partition, 28-value historical series, null provenance before admission, and retained provenance for terminal failures. Consumer validation rejects overlapping or missing coverage IDs and missing provenance on covered entries.

## Assistant tool contracts

Every U9 tool call carries the authenticated actor and retailer context supplied by the server-side session. The provider rechecks current membership, role, placement generation, and resource ownership. LLM output is untrusted input to typed tools and never grants purchasing authority.

### C11 — Inventory and demand tools

```yaml
openapi: 3.1.2
info: { title: Retail Data Assistant Tools API, version: 1.0.0 }
paths:
  /api/v1/retailers/{retailerId}/assistant-tools/inventory-query:
    parameters:
      - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
    post:
      operationId: queryInventoryForAssistant
      responses:
        '200': { description: Bounded inventory facts with source versions and evidence identifiers }
        '403': { description: Current user lacks retailer or resource authority }
  /api/v1/retailers/{retailerId}/assistant-tools/demand-query:
    parameters:
      - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
    post:
      operationId: queryDemandForAssistant
      responses:
        '200': { description: Bounded demand facts and provenance through an allowed cutoff }
        '422': { description: 'Requested scope, time range or aggregation is unsupported' }
```

### C12 — Supplier retrieval and comparison tools

```yaml
openapi: 3.1.2
info: { title: Supplier Knowledge Assistant Tools API, version: 1.0.0 }
paths:
  /api/v1/retailers/{retailerId}/assistant-tools/supplier-search:
    parameters:
      - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
    post:
      operationId: searchSupplierEvidence
      responses:
        '200': { description: 'Authorized chunks with document, source revision, page and score citations' }
        '409': { description: 'Retrieval index is stale, rebuilding or incompatible' }
  /api/v1/retailers/{retailerId}/assistant-tools/compare-suppliers:
    parameters:
      - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
    post:
      operationId: compareAcceptedSupplierTerms
      responses:
        '200': { description: Deterministic comparison of accepted terms with citations }
        '422': { description: Comparable accepted terms are incomplete }
```

### C13 — Forecast status and evidence tools

```yaml
openapi: 3.1.2
info: { title: Forecasting Assistant Tools API, version: 1.0.0 }
paths:
  /api/v1/retailers/{retailerId}/assistant-tools/forecast-status:
    post:
      operationId: getForecastStatusForAssistant
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
      requestBody:
        required: true
        content: { application/json: { schema: { $ref: '#/components/schemas/AssistantForecastProductSet' } } }
      responses:
        '200': { description: 'Exact product coverage, run state, freshness and provenance', content: { application/json: { schema: { $ref: '#/components/schemas/AssistantForecastStatusCoverage' } } } }
        '403': { description: Product authority denied without foreign existence disclosure }
        '422': { description: Invalid product set }
        '503': { description: Authoritative store unavailable; assistant must disclose unavailability }
  /api/v1/retailers/{retailerId}/assistant-tools/forecast-evidence:
    post:
      operationId: getForecastEvidenceForAssistant
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
      requestBody:
        required: true
        content: { application/json: { schema: { $ref: '#/components/schemas/AssistantForecastProductSet' } } }
      responses:
        '200': { description: Bounded series and model/data/configuration citations with exact coverage, content: { application/json: { schema: { $ref: '#/components/schemas/AssistantForecastEvidenceCoverage' } } } }
        '403': { description: Product authority denied without foreign existence disclosure }
        '422': { description: Invalid product set }
        '503': { description: Authoritative store unavailable; assistant must disclose unavailability }
components:
  schemas:
    AssistantForecastProductSet:
      type: object
      required: [productIds]
      properties:
        productIds: { type: array, minItems: 1, maxItems: 100, uniqueItems: true, items: { type: string, format: uuid } }
      additionalProperties: false
    AssistantForecastCoverage:
      type: object
      required: [requestedProductIds, coveredProductIds, unavailableProductIds, publicationStatus, freshnessStatus, freshnessBoundary, freshnessReason, currentPublicationId, forecastRunId, latestRunId, generatedAt, sourceRevision, calendarVersion, modelVersion, configurationVersion, inputSnapshotDigest, modelManifestDigest, configurationDigest, placementGeneration, products]
      if: { properties: { coveredProductIds: { minItems: 1 } }, required: [coveredProductIds] }
      then:
        properties:
          freshnessStatus: { const: fresh }
          freshnessBoundary: { type: string, format: date-time }
          freshnessReason: { const: within-window }
          currentPublicationId: { type: string, format: uuid }
          forecastRunId: { type: string, format: uuid }
          generatedAt: { type: string, format: date-time }
          sourceRevision: { type: string }
          calendarVersion: { type: string }
          modelVersion: { type: string }
          configurationVersion: { type: string }
          inputSnapshotDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
          modelManifestDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
          configurationDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
          placementGeneration: { type: integer, minimum: 1 }
      properties:
        requestedProductIds: { type: array, minItems: 1, maxItems: 100, uniqueItems: true, items: { type: string, format: uuid } }
        coveredProductIds: { type: array, uniqueItems: true, items: { type: string, format: uuid } }
        unavailableProductIds: { type: array, uniqueItems: true, items: { type: string, format: uuid } }
        publicationStatus: { enum: [complete, partial, failed, stale, unpublished, unavailable] }
        freshnessStatus: { enum: [fresh, stale, unavailable] }
        freshnessBoundary: { type: [string, 'null'], format: date-time }
        freshnessReason: { enum: [within-window, due-time-passed, source-stale, model-stale, configuration-stale, recovery-blocked, no-publication] }
        currentPublicationId: { type: [string, 'null'], format: uuid }
        forecastRunId: { type: [string, 'null'], format: uuid }
        latestRunId: { type: [string, 'null'], format: uuid }
        generatedAt: { type: [string, 'null'], format: date-time }
        sourceRevision: { type: [string, 'null'] }
        calendarVersion: { type: [string, 'null'] }
        modelVersion: { type: [string, 'null'] }
        configurationVersion: { type: [string, 'null'] }
        inputSnapshotDigest: { type: [string, 'null'], pattern: '^sha256:[0-9a-f]{64}$' }
        modelManifestDigest: { type: [string, 'null'], pattern: '^sha256:[0-9a-f]{64}$' }
        configurationDigest: { type: [string, 'null'], pattern: '^sha256:[0-9a-f]{64}$' }
        placementGeneration: { type: [integer, 'null'], minimum: 1 }
        products: { type: array, minItems: 1, maxItems: 100, items: { $ref: '#/components/schemas/AssistantForecastProductCoverage' } }
      additionalProperties: false
    AssistantForecastStatusCoverage:
      allOf:
        - { $ref: '#/components/schemas/AssistantForecastCoverage' }
        - properties:
            products:
              items:
                if: { properties: { coverageStatus: { const: covered } }, required: [coverageStatus] }
                then: { properties: { reason: { const: usable } }, not: { required: [series] } }
                else: { properties: { reason: { not: { const: usable } } }, not: { required: [series] } }
    AssistantForecastEvidenceCoverage:
      allOf:
        - { $ref: '#/components/schemas/AssistantForecastCoverage' }
        - properties:
            products:
              items:
                if: { properties: { coverageStatus: { const: covered } }, required: [coverageStatus] }
                then: { properties: { reason: { const: usable } }, required: [series] }
                else: { properties: { reason: { not: { const: usable } } }, not: { required: [series] } }
    AssistantForecastProductCoverage:
      type: object
      required: [productId, coverageStatus, reason]
      properties:
        productId: { type: string, format: uuid }
        coverageStatus: { enum: [covered, unavailable] }
        reason: { enum: [usable, no-publication, no-series, partial-series, failed-run, stale, model-unavailable, source-incompatible, recovery-blocked] }
        series:
          type: array
          minItems: 28
          maxItems: 28
          items:
            type: object
            required: [date, demand]
            properties:
              date: { type: string, format: date }
              demand: { type: number, minimum: 0 }
            additionalProperties: false
      additionalProperties: false
```

C13 is a server-side typed tool, not a model-selected arbitrary query. U9 supplies 1–100 distinct product IDs; U7 rechecks retailer and per-product authority. On `200`, requested IDs equal the disjoint union of covered/unavailable IDs and exactly one product entry exists per requested ID. A covered entry has `reason: usable`, complete provenance and exactly 28 dated values when evidence is requested; an unavailable entry has a non-usable reason and no `series`. The status tool omits series for every entry. Stale, failed, unpublished and model-unavailable outcomes are explicit data, not invented zero-demand forecasts; U9 cites them as limitations.

C13 fixtures mirror C10's exact-set, length, duplicate, oversized and foreign-product cases, plus status-with-series rejection, evidence-with-27/29-values rejection and stale/unavailable citation behavior.

### C14 — Review request and draft proposal tools

U9 can request one of the three retailer-local manual review allowances or create/edit a draft through U8. Approval, rejection, cancellation, and receipt commands are deliberately absent.

```yaml
openapi: 3.1.2
info: { title: Planning-Purchasing Assistant Tools API, version: 1.0.0 }
paths:
  /api/v1/retailers/{retailerId}/assistant-tools/reviews:request:
    parameters:
      - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
    post:
      operationId: requestManualReviewForAssistant
      parameters:
        - { in: header, name: Idempotency-Key, required: true, schema: { type: string } }
      responses:
        '202': { description: 'Review accepted with job ID, remaining allowance and reset time' }
        '409': { description: A review is already active or idempotency payload differs }
        '429': { description: Three accepted manual requests used for the retailer-local day }
  /api/v1/retailers/{retailerId}/assistant-tools/purchase-drafts:
    parameters:
      - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
    post:
      operationId: createPurchaseDraftForAssistant
      parameters:
        - { in: header, name: Idempotency-Key, required: true, schema: { type: string } }
      responses:
        '201': { description: Governed draft created; no order is submitted or approved }
        '403': { description: Current actor lacks planner authority }
        '422': { description: Proposed lines or evidence failed deterministic validation }
```

## Audit and messaging contract

### C15 — Authoritative audit events to Audit Evidence

U4-U9 and U15 write authoritative tenant audit and outbox rows in the same transaction as each accepted business or recovery mutation. U3 writes every security-relevant identity audit record and exactly one outbox row in one transaction, including pre-authentication denials that have no retailer context. Denials are never mislabeled as accepted business mutations. U3 emits retailerless outcomes only as `identity.global.audit.recorded` through the global C01 schema and a separate global route; the tenant-scoped `identity.audit.recorded` type remains available only when a real retailer and placement generation exist. U14 supplies reusable confirm, retry, dead-letter, replay, payload-limit and telemetry mechanics to its approved consumers. U3 and U4 are bootstrap publishers that do not depend on U14 in the approved unit DAG; they implement the same C01/C15/C23 wire, authenticated-producer, delivery and conformance rules through service-local adapters owned by U3/U4. U10 records its inbox and projection checkpoint before acknowledging. Delivery is at-least-once, so consumers deduplicate by `messageId`. Retries are bounded and dead letters require an audited replay command. Failure of a non-authoritative operational diagnostic log cannot block business work; failure to commit a required authoritative audit/outbox pair does fail its mutation closed.

```yaml
asyncapi: 3.0.0
info:
  title: StockSense Authoritative Audit Events
  version: 1.0.0
defaultContentType: application/json
servers:
  localRabbitMq:
    host: rabbitmq.stocksense.svc.cluster.local:5672
    protocol: amqp
channels:
  auditEvents:
    address: stocksense.audit.v1
    messages:
      auditEvent:
        name: AuditEventV1
        title: Immutable authoritative business audit event
        payload:
          schemaFormat: 'application/schema+json;version=draft-2020-12'
          schema:
            allOf:
              - $ref: 'https://contracts.stocksense.local/common/v1/message-envelope.schema.json'
              - type: object
                properties:
                  messageType:
                    enum:
                      - identity.audit.recorded
                      - tenant.audit.recorded
                      - inventory.audit.recorded
                      - demand.audit.recorded
                      - supplier.audit.recorded
                      - model.audit.recorded
                      - forecast.audit.recorded
                      - replenishment.audit.recorded
                      - purchasing.audit.recorded
                      - assistant.audit.recorded
                      - recovery.audit.recorded
                  schemaVersion: { const: 1.0.0 }
                  data:
                    type: object
                    required: [action, resourceType, resourceId, outcome]
                    properties:
                      action: { type: string }
                      resourceType: { type: string }
                      resourceId: { type: string }
                      outcome: { enum: [accepted, denied, failed] }
                      beforeVersion: { type: [string, 'null'] }
                      afterVersion: { type: [string, 'null'] }
  globalIdentityAuditEvents:
    address: stocksense.identity.audit.global.v1
    messages:
      globalIdentityAuditEvent:
        name: GlobalIdentityAuditEventV1
        title: Immutable retailerless identity-security audit event
        payload:
          schemaFormat: 'application/schema+json;version=draft-2020-12'
          schema:
            allOf:
              - $ref: 'https://contracts.stocksense.local/common/v1/global-identity-audit-envelope.schema.json'
              - type: object
                properties:
                  messageType: { const: identity.global.audit.recorded }
                  schemaVersion: { const: 1.0.0 }
                  data:
                    type: object
                    required: [action, resourceType, resourceId, outcome, reasonCode]
                    properties:
                      action: { type: string, minLength: 1 }
                      resourceType: { type: string, minLength: 1 }
                      resourceId: { type: string, minLength: 1 }
                      outcome: { enum: [accepted, denied, failed] }
                      reasonCode: { type: string, minLength: 1 }
                      beforeVersion: { type: [string, 'null'] }
                      afterVersion: { type: [string, 'null'] }
                    additionalProperties: false
operations:
  publishAuditEvent:
    action: send
    channel: { $ref: '#/channels/auditEvents' }
  projectAuditEvent:
    action: receive
    channel: { $ref: '#/channels/auditEvents' }
  publishGlobalIdentityAuditEvent:
    action: send
    channel: { $ref: '#/channels/globalIdentityAuditEvents' }
  projectGlobalIdentityAuditEvent:
    action: receive
    channel: { $ref: '#/channels/globalIdentityAuditEvents' }
x-stocksense-delivery:
  guarantee: at-least-once
  publisherConfirm: required
  acknowledgeAfter: inbox-and-projection-checkpoint-commit
  maxTotalDeliveries: 5
  attemptCounting: initial-delivery-is-attempt-1
  backoffSecondsForAttempts2Through5: [1, 2, 4, 8]
  backoffFormula: min-2-power-attempt-minus-2-and-30-seconds-no-jitter
  deadLetterAddresses:
    tenant: stocksense.audit.v1.dlq
    globalIdentity: stocksense.identity.audit.global.v1.dlq
  deadLetterRetentionDays: 7
  replayAuthority: operator
  replayBatchMaximum: 100
  replayIdentity: [messageId, idempotencyKey, payloadDigest]
  envelopeMaximumBytes: 65536
```

For an unknown local account or unlinked Google identity, U3 uses `actor: {type: anonymous, subjectId: anonymous}` and a generic resource identity such as `authentication-attempt`; `data` contains a stable safe reason code, never the submitted identifier, email, token, password, authorization code, or raw provider claim. Authenticated human, workload, and scheduled outcomes use their verified subject IDs. U3 derives an immutable message ID and idempotency key from the committed audit identity; broker replay preserves both and the canonical payload digest. A failure to commit the audit/outbox pair fails the attempted identity transition closed. U10 routes global events to a distinct platform-Operator projection and excludes them from every retailer-filtered business-audit query; no client-selected retailer value can reclassify them. Its global read contract is the C17 `/internal/v1/platform/identity-audit` operation, reached only through C18's separate `/api/v1/platform/identity-audit` BFF route. U10 requires the delegated human token and a fresh U3 platform grant check defined in C02 on every page. A retailer-scoped Operator role, even for every retailer, grants no global read authority. U1 schema and route fixtures cover anonymous and authenticated global events, missing fields, tenant/global cross-profile substitution, fake tenant metadata, over-limit payloads, changed-payload replay, and unauthorized producers. U10/U11 access tests additionally reject retailer-only Operators, machine principals, expired or revoked platform grants, wrong audience/client/scope, unavailable U3 grant checks, and leakage into tenant queries.

## Messaging Platform contracts

### C22 — Protocol and language-package compatibility

U1 versions the wire protocol and schemas. U14 versions its .NET and Python packages independently, and each package declares the U1 protocol range it implements. A package release is invalid unless both language implementations pass the same conformance fixture version.

```yaml shared-schema
kind: messaging-protocol-compatibility-manifest
version: 1.0.0
protocol:
  owner: contracts
  name: stocksense-messaging
  semanticVersion: 1.0.0
  asyncapiBaseline: 3.0.0
  envelopeSchemas:
    tenant: common/v1/message-envelope.schema.json
    globalIdentity: common/v1/global-identity-audit-envelope.schema.json
packages:
  - language: dotnet
    owner: messaging-platform
    package: StockSense.Messaging
    semanticVersion: 1.0.0
    supportedProtocolRange: '>=1.0.0 <2.0.0'
  - language: python
    owner: messaging-platform
    package: stocksense-messaging
    semanticVersion: 1.0.0
    supportedProtocolRange: '>=1.0.0 <2.0.0'
bootstrapPublishers:
  - { owner: identity-access, implementation: service-local, protocolRange: '>=1.0.0 <2.0.0', fixtures: [tenant-envelope, global-identity-envelope, cross-profile-rejection, authenticated-producer, publisher-confirm, exact-replay, changed-payload-conflict, poison-message, retry-expiry, dead-letter, authorized-replay, authoritative-reconciliation, ordering, payload-limit, telemetry] }
  - { owner: retail-data, implementation: service-local, protocolRange: '>=1.0.0 <2.0.0', fixtures: [tenant-envelope, authenticated-producer, publisher-confirm, exact-replay, changed-payload-conflict, poison-message, retry-expiry, dead-letter, authorized-replay, authoritative-reconciliation, ordering, payload-limit, telemetry] }
conformance:
  fixtureVersion: 1.0.0
  requiredSuites: [tenant-envelope, global-identity-envelope, cross-profile-rejection, authenticated-producer, publisher-confirm, exact-replay, changed-payload-conflict, poison-message, retry-expiry, dead-letter, authorized-replay, authoritative-reconciliation, ordering, payload-limit, telemetry]
  crossLanguageResult: required
  bootstrapPublisherResult: required-per-service-for-applicable-suites
wireRules:
  canonicalization: RFC-8785
  digest: sha256-of-canonical-data
  authenticatedProducerBinding: token-subject-client-audience-must-match-envelope-and-registration
  envelopeMaximumBytes: 65536
  maxTotalDeliveries: 5
  initialDeliveryAttempt: 1
  deterministicBackoffSecondsForAttempts2Through5: [1, 2, 4, 8]
  backoffFormula: min-2-power-attempt-minus-2-and-30-seconds-no-jitter
  deadLetterRetentionDays: 7
  authorizedReplayBatchMaximum: 100
breakingChange:
  protocol: new-major-and-routing-identity
  package: independent-major-with-declared-protocol-range
```

### C23 — Reusable RabbitMQ mechanics and conformance

U14 packages broker mechanics for U5-U10 and U15 and publishes conformance outputs for U13. Its adapter validates both closed C01 envelope profiles and preserves the C15 global identity route and its separate dead-letter path; it never supplies missing retailer context or acquires Operator query authority. U3 and U4 deliberately remain upstream bootstrap publishers with no U14 package dependency. Their service-local publisher adapters implement the same C23 publisher-confirm, durable-outbox, retry, DLQ, replay, producer-binding, digest, size-limit and telemetry rules, and must pass the same versioned conformance fixtures; U13 collects their results alongside U14's .NET/Python package results. A U3 or U4 deployment cannot publish audit events until that evidence passes. Domain units still own message schemas, outbox/inbox records, authorization, duplicate business effects, and transactional state. RabbitMQ topology deployment remains U2's responsibility.

```yaml shared-schema
kind: messaging-platform-profile
version: 1.0.0
delivery:
  guarantee: at-least-once
  publisherConfirm: required
  acknowledgement: after-participant-inbox-and-effect-commit
  deliveryIdentity: messageId
  correlation: [correlationId, causationId, traceparent]
  authenticatedProducerBinding: required-before-publish-and-before-consume
  canonicalPayloadDigest: sha256-rfc8785-data
  envelopeMaximumBytes: 65536
policies:
  retry:
    maxTotalDeliveries: 5
    attemptCounting: initial-delivery-is-attempt-1
    backoffSecondsForAttempts2Through5: [1, 2, 4, 8]
    formula: min-2-power-attempt-minus-2-and-30-seconds-no-jitter
  deadLetter:
    requiredAfterDeliveryFive: true
    retentionDays: 7
    expiredMessageDisposition: retain-expiry-evidence-and-reconcile-authoritative-state
  replay:
    authority: operator
    auditRequired: true
    maximumBatchMessages: 100
    exactReplayReturnsDurablePriorResult: true
    changedPayloadSameIdentity: quarantine-conflict-no-business-effect
  payloadLimit: enforced-before-publish-and-after-receive
  ordering: no-global-order-claim
  duplicateTransportDelivery: expected
domainResponsibilities:
  messageMeaning: producer
  schemaEvolution: producer-and-contracts
  transactionalOutboxInbox: domain-unit
  authorizationAndFencing: domain-unit
  atomicBusinessEffects: domain-unit
libraryConstraints:
  stateless: true
  tenantAuthority: none
  directBusinessStorageAccess: prohibited
acceptanceEvidence:
  required: [exact-replay, changed-payload-conflict, poison-message-to-dlq, seven-day-expiry, replay-batch-limit, authoritative-state-reconciliation]
```

The publishing library derives producer fields from the registered broker-authenticated workload; domain callers cannot override them. Broker identity and route authorization must match the envelope producer, protocol range, and allowed message type before publish and before inbox acceptance. The publisher computes `payloadDigest` before the 65,536-byte envelope check, and the consumer recomputes it before accepting an inbox row. Oversize envelopes fail as `MESSAGE_ENVELOPE_TOO_LARGE`; unbound or mismatched producers fail as `MESSAGE_PRODUCER_UNAUTHENTICATED` or `MESSAGE_PRODUCER_MISMATCH`; changed immutable envelope fields or payload under an existing message/idempotency identity fail as `MESSAGE_PAYLOAD_CONFLICT`. These failures are quarantined without a business effect.

Attempts are numbered one through five, including the initial delivery. Failure of attempt five moves the message to the DLQ and attempt six is forbidden. DLQ records remain replayable for 604,800 seconds. An authenticated Operator submits an idempotent, audited replay request containing one to 100 messages. For the global identity-audit DLQ, U10's replay control checks the same current U3 platform-Operator grant as C17; a retailer Operator cannot replay global records. For a tenant DLQ, the owning producer or U10 checks current Operator membership for that retailer through U4. U14 executes delivery mechanics only and never grants replay authority. Replay preserves the canonical envelope and starts a new five-delivery cycle; broker headers carry the replay-request identity and current attempt. Expired or replayed messages are reconciled to authoritative state before the operator closes the replay request.

## Recovery coordination contracts

### C24 — Synchronous bootstrap participant port

Identity Access and Retail Data's Tenant Directory expose the same provider-owned bootstrap profile to U15. Each command is idempotent and returns the durable participant result. Identity Access fences identity writes and key rotation while preserving read-only validation; Tenant Directory atomically advances the recovery generation and fences membership, placement and topology writes.

```yaml
openapi: 3.1.2
info: { title: StockSense Recovery Bootstrap Participant API, version: 1.0.0 }
paths:
  /internal/v1/recovery/participants/{participant}/retailers/{retailerId}/runs/{runId}/{command}:
    parameters:
      - { in: path, name: participant, required: true, schema: { enum: [identity-access, tenant-directory] } }
      - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
      - { in: path, name: runId, required: true, schema: { type: string, format: uuid } }
      - { in: path, name: command, required: true, schema: { enum: [prepare, close, abort, resume] } }
      - { in: header, name: X-Correlation-ID, required: true, schema: { type: string, format: uuid } }
      - { in: header, name: Idempotency-Key, required: true, schema: { type: string, minLength: 16, maxLength: 128 } }
    post:
      operationId: applyRecoveryBootstrapCommand
      security: [{ recoveryCoordinatorToken: [recovery.participant] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [commandId, registrationId, rosterDigest, recoveryGeneration, placementGeneration, policyVersion, deadlineClass, commandRoute, acknowledgementRoute, deadlineAt]
              properties:
                commandId: { type: string, format: uuid }
                registrationId: { type: string, format: uuid }
                rosterDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
                recoveryGeneration: { type: integer, minimum: 1 }
                placementGeneration: { type: integer, minimum: 1 }
                policyVersion: { const: recovery-policy-v1 }
                deadlineClass: { const: A }
                commandRoute: { type: string, pattern: '^/internal/v1/recovery/participants/' }
                acknowledgementRoute: { const: synchronous-response }
                deadlineAt: { type: string, format: date-time }
      responses:
        '200':
          description: Durable idempotent participant result, checkpoint evidence and fence disposition
          content:
            application/json:
              schema: { $ref: '#/components/schemas/RecoveryBootstrapResult' }
              examples:
                prepared:
                  value:
                    runId: 00000000-0000-4000-8000-000000000001
                    commandId: 00000000-0000-4000-8000-000000000002
                    registrationId: 00000000-0000-4000-8000-000000000003
                    rosterDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
                    participant: identity-access
                    command: prepare
                    recoveryGeneration: 7
                    placementGeneration: 3
                    outcome: prepared
                    fenceDisposition: active
                    checkpoint: null
                    checkpointDigest: null
                    durableStateVersion: 1
                    acknowledgedAt: '2026-09-24T10:00:00Z'
                closed:
                  value:
                    runId: 00000000-0000-4000-8000-000000000001
                    commandId: 00000000-0000-4000-8000-000000000006
                    registrationId: 00000000-0000-4000-8000-000000000003
                    rosterDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
                    participant: tenant-directory
                    command: close
                    recoveryGeneration: 7
                    placementGeneration: 3
                    outcome: closed
                    fenceDisposition: active
                    checkpoint: { checkpointId: 00000000-0000-4000-8000-000000000007, digest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', recordedAt: '2026-09-24T10:00:01Z' }
                    checkpointDigest: 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
                    durableStateVersion: 2
                    acknowledgedAt: '2026-09-24T10:00:01Z'
                abortBeforeLatePrepare:
                  value:
                    runId: 00000000-0000-4000-8000-000000000001
                    commandId: 00000000-0000-4000-8000-000000000002
                    registrationId: 00000000-0000-4000-8000-000000000003
                    rosterDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
                    participant: identity-access
                    command: prepare
                    recoveryGeneration: 7
                    placementGeneration: 3
                    outcome: terminal
                    fenceDisposition: terminally-suppressed
                    checkpoint: null
                    checkpointDigest: null
                    durableStateVersion: 2
                    acknowledgedAt: '2026-09-24T10:00:01Z'
        '401':
          description: Missing, expired, invalid, or wrong-audience coordinator token
          content:
            application/problem+json:
              schema: { $ref: '#/components/schemas/RecoveryProblem' }
              examples:
                invalidToken:
                  value: { type: 'https://errors.stocksense.local/recovery/authentication-invalid', title: Coordinator authentication invalid, status: 401, detail: Coordinator token is invalid for this participant., instance: /internal/v1/recovery/participants/identity-access/retailers/00000000-0000-4000-8000-000000000005/runs/00000000-0000-4000-8000-000000000001/prepare, code: RECOVERY_AUTHENTICATION_INVALID, correlationId: 00000000-0000-4000-8000-000000000004 }
        '403':
          description: Recovery coordinator workload identity or scope denied
          content:
            application/problem+json:
              schema: { $ref: '#/components/schemas/RecoveryProblem' }
        '409':
          description: Stale generation, conflicting command, or durable terminal phase
          content:
            application/problem+json:
              schema: { $ref: '#/components/schemas/RecoveryProblem' }
              examples:
                staleGeneration:
                  value:
                    type: 'https://errors.stocksense.local/recovery/stale-generation'
                    title: Recovery generation conflict
                    status: 409
                    detail: The command uses a stale recovery generation.
                    instance: /internal/v1/recovery/participants/identity-access/retailers/00000000-0000-4000-8000-000000000005/runs/00000000-0000-4000-8000-000000000001/prepare
                    code: RECOVERY_GENERATION_STALE
                    correlationId: 00000000-0000-4000-8000-000000000004
                    runId: 00000000-0000-4000-8000-000000000001
                    commandId: 00000000-0000-4000-8000-000000000002
                    fenceDisposition: unresolved
        '422':
          description: Unsupported policy or malformed checkpoint request
          content:
            application/problem+json:
              schema: { $ref: '#/components/schemas/RecoveryProblem' }
        '503':
          description: Participant cannot persist a safe result before its deadline
          content:
            application/problem+json:
              schema: { $ref: '#/components/schemas/RecoveryProblem' }
              examples:
                persistenceUnavailable:
                  value: { type: 'https://errors.stocksense.local/recovery/persistence-unavailable', title: Participant persistence unavailable, status: 503, detail: A durable participant result could not be committed., instance: /internal/v1/recovery/participants/identity-access/retailers/00000000-0000-4000-8000-000000000005/runs/00000000-0000-4000-8000-000000000001/prepare, code: RECOVERY_PERSISTENCE_UNAVAILABLE, correlationId: 00000000-0000-4000-8000-000000000004, runId: 00000000-0000-4000-8000-000000000001, commandId: 00000000-0000-4000-8000-000000000002, fenceDisposition: unresolved }
components:
  securitySchemes:
    recoveryCoordinatorToken:
      type: oauth2
      flows:
        clientCredentials:
          tokenUrl: /connect/token
          scopes:
            recovery.participant: Apply bootstrap recovery commands as the coordinator workload
  schemas:
    RecoveryBootstrapResult:
      type: object
      required: [runId, commandId, registrationId, rosterDigest, participant, command, recoveryGeneration, placementGeneration, outcome, fenceDisposition, checkpoint, checkpointDigest, durableStateVersion, acknowledgedAt]
      allOf:
        - if:
            properties: { outcome: { const: closed } }
            required: [outcome]
          then:
            properties:
              checkpoint: { type: object }
              checkpointDigest: { type: string }
      properties:
        runId: { type: string, format: uuid }
        commandId: { type: string, format: uuid }
        registrationId: { type: string, format: uuid }
        rosterDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
        participant: { enum: [identity-access, tenant-directory] }
        command: { enum: [prepare, close, abort, resume] }
        recoveryGeneration: { type: integer, minimum: 1 }
        placementGeneration: { type: integer, minimum: 1 }
        outcome: { enum: [prepared, closed, aborted, resumed, terminal] }
        fenceDisposition: { enum: [active, cleared, terminally-suppressed] }
        checkpoint:
          oneOf:
            - { type: 'null' }
            - type: object
              required: [checkpointId, digest, recordedAt]
              properties:
                checkpointId: { type: string, format: uuid }
                digest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
                recordedAt: { type: string, format: date-time }
              additionalProperties: false
        checkpointDigest: { type: [string, 'null'], pattern: '^sha256:[0-9a-f]{64}$' }
        durableStateVersion: { type: integer, minimum: 1 }
        acknowledgedAt: { type: string, format: date-time }
      additionalProperties: false
    RecoveryProblem:
      type: object
      required: [type, title, status, detail, instance, code, correlationId]
      allOf:
        - if: { properties: { status: { const: 401 } }, required: [status] }
          then: { properties: { code: { const: RECOVERY_AUTHENTICATION_INVALID } } }
        - if: { properties: { status: { const: 403 } }, required: [status] }
          then: { properties: { code: { const: RECOVERY_AUTHORITY_DENIED } } }
        - if: { properties: { status: { const: 409 } }, required: [status] }
          then: { properties: { code: { enum: [RECOVERY_GENERATION_STALE, RECOVERY_IDEMPOTENCY_CONFLICT, RECOVERY_FENCE_UNRESOLVED, RECOVERY_RECONCILIATION_REQUIRED] } } }
        - if: { properties: { status: { const: 422 } }, required: [status] }
          then: { properties: { code: { enum: [RECOVERY_POLICY_UNSUPPORTED, RECOVERY_PROTOCOL_UNSUPPORTED, RECOVERY_ROUTE_MISMATCH] } } }
        - if: { properties: { status: { const: 503 } }, required: [status] }
          then: { properties: { code: { const: RECOVERY_PERSISTENCE_UNAVAILABLE } } }
      properties:
        type: { type: string, format: uri }
        title: { type: string, minLength: 1 }
        status: { enum: [401, 403, 409, 422, 503] }
        detail: { type: string }
        instance: { type: string, format: uri-reference }
        code:
          enum: [RECOVERY_AUTHENTICATION_INVALID, RECOVERY_AUTHORITY_DENIED, RECOVERY_GENERATION_STALE, RECOVERY_IDEMPOTENCY_CONFLICT, RECOVERY_POLICY_UNSUPPORTED, RECOVERY_PROTOCOL_UNSUPPORTED, RECOVERY_ROUTE_MISMATCH, RECOVERY_FENCE_UNRESOLVED, RECOVERY_RECONCILIATION_REQUIRED, RECOVERY_PERSISTENCE_UNAVAILABLE]
        correlationId: { type: string, format: uuid }
        runId: { type: string, format: uuid }
        commandId: { type: string, format: uuid }
        fenceDisposition: { enum: [active, cleared, terminally-suppressed, unresolved] }
      additionalProperties: false
```

`X-Correlation-ID` is echoed as `RecoveryProblem.correlationId`. The idempotency lookup key is `(participant, retailerId, runId, Idempotency-Key)`; its stored value includes `command`, `commandId`, the canonical request-body hash, and the durable status/body. `commandId` is also unique within the participant/run. A matching retry returns the same durable status and body; reusing a key or command ID with different command content returns `409 RECOVERY_IDEMPOTENCY_CONFLICT`. The participant persists the replay result before returning `200`. Invalid or missing token returns `401 RECOVERY_AUTHENTICATION_INVALID`; a valid token for the wrong workload/scope returns `403 RECOVERY_AUTHORITY_DENIED`; unsafe persistence returns `503 RECOVERY_PERSISTENCE_UNAVAILABLE` and never a fabricated durable result.

The C24 conformance fixtures below use the complete request and the named `200` examples in the C24 canonical OpenAPI document as baselines. `attemptedResponse` pointers resolve against that OpenAPI document; `request: '#/baseRequest'` resolves against this fixture. Each `patch` is an RFC 6902 JSON Patch applied in order to the named baseline (the attempted response when present, otherwise the base request); `setup` is persisted test state or an injected fault. Test tokens are local test identities, not production credentials. CI must run each case and compare the exact expected status/code or reject the attempted response for the named invariant.

```yaml
fixtureVersion: 1.0.0
clock: '2026-09-24T10:00:00Z'
baseRequest:
  method: POST
  path: /internal/v1/recovery/participants/identity-access/retailers/00000000-0000-4000-8000-000000000005/runs/00000000-0000-4000-8000-000000000001/prepare
  headers:
    X-Correlation-ID: 00000000-0000-4000-8000-000000000004
    Idempotency-Key: recovery-command-000000000002
    Authorization: 'Bearer fixture-valid-coordinator-token'
  body:
    commandId: 00000000-0000-4000-8000-000000000002
    registrationId: 00000000-0000-4000-8000-000000000003
    rosterDigest: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    recoveryGeneration: 7
    placementGeneration: 3
    policyVersion: recovery-policy-v1
    deadlineClass: A
    commandRoute: /internal/v1/recovery/participants/identity-access/retailers/00000000-0000-4000-8000-000000000005/runs/00000000-0000-4000-8000-000000000001/prepare
    acknowledgementRoute: synchronous-response
    deadlineAt: '2026-09-24T10:01:00Z'
cases:
  - id: closed-without-checkpoint
    attemptedResponse: '#/paths/~1internal~1v1~1recovery~1participants~1{participant}~1retailers~1{retailerId}~1runs~1{runId}~1{command}/post/responses/200/content/application~1json/examples/closed/value'
    patch:
      - { op: replace, path: /checkpoint, value: null }
      - { op: replace, path: /checkpointDigest, value: null }
    expect: { accepted: false, invariant: closed-requires-checkpoint-and-matching-digest }
  - id: late-prepare-after-abort
    setup: { durablePhase: aborted, sameRunAndGeneration: true, terminalGuard: true }
    request: '#/baseRequest'
    attemptedResponse: '#/paths/~1internal~1v1~1recovery~1participants~1{participant}~1retailers~1{retailerId}~1runs~1{runId}~1{command}/post/responses/200/content/application~1json/examples/prepared/value'
    expect: { accepted: false, invariant: abort-terminal-guard-requires-terminally-suppressed }
  - id: invalid-coordinator-token
    patch: [{ op: replace, path: /headers/Authorization, value: 'Bearer fixture-invalid-token' }]
    expect: { status: 401, code: RECOVERY_AUTHENTICATION_INVALID }
  - id: unauthorized-coordinator-scope
    patch: [{ op: replace, path: /headers/Authorization, value: 'Bearer fixture-valid-token-without-recovery-participant-scope' }]
    expect: { status: 403, code: RECOVERY_AUTHORITY_DENIED }
  - id: stale-recovery-generation
    setup: { durableRecoveryGeneration: 7 }
    patch: [{ op: replace, path: /body/recoveryGeneration, value: 6 }]
    expect:
      status: 409
      problem: { type: 'https://errors.stocksense.local/recovery/stale-generation', title: Recovery generation conflict, status: 409, detail: The command uses a stale recovery generation., instance: /internal/v1/recovery/participants/identity-access/retailers/00000000-0000-4000-8000-000000000005/runs/00000000-0000-4000-8000-000000000001/prepare, code: RECOVERY_GENERATION_STALE, correlationId: 00000000-0000-4000-8000-000000000004, runId: 00000000-0000-4000-8000-000000000001, commandId: 00000000-0000-4000-8000-000000000002, fenceDisposition: unresolved }
  - id: idempotency-key-payload-conflict
    setup: { persistedIdempotencyKey: recovery-command-000000000002, persistedCommandId: 00000000-0000-4000-8000-000000000002, persistedRequest: '#/baseRequest' }
    patch: [{ op: replace, path: /body/deadlineAt, value: '2026-09-24T10:02:00Z' }]
    expect:
      status: 409
      problem: { type: 'https://errors.stocksense.local/recovery/idempotency-conflict', title: Recovery command conflict, status: 409, detail: The idempotency key was reused with different command content., instance: /internal/v1/recovery/participants/identity-access/retailers/00000000-0000-4000-8000-000000000005/runs/00000000-0000-4000-8000-000000000001/prepare, code: RECOVERY_IDEMPOTENCY_CONFLICT, correlationId: 00000000-0000-4000-8000-000000000004, runId: 00000000-0000-4000-8000-000000000001, commandId: 00000000-0000-4000-8000-000000000002, fenceDisposition: unresolved }
  - id: unsupported-policy
    patch: [{ op: replace, path: /body/policyVersion, value: unsupported-policy-v2 }]
    expect: { status: 422, code: RECOVERY_POLICY_UNSUPPORTED }
  - id: persistence-unavailable
    setup: { injectedFault: durable-store-write-fails-before-result-commit }
    request: '#/baseRequest'
    expect: { status: 503, code: RECOVERY_PERSISTENCE_UNAVAILABLE, durableResultCreated: false }
```

On a `closed` result, `checkpoint` must be non-null and its `digest` must equal `checkpointDigest`; on other outcomes the two fields are either both null or consistently identify the same durable checkpoint. A `200` result is a durable participant disposition, not coordinator-wide recovery success; a timeout or unresolved fence cannot be labeled recovered.

### C25 — Asynchronous recovery commands and acknowledgements

Before U15 sends `prepare`, it commits the participant to the write-ahead dispatch inventory. Async participants persist a monotonic state keyed by retailer, run and recovery generation. An `abort` received before a delayed `prepare` creates a terminal guard; the later command returns the terminal disposition and cannot recreate a fence. In both messages, `retailerId`, `placementGeneration`, `actor`, `producer`, `correlationId`, and delivery identity are the C01 envelope fields. `data` carries the recovery-specific fields. The command's envelope `idempotencyKey` is stable for a logical `commandId`; the acknowledgement uses a stable key for its participant, command and result, and its `causationId` equals the corresponding command `messageId`. Consumers compare the authenticated envelope retailer and placement generation with their current authority before applying any command or accepting an acknowledgement.

```yaml
asyncapi: 3.0.0
info: { title: StockSense Recovery Participant Protocol, version: 1.0.0 }
defaultContentType: application/json
channels:
  recoveryCommands:
    address: stocksense.recovery.command.v1.{participant}
    parameters:
      participant:
        description: Registered Class B or C participant route identity from the run roster snapshot
    messages:
      recoveryCommand:
        payload:
          schemaFormat: 'application/schema+json;version=draft-2020-12'
          schema:
            allOf:
              - $ref: 'https://contracts.stocksense.local/common/v1/message-envelope.schema.json'
              - type: object
                properties:
                  messageType: { const: recovery.command }
                  schemaVersion: { const: 1.0.0 }
                  data:
                    type: object
                    required: [runId, commandId, registrationId, rosterDigest, command, recoveryGeneration, participant, policyVersion, deadlineClass, commandRoute, acknowledgementRoute, deadlineAt]
                    properties:
                      runId: { type: string, format: uuid }
                      commandId: { type: string, format: uuid }
                      registrationId: { type: string, format: uuid }
                      rosterDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
                      command: { enum: [prepare, close, abort, resume] }
                      recoveryGeneration: { type: integer, minimum: 1 }
                      participant: { type: string }
                      policyVersion: { const: recovery-policy-v1 }
                      deadlineClass: { enum: [B, C] }
                      commandRoute: { type: string, pattern: '^stocksense\.recovery\.command\.v1\.[a-z][a-z0-9-]*$' }
                      acknowledgementRoute: { const: stocksense.recovery.acknowledgement.v1 }
                      deadlineAt: { type: string, format: date-time }
  recoveryAcknowledgements:
    address: stocksense.recovery.acknowledgement.v1
    messages:
      recoveryAcknowledgement:
        payload:
          schemaFormat: 'application/schema+json;version=draft-2020-12'
          schema:
            allOf:
              - $ref: 'https://contracts.stocksense.local/common/v1/message-envelope.schema.json'
              - type: object
                properties:
                  messageType: { const: recovery.acknowledgement }
                  schemaVersion: { const: 1.0.0 }
                  data:
                    type: object
                    required: [runId, commandId, registrationId, rosterDigest, command, recoveryGeneration, participant, acknowledgementRoute, outcome, fenceDisposition, checkpointDigest, acknowledgedAt]
                    properties:
                      runId: { type: string, format: uuid }
                      commandId: { type: string, format: uuid }
                      registrationId: { type: string, format: uuid }
                      rosterDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
                      command: { enum: [prepare, close, abort, resume] }
                      recoveryGeneration: { type: integer, minimum: 1 }
                      participant: { type: string }
                      acknowledgementRoute: { const: stocksense.recovery.acknowledgement.v1 }
                      outcome: { enum: [prepared, closed, aborted, resumed, terminal, failed] }
                      fenceDisposition: { enum: [active, cleared, terminally-suppressed, unresolved] }
                      checkpointDigest: { type: [string, 'null'] }
                      acknowledgedAt: { type: string, format: date-time }
operations:
  dispatchRecoveryCommand:
    action: send
    channel: { $ref: '#/channels/recoveryCommands' }
  handleRecoveryCommand:
    action: receive
    channel: { $ref: '#/channels/recoveryCommands' }
  sendRecoveryAcknowledgement:
    action: send
    channel: { $ref: '#/channels/recoveryAcknowledgements' }
  collectRecoveryAcknowledgement:
    action: receive
    channel: { $ref: '#/channels/recoveryAcknowledgements' }
x-stocksense-recovery:
  requiredRoster: versioned-policy-plus-capability-registration
  commandRoutePattern: stocksense.recovery.command.v1.{participant}
  acknowledgementRoute: stocksense.recovery.acknowledgement.v1
  missingOrIncompatibleParticipant: stop-before-prepare
  prepareDispatchInventory: durable-before-send
  abortTargets: every-potentially-delivered-participant
  latePrepareAfterAbort: return-terminal-disposition-without-fence
```

### C26 — Operator recovery control and status API

U15 exposes a cluster-internal REST API to U11. The BFF returns the same job semantics to the browser and polls U15; v1 introduces no WebSocket or Server-Sent Events dependency. Preview is non-destructive. A destructive start requires a short-lived, single-use confirmation token bound to the exact reviewed operation.

U11 is the confidential OIDC authorization-code/PKCE client. It keeps the user's U15-audience access token server-side in the BFF session and presents that delegated user token to U15 for preview, start, status, manifest and reconciliation; the browser never receives it. U3 issues this token only for the `stocksense-web-bff` client, with issuer, audience `stocksense-recovery`, `client_id`, stable human `sub`, lifetime and the requested recovery scopes. U15 validates those claims and signature, refuses a client-credentials or service principal on human operations, and asks U4 Tenant Directory for the caller's **current** Operator membership and placement generation for the path retailer on every call. A role claim in the token is never sufficient. U15 derives `operatorSubject` solely from the validated token's `sub`, not a header or body field. At preview it binds that subject, the BFF client, retailer, operation, manifest and roster digests, and generations into the confirmation token. At start it repeats token and current membership validation and requires the token's subject/client to equal the preview binding; a different human, expired session/token, revoked role, stale placement, changed digest or consumed confirmation is denied before any barrier work. U15 records that authenticated subject as `requested_by` and in audit evidence. Registration remains a separate machine-credential operation. U11 never substitutes its own service subject for the human Operator.

```yaml
openapi: 3.1.2
info: { title: StockSense Recovery Coordination API, version: 1.0.0 }
paths:
  /internal/v1/recovery/participants/{participant}/registrations:
    put:
      operationId: registerRecoveryParticipantCapabilities
      parameters:
        - { $ref: '#/components/parameters/Participant' }
        - { in: header, name: Idempotency-Key, required: true, schema: { type: string, minLength: 16, maxLength: 128 } }
      security: [{ recoveryCoordinatorToken: [recovery.participant] }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/RecoveryParticipantRegistrationRequest' }
      responses:
        '200':
          description: Compatible registration stored or matching current registration returned
          content: { application/json: { schema: { $ref: '#/components/schemas/RecoveryParticipantRegistration' } } }
        '403': { $ref: '#/components/responses/RecoveryProblem' }
        '409': { $ref: '#/components/responses/RecoveryProblem' }
        '422': { $ref: '#/components/responses/RecoveryProblem' }
  /api/v1/retailers/{retailerId}/recovery-runs:preview:
    parameters:
      - { $ref: '#/components/parameters/RetailerId' }
    post:
      operationId: previewRecoveryRun
      security: [{ recoveryOperatorDelegatedToken: [recovery.operator] }]
      parameters:
        - { $ref: '#/components/parameters/IdempotencyKey' }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/RecoveryPreviewRequest' }
      responses:
        '200':
          description: Scope, immutable roster snapshot, manifest summary, generations, policy and bound confirmation token
          content: { application/json: { schema: { $ref: '#/components/schemas/RecoveryPreviewResponse' } } }
        '401': { $ref: '#/components/responses/RecoveryProblem' }
        '403': { $ref: '#/components/responses/RecoveryProblem' }
        '409': { $ref: '#/components/responses/RecoveryProblem' }
        '422': { $ref: '#/components/responses/RecoveryProblem' }
  /api/v1/retailers/{retailerId}/recovery-runs:
    parameters:
      - { $ref: '#/components/parameters/RetailerId' }
    post:
      operationId: startRecoveryRun
      security: [{ recoveryOperatorDelegatedToken: [recovery.operator] }]
      parameters:
        - { $ref: '#/components/parameters/IdempotencyKey' }
        - { in: header, name: X-Recovery-Confirmation, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/RecoveryStartRequest' }
      responses:
        '202':
          description: Durable run accepted or matching idempotent result returned
          headers: { Location: { schema: { type: string, format: uri-reference } } }
          content: { application/json: { schema: { $ref: '#/components/schemas/RecoveryOperationHandle' } } }
        '401': { $ref: '#/components/responses/RecoveryProblem' }
        '403': { $ref: '#/components/responses/RecoveryProblem' }
        '409': { $ref: '#/components/responses/RecoveryProblem' }
        '422': { $ref: '#/components/responses/RecoveryProblem' }
  /api/v1/retailers/{retailerId}/recovery-runs/{runId}:
    parameters:
      - { $ref: '#/components/parameters/RetailerId' }
      - { $ref: '#/components/parameters/RunId' }
    get:
      operationId: getRecoveryRun
      security: [{ recoveryOperatorDelegatedToken: [recovery.operator] }]
      responses:
        '200':
          description: Phase, checkpoint, deadlines, immutable roster, terminal fencing inventory, reconciliation and outcome
          content: { application/json: { schema: { $ref: '#/components/schemas/RecoveryRunStatus' } } }
        '401': { $ref: '#/components/responses/RecoveryProblem' }
        '403': { $ref: '#/components/responses/RecoveryProblem' }
        '404': { $ref: '#/components/responses/RecoveryProblem' }
  /api/v1/retailers/{retailerId}/recovery-runs/{runId}:reconcile:
    parameters:
      - { $ref: '#/components/parameters/RetailerId' }
      - { $ref: '#/components/parameters/RunId' }
    post:
      operationId: reconcileRecoveryRun
      security: [{ recoveryOperatorDelegatedToken: [recovery.operator, recovery.reconcile] }]
      parameters:
        - { $ref: '#/components/parameters/IdempotencyKey' }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/RecoveryReconciliationRequest' }
      responses:
        '202':
          description: Reconciliation command accepted without clearing unresolved fences
          headers: { Location: { schema: { type: string, format: uri-reference } } }
          content: { application/json: { schema: { $ref: '#/components/schemas/RecoveryOperationHandle' } } }
        '401': { $ref: '#/components/responses/RecoveryProblem' }
        '403': { $ref: '#/components/responses/RecoveryProblem' }
        '409': { $ref: '#/components/responses/RecoveryProblem' }
        '422': { $ref: '#/components/responses/RecoveryProblem' }
  /api/v1/retailers/{retailerId}/recovery-runs/{runId}/manifest:
    parameters:
      - { $ref: '#/components/parameters/RetailerId' }
      - { $ref: '#/components/parameters/RunId' }
    get:
      operationId: getRecoveryManifest
      security: [{ recoveryOperatorDelegatedToken: [recovery.operator] }]
      responses:
        '200':
          description: Complete versioned PostgreSQL/RabbitMQ recovery-cut manifest
          content: { application/json: { schema: { $ref: '#/components/schemas/RecoveryManifest' } } }
        '401': { $ref: '#/components/responses/RecoveryProblem' }
        '403': { $ref: '#/components/responses/RecoveryProblem' }
        '404': { $ref: '#/components/responses/RecoveryProblem' }
        '409': { $ref: '#/components/responses/RecoveryProblem' }
components:
  securitySchemes:
    recoveryCoordinatorToken:
      type: oauth2
      flows:
        clientCredentials:
          tokenUrl: /connect/token
          scopes:
            recovery.participant: Register participant capabilities
    recoveryOperatorDelegatedToken:
      type: oauth2
      description: Server-held delegated human access token acquired by the confidential Web BFF using authorization code with PKCE; never a client-credentials token.
      flows:
        authorizationCode:
          authorizationUrl: /connect/authorize
          tokenUrl: /connect/token
          scopes:
            recovery.operator: Preview, start and inspect a retailer recovery run as the current human Operator
            recovery.reconcile: Reconcile a failed or uncertain run as the current human Operator
      x-stocksense-claims:
        issuer: configured-duende-issuer
        audience: stocksense-recovery
        client_id: stocksense-web-bff
        subject: required-stable-human-sub
        principalType: user
        currentRetailerRole: Operator via Tenant Directory on every operation
  parameters:
    Participant: { in: path, name: participant, required: true, schema: { $ref: '#/components/schemas/RecoveryParticipantName' } }
    RetailerId: { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
    RunId: { in: path, name: runId, required: true, schema: { type: string, format: uuid } }
    IdempotencyKey: { in: header, name: Idempotency-Key, required: true, schema: { type: string, minLength: 16, maxLength: 128 } }
  responses:
    RecoveryProblem:
      description: Stable RFC 9457 recovery failure
      content:
        application/problem+json:
          schema: { $ref: '#/components/schemas/RecoveryProblemDetails' }
  schemas:
    RecoveryParticipantName:
      type: string
      enum: [identity-access, tenant-directory, inventory, purchasing, demand-history, supplier-knowledge, model-lifecycle, forecasting, replenishment, assistant, audit-evidence]
    RecoveryParticipantRegistrationRequest:
      type: object
      required: [participant, participantClass, protocolVersion, supportedPolicyVersions, capabilities, commandTransport, commandRoute, acknowledgementRoute, workloadIdentity, lifecycleState]
      properties:
        participant: { $ref: '#/components/schemas/RecoveryParticipantName' }
        participantClass: { enum: [A, B, C] }
        protocolVersion: { const: 1.0.0 }
        supportedPolicyVersions: { type: array, minItems: 1, uniqueItems: true, contains: { const: recovery-policy-v1 }, items: { type: string } }
        capabilities: { type: array, minItems: 4, maxItems: 4, uniqueItems: true, allOf: [{ contains: { const: prepare } }, { contains: { const: close } }, { contains: { const: abort } }, { contains: { const: resume } }], items: { enum: [prepare, close, abort, resume] } }
        commandTransport: { enum: [synchronous-http, rabbitmq] }
        commandRoute: { type: string, minLength: 1, maxLength: 300 }
        acknowledgementRoute: { type: string, minLength: 1, maxLength: 300 }
        workloadIdentity: { type: string, minLength: 1, maxLength: 200 }
        lifecycleState: { enum: [ready, draining, unavailable] }
        expectedRegistrationGeneration: { type: [integer, 'null'], minimum: 1 }
      additionalProperties: false
    RecoveryParticipantRegistration:
      type: object
      required: [registrationId, registrationGeneration, participant, participantClass, protocolVersion, supportedPolicyVersions, capabilities, commandTransport, commandRoute, acknowledgementRoute, workloadIdentity, lifecycleState]
      properties:
        registrationId: { type: string, format: uuid }
        registrationGeneration: { type: integer, minimum: 1 }
        participant: { $ref: '#/components/schemas/RecoveryParticipantName' }
        participantClass: { enum: [A, B, C] }
        protocolVersion: { const: 1.0.0 }
        supportedPolicyVersions: { type: array, minItems: 1, uniqueItems: true, contains: { const: recovery-policy-v1 }, items: { type: string } }
        capabilities: { type: array, minItems: 4, uniqueItems: true, allOf: [{ contains: { const: prepare } }, { contains: { const: close } }, { contains: { const: abort } }, { contains: { const: resume } }], items: { enum: [prepare, close, abort, resume] } }
        commandTransport: { enum: [synchronous-http, rabbitmq] }
        commandRoute: { type: string, minLength: 1, maxLength: 300 }
        acknowledgementRoute: { type: string, minLength: 1, maxLength: 300 }
        workloadIdentity: { type: string, minLength: 1, maxLength: 200 }
        lifecycleState: { enum: [ready, draining, unavailable] }
      additionalProperties: false
    RecoveryRosterSnapshot:
      type: object
      required: [runId, retailerId, placementGeneration, recoveryGeneration, policyVersion, protocolVersion, snapshottedAt, coordinatorDeadlinesSeconds, rosterDigest, registrations]
      properties:
        runId: { type: string, format: uuid }
        retailerId: { type: string, format: uuid }
        placementGeneration: { type: integer, minimum: 1 }
        recoveryGeneration: { type: integer, minimum: 1 }
        policyVersion: { const: recovery-policy-v1 }
        protocolVersion: { const: 1.0.0 }
        snapshottedAt: { type: string, format: date-time }
        coordinatorDeadlinesSeconds:
          type: object
          required: [registration, allParticipantPrepare, closeDrainEvidence, localSnapshot, globalAbort, globalResumeAndReconciliation, restartDurableResume]
          properties:
            registration: { const: 60 }
            allParticipantPrepare: { const: 300 }
            closeDrainEvidence: { const: 300 }
            localSnapshot: { const: 1800 }
            globalAbort: { const: 300 }
            globalResumeAndReconciliation: { const: 600 }
            restartDurableResume: { const: 120 }
          additionalProperties: false
        rosterDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
        registrations:
          type: array
          minItems: 11
          maxItems: 11
          items:
            type: object
            required: [participant, registrationId, registrationGeneration, participantClass, commandTransport, capabilities, workloadIdentity, commandRoute, acknowledgementRoute, requiredForSuccess, deadlinesSeconds]
            properties:
              participant: { $ref: '#/components/schemas/RecoveryParticipantName' }
              registrationId: { type: string, format: uuid }
              registrationGeneration: { type: integer, minimum: 1 }
              participantClass: { enum: [A, B, C] }
              commandTransport: { enum: [synchronous-http, rabbitmq] }
              capabilities: { type: array, minItems: 4, maxItems: 4, uniqueItems: true, items: { enum: [prepare, close, abort, resume] } }
              workloadIdentity: { type: string }
              commandRoute: { type: string }
              acknowledgementRoute: { type: string }
              requiredForSuccess: { const: true }
              deadlinesSeconds:
                type: object
                required: [prepare, close, abort, resume]
                properties:
                  prepare: { type: integer, minimum: 1 }
                  close: { type: integer, minimum: 1 }
                  abort: { type: integer, minimum: 1 }
                  resume: { type: integer, minimum: 1 }
                additionalProperties: false
            additionalProperties: false
      additionalProperties: false
    RecoveryConfirmationBinding:
      type: object
      required: [previewId, reservedRunId, operatorSubject, operatorClientId, retailerId, operation, manifestDigest, rosterDigest, placementGeneration, recoveryGeneration, policyVersion, expiresAt, nonce]
      properties:
        previewId: { type: string, format: uuid }
        reservedRunId: { type: string, format: uuid }
        operatorSubject: { type: string }
        operatorClientId: { const: stocksense-web-bff }
        retailerId: { type: string, format: uuid }
        operation: { enum: [snapshot, restore, rollback, tenant-migration] }
        manifestDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
        rosterDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
        placementGeneration: { type: integer, minimum: 1 }
        recoveryGeneration: { type: integer, minimum: 1 }
        policyVersion: { const: recovery-policy-v1 }
        expiresAt: { type: string, format: date-time }
        nonce: { type: string }
      additionalProperties: false
    RecoveryPreviewRequest:
      type: object
      required: [operation, expectedPlacementGeneration, expectedRecoveryGeneration, policyVersion]
      properties:
        operation: { enum: [snapshot, restore, rollback, tenant-migration] }
        expectedPlacementGeneration: { type: integer, minimum: 1 }
        expectedRecoveryGeneration: { type: integer, minimum: 1 }
        policyVersion: { const: recovery-policy-v1 }
        sourceManifestDigest: { type: [string, 'null'], pattern: '^sha256:[0-9a-f]{64}$' }
      additionalProperties: false
    RecoveryManifestSummary:
      type: object
      required: [manifestVersion, operation, policyVersion, recoveryObjectives, expectedParticipantCount, queueScopeDigest]
      properties:
        manifestVersion: { const: 1.0.0 }
        operation: { enum: [snapshot, restore, rollback, tenant-migration] }
        policyVersion: { const: recovery-policy-v1 }
        recoveryObjectives:
          type: object
          required: [rpoSeconds, rtoSeconds, backupRetentionDays]
          properties: { rpoSeconds: { const: 86400 }, rtoSeconds: { const: 7200 }, backupRetentionDays: { const: 30 } }
          additionalProperties: false
        expectedParticipantCount: { const: 11 }
        queueScopeDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
      additionalProperties: false
    RecoveryPreviewResponse:
      type: object
      required: [previewId, roster, manifestSummary, confirmationBinding, confirmationToken]
      properties:
        previewId: { type: string, format: uuid }
        roster: { $ref: '#/components/schemas/RecoveryRosterSnapshot' }
        manifestSummary: { $ref: '#/components/schemas/RecoveryManifestSummary' }
        confirmationBinding: { $ref: '#/components/schemas/RecoveryConfirmationBinding' }
        confirmationToken: { type: string, minLength: 32 }
      additionalProperties: false
    RecoveryStartRequest:
      type: object
      required: [previewId, operation, manifestDigest, rosterDigest, expectedPlacementGeneration, expectedRecoveryGeneration]
      properties:
        previewId: { type: string, format: uuid }
        operation: { enum: [snapshot, restore, rollback, tenant-migration] }
        manifestDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
        rosterDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
        expectedPlacementGeneration: { type: integer, minimum: 1 }
        expectedRecoveryGeneration: { type: integer, minimum: 1 }
      additionalProperties: false
    RecoveryOperationHandle:
      type: object
      required: [runId, operation, status, acceptedAt, statusUrl, manifestUrl]
      properties:
        runId: { type: string, format: uuid }
        operation: { enum: [snapshot, restore, rollback, tenant-migration, reconcile] }
        status: { enum: [accepted, registering, preparing, closing, snapshotting, aborting, resuming, reconciling] }
        acceptedAt: { type: string, format: date-time }
        statusUrl: { type: string, format: uri-reference }
        manifestUrl: { type: string, format: uri-reference }
      additionalProperties: false
    RecoveryParticipantCheckpoint:
      type: object
      required: [participant, registrationId, command, commandDeadlineAt, checkpointReference, checkpointDigest, observedGeneration, status, fenceDisposition, acknowledgedAt, capturedAt]
      properties:
        participant: { $ref: '#/components/schemas/RecoveryParticipantName' }
        registrationId: { type: string, format: uuid }
        command: { enum: [prepare, close, abort, resume] }
        commandDeadlineAt: { type: string, format: date-time }
        checkpointReference: { type: [string, 'null'] }
        checkpointDigest: { type: [string, 'null'], pattern: '^sha256:[0-9a-f]{64}$' }
        observedGeneration: { type: integer, minimum: 1 }
        status: { enum: [pending, acknowledged, terminal, failed, stale, digest-mismatch] }
        fenceDisposition: { enum: [active, cleared, terminally-suppressed, unresolved] }
        acknowledgedAt: { type: string, format: date-time }
        capturedAt: { type: string, format: date-time }
      additionalProperties: false
    RecoveryFencingEntry:
      type: object
      required: [participant, registrationId, prepareDispatchRecordedAt, preparePotentiallyDelivered, abortRequired, terminalPhase, abortAcknowledgedAt, fenceDisposition]
      properties:
        participant: { $ref: '#/components/schemas/RecoveryParticipantName' }
        registrationId: { type: string, format: uuid }
        prepareDispatchRecordedAt: { type: [string, 'null'], format: date-time }
        preparePotentiallyDelivered: { type: boolean }
        abortRequired: { type: boolean }
        terminalPhase: { enum: [none, aborted, resumed, failed] }
        abortAcknowledgedAt: { type: [string, 'null'], format: date-time }
        fenceDisposition: { enum: [active, cleared, terminally-suppressed, unresolved] }
      additionalProperties: false
    RecoveryParticipantCheckpointSet:
      type: object
      required: [expectedParticipantCount, capturedParticipantCount, checkpointSetDigest, status, checkpoints, closedAt]
      properties:
        expectedParticipantCount: { const: 11 }
        capturedParticipantCount: { type: integer, minimum: 0, maximum: 11 }
        checkpointSetDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
        status: { enum: [open, closed, incomplete, invalid] }
        checkpoints: { type: array, maxItems: 44, items: { $ref: '#/components/schemas/RecoveryParticipantCheckpoint' } }
        closedAt: { type: [string, 'null'], format: date-time }
      additionalProperties: false
    RecoveryTerminalOutcome:
      type: string
      enum: [pending, succeeded, aborted, safely-resumed, failed]
    RecoveryFailure:
      type: object
      required: [code, failureClass, phase, occurredAt, unresolvedParticipants, retryable]
      properties:
        code:
          enum: [RECOVERY_REGISTRATION_INCOMPLETE, RECOVERY_PREPARE_ACK_TIMEOUT, RECOVERY_CLOSE_CHECKPOINT_INVALID, RECOVERY_POSTGRESQL_CUT_INVALID, RECOVERY_QUEUE_CUT_INVALID, RECOVERY_SNAPSHOT_TIMEOUT, RECOVERY_SNAPSHOT_PARTIAL, RECOVERY_SNAPSHOT_CHECKSUM_FAILED, RECOVERY_ABORT_ACK_TIMEOUT, RECOVERY_RESUME_ACK_TIMEOUT, RECOVERY_RECONCILIATION_MISMATCH, RECOVERY_STALE_RESPONSE, RECOVERY_CONFLICTING_RESPONSE, RECOVERY_DIGEST_MISMATCH]
        failureClass: { enum: [registration, prepare, close-checkpoint, postgresql-cut, queue-cut, snapshot, abort, resume, reconciliation, response-validation] }
        phase: { enum: [registering, preparing, closing, snapshotting, aborting, resuming, reconciling, terminal] }
        participant: { oneOf: [{ $ref: '#/components/schemas/RecoveryParticipantName' }, { type: 'null' }] }
        occurredAt: { type: string, format: date-time }
        expected: {}
        actual: {}
        unresolvedParticipants: { type: array, uniqueItems: true, items: { $ref: '#/components/schemas/RecoveryParticipantName' } }
        retryable: { type: boolean }
      additionalProperties: false
    RecoveryReconciliationState:
      type: object
      required: [status, authoritativeChecks, safeToResume, unresolvedParticipants]
      properties:
        status: { enum: [not-required, pending, reconciled, mismatch, operator-action-required, failed] }
        authoritativeChecks: { type: array, maxItems: 100, items: { type: object, required: [name, outcome], properties: { name: { type: string }, outcome: { enum: [passed, failed, unavailable] }, digest: { type: [string, 'null'] } }, additionalProperties: false } }
        safeToResume: { type: boolean }
        unresolvedParticipants: { type: array, uniqueItems: true, items: { $ref: '#/components/schemas/RecoveryParticipantName' } }
      additionalProperties: false
    RecoveryRunStatus:
      type: object
      required: [runId, runVersion, retailerId, operation, phase, status, policyVersion, placementGeneration, recoveryGeneration, activePhaseDeadlineAt, roster, participantCheckpointSet, terminalFencingInventory, reconciliation, terminalOutcome, failure, updatedAt]
      properties:
        runId: { type: string, format: uuid }
        runVersion: { type: integer, minimum: 1 }
        retailerId: { type: string, format: uuid }
        operation: { enum: [snapshot, restore, rollback, tenant-migration] }
        phase: { enum: [registering, preparing, closing, snapshotting, aborting, resuming, reconciling, terminal] }
        status: { enum: [accepted, running, aborting, reconciling, succeeded, aborted, safely-resumed, failed] }
        policyVersion: { const: recovery-policy-v1 }
        placementGeneration: { type: integer, minimum: 1 }
        recoveryGeneration: { type: integer, minimum: 1 }
        activePhaseDeadlineAt: { type: string, format: date-time }
        roster: { $ref: '#/components/schemas/RecoveryRosterSnapshot' }
        participantCheckpointSet: { $ref: '#/components/schemas/RecoveryParticipantCheckpointSet' }
        terminalFencingInventory: { type: array, minItems: 11, maxItems: 11, items: { $ref: '#/components/schemas/RecoveryFencingEntry' } }
        reconciliation: { $ref: '#/components/schemas/RecoveryReconciliationState' }
        terminalOutcome: { $ref: '#/components/schemas/RecoveryTerminalOutcome' }
        failure: { oneOf: [{ $ref: '#/components/schemas/RecoveryFailure' }, { type: 'null' }] }
        updatedAt: { type: string, format: date-time }
      additionalProperties: false
    RecoveryQueueCheckpoint:
      type: object
      required: [vhost, queueName, queueIdentityDigest, queueMessageDigest, messageCount, quiescedAt]
      properties:
        vhost: { type: string }
        queueName: { type: string }
        queueIdentityDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
        queueMessageDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
        messageCount: { type: integer, minimum: 0 }
        quiescedAt: { type: string, format: date-time }
      additionalProperties: false
    RecoveryManifest:
      type: object
      required: [manifestVersion, manifestId, manifestDigest, runId, retailerId, operation, barrierId, barrierGeneration, fencingEpoch, placementGeneration, recoveryGeneration, policyVersion, roster, participantStateDigest, recoveryObjectives, backupCreatedAt, backupExpiresAt, recoveryStartedAt, recoveryCompletedAt, postgresql, rabbitmq, participantCheckpointSet, snapshot, terminalFencingInventory, reconciliation, terminalOutcome, verification]
      properties:
        manifestVersion: { const: 1.0.0 }
        manifestId: { type: string, format: uuid }
        manifestDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
        runId: { type: string, format: uuid }
        retailerId: { type: string, format: uuid }
        operation: { enum: [snapshot, restore, rollback, tenant-migration] }
        barrierId: { type: string, format: uuid }
        barrierGeneration: { type: integer, minimum: 1 }
        fencingEpoch: { type: integer, minimum: 1 }
        placementGeneration: { type: integer, minimum: 1 }
        recoveryGeneration: { type: integer, minimum: 1 }
        policyVersion: { const: recovery-policy-v1 }
        roster: { $ref: '#/components/schemas/RecoveryRosterSnapshot' }
        participantStateDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
        recoveryObjectives:
          type: object
          required: [rpoSeconds, rtoSeconds, backupRetentionDays]
          properties: { rpoSeconds: { const: 86400 }, rtoSeconds: { const: 7200 }, backupRetentionDays: { const: 30 } }
          additionalProperties: false
        backupCreatedAt: { type: string, format: date-time }
        backupExpiresAt: { type: string, format: date-time, description: Exactly 30 days after backupCreatedAt for recovery-policy-v1. }
        recoveryStartedAt: { type: string, format: date-time }
        recoveryCompletedAt: { type: string, format: date-time, description: 'Must be within the 7,200-second RTO for accepted local-profile evidence.' }
        postgresql:
          type: object
          required: [lsn, transactionEvidenceReference, transactionEvidenceDigest, databaseSnapshotReference, databaseSnapshotDigest]
          properties:
            lsn: { type: string, pattern: '^[0-9A-F]+/[0-9A-F]+$' }
            transactionEvidenceReference: { type: string, format: uri }
            transactionEvidenceDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
            databaseSnapshotReference: { type: string, format: uri }
            databaseSnapshotDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
          additionalProperties: false
        rabbitmq:
          type: object
          required: [brokerClusterIdentityDigest, topologyDigest, brokerSupportedQuiescedSnapshot, brokerCheckpointReference, brokerCheckpointDigest, queueIdentityDigest, queueMessageDigest, queues]
          properties:
            brokerClusterIdentityDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
            topologyDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
            brokerSupportedQuiescedSnapshot: { const: true }
            brokerCheckpointReference: { type: string, format: uri }
            brokerCheckpointDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
            queueIdentityDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
            queueMessageDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
            queues: { type: array, minItems: 1, items: { $ref: '#/components/schemas/RecoveryQueueCheckpoint' } }
          additionalProperties: false
        participantCheckpointSet: { $ref: '#/components/schemas/RecoveryParticipantCheckpointSet' }
        snapshot:
          type: object
          required: [state, reference, digest, capturedAt]
          properties:
            state: { enum: [quiesced, captured, verified, failed, quarantined] }
            reference: { type: string, format: uri }
            digest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
            capturedAt: { type: string, format: date-time }
          additionalProperties: false
        terminalFencingInventory: { type: array, minItems: 11, maxItems: 11, items: { $ref: '#/components/schemas/RecoveryFencingEntry' } }
        reconciliation: { $ref: '#/components/schemas/RecoveryReconciliationState' }
        terminalOutcome: { $ref: '#/components/schemas/RecoveryTerminalOutcome' }
        verification:
          type: object
          required: [status, verifiedAt, failures]
          properties:
            status: { enum: [pending, verified, failed] }
            verifiedAt: { type: [string, 'null'], format: date-time }
            failures: { type: array, maxItems: 100, items: { type: object, required: [code, detail], properties: { code: { type: string }, detail: { type: string }, participant: { type: [string, 'null'] }, expected: {}, actual: {} }, additionalProperties: false } }
          additionalProperties: false
      additionalProperties: false
    RecoveryReconciliationRequest:
      type: object
      required: [expectedRunVersion, action, reason]
      properties:
        expectedRunVersion: { type: integer, minimum: 1 }
        action: { enum: [retry-current-command, compare-authoritative-state, retry-from-checkpoint, operator-rollback] }
        participant: { oneOf: [{ $ref: '#/components/schemas/RecoveryParticipantName' }, { type: 'null' }] }
        reason: { type: string, minLength: 1, maxLength: 1000 }
      additionalProperties: false
    RecoveryProblemDetails:
      type: object
      required: [type, title, status, detail, instance, code, correlationId]
      properties:
        type: { type: string, format: uri }
        title: { type: string }
        status: { type: integer, minimum: 400, maximum: 599 }
        detail: { type: string }
        instance: { type: string, format: uri-reference }
        code:
          enum: [RECOVERY_AUTHENTICATION_INVALID, RECOVERY_AUTHORITY_DENIED, RECOVERY_OPERATOR_ROLE_REVOKED, RECOVERY_OPERATOR_SUBJECT_MISMATCH, RECOVERY_RUN_NOT_FOUND, RECOVERY_CONFIRMATION_INVALID, RECOVERY_GENERATION_STALE, RECOVERY_IDEMPOTENCY_CONFLICT, RECOVERY_REGISTRATION_MISSING, RECOVERY_PROTOCOL_UNSUPPORTED, RECOVERY_POLICY_UNSUPPORTED, RECOVERY_DEADLINE_CLASS_MISMATCH, RECOVERY_TRANSPORT_MISMATCH, RECOVERY_ROUTE_MISMATCH, RECOVERY_CAPABILITY_MISSING, RECOVERY_WORKLOAD_IDENTITY_MISMATCH, RECOVERY_REGISTRATION_STALE, RECOVERY_MANIFEST_NOT_CLOSED, RECOVERY_MANIFEST_VERIFICATION_FAILED, RECOVERY_RECONCILIATION_REQUIRED, RECOVERY_FENCE_UNRESOLVED, RECOVERY_PERSISTENCE_UNAVAILABLE]
        correlationId: { type: string, format: uuid }
        participant: { type: [string, 'null'] }
        expected: {}
        actual: {}
        failure: { oneOf: [{ $ref: '#/components/schemas/RecoveryFailure' }, { type: 'null' }] }
        reconciliation: { oneOf: [{ $ref: '#/components/schemas/RecoveryReconciliationState' }, { type: 'null' }] }
      additionalProperties: false
```

`RecoveryManifest` becomes immutable when its checkpoint set closes. `manifestDigest` is `sha256:` plus SHA-256 of its RFC 8785 canonical JSON with `manifestDigest` omitted; every nested evidence/checkpoint digest is verified before the manifest can report `verified`. Terminal outcomes are contract-defined. `succeeded` requires a verified broker-supported quiesced snapshot, a closed complete checkpoint set, verified PostgreSQL/queue evidence, and no unresolved fence. `aborted` requires every participant in the durable potentially-delivered inventory to acknowledge abort with a `cleared` or `terminally-suppressed` fence. `safely-resumed` requires every resume acknowledgement and successful authoritative reconciliation. Abort or resume timeout yields `failed`; every unresolved participant remains fenced and appears in both the terminal fencing inventory and typed failure. Stale, conflicting, late, or digest-mismatched evidence cannot satisfy a barrier or clear a fence.

The coordinator validates registration against this immutable policy before preview and again before any durable `prepare` dispatch. The authenticated participant workload must match `{participant}`. Compatibility failures use RFC 9457 with `code`, `participant`, `expected`, `actual`, and `correlationId`; stable codes are `RECOVERY_REGISTRATION_MISSING`, `RECOVERY_PROTOCOL_UNSUPPORTED`, `RECOVERY_POLICY_UNSUPPORTED`, `RECOVERY_DEADLINE_CLASS_MISMATCH`, `RECOVERY_TRANSPORT_MISMATCH`, `RECOVERY_ROUTE_MISMATCH`, `RECOVERY_CAPABILITY_MISSING`, `RECOVERY_WORKLOAD_IDENTITY_MISMATCH`, and `RECOVERY_REGISTRATION_STALE`. Invalid, expired, wrong-audience, wrong-client, or machine tokens on human operations return `401 RECOVERY_AUTHENTICATION_INVALID`; lost Operator membership returns `403 RECOVERY_OPERATOR_ROLE_REVOKED`; a different authenticated human at start returns `409 RECOVERY_OPERATOR_SUBJECT_MISMATCH`. Other identity mismatch is `403`, stale generation or idempotency conflict is `409`, and other compatibility failures are `422`. The run stores `RecoveryRosterSnapshot`, sorted by participant and digested as RFC 8785 canonical JSON with `rosterDigest` omitted; later registration changes cannot alter that run. The roster is fixed as follows:

```yaml shared-schema
kind: recovery-policy
version: recovery-policy-v1
protocolVersion: 1.0.0
recoveryObjectives:
  rpoSeconds: 86400
  rtoSeconds: 7200
  backupRetentionDays: 30
participantClasses:
  A:
    participants: [identity-access, tenant-directory]
    transport: synchronous-http
    deadlinesSeconds: { prepare: 30, close: 30, abort: 30, resume: 60 }
  B:
    participants: [inventory, purchasing]
    transport: rabbitmq
    deadlinesSeconds: { prepare: 60, close: 60, abort: 60, resume: 120 }
  C:
    participants: [demand-history, supplier-knowledge, model-lifecycle, forecasting, replenishment, assistant, audit-evidence]
    transport: rabbitmq
    deadlinesSeconds: { prepare: 120, close: 180, abort: 60, resume: 180 }
coordinatorDeadlinesSeconds:
  registration: 60
  allParticipantPrepare: 300
  closeDrainEvidence: 300
  localSnapshot: 1800
  globalAbort: 300
  globalResumeAndReconciliation: 600
  restartDurableResume: 120
routeIdentities:
  synchronousCommand: /internal/v1/recovery/participants/{participant}/retailers/{retailerId}/runs/{runId}/{command}
  asynchronousCommand: stocksense.recovery.command.v1.{participant}
  asynchronousAcknowledgement: stocksense.recovery.acknowledgement.v1
rules:
  commandDeadlineAt: earlier-of-participant-class-and-global-phase-deadline
  retryOrRestartDeadlineReset: forbidden
  prepareDispatchInventory: durable-before-send
  abortTargets: every-participant-with-potentially-delivered-prepare
  unresolvedParticipant: remains-fenced
  abortBeforeLatePrepare: terminal-guard-prevents-fence
  staleOrDigestMismatchedAcknowledgement: cannot-satisfy-barrier
```

### C27 — Recovery events to Audit Evidence

U15 publishes immutable lifecycle and terminal-outcome events. U10 projects them for authorized investigation but cannot change a run, satisfy a barrier, clear a fence, or make recovery successful.

```yaml
asyncapi: 3.0.0
info: { title: StockSense Recovery Audit Events, version: 1.0.0 }
channels:
  recoveryEvents:
    address: stocksense.recovery.event.v1
    messages:
      recoveryEvent:
        payload:
          schemaFormat: 'application/schema+json;version=draft-2020-12'
          schema:
            allOf:
              - $ref: 'https://contracts.stocksense.local/common/v1/message-envelope.schema.json'
              - type: object
                properties:
                  messageType:
                    enum: [recovery.run.requested, recovery.phase.changed, recovery.participant.acknowledged, recovery.manifest.closed, recovery.run.terminal]
                  schemaVersion: { const: 1.0.0 }
                  data:
                    type: object
                    required: [runId, recoveryGeneration, phase, details]
                    properties:
                      runId: { type: string, format: uuid }
                      recoveryGeneration: { type: integer, minimum: 1 }
                      phase: { enum: [registering, preparing, closing, snapshotting, aborting, resuming, reconciling, terminal] }
                      details: { type: object }
operations:
  publishRecoveryEvent:
    action: send
    channel: { $ref: '#/channels/recoveryEvents' }
  projectRecoveryEvent:
    action: receive
    channel: { $ref: '#/channels/recoveryEvents' }
```

## Composition and browser contracts

### C17 — Domain-service APIs consumed by the BFF

U11 consumes each provider's canonical OpenAPI document. The registry below prevents an aggregated BFF client from becoming the owner of domain semantics. It also records the minimum operation families required by the approved web experience.

```yaml
$schema: https://json-schema.org/draft/2020-12/schema
$id: https://contracts.stocksense.local/bff/v1/provider-registry.schema.json
title: BffProviderRegistry
type: object
required: [providers]
properties:
  providers:
    type: array
    minItems: 8
    items:
      type: object
      required: [provider, openapiDocument, requiredCapabilities]
      properties:
        provider:
          enum: [retail-data, supplier-knowledge, model-lifecycle, forecasting, planning-purchasing, assistant, audit-evidence, recovery-coordination]
        openapiDocument: { type: string }
        requiredCapabilities:
          type: array
          items: { type: string }
        timeoutProfile: { enum: [interactive-read, interactive-command, long-running-job] }
        retryProfile: { enum: [safe-read, idempotent-command, no-automatic-retry] }
      additionalProperties: false
additionalProperties: false
```

Required capabilities are retailer context and inventory/demand imports from U4; supplier ingestion, accepted terms and citations from U5; experiment/promotion evidence from U6; forecast runs from U7; review, recommendation and purchasing transitions from U8; conversations and tool calls from U9; tenant-authorized audit/correlation queries and the separate platform-Operator identity-audit query from U10; and recovery preview, confirmation, status, manifest and reconciliation state from U15.

U10's provider-owned global read surface is separate from every retailer route. U11 presents only the server-held U3-issued delegated human token; U10 validates issuer, `aud=stocksense-audit-evidence`, `client_id=stocksense-web-bff`, stable human `sub`, expiry and `audit.identity.global.read` scope, then obtains a fresh U3 platform-grant decision for that exact `sub` under U10's own narrow machine identity. The grant lookup cannot be replaced by a cached role claim, retailer membership, or a caller-supplied subject. U10 fails closed on grant-check failure and never falls back to a tenant projection. Results are redacted, bounded to 100 items and a 31-day requested window, and returned with no-store caching. The U10 registered workload alone can call C02's grant-reader operation.

```yaml
openapi: 3.1.2
info: { title: StockSense Global Identity Audit Read API, version: 1.0.0 }
paths:
  /internal/v1/platform/identity-audit:
    get:
      operationId: queryGlobalIdentityAudit
      security: [{ delegatedGlobalAuditToken: [audit.identity.global.read] }]
      parameters:
        - { in: query, name: cursor, required: false, schema: { type: string, maxLength: 512 } }
        - { in: query, name: limit, required: false, schema: { type: integer, minimum: 1, maximum: 100, default: 50 } }
        - { in: query, name: from, required: true, schema: { type: string, format: date-time } }
        - { in: query, name: to, required: true, schema: { type: string, format: date-time } }
        - { in: query, name: correlationId, required: false, schema: { type: string, format: uuid } }
      responses:
        '200':
          description: Redacted global identity-security audit page after current platform-grant check
          headers: { Cache-Control: { schema: { const: 'no-store' } } }
          content:
            application/json:
              schema:
                type: object
                required: [items, hasMore, projectionLagSeconds]
                properties:
                  items:
                    type: array
                    maxItems: 100
                    items:
                      type: object
                      required: [messageId, occurredAt, action, outcome, reasonCode, correlationId]
                      properties:
                        messageId: { type: string, format: uuid }
                        occurredAt: { type: string, format: date-time }
                        action: { type: string }
                        outcome: { enum: [accepted, denied, failed] }
                        reasonCode: { type: string }
                        correlationId: { type: string, format: uuid }
                      additionalProperties: false
                  nextCursor: { type: [string, 'null'] }
                  hasMore: { type: boolean }
                  projectionLagSeconds: { type: integer, minimum: 0 }
                additionalProperties: false
        '401': { description: 'Missing, invalid, expired, wrong-client, wrong-audience, or non-human delegated token; RFC 9457 problem' }
        '403': { description: Current platform Operator grant absent or revoked; retailer role alone is insufficient; RFC 9457 problem }
        '422': { description: Invalid range or window exceeding 31 days; RFC 9457 problem }
        '503': { description: Grant check or projection unavailable; fail closed with RFC 9457 problem }
components:
  securitySchemes:
    delegatedGlobalAuditToken:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: /connect/authorize
          tokenUrl: /connect/token
          scopes:
            audit.identity.global.read: Read redacted identity security outcomes with a current platform Operator grant
```

### C18 — Browser API exposed by the Web BFF

The browser sends only the secure session cookie, a BFF-issued CSRF token on every mutation, one idempotency identity for each logical command, a resource-route retailer identifier where applicable, and correlation metadata. It never sends service credentials, raw access tokens, or an authority-bearing retailer header. For recovery calls, U11 uses the server-held delegated Operator token defined by C26 and never forwards a browser-supplied identity value to U15. For global identity-audit reads, U11 uses the distinct server-held C02/C17 delegated human token, never a retailer role claim or a machine token; it does not turn a tenant route into a global one. U12 exposes this read-only capability in a separate platform-operations view, not a retailer dashboard. The BFF returns HTTP `200` for aggregate reads even when a section is stale or unavailable; each section carries a typed state so generated clients do not depend on `206` or prose.

```yaml
openapi: 3.1.2
info:
  title: StockSense Browser API
  version: 1.0.0
  x-contract-owner: web-experience
  x-contract-package: stocksense-contracts
  x-contract-protocol-version: 1.0.0
servers:
  - { url: /, description: Same-origin Web BFF }
paths:
  /api/v1/session:
    get:
      operationId: getSession
      responses:
        '200': { description: 'Session, roles, authorized retailer choices and contract metadata', content: { application/json: { schema: { $ref: '#/components/schemas/SessionResponse' } } } }
        default: { $ref: '#/components/responses/Problem' }
  /api/v1/session/csrf:
    get:
      operationId: bootstrapCsrf
      responses:
        '200':
          description: Session-bound CSRF token; bootstrap and every rotation are non-cacheable
          headers: { Cache-Control: { schema: { const: 'no-store' } }, Pragma: { schema: { const: 'no-cache' } } }
          content: { application/json: { schema: { $ref: '#/components/schemas/CsrfTokenResponse' } } }
        default: { $ref: '#/components/responses/Problem' }
  /api/v1/retailers/{retailerId}/dashboard:
    parameters: [{ $ref: '#/components/parameters/RetailerId' }]
    get:
      operationId: getDashboard
      parameters: [{ $ref: '#/components/parameters/IfNoneMatch' }]
      responses:
        '200': { description: 'Typed inventory, forecast and review aggregate including empty, stale, unavailable and denied sections', content: { application/json: { schema: { $ref: '#/components/schemas/AggregateResponse' } } } }
        '304': { description: Aggregate unchanged }
        default: { $ref: '#/components/responses/Problem' }
  /api/v1/retailers/{retailerId}/imports:
    parameters: [{ $ref: '#/components/parameters/RetailerId' }]
    post:
      operationId: createImport
      parameters: [{ $ref: '#/components/parameters/Csrf' }, { $ref: '#/components/parameters/Idempotency' }, { $ref: '#/components/parameters/UploadLength' }]
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema: { $ref: '#/components/schemas/ImportRequest' }
            x-stocksense-max-bytes: 26214400
      responses:
        '202': { $ref: '#/components/responses/OperationAccepted' }
        '413': { $ref: '#/components/responses/Problem' }
        '415': { $ref: '#/components/responses/Problem' }
        '422': { $ref: '#/components/responses/Problem' }
        default: { $ref: '#/components/responses/Problem' }
  /api/v1/retailers/{retailerId}/reviews:request:
    parameters: [{ $ref: '#/components/parameters/RetailerId' }]
    post:
      operationId: requestManualReview
      parameters: [{ $ref: '#/components/parameters/Csrf' }, { $ref: '#/components/parameters/Idempotency' }]
      requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/ManualReviewRequest' } } } }
      responses:
        '202': { $ref: '#/components/responses/OperationAccepted' }
        '429': { $ref: '#/components/responses/Problem' }
        default: { $ref: '#/components/responses/Problem' }
  /api/v1/retailers/{retailerId}/purchase-drafts:
    parameters: [{ $ref: '#/components/parameters/RetailerId' }]
    post:
      operationId: createPurchaseDraft
      parameters: [{ $ref: '#/components/parameters/Csrf' }, { $ref: '#/components/parameters/Idempotency' }]
      requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/PurchaseDraftRequest' } } } }
      responses:
        '201': { description: Draft and aggregate version, headers: { X-CSRF-Token: { $ref: '#/components/headers/RotatedCsrf' } }, content: { application/json: { schema: { $ref: '#/components/schemas/PurchaseAggregateResponse' } } } }
        default: { $ref: '#/components/responses/Problem' }
  /api/v1/retailers/{retailerId}/purchase-drafts/{proposalId}:
    parameters: [{ $ref: '#/components/parameters/RetailerId' }, { in: path, name: proposalId, required: true, schema: { type: string, format: uuid } }]
    patch:
      operationId: editPurchaseDraft
      parameters: [{ $ref: '#/components/parameters/Csrf' }, { $ref: '#/components/parameters/Idempotency' }]
      requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/PurchaseDraftRequest' } } } }
      responses:
        '200': { description: Updated draft and aggregate version, headers: { X-CSRF-Token: { $ref: '#/components/headers/RotatedCsrf' } }, content: { application/json: { schema: { $ref: '#/components/schemas/PurchaseAggregateResponse' } } } }
        default: { $ref: '#/components/responses/Problem' }
  /api/v1/retailers/{retailerId}/purchase-orders/{orderId}/{command}:
    parameters:
      - { $ref: '#/components/parameters/RetailerId' }
      - { in: path, name: orderId, required: true, schema: { type: string, format: uuid } }
      - { in: path, name: command, required: true, schema: { enum: [submit, approve, reject, cancel, record-receipt] } }
    post:
      operationId: transitionPurchaseOrder
      parameters: [{ $ref: '#/components/parameters/Csrf' }, { $ref: '#/components/parameters/Idempotency' }]
      requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/PurchaseCommandRequest' } } } }
      responses:
        '200': { description: Transition result and aggregate version, headers: { X-CSRF-Token: { $ref: '#/components/headers/RotatedCsrf' } }, content: { application/json: { schema: { $ref: '#/components/schemas/PurchaseAggregateResponse' } } } }
        default: { $ref: '#/components/responses/Problem' }
  /api/v1/retailers/{retailerId}/assistant/conversations/{conversationId}/turns:
    parameters: [{ $ref: '#/components/parameters/RetailerId' }, { in: path, name: conversationId, required: true, schema: { type: string, format: uuid } }]
    post:
      operationId: createAssistantTurn
      parameters: [{ $ref: '#/components/parameters/Csrf' }, { $ref: '#/components/parameters/Idempotency' }]
      requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/AssistantTurnRequest' } } } }
      responses:
        '202': { $ref: '#/components/responses/OperationAccepted' }
        default: { $ref: '#/components/responses/Problem' }
  /api/v1/retailers/{retailerId}/assistant/conversations/{conversationId}/events:
    parameters: [{ $ref: '#/components/parameters/RetailerId' }, { in: path, name: conversationId, required: true, schema: { type: string, format: uuid } }]
    get:
      operationId: streamAssistantEvents
      parameters: [{ in: header, name: Last-Event-ID, required: false, schema: { type: string, maxLength: 128 } }]
      responses:
        '200': { description: Ordered typed SSE stream with contiguous resumable sequence, content: { text/event-stream: { schema: { $ref: '#/components/schemas/AssistantStreamEvent' } } } }
        '409': { description: Resume cursor expired; client must fetch the snapshot }
        default: { $ref: '#/components/responses/Problem' }
  /api/v1/retailers/{retailerId}/assistant/conversations/{conversationId}/snapshot:
    parameters: [{ $ref: '#/components/parameters/RetailerId' }, { in: path, name: conversationId, required: true, schema: { type: string, format: uuid } }]
    get:
      operationId: getAssistantSnapshot
      parameters: [{ in: query, name: afterSequence, required: false, schema: { type: integer, minimum: 0 } }]
      responses:
        '200': { description: Bounded conversation snapshot and latest resumable sequence, content: { application/json: { schema: { $ref: '#/components/schemas/AssistantSnapshotResponse' } } } }
        default: { $ref: '#/components/responses/Problem' }
  /api/v1/retailers/{retailerId}/audit:
    parameters: [{ $ref: '#/components/parameters/RetailerId' }]
    get:
      operationId: queryBusinessAudit
      parameters: [{ $ref: '#/components/parameters/Cursor' }, { $ref: '#/components/parameters/PageLimit' }, { $ref: '#/components/parameters/From' }, { $ref: '#/components/parameters/To' }, { in: query, name: correlationId, required: false, schema: { type: string, format: uuid } }]
      responses:
        '200': { description: Bounded tenant-authorized audit page with lag and contract metadata, content: { application/json: { schema: { $ref: '#/components/schemas/QueryPageResponse' } } } }
        default: { $ref: '#/components/responses/Problem' }
  /api/v1/platform/identity-audit:
    get:
      operationId: queryPlatformIdentityAudit
      parameters: [{ $ref: '#/components/parameters/Cursor' }, { $ref: '#/components/parameters/PageLimit' }, { $ref: '#/components/parameters/From' }, { $ref: '#/components/parameters/To' }, { in: query, name: correlationId, required: false, schema: { type: string, format: uuid } }]
      responses:
        '200':
          description: Redacted platform-Operator identity-audit page, separate from all retailer projections
          headers: { Cache-Control: { schema: { const: 'no-store' } } }
          content: { application/json: { schema: { $ref: '#/components/schemas/GlobalIdentityAuditPageResponse' } } }
        '401': { description: Human session missing or invalid; RFC 9457 problem }
        '403': { description: Current platform Operator grant absent or revoked; retailer Operator alone is insufficient; RFC 9457 problem }
        '503': { description: U3 grant check or U10 projection unavailable; fail closed with RFC 9457 problem }
        default: { $ref: '#/components/responses/Problem' }
  /api/v1/retailers/{retailerId}/evidence:
    parameters: [{ $ref: '#/components/parameters/RetailerId' }]
    get:
      operationId: queryEvidence
      parameters: [{ $ref: '#/components/parameters/Cursor' }, { $ref: '#/components/parameters/PageLimit' }, { $ref: '#/components/parameters/From' }, { $ref: '#/components/parameters/To' }, { in: query, name: requirementId, required: false, schema: { type: string, maxLength: 50 } }]
      responses:
        '200': { description: Bounded requirement/evidence page with checksums, content: { application/json: { schema: { $ref: '#/components/schemas/QueryPageResponse' } } } }
        default: { $ref: '#/components/responses/Problem' }
  /api/v1/retailers/{retailerId}/operations/{operationId}:
    parameters: [{ $ref: '#/components/parameters/RetailerId' }, { in: path, name: operationId, required: true, schema: { type: string, format: uuid } }]
    get:
      operationId: getOperation
      responses:
        '200': { description: 'Durable status, progress, result/error reference and reconciliation state', content: { application/json: { schema: { $ref: '#/components/schemas/OperationStatusResponse' } } } }
        default: { $ref: '#/components/responses/Problem' }
  /api/v1/retailers/{retailerId}/operations/{operationId}:reconcile:
    parameters: [{ $ref: '#/components/parameters/RetailerId' }, { in: path, name: operationId, required: true, schema: { type: string, format: uuid } }]
    post:
      operationId: reconcileOperation
      parameters: [{ $ref: '#/components/parameters/Csrf' }, { $ref: '#/components/parameters/Idempotency' }]
      requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/ReconciliationRequest' } } } }
      responses:
        '202': { $ref: '#/components/responses/OperationAccepted' }
        default: { $ref: '#/components/responses/Problem' }
  /api/v1/retailers/{retailerId}/recovery-runs:preview:
    parameters: [{ $ref: '#/components/parameters/RetailerId' }]
    post:
      operationId: previewRecovery
      parameters: [{ $ref: '#/components/parameters/Csrf' }, { $ref: '#/components/parameters/Idempotency' }]
      requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/RecoveryPreviewRequest' } } } }
      responses:
        '200': { description: 'Scope, roster, manifest summary and bound confirmation token', headers: { X-CSRF-Token: { $ref: '#/components/headers/RotatedCsrf' } }, content: { application/json: { schema: { $ref: '#/components/schemas/RecoveryPreviewResponse' } } } }
        default: { $ref: '#/components/responses/Problem' }
  /api/v1/retailers/{retailerId}/recovery-runs:
    parameters: [{ $ref: '#/components/parameters/RetailerId' }]
    post:
      operationId: startRecovery
      parameters: [{ $ref: '#/components/parameters/Csrf' }, { $ref: '#/components/parameters/Idempotency' }, { in: header, name: X-Recovery-Confirmation, required: true, schema: { type: string, minLength: 32 } }]
      requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/RecoveryStartRequest' } } } }
      responses:
        '202': { description: Recovery run accepted, headers: { Location: { schema: { type: string, format: uri-reference } }, X-CSRF-Token: { $ref: '#/components/headers/RotatedCsrf' } }, content: { application/json: { schema: { $ref: '#/components/schemas/RecoveryOperationHandleResponse' } } } }
        default: { $ref: '#/components/responses/Problem' }
  /api/v1/retailers/{retailerId}/recovery-runs/{runId}:
    parameters: [{ $ref: '#/components/parameters/RetailerId' }, { in: path, name: runId, required: true, schema: { type: string, format: uuid } }]
    get:
      operationId: getRecoveryStatus
      responses:
        '200': { description: 'Current phase, deadlines, roster, fences, reconciliation and terminal outcome', content: { application/json: { schema: { $ref: '#/components/schemas/RecoveryStatusResponse' } } } }
        default: { $ref: '#/components/responses/Problem' }
  /api/v1/retailers/{retailerId}/recovery-runs/{runId}/manifest:
    parameters: [{ $ref: '#/components/parameters/RetailerId' }, { in: path, name: runId, required: true, schema: { type: string, format: uuid } }]
    get:
      operationId: getRecoveryManifest
      responses:
        '200': { description: Browser-safe versioned recovery manifest and verification result, content: { application/json: { schema: { type: object, required: [metadata, manifestVersion, digest, verificationState], properties: { metadata: { $ref: '#/components/schemas/ContractMetadata' }, manifestVersion: { type: string }, digest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }, verificationState: { enum: [pending, verified, failed] } } } } } }
        default: { $ref: '#/components/responses/Problem' }
components:
  securitySchemes:
    bffSession: { type: apiKey, in: cookie, name: __Host-stocksense-session }
  parameters:
    RetailerId: { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
    Csrf: { in: header, name: X-CSRF-Token, required: true, schema: { type: string, minLength: 32 } }
    Idempotency: { in: header, name: Idempotency-Key, required: true, schema: { type: string, minLength: 16, maxLength: 128 } }
    UploadLength: { in: header, name: Content-Length, required: true, schema: { type: integer, minimum: 1, maximum: 26214400 } }
    IfNoneMatch: { in: header, name: If-None-Match, required: false, schema: { type: string, maxLength: 200 } }
    Cursor: { in: query, name: cursor, required: false, schema: { type: string, maxLength: 512 } }
    PageLimit: { in: query, name: limit, required: false, schema: { type: integer, minimum: 1, maximum: 100, default: 50 } }
    From: { in: query, name: from, required: true, schema: { type: string, format: date-time } }
    To: { in: query, name: to, required: true, schema: { type: string, format: date-time }, description: Maximum query span is 31 days }
  headers:
    RotatedCsrf: { description: Fresh session-bound token returned after every successful mutation, schema: { type: string } }
  responses:
    OperationAccepted:
      description: Durable operation accepted or matching prior command returned
      headers: { Location: { schema: { type: string, format: uri-reference } }, X-CSRF-Token: { $ref: '#/components/headers/RotatedCsrf' } }
      content: { application/json: { schema: { $ref: '#/components/schemas/OperationHandle' } } }
    Problem:
      description: Stable RFC 9457 error; unauthorized tenant resources are hidden as 404 where required
      content: { application/problem+json: { schema: { $ref: '#/components/schemas/ProblemDetails' } } }
  schemas:
    ContractMetadata:
      type: object
      required: [contractVersion, responseSchema, generatedAt, correlationId]
      properties:
        contractVersion: { const: 1.0.0 }
        responseSchema: { type: string }
        generatedAt: { type: string, format: date-time }
        correlationId: { type: string, format: uuid }
      additionalProperties: false
    Section:
      type: object
      required: [name, state, observedAt, sourceVersion]
      properties:
        name: { type: string }
        state: { enum: [ready, empty, stale, unavailable, denied, failed] }
        observedAt: { type: string, format: date-time }
        sourceVersion: { type: [string, 'null'] }
        retryAfter: { type: [string, 'null'], format: date-time }
        data: {}
        problem: { oneOf: [{ $ref: '#/components/schemas/ProblemDetails' }, { type: 'null' }] }
      additionalProperties: false
    AggregateResponse:
      type: object
      required: [metadata, aggregateVersion, aggregateState, sections]
      properties:
        metadata: { $ref: '#/components/schemas/ContractMetadata' }
        aggregateVersion: { type: string }
        aggregateState: { enum: [complete, partial] }
        sections: { type: array, maxItems: 20, items: { $ref: '#/components/schemas/Section' } }
      additionalProperties: false
    SessionResponse:
      type: object
      required: [metadata, subjectId, expiresAt, retailers]
      properties:
        metadata: { $ref: '#/components/schemas/ContractMetadata' }
        subjectId: { type: string }
        expiresAt: { type: string, format: date-time }
        retailers: { type: array, maxItems: 100, items: { type: object, required: [retailerId, roles], properties: { retailerId: { type: string, format: uuid }, roles: { type: array, items: { enum: [planner, manager, operator] } } } } }
      additionalProperties: false
    CsrfTokenResponse:
      type: object
      required: [metadata, token, expiresAt, rotation]
      properties:
        metadata: { $ref: '#/components/schemas/ContractMetadata' }
        token: { type: string, minLength: 32 }
        expiresAt: { type: string, format: date-time }
        rotation: { enum: [bootstrap, session-renewal, privilege-change, post-mutation] }
      additionalProperties: false
    OperationHandle:
      type: object
      required: [metadata, operationId, operationType, status, statusUrl, acceptedAt]
      properties:
        metadata: { $ref: '#/components/schemas/ContractMetadata' }
        operationId: { type: string, format: uuid }
        operationType: { type: string }
        status: { enum: [accepted, queued, running, reconciling] }
        statusUrl: { type: string, format: uri-reference }
        acceptedAt: { type: string, format: date-time }
      additionalProperties: false
    OperationStatusResponse:
      type: object
      required: [metadata, operationId, status, reconciliation, updatedAt]
      properties:
        metadata: { $ref: '#/components/schemas/ContractMetadata' }
        operationId: { type: string, format: uuid }
        status: { enum: [accepted, queued, running, reconciling, succeeded, failed, cancelled, unavailable] }
        progressPercent: { type: integer, minimum: 0, maximum: 100 }
        result: {}
        problem: { oneOf: [{ $ref: '#/components/schemas/ProblemDetails' }, { type: 'null' }] }
        reconciliation: { enum: [not-required, pending, reconciled, mismatch, operator-action-required] }
        updatedAt: { type: string, format: date-time }
      additionalProperties: false
    ImportRequest:
      type: object
      required: [kind, file]
      properties:
        kind: { enum: [inventory-csv, demand-csv, supplier-csv, supplier-text-pdf] }
        file: { type: string, format: binary }
      additionalProperties: false
      x-stocksense-kind-limits:
        supplier-csv: { maximumBytes: 5242880, maximumRows: 20000 }
        supplier-text-pdf: { maximumBytes: 20971520, maximumPages: 200, scannedOrEncrypted: unsupported }
    ManualReviewRequest: { type: object, required: [expectedInventoryVersion, expectedSupplierTermsVersion], properties: { expectedInventoryVersion: { type: string }, expectedSupplierTermsVersion: { type: string } }, additionalProperties: false }
    PurchaseDraftRequest:
      type: object
      required: [expectedVersion, supplierId, lines]
      properties:
        expectedVersion: { type: integer, minimum: 0 }
        supplierId: { type: string, format: uuid }
        lines: { type: array, minItems: 1, maxItems: 200, items: { type: object, required: [productId, quantity, unitPrice, expectedRecommendationVersion], properties: { productId: { type: string, format: uuid }, quantity: { type: integer, minimum: 1 }, unitPrice: { type: number, exclusiveMinimum: 0 }, expectedRecommendationVersion: { type: string } }, additionalProperties: false } }
      additionalProperties: false
    PurchaseCommandRequest:
      type: object
      required: [expectedVersion]
      properties:
        expectedVersion: { type: integer, minimum: 1 }
        reason: { type: string, maxLength: 1000 }
        receipt: { type: object, required: [receiptId, receivedAt, lines], properties: { receiptId: { type: string, format: uuid }, receivedAt: { type: string, format: date-time }, lines: { type: array, minItems: 1, maxItems: 200, items: { type: object, required: [orderLineId, quantity], properties: { orderLineId: { type: string, format: uuid }, quantity: { type: integer, minimum: 1 } }, additionalProperties: false } } }, additionalProperties: false }
      additionalProperties: false
    PurchaseAggregateResponse: { type: object, required: [metadata, aggregateId, aggregateVersion, status, lines], properties: { metadata: { $ref: '#/components/schemas/ContractMetadata' }, aggregateId: { type: string, format: uuid }, aggregateVersion: { type: integer, minimum: 1 }, status: { enum: [draft, submitted, approved, rejected, cancelled, partially-received, received] }, lines: { type: array, maxItems: 200, items: { type: object } } }, additionalProperties: false }
    AssistantTurnRequest: { type: object, required: [message, expectedConversationVersion], properties: { message: { type: string, minLength: 1, maxLength: 8000 }, expectedConversationVersion: { type: integer, minimum: 0 } }, additionalProperties: false }
    AssistantStreamEvent:
      type: object
      required: [eventId, sequence, conversationId, turnId, operationId, eventType, occurredAt, terminal, payload]
      properties:
        eventId: { type: string, maxLength: 128 }
        sequence: { type: integer, minimum: 1 }
        conversationId: { type: string, format: uuid }
        turnId: { type: string, format: uuid }
        operationId: { type: string, format: uuid }
        eventType: { enum: [turn.accepted, response.delta, citation.added, tool.started, tool.completed, turn.completed, turn.failed, snapshot.required] }
        occurredAt: { type: string, format: date-time }
        terminal: { type: boolean }
        payload: { type: object }
      additionalProperties: false
    AssistantSnapshotResponse: { type: object, required: [metadata, conversationId, conversationVersion, latestSequence, turns], properties: { metadata: { $ref: '#/components/schemas/ContractMetadata' }, conversationId: { type: string, format: uuid }, conversationVersion: { type: integer, minimum: 0 }, latestSequence: { type: integer, minimum: 0 }, turns: { type: array, maxItems: 100, items: { type: object } } }, additionalProperties: false }
    QueryPageResponse: { type: object, required: [metadata, items, hasMore], properties: { metadata: { $ref: '#/components/schemas/ContractMetadata' }, items: { type: array, maxItems: 100, items: { type: object } }, nextCursor: { type: [string, 'null'] }, hasMore: { type: boolean }, projectionLagSeconds: { type: integer, minimum: 0 } }, additionalProperties: false }
    GlobalIdentityAuditPageResponse:
      type: object
      required: [metadata, items, hasMore, projectionLagSeconds]
      properties:
        metadata: { $ref: '#/components/schemas/ContractMetadata' }
        items:
          type: array
          maxItems: 100
          items:
            type: object
            required: [messageId, occurredAt, action, outcome, reasonCode, correlationId]
            properties:
              messageId: { type: string, format: uuid }
              occurredAt: { type: string, format: date-time }
              action: { type: string }
              outcome: { enum: [accepted, denied, failed] }
              reasonCode: { type: string }
              correlationId: { type: string, format: uuid }
            additionalProperties: false
        nextCursor: { type: [string, 'null'] }
        hasMore: { type: boolean }
        projectionLagSeconds: { type: integer, minimum: 0 }
      additionalProperties: false
    ReconciliationRequest: { type: object, required: [expectedOperationVersion, action], properties: { expectedOperationVersion: { type: integer, minimum: 1 }, action: { enum: [retry-from-checkpoint, compare-authoritative-state, acknowledge-manual-resolution] }, reason: { type: string, maxLength: 1000 } }, additionalProperties: false }
    RecoveryPreviewRequest:
      type: object
      required: [operation, expectedPlacementGeneration, expectedRecoveryGeneration, policyVersion]
      properties:
        operation: { enum: [snapshot, restore, rollback, tenant-migration] }
        expectedPlacementGeneration: { type: integer, minimum: 1 }
        expectedRecoveryGeneration: { type: integer, minimum: 1 }
        policyVersion: { const: recovery-policy-v1 }
        sourceManifestDigest: { type: [string, 'null'], pattern: '^sha256:[0-9a-f]{64}$' }
      additionalProperties: false
    RecoveryRosterSummary:
      type: object
      required: [runId, retailerId, placementGeneration, recoveryGeneration, policyVersion, rosterDigest, participants]
      properties:
        runId: { type: string, format: uuid }
        retailerId: { type: string, format: uuid }
        placementGeneration: { type: integer, minimum: 1 }
        recoveryGeneration: { type: integer, minimum: 1 }
        policyVersion: { const: recovery-policy-v1 }
        rosterDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
        participants:
          type: array
          minItems: 11
          maxItems: 11
          items:
            type: object
            required: [participant, participantClass, requiredForSuccess, deadlinesSeconds]
            properties:
              participant: { type: string }
              participantClass: { enum: [A, B, C] }
              requiredForSuccess: { const: true }
              deadlinesSeconds: { type: object, required: [prepare, close, abort, resume], properties: { prepare: { type: integer, minimum: 1 }, close: { type: integer, minimum: 1 }, abort: { type: integer, minimum: 1 }, resume: { type: integer, minimum: 1 } }, additionalProperties: false }
            additionalProperties: false
      additionalProperties: false
    RecoveryManifestSummary:
      type: object
      required: [manifestVersion, operation, policyVersion, recoveryObjectives, expectedParticipantCount, queueScopeDigest]
      properties:
        manifestVersion: { const: 1.0.0 }
        operation: { enum: [snapshot, restore, rollback, tenant-migration] }
        policyVersion: { const: recovery-policy-v1 }
        recoveryObjectives: { type: object, required: [rpoSeconds, rtoSeconds, backupRetentionDays], properties: { rpoSeconds: { const: 86400 }, rtoSeconds: { const: 7200 }, backupRetentionDays: { const: 30 } }, additionalProperties: false }
        expectedParticipantCount: { const: 11 }
        queueScopeDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
      additionalProperties: false
    RecoveryConfirmationBindingView:
      type: object
      required: [previewId, reservedRunId, operatorSubject, operatorClientId, retailerId, operation, manifestDigest, rosterDigest, placementGeneration, recoveryGeneration, policyVersion, expiresAt]
      properties:
        previewId: { type: string, format: uuid }
        reservedRunId: { type: string, format: uuid }
        operatorSubject: { type: string }
        operatorClientId: { const: stocksense-web-bff }
        retailerId: { type: string, format: uuid }
        operation: { enum: [snapshot, restore, rollback, tenant-migration] }
        manifestDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
        rosterDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
        placementGeneration: { type: integer, minimum: 1 }
        recoveryGeneration: { type: integer, minimum: 1 }
        policyVersion: { const: recovery-policy-v1 }
        expiresAt: { type: string, format: date-time }
      additionalProperties: false
    RecoveryPreviewResponse:
      type: object
      required: [metadata, previewId, roster, manifestSummary, confirmationBinding, confirmationToken]
      properties:
        metadata: { $ref: '#/components/schemas/ContractMetadata' }
        previewId: { type: string, format: uuid }
        roster: { $ref: '#/components/schemas/RecoveryRosterSummary' }
        manifestSummary: { $ref: '#/components/schemas/RecoveryManifestSummary' }
        confirmationBinding: { $ref: '#/components/schemas/RecoveryConfirmationBindingView' }
        confirmationToken: { type: string, minLength: 32 }
      additionalProperties: false
    RecoveryStartRequest:
      type: object
      required: [previewId, operation, manifestDigest, rosterDigest, expectedPlacementGeneration, expectedRecoveryGeneration]
      properties:
        previewId: { type: string, format: uuid }
        operation: { enum: [snapshot, restore, rollback, tenant-migration] }
        manifestDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
        rosterDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
        expectedPlacementGeneration: { type: integer, minimum: 1 }
        expectedRecoveryGeneration: { type: integer, minimum: 1 }
      additionalProperties: false
    RecoveryOperationHandleResponse:
      type: object
      required: [metadata, runId, operation, status, acceptedAt, statusUrl, manifestUrl]
      properties:
        metadata: { $ref: '#/components/schemas/ContractMetadata' }
        runId: { type: string, format: uuid }
        operation: { enum: [snapshot, restore, rollback, tenant-migration, reconcile] }
        status: { enum: [accepted, registering, preparing, closing, snapshotting, aborting, resuming, reconciling] }
        acceptedAt: { type: string, format: date-time }
        statusUrl: { type: string, format: uri-reference }
        manifestUrl: { type: string, format: uri-reference }
      additionalProperties: false
    RecoveryStatusResponse:
      type: object
      required: [metadata, runId, runVersion, retailerId, operation, phase, status, policyVersion, placementGeneration, recoveryGeneration, activePhaseDeadlineAt, roster, participantCheckpointSet, terminalFencingInventory, reconciliation, terminalOutcome, failure, updatedAt]
      properties:
        metadata: { $ref: '#/components/schemas/ContractMetadata' }
        runId: { type: string, format: uuid }
        runVersion: { type: integer, minimum: 1 }
        retailerId: { type: string, format: uuid }
        operation: { enum: [snapshot, restore, rollback, tenant-migration] }
        phase: { enum: [registering, preparing, closing, snapshotting, aborting, resuming, reconciling, terminal] }
        status: { enum: [accepted, running, aborting, reconciling, succeeded, aborted, safely-resumed, failed] }
        policyVersion: { const: recovery-policy-v1 }
        placementGeneration: { type: integer, minimum: 1 }
        recoveryGeneration: { type: integer, minimum: 1 }
        activePhaseDeadlineAt: { type: string, format: date-time }
        roster: { $ref: '#/components/schemas/RecoveryRosterSummary' }
        participantCheckpointSet: { type: object, required: [expectedParticipantCount, capturedParticipantCount, status], properties: { expectedParticipantCount: { const: 11 }, capturedParticipantCount: { type: integer, minimum: 0, maximum: 11 }, status: { enum: [open, closed, incomplete, invalid] } }, additionalProperties: false }
        terminalFencingInventory: { type: array, minItems: 11, maxItems: 11, items: { type: object, required: [participant, preparePotentiallyDelivered, abortRequired, terminalPhase, fenceDisposition], properties: { participant: { type: string }, preparePotentiallyDelivered: { type: boolean }, abortRequired: { type: boolean }, terminalPhase: { enum: [none, aborted, resumed, failed] }, fenceDisposition: { enum: [active, cleared, terminally-suppressed, unresolved] } }, additionalProperties: false } }
        reconciliation: { type: object, required: [status, safeToResume, unresolvedParticipants], properties: { status: { enum: [not-required, pending, reconciled, mismatch, operator-action-required, failed] }, safeToResume: { type: boolean }, unresolvedParticipants: { type: array, uniqueItems: true, items: { type: string } } }, additionalProperties: false }
        terminalOutcome: { enum: [pending, succeeded, aborted, safely-resumed, failed] }
        failure: { oneOf: [{ type: object, required: [code, failureClass, phase, occurredAt, unresolvedParticipants, retryable], properties: { code: { type: string }, failureClass: { type: string }, phase: { type: string }, occurredAt: { type: string, format: date-time }, unresolvedParticipants: { type: array, items: { type: string } }, retryable: { type: boolean } }, additionalProperties: false }, { type: 'null' }] }
        updatedAt: { type: string, format: date-time }
      additionalProperties: false
    ProblemDetails:
      type: object
      required: [type, title, status, detail, instance, code, correlationId]
      properties:
        type: { type: string, format: uri }
        title: { type: string }
        status: { type: integer, minimum: 400, maximum: 599 }
        detail: { type: string }
        instance: { type: string, format: uri-reference }
        code: { enum: [AUTHENTICATION_REQUIRED, AUTHORITY_DENIED, RESOURCE_NOT_FOUND, CSRF_INVALID, IDEMPOTENCY_CONFLICT, VERSION_CONFLICT, VALIDATION_FAILED, QUOTA_EXHAUSTED, DEPENDENCY_UNAVAILABLE, OPERATION_RECONCILIATION_REQUIRED, RESUME_CURSOR_EXPIRED, RECOVERY_CONFIRMATION_INVALID, RECOVERY_PARTICIPANT_INCOMPATIBLE] }
        correlationId: { type: string, format: uuid }
        errors: { type: array, maxItems: 100, items: { type: object, required: [path, code], properties: { path: { type: string }, code: { type: string }, message: { type: string } }, additionalProperties: false } }
      additionalProperties: false
security:
  - bffSession: []
```

For recovery, U11 projects C26's immutable `roster.registrations` to the browser's `roster.participants` and omits workload identities, internal routes, checkpoint references, and the confirmation nonce. It passes through U15's original roster and manifest digests; it never recomputes either digest from a redacted browser projection. The preview response gives the Operator the participant scope, deadline classes, recovery objectives and exact confirmation binding before the start request. The BFF maps the C26 handle and run status to the typed browser responses above while preserving run/version, phase, fence disposition, reconciliation and terminal outcome. Its start request uses the same preview ID, prefixed digests, operation and generations as C26; `X-Recovery-Confirmation` remains server-verified by U15.

Supplier ingestion applies this contract-defined classification profile after enforcing the C18 upload bounds. Only `Validated` may publish accepted terms automatically; every other outcome preserves source/provenance and omissions without becoming authoritative.

```yaml shared-schema
kind: supplier-extraction-profile
version: 1.0.0
limits:
  csv: { maximumRows: 20000, maximumBytes: 5242880 }
  textPdf: { maximumPages: 200, maximumBytes: 20971520 }
outcomes: [Validated, PartiallyValidated, Failed, Unsupported]
csvClassification:
  Validated: { requiredColumnsPresent: true, minimumValidRowRatio: 0.99 }
  PartiallyValidated: { requiredColumnsPresent: true, minimumValidRowRatio: 0.95, exclusiveMaximumValidRowRatio: 0.99, omissionsRequired: true }
  Failed: { anyOf: [required-column-missing, valid-row-ratio-below-0.95] }
textPdfClassification:
  Validated: { readablePageRatio: 1.0, allRequiredGoldenTermsFound: true, minimumExpectedAnchorRatio: 0.98 }
  PartiallyValidated: { minimumReadablePageRatio: 0.90, minimumExpectedAnchorRatio: 0.90, omissionsRequired: true }
  Failed: { anyOf: [readable-page-ratio-below-0.90, expected-anchor-ratio-below-0.90] }
  Unsupported: { anyOf: [scanned-input, encrypted-input] }
automaticAcceptedTermPublication: Validated-only
```

Every successful mutation response rotates the CSRF token in `X-CSRF-Token` and sets `Cache-Control: no-store`; missing, expired, or session-mismatched CSRF fails before invoking a domain service. The BFF retains the idempotency key and canonical request digest for the logical command across its downstream retries, so a browser retry cannot create a second operation. All errors use `application/problem+json` conforming to RFC 9457 and the stable `ProblemDetails.code` vocabulary above. Audit/evidence queries enforce both the 100-item page bound and 31-day time-window bound; assistant snapshots are capped at 100 turns, and an expired SSE cursor returns `409 RESUME_CURSOR_EXPIRED` so the client reloads the snapshot.

## Reproducibility and provider contracts

### C19 — Demo deployment and evidence interface

U13 uses checked-in Helm/Terragrunt entry points and supported application contracts. It never seeds application tables directly. Evidence binds claims to an immutable Git revision, deterministic seed, environment manifest, command result, and artifact checksum. Its messaging evidence includes separate U3/U4 bootstrap-publisher conformance results and U14 .NET/Python package results against the same C22 fixture version; a missing applicable publisher result makes the audit-delivery claim incomplete.

```yaml
$schema: https://json-schema.org/draft/2020-12/schema
$id: https://contracts.stocksense.local/demo/v1/evidence-manifest.schema.json
title: DemoEvidenceManifest
type: object
required: [schemaVersion, manifestId, revision, requirementsVersion, status, publishedAt, scenario, environment, commandProfile, startedAt, completedAt, checks, artifacts, limitations]
properties:
  schemaVersion: { const: 1.0.0 }
  manifestId: { type: string, format: uuid }
  revision: { type: string, pattern: '^[0-9a-f]{40}$', description: Immutable Git commit tested by this manifest. }
  requirementsVersion: { type: string, minLength: 1 }
  status: { enum: [complete, incomplete] }
  publishedAt: { type: string, format: date-time }
  scenario:
    type: object
    required: [seed, retailers, storesPerRetailer, productsPerRetailer, historyMonths]
    properties:
      seed: { type: integer }
      retailers: { const: 3 }
      storesPerRetailer: { const: 1 }
      productsPerRetailer: { const: 100 }
      historyMonths: { const: 18 }
  environment:
    type: object
    required: [profileId, kubernetesVersion, cpuLimit, memoryLimitGiB, cpuOnly, manifestDigest]
    properties:
      profileId: { type: string }
      kubernetesVersion: { type: string }
      cpuLimit: { maximum: 3 }
      memoryLimitGiB: { maximum: 16 }
      cpuOnly: { const: true }
      optionalGpuPathMeasured: { type: boolean }
      manifestDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
    additionalProperties: false
  commandProfile:
    type: object
    required: [profileId, profileVersion, profileDigest, command, argumentsDigest, containerImageDigest]
    properties:
      profileId: { type: string, minLength: 1 }
      profileVersion: { const: 1.0.0 }
      profileDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
      command: { enum: [validate, deployLocal, seed, smoke, recover, collectEvidence] }
      argumentsDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
      containerImageDigest: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
    additionalProperties: false
  startedAt: { type: string, format: date-time }
  completedAt: { type: string, format: date-time }
  checks:
    type: array
    minItems: 1
    items:
      type: object
      required: [checkId, requirementIds, command, commandProfileVersion, outcome, reason, expectedResult, actualResult, traceIds, startedAt, completedAt, durationMs, artifactDigests, limitations]
      properties:
        checkId: { type: string, pattern: '^[A-Z0-9][A-Z0-9._-]{2,79}$' }
        requirementIds: { type: array, minItems: 1, uniqueItems: true, items: { type: string } }
        command: { type: string }
        commandProfileVersion: { const: 1.0.0 }
        outcome: { enum: [passed, failed, limited, rejected, unavailable, not-run] }
        reason: { type: string, minLength: 1 }
        expectedResult: {}
        actualResult: {}
        traceIds: { type: array, minItems: 1, uniqueItems: true, items: { type: string, pattern: '^[0-9a-f]{32}$' } }
        startedAt: { type: string, format: date-time }
        completedAt: { type: string, format: date-time }
        durationMs: { type: integer, minimum: 0 }
        artifactDigests: { type: array, uniqueItems: true, items: { type: string, pattern: '^sha256:[0-9a-f]{64}$' } }
        limitations: { type: array, items: { type: string, minLength: 1 } }
      additionalProperties: false
  artifacts:
    type: array
    items:
      type: object
      required: [artifactId, path, mediaType, sizeBytes, sha256]
      properties:
        artifactId: { type: string }
        path: { type: string }
        mediaType: { type: string }
        sizeBytes: { type: integer, minimum: 0 }
        sha256: { type: string, pattern: '^sha256:[0-9a-f]{64}$' }
      additionalProperties: false
  limitations: { type: array, items: { type: string, minLength: 1 } }
additionalProperties: false
```

The six `outcome` values are exhaustive. `reason`, `expectedResult`, `actualResult`, timing, and `limitations` remain required even for `rejected`, `unavailable`, and `not-run`; unavailable checks identify the missing dependency, rejected checks identify the failed guard, and not-run checks identify the prerequisite that prevented execution. `traceIds` use stable W3C trace IDs and every referenced digest resolves to an item in `artifacts` or to the immutable environment/command profile.

```yaml
kind: demo-command-profile
version: 1.0.0
commands:
  validate: { owner: platform-infrastructure, sideEffects: none }
  deployLocal: { owner: platform-infrastructure, target: docker-desktop-kubernetes }
  seed: { owner: demo-evidence, transport: supported-application-apis }
  smoke: { owner: demo-evidence, transport: browser-and-service-contracts }
  recover: { owner: demo-evidence, includes: [restore, replay, projection-rebuild, tenant-placement-cutover] }
  collectEvidence: { owner: demo-evidence, output: evidence-manifest }
constraints:
  cloudProvisioning: explicit-separate-authorization
  ownerCredentialsRequired: false
  ownerGpuRequired: false
```

### C21 — Generation and embedding adapter ports

Provider selection belongs to deployment configuration. The default path is local and CPU-capable; Bedrock is opt-in, requires credentials and a spend policy, and is never an automatic fallback. U9 normalizes generation/tool calls; U5 normalizes embeddings. Prompts, credentials, raw supplier documents, and hidden reasoning are excluded from logs by default.

```yaml
$schema: https://json-schema.org/draft/2020-12/schema
$id: https://contracts.stocksense.local/ai/v1/generation-port.schema.json
title: GenerationPort
type: object
required: [requestId, modelProfile, messages, tools, limits]
properties:
  requestId: { type: string, format: uuid }
  modelProfile: { enum: [local-qwen, bedrock-configured] }
  messages:
    type: array
    maxItems: 50
    items: { type: object, required: [role, content], properties: { role: { enum: [system, user, assistant, tool] }, content: { type: string } } }
  tools:
    type: array
    items: { type: object, required: [name, inputSchema], properties: { name: { type: string }, inputSchema: { type: object } } }
  limits:
    type: object
    required: [maxInputTokens, maxOutputTokens, timeoutMs]
    properties:
      maxInputTokens: { type: integer, minimum: 1 }
      maxOutputTokens: { type: integer, minimum: 1 }
      timeoutMs: { type: integer, minimum: 1 }
additionalProperties: false
```

```yaml
$schema: https://json-schema.org/draft/2020-12/schema
$id: https://contracts.stocksense.local/ai/v1/embedding-port.schema.json
title: EmbeddingPort
type: object
required: [requestId, modelProfile, texts]
properties:
  requestId: { type: string, format: uuid }
  modelProfile: { enum: [embeddinggemma, qwen-embedding] }
  texts: { type: array, minItems: 1, items: { type: string } }
  dimensions: { type: integer, minimum: 1 }
  normalize: { type: boolean, default: true }
additionalProperties: false
```

## Contract ownership rules

- U1 owns canonical packaging, linting, examples, generated-client inputs, and compatibility reports. It cannot change provider semantics or grant access to provider storage.
- Each REST provider owns operation meaning, authorization, validation, error codes, and its OpenAPI document. Each event producer owns event meaning and payload evolution; U1 owns the common envelope rules.
- U14 owns reusable broker mechanics and independently versioned .NET/Python packages. Each package declares its supported U1 protocol range and passes the same conformance fixtures. U14 owns no domain message, authorization decision, outbox/inbox record, or business effect.
- Consumers may generate local types. U14 is the sole approved shared runtime library boundary; its package releases remain independent from service deployment cycles. Consumers ignore unknown response and event fields within a major version.
- U15 owns recovery lifecycle, roster policy, dispatch inventory, barriers, manifests, deadlines and terminal outcomes. Participants own their state, checkpoint evidence, monotonic command guards and fence disposition.
- U4 and U8 use C08 inside one deployment and transaction. U4 routines alone mutate inventory and inbound commitments; U8 routines alone mutate purchasing state. Cross-schema SQL remains prohibited.
- API paths carry their major version. Documents use semantic versions. Additive optional fields and operations may advance a minor version; compatible corrections advance a patch version.
- A breaking HTTP change requires a new major path and an overlap period. A breaking message change requires a new message type or major schema version and a distinct routing identity. Published event schemas are immutable.
- Deprecation requires an owner, first-deprecated version, replacement, affected consumers, and removal date. Removal cannot precede consumer migration evidence.
- Every contract change runs syntax, example, generated-client, and compatibility checks in CI. Invalid or incompatible changes block the applicable change.
- Cross-unit database, MongoDB, object-storage, cache, vector-index, or OpenSearch access is prohibited. Storage schemas and stored routines remain implementation details behind provider contracts.

## Authority, privacy, and tenancy invariants

- A retailer ID in a route, payload, cache key, queue message, collection name, or index name is context, not authority.
- Browser identity is authenticated by U11's server-side session. U11 and every authoritative provider revalidate current membership and role for the selected retailer; high-impact commands also validate expected aggregate version.
- Tenant-scoped internal calls and messages propagate retailer ID, actor, placement generation, correlation ID, and causation ID. A service rejects stale placement generations during tenant migration. Retailerless U3 security outcomes use only the closed C01 global identity-audit envelope and never invent retailer or placement fields.
- Machine tokens have narrow issuer, audience, scope, and workload identity. They cannot inherit a human role or approve, reject, cancel, or receive purchases.
- Sensitive data is minimized at boundaries. Contracts exclude credentials, tokens, full prompts, hidden reasoning, and raw supplier documents from logs and audit payloads. U3's current platform-Operator grant is independent of every retailer role; only a delegated human BFF token plus fresh U3 grant check permits U10 global identity-audit reads or replay. U11 exposes global reads through a separate no-store platform route, never a retailer dashboard or query.
- U9 may call only typed, allowlisted tools. U8 remains authoritative for the three-per-retailer-local-day manual review allowance and for every purchasing transition.
- Only a current Operator may preview or confirm destructive recovery. The confirmation token is single-use and bound to the actor, retailer, operation, manifest digest, placement generation and recovery generation; it grants no broader authority.
- Recovery participant acknowledgements are evidence, not authority. U15 accepts them only for the exact registered participant, command, run, generation and deadline; stale, conflicting or digest-mismatched acknowledgements cannot satisfy a barrier.

## Error, timeout, and retry profiles

Every synchronous error uses `application/problem+json` with RFC 9457 fields plus stable `code` and `correlationId`. `401` means authentication is missing or invalid; `403` means authenticated authority is insufficient; `404` hides resources outside the authorized tenant; `409` represents state, version, placement, or idempotency conflict; `422` represents a validly encoded request that violates domain validation; `429` represents a quota; and `503` represents an unavailable required dependency or model.

| Profile | Contracts | Timeout rule | Automatic retry rule | Failure result |
| --- | --- | --- | --- | --- |
| Metadata | C02, C16, C20 | Short connect/read timeout; exact value resolved before implementation | GET/discovery only with bounded jitter and cached last-valid metadata within declared lifetime | Authentication denied when validation cannot be completed safely |
| Interactive read | C03, C06-C07, C09-C13, C17-C18, C26 | Operation-specific budget below the BFF/user budget | Bounded retry for safe GET or explicitly idempotent query only | Explicit stale, partial, unavailable, or failed state |
| Interactive mutation | C08, C14, C18, C24, C26 | No retry beyond the caller's declared command deadline | Retry only with the same idempotency key/command ID and byte-equivalent request hash | Original durable result for matching replay; `409` for mismatch or stale generation |
| Long-running job | C04-C05, C14, C18, C26 | Admission request is short; work has a separate bounded job/phase deadline | Admission may retry with the same idempotency key; workers use bounded retry and DLQ | Durable failed job with stable phase, fenced participants and next action |
| Messaging | C03, C15, C23, C25, C27 | Five total deliveries; attempts 2-5 wait 1/2/4/8 seconds; 64 KiB envelope | At-least-once delivery, inbox deduplication, attempt five then DLQ; authorized audited replay in batches of 1-100 | DLQ retained seven days; exact replay returns the durable result; payload conflict is quarantined; authoritative state is reconciled |
| Recovery bootstrap | C24-C26 | Class A 30/30/30/60 seconds; B 60/60/60/120; C 120/180/60/180; global phases 60/300/300/1800/300/600 seconds | Reissue only the same command ID within the original class/global deadline; restart resumes within 120 seconds | Timeout fails closed; abort every potentially delivered participant; unresolved participants remain fenced |
| Model provider | C21 | Explicit connect, first-token, total generation, and embedding budgets | No provider-switch retry; same-provider retry only when no side effect occurred | Local unavailable/failed outcome; no automatic Bedrock fallback |
| Demo/deployment | C19 | Command-specific deadline with start, completion and elapsed milliseconds | Read-only validation may retry; deployment/recovery reruns require idempotent tooling | Evidence records exactly one of passed, failed, limited, rejected, unavailable or not-run with reason and expected/actual result |

Numeric values not fixed above, including interactive operation budgets, queue capacities, projection-lag thresholds and aggregate response caps, remain implementation decisions listed below. Their absence does not permit unbounded behavior.

## Compatibility and release checks

```yaml
contractPolicyVersion: 1.0.0
openapiBaseline: 3.1.x
asyncapiBaseline: 3.0.0
jsonSchemaBaseline: 2020-12
httpVersioning:
  strategy: major-in-path
  additiveWithinMajor: true
  consumerUnknownFields: ignore
  breakingChange: new-major-with-overlap
messageVersioning:
  immutablePublishedSchema: true
  additiveOptionalFieldsWithinMajor: true
  breakingChange: new-message-type-or-major-routing-identity
  authenticatedProducerBindingRequired: true
  canonicalPayloadDigest: sha256-rfc8785-data
  envelopeMaximumBytes: 65536
  maxTotalDeliveries: 5
  deadLetterRetentionDays: 7
  authorizedReplayBatchMaximum: 100
packageCompatibility:
  protocolOwner: contracts
  languagePackageOwner: messaging-platform
  packageVersionsIndependent: true
  declaredProtocolRangeRequired: true
  sharedConformanceFixturesRequired: true
recoveryCompatibility:
  policyVersion: recovery-policy-v1
  requiredRoster: versioned-policy-plus-registration
  missingParticipant: stop-before-prepare
  confirmationBinding: [operator, retailer, operation, manifestDigest, placementGeneration, recoveryGeneration]
deprecation:
  requiredFields: [owner, deprecatedIn, replacement, consumers, removeAfter]
ciGates:
  - syntax
  - examples
  - generated-clients
  - backward-compatibility
  - tenant-context
  - correlation-and-idempotency
  - problem-details
```

## Upstream coverage

| Upstream obligation | Contract coverage |
| --- | --- |
| U1 package completeness and compatibility | C01's versioned candidate/release manifest lists canonical OpenAPI/AsyncAPI/JSON Schema inputs plus governed sidecars for fixtures, generation, C22/C23 protocol conformance, recovery policy, compatibility assessments, validation runs and evidence; C24 supplies typed bootstrap results and problems |
| All unit dependency integration points | C01-C19 and C22-C27 cover the approved 15-unit topology; C20-C21 cover external identity and model-provider boundaries |
| NFR3 tenant isolation and placement migration | Common envelope, C02, C17-C18, C24-C27, and authority invariants require current membership and placement/recovery generation |
| NFR4 routine-only PostgreSQL access | Ownership rules prohibit cross-unit table access; C07 exposes only a U6-owned EXECUTE-only versioned stored-function port inside U7 owner transactions, with no arbitrary SQL |
| NFR5 browser identity | C16 and C18 define BFF, PKCE, cookie, CSRF, token, and replay boundaries |
| NFR7 durable messaging | C03, C15, C22-C23, C25 and C27 define at-least-once, outbox/inbox, confirms, commit-before-ack, DLQ, replay, language-package compatibility and conformance semantics |
| NFR7.1 bounded shared messaging | C01, C15, C22-C23 require authenticated producer binding, RFC 8785/SHA-256 payload digests, 64 KiB envelopes, five deliveries, deterministic 1/2/4/8-second retry delays within the one-to-30-second bound, seven-day DLQ retention, replay batches of 1-100 and exact-replay/conflict/poison/expiry/reconciliation evidence |
| NFR8 formal API contracts | Every synchronous provider boundary is assigned to OpenAPI 3.1.2 or the explicit C08 in-process schema; every durable event/command boundary uses AsyncAPI 3.0.0 |
| NFR8.1 browser/BFF contract | C18 defines no-store CSRF bootstrap/rotation, CSRF plus one idempotency identity on every mutation, typed HTTP 200 sections, bounded reads/uploads, operation status/reconciliation, purchasing requests, assistant SSE/resume/snapshot, bounded audit/evidence queries, contract metadata and stable RFC 9457 problems |
| NFR8.2 evidence schema | C19 permits exactly the six approved outcomes and requires reason, expected/actual result, trace IDs, immutable revision, environment, timing, command profile, artifacts/checksums and limitations |
| FR13.1 and NFR8.3 model/recovery catalogue | C07 formalizes versioned heavy-work request/lease lifecycle, same-transaction U7 finalization, no-overlap route pins/drain and verifiable signed `skops.io` package manifests; C24-C26 formalize recovery registration, immutable roster snapshots, participant routes, deadline classes and global barrier deadlines |
| Forecasting product-set consumers | C10 and C13 require a distinct 1–100-product request set, exact covered/unavailable partition, per-product reason and 28 dated values only for covered products; stale/unpublished/failed results remain explicit |
| Purchasing safety in FR7/FR8 | C08, C14, and C18 omit assistant approval authority and preserve versions, atomic receipt validation, cancellation, and cumulative receipt limits |
| Manual review quota in FR9-FR9.5 | C14 and C18 expose remaining allowance/reset time and `429`, while U8 remains authoritative |
| FR10-FR10.2 supplier ingestion | C18 fixes supplier CSV at 20,000 rows/5 MiB, text PDF at 200 pages/20 MiB, and formalizes the four extraction outcomes and their 99%/95% CSV and 100%/98%/90% text-PDF gates |
| Local-first AI and clean CPU path | C19 and C21 prohibit owner-only credentials/GPU and automatic remote fallback |
| FR20-FR20.1 recovery and objectives | C24-C27 define bootstrap fencing, the versioned participant roster, write-ahead dispatch, async commands/acknowledgements, bound destructive confirmation, polled progress, complete LSN/transaction/queue/checkpoint manifests, terminal fencing/reconciliation evidence, 24-hour RPO, 2-hour RTO and 30-day backup retention |
| Audit/search requirements | C01/C15 preserve both tenant events and retailerless U3 security outcomes under separate closed profiles, atomic U3 audit/outbox writes and authenticated routing; C02/C17/C18 define the distinct U3-granted platform Operator, current-grant check, delegated human read API and separate no-store browser route; C27 preserves recovery events and idempotent projection, without global-event leakage into tenant queries |
| Portfolio evidence and reproducibility | C19 consumes U3/U4 bootstrap-publisher and U14 package conformance plus U15 recovery outputs, binding evidence to revision, deterministic scenario, measured environment, checks, outcomes, and checksums |

## Open questions

These questions are implementation parameters already identified upstream. They do not change the approved contract style or authority boundaries.

| Contract | Question | Blocks |
| --- | --- | --- |
| C02/C16/C20 | What are the session, token, discovery-cache and key-overlap lifetimes; redirect URIs; signing-key store; rotation; and recovery procedure? | U3/U11 identity implementation and negative tests |
| C03/C05/C12/C18 | What retrieval top-k and citation-count limits are used within the fixed supplier ingestion and extraction profile? | U5 retrieval and browser evidence contract |
| C04/C06-C07 | Which compatible runtime profile and export artifact lifetime are pinned for the portable release? Forecast freshness is already the next retailer-local 02:00 due time plus six hours; C10/C13 unavailable behavior is explicit above. | U6/U7 implementation and U8 planning acceptance |
| C08/C14/C18 | What are the buffer defaults and additional receipt/replacement-draft examples beyond the canonical C18 schemas? | U8 purchasing and planner UI contract tests |
| C15/C23 | What are the consumer execution deadline, queue/backlog capacity, topology naming beyond the versioned route identities, and projection-lag threshold? | RabbitMQ topology, U10 operations and recovery tests |
| C17/C18 | What are numeric interactive budgets and BFF aggregate response-size caps beyond the fixed 100-item/31-day query bounds? | U11 typed clients, NFR1 benchmark and U12 state handling |
| C19/C26 | What persistent-disk capacity, runner isolation and supported host software versions are documented for the fixed 24-hour RPO, 2-hour RTO and 30-day retention profile? | U2/U13 recovery and clean-checkout evidence |
| C21 | Which exact Qwen generation artifact, runtime build, context/concurrency limits, embedding winner/dimensions, and Bedrock models/spend policy are supported? | U5/U9 AI adapters and reviewer setup |
| C22/C23 | Which internal NuGet/Python package feeds, package signing/checksum rules and conformance runner versions are pinned? | U14 package publication and CI conformance |
| C24-C27 | What is the confirmation-token lifetime, manifest storage URI format and operator escalation runbook for the defined reconciliation actions? | U15 implementation and recovery contract tests |
## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-25T17:27:12Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|

No findings.

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| required-sections sensor | PASS: 17 H2 sections; 0 findings | Required document shape is present. |
| upstream-coverage sensor | PASS: all four consumed artifacts referenced; 0 findings | Declared upstream sources are cited. |
| C07 `x-contract-fixtures` shape check | PASS: six of six expected valid/invalid cases | Pin admission and batch/nonbatch lease ID requirements agree with the inline examples. This checks the targeted fields and conditional branches, not full OpenAPI validation. |

### Summary

C07 now specifies durable request, pin, run, attempt and lease binding; U6-owned pin closure inside the caller transaction; and an evaluation lease terminal result in the route-switch transaction. C10 has a typed historical response, the pin-admission schema is satisfiable, and batch versus nonbatch lease identifiers are conditional. The bounded contract is ready for the human approval decision.