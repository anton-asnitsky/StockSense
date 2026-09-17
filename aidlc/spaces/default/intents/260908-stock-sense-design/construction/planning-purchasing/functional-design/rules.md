# Planning and Purchasing Business Rules

Unit: U8 Planning and Purchasing (`planning-purchasing`)

Confirmation basis: the Planning and Purchasing consolidated summary was confirmed as `Looks correct` on 2026-09-14.

The YAML block is the source of truth for U8 decision logic. Replenishment owns planning policies, review admission, scenarios, recommendations, and their evidence. Purchasing owns drafts, orders, decisions, inbound commitments, and receipts. Other components remain authoritative for identity and membership, retailer placement, inventory and stock movements, accepted supplier terms, forecast evidence, searchable audit projections, and presentation.

```yaml source-of-truth
schema_version: "1.0.0"
unit: planning-purchasing
rules:
  - id: BR1.1
    statement: "Every Planning and Purchasing operation requires current retailer authority."
    category: authorization
    applies_to: [PlanningPolicy, ProductPlanningOverride, ReviewJob, ReplenishmentScenario, ReplenishmentRecommendation, PurchaseProposal, PurchaseOrder, Receipt]
    trigger: "A human or machine actor requests a read, command, retry, or replay."
    logic: "IF authentication, current retailer membership, required role or scope, retailer ownership, or resource ownership is invalid THEN deny the operation before disclosing or changing business state."
    violation_behavior: "Return a safe denied or hidden-resource outcome and commit no business effect."
    source: [FR2, NFR3, AC5.4.5, AC5.5.3, AC7.6.3]

  - id: BR1.2
    statement: "Identifiers and cached context never grant tenant or business authority."
    category: authorization
    applies_to: [ReviewJob, ReplenishmentScenario, ReplenishmentRecommendation, PurchaseProposal, PurchaseOrder, Receipt]
    trigger: "A caller supplies a retailer, store, product, supplier, review, scenario, draft, order, receipt, or idempotency identifier."
    logic: "IF current authoritative membership and resource ownership do not validate the supplied identifiers THEN treat them only as untrusted selectors and disclose no foreign resource facts."
    violation_behavior: "Return the safe hidden-resource result and do not consult a cache as proof of permission."
    source: [FR2, FR19, NFR3, AC5.5.3, AC7.6.3]

  - id: BR1.3
    statement: "Every command binds the current actor, retailer, placement generation, expected aggregate version, idempotency payload, and correlation context."
    category: validation
    applies_to: [PlanningPolicy, ProductPlanningOverride, ReviewJob, PurchaseProposal, PurchaseOrder, Receipt]
    trigger: "A state-changing command is admitted."
    logic: "IF any required context is missing, stale, inconsistent, or belongs to another retailer or operation payload THEN reject the command before mutation."
    violation_behavior: "Report the applicable authority, placement, version, or idempotency conflict and preserve prior state."
    source: [FR2, FR7, FR8, NFR3, AC6.1.3, AC6.2.2, AC6.3.3]

  - id: BR1.4
    statement: "Planner actions are limited to planning, draft preparation, submission, and permitted receipt recording."
    category: authorization
    applies_to: [ReviewJob, ReplenishmentScenario, PurchaseProposal, PurchaseOrder, Receipt]
    trigger: "A Planner invokes a U8 command."
    logic: "IF the command requests a review, compares a scenario, creates or edits a Draft, submits a Draft, or records a permitted receipt THEN evaluate it under the remaining rules; ELSE deny it unless the actor also has the required Manager role."
    violation_behavior: "Commit no unauthorized policy, supplier-preference, approval, rejection, or cancellation effect."
    source: [FR7, FR8, FR14, AC6.2.1, AC6.3.5, AC7.10.3]

  - id: BR1.5
    statement: "Manager authority is required for saved policy, preferred supplier term, approval, rejection, and cancellation decisions."
    category: authorization
    applies_to: [PlanningPolicy, ProductPlanningOverride, PreferredSupplierTermReference, PurchaseOrder]
    trigger: "A saved planning policy, supplier preference, or purchase decision is requested."
    logic: "IF the current actor lacks Manager authority for the retailer THEN deny the command; a Manager may also perform Planner actions only when the current membership grants the applicable role."
    violation_behavior: "Preserve the policy, preference, proposal, order, and inbound position unchanged."
    source: [FR2, FR7, AC6.3.1, AC6.3.5]

  - id: BR1.6
    statement: "Schedulers and services have only their assigned job authority and no human purchasing authority."
    category: authorization
    applies_to: [ReviewJob, PurchaseProposal, PurchaseOrder, Receipt]
    trigger: "A scheduler, worker, assistant, or other service invokes U8."
    logic: "IF issuer, audience, scope, workload identity, retailer, job identity, or placement generation is invalid THEN deny execution; even valid machine authority cannot approve, reject, cancel, receive, or submit a purchase as a human."
    violation_behavior: "Record a safe denied outcome and commit no purchase transition or receipt."
    source: [FR7, FR14, NFR5, AC7.9.1, AC7.10.3, AC8.5.2]

  - id: BR1.7
    statement: "Replenishment advises and Purchasing alone governs purchase state."
    category: policy
    applies_to: [ReplenishmentRecommendation, PurchaseProposal, PurchaseOrder, Receipt]
    trigger: "A recommendation or assistant action is used to prepare purchasing work."
    logic: "IF a recommendation or assistant draft proposes an action THEN Purchasing must create and govern the Draft and all later transitions; no recommendation, forecast, model output, or assistant response is itself an order or approval."
    violation_behavior: "Treat the input as non-authoritative evidence and require the governed Purchasing command."
    source: [FR7, FR14, NFR4, AC7.8.2, AC7.10.1, AC7.10.3]

  - id: BR2.1
    statement: "Retail Data owns current on-hand inventory and stock movements, while Purchasing owns dated inbound commitments."
    category: policy
    applies_to: [ReviewEvidenceSnapshot, ReplenishmentRecommendation, PurchaseOrderLine, ReceiptLine]
    trigger: "A review resolves inventory position or a receipt changes stock."
    logic: "IF current on-hand or movement evidence is needed THEN obtain the authorized Retail Data version; IF outstanding approved quantities are needed THEN derive them from Purchasing; neither domain may replace the other's authoritative facts."
    violation_behavior: "Mark the input unavailable or reject the mutation rather than using an unowned or cached value as authoritative."
    source: [FR4, FR6, FR8, NFR4, AC5.1.1, AC6.5.1]

  - id: BR2.2
    statement: "Automatic reviews use one Manager-selected preferred accepted supplier term per product."
    category: policy
    applies_to: [PreferredSupplierTermReference, ReviewEvidenceSnapshot, ReplenishmentRecommendation]
    trigger: "A scheduled or manual review resolves the supplier term for a product."
    logic: "IF exactly one currently usable preferred accepted term is selected for the retailer product THEN pin that term revision; ELSE block that product from automatic recommendation."
    violation_behavior: "Produce a blocked-product reason and no recommendation for that product."
    source: [FR6, FR10.1, AC5.1.1, AC5.1.4]

  - id: BR2.3
    statement: "A preferred supplier term must remain accepted, compatible, retailer-owned, and currency-compatible at admission."
    category: validation
    applies_to: [PreferredSupplierTermReference, ReviewEvidenceSnapshot, ReplenishmentRecommendation]
    trigger: "The preferred term is pinned for a review."
    logic: "IF the term is absent, stale, unaccepted, foreign, incompatible with the product, or not in the retailer currency THEN block the product."
    violation_behavior: "Expose the term-evidence failure without choosing another term silently."
    source: [FR6, FR10.1, FR11, AC5.1.3, AC7.7.2, AC7.7.3]

  - id: BR2.4
    statement: "A Planner may compare other accepted supplier terms without changing the saved preference."
    category: policy
    applies_to: [ReplenishmentScenario, PreferredSupplierTermReference]
    trigger: "A Planner creates an explicit supplier-comparison scenario."
    logic: "IF an alternative term is currently accepted, compatible, retailer-owned, and currency-compatible THEN the scenario may pin it against the review's other inputs; the scenario must not alter the preferred term or optimize price automatically."
    violation_behavior: "Reject an ineligible term and disclose insufficient evidence without inventing a preferred supplier."
    source: [FR6, FR14, AC7.7.1, AC7.7.3, AC7.8.2]

  - id: BR2.5
    statement: "The initial retailer planning policy uses seven calendar buffer days."
    category: policy
    applies_to: [PlanningPolicy]
    trigger: "A retailer receives its first planning policy and no Manager-set value exists."
    logic: "IF no saved retailer buffer policy exists THEN initialize the effective retailer default to seven calendar days."
    violation_behavior: "Do not infer another default or require every product to define an override."
    source: [FR6, AC5.3.1]

  - id: BR2.6
    statement: "Saved retailer and product buffer values are Manager-controlled integers from zero through twenty-eight calendar days."
    category: validation
    applies_to: [PlanningPolicy, ProductPlanningOverride]
    trigger: "A saved buffer policy is created or changed."
    logic: "IF the actor is an authorized Manager and the value is a whole number in the inclusive range 0 through 28 THEN create a new policy version; ELSE reject the change."
    violation_behavior: "Retain the prior policy version and return the validation or authorization failure."
    source: [FR6, FR11, AC5.3.1]

  - id: BR2.7
    statement: "A product override, including an explicit zero, takes precedence over the retailer default."
    category: calculation
    applies_to: [PlanningPolicy, ProductPlanningOverride, ReplenishmentScenario]
    trigger: "The effective saved buffer is resolved for a product."
    logic: "IF a product override exists THEN use its value even when it is zero; ELSE inherit the retailer default."
    violation_behavior: "Reject an ambiguous policy snapshot rather than treating zero as absence."
    source: [FR6, AC5.3.1]

  - id: BR2.8
    statement: "Temporary Planner scenarios may use buffer values from zero through twenty-eight without changing saved policy."
    category: policy
    applies_to: [ReplenishmentScenario, PlanningPolicy, ProductPlanningOverride]
    trigger: "A Planner compares a temporary buffer scenario."
    logic: "IF the scenario buffer is a whole number in the inclusive range 0 through 28 THEN pin it as a declared scenario parameter; saved retailer and product policy versions remain unchanged."
    violation_behavior: "Reject an out-of-range scenario and preserve saved policy."
    source: [FR6, FR7, AC5.3.2, AC7.8.2]

  - id: BR2.9
    statement: "The protection window contains lead-time days plus buffer days beginning on the review date."
    category: calculation
    applies_to: [ReplenishmentScenario, ReplenishmentRecommendation]
    trigger: "A product recommendation resolves its demand horizon."
    logic: "IF leadTimeDays and bufferDays are the pinned calendar-day values THEN use leadTimeDays + bufferDays consecutive retailer-local forecast dates starting with the review date, with the final date inclusive."
    violation_behavior: "Block the product when the window cannot be resolved deterministically."
    source: [FR6, FR11, AC5.1.1, AC7.8.1]

  - id: BR2.10
    statement: "Forecast evidence must cover every date in the protection window."
    category: validation
    applies_to: [ReviewEvidenceSnapshot, ReplenishmentRecommendation]
    trigger: "Protection-window forecast coverage is checked."
    logic: "IF the required window exceeds the compatible 28-day series or any required local date is missing THEN block the product and record required-versus-available dates; never truncate, repeat, extrapolate, or fabricate demand."
    violation_behavior: "Publish no recommendation for the affected product; allow only a smaller-buffer scenario whose complete window is covered."
    source: [FR5, FR6, FR9.3, AC5.1.3, AC7.6.2, AC7.8.3]

  - id: BR2.11
    statement: "Only outstanding approved inbound due inside the protection window reduces need."
    category: calculation
    applies_to: [PurchaseOrderLine, ReplenishmentRecommendation]
    trigger: "A product recommendation calculates available inbound."
    logic: "IF an order line is Approved or PartiallyReceived and its immutable expected arrival local date falls within the inclusive protection window THEN subtract only approved quantity minus cumulatively received quantity; Draft, Submitted, Rejected, Cancelled, and fully Received quantities contribute zero."
    violation_behavior: "Exclude ineligible or undated quantities and retain evidence explaining the inventory position."
    source: [FR6, FR7, FR8, AC5.1.1, AC6.6.1]

  - id: BR2.12
    statement: "Recommendation quantity follows one deterministic calculation order."
    category: calculation
    applies_to: [ReplenishmentRecommendation]
    trigger: "Complete compatible evidence is available for a product and selected term."
    logic: "IF evidence is valid THEN sum forecast demand over the protection window, subtract current on-hand and eligible outstanding inbound, clamp a zero or negative raw need to zero, and for positive need first raise it to the pinned minimum order quantity and then round upward to a whole multiple of the pinned pack size."
    violation_behavior: "Block the product if any operand, version, minimum, pack, or precision rule is missing or invalid; never invent a quantity."
    source: [FR6, AC5.1.1, AC5.1.2, AC5.1.4, AC7.8.1]

  - id: BR3.1
    statement: "One scheduled replenishment review is due at 08:00 for each retailer-local date."
    category: calculation
    applies_to: [ReviewJob]
    trigger: "The daily Planning schedule resolves due work."
    logic: "IF a retailer-local date has no logical scheduled review THEN create one due at 08:00 under the retailer's pinned calendar and time-zone version; forecast production events do not create additional scheduled reviews."
    violation_behavior: "Reject an inconsistent or duplicate schedule identity and preserve one logical due job."
    source: [FR9.4, FR11, AC5.2.1, AC5.2.3]

  - id: BR3.2
    statement: "Scheduled review daylight-saving resolution matches Forecasting."
    category: calculation
    applies_to: [ReviewJob]
    trigger: "A retailer-local 08:00 due time is invalid or ambiguous."
    logic: "IF 08:00 is invalid THEN use the first valid instant afterward; IF it is ambiguous THEN use the earlier occurrence; THEN record the resolved UTC instant and intended local date."
    violation_behavior: "Do not create zero or two logical reviews for the local date."
    source: [FR9.4, FR11, AC5.2.3]

  - id: BR3.3
    statement: "Retailer, local date, and scheduled trigger form the stable scheduled-review identity."
    category: constraint
    applies_to: [ReviewJob]
    trigger: "Scheduled dispatch, restart, or redelivery occurs."
    logic: "IF the logical scheduled review already exists THEN return or resume that job with its intended date and trigger rather than creating another business effect."
    violation_behavior: "Suppress duplicate work and preserve the original job identity and outcome."
    source: [FR9.4, NFR7, AC5.2.3, AC5.2.4]

  - id: BR3.4
    statement: "At most one review job is active for a retailer."
    category: constraint
    applies_to: [ReviewJob]
    trigger: "A scheduled job becomes due or a manual request seeks acceptance."
    logic: "IF another review is active THEN no second job may become active; retain due scheduled work for one later execution and return the authorized existing job for a matching duplicate manual request."
    violation_behavior: "Queue the due scheduled job or reject the competing manual request without overlapping execution."
    source: [FR9.1, FR9.4, AC5.2.2, AC5.2.4, AC5.4.2]

  - id: BR3.5
    statement: "A retained scheduled review runs exactly once after the active review ends."
    category: constraint
    applies_to: [ReviewJob]
    trigger: "The active review reaches a terminal outcome while scheduled work is retained."
    logic: "IF a due scheduled job remains eligible THEN activate that same job once with its original intended local date and without overlap."
    violation_behavior: "Do not discard, duplicate, redate, or manually charge the scheduled work."
    source: [FR9.4, AC5.2.2, AC5.2.4]

  - id: BR3.6
    statement: "Manual review allowance is three accepted distinct jobs per retailer-local date across all users."
    category: constraint
    applies_to: [ManualReviewAllowance, ReviewJob]
    trigger: "A distinct manual review request seeks acceptance."
    logic: "IF fewer than three manual jobs have been accepted for the retailer-local date and no active-review conflict prevents acceptance THEN atomically accept at most one next job; ELSE deny a new job."
    violation_behavior: "Return quota exhaustion or the applicable conflict and commit no rejected job, allowance, audit, or outbox effect."
    source: [FR9, FR9.1, AC5.4.2, AC5.4.4]

  - id: BR3.7
    statement: "Scheduled reviews never consume manual allowance."
    category: policy
    applies_to: [ManualReviewAllowance, ReviewJob]
    trigger: "A scheduled review is admitted, retained, executed, retried, or replayed."
    logic: "IF the trigger is scheduled THEN leave manual accepted count and remaining allowance unchanged."
    violation_behavior: "Reject or repair any outcome that charges scheduled work to the manual allowance."
    source: [FR9, FR9.4, AC5.2.1, AC5.2.4]

  - id: BR3.8
    statement: "Manual acceptance commits the job, allowance charge, audit, and outbox atomically."
    category: constraint
    applies_to: [ReviewJob, ManualReviewAllowance, BusinessAuditRecord, OutboxMessage]
    trigger: "A distinct manual request passes authority, active-job, quota, and input admission checks."
    logic: "IF every required admission effect can commit THEN accept the job and increment the local-date allowance once; ELSE commit none of them."
    violation_behavior: "Return a preacceptance failure with no consumed slot or partial record."
    source: [FR9, FR9.2, FR17, AC5.4.1, AC5.4.4, AC9.1.1]

  - id: BR3.9
    statement: "An accepted failed manual review retains its original allowance charge."
    category: policy
    applies_to: [ReviewJob, ManualReviewAllowance]
    trigger: "An accepted manual job fails or becomes retryable."
    logic: "IF the job was accepted THEN retain the charge against its acceptance local date; failure never refunds the slot."
    violation_behavior: "Preserve the accepted count and expose the failed outcome and retry eligibility."
    source: [FR9.2, AC5.4.3, AC5.4.6, AC5.4.7]

  - id: BR3.10
    statement: "Retrying or replaying the same accepted job never consumes another allowance slot."
    category: constraint
    applies_to: [ReviewJob, ManualReviewAllowance]
    trigger: "An authorized same-job retry or lost-response replay occurs, including after local midnight."
    logic: "IF the operation identifies the original accepted job and its bound payload THEN resume or return that job under its pinned inputs and original charge; the current day's allowance is unchanged."
    violation_behavior: "Reject changed-job or changed-payload requests rather than creating a free new review."
    source: [FR9.1, FR9.2, AC5.4.3, AC5.4.5, AC5.4.6, AC5.5.4]

  - id: BR3.11
    statement: "Every idempotency key is bound to one canonical operation payload and result."
    category: validation
    applies_to: [ReviewJob, PurchaseProposal, PurchaseOrder, Receipt]
    trigger: "A state-changing request repeats an idempotency key."
    logic: "IF the canonical payload matches the accepted operation THEN return the original authorized result without new effects; IF it differs THEN report a conflict."
    violation_behavior: "Preserve the original operation, state, allowance, audit, and outbox records."
    source: [FR8, FR9.1, NFR7, AC5.4.5, AC6.2.2, AC6.3.5, AC6.5.3]

  - id: BR3.12
    statement: "Review admission pins a complete authorized evidence and policy snapshot."
    category: constraint
    applies_to: [ReviewJob, ReviewEvidenceSnapshot]
    trigger: "A scheduled or manual review is accepted."
    logic: "IF inventory snapshot and movement watermark, usable forecast and coverage, preferred supplier-term revisions, retailer calendar and time-zone version, placement generation, saved policy version, trigger, local date, and calculation-schema version are all valid THEN pin them immutably; ELSE do not admit usable calculation work."
    violation_behavior: "Return an explicit preacceptance or job-level unavailable reason without reading mutable replacements during execution."
    source: [FR5, FR6, FR9.3, FR9.4, FR11, AC5.1.1, AC5.4.1]

  - id: BR3.13
    statement: "Manual and scheduled reviews consume current usable forecast evidence without triggering training."
    category: policy
    applies_to: [ReviewJob, ReviewEvidenceSnapshot]
    trigger: "A review resolves forecast input."
    logic: "IF Forecasting supplies a current compatible series and explicit coverage THEN pin it; ELSE record unavailable or failed review evidence, and never train, retrain, substitute, or invent demand."
    violation_behavior: "Produce no usable recommendation for unsupported products or for a review-level forecast dependency failure."
    source: [FR5, FR9.3, FR9.4, AC5.4.1, AC5.4.7, AC7.9.3]

  - id: BR3.14
    statement: "Review and product outcomes are derived from validated recommendation coverage."
    category: calculation
    applies_to: [ReviewJob, ReplenishmentRecommendation, RecommendationBlock]
    trigger: "All in-scope products and review-level dependencies have terminal outcomes."
    logic: "IF every in-scope active product has a valid recommendation THEN the review is Succeeded; IF at least one is valid and at least one is blocked THEN PartiallySucceeded; IF none is usable or a review-level dependency fails THEN Failed."
    violation_behavior: "Reject inconsistent status or coverage counts and retain explicit product and review reasons."
    source: [FR6, FR9.3, FR9.4, AC5.4.7]

  - id: BR3.15
    statement: "Partial review results contain recommendations only for valid products."
    category: constraint
    applies_to: [ReviewJob, ReplenishmentRecommendation, RecommendationBlock]
    trigger: "A review completes with mixed product evidence."
    logic: "IF a product has complete valid evidence THEN publish its immutable recommendation; IF it is blocked THEN publish its required safe reason and evidence limits without a zero-demand recommendation."
    violation_behavior: "Do not omit blocked products, relabel them successful, or allow them to enter a draft as recommended lines."
    source: [FR5, FR6, FR9.5, AC5.1.3, AC5.4.7, AC7.8.3]

  - id: BR4.1
    statement: "Completed reviews, recommendations, evidence snapshots, and derived scenarios are immutable."
    category: constraint
    applies_to: [ReviewJob, ReviewEvidenceSnapshot, ReplenishmentRecommendation, ReplenishmentScenario]
    trigger: "A review or scenario reaches a completed result."
    logic: "IF a completed result would change THEN require a new review or scenario identity; never overwrite the pinned inputs, parameters, arithmetic, blocked outcomes, or recommendations."
    violation_behavior: "Preserve the original result and reject in-place mutation."
    source: [FR6, FR7, NFR15, AC5.3.2, AC5.3.3]

  - id: BR4.2
    statement: "Scenario comparison changes only declared parameters against one pinned review snapshot."
    category: calculation
    applies_to: [ReplenishmentScenario, ReviewEvidenceSnapshot, ReplenishmentRecommendation]
    trigger: "A Planner creates or compares a scenario."
    logic: "IF the scenario declares a valid buffer or eligible alternative supplier term THEN recalculate with the source review's same pinned inventory, inbound, forecast, policy baseline, calendar, placement, and calculation schema; all undeclared inputs remain identical."
    violation_behavior: "Reject a scenario that silently refreshes or mixes input versions."
    source: [FR6, FR7, AC5.3.2, AC7.8.2]

  - id: BR4.3
    statement: "Newer source or policy evidence requires a new review."
    category: policy
    applies_to: [ReviewJob, ReplenishmentScenario, ReviewEvidenceSnapshot]
    trigger: "Inventory, forecast, supplier term, policy, calendar, placement, or calculation schema changes after review admission."
    logic: "IF a user needs the newer evidence THEN request a new review; existing review and scenario results remain bound to their original versions."
    violation_behavior: "Do not silently refresh or present the old calculation as current."
    source: [FR6, FR9.3, FR9.5, AC5.3.3, AC5.5.5]

  - id: BR4.4
    statement: "Latest review attempt and last successful review are separate references."
    category: constraint
    applies_to: [ReviewJob, ReviewPointer]
    trigger: "A review finishes or review status is queried."
    logic: "IF the latest attempt failed, was unavailable, or partially succeeded THEN retain its identity and outcome separately from the last successful review; never relabel older recommendations current."
    violation_behavior: "Return both references and their versions or explicit never-run states."
    source: [FR9.5, AC5.5.1, AC5.5.2, AC5.5.5]

  - id: BR4.5
    statement: "A purchase draft is bounded to one retailer, store, supplier, and currency."
    category: constraint
    applies_to: [PurchaseProposal, PurchaseProposalLine]
    trigger: "A scenario is converted into a Draft."
    logic: "IF all selected lines share the same authorized retailer, store, supplier, and retailer currency THEN create one Draft; ELSE split by those dimensions or reject the mixed request."
    violation_behavior: "Create no cross-retailer, cross-store, cross-supplier, or mixed-currency Draft."
    source: [FR7, FR11, AC6.1.1]

  - id: BR4.6
    statement: "Every Draft pins its source and commercial evidence."
    category: constraint
    applies_to: [PurchaseProposal, PurchaseProposalLine]
    trigger: "A Draft or replacement Draft is created."
    logic: "IF source review or scenario, inventory and forecast versions, supplier-term revisions, saved or scenario policy, calculation-schema version, placement generation, retailer, store, supplier, and currency are complete THEN pin them; ELSE reject draft creation."
    violation_behavior: "Return deterministic missing or stale evidence and create no Draft."
    source: [FR6, FR7, NFR3, AC6.1.1, AC7.10.1]

  - id: BR4.7
    statement: "Each Draft line retains suggested and Planner-entered quantities separately."
    category: constraint
    applies_to: [PurchaseProposalLine, ReplenishmentRecommendation]
    trigger: "A recommendation enters a Draft or a Planner edits quantity."
    logic: "IF a line originates from a recommendation THEN preserve that suggested quantity and store the entered quantity separately; IF the entered quantity differs from a nonzero suggestion THEN require a nonblank deviation reason."
    violation_behavior: "Reject the edit or submission without erasing the recommendation evidence."
    source: [FR6, FR7, FR14, AC6.1.1, AC7.10.1]

  - id: BR4.8
    statement: "Draft commercial quantities must be valid before submission."
    category: validation
    applies_to: [PurchaseProposal, PurchaseProposalLine]
    trigger: "A Draft line is edited or the Draft is submitted."
    logic: "IF every entered quantity is positive, is a whole multiple of the pinned pack size, and meets the pinned minimum order quantity THEN quantity validation passes; ELSE submission is denied."
    violation_behavior: "Identify invalid lines and retain the Draft as editable with no transition."
    source: [FR6, FR7, AC5.1.2, AC6.2.1]

  - id: BR5.1
    statement: "A Planner creates a new purchase aggregate only as Draft."
    category: constraint
    applies_to: [PurchaseProposal]
    trigger: "A governed purchase proposal is created."
    logic: "IF draft evidence, authority, idempotency, and structure validation pass THEN create status Draft; no command may create a purchase directly in Submitted, Approved, or receipt state."
    violation_behavior: "Reject the request and create no purchase aggregate."
    source: [FR7, AC6.1.1, AC7.10.1, AC7.10.4]

  - id: BR5.2
    statement: "Only Draft commercial lines are editable, and submission locks them."
    category: constraint
    applies_to: [PurchaseProposal, PurchaseProposalLine]
    trigger: "A Planner edits or submits a proposal."
    logic: "IF status is Draft and expected version matches THEN permit a valid edit or transition to Submitted; after submission, commercial lines and their source versions are immutable."
    violation_behavior: "Reject stale edits or edits to Submitted, Approved, Rejected, Cancelled, PartiallyReceived, or Received purchases."
    source: [FR7, AC6.1.2, AC6.1.3, AC6.2.1, AC6.2.2]

  - id: BR5.3
    statement: "Every purchase requires an explicit authorized Manager approval."
    category: authorization
    applies_to: [PurchaseOrder]
    trigger: "A Submitted proposal is approved."
    logic: "IF the current human actor has Manager authority and all revalidation and concurrency checks pass THEN transition Submitted to Approved; no Planner-only, assistant, scheduler, service, recommendation, or model authority can satisfy approval."
    violation_behavior: "Keep the proposal Submitted and record a safe denied or conflicted attempt."
    source: [FR7, FR14, AC6.3.1, AC6.3.3, AC6.3.5, AC7.10.3]

  - id: BR5.4
    statement: "Approval revalidates current authority and every mutable dependency represented by the locked proposal."
    category: validation
    applies_to: [PurchaseProposal, PurchaseOrder, PurchaseProposalLine]
    trigger: "A Manager submits an approval command."
    logic: "IF membership, Manager role, retailer and store ownership, placement generation, expected order version, accepted supplier-term revision, price, quantity, currency, inventory version or watermark, forecast usability and version, and source recommendation eligibility still match THEN approval may proceed."
    violation_behavior: "Commit no approval; identify the stale input category and current order status without silently refreshing locked lines."
    source: [FR6, FR7, NFR3, AC5.1.3, AC6.3.1, AC6.3.3, AC6.3.4]

  - id: BR5.5
    statement: "Manager rejection transitions only Submitted to terminal Rejected."
    category: constraint
    applies_to: [PurchaseOrder]
    trigger: "A Manager rejects a purchase."
    logic: "IF status is Submitted and expected version and authority pass THEN transition to Rejected; no later transition may reopen or receive it."
    violation_behavior: "Reject invalid-state or stale-version decisions and preserve current state."
    source: [FR7, FR8, AC6.3.2, AC6.3.5, AC6.6.3]

  - id: BR5.6
    statement: "Manager cancellation is permitted only from Submitted or Approved before any receipt commits."
    category: constraint
    applies_to: [PurchaseOrder, Receipt]
    trigger: "A Manager requests cancellation."
    logic: "IF status is Submitted or Approved, expected version matches, and no receipt line has committed THEN transition to terminal Cancelled; ELSE deny cancellation."
    violation_behavior: "Preserve the order and any receipt or inbound facts unchanged."
    source: [FR7, FR8, AC6.4.1, AC6.4.2]

  - id: BR5.7
    statement: "Correction after line lock creates a linked replacement Draft."
    category: policy
    applies_to: [PurchaseProposal, PurchaseOrder]
    trigger: "A locked, rejected, cancelled, or stale proposal needs corrected commercial content."
    logic: "IF correction is authorized THEN create a new Draft linked to the source identity and status, with current governed evidence; the source remains unchanged and the replacement requires fresh submission and approval."
    violation_behavior: "Do not reopen, overwrite, or silently replace the source purchase."
    source: [FR7, AC6.1.2, AC6.1.4, AC6.3.2, AC6.3.4]

  - id: BR5.8
    statement: "Receipt transitions are allowed only from Approved or PartiallyReceived."
    category: constraint
    applies_to: [PurchaseOrder, Receipt]
    trigger: "A valid receipt is committed."
    logic: "IF any approved quantity remains after the receipt THEN status is PartiallyReceived; IF every line is cumulatively fulfilled THEN status is Received."
    violation_behavior: "Reject receipt against Draft, Submitted, Rejected, Cancelled, or Received state except for an exact accepted-operation replay."
    source: [FR8, AC6.5.1, AC6.6.1, AC6.6.2, AC6.6.3]

  - id: BR5.9
    statement: "All unlisted purchase transitions are denied."
    category: constraint
    applies_to: [PurchaseProposal, PurchaseOrder, Receipt]
    trigger: "Any purchase-state command is evaluated."
    logic: "IF the current state, actor, and action combination is absent from the confirmed Draft, Submitted, Approved, Rejected, Cancelled, PartiallyReceived, and Received matrix THEN deny it; v1 has no Draft cancellation, reopen, returns, over-receipt tolerance, or post-receipt cancellation."
    violation_behavior: "Commit no transition or related business effects."
    source: [FR7, FR8, AC6.3.5, AC6.4.2, AC6.6.3]

  - id: BR5.10
    statement: "Concurrent purchase decisions are serialized by expected version."
    category: constraint
    applies_to: [PurchaseOrder]
    trigger: "Approval, rejection, cancellation, or receipt commands race."
    logic: "IF one command commits against the expected version THEN competing commands must re-evaluate the new state and version; incompatible outcomes cannot both commit."
    violation_behavior: "Return a conflict to losing commands and preserve the single committed transition."
    source: [FR7, FR8, AC6.3.3, AC6.4.3]

  - id: BR5.11
    statement: "Approval derives an immutable expected arrival local date for each order line."
    category: calculation
    applies_to: [PurchaseOrder, PurchaseOrderLine]
    trigger: "A Submitted proposal transitions to Approved."
    logic: "IF approval commits THEN expectedArrivalLocalDate equals the approval local date plus the pinned supplier term's calendar-day lead time; callers cannot edit it afterward."
    violation_behavior: "Reject approval when the local date, calendar, lead time, or term revision is unresolved; never create an automatic receipt or on-hand stock."
    source: [FR6, FR7, FR11, AC6.3.1]

  - id: BR6.1
    statement: "Only an authorized Planner or Manager may record a receipt."
    category: authorization
    applies_to: [Receipt, ReceiptLine, PurchaseOrder]
    trigger: "A simulated receipt command is requested."
    logic: "IF the current human actor has Planner or Manager receipt authority for the retailer and store THEN evaluate the receipt; machine or assistant authority is insufficient."
    violation_behavior: "Commit no receipt, order, stock, audit, or outbox effect."
    source: [FR8, FR14, AC6.3.5, AC6.5.1, AC7.10.3]

  - id: BR6.2
    statement: "Every receipt line must identify an approved line in the same retailer, store, and order."
    category: validation
    applies_to: [Receipt, ReceiptLine, PurchaseOrderLine]
    trigger: "A receipt payload is validated."
    logic: "IF a receipt line is foreign, duplicated within the operation, absent from the order, or mapped to a different retailer, store, product, or order THEN the whole receipt is invalid."
    violation_behavior: "Reject the complete receipt and disclose no foreign resource facts."
    source: [FR8, NFR3, AC6.5.2, AC6.5.4]

  - id: BR6.3
    statement: "Every received quantity is positive."
    category: validation
    applies_to: [ReceiptLine]
    trigger: "A receipt line quantity is validated."
    logic: "IF quantity is not a positive valid unit quantity THEN the whole receipt fails validation."
    violation_behavior: "Commit no receipt line, stock movement, order transition, audit, or outbox effect."
    source: [FR8, AC6.5.2, AC6.5.4]

  - id: BR6.4
    statement: "Cumulative received quantity per line cannot exceed approved quantity."
    category: constraint
    applies_to: [PurchaseOrderLine, ReceiptLine]
    trigger: "A new receipt line is evaluated against committed history."
    logic: "IF prior committed receipts plus the proposed quantity are less than or equal to approved quantity THEN the line may proceed; ELSE reject the whole receipt, so 6 then 4 succeeds against 10 while 6 then 5 fails."
    violation_behavior: "Preserve prior received and outstanding balances with no partial effect from the rejected operation."
    source: [FR8, AC6.5.2, AC6.5.3, AC6.5.5, AC6.6.1]

  - id: BR6.5
    statement: "Every receipt validates all lines before any receipt effect commits."
    category: constraint
    applies_to: [Receipt, ReceiptLine, PurchaseOrder, Inventory.StockMovement, BusinessAuditRecord, OutboxMessage]
    trigger: "A multi-line or single-line receipt is submitted."
    logic: "IF every line, authority, state, version, idempotency, and cumulative quantity check passes THEN commit the receipt as one operation; ELSE commit none of its effects."
    violation_behavior: "Return line-specific safe failures while leaving all business state unchanged."
    source: [FR8, FR17, AC6.5.2, AC6.5.4]

  - id: BR6.6
    statement: "Distinct concurrent receipts preserve quantity conservation."
    category: constraint
    applies_to: [PurchaseOrderLine, Receipt, ReceiptLine]
    trigger: "Two or more distinct receipt operations race for the same order."
    logic: "IF serialized against current committed balances and expected order version THEN only operations within every line's remaining quantity may commit."
    violation_behavior: "Reject losing or excessive operations without duplicate or partial stock effects."
    source: [FR8, AC6.5.3, AC6.5.5]

  - id: BR6.7
    statement: "A cancel and receipt race can produce only one valid outcome."
    category: constraint
    applies_to: [PurchaseOrder, Receipt]
    trigger: "Cancellation races the first receipt on an Approved order."
    logic: "IF cancellation commits first THEN receipt must fail against Cancelled; IF receipt commits first THEN cancellation must fail because a receipt exists; both cannot succeed."
    violation_behavior: "Return a conflict to the losing operation and preserve the winning state and effects."
    source: [FR7, FR8, AC6.4.3]

  - id: BR6.8
    statement: "Approved and PartiallyReceived order lines expose only outstanding quantity as dated inbound."
    category: calculation
    applies_to: [PurchaseOrderLine, ReplenishmentRecommendation]
    trigger: "A later review requests inbound evidence."
    logic: "IF an order line is Approved or PartiallyReceived THEN inbound quantity equals approved quantity minus cumulative committed receipts at its immutable expected arrival local date; rejection, cancellation, or full receipt contributes none."
    violation_behavior: "Reject inconsistent negative or over-approved inbound and do not count it in inventory position."
    source: [FR6, FR8, AC5.1.1, AC6.6.1]

  - id: BR6.9
    statement: "Receipt completion is derived across all order lines."
    category: calculation
    applies_to: [PurchaseOrder, PurchaseOrderLine]
    trigger: "A receipt updates cumulative line balances."
    logic: "IF every order line is fully received THEN set the order to Received; IF any line remains outstanding after at least one receipt THEN set or retain PartiallyReceived."
    violation_behavior: "Reject an order status inconsistent with its conserved line balances."
    source: [FR8, AC6.6.1, AC6.6.2, AC6.6.4]

  - id: BR6.10
    statement: "Uncertain receipt outcomes are reconciled by the original operation identity."
    category: policy
    applies_to: [Receipt, PurchaseOrder, Inventory.StockMovement]
    trigger: "A caller times out or loses the response to a receipt submission."
    logic: "IF the outcome is uncertain THEN query or retry using the same idempotency key and payload to recover the recorded result; do not create a new receipt or presume failure."
    violation_behavior: "Return unresolved or conflict status until authoritative outcome is known."
    source: [FR8, NFR7, AC6.5.3, AC6.5.6]

  - id: BR7.1
    statement: "Every accepted U8 mutation commits domain state, immutable business audit, and outbox records atomically."
    category: constraint
    applies_to: [PlanningPolicy, ProductPlanningOverride, PreferredSupplierTermReference, ReviewJob, PurchaseProposal, PurchaseOrder, Receipt, BusinessAuditRecord, OutboxMessage]
    trigger: "A policy, preference, review, draft, order decision, cancellation, or receipt mutation is accepted."
    logic: "IF every required domain, audit, and outbox record can commit together THEN expose success; ELSE none of the mutation commits."
    violation_behavior: "Return failure and preserve the pre-mutation state."
    source: [FR17, FR17.1, AC5.4.1, AC6.5.1, AC9.1.1, AC9.1.2]

  - id: BR7.2
    statement: "A rejected attempt is audited safely without committing the rejected business mutation."
    category: policy
    applies_to: [BusinessAuditRecord]
    trigger: "Authorization, validation, quota, version, transition, concurrency, or idempotency rejects a request."
    logic: "IF the business transaction cannot commit THEN use the separate rejection-record path with actor, retailer, target, outcome, correlation, and safe provenance."
    violation_behavior: "Do not lose the rejection evidence or expose protected payload details."
    source: [FR17, FR17.1, AC9.1.2]

  - id: BR7.3
    statement: "Committed outbox records remain pending until durable publication is confirmed."
    category: constraint
    applies_to: [OutboxMessage]
    trigger: "A committed U8 event awaits publication."
    logic: "IF publication confirmation is absent THEN retain the outbox record for bounded retry; the already committed business effect remains authoritative."
    violation_behavior: "Do not mark delivery complete, discard the event, or roll back committed business state because a projection is unavailable."
    source: [FR17, NFR7, AC8.5.1]

  - id: BR7.4
    statement: "Asynchronous delivery is at least once and every consumer effect is inbox-idempotent."
    category: policy
    applies_to: [InboxMessage, OutboxMessage]
    trigger: "A U8 message is delivered or redelivered."
    logic: "IF message identity was already processed THEN return its recorded disposition; ELSE validate payload, tenant, actor or job authority, placement, contract version, and aggregate version, then commit inbox and business effect before acknowledgement."
    violation_behavior: "Do not acknowledge uncommitted work, duplicate an effect, or claim exactly-once transport."
    source: [NFR3, NFR7, AC8.5.1, AC8.5.2]

  - id: BR7.5
    statement: "Message processing uses bounded retries and authorized dead-letter replay."
    category: policy
    applies_to: [InboxMessage, OutboxMessage, ReviewJob]
    trigger: "A publish or consume attempt fails."
    logic: "IF the configured retry bound is not exhausted THEN retry according to the bounded policy; ELSE retain an observable dead-letter outcome, and require authorized replay with original identity and renewed authority checks."
    violation_behavior: "Do not retry without bound, erase the failure, or create a new business identity during replay."
    source: [NFR7, AC8.5.3, AC9.6.3]

  - id: BR7.6
    statement: "Caches are disposable, tenant-scoped accelerators and never authoritative for U8 decisions."
    category: constraint
    applies_to: [ReviewReadCache, RecommendationReadCache, PurchaseReadCache]
    trigger: "A Planning or Purchasing value is cached or read from cache."
    logic: "IF a cache entry lacks exact retailer, resource, authority, placement, and source-version scope or conflicts with authoritative state THEN ignore it; cache never owns allowance, active job, current result, policy, order state, authorization, inventory position, or inbound balance."
    violation_behavior: "Use an authorized authoritative read or return explicit degradation without weakening correctness."
    source: [FR19, NFR3]

  - id: BR7.7
    statement: "Authoritative commits invalidate affected cached Planning and Purchasing views."
    category: policy
    applies_to: [ReviewReadCache, RecommendationReadCache, PurchaseReadCache]
    trigger: "A policy, review, scenario, draft, order, cancellation, or receipt commits."
    logic: "IF cached data could be stale THEN invalidate or bypass it; a stale-fill race cannot replace a newer authoritative version."
    violation_behavior: "Serve a fresh authoritative result or an explicit unavailable state, never stale data as current."
    source: [FR19, NFR3, AC5.5.5]

  - id: BR7.8
    statement: "U8 synchronous and asynchronous boundaries use versioned governed contracts."
    category: validation
    applies_to: [ReviewJob, ReviewEvidenceSnapshot, PurchaseProposal, PurchaseOrder, Receipt, InboxMessage, OutboxMessage]
    trigger: "A Planning or Purchasing API, command, response, or event is introduced or changed."
    logic: "IF authentication, tenant context, stable errors, expected version, idempotency, correlation, examples, or compatibility evidence is missing or invalid THEN the boundary is incomplete."
    violation_behavior: "Fail applicable contract validation and do not claim integration acceptance."
    source: [NFR8, AC8.2.1, AC8.2.2, AC8.2.3]

  - id: BR7.9
    statement: "U8 accesses other domains only through owner-governed contracts and preserves correlation context."
    category: constraint
    applies_to: [ReviewEvidenceSnapshot, PurchaseOrder, Receipt, InboxMessage, OutboxMessage]
    trigger: "U8 reads identity, placement, inventory, supplier, or forecast data; posts stock; or emits an event."
    logic: "IF another component owns the data or effect THEN use its governed boundary and propagate retailer, actor, placement generation, correlation, causation, idempotency, and source versions where applicable; direct cross-domain storage access is forbidden."
    violation_behavior: "Reject the operation or return dependency unavailable rather than bypassing the owner."
    source: [FR2, FR4, FR5, FR10.1, NFR3, NFR4, NFR8]

  - id: BR8.1
    statement: "Recovery restores all authoritative U8 records needed to prove current state before exposure."
    category: constraint
    applies_to: [PlanningPolicy, ProductPlanningOverride, PreferredSupplierTermReference, ReviewJob, ManualReviewAllowance, ReplenishmentScenario, ReplenishmentRecommendation, ReviewEvidenceSnapshot, PurchaseProposal, PurchaseOrder, Receipt, BusinessAuditRecord, InboxMessage, OutboxMessage]
    trigger: "Planning and Purchasing are restored into a clean or repaired environment."
    logic: "IF policies, preferences, jobs, allowance charges, immutable evidence, scenarios, recommendations, drafts, orders, receipts, versions, audit, inbox, or outbox history are missing or inconsistent THEN the service remains unavailable for affected reads and mutations."
    violation_behavior: "Do not declare U8 recovered or expose an unproven current state."
    source: [FR20, AC9.6.1, AC9.9.1]

  - id: BR8.2
    statement: "Restored U8 state must reconcile ownership, versions, quantities, transitions, and references."
    category: validation
    applies_to: [RecoveryReconciliation]
    trigger: "Restored records are checked before service exposure."
    logic: "IF tenant ownership, placement generation, record counts, relationship integrity, aggregate versions, allowance counts, recommendation evidence, purchase transitions, receipt sums, inventory movement links, and inbox/outbox identities reconcile THEN recovery may proceed."
    violation_behavior: "Keep affected capabilities unavailable and report exact mismatches."
    source: [FR20, NFR3, AC9.6.1, AC9.9.1]

  - id: BR8.3
    statement: "Recovery never infers success from nonterminal or uncertain pre-recovery work."
    category: policy
    applies_to: [ReviewJob, PurchaseOrder, Receipt, InboxMessage, OutboxMessage]
    trigger: "Recovery encounters active, queued, publishing, or uncertain operation state."
    logic: "IF authoritative completion evidence is absent THEN mark or retain the operation as interrupted or uncertain and reconcile or retry it under the same identity, pinned inputs, authority, and idempotency rules."
    violation_behavior: "Do not manufacture a successful review, transition, receipt, stock movement, or delivery acknowledgement."
    source: [FR20, NFR7, AC6.5.6, AC9.6.3]

  - id: BR8.4
    statement: "Corrupt, incomplete, foreign-tenant, or incompatible restored evidence fails closed."
    category: validation
    applies_to: [RecoveryReconciliation]
    trigger: "Backup integrity and restored compatibility are evaluated."
    logic: "IF required records, checksums, tenant ownership, source versions, schemas, or relationships cannot be proven THEN reject the restored state."
    violation_behavior: "Keep U8 unavailable for the affected scope and do not substitute another retailer or source."
    source: [FR20, NFR3, AC9.9.3]

  - id: BR8.5
    statement: "Replay and rollback preserve committed business identities and effects."
    category: constraint
    applies_to: [ReviewJob, PurchaseProposal, PurchaseOrder, Receipt, InboxMessage, OutboxMessage]
    trigger: "Recovery replay, worker retry, or application rollback is exercised."
    logic: "IF an operation or message identity already committed THEN return or project its recorded effect; ELSE revalidate it under current placement and authority before any new effect."
    violation_behavior: "Prevent duplicate allowance charges, drafts, transitions, receipts, stock movements, audits, or outbox effects."
    source: [FR20, NFR7, AC8.5.2, AC9.6.3]

  - id: BR8.6
    statement: "Tenant placement cutover invalidates stale U8 work and cache routing."
    category: authorization
    applies_to: [ReviewJob, ReviewEvidenceSnapshot, PurchaseProposal, PurchaseOrder, Receipt, InboxMessage, ReviewReadCache, PurchaseReadCache]
    trigger: "A retailer's placement generation changes during extraction or recovery."
    logic: "IF a job, command, message, evidence snapshot, or cache entry carries an older generation THEN reject or reconcile it before use; new work routes only through the current authoritative placement."
    violation_behavior: "Commit no stale-generation effect and disclose no data from the wrong placement."
    source: [FR20, NFR3]

  - id: BR8.7
    statement: "Expired audit data does not reappear through restore, rollback, or replay."
    category: policy
    applies_to: [BusinessAuditRecord, OutboxMessage, RecoveryReconciliation]
    trigger: "Retention reconciliation runs before restored data is exposed or replayed."
    logic: "IF a record is expired under the approved retention policy THEN exclude it consistently from live access and replay eligibility while preserving required non-expired business state."
    violation_behavior: "Fail reconciliation when expired audit would be resurrected."
    source: [NFR9, AC9.1.3, AC9.9.2]

  - id: BR8.8
    statement: "Recovery and projection rebuilds use retained authoritative records and report actual limitations."
    category: policy
    applies_to: [BusinessAuditRecord, OutboxMessage, RecoveryReconciliation]
    trigger: "Audit projection rebuild, clean-environment restore, or recovery exercise completes."
    logic: "IF retained U8 events are replayed THEN preserve original tenant, actor, source versions, correlation, identity, deletion or expiry meaning, and outcome; success may be claimed only with reconciled counts and measured time, loss, mismatches, and limitations."
    violation_behavior: "Report failed or limited recovery and keep projections non-authoritative."
    source: [FR17, FR20, NFR15, AC9.6.2, AC9.6.3, AC10.1.3]
```

## Rules summary

| Group | Rules | Planning and Purchasing responsibility |
| --- | --- | --- |
| Authority and ownership | BR1.1-BR1.7 | Revalidate current tenant, actor, role, resource, placement, version, idempotency, and machine authority while keeping advice separate from purchase authority. |
| Supplier policy and replenishment arithmetic | BR2.1-BR2.12 | Resolve preferred accepted terms and buffer policy, enforce the complete protection window, count only eligible dated inbound, and calculate MOQ/pack quantities deterministically. |
| Review scheduling, allowance, and outcomes | BR3.1-BR3.15 | Run one 08:00 local-date schedule with deterministic DST behavior, serialize all reviews, enforce the shared manual allowance and retries, pin inputs, and expose complete, partial, and failed outcomes. |
| Immutable evidence, scenarios, and drafts | BR4.1-BR4.8 | Preserve immutable reviews and scenarios, distinguish latest attempt from last success, and build bounded, traceable Drafts with separate suggested and entered quantities. |
| Purchase lifecycle and approval | BR5.1-BR5.11 | Enforce Draft-to-Submitted locking, Manager decisions, revalidation, replacement Drafts, cancellation boundaries, permitted receipt states, concurrency, and approval-derived arrival dates. |
| Receipt conservation and inbound | BR6.1-BR6.10 | Authorize receivers, validate every line atomically, conserve approved quantities under concurrency, resolve cancel/receipt races, derive order completion, and reconcile uncertain outcomes. |
| Audit, messaging, cache, and contracts | BR7.1-BR7.9 | Commit audit/outbox atomically, preserve rejected-attempt evidence, deduplicate at-least-once delivery, bound failures, keep caches disposable, and use governed versioned boundaries. |
| Recovery and reconciliation | BR8.1-BR8.8 | Restore authoritative records before exposure, fail closed on mismatch, preserve identities through replay and cutover, prevent expired audit resurrection, and report measured recovery limitations. |

## Sources

- `construction/planning-purchasing/functional-design/functional-design-questions.md` — confirmed deterministic formula, complete protection-window boundary, preferred supplier term, seven-day default and 0-28 policy range, 08:00 scheduling, partial outcomes, immutable review/scenario evidence, Draft grouping and deviations, and approval-derived inbound dates.
- `construction/forecasting/functional-design/functional-design-questions.md` — the referenced Forecasting invalid-time and ambiguous-time policy reused by the confirmed U8 schedule decision.
- `inception/units-generation/unit-of-work.md` and `unit-of-work-story-map.md` — U8 ownership, boundaries, implementation constraints, and the 23 stories in which Planning and Purchasing participates.
- `inception/requirements-analysis/requirements.md` — FR2, FR4-FR11, FR14, FR17-FR20 and NFR3-NFR9, NFR14-NFR15, including the confirmed purchasing transition and receipt matrix.
- `inception/user-stories/stories.md` — assigned AC5.1.1-AC5.5.5, AC6.1.1-AC6.6.4, AC7.6.1-AC7.6.3, AC7.8.1-AC7.10.4, AC8.1.1-AC8.3.3, AC8.5.1-AC8.5.3, AC9.1.1-AC9.1.3, AC9.6.1-AC9.6.3, AC9.9.1-AC9.9.3, and AC10.1.1-AC10.1.4.
- `inception/domain-design/components.md` and `decisions.md` — Replenishment/Purchasing separation, entity ownership, cross-component authority, and atomic audit ownership.
- `inception/contract-design/contract-summary.md` — C08-C10, C14-C15, C17-C18, common authority, error, idempotency, messaging, compatibility, cache, and recovery boundaries.

## Assumptions & Open Questions

- Forecasting remains authoritative for whether a forecast is current and compatible. U8's confirmed 08:00 schedule does not invent a second freshness rule or permit a stale series; any unavailable required forecast produces explicit blocked-product or review-level failure behavior.
- Expected arrival is a retailer-local calendar date derived at approval, not an editable delivery instant. V1 simulates inbound and receipt; it sends no real supplier order and creates no automatic receipt.
- Exact decimal precision, request and response limits, processing deadlines, lease and heartbeat durations, retry counts, backoff, queue capacity, dead-letter retention, replay batch limits, and cache lifetimes remain bounded NFR or implementation parameters.
- Recovery objectives, backup frequency and expiry, persistent-storage limits, and controlled cleanup timing remain later NFR decisions. Recovery must fail closed and report measured results regardless of the selected values.
- Retail Data owns on-hand stock and stock movements; Supplier Knowledge owns accepted supplier-term revisions; Forecasting owns series and usability; Audit Evidence owns rebuildable search projections; the Web BFF and Web Application own presentation. None of those boundaries transfers U8's review allowance or purchase-transition authority.
- The initial release has one store per retailer, but Draft and receipt rules retain explicit store identity so later additional stores do not require weakening tenant or conservation rules.
