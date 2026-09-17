# StockSense planning-purchasing functional-design questions

Date: 2026-09-14
Stage: Functional Design
Unit: planning-purchasing
Status: Confirmed

These questions resolve the remaining behavior choices for deterministic replenishment calculations, supplier-term selection, planning-policy authority, daily review timing, partial review outcomes, immutable scenario evidence, purchase-draft structure, and simulated inbound dates. Accepted decisions remain fixed: Replenishment and Purchasing are separate logical domains in one v1 .NET deployment; PostgreSQL access uses governed routines only; Retail Data owns on-hand inventory and stock movements; Purchasing owns ordered and expected inbound quantities; Forecasting owns immutable forecast evidence and freshness; supplier terms are versioned and accepted by authorized humans; every purchase requires Manager approval; submitted and approved lines are locked; rejection, pre-receipt cancellation, partial receipts, cumulative quantity limits, idempotency, tenant checks, audit/outbox atomicity, and the three-per-retailer/local-day manual review quota are already defined and will not be reopened.

## Interaction mode

The owner's standing preference from the current Functional Design stage is retained:

- A. Guide me through each question (Recommended)
- B. I will edit this file directly
- C. Answer all questions in chat
- X. Other (please specify)

[Answer]: A. Guide me through each question (Recommended)

## Q1. Deterministic replenishment calculation

The requirements name forecast demand, on-hand stock, dated inbound, calendar-day lead time, safety-buffer days, minimum order quantity, and pack size, but do not yet define their exact calculation order. Which rule should the service use?

- A. For each product and selected supplier term, sum forecast demand from the review date through lead-time plus buffer days; subtract current on-hand and only the outstanding quantities of approved or partially received orders due within that protection window; clamp negative need to zero; if need is positive, raise it to the minimum order quantity and then round up to a whole pack (Recommended)
- B. Subtract all open draft, submitted, and approved order quantities regardless of due date, then apply the minimum order quantity without pack rounding
- C. Use on-hand stock only and ignore dated inbound when calculating the recommendation
- X. Other (please specify)

[Answer]: A. For each product and selected supplier term, sum forecast demand from the review date through lead-time plus buffer days; subtract current on-hand and only the outstanding quantities of approved or partially received orders due within that protection window; clamp negative need to zero; if need is positive, raise it to the minimum order quantity and then round up to a whole pack (Recommended)

## Q2. Supplier-term selection

A product may have more than one accepted supplier term, while automated price optimization is outside v1. Which term should scheduled and manual reviews use?

- A. Require one Manager-selected preferred accepted supplier term per product for automatic reviews; pin its exact revision in each recommendation; allow Planners to compare other currently accepted terms in explicit scenarios without changing the preferred term (Recommended)
- B. Automatically choose the accepted term with the lowest unit price on every review
- C. Produce no automatic recommendation when multiple accepted terms exist and require the Planner to select one for every product each day
- X. Other (please specify)

[Answer]: A. Require one Manager-selected preferred accepted supplier term per product for automatic reviews; pin its exact revision in each recommendation; allow Planners to compare other currently accepted terms in explicit scenarios without changing the preferred term (Recommended)

## Q3. Buffer policy defaults and authority

The product needs a concrete initial buffer policy while preserving an explicit zero-day product override. Which policy should apply?

- A. Seed a seven-calendar-day retailer default; allow a Manager to set a retailer default or product override from 0 through 28 days; let Planners compare temporary 0-through-28-day scenarios without changing the saved policy (Recommended)
- B. Seed a fourteen-day default and let Planners permanently change retailer and product policies
- C. Use zero buffer days unless every product has an explicit value
- X. Other (please specify)

[Answer]: A. Seed a seven-calendar-day retailer default; allow a Manager to set a retailer default or product override from 0 through 28 days; let Planners compare temporary 0-through-28-day scenarios without changing the saved policy (Recommended)

## Q4. Scheduled review time

Forecasts are due at 02:00 retailer-local time and have a six-hour completion grace period. When should the independent daily replenishment review be due?

- A. Due once per retailer-local date at 08:00; use the same invalid-time and ambiguous-time rules as Forecasting; retain the due job while another review is active and run it exactly once afterward (Recommended)
- B. Start immediately whenever a forecast publishes, which may create multiple scheduled reviews per local date
- C. Run every 24 elapsed hours from the prior successful review
- X. Other (please specify)

[Answer]: A. Due once per retailer-local date at 08:00; use the same invalid-time and ambiguous-time rules as Forecasting; retain the due job while another review is active and run it exactly once afterward (Recommended)

## Q5. Partial forecast coverage

A current forecast can be acknowledged as partially successful for some products. How should a replenishment review expose that coverage?

- A. Complete the review as PartiallySucceeded when at least one in-scope product has valid forecast and supplier evidence and at least one is blocked; publish immutable recommendations only for valid products, list each blocked product and reason, and prohibit drafts from treating a blocked product as recommended (Recommended)
- B. Fail the entire review whenever one product lacks usable evidence
- C. Treat missing product forecasts as zero demand and publish a successful review
- X. Other (please specify)

[Answer]: A. Complete the review as PartiallySucceeded when at least one in-scope product has valid forecast and supplier evidence and at least one is blocked; publish immutable recommendations only for valid products, list each blocked product and reason, and prohibit drafts from treating a blocked product as recommended (Recommended)

## Q6. Review and scenario immutability

Inventory, forecast, and supplier inputs may change while a Planner is comparing scenarios. How should results remain reproducible?

- A. Pin all input and policy versions when a review is admitted; keep completed review results and derived scenarios immutable; scenario comparison changes only declared parameters against the same pinned inputs; maintain separate latest-attempt and last-success references, and require a new review for newer inputs (Recommended)
- B. Recalculate every open scenario silently whenever any source changes
- C. Allow a Planner to overwrite the completed review's recommendation values
- X. Other (please specify)

[Answer]: A. Pin all input and policy versions when a review is admitted; keep completed review results and derived scenarios immutable; scenario comparison changes only declared parameters against the same pinned inputs; maintain separate latest-attempt and last-success references, and require a new review for newer inputs (Recommended)

## Q7. Draft structure and quantity deviations

How should a replenishment scenario become an editable purchase draft?

- A. Create one draft per retailer, store, supplier, and currency; pin the source review/scenario, supplier-term revision, and input versions; retain suggested and Planner-entered quantities separately; require a reason when a Planner deviates from a nonzero recommendation; validate positive whole-pack quantities and minimums before submission (Recommended)
- B. Put lines for multiple suppliers and currencies into one draft and retain only the edited final quantity
- C. Copy recommendations into a draft but discard their source versions once the Planner edits a line
- X. Other (please specify)

[Answer]: A. Create one draft per retailer, store, supplier, and currency; pin the source review/scenario, supplier-term revision, and input versions; retain suggested and Planner-entered quantities separately; require a reason when a Planner deviates from a nonzero recommendation; validate positive whole-pack quantities and minimums before submission (Recommended)

## Q8. Simulated inbound date

Approved orders must contribute dated inbound stock to later reviews, while receipts remain explicit authorized actions. How should the expected arrival be established?

- A. On approval, derive each line's immutable expected arrival local date from the approval local date plus the pinned supplier term's calendar-day lead time; expose outstanding approved quantities as inbound; partial receipts reduce them, full receipt completes them, and rejection or permitted cancellation removes them from future inventory position (Recommended)
- B. Count approved quantities as immediately on hand and create a receipt automatically
- C. Let callers edit expected arrival dates after approval without a new governed decision
- X. Other (please specify)

[Answer]: A. On approval, derive each line's immutable expected arrival local date from the approval local date plus the pinned supplier term's calendar-day lead time; expose outstanding approved quantities as inbound; partial receipts reduce them, full receipt completes them, and rejection or permitted cancellation removes them from future inventory position (Recommended)

## Q9. Protection window beyond forecast coverage

The selected calculation needs forecast demand for lead-time plus buffer days, but the current Forecasting contract supplies only 28 days. What should happen when a product's required protection window is longer or has missing forecast days?

- A. Mark that product blocked with required-versus-available coverage evidence; do not truncate, extrapolate, or fabricate demand; allow the Planner to compare a smaller valid buffer scenario, while a future longer-horizon forecast contract may remove the limitation (Recommended)
- B. Use the available 28 days and silently ignore the uncovered remainder
- C. Extend the horizon by repeating the final forecast day's demand
- X. Other (please specify)

[Answer]: A. Mark that product blocked with required-versus-available coverage evidence; do not truncate, extrapolate, or fabricate demand; allow the Planner to compare a smaller valid buffer scenario, while a future longer-horizon forecast contract may remove the limitation (Recommended)

## Ambiguity Scan

All answers select concrete behavior and are mutually consistent. The protection window contains `leadTimeDays + bufferDays` consecutive retailer-local forecast dates beginning on the review date. Only outstanding quantities from Approved or PartiallyReceived orders whose immutable expected arrival falls inside that window reduce need. Draft and Submitted proposals do not count as inbound. If raw need is zero or negative, the recommendation is zero and the minimum does not force an order. If raw need is positive, the service first raises it to the pinned minimum order quantity and then rounds upward to a multiple of the pinned pack size.

The 28-day forecast remains a hard evidence boundary. Missing days or a protection window longer than available compatible forecast coverage block only the affected product and expose required-versus-available dates. No calculation truncates, repeats, extrapolates, or fabricates demand. A Planner may compare a smaller buffer only when the resulting protection window is fully covered.

The saved seven-day default, 0-through-28-day range, 08:00 schedule, preferred-term authority, partial-review behavior, immutable evidence, bounded draft structure, and approval-derived inbound date do not conflict with the established tenant, quota, purchase-transition, receipt, audit, idempotency, or forecast-freshness rules. Exact processing deadlines, retry counts, retention periods, response limits, and local performance budgets remain later NFR or implementation values. No unresolved functional ambiguity remains for artifact generation.

## Consolidated Summary

Planning/Purchasing is one v1 .NET deployment containing separate Replenishment and Purchasing logical domains. Replenishment owns planning policies, scheduled and manual review admission, the shared daily allowance, immutable review jobs and attempts, scenario comparisons, recommendations, blocked-product outcomes, and latest-attempt/last-success references. Purchasing owns drafts and lines, submitted orders, approval/rejection/cancellation, simulated inbound commitments, receipts, and their lifecycle history. Retail Data remains authoritative for on-hand quantities and stock movements; Forecasting remains authoritative for forecast series and freshness; Supplier Knowledge remains authoritative for accepted supplier-term revisions.

For each product and selected accepted supplier term, the recommendation covers `leadTimeDays + bufferDays` consecutive retailer-local dates beginning on the review date. It sums compatible daily forecast demand over that protection window, then subtracts current on-hand stock and outstanding quantities from Approved or PartiallyReceived orders due inside the same window. It clamps negative raw need to zero. Zero need remains zero. Positive need is raised to the pinned minimum order quantity and then rounded upward to a whole multiple of the pinned pack size. Draft, Submitted, Rejected, Cancelled, and fully Received quantities do not reduce need.

Every product has at most one Manager-selected preferred accepted supplier term for automatic reviews. Scheduled and manual reviews pin that exact revision. A missing, stale, incompatible, or absent preferred term blocks that product. Planners may compare other currently accepted terms in explicit scenarios without changing the saved preference or silently optimizing price.

The initial retailer policy is seven calendar buffer days. A Manager may set the retailer default or a product-specific override from 0 through 28 days; an explicit zero-day product override wins over the retailer default, while an absent override inherits it. Planners may compare temporary values in the same range, but comparison does not change saved policy.

One scheduled review is due per retailer-local date at 08:00. It uses the same invalid-time and ambiguous-time mapping as Forecasting. Scheduling is independent of forecast production. If another review is active, due scheduled work is retained and runs exactly once after that job ends, without consuming manual allowance. Manual requests retain the established three accepted jobs per retailer/local day across all users, one active review per retailer, payload-bound idempotency, no charge before acceptance, retained charge after accepted failure, and no extra charge for same-job retry across day boundaries.

Review admission pins the authorized inventory snapshot and stock watermark, current usable forecast and coverage, preferred supplier-term revisions, retailer calendar/time-zone and placement generation, saved planning-policy version, trigger, local date, and calculation-schema version. Completed review results are immutable. Scenario comparison changes only declared scenario parameters against those same pinned inputs. Newer data requires a new review; the latest attempt and last successful review remain distinct.

A review is Succeeded when every in-scope active product produces a valid recommendation, PartiallySucceeded when at least one product is valid and at least one is blocked, and Failed when none is usable or a review-level dependency fails. Partial results retain immutable recommendations for valid products and explicit blocked-product reasons. Blocked products are never represented as zero-demand recommendations and cannot enter a draft as recommended lines.

Forecast coverage must span the complete protection window. If lead time plus buffer exceeds available compatible forecast days, or any required day is missing, the product is blocked with required-versus-available coverage evidence. StockSense never truncates the window or repeats, extrapolates, or fabricates forecast demand. A Planner may compare a smaller buffer scenario only when its whole protection window is covered.

A scenario creates one Draft per retailer, store, supplier, and currency. The draft pins its source review/scenario, inventory and forecast versions, supplier-term revisions, policy/calculation versions, and placement generation. Each line retains the suggested quantity and Planner-entered quantity separately. A deviation from a nonzero recommendation requires a reason. Before submission, quantities must be positive whole packs and satisfy the pinned minimum; submission locks commercial lines. Rejection or stale-input correction creates a linked replacement Draft and never mutates the source order.

Every purchasing command rechecks current membership, role, retailer ownership, placement generation, expected order version, idempotency payload, and permitted lifecycle transition. Managers approve or reject Submitted orders and may cancel Submitted or Approved orders only before any receipt. Planners and Managers record positive partial or full receipts against Approved or PartiallyReceived orders. Each receipt validates every line before any effect; cumulative received quantities cannot exceed approved quantities. Exact replay returns the original result, while changed payload, stale state, invalid transition, over-receipt, or a losing cancel/receipt race commits nothing.

Approval derives each line's immutable expected arrival local date from the approval local date plus the pinned term's calendar-day lead time. Outstanding Approved and PartiallyReceived quantities become dated inbound evidence for later reviews. Partial receipt reduces outstanding inbound, complete receipt removes it, and rejection or permitted cancellation contributes none. Approval does not create on-hand stock or an automatic receipt.

Accepted review, policy, supplier-preference, draft, order, decision, cancellation, and receipt mutations commit their domain state, immutable business audit, and outbox records atomically. The v1 co-deployment coordinates Purchasing and Retail Data receipt effects through module ports in one PostgreSQL transaction; no component bypasses its owned routines. RabbitMQ propagation remains at-least-once with payload validation and inbox deduplication. Redis is disposable and never owns review allowance, current result, order state, authorization, or inventory position.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
