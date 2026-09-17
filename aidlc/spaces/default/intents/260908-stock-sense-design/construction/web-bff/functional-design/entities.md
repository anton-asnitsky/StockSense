# U11 Web BFF Entity Model

```yaml
model:
  unit: U11
  name: Web BFF
  authority: "Ephemeral browser security, request composition, and provider-correlation state only; U3 owns authentication and U4-U10 own business truth."
  persistence: "Redis is the sole session/cache store. Redis loss signs every browser session out and never changes provider-owned work."
  prohibited_ownership:
    - retailer membership or business roles
    - inventory, demand, supplier, model, forecast, recommendation, purchase, conversation, audit, or evidence facts
    - uploaded file bodies
    - provider idempotency or operation truth

model_constraints:
  - id: MC-01
    statement: "A cookie, session, retailer selection, CSRF token, cache entry, composition, operation link, or model response never grants business authority."
  - id: MC-02
    statement: "Every retailer-scoped provider call carries a short-lived delegated user token and current server-resolved membership and placement context; each provider reauthorizes independently."
  - id: MC-03
    statement: "Redis is disposable. Missing session state yields 401 and reauthentication; no provider mutation is retried, reversed, or reconstructed from BFF state."
  - id: MC-04
    statement: "U11 stores no business record or upload body and never exposes access tokens, refresh tokens, service credentials, cookie values, or CSRF secrets to the browser or telemetry."
  - id: MC-05
    statement: "All mutation requests require current session, retailer-context agreement, CSRF validation, same-origin validation, and a provider-supported idempotency key."
  - id: MC-06
    statement: "Version identities such as cookie_generation, session_version, context_version, operation_version, and cache_generation are independent monotonic values within their declared logical identity; none is globally unique by itself."
  - id: MC-07
    statement: "Safe GET retry is bounded to at most one attempt inside the original browser deadline; mutations are never automatically retried."
  - id: MC-08
    statement: "Private session, retailer, operation, assistant, audit, and provider-derived responses are no-store and contain only browser-allowlisted fields."

entities:
  - id: WB01
    name: LoginTransaction
    description: "One short-lived, one-time OIDC authorization transaction created before redirect."
    storage_role: redis-ephemeral-security
    lifecycle: pending-consumed-expired
    attributes:
      - { name: login_transaction_id, logical_type: random_identifier, required: true, unique: true, references: null, allowed_values: [], default: generated, min: 32, max: 128, constraints: "Never derived from browser input." }
      - { name: state_sha256, logical_type: sha256, required: true, unique: true, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Stored hash; raw state is returned only through the browser redirect." }
      - { name: nonce_sha256, logical_type: sha256, required: true, unique: false, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Bound to the authorization request." }
      - { name: pkce_verifier_ciphertext, logical_type: protected_secret, required: true, unique: false, references: null, allowed_values: [], default: null, min: 43, max: 512, constraints: "Server-only and never logged." }
      - { name: return_path, logical_type: local_path, required: true, unique: false, references: "ReturnPathPolicy", allowed_values: [], default: "/", min: 1, max: 500, constraints: "Must match the local allowlist." }
      - { name: status, logical_type: enum, required: true, unique: false, references: null, allowed_values: [pending, consumed, expired, rejected], default: pending, min: null, max: null, constraints: "Consumed atomically once." }
      - { name: created_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Creation time." }
      - { name: expires_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: created_plus_10_minutes, min: null, max: null, constraints: "Fixed expiry from Identity Access decision Q7." }
      - { name: correlation_id, logical_type: uuid, required: true, unique: false, references: "CorrelationContext.correlation_id", allowed_values: [], default: generated, min: null, max: null, constraints: "Safe request correlation." }
    constraints:
      - id: EC-WB01-01
        statement: "state_sha256 is unique while retained, and pending transitions to consumed or rejected exactly once."
      - id: EC-WB01-02
        statement: "Missing or expired Redis state rejects the callback; U11 never rebuilds a transaction from callback parameters."

  - id: WB02
    name: BrowserSession
    description: "Opaque Redis-backed browser session carrying server-side identity and security state."
    storage_role: redis-ephemeral-security
    lifecycle: active-rotating-expired-revoked-lost
    attributes:
      - { name: session_id_sha256, logical_type: sha256, required: true, unique: true, references: null, allowed_values: [], default: generated, min: 64, max: 64, constraints: "Hash of the opaque cookie identifier." }
      - { name: subject_id, logical_type: opaque_identifier, required: true, unique: false, references: "external:C16.subject", allowed_values: [], default: null, min: 1, max: 200, constraints: "Authenticated subject; not retailer authority." }
      - { name: account_reference, logical_type: opaque_identifier, required: true, unique: false, references: "external:IdentityAccess.UserAccount", allowed_values: [], default: null, min: 1, max: 200, constraints: "Identifier only." }
      - { name: cookie_generation, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: "Monotonic within the logical session lineage." }
      - { name: session_version, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: "Redis compare-and-set version." }
      - { name: status, logical_type: enum, required: true, unique: false, references: null, allowed_values: [active, refreshing, rotating, expired, revoked], default: active, min: null, max: null, constraints: "Missing row represents lost state." }
      - { name: idle_expires_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: activity_plus_30_minutes, min: null, max: null, constraints: "Cannot exceed absolute_expires_at." }
      - { name: absolute_expires_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: created_plus_8_hours, min: null, max: null, constraints: "Never extended." }
      - { name: last_activity_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Updated atomically with session_version." }
      - { name: created_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Session creation time." }
    constraints:
      - id: EC-WB02-01
        statement: "The composite logical lineage and cookie_generation is unique; rotation revokes the prior identifier before the new cookie is returned."
      - id: EC-WB02-02
        statement: "No usable session exists without its Redis record, even if the browser still presents a syntactically valid cookie."

  - id: WB03
    name: SessionTokenState
    description: "Protected delegated access and rotating refresh-token state held only inside a BrowserSession."
    storage_role: redis-ephemeral-secret
    lifecycle: current-rotating-revoked
    attributes:
      - { name: token_state_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Server identity." }
      - { name: session_id_sha256, logical_type: sha256, required: true, unique: true, references: "BrowserSession.session_id_sha256", allowed_values: [], default: null, min: 64, max: 64, constraints: "Exactly one current token state per session." }
      - { name: audience, logical_type: enum, required: true, unique: false, references: "external:C16.access-token", allowed_values: [stocksense-api], default: stocksense-api, min: null, max: null, constraints: "Shared browser API audience." }
      - { name: scopes, logical_type: set_of_bounded_string, required: true, unique: false, references: "external:C16.access-token", allowed_values: [], default: [], min: 1, max: 50, constraints: "Narrow delegated scopes only." }
      - { name: access_token_ciphertext, logical_type: protected_secret, required: true, unique: false, references: null, allowed_values: [], default: null, min: 1, max: 12000, constraints: "Never returned or logged." }
      - { name: access_expires_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: issued_plus_10_minutes, min: null, max: null, constraints: "Approved access-token lifetime." }
      - { name: refresh_token_ciphertext, logical_type: protected_secret, required: true, unique: false, references: null, allowed_values: [], default: null, min: 1, max: 12000, constraints: "One-time rotating token." }
      - { name: refresh_generation, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: "Monotonic per session." }
      - { name: refresh_status, logical_type: enum, required: true, unique: false, references: null, allowed_values: [current, rotating, revoked, reuse_detected], default: current, min: null, max: null, constraints: "Reuse revokes BrowserSession." }
      - { name: token_sha256, logical_type: sha256, required: true, unique: false, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Comparison evidence without logging token value." }
    constraints:
      - id: EC-WB03-01
        statement: "Refresh serialization uses session_version and refresh_generation; only the newly committed generation may be used."
      - id: EC-WB03-02
        statement: "Machine credentials cannot populate this delegated user-token state."

  - id: WB04
    name: CsrfBinding
    description: "Current synchronizer-token binding for one browser session and cookie generation."
    storage_role: redis-ephemeral-security
    lifecycle: current-superseded-expired
    attributes:
      - { name: csrf_binding_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Server identity." }
      - { name: session_id_sha256, logical_type: sha256, required: true, unique: true, references: "BrowserSession.session_id_sha256", allowed_values: [], default: null, min: 64, max: 64, constraints: "One current binding per session." }
      - { name: cookie_generation, logical_type: positive_integer, required: true, unique: false, references: "BrowserSession.cookie_generation", allowed_values: [], default: null, min: 1, max: null, constraints: "Must equal current generation." }
      - { name: retailer_context_version, logical_type: nonnegative_integer, required: true, unique: false, references: "RetailerSelection.context_version", allowed_values: [], default: 0, min: 0, max: null, constraints: "Zero before selection." }
      - { name: token_sha256, logical_type: sha256, required: true, unique: true, references: null, allowed_values: [], default: generated, min: 64, max: 64, constraints: "Constant-time comparison target." }
      - { name: status, logical_type: enum, required: true, unique: false, references: null, allowed_values: [current, superseded, expired], default: current, min: null, max: null, constraints: "Only current validates." }
      - { name: issued_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Issuance time." }
      - { name: expires_at, logical_type: timestamp_utc, required: true, unique: false, references: "BrowserSession.absolute_expires_at", allowed_values: [], default: session_expiry, min: null, max: null, constraints: "Cannot outlive session." }
    constraints:
      - id: EC-WB04-01
        statement: "Login, logout, session rotation, and retailer-context change supersede the prior binding."

  - id: WB05
    name: RetailerSelection
    description: "Navigation selection within a session, never an authorization grant."
    storage_role: redis-ephemeral-context
    lifecycle: absent-selected-cleared
    attributes:
      - { name: retailer_selection_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Server identity." }
      - { name: session_id_sha256, logical_type: sha256, required: true, unique: true, references: "BrowserSession.session_id_sha256", allowed_values: [], default: null, min: 64, max: 64, constraints: "At most one current selection per session." }
      - { name: retailer_id, logical_type: uuid, required: true, unique: false, references: "external:TenantDirectory.Retailer", allowed_values: [], default: null, min: null, max: null, constraints: "Must be a current membership." }
      - { name: placement_generation, logical_type: positive_integer, required: true, unique: false, references: "external:TenantDirectory.RetailerPlacement", allowed_values: [], default: null, min: 1, max: null, constraints: "Revalidated before each provider call." }
      - { name: membership_version, logical_type: bounded_string, required: true, unique: false, references: "external:TenantDirectory.Membership", allowed_values: [], default: null, min: 1, max: 100, constraints: "Context evidence only." }
      - { name: context_version, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: "Monotonic within the session." }
      - { name: selection_mode, logical_type: enum, required: true, unique: false, references: null, allowed_values: [automatic_single, explicit_multiple], default: null, min: null, max: null, constraints: "Records UX path, not authority." }
      - { name: selected_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Selection time." }
    constraints:
      - id: EC-WB05-01
        statement: "A retailer route must match the current selection, and current provider authorization may still deny it."

  - id: WB06
    name: RequestAuthorizationContext
    description: "Request-scoped validated identity, retailer, placement, route, method, and correlation context."
    storage_role: transient-request
    lifecycle: created-validated-denied-expired
    attributes:
      - { name: request_context_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Request identity." }
      - { name: session_id_sha256, logical_type: sha256, required: true, unique: false, references: "BrowserSession.session_id_sha256", allowed_values: [], default: null, min: 64, max: 64, constraints: "Current session." }
      - { name: subject_id, logical_type: opaque_identifier, required: true, unique: false, references: "BrowserSession.subject_id", allowed_values: [], default: null, min: 1, max: 200, constraints: "Delegated subject." }
      - { name: retailer_id, logical_type: uuid, required: false, unique: false, references: "RetailerSelection.retailer_id", allowed_values: [], default: null, min: null, max: null, constraints: "Required for retailer routes." }
      - { name: placement_generation, logical_type: positive_integer, required: false, unique: false, references: "RetailerSelection.placement_generation", allowed_values: [], default: null, min: 1, max: null, constraints: "Required for retailer routes." }
      - { name: route_template, logical_type: bounded_string, required: true, unique: false, references: "external:C18.operation", allowed_values: [], default: null, min: 1, max: 300, constraints: "Template, not raw URI." }
      - { name: method, logical_type: enum, required: true, unique: false, references: null, allowed_values: [GET, HEAD, POST, PUT, PATCH, DELETE], default: null, min: null, max: null, constraints: "Safe-read classification derives from method plus contract." }
      - { name: csrf_validated, logical_type: boolean, required: true, unique: false, references: "CsrfBinding", allowed_values: [true, false], default: false, min: null, max: null, constraints: "Must be true for mutation." }
      - { name: origin_validated, logical_type: boolean, required: true, unique: false, references: null, allowed_values: [true, false], default: false, min: null, max: null, constraints: "Must be true for mutation." }
      - { name: correlation_id, logical_type: uuid, required: true, unique: false, references: "CorrelationContext.correlation_id", allowed_values: [], default: generated, min: null, max: null, constraints: "Bounded propagation identity." }
      - { name: status, logical_type: enum, required: true, unique: false, references: null, allowed_values: [validating, authorized_for_forwarding, denied, expired], default: validating, min: null, max: null, constraints: "Provider still performs business authorization." }
    constraints:
      - id: EC-WB06-01
        statement: "authorized_for_forwarding means only that U11 boundary checks passed; it never records provider authorization."

  - id: WB07
    name: BrowserCommandBinding
    description: "Ephemeral defensive binding of one browser logical command to its canonical request and provider operation."
    storage_role: redis-ephemeral-idempotency
    lifecycle: prepared-submitting-accepted-completed-rejected-unknown
    attributes:
      - { name: command_binding_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "BFF identity." }
      - { name: idempotency_key, logical_type: uuid, required: true, unique: false, references: "external:provider.idempotency-key", allowed_values: [], default: null, min: null, max: null, constraints: "Unique with subject, retailer, and operation." }
      - { name: session_id_sha256, logical_type: sha256, required: true, unique: false, references: "BrowserSession.session_id_sha256", allowed_values: [], default: null, min: 64, max: 64, constraints: "Originating session." }
      - { name: subject_id, logical_type: opaque_identifier, required: true, unique: false, references: "BrowserSession.subject_id", allowed_values: [], default: null, min: 1, max: 200, constraints: "Originating actor." }
      - { name: retailer_id, logical_type: uuid, required: true, unique: false, references: "RetailerSelection.retailer_id", allowed_values: [], default: null, min: null, max: null, constraints: "Command tenant." }
      - { name: operation_id, logical_type: bounded_string, required: true, unique: false, references: "ProviderClientDescriptor.operation_id", allowed_values: [], default: null, min: 1, max: 160, constraints: "Generated-client operation." }
      - { name: expected_version, logical_type: bounded_string, required: false, unique: false, references: "external:provider.aggregate-version", allowed_values: [], default: null, min: 1, max: 100, constraints: "Required where provider contract requires it." }
      - { name: request_sha256, logical_type: sha256, required: true, unique: false, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Canonical headers and body." }
      - { name: status, logical_type: enum, required: true, unique: false, references: null, allowed_values: [prepared, submitting, accepted, completed, rejected, unknown], default: prepared, min: null, max: null, constraints: "Provider result, when known, is referenced rather than reauthored." }
      - { name: created_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Creation time." }
      - { name: expires_at, logical_type: timestamp_utc, required: true, unique: false, references: "BrowserSession.absolute_expires_at", allowed_values: [], default: session_expiry, min: null, max: null, constraints: "Defensive binding may disappear; provider record remains." }
    constraints:
      - id: EC-WB07-01
        statement: "The composite subject_id, retailer_id, operation_id, idempotency_key is unique while retained; a changed request_sha256 conflicts."
      - id: EC-WB07-02
        statement: "Unknown never triggers an automatic mutation retry."

  - id: WB08
    name: ProviderOperationReference
    description: "Opaque browser-safe reference to provider-owned long-running work or command reconciliation."
    storage_role: transient-or-redis-ephemeral-reference
    lifecycle: admitted-running-completed-failed-cancelled-unknown
    attributes:
      - { name: operation_reference_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Opaque same-origin route identity." }
      - { name: command_binding_id, logical_type: uuid, required: false, unique: false, references: "BrowserCommandBinding.command_binding_id", allowed_values: [], default: null, min: null, max: null, constraints: "Present for a command." }
      - { name: provider, logical_type: enum, required: true, unique: false, references: "ProviderClientDescriptor.provider", allowed_values: [retail-data, supplier-knowledge, model-lifecycle, forecasting, planning-purchasing, assistant, audit-evidence], default: null, min: null, max: null, constraints: "Owning provider." }
      - { name: provider_operation_id, logical_type: opaque_identifier, required: true, unique: false, references: "external:provider.operation", allowed_values: [], default: null, min: 1, max: 200, constraints: "Never sufficient for access." }
      - { name: provider_operation_version, logical_type: bounded_string, required: true, unique: false, references: "external:provider.operation-version", allowed_values: [], default: null, min: 1, max: 100, constraints: "Observed version." }
      - { name: subject_id, logical_type: opaque_identifier, required: true, unique: false, references: "BrowserSession.subject_id", allowed_values: [], default: null, min: 1, max: 200, constraints: "Reauthorized on reads." }
      - { name: retailer_id, logical_type: uuid, required: true, unique: false, references: "RetailerSelection.retailer_id", allowed_values: [], default: null, min: null, max: null, constraints: "Reauthorized on reads." }
      - { name: state, logical_type: enum, required: true, unique: false, references: null, allowed_values: [admitted, running, completed, failed, cancelled, unknown], default: admitted, min: null, max: null, constraints: "Copied from provider without changing meaning." }
      - { name: same_origin_location, logical_type: local_path, required: true, unique: true, references: "external:C18.operation-status", allowed_values: [], default: generated, min: 1, max: 500, constraints: "Contains no provider host or secret." }
      - { name: observed_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Observation time." }
    constraints:
      - id: EC-WB08-01
        statement: "Every status read reauthenticates and reauthorizes subject, retailer, placement, and provider resource ownership."

  - id: WB09
    name: BrowserUploadDescriptor
    description: "Transient bounded metadata for a directly streamed upload; the body is never persisted by U11."
    storage_role: transient-stream
    lifecycle: validating-streaming-admitted-aborted-rejected-unknown
    attributes:
      - { name: upload_descriptor_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Request identity." }
      - { name: command_binding_id, logical_type: uuid, required: true, unique: true, references: "BrowserCommandBinding.command_binding_id", allowed_values: [], default: null, min: null, max: null, constraints: "Idempotent admission binding." }
      - { name: import_kind, logical_type: enum, required: true, unique: false, references: "external:C18.import-kind", allowed_values: [inventory_csv, demand_csv, supplier_csv, supplier_pdf], default: null, min: null, max: null, constraints: "Selects owning provider and limits." }
      - { name: safe_filename, logical_type: bounded_string, required: true, unique: false, references: null, allowed_values: [], default: null, min: 1, max: 255, constraints: "Path components removed; never used as storage path." }
      - { name: declared_media_type, logical_type: bounded_string, required: true, unique: false, references: null, allowed_values: [], default: null, min: 1, max: 100, constraints: "Must agree with detected type." }
      - { name: detected_media_type, logical_type: enum, required: true, unique: false, references: null, allowed_values: [text/csv, application/pdf], default: null, min: null, max: null, constraints: "Detected from bounded leading bytes." }
      - { name: max_bytes, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: kind_default, min: 1, max: 26214400, constraints: "10 MiB CSV or 25 MiB PDF repository default." }
      - { name: observed_bytes, logical_type: nonnegative_integer, required: true, unique: false, references: null, allowed_values: [], default: 0, min: 0, max: 26214400, constraints: "Incremented with streaming backpressure." }
      - { name: content_sha256, logical_type: sha256, required: false, unique: false, references: "external:provider.upload-digest", allowed_values: [], default: null, min: 64, max: 64, constraints: "Present only after full stream consumed." }
      - { name: state, logical_type: enum, required: true, unique: false, references: null, allowed_values: [validating, streaming, admitted, aborted, rejected, unknown], default: validating, min: null, max: null, constraints: "Unknown requires reconciliation." }
    constraints:
      - id: EC-WB09-01
        statement: "No file body, extracted text, row value, or PDF page content is retained in Redis, logs, traces, or metrics."

  - id: WB10
    name: DashboardComposition
    description: "Request-scoped composition of required and optional provider sections."
    storage_role: transient-response
    lifecycle: loading-complete-partial-unavailable-denied
    attributes:
      - { name: composition_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Request identity." }
      - { name: request_context_id, logical_type: uuid, required: true, unique: true, references: "RequestAuthorizationContext.request_context_id", allowed_values: [], default: null, min: null, max: null, constraints: "Authorized request context." }
      - { name: retailer_id, logical_type: uuid, required: true, unique: false, references: "RetailerSelection.retailer_id", allowed_values: [], default: null, min: null, max: null, constraints: "Selected retailer." }
      - { name: placement_generation, logical_type: positive_integer, required: true, unique: false, references: "RetailerSelection.placement_generation", allowed_values: [], default: null, min: 1, max: null, constraints: "Single request snapshot." }
      - { name: state, logical_type: enum, required: true, unique: false, references: null, allowed_values: [loading, complete, partial, unavailable, denied], default: loading, min: null, max: null, constraints: "Determines 200, 206, 503, or authorization response." }
      - { name: http_status, logical_type: enum, required: false, unique: false, references: null, allowed_values: [200, 206, 401, 403, 404, 503], default: null, min: null, max: null, constraints: "Derived from required core and authority." }
      - { name: observed_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Composition time." }
      - { name: correlation_id, logical_type: uuid, required: true, unique: false, references: "CorrelationContext.correlation_id", allowed_values: [], default: null, min: null, max: null, constraints: "Shared call-tree identity." }
    constraints:
      - id: EC-WB10-01
        statement: "Complete requires every requested section ready; partial requires membership and inventory ready plus at least one degraded optional section."

  - id: WB11
    name: DashboardSection
    description: "One typed section result with provenance and freshness."
    storage_role: transient-response
    lifecycle: ready-stale-unavailable-forbidden
    attributes:
      - { name: dashboard_section_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Section identity." }
      - { name: composition_id, logical_type: uuid, required: true, unique: false, references: "DashboardComposition.composition_id", allowed_values: [], default: null, min: null, max: null, constraints: "Owning response." }
      - { name: section_kind, logical_type: enum, required: true, unique: false, references: null, allowed_values: [membership, inventory, forecast, review, supplier], default: null, min: null, max: null, constraints: "Membership and inventory are required core." }
      - { name: requirement, logical_type: enum, required: true, unique: false, references: null, allowed_values: [required, optional], default: null, min: null, max: null, constraints: "Fixed by contract." }
      - { name: state, logical_type: enum, required: true, unique: false, references: null, allowed_values: [ready, stale, unavailable, forbidden], default: null, min: null, max: null, constraints: "Never represented by omission." }
      - { name: source_version, logical_type: bounded_string, required: false, unique: false, references: "external:provider.source-version", allowed_values: [], default: null, min: 1, max: 100, constraints: "Required when provider returned data." }
      - { name: freshness, logical_type: enum, required: true, unique: false, references: null, allowed_values: [current, stale, unknown], default: unknown, min: null, max: null, constraints: "Explicit even on failure." }
      - { name: provider_observed_at, logical_type: timestamp_utc, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Provider observation time." }
      - { name: safe_problem_code, logical_type: bounded_string, required: false, unique: false, references: "BrowserProblemDescriptor.code", allowed_values: [], default: null, min: 1, max: 120, constraints: "No exception detail." }
      - { name: payload, logical_type: contract_dto, required: false, unique: false, references: "external:C18.dashboard-section", allowed_values: [], default: null, min: null, max: response_limit, constraints: "Browser-allowlisted fields only." }
    constraints:
      - id: EC-WB11-01
        statement: "The composite composition_id, section_kind is unique. Payload is present only when the state permits browser-safe data."

  - id: WB12
    name: AssistantStreamSubscription
    description: "Request-scoped authorization and resume state for one provider-owned assistant turn stream."
    storage_role: transient-stream
    lifecycle: connecting-open-disconnected-resuming-completed-failed
    attributes:
      - { name: stream_subscription_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Connection identity." }
      - { name: operation_reference_id, logical_type: uuid, required: true, unique: false, references: "ProviderOperationReference.operation_reference_id", allowed_values: [], default: null, min: null, max: null, constraints: "Provider-owned turn operation." }
      - { name: conversation_id, logical_type: opaque_identifier, required: true, unique: false, references: "external:Assistant.Conversation", allowed_values: [], default: null, min: 1, max: 200, constraints: "Reauthorized resource." }
      - { name: turn_id, logical_type: opaque_identifier, required: true, unique: false, references: "external:Assistant.Turn", allowed_values: [], default: null, min: 1, max: 200, constraints: "Cannot change during resume." }
      - { name: subject_id, logical_type: opaque_identifier, required: true, unique: false, references: "BrowserSession.subject_id", allowed_values: [], default: null, min: 1, max: 200, constraints: "Current viewer." }
      - { name: retailer_id, logical_type: uuid, required: true, unique: false, references: "RetailerSelection.retailer_id", allowed_values: [], default: null, min: null, max: null, constraints: "Current tenant." }
      - { name: resume_cursor, logical_type: bounded_string, required: false, unique: false, references: "external:Assistant.StreamEvent", allowed_values: [], default: null, min: 1, max: 300, constraints: "Opaque, bounded, and provider-validated." }
      - { name: last_event_id, logical_type: bounded_string, required: false, unique: false, references: "external:Assistant.StreamEvent", allowed_values: [], default: null, min: 1, max: 200, constraints: "Browser deduplication identity." }
      - { name: state, logical_type: enum, required: true, unique: false, references: null, allowed_values: [connecting, open, disconnected, resuming, snapshot_required, completed, failed], default: connecting, min: null, max: null, constraints: "Disconnect does not cancel provider work." }
      - { name: connected_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Connection time." }
    constraints:
      - id: EC-WB12-01
        statement: "Resume requires the same current subject, retailer, conversation, turn, and authorized provider operation."

  - id: WB13
    name: ProviderMetadataCacheEntry
    description: "Explicitly cacheable provider metadata scoped to identity, tenant, placement, scope, and source version."
    storage_role: redis-ephemeral-cache
    lifecycle: current-stale-expired-evicted
    attributes:
      - { name: cache_entry_id, logical_type: sha256, required: true, unique: true, references: null, allowed_values: [], default: derived_key, min: 64, max: 64, constraints: "Hash of complete key tuple." }
      - { name: subject_id, logical_type: opaque_identifier, required: true, unique: false, references: "BrowserSession.subject_id", allowed_values: [], default: null, min: 1, max: 200, constraints: "Prevents cross-user reuse." }
      - { name: retailer_id, logical_type: uuid, required: true, unique: false, references: "RetailerSelection.retailer_id", allowed_values: [], default: null, min: null, max: null, constraints: "Prevents cross-retailer reuse." }
      - { name: placement_generation, logical_type: positive_integer, required: true, unique: false, references: "RetailerSelection.placement_generation", allowed_values: [], default: null, min: 1, max: null, constraints: "Stale placement misses cache." }
      - { name: scope_fingerprint, logical_type: sha256, required: true, unique: false, references: "SessionTokenState.scopes", allowed_values: [], default: null, min: 64, max: 64, constraints: "Exact effective scope set." }
      - { name: provider, logical_type: bounded_string, required: true, unique: false, references: "ProviderClientDescriptor.provider", allowed_values: [], default: null, min: 1, max: 80, constraints: "Provider name." }
      - { name: metadata_kind, logical_type: bounded_string, required: true, unique: false, references: "external:C17.cache-profile", allowed_values: [], default: null, min: 1, max: 100, constraints: "Must be explicitly cacheable." }
      - { name: source_version, logical_type: bounded_string, required: true, unique: false, references: "external:provider.source-version", allowed_values: [], default: null, min: 1, max: 100, constraints: "Part of key." }
      - { name: payload, logical_type: contract_dto, required: true, unique: false, references: "external:provider.cacheable-metadata", allowed_values: [], default: null, min: null, max: cache_limit, constraints: "No business mutation result or token." }
      - { name: expires_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: provider_ttl, min: null, max: null, constraints: "Cannot exceed provider declaration." }
    constraints:
      - id: EC-WB13-01
        statement: "Membership and authorization decisions are never served from stale cache, and eviction changes no business outcome."

  - id: WB14
    name: ProviderClientDescriptor
    description: "Versioned configuration for one generated provider client and operation family."
    storage_role: immutable-deployment-configuration
    lifecycle: configured-active-superseded
    attributes:
      - { name: provider_client_descriptor_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated_at_build, min: null, max: null, constraints: "Configuration identity." }
      - { name: provider, logical_type: enum, required: true, unique: false, references: "external:C17.provider", allowed_values: [retail-data, supplier-knowledge, model-lifecycle, forecasting, planning-purchasing, assistant, audit-evidence], default: null, min: null, max: null, constraints: "Contract owner." }
      - { name: operation_id, logical_type: bounded_string, required: true, unique: false, references: "external:C17.required-capability", allowed_values: [], default: null, min: 1, max: 160, constraints: "Generated operation identity." }
      - { name: contract_version, logical_type: semantic_version, required: true, unique: false, references: "external:U1.OpenAPI", allowed_values: [], default: null, min: null, max: 32, constraints: "Pinned generated-client input." }
      - { name: operation_class, logical_type: enum, required: true, unique: false, references: null, allowed_values: [safe_read, idempotent_command, nonretryable_command, long_running_admission, event_stream], default: null, min: null, max: null, constraints: "Controls retry and timeout semantics." }
      - { name: timeout_profile, logical_type: bounded_string, required: true, unique: false, references: "external:C17.timeout-profile", allowed_values: [], default: null, min: 1, max: 80, constraints: "NFR-resolved profile key." }
      - { name: response_limit_bytes, logical_type: positive_integer, required: true, unique: false, references: "external:C17.response-limit", allowed_values: [], default: deployment_profile, min: 1, max: null, constraints: "Reject oversized provider output." }
      - { name: safe_problem_map_version, logical_type: semantic_version, required: true, unique: false, references: "external:U1.problem-map", allowed_values: [], default: null, min: null, max: 32, constraints: "Browser disclosure allowlist." }
      - { name: status, logical_type: enum, required: true, unique: false, references: null, allowed_values: [configured, active, superseded], default: configured, min: null, max: null, constraints: "Only active receives calls." }
    constraints:
      - id: EC-WB14-01
        statement: "The composite provider, operation_id, contract_version is unique; runtime startup fails if a required generated contract is missing or incompatible."

  - id: WB15
    name: ProviderResilienceState
    description: "Ephemeral independently keyed timeout, bulkhead, and circuit state for one provider operation family."
    storage_role: process-ephemeral-resilience
    lifecycle: closed-open-half_open
    attributes:
      - { name: resilience_state_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Instance-local identity." }
      - { name: provider_client_descriptor_id, logical_type: uuid, required: true, unique: true, references: "ProviderClientDescriptor.provider_client_descriptor_id", allowed_values: [], default: null, min: null, max: null, constraints: "Independent state per descriptor." }
      - { name: circuit_state, logical_type: enum, required: true, unique: false, references: null, allowed_values: [closed, open, half_open], default: closed, min: null, max: null, constraints: "Never shared across all providers." }
      - { name: active_calls, logical_type: nonnegative_integer, required: true, unique: false, references: null, allowed_values: [], default: 0, min: 0, max: deployment_bulkhead, constraints: "Concurrency admission count." }
      - { name: failure_count, logical_type: nonnegative_integer, required: true, unique: false, references: null, allowed_values: [], default: 0, min: 0, max: null, constraints: "Bounded observation window." }
      - { name: opened_at, logical_type: timestamp_utc, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Present while open." }
      - { name: next_probe_at, logical_type: timestamp_utc, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Controls half-open probe." }
      - { name: safe_read_retry_used, logical_type: boolean, required: true, unique: false, references: null, allowed_values: [true, false], default: false, min: null, max: null, constraints: "At most one inside request budget." }
    constraints:
      - id: EC-WB15-01
        statement: "A mutation operation class never sets safe_read_retry_used to true and is attempted once per browser request."

  - id: WB16
    name: BrowserProblemDescriptor
    description: "Request-scoped RFC 9457 problem detail containing only browser-safe error information."
    storage_role: transient-response
    lifecycle: created-returned
    attributes:
      - { name: problem_descriptor_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Response identity." }
      - { name: type, logical_type: uri_reference, required: true, unique: false, references: "external:C18.problem-details", allowed_values: [], default: stable_bff_type, min: 1, max: 300, constraints: "No secret query data." }
      - { name: title, logical_type: bounded_string, required: true, unique: false, references: null, allowed_values: [], default: mapped_title, min: 1, max: 160, constraints: "Safe generic title." }
      - { name: status, logical_type: integer, required: true, unique: false, references: null, allowed_values: [400, 401, 403, 404, 409, 413, 415, 422, 429, 500, 502, 503, 504], default: null, min: 400, max: 599, constraints: "HTTP status." }
      - { name: detail, logical_type: bounded_string, required: false, unique: false, references: null, allowed_values: [], default: null, min: 1, max: 500, constraints: "Allowlisted and free of exception/provider internals." }
      - { name: instance, logical_type: local_path, required: true, unique: false, references: null, allowed_values: [], default: request_path_template, min: 1, max: 500, constraints: "No tenant-hidden resource identity when 404 is required." }
      - { name: code, logical_type: bounded_string, required: true, unique: false, references: "external:U1.problem-map", allowed_values: [], default: mapped_code, min: 1, max: 120, constraints: "Stable browser code." }
      - { name: correlation_id, logical_type: uuid, required: true, unique: false, references: "CorrelationContext.correlation_id", allowed_values: [], default: null, min: null, max: null, constraints: "Support correlation." }
      - { name: outcome_state, logical_type: enum, required: false, unique: false, references: null, allowed_values: [rejected, pending, unknown, unavailable, partial], default: null, min: null, max: null, constraints: "Required when HTTP status alone cannot express mutation certainty." }
    constraints:
      - id: EC-WB16-01
        statement: "Unknown provider errors map to a generic stable BFF code; raw bodies and exception text are never forwarded."

  - id: WB17
    name: CorrelationContext
    description: "Bounded request correlation propagated across the BFF and provider call tree."
    storage_role: transient-observability
    lifecycle: accepted-generated-propagated-completed
    attributes:
      - { name: correlation_context_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Internal rowless identity." }
      - { name: correlation_id, logical_type: uuid, required: true, unique: true, references: "external:common-envelope.correlationId", allowed_values: [], default: generated_if_invalid, min: null, max: null, constraints: "Accept only valid UUID input." }
      - { name: trace_id, logical_type: bounded_string, required: true, unique: false, references: "external:W3C.traceparent", allowed_values: [], default: generated, min: 32, max: 64, constraints: "Validated trace identity." }
      - { name: parent_span_id, logical_type: bounded_string, required: false, unique: false, references: "external:W3C.traceparent", allowed_values: [], default: null, min: 16, max: 16, constraints: "Validated or omitted." }
      - { name: request_started_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Budget origin." }
      - { name: browser_deadline_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: operation_budget, min: null, max: null, constraints: "Provider attempts cannot extend it." }
    constraints:
      - id: EC-WB17-01
        statement: "Correlation is evidence for diagnostics only and cannot select a tenant, actor, session, or provider resource."

  - id: WB18
    name: ReturnPathPolicy
    description: "Immutable deployment policy for local post-login and post-logout browser paths."
    storage_role: immutable-deployment-configuration
    lifecycle: configured-active-superseded
    attributes:
      - { name: return_path_policy_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated_at_build, min: null, max: null, constraints: "Policy identity." }
      - { name: policy_version, logical_type: semantic_version, required: true, unique: true, references: "external:C16.return-path-policy", allowed_values: [], default: null, min: null, max: 32, constraints: "Pinned contract version." }
      - { name: application_origin, logical_type: uri, required: true, unique: false, references: null, allowed_values: [https://app.stocksense.localhost], default: https://app.stocksense.localhost, min: null, max: 300, constraints: "Fixed local origin for initial profile." }
      - { name: allowed_path_prefixes, logical_type: list_of_local_path, required: true, unique: false, references: null, allowed_values: [], default: ["/"], min: 1, max: 50, constraints: "No scheme, authority, backslash, encoded authority, or protocol-relative path." }
      - { name: default_path, logical_type: local_path, required: true, unique: false, references: null, allowed_values: ["/"], default: "/", min: 1, max: 500, constraints: "Used for invalid input." }
      - { name: status, logical_type: enum, required: true, unique: false, references: null, allowed_values: [configured, active, superseded], default: active, min: null, max: null, constraints: "Exactly one active version." }
    constraints:
      - id: EC-WB18-01
        statement: "An absolute, external, protocol-relative, encoded-authority, or non-allowlisted return path is replaced by default_path."

relationships:
  - { id: R01, name: callback_consumes_login, from: LoginTransaction, to: BrowserSession, cardinality: "1 to 0..1", description: "A successful one-time callback creates one session." }
  - { id: R02, name: session_holds_tokens, from: BrowserSession, to: SessionTokenState, cardinality: "1 to 1", description: "Tokens remain server-side." }
  - { id: R03, name: session_has_csrf, from: BrowserSession, to: CsrfBinding, cardinality: "1 to 1 current", description: "Mutation protection." }
  - { id: R04, name: session_selects_retailer, from: BrowserSession, to: RetailerSelection, cardinality: "1 to 0..1", description: "Navigation context only." }
  - { id: R05, name: session_creates_request_contexts, from: BrowserSession, to: RequestAuthorizationContext, cardinality: "1 to 0..many transient", description: "Each request revalidates context." }
  - { id: R06, name: session_binds_commands, from: BrowserSession, to: BrowserCommandBinding, cardinality: "1 to 0..many", description: "Defensive Redis idempotency state." }
  - { id: R07, name: command_references_operation, from: BrowserCommandBinding, to: ProviderOperationReference, cardinality: "1 to 0..1", description: "Provider remains authoritative." }
  - { id: R08, name: upload_uses_command, from: BrowserUploadDescriptor, to: BrowserCommandBinding, cardinality: "1 to 1", description: "Upload admission is idempotent." }
  - { id: R09, name: request_builds_dashboard, from: RequestAuthorizationContext, to: DashboardComposition, cardinality: "1 to 0..1", description: "Authorized composition." }
  - { id: R10, name: dashboard_contains_sections, from: DashboardComposition, to: DashboardSection, cardinality: "1 to 2..many", description: "Required and optional typed sections." }
  - { id: R11, name: stream_observes_operation, from: AssistantStreamSubscription, to: ProviderOperationReference, cardinality: "many connections to 1 operation", description: "Reconnects observe the same turn." }
  - { id: R12, name: cache_scoped_by_session, from: BrowserSession, to: ProviderMetadataCacheEntry, cardinality: "1 to 0..many", description: "No cross-user cache reuse." }
  - { id: R13, name: cache_uses_provider_descriptor, from: ProviderMetadataCacheEntry, to: ProviderClientDescriptor, cardinality: "many to 1", description: "Only declared metadata is cacheable." }
  - { id: R14, name: provider_has_resilience_state, from: ProviderClientDescriptor, to: ProviderResilienceState, cardinality: "1 to 1 per process", description: "Failure isolation by client operation family." }
  - { id: R15, name: request_has_correlation, from: RequestAuthorizationContext, to: CorrelationContext, cardinality: "1 to 1", description: "One bounded call-tree correlation." }
  - { id: R16, name: problem_describes_operation, from: BrowserProblemDescriptor, to: ProviderOperationReference, cardinality: "many to 0..1", description: "Unknown or failed operation may have safe problem state." }
  - { id: R17, name: login_uses_return_policy, from: LoginTransaction, to: ReturnPathPolicy, cardinality: "many to 1 active", description: "Only local allowlisted paths survive." }
```

## Readable Summary

U11's durable-looking identifiers are all ephemeral Redis, process, request, or deployment-configuration state. `BrowserSession` is the root of server-side browser security and owns exactly one current `SessionTokenState` and `CsrfBinding`, plus an optional `RetailerSelection`. Losing Redis invalidates these objects and therefore invalidates every outstanding cookie; it cannot erase a provider command, operation, conversation, or audit record.

`BrowserCommandBinding` protects one browser session against changed-payload replay and points to a `ProviderOperationReference`, but the provider's idempotency and operation resources remain authoritative. `BrowserUploadDescriptor`, `DashboardComposition`, `DashboardSection`, `AssistantStreamSubscription`, `RequestAuthorizationContext`, `BrowserProblemDescriptor`, and `CorrelationContext` are request or connection state and store no business truth. Provider metadata caching is explicitly scoped by subject, retailer, placement, scope, provider, and source version.

## Sources

- `construction/web-bff/functional-design/functional-design-questions.md` — confirmed Q1-Q10.
- `inception/units-generation/unit-of-work.md` and `unit-of-work-story-map.md` — U11 ownership and 38 assigned stories.
- `inception/requirements-analysis/requirements.md` and `inception/user-stories/stories.md` — security, tenant, workflow, resilience, and reviewer obligations.
- `inception/domain-design/components.md` — WebExperience interactions and ownership boundaries.
- `inception/contract-design/contract-summary.md` — C16-C18, common authority rules, provider registry, and error/retry profiles.

## Assumptions & Open Questions

- NFR Requirements must set exact Redis capacity/eviction behavior, browser and provider deadlines, bulkheads, circuit thresholds, cache TTLs, response limits, polling cadence, and SSE cursor retention.
- U1 must add the confirmed retailer-selection, operation-status, assistant-SSE, dashboard-section, upload, and safe-error schemas to C16-C18 before implementation.
- Redis persistence may improve availability but is never a recovery guarantee for U11; session loss always has the same sign-in-required semantics.
- Provider operation references and cache payloads remain bounded contract DTOs and cannot become an alternate local business model.
