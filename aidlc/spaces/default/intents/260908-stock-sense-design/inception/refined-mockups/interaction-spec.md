# StockSense interaction specification

Date: 2026-09-10
Status: Draft for owner approval

## Scope and interaction contract

This specification defines observable browser behavior for the screen catalog in `mockups.md`. Domain APIs remain authoritative for authorization, tenant isolation, quotas, freshness, purchasing transitions, idempotency and audit outcomes. The client never predicts a successful mutation before receiving an authoritative response.

Global rules:

- Every request carries the current authenticated session and selected retailer context through the BFF-defined contract.
- A retailer change invalidates incompatible cached queries, closes unsafe mutation surfaces and prevents late responses from rendering under the new retailer.
- Destructive, financial or authority-changing actions require an explicit review step.
- A lost or uncertain response is shown as uncertain; the client retrieves authoritative state before offering retry.
- Only one modal dialog may be open. Large evidence belongs in a drawer or page.
- Filters, sort, pagination and selected record are URL-addressable where this does not expose sensitive values.
- Status changes use text and icons as well as color.
- Notifications supplement inline outcomes and never carry the only error or success message.

## Primary user flows

### Flow F-01: Sign in and establish retailer context

Persona: Planner, Manager, Operator or Reviewer

Trigger: User opens StockSense without a valid session.

Steps:

1. UI-00 shows local sign-in and optional Google federation when configured.
2. User submits one method; the form enters a named pending state.
3. The BFF completes identity validation and creates the server-side session.
4. With one membership, StockSense selects it and opens UI-01.
5. With multiple memberships, focus moves to the retailer selector and the user chooses one before business data loads.
6. With no membership, UI-00 shows no-access guidance and sign-out.

Success outcome: UI-01 names the authenticated user, role and retailer.

Error paths:

- Invalid credentials: field-associated error plus summary; password is cleared.
- Invalid callback/state/PKCE: no session; safe return-to-sign-in action.
- Expired/revoked session: pending mutation is not replayed; user reauthenticates and reloads authoritative state.
- Unsafe account-link attempt: generic denial without granting membership.

### Flow F-02: Import inventory or sales history

Persona: Planner

Trigger: User selects “New import” in UI-02.

Steps:

1. User chooses import type and a file, supplies the source version, and starts validation.
2. Upload progress is announced without blocking navigation unless the transport requires it.
3. Validation displays accepted, rejected and pending counts with row/field diagnostics.
4. User downloads diagnostics, replaces the file, cancels, or proceeds according to the contract-defined batch policy.
5. The review step names retailer, import type, source version, checksum and expected authoritative effect.
6. User commits explicitly; the UI waits for the atomic business/audit outcome.
7. Success links to inventory/movement history or forecast data provenance.

Success outcome: The import identifier, authoritative counts and evidence link are visible.

Error paths:

- Unsupported type/size/schema: reject before commit and provide correction guidance.
- Duplicate source or retry: display the existing outcome and do not imply duplicate stock.
- Currency/tenant mismatch: reject with safe field guidance.
- Audit/outbox failure: report failure and no committed business effect.
- Uncertain response: query by idempotency/source identifier before enabling retry.

### Flow F-03: Inspect inventory and evidence

Persona: Planner or Manager

Trigger: User opens UI-03 or follows an overview exception.

Steps:

1. Table loads using retailer-scoped filters and pagination.
2. User searches, filters or sorts; visible criteria and total count update.
3. Selecting a row opens the detail drawer and moves focus to its heading.
4. User switches between trajectory, movements and forecast evidence tabs.
5. Evidence links open within the current retailer and preserve a return path.
6. Closing the drawer returns focus to the originating row.

Success outcome: Displayed balance, movement history and provenance can be reconciled.

Error paths:

- Redis unavailable: label the authoritative live-source fallback.
- Stale data: show observed timestamp and refresh action.
- Foreign/deleted record: safe not-found/access result without leaking existence.
- Late response after retailer change: discard and announce only the new retailer’s load status.

### Flow F-04: Compare forecast and baseline

Persona: Planner, Reviewer or Operator

Trigger: User opens a forecast from inventory or UI-04.

Steps:

1. User selects product, horizon, as-of date and available model version.
2. Chart, text summary and accessible data table update as one labeled region.
3. User opens evidence to inspect training cutoff, dataset/model versions, freshness and metrics.
4. “Compare with baseline” aligns the same evaluation window and displays absolute values and delta.
5. Reviewer opens the versioned evaluation report; operator may continue to UI-12.

Success outcome: The user can explain the forecast’s source, validity and measured comparison.

Error paths:

- No usable forecast: unavailable panel names the missing prerequisite.
- Stale inputs: downstream action is blocked or explicitly recalculated according to the later contract.
- Rejected model: remains inspectable but cannot masquerade as active.
- Chart failure: accessible table and text outcome remain available.

### Flow F-05: Run or request replenishment review

Persona: Planner

Trigger: Scheduled review result arrives or user selects “Request new review.”

Steps:

1. UI-05 shows the latest review run, input versions and current allowance.
2. User opens the request control; the confirmation names remaining allowance and reset time.
3. User confirms once; the control changes to the authoritative queued/running job.
4. Completion refreshes the review list without stealing focus.
5. User selects a row to inspect shortage logic, buffers, pack rounding, minimum order and supplier evidence.
6. User creates a draft proposal in UI-06 with evidence pinned.

Success outcome: Review outcome and allowance are visible; draft creation is traceable to evidence.

Error paths:

- Quota exhausted: action is disabled with reset and scheduled-run guidance.
- Concurrent request: existing active job is shown; no extra allowance is claimed.
- Forecast unavailable: explicit unavailable outcome, not a zero recommendation.
- Day-boundary retry: same job identity retains its original charging outcome.

### Flow F-06: Prepare and submit a purchase proposal

Persona: Planner

Trigger: User creates a draft from UI-05 or Purchasing.

Steps:

1. UI-06 presents editable draft lines and source evidence.
2. Validation runs on blur and on review: positive quantities, pack multiples, minimums, currency and supplier rules.
3. Autosave displays `Saving`, `Saved` or `Unsaved changes`; explicit Save remains available.
4. “Review submission” opens one confirmation dialog with retailer, totals, evidence versions and consequences.
5. User submits; success locks lines and shows the submitted identifier/status.

Success outcome: A submitted immutable proposal is available in UI-07.

Error paths:

- Validation error: focus moves to the summary, then the first invalid field.
- Stale evidence or optimistic conflict: submission fails and authoritative differences are shown.
- Lost response: retrieve proposal by idempotency key before retry.
- Discard: destructive confirmation names the draft and returns focus to its prior list location.

### Flow F-07: Approve, reject or cancel purchasing

Persona: Manager

Trigger: Manager opens UI-07 from the overview or Purchasing.

Steps:

1. Queue shows submitted proposals with evidence status and decision age.
2. Selecting a proposal updates the detail pane and its URL selection state.
3. Manager opens supporting forecast, replenishment and audit context without losing the queue.
4. Manager enters a reason where required and selects Approve or Reject.
5. A confirmation states the retailer, proposal version, line totals and resulting state.
6. The authoritative result updates the queue and announces outcome.
7. Eligible submitted/approved records expose Cancel before any receipt; cancellation has its own confirmation.

Success outcome: Exactly one valid state transition is shown with decision evidence.

Error paths:

- Stale version: decision is rejected; current state and reviewer are shown if permitted.
- Competing decisions: losing action reloads the authoritative result.
- Unauthorized role/membership: no business effect; safe denial.
- Receipt already exists: cancel is unavailable and reason is shown.

### Flow F-08: Record partial or full receipt

Persona: Authorized Planner or Manager

Trigger: User selects “Record receipt” on UI-08.

Steps:

1. Receipt editor lists approved, cumulative received and remaining quantities per line.
2. User enters this receipt’s quantities, reference and received time.
3. Inline validation calculates remaining-after values and blocks cumulative over-receipt.
4. Review step shows inventory effects and resulting order state.
5. User confirms; success links to movements and audit evidence.

Success outcome: Quantities reconcile and state becomes Partially received or Received.

Error paths:

- Cumulative total exceeds approval: reject before submission and after authoritative validation.
- Duplicate delivery/reference retry: show existing receipt outcome.
- Cancel/receipt race: display one authoritative winner; do not retry automatically.
- Audit/outbox failure: show failure with no claimed inventory effect.

### Flow F-09: Ingest and inspect supplier knowledge

Persona: Planner or Manager

Trigger: User uploads a document in UI-09.

Steps:

1. User chooses a supported file and source version.
2. Client checks known size/type bounds, then uploads for authoritative validation.
3. Extraction/indexing progress is shown as stages with timestamps.
4. Partial extraction exposes warnings and extracted text for review.
5. Ready document exposes retrieval citations and version metadata.
6. Delete action explains source deletion and downstream projection cleanup.

Success outcome: A versioned document is either ready, partial with warnings, rejected or deleted with explicit projection state.

Error paths:

- Unsupported/scanned input: reject with supported-format guidance; no OCR claim.
- Extraction/index failure: preserve source/version evidence and offer safe retry.
- Wrong-retailer access: safe denial with no document existence disclosure.
- Deleted version cited by an old answer: citation shows unavailable/deleted source state.

### Flow F-10: Ask the assistant and confirm a governed action

Persona: Planner, Manager or Operator

Trigger: User opens UI-10 from a screen or UI-11 from navigation.

Steps:

1. Assistant names the active retailer and optional screen/entity context.
2. User asks a question; model/provider and retrieval/tool progress are visible.
3. Response includes citations with source/version and distinguishes facts, calculations and uncertainty.
4. Navigation suggestions open governed screens directly.
5. A proposed mutation is represented as a preview card, not as completed work.
6. User selects “Review action”; the owning domain screen reloads authority and current versions.
7. User confirms in that domain surface; assistant history receives the authoritative outcome.

Success outcome: Explanation and any action remain attributable, reviewable and tenant-safe.

Error paths:

- LLM unavailable: show provider/model state and preserve unsent draft.
- Retrieval degraded: label answer limits; do not fabricate citations.
- Tool denied: show safe denial without exposing foreign data.
- Lost tool response: query by operation identity before retry.
- Prompt injection in source: content is displayed as cited data, never as trusted instruction.

### Flow F-11: Inspect operations and reviewer evidence

Persona: Operator or Reviewer

Trigger: User opens UI-12 through UI-15.

Steps:

1. Select a versioned run, deployment, contract, trace or recovery exercise.
2. Inspect summary, configuration fingerprint, timestamps and evidence links.
3. Follow stable links across requirements, stories, design, contracts and validation.
4. Missing evidence remains marked missing and provides the command or task expected to create it.
5. Reviewer journey records local progress only after an observable result.

Success outcome: A reviewer can reproduce the demo and distinguish planned, implemented, tested and measured claims.

Error paths:

- Missing prerequisite: actionable setup guidance.
- Backend unavailable: retain static documentation links and mark live evidence unavailable.
- Revision mismatch: warn that evidence belongs to another revision.

## Component specifications

## ApplicationShell

| Field | Value |
| --- | --- |
| Component | `ApplicationShell` |
| Description | Provides role-aware navigation, retailer context and page layout. |
| Category | layout / navigation |

### States

| State | Description | Trigger |
| --- | --- | --- |
| default | Expanded desktop navigation | Authenticated route at 1024px+ |
| collapsed | Icon navigation with labels on demand | User toggle or tablet width |
| mobile | Header plus temporary navigation drawer | Width below 768px |
| context-changing | Old content unavailable; new retailer loading | Retailer change accepted |
| session-expired | Business content replaced by safe recovery | Session validation fails |
| no-access | Identity shown without business navigation | No current memberships |

### Props / inputs

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `identity` | object | yes | — | Display name and session state |
| `retailers` | array | yes | — | Authorized current memberships only |
| `activeRetailer` | object or null | yes | — | Current retailer context |
| `roleCapabilities` | array | yes | — | Controls visible routes and actions |
| `navigationItems` | array | yes | — | Role-filtered routes |
| `assistantState` | object | yes | — | Panel visibility and context |

### Responsive behaviour

| Breakpoint | Behaviour |
| --- | --- |
| mobile (<768px) | Compact header; nav and assistant use full-screen drawers/routes |
| tablet (768–1023px) | Collapsed sidebar; temporary labels; overlay details |
| desktop (>=1024px) | Persistent sidebar and context bar |

### Accessibility

| Requirement | Implementation |
| --- | --- |
| Landmarks | Header, navigation, main and complementary assistant regions |
| Keyboard | Skip link first; logical sidebar-to-context-to-main order |
| Label | Active route uses text and `aria-current="page"` |
| Screen reader | Retailer change and session state announced politely |
| Focus | Route change moves focus to page heading; context failure moves to alert |

## RetailerContextSelector

| Field | Value |
| --- | --- |
| Component | `RetailerContextSelector` |
| Description | Selects one authorized retailer and displays the active authority context. |
| Category | input / navigation |

### States

| State | Description | Trigger |
| --- | --- | --- |
| single | Fixed retailer label | One membership |
| multiple | Select control | Multiple memberships |
| switching | New context validation pending | Selection change |
| revoked | Current membership no longer valid | Server denial/event |
| none | Provisioning guidance | Zero memberships |

### Props / inputs

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `memberships` | array | yes | — | Current authorized choices |
| `value` | string or null | yes | — | Active retailer ID |
| `onChange` | function | yes | — | Starts validated context change |
| `disabledReason` | string | no | — | Explains temporary inability to switch |

### Responsive behaviour

| Breakpoint | Behaviour |
| --- | --- |
| mobile (<768px) | Full-width selector in context sheet |
| tablet (768–1023px) | Compact selector with full accessible name |
| desktop (>=1024px) | Inline in top context bar |

### Accessibility

| Requirement | Implementation |
| --- | --- |
| Keyboard | Native select/combobox keys; Escape closes |
| Label | Visible “Retailer” label; retailer name repeated in page heading |
| Screen reader | Change result and loading state announced |
| Focus | Remains on selector after success; moves to error alert on failure |

## DataWorkspaceTable

| Field | Value |
| --- | --- |
| Component | `DataWorkspaceTable` |
| Description | Standard searchable, filterable, sortable and paginated operational list. |
| Category | display / input |

### States

| State | Description | Trigger |
| --- | --- | --- |
| loading | Row-shaped skeleton | Initial/query load |
| populated | Rows, total, filters and pagination | Successful query |
| empty-source | No records exist | Successful zero result without filters |
| empty-filter | Filters yield zero records | Successful zero filtered result |
| error | Inline alert and retry | Query fails |
| stale | Rows visible with age warning | Freshness threshold exceeded |
| partial | Rows visible with omitted/failed segment notice | Partial source result |

### Props / inputs

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `columns` | array | yes | — | Labels, sort and responsive priority |
| `rows` | array | yes | `[]` | Current page |
| `queryState` | object | yes | — | Filters, sort and pagination |
| `freshness` | object | yes | — | Timestamp and stale/unavailable state |
| `selection` | string or null | no | `null` | Row backing the detail drawer |

### Responsive behaviour

| Breakpoint | Behaviour |
| --- | --- |
| mobile (<768px) | Priority fields become cards; filters open a sheet |
| tablet (768–1023px) | Horizontal scroll with sticky identity/action columns |
| desktop (>=1024px) | Full table with compact density |

### Accessibility

| Requirement | Implementation |
| --- | --- |
| Semantics | Real table markup; column headers and sort state exposed |
| Keyboard | Rows contain real buttons/links; no click-only row dependency |
| Label | Filter controls have visible labels; reset names affected filters |
| Screen reader | Result count and load completion announced politely |
| Focus | Refresh preserves focused control or selected record when still present |

## EvidenceDrawer

| Field | Value |
| --- | --- |
| Component | `EvidenceDrawer` |
| Description | Displays record detail, versions, calculation evidence and safe actions while preserving list context. |
| Category | display / feedback |

### States

| State | Description | Trigger |
| --- | --- | --- |
| loading | Heading and content skeleton | Record selected |
| current | Detail matches current list version | Successful load |
| stale | Version mismatch is explicit | Upstream change detected |
| unavailable | Record/evidence cannot be accessed | Denial/deletion/failure |
| conflict | Mutation returned newer state | Optimistic conflict |

### Props / inputs

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `recordId` | string | yes | — | Current selection |
| `version` | string | yes | — | Evidence/current-state version |
| `sections` | array | yes | — | Tabs or disclosure groups |
| `actions` | array | no | `[]` | Server-capability-filtered actions |
| `originFocusRef` | reference | yes | — | Focus return target |

### Responsive behaviour

| Breakpoint | Behaviour |
| --- | --- |
| mobile (<768px) | Full-screen route/drawer with sticky close/back action |
| tablet (768–1023px) | Full-height overlay drawer |
| desktop (>=1024px) | 420px side drawer; wider for evidence-heavy records |

### Accessibility

| Requirement | Implementation |
| --- | --- |
| Role | Dialog semantics only when modal; otherwise complementary region |
| Keyboard | Escape closes when safe; tabs follow ARIA tab pattern |
| Label | Heading names record and status |
| Screen reader | Loading, stale and conflict changes announced |
| Focus | Heading receives focus on open; trigger receives focus on close |

## ImportFlow

| Field | Value |
| --- | --- |
| Component | `ImportFlow` |
| Description | Uploads, validates, reviews and commits versioned inventory or sales data. |
| Category | input / feedback |

### States

| State | Description | Trigger |
| --- | --- | --- |
| select | File/type/version entry | New import |
| uploading | Progress and cancel if safe | Upload accepted |
| validating | Validation stage progress | Upload complete |
| review | Counts and diagnostics | Validation complete |
| committing | Authoritative mutation pending | User confirms |
| complete | Identifier and evidence links | Atomic success |
| failed | Cause/effect/recovery | Any stage fails |

### Props / inputs

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `importType` | enum | yes | — | Inventory or sales history |
| `sourceVersion` | string | yes | — | User/source supplied version |
| `file` | file | yes | — | Selected input |
| `policy` | object | yes | — | Contract-defined batch policy/limits |
| `result` | object or null | no | `null` | Validation or commit outcome |

### Responsive behaviour

| Breakpoint | Behaviour |
| --- | --- |
| mobile (<768px) | Result inspection only; dense upload mapping may direct to desktop |
| tablet (768–1023px) | Stacked steps and horizontally scrollable diagnostics |
| desktop (>=1024px) | Step layout with full diagnostics table |

### Accessibility

| Requirement | Implementation |
| --- | --- |
| Keyboard | File selection, download, replace and commit fully operable |
| Label | File/type/version controls use visible labels |
| Screen reader | Progress values and stage changes announced politely |
| Focus | Validation summary receives focus; invalid table links focus to row |

## ForecastComparison

| Field | Value |
| --- | --- |
| Component | `ForecastComparison` |
| Description | Presents forecast, interval, baseline and versioned evaluation evidence. |
| Category | display |

### States

| State | Description | Trigger |
| --- | --- | --- |
| loading | Chart/table skeleton | Selection change |
| current | Valid forecast/evidence | Successful load |
| stale | Input/freshness warning | Threshold/version mismatch |
| unavailable | Missing usable forecast | Validation failure |
| comparison | Candidate and baseline aligned | Compare action |

### Props / inputs

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `series` | array | yes | — | Forecast/baseline/interval data |
| `metrics` | object | yes | — | MAE, WAPE and inventory outcomes where applicable |
| `versions` | object | yes | — | Model, dataset and input versions |
| `freshness` | object | yes | — | Validity state and boundary |

### Responsive behaviour

| Breakpoint | Behaviour |
| --- | --- |
| mobile (<768px) | Text summary and table first; chart collapsible |
| tablet (768–1023px) | Chart above evidence grid |
| desktop (>=1024px) | Chart and evidence side by side where space permits |

### Accessibility

| Requirement | Implementation |
| --- | --- |
| Alternative | Every chart has text summary and data table |
| Keyboard | Series controls are native buttons/selects |
| Color | Series differ by label, marker/line pattern and color |
| Screen reader | Chart region receives concise purpose; table carries exact values |

## ReviewRequestControl

| Field | Value |
| --- | --- |
| Component | `ReviewRequestControl` |
| Description | Shows daily manual-review allowance and safely starts or resumes one review job. |
| Category | input / feedback |

### States

| State | Description | Trigger |
| --- | --- | --- |
| available | Remaining count and reset shown | Quota available |
| confirming | Consequence dialog open | Request selected |
| queued/running | Existing job identity/status | Accepted request |
| exhausted | Disabled with reset guidance | No allowance |
| failed | Explicit charge/job outcome | Request failure |
| complete | Result and evidence link | Job completes |

### Props / inputs

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `allowance` | object | yes | — | Remaining, total and reset time |
| `activeJob` | object or null | yes | — | Existing job identity/status |
| `onRequest` | function | yes | — | Idempotent request action |

### Responsive behaviour

| Breakpoint | Behaviour |
| --- | --- |
| mobile (<768px) | Full-width status card and bottom action |
| tablet (768–1023px) | Inline card above results |
| desktop (>=1024px) | Toolbar status plus confirmation dialog |

### Accessibility

| Requirement | Implementation |
| --- | --- |
| Label | Disabled reason appears in text and description relationship |
| Screen reader | Allowance/job changes announced politely |
| Focus | After confirmation, focus moves to job-status region |

## PurchaseReviewWorkspace

| Field | Value |
| --- | --- |
| Component | `PurchaseReviewWorkspace` |
| Description | Master-detail queue for evidence-backed approval, rejection and cancellation. |
| Category | display / input |

### States

| State | Description | Trigger |
| --- | --- | --- |
| empty | No submitted proposals | Queue returns zero |
| selected-current | Decision controls available | Current proposal selected |
| selected-stale | Evidence/version changed | Freshness check fails |
| deciding | Explicit confirmation open | Approve/reject/cancel selected |
| conflict | Another transition won | Version conflict |
| complete | Outcome and next item | Authoritative success |

### Props / inputs

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `queue` | array | yes | — | Submitted proposals/orders |
| `selected` | object or null | yes | — | Current detail |
| `capabilities` | array | yes | — | Allowed decisions from server state |
| `evidence` | object | yes | — | Versions, rationale and links |
| `decisionReason` | string | conditional | — | Required according to transition contract |

### Responsive behaviour

| Breakpoint | Behaviour |
| --- | --- |
| mobile (<768px) | Queue then full-screen detail; safe decisions retained |
| tablet (768–1023px) | Queue plus overlay detail |
| desktop (>=1024px) | Persistent master-detail split |

### Accessibility

| Requirement | Implementation |
| --- | --- |
| Keyboard | Queue uses list/table semantics and explicit open buttons |
| Label | Decision buttons include proposal identifier in accessible name |
| Screen reader | Selection, stale status and authoritative result announced |
| Focus | Decision dialog returns to trigger; success moves to result heading |

## ReceiptEditor

| Field | Value |
| --- | --- |
| Component | `ReceiptEditor` |
| Description | Records cumulative-safe partial or full receipts against approved lines. |
| Category | input |

### States

| State | Description | Trigger |
| --- | --- | --- |
| editing | Quantity/reference inputs available | Editor opens |
| invalid | Line or cumulative validation fails | Input/review |
| review | Effects and resulting state shown | Review selected |
| submitting | Atomic mutation pending | Confirmation |
| uncertain | Response lost; reconciliation needed | Network ambiguity |
| complete | Receipt, movements and state shown | Authoritative success |

### Props / inputs

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `orderVersion` | string | yes | — | Optimistic state token |
| `lines` | array | yes | — | Approved/received/remaining quantities |
| `receiptReference` | string | yes | — | Source/idempotency reference |
| `receivedAt` | datetime | yes | current | Explicit receipt time |

### Responsive behaviour

| Breakpoint | Behaviour |
| --- | --- |
| mobile (<768px) | One line card at a time with totals always visible |
| tablet (768–1023px) | Stacked line table and summary |
| desktop (>=1024px) | Editable table with sticky totals/actions |

### Accessibility

| Requirement | Implementation |
| --- | --- |
| Input | Numeric controls have visible product labels and constraints |
| Error | Summary links to the exact invalid line field |
| Screen reader | Remaining-after values announced on blur, not every keystroke |
| Focus | Failed submit focuses summary; success focuses receipt heading |

## AssistantSurface

| Field | Value |
| --- | --- |
| Component | `AssistantSurface` |
| Description | Contextual panel or full workspace for cited explanations and governed tool previews. |
| Category | input / display / feedback |

### States

| State | Description | Trigger |
| --- | --- | --- |
| idle | Context and prompt available | Open |
| generating | Model response streaming/pending | Prompt sent |
| retrieving | Sources being resolved | Retrieval starts |
| tool-preview | Proposed navigation or mutation shown | Tool result/proposal |
| degraded | Model/retrieval/tool partly unavailable | Dependency failure |
| error | No reliable answer/action outcome | Failure |
| complete | Cited answer and activity record | Success |

### Props / inputs

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `retailerContext` | object | yes | — | Current authorized retailer |
| `screenContext` | object or null | no | `null` | Safe current entity/version |
| `messages` | array | yes | `[]` | Thread history |
| `providerState` | object | yes | — | Local/external model state |
| `toolActivity` | array | yes | `[]` | Calls, outcomes and evidence |

### Responsive behaviour

| Breakpoint | Behaviour |
| --- | --- |
| mobile (<768px) | Full-screen route with evidence subroute |
| tablet (768–1023px) | Full-height overlay; evidence drawer |
| desktop (>=1024px) | 360–380px contextual panel or three-region workspace |

### Accessibility

| Requirement | Implementation |
| --- | --- |
| Semantics | Conversation is a labeled log; user/assistant identities are text |
| Keyboard | Prompt, stop, citations and proposed actions are ordered controls |
| Live updates | Streaming text is not announced token by token; completion summary is polite |
| Focus | Opening focuses heading or prompt by user intent; closing restores trigger |
| Safety | Proposed mutation uses a button to open domain confirmation; no chat-only approval |

## StatusFeedback

| Field | Value |
| --- | --- |
| Component | `StatusFeedback` |
| Description | Shared inline representation for loading, empty, error, partial, stale, unavailable, conflict and success. |
| Category | feedback |

### States

The component accepts exactly the named shared states in `mockups.md`, plus severity and recovery actions. It never converts unavailable or stale into empty/success.

### Props / inputs

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `state` | enum | yes | — | Named state |
| `title` | string | yes | — | User-readable outcome |
| `description` | string | yes | — | Cause/effect/recovery |
| `timestamp` | datetime | conditional | — | Required for stale/observed outcomes |
| `actions` | array | no | `[]` | Safe recovery/navigation actions |

### Responsive behaviour

Inline alerts wrap; full-page states remain centered within the content region without hiding navigation or retailer context.

### Accessibility

Errors use assertive announcement only when immediate action is required. Background refresh, job progress and success use polite announcements. Focus moves only for submitted errors, route-level failures or confirmations, never for background updates.

## ConfirmationDialog

| Field | Value |
| --- | --- |
| Component | `ConfirmationDialog` |
| Description | Reviews consequential action details before a user-authorized mutation. |
| Category | input / feedback |

### States

Default review, submitting, recoverable error, conflict and uncertain outcome. The dialog cannot open another dialog.

### Props / inputs

| Prop | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `actionName` | string | yes | — | Explicit verb and object |
| `context` | object | yes | — | Retailer, record, version and consequences |
| `confirmLabel` | string | yes | — | Specific action, never generic OK |
| `destructive` | boolean | yes | `false` | Semantic styling and copy |
| `onConfirm` | function | yes | — | One authoritative submission |

### Responsive behaviour

Centered modal on tablet/desktop; full-width bottom sheet or full-screen dialog on mobile while retaining dialog semantics.

### Accessibility

Focus enters the title, remains trapped, and returns to the trigger on cancel. The confirm button is reachable after the consequence summary. Escape cancels except while an irreversible request is in flight; the reason is announced.

## Keyboard interaction summary

| Pattern | Keys and behavior |
| --- | --- |
| Global navigation | Tab reaches skip link, context, navigation, page controls; Enter activates |
| Menu/navigation drawer | Arrow keys per Ant Design menu behavior; Escape closes temporary drawer |
| Table | Tab reaches interactive cells; sort buttons announce direction; no arrow-key grid unless implemented fully |
| Tabs | Left/Right selects tab; Tab enters panel |
| Drawer | Escape closes when safe; focus returns to originating control |
| Dialog | Focus trapped; Escape cancels when safe; specific confirm button label |
| Combobox/select | Arrow keys navigate; Enter selects; Escape closes |
| Charts | Controls are keyboard reachable; data table supplies exact exploration |
| Assistant | Tab traverses prompt, stop, citations and actions; streaming does not move focus |

## Copy and outcome conventions

- Use domain terms: retailer, proposal, purchase order, receipt, review run, forecast, evidence.
- Buttons use specific verbs: `Submit proposal`, `Approve proposal`, `Record receipt`, `Request review`.
- Error text states what happened, what changed or did not change, and the safe next action.
- Never show raw stack traces, secret values, internal prompts or foreign identifiers.
- Timestamps show retailer-local display time with UTC available in detail/tooltips; stored values remain UTC.
- Currency values always include the retailer currency and never imply FX conversion.

## Traceability

The UI IDs and flows map to all stories through `mockups.md` § Story-to-interface coverage. Critical interaction anchors are:

| Interaction | Story/acceptance anchors |
| --- | --- |
| Retailer switch and late responses | US1.4, AC1.4.1–AC1.4.5 |
| Import diagnostics and authoritative outcome | US2.2, AC2.2.1–AC2.2.4; US2.5 |
| Inventory states and cache degradation | US2.3, US2.4 |
| Forecast provenance/comparison | US4.1–US4.7 |
| Manual review request and quota | US5.3, US5.4 |
| Draft/submit/review/cancel | US6.1–US6.5 |
| Partial/full receipts and races | US6.6 |
| Assistant context, evidence and governed action | US7.1–US7.12 |
| Operations, audit and recovery evidence | US8.1–US9.10 |
| Reviewer journey | US10.1, US10.2 |
