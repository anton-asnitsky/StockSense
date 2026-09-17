# Forecasting Business Rules

Unit: U7 Forecasting (`forecasting`)

Confirmation basis: Forecasting consolidated summary reconfirmed as `Looks correct` on 2026-09-14.

The YAML block is the source of truth for Forecasting decision logic. Rules describe U7 behavior and its contract obligations. Planning owns replenishment and review calculations; Model Lifecycle owns training, evaluation, promotion, and rollback; Contracts owns canonical schema packaging; Platform owns provisioning; Audit Evidence owns searchable projections; and the Web units own presentation.

```yaml source-of-truth
schemaVersion: "1.0.0"
unit: forecasting
rules:
  - id: BR1.1
    statement: "Every protected Forecasting operation requires current retailer authority."
    category: authorization
    appliesTo: [ForecastRequest, ForecastRun, ForecastPublication, CurrentForecastPointer]
    trigger: "A human read or mutation is requested."
    logic: "IF authentication, current retailer membership, required role, placement generation, or resource ownership is invalid THEN deny the operation before reading or changing business state."
    violationBehavior: "Return a safe unauthorized or hidden-resource outcome and create no business effect."
    source: [FR2, NFR3, AC7.6.3]

  - id: BR1.2
    statement: "Scheduler and worker authority is limited to the assigned retailer and job."
    category: authorization
    appliesTo: [ForecastRequest, ForecastAttempt, ForecastInboxReceipt]
    trigger: "A scheduler or worker invokes Forecasting."
    logic: "IF issuer, audience, workload scope, retailer, job identity, or placement generation does not match the assigned work THEN deny execution."
    violationBehavior: "Record a safe denied attempt and commit no run, attempt output, or publication."
    source: [NFR5, AC8.5.2]

  - id: BR1.3
    statement: "Identifiers select resources but never grant tenant authority."
    category: authorization
    appliesTo: [ForecastRequest, ForecastRun, ForecastSeries, ForecastPublication]
    trigger: "A caller supplies a retailer, product, run, publication, or artifact identifier."
    logic: "IF the identifier is foreign, substituted, or outside current authority THEN do not disclose whether the resource exists."
    violationBehavior: "Return the safe hidden-resource outcome and no data."
    source: [NFR3, AC7.6.3, AC9.1.3]

  - id: BR1.4
    statement: "Only an authorized Operator may rerun, repair, reconcile, or decide partial publication."
    category: authorization
    appliesTo: [ForecastRequest, ForecastAttempt, PartialPublicationAcknowledgement, ForecastReconciliation]
    trigger: "A privileged Forecasting command is requested."
    logic: "IF the current actor is not an authorized Operator for the retailer and action THEN reject the command."
    violationBehavior: "Create no privileged effect and retain a safe rejected-attempt audit record."
    source: [FR2, FR17.1]

  - id: BR1.5
    statement: "No actor may edit a published series, terminal run, attempt, acknowledgement, or pointer history."
    category: constraint
    appliesTo: [ForecastRun, ForecastAttempt, ForecastSeries, ForecastPoint, PartialPublicationAcknowledgement, ForecastPointerHistory]
    trigger: "An in-place change to immutable Forecasting evidence is attempted."
    logic: "IF the target is finalized or append-only THEN reject the mutation and require a new request revision or appended record where allowed."
    violationBehavior: "Preserve the original record and audit the denied mutation safely."
    source: [NFR4, NFR15, AC9.1.3]

  - id: BR2.1
    statement: "One logical scheduled forecast is due at 02:00 for each retailer-local date."
    category: calculation
    appliesTo: [ForecastRequest]
    trigger: "The daily forecast due instant is resolved."
    logic: "IF 02:00 is invalid THEN use the first valid instant afterward; IF it is ambiguous THEN use the earlier occurrence; THEN record the resolved UTC instant."
    violationBehavior: "Reject an inconsistent schedule resolution and create no request."
    source: [FR5, FR11, AC4.1.2]

  - id: BR2.2
    statement: "Retailer and local date form the stable identity of the initial scheduled request."
    category: constraint
    appliesTo: [ForecastRequest]
    trigger: "A scheduled request is admitted or replayed."
    logic: "IF an initial request already exists for retailer and local date THEN return it rather than create another revision or effect."
    violationBehavior: "Return the authorized existing result and suppress duplicate work."
    source: [FR5, AC4.1.2]

  - id: BR2.3
    statement: "An idempotency key is bound to one request digest."
    category: validation
    appliesTo: [ForecastRequest]
    trigger: "A request repeats an operation idempotency key."
    logic: "IF the digest matches THEN return the original result; IF it differs THEN report a conflict and create no work."
    violationBehavior: "Preserve the original request and outcome."
    source: [NFR7, AC4.1.2, AC8.5.2]

  - id: BR2.4
    statement: "A changed-input Operator rerun creates the next immutable local-date revision."
    category: policy
    appliesTo: [ForecastRequest, ForecastRun]
    trigger: "An authorized Operator requests a rerun."
    logic: "IF authority and dependency resolution pass THEN server-assign the next revision; callers cannot choose or overwrite a revision."
    violationBehavior: "Reject invalid authority, stale placement, or caller-selected revision without changing prior runs."
    source: [FR5, FR13]

  - id: BR2.5
    statement: "Execution retry remains under the same logical run and pinned inputs."
    category: constraint
    appliesTo: [ForecastRun, ForecastAttempt]
    trigger: "A failed or interrupted attempt is retryable."
    logic: "IF retry remains eligible THEN append the next attempt number under the same run; do not create another schedule effect or revision."
    violationBehavior: "Reject retry that changes pinned inputs or rewrites an attempt."
    source: [NFR7, AC8.5.2]

  - id: BR2.6
    statement: "Forecast scheduling is independent of Planning's scheduled and manual reviews."
    category: policy
    appliesTo: [ForecastRequest]
    trigger: "Forecast or review work becomes due."
    logic: "IF Planning has active, queued, retained, or quota-bearing review work THEN it does not change Forecasting's daily request identity, and Forecasting does not consume or enforce Planning's allowance."
    violationBehavior: "Keep the Forecasting schedule unchanged and leave review serialization and quota decisions to Planning."
    source: [FR9.4, AC5.2.1, AC5.2.2]

  - id: BR2.7
    statement: "Each unit preserves its own local date, trigger, input versions, and outcome across restart and redelivery."
    category: constraint
    appliesTo: [ForecastRequest, ForecastRun]
    trigger: "Forecasting or Planning scheduling resumes after interruption."
    logic: "IF a Forecasting delivery replays THEN deduplicate by the forecast key; Planning remains responsible for retaining and serializing its own review job."
    violationBehavior: "Prevent duplicate Forecasting effects and do not alter Planning quota or overlap state."
    source: [FR9.4, AC5.2.3, AC5.2.4]

  - id: BR3.1
    statement: "Admission validates retailer, local calendar, source, product scope, and placement as one context."
    category: validation
    appliesTo: [ForecastRequest, ForecastInputSnapshot]
    trigger: "A scheduled request or rerun is admitted."
    logic: "IF tenant, placement, calendar version, source version, cutoff, checksum, or active product scope is missing or inconsistent THEN the run is unavailable or failed before inference."
    violationBehavior: "Publish an explicit safe reason and do not substitute current mutable input."
    source: [FR5, FR11, NFR3]

  - id: BR3.2
    statement: "A run pins all data, calendar, schema, configuration, and placement inputs before execution."
    category: constraint
    appliesTo: [ForecastRun, ForecastInputSnapshot]
    trigger: "Admission succeeds."
    logic: "IF the complete input snapshot cannot be made immutable THEN do not queue the run."
    violationBehavior: "Mark the run unavailable or failed with explicit missing provenance."
    source: [FR5, NFR15, AC4.1.1]

  - id: BR3.3
    statement: "Every run identifies its forecast horizon and model, data, calendar, configuration, schema, and placement versions."
    category: constraint
    appliesTo: [ForecastRun, ForecastInputSnapshot, ForecastModelResolution]
    trigger: "A run is recorded or returned as evidence."
    logic: "IF any required version or digest is absent THEN the run is not valid publication evidence."
    violationBehavior: "Keep the run non-current and report incomplete provenance."
    source: [FR5, FR13, AC4.1.1]

  - id: BR3.4
    statement: "Model Lifecycle resolves the single active compatible Model Release for each run."
    category: authorization
    appliesTo: [ForecastModelResolution]
    trigger: "Forecasting requests active model resolution."
    logic: "IF the caller supplies an arbitrary model route or the resolved release is not active, validated, compatible, and retailer-scoped THEN reject it."
    violationBehavior: "Return forecast unavailable or failed without choosing another release."
    source: [FR13, AC4.6.1]

  - id: BR3.5
    statement: "Forecasting is unavailable before an authorized promotion exists."
    category: policy
    appliesTo: [ForecastModelResolution, ForecastRun]
    trigger: "No active compatible Model Release can be resolved."
    logic: "IF no release is active THEN do not select seasonal-naive, moving-average, trained, prior, or external output implicitly."
    violationBehavior: "Return explicit Unavailable with no forecast values."
    source: [FR5, FR13]

  - id: BR3.6
    statement: "Pinned model artifacts and contracts must verify before inference."
    category: validation
    appliesTo: [ForecastModelResolution, ForecastAttempt]
    trigger: "An attempt prepares to execute."
    logic: "IF artifact checksum, runtime profile, input schema, output schema, release identity, or retailer scope does not match the pinned resolution THEN fail the attempt or run."
    violationBehavior: "Retain the failure and do not substitute another artifact or model."
    source: [FR13, NFR11]

  - id: BR3.7
    statement: "Corrections, promotions, and rollbacks never mutate an admitted run."
    category: constraint
    appliesTo: [ForecastInputSnapshot, ForecastModelResolution, ForecastRun]
    trigger: "An upstream source or active model changes after admission."
    logic: "IF dependencies change after pinning THEN apply them only to a later scheduled request or authorized rerun revision."
    violationBehavior: "Keep every existing attempt and result bound to the original snapshot."
    source: [FR13, NFR15]

  - id: BR4.1
    statement: "Only the current valid attempt lease may finalize execution output."
    category: authorization
    appliesTo: [ForecastAttempt, ForecastInboxReceipt]
    trigger: "A worker starts or finalizes an attempt."
    logic: "IF message identity, job authority, run version, placement, lease owner, or lease expiry is invalid THEN the worker cannot finalize."
    violationBehavior: "Record the attempt as interrupted or failed and expose no staged output."
    source: [NFR5, NFR7, AC8.5.2]

  - id: BR4.2
    statement: "Attempts are append-only and preserve every outcome."
    category: constraint
    appliesTo: [ForecastAttempt]
    trigger: "Execution starts, retries, fails, or is interrupted."
    logic: "IF another try is needed THEN append a new attempt; never overwrite succeeded, failed, interrupted, or cancelled evidence."
    violationBehavior: "Reject in-place mutation and retain the original attempt."
    source: [FR13, NFR15]

  - id: BR4.3
    statement: "A run covers every active retailer, store, and product in its pinned scope."
    category: constraint
    appliesTo: [ForecastInputSnapshot, ForecastProductOutcome, ForecastSeries]
    trigger: "Inference and product aggregation finish."
    logic: "IF any in-scope product lacks an explicit outcome or any out-of-scope product appears THEN the run cannot succeed."
    violationBehavior: "Fail the affected product or run and report the coverage mismatch."
    source: [FR5, AC4.1.1]

  - id: BR4.4
    statement: "A usable product series contains exactly horizon days 1 through 28."
    category: validation
    appliesTo: [ForecastSeries, ForecastPoint]
    trigger: "A product output is validated."
    logic: "IF a horizon day is missing, duplicated, unordered, outside 1 through 28, or mapped to a nonconsecutive local date THEN the product fails."
    violationBehavior: "Retain an explicit unavailable product outcome and publish no series for that product."
    source: [FR5, AC4.1.1]

  - id: BR4.5
    statement: "Every expected-demand value is a finite nonnegative decimal at declared precision."
    category: validation
    appliesTo: [ForecastPoint, ForecastSeries]
    trigger: "A product output value is validated."
    logic: "IF a value is negative, non-finite, missing, extra, or not representable at declared deterministic precision THEN the product fails."
    violationBehavior: "Do not clip, fill, truncate, coerce to zero, or silently replace the value."
    source: [FR5, AC5.1.2]

  - id: BR4.6
    statement: "Every in-scope product has an explicit succeeded or failed outcome."
    category: validation
    appliesTo: [ForecastProductOutcome]
    trigger: "Product validation completes."
    logic: "IF a product has one complete valid series THEN mark it succeeded and usable; ELSE mark it failed and unavailable with a safe reason."
    violationBehavior: "Do not omit the product or imply zero demand."
    source: [FR5, AC4.1.3]

  - id: BR4.7
    statement: "Run outcome is derived from validated product coverage and run-level integrity."
    category: calculation
    appliesTo: [ForecastRun, ForecastProductOutcome]
    trigger: "All product outcomes are aggregated."
    logic: "IF all in-scope products succeed THEN Succeeded; IF at least one succeeds and at least one fails THEN PartiallySucceeded; IF none is usable or a run-level integrity check fails THEN Failed."
    violationBehavior: "Reject inconsistent counts or status and keep output non-current."
    source: [FR5, AC4.1.3]

  - id: BR4.8
    statement: "Attempt finalization is atomic across outcome, product results, series, provenance, audit, and outbox."
    category: constraint
    appliesTo: [ForecastRun, ForecastAttempt, ForecastProductOutcome, ForecastSeries, ForecastAuditRecord, ForecastOutboxMessage]
    trigger: "An attempt reaches a terminal result."
    logic: "IF any required authoritative record cannot commit THEN none of the finalization effect commits."
    violationBehavior: "Leave the run retryable or failed and expose no partial authoritative finalization."
    source: [FR17, AC9.1.1, AC9.1.2]

  - id: BR4.9
    statement: "Operational inference records the promoted release kind without taking ownership of model evaluation."
    category: policy
    appliesTo: [ForecastModelResolution, ForecastRun]
    trigger: "A seasonal-naive, moving-average, or trained release is served."
    logic: "IF Forecasting reports model identity or evaluated quality THEN it cites Model Lifecycle evidence and does not recalculate, promote, or claim comparative improvement."
    violationBehavior: "Withhold unsupported quality claims while preserving operational status."
    source: [FR13, NFR15, AC4.1.1, AC4.6.1]

  - id: BR5.1
    statement: "A fully Succeeded revision may become current automatically after atomic finalization."
    category: policy
    appliesTo: [ForecastRun, ForecastPublication, CurrentForecastPointer]
    trigger: "A Succeeded run finalizes."
    logic: "IF publication eligibility and expected pointer version pass THEN commit publication and pointer advancement atomically."
    violationBehavior: "Leave the prior pointer unchanged on any conflict or write failure."
    source: [FR5]

  - id: BR5.2
    statement: "A PartiallySucceeded revision remains non-current until an Operator decision."
    category: constraint
    appliesTo: [ForecastRun, ForecastPublication]
    trigger: "A PartiallySucceeded run finalizes."
    logic: "IF at least one product failed THEN set publication to awaitingAcknowledgement and do not advance the pointer automatically."
    violationBehavior: "Expose coverage and safe failures for inspection while retaining the prior current pointer."
    source: [FR5, AC4.1.3]

  - id: BR5.3
    statement: "Partial publication acknowledgement binds an Operator decision to the exact coverage digest."
    category: authorization
    appliesTo: [ForecastPublication, PartialPublicationAcknowledgement]
    trigger: "An Operator acknowledges or rejects a partial revision."
    logic: "IF authority, expected publication version, run eligibility, or coverage digest has changed THEN the decision cannot advance the pointer."
    violationBehavior: "Report a conflict and preserve the pending publication and current pointer."
    source: [FR5, FR17.1]

  - id: BR5.4
    statement: "Acknowledgement selects partial coverage but never edits forecast values or product outcomes."
    category: constraint
    appliesTo: [PartialPublicationAcknowledgement, ForecastProductOutcome, ForecastSeries]
    trigger: "A partial revision is acknowledged."
    logic: "IF acknowledgement succeeds THEN retain failed products as unavailable and successful series unchanged."
    violationBehavior: "Reject any acknowledgement payload that attempts to alter output."
    source: [FR5]

  - id: BR5.5
    statement: "Current selection is server-owned and version-guarded."
    category: authorization
    appliesTo: [CurrentForecastPointer, ForecastPublication]
    trigger: "A pointer is created or advanced."
    logic: "IF the caller selects an arbitrary run, tenant/date/revision mismatches, or expected pointer version is stale THEN do not change current selection."
    violationBehavior: "Return a conflict or safe invalid-selection outcome and preserve the pointer."
    source: [FR5, NFR3]

  - id: BR5.6
    statement: "Failed, unavailable, corrupt, incompatible, or unreconciled revisions never become current."
    category: validation
    appliesTo: [ForecastRun, ForecastPublication, CurrentForecastPointer]
    trigger: "Publication eligibility is evaluated."
    logic: "IF a run lacks eligible usable output or validated provenance THEN it cannot be selected."
    violationBehavior: "Retain explicit status and the prior pointer without substitution."
    source: [FR5, AC4.1.3, AC5.1.3]

  - id: BR5.7
    statement: "Consumers must name required products and evaluate returned coverage."
    category: validation
    appliesTo: [ForecastPublication, ForecastProductOutcome, ForecastSeries]
    trigger: "Planning, Purchasing, or the assistant requests usable evidence."
    logic: "IF any required product is failed, absent, stale, incompatible, or outside authority THEN the response cannot claim complete usable coverage."
    violationBehavior: "Return explicit partial, stale, or unavailable details; never fill missing demand with zero."
    source: [FR5, FR6, AC4.6.2, AC5.1.3, AC7.6.2]

  - id: BR5.8
    statement: "Every superseded revision and pointer reason remains queryable."
    category: constraint
    appliesTo: [ForecastPublication, CurrentForecastPointer, ForecastPointerHistory]
    trigger: "A newer eligible revision becomes current or a rerun fails."
    logic: "IF selection changes THEN append history; IF a newer run fails THEN leave the prior pointer and its original facts unchanged."
    violationBehavior: "Reject history deletion or retroactive pointer rewriting."
    source: [FR5, FR13, AC4.6.3]

  - id: BR6.1
    statement: "Freshness ends at the next retailer-local 02:00 due time plus six hours."
    category: calculation
    appliesTo: [ForecastPublication, CurrentForecastPointer]
    trigger: "Current forecast freshness is evaluated."
    logic: "IF current time is before the computed boundary and all compatibility checks pass THEN Fresh; ELSE Stale."
    violationBehavior: "Return Stale with the boundary and reason rather than current-usable status."
    source: [FR5, FR11, AC4.6.2]

  - id: BR6.2
    statement: "A latest failure never relabels an older publication as fresh."
    category: constraint
    appliesTo: [ForecastRun, CurrentForecastPointer, ForecastPointerHistory]
    trigger: "Status is read after newer work fails or remains unacknowledged."
    logic: "IF the latest run is not current THEN report its outcome separately and retain the selected revision's original freshness boundary."
    violationBehavior: "Reject any derived status that extends or resets the older publication's freshness."
    source: [FR5, AC4.6.3]

  - id: BR6.3
    statement: "Forecast status exposes model evidence, age, run outcome, publication, and product coverage."
    category: policy
    appliesTo: [ForecastRun, ForecastModelResolution, ForecastPublication]
    trigger: "An authorized status view is requested."
    logic: "IF status is returned THEN include latest and current identities, model version and cited evaluation summary, generated time, age, freshness, coverage, and safe limitations."
    violationBehavior: "Return incomplete-evidence status rather than imply usability."
    source: [FR5, FR13, AC4.6.1]

  - id: BR6.4
    statement: "Failed, stale, partial, and unavailable states remain explicit on reads."
    category: policy
    appliesTo: [ForecastRun, ForecastPublication, CurrentForecastPointer]
    trigger: "Forecast results are opened or requested as latest."
    logic: "IF no eligible fresh complete result exists THEN state the actual outcome and do not present it as current complete demand."
    violationBehavior: "Return an explicit non-usable or limited response."
    source: [FR5, NFR14, AC4.1.3]

  - id: BR6.5
    statement: "Known version incompatibility invalidates usability before the time boundary."
    category: validation
    appliesTo: [ForecastInputSnapshot, ForecastModelResolution, ForecastPublication]
    trigger: "Source, model, calendar, configuration, schema, or placement compatibility changes."
    logic: "IF the current revision is known incompatible THEN classify it Stale or Unavailable immediately."
    violationBehavior: "Do not serve a complete-usable response."
    source: [FR5, AC5.1.3]

  - id: BR6.6
    statement: "Assistant evidence is bounded, tenant-authorized, versioned, and limitation-preserving."
    category: authorization
    appliesTo: [ForecastRun, ForecastSeries, ForecastProductOutcome]
    trigger: "The assistant requests forecast status or evidence."
    logic: "IF the explicit product set is authorized and within bounds THEN return cited status and series; ELSE deny or limit it without expanding scope."
    violationBehavior: "Disclose missing or stale evidence and never invent demand or a citation."
    source: [FR14, AC7.6.1, AC7.6.2, AC7.6.3]

  - id: BR7.1
    statement: "Every accepted Forecasting mutation commits its business effect, audit, and outbox together."
    category: constraint
    appliesTo: [ForecastRequest, ForecastRun, ForecastPublication, PartialPublicationAcknowledgement, ForecastAuditRecord, ForecastOutboxMessage]
    trigger: "Admission, finalization, publication, acknowledgement, rerun, repair, or recovery decision commits."
    logic: "IF required audit or outbox persistence fails THEN the business mutation does not commit."
    violationBehavior: "Return failure and preserve the pre-mutation state."
    source: [FR17, FR17.1, AC9.1.1, AC9.1.2]

  - id: BR7.2
    statement: "Committed outbox records publish durably with confirmation after the authoritative effect."
    category: constraint
    appliesTo: [ForecastOutboxMessage]
    trigger: "A committed Forecasting event awaits publication."
    logic: "IF confirmation is absent THEN keep the outbox record pending and eligible for bounded retry."
    violationBehavior: "Do not mark delivery confirmed or roll back the already committed business effect."
    source: [NFR7, AC8.5.1]

  - id: BR7.3
    statement: "Forecasting message delivery is at least once and effects are idempotent."
    category: policy
    appliesTo: [ForecastOutboxMessage, ForecastInboxReceipt]
    trigger: "A message is delivered or redelivered."
    logic: "IF message identity was processed before THEN return the recorded effect; ELSE validate and commit inbox plus effect before acknowledgement."
    violationBehavior: "Do not claim exactly-once transport or duplicate the effect."
    source: [NFR7, AC8.5.1, AC8.5.2]

  - id: BR7.4
    statement: "Consumers revalidate contract, tenant, job, placement, and aggregate version before committing an effect."
    category: authorization
    appliesTo: [ForecastInboxReceipt]
    trigger: "Forecasting consumes an asynchronous command or event."
    logic: "IF any authority or version check fails THEN commit no business effect and do not acknowledge success."
    violationBehavior: "Record a safe rejected or failed receipt and follow bounded failure handling."
    source: [NFR3, NFR5, NFR7, AC8.5.2]

  - id: BR7.5
    statement: "Exhausted message retries enter observable dead-letter handling and require authorized replay."
    category: policy
    appliesTo: [ForecastOutboxMessage, ForecastInboxReceipt, ForecastAttempt]
    trigger: "Configured retry bounds are exhausted."
    logic: "IF processing remains unsuccessful THEN retain the failed outcome and dead-letter identity; IF replay is requested THEN revalidate Operator and job authority."
    violationBehavior: "Do not retry without bound, erase the failure, or duplicate an effect."
    source: [NFR7, AC8.5.3]

  - id: BR7.6
    statement: "Rejected attempts are durably audited without committing the rejected business mutation."
    category: policy
    appliesTo: [ForecastAuditRecord]
    trigger: "Authorization, validation, concurrency, or idempotency rejects a request."
    logic: "IF the business transaction rolls back or never starts THEN use the separate rejection-audit path with safe actor, tenant, target, outcome, and provenance."
    violationBehavior: "Do not lose the rejection record or expose protected request details."
    source: [FR17, FR17.1, AC9.1.2]

  - id: BR7.7
    statement: "Forecast read caches are disposable and tenant, version, coverage, and authority scoped."
    category: constraint
    appliesTo: [ForecastReadCacheEntry]
    trigger: "A forecast read is cached, retrieved, or invalidated."
    logic: "IF cache identity or authoritative version does not exactly match THEN ignore the entry; authoritative commits invalidate affected entries."
    violationBehavior: "Perform an authorized authoritative read or return explicit degradation; never weaken authority or freshness."
    source: [FR19, NFR3]

  - id: BR7.8
    statement: "Forecasting REST and asynchronous boundaries use versioned governed contracts."
    category: validation
    appliesTo: [ForecastRequest, ForecastRun, ForecastOutboxMessage, ForecastInboxReceipt]
    trigger: "A Forecasting API, command, or event is introduced or changed."
    logic: "IF payload, authentication, tenant context, stable errors, idempotency, examples, or compatibility evidence is missing THEN the boundary is incomplete."
    violationBehavior: "Fail applicable contract validation and do not claim boundary acceptance."
    source: [NFR8, AC8.2.1, AC8.2.2]

  - id: BR7.9
    statement: "Invalid examples and incompatible Forecasting contract changes fail before integration."
    category: validation
    appliesTo: [ForecastRequest, ForecastRun, ForecastOutboxMessage]
    trigger: "Contract checks evaluate a candidate Forecasting change."
    logic: "IF an example is invalid or a change breaks the approved compatibility policy THEN validation fails."
    violationBehavior: "Block the applicable integration decision and retain actionable findings."
    source: [NFR8, NFR13, AC8.2.3]

  - id: BR7.10
    statement: "Forecasting uses owned contracts and never accesses another unit's storage directly."
    category: constraint
    appliesTo: [ForecastInputSnapshot, ForecastModelResolution, ForecastSeries]
    trigger: "Forecasting reads input, model metadata, or serves downstream evidence."
    logic: "IF data belongs to Retail Data or Model Lifecycle THEN consume C06 or C07; IF Planning or assistant needs forecasts THEN serve C10 or C13."
    violationBehavior: "Reject direct cross-unit storage access or client-selected routing."
    source: [NFR3, NFR4, NFR8]

  - id: BR8.1
    statement: "Recovery restores all authoritative Forecasting records before exposure."
    category: constraint
    appliesTo: [ForecastRequest, ForecastRun, ForecastAttempt, ForecastProductOutcome, ForecastSeries, ForecastPublication, CurrentForecastPointer, ForecastAuditRecord, ForecastOutboxMessage, ForecastInboxReceipt]
    trigger: "Forecasting is restored into a clean or repaired environment."
    logic: "IF requests, runs, attempts, product outcomes, series, publications, pointers, acknowledgements, audit, inbox, or outbox history is absent THEN current forecasts remain unavailable."
    violationBehavior: "Do not declare Forecasting recovered or expose a current pointer."
    source: [FR20, AC9.6.1, AC9.9.1]

  - id: BR8.2
    statement: "Restored pointers enter reconciliation before becoming available."
    category: validation
    appliesTo: [ForecastReconciliation, CurrentForecastPointer]
    trigger: "Restored Forecasting state is loaded."
    logic: "IF reconciliation has not passed tenant, placement, schedule, provenance, checksum, schema, runtime, series, coverage, pointer, acknowledgement, retention, and replay checks THEN the pointer is not available."
    violationBehavior: "Keep the pointer reconciling or unavailable with mismatch reasons."
    source: [FR20, AC9.6.1, AC9.9.1]

  - id: BR8.3
    statement: "A restored running attempt becomes interrupted rather than successful."
    category: policy
    appliesTo: [ForecastAttempt, ForecastRun]
    trigger: "Recovery encounters nonterminal execution state."
    logic: "IF completion evidence is absent THEN mark the attempt interrupted and evaluate ordinary retry eligibility under unchanged pinned inputs."
    violationBehavior: "Never infer successful output from pre-recovery running state."
    source: [FR20, AC9.6.3]

  - id: BR8.4
    statement: "Corrupt, incomplete, foreign, or incompatible restored evidence fails closed."
    category: validation
    appliesTo: [ForecastReconciliation, CurrentForecastPointer]
    trigger: "Backup and restored integrity are checked."
    logic: "IF required records, digests, relationships, tenant ownership, or compatibility cannot be proven THEN reconciliation fails."
    violationBehavior: "Keep Forecasting unavailable and do not claim recovery."
    source: [FR20, AC9.9.3]

  - id: BR8.5
    statement: "Replay, retry, application rollback, and model rollback preserve immutable forecast effects."
    category: constraint
    appliesTo: [ForecastRun, ForecastAttempt, ForecastPublication, ForecastInboxReceipt]
    trigger: "Recovery replay or rollback is exercised."
    logic: "IF an identity was already committed THEN return its recorded effect; model rollback affects only newly admitted runs."
    violationBehavior: "Prevent duplicate output, pointer rewriting, and retroactive model substitution."
    source: [FR20, NFR7, AC9.6.3]

  - id: BR8.6
    statement: "Expired audit and Forecasting records do not reappear through restore or replay."
    category: policy
    appliesTo: [ForecastAuditRecord, ForecastReconciliation]
    trigger: "Retention reconciliation runs before exposure."
    logic: "IF a record is expired under the approved retention policy THEN exclude it consistently from live access and replay eligibility."
    violationBehavior: "Fail reconciliation when expired data would be reintroduced."
    source: [NFR9, AC9.1.3, AC9.9.2]

  - id: BR8.7
    statement: "Forecasting preserves retained source identities needed by downstream projection rebuilds."
    category: constraint
    appliesTo: [ForecastAuditRecord, ForecastOutboxMessage, ForecastReconciliation]
    trigger: "Audit or other downstream projections are rebuilt."
    logic: "IF a retained Forecasting event is replayed THEN preserve its source versions, deletion or expiry semantics, tenant, correlation, and original identity."
    violationBehavior: "Reject inconsistent replay evidence; projection rebuilding remains owned by the downstream unit."
    source: [FR20, AC9.6.2]

  - id: BR8.8
    statement: "Recovery evidence records actual counts, elapsed time, observed loss, mismatches, and limitations."
    category: policy
    appliesTo: [ForecastReconciliation]
    trigger: "A Forecasting recovery exercise completes."
    logic: "IF measured recovery evidence or approved-objective comparison is absent THEN recovery cannot be reported as successful."
    violationBehavior: "Report failed or limited recovery with unresolved parameters; do not invent an objective or result."
    source: [FR20, NFR15, AC9.6.3]

  - id: BR9.1
    statement: "Planning receives immutable 28-day forecast evidence and remains owner of replenishment and purchasing decisions."
    category: policy
    appliesTo: [ForecastRun, ForecastSeries, ForecastPublication]
    trigger: "Planning or Purchasing requests C10 evidence."
    logic: "IF required products are covered and fresh THEN return series and complete forecast provenance; Planning still resolves inventory, inbound, terms, lead time, MOQ, packs, buffers, and approval revalidation."
    violationBehavior: "Return explicit partial, stale, or unavailable evidence and perform no replenishment calculation."
    source: [FR6, AC5.1.1, AC5.1.3]

  - id: BR9.2
    statement: "Forecasting preserves exact demand values without taking ownership of supplier or replenishment fixtures."
    category: policy
    appliesTo: [ForecastSeries, ForecastPoint]
    trigger: "Planning evaluates zero demand, MOQ, pack, buffer, or synthetic supplier-term scenarios."
    logic: "IF Forecasting supplies a valid series THEN preserve its exact values and provenance; Planning and Supplier Knowledge own supplier terms and expected quantity calculations."
    violationBehavior: "Do not alter demand to satisfy a downstream fixture or claim its calculation result."
    source: [FR6, AC5.1.2, AC5.1.4]

  - id: BR9.3
    statement: "Forecast evidence supports explanations with facts and versions while the assistant owns narrative behavior."
    category: policy
    appliesTo: [ForecastRun, ForecastSeries, ForecastProductOutcome]
    trigger: "The assistant investigates a shortage."
    logic: "IF authorized evidence exists THEN return bounded facts, freshness, coverage, and provenance citations; the assistant combines them with inventory and planning evidence."
    violationBehavior: "Return explicit limitations for missing or stale forecast evidence."
    source: [FR14, AC7.6.1, AC7.6.2]

  - id: BR9.4
    statement: "Forecasting provides an independently buildable and checkable service and worker boundary."
    category: policy
    appliesTo: [ForecastRun, ForecastAttempt]
    trigger: "A clean-checkout build, health check, or smoke check runs."
    logic: "IF a Forecasting prerequisite, dependency, schema, or runtime is unsupported or missing THEN its check fails explicitly; checks for unrelated UI and backend frameworks remain with their owning units."
    violationBehavior: "Provide actionable failure details and make no successful readiness claim."
    source: [NFR11, NFR13, AC8.1.1, AC8.1.3]

  - id: BR9.5
    statement: "Forecasting returns explicit machine-readable states that other units can present accessibly."
    category: policy
    appliesTo: [ForecastRun, ForecastProductOutcome, ForecastPublication]
    trigger: "The Web BFF or Web Application consumes Forecasting status."
    logic: "IF status is returned THEN represent loading dependency, never-run, partial, failed, stale, unavailable, and current states with text and stable codes; presentation and focus behavior remain Web-unit responsibilities."
    violationBehavior: "Do not collapse distinct states into color-only or generic success data."
    source: [NFR14, AC8.1.2, AC10.1.4]

  - id: BR9.6
    statement: "Forecasting declares readiness, persistence, backup, and resource needs without owning platform provisioning."
    category: policy
    appliesTo: [ForecastAttempt, ForecastReconciliation]
    trigger: "The platform provisions or validates the local environment."
    logic: "IF required storage, queue, credentials, runtime, model artifact, or resource headroom is absent THEN Forecasting readiness fails; infrastructure state, serialization, and deployment remain Platform responsibilities."
    violationBehavior: "Return explicit not-ready diagnostics and do not assume extra host or cloud capacity."
    source: [NFR2, NFR6, NFR12, AC8.3.1, AC8.3.2, AC8.3.3]

  - id: BR9.7
    statement: "Real CPU inference is the mandatory portable reviewer path."
    category: constraint
    appliesTo: [ForecastModelResolution, ForecastAttempt]
    trigger: "Reviewer acceptance is executed from a clean checkout."
    logic: "IF Forecasting requires owner credentials, cached artifacts, cloud access, or a specific GPU THEN reviewer portability fails."
    violationBehavior: "Report the path unsupported and do not substitute fixture-only evidence."
    source: [NFR11, AC10.1.1]

  - id: BR9.8
    statement: "Forecasting contributes linked evidence to the complete reviewer journey through supported contracts."
    category: policy
    appliesTo: [ForecastRequest, ForecastRun, ForecastSeries, ForecastPublication, ForecastReconciliation]
    trigger: "The end-to-end demo or evidence package is assembled."
    logic: "IF the journey claims forecast completion THEN link import source, request, run, attempt, model release, product coverage, current selection, freshness, downstream use, audit, and recovery evidence."
    violationBehavior: "Mark the journey incomplete or limited; other units retain ownership of inventory, shortage, purchase, receipt, and evaluation steps."
    source: [NFR15, AC10.1.2]

  - id: BR9.9
    statement: "Failed setup or missing prerequisites cannot produce a successful forecast or demo claim."
    category: validation
    appliesTo: [ForecastAttempt, ForecastRun, ForecastReconciliation]
    trigger: "Setup, inference, recovery, or demo execution fails."
    logic: "IF any required step fails or remains unavailable THEN evidence records the actual failed or limited outcome with recovery guidance."
    violationBehavior: "Withhold success and current publication claims."
    source: [NFR15, AC10.1.3]

  - id: BR9.10
    statement: "Optional acceleration results remain separate from required CPU evidence."
    category: policy
    appliesTo: [ForecastAttempt]
    trigger: "An optional accelerated inference path is measured."
    logic: "IF accelerated results are reported THEN label their environment separately and retain CPU inference as the required acceptance result."
    violationBehavior: "Reject evidence that replaces or obscures the CPU path."
    source: [NFR11, NFR15]
```

## Rules summary

| Group | Rules | Forecasting responsibility |
| --- | --- | --- |
| Tenant and authority | BR1.1-BR1.5 | Revalidate human or machine authority, hide foreign resources, restrict Operator actions, and protect immutable evidence. |
| Schedule and idempotency | BR2.1-BR2.7 | Resolve one deterministic 02:00 local-date request, deduplicate replays, separate retries from reruns, and remain independent of Planning review scheduling. |
| Admission and pinned inputs | BR3.1-BR3.7 | Pin authorized Retail Data and one server-resolved active Model Release; reject unavailable or incompatible inputs without substitution. |
| Execution and outcomes | BR4.1-BR4.9 | Append leased attempts, validate complete 28-day finite nonnegative product series, derive explicit run outcomes, and preserve provenance. |
| Publication and current pointer | BR5.1-BR5.8 | Publish complete runs atomically, require Operator acknowledgement for partial runs, guard current selection, and retain history. |
| Freshness and reads | BR6.1-BR6.6 | Apply the next-02:00-plus-six-hours boundary, preserve latest-versus-current facts, and return explicit bounded evidence and limitations. |
| Audit, messaging, cache, and contracts | BR7.1-BR7.10 | Commit audit/outbox atomically, deduplicate at-least-once messages, bound failures, keep cache disposable, and enforce versioned boundaries. |
| Restore, retention, and reconciliation | BR8.1-BR8.8 | Restore before exposure, fail closed on mismatch, preserve replay identity and expiry, and publish measured recovery limitations. |
| Downstream and reviewer behavior | BR9.1-BR9.10 | Supply versioned forecast evidence without owning downstream arithmetic or infrastructure, and require truthful clean-checkout CPU evidence. |

## Sources

- `inception/units-generation/unit-of-work.md` and `unit-of-work-story-map.md` — U7 ownership, boundaries, participating stories, and 42 assigned acceptance criteria.
- `inception/requirements-analysis/requirements.md` — FR2, FR5-FR6, FR9.4, FR11, FR13-FR14, FR17-FR20 and applicable NFR2-NFR15 obligations.
- `inception/user-stories/stories.md` — AC4.1.1-3, AC4.6.1-3, AC5.1.1-4, AC5.2.1-4, AC7.6.1-3, AC8.1.1-3, AC8.2.1-3, AC8.3.1-3, AC8.5.1-3, AC9.1.1-3, AC9.6.1-3, AC9.9.1-3, and AC10.1.1-4.
- `inception/domain-design/components.md` and `decisions.md` — Forecasting ownership and separation from Model Lifecycle, Planning, Purchasing, identity, platform, and Audit Evidence.
- `inception/contract-design/contract-summary.md` — C06, C07, C10, C13, C15 and common authority, error, compatibility, messaging, and retry semantics.
- `construction/forecasting/functional-design/functional-design-questions.md` — all confirmed U7 functional decisions.

## Assumptions & Open Questions

- Exact lease, heartbeat, retry, backoff, queue, dead-letter, response, cache, and decimal precision limits remain NFR or implementation parameters and must be bounded before acceptance.
- Recovery objectives, backup frequency and expiry, persistent storage limits, and cleanup timing remain later NFR decisions. Rules require fail-closed reconciliation and measured limitations regardless of chosen values.
- Planning owns inventory and supplier snapshots, MOQ, packs, buffers, review serialization and allowance, replenishment calculations, and purchase revalidation. U7 returns forecast evidence and explicit usability only.
- Model Lifecycle owns dataset construction, baseline/candidate evaluation, training, promotion, rollback, and artifact retention. U7 records and serves the release and evaluation references it receives.
- Platform owns deployment, state protection, resource enforcement, and backup transport; Forecasting owns truthful readiness and restored-record reconciliation for its own state.
- Audit Evidence owns searchable projections and their rebuild. Forecasting owns its authoritative audit/outbox records and replay-stable event provenance.
- The Web BFF and Web Application own UI composition, keyboard behavior, focus, and presentation. Forecasting supplies distinct status codes, text, versions, and limitations through governed contracts.
