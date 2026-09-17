# Forecasting Functional Specification

Unit: U7 Forecasting (forecasting)

Status: Draft for independent review

Decision basis: Forecasting Functional Design answers and consolidated summary reconfirmed as `Looks correct` on 2026-09-14.

This specification is the source of truth for ordered workflows and lifecycle transitions. The entity diagram and rule summary are derived views of `entities.md` and `rules.md`.

## Purpose and boundaries

Forecasting admits one deterministic daily request per retailer-local date, resolves immutable demand and model inputs, executes retailer-scoped inference, preserves every run revision and attempt, publishes valid 28-day product series, classifies freshness, and exposes bounded evidence to Planning, Purchasing, the assistant, and reviewer workflows.

Forecasting does not own Retail Data observations or calendars, Model Lifecycle training or release promotion, replenishment calculations, purchasing decisions, identity, cluster provisioning, or the searchable audit projection. It consumes only authorized contracts and never reads another unit's storage directly. It serves a promoted compatible seasonal-naive, moving-average, or trained release and never selects an unapproved fallback.

## Actors and authority

| Actor | Permitted behavior |
| --- | --- |
| Planner | Read forecast status, current usable series, freshness, product coverage, and bounded provenance for an authorized retailer. |
| Manager | Read the same authorized forecast evidence used to review replenishment and purchasing decisions. |
| Operator | Inspect all authorized run revisions and failures, request a rerun, acknowledge a partial revision for publication, repair failed work, and reconcile restored state. |
| Scheduler | Submit the stable daily request for one retailer and local date under narrow machine authority. |
| Forecast worker | Execute one leased attempt using only the run's pinned inputs and model resolution; it cannot choose a model route or publish a partial run without acknowledgement. |
| Planning and Purchasing | Request a current usable forecast for an explicit set of products and validate returned coverage and versions before calculation or approval. |
| Assistant | Request bounded status or evidence for explicit products under the current user's retailer authority; it cannot infer or expand authority. |
| Retail Data | Supply authorized versioned observations, promotions, product scope, calendar, and placement context through C06. |
| Model Lifecycle | Resolve the server-owned active compatible Model Release and immutable artifact metadata through C07. |

Every protected operation revalidates retailer identity, current human role or machine scope, placement generation, resource ownership, and applicable contract version. A caller-supplied retailer, product, run, or artifact identifier never establishes authority.

## Workflow specifications

### WF1. Determine and submit the daily schedule

1. The scheduler reads the retailer's versioned time-zone and calendar settings under retailer-scoped machine authority.
2. It identifies one logical due time at 02:00 for each retailer-local date.
3. If 02:00 is invalid because the clock advances, it uses the first valid instant after 02:00. If 02:00 is ambiguous because the clock repeats, it uses the earlier occurrence.
4. The stable business key is retailer plus local forecast date; delivery time, scheduler instance, and retry count do not alter that key.
5. The scheduler submits the request with its resolved UTC instant, local date, calendar version, and deterministic request identity.
6. Restart, redelivery, or a second scheduler instance returns the existing logical request for the same business key and creates no duplicate forecast effect.
7. This schedule is independent of the Planning unit's daily inventory-review schedule and never consumes or changes manual-review allowance.

### WF2. Admit a scheduled request or Operator rerun

1. Forecasting validates retailer authority, placement generation, local date, calendar version, request kind, and operation identity before creating work.
2. The first valid scheduled request for a retailer and local date receives revision one. Exact replay returns that request and its current run state.
3. A changed payload under the same operation identity conflicts and creates no work.
4. An authorized Operator may request a new revision for the same retailer and local date after selecting a reason and current dependency versions. The service assigns the next immutable revision; callers cannot choose it.
5. Admission creates the request, logical run, initial attempt, immutable business audit, and outbox entry as one authoritative effect.
6. A failure before authoritative admission creates no run and no downstream effect. A rejected attempt is recorded separately with safe details.

### WF3. Resolve and pin all run inputs

1. Forecasting requests C06 data for the retailer using the admitted availability cutoff and required source version.
2. It verifies retailer, stores, active product scope, observation and promotion versions, time-zone/calendar version, source checksum, and placement generation.
3. Forecasting calls C07 under the run's machine authority and required runtime compatibility. Model Lifecycle resolves the server-owned active route.
4. The returned Model Release must be validated, active, available, retailer-scoped, checksum-verifiable, and compatible with the declared input/output schemas and runtime profile.
5. Forecasting pins the Retail Data source, cutoff, calendar, active-product scope, model release, artifact checksum, route version, schemas, runtime profile, forecasting configuration, and placement generation before execution.
6. Missing or incompatible data or model resolution makes the run explicitly unavailable or failed. Forecasting does not choose a baseline, previous model, different artifact, or mutable latest source.
7. Every later attempt for the run reuses exactly this snapshot. Corrections, promotions, and rollbacks affect only a later daily request or an explicit new rerun revision.

### WF4. Execute and retain a run attempt

1. A worker validates the message envelope, tenant/job authority, run version, and placement generation, then commits an inbox record before accepting execution authority.
2. It appends an attempt, acquires a bounded lease, and changes the logical run from Queued to Running.
3. The worker verifies pinned object checksums, schemas, runtime compatibility, and product scope before inference.
4. It generates one expected-demand series for every active retailer/store/product combination in the pinned scope using the single pinned Model Release.
5. It emits lease heartbeats while working. Only the current unexpired lease owner may finalize attempt output.
6. A worker that loses its lease records an Interrupted attempt and cannot publish. A retry appends a new attempt to the same run and pinned snapshot.
7. Attempt output stays staged until product validation and run aggregation finish; staged output is never current or consumer-visible.

### WF5. Validate product series and determine the run outcome

1. Each product series must contain exactly one value for every horizon day 1 through 28 relative to the retailer-local forecast date.
2. Every expected-demand value must be a deterministic finite nonnegative decimal represented at the declared precision.
3. A negative, not-a-number, infinite, missing, duplicate, unordered, or extra horizon value fails only that product when the rest of the run remains structurally valid.
4. Forecasting never clips a negative value, fills a missing value, truncates an extra value, converts invalid output to zero, or silently substitutes another model.
5. A run is Succeeded only when every product in the pinned active scope has one complete valid series.
6. A run is PartiallySucceeded when at least one product has a complete valid series and at least one product fails with a safe reason.
7. A run is Failed when no product has a usable series or a run-level dependency, schema, tenant, placement, checksum, or runtime check fails.
8. The final attempt outcome, product outcomes, valid series, failures, provenance, business audit, and outbox entries commit atomically. Failure of a required write prevents finalization.

### WF6. Publish a complete or partial revision

1. A Succeeded revision is eligible to advance the current pointer automatically after its finalization transaction commits.
2. Pointer advancement verifies the retailer/local-date key, run revision, product-scope digest, compatibility, and expected current-pointer version.
3. The pointer, publication record, audit, and outbox effect advance together. A race or expected-version mismatch leaves the prior pointer unchanged.
4. A PartiallySucceeded revision remains immutable and inspectable but is AwaitingAcknowledgement. It cannot become current automatically.
5. An authorized Operator inspects product coverage, safe failure reasons, pinned versions, and impact; an explicit acknowledgement records rationale and the acknowledged coverage digest.
6. If the run and coverage are still eligible, acknowledgement advances the current pointer atomically. It never edits series or turns a failed product into a success.
7. Failed, unavailable, unreconciled, corrupt, or incompatible revisions never become current. A failed rerun leaves the prior current pointer and its original freshness facts intact.
8. Superseded current revisions remain retained and queryable with pointer history and reasons.

### WF7. Resolve current usability and freshness

1. A read first revalidates current retailer authority and requested product ownership.
2. Forecasting resolves the server-owned current pointer for the requested retailer and local date; the caller cannot nominate an arbitrary run as current.
3. It distinguishes the latest request/run outcome from the last published current revision.
4. A current revision is Fresh until the next retailer-local 02:00 due time plus six hours, using the same deterministic invalid/ambiguous-time rules as scheduling.
5. It is Stale after that instant or earlier when the pinned source, model, calendar, configuration, placement, or schemas are known to be incompatible.
6. A newer failed or partial-unacknowledged revision never extends the prior revision's freshness window or relabels it fresh.
7. A response states run identity and revision, latest outcome, current publication status, generated time, age, freshness boundary and reason, product coverage, model/data/configuration versions, and safe limitations.
8. No eligible current pointer yields explicit Unavailable; no silent fallback or invented demand is returned.

### WF8. Serve Planning and Purchasing through C10

1. An authorized status or history read may request a specified run revision and receives its immutable outcome, evidence, freshness classification, publication state, and safe limitations even when that revision is stale, failed, partial, or non-current.
2. An authorized Planning use request asks for the latest usable current publication and names the required product set. It cannot nominate an arbitrary run revision as calculation authority.
3. Forecasting returns only products owned by that retailer and reports complete, partial, failed, stale, unpublished, or unavailable coverage explicitly.
4. The response supplies exactly 28 values per covered product and pins forecast, source, calendar, model, configuration, schema, and placement versions.
5. A stale, incompatible, unreconciled, unpublished, or uncovered required product prevents a complete-usable result. An unacknowledged partial run remains inspectable by ID but is never usable through the current-publication path.
6. Planning must reject or explicitly degrade according to its own rules; it cannot treat missing demand as zero. Forecasting does not calculate replenishment, supplier constraints, inventory positions, MOQ, packs, buffers, or purchase approval.
7. A later inventory, supplier-term, or forecast version cannot retroactively change this response's immutable run evidence; downstream approval revalidates its own complete input snapshot.

### WF9. Serve assistant status and evidence through C13

1. The assistant submits an explicit bounded product set under the current user's delegated retailer context.
2. Forecasting revalidates user authority, retailer, products, run ownership, and response bounds without trusting model-generated identifiers.
3. Status returns the latest outcome, current publication, freshness, product coverage, and safe limitations.
4. Evidence returns bounded 28-day series plus model, data, configuration, calendar, and run citations suitable for an explanation.
5. Missing, stale, partial, or unavailable evidence remains explicit. The assistant cannot invent demand, omit a limitation, or expand to a foreign product.
6. Tool calls and denied attempts carry correlation and audit evidence while foreign resources remain undisclosed.

### WF10. Retry, rerun, dead-letter, and repair work

1. A transient execution failure records the failed or interrupted attempt and keeps the logical run's pinned snapshot unchanged.
2. Bounded automatic retry appends the next attempt under the same run; it never creates another business revision or schedule effect.
3. Exhausting the configured retry policy finalizes the logical run as Failed and moves the message to observable dead-letter handling.
4. Authorized dead-letter replay revalidates tenant/job authority and event identity, then either returns the recorded effect or appends an eligible retry attempt.
5. An Operator repair may resume the same immutable run only when its pinned inputs remain available and valid. Changed dependencies require a new rerun revision through WF2.
6. No retry, replay, or repair can overwrite a prior attempt, series, publication, audit record, or current pointer.

### WF11. Commit audit, events, and disposable cache behavior

1. Request admission, run finalization, publication, partial acknowledgement, pointer change, rerun, repair, and recovery decisions append immutable business audit and outbox records in the same authoritative transaction as their business effect.
2. A required audit or outbox failure rolls back the business mutation. A rejected authorization, validation, or concurrency attempt uses a separate durable record that survives business rollback.
3. The relay publishes the committed event with durable delivery and confirmation. An unpublished outbox record remains eligible for retry.
4. Consumers validate contract identity, event identity, tenant, aggregate version, correlation, and placement generation, and commit their inbox plus local effect before acknowledging.
5. Redelivery returns the recorded effect; bounded exhausted delivery enters an observable dead-letter path and makes no exactly-once transport claim.
6. Read caches are disposable and scoped by retailer, resource, version, product coverage, and authorization-relevant context. They never own permission, current selection, freshness, or series authority.
7. An authoritative commit invalidates affected cached reads. A cold or unavailable cache falls back to an authorized authoritative read without weakening tenant or version checks.

### WF12. Keep daily inventory review independent

1. Forecasting publishes lifecycle and current-pointer events after authoritative commit; it does not directly start or own a replenishment review.
2. Planning may consume those events or its own schedule to request forecast evidence, but its one-active-review and manual allowance rules remain separate.
3. Forecast scheduler restart, duplicate delivery, or DST handling affects only the one daily forecast request for that retailer/local date.
4. Planning scheduler restart, retained due work, or manual-review contention affects only Planning jobs and cannot create a duplicate Forecast Run or consume forecast execution identity.
5. Both flows preserve their own intended local date, trigger, input versions, and outcomes for audit and recovery.

### WF13. Restore and reconcile Forecasting

1. Recovery restores authoritative Forecasting requests, runs, attempts, product outcomes, series, publications, current pointers, partial acknowledgements, audit, inbox, and outbox history before any current forecast is exposed.
2. Restored current pointers enter Reconciling and are unavailable to consumers during validation.
3. Per retailer, reconciliation verifies tenant ownership, placement generation, local dates and schedule identities, source snapshots, model releases and checksums, runtime and schemas, exactly 28 finite nonnegative values, product-scope coverage, run/pointer transitions, acknowledgements, retention, and message replay position.
4. A run captured as Running becomes Interrupted and is failed or made retryable under the normal attempt rules; it is never assumed complete.
5. A pointer becomes Reconciled only when its complete history and selected revision validate. Missing, corrupt, expired, foreign, incompatible, or incomplete evidence keeps it unavailable.
6. Restore never recomputes, edits, or substitutes a forecast silently. A new result requires a normal scheduled request or an authorized Operator rerun.
7. Reconciliation records counts, mismatches, elapsed recovery time, observed data loss, and limitations against the separately approved recovery objectives.

### WF14. Validate contracts and reviewer portability

1. Every Forecasting REST operation is defined through OpenAPI and every job or event flow through AsyncAPI, including authentication, tenant context, errors, idempotency, versioning, examples, and compatibility metadata.
2. Contract validation rejects invalid examples and incompatible schema changes before integration; each Forecasting producer and consumer proves its own contract behavior.
3. Local readiness checks expose dependency, schema, storage, queue, worker, schedule, and model-availability state. Missing credentials, disk, runtime, model artifact, or resource headroom fails explicitly.
4. The reviewer journey uses pinned and verifiable prerequisites, local authentication, seeded tenant data, and a real CPU-compatible promoted model without owner secrets, cached artifacts, cloud access, or a GPU requirement.
5. Evidence links import versions, forecast request/run/attempt, product coverage, model release, current pointer, freshness, downstream shortage use, audit events, recovery checks, and declared limitations.
6. A failed setup or unavailable dependency yields actionable diagnostics and never produces a false successful-forecast claim.

## State machines

### Forecast Run lifecycle

```mermaid
stateDiagram-v2
  [*] --> Admitted
  Admitted --> Queued: input and model snapshot pinned
  Admitted --> Failed: admission dependency invalid
  Queued --> Running: attempt lease acquired
  Queued --> Failed: retry policy exhausted before execution
  Running --> Queued: attempt interrupted and retry allowed
  Running --> Succeeded: every product series valid
  Running --> PartiallySucceeded: some product series valid
  Running --> Failed: no usable series or run-level failure
  Succeeded --> [*]
  PartiallySucceeded --> [*]
  Failed --> [*]
```

Text fallback: an admitted run pins its dependencies and queues. Attempts may return interrupted work to the queue. Final aggregation ends the immutable logical run as Succeeded, PartiallySucceeded, or Failed; later changed-input work is a new run revision.

### Forecast Attempt lifecycle

```mermaid
stateDiagram-v2
  [*] --> Queued
  Queued --> Leased: worker acquires lease
  Leased --> Running: pinned dependencies verified
  Leased --> Interrupted: lease expires
  Running --> Succeeded: staged output finalized
  Running --> Failed: controlled execution failure
  Running --> Interrupted: lease lost
  Queued --> Cancelled: run made ineligible
  Succeeded --> [*]
  Failed --> [*]
  Interrupted --> [*]
  Cancelled --> [*]
```

Text fallback: each attempt is appended to a logical run. Only a leased worker may execute and finalize it. Success, failure, interruption, and cancellation remain retained; retry appends another attempt rather than reopening the old one.

### Forecast Publication lifecycle

```mermaid
stateDiagram-v2
  [*] --> Unpublished
  Unpublished --> Current: succeeded revision commits
  Unpublished --> AwaitingAcknowledgement: partial revision finalized
  AwaitingAcknowledgement --> Current: operator acknowledges coverage
  AwaitingAcknowledgement --> Rejected: operator declines publication
  Current --> Superseded: newer eligible revision commits
  Rejected --> [*]
  Superseded --> [*]
```

Text fallback: a fully successful revision can become current automatically. A partial revision waits for an Operator's coverage acknowledgement and can be published or rejected. A newer eligible publication supersedes the current pointer without deleting history.

### Current pointer recovery lifecycle

```mermaid
stateDiagram-v2
  [*] --> Available: normal publication commits
  Available --> Reconciling: restore or integrity repair begins
  Reconciling --> Available: pointer and evidence validate
  Reconciling --> Unavailable: validation fails
  Unavailable --> Reconciling: authorized repair retries
```

Text fallback: loading restored records does not expose forecasts. Current pointers stay Reconciling until their history, tenant, inputs, series, and message state validate. A failure keeps them Unavailable until an authorized repair and successful reconciliation.

### Forecast Reconciliation lifecycle

```mermaid
stateDiagram-v2
  [*] --> Pending
  Pending --> Running: restore validation starts
  Running --> Passed: all required checks succeed
  Running --> Failed: any required check fails
  Failed --> Running: authorized repair retries
  Passed --> [*]
```

Text fallback: a reconciliation begins Pending, runs the complete restored-state validation, and ends Passed or Failed. A failed reconciliation may run again after an authorized repair; only a Passed result permits the corresponding current pointers to become Available.

## Derived entity relationship view

```mermaid
erDiagram
  FORECAST_REQUEST ||--|| FORECAST_RUN : owns
  FORECAST_RUN ||--|| FORECAST_INPUT_SNAPSHOT : pins
  FORECAST_RUN ||--|| FORECAST_MODEL_RESOLUTION : pins
  FORECAST_RUN ||--|{ FORECAST_ATTEMPT : retains
  FORECAST_RUN ||--|{ FORECAST_PRODUCT_OUTCOME : classifies
  FORECAST_PRODUCT_OUTCOME ||--o| FORECAST_SERIES : yields
  FORECAST_SERIES ||--|{ FORECAST_POINT : contains
  FORECAST_RUN ||--o| FORECAST_PUBLICATION : publishes
  FORECAST_PUBLICATION ||--o| PARTIAL_PUBLICATION_ACKNOWLEDGEMENT : authorizes
  CURRENT_FORECAST_POINTER ||--|| FORECAST_PUBLICATION : selects
  CURRENT_FORECAST_POINTER ||--o{ FORECAST_POINTER_HISTORY : records
  FORECAST_RUN ||--o{ FORECAST_AUDIT_RECORD : audits
  FORECAST_AUDIT_RECORD ||--o{ FORECAST_OUTBOX_MESSAGE : emits
  FORECAST_RUN ||--o{ FORECAST_INBOX_RECEIPT : consumes
  FORECAST_PUBLICATION ||--o{ FORECAST_READ_CACHE_ENTRY : projects
  FORECAST_RECONCILIATION ||--o{ CURRENT_FORECAST_POINTER : validates
  FORECAST_RECONCILIATION ||--o{ FORECAST_RUN : checks
```

Text fallback: each immutable request revision owns one logical run; the retailer, local date, and server-assigned revision identify the revision history. Each run pins one input snapshot and model resolution, retains attempts and product outcomes, and stores valid series as exactly 28 points. Eligible runs produce publications; partial publications may carry an Operator acknowledgement. One server-owned pointer selects the current publication and retains pointer history. Runs append audit and outbox evidence and inbox receipts, publications may have disposable cache entries, and Forecast Reconciliation validates restored runs and pointers before exposure.

## Derived rules summary

| Rule group | Behavioral effect |
| --- | --- |
| BR1 | Current retailer, role or machine authority, placement, and resource ownership guard every operation. |
| BR2 | Retailer-local 02:00 scheduling and stable business identities prevent duplicate daily effects, including DST cases. |
| BR3 | Immutable source, calendar, configuration, placement, and promoted-model snapshots make every run reproducible. |
| BR4 | Leased attempts, strict 28-point validation, explicit product outcomes, and no substitution govern execution. |
| BR5 | Atomic publication, Operator acknowledgement of partial coverage, and retained pointer history govern current selection. |
| BR6 | The next 02:00 plus six-hour boundary and compatibility checks govern Fresh, Stale, and Unavailable responses. |
| BR7 | Contracted reads, atomic audit/outbox, idempotent inboxes, durable events, and disposable caches preserve integration behavior. |
| BR8 | Restore-first reconciliation, retry boundaries, retention, and integrity checks prevent invalid forecast exposure. |
| BR9 | Independent review scheduling, validated contracts, readiness diagnostics, and CPU-portable evidence support downstream and reviewer use. |

## Contract refinements

| Contract | Required refinement |
| --- | --- |
| C06 demand and calendar data | Return retailer/store/product scope, source revision and checksum, availability cutoff, demand and promotion versions, time-zone/calendar version, placement generation, and explicit unavailable or stale reasons. |
| C07 promoted model resolution | Return route and release versions, promotion identity, model kind, artifact reference/checksum, runtime profile, input/output schema digests, evaluation summary, activation time, and explicit unavailable reason. |
| C10 planning and purchasing evidence | Separate inspectable run-status/history reads from the latest-usable-current-publication read. Status remains available for stale, failed, partial, and non-current revisions. The usable path accepts explicit product coverage and returns only a fresh, compatible, reconciled, published current revision with exactly 28 values per covered product, freshness boundary/reason, coverage failures, and pinned provenance. |
| C13 assistant status and evidence | Accept a bounded explicit product set; return safe status, freshness, limitations, series, and stable provenance citations without accepting storage or model routing authority. |
| C15 authoritative events | Add request-admitted, run-started/completed/failed, partial-awaiting-acknowledgement, partial-acknowledged/rejected, current-pointer-changed, forecast-invalidated, and reconciliation events under the common tenant/correlation envelope. |
| Forecasting command and status API | Add Operator-only rerun, partial acknowledgement/rejection, repair, and reconciliation operations plus authorized request/run/attempt/product/publication status resources with operation keys and expected versions. |

## Error and boundary behavior

| Condition | Required outcome |
| --- | --- |
| Missing, revoked, foreign, or stale authority | Deny without disclosing target existence; retain safe rejected-attempt audit. |
| Duplicate schedule delivery | Return the original request/run under current authority; create no duplicate effect. |
| Changed payload under an operation identity | Conflict; preserve the original request and outcome. |
| No promoted compatible release | Explicit Unavailable; never choose an arbitrary baseline or prior model. |
| Source, checksum, schema, runtime, calendar, or placement mismatch | Fail admission or the affected run explicitly; do not substitute mutable current data. |
| Invalid product output | Fail that product; retain valid products only when the run is structurally safe and classify the run Partial. |
| Partial run without Operator acknowledgement | Keep it non-current and expose coverage/failures for review. |
| Current pointer race | Conflict and preserve the prior pointer with no partial publication. |
| Latest run failed while an older publication exists | Show both facts; preserve the older result's original freshness boundary. |
| Missing required product or stale forecast | Return incomplete, stale, or unavailable evidence; never return zero as invented demand. |
| Worker or broker interruption | Retain the attempt and deduplicate effects; retry within bounds or enter observable dead-letter handling. |
| Audit or outbox write fails | Roll back the authoritative mutation. |
| Cache cold, stale, or unavailable | Read the authoritative source under full authorization and version checks. |
| Restore mismatch or incomplete backup | Keep the current pointer unavailable until reconciliation succeeds. |
| Missing local prerequisite or CPU-compatible model | Fail readiness with actionable diagnostics and no claimed successful forecast. |

## Sources

- inception/units-generation/unit-of-work.md
- inception/units-generation/unit-of-work-story-map.md
- inception/requirements-analysis/requirements.md
- inception/user-stories/stories.md
- inception/domain-design/components.md
- inception/contract-design/contract-summary.md
- construction/forecasting/functional-design/functional-design-questions.md
- construction/forecasting/functional-design/entities.md
- construction/forecasting/functional-design/rules.md

## Assumptions & Open Questions

- Exact lease duration, heartbeat interval, retry count and backoff, queue and dead-letter limits, response bounds, storage precision, retention duration, and recovery objectives are deferred to NFR and implementation stages.
- The six-hour freshness grace period and deterministic 02:00 DST behavior are confirmed functional decisions; performance and alerting thresholds remain later NFR values.
- Planning owns replenishment arithmetic, supplier-term use, review quota, and purchase revalidation. Forecasting guarantees the versioned coverage and explicit unusable states those rules consume.
- Local CPU inference is the portable acceptance path. Optional GPU acceleration and external model-provider integration do not change the Forecasting domain contracts or authority model.
