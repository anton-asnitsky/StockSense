# Web Application Frontend Components

Unit: U12 Web Application (`web-application`)

This catalog turns the confirmed Functional Design into implementable React component boundaries. U12 uses React, TypeScript, Vite, Ant Design, Ant Design Charts, React Router, TanStack Query, generated C18 clients, `react-i18next`, and `Intl`. Stable IDs identify component responsibilities; they are design identifiers rather than required exported symbol names.

## Route tree and guards

```text
/
├─ /sign-in                                      public recovery/entry
├─ /auth/callback                                public callback progress; U11 owns validation
├─ /no-access                                    authenticated, no memberships
├─ /select-retailer                              authenticated, selection required
└─ /retailers/:retailerId                        private + context-matched
   ├─ /dashboard
   ├─ /inventory
   │  ├─ /imports
   │  └─ /products/:productId
   ├─ /demand/imports
   ├─ /suppliers
   │  ├─ /imports
   │  └─ /:supplierId
   ├─ /models
   ├─ /forecasts
   ├─ /planning
   │  ├─ /reviews/:reviewId?
   │  └─ /scenarios/:scenarioId?
   ├─ /purchasing
   │  ├─ /drafts/:proposalId
   │  └─ /orders/:orderId
   ├─ /assistant/:conversationId?
   ├─ /audit
   └─ /evidence
```

| ID | Guard/layout | Inputs | Result |
| --- | --- | --- | --- |
| APP-001 | `ApplicationProviders` | Environment-safe C18 base path, generated client factory, English resources | Composes error boundary, i18n, Ant theme, query client, session provider, router, and live-region host |
| APP-002 | `SessionBootstrapGate` | `getSession` query | Renders private children only after an authoritative no-store session result; routes `401` to sign-in recovery |
| APP-003 | `AuthenticatedRoute` | Session state, requested local return path | Allows authenticated content or stores only an in-memory/local-path recovery destination |
| APP-004 | `RetailerContextRoute` | `retailerId`, selected context/version, authorized choices | Allows an exact match, opens explicit switch flow for an authorized mismatch, or renders tenant-hidden state |
| APP-005 | `RoleCapabilityGate` | Provider-returned capability descriptor, children, fallback | Controls presentation only; never replaces U11/provider authorization |
| APP-006 | `ResponsiveActionGate` | Action kind, viewport capability, continuation URL | Allows mobile review/approve/reject; explains and defers imports, draft editing, cancellation, and receipts |
| APP-007 | `RouteErrorBoundary` | Router error/problem | Maps safe C18 problems to signed-out, denied, hidden, unavailable, or unexpected recovery pages |

Route loaders do not fetch domain services. They may validate route syntax and prefetch through generated C18 query functions only after APP-002 and APP-004 succeed. Unknown return paths route to the retailer dashboard, and query strings use allowlisted filters rather than arbitrary provider parameters.

## Provider composition and state ownership

Provider order is deliberate:

1. `I18nextProvider` and Ant Design locale/theme make public recovery screens consistent.
2. `BrowserSafeErrorBoundary` removes unsafe exception detail and exposes a correlation action when available.
3. `QueryClientProvider` uses memory-only caches with persistence disabled.
4. `SessionProvider` performs no-store bootstrap and owns session generation, selected retailer descriptor, CSRF binding reference, and sign-in/logout actions in memory.
5. `BroadcastCoordinator` emits and receives only `logout` and `retailer-context-refresh` signals.
6. `RouterProvider` resolves public and guarded routes.
7. `AnnouncementProvider` serializes important status messages for assistive technology.

| State | Owner | Lifetime | Persistence |
| --- | --- | --- | --- |
| Session/context descriptor | `SessionProvider` from C18 | Current bootstrap generation | Memory only |
| Server resources and operations | TanStack Query | Session/context generation | Memory only; cache persistence disabled |
| Current form edits/files | Ant Design Form / feature component | Mounted workflow | Memory only |
| Route, filters, sort, paging | React Router URL | Current navigation | Shareable allowlisted values; no private payload |
| Drawers, selected rows, panel size | Local component/context | Mounted route | Memory only |
| Assistant SSE cursor and fragments | Assistant turn controller | Active turn | Memory only; provider snapshot is recovery source |

Query-key prefix:

```text
["c18", contractVersion, sessionGeneration, retailerId?, contextVersion?, feature, resource?, normalizedFilters?]
```

On logout, `401`, session-generation change, or retailer switch, APP-002 cancels active queries and mutations, closes SSE, clears the full private query cache, resets feature contexts, releases selected files, and broadcasts only the applicable signal. Late results whose captured prefix differs from the current prefix are discarded.

## Shared shell and state components

| ID | Component | Ant Design mapping | Inputs/state | Output/behavior |
| --- | --- | --- | --- | --- |
| SH-001 | `ApplicationShell` | `Layout`, `Sider`, `Header`, `Content` | Session, viewport, route | Role-aware shell with skip link and one main landmark |
| SH-002 | `PrimaryNavigation` | `Menu` | Capability descriptors, active route | Keyboard navigation; omits unavailable features without implying authority |
| SH-003 | `RetailerContextBar` | `Select`, `Tag`, `Dropdown` | Selected retailer/role, choices, dirty state | Keeps retailer visible and opens explicit switch confirmation |
| SH-004 | `AccountMenu` | `Dropdown`, `Avatar` | Safe actor display data | Logout and account context; no token/session detail |
| SH-005 | `PageHeader` | `Flex`, `Typography`, `Breadcrumb` | Translation keys, actions, freshness | Consistent title, source time/version, and responsive actions |
| SH-006 | `AsyncSection` | `Skeleton`, `Empty`, `Alert`, `Result` | Typed section state | Exhaustive loading/empty/ready/stale/denied/quota/unavailable/failed rendering |
| SH-007 | `FreshnessBadge` | `Tag`, `Tooltip` | Freshness, observed time, source version | Visible text plus accessible name; color is supplemental |
| SH-008 | `ProblemPanel` | `Result`, `Alert`, `Descriptions` | Safe RFC 9457 fields | Stable recovery guidance and correlation ID; excludes raw exceptions |
| SH-009 | `OperationStatus` | `Steps`, `Progress`, `Timeline` | Operation snapshot and retry guidance | Queued/processing/partial/completed/failed/unknown states |
| SH-010 | `ConfirmCommandDialog` | `Modal`, `Descriptions`, `Alert` | Actor, verb, retailer, target, version, payload summary | Creates/fixes idempotency UUID only on confirmation and returns confirm/cancel |
| SH-011 | `UnknownOutcomePanel` | `Result`, `Button`, `Spin` | Original idempotency key, correlation, operation link | Reconciles original action; blocks a new logical command until resolved or deliberately abandoned |
| SH-012 | `AccessibleDataTable` | `Table` | Typed columns, row key, sort/page/filter state | Stable headers, keyboard row actions, loading/empty/error slots, drawer focus anchor |
| SH-013 | `DetailDrawer` | `Drawer`, `Descriptions`, `Tabs` | Resource ID, invoking element | Deep-linkable detail; focus trap and restoration |
| SH-014 | `ChartWithTableFallback` | Ant Design Charts, `Table` | Series, units, labels, description | Accessible chart plus equivalent data/summary; reduced-motion support |
| SH-015 | `DirtyNavigationGuard` | `Modal` | Form dirty flag, intended destination | Confirms discard; never serializes the draft |
| SH-016 | `ResponsiveContinuation` | `Result`, `Button` | Required capability, current URL | Explains tablet/desktop requirement and preserves safe deep link |
| SH-017 | `StatusAnnouncer` | `aria-live` host | Deduplicated status events | Announces terminal/meaningful changes without streaming-fragment noise |

## Feature component catalog

### Session, dashboard, and retailer context

| ID | Component | Inputs and server state | Interaction/output |
| --- | --- | --- | --- |
| SES-001 | `SignInPage` | Enabled local/Google methods, safe return path | Starts U11 login; shows configuration and callback failures |
| SES-002 | `SessionRecoveryPage` | Recovery reason, correlation ID | Clears private state and lets the user start a new sign-in; never resubmits work |
| SES-003 | `NoMembershipPage` | Authenticated actor display data | Provisioning guidance with no signup/self-assignment |
| SES-004 | `RetailerSelectionPage` | Authorized retailer choices | Explicit selection command and context-generation wait |
| DASH-001 | `OperationalDashboardPage` | Dashboard aggregate query | Exception-first arrangement with explicit aggregate complete/partial state |
| DASH-002 | `InventorySummaryCard` | Required inventory section | Stock/exception totals and inventory link |
| DASH-003 | `ForecastSummaryCard` | Typed forecast section | Quality/freshness/model version and unavailable/stale behavior |
| DASH-004 | `ReviewSummaryCard` | Review status/allowance section | Active review, remaining allowance, reset time, request entry |
| DASH-005 | `SupplierSummaryCard` | Supplier section | Extraction/term exceptions and evidence navigation |

### Inventory, movement, and imports

| ID | Component | Inputs and server state | Interaction/output |
| --- | --- | --- | --- |
| INV-001 | `InventoryWorkspacePage` | Inventory query keyed by bounded URL filters | Dense product/position table with exception filters |
| INV-002 | `InventoryFilterBar` | Search, status, freshness, paging | Emits normalized allowlisted route filters |
| INV-003 | `InventoryTable` | Positions, source version/time | Opens INV-004 and exposes textual status |
| INV-004 | `ProductMovementDrawer` | Product ID, movement query | Ordered movement timeline/table; no client-derived authoritative balance |
| IMP-001 | `ImportWorkspacePage` | Import-kind capability and recent operations | Inventory, demand, supplier CSV/PDF entry and history |
| IMP-002 | `BoundedFilePicker` | Kind, accepted extensions/media, 10/25 MiB limit | Local validation, selected-file metadata, in-memory file reference |
| IMP-003 | `UploadProgressPanel` | Sent/total bytes, cancelable transport state | Progress only; cancellation does not imply provider operation cancellation |
| IMP-004 | `ImportOperationView` | C18 operation snapshot | Uses SH-009; row/page/source outcomes, evidence links, limitations |
| IMP-005 | `ImportValidationTable` | Safe validation items | Row/page/field location, code, message, accepted/rejected status |

### Suppliers, models, and forecasts

| ID | Component | Inputs and server state | Interaction/output |
| --- | --- | --- | --- |
| SUP-001 | `SupplierWorkspacePage` | Supplier/submission query | Table-plus-drawer view separating sources, extraction, and accepted terms |
| SUP-002 | `SupplierEvidenceDrawer` | Supplier/submission ID | Source/page citations, checksum/version, extraction limitations |
| SUP-003 | `AcceptedTermsTable` | Provider-authoritative terms | Currency/validity/version/citation and replaced/stale labels |
| MOD-001 | `ModelEvidencePage` | Candidate/current/promotion/rollback query | Model status, metrics, lineage links, limitation states |
| FOR-001 | `ForecastWorkspacePage` | Forecast status/series query | Horizon, quality, freshness, provenance, no-fallback status |
| FOR-002 | `ForecastSeriesView` | Dated values, intervals, units | SH-014 chart/table pair with source/model/data versions |

### Replenishment planning

| ID | Component | Inputs and server state | Interaction/output |
| --- | --- | --- | --- |
| PLN-001 | `PlanningWorkspacePage` | Review/recommendation/scenario queries | Master-detail recommendations and review status |
| PLN-002 | `ScenarioComparison` | Scenario IDs and typed evidence | Side-by-side assumptions, quantities, shortage dates, deltas, table fallback |
| PLN-003 | `RecommendationDrawer` | Recommendation/evidence IDs | Input versions, rationale, freshness, supplier/forecast links |
| PLN-004 | `ManualReviewRequest` | Current allowance, active review | SH-010 confirmation, one key, operation tracking, `429` display |
| PLN-005 | `ReviewAllowanceStatus` | Accepted count, limit, reset time, local date | Read-only authoritative quota presentation |

### Purchasing and receipts

| ID | Component | Inputs and server state | Interaction/output |
| --- | --- | --- | --- |
| PUR-001 | `PurchaseWorkspacePage` | Proposal/order queue query | Master-detail review grouped by provider status and freshness |
| PUR-002 | `PurchaseQueueTable` | Rows, role capabilities, filters | Opens order/proposal detail; clear locked/decision/receipt states |
| PUR-003 | `PurchaseDraftEditor` | Provider Draft, expected version | Typed line form, memory-only edits, dirty guard, server validation mapping |
| PUR-004 | `PurchaseEvidencePanel` | Recommendation/inventory/forecast/term versions | Full decision evidence and stale/unavailable blockers |
| PUR-005 | `SubmitDraftCommand` | Draft payload/version | SH-010 + mutation; locks after authoritative success |
| PUR-006 | `ManagerDecisionPanel` | Submitted proposal/order, capabilities | Approve/reject with evidence, reason field when required, SH-010 |
| PUR-007 | `CancelOrderCommand` | Current provider state/version | Tablet/desktop only; explicit confirmation and race recovery |
| PUR-008 | `ReceiptEditor` | Order lines and remaining quantities | Tablet/desktop typed multi-line form; provider enforces cumulative/atomic rules |
| PUR-009 | `ReceiptHistory` | Provider receipts and balances | Partial/completed states, stock-effect evidence, versions |
| PUR-010 | `PurchaseConflictPanel` | Stable `409` code and safe details | Distinguishes stale version, replay mismatch, over-receipt, invalid state, and races |

### Assistant and GenUI

| ID | Component | Inputs and server state | Interaction/output |
| --- | --- | --- | --- |
| AST-001 | `AssistantDock` | Current route/context, conversation summary | Collapsible contextual assistant without covering critical confirmations |
| AST-002 | `AssistantWorkspacePage` | Conversation list/current conversation | Full-page history, evidence, and action-draft workspace |
| AST-003 | `ConversationHeader` | Retailer, actor, provider/model, language, version | Visible immutable bindings; changed binding starts a new conversation |
| AST-004 | `TurnComposer` | Text, active-turn state, limits | One active turn, bounded input, typed submission, no hidden authority fields |
| AST-005 | `AssistantStreamController` | Turn/operation ID, SSE cursor | Deduplicates, reconnects, snapshots, closes on context/session change |
| AST-006 | `AssistantTranscript` | Ordered typed events | Sanitized Markdown plus allowlisted GenUI components and terminal state |
| AST-007 | `CitationList` | Typed citations | Source type/version/locator; opens authorized evidence route |
| AST-008 | `AssistantActionReview` | Typed action draft, hash, expiry, evidence | Exact review, decline/confirm, then conventional domain command flow |

GenUI registry:

| Registry type | Render component | Accepted data | Prohibited behavior |
| --- | --- | --- | --- |
| `evidence-card.v1` | `EvidenceCard` | Label, value, source/version/time, state, safe link | No executable callback or authority fields |
| `data-table.v1` | `GeneratedDataTable` | Declared columns, typed rows, caption | No arbitrary component/column code or HTML |
| `citations.v1` | AST-007 | Typed C18 citations | No raw storage/index paths |
| `comparison.v1` | `GeneratedComparison` | Typed alternatives/differences/evidence | No provider-owned decision claim |
| `review-request-draft.v1` | AST-008 → PLN-004 | Visible review request and evidence | No automatic request submission |
| `purchase-draft.v1` | AST-008 → PUR-003 | Visible proposal lines, versions, evidence | No submit/approve/reject/cancel/receipt authority |

Unknown registry types, schema-invalid payloads, arbitrary HTML, scripts, component names, callbacks, CSS, URLs outside allowed route forms, and model-supplied retailer/actor/role fields render as a safe unsupported-content notice with correlation identity.

### Audit and portfolio evidence

| ID | Component | Inputs and server state | Interaction/output |
| --- | --- | --- | --- |
| AUD-001 | `AuditWorkspacePage` | Bounded audit query and cursor | Search/filter/paging with projection freshness and lag |
| AUD-002 | `AuditResultsTable` | Safe audit descriptors | Actor/target/outcome/time/correlation; tenant-hidden behavior preserved |
| AUD-003 | `AuditDetailDrawer` | Audit projection ID | Safe event/evidence detail without raw internal payload leakage |
| EVD-001 | `PortfolioEvidencePage` | Revision-bound evidence query | Scenario, environment, checks, artifacts, checksums, limitations |
| EVD-002 | `EvidenceOutcomeTable` | Requirement/check outcomes | Distinguishes passed, failed, limited, and artifact-present-only states |
| EVD-003 | `RevisionIdentityBanner` | Revision/build/deployment identity | Prevents evidence from being mistaken for another revision |

## Forms, commands, and cache behavior

Ant Design Form adapters translate generated C18 request models into controls and provider problems back into fields. Local rules cover required fields, parsable values, declared min/max bounds, duplicate visible lines, and cross-field usability. They do not duplicate inventory, purchasing, quota, authorization, or concurrency invariants.

Command controller state is `editing → confirming → submitting → succeeded | rejected | unknown → reconciling`. SH-010 creates one UUID at confirmation. The key and exact logical payload stay in memory for retry/reconciliation. A changed payload requires a new user confirmation and key. Mutations are never retried automatically by TanStack Query.

Successful mutations invalidate only keys declared by the generated operation integration map, always under the current session/context prefix. Context change clears all private keys. Safe reads may refetch according to NFR budgets; mutation outputs, membership, role, quota, freshness, and authorization are never inferred from stale cache entries.

## SSE behavior

AST-005 accepts only C18 same-origin streams and typed event envelopes. It verifies conversation/turn identity against the active subscription, ignores duplicate or decreasing event IDs, bounds rendered text/events, and closes immediately on session/context change. Reconnect uses the last accepted bounded cursor. If the cursor is expired, foreign, ahead, or unavailable, the controller obtains the authorized operation snapshot and continues from its terminal or current state. Disconnect never means cancellation, and a terminal UI state appears only from a terminal event or snapshot.

Streaming fragments use a non-live visual region; SH-017 announces meaningful phase and terminal changes. Sanitized Markdown excludes raw HTML. Links use allowlisted schemes and safe attributes. GenUI data is validated against the registry schema before React receives it.

## Accessibility, localization, and responsive contract

- SH-001 supplies skip navigation and semantic `header`, `nav`, `main`, and complementary landmarks.
- Every page has one logical H1; drawers and dialogs have names, descriptions, initial focus, focus trap, Escape behavior where safe, and invoking-control focus restoration.
- Tables expose captions, header associations, sort state, selection state, and keyboard actions. Charts always have textual summary/table alternatives.
- Error summaries link to invalid fields. Required indicators are textual and programmatic. Status never depends on color alone.
- Touch targets, focus appearance, reflow, zoom, contrast, reduced motion, and high-contrast behavior target WCAG 2.2 AA.
- All visible text and accessible names use translation keys. `Intl` formats retailer-local dates/times, quantities, percentages, numbers, and currencies. Layouts pass English, pseudo-localized expansion, and RTL development checks.
- Desktop uses persistent role-aware navigation and table/drawer compositions. Tablet may collapse navigation but keeps full workflows. Mobile uses navigation drawers and stacked read/review content; APP-006 applies the confirmed action boundary.

## Test seams

| Seam | Required evidence |
| --- | --- |
| Generated C18 client adapter | Contract generation/type checks, stable problem mapping, no direct-service client |
| Session/context providers | No-store bootstrap, `401` purge, cross-tab logout/context refresh, late-result rejection |
| Query-state components | Exhaustive typed states, freshness labels, action disabling, HTTP `200` complete/partial handling |
| Form/command controller | Field mapping, focus/error summary, one key per confirmation, duplicate suppression, reconciliation |
| Upload controller | 10 MiB CSV/25 MiB PDF limits, media/extension checks, progress, memory release, `202` operation |
| Purchasing components | Role presentation, evidence confirmation, locks, conflicts, mobile restrictions, partial/full receipts |
| Assistant controller/registry | SSE order/dedup/resume/snapshot, sanitization, unknown GenUI rejection, governed action handoff |
| Accessibility | Automated scans plus keyboard, focus, landmarks, names/states, screen reader, zoom/reflow, reduced motion |
| Localization/responsiveness | Missing-key checks, pseudo-loc, RTL, 360 px mobile boundary, tablet/desktop complete flows |
| Browser privacy | Storage/log inspection proving absence of tokens, CSRF secrets, private payloads, files, and drafts |

## Implementation dependencies and contract corrections

U1 must generate the complete C18 TypeScript client and operation models before feature implementation. The inception contract summary currently exposes only a subset of the operations required by these components. U1/U11 must define session/login/logout/context selection, all read workspaces, upload and operation reconciliation, purchasing Draft CRUD and transitions, assistant SSE/snapshot, audit, and reviewer-evidence contracts.

The C18 dashboard contract must use HTTP `200` with typed aggregate `complete` or `partial` state, replacing the stale HTTP `206` wording. Session models must expose a safe generation/context version suitable for query fencing. Operation contracts must support reconciliation by the original idempotency identity. Generated metadata must expose contract version for query keys and compatibility evidence.

Exact browser support, performance budgets, cache durations, polling/reconnect cadence, bundle budgets, and automated accessibility thresholds remain NFR Requirements decisions. They must not be embedded as invented constants during component implementation.
