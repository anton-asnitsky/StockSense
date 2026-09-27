# StockSense refined mockups

Date: 2026-09-27
Status: Reopened draft; consolidated design summary confirmed, formal review and stage approval pending
Fidelity: Mid-to-high fidelity structural specification
Revision: Reconciled to the 2026-09-27 approved User Stories baseline

## Purpose and sources

These mockups translate the approved StockSense requirements, 67 user stories and 250 acceptance criteria into a coherent browser experience. They are implementation-neutral layouts for the React, TypeScript, Vite, Ant Design and Ant Design Charts client. They do not claim implemented or tested behavior.

Sources:

- `../requirements-analysis/requirements.md`
- `../user-stories/stories.md`
- `../user-stories/personas.md`
- `refined-mockups-questions.md`

The classic lifecycle intentionally skipped rough mockups. The expected
`ideation/rough-mockups/wireframes.md` and
`ideation/rough-mockups/user-flow.md` inputs are therefore absent by scope.
This stage derives the refined layout directly from the approved requirements
and stories without inventing their content.

## Experience principles

- Keep the current retailer, role and data freshness visible wherever a business action can occur.
- Lead with exceptions and decisions rather than decorative metrics.
- Preserve list context while evidence opens in a detail drawer.
- Separate explanation from authority: assistant suggestions never look like completed business actions.
- Show loading, empty, error, partial, stale and success states explicitly.
- Pair charts with values, summaries and accessible tables.
- Optimize authoring for desktop and tablet; retain mobile reading, evidence review and safe approvals.
- Meet WCAG 2.2 Level AA in the design and verification plan.

## Information architecture

### Primary shell

The desktop and tablet shell uses a role-aware left sidebar and a top context bar.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ StockSense  Retailer: Northstar Home ▾  Data: Current  Role: Planner  ◉ User │
├───────────────┬──────────────────────────────────────────────────────────────┤
│ Overview      │ Page title                         [Assistant] [Page action] │
│ Inventory     │ Breadcrumb / scope / freshness / status                     │
│ Forecasts     │                                                              │
│ Replenishment │ Main workspace                                               │
│ Purchasing    │                                                              │
│ Suppliers     │                                              ┌─────────────┐ │
│ Assistant     │                                              │ Assistant   │ │
│ Evidence      │                                              │ panel       │ │
│ Operations*   │                                              └─────────────┘ │
└───────────────┴──────────────────────────────────────────────────────────────┘
* Role-filtered; unavailable areas are omitted rather than shown as usable.
```

The top bar is the authority boundary. Changing retailer clears incompatible filters, cancels or ignores late responses, closes unsafe drawers, and announces the new context. The active retailer appears in page headings and confirmation dialogs, not only in the selector.

### Navigation by role

| Area | Planner | Manager | Operator | Reviewer |
| --- | --- | --- | --- | --- |
| Overview | View | View | Operational variant | Demo variant |
| Inventory | View/import where authorized | View | Diagnostic access only | Seeded demo view |
| Forecasts | View/run where authorized | View | Model-health variant | Evaluation evidence |
| Replenishment | View/request/create draft | View | Job-health variant | Seeded demo view |
| Purchasing | Draft/submit/receive if authorized | Approve/reject/cancel/receive if authorized | Diagnostic access only | Simulated journey |
| Suppliers | View/manage where authorized | View | Ingestion health | Seeded evidence |
| Assistant | Use governed tools | Use governed tools | Operational assistance | Demonstration mode |
| Evidence | View own-retailer evidence | View own-retailer evidence | Cross-system operations evidence within authority | Portfolio evidence |
| Operations | Hidden | Hidden unless separately authorized | Visible | Read-only curated view |

### Responsive frames

| Width | Shell behavior | Data behavior | Assistant behavior |
| --- | --- | --- | --- |
| 1440px and above | Expanded sidebar; content capped for readable lines | Table plus 420px drawer can coexist | 380px panel or full workspace |
| 1024–1439px | Collapsible sidebar | Table plus overlay drawer | 360px overlay panel |
| 768–1023px | Icon sidebar or temporary navigation drawer | Horizontal table scroll; full-height detail drawer | Full-height overlay panel |
| 360–767px | Compact header and navigation drawer | Priority cards replace dense tables for read/review tasks | Full-screen assistant route; panel becomes a route |

Mobile does not promise dense import mapping, bulk editing or complex forecast authoring. It does preserve status, evidence, decision reason entry, confirmation and safe approval/rejection when the governing story permits the action.

## Screen catalog

| ID | Screen or reusable pattern | Primary users | Main stories |
| --- | --- | --- | --- |
| UI-00 | Sign-in, callback, no-access and session recovery | All | US1.1–US1.3, US1.5 |
| UI-01 | Exception-focused overview | Planner, Manager, Operator, Reviewer | US1.4, US5.1, US5.3, US6.2, US8.6, US9.2–US9.4 |
| UI-02 | Import center and validation results | Planner, Reviewer | US2.1, US2.2, US2.5 |
| UI-03 | Inventory table, movement history and evidence drawer | Planner, Manager | US2.3, US2.4 |
| UI-04 | Forecast and model-evaluation workspace | Planner, Reviewer, Operator | US4.1–US4.7 |
| UI-05 | Replenishment workspace and review-request control | Planner, Manager | US5.1–US5.5 |
| UI-06 | Purchasing draft workspace | Planner | US6.1–US6.3 |
| UI-07 | Manager purchase review queue | Manager | US6.2–US6.5 |
| UI-08 | Purchase order and receipt workspace | Planner, Manager | US6.4–US6.6 |
| UI-09 | Supplier and document knowledge workspace | Planner, Manager, Operator | US3.1–US3.4, US7.12 |
| UI-10 | Contextual assistant panel | Planner, Manager, Operator | US7.1–US7.4, US7.6–US7.11 |
| UI-11 | Full assistant workspace | Planner, Manager, Operator, Reviewer | US7.1–US7.12 |
| UI-12 | Model operations, work coordination and promotion evidence | Operator, Reviewer | US4.2–US4.6, US4.8, US8.7 |
| UI-13 | Local platform, integration and recovery operations | Operator, Reviewer | US8.1–US8.8, US9.5–US9.11 |
| UI-14 | Audit, logs, metrics and traces | Operator, Reviewer | US9.1–US9.8 |
| UI-15 | Reviewer journey and portfolio evidence | Reviewer | US10.1–US10.3 |
| UI-16 | Supported-browser profile evidence | Reviewer, Operator | US10.3 |

## UI-00 Sign-in and access recovery

```text
┌─────────────────────────────────────────────┐
│ StockSense                                  │
│ Inventory decisions with evidence           │
│                                             │
│ Email                                       │
│ [________________________________________]  │
│ Password                                    │
│ [________________________________________]  │
│ [ Sign in ]                                 │
│ ─────────────── or ───────────────          │
│ [ Continue with Google ]                    │
│                                             │
│ Local demo account help                     │
└─────────────────────────────────────────────┘
```

States:

- Loading: form remains visible but disabled while a submission is pending; a status message names the operation.
- Invalid credentials: inline summary and field-associated guidance; no account-existence disclosure.
- Callback/state/PKCE failure: safe recovery page with “Return to sign in”; no automatic retry.
- Signed out: explicit confirmation and sign-in action.
- No retailer membership: authenticated identity is visible with provisioning guidance and sign-out; no self-assignment control.
- Expired/revoked session: interruptive banner or route preserving non-sensitive navigation context; uncertain mutations are never automatically replayed.

## UI-01 Exception-focused overview

```text
Overview — Northstar Home                         Updated 09:42 · Current
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ 12 shortages     │ 3 reviews due    │ 5 open orders    │ Model: Healthy   │
│ 4 critical       │ 1 quota left     │ 2 partial        │ v2026.09.10      │
│ [Review]         │ [Open queue]     │ [Track]          │ [Evidence]       │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘

Needs attention
Severity  Item               Why now                    Owner       Action
Critical  SKU-104 Lamp       Stockout in 2 days         Planner     Review
Warning   PO-882             Partial receipt overdue    Manager     Inspect
Unavailable Forecast run 44  No usable artifact         Operator    Diagnose

Inventory trajectory                         Review activity
[accessible line chart + summary]             [status timeline + links]
```

Rules:

- Cards are links to filtered workspaces, not dead-end metrics.
- Severity uses icon, label and position as well as color.
- Data age and model version remain visible.
- Reviewer mode includes a “Continue demo” card and evidence completeness status.
- Empty state says which process produces each category; stale/unavailable states do not collapse into zero.

## UI-02 Import center

```text
Imports                                  [Download schema] [New import]
Type: [Inventory ▾]  Source version: [________]  File: [Choose file]

Step 1 Upload  →  Step 2 Validate  →  Step 3 Review  →  Step 4 Commit

Validation result: 94 accepted · 6 rejected · 0 pending
Row  Field       Value     Reason                     Correction
18   currency    EUR       Retailer currency is USD   Use USD or cancel
42   product_id  —         Required value missing     Add a product ID

[Download diagnostics] [Replace file]                 [Commit accepted data]*
* Available only when the contract-defined batch policy permits it.
```

The review step names the source version, checksum, authoritative outcome, accepted/rejected/pending counts and batch policy. Duplicate replay returns the prior outcome instead of implying a second stock change. Inventory and sales-history imports share the shell but use different schema help.

## UI-03 Inventory and movement history

```text
Inventory — Northstar Home              Data current · 214 products
[Search products] [Status ▾] [Supplier ▾] [Reset]             [Import]

SKU      Product              On hand  Available  Demand  Status      Updated
104      Arc floor lamp       6        4          10      Critical    09:41
207      Linen basket         32       30         3       Healthy     09:39
...
Showing 1–25 of 214                                    ‹ 1 2 3 ... 9 ›
```

Selecting a row opens the evidence drawer:

```text
┌─ Arc floor lamp · SKU-104 ────────────────────────────┐
│ Critical · Forecast v2026.09.10 · inventory v184     │
│ On hand 6 | Reserved 2 | Available 4                 │
│                                                      │
│ [Trajectory] [Movements] [Forecast evidence]         │
│ 09:41 Sale              -2       balance 6           │
│ 08:13 Adjustment        +1       balance 8           │
│                                                      │
│ [Open replenishment]                    [Close]       │
└──────────────────────────────────────────────────────┘
```

Late responses from another retailer are discarded. A stale badge gives the observed timestamp and a refresh action. Redis degradation is presented as “Live source; cache unavailable” when authoritative reads remain available, never as stale success.

## UI-04 Forecast and model-evaluation workspace

```text
Forecasts — SKU-104 Arc floor lamp
Horizon [28 days ▾]  As of [2026-09-10]  Model [candidate-v7 ▾]

Demand forecast and interval
[line/band chart]
Text summary: Expected demand 38 units; interval 28–51; baseline 42.
[Show accessible data table]

Evidence
Model version  candidate-v7       Training data through 2026-08-31
Dataset        retail-sim-v3      Forecast created 2026-09-10 07:30 UTC
Metrics        MAE 2.4 · WAPE 14% Baseline delta -8%
Status         Valid              Fresh through 2026-09-11 07:30 UTC

[Compare with baseline] [Open evaluation report] [Run forecast]*
* Role and current-input checks apply.
```

Unavailable forecasts show the exact missing or invalid prerequisite and block downstream claims. Comparison uses identical windows and clearly labels rejected candidates. Promotion is performed in UI-12, not from this planner screen.

## UI-05 Replenishment workspace

```text
Replenishment reviews          Manual allowance: 1 of 3 accepted requests remaining
                              Reset: 2026-09-11 00:00 [retailer time zone]
[Search] [Severity ▾] [Review status ▾]              [Request new review]

SKU      Shortage  Suggested  Pack  Supplier  Evidence status     Action
104      14        18         6     BrightCo  Current             Inspect
318      —         —          —     —         Forecast unavailable Fix input

Review run  rr-20260910-02 · completed 09:45 · inventory v184 · forecast v7
```

The request control discloses the three-request daily quota, remaining accepted requests, the next reset date/time with the retailer's configured IANA time-zone ID, in-progress job and outcome. A confirmation dialog explains that one accepted request consumes one daily slot. Duplicate clicks and same-job retries show the existing job. When the quota is exhausted, the action remains discoverable but disabled with the reset time and scheduled-run alternative.

The detail drawer shows the calculation inputs, product buffer override, retailer default fallback, pack rounding, minimum order, due date and supplier choice. “Create draft proposal” opens UI-06 with the evidence version pinned.

`Compare buffer scenarios` opens a dedicated comparison surface from the selected product or review run:

```text
Compare buffer scenarios — SKU-104                 Inputs current · v184/v7
Common inputs: inventory v184 · forecast v7 · terms BrightCo v3

Setting                 Baseline                  Comparison
Retailer default        2 days                    2 days
Product override        Inherit default           [0 days ▾]
Resolved buffer         2 days                    0 days

Result                  Baseline                  Comparison       Difference
Suggested quantity      18 units                  12 units          -6 units
Rounded order quantity  18 units                  12 units          -6 units
Expected shortage       0 units                   2 units           +2 units

[Reset comparison] [Recalculate]                  [Use for new Draft]
```

The comparison distinguishes an absent override (`Inherit default`) from an explicit zero override. Both columns use the same versioned inventory, forecast, terms and simulation inputs; changed settings and deterministic quantity differences are presented in text and a semantic table. Recalculation never mutates an existing Draft or approved order. If a common input changes, the result becomes `Stale`, the action is disabled, focus moves to an explanatory summary after submission, and the user may refresh and recalculate. On mobile, baseline and comparison become labeled stacked sections with the difference summary first; on tablet/desktop they remain side by side. All inputs, recalculation and result inspection are keyboard operable.

## UI-06 Purchasing draft workspace

```text
Draft proposal DP-144 — Northstar Home         Unsaved changes
Supplier BrightCo · Evidence rr-20260910-02     [Open evidence]

Line  Product          Suggested  Order qty  Pack  Unit cost  Validation
1     Arc floor lamp   18         [18     ]  6     $42.00     Valid
2     Linen basket     11         [12     ]  4     $18.00     Rounded

Subtotal $972.00 · 2 lines
[Discard draft]                              [Save draft] [Review submission]
```

Only drafts are editable. Submission opens a non-nested review dialog with retailer, supplier, line totals, evidence versions and consequences. A successful submission locks lines and renders a durable `Submitted` receipt containing the proposal identifier, submitter, submission time, locked-line summary and the next actor (`Manager`). The same item appears in the Manager's pending-decision queue.

If evidence or the proposal version changes, a keyboard-reachable error summary receives focus, identifies each changed field, preserves the user's entered values, links to the current evidence and offers a linked replacement Draft. The source Draft remains unchanged and is never silently replaced. A lost response remains `Outcome unknown`; the primary action is `Check status`, and retry is offered only after reconciliation confirms that no effect occurred.

## UI-07 Manager purchase review queue

```text
Purchase reviews — Northstar Home
┌──────────────────────────┬──────────────────────────────────────────────┐
│ 3 awaiting review        │ DP-144 · BrightCo · Submitted 09:51         │
│                          │ 2 lines · $972.00 · Evidence current         │
│ DP-144  $972  Current    │                                              │
│ DP-139  $410  Stale      │ Line  Qty  Why                               │
│ DP-137  $280  Current    │ Lamp  18   Shortage 14, pack 6, buffer 2     │
│                          │ Basket12   Suggested 11, pack 4              │
│                          │                                              │
│                          │ [Forecast] [Replenishment] [Audit context]   │
│                          │                                              │
│                          │ Decision reason [________________________]   │
│                          │ [Reject]                         [Approve]    │
└──────────────────────────┴──────────────────────────────────────────────┘
```

Approve and reject remain explicit decisions. When one person holds both Planner and Manager roles, the shell and confirmation show the role currently being exercised. Decision receipts show actor, acting role, timestamp and reason. Stale evidence uses the same keyboard-safe recovery pattern as submission: focus the error summary, identify changes, preserve entered reason/context and link current evidence. A Manager-only user can inspect and hand the outcome back for Planner correction but sees no `Create linked replacement Draft` action; this handback does not change the Submitted proposal's business state. That action is available only to an authorized Planner or a dual-role user explicitly acting as Planner, and it never mutates the source. The UI never presents simultaneous success for racing decisions. Cancellation is available only in submitted or approved states before any receipt and uses a separate confirmation with state/version details.

## UI-08 Purchase order and receipts

```text
PO-882 · Approved · BrightCo                    [Cancel order]* [Record receipt]
Ordered 18 · Received 6 · Remaining 12          * Only before any receipt

Line             Approved  Received  This receipt  Remaining after
Arc floor lamp   18        6         [6          ] 6

Reference [DEL-2026-771]   Received at [date/time]
[Cancel]                                                [Review receipt]
```

The review step shows cumulative totals and rejects over-receipt before submission. Success displays the inventory movement and audit evidence links. Partial receipt changes the order to `Partially received`; full cumulative receipt changes it to `Received`. A cancellation/receipt race resolves to one authoritative outcome and the losing UI reloads the current state.

## UI-09 Supplier and document knowledge

```text
Suppliers — BrightCo
[Profile] [Commercial terms] [Documents] [Retrieval evidence]

Documents                                             [Upload document]
Name                    Version  Parsed  Indexed  Updated       Action
2026 price list.pdf     v3       Ready   Ready    2026-09-08    Inspect
delivery-policy.pdf     v1       Partial —        2026-09-07    Review

Document drawer — delivery-policy.pdf (text PDF)
Source version v1 · checksum …71ac · extraction incomplete
Extraction warning: table on page 4 requires review
[Open extracted text] [Resolve omissions] [Delete version]
```

Upload is a staged flow: select, validate type/limits, extract, review quality, index and expose. This partial text-PDF example has no accepted terms or retrieval citations until validation; unsupported formats such as DOCX are rejected without parsed content. Unsupported or partial extraction remains visible. Deletion distinguishes source deletion from projection cleanup and identifies any rebuild required.

An operator-visible cache panel shows the authoritative source version, active Qdrant collection/alias, embedding profile, projection generation, last reconciliation and route status. `Cache unavailable` is a degraded state that falls back to authoritative source and route checks without serving stale cached evidence. `Active route missing`, `Generation stale` and `Reconciliation required` block retrieval until authority is proved; no stale projection is presented as current. Authorized reconciliation and rollback actions review the source/target generations before execution and return stable evidence links.

An index-build detail distinguishes a queued request from a build holding the current authenticated `embedding-index` lease. It shows candidate model/configuration, retailer, source and Qdrant generation, lease identity/fencing status, build-complete validation and the independently authorized PostgreSQL route version. A lost or revoked lease leaves a partial generation inactive; an Operator can inspect the reconcile/rebuild outcome but cannot activate it as current. The UI never treats the shared lease as route-activation authority.

## UI-10 Contextual assistant panel

```text
┌─ StockSense Assistant ────────────────────────────────┐
│ Context: SKU-104 · Northstar Home · inventory v184   │
│                                                      │
│ You: Why is this item critical?                      │
│ Assistant: Available stock is 4 and expected demand  │
│ is 10 before the next delivery window. [1] [2]       │
│                                                      │
│ Proposed next step                                   │
│ Open replenishment review for SKU-104                │
│ [Inspect evidence] [Open workspace]                  │
│                                                      │
│ [Ask about this screen…____________________] [Send]  │
└──────────────────────────────────────────────────────┘
```

The panel labels context, citations, tool activity, degraded retrieval and model/provider. It may navigate or prepare a governed action. Any mutation opens a separate confirmation surface owned by the relevant domain workflow; the assistant message never impersonates approval or completion.

For a proposed purchase Draft, confirmation shows the retailer, supplier, every product and quantity, prices, currency and source versions, followed by the exact effect `Create Draft only`. `Confirm` and `Cancel` are keyboard reachable, opening focus moves to the confirmation heading, and stale authority invalidates the preview. No mutation occurs before confirmation.

## UI-11 Full assistant workspace

The full workspace uses three regions: conversation history, active thread, and evidence/tool activity. On tablet the evidence region becomes a drawer; on mobile it becomes a separate route. Users can inspect the source, version, retailer and retrieval timestamp for every citation. Model or retrieval unavailability is explicit, and retry does not duplicate tool effects.

Interrupted tool work displays one of `Completed`, `Incomplete` or `Outcome unknown`. `Check status` is the primary action for an unknown outcome. A retry action appears only after reconciliation reports no prior effect; duplicate or expired operation identities show the authoritative typed outcome instead of replaying silently.

## UI-12 Model operations

The operator workspace lists training/evaluation runs, artifacts, baseline comparisons and promotion status. A candidate detail page shows data cutoff, parameters, metrics, resource use, reproducibility identifiers and rejected alternatives. Promotion requires an explicit version, authority, confirmation and rollback reference. Charts always have a metric table and textual conclusion.

The shared heavy-work view covers training, evaluation, Forecasting batches and U5 embedding-index builds in one queue. Each row names the safe job/run ID, work type, queue position, deadline, current holder, lease expiry, heartbeat, fencing generation, last transition and next safe action. `Queued`, `Running`, `Deadline reached`, `Authority lost` and `Reconciliation required` are separate text states; a queued or fenced U5 build never looks runnable or eligible to activate an index. After a lost U5 renewal/expiry acknowledgement, the view keeps reassignment pending until U5's authoritative local fence is reconciled; it never announces a new holder or token T+1 merely because a timer elapsed. Model/Forecasting finalization and U5 index validation/route activation have separate capability labels.

A resource-evidence panel keeps two pinned whole-cluster profiles separate: model/evaluation/Forecasting and U5 embedding-index build. Each reports sustained/peak RAM and CPU, Kubernetes/VM overhead, throttling/OOM and pass/fail against the same **16 GB / 3 CPU** planning envelope. The U5 profile additionally records each candidate's artifact size against **1.5 GiB**, evaluation peak RSS against **1.5 GiB**, and the **2 GiB** pod limit. Missing pinned inputs appear as `not-run` / `blocked-prerequisite`; failed measurements remain failed and do not silently relax the machine budget.

## UI-13 Platform and recovery operations

This workspace is a curated operations surface rather than a replacement for Kubernetes, Vault, MLflow or deployment tools. It links to documented commands and evidence for service health, contracts, migrations, secrets integration, backups, restores and local resource benchmarks. Actions that remain CLI-only are marked “Run using documented procedure”; the UI does not pretend to execute them.

The recovery-barrier view identifies the run, phase, checkpoint, UTC start time, PostgreSQL and RabbitMQ participants and fenced scope. Destructive steps require a separate confirmation that names the affected scope. Only authoritative results may end as `Succeeded`, `Failed`, `Aborted` or `Safely resumed`; an interrupted or ambiguous run remains non-terminal and offers status reconciliation before retry.

The recovery objective panel distinguishes fixed FR20.1 barrier phase deadlines and NFR9's seven-day log/ninety-day audit defaults from open OQ5 RPO, RTO, backup-expiry and complete local persistent-disk capacity. Each open item displays confirmation or measurement status, owner/next action and `not-run` / `blocked-prerequisite` until versioned targets and measured drill evidence exist. A timed-out or fenced participant cannot be presented as a successful restore.

## UI-14 Audit and observability

The audit view filters by retailer, actor, action, resource, correlation ID and time. A trace drawer connects request, message and domain mutation evidence. Logs omit secrets and sensitive document contents. Retention and unavailable-backend states are visible. Audit results use pagination and bounded date ranges.

## UI-15 Reviewer journey and portfolio evidence

```text
Reviewer journey                                      Revision 9e89ebe+
1 Setup environment           Ready                   [Open instructions]
2 Sign in locally             Ready                   [Start]
3 Import seeded data          Not started             [Open import]
4 Inspect inventory           Not started             [Open inventory]
5 Compare forecast            Not started             [Open forecast]
6 Review replenishment        Not started             [Open review]
7 Approve simulated purchase  Not started             [Open queue]
8 Record simulated receipt    Not started             [Open order]
9 Inspect evidence            Not started             [Open evidence]

Evidence coverage
Requirements  Stories  Decisions  Contracts  Tests  Resource results
[stable links with available/missing status; never fabricated]
```

The journey separates instructions from actual completion evidence. A missing prerequisite or artifact shows actionable guidance. The current revision, model/data versions and synthetic-data limitation stay visible. Deterministic concurrency and replay evidence records the initial entity/version, synchronization barrier, competing commands, winner count, final entity/version/status, audit/outbox/inbox/idempotency counts and exact replay response.

Portfolio evidence links separately to the two pinned whole-cluster resource profiles and to each unresolved OQ5 item; it does not use a barrier deadline or log/audit retention period as a substitute for an RPO, RTO or backup-expiry target.

## UI-16 Supported-browser profile evidence

The browser evidence view records the exact browser/version, operating system, viewport, zoom or reflow setting, keyboard/focus result, text-spacing and non-color result, horizontal-scroll exceptions, tested revision and supported/unsupported disposition. Evidence is a versioned record, never inferred from browser family alone. An in-product compatibility warning appears only when the application can reliably detect an unsupported profile; otherwise the reviewer evidence view reports the result without pretending detection is available.

## Reusable state patterns

| State | Visual treatment | Required content | Allowed action |
| --- | --- | --- | --- |
| Loading | Skeleton matching final layout | Operation label; delayed-state message | Cancel only when safe |
| Empty | Neutral illustration/icon and heading | Why empty; what creates data | One relevant next action |
| Error | Alert with icon and text | What failed; effect; recovery | Retry or safe navigation |
| Partial | Warning status and counts | Completed, rejected and pending portions | Inspect diagnostics |
| Stale | Timestamped warning badge/banner | Current and expected version; consequence | Refresh/recalculate |
| Unavailable | Explicit unavailable status | Missing dependency and affected capability | Diagnose or return |
| Success | Inline result near trigger | Authoritative identifier and evidence link | Continue workflow |
| Forbidden | Access-result page or inline denial | No sensitive existence detail; safe destination | Return/change authorized context |
| Conflict | Warning with current authoritative state | What changed; whether effect is uncertain | Reload before retry |
| Blocked prerequisite | Neutral blocked panel | Missing OQ/profile/version and why work cannot start | Resolve prerequisite |
| Outcome unknown | Warning alert with operation identity | No success claim; prohibited retry until reconciled | Check status |
| Authority lost | Error result with fencing evidence | Prohibited side effect and authoritative generation | Inspect/reconcile |
| Reconciliation required | Neutral warning with job identity | Uncertain lease holder, local fence and pending reassignment | Check status; no activation or new heavy run claim |
| Cache unavailable | Degraded status with source/route versions | Authoritative fallback is used; no stale cached result is current | Inspect source/route evidence |

## Story-to-interface coverage

| Epic | Story mapping |
| --- | --- |
| EP01 Secure access and retailer isolation | US1.1 UI-00; US1.2 UI-00; US1.3 UI-00/global shell; US1.4 global shell/UI-01; US1.5 UI-00/UI-13 plus non-UI persistence |
| EP02 Inventory and reproducible data | US2.1 UI-02/UI-15; US2.2 UI-02; US2.3 UI-03; US2.4 UI-03 state pattern; US2.5 UI-02 |
| EP03 Supplier information | US3.1 UI-09; US3.2 UI-09; US3.3 UI-09/UI-13; US3.4 UI-09/UI-13 |
| EP04 Forecasting and ML lifecycle | US4.1 UI-04; US4.2 UI-12; US4.3 UI-04/UI-12; US4.4 UI-04; US4.5 UI-12; US4.6 UI-12/UI-15; US4.7 UI-04; US4.8 UI-12 |
| EP05 Replenishment planning | US5.1 UI-05/UI-01; US5.2 UI-05; US5.3 UI-05; US5.4 UI-05; US5.5 UI-05/UI-06 |
| EP06 Purchasing and receipts | US6.1 UI-06; US6.2 UI-06/UI-07; US6.3 UI-07; US6.4 UI-07/UI-08; US6.5 UI-07/UI-08; US6.6 UI-08/UI-15 |
| EP07 Assistant and agentic workflows | US7.1 UI-10/UI-11; US7.2 UI-10/UI-11; US7.3 UI-09/UI-12/UI-15; US7.4 UI-10/UI-11; US7.5 UI-15; US7.6 UI-10/UI-11; US7.7 UI-10/UI-11; US7.8 UI-10/UI-11; US7.9 UI-10/UI-11; US7.10 UI-10/UI-11; US7.11 UI-10/UI-11; US7.12 UI-09/UI-12/UI-13 plus non-UI index lifecycle |
| EP08 Local platform and delivery | US8.1 UI-13/UI-15; US8.2 UI-13 plus contract evidence; US8.3 UI-13; US8.4 UI-13; US8.5 UI-13/UI-14; US8.6 UI-01/UI-13; US8.7 UI-12/UI-13; US8.8 UI-13/UI-15 |
| EP09 Observability, audit and recovery | US9.1 UI-14; US9.2 UI-14; US9.3 UI-14; US9.4 UI-12/UI-13/UI-15; US9.5 UI-13; US9.6 UI-13/UI-15; US9.7 UI-14; US9.8 UI-13/UI-14; US9.9 UI-13; US9.10 UI-13; US9.11 UI-13/UI-15 |
| EP10 Reviewer experience | US10.1 UI-15; US10.2 UI-15; US10.3 UI-15/UI-16 |

## Design tradeoffs and boundaries

- A sidebar exposes the product’s breadth and current context, at the cost of horizontal space. Collapse behavior preserves tablet usability.
- Detail drawers preserve comparison context, while dedicated full pages remain available for long assistant sessions, model evidence and complex operational procedures.
- Mobile supports high-value review tasks without promising dense authoring parity that would dilute the local portfolio scope.
- Ant Design Charts improves visual consistency; every chart requires a data-table or text equivalent because visual output alone is insufficient evidence.
- This document specifies UX behavior. Domain services remain authoritative for tenant checks, quotas, purchasing transitions, idempotency and audit atomicity.

## Open implementation inputs

The design can proceed without inventing values for requirements OQ1–OQ10. OQ5 specifically leaves RPO, RTO, backup expiry and complete local persistent-disk capacity open; FR20.1 barrier deadlines and NFR9 log/audit retention are already fixed but are different measurements. Their eventual values populate labels, limits, timestamps and error copy at the stated points of use. Component dimensions and exact token contrast must be validated in the implemented browser; the accessibility checklist defines that evidence.

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-09-27T14:49:14Z
**Iteration:** 2
**Request Challenge:** review:df9ae003d044c0269f2446f40da1d2b7

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/inception/refined-mockups/mockups.md > UI-05 and Story-to-interface coverage; interaction-spec.md > BufferScenarioComparison | US5.3 retains its dedicated inherited-versus-explicit-zero comparison on common versioned inputs, with differences and stale handling. US5.3, US5.4 and US5.5 remain separately mapped. | Preserve this separation during implementation. | Resolved |
| R-02 | Minor | aidlc/spaces/default/intents/260908-stock-sense-design/inception/refined-mockups/refined-mockups-questions.md > Header | The Q&A header still identifies Refined Mockups and the reopened design plan. | No further action. | Resolved |
| R-03 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/inception/refined-mockups/mockups.md > UI-09 Supplier knowledge | The partial document example remains a text PDF; accepted terms and retrieval citations are withheld until validation, and unsupported DOCX is rejected without parsed content, consistent with FR10 and FR10.2. | Preserve the supported-format and validation boundary. | Resolved |
| R-04 | Minor | aidlc/spaces/default/intents/260908-stock-sense-design/inception/refined-mockups/mockups.md > UI-05 Replenishment workspace | The display still shows one of three accepted manual requests remaining and a retailer-local reset, consistent with FR9 and FR9.5. | Preserve the three-request, retailer-local quota presentation. | Resolved |
| R-05 | Minor | aidlc/spaces/default/intents/260908-stock-sense-design/inception/refined-mockups/design-system-mapping.md > Form conventions | The convention still limits linked replacement-Draft creation to authorized Planners or dual-role users acting as Planner after a fresh capability check; Manager-only users get handback without changing the Submitted proposal. | Preserve the acting-role and capability boundary. | Resolved |

### Summary

The LF-normalized artifact retains the reviewed product behavior and maps all 67 approved stories. The five carried findings remain resolved; no new material contradiction was found.
