# U10 Audit Evidence Entity Model

```yaml
model:
  unit: U10
  name: Audit Evidence
  authority: "Derived and rebuildable processing, query, and evidence state only; producing services remain authoritative for business audit facts."
  authoritative_inputs: "C15 producer-owned immutable audit events and versioned producer replay/retention receipts."
  disposable_stores:
    - OpenSearch business-audit projections
    - OpenSearch operational-telemetry projections
  prohibited_content:
    - credentials
    - access tokens
    - refresh tokens
    - raw supplier documents
    - supplier document text
    - full prompts
    - hidden reasoning
    - unrestricted exception payloads

model_constraints:
  - id: MC-01
    statement: "No U10 record makes a producer mutation valid or replaces a producer-owned authoritative audit/outbox row."
  - id: MC-02
    statement: "Cross-unit data is represented only by opaque identifiers, versions, checksums, and contract-defined provenance references; U10 has no cross-unit storage relationship or foreign key."
  - id: MC-03
    statement: "DerivedAuditEvent and InboundEventReceipt are append-only while retained; update is forbidden, and controlled expiry may remove a retained row only after the applicable expiry watermark and tombstone are durable."
  - id: MC-04
    statement: "OpenSearch documents, checkpoints, projection receipts, and generations are derived and rebuildable from retained ledger events plus producer replay receipts, subject to expiry markers."
  - id: MC-05
    statement: "Every tenant-scoped persisted row carries retailer_id directly or inherits it through a required U10-owned parent; all tenant access uses the current server-resolved route and placement generation."
  - id: MC-06
    statement: "Tenant-facing callers never supply an OpenSearch index, alias, data-stream, or collection locator; those locators are resolved from TenantAuditRoute."
  - id: MC-07
    statement: "Runtime identities use owned routines and tenant controls only; they cannot directly read or mutate business tables, bypass tenant controls, update/delete retained audit history, or execute retention."
  - id: MC-08
    statement: "Replay, retention, quarantine repair, recovery activation, route cutover, and cross-tenant investigation require current Platform Operator authority, narrow scope, and expected request or policy versions."
  - id: MC-09
    statement: "Quarantine, dead-letter, telemetry, self-audit, and evidence records contain only allowlisted safe metadata, hashes, bounded identifiers, and stable diagnostic codes; prohibited payload content is never retained."
  - id: MC-10
    statement: "Ordering is defined only inside a declared producer stream. Cross-stream query order is the stable tuple occurred_at, event_id and does not claim global business order."
  - id: MC-11
    statement: "One versioned retention policy and cutoff coordinates producers, the U10 ledger, OpenSearch projections, replay, restore, watermarks, and tombstones; activation is blocked if reconciliation could resurrect expired data."
  - id: MC-12
    statement: "Operational telemetry is separate from business audit, operator-only, disposable, and subject to its own retention; telemetry loss cannot suppress required audit ingestion or block business work."
  - id: MC-13
    statement: "All row-version fields are optimistic-concurrency tokens and are distinct from domain version identities such as route_version, generation_number, request_version, validation_version, policy_version, manifest_version, and publication_version."

entities:
  - id: AE01
    name: InboundEventReceipt
    description: "Immutable inbox evidence for one C15 delivery identity, created with a valid derived ledger event before acknowledgement or created with a terminal safe disposition when validation prevents ledger admission."
    storage_role: postgresql-derived-ledger
    lifecycle: "Append-only until coordinated expiry; duplicate delivery returns the existing disposition."
    attributes:
      - { name: inbox_receipt_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Stable U10 row identity." }
      - { name: deduplication_key, logical_type: bounded_string, required: true, unique: true, references: null, allowed_values: [], default: null, min: 16, max: 200, constraints: "Valid events use event_id; malformed envelopes use a deterministic safe transport identity or digest." }
      - { name: claimed_event_id, logical_type: uuid, required: false, unique: false, references: "DerivedAuditEvent.event_id", allowed_values: [], default: null, min: null, max: null, constraints: "Present only when a valid event ID was supplied." }
      - { name: envelope_sha256, logical_type: sha256, required: true, unique: false, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Hash only; the original unsafe payload is not retained here." }
      - { name: retailer_id, logical_type: uuid, required: false, unique: false, references: "external:TenantDirectory.Retailer.retailer_id", allowed_values: [], default: null, min: null, max: null, constraints: "Required for admitted tenant events; absence is allowed only for malformed quarantine disposition." }
      - { name: placement_generation, logical_type: positive_integer, required: false, unique: false, references: "external:TenantDirectory.RetailerPlacement.generation", allowed_values: [], default: null, min: 1, max: null, constraints: "Must match the admitted event and current route at acceptance." }
      - { name: producer_service, logical_type: enum, required: false, unique: false, references: null, allowed_values: [identity-access, retail-data, supplier-knowledge, model-lifecycle, forecasting, planning-purchasing, assistant], default: null, min: null, max: null, constraints: "Derived from trusted routing identity and validated envelope, never from arbitrary payload text." }
      - { name: schema_version, logical_type: semantic_version, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: 32, constraints: "Accepted versions must be supported by C15." }
      - { name: disposition, logical_type: enum, required: true, unique: false, references: null, allowed_values: [admitted, duplicate, quarantined], default: null, min: null, max: null, constraints: "Final receipt disposition; later projection progress is modeled separately." }
      - { name: received_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "U10 acceptance time, not producer business time." }
    constraints:
      - id: EC-AE01-01
        statement: "deduplication_key is globally unique, and a duplicate with a different envelope_sha256 is a conflict rather than a second receipt."
      - id: EC-AE01-02
        statement: "An admitted receipt has claimed_event_id, retailer_id, placement_generation, producer_service, and schema_version and is created atomically with exactly one DerivedAuditEvent."
      - id: EC-AE01-03
        statement: "A quarantined receipt may omit invalid envelope fields but never stores the source payload."

  - id: AE02
    name: DerivedAuditEvent
    description: "Immutable, allowlisted U10 copy of a producer-authoritative business audit event used only for search projection, replay, retention, and evidence."
    storage_role: postgresql-derived-ledger
    lifecycle: "Append-only while retained; controlled expiry is guarded by ExpiryWatermark and ExpiryTombstone."
    attributes:
      - { name: derived_event_row_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "U10 row identity distinct from producer event identity." }
      - { name: event_id, logical_type: uuid, required: true, unique: true, references: "external:C15.messageId", allowed_values: [], default: null, min: null, max: null, constraints: "Global idempotency and OpenSearch document identity." }
      - { name: inbox_receipt_id, logical_type: uuid, required: true, unique: true, references: "InboundEventReceipt.inbox_receipt_id", allowed_values: [], default: null, min: null, max: null, constraints: "One admitted receipt per retained event." }
      - { name: producer_audit_record_id, logical_type: opaque_identifier, required: true, unique: false, references: "external:producer-authoritative-audit-record.id", allowed_values: [], default: null, min: 1, max: 200, constraints: "Identifier reference only; no producer row access is implied." }
      - { name: producer_audit_record_version, logical_type: bounded_string, required: true, unique: false, references: "external:producer-authoritative-audit-record.version", allowed_values: [], default: null, min: 1, max: 100, constraints: "Producer version reference used for provenance and replay validation." }
      - { name: retailer_id, logical_type: uuid, required: true, unique: false, references: "external:TenantDirectory.Retailer.retailer_id", allowed_values: [], default: null, min: null, max: null, constraints: "Tenant context, never authority by itself." }
      - { name: placement_generation, logical_type: positive_integer, required: true, unique: false, references: "external:TenantDirectory.RetailerPlacement.generation", allowed_values: [], default: null, min: 1, max: null, constraints: "Must pass current route validation on admission." }
      - { name: producer_service, logical_type: enum, required: true, unique: false, references: null, allowed_values: [identity-access, retail-data, supplier-knowledge, model-lifecycle, forecasting, planning-purchasing, assistant], default: null, min: null, max: null, constraints: "Trusted producer identity." }
      - { name: event_type, logical_type: enum, required: true, unique: false, references: "external:C15.messageType", allowed_values: [identity.audit.recorded, tenant.audit.recorded, inventory.audit.recorded, demand.audit.recorded, supplier.audit.recorded, model.audit.recorded, forecast.audit.recorded, replenishment.audit.recorded, purchasing.audit.recorded, assistant.audit.recorded], default: null, min: null, max: null, constraints: "C15 allowlist only." }
      - { name: schema_version, logical_type: semantic_version, required: true, unique: false, references: "external:C15.schemaVersion", allowed_values: [], default: null, min: null, max: 32, constraints: "Must be supported at admission and rebuild." }
      - { name: actor_type, logical_type: enum, required: true, unique: false, references: "external:C15.actor.type", allowed_values: [user, service, scheduler], default: null, min: null, max: null, constraints: "Does not grant U10 authority." }
      - { name: actor_subject_id, logical_type: opaque_identifier, required: true, unique: false, references: "external:C15.actor.subjectId", allowed_values: [], default: null, min: 1, max: 200, constraints: "Bounded identifier only." }
      - { name: action, logical_type: bounded_string, required: true, unique: false, references: "external:C15.data.action", allowed_values: [], default: null, min: 1, max: 120, constraints: "Contract-allowlisted action token, not free-form text." }
      - { name: resource_type, logical_type: bounded_string, required: true, unique: false, references: "external:C15.data.resourceType", allowed_values: [], default: null, min: 1, max: 120, constraints: "Contract-allowlisted target type." }
      - { name: resource_id, logical_type: opaque_identifier, required: true, unique: false, references: "external:C15.data.resourceId", allowed_values: [], default: null, min: 1, max: 200, constraints: "Cross-unit identifier reference only." }
      - { name: outcome, logical_type: enum, required: true, unique: false, references: "external:C15.data.outcome", allowed_values: [accepted, denied, failed], default: null, min: null, max: null, constraints: "Producer-declared outcome preserved verbatim." }
      - { name: before_version, logical_type: bounded_string, required: false, unique: false, references: "external:C15.data.beforeVersion", allowed_values: [], default: null, min: 1, max: 100, constraints: "Producer version reference only." }
      - { name: after_version, logical_type: bounded_string, required: false, unique: false, references: "external:C15.data.afterVersion", allowed_values: [], default: null, min: 1, max: 100, constraints: "Producer version reference only." }
      - { name: stream_id, logical_type: bounded_string, required: true, unique: false, references: "external:producer-stream.id", allowed_values: [], default: null, min: 1, max: 240, constraints: "Declared producer aggregate or resource stream." }
      - { name: stream_order_kind, logical_type: enum, required: true, unique: false, references: "external:producer-stream.order-kind", allowed_values: [aggregate_version, producer_sequence], default: null, min: null, max: null, constraints: "States how stream_order_value is interpreted." }
      - { name: stream_order_value, logical_type: positive_integer, required: true, unique: false, references: "external:producer-stream.order-value", allowed_values: [], default: null, min: 1, max: null, constraints: "Monotonic only inside producer_service plus retailer_id plus stream_id." }
      - { name: occurred_at, logical_type: timestamp_utc, required: true, unique: false, references: "external:C15.occurredAt", allowed_values: [], default: null, min: null, max: null, constraints: "Producer business time; stable cross-stream sorting also uses event_id." }
      - { name: accepted_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "U10 ledger acceptance time." }
      - { name: correlation_id, logical_type: uuid, required: true, unique: false, references: "external:C15.correlationId", allowed_values: [], default: null, min: null, max: null, constraints: "Bounded correlation only." }
      - { name: causation_id, logical_type: uuid, required: true, unique: false, references: "external:C15.causationId", allowed_values: [], default: null, min: null, max: null, constraints: "Bounded causation only." }
      - { name: provenance_reference, logical_type: bounded_string, required: false, unique: false, references: "external:producer-provenance.id-version", allowed_values: [], default: null, min: 1, max: 300, constraints: "Allowlisted identifier/version locator; never source text or a secret-bearing URI." }
      - { name: canonical_event_sha256, logical_type: sha256, required: true, unique: false, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Checksum of the admitted canonical allowlisted fields." }
    constraints:
      - id: EC-AE02-01
        statement: "The composite tuple producer_service, retailer_id, stream_id, stream_order_kind, stream_order_value is unique."
      - id: EC-AE02-02
        statement: "At least one of before_version or after_version is present for a versioned target; denied and failed attempts may preserve the attempted version without implying a mutation."
      - id: EC-AE02-03
        statement: "No mutable business payload, prompt, document text, hidden reasoning, credential, token, or unrestricted diagnostic is stored."
      - id: EC-AE02-04
        statement: "The row cannot be updated; correction requires a new producer-authoritative event with a new event_id."

  - id: AE03
    name: TenantAuditRoute
    description: "Versioned server-owned route from a retailer placement generation to its business-audit projection generations."
    storage_role: postgresql-derived-control
    lifecycle: versioned-current-route
    attributes:
      - { name: tenant_audit_route_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Route row identity." }
      - { name: retailer_id, logical_type: uuid, required: true, unique: false, references: "external:TenantDirectory.Retailer.retailer_id", allowed_values: [], default: null, min: null, max: null, constraints: "Tenant context." }
      - { name: route_version, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: null, min: 1, max: null, constraints: "Monotonic version identity distinct from row_version." }
      - { name: placement_generation, logical_type: positive_integer, required: true, unique: false, references: "external:TenantDirectory.RetailerPlacement.generation", allowed_values: [], default: null, min: 1, max: null, constraints: "Stale generations cannot receive or serve work." }
      - { name: target_locator_key, logical_type: bounded_string, required: true, unique: true, references: null, allowed_values: [], default: server_generated, min: 1, max: 240, constraints: "Opaque internal locator; never accepted from tenant clients." }
      - { name: active_projection_generation_id, logical_type: uuid, required: false, unique: false, references: "ProjectionGeneration.projection_generation_id", allowed_values: [], default: null, min: null, max: null, constraints: "Set only after generation validation and expiry reconciliation." }
      - { name: status, logical_type: enum, required: true, unique: false, references: null, allowed_values: [pending, active, draining, superseded, blocked], default: pending, min: null, max: null, constraints: "Only active routes serve tenant queries." }
      - { name: effective_at, logical_type: timestamp_utc, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Required for active or superseded versions." }
      - { name: superseded_at, logical_type: timestamp_utc, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Present only for superseded versions." }
      - { name: row_version, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: "Optimistic concurrency token." }
    constraints:
      - id: EC-AE03-01
        statement: "The composite tuple retailer_id, route_version is unique."
      - id: EC-AE03-02
        statement: "The composite tuple retailer_id, placement_generation is unique for active or draining routes, and at most one route per retailer is active."
      - id: EC-AE03-03
        statement: "active_projection_generation_id, when present, belongs to this route and is in active status."

  - id: AE04
    name: ProjectionGeneration
    description: "One rebuildable OpenSearch business-audit generation for a server-resolved tenant route."
    storage_role: postgresql-derived-control
    lifecycle: build-validate-activate-retire
    attributes:
      - { name: projection_generation_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Generation row identity." }
      - { name: tenant_audit_route_id, logical_type: uuid, required: true, unique: false, references: "TenantAuditRoute.tenant_audit_route_id", allowed_values: [], default: null, min: null, max: null, constraints: "Owning route." }
      - { name: generation_number, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: null, min: 1, max: null, constraints: "Version identity within the route, distinct from row_version." }
      - { name: mapping_version, logical_type: semantic_version, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: 32, constraints: "Immutable mapping/schema version for this generation." }
      - { name: index_set_key, logical_type: bounded_string, required: true, unique: true, references: null, allowed_values: [], default: server_generated, min: 1, max: 240, constraints: "Internal OpenSearch locator; never exposed as a client selector." }
      - { name: source_cutoff_lower, logical_type: timestamp_utc, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Earliest retained event time intended for this generation." }
      - { name: source_cutoff_upper, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Stable build horizon." }
      - { name: status, logical_type: enum, required: true, unique: false, references: null, allowed_values: [building, validating, ready, active, retired, failed, blocked], default: building, min: null, max: null, constraints: "Only ready can transition to active; blocked includes expiry or route mismatch." }
      - { name: expected_event_count, logical_type: nonnegative_integer, required: true, unique: false, references: null, allowed_values: [], default: 0, min: 0, max: null, constraints: "Validated retained source count." }
      - { name: projected_event_count, logical_type: nonnegative_integer, required: true, unique: false, references: null, allowed_values: [], default: 0, min: 0, max: null, constraints: "Count of idempotently projected retained events." }
      - { name: projection_sha256, logical_type: sha256, required: false, unique: false, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Required before ready or active." }
      - { name: created_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Creation time." }
      - { name: activated_at, logical_type: timestamp_utc, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Present only after activation." }
      - { name: row_version, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: "Optimistic concurrency token." }
    constraints:
      - id: EC-AE04-01
        statement: "The composite tuple tenant_audit_route_id, generation_number is unique."
      - id: EC-AE04-02
        statement: "A generation becomes ready or active only when counts, checksum, schema support, route placement generation, replay coverage, and expiry state reconcile."
      - id: EC-AE04-03
        statement: "Failure or retirement never deletes the active generation until another validated generation is atomically activated."

  - id: AE05
    name: ProjectionCheckpoint
    description: "Append-only, versioned progress evidence for one projection generation and declared source partition."
    storage_role: postgresql-derived-control
    lifecycle: append-only-versioned
    attributes:
      - { name: projection_checkpoint_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Checkpoint row identity." }
      - { name: projection_generation_id, logical_type: uuid, required: true, unique: false, references: "ProjectionGeneration.projection_generation_id", allowed_values: [], default: null, min: null, max: null, constraints: "Owning generation." }
      - { name: source_partition, logical_type: bounded_string, required: true, unique: false, references: "external:C15.partition", allowed_values: [], default: null, min: 1, max: 120, constraints: "Trusted broker/source partition identity." }
      - { name: checkpoint_version, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: null, min: 1, max: null, constraints: "Monotonic version identity within generation and partition." }
      - { name: last_event_id, logical_type: uuid, required: false, unique: false, references: "DerivedAuditEvent.event_id", allowed_values: [], default: null, min: null, max: null, constraints: "Null only for an empty partition checkpoint." }
      - { name: last_stream_order_value, logical_type: nonnegative_integer, required: false, unique: false, references: null, allowed_values: [], default: null, min: 0, max: null, constraints: "Progress marker for the declared partition, not a global sequence." }
      - { name: last_occurred_at, logical_type: timestamp_utc, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Producer time of last covered event." }
      - { name: last_accepted_at, logical_type: timestamp_utc, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "U10 acceptance time of last covered event." }
      - { name: indexed_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Checkpoint commit time after idempotent indexing." }
      - { name: event_count, logical_type: nonnegative_integer, required: true, unique: false, references: null, allowed_values: [], default: 0, min: 0, max: null, constraints: "Cumulative covered event count." }
      - { name: checkpoint_sha256, logical_type: sha256, required: true, unique: false, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Checksum of the checkpoint manifest." }
    constraints:
      - id: EC-AE05-01
        statement: "The composite tuple projection_generation_id, source_partition, checkpoint_version is unique."
      - id: EC-AE05-02
        statement: "Checkpoint versions and cumulative event_count never decrease within a generation and partition."
      - id: EC-AE05-03
        statement: "A RabbitMQ delivery is acknowledged only after its admitted receipt, projection outcome, and applicable checkpoint commit are durable."

  - id: AE06
    name: ProjectionEventReceipt
    description: "Idempotent per-generation projection outcome for one retained event."
    storage_role: postgresql-derived-control
    lifecycle: retryable-current-state
    attributes:
      - { name: projection_event_receipt_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Projection receipt row identity." }
      - { name: projection_generation_id, logical_type: uuid, required: true, unique: false, references: "ProjectionGeneration.projection_generation_id", allowed_values: [], default: null, min: null, max: null, constraints: "Target generation." }
      - { name: event_id, logical_type: uuid, required: true, unique: false, references: "DerivedAuditEvent.event_id", allowed_values: [], default: null, min: null, max: null, constraints: "OpenSearch document identity." }
      - { name: state, logical_type: enum, required: true, unique: false, references: null, allowed_values: [pending, indexed, verified, skipped_expired, failed, dead_lettered], default: pending, min: null, max: null, constraints: "skipped_expired requires a matching expiry marker." }
      - { name: attempt_count, logical_type: nonnegative_integer, required: true, unique: false, references: null, allowed_values: [], default: 0, min: 0, max: null, constraints: "Bounded by deployment retry policy." }
      - { name: document_sha256, logical_type: sha256, required: false, unique: false, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Required for indexed or verified state." }
      - { name: last_safe_error_code, logical_type: bounded_string, required: false, unique: false, references: null, allowed_values: [], default: null, min: 1, max: 120, constraints: "Stable code only; no raw exception or payload." }
      - { name: indexed_at, logical_type: timestamp_utc, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Present for indexed or verified state." }
      - { name: row_version, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: "Optimistic concurrency token." }
    constraints:
      - id: EC-AE06-01
        statement: "The composite tuple projection_generation_id, event_id is unique."
      - id: EC-AE06-02
        statement: "Retries use event_id as the OpenSearch document key, so a crash after indexing and before checkpoint commit cannot duplicate a document."

  - id: AE07
    name: AuditProjectionDocument
    description: "Disposable OpenSearch representation of the allowlisted searchable fields of one DerivedAuditEvent in one generation."
    storage_role: opensearch-business-audit-projection
    lifecycle: rebuildable-and-retained-by-policy
    attributes:
      - { name: projection_document_id, logical_type: uuid, required: true, unique: false, references: "DerivedAuditEvent.event_id", allowed_values: [], default: null, min: null, max: null, constraints: "Document ID equals event_id within each generation." }
      - { name: projection_generation_id, logical_type: uuid, required: true, unique: false, references: "ProjectionGeneration.projection_generation_id", allowed_values: [], default: null, min: null, max: null, constraints: "Generation scope." }
      - { name: retailer_id, logical_type: uuid, required: true, unique: false, references: "external:TenantDirectory.Retailer.retailer_id", allowed_values: [], default: null, min: null, max: null, constraints: "Must match the server-selected tenant index route." }
      - { name: event_type, logical_type: bounded_string, required: true, unique: false, references: "DerivedAuditEvent.event_type", allowed_values: [], default: null, min: 1, max: 120, constraints: "Searchable exact token." }
      - { name: actor_type, logical_type: bounded_string, required: true, unique: false, references: "DerivedAuditEvent.actor_type", allowed_values: [], default: null, min: 1, max: 32, constraints: "Searchable exact token." }
      - { name: actor_subject_id, logical_type: opaque_identifier, required: true, unique: false, references: "DerivedAuditEvent.actor_subject_id", allowed_values: [], default: null, min: 1, max: 200, constraints: "Exact-match field only." }
      - { name: action, logical_type: bounded_string, required: true, unique: false, references: "DerivedAuditEvent.action", allowed_values: [], default: null, min: 1, max: 120, constraints: "Allowlisted exact token." }
      - { name: resource_type, logical_type: bounded_string, required: true, unique: false, references: "DerivedAuditEvent.resource_type", allowed_values: [], default: null, min: 1, max: 120, constraints: "Allowlisted exact token." }
      - { name: resource_id, logical_type: opaque_identifier, required: true, unique: false, references: "DerivedAuditEvent.resource_id", allowed_values: [], default: null, min: 1, max: 200, constraints: "Exact-match field only." }
      - { name: outcome, logical_type: enum, required: true, unique: false, references: "DerivedAuditEvent.outcome", allowed_values: [accepted, denied, failed], default: null, min: null, max: null, constraints: "Producer outcome." }
      - { name: producer_service, logical_type: bounded_string, required: true, unique: false, references: "DerivedAuditEvent.producer_service", allowed_values: [], default: null, min: 1, max: 80, constraints: "Exact-match field only." }
      - { name: occurred_at, logical_type: timestamp_utc, required: true, unique: false, references: "DerivedAuditEvent.occurred_at", allowed_values: [], default: null, min: null, max: null, constraints: "Primary query time." }
      - { name: correlation_id, logical_type: uuid, required: true, unique: false, references: "DerivedAuditEvent.correlation_id", allowed_values: [], default: null, min: null, max: null, constraints: "Correlation filter." }
      - { name: causation_id, logical_type: uuid, required: true, unique: false, references: "DerivedAuditEvent.causation_id", allowed_values: [], default: null, min: null, max: null, constraints: "Causation filter." }
      - { name: projected_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Projection time." }
    constraints:
      - id: EC-AE07-01
        statement: "The composite tuple projection_generation_id, projection_document_id is unique."
      - id: EC-AE07-02
        statement: "The document contains no field absent from the U10 projection allowlist and no index locator supplied by a caller."

  - id: AE08
    name: QuarantineRecord
    description: "Durable safe metadata for a malformed, unsupported, stale-route, or prohibited-content event that was not indexed."
    storage_role: postgresql-derived-control
    lifecycle: operator-repairable-with-bounded-retention
    attributes:
      - { name: quarantine_record_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Quarantine identity." }
      - { name: inbox_receipt_id, logical_type: uuid, required: true, unique: true, references: "InboundEventReceipt.inbox_receipt_id", allowed_values: [], default: null, min: null, max: null, constraints: "Quarantined receipt." }
      - { name: claimed_event_id, logical_type: uuid, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Untrusted claimed identity retained only if syntactically valid." }
      - { name: retailer_id, logical_type: uuid, required: false, unique: false, references: "external:TenantDirectory.Retailer.retailer_id", allowed_values: [], default: null, min: null, max: null, constraints: "May be absent when the field was malformed." }
      - { name: producer_service, logical_type: bounded_string, required: false, unique: false, references: null, allowed_values: [], default: null, min: 1, max: 80, constraints: "Trusted routing identity where available." }
      - { name: observed_schema_version, logical_type: bounded_string, required: false, unique: false, references: null, allowed_values: [], default: null, min: 1, max: 32, constraints: "Syntactically safe version token only." }
      - { name: envelope_sha256, logical_type: sha256, required: true, unique: false, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Hash only; original payload is excluded." }
      - { name: safe_reason_code, logical_type: enum, required: true, unique: false, references: null, allowed_values: [malformed_envelope, unsupported_schema, unknown_event_type, stale_placement_generation, allowlist_violation, prohibited_content_detected, signature_or_origin_invalid], default: null, min: null, max: null, constraints: "Stable diagnostic code." }
      - { name: rejected_field_names, logical_type: "list<bounded_string>", required: false, unique: false, references: null, allowed_values: [], default: [], min: 0, max: 50, constraints: "Field names only; no values." }
      - { name: state, logical_type: enum, required: true, unique: false, references: null, allowed_values: [open, repair_requested, released_to_reingestion, rejected_terminal, expired], default: open, min: null, max: null, constraints: "Release creates a new validated ingestion attempt; this record is never edited into a valid event." }
      - { name: quarantined_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Quarantine time." }
      - { name: row_version, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: "Optimistic concurrency token." }
    constraints:
      - id: EC-AE08-01
        statement: "No raw payload, rejected value, prompt, supplier text, credential, token, or exception body is retained."
      - id: EC-AE08-02
        statement: "Repair requires an OperatorControlRequest and re-enters normal schema, authority, tenant-route, allowlist, and expiry validation."

  - id: AE09
    name: DeadLetterRecord
    description: "Safe durable state for exhausted bounded ingestion or projection retries, linked to broker DLQ evidence without copying the dead-letter payload."
    storage_role: postgresql-derived-control
    lifecycle: operator-replayable-with-bounded-retention
    attributes:
      - { name: dead_letter_record_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Dead-letter identity." }
      - { name: inbox_receipt_id, logical_type: uuid, required: true, unique: false, references: "InboundEventReceipt.inbox_receipt_id", allowed_values: [], default: null, min: null, max: null, constraints: "Original delivery receipt." }
      - { name: event_id, logical_type: uuid, required: false, unique: false, references: "DerivedAuditEvent.event_id", allowed_values: [], default: null, min: null, max: null, constraints: "Present for admitted events." }
      - { name: projection_generation_id, logical_type: uuid, required: false, unique: false, references: "ProjectionGeneration.projection_generation_id", allowed_values: [], default: null, min: null, max: null, constraints: "Present for projection failures." }
      - { name: failure_stage, logical_type: enum, required: true, unique: false, references: null, allowed_values: [ingestion, projection, checkpoint], default: null, min: null, max: null, constraints: "Processing boundary that exhausted retries." }
      - { name: safe_reason_code, logical_type: bounded_string, required: true, unique: false, references: null, allowed_values: [], default: null, min: 1, max: 120, constraints: "Stable code only." }
      - { name: retry_count, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: null, min: 1, max: null, constraints: "Equals exhausted bounded attempts." }
      - { name: retry_policy_version, logical_type: semantic_version, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: 32, constraints: "Policy used to establish exhaustion." }
      - { name: broker_dead_letter_reference_sha256, logical_type: sha256, required: true, unique: false, references: "external:C15.dead-letter-reference", allowed_values: [], default: null, min: 64, max: 64, constraints: "Opaque reference hash, never the broker payload." }
      - { name: replay_eligibility, logical_type: enum, required: true, unique: false, references: null, allowed_values: [eligible, blocked_schema, blocked_expired, blocked_route, terminal_unsafe], default: null, min: null, max: null, constraints: "Revalidated when replay starts." }
      - { name: state, logical_type: enum, required: true, unique: false, references: null, allowed_values: [open, replay_requested, replayed, terminal, expired], default: open, min: null, max: null, constraints: "Current operational state." }
      - { name: dead_lettered_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Exhaustion time." }
      - { name: row_version, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: "Optimistic concurrency token." }
    constraints:
      - id: EC-AE09-01
        statement: "The composite tuple inbox_receipt_id, projection_generation_id, failure_stage is unique, treating null projection generation as the ingestion scope."
      - id: EC-AE09-02
        statement: "Dead-letter replay is never automatic after exhaustion and requires operator authority plus normal validation."

  - id: AE10
    name: ReplayRequest
    description: "Versioned operator-only request to rebuild, repair, or replay a bounded retained range from the U10 ledger or a producer-owned replay contract."
    storage_role: postgresql-derived-control
    lifecycle: authorized-versioned-request
    attributes:
      - { name: replay_request_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Request row identity." }
      - { name: request_series_id, logical_type: uuid, required: true, unique: false, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Stable logical request identity across revisions." }
      - { name: request_version, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: "Version identity distinct from row_version." }
      - { name: operator_control_request_id, logical_type: uuid, required: true, unique: true, references: "OperatorControlRequest.operator_control_request_id", allowed_values: [], default: null, min: null, max: null, constraints: "Current operator authority evidence." }
      - { name: idempotency_key, logical_type: bounded_string, required: true, unique: true, references: null, allowed_values: [], default: null, min: 16, max: 128, constraints: "Matching replay returns the original request; hash mismatch conflicts." }
      - { name: request_sha256, logical_type: sha256, required: true, unique: false, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Canonical request hash." }
      - { name: retailer_id, logical_type: uuid, required: true, unique: false, references: "external:TenantDirectory.Retailer.retailer_id", allowed_values: [], default: null, min: null, max: null, constraints: "Required bounded tenant scope." }
      - { name: producer_service, logical_type: bounded_string, required: false, unique: false, references: "external:C15.producer", allowed_values: [], default: null, min: 1, max: 80, constraints: "Optional producer restriction." }
      - { name: range_kind, logical_type: enum, required: true, unique: false, references: null, allowed_values: [event_ids, occurred_time, producer_stream_order], default: null, min: null, max: null, constraints: "Determines interpretation of bounded range endpoints." }
      - { name: range_start, logical_type: bounded_string, required: true, unique: false, references: null, allowed_values: [], default: null, min: 1, max: 200, constraints: "Inclusive canonical endpoint." }
      - { name: range_end, logical_type: bounded_string, required: true, unique: false, references: null, allowed_values: [], default: null, min: 1, max: 200, constraints: "Inclusive canonical endpoint not before range_start." }
      - { name: source_mode, logical_type: enum, required: true, unique: false, references: null, allowed_values: [retained_u10_ledger, producer_republication], default: retained_u10_ledger, min: null, max: null, constraints: "Producer republication is allowed only for a proven missing or corrupt retained range." }
      - { name: target_projection_generation_id, logical_type: uuid, required: true, unique: false, references: "ProjectionGeneration.projection_generation_id", allowed_values: [], default: null, min: null, max: null, constraints: "New or repair generation; ordinary tenant users cannot select it." }
      - { name: status, logical_type: enum, required: true, unique: false, references: null, allowed_values: [requested, validating, approved, running, completed, failed, rejected, cancelled], default: requested, min: null, max: null, constraints: "approved requires a passing ReplayValidation." }
      - { name: requested_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Request time." }
      - { name: completed_at, logical_type: timestamp_utc, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Required for completed, failed, rejected, or cancelled." }
      - { name: row_version, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: "Optimistic concurrency token." }
    constraints:
      - id: EC-AE10-01
        statement: "The composite tuple request_series_id, request_version is unique."
      - id: EC-AE10-02
        statement: "The requested range is bounded, belongs to one retailer, and cannot cross an unresolved placement-generation boundary."
      - id: EC-AE10-03
        statement: "The target generation cannot become active from ReplayRequest status alone."

  - id: AE11
    name: ReplayValidation
    description: "Versioned validation evidence that gates replay execution and projection-generation activation."
    storage_role: postgresql-derived-evidence
    lifecycle: append-only-versioned
    attributes:
      - { name: replay_validation_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Validation row identity." }
      - { name: replay_request_id, logical_type: uuid, required: true, unique: false, references: "ReplayRequest.replay_request_id", allowed_values: [], default: null, min: null, max: null, constraints: "Validated request version." }
      - { name: validation_version, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: "Monotonic validation identity." }
      - { name: authority_check, logical_type: enum, required: true, unique: false, references: null, allowed_values: [passed, failed], default: null, min: null, max: null, constraints: "Checks current Platform Operator identity and scope." }
      - { name: retention_check, logical_type: enum, required: true, unique: false, references: null, allowed_values: [passed, failed], default: null, min: null, max: null, constraints: "Range excludes expired data." }
      - { name: schema_check, logical_type: enum, required: true, unique: false, references: null, allowed_values: [passed, failed], default: null, min: null, max: null, constraints: "All source schema versions are supported." }
      - { name: tenant_route_check, logical_type: enum, required: true, unique: false, references: null, allowed_values: [passed, failed], default: null, min: null, max: null, constraints: "Placement and target route are current and intended." }
      - { name: count_check, logical_type: enum, required: true, unique: false, references: null, allowed_values: [passed, failed], default: null, min: null, max: null, constraints: "Expected and actual retained counts reconcile." }
      - { name: checksum_check, logical_type: enum, required: true, unique: false, references: null, allowed_values: [passed, failed], default: null, min: null, max: null, constraints: "Source and projection manifests reconcile." }
      - { name: expiry_check, logical_type: enum, required: true, unique: false, references: null, allowed_values: [passed, failed], default: null, min: null, max: null, constraints: "Watermarks and tombstones are honored." }
      - { name: expected_event_count, logical_type: nonnegative_integer, required: true, unique: false, references: null, allowed_values: [], default: 0, min: 0, max: null, constraints: "Expected eligible count." }
      - { name: actual_event_count, logical_type: nonnegative_integer, required: true, unique: false, references: null, allowed_values: [], default: 0, min: 0, max: null, constraints: "Observed eligible count." }
      - { name: expected_sha256, logical_type: sha256, required: true, unique: false, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Expected manifest checksum." }
      - { name: actual_sha256, logical_type: sha256, required: true, unique: false, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Observed manifest checksum." }
      - { name: activation_allowed, logical_type: boolean, required: true, unique: false, references: null, allowed_values: [true, false], default: false, min: null, max: null, constraints: "True only when every check passed." }
      - { name: failure_codes, logical_type: "list<bounded_string>", required: false, unique: false, references: null, allowed_values: [], default: [], min: 0, max: 50, constraints: "Safe stable codes only." }
      - { name: validated_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Validation time." }
    constraints:
      - id: EC-AE11-01
        statement: "The composite tuple replay_request_id, validation_version is unique."
      - id: EC-AE11-02
        statement: "activation_allowed is true if and only if authority_check, retention_check, schema_check, tenant_route_check, count_check, checksum_check, and expiry_check all equal passed."

  - id: AE12
    name: ProducerReplayReceipt
    description: "Immutable receipt from a producer-owned versioned replay contract for a proven missing or corrupt retained range."
    storage_role: postgresql-derived-evidence
    lifecycle: append-only
    attributes:
      - { name: producer_replay_receipt_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "U10 receipt row identity." }
      - { name: replay_request_id, logical_type: uuid, required: true, unique: false, references: "ReplayRequest.replay_request_id", allowed_values: [], default: null, min: null, max: null, constraints: "Owning replay request." }
      - { name: producer_service, logical_type: bounded_string, required: true, unique: false, references: "external:C15.producer", allowed_values: [], default: null, min: 1, max: 80, constraints: "Producer contract owner." }
      - { name: producer_request_id, logical_type: opaque_identifier, required: true, unique: false, references: "external:producer-replay-request.id", allowed_values: [], default: null, min: 1, max: 200, constraints: "Producer-side request reference." }
      - { name: producer_request_version, logical_type: positive_integer, required: true, unique: false, references: "external:producer-replay-request.version", allowed_values: [], default: null, min: 1, max: null, constraints: "Producer-side request version." }
      - { name: retailer_id, logical_type: uuid, required: true, unique: false, references: "external:TenantDirectory.Retailer.retailer_id", allowed_values: [], default: null, min: null, max: null, constraints: "Must match ReplayRequest." }
      - { name: replayed_event_count, logical_type: nonnegative_integer, required: true, unique: false, references: null, allowed_values: [], default: 0, min: 0, max: null, constraints: "Count returned under producer authority." }
      - { name: replay_manifest_sha256, logical_type: sha256, required: true, unique: false, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Checksum of replayed event identities and versions." }
      - { name: producer_expiry_cutoff, logical_type: timestamp_utc, required: true, unique: false, references: "external:producer-expiry-watermark.cutoff", allowed_values: [], default: null, min: null, max: null, constraints: "Events at or before the cutoff must not be republished." }
      - { name: status, logical_type: enum, required: true, unique: false, references: null, allowed_values: [completed, partial, failed, rejected], default: null, min: null, max: null, constraints: "Partial or failed cannot independently satisfy validation." }
      - { name: received_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Receipt time." }
    constraints:
      - id: EC-AE12-01
        statement: "The composite tuple producer_service, producer_request_id, producer_request_version is unique."
      - id: EC-AE12-02
        statement: "The receipt carries identifiers, versions, counts, cutoff, status, and checksum only; republished event content must pass ordinary C15 admission."

  - id: AE13
    name: RetentionPolicyVersion
    description: "Immutable deployment retention-policy version coordinating business audit and operational telemetry cutoffs."
    storage_role: postgresql-derived-control
    lifecycle: append-only-versioned
    attributes:
      - { name: retention_policy_version_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Policy row identity." }
      - { name: policy_series_id, logical_type: uuid, required: true, unique: false, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Stable policy identity." }
      - { name: policy_version, logical_type: semantic_version, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: 32, constraints: "Version identity distinct from row identity." }
      - { name: business_audit_retention_days, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: 90, min: 1, max: null, constraints: "Configurable deployment value; default is 90 days." }
      - { name: operational_log_retention_days, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: 7, min: 1, max: null, constraints: "Configurable deployment value; default is 7 days." }
      - { name: cutoff_clock, logical_type: enum, required: true, unique: false, references: null, allowed_values: [utc], default: utc, min: null, max: null, constraints: "Cutoff calculation uses UTC instants." }
      - { name: effective_from, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Policy activation boundary." }
      - { name: supersedes_policy_version_id, logical_type: uuid, required: false, unique: false, references: "RetentionPolicyVersion.retention_policy_version_id", allowed_values: [], default: null, min: null, max: null, constraints: "Prior version, if any." }
      - { name: policy_sha256, logical_type: sha256, required: true, unique: true, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Canonical policy checksum." }
    constraints:
      - id: EC-AE13-01
        statement: "The composite tuple policy_series_id, policy_version is unique."
      - id: EC-AE13-02
        statement: "Policy versions do not overlap ambiguously; a retention run pins exactly one version and cutoff."

  - id: AE14
    name: RetentionRun
    description: "Operator-controlled coordination run for one policy version and cutoff across producer receipts, U10 ledger, projections, replay, and restore state."
    storage_role: postgresql-derived-control
    lifecycle: version-pinned-run
    attributes:
      - { name: retention_run_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Run identity." }
      - { name: operator_control_request_id, logical_type: uuid, required: true, unique: true, references: "OperatorControlRequest.operator_control_request_id", allowed_values: [], default: null, min: null, max: null, constraints: "Authority and idempotency evidence." }
      - { name: retention_policy_version_id, logical_type: uuid, required: true, unique: false, references: "RetentionPolicyVersion.retention_policy_version_id", allowed_values: [], default: null, min: null, max: null, constraints: "Pinned policy version." }
      - { name: cutoff_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Single coordinated business-audit cutoff." }
      - { name: status, logical_type: enum, required: true, unique: false, references: null, allowed_values: [requested, collecting_producer_receipts, expiring_derived_state, reconciling, completed, failed, blocked], default: requested, min: null, max: null, constraints: "completed requires all required participants and no resurrection gap." }
      - { name: expected_producer_count, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: 7, min: 1, max: null, constraints: "Count of required producer boundaries for this deployment." }
      - { name: received_producer_count, logical_type: nonnegative_integer, required: true, unique: false, references: null, allowed_values: [], default: 0, min: 0, max: null, constraints: "Cannot exceed expected_producer_count." }
      - { name: ledger_deleted_count, logical_type: nonnegative_integer, required: true, unique: false, references: null, allowed_values: [], default: 0, min: 0, max: null, constraints: "Derived ledger rows removed after markers are durable." }
      - { name: projection_deleted_count, logical_type: nonnegative_integer, required: true, unique: false, references: null, allowed_values: [], default: 0, min: 0, max: null, constraints: "OpenSearch documents removed or generation-expired." }
      - { name: reconciliation_sha256, logical_type: sha256, required: false, unique: false, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Required for completed status." }
      - { name: started_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Start time." }
      - { name: completed_at, logical_type: timestamp_utc, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Required for terminal status." }
      - { name: row_version, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: "Optimistic concurrency token." }
    constraints:
      - id: EC-AE14-01
        statement: "The composite tuple retention_policy_version_id, cutoff_at is unique for successful or in-progress runs."
      - id: EC-AE14-02
        statement: "A run cannot complete until required producer receipts, U10 deletion counts, OpenSearch reconciliation, watermarks, and tombstones agree."

  - id: AE15
    name: ProducerRetentionReceipt
    description: "Immutable producer-owned retention result proving controlled expiry behind that producer's authority boundary."
    storage_role: postgresql-derived-evidence
    lifecycle: append-only
    attributes:
      - { name: producer_retention_receipt_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "U10 receipt row identity." }
      - { name: retention_run_id, logical_type: uuid, required: true, unique: false, references: "RetentionRun.retention_run_id", allowed_values: [], default: null, min: null, max: null, constraints: "Owning coordination run." }
      - { name: producer_service, logical_type: bounded_string, required: true, unique: false, references: "external:C15.producer", allowed_values: [], default: null, min: 1, max: 80, constraints: "Producer authority boundary." }
      - { name: producer_receipt_id, logical_type: opaque_identifier, required: true, unique: false, references: "external:producer-retention-receipt.id", allowed_values: [], default: null, min: 1, max: 200, constraints: "Producer-owned receipt reference." }
      - { name: producer_request_version, logical_type: positive_integer, required: true, unique: false, references: "external:producer-retention-request.version", allowed_values: [], default: null, min: 1, max: null, constraints: "Expected request version executed by producer." }
      - { name: cutoff_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Must equal RetentionRun cutoff." }
      - { name: expired_record_count, logical_type: nonnegative_integer, required: true, unique: false, references: null, allowed_values: [], default: 0, min: 0, max: null, constraints: "Producer-controlled expiry count." }
      - { name: retained_floor_at, logical_type: timestamp_utc, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Earliest retained authoritative audit time, if records remain." }
      - { name: receipt_sha256, logical_type: sha256, required: true, unique: false, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Checksum over safe receipt metadata." }
      - { name: status, logical_type: enum, required: true, unique: false, references: null, allowed_values: [completed, failed, partial, rejected], default: null, min: null, max: null, constraints: "Only completed satisfies producer participation." }
      - { name: received_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Receipt time." }
    constraints:
      - id: EC-AE15-01
        statement: "The composite tuple retention_run_id, producer_service is unique."
      - id: EC-AE15-02
        statement: "The composite tuple producer_service, producer_receipt_id, producer_request_version is unique."

  - id: AE16
    name: ExpiryWatermark
    description: "Durable no-resurrection floor for a retailer and producer scope under a retention policy version."
    storage_role: postgresql-derived-evidence
    lifecycle: monotonic-append-only
    attributes:
      - { name: expiry_watermark_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Watermark row identity." }
      - { name: retention_run_id, logical_type: uuid, required: true, unique: false, references: "RetentionRun.retention_run_id", allowed_values: [], default: null, min: null, max: null, constraints: "Source run." }
      - { name: retailer_id, logical_type: uuid, required: true, unique: false, references: "external:TenantDirectory.Retailer.retailer_id", allowed_values: [], default: null, min: null, max: null, constraints: "Tenant scope." }
      - { name: producer_service, logical_type: bounded_string, required: true, unique: false, references: "external:C15.producer", allowed_values: [], default: null, min: 1, max: 80, constraints: "Producer stream scope." }
      - { name: retention_policy_version_id, logical_type: uuid, required: true, unique: false, references: "RetentionPolicyVersion.retention_policy_version_id", allowed_values: [], default: null, min: null, max: null, constraints: "Policy version." }
      - { name: expired_through, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Events at or before this instant are ineligible for visibility or rebuild unless an explicit boundary rule says otherwise." }
      - { name: source_manifest_sha256, logical_type: sha256, required: true, unique: false, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Reconciliation checksum." }
      - { name: recorded_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Record time." }
    constraints:
      - id: EC-AE16-01
        statement: "The composite tuple retailer_id, producer_service, retention_policy_version_id, expired_through is unique."
      - id: EC-AE16-02
        statement: "expired_through never moves backward for the same retailer and producer scope."

  - id: AE17
    name: ExpiryTombstone
    description: "Minimal immutable event-identity marker preventing a specifically expired event from reappearing after replay, rebuild, rollback, or restore."
    storage_role: postgresql-derived-evidence
    lifecycle: append-only-beyond-event-removal
    attributes:
      - { name: expiry_tombstone_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Tombstone row identity." }
      - { name: retention_run_id, logical_type: uuid, required: true, unique: false, references: "RetentionRun.retention_run_id", allowed_values: [], default: null, min: null, max: null, constraints: "Source run." }
      - { name: event_id, logical_type: uuid, required: true, unique: true, references: "historical:DerivedAuditEvent.event_id", allowed_values: [], default: null, min: null, max: null, constraints: "Identity retained after the derived event may be deleted; no cascading delete." }
      - { name: retailer_id, logical_type: uuid, required: true, unique: false, references: "external:TenantDirectory.Retailer.retailer_id", allowed_values: [], default: null, min: null, max: null, constraints: "Tenant scope." }
      - { name: producer_service, logical_type: bounded_string, required: true, unique: false, references: "external:C15.producer", allowed_values: [], default: null, min: 1, max: 80, constraints: "Producer scope." }
      - { name: occurred_at, logical_type: timestamp_utc, required: true, unique: false, references: "historical:DerivedAuditEvent.occurred_at", allowed_values: [], default: null, min: null, max: null, constraints: "Boundary reconciliation only." }
      - { name: expired_under_policy_version_id, logical_type: uuid, required: true, unique: false, references: "RetentionPolicyVersion.retention_policy_version_id", allowed_values: [], default: null, min: null, max: null, constraints: "Policy evidence." }
      - { name: expired_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Expiry execution time." }
      - { name: identity_sha256, logical_type: sha256, required: true, unique: false, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Checksum of minimal identity metadata." }
    constraints:
      - id: EC-AE17-01
        statement: "A tombstone contains no actor, action, resource, provenance, or payload fields beyond the minimum identity and cutoff evidence."
      - id: EC-AE17-02
        statement: "Ingestion, replay, projection, rollback, and restore reject an event_id with an applicable tombstone."

  - id: AE18
    name: OperatorControlRequest
    description: "Versioned, idempotent record of an accepted or denied privileged U10 control attempt with current authority evidence."
    storage_role: postgresql-authoritative-u10-control
    lifecycle: append-audited-state
    attributes:
      - { name: operator_control_request_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Control request row identity." }
      - { name: control_series_id, logical_type: uuid, required: true, unique: false, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Stable logical control identity across revisions." }
      - { name: request_version, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: "Control request version identity." }
      - { name: control_type, logical_type: enum, required: true, unique: false, references: null, allowed_values: [replay, retention, quarantine_repair, cross_tenant_investigation, recovery_activation, tenant_route_cutover], default: null, min: null, max: null, constraints: "Narrow allowlist of privileged operations." }
      - { name: operator_subject_id, logical_type: opaque_identifier, required: true, unique: false, references: "external:IdentityAccess.UserAccount.account_id-or-workload-subject", allowed_values: [], default: null, min: 1, max: 200, constraints: "Current authenticated operator identity reference." }
      - { name: operator_identity_type, logical_type: enum, required: true, unique: false, references: null, allowed_values: [user, workload], default: null, min: null, max: null, constraints: "Identity class." }
      - { name: granted_scopes, logical_type: "set<bounded_string>", required: true, unique: false, references: "external:IdentityAccess.machine-or-user-scopes", allowed_values: [], default: [], min: 1, max: 20, constraints: "Only scopes required by control_type are retained." }
      - { name: authority_policy_version, logical_type: bounded_string, required: true, unique: false, references: "external:IdentityAccess.authorization-policy.version", allowed_values: [], default: null, min: 1, max: 100, constraints: "Expected current policy version." }
      - { name: target_retailer_id, logical_type: uuid, required: false, unique: false, references: "external:TenantDirectory.Retailer.retailer_id", allowed_values: [], default: null, min: null, max: null, constraints: "Required except for explicitly authorized cross-tenant investigation." }
      - { name: idempotency_key, logical_type: bounded_string, required: true, unique: true, references: null, allowed_values: [], default: null, min: 16, max: 128, constraints: "Control idempotency key." }
      - { name: request_sha256, logical_type: sha256, required: true, unique: false, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Safe canonical request hash; no raw query or payload." }
      - { name: correlation_id, logical_type: uuid, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Self-audit correlation." }
      - { name: authority_decision, logical_type: enum, required: true, unique: false, references: null, allowed_values: [accepted, denied], default: null, min: null, max: null, constraints: "Denied requests create self-audit but no privileged child operation." }
      - { name: status, logical_type: enum, required: true, unique: false, references: null, allowed_values: [accepted, denied, running, completed, failed, cancelled], default: null, min: null, max: null, constraints: "Current control state." }
      - { name: requested_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Attempt time." }
      - { name: row_version, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: "Optimistic concurrency token." }
    constraints:
      - id: EC-AE18-01
        statement: "The composite tuple control_series_id, request_version is unique."
      - id: EC-AE18-02
        statement: "A matching idempotency_key with a different request_sha256 is rejected as conflict."
      - id: EC-AE18-03
        statement: "Tenant roles alone never satisfy authority for any control_type."

  - id: AE19
    name: OperatorControlAuditEntry
    description: "Append-only self-audit entry for accepted, denied, failed, and completed U10 control attempts."
    storage_role: postgresql-authoritative-u10-self-audit
    lifecycle: append-only-retained-business-audit
    attributes:
      - { name: operator_control_audit_entry_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Self-audit identity." }
      - { name: operator_control_request_id, logical_type: uuid, required: true, unique: false, references: "OperatorControlRequest.operator_control_request_id", allowed_values: [], default: null, min: null, max: null, constraints: "Audited control request." }
      - { name: entry_sequence, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: null, min: 1, max: null, constraints: "Monotonic within the request." }
      - { name: event_type, logical_type: enum, required: true, unique: false, references: null, allowed_values: [control_accepted, control_denied, control_started, control_failed, control_completed, control_cancelled], default: null, min: null, max: null, constraints: "Self-audit lifecycle event." }
      - { name: operator_subject_id, logical_type: opaque_identifier, required: true, unique: false, references: "OperatorControlRequest.operator_subject_id", allowed_values: [], default: null, min: 1, max: 200, constraints: "Actor reference." }
      - { name: target_retailer_id, logical_type: uuid, required: false, unique: false, references: "OperatorControlRequest.target_retailer_id", allowed_values: [], default: null, min: null, max: null, constraints: "Tenant scope where applicable." }
      - { name: safe_outcome_code, logical_type: bounded_string, required: true, unique: false, references: null, allowed_values: [], default: null, min: 1, max: 120, constraints: "Stable result code only." }
      - { name: correlation_id, logical_type: uuid, required: true, unique: false, references: "OperatorControlRequest.correlation_id", allowed_values: [], default: null, min: null, max: null, constraints: "Correlation boundary." }
      - { name: occurred_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Self-audit event time." }
      - { name: entry_sha256, logical_type: sha256, required: true, unique: false, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Tamper-evident canonical entry checksum." }
    constraints:
      - id: EC-AE19-01
        statement: "The composite tuple operator_control_request_id, entry_sequence is unique."
      - id: EC-AE19-02
        statement: "Entries cannot be updated or deleted by runtime roles and contain no raw control payload or query results."

  - id: AE20
    name: OperatorControlOutboxEntry
    description: "Transactional outbox entry paired with a U10 self-audit entry for durable publication to operator evidence consumers."
    storage_role: postgresql-authoritative-u10-outbox
    lifecycle: immutable-message-with-publication-state
    attributes:
      - { name: operator_control_outbox_entry_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Outbox row identity." }
      - { name: operator_control_audit_entry_id, logical_type: uuid, required: true, unique: true, references: "OperatorControlAuditEntry.operator_control_audit_entry_id", allowed_values: [], default: null, min: null, max: null, constraints: "Exactly one message per self-audit entry." }
      - { name: message_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Publication idempotency identity." }
      - { name: message_type, logical_type: bounded_string, required: true, unique: false, references: null, allowed_values: [audit-evidence.control.recorded], default: audit-evidence.control.recorded, min: 1, max: 120, constraints: "U10-owned self-audit event type." }
      - { name: schema_version, logical_type: semantic_version, required: true, unique: false, references: null, allowed_values: [], default: 1.0.0, min: null, max: 32, constraints: "Immutable published schema version." }
      - { name: safe_message_sha256, logical_type: sha256, required: true, unique: false, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Checksum of allowlisted publication fields." }
      - { name: publication_state, logical_type: enum, required: true, unique: false, references: null, allowed_values: [pending, published, failed], default: pending, min: null, max: null, constraints: "Publication retry state; self-audit durability does not depend on delivery." }
      - { name: attempt_count, logical_type: nonnegative_integer, required: true, unique: false, references: null, allowed_values: [], default: 0, min: 0, max: null, constraints: "Bounded relay attempts." }
      - { name: occurred_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Message creation time." }
      - { name: published_at, logical_type: timestamp_utc, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Present only when published." }
      - { name: row_version, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: "Optimistic concurrency token for relay state only." }
    constraints:
      - id: EC-AE20-01
        statement: "The immutable message identity and body checksum never change; only publication_state, attempt_count, published_at, and row_version may advance."
      - id: EC-AE20-02
        statement: "Creation is atomic with OperatorControlAuditEntry."

  - id: AE21
    name: AuditQueryDescriptor
    description: "Transient authorized description of a bounded tenant business-audit query or privileged operator investigation; it never contains an index locator."
    storage_role: transient-value-object
    lifecycle: request-scoped
    attributes:
      - { name: query_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Request correlation identity." }
      - { name: query_mode, logical_type: enum, required: true, unique: false, references: null, allowed_values: [tenant_business_audit, operator_investigation], default: tenant_business_audit, min: null, max: null, constraints: "Determines authorization and scope rules." }
      - { name: retailer_id, logical_type: uuid, required: false, unique: false, references: "external:TenantDirectory.Retailer.retailer_id", allowed_values: [], default: null, min: null, max: null, constraints: "Required for tenant mode; operator mode may use one retailer or an explicitly authorized bounded set." }
      - { name: authorized_retailer_ids, logical_type: "set<uuid>", required: true, unique: false, references: "external:TenantDirectory.current-memberships", allowed_values: [], default: [], min: 1, max: 100, constraints: "Server-resolved current authority, never trusted from client input." }
      - { name: from_occurred_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Inclusive bounded start." }
      - { name: to_occurred_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Exclusive bounded end after start." }
      - { name: actor_subject_id, logical_type: opaque_identifier, required: false, unique: false, references: null, allowed_values: [], default: null, min: 1, max: 200, constraints: "Optional exact filter." }
      - { name: action, logical_type: bounded_string, required: false, unique: false, references: null, allowed_values: [], default: null, min: 1, max: 120, constraints: "Optional allowlisted exact filter." }
      - { name: resource_type, logical_type: bounded_string, required: false, unique: false, references: null, allowed_values: [], default: null, min: 1, max: 120, constraints: "Optional exact filter." }
      - { name: resource_id, logical_type: opaque_identifier, required: false, unique: false, references: null, allowed_values: [], default: null, min: 1, max: 200, constraints: "Optional exact filter." }
      - { name: outcome, logical_type: enum, required: false, unique: false, references: null, allowed_values: [accepted, denied, failed], default: null, min: null, max: null, constraints: "Optional exact filter." }
      - { name: producer_service, logical_type: bounded_string, required: false, unique: false, references: null, allowed_values: [], default: null, min: 1, max: 80, constraints: "Optional exact filter." }
      - { name: correlation_id, logical_type: uuid, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Optional correlation filter." }
      - { name: page_size, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: null, min: 1, max: "deployment_limit", constraints: "Bounded server-configured maximum." }
      - { name: continuation_token_sha256, logical_type: sha256, required: false, unique: false, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Opaque signed token represented as a safe digest in evidence; clients cannot alter route or scope." }
      - { name: requested_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Authority is rechecked at this request." }
    constraints:
      - id: EC-AE21-01
        statement: "Tenant mode requires exactly one retailer_id contained in authorized_retailer_ids and cannot request operator telemetry or cross-tenant results."
      - id: EC-AE21-02
        statement: "Operator mode requires an accepted cross_tenant_investigation OperatorControlRequest when more than one retailer is included."
      - id: EC-AE21-03
        statement: "Sort order is occurred_at ascending or descending with event_id as the deterministic tie-breaker."

  - id: AE22
    name: ProjectionFreshnessDescriptor
    description: "Request-scoped freshness and availability metadata returned with every audit query page."
    storage_role: derived-value-object
    lifecycle: request-scoped
    attributes:
      - { name: freshness_descriptor_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Descriptor identity." }
      - { name: query_id, logical_type: uuid, required: true, unique: true, references: "AuditQueryDescriptor.query_id", allowed_values: [], default: null, min: null, max: null, constraints: "One freshness descriptor per query response page." }
      - { name: tenant_audit_route_id, logical_type: uuid, required: true, unique: false, references: "TenantAuditRoute.tenant_audit_route_id", allowed_values: [], default: null, min: null, max: null, constraints: "Server-resolved route." }
      - { name: projection_generation_id, logical_type: uuid, required: true, unique: false, references: "ProjectionGeneration.projection_generation_id", allowed_values: [], default: null, min: null, max: null, constraints: "Generation that served results." }
      - { name: latest_checkpoint_id, logical_type: uuid, required: false, unique: false, references: "ProjectionCheckpoint.projection_checkpoint_id", allowed_values: [], default: null, min: null, max: null, constraints: "Absent only when no checkpoint exists." }
      - { name: availability, logical_type: enum, required: true, unique: false, references: null, allowed_values: [current, stale, rebuilding, unavailable, route_blocked], default: null, min: null, max: null, constraints: "Unavailable states are explicit and never silently partial." }
      - { name: latest_event_accepted_at, logical_type: timestamp_utc, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Latest eligible retained event known to U10." }
      - { name: projected_through_accepted_at, logical_type: timestamp_utc, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Latest eligible event covered by serving generation." }
      - { name: lag_seconds, logical_type: nonnegative_decimal, required: false, unique: false, references: null, allowed_values: [], default: null, min: 0, max: null, constraints: "Null when lag cannot be established; threshold is deployment configuration." }
      - { name: evaluated_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Freshness evaluation time." }
      - { name: safe_unavailable_code, logical_type: bounded_string, required: false, unique: false, references: null, allowed_values: [], default: null, min: 1, max: 120, constraints: "Required when availability is unavailable or route_blocked." }
    constraints:
      - id: EC-AE22-01
        statement: "availability current requires an active route, active generation, valid checkpoint, and lag within the configured threshold."
      - id: EC-AE22-02
        statement: "A stale, rebuilding, unavailable, or route_blocked descriptor cannot be represented as complete current results."

  - id: AE23
    name: OperationalTelemetryReference
    description: "Disposable operator-only OpenSearch correlation record linking bounded telemetry identifiers to business audit or operational jobs without copying sensitive bodies."
    storage_role: opensearch-operational-telemetry-projection
    lifecycle: rebuildable-or-loss-tolerant-seven-day-default
    attributes:
      - { name: telemetry_reference_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Telemetry projection identity." }
      - { name: telemetry_kind, logical_type: enum, required: true, unique: false, references: null, allowed_values: [log, trace, metric_event], default: null, min: null, max: null, constraints: "Operational stream class." }
      - { name: service_name, logical_type: bounded_string, required: true, unique: false, references: null, allowed_values: [], default: null, min: 1, max: 80, constraints: "Bounded low-cardinality service identity." }
      - { name: retailer_id, logical_type: uuid, required: false, unique: false, references: "external:TenantDirectory.Retailer.retailer_id", allowed_values: [], default: null, min: null, max: null, constraints: "Correlation context only; operator access is still required." }
      - { name: event_id, logical_type: uuid, required: false, unique: false, references: "DerivedAuditEvent.event_id", allowed_values: [], default: null, min: null, max: null, constraints: "Optional business-audit correlation." }
      - { name: correlation_id, logical_type: uuid, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Optional request correlation." }
      - { name: causation_id, logical_type: uuid, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Optional causal correlation." }
      - { name: job_id, logical_type: opaque_identifier, required: false, unique: false, references: "external:producer-job.id", allowed_values: [], default: null, min: 1, max: 200, constraints: "Optional job reference only." }
      - { name: trace_id, logical_type: bounded_string, required: false, unique: false, references: "external:OpenTelemetry.trace-id", allowed_values: [], default: null, min: 16, max: 64, constraints: "Bounded trace identifier." }
      - { name: safe_event_code, logical_type: bounded_string, required: true, unique: false, references: null, allowed_values: [], default: null, min: 1, max: 120, constraints: "Structured code instead of message text." }
      - { name: loss_state, logical_type: enum, required: true, unique: false, references: null, allowed_values: [recorded, sampled, dropped_buffer_full, dropped_sink_unavailable], default: recorded, min: null, max: null, constraints: "Telemetry loss is explicit." }
      - { name: occurred_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Operational event time." }
      - { name: expires_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: "occurred_at plus configured operational retention", min: null, max: null, constraints: "Defaults to seven days under RetentionPolicyVersion." }
    constraints:
      - id: EC-AE23-01
        statement: "At least one of event_id, correlation_id, causation_id, job_id, or trace_id is present."
      - id: EC-AE23-02
        statement: "The record contains no log message body, stack payload, credential, token, document text, prompt, or hidden reasoning."
      - id: EC-AE23-03
        statement: "Telemetry write failure or loss cannot roll back or suppress producer business audit or business work."

  - id: AE24
    name: RecoveryEvidenceManifest
    description: "Revision-bound safe evidence for restore, replay, projection rebuild, retention reconciliation, tenant movement, and reviewer verification."
    storage_role: postgresql-derived-evidence
    lifecycle: append-only-versioned
    attributes:
      - { name: recovery_evidence_manifest_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Manifest row identity." }
      - { name: manifest_series_id, logical_type: uuid, required: true, unique: false, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Stable logical evidence identity." }
      - { name: manifest_version, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: "Manifest version identity." }
      - { name: revision_sha, logical_type: git_commit_sha, required: true, unique: false, references: "external:C19.revision", allowed_values: [], default: null, min: 40, max: 40, constraints: "Immutable demonstrated revision." }
      - { name: environment_manifest_sha256, logical_type: sha256, required: true, unique: false, references: "external:C19.environment", allowed_values: [], default: null, min: 64, max: 64, constraints: "Environment evidence checksum." }
      - { name: retailer_id, logical_type: uuid, required: false, unique: false, references: "external:TenantDirectory.Retailer.retailer_id", allowed_values: [], default: null, min: null, max: null, constraints: "Optional tenant scope; null only for explicitly operator-wide evidence." }
      - { name: placement_generation, logical_type: positive_integer, required: false, unique: false, references: "external:TenantDirectory.RetailerPlacement.generation", allowed_values: [], default: null, min: 1, max: null, constraints: "Required for tenant restore or movement evidence." }
      - { name: projection_generation_ids, logical_type: "list<uuid>", required: true, unique: false, references: "ProjectionGeneration.projection_generation_id", allowed_values: [], default: [], min: 1, max: 100, constraints: "Referenced generation identities only." }
      - { name: checkpoint_ids, logical_type: "list<uuid>", required: true, unique: false, references: "ProjectionCheckpoint.projection_checkpoint_id", allowed_values: [], default: [], min: 1, max: 1000, constraints: "Referenced checkpoint identities only." }
      - { name: replay_request_ids, logical_type: "list<uuid>", required: false, unique: false, references: "ReplayRequest.replay_request_id", allowed_values: [], default: [], min: 0, max: 100, constraints: "Applicable replay versions." }
      - { name: retention_run_ids, logical_type: "list<uuid>", required: true, unique: false, references: "RetentionRun.retention_run_id", allowed_values: [], default: [], min: 1, max: 100, constraints: "Applicable retention evidence." }
      - { name: inbox_event_count, logical_type: nonnegative_integer, required: true, unique: false, references: null, allowed_values: [], default: 0, min: 0, max: null, constraints: "Retained admitted inbox count." }
      - { name: projected_event_count, logical_type: nonnegative_integer, required: true, unique: false, references: null, allowed_values: [], default: 0, min: 0, max: null, constraints: "Serving generation count." }
      - { name: retained_range_start, logical_type: timestamp_utc, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Earliest retained event time." }
      - { name: retained_range_end, logical_type: timestamp_utc, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Latest retained event time." }
      - { name: expired_through, logical_type: timestamp_utc, required: true, unique: false, references: "ExpiryWatermark.expired_through", allowed_values: [], default: null, min: null, max: null, constraints: "No-resurrection cutoff." }
      - { name: lag_seconds, logical_type: nonnegative_decimal, required: false, unique: false, references: null, allowed_values: [], default: null, min: 0, max: null, constraints: "Measured lag, or null with failure code." }
      - { name: safe_failure_codes, logical_type: "list<bounded_string>", required: false, unique: false, references: null, allowed_values: [], default: [], min: 0, max: 100, constraints: "Safe codes only." }
      - { name: redacted_query_sample_sha256s, logical_type: "list<sha256>", required: false, unique: false, references: null, allowed_values: [], default: [], min: 0, max: 100, constraints: "Hashes/checksums of separately governed redacted samples; no raw sample payload." }
      - { name: manifest_sha256, logical_type: sha256, required: true, unique: true, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Canonical manifest checksum." }
      - { name: outcome, logical_type: enum, required: true, unique: false, references: null, allowed_values: [passed, failed, limited], default: null, min: null, max: null, constraints: "Never inferred from missing evidence." }
      - { name: recorded_at, logical_type: timestamp_utc, required: true, unique: false, references: null, allowed_values: [], default: current_time, min: null, max: null, constraints: "Evidence time." }
    constraints:
      - id: EC-AE24-01
        statement: "The composite tuple manifest_series_id, manifest_version is unique."
      - id: EC-AE24-02
        statement: "Counts, ranges, checksums, versions, failures, lag, placement, and expiry evidence are bound to revision_sha and cannot claim success when reconciliation failed or was not run."
      - id: EC-AE24-03
        statement: "The manifest contains no unrestricted audit, telemetry, prompt, document, credential, or hidden-reasoning payload."

  - id: AE25
    name: TenantRouteReconciliation
    description: "Versioned evidence that a restored or moved retailer's U10 state matches the intended placement and projection route before service."
    storage_role: postgresql-derived-evidence
    lifecycle: append-only-versioned-validation
    attributes:
      - { name: tenant_route_reconciliation_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Reconciliation row identity." }
      - { name: tenant_audit_route_id, logical_type: uuid, required: true, unique: false, references: "TenantAuditRoute.tenant_audit_route_id", allowed_values: [], default: null, min: null, max: null, constraints: "Intended U10 route." }
      - { name: reconciliation_version, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: "Version identity for repeated validation." }
      - { name: retailer_id, logical_type: uuid, required: true, unique: false, references: "external:TenantDirectory.Retailer.retailer_id", allowed_values: [], default: null, min: null, max: null, constraints: "Chosen tenant." }
      - { name: prior_placement_generation, logical_type: positive_integer, required: false, unique: false, references: "external:TenantDirectory.RetailerPlacement.generation", allowed_values: [], default: null, min: 1, max: null, constraints: "Absent for clean restore without movement." }
      - { name: intended_placement_generation, logical_type: positive_integer, required: true, unique: false, references: "external:TenantDirectory.RetailerPlacement.generation", allowed_values: [], default: null, min: 1, max: null, constraints: "Generation that must serve after activation." }
      - { name: intended_projection_generation_id, logical_type: uuid, required: true, unique: false, references: "ProjectionGeneration.projection_generation_id", allowed_values: [], default: null, min: null, max: null, constraints: "Validated generation for new route." }
      - { name: expected_event_count, logical_type: nonnegative_integer, required: true, unique: false, references: null, allowed_values: [], default: 0, min: 0, max: null, constraints: "Eligible retained event count." }
      - { name: actual_event_count, logical_type: nonnegative_integer, required: true, unique: false, references: null, allowed_values: [], default: 0, min: 0, max: null, constraints: "Copied/restored eligible event count." }
      - { name: expected_sha256, logical_type: sha256, required: true, unique: false, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Expected identity/version manifest checksum." }
      - { name: actual_sha256, logical_type: sha256, required: true, unique: false, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Actual identity/version manifest checksum." }
      - { name: expiry_reconciled, logical_type: boolean, required: true, unique: false, references: null, allowed_values: [true, false], default: false, min: null, max: null, constraints: "True only when restored data honors watermarks and tombstones." }
      - { name: stale_route_rejected, logical_type: boolean, required: true, unique: false, references: null, allowed_values: [true, false], default: false, min: null, max: null, constraints: "Evidence that old placement work is rejected." }
      - { name: status, logical_type: enum, required: true, unique: false, references: null, allowed_values: [pending, passed, failed, blocked], default: pending, min: null, max: null, constraints: "Only passed can permit serving." }
      - { name: serve_allowed, logical_type: boolean, required: true, unique: false, references: null, allowed_values: [true, false], default: false, min: null, max: null, constraints: "True only for passed status and intended active route." }
      - { name: validated_at, logical_type: timestamp_utc, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Required for terminal status." }
    constraints:
      - id: EC-AE25-01
        statement: "The composite tuple tenant_audit_route_id, reconciliation_version is unique."
      - id: EC-AE25-02
        statement: "serve_allowed is true only when counts and checksums match, expiry_reconciled and stale_route_rejected are true, intended placement is current, and status is passed."

  - id: AE26
    name: EvidencePublication
    description: "Optional versioned C19 publication record exposing bounded U10 recovery and audit evidence to U13 without transferring ownership."
    storage_role: postgresql-derived-outbound-evidence
    lifecycle: optional-versioned-publication
    attributes:
      - { name: evidence_publication_id, logical_type: uuid, required: true, unique: true, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Publication row identity." }
      - { name: publication_series_id, logical_type: uuid, required: true, unique: false, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: "Stable publication identity." }
      - { name: publication_version, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: "Publication version identity." }
      - { name: recovery_evidence_manifest_id, logical_type: uuid, required: true, unique: false, references: "RecoveryEvidenceManifest.recovery_evidence_manifest_id", allowed_values: [], default: null, min: null, max: null, constraints: "Source U10 evidence." }
      - { name: c19_schema_version, logical_type: semantic_version, required: true, unique: false, references: "external:C19.evidence-manifest.schema-version", allowed_values: [], default: 1.0.0, min: null, max: 32, constraints: "Versioned handoff schema." }
      - { name: target_evidence_manifest_id, logical_type: opaque_identifier, required: false, unique: false, references: "external:DemoEvidence.EvidenceManifest.evidence_manifest_id", allowed_values: [], default: null, min: 1, max: 200, constraints: "U13 identifier reference assigned after acceptance." }
      - { name: payload_sha256, logical_type: sha256, required: true, unique: false, references: null, allowed_values: [], default: null, min: 64, max: 64, constraints: "Checksum of bounded allowlisted evidence fields." }
      - { name: status, logical_type: enum, required: true, unique: false, references: null, allowed_values: [pending, published, accepted, failed, rejected], default: pending, min: null, max: null, constraints: "Publication does not change U10 ownership or source outcome." }
      - { name: published_at, logical_type: timestamp_utc, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: "Present after publication." }
      - { name: safe_failure_code, logical_type: bounded_string, required: false, unique: false, references: null, allowed_values: [], default: null, min: 1, max: 120, constraints: "Required for failed or rejected status." }
      - { name: row_version, logical_type: positive_integer, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: "Optimistic concurrency token for delivery state." }
    constraints:
      - id: EC-AE26-01
        statement: "The composite tuple publication_series_id, publication_version is unique."
      - id: EC-AE26-02
        statement: "Publication is optional and contains no raw business-audit or operational-log payload; U13 receives bounded evidence and checksums only."

relationships:
  - id: R01
    name: admitted_receipt_records_event
    from: InboundEventReceipt
    to: DerivedAuditEvent
    cardinality: "1 to 0..1"
    direction: "InboundEventReceipt -> DerivedAuditEvent"
    constraint: "Exactly one event exists when disposition is admitted; none exists for quarantined disposition."
  - id: R02
    name: route_contains_generations
    from: TenantAuditRoute
    to: ProjectionGeneration
    cardinality: "1 to 0..many"
    direction: "TenantAuditRoute -> ProjectionGeneration"
    constraint: "Every generation belongs to one route."
  - id: R03
    name: route_selects_active_generation
    from: TenantAuditRoute
    to: ProjectionGeneration
    cardinality: "1 to 0..1 active"
    direction: "TenantAuditRoute -> ProjectionGeneration"
    constraint: "The selected generation must belong to the route and pass replay, route, count, checksum, schema, and expiry validation."
  - id: R04
    name: generation_has_checkpoints
    from: ProjectionGeneration
    to: ProjectionCheckpoint
    cardinality: "1 to 0..many"
    direction: "ProjectionGeneration -> ProjectionCheckpoint"
    constraint: "Checkpoint history is append-only and partition-versioned."
  - id: R05
    name: generation_tracks_event_projection
    from: ProjectionGeneration
    to: ProjectionEventReceipt
    cardinality: "1 to 0..many"
    direction: "ProjectionGeneration -> ProjectionEventReceipt"
    constraint: "At most one current receipt exists for each generation and event."
  - id: R06
    name: event_projects_per_generation
    from: DerivedAuditEvent
    to: ProjectionEventReceipt
    cardinality: "1 to 0..many"
    direction: "DerivedAuditEvent -> ProjectionEventReceipt"
    constraint: "One event may be projected into multiple rebuild generations."
  - id: R07
    name: projection_receipt_materializes_document
    from: ProjectionEventReceipt
    to: AuditProjectionDocument
    cardinality: "1 to 0..1"
    direction: "ProjectionEventReceipt -> AuditProjectionDocument"
    constraint: "indexed or verified has one idempotent document; skipped, failed, or dead-lettered has none."
  - id: R08
    name: quarantined_receipt_has_safe_record
    from: InboundEventReceipt
    to: QuarantineRecord
    cardinality: "1 to 0..1"
    direction: "InboundEventReceipt -> QuarantineRecord"
    constraint: "A quarantined disposition has exactly one safe quarantine record."
  - id: R09
    name: receipt_may_dead_letter
    from: InboundEventReceipt
    to: DeadLetterRecord
    cardinality: "1 to 0..many"
    direction: "InboundEventReceipt -> DeadLetterRecord"
    constraint: "Dead letters are distinguished by generation and failure stage."
  - id: R10
    name: replay_targets_generation
    from: ReplayRequest
    to: ProjectionGeneration
    cardinality: "many to 1"
    direction: "ReplayRequest -> ProjectionGeneration"
    constraint: "A request targets one non-client-selected generation."
  - id: R11
    name: replay_has_validations
    from: ReplayRequest
    to: ReplayValidation
    cardinality: "1 to 1..many"
    direction: "ReplayRequest -> ReplayValidation"
    constraint: "Only the latest passing version may authorize execution or activation."
  - id: R12
    name: replay_may_collect_producer_receipts
    from: ReplayRequest
    to: ProducerReplayReceipt
    cardinality: "1 to 0..many"
    direction: "ReplayRequest -> ProducerReplayReceipt"
    constraint: "Receipts exist only for producer_republication source mode."
  - id: R13
    name: dead_letter_may_be_replayed
    from: DeadLetterRecord
    to: ReplayRequest
    cardinality: "many to 0..1"
    direction: "DeadLetterRecord -> ReplayRequest"
    constraint: "A replay requires eligible state and operator control; one request may cover many dead letters."
  - id: R14
    name: policy_versions_supersede
    from: RetentionPolicyVersion
    to: RetentionPolicyVersion
    cardinality: "0..1 prior to 0..many successors"
    direction: "RetentionPolicyVersion -> RetentionPolicyVersion"
    constraint: "The supersedes chain is acyclic."
  - id: R15
    name: policy_drives_runs
    from: RetentionPolicyVersion
    to: RetentionRun
    cardinality: "1 to 0..many"
    direction: "RetentionPolicyVersion -> RetentionRun"
    constraint: "Every run pins one immutable policy version."
  - id: R16
    name: run_collects_producer_receipts
    from: RetentionRun
    to: ProducerRetentionReceipt
    cardinality: "1 to 1..many"
    direction: "RetentionRun -> ProducerRetentionReceipt"
    constraint: "Each required producer contributes at most one receipt."
  - id: R17
    name: run_records_watermarks
    from: RetentionRun
    to: ExpiryWatermark
    cardinality: "1 to 1..many"
    direction: "RetentionRun -> ExpiryWatermark"
    constraint: "Watermarks cover each applicable retailer and producer scope."
  - id: R18
    name: run_records_tombstones
    from: RetentionRun
    to: ExpiryTombstone
    cardinality: "1 to 0..many"
    direction: "RetentionRun -> ExpiryTombstone"
    constraint: "Tombstones are durable before corresponding derived rows or projection documents are removed."
  - id: R19
    name: tombstone_blocks_event_identity
    from: ExpiryTombstone
    to: DerivedAuditEvent
    cardinality: "many historical to 0..1 retained"
    direction: "ExpiryTombstone -> DerivedAuditEvent"
    constraint: "Historical identity relationship survives event deletion and prohibits re-admission."
  - id: R20
    name: operator_control_authorizes_replay
    from: OperatorControlRequest
    to: ReplayRequest
    cardinality: "1 to 0..1"
    direction: "OperatorControlRequest -> ReplayRequest"
    constraint: "Only an accepted replay control creates a replay request."
  - id: R21
    name: operator_control_authorizes_retention
    from: OperatorControlRequest
    to: RetentionRun
    cardinality: "1 to 0..1"
    direction: "OperatorControlRequest -> RetentionRun"
    constraint: "Only an accepted retention control creates a run."
  - id: R22
    name: operator_control_repairs_quarantine
    from: OperatorControlRequest
    to: QuarantineRecord
    cardinality: "1 to 0..many"
    direction: "OperatorControlRequest -> QuarantineRecord"
    constraint: "An accepted quarantine_repair control may release bounded records to normal reingestion."
  - id: R23
    name: control_has_self_audit
    from: OperatorControlRequest
    to: OperatorControlAuditEntry
    cardinality: "1 to 1..many"
    direction: "OperatorControlRequest -> OperatorControlAuditEntry"
    constraint: "Accepted, denied, failed, completed, and cancelled outcomes are append-only."
  - id: R24
    name: self_audit_has_outbox
    from: OperatorControlAuditEntry
    to: OperatorControlOutboxEntry
    cardinality: "1 to 1"
    direction: "OperatorControlAuditEntry -> OperatorControlOutboxEntry"
    constraint: "Both are created atomically."
  - id: R25
    name: query_uses_server_route
    from: AuditQueryDescriptor
    to: TenantAuditRoute
    cardinality: "many to 1..many"
    direction: "AuditQueryDescriptor -> TenantAuditRoute"
    constraint: "Tenant mode resolves one current route; operator mode resolves only routes inside current privileged scope."
  - id: R26
    name: query_returns_freshness
    from: AuditQueryDescriptor
    to: ProjectionFreshnessDescriptor
    cardinality: "1 to 1"
    direction: "AuditQueryDescriptor -> ProjectionFreshnessDescriptor"
    constraint: "Freshness and explicit unavailability accompany every page."
  - id: R27
    name: telemetry_correlates_to_event
    from: OperationalTelemetryReference
    to: DerivedAuditEvent
    cardinality: "many to 0..1"
    direction: "OperationalTelemetryReference -> DerivedAuditEvent"
    constraint: "Correlation is identifier-only and telemetry remains separate, disposable, and operator-only."
  - id: R28
    name: route_has_reconciliations
    from: TenantAuditRoute
    to: TenantRouteReconciliation
    cardinality: "1 to 0..many"
    direction: "TenantAuditRoute -> TenantRouteReconciliation"
    constraint: "Restore or movement requires a passing current reconciliation before serving."
  - id: R29
    name: recovery_manifest_cites_route_reconciliation
    from: RecoveryEvidenceManifest
    to: TenantRouteReconciliation
    cardinality: "many to 0..many"
    direction: "RecoveryEvidenceManifest -> TenantRouteReconciliation"
    constraint: "Referenced by identifiers and checksums in the bounded evidence package."
  - id: R30
    name: recovery_manifest_cites_generation
    from: RecoveryEvidenceManifest
    to: ProjectionGeneration
    cardinality: "many to 1..many"
    direction: "RecoveryEvidenceManifest -> ProjectionGeneration"
    constraint: "Manifest records the exact validated generation identities."
  - id: R31
    name: recovery_manifest_may_publish
    from: RecoveryEvidenceManifest
    to: EvidencePublication
    cardinality: "1 to 0..many"
    direction: "RecoveryEvidenceManifest -> EvidencePublication"
    constraint: "C19 publication is optional and does not transfer U10 ownership."
```

## Readable Summary

U10 keeps two durable ingestion records: `InboundEventReceipt` proves idempotent receipt, while `DerivedAuditEvent` stores only the validated, allowlisted copy needed to rebuild search. The producer's audit row and business meaning remain authoritative. Event identity is global, producer-stream ordering is local to the declared stream, and cross-stream search uses `occurred_at` plus `event_id` as a deterministic display order.

Each retailer is served through a versioned `TenantAuditRoute` tied to its placement generation. Rebuilds create a new `ProjectionGeneration`, write idempotent per-event receipts and append-only checkpoints, validate counts/checksums/schema/route/expiry, and switch the route only after the new generation is ready. OpenSearch documents are disposable. Tenant queries carry bounded filters and a freshness descriptor; callers never select an index. Operator investigations use a distinct privileged path.

Unsafe or incompatible deliveries retain only hashes, safe codes, and bounded field names in quarantine or dead-letter state. Replays are operator-controlled, versioned, bounded, and validated. A missing or corrupt retained range may be republished only through a producer-owned replay contract, whose receipt still does not bypass ordinary C15 admission.

Retention is coordinated by one immutable policy version and cutoff. Producers delete authoritative audit data behind their own privileged boundaries and return receipts; U10 then expires eligible derived rows and projections while preserving monotonic watermarks and minimal event tombstones. Restore, rollback, replay, and projection activation must honor those markers, preventing expired events from returning.

U10's own replay, retention, quarantine, recovery, route, and cross-tenant controls have an authoritative local self-audit and transactional outbox. Operational telemetry remains in a separate operator-only, disposable stream with bounded correlation identifiers and a configurable seven-day default. Recovery evidence is revision-bound and can optionally be published to U13 through C19 using identifiers, versions, counts, checksums, safe failure codes, and redacted-sample hashes only.

## Sources

- `inception/units-generation/unit-of-work.md` — U10 ownership, standalone projection/query boundary, derived-state constraint, and retention/telemetry responsibilities.
- `inception/units-generation/unit-of-work-story-map.md` — the 33 U10-assigned stories and local order.
- `inception/requirements-analysis/requirements.md` — FR17, FR17.1, FR18, FR20, NFR3, NFR4, NFR7-NFR11, NFR15, C3, C5, OQ5, OQ6, and OQ10.
- `inception/user-stories/stories.md` — assigned acceptance criteria for US2.2, US2.5, US3.3, US4.5, US5.2, US5.4, US6.2-US6.6, US7.5, US7.9, US7.10, US7.12, US8.1-US8.5, US8.8, US9.1-US9.10, US10.1, and US10.2.
- `inception/domain-design/components.md` — AuditEvidence responsibilities, dependencies, initial entity seeds, ownership, rebuildability, and placement-generation seam.
- `inception/contract-design/contract-summary.md` — C15 message identity/envelope and delivery behavior, C17/C18 query composition, C19 evidence handoff, authority/privacy/tenancy invariants, compatibility, and retry profiles.
- `construction/audit-evidence/functional-design/functional-design-questions.md` — confirmed choices for durable ingestion, ordering, routing, query freshness, safe quarantine/DLQ handling, rebuild, retention, telemetry, operator controls, recovery, and optional C19 publication.

## Assumptions & Open Questions

- OQ6 still owns numeric retry counts, backoff, consumer deadline, queue/backlog capacity, DLQ retention, replay batch size, telemetry buffer limits, and projection-lag thresholds. Every related field is bounded by configuration even while the number remains unresolved.
- OQ5 and OQ10 still own recovery objectives, backup frequency and expiry, persistent-disk limits, retention-maintenance schedule, and tolerated expiry lag. A restored route remains blocked until those policies and the recorded expiry state reconcile.
- OpenSearch rollover, shard, replica, and resource settings are deferred to NFR and infrastructure design and must fit the accepted 16 GB RAM and 3 CPU cluster envelope.
- Exact Platform Operator scopes, identity shape, retry-policy schema, producer replay/retention contract bodies, and control API request schemas remain contract refinements. They cannot weaken current authority, idempotency, tenant, placement-generation, retention, or prohibited-content constraints.
- The producer stream contract must require either aggregate version or producer sequence for every admitted event. The entity model normalizes that choice into `stream_order_kind` and `stream_order_value`; C15 must be refined before implementation to carry those fields and the producer authoritative audit-record reference.
- Boundary inclusivity for retention cutoffs must be fixed consistently in producer contracts, U10 routines, OpenSearch deletion, replay, and backup reconciliation. This model uses `expired_through` as inclusive and query upper bounds as exclusive.
- `EvidencePublication` is optional. If C19 publication is not implemented in the first increment, `RecoveryEvidenceManifest` remains U10-owned evidence available through an authorized pull boundary.
