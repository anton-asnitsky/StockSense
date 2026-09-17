# U11 Web BFF Business Rules

Date: 2026-09-15  
Stage: Functional Design  
Unit: U11 `web-bff`

Rule targets use the exact entity names from `entities.md`. Provider-owned resources appear only through the external C16-C19 and provider-contract references in each rule source; no rule makes U11 the owner of business state.

```yaml
rules:
  - id: BR1.1
    statement: "U11 must complete local sign-in only through a one-time OIDC authorization-code and PKCE transaction and keep every delegated token server-side."
    category: authorization
    applies_to: ["LoginTransaction", "BrowserSession", "SessionTokenState", "ReturnPathPolicy"]
    trigger: "A browser begins or completes local sign-in."
    logic: "IF this browser workflow is requested THEN U11 must validate the local return path, Redis login transaction, state, nonce, issuer, audience, redirect URI and PKCE result before atomically consuming the transaction and creating the opaque Redis session."
    violation_behavior: "Reject the callback or login, create no session, expose no token, and return a safe correlated authentication result."
    source: ["US1.1", "C16", "Q1", "Q2", "AC1.1.1", "AC1.1.2", "AC1.1.3", "AC1.1.4"]

  - id: BR1.2
    statement: "U11 must treat Google as an optional U3 federation path without changing the BFF callback, local-account-linking authority, or clean local login path."
    category: authorization
    applies_to: ["LoginTransaction", "BrowserSession", "ReturnPathPolicy"]
    trigger: "The user selects Google sign-in or returns from a federated callback."
    logic: "IF this browser workflow is requested THEN U11 must use the same validated U3 authorization transaction and accept only the U3-issued local subject; never link by email or grant retailer membership from external claims."
    violation_behavior: "Deny the callback safely, retain local sign-in availability, and disclose no external or local account relationship."
    source: ["US1.2", "C16", "C20", "AC1.2.1", "AC1.2.2", "AC1.2.3"]

  - id: BR1.3
    statement: "U11 must invalidate the Redis session before expiring the browser cookie and make repeated logout safe."
    category: policy
    applies_to: ["BrowserSession", "SessionTokenState", "CsrfBinding"]
    trigger: "A signed-in or stale-cookie browser requests logout."
    logic: "IF this browser workflow is requested THEN U11 must revoke the current session and token state, supersede CSRF state, expire the host cookie, and invoke the supported U3 end-session path without depending on its success to invalidate U11."
    violation_behavior: "Leave the cookie unusable, return a safe outcome, and never restore a revoked session from browser input."
    source: ["US1.3", "C16", "Q1", "Q4", "AC1.3.1", "AC1.3.2", "AC1.3.3"]

  - id: BR1.4
    statement: "U11 must treat retailer selection as navigation state and revalidate current membership, role, resource ownership, and placement for every provider call."
    category: authorization
    applies_to: ["BrowserSession", "RetailerSelection", "RequestAuthorizationContext", "CsrfBinding"]
    trigger: "The browser selects a retailer or calls a retailer-scoped route."
    logic: "IF this browser workflow is requested THEN U11 must auto-select one membership, require a CSRF-protected choice for multiple memberships, require route/session agreement, and send current context with the delegated user token for provider reauthorization."
    violation_behavior: "Clear stale selection, return the required no-access, forbidden, or tenant-hiding response, and never redirect an uncertain mutation to another retailer."
    source: ["US1.4", "C17", "C18", "Q3", "Q4", "AC1.4.1", "AC1.4.2", "AC1.4.3", "AC1.4.4", "AC1.4.5"]

  - id: BR2.2
    statement: "U11 must stream inventory imports to Retail Data under bounded validation and one unchanged idempotency key without retaining the file body."
    category: validation
    applies_to: ["BrowserUploadDescriptor", "BrowserCommandBinding", "ProviderOperationReference", "RequestAuthorizationContext"]
    trigger: "A planner submits an inventory CSV."
    logic: "IF this browser workflow is requested THEN U11 must validate session, retailer, CSRF, media signature and 10 MiB default, stream with digest and backpressure, and return the provider operation or explicit uncertain admission state."
    violation_behavior: "Abort before or during forwarding, persist no body, and return 413, 415, 422, conflict, or unknown without automatic resubmission."
    source: ["US2.2", "C18", "Q6", "Q7", "AC2.2.1", "AC2.2.2", "AC2.2.3", "AC2.2.4"]

  - id: BR2.3
    statement: "U11 must return inventory positions and movement history only through current retailer-authorized, bounded, generated-client reads."
    category: authorization
    applies_to: ["RequestAuthorizationContext", "ProviderClientDescriptor", "BrowserProblemDescriptor", "CorrelationContext"]
    trigger: "A browser requests inventory or movement history."
    logic: "IF this browser workflow is requested THEN U11 must validate route, filters, pagination, current membership and placement, call Retail Data with delegated authority, and preserve source versions and stable ordering."
    violation_behavior: "Return no foreign resource, map unsafe detail to a safe problem, and expose stale or unavailable state explicitly."
    source: ["US2.3", "C17", "C18", "Q2", "Q3", "Q10", "AC2.3.1", "AC2.3.2", "AC2.3.3"]

  - id: BR2.4
    statement: "U11 must cache only explicitly cacheable provider metadata under full user, retailer, placement, scope, provider, and source-version keys."
    category: constraint
    applies_to: ["ProviderMetadataCacheEntry", "RetailerSelection", "ProviderClientDescriptor"]
    trigger: "U11 considers serving a value across browser requests."
    logic: "IF this browser workflow is requested THEN U11 must require a current exact cache key and provider-declared lifetime; revalidate membership and never treat cached mutation, inventory, audit, or authorization output as authority."
    violation_behavior: "Miss or evict the entry and call the provider, without changing provider state or leaking data across users or retailers."
    source: ["US2.4", "Q9", "AC2.4.1", "AC2.4.2", "AC2.4.3"]

  - id: BR2.5
    statement: "U11 must stream sales-history CSV imports to Retail Data with the same bounded upload and durable provider-idempotency semantics as inventory imports."
    category: validation
    applies_to: ["BrowserUploadDescriptor", "BrowserCommandBinding", "ProviderOperationReference", "RequestAuthorizationContext"]
    trigger: "A planner submits demand or sales-history data."
    logic: "IF this browser workflow is requested THEN U11 must validate current retailer and CSRF context, enforce CSV media and 10 MiB default, forward one digest-bound request, and expose the provider job and source-version outcome."
    violation_behavior: "Store no body, create no synthetic demand truth, and return explicit rejection or uncertain admission without automatic retry."
    source: ["US2.5", "C18", "Q6", "Q7", "AC2.5.1", "AC2.5.2", "AC2.5.3"]

  - id: BR3.1
    statement: "U11 must stream supplier CSV offers to Supplier Knowledge without BFF persistence or authority over extracted and accepted terms."
    category: validation
    applies_to: ["BrowserUploadDescriptor", "BrowserCommandBinding", "ProviderOperationReference"]
    trigger: "A planner uploads supplier-offer CSV data."
    logic: "IF this browser workflow is requested THEN U11 must apply the current retailer, CSRF, idempotency, CSV media, byte, row and decompression rules and proxy the provider-owned operation status."
    violation_behavior: "Reject or abort safely, retain no supplier values, and never convert extraction output into accepted terms."
    source: ["US3.1", "C17", "C18", "Q7", "AC3.1.1", "AC3.1.2", "AC3.1.3", "AC3.1.4"]

  - id: BR3.2
    statement: "U11 must stream supplier PDF evidence under the 25 MiB default and provider page/content limits without retaining raw documents or extracted text."
    category: validation
    applies_to: ["BrowserUploadDescriptor", "BrowserCommandBinding", "ProviderOperationReference"]
    trigger: "A planner uploads a supplier PDF."
    logic: "IF this browser workflow is requested THEN U11 must validate PDF signature, filename and bounds, stream with digest and backpressure, and return only the provider operation and browser-safe validation state."
    violation_behavior: "Abort or reject with safe metadata, persist no PDF body or text, and require explicit reconciliation after uncertain admission."
    source: ["US3.2", "C17", "C18", "Q7", "AC3.2.1", "AC3.2.2", "AC3.2.3", "AC3.2.4"]

  - id: BR3.3
    statement: "U11 must display accepted commercial terms, source versions, validation state, currency, and citations exactly as authorized and reported by Supplier Knowledge."
    category: authorization
    applies_to: ["RequestAuthorizationContext", "ProviderClientDescriptor", "BrowserProblemDescriptor"]
    trigger: "A browser reads or acts on supplier term evidence."
    logic: "IF this browser workflow is requested THEN U11 must reauthorize retailer and resource, validate the generated response, preserve accepted versus unvalidated state and source/page citations, and expose stale conflicts."
    violation_behavior: "Hide foreign data, omit unsafe source content, and never accept or alter terms in U11."
    source: ["US3.3", "C17", "C18", "AC3.3.1", "AC3.3.2", "AC3.3.3"]

  - id: BR4.5
    statement: "U11 must proxy model promotion and rollback commands only for currently authorized actors and preserve Model Lifecycle versions, evidence, rejection, and prior provenance."
    category: authorization
    applies_to: ["BrowserCommandBinding", "ProviderOperationReference", "RequestAuthorizationContext"]
    trigger: "An authorized browser requests promotion or rollback or views its result."
    logic: "IF this browser workflow is requested THEN U11 must validate CSRF, expected version and idempotency, forward once to Model Lifecycle, and reconcile the provider-owned operation without selecting a model in U11."
    violation_behavior: "Return denied, stale, failed, or unknown safely and never retry, promote, roll back, or fabricate evaluation evidence locally."
    source: ["US4.5", "C17", "C18", "Q6", "AC4.5.1", "AC4.5.2", "AC4.5.3"]

  - id: BR4.6
    statement: "U11 must represent forecast quality, freshness, provenance, baseline comparison, and unavailability as typed provider-derived browser state."
    category: policy
    applies_to: ["DashboardComposition", "DashboardSection", "ProviderClientDescriptor"]
    trigger: "The dashboard or forecast view requests current forecast evidence."
    logic: "IF this browser workflow is requested THEN U11 must validate source version and freshness, preserve model/data/configuration provenance, and mark an optional dashboard section stale or unavailable rather than silently substituting data."
    violation_behavior: "Do not present the forecast as current or use it to enable a command that requires current evidence."
    source: ["US4.6", "C17", "C18", "Q5", "AC4.6.1", "AC4.6.2", "AC4.6.3"]

  - id: BR5.3
    statement: "U11 must proxy buffer-scenario comparison under current retailer context while leaving every calculation and recommendation rule in Planning and Purchasing."
    category: validation
    applies_to: ["RequestAuthorizationContext", "BrowserCommandBinding", "ProviderClientDescriptor"]
    trigger: "A planner compares replenishment buffer scenarios."
    logic: "IF this browser workflow is requested THEN U11 must validate bounded inputs and versions, call the generated provider operation, and return deterministic scenario outputs with evidence and freshness."
    violation_behavior: "Reject malformed, stale, unavailable, or foreign inputs and never calculate or choose a scenario in U11."
    source: ["US5.3", "C17", "C18", "AC5.3.1", "AC5.3.2", "AC5.3.3"]

  - id: BR5.4
    statement: "U11 must submit one manual-review request with current authority and unchanged idempotency while preserving the provider-owned allowance and active-job decision."
    category: authorization
    applies_to: ["BrowserCommandBinding", "ProviderOperationReference", "RequestAuthorizationContext"]
    trigger: "A planner requests a manual inventory review."
    logic: "IF this browser workflow is requested THEN U11 must validate session, retailer, CSRF and request binding, forward once, and return job identity, remaining allowance, reset time, conflict, quota, or unknown state."
    violation_behavior: "Never consume or restore allowance in U11 and never retry an uncertain request automatically."
    source: ["US5.4", "C14", "C18", "Q6", "AC5.4.1", "AC5.4.2", "AC5.4.3", "AC5.4.4", "AC5.4.5", "AC5.4.6", "AC5.4.7"]

  - id: BR5.5
    statement: "U11 must show review status, active work, remaining allowance, reset time, and failure state exactly as reported by Planning and Purchasing."
    category: policy
    applies_to: ["ProviderOperationReference", "DashboardSection", "ProviderClientDescriptor"]
    trigger: "A browser requests review status or dashboard review state."
    logic: "IF this browser workflow is requested THEN U11 must perform a current authorized safe read, preserve provider source/version and retailer-local time semantics, and represent unavailable state explicitly."
    violation_behavior: "Do not infer allowance or active work from cache and do not disclose another retailer job."
    source: ["US5.5", "C17", "C18", "Q5", "Q9", "AC5.5.1", "AC5.5.2", "AC5.5.3", "AC5.5.4", "AC5.5.5"]

  - id: BR6.1
    statement: "U11 must create or edit purchase proposals only as provider-owned drafts for a current planner, without submitting or approving them."
    category: authorization
    applies_to: ["BrowserCommandBinding", "ProviderOperationReference", "RequestAuthorizationContext"]
    trigger: "A planner creates or edits a purchase draft."
    logic: "IF this browser workflow is requested THEN U11 must validate current planner authority, expected version, CSRF, idempotency and deterministic line schema, forward once, and preserve U8 evidence and draft version."
    violation_behavior: "Return forbidden, stale, invalid, or unknown and create no BFF-owned order or automatic transition."
    source: ["US6.1", "C18", "Q6", "AC6.1.1", "AC6.1.2", "AC6.1.3", "AC6.1.4"]

  - id: BR6.2
    statement: "U11 must submit a draft only through the provider transition with planner authority, expected version, locked-line result, and unchanged idempotency."
    category: authorization
    applies_to: ["BrowserCommandBinding", "ProviderOperationReference", "BrowserProblemDescriptor"]
    trigger: "A planner submits a purchase draft."
    logic: "IF this browser workflow is requested THEN U11 must validate browser boundary preconditions, forward once, and return U8 authoritative submitted state or safe denied/stale/unknown result."
    violation_behavior: "Never retry automatically, unlock lines, infer submission, or expose foreign order identity."
    source: ["US6.2", "C18", "Q6", "AC6.2.1", "AC6.2.2", "AC6.2.3"]

  - id: BR6.3
    statement: "U11 must proxy manager approval or rejection as mutually exclusive provider-owned decisions under expected-version concurrency."
    category: authorization
    applies_to: ["BrowserCommandBinding", "ProviderOperationReference", "BrowserProblemDescriptor"]
    trigger: "A manager approves or rejects a submitted proposal."
    logic: "IF this browser workflow is requested THEN U11 must validate manager context, CSRF, expected version and idempotency, send one command, and preserve the winning decision, actor, versions and conflict result."
    violation_behavior: "Return forbidden or conflict without choosing a winner, retrying, or changing order state in U11."
    source: ["US6.3", "C18", "Q6", "AC6.3.1", "AC6.3.2", "AC6.3.3", "AC6.3.4", "AC6.3.5"]

  - id: BR6.4
    statement: "U11 must proxy cancellation only while U8 reports the order eligible and preserve cancellation-versus-receipt race outcomes."
    category: authorization
    applies_to: ["BrowserCommandBinding", "ProviderOperationReference", "BrowserProblemDescriptor"]
    trigger: "A manager requests cancellation before receipt."
    logic: "IF this browser workflow is requested THEN U11 must send one expected-version idempotent command and return the authoritative cancelled, forbidden, invalid-state, stale, race, or unknown outcome."
    violation_behavior: "Do not infer eligibility, cancel locally, or retry after uncertainty."
    source: ["US6.4", "C18", "Q6", "AC6.4.1", "AC6.4.2", "AC6.4.3"]

  - id: BR6.5
    statement: "U11 must proxy partial receipt as one atomic provider command with bounded lines, expected order version, and cumulative-quantity enforcement owned by U8 and U4."
    category: validation
    applies_to: ["BrowserCommandBinding", "ProviderOperationReference", "BrowserProblemDescriptor"]
    trigger: "An authorized user records part of an approved order receipt."
    logic: "IF this browser workflow is requested THEN U11 must validate browser schema and CSRF, forward once, and preserve receipt identity, accepted quantities, balances, stock movements, versions, replay and race outcomes."
    violation_behavior: "Return the provider atomic failure, over-receipt, stale, race, forbidden, or unknown state without partial BFF success."
    source: ["US6.5", "C08", "C18", "Q6", "AC6.5.1", "AC6.5.2", "AC6.5.3", "AC6.5.4", "AC6.5.5", "AC6.5.6"]

  - id: BR6.6
    statement: "U11 must proxy final receipt while preserving provider-owned completion, duplicate-replay, stock-ledger, and terminal-state evidence."
    category: validation
    applies_to: ["BrowserCommandBinding", "ProviderOperationReference", "BrowserProblemDescriptor"]
    trigger: "An authorized user records the remaining approved quantities."
    logic: "IF this browser workflow is requested THEN U11 must use one expected-version idempotent command and return U8/U4 authoritative receipt and completed-order versions."
    violation_behavior: "Never exceed approved quantity, retry uncertainty, reopen a terminal order, or manufacture stock movement in U11."
    source: ["US6.6", "C08", "C18", "Q6", "AC6.6.1", "AC6.6.2", "AC6.6.3", "AC6.6.4"]

  - id: BR7.1
    statement: "U11 must expose configured local assistant admission and progress without automatic external-provider fallback or BFF ownership of generated output."
    category: policy
    applies_to: ["BrowserCommandBinding", "ProviderOperationReference", "AssistantStreamSubscription", "BrowserProblemDescriptor"]
    trigger: "A user starts a local assistant turn."
    logic: "IF this browser workflow is requested THEN U11 must validate current context and bounded input, submit one U9 turn, return 202 plus operation/SSE locations, and preserve local unavailable or failed outcome."
    violation_behavior: "Return explicit 503 or failure, disclose no hidden reasoning, and never switch provider or fabricate a response."
    source: ["US7.1", "C17", "C18", "C21", "Q8", "AC7.1.1", "AC7.1.2", "AC7.1.3"]

  - id: BR7.4
    statement: "U11 must keep each assistant conversation and turn bounded, versioned, tenant-authorized, idempotent, and provider-owned."
    category: validation
    applies_to: ["BrowserCommandBinding", "ProviderOperationReference", "AssistantStreamSubscription", "RequestAuthorizationContext"]
    trigger: "A browser creates, continues, polls, or streams a conversation turn."
    logic: "IF this browser workflow is requested THEN U11 must validate conversation ownership and expected version, preserve one turn identity, bound input/output/cursor state, and resume the same turn after disconnect."
    violation_behavior: "Reject foreign, stale, oversized, duplicate-mismatch, or expired cursor requests without creating another turn."
    source: ["US7.4", "C17", "C18", "Q6", "Q8", "AC7.4.1", "AC7.4.2", "AC7.4.3", "AC7.4.4"]

  - id: BR7.6
    statement: "U11 must show assistant shortage investigations only when every cited inventory, forecast, recommendation, and audit resource remains currently authorized."
    category: authorization
    applies_to: ["RequestAuthorizationContext", "ProviderOperationReference", "AssistantStreamSubscription"]
    trigger: "A user asks the assistant to investigate inventory shortages."
    logic: "IF this browser workflow is requested THEN U11 must pass current actor and retailer context to U9, preserve typed-tool evidence and unavailable facts, and stream only browser-safe cited output."
    violation_behavior: "Hide unauthorized resources, preserve tool failure, and never let the answer authorize a domain command."
    source: ["US7.6", "C11", "C13", "C18", "AC7.6.1", "AC7.6.2", "AC7.6.3"]

  - id: BR7.7
    statement: "U11 must show conversational supplier comparisons only from authorized accepted terms and source/page citations."
    category: authorization
    applies_to: ["RequestAuthorizationContext", "ProviderOperationReference", "AssistantStreamSubscription"]
    trigger: "A user asks the assistant to compare suppliers."
    logic: "IF this browser workflow is requested THEN U11 must authorize the U9 turn, preserve U5 deterministic comparison and citations, and represent missing, stale, or incomparable evidence explicitly."
    violation_behavior: "Return no foreign or raw supplier content and never accept terms or invent citations in U11."
    source: ["US7.7", "C12", "C18", "AC7.7.1", "AC7.7.2", "AC7.7.3"]

  - id: BR7.8
    statement: "U11 must show replenishment-scenario explanations as cited U8 outputs without recalculating or selecting business actions in the BFF."
    category: policy
    applies_to: ["RequestAuthorizationContext", "ProviderOperationReference", "AssistantStreamSubscription"]
    trigger: "A user asks the assistant to explain replenishment scenarios."
    logic: "IF this browser workflow is requested THEN U11 must preserve scenario inputs, versions, deterministic calculations, freshness and limitations while streaming the U9-owned answer."
    violation_behavior: "Expose missing evidence or tool failure and never turn explanatory text into a recommendation approval."
    source: ["US7.8", "C14", "C18", "AC7.8.1", "AC7.8.2", "AC7.8.3"]

  - id: BR7.9
    statement: "U11 must allow the assistant to request manual review only through the same current-authority, allowance, idempotency, and operation rules as the direct UI."
    category: authorization
    applies_to: ["BrowserCommandBinding", "ProviderOperationReference", "AssistantStreamSubscription"]
    trigger: "An assistant turn proposes and the user invokes a manual review request."
    logic: "IF this browser workflow is requested THEN U11 must bind one U9/U8 tool request to the current user and retailer, return job/allowance state, and keep the assistant stream correlated to the provider operation."
    violation_behavior: "Never bypass quota, duplicate a request, retry uncertainty, or let model text consume allowance."
    source: ["US7.9", "C14", "C18", "Q6", "Q8", "AC7.9.1", "AC7.9.2", "AC7.9.3"]

  - id: BR7.10
    statement: "U11 must allow the assistant to create or edit only a governed provider-owned purchase draft and never expose submit, approve, reject, cancel, or receipt authority."
    category: authorization
    applies_to: ["BrowserCommandBinding", "ProviderOperationReference", "AssistantStreamSubscription"]
    trigger: "An assistant turn proposes a purchase draft action."
    logic: "IF this browser workflow is requested THEN U11 must require current planner authority and explicit deterministic tool input, submit one draft command, and return the U8 draft identity/version and evidence."
    violation_behavior: "Deny forbidden transitions, preserve validation failure, and never convert model text into an order state."
    source: ["US7.10", "C14", "C18", "Q6", "AC7.10.1", "AC7.10.2", "AC7.10.3", "AC7.10.4"]

  - id: BR7.11
    statement: "U11 must recover interrupted assistant display from the provider-owned operation and bounded event cursor after current reauthorization."
    category: policy
    applies_to: ["ProviderOperationReference", "AssistantStreamSubscription", "BrowserSession"]
    trigger: "A browser reloads, reconnects, or signs in again after an interrupted assistant turn."
    logic: "IF this browser workflow is requested THEN U11 must query the same operation and resume SSE for the same subject, retailer, conversation and turn, or return a terminal snapshot when deltas expired."
    violation_behavior: "Reject invalid cursors, never duplicate the turn, and never claim lost Redis session state was recovered."
    source: ["US7.11", "C18", "Q1", "Q8", "AC7.11.1", "AC7.11.2", "AC7.11.3", "AC7.11.4"]

  - id: BR8.1
    statement: "U11 must run the browser security and provider composition boundary in the local walking skeleton without external credentials or hidden manual state."
    category: constraint
    applies_to: ["BrowserSession", "ProviderClientDescriptor", "ProviderResilienceState", "CorrelationContext"]
    trigger: "The application skeleton starts or its representative journey runs."
    logic: "IF this browser workflow is requested THEN U11 must use the fixed local origins, Redis-only sessions, generated provider clients, correlation, health/readiness and CPU-compatible local dependencies."
    violation_behavior: "Fail startup or the journey visibly when required configuration is absent and never claim an undemonstrated path."
    source: ["US8.1", "C16", "C17", "C18", "C19", "AC8.1.1", "AC8.1.2", "AC8.1.3"]

  - id: BR8.2
    statement: "U11 must validate every U11 provider and browser boundary from pinned U1 OpenAPI contracts and compatible examples."
    category: validation
    applies_to: ["ProviderClientDescriptor", "BrowserProblemDescriptor", "BrowserUploadDescriptor", "AssistantStreamSubscription"]
    trigger: "Contracts or generated BFF clients change."
    logic: "IF this browser workflow is requested THEN U11 must validate syntax, examples, operation IDs, tenant/correlation metadata, idempotency, problem details, uploads, operations and SSE schemas before integration."
    violation_behavior: "Block the change and identify the incompatible provider or browser operation without hand-editing generated clients."
    source: ["US8.2", "C17", "C18", "AC8.2.1", "AC8.2.2", "AC8.2.3"]

  - id: BR8.3
    statement: "U11 must expose startup, readiness, routing, Redis dependency, and provider-configuration state suitable for Docker Desktop Kubernetes."
    category: constraint
    applies_to: ["ProviderClientDescriptor", "BrowserSession", "ProviderResilienceState"]
    trigger: "U11 is installed, started, restarted, or probed in the local cluster."
    logic: "IF this browser workflow is requested THEN U11 must remain unready without required C16-C18 configuration or Redis, terminate connections cleanly, and require reauthentication after session loss."
    violation_behavior: "Do not route browser traffic to an unready pod or preserve a cookie as authenticated when Redis state is absent."
    source: ["US8.3", "C19", "Q1", "AC8.3.1", "AC8.3.2", "AC8.3.3"]

  - id: BR8.7
    statement: "U11 must block integration when U11 formatting, build, tests, generated-client compatibility, security checks, or browser-contract checks fail."
    category: validation
    applies_to: ["ProviderClientDescriptor", "ReturnPathPolicy", "BrowserProblemDescriptor"]
    trigger: "A Web BFF story branch or pull request is checked."
    logic: "IF this browser workflow is requested THEN U11 must run the declared focused and repository checks against the exact revision and publish actual pass, fail, or limitation evidence."
    violation_behavior: "Fail the check and never weaken or omit a required gate to obtain a passing result."
    source: ["US8.7", "C19", "AC8.7.1", "AC8.7.2", "AC8.7.3"]

  - id: BR8.8
    statement: "U11 must deploy only the owner-approved revision and configuration while keeping production release separately approved."
    category: authorization
    applies_to: ["ProviderClientDescriptor", "ReturnPathPolicy", "BrowserSession"]
    trigger: "A trusted Web BFF image and manifests are selected for deployment."
    logic: "IF this browser workflow is requested THEN U11 must bind image digest, contract versions, origins, Redis profile, secrets references and revision, then verify readiness and the supported browser journey."
    violation_behavior: "Do not deploy or claim success for an unapproved, mismatched, secret-bearing, or unverified revision."
    source: ["US8.8", "C19", "AC8.8.1", "AC8.8.2", "AC8.8.3"]

  - id: BR9.2
    statement: "U11 must query business audit only through U10 under current retailer authority, bounded filters, stable pagination, and explicit projection freshness."
    category: authorization
    applies_to: ["RequestAuthorizationContext", "ProviderClientDescriptor", "BrowserProblemDescriptor", "CorrelationContext"]
    trigger: "A user opens or filters audit history."
    logic: "IF this browser workflow is requested THEN U11 must validate selected retailer and query bounds, call the generated U10 operation, and preserve event descriptors, correlation, generation, checkpoint, lag and unavailable state."
    violation_behavior: "Hide foreign resources, ignore client index selectors, and never present stale or failed projection as complete."
    source: ["US9.2", "C18", "Q3", "Q10", "AC9.2.1", "AC9.2.2", "AC9.2.3"]

  - id: BR10.1
    statement: "U11 must support the reproducible reviewer journey entirely through public browser contracts and record actual complete, partial, denied, stale, unknown, recovery, and logout outcomes."
    category: policy
    applies_to: ["BrowserSession", "DashboardComposition", "BrowserCommandBinding", "AssistantStreamSubscription", "BrowserProblemDescriptor"]
    trigger: "A clean reviewer executes the documented end-to-end journey."
    logic: "IF this browser workflow is requested THEN U11 must use local login and fixed origins, exercise retailer, dashboard, import, review, purchasing, assistant, audit, logout and Redis-loss behavior, and preserve measured results."
    violation_behavior: "Mark the scenario failed or limited and never rely on owner-only Google, GPU, credentials, direct storage, or fabricated output."
    source: ["US10.1", "C19", "AC10.1.1", "AC10.1.2", "AC10.1.3", "AC10.1.4"]

  - id: BR10.2
    statement: "U11 must contribute revision-bound U11 contract, authorization, CSRF, idempotency, resilience, recovery, and browser evidence without owning the U13 portfolio manifest."
    category: policy
    applies_to: ["ProviderClientDescriptor", "CorrelationContext", "BrowserProblemDescriptor"]
    trigger: "Portfolio evidence for a released revision is inspected."
    logic: "IF this browser workflow is requested THEN U11 must expose stable links, contract/check identifiers, environment, correlation, measured outcomes, failures and limitations through C19 while excluding secrets and private payloads."
    violation_behavior: "Reject mismatched or secret-bearing evidence and never label an unrun, partial, or failed result as passing."
    source: ["US10.2", "C19", "AC10.2.1", "AC10.2.2", "AC10.2.3", "AC10.2.4"]

```

## Rules Summary

The catalogue contains 38 rules aligned one-to-one with U11's 38 assigned stories. Each rule carries every acceptance criterion from its story, producing exact 138/138 coverage without importing criteria assigned only to another unit; provider-owned state remains external throughout.

| Group | Rules | Functional area |
| --- | ---: | --- |
| BR1 | 4 | Login, federation, logout, retailer authority |
| BR2 | 4 | Inventory and demand imports, history, cache trust |
| BR3 | 3 | Supplier uploads, accepted terms, citations |
| BR4 | 2 | Model actions and forecast evidence |
| BR5 | 3 | Replenishment scenarios and manual reviews |
| BR6 | 6 | Purchase drafts, decisions, cancellation, receipts |
| BR7 | 8 | Assistant inference, tools, commands, interruption recovery |
| BR8 | 5 | Skeleton, contracts, Kubernetes, CI, trusted deployment |
| BR9 | 1 | Tenant-authorized audit search |
| BR10 | 2 | Reproducible reviewer journey and portfolio evidence |

## Sources

- `construction/web-bff/functional-design/functional-design-questions.md` — confirmed Q1-Q10.
- `inception/units-generation/unit-of-work.md` and `unit-of-work-story-map.md` — U11 boundary and assigned stories.
- `inception/requirements-analysis/requirements.md` and `inception/user-stories/stories.md` — functional/NFR obligations and exact acceptance criteria.
- `inception/domain-design/components.md` — WebExperience dependencies and authority constraints.
- `inception/contract-design/contract-summary.md` — C16-C19 and provider/error/retry profiles.

## Assumptions & Open Questions

- Exact timeout, bulkhead, circuit, polling, SSE, response-size, cache, and Redis capacity values remain NFR Requirements parameters; none may be unbounded.
- C16-C18 require additive schemas for the confirmed session-loss, retailer-selection, operation-status, assistant-SSE, typed-partial, upload, and safe-error behavior before implementation.
- Provider-owned operation and idempotency records are required for uncertain-outcome reconciliation and survive loss of U11 Redis state.
- Google remains optional for the clean reviewer path, and no rule depends on external credentials or GPU availability.
