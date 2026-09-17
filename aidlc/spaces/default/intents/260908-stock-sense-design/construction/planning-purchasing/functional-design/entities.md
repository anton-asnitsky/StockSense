# Planning and Purchasing Entity Model

The fenced YAML block is the source of truth for the Planning/Purchasing entity model. It describes logical ownership and invariants only; it does not prescribe tables, document shapes, language types, or persistence technology.

```yaml
model:
  name: PlanningPurchasing
  unit: u8-planning-purchasing
  version: 1.0.0
  authority:
    - "Replenishment owns planning policies, supplier preferences, review admission, review evidence, scenarios, recommendations, and manual-review quota."
    - "Purchasing owns proposals, submitted commercial lines, manager decisions, orders, inbound commitments, cancellations, and receipts."
    - "Retail Data remains authoritative for products, on-hand inventory, stock movements, stores, retailers, memberships, and placement routing."
    - "Forecasting remains authoritative for forecast series, status, freshness, and forecast provenance."
    - "Supplier Knowledge remains authoritative for suppliers and accepted supplier-term revisions."
    - "Shared persistence support records command idempotency, immutable business audit, and durable message delivery without becoming a business authority."
  universal_invariants:
    - "Every persisted record carries retailer_id; child records must match the retailer of their aggregate root."
    - "Every aggregate root and immutable fact carries the placement_generation under which it was admitted; stale placement generations are rejected before disclosure or mutation."
    - "Cross-domain and cross-unit references are identifiers plus pinned versions obtained through governed contracts; they do not imply storage access."
    - "Mutable aggregates use a positive version for optimistic concurrency. Immutable facts are append-only and retain their complete provenance."
    - "Accepted mutations atomically append the required BusinessAuditRecord and OutboxMessage. Rejected attempts use an audit path that survives rollback of the rejected business mutation."
    - "Redis and downstream search/vector projections are disposable and are not represented as authoritative entities in this model."

logical_domains:
  - name: Replenishment
    purpose: "Admit and serialize reviews, pin evidence, calculate deterministic advice, compare scenarios, and enforce policy and quota."
    aggregate_roots:
      - PlanningPolicy
      - PreferredSupplierTermReference
      - ReviewJob
      - ManualReviewAllowance
      - ReplenishmentScenario
      - ReplenishmentRecommendation
      - ReviewPointer
  - name: Purchasing
    purpose: "Turn authorized planning evidence into human-governed purchase proposals, approved orders, dated inbound commitments, and receipts."
    aggregate_roots:
      - PurchaseProposal
      - PurchaseOrder
      - Receipt
  - name: SharedPersistenceSupport
    purpose: "Preserve payload-bound command idempotency, authoritative audit, and reliable asynchronous delivery for both logical domains."
    aggregate_roots:
      - IdempotencyRecord
      - BusinessAuditRecord
      - OutboxMessage
      - InboxMessage

entities:
  - name: PlanningPolicy
    logical_domain: Replenishment
    aggregate: PlanningPolicy
    aggregate_role: root
    description: "One immutable version of the retailer-wide replenishment policy."
    immutable: true
    attributes:
      - { name: planning_policy_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: ["stable identity for this policy version"] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: ["must match current authorized retailer"] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: ["must be current when the version is created"] }
      - { name: policy_version, logical_type: PositiveInteger, required: true, unique: "retailer_id + policy_version", references: null, allowed_values: [], default: null, min: 1, max: null, constraints: ["monotonically increases per retailer"] }
      - { name: retailer_buffer_days, logical_type: Integer, required: true, unique: false, references: null, allowed_values: [], default: 7, min: 0, max: 28, constraints: ["calendar days"] }
      - { name: effective_from, logical_type: UTCInstant, required: true, unique: false, references: null, allowed_values: [], default: command_time, min: null, max: null, constraints: ["versions for a retailer have an unambiguous effective order"] }
      - { name: changed_by_actor_id, logical_type: ActorIdentifier, required: true, unique: false, references: IdentityAccess.Actor, allowed_values: [], default: null, min: null, max: null, constraints: ["actor must have current Manager authority"] }
      - { name: provenance_id, logical_type: UUID, required: true, unique: false, references: BusinessAuditRecord.business_audit_id, allowed_values: [], default: null, min: null, max: null, constraints: ["identifies the accepted policy-change evidence"] }
    constraints:
      - "There is exactly one effective policy version per retailer at an instant."
      - "Changing a policy appends a new version and never rewrites a version already used by a review."

  - name: ProductPlanningOverride
    logical_domain: Replenishment
    aggregate: PlanningPolicy
    aggregate_role: child
    description: "An optional product-specific buffer value within a policy version."
    immutable: true
    attributes:
      - { name: product_planning_override_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: ["must equal parent retailer"] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: ["must equal parent placement generation"] }
      - { name: planning_policy_id, logical_type: UUID, required: true, unique: "planning_policy_id + product_id", references: PlanningPolicy.planning_policy_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: product_id, logical_type: UUID, required: true, unique: false, references: Inventory.Product, allowed_values: [], default: null, min: null, max: null, constraints: ["product must belong to retailer"] }
      - { name: buffer_days, logical_type: Integer, required: true, unique: false, references: null, allowed_values: [], default: null, min: 0, max: 28, constraints: ["zero is an explicit override and is distinct from absence"] }
    constraints:
      - "At most one override exists for a product in one policy version."
      - "Absence means inherit PlanningPolicy.retailer_buffer_days; an explicit zero never inherits."

  - name: PreferredSupplierTermReference
    logical_domain: Replenishment
    aggregate: PreferredSupplierTermReference
    aggregate_role: root
    description: "A Manager-selected, versioned reference to the accepted supplier term used by automatic reviews for one product."
    immutable: true
    attributes:
      - { name: preferred_term_reference_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: ["must match product and accepted term retailer"] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: [] }
      - { name: preference_version, logical_type: PositiveInteger, required: true, unique: "retailer_id + product_id + preference_version", references: null, allowed_values: [], default: null, min: 1, max: null, constraints: ["monotonically increases per retailer product"] }
      - { name: product_id, logical_type: UUID, required: true, unique: false, references: Inventory.Product, allowed_values: [], default: null, min: null, max: null, constraints: ["product must belong to retailer"] }
      - { name: supplier_id, logical_type: UUID, required: true, unique: false, references: SupplierKnowledge.Supplier, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: accepted_supplier_term_revision_id, logical_type: UUID, required: true, unique: false, references: SupplierKnowledge.AcceptedSupplierTerm.revision_id, allowed_values: [], default: null, min: null, max: null, constraints: ["must be accepted and effective when selected"] }
      - { name: effective_from, logical_type: UTCInstant, required: true, unique: false, references: null, allowed_values: [], default: command_time, min: null, max: null, constraints: [] }
      - { name: superseded_at, logical_type: UTCInstant, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: ["null only for the current preference"] }
      - { name: selected_by_actor_id, logical_type: ActorIdentifier, required: true, unique: false, references: IdentityAccess.Actor, allowed_values: [], default: null, min: null, max: null, constraints: ["actor must have current Manager authority"] }
      - { name: provenance_id, logical_type: UUID, required: true, unique: false, references: BusinessAuditRecord.business_audit_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
    constraints:
      - "At most one non-superseded preferred term exists per retailer product."
      - "Automatic reviews require a current usable preference and pin this reference plus the exact accepted-term revision."
      - "Scenario selection of another accepted term does not modify this preference."

  - name: ReviewJob
    logical_domain: Replenishment
    aggregate: ReviewJob
    aggregate_role: root
    description: "An admitted scheduled or manual replenishment review with a stable identity across retries."
    immutable: false
    attributes:
      - { name: review_job_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: ["pinned at admission and rechecked before work or disclosure"] }
      - { name: version, logical_type: PositiveInteger, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: ["optimistic concurrency token"] }
      - { name: trigger, logical_type: ReviewTrigger, required: true, unique: false, references: null, allowed_values: [Scheduled, ManualUI, ManualAssistant], default: null, min: null, max: null, constraints: [] }
      - { name: retailer_local_date, logical_type: LocalDate, required: true, unique: "retailer_id + trigger(Scheduled) + retailer_local_date", references: null, allowed_values: [], default: null, min: null, max: null, constraints: ["manual jobs retain their admission local date across retries"] }
      - { name: due_at, logical_type: UTCInstant, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: ["required for Scheduled; represents retailer-local 08:00 under the pinned calendar mapping"] }
      - { name: status, logical_type: ReviewStatus, required: true, unique: false, references: null, allowed_values: [Queued, Active, Succeeded, PartiallySucceeded, Failed], default: Queued, min: null, max: null, constraints: [] }
      - { name: accepted_at, logical_type: UTCInstant, required: true, unique: false, references: null, allowed_values: [], default: command_time, min: null, max: null, constraints: [] }
      - { name: started_at, logical_type: UTCInstant, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: completed_at, logical_type: UTCInstant, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: ["required for terminal status"] }
      - { name: terminal_reason_code, logical_type: StableCode, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: ["required for Failed and suitable for explicit unavailable outcomes"] }
      - { name: admitted_by_actor_id, logical_type: ActorIdentifier, required: true, unique: false, references: IdentityAccess.Actor, allowed_values: [], default: null, min: null, max: null, constraints: ["may be scheduler, authorized user, or authorized assistant tool actor"] }
      - { name: correlation_id, logical_type: UUID, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: [] }
    constraints:
      - "At most one job is Active for a retailer."
      - "Exactly one Scheduled job exists for a retailer-local date; if another job is active it remains Queued and is not discarded."
      - "Scheduled jobs never consume ManualReviewAllowance."
      - "A retry creates another ReviewAttempt under this job and does not create another job or quota charge."
      - "Terminal results and their evidence are immutable even though the job pointer fields advance while work is active."

  - name: ReviewAttempt
    logical_domain: Replenishment
    aggregate: ReviewJob
    aggregate_role: child
    description: "One append-only execution attempt for an admitted review job."
    immutable: true
    attributes:
      - { name: review_attempt_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: ["must equal parent retailer"] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: ["must equal admitted job generation"] }
      - { name: review_job_id, logical_type: UUID, required: true, unique: "review_job_id + attempt_number", references: ReviewJob.review_job_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: attempt_number, logical_type: PositiveInteger, required: true, unique: false, references: null, allowed_values: [], default: null, min: 1, max: null, constraints: ["strictly increasing within a job"] }
      - { name: outcome, logical_type: ReviewAttemptOutcome, required: true, unique: false, references: null, allowed_values: [Succeeded, PartiallySucceeded, Failed], default: null, min: null, max: null, constraints: [] }
      - { name: started_at, logical_type: UTCInstant, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: completed_at, logical_type: UTCInstant, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: ["must not precede started_at"] }
      - { name: evidence_snapshot_id, logical_type: UUID, required: true, unique: false, references: ReviewEvidenceSnapshot.review_evidence_snapshot_id, allowed_values: [], default: null, min: null, max: null, constraints: ["must identify the immutable snapshot pinned by the parent job; every retry reuses it"] }
      - { name: failure_code, logical_type: StableCode, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: ["required when outcome is Failed"] }
      - { name: retry_eligible, logical_type: Boolean, required: true, unique: false, references: null, allowed_values: [true, false], default: false, min: null, max: null, constraints: [] }
      - { name: immutable_digest, logical_type: Digest, required: true, unique: false, references: null, allowed_values: [], default: calculated, min: null, max: null, constraints: ["covers attempt outcome and provenance"] }
    constraints:
      - "Attempts are never overwritten; a retry appends a new attempt."
      - "Succeeded requires recommendations for every in-scope product; PartiallySucceeded requires at least one recommendation and at least one block; Failed publishes no usable recommendation set."

  - name: ManualReviewAllowance
    logical_domain: Replenishment
    aggregate: ManualReviewAllowance
    aggregate_role: root
    description: "The authoritative shared manual-review quota for one retailer-local date."
    immutable: false
    attributes:
      - { name: manual_review_allowance_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: "retailer_id + retailer_local_date", references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: [] }
      - { name: version, logical_type: PositiveInteger, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: ["serializes concurrent admission"] }
      - { name: retailer_local_date, logical_type: LocalDate, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: accepted_count, logical_type: Integer, required: true, unique: false, references: null, allowed_values: [], default: 0, min: 0, max: 3, constraints: ["equals committed ManualReviewCharge count"] }
      - { name: limit, logical_type: PositiveInteger, required: true, unique: false, references: null, allowed_values: [], default: 3, min: 3, max: 3, constraints: ["v1 fixed functional limit"] }
      - { name: reset_at, logical_type: UTCInstant, required: true, unique: false, references: null, allowed_values: [], default: calculated, min: null, max: null, constraints: ["next retailer-local day boundary under the pinned time-zone rules"] }
      - { name: time_zone_id, logical_type: TimeZoneIdentifier, required: true, unique: false, references: TenantDirectory.Retailer.time_zone, allowed_values: [], default: null, min: null, max: null, constraints: ["pinned for local-day interpretation"] }
    constraints:
      - "Admission of a distinct manual job, its charge, job, audit, and outbox commit atomically."
      - "Pre-admission rejection creates no charge; accepted failure retains its charge."
      - "Concurrent admission cannot increase accepted_count above three."

  - name: ManualReviewCharge
    logical_domain: Replenishment
    aggregate: ManualReviewAllowance
    aggregate_role: child
    description: "Immutable proof that one accepted manual review consumed one slot on its admission local date."
    immutable: true
    attributes:
      - { name: manual_review_charge_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: ["must equal allowance and job retailer"] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: [] }
      - { name: manual_review_allowance_id, logical_type: UUID, required: true, unique: false, references: ManualReviewAllowance.manual_review_allowance_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: review_job_id, logical_type: UUID, required: true, unique: true, references: ReviewJob.review_job_id, allowed_values: [], default: null, min: null, max: null, constraints: ["job trigger must be ManualUI or ManualAssistant"] }
      - { name: slot_number, logical_type: Integer, required: true, unique: "manual_review_allowance_id + slot_number", references: null, allowed_values: [], default: null, min: 1, max: 3, constraints: [] }
      - { name: charged_at, logical_type: UTCInstant, required: true, unique: false, references: null, allowed_values: [], default: command_time, min: null, max: null, constraints: [] }
    constraints:
      - "A review job has at most one charge, including retries across local-day boundaries."
      - "Charges cannot be deleted to refund failed accepted work."

  - name: ReviewEvidenceSnapshot
    logical_domain: Replenishment
    aggregate: ReviewJob
    aggregate_role: child
    description: "The immutable review-wide envelope of all admitted input, policy, calendar, and calculation versions."
    immutable: true
    attributes:
      - { name: review_evidence_snapshot_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: ["pinned at review admission"] }
      - { name: review_job_id, logical_type: UUID, required: true, unique: true, references: ReviewJob.review_job_id, allowed_values: [], default: null, min: null, max: null, constraints: ["exactly one snapshot is pinned when the job is admitted"] }
      - { name: captured_at, logical_type: UTCInstant, required: true, unique: false, references: null, allowed_values: [], default: command_time, min: null, max: null, constraints: [] }
      - { name: review_local_date, logical_type: LocalDate, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: retailer_time_zone_id, logical_type: TimeZoneIdentifier, required: true, unique: false, references: TenantDirectory.Retailer.time_zone, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: calendar_policy_version, logical_type: VersionIdentifier, required: true, unique: false, references: TenantDirectory.Retailer.calendar_version, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: inventory_snapshot_id, logical_type: UUID, required: true, unique: false, references: Inventory.InventorySnapshot, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: inventory_snapshot_version, logical_type: VersionIdentifier, required: true, unique: false, references: Inventory.InventorySnapshot.version, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: stock_movement_watermark, logical_type: MonotonicWatermark, required: true, unique: false, references: Inventory.StockMovement.watermark, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: forecast_status, logical_type: ForecastEvidenceStatus, required: true, unique: false, references: Forecasting.ForecastRun.status, allowed_values: [Usable, PartiallyUsable, Unavailable, Stale, Incompatible], default: null, min: null, max: null, constraints: ["records the authoritative outcome returned at admission"] }
      - { name: forecast_run_id, logical_type: UUID, required: false, unique: false, references: Forecasting.ForecastRun, allowed_values: [], default: null, min: null, max: null, constraints: ["required for Usable or PartiallyUsable; may identify status evidence for other outcomes"] }
      - { name: forecast_model_version, logical_type: VersionIdentifier, required: false, unique: false, references: Forecasting.ForecastRun.model_version, allowed_values: [], default: null, min: null, max: null, constraints: ["required when forecast_run_id identifies usable product coverage"] }
      - { name: forecast_data_version, logical_type: VersionIdentifier, required: false, unique: false, references: Forecasting.ForecastRun.data_version, allowed_values: [], default: null, min: null, max: null, constraints: ["required when forecast_run_id identifies usable product coverage"] }
      - { name: forecast_configuration_version, logical_type: VersionIdentifier, required: false, unique: false, references: Forecasting.ForecastRun.configuration_version, allowed_values: [], default: null, min: null, max: null, constraints: ["required when forecast_run_id identifies usable product coverage"] }
      - { name: forecast_fresh_until, logical_type: UTCInstant, required: false, unique: false, references: Forecasting.ForecastRun.fresh_until, allowed_values: [], default: null, min: null, max: null, constraints: ["required for Usable or PartiallyUsable"] }
      - { name: planning_policy_id, logical_type: UUID, required: true, unique: false, references: PlanningPolicy.planning_policy_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: planning_policy_version, logical_type: PositiveInteger, required: true, unique: false, references: PlanningPolicy.policy_version, allowed_values: [], default: null, min: 1, max: null, constraints: [] }
      - { name: calculation_schema_version, logical_type: VersionIdentifier, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: ["identifies the deterministic calculation definition"] }
      - { name: immutable_digest, logical_type: Digest, required: true, unique: true, references: null, allowed_values: [], default: calculated, min: null, max: null, constraints: ["covers all snapshot and child evidence facts"] }
    constraints:
      - "The snapshot is sealed at job admission and every attempt under that job reuses it."
      - "Usable or PartiallyUsable status requires the run and provenance fields; other statuses preserve explicit unavailability evidence and yield no invented recommendation."
      - "A completed result or scenario is never silently refreshed; newer inputs require a new review."

  - name: ProductReviewEvidence
    logical_domain: Replenishment
    aggregate: ReviewJob
    aggregate_role: child
    description: "Immutable per-product inventory, forecast, term, and resolved-policy evidence admitted to one review."
    immutable: true
    attributes:
      - { name: product_review_evidence_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: [] }
      - { name: review_evidence_snapshot_id, logical_type: UUID, required: true, unique: "review_evidence_snapshot_id + product_id", references: ReviewEvidenceSnapshot.review_evidence_snapshot_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: product_id, logical_type: UUID, required: true, unique: false, references: Inventory.Product, allowed_values: [], default: null, min: null, max: null, constraints: ["product must be active and in scope at capture"] }
      - { name: inventory_position_id, logical_type: UUID, required: true, unique: false, references: Inventory.InventoryPosition, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: inventory_position_version, logical_type: VersionIdentifier, required: true, unique: false, references: Inventory.InventoryPosition.version, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: on_hand_quantity, logical_type: Quantity, required: true, unique: false, references: null, allowed_values: [], default: null, min: 0, max: null, constraints: ["captured from Retail Data"] }
      - { name: forecast_series_id, logical_type: UUID, required: true, unique: false, references: Forecasting.ForecastSeries, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: forecast_series_version, logical_type: VersionIdentifier, required: true, unique: false, references: Forecasting.ForecastSeries.version, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: preferred_term_reference_id, logical_type: UUID, required: true, unique: false, references: PreferredSupplierTermReference.preferred_term_reference_id, allowed_values: [], default: null, min: null, max: null, constraints: ["automatic review baseline only"] }
      - { name: accepted_supplier_term_revision_id, logical_type: UUID, required: true, unique: false, references: SupplierKnowledge.AcceptedSupplierTerm.revision_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: supplier_id, logical_type: UUID, required: true, unique: false, references: SupplierKnowledge.Supplier, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: currency, logical_type: CurrencyCode, required: true, unique: false, references: TenantDirectory.Retailer.currency, allowed_values: [], default: null, min: null, max: null, constraints: ["must equal retailer currency; no FX conversion"] }
      - { name: lead_time_days, logical_type: NonNegativeInteger, required: true, unique: false, references: SupplierKnowledge.AcceptedSupplierTerm.lead_time_days, allowed_values: [], default: null, min: 0, max: null, constraints: ["calendar days"] }
      - { name: minimum_order_quantity, logical_type: PositiveQuantity, required: true, unique: false, references: SupplierKnowledge.AcceptedSupplierTerm.minimum_order_quantity, allowed_values: [], default: null, min: exclusive_0, max: null, constraints: [] }
      - { name: pack_size, logical_type: PositiveQuantity, required: true, unique: false, references: SupplierKnowledge.AcceptedSupplierTerm.pack_size, allowed_values: [], default: null, min: exclusive_0, max: null, constraints: [] }
      - { name: resolved_buffer_days, logical_type: Integer, required: true, unique: false, references: PlanningPolicy, allowed_values: [], default: null, min: 0, max: 28, constraints: ["explicit product override, including zero, wins; otherwise retailer default"] }
      - { name: protection_window_start, logical_type: LocalDate, required: true, unique: false, references: null, allowed_values: [], default: review_local_date, min: null, max: null, constraints: [] }
      - { name: protection_window_end, logical_type: LocalDate, required: true, unique: false, references: null, allowed_values: [], default: calculated, min: null, max: null, constraints: ["window contains lead_time_days + resolved_buffer_days consecutive dates beginning at start"] }
      - { name: available_forecast_start, logical_type: LocalDate, required: true, unique: false, references: Forecasting.ForecastSeries.horizon_start, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: available_forecast_end, logical_type: LocalDate, required: true, unique: false, references: Forecasting.ForecastSeries.horizon_end, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: evidence_status, logical_type: EvidenceStatus, required: true, unique: false, references: null, allowed_values: [Usable, Blocked], default: null, min: null, max: null, constraints: [] }
      - { name: immutable_digest, logical_type: Digest, required: true, unique: false, references: null, allowed_values: [], default: calculated, min: null, max: null, constraints: [] }
    constraints:
      - "Usable requires complete compatible forecast coverage for every date in the protection window and a usable preferred accepted-term revision."
      - "A longer or gapped protection window is Blocked; demand is never truncated, repeated, extrapolated, or fabricated."

  - name: InboundEvidenceItem
    logical_domain: Replenishment
    aggregate: ReviewJob
    aggregate_role: child
    description: "An immutable snapshot of one Purchasing-owned approved inbound quantity considered by a product review."
    immutable: true
    attributes:
      - { name: inbound_evidence_item_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: [] }
      - { name: product_review_evidence_id, logical_type: UUID, required: true, unique: "product_review_evidence_id + purchase_order_line_id", references: ProductReviewEvidence.product_review_evidence_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: purchase_order_id, logical_type: UUID, required: true, unique: false, references: PurchaseOrder.purchase_order_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: purchase_order_line_id, logical_type: UUID, required: true, unique: false, references: PurchaseOrderLine.purchase_order_line_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: order_version, logical_type: PositiveInteger, required: true, unique: false, references: PurchaseOrder.version, allowed_values: [], default: null, min: 1, max: null, constraints: [] }
      - { name: expected_arrival_local_date, logical_type: LocalDate, required: true, unique: false, references: PurchaseOrderLine.expected_arrival_local_date, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: approved_quantity, logical_type: PositiveQuantity, required: true, unique: false, references: PurchaseOrderLine.approved_quantity, allowed_values: [], default: null, min: exclusive_0, max: null, constraints: [] }
      - { name: received_quantity, logical_type: Quantity, required: true, unique: false, references: InboundCommitment.received_quantity, allowed_values: [], default: null, min: 0, max: null, constraints: [] }
      - { name: outstanding_quantity, logical_type: Quantity, required: true, unique: false, references: InboundCommitment.outstanding_quantity, allowed_values: [], default: null, min: 0, max: null, constraints: ["approved_quantity minus received_quantity"] }
      - { name: counted_in_protection_window, logical_type: Boolean, required: true, unique: false, references: null, allowed_values: [true, false], default: calculated, min: null, max: null, constraints: ["true only when outstanding is positive and expected arrival is inside the complete protection window"] }
    constraints:
      - "Only Approved or PartiallyReceived order lines contribute positive outstanding inbound."
      - "Draft, Submitted, Rejected, Cancelled, and fully Received quantities contribute zero."

  - name: ReplenishmentScenario
    logical_domain: Replenishment
    aggregate: ReplenishmentScenario
    aggregate_role: root
    description: "An immutable comparison that changes declared parameters against one pinned review evidence snapshot."
    immutable: true
    attributes:
      - { name: replenishment_scenario_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: [] }
      - { name: source_review_job_id, logical_type: UUID, required: true, unique: false, references: ReviewJob.review_job_id, allowed_values: [], default: null, min: null, max: null, constraints: ["source review must be terminal with pinned evidence"] }
      - { name: source_evidence_snapshot_id, logical_type: UUID, required: true, unique: false, references: ReviewEvidenceSnapshot.review_evidence_snapshot_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: created_by_actor_id, logical_type: ActorIdentifier, required: true, unique: false, references: IdentityAccess.Actor, allowed_values: [], default: null, min: null, max: null, constraints: ["actor must have current Planner or Manager authority"] }
      - { name: created_at, logical_type: UTCInstant, required: true, unique: false, references: null, allowed_values: [], default: command_time, min: null, max: null, constraints: [] }
      - { name: status, logical_type: ScenarioStatus, required: true, unique: false, references: null, allowed_values: [Completed, PartiallySucceeded, Failed], default: null, min: null, max: null, constraints: [] }
      - { name: immutable_digest, logical_type: Digest, required: true, unique: true, references: null, allowed_values: [], default: calculated, min: null, max: null, constraints: ["covers source evidence, declared parameters, recommendations, and blocks"] }
    constraints:
      - "A scenario never changes saved PlanningPolicy or PreferredSupplierTermReference state."
      - "Only declared buffer and accepted-term parameters differ from the source evidence; all other input versions remain pinned."
      - "A smaller buffer is usable only when its entire protection window has compatible forecast coverage."

  - name: ScenarioProductParameter
    logical_domain: Replenishment
    aggregate: ReplenishmentScenario
    aggregate_role: child
    description: "The explicit per-product differences applied by a scenario."
    immutable: true
    attributes:
      - { name: scenario_product_parameter_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: [] }
      - { name: replenishment_scenario_id, logical_type: UUID, required: true, unique: "replenishment_scenario_id + product_id", references: ReplenishmentScenario.replenishment_scenario_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: product_id, logical_type: UUID, required: true, unique: false, references: Inventory.Product, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: buffer_days, logical_type: Integer, required: true, unique: false, references: null, allowed_values: [], default: null, min: 0, max: 28, constraints: ["temporary scenario value"] }
      - { name: accepted_supplier_term_revision_id, logical_type: UUID, required: true, unique: false, references: SupplierKnowledge.AcceptedSupplierTerm.revision_id, allowed_values: [], default: null, min: null, max: null, constraints: ["must be currently accepted when the scenario is created and is then pinned"] }
      - { name: supplier_id, logical_type: UUID, required: true, unique: false, references: SupplierKnowledge.Supplier, allowed_values: [], default: null, min: null, max: null, constraints: [] }
    constraints:
      - "The selected term must belong to the retailer and product and use the retailer currency."
      - "Omission of a product parameter means use the baseline values in ProductReviewEvidence."

  - name: ReplenishmentRecommendation
    logical_domain: Replenishment
    aggregate: ReplenishmentRecommendation
    aggregate_role: root
    description: "An immutable, reproducible per-product quantity recommendation from a review baseline or scenario."
    immutable: true
    attributes:
      - { name: replenishment_recommendation_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: [] }
      - { name: source_kind, logical_type: RecommendationSourceKind, required: true, unique: false, references: null, allowed_values: [ReviewBaseline, Scenario], default: null, min: null, max: null, constraints: [] }
      - { name: review_job_id, logical_type: UUID, required: true, unique: false, references: ReviewJob.review_job_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: replenishment_scenario_id, logical_type: UUID, required: false, unique: false, references: ReplenishmentScenario.replenishment_scenario_id, allowed_values: [], default: null, min: null, max: null, constraints: ["required exactly when source_kind is Scenario"] }
      - { name: product_review_evidence_id, logical_type: UUID, required: true, unique: false, references: ProductReviewEvidence.product_review_evidence_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: product_id, logical_type: UUID, required: true, unique: "source identity + product_id", references: Inventory.Product, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: accepted_supplier_term_revision_id, logical_type: UUID, required: true, unique: false, references: SupplierKnowledge.AcceptedSupplierTerm.revision_id, allowed_values: [], default: null, min: null, max: null, constraints: ["exact revision used in the calculation"] }
      - { name: protection_window_start, logical_type: LocalDate, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: protection_window_end, logical_type: LocalDate, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: forecast_demand_quantity, logical_type: Quantity, required: true, unique: false, references: null, allowed_values: [], default: calculated, min: 0, max: null, constraints: ["sum of all daily forecasts in the complete protection window"] }
      - { name: on_hand_quantity, logical_type: Quantity, required: true, unique: false, references: ProductReviewEvidence.on_hand_quantity, allowed_values: [], default: null, min: 0, max: null, constraints: [] }
      - { name: eligible_inbound_quantity, logical_type: Quantity, required: true, unique: false, references: InboundEvidenceItem.outstanding_quantity, allowed_values: [], default: calculated, min: 0, max: null, constraints: ["sum of counted outstanding inbound due inside the protection window"] }
      - { name: raw_need_quantity, logical_type: Quantity, required: true, unique: false, references: null, allowed_values: [], default: calculated, min: 0, max: null, constraints: ["max(forecast demand - on hand - eligible inbound, 0)"] }
      - { name: minimum_order_quantity, logical_type: PositiveQuantity, required: true, unique: false, references: ProductReviewEvidence.minimum_order_quantity, allowed_values: [], default: null, min: exclusive_0, max: null, constraints: [] }
      - { name: pack_size, logical_type: PositiveQuantity, required: true, unique: false, references: ProductReviewEvidence.pack_size, allowed_values: [], default: null, min: exclusive_0, max: null, constraints: [] }
      - { name: suggested_quantity, logical_type: Quantity, required: true, unique: false, references: null, allowed_values: [], default: calculated, min: 0, max: null, constraints: ["zero when raw need is zero; otherwise at least MOQ and rounded upward to a whole pack"] }
      - { name: shortage_local_date, logical_type: LocalDate, required: false, unique: false, references: null, allowed_values: [], default: calculated, min: null, max: null, constraints: ["null when no shortage occurs in covered dates"] }
      - { name: rationale_facts, logical_type: StructuredFacts, required: true, unique: false, references: null, allowed_values: [], default: calculated, min: null, max: null, constraints: ["bounded facts explaining lead time, buffer, MOQ, pack, inventory, inbound, and forecast effects"] }
      - { name: calculation_schema_version, logical_type: VersionIdentifier, required: true, unique: false, references: ReviewEvidenceSnapshot.calculation_schema_version, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: immutable_digest, logical_type: Digest, required: true, unique: true, references: null, allowed_values: [], default: calculated, min: null, max: null, constraints: ["covers inputs, formula outputs, and source identity"] }
    constraints:
      - "A recommendation exists only for a product with complete usable evidence."
      - "Blocked products are represented by RecommendationBlock and never as zero-demand recommendations."
      - "A published recommendation cannot be edited or recalculated in place."

  - name: RecommendationBlock
    logical_domain: Replenishment
    aggregate: ReviewJob
    aggregate_role: child
    description: "Immutable evidence that a product could not produce a valid recommendation for a review baseline or scenario."
    immutable: true
    attributes:
      - { name: recommendation_block_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: [] }
      - { name: source_kind, logical_type: RecommendationSourceKind, required: true, unique: false, references: null, allowed_values: [ReviewBaseline, Scenario], default: null, min: null, max: null, constraints: [] }
      - { name: review_job_id, logical_type: UUID, required: true, unique: false, references: ReviewJob.review_job_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: replenishment_scenario_id, logical_type: UUID, required: false, unique: false, references: ReplenishmentScenario.replenishment_scenario_id, allowed_values: [], default: null, min: null, max: null, constraints: ["required exactly for Scenario"] }
      - { name: product_id, logical_type: UUID, required: true, unique: "source identity + product_id", references: Inventory.Product, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: product_review_evidence_id, logical_type: UUID, required: false, unique: false, references: ProductReviewEvidence.product_review_evidence_id, allowed_values: [], default: null, min: null, max: null, constraints: ["null only when product evidence could not be captured"] }
      - { name: reason_code, logical_type: StableCode, required: true, unique: false, references: null, allowed_values: [ForecastUnavailable, ForecastStale, ForecastCoverageMissing, ProtectionWindowTooLong, PreferredTermMissing, PreferredTermStale, TermIncompatible, InventoryUnavailable, ProductIneligible], default: null, min: null, max: null, constraints: [] }
      - { name: required_coverage_start, logical_type: LocalDate, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: ["present for coverage failures"] }
      - { name: required_coverage_end, logical_type: LocalDate, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: ["present for coverage failures"] }
      - { name: available_coverage_start, logical_type: LocalDate, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: ["present when any compatible coverage exists"] }
      - { name: available_coverage_end, logical_type: LocalDate, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: recorded_at, logical_type: UTCInstant, required: true, unique: false, references: null, allowed_values: [], default: command_time, min: null, max: null, constraints: [] }
    constraints:
      - "A blocked product cannot be copied into a purchase proposal as a recommended line."
      - "Reason and required-versus-available coverage remain visible with the immutable result."

  - name: ReviewPointer
    logical_domain: Replenishment
    aggregate: ReviewPointer
    aggregate_role: root
    description: "The retailer-scoped current references used to distinguish the latest attempt from the last usable successful result."
    immutable: false
    attributes:
      - { name: review_pointer_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: true, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: ["must be current when pointer is read or advanced"] }
      - { name: version, logical_type: PositiveInteger, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: ["optimistic concurrency token"] }
      - { name: latest_attempt_id, logical_type: UUID, required: false, unique: false, references: ReviewAttempt.review_attempt_id, allowed_values: [], default: null, min: null, max: null, constraints: ["most recently admitted attempt whether successful or failed"] }
      - { name: last_successful_review_job_id, logical_type: UUID, required: false, unique: false, references: ReviewJob.review_job_id, allowed_values: [], default: null, min: null, max: null, constraints: ["most recent job with Succeeded or PartiallySucceeded usable results"] }
      - { name: updated_at, logical_type: UTCInstant, required: true, unique: false, references: null, allowed_values: [], default: command_time, min: null, max: null, constraints: [] }
    constraints:
      - "A failed latest attempt never relabels older recommendations as current and never erases the last-success reference."
      - "A never-run retailer has null references with an explicit never-run presentation state."

  - name: PurchaseProposal
    logical_domain: Purchasing
    aggregate: PurchaseProposal
    aggregate_role: root
    description: "An editable Draft and then locked Submitted proposal bounded to one retailer, store, supplier, and currency."
    immutable: false
    attributes:
      - { name: purchase_proposal_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: ["pinned at creation and rechecked on every command"] }
      - { name: version, logical_type: PositiveInteger, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: ["expected by every edit and transition command"] }
      - { name: status, logical_type: ProposalStatus, required: true, unique: false, references: null, allowed_values: [Draft, Submitted, Approved, Rejected, Cancelled], default: Draft, min: null, max: null, constraints: [] }
      - { name: store_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Store, allowed_values: [], default: null, min: null, max: null, constraints: ["store must belong to retailer"] }
      - { name: supplier_id, logical_type: UUID, required: true, unique: false, references: SupplierKnowledge.Supplier, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: currency, logical_type: CurrencyCode, required: true, unique: false, references: TenantDirectory.Retailer.currency, allowed_values: [], default: null, min: null, max: null, constraints: ["must equal retailer currency; no FX conversion"] }
      - { name: source_review_job_id, logical_type: UUID, required: true, unique: false, references: ReviewJob.review_job_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: source_scenario_id, logical_type: UUID, required: true, unique: false, references: ReplenishmentScenario.replenishment_scenario_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: source_evidence_snapshot_id, logical_type: UUID, required: true, unique: false, references: ReviewEvidenceSnapshot.review_evidence_snapshot_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: source_proposal_id, logical_type: UUID, required: false, unique: false, references: PurchaseProposal.purchase_proposal_id, allowed_values: [], default: null, min: null, max: null, constraints: ["optional correction ancestry"] }
      - { name: source_order_id, logical_type: UUID, required: false, unique: false, references: PurchaseOrder.purchase_order_id, allowed_values: [], default: null, min: null, max: null, constraints: ["optional locked-order correction ancestry"] }
      - { name: created_by_actor_id, logical_type: ActorIdentifier, required: true, unique: false, references: IdentityAccess.Actor, allowed_values: [], default: null, min: null, max: null, constraints: ["actor must have current Planner or Manager authority; assistant is only an invoking channel"] }
      - { name: created_at, logical_type: UTCInstant, required: true, unique: false, references: null, allowed_values: [], default: command_time, min: null, max: null, constraints: [] }
      - { name: submitted_at, logical_type: UTCInstant, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: ["required from Submitted onward"] }
      - { name: immutable_source_digest, logical_type: Digest, required: true, unique: false, references: null, allowed_values: [], default: calculated, min: null, max: null, constraints: ["covers pinned review, scenario, input, policy, term, and placement provenance"] }
    constraints:
      - "A proposal contains lines for exactly one retailer, store, supplier, and currency."
      - "Only Draft commercial data is editable; submission permanently locks the submitted line facts."
      - "Correction creates a new linked Draft and never changes a Submitted, Approved, Rejected, Cancelled, or ordered source."
      - "A proposal cannot contain a blocked product as a recommended line."

  - name: PurchaseProposalLine
    logical_domain: Purchasing
    aggregate: PurchaseProposal
    aggregate_role: child
    description: "A proposal line that retains the planning suggestion separately from the Planner-entered quantity."
    immutable: false
    attributes:
      - { name: purchase_proposal_line_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: ["must equal proposal retailer"] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: ["must equal proposal generation"] }
      - { name: purchase_proposal_id, logical_type: UUID, required: true, unique: "purchase_proposal_id + product_id", references: PurchaseProposal.purchase_proposal_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: product_id, logical_type: UUID, required: true, unique: false, references: Inventory.Product, allowed_values: [], default: null, min: null, max: null, constraints: ["product must belong to retailer"] }
      - { name: replenishment_recommendation_id, logical_type: UUID, required: true, unique: false, references: ReplenishmentRecommendation.replenishment_recommendation_id, allowed_values: [], default: null, min: null, max: null, constraints: ["recommendation must belong to pinned review/scenario and supplier"] }
      - { name: accepted_supplier_term_revision_id, logical_type: UUID, required: true, unique: false, references: SupplierKnowledge.AcceptedSupplierTerm.revision_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: suggested_quantity, logical_type: Quantity, required: true, unique: false, references: ReplenishmentRecommendation.suggested_quantity, allowed_values: [], default: null, min: 0, max: null, constraints: ["retained even after quantity edit"] }
      - { name: entered_quantity, logical_type: PositiveQuantity, required: true, unique: false, references: null, allowed_values: [], default: suggested_quantity, min: exclusive_0, max: null, constraints: ["must be a whole multiple of pinned pack_size and at least pinned MOQ before submission"] }
      - { name: deviation_reason, logical_type: BoundedText, required: false, unique: false, references: null, allowed_values: [], default: null, min: 1, max: implementation_bounded, constraints: ["required when entered_quantity differs from a nonzero suggested_quantity"] }
      - { name: unit_price, logical_type: MoneyAmount, required: true, unique: false, references: SupplierKnowledge.AcceptedSupplierTerm.unit_price, allowed_values: [], default: null, min: 0, max: null, constraints: ["currency is inherited from proposal"] }
      - { name: minimum_order_quantity, logical_type: PositiveQuantity, required: true, unique: false, references: SupplierKnowledge.AcceptedSupplierTerm.minimum_order_quantity, allowed_values: [], default: null, min: exclusive_0, max: null, constraints: ["pinned commercial fact"] }
      - { name: pack_size, logical_type: PositiveQuantity, required: true, unique: false, references: SupplierKnowledge.AcceptedSupplierTerm.pack_size, allowed_values: [], default: null, min: exclusive_0, max: null, constraints: ["pinned commercial fact"] }
      - { name: lead_time_days, logical_type: NonNegativeInteger, required: true, unique: false, references: SupplierKnowledge.AcceptedSupplierTerm.lead_time_days, allowed_values: [], default: null, min: 0, max: null, constraints: ["pinned calendar-day fact"] }
      - { name: line_version, logical_type: PositiveInteger, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: ["editable only while proposal is Draft"] }
      - { name: locked_at, logical_type: UTCInstant, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: ["required after proposal submission"] }
      - { name: immutable_provenance_digest, logical_type: Digest, required: true, unique: false, references: null, allowed_values: [], default: calculated, min: null, max: null, constraints: ["covers source versions and commercial facts"] }
    constraints:
      - "All lines are validated before proposal submission; any invalid line prevents the transition."
      - "After submission, quantities, price, MOQ, pack size, lead time, accepted-term revision, product, and source recommendation are immutable."

  - name: PurchaseOrder
    logical_domain: Purchasing
    aggregate: PurchaseOrder
    aggregate_role: root
    description: "The approved purchasing commitment created by an accepted Manager approval."
    immutable: false
    attributes:
      - { name: purchase_order_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: ["pinned from proposal and checked on every command"] }
      - { name: version, logical_type: PositiveInteger, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: ["serializes decision, cancellation, and receipt races"] }
      - { name: purchase_proposal_id, logical_type: UUID, required: true, unique: true, references: PurchaseProposal.purchase_proposal_id, allowed_values: [], default: null, min: null, max: null, constraints: ["proposal must have an accepted approval decision"] }
      - { name: status, logical_type: OrderStatus, required: true, unique: false, references: null, allowed_values: [Approved, PartiallyReceived, Received, Cancelled], default: Approved, min: null, max: null, constraints: [] }
      - { name: store_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Store, allowed_values: [], default: null, min: null, max: null, constraints: ["copied from locked proposal"] }
      - { name: supplier_id, logical_type: UUID, required: true, unique: false, references: SupplierKnowledge.Supplier, allowed_values: [], default: null, min: null, max: null, constraints: ["copied from locked proposal"] }
      - { name: currency, logical_type: CurrencyCode, required: true, unique: false, references: TenantDirectory.Retailer.currency, allowed_values: [], default: null, min: null, max: null, constraints: ["copied from locked proposal"] }
      - { name: approved_at, logical_type: UTCInstant, required: true, unique: false, references: null, allowed_values: [], default: decision_time, min: null, max: null, constraints: [] }
      - { name: approval_local_date, logical_type: LocalDate, required: true, unique: false, references: null, allowed_values: [], default: calculated, min: null, max: null, constraints: ["derived from approved_at and pinned retailer time zone"] }
      - { name: approved_by_actor_id, logical_type: ActorIdentifier, required: true, unique: false, references: IdentityAccess.Actor, allowed_values: [], default: null, min: null, max: null, constraints: ["actor must have current Manager authority"] }
      - { name: source_evidence_snapshot_id, logical_type: UUID, required: true, unique: false, references: ReviewEvidenceSnapshot.review_evidence_snapshot_id, allowed_values: [], default: null, min: null, max: null, constraints: ["revalidated at approval"] }
      - { name: immutable_commercial_digest, logical_type: Digest, required: true, unique: true, references: null, allowed_values: [], default: calculated, min: null, max: null, constraints: ["covers all approved line and source facts"] }
    constraints:
      - "Every order has exactly one accepted Manager approval and no order exists from rejection."
      - "Commercial facts never change after approval."
      - "Cancellation is allowed only from Approved before any receipt; PartiallyReceived and terminal orders cannot be cancelled."
      - "Received requires every order line to have zero outstanding quantity."

  - name: PurchaseOrderLine
    logical_domain: Purchasing
    aggregate: PurchaseOrder
    aggregate_role: child
    description: "An immutable approved commercial line with an approval-derived expected arrival date."
    immutable: true
    attributes:
      - { name: purchase_order_line_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: ["must equal order retailer"] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: ["must equal order generation"] }
      - { name: purchase_order_id, logical_type: UUID, required: true, unique: "purchase_order_id + product_id", references: PurchaseOrder.purchase_order_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: purchase_proposal_line_id, logical_type: UUID, required: true, unique: true, references: PurchaseProposalLine.purchase_proposal_line_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: product_id, logical_type: UUID, required: true, unique: false, references: Inventory.Product, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: accepted_supplier_term_revision_id, logical_type: UUID, required: true, unique: false, references: SupplierKnowledge.AcceptedSupplierTerm.revision_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: approved_quantity, logical_type: PositiveQuantity, required: true, unique: false, references: PurchaseProposalLine.entered_quantity, allowed_values: [], default: null, min: exclusive_0, max: null, constraints: ["whole multiple of pack_size and at least MOQ"] }
      - { name: unit_price, logical_type: MoneyAmount, required: true, unique: false, references: PurchaseProposalLine.unit_price, allowed_values: [], default: null, min: 0, max: null, constraints: [] }
      - { name: minimum_order_quantity, logical_type: PositiveQuantity, required: true, unique: false, references: PurchaseProposalLine.minimum_order_quantity, allowed_values: [], default: null, min: exclusive_0, max: null, constraints: [] }
      - { name: pack_size, logical_type: PositiveQuantity, required: true, unique: false, references: PurchaseProposalLine.pack_size, allowed_values: [], default: null, min: exclusive_0, max: null, constraints: [] }
      - { name: lead_time_days, logical_type: NonNegativeInteger, required: true, unique: false, references: PurchaseProposalLine.lead_time_days, allowed_values: [], default: null, min: 0, max: null, constraints: ["calendar days"] }
      - { name: expected_arrival_local_date, logical_type: LocalDate, required: true, unique: false, references: null, allowed_values: [], default: calculated, min: null, max: null, constraints: ["approval_local_date plus pinned lead_time_days; immutable after approval"] }
      - { name: immutable_provenance_digest, logical_type: Digest, required: true, unique: true, references: null, allowed_values: [], default: calculated, min: null, max: null, constraints: [] }
    constraints:
      - "Line values are copied from a locked proposal and cannot be edited after approval."
      - "Expected arrival is a simulated inbound date and does not create on-hand inventory or a receipt."

  - name: PurchaseDecision
    logical_domain: Purchasing
    aggregate: PurchaseProposal
    aggregate_role: child
    description: "The immutable Manager approval or rejection of a Submitted proposal."
    immutable: true
    attributes:
      - { name: purchase_decision_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: [] }
      - { name: purchase_proposal_id, logical_type: UUID, required: true, unique: true, references: PurchaseProposal.purchase_proposal_id, allowed_values: [], default: null, min: null, max: null, constraints: ["proposal must be Submitted at decision time"] }
      - { name: decision, logical_type: PurchaseDecisionType, required: true, unique: false, references: null, allowed_values: [Approve, Reject], default: null, min: null, max: null, constraints: [] }
      - { name: decided_by_actor_id, logical_type: ActorIdentifier, required: true, unique: false, references: IdentityAccess.Actor, allowed_values: [], default: null, min: null, max: null, constraints: ["human actor with current Manager authority"] }
      - { name: decided_at, logical_type: UTCInstant, required: true, unique: false, references: null, allowed_values: [], default: command_time, min: null, max: null, constraints: [] }
      - { name: expected_proposal_version, logical_type: PositiveInteger, required: true, unique: false, references: PurchaseProposal.version, allowed_values: [], default: null, min: 1, max: null, constraints: ["must equal current version"] }
      - { name: inventory_snapshot_version_checked, logical_type: VersionIdentifier, required: true, unique: false, references: Inventory.InventorySnapshot.version, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: supplier_terms_digest_checked, logical_type: Digest, required: true, unique: false, references: SupplierKnowledge.AcceptedSupplierTerm, allowed_values: [], default: calculated, min: null, max: null, constraints: ["covers every pinned term, price, MOQ, pack, and lead time revalidated"] }
      - { name: forecast_version_checked, logical_type: VersionIdentifier, required: true, unique: false, references: Forecasting.ForecastRun, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: reason, logical_type: BoundedText, required: false, unique: false, references: null, allowed_values: [], default: null, min: 1, max: implementation_bounded, constraints: ["may explain either decision; required rules are defined in rules.md"] }
      - { name: resulting_purchase_order_id, logical_type: UUID, required: false, unique: true, references: PurchaseOrder.purchase_order_id, allowed_values: [], default: null, min: null, max: null, constraints: ["required exactly for Approve"] }
      - { name: immutable_digest, logical_type: Digest, required: true, unique: true, references: null, allowed_values: [], default: calculated, min: null, max: null, constraints: [] }
    constraints:
      - "Only one accepted decision exists per proposal."
      - "Approval commits only if membership, Manager role, placement, proposal version, inventory, forecast, and every supplier term remain valid."
      - "Rejection creates no order and leaves the locked source unchanged; correction requires a new linked Draft."

  - name: PurchaseCancellation
    logical_domain: Purchasing
    aggregate: PurchaseProposal
    aggregate_role: child
    description: "The immutable Manager cancellation of a Submitted proposal or an Approved order before any receipt."
    immutable: true
    attributes:
      - { name: purchase_cancellation_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: [] }
      - { name: purchase_proposal_id, logical_type: UUID, required: true, unique: true, references: PurchaseProposal.purchase_proposal_id, allowed_values: [], default: null, min: null, max: null, constraints: ["identifies the originating Submitted or Approved proposal"] }
      - { name: purchase_order_id, logical_type: UUID, required: false, unique: true, references: PurchaseOrder.purchase_order_id, allowed_values: [], default: null, min: null, max: null, constraints: ["required when cancelling an Approved order; absent for a Submitted proposal"] }
      - { name: cancelled_by_actor_id, logical_type: ActorIdentifier, required: true, unique: false, references: IdentityAccess.Actor, allowed_values: [], default: null, min: null, max: null, constraints: ["human actor with current Manager authority"] }
      - { name: cancelled_at, logical_type: UTCInstant, required: true, unique: false, references: null, allowed_values: [], default: command_time, min: null, max: null, constraints: [] }
      - { name: expected_aggregate_version, logical_type: PositiveInteger, required: true, unique: false, references: null, allowed_values: [], default: null, min: 1, max: null, constraints: ["matches proposal version or order version as applicable"] }
      - { name: reason, logical_type: BoundedText, required: true, unique: false, references: null, allowed_values: [], default: null, min: 1, max: implementation_bounded, constraints: [] }
      - { name: immutable_digest, logical_type: Digest, required: true, unique: true, references: null, allowed_values: [], default: calculated, min: null, max: null, constraints: [] }
    constraints:
      - "Cancellation is allowed only for Submitted proposals or Approved orders with no committed receipt."
      - "Cancel and receipt commands serialize on the order version; at most one can commit."
      - "Draft, PartiallyReceived, Received, Rejected, and Cancelled states cannot be cancelled."

  - name: InboundCommitment
    logical_domain: Purchasing
    aggregate: PurchaseOrder
    aggregate_role: child
    description: "Purchasing's authoritative dated inbound balance for one approved order line."
    immutable: false
    attributes:
      - { name: inbound_commitment_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: [] }
      - { name: purchase_order_line_id, logical_type: UUID, required: true, unique: true, references: PurchaseOrderLine.purchase_order_line_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: version, logical_type: PositiveInteger, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: null, constraints: ["advances with receipt or cancellation"] }
      - { name: status, logical_type: InboundStatus, required: true, unique: false, references: null, allowed_values: [Open, PartiallyReceived, Fulfilled, Cancelled], default: Open, min: null, max: null, constraints: [] }
      - { name: expected_arrival_local_date, logical_type: LocalDate, required: true, unique: false, references: PurchaseOrderLine.expected_arrival_local_date, allowed_values: [], default: null, min: null, max: null, constraints: ["immutable approval-derived date"] }
      - { name: approved_quantity, logical_type: PositiveQuantity, required: true, unique: false, references: PurchaseOrderLine.approved_quantity, allowed_values: [], default: null, min: exclusive_0, max: null, constraints: ["immutable"] }
      - { name: received_quantity, logical_type: Quantity, required: true, unique: false, references: ReceiptLine.quantity, allowed_values: [], default: 0, min: 0, max: approved_quantity, constraints: ["sum of committed receipt lines"] }
      - { name: outstanding_quantity, logical_type: Quantity, required: true, unique: false, references: null, allowed_values: [], default: approved_quantity, min: 0, max: approved_quantity, constraints: ["approved_quantity minus received_quantity; zero when Cancelled"] }
      - { name: updated_at, logical_type: UTCInstant, required: true, unique: false, references: null, allowed_values: [], default: command_time, min: null, max: null, constraints: [] }
    constraints:
      - "Open and PartiallyReceived balances are the only quantities exposed as inbound to later reviews."
      - "Receipt reduces outstanding quantity; fulfillment reaches zero; permitted cancellation makes the balance unavailable to later reviews."
      - "The commitment never changes Retail Data on-hand quantity by itself."

  - name: Receipt
    logical_domain: Purchasing
    aggregate: Receipt
    aggregate_role: root
    description: "An immutable accepted simulated receipt against one approved order and store."
    immutable: true
    attributes:
      - { name: receipt_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: ["must be current at commit"] }
      - { name: purchase_order_id, logical_type: UUID, required: true, unique: false, references: PurchaseOrder.purchase_order_id, allowed_values: [], default: null, min: null, max: null, constraints: ["order must be Approved or PartiallyReceived"] }
      - { name: store_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Store, allowed_values: [], default: null, min: null, max: null, constraints: ["must equal order store"] }
      - { name: expected_order_version, logical_type: PositiveInteger, required: true, unique: false, references: PurchaseOrder.version, allowed_values: [], default: null, min: 1, max: null, constraints: ["must match at commit"] }
      - { name: received_by_actor_id, logical_type: ActorIdentifier, required: true, unique: false, references: IdentityAccess.Actor, allowed_values: [], default: null, min: null, max: null, constraints: ["human actor with current Planner or Manager authority"] }
      - { name: received_at, logical_type: UTCInstant, required: true, unique: false, references: null, allowed_values: [], default: command_time, min: null, max: null, constraints: [] }
      - { name: resulting_order_status, logical_type: OrderStatus, required: true, unique: false, references: null, allowed_values: [PartiallyReceived, Received], default: calculated, min: null, max: null, constraints: [] }
      - { name: resulting_order_version, logical_type: PositiveInteger, required: true, unique: false, references: PurchaseOrder.version, allowed_values: [], default: calculated, min: 2, max: null, constraints: [] }
      - { name: stock_posting_result_version, logical_type: VersionIdentifier, required: true, unique: false, references: Inventory.InventorySnapshot.version, allowed_values: [], default: null, min: null, max: null, constraints: ["returned by Retail Data's governed receipt-posting port"] }
      - { name: committed_at, logical_type: UTCInstant, required: true, unique: false, references: null, allowed_values: [], default: transaction_commit_time, min: null, max: null, constraints: [] }
      - { name: immutable_digest, logical_type: Digest, required: true, unique: true, references: null, allowed_values: [], default: calculated, min: null, max: null, constraints: ["covers all receipt lines and resulting balances"] }
    constraints:
      - "All lines validate before any receipt, order, inbound, stock, audit, or outbox effect commits."
      - "A receipt is accepted only when every quantity is positive and cumulative received quantity remains at or below approved quantity."
      - "A committed receipt cannot be changed or deleted."

  - name: ReceiptLine
    logical_domain: Purchasing
    aggregate: Receipt
    aggregate_role: child
    description: "One immutable received quantity and its resulting Purchasing and Retail Data references."
    immutable: true
    attributes:
      - { name: receipt_line_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: ["must equal receipt retailer"] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: ["must equal receipt generation"] }
      - { name: receipt_id, logical_type: UUID, required: true, unique: "receipt_id + purchase_order_line_id", references: Receipt.receipt_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: purchase_order_line_id, logical_type: UUID, required: true, unique: false, references: PurchaseOrderLine.purchase_order_line_id, allowed_values: [], default: null, min: null, max: null, constraints: ["line must belong to receipt order"] }
      - { name: product_id, logical_type: UUID, required: true, unique: false, references: Inventory.Product, allowed_values: [], default: null, min: null, max: null, constraints: ["must equal order-line product"] }
      - { name: quantity, logical_type: PositiveQuantity, required: true, unique: false, references: null, allowed_values: [], default: null, min: exclusive_0, max: outstanding_before, constraints: [] }
      - { name: received_before, logical_type: Quantity, required: true, unique: false, references: InboundCommitment.received_quantity, allowed_values: [], default: null, min: 0, max: null, constraints: [] }
      - { name: received_after, logical_type: Quantity, required: true, unique: false, references: InboundCommitment.received_quantity, allowed_values: [], default: calculated, min: 0, max: approved_quantity, constraints: ["received_before plus quantity"] }
      - { name: outstanding_after, logical_type: Quantity, required: true, unique: false, references: InboundCommitment.outstanding_quantity, allowed_values: [], default: calculated, min: 0, max: null, constraints: [] }
      - { name: stock_movement_id, logical_type: UUID, required: true, unique: true, references: Inventory.StockMovement, allowed_values: [], default: null, min: null, max: null, constraints: ["created atomically through Retail Data's owned routine"] }
    constraints:
      - "Distinct concurrent receipts serialize against current cumulative balances."
      - "If any line is foreign, nonpositive, or over limit, no ReceiptLine is committed."

  - name: PurchaseLifecycleEntry
    logical_domain: Purchasing
    aggregate: PurchaseProposal
    aggregate_role: child
    description: "Append-only, human-readable lifecycle history for a proposal or order; BusinessAuditRecord remains the authoritative audit event."
    immutable: true
    attributes:
      - { name: purchase_lifecycle_entry_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: [] }
      - { name: purchase_proposal_id, logical_type: UUID, required: true, unique: false, references: PurchaseProposal.purchase_proposal_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: purchase_order_id, logical_type: UUID, required: false, unique: false, references: PurchaseOrder.purchase_order_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: action, logical_type: PurchaseLifecycleAction, required: true, unique: false, references: null, allowed_values: [Created, Edited, Submitted, Approved, Rejected, Cancelled, ReceiptRecorded, PartiallyReceived, Received, ReplacementDraftCreated], default: null, min: null, max: null, constraints: [] }
      - { name: from_status, logical_type: PurchaseStatus, required: false, unique: false, references: null, allowed_values: [Draft, Submitted, Approved, PartiallyReceived, Received, Rejected, Cancelled], default: null, min: null, max: null, constraints: [] }
      - { name: to_status, logical_type: PurchaseStatus, required: true, unique: false, references: null, allowed_values: [Draft, Submitted, Approved, PartiallyReceived, Received, Rejected, Cancelled], default: null, min: null, max: null, constraints: [] }
      - { name: aggregate_version, logical_type: PositiveInteger, required: true, unique: "target identity + aggregate_version + action", references: null, allowed_values: [], default: null, min: 1, max: null, constraints: [] }
      - { name: actor_id, logical_type: ActorIdentifier, required: true, unique: false, references: IdentityAccess.Actor, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: occurred_at, logical_type: UTCInstant, required: true, unique: false, references: null, allowed_values: [], default: command_time, min: null, max: null, constraints: [] }
      - { name: business_audit_id, logical_type: UUID, required: true, unique: true, references: BusinessAuditRecord.business_audit_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
    constraints:
      - "Entries append in aggregate-version order and never authorize a transition by themselves."
      - "The workflow and permitted state transitions are defined in functional-spec.md and rules.md."

  - name: IdempotencyRecord
    logical_domain: SharedPersistenceSupport
    aggregate: IdempotencyRecord
    aggregate_role: root
    description: "The payload-bound result of a mutation or admitted-job command, used for exact replay and mismatch detection."
    immutable: false
    attributes:
      - { name: idempotency_record_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: ["authority is rechecked before returning a stored result"] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: ["stale generation cannot replay into a new placement"] }
      - { name: operation_name, logical_type: StableCode, required: true, unique: "retailer_id + operation_name + idempotency_key", references: null, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: idempotency_key, logical_type: BoundedString, required: true, unique: false, references: null, allowed_values: [], default: null, min: 1, max: implementation_bounded, constraints: ["caller supplied"] }
      - { name: request_hash, logical_type: Digest, required: true, unique: false, references: null, allowed_values: [], default: calculated, min: null, max: null, constraints: ["covers canonical payload and material headers"] }
      - { name: state, logical_type: IdempotencyState, required: true, unique: false, references: null, allowed_values: [InProgress, Committed, Failed], default: InProgress, min: null, max: null, constraints: [] }
      - { name: result_reference_type, logical_type: StableCode, required: false, unique: false, references: null, allowed_values: [ReviewJob, PurchaseProposal, PurchaseDecision, PurchaseCancellation, Receipt, PolicyVersion, PreferredTermReference], default: null, min: null, max: null, constraints: ["required for Committed"] }
      - { name: result_reference_id, logical_type: UUID, required: false, unique: false, references: DomainAggregate, allowed_values: [], default: null, min: null, max: null, constraints: ["required for Committed"] }
      - { name: result_snapshot, logical_type: BoundedStructuredResult, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: implementation_bounded, constraints: ["contains only the response facts needed for exact replay"] }
      - { name: created_at, logical_type: UTCInstant, required: true, unique: false, references: null, allowed_values: [], default: command_time, min: null, max: null, constraints: [] }
      - { name: completed_at, logical_type: UTCInstant, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: ["required for Committed or Failed"] }
    constraints:
      - "Matching operation, key, and request hash returns the original authorized result without another domain, quota, audit, stock, or outbox effect."
      - "The same operation and key with a different request hash is a conflict and commits nothing."
      - "A same-job review retry uses the original ReviewJob identity and ManualReviewCharge even across local-day boundaries."

  - name: BusinessAuditRecord
    logical_domain: SharedPersistenceSupport
    aggregate: BusinessAuditRecord
    aggregate_role: root
    description: "The unit-owned immutable authoritative audit fact for accepted, denied, or failed sensitive operations."
    immutable: true
    attributes:
      - { name: business_audit_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: [] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: [] }
      - { name: domain, logical_type: LogicalDomainName, required: true, unique: false, references: null, allowed_values: [Replenishment, Purchasing], default: null, min: null, max: null, constraints: [] }
      - { name: action, logical_type: StableCode, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: resource_type, logical_type: StableCode, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: resource_id, logical_type: UUID, required: true, unique: false, references: DomainAggregate, allowed_values: [], default: null, min: null, max: null, constraints: ["target is identified without cross-domain table access"] }
      - { name: outcome, logical_type: AuditOutcome, required: true, unique: false, references: null, allowed_values: [Accepted, Denied, Failed], default: null, min: null, max: null, constraints: [] }
      - { name: actor_type, logical_type: ActorType, required: true, unique: false, references: null, allowed_values: [User, Service, Scheduler], default: null, min: null, max: null, constraints: [] }
      - { name: actor_id, logical_type: ActorIdentifier, required: true, unique: false, references: IdentityAccess.Actor, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: before_version, logical_type: VersionIdentifier, required: false, unique: false, references: DomainAggregate.version, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: after_version, logical_type: VersionIdentifier, required: false, unique: false, references: DomainAggregate.version, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: provenance, logical_type: BoundedStructuredFacts, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: implementation_bounded, constraints: ["contains necessary versions and reasons; excludes secrets, raw supplier documents, prompts, and hidden reasoning"] }
      - { name: correlation_id, logical_type: UUID, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: causation_id, logical_type: UUID, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: idempotency_key, logical_type: BoundedString, required: true, unique: false, references: IdempotencyRecord.idempotency_key, allowed_values: [], default: null, min: 1, max: implementation_bounded, constraints: [] }
      - { name: occurred_at, logical_type: UTCInstant, required: true, unique: false, references: null, allowed_values: [], default: command_time, min: null, max: null, constraints: [] }
      - { name: expires_at, logical_type: UTCInstant, required: true, unique: false, references: null, allowed_values: [], default: "occurred_at + configured business-audit retention (90 days by default)", min: null, max: null, constraints: ["controlled retention only"] }
      - { name: immutable_digest, logical_type: Digest, required: true, unique: true, references: null, allowed_values: [], default: calculated, min: null, max: null, constraints: [] }
    constraints:
      - "Runtime actors cannot update or delete audit history."
      - "Accepted mutations and their audit records commit atomically; an audit failure rolls back the mutation."
      - "Denied and failed attempts use a separate append path so their evidence survives business rollback."
      - "Expired audit records cannot reappear through projection rebuild or restore reconciliation."

  - name: OutboxMessage
    logical_domain: SharedPersistenceSupport
    aggregate: OutboxMessage
    aggregate_role: root
    description: "An immutable durable message prepared in the same transaction as its authoritative domain fact."
    immutable: false
    attributes:
      - { name: outbox_message_id, logical_type: UUID, required: true, unique: entity, references: null, allowed_values: [], default: generated, min: null, max: null, constraints: ["also serves as messageId"] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: [] }
      - { name: message_type, logical_type: StableCode, required: true, unique: false, references: ContractCatalog.MessageType, allowed_values: [replenishment.audit.recorded, purchasing.audit.recorded], default: null, min: null, max: null, constraints: ["other U8-owned versioned message types require an approved contract"] }
      - { name: schema_version, logical_type: SemanticVersion, required: true, unique: false, references: ContractCatalog.MessageSchema, allowed_values: [], default: null, min: null, max: null, constraints: ["published schemas are immutable"] }
      - { name: aggregate_type, logical_type: StableCode, required: true, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: aggregate_id, logical_type: UUID, required: true, unique: false, references: DomainAggregate, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: aggregate_version, logical_type: VersionIdentifier, required: true, unique: false, references: DomainAggregate.version, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: business_audit_id, logical_type: UUID, required: true, unique: true, references: BusinessAuditRecord.business_audit_id, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: payload, logical_type: VersionedMessageEnvelope, required: true, unique: false, references: ContractCatalog.MessageSchema, allowed_values: [], default: null, min: null, max: contract_bounded, constraints: ["includes actor, correlation, causation, idempotency key, tenant, placement, and data; excludes secrets and raw source content"] }
      - { name: occurred_at, logical_type: UTCInstant, required: true, unique: false, references: null, allowed_values: [], default: command_time, min: null, max: null, constraints: [] }
      - { name: publication_state, logical_type: PublicationState, required: true, unique: false, references: null, allowed_values: [Pending, Publishing, Published, DeadLettered], default: Pending, min: null, max: null, constraints: [] }
      - { name: attempt_count, logical_type: NonNegativeInteger, required: true, unique: false, references: null, allowed_values: [], default: 0, min: 0, max: configured_retry_bound, constraints: [] }
      - { name: published_at, logical_type: UTCInstant, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: ["set only after broker confirmation"] }
    constraints:
      - "Domain state, BusinessAuditRecord, and the initial Pending outbox message commit atomically."
      - "Publication is at-least-once with publisher confirmation, bounded retry, observable dead letter, and audited replay."
      - "Publication bookkeeping may advance; message identity, schema, payload, provenance, and domain reference are immutable."

  - name: InboxMessage
    logical_domain: SharedPersistenceSupport
    aggregate: InboxMessage
    aggregate_role: root
    description: "The deduplication and processing record for any versioned external message consumed by this unit."
    immutable: false
    attributes:
      - { name: inbox_message_id, logical_type: UUID, required: true, unique: entity, references: ContractCatalog.MessageEnvelope.messageId, allowed_values: [], default: null, min: null, max: null, constraints: ["globally identifies the delivered message"] }
      - { name: retailer_id, logical_type: UUID, required: true, unique: false, references: TenantDirectory.Retailer, allowed_values: [], default: null, min: null, max: null, constraints: ["must match validated envelope and owned effect"] }
      - { name: placement_generation, logical_type: PositiveInteger, required: true, unique: false, references: TenantDirectory.RetailerPlacement.generation, allowed_values: [], default: null, min: 1, max: null, constraints: ["stale generation is rejected"] }
      - { name: consumer_name, logical_type: StableCode, required: true, unique: "consumer_name + inbox_message_id", references: null, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: message_type, logical_type: StableCode, required: true, unique: false, references: ContractCatalog.MessageType, allowed_values: [], default: null, min: null, max: null, constraints: ["must be allowlisted for the consumer"] }
      - { name: schema_version, logical_type: SemanticVersion, required: true, unique: false, references: ContractCatalog.MessageSchema, allowed_values: [], default: null, min: null, max: null, constraints: ["must be compatible"] }
      - { name: payload_hash, logical_type: Digest, required: true, unique: false, references: null, allowed_values: [], default: calculated, min: null, max: null, constraints: ["same message identity with changed payload is rejected"] }
      - { name: processing_state, logical_type: InboxState, required: true, unique: false, references: null, allowed_values: [Processing, Applied, Failed, DeadLettered], default: Processing, min: null, max: null, constraints: [] }
      - { name: effect_reference_type, logical_type: StableCode, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: ["required when Applied and an effect exists"] }
      - { name: effect_reference_id, logical_type: UUID, required: false, unique: false, references: DomainAggregate, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: received_at, logical_type: UTCInstant, required: true, unique: false, references: null, allowed_values: [], default: command_time, min: null, max: null, constraints: [] }
      - { name: completed_at, logical_type: UTCInstant, required: false, unique: false, references: null, allowed_values: [], default: null, min: null, max: null, constraints: [] }
      - { name: attempt_count, logical_type: PositiveInteger, required: true, unique: false, references: null, allowed_values: [], default: 1, min: 1, max: configured_retry_bound, constraints: [] }
    constraints:
      - "The inbox row and any authoritative business effect commit before broker acknowledgement."
      - "Redelivery of an Applied message returns the recorded outcome without repeating the effect."
      - "Inbox presence does not make broker transport exactly-once."

relationships:
  - { from: PlanningPolicy, to: ProductPlanningOverride, direction: "PlanningPolicy -> ProductPlanningOverride", cardinality: "one to zero-or-many", required: false, description: "A policy version contains optional per-product overrides." }
  - { from: PlanningPolicy, to: TenantDirectory.Retailer, direction: "PlanningPolicy -> Retailer", cardinality: "many to one", required: true, description: "Each policy version belongs to one retailer." }
  - { from: PreferredSupplierTermReference, to: Inventory.Product, direction: "PreferredSupplierTermReference -> Product", cardinality: "many historical references to one", required: true, description: "A product has at most one current preferred reference." }
  - { from: PreferredSupplierTermReference, to: SupplierKnowledge.AcceptedSupplierTerm, direction: "PreferredSupplierTermReference -> AcceptedSupplierTerm revision", cardinality: "many references to one revision", required: true, description: "The exact accepted revision is pinned." }
  - { from: ReviewJob, to: ReviewAttempt, direction: "ReviewJob -> ReviewAttempt", cardinality: "one to one-or-many", required: true, description: "Retries append attempts under the admitted job." }
  - { from: ReviewJob, to: ManualReviewCharge, direction: "ReviewJob -> ManualReviewCharge", cardinality: "one to zero-or-one", required: false, description: "Only manual jobs consume a slot." }
  - { from: ManualReviewAllowance, to: ManualReviewCharge, direction: "ManualReviewAllowance -> ManualReviewCharge", cardinality: "one to zero-to-three", required: false, description: "Charges prove accepted quota consumption." }
  - { from: ReviewJob, to: ReviewEvidenceSnapshot, direction: "ReviewJob -> ReviewEvidenceSnapshot", cardinality: "one to one", required: true, description: "Admission pins exactly one immutable snapshot for the logical job." }
  - { from: ReviewAttempt, to: ReviewEvidenceSnapshot, direction: "ReviewAttempt -> ReviewEvidenceSnapshot", cardinality: "many attempts to one snapshot", required: true, description: "Retries reuse the parent job's pinned evidence rather than refreshing it." }
  - { from: ReviewEvidenceSnapshot, to: PlanningPolicy, direction: "ReviewEvidenceSnapshot -> PlanningPolicy", cardinality: "many to one immutable version", required: true, description: "Review pins the exact policy version." }
  - { from: ReviewEvidenceSnapshot, to: Forecasting.ForecastRun, direction: "ReviewEvidenceSnapshot -> ForecastRun", cardinality: "many to zero-or-one immutable run", required: false, description: "Usable evidence pins a run; unavailable, stale, or incompatible admission may preserve status without one." }
  - { from: ReviewEvidenceSnapshot, to: Inventory.InventorySnapshot, direction: "ReviewEvidenceSnapshot -> InventorySnapshot", cardinality: "many to one version", required: true, description: "Review pins inventory position and movement watermark." }
  - { from: ReviewEvidenceSnapshot, to: ProductReviewEvidence, direction: "ReviewEvidenceSnapshot -> ProductReviewEvidence", cardinality: "one to zero-or-many", required: false, description: "Usable per-product evidence is captured when available; RecommendationBlock records products whose evidence cannot be completed." }
  - { from: ProductReviewEvidence, to: PreferredSupplierTermReference, direction: "ProductReviewEvidence -> PreferredSupplierTermReference", cardinality: "many to one immutable preference version", required: true, description: "Baseline calculation pins the Manager selection." }
  - { from: ProductReviewEvidence, to: SupplierKnowledge.AcceptedSupplierTerm, direction: "ProductReviewEvidence -> AcceptedSupplierTerm revision", cardinality: "many to one revision", required: true, description: "Commercial facts trace to the accepted source." }
  - { from: ProductReviewEvidence, to: InboundEvidenceItem, direction: "ProductReviewEvidence -> InboundEvidenceItem", cardinality: "one to zero-or-many", required: false, description: "Dated outstanding commitments are snapshotted per product." }
  - { from: InboundEvidenceItem, to: PurchaseOrderLine, direction: "InboundEvidenceItem -> PurchaseOrderLine", cardinality: "many snapshots to one order line", required: true, description: "Review evidence identifies the Purchasing source." }
  - { from: ReviewJob, to: ReplenishmentRecommendation, direction: "ReviewJob -> ReplenishmentRecommendation", cardinality: "one to zero-or-many", required: false, description: "Usable products yield immutable baseline recommendations." }
  - { from: ReviewJob, to: RecommendationBlock, direction: "ReviewJob -> RecommendationBlock", cardinality: "one to zero-or-many", required: false, description: "Invalid products retain explicit blocking evidence." }
  - { from: ReviewJob, to: ReplenishmentScenario, direction: "ReviewJob -> ReplenishmentScenario", cardinality: "one to zero-or-many", required: false, description: "A terminal review may be the immutable source of explicit comparison scenarios." }
  - { from: ReplenishmentScenario, to: ReviewEvidenceSnapshot, direction: "ReplenishmentScenario -> ReviewEvidenceSnapshot", cardinality: "many to one", required: true, description: "Every scenario reuses one pinned evidence snapshot." }
  - { from: ReplenishmentScenario, to: ScenarioProductParameter, direction: "ReplenishmentScenario -> ScenarioProductParameter", cardinality: "one to zero-or-many", required: false, description: "Only declared per-product differences are stored." }
  - { from: ReplenishmentScenario, to: ReplenishmentRecommendation, direction: "ReplenishmentScenario -> ReplenishmentRecommendation", cardinality: "one to zero-or-many", required: false, description: "Valid scenario products yield immutable recommendations." }
  - { from: ReplenishmentScenario, to: RecommendationBlock, direction: "ReplenishmentScenario -> RecommendationBlock", cardinality: "one to zero-or-many", required: false, description: "Invalid scenario products retain explicit blocks." }
  - { from: ReplenishmentRecommendation, to: ProductReviewEvidence, direction: "ReplenishmentRecommendation -> ProductReviewEvidence", cardinality: "many to one", required: true, description: "Every quantity is reproducible from pinned product evidence." }
  - { from: ReviewPointer, to: ReviewAttempt, direction: "ReviewPointer -> latest ReviewAttempt", cardinality: "one to zero-or-one", required: false, description: "Tracks the latest attempt independently of success." }
  - { from: ReviewPointer, to: ReviewJob, direction: "ReviewPointer -> last successful ReviewJob", cardinality: "one to zero-or-one", required: false, description: "Preserves the most recent usable result reference." }
  - { from: PurchaseProposal, to: ReplenishmentScenario, direction: "PurchaseProposal -> ReplenishmentScenario", cardinality: "many proposals to one scenario", required: true, description: "Draft creation pins its planning source." }
  - { from: PurchaseProposal, to: PurchaseProposalLine, direction: "PurchaseProposal -> PurchaseProposalLine", cardinality: "one to one-or-many", required: true, description: "A proposal contains bounded commercial lines." }
  - { from: PurchaseProposalLine, to: ReplenishmentRecommendation, direction: "PurchaseProposalLine -> ReplenishmentRecommendation", cardinality: "many proposal lines to one recommendation", required: true, description: "Suggested and entered quantities remain distinct and traceable." }
  - { from: PurchaseProposal, to: PurchaseProposal, direction: "replacement PurchaseProposal -> source PurchaseProposal", cardinality: "many replacements to zero-or-one source", required: false, description: "Correction ancestry leaves the source immutable." }
  - { from: PurchaseProposal, to: PurchaseOrder, direction: "PurchaseProposal -> PurchaseOrder", cardinality: "one to zero-or-one", required: false, description: "Only accepted approval creates an order." }
  - { from: PurchaseProposal, to: PurchaseDecision, direction: "PurchaseProposal -> PurchaseDecision", cardinality: "one to zero-or-one", required: false, description: "A Submitted proposal receives at most one accepted Manager decision." }
  - { from: PurchaseDecision, to: PurchaseOrder, direction: "approved PurchaseDecision -> PurchaseOrder", cardinality: "one to zero-or-one", required: false, description: "Approval creates one order; rejection creates none." }
  - { from: PurchaseOrder, to: PurchaseOrderLine, direction: "PurchaseOrder -> PurchaseOrderLine", cardinality: "one to one-or-many", required: true, description: "Order lines copy locked proposal facts." }
  - { from: PurchaseProposalLine, to: PurchaseOrderLine, direction: "PurchaseProposalLine -> PurchaseOrderLine", cardinality: "one to zero-or-one", required: false, description: "An approved line traces to exactly one submitted line." }
  - { from: PurchaseProposal, to: PurchaseCancellation, direction: "PurchaseProposal -> PurchaseCancellation", cardinality: "one to zero-or-one", required: false, description: "A Submitted proposal may be cancelled once." }
  - { from: PurchaseOrder, to: PurchaseCancellation, direction: "PurchaseOrder -> PurchaseCancellation", cardinality: "one to zero-or-one", required: false, description: "An Approved unreceived order may be cancelled once." }
  - { from: PurchaseOrderLine, to: InboundCommitment, direction: "PurchaseOrderLine -> InboundCommitment", cardinality: "one to one", required: true, description: "Approval creates the dated inbound balance." }
  - { from: PurchaseOrder, to: Receipt, direction: "PurchaseOrder -> Receipt", cardinality: "one to zero-or-many", required: false, description: "Approved and PartiallyReceived orders accept valid receipts." }
  - { from: Receipt, to: ReceiptLine, direction: "Receipt -> ReceiptLine", cardinality: "one to one-or-many", required: true, description: "All receipt lines commit atomically." }
  - { from: PurchaseOrderLine, to: ReceiptLine, direction: "PurchaseOrderLine -> ReceiptLine", cardinality: "one to zero-or-many", required: false, description: "Cumulative quantities cannot exceed approval." }
  - { from: ReceiptLine, to: Inventory.StockMovement, direction: "ReceiptLine -> StockMovement", cardinality: "one to one", required: true, description: "Retail Data owns the resulting on-hand movement." }
  - { from: PurchaseProposal, to: PurchaseLifecycleEntry, direction: "PurchaseProposal -> PurchaseLifecycleEntry", cardinality: "one to one-or-many", required: true, description: "The proposal exposes append-only lifecycle history." }
  - { from: PurchaseOrder, to: PurchaseLifecycleEntry, direction: "PurchaseOrder -> PurchaseLifecycleEntry", cardinality: "one to one-or-many", required: true, description: "Order and receipt changes append lifecycle facts." }
  - { from: IdempotencyRecord, to: DomainAggregate, direction: "IdempotencyRecord -> resulting domain aggregate", cardinality: "many to zero-or-one", required: false, description: "Committed command results retain their stable target." }
  - { from: DomainAggregate, to: BusinessAuditRecord, direction: "domain aggregate mutation -> BusinessAuditRecord", cardinality: "one mutation to one-or-many audit facts", required: true, description: "Sensitive accepted mutations require immutable audit." }
  - { from: BusinessAuditRecord, to: OutboxMessage, direction: "BusinessAuditRecord -> OutboxMessage", cardinality: "one to one", required: true, description: "Authoritative audit facts are propagated durably." }
  - { from: InboxMessage, to: DomainAggregate, direction: "InboxMessage -> applied domain aggregate", cardinality: "many to zero-or-one", required: false, description: "A valid consumed message may produce one governed effect." }
```

## Readable Summary

The model contains three ownership areas. Replenishment owns versioned policy and preferred-term choices, serialized review jobs and their quota charges, immutable evidence snapshots, deterministic scenarios, recommendations, blocked-product evidence, and separate latest-attempt and last-success pointers. A review result can therefore be reproduced even after inventory, forecasts, policies, accepted terms, or placement routing change.

Purchasing starts with a proposal that is editable only in `Draft`. Submission locks every commercial and provenance fact. A Manager decision either rejects the proposal or creates an approved order and one dated inbound commitment per order line. Receipts reduce those commitments and create Retail Data stock movements through the governed cross-domain port; they never turn expected inbound directly into on-hand stock. Cancellation, receipt, and concurrent decisions use expected aggregate versions so only one valid outcome commits.

Shared support entities make command replay and asynchronous propagation safe. Idempotency is bound to retailer, operation, key, payload hash, and placement generation. Accepted business changes carry immutable audit and outbox facts in the same transaction. An inbox record is used wherever this unit consumes a durable message, preserving at-least-once delivery without repeating an authoritative effect.

## Sources

- `construction/planning-purchasing/functional-design/functional-design-questions.md`, confirmed Q1-Q9, ambiguity scan, and consolidated summary: calculation order, preferred terms, policy defaults, schedule, partial outcomes, immutable evidence, proposal boundaries, expected arrivals, coverage gaps, quotas, idempotency, and atomic audit/outbox behavior.
- `inception/units-generation/unit-of-work.md`, U8 and cross-unit rules: Replenishment/Purchasing ownership, governed persistence, deterministic calculation, one active review, quota, immutable lines, approval, receipt atomicity, tenant identity, and placement generation.
- `inception/units-generation/unit-of-work-story-map.md`, U8 assignment and order: US5.1-US6.6, US7.6, US7.8-US7.10, US8.1-US8.5, US9.1, US9.6, US9.9, and US10.1.
- `inception/user-stories/stories.md`, AC5.1.1-AC6.6.4, AC7.6.1-AC7.10.4, AC8.5.1-AC8.5.3, AC9.1.1-AC9.1.3, AC9.6.1-AC9.6.3, AC9.9.1-AC9.9.3, and AC10.1.1-AC10.1.4.
- `inception/requirements-analysis/requirements.md`, FR2, FR4-FR9.5, FR11, FR14, FR17-FR20; the FR7/FR8 transition matrix; NFR1, NFR3-NFR4, NFR7-NFR10, NFR13-NFR15; and constraints C2-C5, C9-C10.
- `inception/domain-design/components.md`, Replenishment and Purchasing component ownership, dependencies, entity catalogue, audit/outbox responsibility, and future tenant-extraction seam.
- `inception/contract-design/contract-summary.md`, C01, C08-C10, C14-C15, contract ownership, authority/tenancy invariants, and retry/error profiles.

## Assumptions & Open Questions

- No functional ambiguity remains from the confirmed question set. `Succeeded` and `PartiallySucceeded` both count as usable for `ReviewPointer.last_successful_review_job_id`; consumers must still preserve the exact outcome and product-level blocks.
- `PurchaseProposal` represents the upstream catalogue's proposal entity and carries the human-facing Draft/Submitted decision lifecycle. An accepted approval creates the separate `PurchaseOrder`; this preserves the confirmed transition semantics and the component catalogue's separate proposal and order ownership.
- `InboxMessage` is part of the unit's persistence model only for message types that U8 is later approved to consume. Exact inbound message types, retry counts, backoff, and dead-letter thresholds remain contract/implementation decisions; their absence does not permit unbounded retry.
- Exact decimal precision, identifier length, bounded-text limits, response snapshot limits, and physical indexing/partitioning are implementation decisions. They must preserve whole-pack arithmetic, currency isolation, deterministic hashing, and the stated uniqueness constraints.
- Business-audit live retention defaults to 90 days. The maintenance schedule and tolerable expiry lag remain OQ10; backup frequency, backup expiry, recovery time, and recovery-point objectives remain OQ5. Restore exposure must reconcile retention so expired audit facts cannot reappear.
- Forecast freshness remains governed by the Forecasting contract and OQ2. This model records the admitted freshness evidence and explicit failure/block reason without selecting a new threshold.
- The exact invalid-time and ambiguous-time mapping is owned by the shared retailer calendar policy used by Forecasting. Reviews pin that policy version and apply the confirmed 08:00 retailer-local schedule without redefining those rules here.
