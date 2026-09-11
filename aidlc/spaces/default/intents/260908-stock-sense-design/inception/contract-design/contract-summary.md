# StockSense contract summary

Date: 2026-09-10  
Stage: Contract Design  
Status: Draft for independent architecture review

## Purpose and baseline

This artifact defines the formal boundaries that let StockSense units be implemented independently. It follows the unit dependency topology, domain ownership model, and requirements FR1-FR20 and NFR1-NFR15. The specifications below are the design baseline for the canonical files that U1 Contracts will package and validate in CI.

Upstream sources: `unit-of-work.md`, `unit-of-work-dependency.md`, `components.md`, and `requirements.md`.

Only U11 Web BFF is exposed to the browser. Runtime service APIs remain cluster-internal. Synchronous APIs use OpenAPI 3.1.x, asynchronous RabbitMQ contracts use AsyncAPI 3.0.0, and shared documents use JSON Schema 2020-12. Exact patch and validator versions are pinned when U1 is implemented.

## Contracts

The table follows every direct integration point in the approved unit topology. A row aggregates repeated consumers only when they use the same provider-owned contract without changing its semantics.

| # | Provider Unit | Consumer | Mechanism | Owner |
| --- | --- | --- | --- | --- |
| C01 | U1 Contracts | U3-U12 runtime and UI consumers | Shared schemas, examples, generated-client inputs | U1 governs packaging; each provider owns semantics |
| C02 | U3 Identity Access | U4 Retail Data and machine-token consumers | OIDC discovery, JWKS and token-validation profile | U3 Identity Access |
| C03 | U4 Retail Data | U5 Supplier Knowledge | REST/OpenAPI plus source/index lifecycle events | U4 owns REST; U5 owns emitted lifecycle events |
| C04 | U4 Retail Data | U6 Model Lifecycle | REST/OpenAPI asynchronous dataset-export jobs | U4 Retail Data |
| C05 | U5 Supplier Knowledge | U6 Model Lifecycle | REST/OpenAPI accepted-term dataset exports | U5 Supplier Knowledge |
| C06 | U4 Retail Data | U7 Forecasting | REST/OpenAPI demand observations and retailer calendar | U4 Retail Data |
| C07 | U6 Model Lifecycle | U7 Forecasting | REST/OpenAPI promoted-model metadata and artifact references | U6 Model Lifecycle |
| C08 | U4 Retail Data | U8 Planning and Purchasing | REST/OpenAPI inventory queries and receipt stock-posting command | U4 Retail Data |
| C09 | U5 Supplier Knowledge | U8 Planning and Purchasing | REST/OpenAPI accepted terms and provenance | U5 Supplier Knowledge |
| C10 | U7 Forecasting | U8 Planning and Purchasing | REST/OpenAPI 28-day forecast status and series | U7 Forecasting |
| C11 | U4 Retail Data | U9 Assistant | REST/OpenAPI authorized inventory and demand tools | U4 Retail Data |
| C12 | U5 Supplier Knowledge | U9 Assistant | REST/OpenAPI retrieval and supplier comparison with citations | U5 Supplier Knowledge |
| C13 | U7 Forecasting | U9 Assistant | REST/OpenAPI forecast status and evidence tools | U7 Forecasting |
| C14 | U8 Planning and Purchasing | U9 Assistant | REST/OpenAPI review-request and draft-proposal commands | U8 Planning and Purchasing |
| C15 | U3-U9 authoritative event publishers | U10 Audit Evidence | RabbitMQ/AsyncAPI immutable audit events | Each producer owns event semantics; U1 governs envelope |
| C16 | U3 Identity Access | U11 Web BFF | OIDC authorization code with PKCE, logout and session profile | U3 Identity Access |
| C17 | U4-U10 domain services | U11 Web BFF | Provider-owned REST/OpenAPI documents | Each provider service |
| C18 | U11 Web BFF | U12 Web Application / External: browser | Same-origin REST/OpenAPI and secure cookie session | U11 Web BFF |
| C19 | U2 and U3-U12 runtime units | U13 Demo Evidence | Deployment interface and evidence-manifest shared schema | U13 owns evidence schema; providers own commands |
| C20 | External: Google OIDC | U3 Identity Access | OIDC federation profile | U3 owns adapter/linking; Google owns endpoint |
| C21 | External: local model runtimes or optional Bedrock | U9 Assistant and U5 Supplier Knowledge | Provider-neutral generation and embedding adapter schemas | U9 owns generation port; U5 owns embedding port |

## Common contract vocabulary

### C01 — Canonical package and shared envelopes

U1 publishes provider-separated specifications, compatibility reports, examples, and generated-client inputs. It contains no runtime authorization logic and creates no shared persistence model.

```yaml
$schema: https://json-schema.org/draft/2020-12/schema
$id: https://contracts.stocksense.local/common/v1/contract-package.schema.json
title: StockSenseContractPackage
type: object
required: [packageVersion, openapi, asyncapi, schemas]
properties:
  packageVersion: { type: string, pattern: '^1\\.[0-9]+\\.[0-9]+$' }
  openapi:
    type: array
    items:
      type: object
      required: [provider, document, semanticVersion]
      properties:
        provider: { type: string }
        document: { type: string }
        semanticVersion: { type: string }
  asyncapi:
    type: array
    items:
      type: object
      required: [producer, document, semanticVersion]
      properties:
        producer: { type: string }
        document: { type: string }
        semanticVersion: { type: string }
  schemas:
    type: array
    items: { type: string }
additionalProperties: false
```

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
  - data
properties:
  messageId: { type: string, format: uuid }
  messageType: { type: string, pattern: '^[a-z][a-z0-9.]+$' }
  schemaVersion: { type: string, pattern: '^[1-9][0-9]*\\.[0-9]+\\.[0-9]+$' }
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
  traceparent: { type: string }
  data: { type: object }
additionalProperties: false
```

## Identity contracts

### C02 — Identity discovery and machine-token validation

Services validate issuer, audience, signature, lifetime, token type, and narrow scopes locally from U3 discovery metadata and JWKS. Token identity does not establish retailer membership; the authoritative business service revalidates membership and placement generation.

```yaml
openapi: 3.1.0
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
```

### C16 — Browser login through the BFF

Only U11 acts as the OIDC client for browser users. It uses authorization code with PKCE, stores tokens server-side, rotates its secure HttpOnly session cookie, validates CSRF on mutations, and rejects replay of invalidated cookies.

```yaml
openapi: 3.1.0
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
        '400': { description: Invalid state, nonce, code or callback }
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
        '401': { description: Session missing, expired, revoked or replayed }
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
openapi: 3.1.0
info: { title: Retail Data Supplier-Knowledge API, version: 1.0.0 }
paths:
  /api/v1/retailers/{retailerId}/supplier-reference:
    get:
      operationId: getSupplierReferenceData
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: query, name: productIds, schema: { type: array, items: { type: string, format: uuid }, maxItems: 200 } }
      responses:
        '200': { description: Authorized retailer currency, products and source versions }
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
          type: object
          required: [messageId, messageType, schemaVersion, occurredAt, retailerId, actor, correlationId, causationId, idempotencyKey, placementGeneration, data]
          properties:
            messageId: { type: string, format: uuid }
            messageType: { const: retail.reference.changed }
            schemaVersion: { const: 1.0.0 }
            occurredAt: { type: string, format: date-time }
            retailerId: { type: string, format: uuid }
            actor:
              type: object
              required: [type, subjectId]
              properties:
                type: { enum: [user, service, scheduler] }
                subjectId: { type: string }
            correlationId: { type: string, format: uuid }
            causationId: { type: string, format: uuid }
            idempotencyKey: { type: string }
            placementGeneration: { type: integer, minimum: 1 }
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
openapi: 3.1.0
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
openapi: 3.1.0
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
        '200': { description: Status, source revisions, currency and artifact checksum }
```

### C06 — Demand and calendar data for Forecasting

```yaml
openapi: 3.1.0
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
        '200': { description: Demand observations, promotions and retailer-local calendar through asOf }
        '403': { description: Current membership or machine authority validation failed }
        '409': { description: Source version or placement generation is stale }
```

### C07 — Promoted models for Forecasting

```yaml
openapi: 3.1.0
info: { title: Model Lifecycle Forecasting API, version: 1.0.0 }
paths:
  /api/v1/retailers/{retailerId}/promoted-models/forecasting:
    get:
      operationId: getPromotedForecastModel
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: query, name: runtimeCompatibility, required: true, schema: { type: string } }
      responses:
        '200': { description: Model version, feature contract, immutable artifact URI and checksum }
        '404': { description: No compatible promoted model is available }
        '409': { description: Promotion or artifact metadata is inconsistent }
```

### C08 — Inventory and receipt posting for Planning and Purchasing

The receipt command is authorized and validated in U8, then coordinated through U4's public port. It validates all lines before committing stock, audit, and outbox effects. It never permits cumulative receipts above approved quantities.

```yaml
openapi: 3.1.0
info: { title: Retail Data Planning-Purchasing API, version: 1.0.0 }
paths:
  /api/v1/retailers/{retailerId}/inventory-snapshots:
    get:
      operationId: getInventorySnapshot
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: query, name: asOf, required: true, schema: { type: string, format: date-time } }
      responses:
        '200': { description: Versioned product positions and movement watermark }
        '403': { description: Current authority failed }
  /api/v1/retailers/{retailerId}/stock-postings:record-receipt:
    post:
      operationId: recordApprovedOrderReceipt
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: header, name: Idempotency-Key, required: true, schema: { type: string } }
      responses:
        '200': { description: Atomic posting result with movement IDs and resulting stock version }
        '409': { description: Stale order, duplicate mismatch, over-receipt or cancel/receipt race }
        '422': { description: At least one receipt line failed validation; nothing committed }
```

### C09 — Accepted supplier terms for Planning and Purchasing

```yaml
openapi: 3.1.0
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
        '200': { description: Current terms, source revision, page citations and currency }
        '404': { description: No accepted terms exist for this retailer product }
        '409': { description: Requested source revision is stale }
```

### C10 — Forecast evidence for Planning and Purchasing

```yaml
openapi: 3.1.0
info: { title: Forecasting Planning-Purchasing API, version: 1.0.0 }
paths:
  /api/v1/retailers/{retailerId}/forecasts/{forecastRunId}:
    get:
      operationId: getForecastRun
      parameters:
        - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
        - { in: path, name: forecastRunId, required: true, schema: { type: string, format: uuid } }
      responses:
        '200': { description: Status, 28-day series, freshness and model/data/configuration provenance }
        '404': { description: Forecast run is absent or outside the retailer context }
        '409': { description: Forecast exists but is stale or incompatible }
  /api/v1/retailers/{retailerId}/forecasts:latest:
    parameters:
      - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
    get:
      operationId: getLatestUsableForecast
      responses:
        '200': { description: Latest usable forecast under the configured freshness policy }
        '503': { description: Forecast unavailable; no silent model substitution }
```

## Assistant tool contracts

Every U9 tool call carries the authenticated actor and retailer context supplied by the server-side session. The provider rechecks current membership, role, placement generation, and resource ownership. LLM output is untrusted input to typed tools and never grants purchasing authority.

### C11 — Inventory and demand tools

```yaml
openapi: 3.1.0
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
        '422': { description: Requested scope, time range or aggregation is unsupported }
```

### C12 — Supplier retrieval and comparison tools

```yaml
openapi: 3.1.0
info: { title: Supplier Knowledge Assistant Tools API, version: 1.0.0 }
paths:
  /api/v1/retailers/{retailerId}/assistant-tools/supplier-search:
    parameters:
      - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
    post:
      operationId: searchSupplierEvidence
      responses:
        '200': { description: Authorized chunks with document, source revision, page and score citations }
        '409': { description: Retrieval index is stale, rebuilding or incompatible }
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
openapi: 3.1.0
info: { title: Forecasting Assistant Tools API, version: 1.0.0 }
paths:
  /api/v1/retailers/{retailerId}/assistant-tools/forecast-status:
    parameters:
      - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
    post:
      operationId: getForecastStatusForAssistant
      responses:
        '200': { description: Run state, freshness and provenance for cited products }
        '503': { description: No usable forecast; assistant must disclose unavailability }
  /api/v1/retailers/{retailerId}/assistant-tools/forecast-evidence:
    parameters:
      - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
    post:
      operationId: getForecastEvidenceForAssistant
      responses:
        '200': { description: Bounded series and model/data/configuration citations }
```

### C14 — Review request and draft proposal tools

U9 can request one of the three retailer-local manual review allowances or create/edit a draft through U8. Approval, rejection, cancellation, and receipt commands are deliberately absent.

```yaml
openapi: 3.1.0
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
        '202': { description: Review accepted with job ID, remaining allowance and reset time }
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

U3-U9 write authoritative audit and outbox rows in the same transaction as each accepted business mutation. Publishers confirm delivery; U10 records its inbox and projection checkpoint before acknowledging. Delivery is at-least-once, so consumers deduplicate by `messageId`. Retries are bounded and dead letters require an audited replay command. Operational log failure cannot block business work.

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
            - data
          properties:
            messageId: { type: string, format: uuid }
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
            schemaVersion: { const: 1.0.0 }
            occurredAt: { type: string, format: date-time }
            retailerId: { type: string, format: uuid }
            actor:
              type: object
              required: [type, subjectId]
              properties:
                type: { enum: [user, service, scheduler] }
                subjectId: { type: string }
            correlationId: { type: string, format: uuid }
            causationId: { type: string, format: uuid }
            idempotencyKey: { type: string }
            placementGeneration: { type: integer, minimum: 1 }
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
operations:
  publishAuditEvent:
    action: send
    channel: { $ref: '#/channels/auditEvents' }
  projectAuditEvent:
    action: receive
    channel: { $ref: '#/channels/auditEvents' }
x-stocksense-delivery:
  guarantee: at-least-once
  publisherConfirm: required
  acknowledgeAfter: inbox-and-projection-checkpoint-commit
  maxRetries: unresolved-OQ-C15-01
  deadLetterAddress: stocksense.audit.v1.dlq
  replayAuthority: operator
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
    minItems: 7
    items:
      type: object
      required: [provider, openapiDocument, requiredCapabilities]
      properties:
        provider:
          enum: [retail-data, supplier-knowledge, model-lifecycle, forecasting, planning-purchasing, assistant, audit-evidence]
        openapiDocument: { type: string }
        requiredCapabilities:
          type: array
          items: { type: string }
        timeoutProfile: { enum: [interactive-read, interactive-command, long-running-job] }
        retryProfile: { enum: [safe-read, idempotent-command, no-automatic-retry] }
      additionalProperties: false
additionalProperties: false
```

Required capabilities are retailer context and inventory/demand imports from U4; supplier ingestion, accepted terms and citations from U5; experiment/promotion evidence from U6; forecast runs from U7; review, recommendation and purchasing transitions from U8; conversations and tool calls from U9; and authorized audit/correlation queries from U10.

### C18 — Browser API exposed by the Web BFF

The browser sends only the secure session cookie, CSRF token on mutations, resource-route retailer identifier where applicable, and correlation metadata. It never sends service credentials, raw access tokens, or an authority-bearing retailer header.

```yaml
openapi: 3.1.0
info: { title: StockSense Browser API, version: 1.0.0 }
servers:
  - { url: /, description: Same-origin Web BFF }
paths:
  /api/v1/session:
    get:
      operationId: getSession
      responses:
        '200': { description: Session and authorized retailer choices }
        '401': { description: Login required }
  /api/v1/retailers/{retailerId}/dashboard:
    parameters:
      - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
    get:
      operationId: getDashboard
      responses:
        '200': { description: Composed inventory, forecast and review state with freshness metadata }
        '206': { description: Partial downstream result with explicit unavailable sections }
        '403': { description: Current retailer membership denied }
  /api/v1/retailers/{retailerId}/imports:
    parameters:
      - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
    post:
      operationId: createImport
      parameters:
        - { in: header, name: X-CSRF-Token, required: true, schema: { type: string } }
        - { in: header, name: Idempotency-Key, required: true, schema: { type: string } }
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema: { type: object, required: [kind, file], properties: { kind: { type: string }, file: { type: string, format: binary } } }
      responses:
        '202': { description: Import accepted; Location identifies its job resource }
        '413': { description: Configured upload limit exceeded }
        '422': { description: File type, schema or extraction content invalid }
  /api/v1/retailers/{retailerId}/reviews:request:
    parameters:
      - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
    post:
      operationId: requestManualReview
      responses:
        '202': { description: Review accepted with job, remaining allowance and reset time }
        '429': { description: Daily manual-review allowance exhausted }
  /api/v1/retailers/{retailerId}/purchase-orders/{orderId}/{command}:
    parameters:
      - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
      - { in: path, name: orderId, required: true, schema: { type: string, format: uuid } }
    post:
      operationId: transitionPurchaseOrder
      parameters:
        - { in: path, name: command, required: true, schema: { enum: [submit, approve, reject, cancel, record-receipt] } }
        - { in: header, name: X-CSRF-Token, required: true, schema: { type: string } }
        - { in: header, name: Idempotency-Key, required: true, schema: { type: string } }
      responses:
        '200': { description: Authorized transition result and new aggregate version }
        '403': { description: Actor lacks the required current role }
        '409': { description: Invalid state, stale version, replay mismatch or receipt race }
        '422': { description: Command payload violates purchasing invariants }
  /api/v1/retailers/{retailerId}/assistant/conversations/{conversationId}/turns:
    parameters:
      - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
      - { in: path, name: conversationId, required: true, schema: { type: string, format: uuid } }
    post:
      operationId: createAssistantTurn
      responses:
        '202': { description: Bounded assistant turn accepted as a job }
        '409': { description: Conversation state or idempotency conflict }
        '503': { description: Configured local model unavailable; no automatic remote fallback }
  /api/v1/retailers/{retailerId}/audit:
    parameters:
      - { in: path, name: retailerId, required: true, schema: { type: string, format: uuid } }
    get:
      operationId: queryBusinessAudit
      responses:
        '200': { description: Tenant-authorized audit projection with correlation fields }
        '503': { description: Projection unavailable or lag exceeds declared threshold }
components:
  securitySchemes:
    bffSession: { type: apiKey, in: cookie, name: __Host-stocksense-session }
security:
  - bffSession: []
```

All error responses use `application/problem+json` conforming to RFC 9457 with `type`, `title`, `status`, `detail`, `instance`, stable `code`, and `correlationId`. The BFF preserves provider error codes when safe for the browser and otherwise maps them to a stable BFF code.

## Reproducibility and provider contracts

### C19 — Demo deployment and evidence interface

U13 uses checked-in Helm/Terragrunt entry points and supported application contracts. It never seeds application tables directly. Evidence binds claims to an immutable Git revision, deterministic seed, environment manifest, command result, and artifact checksum.

```yaml
$schema: https://json-schema.org/draft/2020-12/schema
$id: https://contracts.stocksense.local/demo/v1/evidence-manifest.schema.json
title: DemoEvidenceManifest
type: object
required: [revision, scenario, environment, checks, artifacts]
properties:
  revision: { type: string, pattern: '^[0-9a-f]{40}$' }
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
    required: [cpuLimit, memoryLimitGiB, cpuOnly]
    properties:
      cpuLimit: { maximum: 3 }
      memoryLimitGiB: { maximum: 16 }
      cpuOnly: { const: true }
      optionalGpuPathMeasured: { type: boolean }
  checks:
    type: array
    items: { type: object, required: [requirementIds, command, outcome], properties: { requirementIds: { type: array, items: { type: string } }, command: { type: string }, outcome: { enum: [passed, failed, limited] } } }
  artifacts:
    type: array
    items: { type: object, required: [path, sha256], properties: { path: { type: string }, sha256: { type: string, pattern: '^[0-9a-f]{64}$' } } }
additionalProperties: false
```

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
- Consumers may generate local types, but no mandatory shared runtime library may couple deployment cycles. Consumers ignore unknown response and event fields within a major version.
- API paths carry their major version. Documents use semantic versions. Additive optional fields and operations may advance a minor version; compatible corrections advance a patch version.
- A breaking HTTP change requires a new major path and an overlap period. A breaking message change requires a new message type or major schema version and a distinct routing identity. Published event schemas are immutable.
- Deprecation requires an owner, first-deprecated version, replacement, affected consumers, and removal date. Removal cannot precede consumer migration evidence.
- Every contract change runs syntax, example, generated-client, and compatibility checks in CI. Invalid or incompatible changes block the applicable change.
- Cross-unit database, MongoDB, object-storage, cache, vector-index, or OpenSearch access is prohibited. Storage schemas and stored routines remain implementation details behind provider contracts.

## Authority, privacy, and tenancy invariants

- A retailer ID in a route, payload, cache key, queue message, collection name, or index name is context, not authority.
- Browser identity is authenticated by U11's server-side session. U11 and every authoritative provider revalidate current membership and role for the selected retailer; high-impact commands also validate expected aggregate version.
- Internal calls and messages propagate retailer ID, actor, placement generation, correlation ID, and causation ID. A service rejects stale placement generations during tenant migration.
- Machine tokens have narrow issuer, audience, scope, and workload identity. They cannot inherit a human role or approve, reject, cancel, or receive purchases.
- Sensitive data is minimized at boundaries. Contracts exclude credentials, tokens, full prompts, hidden reasoning, and raw supplier documents from logs and audit payloads.
- U9 may call only typed, allowlisted tools. U8 remains authoritative for the three-per-retailer-local-day manual review allowance and for every purchasing transition.

## Error, timeout, and retry profiles

Every synchronous error uses `application/problem+json` with RFC 9457 fields plus stable `code` and `correlationId`. `401` means authentication is missing or invalid; `403` means authenticated authority is insufficient; `404` hides resources outside the authorized tenant; `409` represents state, version, placement, or idempotency conflict; `422` represents a validly encoded request that violates domain validation; `429` represents a quota; and `503` represents an unavailable required dependency or model.

| Profile | Contracts | Timeout rule | Automatic retry rule | Failure result |
| --- | --- | --- | --- | --- |
| Metadata | C02, C16, C20 | Short connect/read timeout; exact value resolved before implementation | GET/discovery only with bounded jitter and cached last-valid metadata within declared lifetime | Authentication denied when validation cannot be completed safely |
| Interactive read | C03, C06-C07, C09-C13, C17-C18 | Operation-specific budget below the BFF/user budget | Bounded retry for safe GET or explicitly idempotent query only | Explicit stale, partial, unavailable, or failed state |
| Interactive mutation | C08, C14, C18 | No retry beyond the caller's declared command deadline | Retry only with the same idempotency key and byte-equivalent request hash | Original result for matching replay; `409` for mismatch |
| Long-running job | C04-C05, C14, C18 | Admission request is short; work has a separate bounded job deadline | Admission may retry with the same idempotency key; workers use bounded retry and DLQ | Durable failed job with stable reason and retry eligibility |
| Messaging | C03, C15 | Consumer processing deadline and visibility/ack policy resolved before implementation | At-least-once delivery, inbox deduplication, bounded retry, then DLQ | Observable dead letter and audited replay; never claim exactly-once transport |
| Model provider | C21 | Explicit connect, first-token, total generation, and embedding budgets | No provider-switch retry; same-provider retry only when no side effect occurred | Local unavailable/failed outcome; no automatic Bedrock fallback |
| Demo/deployment | C19 | Command-specific deadline with captured elapsed time | Read-only validation may retry; deployment/recovery reruns require idempotent tooling | Evidence records passed, failed, or limited outcome |

Exact numeric timeouts, retry counts, backoff, upload limits, queue capacities, and lag thresholds remain open implementation decisions listed below. Their absence does not permit unbounded behavior.

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
| All unit dependency integration points | C01-C19 cover the direct integration table; C20-C21 add approved external identity and model-provider boundaries |
| NFR3 tenant isolation and placement migration | Common envelope, C02, C17-C18, and authority invariants require current membership and placement generation |
| NFR4 routine-only PostgreSQL access | Ownership rules prohibit cross-unit storage access; no contract exposes tables or arbitrary SQL |
| NFR5 browser identity | C16 and C18 define BFF, PKCE, cookie, CSRF, token, and replay boundaries |
| NFR7 durable messaging | C03 and C15 define at-least-once, outbox/inbox, confirms, commit-before-ack, DLQ, and replay semantics |
| NFR8 formal API contracts | Every synchronous provider boundary is assigned to OpenAPI 3.1.x and every durable event boundary to AsyncAPI 3.0.0 |
| Purchasing safety in FR7/FR8 | C08, C14, and C18 omit assistant approval authority and preserve versions, atomic receipt validation, cancellation, and cumulative receipt limits |
| Manual review quota in FR9-FR9.5 | C14 and C18 expose remaining allowance/reset time and `429`, while U8 remains authoritative |
| Local-first AI and clean CPU path | C19 and C21 prohibit owner-only credentials/GPU and automatic remote fallback |
| Audit/search requirements | C15 preserves authoritative events and idempotent projection; C18 exposes tenant-authorized queries and lag failures |
| Portfolio evidence and reproducibility | C19 binds evidence to revision, deterministic scenario, measured environment, checks, outcomes, and checksums |

## Open questions

These questions are implementation parameters already identified upstream. They do not change the approved contract style or authority boundaries.

| Contract | Question | Blocks |
| --- | --- | --- |
| C01 | Which exact OpenAPI 3.1 patch, AsyncAPI validator, JSON Schema validator, compatibility checker, and code generators are pinned? | U1 contract package and CI checks |
| C02/C16/C20 | What are the session, token, discovery-cache and key-overlap lifetimes; redirect URIs; signing-key store; rotation; and recovery procedure? | U3/U11 identity implementation and negative tests |
| C03/C05/C12/C18 | What are CSV row/size limits, PDF page/size limits, extraction quality thresholds, retrieval top-k and citation limits? | U5 ingestion/retrieval and browser upload contract |
| C04/C06-C07/C10 | What exact forecast freshness threshold, compatible runtime profile, export artifact lifetime, and unavailable behavior are configured? | U6/U7 implementation and U8 planning acceptance |
| C08/C14/C18 | What are the final request body schemas, expected-version representation, buffer defaults, and detailed receipt/replacement-draft examples? | U8 purchasing and planner UI contract tests |
| C15 | What are retry counts, backoff, consumer deadline, queue/backlog cap, DLQ retention, replay batch limit and projection-lag threshold? | RabbitMQ topology, U10 operations and recovery tests |
| C17/C18 | What are numeric interactive budgets, pagination limits, partial-result policy per screen, and BFF response-size caps? | U11 typed clients, NFR1 benchmark and U12 state handling |
| C19 | What are recovery objectives, backup frequency/expiry, persistent disk limits, runner isolation and supported host software versions? | U2/U13 recovery and clean-checkout evidence |
| C21 | Which exact Qwen generation artifact, runtime build, context/concurrency limits, embedding winner/dimensions, and Bedrock models/spend policy are supported? | U5/U9 AI adapters and reviewer setup |
