**Collaborator:** aidlc-design-agent

## Contribution

Round 1, independent design review of the whole 58-story draft, personas, epic/feature map and confirmed story questions against requirements.md and the active rules. No other contributions were read. The fixes below elaborate existing outcomes; they do not select open numerical policies, add authorization roles or record owner approval. Preserve existing US/AC IDs when revising; assign new AC IDs only for additional cases.

### D1 — Make acceptance describe observable journeys before approval

The draft uses declarative criteria throughout, despite the inception rule and confirmed story plan requiring Given/When/Then. Several criteria describe storage or enforcement without specifying what the actor can observe. Retain those technical invariants, but rewrite criteria with a starting state, action and observable result. Replace the repeated generic INVEST assertion with story-specific fixture/dependency notes where needed; a seeded Submitted order can make approval independently testable without replaying setup and import.

For example, revise AC6.3.1: **Given** a current Submitted proposal and an authorized Manager for its retailer, **when** the Manager explicitly approves the displayed commercial lines, **then** the backend revalidates permission, offer, price, quantity and inventory versions, commits Approved with audit, and the view displays the committed decision and locked lines. Failure must have its own scenario rather than being inferred from the success case. Apply the same structure across supporting Operator/Reviewer stories without inventing browser consoles for them.

### D2 — Close the stale-purchase correction and human handoff paths

Targets: US6.1–US6.4, AC3.3.3; FR6/7, NFR14. The state invariants are strong, but “require correction” and “actionable conflict” do not define a usable recovery. Add these cases:

- **Given** an authorized Manager opens a Submitted proposal whose inputs have changed, **when** approval fails revalidation, **then** show that approval did not commit, identify the stale input category and current order status, and provide a route to inspect current evidence. Do not silently refresh and approve changed commercial lines.
- **Given** locked Submitted/Approved lines need correction, **when** a Planner creates a replacement, **then** show a new linked Draft alongside the source order's actual status. The source remains unchanged; replacement needs fresh submission and approval. Present only the existing role/state-permitted rejection or pre-receipt cancellation actions, preventing the impression that creating a replacement retired an active order.
- **Given** a draft is submitted, **when** the Planner or authorized Manager opens it, **then** show Submitted, locked quantities/terms and the applicable next human action. After a decision, display Approved/Rejected/Cancelled consistently to both roles. No notification subsystem or mandatory second person is implied.

### D3 — Make receipt quantities and uncertain outcomes understandable

Targets: US6.5/6.6; FR8, NFR14. Backend conservation is covered; the user-facing receipt form and failed-submit outcome are not concrete.

- **Given** 10 approved and 6 already received, **when** a permitted user records the next receipt, **then** show approved 10, received 6 and outstanding 4 beside that line; entering 5 identifies the offending line and remaining limit, and no part of that receipt commits. Refresh/reconcile after a concurrent receipt before another attempt.
- **Given** a valid receipt commits, **when** its result is shown, **then** show the receipt identity, updated line balances and order state, with access to the resulting stock movement. A second outstanding line keeps the order PartiallyReceived.
- **Given** submission times out with an unknown result, **when** the user checks or retries, **then** reconcile/replay the original operation and show its actual outcome; do not report “not received” or start a new receipt merely because the response was lost. Changed payload under the same key remains a conflict.

Keep the existing prohibition on returns, reopen and post-receipt cancellation. An interface-level Back action must not be labeled as business cancellation.

### D4 — Distinguish new review, retry and stale results

Targets: US5.4/5.5, US7.9; FR9–FR9.5, NFR14. Add a concrete exhausted-quota fixture: **Given** three accepted reviews and a failed retryable job, **when** its status opens, **then** a new review is unavailable with retailer-local reset time, while retrying the same job remains a distinct action with no additional charge, including after midnight. An active/queued job opens its existing status instead of suggesting a second request.

**Given** the latest attempt failed but an older successful result exists, **when** results display, **then** distinguish last success time/input versions from latest attempt status; never relabel the older suggestions as fresh. If no valid forecast exists, show explicit unavailability and the reason, not an empty shortage list implying no replenishment is needed. Keep exact forecast thresholds under OQ2. Use the same job identity, allowance and outcome in chat and the review view.

### D5 — Expose retailer/session boundaries in browser behavior

Targets: US1.1/1.3/1.4 and shared browser obligations; FR1/2, NFR3/5/14. Membership enforcement does not by itself specify the selected-retailer experience.

- **Given** several memberships, **when** the user selects a retailer, **then** keep its identity visible while viewing stock, proposals and assistant evidence. On switching, old retailer results or late responses must not appear under the new retailer heading or supply its mutation context.
- **Given** no current memberships, **when** sign-in succeeds, **then** show an explicit no-access state and operator provisioning guidance, without inventing public signup or self-assigned membership.
- **Given** session expiry or membership revocation during a mutation, **when** authorization fails, **then** show sign-in/access recovery as appropriate and no success claim. Reauthentication does not automatically resubmit the mutation; an uncertain prior result must be checked within current authority.

### D6 — Make ingestion evidence and rejection actionable

Targets: US2.2, US3.1–US3.3; FR3/10/10.1/11, NFR14. Add **Given** a malformed CSV, currency mismatch, unsupported scan or partially extracted PDF, **when** processing finishes, **then** show the affected row/field or page where available, reason, accepted/rejected/pending outcome and source version; identify what became authoritative and what did not. Provide correction/re-upload guidance appropriate to the supported format. Do not invent OCR, a manual acceptance role or a partial-import transaction policy; make the chosen schema/processing contract explicit under OQ4.

For AC3.2.1/AC3.3.1, require the Planner to open the source version/page from displayed terms and distinguish raw extraction from accepted normalized data. Storage provenance alone does not fulfill “inspect extracted terms and their source.”

### D7 — Complete assistant handoff and cancellation feedback

Targets: US7.4/7.6–US7.11; FR14, NFR14 and confirmed FE07.08/09. Extend the existing strong boundaries with observable outcomes:

- **Given** a draft tool succeeds, **when** the assistant answers, **then** identify it as Draft and provide access to that exact authorized draft for human review/submission. A prose claim or opaque identifier alone is insufficient handoff.
- **Given** cited evidence, **when** the Planner opens it, **then** show the authorized data/source version supporting the claim; unavailable/deleted evidence is explicitly unavailable rather than substituted with unrelated current content.
- **Given** cancellation after a draft or review already committed, **when** work stops, **then** identify the completed draft/job, distinguish remaining incomplete or unresolved actions, and offer the existing result/reconciliation path. Preserve AC7.11.1's rule that stopping execution does not undo a purchase draft or consumed review slot.

### D8 — Make the shared UI obligation testable without claiming certification

Targets: shared acceptance obligations, US2.3/5.5/6.2–6.6/7.4/10.1; NFR14. Add a shared keyboard walkthrough covering retailer selection, import error inspection, shortage/scenario detail, draft submission, manager decision and receipt. Require visible focus, meaningful control labels, text status/error identification and logical focus recovery after dialogs/errors. Dynamic review/assistant updates must be available to assistive technology without stealing focus; status must not depend on color alone. Carry WCAG 2.1 AA design checks into mockups, including contrast and zoom/reflow, without claiming accessibility certification or adding a mobile application release.

Add this path to AC10.1.2 using provisioned demo memberships/roles, with visible retailer, currency and time-zone context and the expected status at each handoff. The Reviewer remains an evaluation persona, not a new authorization role.

### Round 2 disposition

Reviewed the revised 63-story/215-AC draft and the developer and quality contributors' Positions, as authorized for round 2. Rechecked current stories.md after the same-round final trigger edit: all 215 criteria contain Given/When/Then markers and no “scenario is exercised” wording remains; login, read, submit, receive and retry triggers are explicit. This structural check is not a claim that implementation tests exist or pass. The round 1 findings above remain the historical review; the dispositions and Positions below supersede their approval recommendations.

| Prior finding | Disposition | Revised evidence and conclusion |
| --- | --- | --- |
| D1: Observable acceptance and independent fixtures | Resolved for this story baseline | GWT contexts and explicit action triggers now occur throughout; isolated capability fixtures replace prior-test-execution dependencies. Concrete action/result scenarios cover the affected workflows. Shared consumer obligations and AC10.2.4 prevent representative foundation tests from standing in for final integration evidence. The final same-round edit resolves the former generic WHEN wording as well. |
| D2: Stale purchase and human handoff | Resolved | AC6.1.4 preserves and exposes the source order alongside the replacement Draft; AC6.3.4 supplies stale-category/current-status evidence and forbids silent refreshed approval. AC6.2.1/3 and AC6.3.5 retain locked lines, explicit human decisions and role/state fixtures. The keyboard journey includes submission and manager decision. |
| D3: Receipt balance and uncertain outcome | Resolved | AC6.5.4-6 specify whole-receipt rejection, visible 10/6/4 balances, concurrency reconciliation and lost-response recovery; AC6.6.4 exposes receipt identity, balances, order state and stock movement. |
| D4: Review retry, quota and stale results | Resolved | AC5.4.4-7 cover races, original-job retry across dates and unusable forecasts. AC5.5.4/5 distinguish exhausted new requests from retry and latest failure from last success; chat shares the same outcome. OQ2 remains explicit. |
| D5: Retailer/session context | Resolved | AC1.4.4/5 cover switching, late responses and no membership; AC1.1.4 covers authority failure without success claims or automatic mutation resubmission. |
| D6: Ingestion diagnostics and source inspection | Partially resolved; narrow dissent retained | AC3.1.4 gives supplier CSV row/field reasons, authority outcomes and correction guidance; AC3.2.4 exposes exact source/page and extraction limitations. US2.2 still says malformed/duplicate imports have “explicit outcomes” without stating what inventory-import error the Planner can locate or correct. The shared keyboard walkthrough does not define those diagnostics. |
| D7: Assistant evidence, draft handoff and cancellation | Resolved | AC7.4.4 links exact authorized evidence or unavailable status; AC7.10.4 links the actual Draft; AC7.11.4 distinguishes committed work from unfinished/uncertain work and provides reconciliation. |
| D8: Concrete keyboard/status acceptance | Resolved at story scope | AC10.1.4 supplies the end-to-end keyboard path, visible focus, labels, text errors/status and focus recovery; the shared obligation explicitly applies to browser consumers. Detailed accessibility design checks remain mockup work, with no additional certification or mobile-release requirement. |

The developer/quality concerns about foundation boundaries, missing sales import and broad recovery/evaluation outcomes have visible integration responses in US2.5, US4.7, US7.12, US9.9/9.10 and the final consumer evidence check. This targeted design confirmation does not replace their final sizing/testability judgments. Removing the unsourced drift obligation and retaining OQ deadlines preserves the selected scope.

**Remaining integrable fix (D6 only):** append an inventory-specific criterion to US2.2, or explicitly apply an equivalent shared ingestion criterion to it: **Given** malformed or wrong-currency inventory input, **when** validation reports its result, **then** the Planner sees the source version, available row/field reason and accepted/rejected/pending outcome, can identify what became authoritative, and receives correction/re-upload guidance. The inventory import contract defines schema and batch policy before implementation; this criterion selects neither partial acceptance nor a new policy. This is the unintegrated inventory portion of the original D6, not a new request for scope. Keep supplier limits under OQ4 without silently treating them as inventory limits.

## Positions

- AGREE: D1-D5, D7 and D8 are resolved for story approval by the revised acceptance scenarios and shared consumer obligations. Detailed test elaboration and mockup checks remain downstream work, not claims of completed verification.
- AGREE: The four personas, permitted dual Planner/Manager role, explicit human purchasing authority, complete release scope and OQ deadlines remain appropriate. No additional accessibility certification, drift capability or owner decision is introduced.
- AGREE: D6's supplier diagnostics and source-inspection portions are resolved by AC3.1.4 and AC3.2.4.
- OBJECT: D6 remains open only for US2.2 inventory-import correction. Before story approval, require source-version and available row/field diagnostics, clear authority outcome and correction/re-upload guidance, using the exact bounded criterion proposed above or an equivalent explicitly applicable shared criterion. Generic “explicit outcomes” and a keyboard error-inspection walkthrough alone do not establish this recovery behavior.
