# StockSense forecasting functional-design questions

Date: 2026-09-13
Stage: Functional Design
Unit: forecasting
Status: Confirmed

These questions resolve the remaining behavior choices for daily forecast admission, versioned product series, freshness, partial failures, reruns, downstream use, and recovery. Accepted decisions remain fixed: Forecasting is a standalone Python service and worker; it produces daily versioned 28-day forecasts; every run pins authorized Retail Data inputs and a server-resolved immutable Model Lifecycle release; production callers cannot select arbitrary models; seasonal-naive and moving-average baselines remain valid model releases; PostgreSQL owns forecast records through governed routines; RabbitMQ work is idempotent and recoverable; schedules use retailer-local dates with UTC timestamps; Planning and the assistant receive explicit stale, unavailable, and failed outcomes; and no silent model substitution is permitted.

## Interaction mode

The owner's standing preference from the current Functional Design stage is retained:

- A. Guide me through each question (Recommended)
- B. I will edit this file directly
- C. Answer all questions in chat
- X. Other (please specify)

[Answer]: A. Guide me through each question (Recommended)

## Q1. Forecast grain and horizon representation

What should one published forecast contain?

- A. Publish one immutable daily series for every active retailer/store/product combination, with horizon days 1-28 tied to retailer-local dates, nonnegative expected-demand decimals, and explicit per-product availability; the initial one-store retailers use the same future-ready grain (Recommended)
- B. Publish one retailer-level aggregate series and let Planning allocate it to products
- C. Publish only products predicted to have shortages
- X. Other (please specify)

[Answer]: A. Publish one immutable daily series for every active retailer/store/product combination, with horizon days 1-28 tied to retailer-local dates, nonnegative expected-demand decimals, and explicit per-product availability; the initial one-store retailers use the same future-ready grain (Recommended)

## Q2. Daily schedule and daylight-saving behavior

When should the logical daily forecast be due?

- A. Schedule one logical request per retailer-local date for 02:00 local time; map an invalid local instant to the first valid instant after 02:00 and choose the earlier occurrence when ambiguous; key idempotency by retailer and local date so DST never creates zero or two business runs (Recommended)
- B. Schedule every 24 elapsed hours from the prior successful run
- C. Schedule all retailers at 02:00 UTC regardless of their time zone
- X. Other (please specify)

[Answer]: A. Schedule one logical request per retailer-local date for 02:00 local time; map an invalid local instant to the first valid instant after 02:00 and choose the earlier occurrence when ambiguous; key idempotency by retailer and local date so DST never creates zero or two business runs (Recommended)

## Q3. Input snapshot and late corrections

How should a run respond to data corrections after admission?

- A. Pin the Retail Data source version, availability cutoff, model release, schemas, and configuration when the run is admitted; later corrections never mutate it and may be used by the next daily run or an explicit Operator rerun that creates a new revision (Recommended)
- B. Re-read current data during each forecast step so the run always uses the newest values
- C. Mutate the completed forecast when source history is corrected
- X. Other (please specify)

[Answer]: A. Pin the Retail Data source version, availability cutoff, model release, schemas, and configuration when the run is admitted; later corrections never mutate it and may be used by the next daily run or an explicit Operator rerun that creates a new revision (Recommended)

## Q4. Partial product failures

What should happen if some products cannot be forecast?

- A. Publish a PartiallySucceeded run when at least one product has a valid complete series and at least one fails; successful products remain explicitly usable while failed products carry safe unavailable reasons; retailer-wide consumers must acknowledge coverage and cannot treat the run as complete (Recommended)
- B. Fail the entire retailer run if one product fails
- C. Fill failed products with zero demand and mark the whole run successful
- X. Other (please specify)

[Answer]: A. Publish a PartiallySucceeded run when at least one product has a valid complete series and at least one fails; successful products remain explicitly usable while failed products carry safe unavailable reasons; retailer-wide consumers must acknowledge coverage and cannot treat the run as complete (Recommended)

## Q5. Invalid numerical output

How should negative, non-finite, or incomplete model output be handled?

- A. Require exactly 28 finite nonnegative values per product; preserve deterministic decimal precision; mark the product failed for negative, NaN, infinity, missing, or extra horizon values rather than clipping, filling, or truncating silently (Recommended)
- B. Clamp negative values to zero and fill missing days with zero
- C. Drop invalid days and shorten the series
- X. Other (please specify)

[Answer]: A. Require exactly 28 finite nonnegative values per product; preserve deterministic decimal precision; mark the product failed for negative, NaN, infinity, missing, or extra horizon values rather than clipping, filling, or truncating silently (Recommended)

## Q6. Forecast freshness policy

When should a successful forecast become stale?

- A. Treat the current-date forecast as fresh until the next retailer-local 02:00 due time plus a six-hour grace period, provided its source/model/schema versions remain compatible; afterward it is stale, and a latest failure never relabels an older result as fresh (Recommended)
- B. Keep the latest successful forecast fresh for seven days
- C. Treat any successful forecast as fresh until manually replaced
- X. Other (please specify)

[Answer]: A. Treat the current-date forecast as fresh until the next retailer-local 02:00 due time plus a six-hour grace period, provided its source/model/schema versions remain compatible; afterward it is stale, and a latest failure never relabels an older result as fresh (Recommended)

## Q7. Duplicate scheduling, retry, and explicit rerun

How should repeated requests for one retailer-local date behave?

- A. Use a stable logical schedule key for the first admitted run; exact scheduler replay returns the existing request/run; failed or interrupted work retries as a retained attempt under that run; an Operator rerun with changed pinned inputs creates the next immutable run revision and may supersede the current-date pointer only after successful publication (Recommended)
- B. Create a new Forecast Run for every scheduler delivery
- C. Overwrite the failed run in place during retry
- X. Other (please specify)

[Answer]: A. Use a stable logical schedule key for the first admitted run; exact scheduler replay returns the existing request/run; failed or interrupted work retries as a retained attempt under that run; an Operator rerun with changed pinned inputs creates the next immutable run revision and may supersede the current-date pointer only after successful publication (Recommended)

## Q8. Initial model availability

What should happen before any model release has been explicitly activated?

- A. Return forecast unavailable until an authorized Operator promotes a validated seasonal-naive, moving-average, or trained release; never choose a baseline silently (Recommended)
- B. Automatically use seasonal-naive whenever no active model exists
- C. Automatically select whichever baseline produced lower error most recently
- X. Other (please specify)

[Answer]: A. Return forecast unavailable until an authorized Operator promotes a validated seasonal-naive, moving-average, or trained release; never choose a baseline silently (Recommended)

## Q9. Immutable publication and current selection

How should completed and rerun forecasts be selected?

- A. Keep every request, run, attempt, per-product series, and provenance record immutable; maintain a server-owned current forecast pointer per retailer/local date; advance it atomically only to a Succeeded or acknowledged PartiallySucceeded revision, retaining every prior revision and reason (Recommended)
- B. Keep only the newest forecast and delete prior revisions
- C. Let callers choose any run as current by sending its identifier
- X. Other (please specify)

[Answer]: A. Keep every request, run, attempt, per-product series, and provenance record immutable; maintain a server-owned current forecast pointer per retailer/local date; advance it atomically only to a Succeeded or acknowledged PartiallySucceeded revision, retaining every prior revision and reason (Recommended)

## Q10. Human and machine authority

Who may read or control forecasts?

- A. Current Planners and Managers may read authorized forecast status, series, and evidence; Operators may request reruns and repair failed jobs; scheduled workers use narrow retailer/job authority; no role can bypass tenant checks or change a published series (Recommended)
- B. Any authenticated user may read every retailer forecast while Operators control jobs
- C. Planners may edit generated forecast values before Planning uses them
- X. Other (please specify)

[Answer]: A. Current Planners and Managers may read authorized forecast status, series, and evidence; Operators may request reruns and repair failed jobs; scheduled workers use narrow retailer/job authority; no role can bypass tenant checks or change a published series (Recommended)

## Q11. Messaging, audit, and cache behavior

How should publication and downstream updates behave?

- A. Commit forecast state, immutable business audit, and outbox records together; publish lifecycle/current-pointer events through RabbitMQ with idempotent inbox handling; use Redis only for disposable tenant/version-scoped reads and invalidate it after authoritative commit (Recommended)
- B. Publish directly to RabbitMQ before committing the forecast
- C. Store current forecast state only in Redis
- X. Other (please specify)

[Answer]: A. Commit forecast state, immutable business audit, and outbox records together; publish lifecycle/current-pointer events through RabbitMQ with idempotent inbox handling; use Redis only for disposable tenant/version-scoped reads and invalidate it after authoritative commit (Recommended)

## Q12. Restore and reconciliation

How should restored forecasts become current again?

- A. Restore PostgreSQL forecast records and audit/outbox state, then verify tenant, source version, pinned model release, checksums, series completeness, pointer history, retention, and replay position before exposing current forecasts; mark unresolved runs unavailable and never regenerate or substitute them silently (Recommended)
- B. Mark the newest restored successful row current immediately
- C. Discard forecast history and rerun every retailer after restore
- X. Other (please specify)

[Answer]: A. Restore PostgreSQL forecast records and audit/outbox state, then verify tenant, source version, pinned model release, checksums, series completeness, pointer history, retention, and replay position before exposing current forecasts; mark unresolved runs unavailable and never regenerate or substitute them silently (Recommended)

## Q13. Partial-run publication authority

Who may acknowledge a PartiallySucceeded run before it becomes the current forecast revision?

- A. Require an authorized Operator to inspect product coverage and failure reasons and explicitly acknowledge the partial revision; a fully Succeeded run may advance automatically, while consumers must still request and validate coverage for their products (Recommended)
- B. Advance every PartiallySucceeded run automatically when at least one product succeeded
- C. Require a Manager to edit or approve the generated forecast values
- X. Other (please specify)

[Answer]: A. Require an authorized Operator to inspect product coverage and failure reasons and explicitly acknowledge the partial revision; a fully Succeeded run may advance automatically, while consumers must still request and validate coverage for their products (Recommended)

## Ambiguity Scan

All answers select concrete behavior and are mutually consistent. Forecast grain, schedule, input pinning, product-level failure semantics, value validation, freshness, replay/rerun behavior, activation prerequisites, current-pointer authority, roles, integration, restore, and partial-publication authority are defined.

PartiallySucceeded is both a run outcome and a publication gate. It never means that failed products received zero forecasts. A fully Succeeded revision may become current automatically after atomic publication. A partial revision remains immutable but cannot become current until an authorized Operator reviews its coverage and reasons and records an acknowledgement. Downstream consumers independently state the required products and reject or degrade when that set is not fully covered.

The exact retry count/backoff, queue cap, retention duration, recovery objective, response limits, and decimal storage scale remain later NFR or implementation values. They do not alter the selected functional transitions, tenant authority, deterministic schedule, freshness boundary, or no-substitution rules. No contradiction or missing behavior remains for artifact generation.

## Consolidated Summary

Forecasting is a standalone Python service and worker that owns daily request admission, immutable Forecast Runs and attempts, 28-day product series, product-level outcomes, current forecast pointers, freshness classification, and forecast lifecycle events. It does not own Retail Data observations, Model Lifecycle releases, replenishment calculations, purchasing decisions, identity, or searchable audit projection. It consumes authorized Retail Data inputs through C06 and a server-resolved immutable Model Release through C07, and provides C10 to Planning/Purchasing and C13 to the assistant.

Each published series is scoped to retailer, store, product, and retailer-local forecast date and contains exactly horizon days 1 through 28. Expected demand values are deterministic finite nonnegative decimals. Negative, NaN, infinite, missing, or extra values fail that product; the service never clips, fills, truncates, or treats failure as zero demand. The initial one-store retailers use the same grain needed for future additional stores.

One logical scheduled request is due per retailer-local date at 02:00 in that retailer's configured time zone. If 02:00 is an invalid daylight-saving instant, the schedule uses the first valid instant afterward; if it is ambiguous, it uses the earlier occurrence. Retailer and local date form the stable scheduler business key, so scheduler restart, redelivery, or DST cannot create zero or two logical daily requests.

Admission pins the Retail Data source version, availability cutoff, retailer calendar/time-zone version, active Model Release resolution, artifact checksum, runtime and schemas, forecasting configuration, and placement generation. A run never re-reads mutable current inputs during execution. Later source corrections or model promotions apply to a future daily request or an explicit Operator rerun, which creates a new immutable revision.

Forecast requests, logical runs, execution attempts, per-product series, outcomes, and provenance are immutable. Exact schedule replay returns the original request and run. Failed or lease-interrupted work appends a retained attempt under the same run and reuses the pinned inputs. An Operator rerun with changed pinned inputs receives the next run revision for the same retailer/local date. Failed reruns do not replace the current forecast.

A run is Succeeded only when every in-scope active product has one valid complete series. It is PartiallySucceeded when at least one product succeeds and at least one product fails, and Failed when no product has a usable series or a run-level dependency fails. Valid products in a partial run retain their usable series; failed products retain explicit safe unavailable reasons and are never filled with zero. A fully Succeeded revision advances the server-owned current pointer atomically after publication. A PartiallySucceeded revision requires an authorized Operator to inspect coverage and failure reasons and record explicit acknowledgement before it may become current. Consumers still identify required products and verify coverage before use.

Forecasting remains unavailable until an authorized Operator has promoted a validated seasonal-naive, moving-average, or trained Model Release through Model Lifecycle. It never selects a baseline or arbitrary artifact silently. Each Forecast Run pins one server-resolved release and uses it for every attempt. Forecasting verifies the checksum, runtime profile, input/output schemas, and retailer scope before inference. Later promotion or rollback affects only newly admitted runs.

A current-date forecast is Fresh until the next retailer-local 02:00 due time plus six hours, provided its source, model, calendar, configuration, and schema versions remain compatible. It is Stale after that boundary or when compatibility is invalidated. The latest failed request and last successful current revision remain distinct; an older result is never relabeled fresh because newer work failed. Unavailable, Failed, PartiallySucceeded, Fresh, and Stale states remain explicit to Planning, the assistant, and UI consumers.

Current Planners and Managers may read status, series, and provenance only for authorized retailers. Operators may request reruns, acknowledge partial publication, and repair failed jobs. Scheduled workers carry narrow retailer and job authority. All reads and mutations revalidate current tenant context, role or machine scope, placement generation, and resource ownership. No actor edits a published series or supplies storage/model routing authority.

Forecast publication, current-pointer changes, partial acknowledgements, and other authoritative mutations commit forecast state, immutable business audit, and outbox records together. RabbitMQ relays use durable publication and confirms; consumers validate tenant and contract identity and commit an inbox record with their local effect before acknowledging. Redis caches only authorized tenant-and-version-scoped read results and is invalidated after authoritative commits; it never owns current selection, freshness, or permission state.

Recovery restores authoritative PostgreSQL forecast, audit, inbox/outbox, and pointer history before exposure. Reconciliation verifies tenant and placement, pinned source and model versions, checksums, runtime and schema compatibility, exactly 28 finite nonnegative product values, product coverage, pointer transitions, retention state, and message replay position. Unresolved or incompatible runs remain unavailable. Restore never regenerates, mutates, or substitutes a forecast silently; a new forecast requires a normal scheduled request or authorized rerun.

### Reconciliation with approved contracts (2026-09-25)

The thirteen earlier Forecasting choices remain unchanged: one retailer-local daily request, immutable run revisions and product-level results, complete 28-day series, explicit partial-run acknowledgement, server-owned current pointer, six-hour freshness threshold, tenant-authorized reads, atomic audit/outbox, and fail-closed restore.

C07 now requires Forecasting to obtain a durable `batch-forecast` heavy-work request and live lease from Model Lifecycle's shared arbiter. Every renew, release, completion, and forecast-publication finalizer carries the current lease ID and monotonic fencing token and checks placement/recovery generation and expiry. Expired, cancelled, superseded or recovery-fenced workers cannot publish. The run pins the server-resolved active package; before deserialization Forecasting verifies the signed `skops.io` manifest and artifact digests, Ed25519 signature, current signer status, trust-policy version/digest, feature/runtime schemas, release state and validity. A revoked or incompatible package yields explicit model-unavailable; no prior release or baseline is silently substituted.

C23 gives Forecasting U14's reusable Python RabbitMQ package and conformance fixtures; Forecasting still owns domain message schemas and commits its own forecast state, business audit, outbox, and inbox effects. Broker delivery attempts are separate from C07 worker attempts. C25 makes Forecasting a Class C recovery participant: it durably records prepare/close/abort/resume dispositions, fences job finalizers and message paths, acknowledges a checkpoint, rejects delayed prepare after abort, and exposes current forecasts only after U15-directed reconciliation. Recovery-policy-v1 fixes 24-hour RPO, two-hour RTO, 30-day backup retention and Class C deadlines of 120/180/60/180 seconds for prepare/close/abort/resume.

The Model Lifecycle revision has resolved the earlier C07 promotion-fence, package-signing, first-activation and baseline-formula findings. Two integration boundaries remain open: the cross-unit atomic finalizer used by Forecasting's batch work lacks an approved transaction contract, and a no-overlap route change needs an admission/drain barrier to prevent new old-route runs from racing the promotion lease. Forecasting must fail closed at those boundaries until Model Lifecycle and the shared contract define and verify them; this summary does not treat them as approved behavior.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct

## Requested Changes Feedback

What should change?

[Answer]: Resolve all blockers.


[Answer]: Fix the two C07 safety gaps, inconsistent first-attempt creation, and missing product-set fields in C10/C13.

The shared C07 amendment now specifies an EXECUTE-only U6 stored-function finalizer in the same retailer-local transaction as U7 outcomes, series, audit, outbox and pin closure; and a durable route pin/drain lock that rejects admission after draining starts. C10 and both C13 tools now require 1–100 distinct product IDs and return exact per-product coverage. U7 moves first-attempt creation after WF3 pins both digests; the first lease updates that queued attempt and only a terminal retry appends another. These are owner-directed corrections pending independent review and conformance evidence, not a claim that implementation has passed.
