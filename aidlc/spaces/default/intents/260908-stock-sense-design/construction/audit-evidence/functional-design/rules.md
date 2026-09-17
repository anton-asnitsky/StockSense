# U10 Audit Evidence Business Rules

Date: 2026-09-15  
Stage: Functional Design  
Unit: U10 `audit-evidence`

Rule targets use the authoritative entity names from `entities.md`. `AuthoritativeAuditEvent` is the sole external conceptual target: it denotes the immutable C15 event whose business meaning remains owned by its producer. `AuditProjectionDocument` and every OpenSearch generation are rebuildable. `EvidencePublication` is U10's bounded input to the U13-owned C19 evidence manifest.

```yaml
rules:
  - id: BR1.1
    statement: "A producing service remains the sole authority for the business meaning, validity, and committed outcome represented by an AuthoritativeAuditEvent."
    category: policy
    applies_to: ["AuthoritativeAuditEvent", "DerivedAuditEvent", "AuditProjectionDocument"]
    trigger: "U10 receives, replays, projects, or returns an AuthoritativeAuditEvent."
    logic: "IF an event describes a business mutation or rejection THEN U10 may validate the C15 envelope and derive searchable evidence, but it must preserve the producer's facts and must not approve, reject, repair, or otherwise make the business action valid."
    violation_behavior: "Reject the attempted U10 reinterpretation or mutation, preserve the last valid derived state, and record a safe OperatorControlAuditEntry failure."
    source: ["FR17", "FR17.1", "C15", "AC9.1.1"]

  - id: BR1.2
    statement: "An accepted business outcome is eligible for U10 ingestion only after the producer has committed its authoritative audit row and outbox record with the business change."
    category: constraint
    applies_to: ["AuthoritativeAuditEvent", "InboundEventReceipt"]
    trigger: "An accepted-outcome event is delivered through C15."
    logic: "IF the event represents an accepted business change THEN its producer transaction and producer outbox identity must be present; U10 must not treat delivery or projection as proof that an uncommitted business change succeeded."
    violation_behavior: "Quarantine the event as an authority-boundary failure, do not project it, and expose a safe diagnostic for producer reconciliation."
    source: ["FR17", "NFR7", "C15", "AC2.2.3", "AC5.4.1", "AC6.5.1", "AC8.5.1", "AC9.1.1"]

  - id: BR1.3
    statement: "Rejected, denied, and failed attempts must arrive from a durable producer-owned rejection path that survives rollback of the attempted business transaction."
    category: policy
    applies_to: ["AuthoritativeAuditEvent", "DerivedAuditEvent", "AuditProjectionDocument"]
    trigger: "U10 receives an event whose outcome is denied or failed."
    logic: "IF the attempted business transaction did not commit THEN U10 may project only the producer-owned rejection record and must never reconstruct the rejection from optional logs or from an absent business row."
    violation_behavior: "Do not fabricate an audit event; report the producer coverage gap and keep the acceptance evidence failed until a durable producer record exists."
    source: ["FR17.1", "NFR10", "C15", "AC2.2.2", "AC2.2.4", "AC2.5.3", "AC4.5.2", "AC5.4.4", "AC5.4.7", "AC6.2.2", "AC6.3.3", "AC6.4.2", "AC6.5.2", "AC6.6.3", "AC7.5.1", "AC9.1.2"]

  - id: BR1.4
    statement: "Inventory-import evidence must preserve the producer-reported source version, outcome, reconciliation identifiers, and safe diagnostics without making U10 the inventory authority."
    category: policy
    applies_to: ["AuthoritativeAuditEvent", "AuditProjectionDocument"]
    trigger: "An inventory import commits, is rejected, or is replayed."
    logic: "IF Inventory publishes an inventory-import event THEN U10 must preserve its accepted, rejected, failed, duplicate, or pending outcome and the identifiers needed to trace stock and ledger effects; U10 must not calculate stock or choose a partial-commit policy."
    violation_behavior: "Quarantine incomplete or unsafe evidence, leave inventory unchanged, and expose the missing evidence category."
    source: ["FR3", "FR4", "FR11", "FR17", "C15", "AC2.2.1", "AC2.2.2", "AC2.2.3", "AC2.2.4"]

  - id: BR1.5
    statement: "Demand-import evidence must distinguish observed sales from synthetic lost-demand truth and retain producer source versions without exposing protected evaluation truth as training input."
    category: policy
    applies_to: ["AuthoritativeAuditEvent", "AuditProjectionDocument"]
    trigger: "DemandHistory reports an accepted, duplicate, malformed, or foreign-retailer import."
    logic: "IF U10 projects demand-import evidence THEN the projection must preserve the producer's data-classification and outcome fields while omitting latent-demand values from ordinary query payloads and never creating duplicate evidence for a replayed event ID."
    violation_behavior: "Do not project an event that conflates protected truth with ordinary inputs or crosses retailer scope; quarantine it with value-free diagnostics."
    source: ["FR3", "FR11", "NFR3", "C15", "AC2.5.1", "AC2.5.2", "AC2.5.3"]

  - id: BR1.6
    statement: "Supplier-term evidence must identify source and accepted-term versions and must preserve the distinction between unvalidated extraction and authoritative accepted terms."
    category: policy
    applies_to: ["AuthoritativeAuditEvent", "AuditProjectionDocument"]
    trigger: "SupplierKnowledge accepts terms, rejects extraction, or reports a stale-term conflict."
    logic: "IF U10 projects supplier evidence THEN it must preserve the producer-reported validation state, source/version, and stale-approval outcome and must not promote raw supplier text or decide which term is authoritative."
    violation_behavior: "Reject unsafe or authority-ambiguous projection data and retain only a safe quarantine reason and identifiers."
    source: ["FR10.1", "FR6", "C15", "AC3.3.1", "AC3.3.2", "AC3.3.3"]

  - id: BR1.7
    statement: "Model-lifecycle evidence must preserve evaluation, run, model-version, promotion, rollback, failure, and prior-provenance identifiers exactly as reported by ModelLifecycle."
    category: policy
    applies_to: ["AuthoritativeAuditEvent", "AuditProjectionDocument"]
    trigger: "ModelLifecycle reports promotion, denied promotion, failed candidate, or rollback."
    logic: "IF U10 receives model-lifecycle evidence THEN it must make the producer outcome searchable without selecting a model, validating evaluation sufficiency, erasing prior provenance, or implying that projection activates a model."
    violation_behavior: "Quarantine inconsistent evidence and report the producer evidence gap; leave model authority and state unchanged."
    source: ["FR13", "FR17.1", "C15", "AC4.5.1", "AC4.5.2", "AC4.5.3"]

  - id: BR1.8
    statement: "Scheduled-review evidence must preserve retailer-local date, trigger, input versions, outcome, retained-due-work identity, and the producer assertion that no manual allowance was consumed."
    category: policy
    applies_to: ["AuthoritativeAuditEvent", "AuditProjectionDocument"]
    trigger: "Replenishment reports scheduled review admission, deferral, retry, completion, or failure."
    logic: "IF U10 projects scheduled-review evidence THEN it must correlate retries and redeliveries to the same producer job and local date and must not create a second logical review or alter quota or active-job state."
    violation_behavior: "Flag contradictory producer evidence, do not merge distinct job identities, and keep the discrepancy visible for producer reconciliation."
    source: ["FR9.1", "FR9.4", "FR11", "C15", "AC5.2.1", "AC5.2.2", "AC5.2.3", "AC5.2.4"]

  - id: BR1.9
    statement: "Manual-review evidence must preserve authoritative job identity, local charge date, allowance result, active-job result, input versions, retry lineage, and unavailable or failed status."
    category: policy
    applies_to: ["AuthoritativeAuditEvent", "AuditProjectionDocument"]
    trigger: "Replenishment reports a manual-review request, race, replay, denial, retry, or completion."
    logic: "IF U10 projects manual-review evidence THEN exact producer job identities and outcomes must remain distinct from U10 delivery identities; U10 must neither consume quota nor return job details to a caller that lacks current retailer authority."
    violation_behavior: "Deny unauthorized query disclosure, quarantine conflicting event facts, and leave quota and job state solely with Replenishment."
    source: ["FR9", "FR9.1", "FR9.2", "FR9.3", "C15", "AC5.4.1", "AC5.4.2", "AC5.4.3", "AC5.4.4", "AC5.4.5", "AC5.4.6", "AC5.4.7"]

  - id: BR1.10
    statement: "Purchasing evidence must preserve producer-reported actors, versions, locked-line state, decision, receipt identity, balances, stock-movement links, race result, and exact-replay result without enforcing purchasing transitions in U10."
    category: policy
    applies_to: ["AuthoritativeAuditEvent", "AuditProjectionDocument"]
    trigger: "Purchasing reports submit, approve, reject, cancel, receipt, replay, conflict, or view-evidence outcomes."
    logic: "IF U10 projects purchasing evidence THEN it must preserve the authoritative outcome and provenance for every allowed or denied attempt, including stale inputs, concurrent decisions, cumulative receipt limits, atomic multi-line failure, uncertain-outcome reconciliation, and terminal states; U10 must never submit, approve, reject, cancel, receive, or modify an order."
    violation_behavior: "Quarantine internally inconsistent events, never infer the missing transition, and expose the producer evidence gap without changing purchase, stock, ledger, audit, or outbox state."
    source: ["FR7", "FR8", "FR17", "FR17.1", "C15", "AC6.2.1", "AC6.2.2", "AC6.2.3", "AC6.3.1", "AC6.3.2", "AC6.3.3", "AC6.3.4", "AC6.3.5", "AC6.4.1", "AC6.4.2", "AC6.4.3", "AC6.5.1", "AC6.5.2", "AC6.5.3", "AC6.5.4", "AC6.5.5", "AC6.5.6", "AC6.6.1", "AC6.6.2", "AC6.6.3", "AC6.6.4"]

  - id: BR1.11
    statement: "Assistant evidence must distinguish authorized reads and drafts from denied access, unsupported claims, fabricated citations, tool failures, and forbidden submit, approval, or send requests."
    category: policy
    applies_to: ["AuthoritativeAuditEvent", "AuditProjectionDocument"]
    trigger: "Assistant reports a tool invocation, clarification, draft result, safety denial, or evaluation result."
    logic: "IF U10 projects assistant evidence THEN it must preserve actor, retailer, tool, target, actual outcome, permitted provenance, and linked domain-created identifiers while excluding full prompts and hidden reasoning; projection must not turn model text into authority or a citation."
    violation_behavior: "Reject unsafe content, quarantine the event with safe diagnostics, and keep missing evidence or failed adversarial acceptance visible."
    source: ["FR14", "FR17.1", "NFR10", "NFR15", "C15", "AC7.5.1", "AC7.5.2", "AC7.5.3", "AC7.9.1", "AC7.9.2", "AC7.9.3", "AC7.10.1", "AC7.10.2", "AC7.10.3", "AC7.10.4"]

  - id: BR1.12
    statement: "Retrieval-index lifecycle evidence must preserve SupplierKnowledge's retailer, source-version, deletion, model/configuration, count, provenance, cutover, rollback, and failure facts without making U10 the retrieval-index owner."
    category: policy
    applies_to: ["AuthoritativeAuditEvent", "AuditProjectionDocument"]
    trigger: "SupplierKnowledge reports retrieval-index build, interruption, validation, cutover, rollback, or denied access."
    logic: "IF U10 receives retrieval-index lifecycle evidence THEN it must project the reported state and correlation only; it must not choose a Qdrant collection, mix vector configurations, restore deleted evidence, or declare activation before the producer reports reconciliation."
    violation_behavior: "Quarantine contradictory or cross-retailer evidence and leave the producer's active index route unchanged."
    source: ["FR16", "NFR3", "C15", "AC7.12.1", "AC7.12.2", "AC7.12.3"]

  - id: BR1.13
    statement: "U10 may access only its owned persistence and supported contracts; it may not read or write another unit's tables, collections, buckets, caches, vector collections, or indexes."
    category: authorization
    applies_to: ["InboundEventReceipt", "DerivedAuditEvent", "AuditProjectionDocument", "ProjectionCheckpoint", "ReplayRequest", "RetentionRun", "OperatorControlAuditEntry"]
    trigger: "U10 needs producer facts, tenant placement, recovery status, retention status, or evidence from another unit."
    logic: "IF required information is outside U10 ownership THEN U10 must use C15, a provider-owned API, a producer-owned replay or retention contract, or C19; direct cross-unit storage access is forbidden."
    violation_behavior: "Deny the operation, record a safe self-audit failure, and report the missing contract instead of bypassing the boundary."
    source: ["NFR3", "NFR4", "C15", "C17", "C19", "AC9.1.3"]

  - id: BR1.14
    statement: "U10 runtime identities may change U10-owned PostgreSQL state only through parameterized U10-owned stored routines; migration and controlled-retention identities remain separate."
    category: authorization
    applies_to: ["InboundEventReceipt", "DerivedAuditEvent", "ProjectionCheckpoint", "ReplayRequest", "RetentionRun", "OperatorControlAuditEntry"]
    trigger: "U10 reads or changes its owned relational state."
    logic: "IF the caller is a U10 runtime identity THEN direct table access, migration authority, retention authority, and update or delete of immutable retained history are forbidden; only the required owned routine and tenant scope may be used."
    violation_behavior: "Deny the storage operation, leave state unchanged, and emit a safe privilege-boundary failure."
    source: ["NFR4", "FR17", "AC9.1.3"]

  - id: BR1.15
    statement: "Submission and manager-decision evidence must identify current versions, locked commercial lines, human authority, revalidation outcome, stale-input category, terminal rejection linkage, and exact idempotent replay."
    category: validation
    applies_to: ["AuthoritativeAuditEvent", "AuditProjectionDocument"]
    trigger: "Purchasing reports proposal submission, manager view, approval, rejection, conflict, or replay."
    logic: "IF a purchasing event omits the producer facts needed to distinguish valid submit or manager decision from stale, concurrent, unauthorized, agent, or unlisted transition failure THEN U10 must not present it as complete decision evidence."
    violation_behavior: "Quarantine incomplete evidence, preserve the producer outcome without reinterpretation, and report the missing evidence category."
    source: ["FR6", "FR7", "FR17.1", "C15", "AC6.2.1", "AC6.2.2", "AC6.2.3", "AC6.3.1", "AC6.3.2", "AC6.3.3", "AC6.3.4", "AC6.3.5"]

  - id: BR1.16
    statement: "Cancellation evidence must identify the producer state, actor authority, expected version, no-receipt precondition, and the single committed winner of a cancellation-versus-receipt race."
    category: validation
    applies_to: ["AuthoritativeAuditEvent", "AuditProjectionDocument"]
    trigger: "Purchasing reports cancellation acceptance, denial, or a cancellation/receipt race."
    logic: "IF producer evidence could imply that both cancellation and receipt committed, permits cancellation from Draft, PartiallyReceived, or terminal state, or omits the race winner THEN U10 must mark the evidence inconsistent rather than infer a valid outcome."
    violation_behavior: "Quarantine the inconsistent event set, keep prior valid projections, and require producer reconciliation."
    source: ["FR7", "FR8", "C15", "AC6.4.1", "AC6.4.2", "AC6.4.3"]

  - id: BR1.17
    statement: "Receipt evidence must identify receipt and line identities, approved and cumulative quantities, order state, linked stock movements, atomic multi-line result, idempotency result, concurrency result, and uncertain-outcome reconciliation."
    category: validation
    applies_to: ["AuthoritativeAuditEvent", "AuditProjectionDocument"]
    trigger: "Purchasing or Inventory reports partial receipt, completed receipt, denial, replay, conflict, or reconciliation."
    logic: "IF producer evidence does not prove positive in-tenant lines, cumulative limits, all-or-nothing effects, correct PartiallyReceived or Received state, terminal-state denial, and exact-key behavior THEN U10 must not present the receipt evidence as complete or compute a replacement result."
    violation_behavior: "Quarantine contradictory evidence, preserve all authoritative producer events, and expose the unresolved receipt evidence without changing stock or orders."
    source: ["FR4", "FR7", "FR8", "FR17", "C15", "AC6.5.1", "AC6.5.2", "AC6.5.3", "AC6.5.4", "AC6.5.5", "AC6.5.6", "AC6.6.1", "AC6.6.2", "AC6.6.3", "AC6.6.4"]

  - id: BR2.1
    statement: "Every delivered AuthoritativeAuditEvent must pass supported C15 message-type and schema-version validation before U10 persists payload content."
    category: validation
    applies_to: ["AuthoritativeAuditEvent", "InboundEventReceipt", "DerivedAuditEvent"]
    trigger: "A RabbitMQ delivery reaches U10 ingestion."
    logic: "IF the current event is not C15 schema 1.0.0 with one of identity, tenant, inventory, demand, supplier, model, forecast, replenishment, purchasing, or assistant audit type, or a later version has not passed compatibility validation, THEN payload content must not enter the retained ledger or AuditProjectionDocument."
    violation_behavior: "Create a value-free QuarantineRecord, follow bounded dead-letter handling, and expose a stable safe reason."
    source: ["NFR7", "NFR8", "C15", "AC8.2.2", "AC8.2.3"]

  - id: BR2.2
    statement: "Each AuthoritativeAuditEvent must carry an immutable globally unique event ID and sufficient producer-stream identity and provenance."
    category: validation
    applies_to: ["AuthoritativeAuditEvent", "DerivedAuditEvent", "AuditProjectionDocument"]
    trigger: "A schema-valid C15 event is admitted."
    logic: "IF event ID, producer, retailer ID, resource type and ID, occurred time, accepted time, actor, outcome, correlation ID, causation ID, placement generation, or applicable aggregate version or producer sequence is absent or malformed THEN the event is not projection-eligible."
    violation_behavior: "Quarantine the event without storing prohibited payload values and identify the missing field names."
    source: ["FR17.1", "C15", "AC9.1.1"]

  - id: BR2.3
    statement: "U10 deduplicates AuthoritativeAuditEvent deliveries globally by immutable event ID."
    category: constraint
    applies_to: ["AuthoritativeAuditEvent", "InboundEventReceipt", "AuditProjectionDocument"]
    trigger: "An event ID already known to U10 is delivered or replayed."
    logic: "IF the event ID and canonical allowed-content hash match the retained event THEN U10 returns the existing processing outcome and creates no second retained envelope, projection document, checkpoint effect, or evidence count."
    violation_behavior: "Suppress duplicate effects, retain duplicate-delivery telemetry, and continue from the existing processing state."
    source: ["FR17", "NFR7", "C15", "AC2.5.2", "AC8.5.2", "AC9.2.1"]

  - id: BR2.4
    statement: "Reuse of an event ID with different allowed content is an identity collision, not an update."
    category: validation
    applies_to: ["AuthoritativeAuditEvent", "InboundEventReceipt", "QuarantineRecord"]
    trigger: "A delivered event ID exists with a different canonical allowed-content hash."
    logic: "IF the same event ID identifies different allowed content THEN U10 must preserve the first admitted immutable event and quarantine the conflicting delivery."
    violation_behavior: "Do not overwrite or project the conflicting content; raise an operator-visible integrity failure with safe hashes and producer identifiers."
    source: ["FR17", "NFR7", "C15", "AC8.5.2", "AC9.2.1"]

  - id: BR2.5
    statement: "Ordering is enforced only within a declared producer, retailer, resource-type, resource-ID stream."
    category: constraint
    applies_to: ["AuthoritativeAuditEvent", "ProjectionCheckpoint", "ProjectionGeneration"]
    trigger: "An event carries an aggregate version or producer sequence."
    logic: "IF a declared stream sequence is duplicate, regressive, or has a gap THEN U10 must preserve the event's actual sequence and mark the stream condition; it must not invent a total order across producers, retailers, or resources."
    violation_behavior: "Defer any generation activation that requires a complete stream, expose the gap or late-event status, and seek producer replay when reconciliation requires it."
    source: ["FR17", "C15", "AC9.2.3"]

  - id: BR2.6
    statement: "Cross-stream query ordering uses a stable occurred-time and event-ID key while retaining accepted time and stream sequence for explanation."
    category: policy
    applies_to: ["AuditProjectionDocument"]
    trigger: "Events from multiple producer or resource streams are returned in one business-audit query."
    logic: "IF no producer-defined common order exists THEN sort by the requested occurred-time direction and use immutable event ID as the deterministic tie-breaker; never describe this display order as global business causality."
    violation_behavior: "Reject an unsupported global-order request or return the stable display order with its ordering semantics explicit."
    source: ["FR18", "C17", "C18", "AC9.2.2"]

  - id: BR2.7
    statement: "Live event admission must validate the event's retailer and placement generation against the current server-resolved TenantAuditRoute."
    category: validation
    applies_to: ["AuthoritativeAuditEvent", "TenantAuditRoute", "InboundEventReceipt"]
    trigger: "A live C15 event is admitted outside an authorized historical replay."
    logic: "IF the event retailer is unknown or its placement generation is stale or future relative to the current route THEN U10 must not project it into any tenant index."
    violation_behavior: "Quarantine or defer the event, expose a placement-conflict reason, and require route reconciliation; never route from a client-provided index name."
    source: ["NFR3", "C15", "AC9.8.2", "AC9.8.3"]

  - id: BR2.8
    statement: "Only the minimal allowlisted business-audit fields for the event type may be retained or projected."
    category: validation
    applies_to: ["AuthoritativeAuditEvent", "DerivedAuditEvent", "AuditProjectionDocument"]
    trigger: "A schema-valid event reaches the content-safety check."
    logic: "IF a field is outside the event-type allowlist THEN U10 must exclude its value from retained and projected content; compatible unknown fields may be ignored but may not bypass the allowlist."
    violation_behavior: "Reject or safely redact according to the field policy, create a QuarantineRecord when safety cannot be proven, and record only field names and safe classifications."
    source: ["FR17.1", "NFR10", "C15", "AC7.5.2", "AC9.3.2"]

  - id: BR2.9
    statement: "Credentials, tokens, raw supplier documents or text, full prompts, hidden reasoning, and other prohibited secret content must never be retained in U10 payloads, projections, quarantine diagnostics, telemetry, or evidence samples."
    category: constraint
    applies_to: ["DerivedAuditEvent", "AuditProjectionDocument", "QuarantineRecord", "OperationalTelemetryReference", "EvidencePublication"]
    trigger: "Content classification detects a prohibited category or cannot prove that a value is safe."
    logic: "IF prohibited or unclassifiable sensitive content is present THEN U10 must reject the content-bearing event from retention and projection rather than preserve the value for later redaction."
    violation_behavior: "Store only a non-reversible safe fingerprint and category where allowed, quarantine the delivery, and raise a security-visible failure without echoing the value."
    source: ["NFR10", "C15", "C19", "AC7.5.2", "AC9.3.2", "AC9.10.2"]

  - id: BR2.10
    statement: "Quarantine evidence must be durable, bounded, diagnosable, and free of the rejected payload's prohibited content."
    category: policy
    applies_to: ["QuarantineRecord", "DeadLetterRecord"]
    trigger: "Schema, authority, placement, identity, ordering, or content-safety validation fails."
    logic: "IF an event is quarantined THEN the receipt must identify delivery/event fingerprint, producer, safe tenant reference when trustworthy, schema version, reason code, failure time, retry eligibility, and linked dead-letter identity, but not the unsafe payload."
    violation_behavior: "Fail closed, prevent indexing, and expose an operator-only repair path subject to BR6.6-BR6.8."
    source: ["NFR7", "NFR10", "C15", "AC8.5.3", "AC9.3.2"]

  - id: BR3.1
    statement: "For a valid new event, U10 must commit one InboundEventReceipt and one immutable DerivedAuditEvent before attempting projection."
    category: constraint
    applies_to: ["InboundEventReceipt", "DerivedAuditEvent", "AuditProjectionDocument"]
    trigger: "A new C15 event passes admission validation."
    logic: "IF the unique inbox receipt and immutable retained envelope have not committed together in one U10-owned transaction THEN U10 must not project or acknowledge the RabbitMQ delivery."
    violation_behavior: "Leave the delivery unacknowledged for bounded retry and record no claim that U10 durably accepted it."
    source: ["FR17", "NFR7", "C15", "AC8.5.1", "AC9.2.3"]

  - id: BR3.2
    statement: "AuditProjectionDocument writes are idempotent by event ID within a server-selected ProjectionGeneration."
    category: constraint
    applies_to: ["DerivedAuditEvent", "AuditProjectionDocument", "ProjectionGeneration"]
    trigger: "U10 projects or reprojects a retained event."
    logic: "IF the same event is projected more than once into the same generation THEN the resulting document and count must be identical to one projection, with no duplicate searchable event."
    violation_behavior: "Treat content mismatch as an integrity failure, keep the active generation unchanged, and require repair or rebuild."
    source: ["FR17", "NFR7", "C15", "AC8.5.2", "AC9.2.1"]

  - id: BR3.3
    statement: "An ProjectionCheckpoint may advance only after the intended AuditProjectionDocument document is durably observable in its ProjectionGeneration."
    category: constraint
    applies_to: ["AuditProjectionDocument", "ProjectionCheckpoint", "ProjectionGeneration"]
    trigger: "Projection of an inbox event reports success."
    logic: "IF the event's projection cannot be verified in the intended generation THEN the checkpoint must not mark that event complete."
    violation_behavior: "Keep the inbox item retryable, expose lag, and leave the prior checkpoint intact."
    source: ["FR17", "NFR7", "C15", "AC8.5.1", "AC9.2.3"]

  - id: BR3.4
    statement: "RabbitMQ delivery acknowledgement occurs only after the InboundEventReceipt and the event's committed ProjectionCheckpoint are durable."
    category: constraint
    applies_to: ["InboundEventReceipt", "ProjectionCheckpoint", "AuthoritativeAuditEvent"]
    trigger: "U10 is ready to acknowledge a C15 delivery."
    logic: "IF the inbox receipt or projection checkpoint is absent or failed THEN U10 must not acknowledge; IF both are complete for an exact duplicate THEN U10 may acknowledge without another projection effect."
    violation_behavior: "Retain or recover the delivery for bounded retry and expose any resulting lag."
    source: ["NFR7", "C15", "AC8.5.1", "AC8.5.2"]

  - id: BR3.5
    statement: "A crash between inbox commit, projection, checkpoint commit, and acknowledgement must resume from durable state without duplicate evidence."
    category: policy
    applies_to: ["InboundEventReceipt", "AuditProjectionDocument", "ProjectionCheckpoint"]
    trigger: "A worker restarts or receives a redelivery after an uncertain processing outcome."
    logic: "IF inbox exists without checkpoint THEN repeat idempotent projection; IF checkpoint exists without acknowledgement THEN verify the same event/generation and acknowledge; never create a replacement event identity."
    violation_behavior: "Keep the item pending and visible rather than guessing success or failure."
    source: ["NFR7", "C15", "AC6.5.6", "AC8.5.2", "AC9.6.3"]

  - id: BR3.6
    statement: "Projection retries must use configured finite attempts, backoff, processing deadlines, and backlog limits."
    category: constraint
    applies_to: ["InboundEventReceipt", "AuditProjectionDocument", "DeadLetterRecord"]
    trigger: "A transient projection or dependency failure occurs."
    logic: "IF retry eligibility remains and the configured bounds are not exhausted THEN retry the same event identity; otherwise stop automatic retries and transition to dead-letter handling."
    violation_behavior: "Expose retry state and lag; never retry without bound or block the producer's completed business transaction."
    source: ["NFR7", "OQ6", "C15", "AC8.5.3", "AC9.2.3"]

  - id: BR3.7
    statement: "Exhausted or permanently invalid deliveries must produce an observable DeadLetterRecord linked to their safe quarantine or inbox state."
    category: policy
    applies_to: ["InboundEventReceipt", "QuarantineRecord", "DeadLetterRecord"]
    trigger: "Automatic processing exhausts its bound or detects a non-retryable failure."
    logic: "IF processing cannot continue automatically THEN U10 must persist the final safe reason and lineage before completing dead-letter transfer and acknowledging the original delivery."
    violation_behavior: "Do not lose or silently drop the failure; keep it operator-visible and excluded from tenant search."
    source: ["NFR7", "C15", "AC8.5.3", "AC9.2.3"]

  - id: BR3.8
    statement: "Replay requires a distinct authorized ReplayRequest with narrow scope, expected versions, bounded range, and idempotency identity."
    category: authorization
    applies_to: ["ReplayRequest", "DeadLetterRecord", "ProjectionGeneration"]
    trigger: "A caller requests dead-letter replay, range replay, repair, or projection rebuild."
    logic: "IF current Platform Operator authority, required scope, expected request version, tenant/range bounds, or matching idempotency hash is absent THEN replay must not start."
    violation_behavior: "Deny the request, disclose no unauthorized tenant data, and append a denied OperatorControlAuditEntry record."
    source: ["FR17", "NFR3", "NFR7", "C15", "AC8.5.3", "AC9.2.3"]

  - id: BR3.9
    statement: "A rebuild or repair writes into a new inactive ProjectionGeneration and never destructively rebuilds the active generation in place."
    category: constraint
    applies_to: ["ReplayRequest", "ProjectionGeneration", "TenantAuditRoute"]
    trigger: "An authorized rebuild or repair begins."
    logic: "IF a tenant has an active generation THEN all rebuild output must use a new generation identity tied to the ReplayRequest, policy versions, source range, and route generation until validation completes."
    violation_behavior: "Reject in-place replacement, keep the active generation serving, and record the failed control attempt."
    source: ["FR17", "FR20", "AC9.2.3", "AC9.6.2"]

  - id: BR3.10
    statement: "Missing or corrupt retained ranges may be recovered only through a versioned producer-owned replay contract."
    category: policy
    applies_to: ["ReplayRequest", "DerivedAuditEvent", "ProjectionGeneration"]
    trigger: "Rebuild reconciliation proves that U10's retained ledger lacks or corrupts a required unexpired range."
    logic: "IF retained source evidence is insufficient THEN U10 must request republishing from the authoritative producer, preserve original event IDs and producer facts, and reapply current schema, safety, tenant, and expiry checks."
    violation_behavior: "Do not synthesize events or activate the incomplete generation; report the missing range and producer response."
    source: ["FR17", "FR20", "C15", "AC9.2.3", "AC9.6.2"]

  - id: BR3.11
    statement: "ProjectionGeneration activation requires reconciled authority, retention, schema support, tenant route, event counts, stream gaps, checksums, expiry markers, and checkpoint bounds."
    category: validation
    applies_to: ["ProjectionGeneration", "TenantAuditRoute", "RecoveryEvidenceManifest"]
    trigger: "A ReplayRequest proposes cutover or rollback to a candidate generation."
    logic: "IF any required reconciliation is missing, mismatched, stale, unauthorized, or includes expired events THEN the candidate generation cannot become active."
    violation_behavior: "Keep the prior valid route active when safe, mark the candidate failed or incomplete, and expose the exact reconciliation category."
    source: ["FR17", "FR20", "NFR3", "NFR9", "AC7.12.3", "AC9.2.3", "AC9.5.2", "AC9.6.2"]

  - id: BR3.12
    statement: "OpenSearch outage, projection delay, and replay work must not roll back or block already committed producer business work."
    category: policy
    applies_to: ["InboundEventReceipt", "AuditProjectionDocument", "ProjectionCheckpoint", "TenantAuditRoute"]
    trigger: "OpenSearch is unavailable, delayed, rebuilding, or under backpressure."
    logic: "IF projection is not current or safely queryable THEN U10 must retain durable work, expose lag or unavailability, and continue bounded recovery without asking producers to reverse committed mutations."
    violation_behavior: "Return an explicit degraded or unavailable query state and retain replayable work; never return silently incomplete results as current."
    source: ["FR17", "FR18", "NFR10", "C15", "C18", "AC9.2.3", "AC9.3.3"]

  - id: BR4.1
    statement: "Each retailer's business audit is projected through a server-resolved TenantAuditRoute bound to retailer ID, placement generation, and active ProjectionGeneration."
    category: constraint
    applies_to: ["TenantAuditRoute", "AuditProjectionDocument", "ProjectionGeneration"]
    trigger: "U10 projects or queries retailer business audit."
    logic: "IF a current authorized route cannot be resolved for the retailer and placement generation THEN U10 must neither write nor query a business-audit index."
    violation_behavior: "Fail closed with a placement or availability status and record safe operator diagnostics."
    source: ["NFR3", "C15", "C17", "C18", "AC9.2.2", "AC9.8.2"]

  - id: BR4.2
    statement: "Tenant-facing APIs must never accept an OpenSearch index, data-stream, alias, collection, or ProjectionGeneration name from the caller."
    category: authorization
    applies_to: ["TenantAuditRoute", "AuditProjectionDocument"]
    trigger: "A tenant audit query or related evidence request is received."
    logic: "IF a caller supplies a storage route or attempts arbitrary query-string access THEN ignore no authority-bearing value and deny the unsupported request; route selection remains server-owned."
    violation_behavior: "Return a stable validation or authorization error without disclosing route names or foreign-tenant existence."
    source: ["NFR3", "C17", "C18", "AC9.2.2"]

  - id: BR4.3
    statement: "Every tenant audit query must revalidate the current authenticated identity, retailer membership, permitted role, and current placement generation."
    category: authorization
    applies_to: ["AuditProjectionDocument", "TenantAuditRoute"]
    trigger: "A planner or manager submits any page or continuation of a business-audit query."
    logic: "IF current authority or placement is absent, revoked, mismatched, or stale THEN no audit event or prior page continuation may be returned."
    violation_behavior: "Deny the query, invalidate the continuation, hide foreign resources, and emit safe authorization telemetry."
    source: ["FR2", "FR17.1", "NFR3", "C17", "C18", "AC5.4.5", "AC9.2.2"]

  - id: BR4.4
    statement: "Tenant audit results may contain only events whose authoritative retailer ID equals the currently authorized retailer."
    category: constraint
    applies_to: ["AuditProjectionDocument"]
    trigger: "U10 forms a tenant-facing audit result page."
    logic: "IF any candidate result, filter, cursor, or route is associated with another retailer THEN exclude all results and fail the request rather than return a mixed page."
    violation_behavior: "Deny and alert on the isolation violation without exposing the foreign event or tenant identity."
    source: ["FR17.1", "NFR3", "C18", "AC2.5.3", "AC7.5.1", "AC9.1.3", "AC9.2.2"]

  - id: BR4.5
    statement: "Cross-retailer investigation and OpenSearch Dashboards access require a distinct operator-only route and current Platform Operator identity."
    category: authorization
    applies_to: ["AuditProjectionDocument", "OperationalTelemetryReference", "OperatorControlAuditEntry"]
    trigger: "A caller requests operator-wide search, Dashboards, quarantine detail, or cross-retailer correlation."
    logic: "IF the caller is an ordinary tenant user or lacks the narrow investigation scope THEN the operation is denied even when that caller is a manager for one retailer."
    violation_behavior: "Return no cross-retailer data and append a denied OperatorControlAuditEntry record with safe context."
    source: ["FR18", "NFR3", "C17", "C18", "AC9.2.2", "AC9.3.1"]

  - id: BR4.6
    statement: "Tenant business-audit queries support bounded date range and optional actor, action, target type, target ID, outcome, source service, and correlation filters."
    category: policy
    applies_to: ["AuditProjectionDocument"]
    trigger: "An authorized tenant query is validated."
    logic: "IF a requested filter is unsupported, unbounded, or incompatible with tenant scope THEN reject it; otherwise apply all supplied filters inside the authorized TenantAuditRoute."
    violation_behavior: "Return a stable validation error and no partial broadened result."
    source: ["FR18", "C17", "C18", "AC9.2.2"]

  - id: BR4.7
    statement: "Every audit query is paged within configured result, date-window, response-size, and execution bounds."
    category: constraint
    applies_to: ["AuditProjectionDocument", "TenantAuditRoute"]
    trigger: "An authorized tenant or operator query executes."
    logic: "IF requested bounds exceed configuration or a continuation does not match retailer, filters, sort, and active generation THEN reject it; a valid continuation must preserve the original query identity."
    violation_behavior: "Return a bounded error or unavailable result without silently truncating or broadening the query."
    source: ["FR18", "OQ6", "C17", "C18", "AC9.2.2"]

  - id: BR4.8
    statement: "Every business-audit response must disclose projection freshness and lag relative to its committed ProjectionCheckpoint."
    category: policy
    applies_to: ["AuditProjectionDocument", "ProjectionCheckpoint", "TenantAuditRoute"]
    trigger: "U10 returns or attempts to return tenant business-audit results."
    logic: "IF projection is unavailable, rebuilding, inconsistent, or exceeds the declared lag threshold THEN return explicit unavailability rather than a current-looking incomplete result; otherwise include checkpoint and freshness metadata."
    violation_behavior: "Return the declared unavailable response with correlation ID and preserve authoritative retained evidence for recovery."
    source: ["FR17", "FR18", "OQ6", "C18", "AC9.2.3"]

  - id: BR4.9
    statement: "After restore or tenant movement, U10 must reconcile and activate the intended TenantAuditRoute before serving that tenant."
    category: constraint
    applies_to: ["TenantAuditRoute", "ProjectionGeneration", "RecoveryEvidenceManifest"]
    trigger: "U10 starts after restore or receives a placement-generation cutover."
    logic: "IF route generation, retained ranges, expiry state, checksums, or active generation are not reconciled THEN the tenant route remains unavailable; stale jobs and stale routes cannot write or serve."
    violation_behavior: "Fail the affected tenant closed, leave other tenant routes unchanged, and expose operator recovery status."
    source: ["FR20", "NFR3", "C19", "AC9.6.2", "AC9.8.1", "AC9.8.2", "AC9.8.3"]

  - id: BR4.10
    statement: "U10 query responses and evidence contributions must express denied, empty, stale, rebuilding, unavailable, partial-evidence, and failed states as stable textual data."
    category: policy
    applies_to: ["AuditProjectionDocument", "EvidencePublication"]
    trigger: "U10 supplies data to U11, U12, or U13."
    logic: "IF evidence is not fully current and available THEN return the exact state and safe reason needed by consumers to render a meaningful text status; do not encode status only by color or omit it."
    violation_behavior: "Fail response validation rather than emit an ambiguous success shape."
    source: ["NFR14", "NFR15", "C17", "C18", "C19", "AC10.1.3", "AC10.1.4"]

  - id: BR5.1
    statement: "The deployment defaults are seven days for OperationalTelemetryReference retention and ninety days for business-audit retention, and both remain explicitly configurable."
    category: policy
    applies_to: ["RetentionPolicyVersion", "OperationalTelemetryReference", "DerivedAuditEvent", "AuditProjectionDocument"]
    trigger: "RetentionPolicyVersion is created, changed, or evaluated."
    logic: "IF no approved deployment override exists THEN apply the 7-day operational and 90-day business defaults; every override must be versioned and auditable."
    violation_behavior: "Reject an unversioned or unbounded policy and keep the last valid policy active."
    source: ["NFR9", "NFR10", "OQ10", "AC9.5.1"]

  - id: BR5.2
    statement: "One versioned RetentionPolicyVersion defines the cutoff and time basis used for a coordinated business-audit retention run."
    category: constraint
    applies_to: ["RetentionPolicyVersion", "RetentionRun"]
    trigger: "An operator requests or schedules business-audit expiry."
    logic: "IF policy version, cutoff, time basis, request version, or intended producer and U10 participant set is absent THEN the RetentionRun cannot begin."
    violation_behavior: "Deny or fail the run before deletion and append a safe OperatorControlAuditEntry outcome."
    source: ["FR17", "NFR9", "OQ10", "AC9.5.1", "AC9.5.3"]

  - id: BR5.3
    statement: "Each producer executes retention of its own authoritative audit rows through its own privileged boundary and returns a ProducerRetentionReceipt."
    category: authorization
    applies_to: ["RetentionRun", "ProducerRetentionReceipt"]
    trigger: "A coordinated business-audit RetentionRun reaches a producer."
    logic: "IF U10 lacks a valid producer-owned retention contract or receipt THEN U10 must not access or delete that producer's rows and must not claim producer retention completed."
    violation_behavior: "Mark the producer segment incomplete or failed and retain coordination evidence for retry."
    source: ["NFR4", "NFR9", "C19", "AC9.1.3", "AC9.5.1"]

  - id: BR5.4
    statement: "U10 retention removes only eligible U10-owned derived envelopes, projections, checkpoints that no longer protect retained work, and operational telemetry."
    category: authorization
    applies_to: ["RetentionRun", "DerivedAuditEvent", "AuditProjectionDocument", "ProjectionCheckpoint", "OperationalTelemetryReference"]
    trigger: "A validated RetentionRun applies its cutoff to U10-owned state."
    logic: "IF a record is not eligible under the exact policy version and cutoff or is needed to prove pending, quarantined, replay, or no-resurrection state THEN U10 must not delete it."
    violation_behavior: "Skip the record, mark reconciliation incomplete, and report the protected reason without broadening deletion authority."
    source: ["FR17", "NFR9", "AC9.5.1", "AC9.5.2"]

  - id: BR5.5
    statement: "ExpiryTombstone records the minimal event identity, tenant, policy version, cutoff, and non-reversible fingerprint needed to prevent resurrection, without retaining expired business payload."
    category: policy
    applies_to: ["ExpiryTombstone", "RetentionRun", "ProjectionGeneration"]
    trigger: "An event expires or a restored/replayed event is classified as already expired."
    logic: "IF payload retention ends but future rebuild, replay, rollback, or restore could encounter the event ID THEN keep the minimal ExpiryTombstone or cutoff watermark required to exclude it."
    violation_behavior: "Block activation or serving when expiry cannot be proven; never preserve prohibited or expired payload merely as a tombstone."
    source: ["NFR9", "NFR10", "AC9.5.2", "AC9.5.3", "AC9.9.2"]

  - id: BR5.6
    statement: "Rebuild, replay, and rollback must apply current RetentionPolicyVersion and ExpiryTombstone state before candidate generation activation."
    category: constraint
    applies_to: ["ReplayRequest", "ProjectionGeneration", "ExpiryTombstone"]
    trigger: "Historical retained or republished events are processed into a candidate generation."
    logic: "IF an event is expired at the applicable cutoff or matches an ExpiryTombstone THEN it must not appear in the candidate AuditProjectionDocument even when present in a ledger, queue, backup, or older index."
    violation_behavior: "Exclude the event, fail reconciliation if exclusion cannot be proven, and prevent generation activation."
    source: ["FR17", "NFR9", "AC9.5.2", "AC9.6.2"]

  - id: BR5.7
    statement: "Restored backup data must undergo retention and expiry reconciliation before any restored U10 route is exposed."
    category: constraint
    applies_to: ["RecoveryEvidenceManifest", "DerivedAuditEvent", "ExpiryTombstone", "TenantAuditRoute"]
    trigger: "A backup containing U10 business-audit state is restored."
    logic: "IF restored data includes records expired under the documented backup-expiry and cleanup policy or if that policy is unresolved THEN the affected route cannot serve until cleanup and verification complete."
    violation_behavior: "Keep restored service unavailable, report the unresolved or failed cleanup, and do not declare recovery."
    source: ["NFR9", "OQ5", "OQ10", "C19", "AC9.5.3", "AC9.9.2"]

  - id: BR5.8
    statement: "A RetentionRun must report each producer and U10 segment separately and cannot claim coordinated completion while any required segment is missing, failed, or unreconciled."
    category: calculation
    applies_to: ["RetentionRun", "ProducerRetentionReceipt"]
    trigger: "Retention coordination aggregates participant receipts."
    logic: "IF every required receipt matches policy version, cutoff, tenant scope, and reconciled counts THEN status may become completed; otherwise status is partial or failed with per-segment results."
    violation_behavior: "Withhold the completed claim and keep safe discrepancy evidence available to operators and C19."
    source: ["NFR9", "NFR15", "AC9.5.1", "AC9.5.3", "AC10.2.2"]

  - id: BR5.9
    statement: "U10 recovery completes only when retained and expired ranges, inbox state, checkpoints, active generation, tenant routes, counts, checksums, replay state, and failures reconcile in a RecoveryEvidenceManifest."
    category: validation
    applies_to: ["RecoveryEvidenceManifest", "TenantAuditRoute", "ProjectionGeneration", "ProjectionCheckpoint"]
    trigger: "An integrated clean-environment restore or U10 service recovery is evaluated."
    logic: "IF any required reconciliation fails or recovery objectives and observed loss/time cannot be reported THEN U10 remains not recovered even when PostgreSQL or OpenSearch is reachable."
    violation_behavior: "Keep affected routes unavailable and publish a failed or limited recovery result with measured facts."
    source: ["FR20", "NFR9", "NFR15", "OQ5", "C19", "AC9.6.1", "AC9.6.2", "AC9.6.3"]

  - id: BR5.10
    statement: "Tenant extraction moves only U10-owned state for the chosen retailer and binds it to a new placement generation after drain, copy, and reconciliation."
    category: constraint
    applies_to: ["TenantAuditRoute", "DerivedAuditEvent", "InboundEventReceipt", "ProjectionGeneration", "RecoveryEvidenceManifest"]
    trigger: "A chosen retailer is migrated from shared to dedicated placement."
    logic: "IF U10-owned work for the tenant is not paused or drained, copied, checksummed, retention-reconciled, and validated against the new generation THEN cutover cannot occur; other retailers' routes and state must remain unchanged."
    violation_behavior: "Abort or hold cutover, reject stale-generation work, and report tenant-specific reconciliation without accessing other units' stores."
    source: ["FR20", "NFR3", "C19", "AC9.8.1", "AC9.8.2", "AC9.8.3"]

  - id: BR5.11
    statement: "Relational-store recovery evidence received from owning units is treated as producer evidence and must be validated before U10 or C19 reports integrated recovery."
    category: validation
    applies_to: ["RecoveryEvidenceManifest", "EvidencePublication"]
    trigger: "Owning units report business or identity database restore results."
    logic: "IF protected-backup identity, record counts, integrity checks, retention reconciliation, or explicit corrupt/incomplete failure is absent THEN U10 must not represent the relational segment as recovered or query those stores directly."
    violation_behavior: "Report the segment failed or limited and keep any dependent U10 route unavailable."
    source: ["FR20", "NFR9", "C19", "AC9.9.1", "AC9.9.2", "AC9.9.3"]

  - id: BR5.12
    statement: "Document and model-artifact recovery evidence received from owning units must preserve versions, checksums, retailer scope, provenance, and deletion state without implying that U10 restored those stores."
    category: validation
    applies_to: ["RecoveryEvidenceManifest", "EvidencePublication"]
    trigger: "SupplierKnowledge or ModelLifecycle reports source or artifact restore results for integrated evidence."
    logic: "IF versions or checksums mismatch, files are missing or corrupt, retailer access is wrong, or deletion state is absent THEN U10 must record the segment as failed or limited and must not substitute another source or claim its projection is recovered."
    violation_behavior: "Keep the discrepancy explicit, disclose no foreign data, and wait for provider-owned correction."
    source: ["FR20", "NFR3", "C19", "AC9.10.1", "AC9.10.2", "AC9.10.3"]

  - id: BR6.1
    statement: "OperationalTelemetryReference storage and operator search are separate from tenant business-audit DerivedAuditEvent and AuditProjectionDocument storage."
    category: constraint
    applies_to: ["OperationalTelemetryReference", "DerivedAuditEvent", "AuditProjectionDocument"]
    trigger: "U10 receives telemetry or business-audit data or serves a search."
    logic: "IF data is optional operational telemetry THEN it must use the operator-only telemetry route and retention; IF data is required business audit THEN it must use the business-audit ingestion and tenant route and never be inferred from log text."
    violation_behavior: "Reject mixed routing, prevent tenant access to telemetry streams, and record a safe configuration failure."
    source: ["FR18", "NFR9", "NFR10", "AC9.3.1", "AC9.3.3"]

  - id: BR6.2
    statement: "Bounded correlation identifiers connect API, message, job, ML, agent, event, and U10 control evidence without merging their authority."
    category: policy
    applies_to: ["OperationalTelemetryReference", "AuditProjectionDocument", "OperatorControlAuditEntry"]
    trigger: "Telemetry or audit evidence is emitted or queried."
    logic: "IF correlation is available THEN preserve correlation ID, causation ID, event ID, service, and bounded job or request identity as applicable; correlation may link records but never prove authorization or business success."
    violation_behavior: "Mark correlation incomplete rather than fabricate links or copy sensitive payloads."
    source: ["FR18", "NFR10", "C15", "AC7.5.2", "AC9.3.1"]

  - id: BR6.3
    statement: "Operational telemetry applies the same prohibited-content exclusions as business audit and uses explicit field allowlists."
    category: validation
    applies_to: ["OperationalTelemetryReference"]
    trigger: "A log, metric attribute, trace attribute, or exception diagnostic is emitted."
    logic: "IF a field may contain credentials, tokens, raw supplier text, full prompts, hidden reasoning, or unbounded exception payloads THEN omit or irreversibly redact it before emission."
    violation_behavior: "Drop the unsafe field or record, increment visible safe loss telemetry, and never echo the content in diagnostics."
    source: ["NFR10", "AC7.5.2", "AC9.3.2"]

  - id: BR6.4
    statement: "Metric and trace dimensions must use bounded-cardinality identifiers and must not place arbitrary user, prompt, document, or payload text in labels."
    category: constraint
    applies_to: ["OperationalTelemetryReference"]
    trigger: "U10 defines or emits a metric or trace dimension."
    logic: "IF a proposed dimension has unbounded values THEN move any safe detail to a bounded operator record or omit it; retain only approved dimensions such as service, operation, outcome class, queue, and generation state."
    violation_behavior: "Reject the telemetry schema and emit a safe configuration error."
    source: ["NFR10", "OQ6", "AC9.3.1"]

  - id: BR6.5
    statement: "Telemetry buffering is finite, loss is observable, and optional telemetry backpressure never suppresses required business audit or blocks producer business work."
    category: policy
    applies_to: ["OperationalTelemetryReference", "InboundEventReceipt"]
    trigger: "Telemetry sink outage or buffer pressure occurs."
    logic: "IF the telemetry buffer reaches its configured bound THEN apply the declared loss policy to optional telemetry, count the loss safely, and preserve business-audit processing and business availability."
    violation_behavior: "Expose degraded telemetry and measured loss; never expand buffers without bound or convert logs into the audit source of truth."
    source: ["FR18", "NFR10", "OQ6", "AC9.3.3"]

  - id: BR6.6
    statement: "Replay, retention, quarantine repair, generation cutover or rollback, recovery activation, and cross-retailer investigation require current Platform Operator authority with a narrow operation scope."
    category: authorization
    applies_to: ["ReplayRequest", "RetentionRun", "QuarantineRecord", "ProjectionGeneration", "TenantAuditRoute"]
    trigger: "Any privileged U10 control is requested."
    logic: "IF the authenticated user or workload is not a current Platform Operator for the exact control scope THEN deny the operation; planner and manager roles never inherit these controls."
    violation_behavior: "Perform no control effect and append a denied OperatorControlAuditEntry record."
    source: ["FR17.1", "FR18", "NFR3", "C15", "AC9.1.3", "AC9.2.2"]

  - id: BR6.7
    statement: "Every privileged U10 control requires expected policy, request, route, or generation versions and an idempotency key with canonical request hash where applicable."
    category: constraint
    applies_to: ["ReplayRequest", "RetentionRun", "ProjectionGeneration", "TenantAuditRoute"]
    trigger: "An authorized privileged control is admitted or replayed."
    logic: "IF expected versions are stale or the same key has a different request hash THEN reject with conflict; IF key and hash match an accepted request THEN return the original control result without duplicate effects."
    violation_behavior: "Leave active state unchanged and append a failed or denied OperatorControlAuditEntry record linked to the request."
    source: ["NFR7", "C01", "C15", "C19", "AC8.5.3", "AC9.6.3"]

  - id: BR6.8
    statement: "U10 records accepted, denied, failed, and completed privileged-control attempts in an append-only OperatorControlAuditEntry and outbox path."
    category: policy
    applies_to: ["OperatorControlAuditEntry", "ReplayRequest", "RetentionRun", "ProjectionGeneration", "TenantAuditRoute"]
    trigger: "A privileged control is attempted or changes lifecycle status."
    logic: "IF a control attempt reaches U10 THEN record actor/workload, scope, target, expected versions, correlation, outcome, safe reason, and timestamps; projecting that self-audit must not emit a recursive new control event."
    violation_behavior: "Fail the control before its effect when required self-audit cannot commit; for denied pre-effect attempts, use the durable U10-owned rejection path."
    source: ["FR17", "FR17.1", "NFR4", "AC9.1.1", "AC9.1.2", "AC9.1.3"]

  - id: BR6.9
    statement: "U10 starts and reloads credentials only under its workload-scoped identity and fails explicitly when Vault is sealed, credentials are absent or expired, or scope is insufficient."
    category: authorization
    applies_to: ["OperatorControlAuditEntry", "OperationalTelemetryReference"]
    trigger: "U10 starts, credentials rotate, or U10 reconnects to an owned dependency."
    logic: "IF a valid U10-scoped credential is available THEN reload or roll out without widening scope; otherwise keep affected capabilities unavailable and do not fall back to another workload or embedded secret."
    violation_behavior: "Fail safely, expose operator diagnostics without secret values, and record recovery evidence only after tested access succeeds."
    source: ["NFR6", "FR20", "AC8.4.1", "AC8.4.2", "AC8.4.3", "AC9.7.1", "AC9.7.2", "AC9.7.3"]

  - id: BR6.10
    statement: "U10 operational and evidence records for deployment identify the immutable application image, source revision, schema compatibility result, migration result, and rollback target actually used."
    category: policy
    applies_to: ["OperatorControlAuditEntry", "RecoveryEvidenceManifest", "EvidencePublication"]
    trigger: "A trusted deployment, migration, blocked rollout, or rollback affects U10."
    logic: "IF migration validation fails THEN U10 must not report rollout success; IF rollback occurs THEN evidence must name a known schema-compatible image and release identity."
    violation_behavior: "Record failed or limited outcome, keep incompatible service unavailable, and never substitute an untrusted revision."
    source: ["NFR13", "C19", "AC8.8.1", "AC8.8.2", "AC8.8.3"]

  - id: BR6.11
    statement: "U10's REST, C15 async, C19 evidence, authorization, error, tenant, idempotency, and compatibility examples must pass the canonical contract checks before the affected change is accepted."
    category: validation
    applies_to: ["AuthoritativeAuditEvent", "ReplayRequest", "RetentionRun", "EvidencePublication"]
    trigger: "A U10 boundary or compatible schema changes."
    logic: "IF syntax, examples, generated clients, backward compatibility, tenant context, correlation, idempotency, or stable error validation fails THEN the applicable U10 change cannot be released."
    violation_behavior: "Fail contract validation and retain the last compatible boundary."
    source: ["NFR8", "C01", "C15", "C17", "C18", "C19", "AC8.2.1", "AC8.2.2", "AC8.2.3"]

  - id: BR7.1
    statement: "U10 exposes only a bounded, redacted EvidencePublication to U13 through C19; U13 retains ownership of the evidence manifest and demonstrated claim."
    category: authorization
    applies_to: ["EvidencePublication", "RecoveryEvidenceManifest", "AuditProjectionDocument"]
    trigger: "U13 requests audit, recovery, retention, replay, correlation, or query evidence."
    logic: "IF the request is authorized and bounded to declared checks THEN U10 may return safe facts and artifact references; it must not grant U13 direct storage access, transfer U10 control ownership, or expose unrestricted payloads."
    violation_behavior: "Deny overbroad access and return a safe failed evidence result with correlation."
    source: ["NFR3", "NFR15", "C19", "AC10.2.1", "AC10.2.4"]

  - id: BR7.2
    statement: "Every EvidencePublication is bound to an immutable forty-character Git revision, scenario identity, environment manifest, command/check identity, observed outcome, and artifact checksum."
    category: validation
    applies_to: ["EvidencePublication"]
    trigger: "U10 evidence is captured for a reviewer or release."
    logic: "IF revision, deterministic seed, three-retailer/one-store/one-hundred-product/eighteen-month scenario, CPU-only environment at no more than 3 CPU units and 16 GiB, check, outcome, or SHA-256 artifact identity is missing or malformed THEN the contribution cannot support a passed claim."
    violation_behavior: "Mark the check failed or limited and exclude it from passing release evidence."
    source: ["NFR15", "C19", "AC8.8.1", "AC10.2.1", "AC10.2.3"]

  - id: BR7.3
    statement: "Evidence outcomes are limited to actually observed passed, failed, or limited results; estimates, fixtures, and planned checks cannot be presented as measured success."
    category: policy
    applies_to: ["EvidencePublication"]
    trigger: "A claim, check, recovery result, resource result, or demo result is published."
    logic: "IF the supporting command or real required provider path did not run against the identified revision and environment THEN outcome cannot be passed; failed acceptance remains failed."
    violation_behavior: "Publish failed or limited status and the remaining limitation without fabricating completion."
    source: ["NFR11", "NFR15", "C19", "AC7.5.3", "AC9.4.3", "AC10.2.2", "AC10.2.3", "AC10.2.4"]

  - id: BR7.4
    statement: "U10 resource evidence must distinguish measured sustained and peak U10/OpenSearch/Dashboards consumption and platform overhead from estimates."
    category: calculation
    applies_to: ["EvidencePublication"]
    trigger: "Capacity evidence is collected for the full demonstrated stack."
    logic: "IF measured full-stack RAM or CPU, including Kubernetes and VM overhead, exceeds 16 GB RAM or 3 CPU units THEN report failure; U10 may report its measured share but must not infer that the total stack fits."
    violation_behavior: "Keep the failed fit visible for owner decision and do not silently remove services or assume extra host capacity."
    source: ["NFR2", "NFR15", "C19", "AC9.4.2", "AC9.4.3"]

  - id: BR7.5
    statement: "Performance evidence must preserve the fixed workload parameters and separate ordinary read latency from startup, download, LLM inference, replay, and recovery measurements."
    category: calculation
    applies_to: ["EvidencePublication"]
    trigger: "U10 contributes performance or query-latency evidence."
    logic: "IF the benchmark mix, sample count, duration, concurrency, authorization path, seeded data, hardware, or measured percentile is absent THEN no p95 claim is supported; the ordinary-read target is strictly below one second."
    violation_behavior: "Mark the benchmark failed or limited and publish the missing or failed parameter."
    source: ["NFR1", "NFR15", "C19", "AC9.4.1", "AC9.4.3"]

  - id: BR7.6
    statement: "Clean-reviewer evidence must prove U10 build, startup, health, audit query, and evidence contribution and must link the provider-owned application-skeleton checks from the same clean checkout."
    category: validation
    applies_to: ["EvidencePublication"]
    trigger: "The documented clean-checkout reviewer path runs."
    logic: "IF U10 requires an owner-only secret, cache, GPU, unsupported prerequisite, or undeclared external fallback, or the linked provider evidence does not show Vite development rendering Ant Design and its production output served by ASP.NET Core, THEN the reviewer check fails; CPU inference evidence remains owned by the AI units and U13 and must be linked, not assumed."
    violation_behavior: "Report actionable prerequisite or startup diagnostics and do not claim a reproducible demo."
    source: ["NFR11", "NFR13", "C19", "AC8.1.1", "AC8.1.2", "AC8.1.3", "AC10.1.1", "AC10.1.3"]

  - id: BR7.7
    statement: "Local-platform evidence for U10 must identify the applied infrastructure inputs, protected state choice, service prerequisites, probes, resource checks, and explicit startup failures actually observed."
    category: policy
    applies_to: ["EvidencePublication", "OperationalTelemetryReference"]
    trigger: "Local Kubernetes is provisioned or U10 platform prerequisites are verified."
    logic: "IF protected bootstrap inputs, persistent storage, resource capacity, local HTTPS, or required service dependencies are missing THEN U10 reports unavailable and the platform check cannot pass; U10 does not provision cloud resources."
    violation_behavior: "Return failed setup evidence with safe diagnostics and no assumed capacity or cloud action."
    source: ["NFR2", "NFR6", "NFR12", "C19", "AC8.3.1", "AC8.3.2", "AC8.3.3"]

  - id: BR7.8
    statement: "The reviewer-journey evidence must link U10 events and query samples for import, inventory, forecast, shortage review, draft, human approval, simulated receipt, and evaluation without claiming U10 performed those actions."
    category: policy
    applies_to: ["EvidencePublication", "AuditProjectionDocument"]
    trigger: "The full seeded reviewer journey is captured."
    logic: "IF any required sensitive step lacks its producer event, tenant-authorized query evidence, correlation, or actual outcome THEN the journey evidence is incomplete; redacted samples must preserve stable links to the originating facts."
    violation_behavior: "Mark the journey failed or limited and identify the missing step without synthesizing evidence."
    source: ["NFR11", "NFR15", "C19", "AC10.1.2", "AC10.1.4"]

  - id: BR7.9
    statement: "Release coverage evidence must connect every assigned acceptance criterion and every delivered U10 REST/async boundary to its own contract, authorization, audit, retry, recovery, or query result."
    category: validation
    applies_to: ["EvidencePublication"]
    trigger: "The final coverage matrix is generated or checked."
    logic: "IF a consumer story, sensitive flow, boundary, or acceptance criterion is covered only by a foundation fixture or lacks its own passing evidence THEN coverage remains incomplete."
    violation_behavior: "Report the exact coverage gap and prevent a complete-evidence claim."
    source: ["NFR8", "NFR15", "C19", "AC8.2.1", "AC8.2.2", "AC10.2.1", "AC10.2.4"]

  - id: BR7.10
    statement: "U10 evidence preserves rejected agent cases, model candidates, resource failures, recovery limits, retention discrepancies, and synthetic-data limitations alongside successful results."
    category: policy
    applies_to: ["EvidencePublication"]
    trigger: "Portfolio evaluation evidence is assembled."
    logic: "IF a relevant evaluation failed, was rejected, or remained limited THEN its status and safe supporting artifact remain visible and may not be removed to make the portfolio appear successful."
    violation_behavior: "Reject the incomplete evidence contribution and report the omitted category."
    source: ["FR12", "NFR15", "C19", "AC7.5.1", "AC7.5.3", "AC9.4.3", "AC9.6.3", "AC10.2.2"]

  - id: BR7.11
    statement: "A versioned release claim may identify only an owner-approved revision, tag, and immutable image whose demonstrated checks retain their actual outcomes."
    category: authorization
    applies_to: ["EvidencePublication"]
    trigger: "Release evidence is selected or published."
    logic: "IF explicit owner approval for the versioned release is absent or evidence points to another revision, tag, image, or unexecuted lifecycle result THEN U10 must not label the release demonstrated or approved."
    violation_behavior: "Withhold the approval claim and retain the evidence as draft, failed, or limited."
    source: ["NFR15", "C19", "AC10.2.3"]

  - id: BR7.12
    statement: "A U10 recovery or reviewer evidence package must include revision-bound inbox and projection counts, retained and expired ranges, checkpoints, replay and retention request versions, index and placement generations, lag, checksums, failures, and redacted query samples."
    category: validation
    applies_to: ["RecoveryEvidenceManifest", "EvidencePublication"]
    trigger: "U10 closes a recovery, replay, retention, migration, or reviewer-evidence check."
    logic: "IF any field required for the declared check is absent, stale, from another revision or tenant route, unchecksummed, or unsafe to disclose THEN the package cannot support a passed outcome; omitted fields must be explained as failed or limited."
    violation_behavior: "Reject the passing claim, preserve the safe partial evidence, and publish the missing or unsafe field category."
    source: ["FR20", "NFR3", "NFR9", "NFR15", "C19", "AC9.2.3", "AC9.5.1", "AC9.5.2", "AC9.5.3", "AC9.6.1", "AC9.6.2", "AC9.6.3", "AC9.8.1", "AC9.8.2", "AC10.2.1", "AC10.2.2", "AC10.2.4"]
```

## Rules Summary

| Rule group | Scope | Core decision |
| --- | --- | --- |
| BR1.1-BR1.17 | Producer authority and domain evidence | Producers retain all business authority; U10 preserves immutable outcomes and provenance through contracts without cross-unit storage access or inferred mutations. |
| BR2.1-BR2.10 | Event identity, ordering, validation, and quarantine | Validate C15 and the content allowlist before payload retention, deduplicate globally by event ID, order only declared streams, and quarantine unsafe input without retaining prohibited values. |
| BR3.1-BR3.12 | Inbox, projection, checkpoints, acknowledgement, retry, and replay | Commit inbox and retained envelope first, project idempotently, checkpoint, then acknowledge; use bounded retries/DLQ and inactive replay generations with reconciled cutover. |
| BR4.1-BR4.10 | Tenant routing and query behavior | Route by server-held retailer and placement generation, reauthorize every page, isolate tenant and operator searches, bound filters/pages, and disclose freshness or unavailability. |
| BR5.1-BR5.12 | Retention, recovery, and tenant extraction | Coordinate one versioned cutoff through producer-owned controls, retain minimal expiry proof, prevent resurrection, and reconcile U10-owned state before restore or placement activation. |
| BR6.1-BR6.11 | Telemetry, privileged controls, secrets, deployment, and contracts | Keep optional telemetry separate and bounded, require narrow operator authority with self-audit, fail safely on credential issues, and retain only contract-compatible trusted releases. |
| BR7.1-BR7.12 | C19 and reviewer evidence | Supply U13 with bounded revision-bound evidence containing actual outcomes, measurements, checksums, limitations, recovery facts, and complete per-flow coverage. |

## Sources

- `inception/requirements-analysis/requirements.md`: FR2-FR4, FR6-FR18, FR20; NFR1-NFR15; OQ5, OQ6, and OQ10.
- `inception/user-stories/stories.md`: all 114 acceptance criteria assigned to U10 across US2.2, US2.5, US3.3, US4.5, US5.2, US5.4, US6.2-US6.6, US7.5, US7.9, US7.10, US7.12, US8.1-US8.5, US8.8, US9.1-US9.10, US10.1, and US10.2.
- `inception/units-generation/unit-of-work.md` and `unit-of-work-story-map.md`: U10 ownership, storage boundary, implementing-unit assignments, and cross-unit constraints.
- `inception/domain-design/components.md`: AuditEvidence responsibilities, dependencies, entity seeds, rebuildable OpenSearch ownership, and acyclic authority flow.
- `inception/contract-design/contract-summary.md`: C01, C15, C17, C18, and C19; common envelope, provider ownership, tenant/placement, retry, error, compatibility, and evidence invariants.
- `construction/audit-evidence/functional-design/functional-design-questions.md`: confirmed producer authority, immutable retained envelope, global event-ID deduplication, stream ordering, tenant index routing, query freshness, content safety, inbox/projection/checkpoint/ack sequence, replay generations, coordinated retention, telemetry separation, operator self-audit, recovery, tenant movement, and C19 evidence decisions.

## Assumptions & Open Questions

- OQ6 and the C15 contract still require exact retry count, backoff, consumer deadline, queue/backlog capacity, DLQ retention, replay batch limit, projection-lag threshold, telemetry stores, and telemetry buffer limits. Every value must be finite; absence of a value does not authorize unbounded operation.
- OQ5 still requires recovery-time and recovery-point objectives, backup frequency and expiry, persistent-disk limits, and acceptable measured loss. A reachable database or OpenSearch cluster alone does not satisfy recovery.
- OQ10 still requires the retention schedule and tolerated cleanup lag. `RetentionPolicyVersion` must also state its time basis and boundary semantics before implementation so every producer, U10, replay, rebuild, and restore applies the same cutoff.
- C15 refinement must add or formally map producer identity, accepted time, resource-stream identity, and applicable aggregate version or producer sequence while preserving the confirmed immutable event ID and published-schema compatibility rules.
- The concrete OpenSearch index-versus-data-stream choice, rollover, shard, and replica settings remain NFR/infrastructure decisions. `TenantAuditRoute` is the business abstraction and must fit the measured 16 GB RAM and 3 CPU envelope.
- Exact query date-window, page-size, response-size, timeout, and lag bounds remain contract parameters. They cannot weaken per-request authorization, retailer isolation, stable ordering, or explicit unavailability.
- Exact Platform Operator identity, scopes, and replay, retention, repair, investigation, and evidence API schemas remain contract refinements. Tenant roles cannot receive those scopes, and every privileged attempt remains self-audited.
- Producer-specific event payload allowlists and safe redaction classifications must be fixed with each producer contract before that flow is accepted. Prohibited categories are never eligible for temporary raw retention.
- U10 recovery and tenant extraction cover only U10-owned state. Other units supply their own restore, retention, placement, document, artifact, and business reconciliation receipts through supported contracts; U10 never verifies them by direct storage access.

