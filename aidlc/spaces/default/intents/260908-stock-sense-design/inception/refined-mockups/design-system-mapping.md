# StockSense design system mapping

Date: 2026-09-10
Status: Draft for owner approval

## Design system decision

StockSense uses React with TypeScript and Vite, Ant Design for interface components, and Ant Design Charts for analytical visualization. Package versions are selected and locked during implementation after compatibility and security checks; this design does not invent version numbers.

The visual direction is professional analytical: neutral working surfaces, restrained blue and teal accents, compact but readable data layouts, and strong semantic status treatment. The system must remain usable without color, animation or charts.

## Foundations

### Color roles

The following values are starting tokens, not unverified accessibility claims. Implemented foreground/background pairs must pass the contrast checks in `accessibility-checklist.md`.

| Role | Starting value | Use |
| --- | --- | --- |
| Primary | `#1677FF` | Primary action, active navigation, links where contrast passes |
| Analytical accent | `#08979C` | Secondary series and analytical emphasis |
| Canvas | `#F5F7FA` | Application background |
| Surface | `#FFFFFF` | Cards, tables, drawers and dialogs |
| Text primary | `#1F2329` | Main text |
| Text secondary | `#4E5969` | Supporting text that passes AA at final size |
| Border | `#D9D9D9` | Separation; never the only state signal |
| Success | Ant semantic success token | Completed/current/healthy with icon and label |
| Warning | Ant semantic warning token | Stale/partial/attention with icon and label |
| Error | Ant semantic error token | Failed/critical/forbidden with icon and label |
| Info | Ant semantic info token | Neutral system information |

Do not hard-code semantic colors in components. Theme tokens own color, focus and state values. Dark mode is not promised for the first release; token naming must keep it feasible later.

### Typography

| Token | Intended use |
| --- | --- |
| 28/36 semibold | Page title on large screens |
| 24/32 semibold | Page title on mobile; major section |
| 20/28 semibold | Drawer/dialog and card section headings |
| 16/24 medium | Navigation, table emphasis, controls |
| 14/22 regular | Default UI and table text |
| 12/20 regular | Metadata only when contrast and zoom remain compliant |
| Monospace 13/20 | IDs, checksums and correlation references; never long prose |

Use the system/Ant Design font stack. Preserve browser zoom and user font scaling. Avoid truncating identity, product and evidence names without an accessible full-value mechanism.

### Spacing and sizing

Use an 8px base rhythm with 4px for tight internal alignment. Common spacing tokens are 4, 8, 12, 16, 24, 32 and 48px. Interactive targets must meet WCAG 2.2 target-size requirements or documented spacing exceptions; primary mobile actions target at least 44px height.

| Element | Density direction |
| --- | --- |
| Page gutter | 24px desktop, 16px tablet/mobile |
| Card gap | 16px desktop/tablet, 12px mobile |
| Table row | Ant middle size by default; small only after accessibility validation |
| Drawer width | 420px standard, 560–720px evidence-heavy, full screen mobile |
| Sidebar | 232px expanded; Ant collapsed width when compact |
| Assistant panel | 360–380px desktop; overlay/full screen at smaller widths |

### Shape and elevation

Use restrained 6–8px radii. Elevation distinguishes overlays and sticky controls; it does not replace borders, headings or landmarks. Avoid decorative gradients in primary workspaces.

### Motion

Transitions remain under 200ms for navigation affordances and under 300ms for drawers/dialogs. Respect `prefers-reduced-motion`. Do not animate numeric changes in ways that delay reading or create false precision.

## Ant Design component mapping

| UX pattern | Ant Design component direction | StockSense constraints |
| --- | --- | --- |
| Application frame | `Layout`, `Sider`, `Header`, `Content` | Semantic landmarks must remain valid; collapsed nav retains accessible labels |
| Primary navigation | `Menu` | Role-filtered; active route uses text/icon and current-page semantics |
| Mobile navigation | `Drawer` plus `Menu` | One temporary surface; focus return required |
| Retailer context | `Select` or accessible combobox pattern | Choices come only from current memberships; active retailer repeated in heading |
| Breadcrumb | `Breadcrumb` | Use only for hierarchy/return context, not as sole navigation |
| Overview metrics | `Card`, `Statistic`, `Badge` | Every card links to an action/filter; unavailable differs from zero |
| Status | `Tag`, `Badge`, `Alert`, icons | Always pair color with text and icon/shape |
| Operational lists | `Table` | Server pagination/filter/sort; real headers; explicit action controls |
| Mobile lists | `List`, `Card`, `Descriptions` | Only priority fields; preserve evidence/status/actions |
| Filters | `Form`, `Input.Search`, `Select`, `DatePicker`, `Button` | Visible labels; clear/reset; URL-state where safe |
| Detail surface | `Drawer`, `Tabs`, `Descriptions`, `Timeline` | Drawer on desktop/tablet; full route/screen on mobile |
| Import | `Upload`, `Steps`, `Progress`, `Table`, `Result` | Review-before-commit; diagnostics downloadable; no hidden partial policy |
| Draft line editing | `Form`, `InputNumber`, `Table` | Draft-only editing; on-blur and submit validation |
| Confirmation | `Modal` | Specific verb; retailer/version/consequence; never nested |
| Result state | `Result`, `Alert`, `Empty`, `Skeleton`, `Spin` | Match shared state taxonomy; spinner needs a name and delayed message |
| Notifications | `App` message/notification APIs | Supplement inline result; never sole evidence |
| Audit/evidence history | `Timeline`, `Descriptions`, `Table` | Correlation/version identifiers and stable links |
| Assistant panel | `Drawer` or layout `Sider`, `List`, `Input.TextArea` | Labeled conversation log; tool previews; citations and provider state |
| Assistant full workspace | `Layout`, `Splitter` if chosen and accessible, `Tabs`, `Drawer` | Preserve keyboard path; resizing cannot be pointer-only |
| Purchasing queue | `Table`/`List`, `Flex`, `Descriptions`, `Form` | Master-detail with authoritative capability controls |
| Error boundary | `Result`, `Alert`, retry `Button` | State effect and recovery in plain language |
| Help | `Popover`, `Tooltip`, inline text | Essential instructions remain visible; tooltip is supplemental |

Use native HTML elements when they express semantics better than a component abstraction. Ant Design behavior must be verified rather than assumed accessible.

## Screen-to-component composition

| Screen | Primary composition |
| --- | --- |
| UI-00 Sign-in | `Card` + vertical `Form` + `Input` + explicit `Button` + `Alert`/`Result` |
| UI-01 Overview | responsive `Row`/`Col` + action `Card` + `Table` + chart region |
| UI-02 Import center | `Steps` + `Upload` + `Form` + validation `Table` + review `Descriptions` |
| UI-03 Inventory | filter `Form` + `Table` + `Drawer` + `Tabs` + `Timeline` |
| UI-04 Forecasts | selector `Form` + Ant Design Charts + text summary + `Table` + evidence `Descriptions` |
| UI-05 Replenishment | allowance `Alert`/`Statistic` + `Table` + `Drawer` + request `Modal` |
| UI-06 Draft proposal | editable `Form`/`Table` + totals `Statistic` + review `Modal` |
| UI-07 Purchase review | responsive `Flex` split + queue `Table` + detail `Descriptions` + decision `Form` |
| UI-08 Receipts | order `Descriptions` + progress `Steps`/`Progress` + receipt `Form`/`Table` |
| UI-09 Suppliers | supplier `Tabs` + document `Table` + upload `Drawer` + extraction `Alert` |
| UI-10 Assistant panel | `Drawer`/secondary `Sider` + conversation `List` + prompt `Form` + citations |
| UI-11 Assistant workspace | multi-region `Layout` + history `List` + evidence `Tabs`/`Drawer` |
| UI-12 Model operations | run `Table` + comparison charts + version/evaluation `Descriptions` + promotion `Modal` |
| UI-13 Operations | health `Card` grid + procedure `List` + evidence `Table` + safe external links |
| UI-14 Audit/observability | filter `Form` + virtualized or paginated `Table` + trace `Drawer`/`Timeline` |
| UI-15 Reviewer | `Steps` + evidence status `Table` + stable-link `List` + setup `Result` states |

## Status taxonomy

| Meaning | Label examples | Component direction | Required non-color cue |
| --- | --- | --- | --- |
| Current/healthy | Current, Healthy, Ready | success `Tag`/`Badge` | check icon and text |
| Attention | Warning, Due, Partial | warning `Tag`/`Alert` | warning icon and reason |
| Critical/failed | Critical, Failed, Denied | error `Tag`/`Alert` | error icon, heading and recovery |
| Stale | Stale | warning `Tag` plus timestamp | clock/history icon and age |
| Unavailable | Unavailable | neutral/error `Result` by impact | explicit word and dependency |
| Pending | Queued, Running, Saving | processing status plus progress | operation name and current step |
| Uncertain | Checking outcome | warning `Alert` | explicit “do not retry yet” text |
| Terminal | Rejected, Cancelled, Received | semantic tag | exact terminal label |

Status vocabulary must match domain contracts. UI wording cannot create extra purchasing states.

## Chart mapping

| Analytical need | Ant Design Charts direction | Required alternative |
| --- | --- | --- |
| Demand forecast with interval | Line/area combination | Summary plus date/value/interval table |
| Candidate versus baseline | Multi-series line and metric comparison | Metrics table with absolute values and deltas |
| Inventory trajectory | Line/step plot with event markers | Chronological balance table and movement list |
| Shortage severity mix | Bar chart when it adds value | Sorted count table |
| Evaluation metrics | Small multiples or grouped bars | Metric definition/value table |
| Resource usage | Time series with limit reference | Peak/p95/limit text and table |

Charts must not encode series by color alone. Use line style, marker shape, direct labels or a clearly associated legend. Tooltips are supplemental; all exact values remain keyboard and screen-reader accessible outside hover.

## Responsive mapping

Use Ant Design responsive tokens as implementation primitives while honoring the product promises below.

| Range | Product promise | Layout rule |
| --- | --- | --- |
| `<576px` | Mobile read/review essentials | One column; navigation/assistant/details become full-screen surfaces; cards replace dense tables |
| `576–767px` | Large mobile read/review essentials | Same capability boundary with more metadata per card |
| `768–1023px` | Full tablet workflow | Collapsed sidebar; overlay drawers; horizontally scrollable tables with sticky identity/action columns |
| `1024–1439px` | Full desktop workflow | Persistent shell; table plus standard drawer; master-detail where useful |
| `>=1440px` | Full desktop workflow | Constrained reading width; expanded evidence regions without stretching text |

Breakpoint behavior is tested at boundaries and intermediate widths. Browser zoom to 400% may trigger the compact/mobile layout without loss of required functionality.

## Form conventions

- Labels are visible and placed above fields.
- Optional fields are identified; placeholders never replace labels.
- Validate on blur and on submission. Do not produce disruptive errors on every keystroke.
- Error summary links to each invalid field.
- Disabled actions include visible explanatory text; a tooltip alone is insufficient.
- Numeric fields state unit, range, pack/minimum rule and rounding behavior.
- Date/time fields identify the retailer-local zone, with UTC available in detail.
- Autosave reports Saving, Saved and Unsaved changes; consequential transitions remain explicit.

## Table conventions

- Server-driven filters, sort and pagination are reflected in the URL when safe.
- Column headings use buttons for sorting and expose ascending/descending state.
- Tables show total count and current range.
- Empty source and empty filtered results use different messages.
- Sticky columns are limited to identity and primary action; horizontal scroll is announced by visible affordance.
- Row selection never depends on clicking arbitrary row whitespace; use a named link/button.
- Bulk actions are introduced only by approved stories and must expose selected count and confirmation effects.

## Overlay conventions

- Use drawers for inspectable detail that benefits from retained list context.
- Use full pages for long assistant sessions, model evidence and complex operational procedures.
- Use dialogs only for focused input or consequential confirmation.
- Never nest a dialog. If more evidence is needed, cancel/close and open the appropriate drawer/page with a return path.
- Opening an overlay moves focus to its heading; closing returns focus to the trigger unless that trigger no longer exists, in which case focus moves to the nearest stable heading.

## Theme implementation boundary

Implementation may use Ant Design `ConfigProvider` theme tokens and component overrides. It must avoid broad CSS overrides that break documented states, focus rings, forced colors or responsive behavior. Any deviation from an Ant component’s standard keyboard model requires an explicit accessibility test and rationale.

## Alternatives considered

| Alternative | Benefit | Reason not selected |
| --- | --- | --- |
| Bespoke component system | Maximum visual control | Adds portfolio scope and accessibility risk without product value |
| Top navigation | More horizontal space | StockSense has too many persistent task areas and role contexts |
| Card-first operational UI | Friendly visual presentation | Weak for high-density comparison and audit/evidence work |
| Apache ECharts | Broad advanced visualization set | More integration work than needed for the initial analytical views |
| Full mobile feature parity | Broad reach | Dense import and model/purchasing authoring would expand design/test scope beyond the selected local portfolio promise |

## Traceability

This mapping implements the confirmed UI technology constraint and Refined Mockups decisions while supporting NFR14 accessibility, NFR11 reproducible local review, NFR3/NFR5 visible tenant/session context and the browser obligations referenced by all UI stories. `mockups.md` maps every story to a screen or explicit non-UI handling; `interaction-spec.md` defines behavior; `accessibility-checklist.md` defines evidence required before claiming conformance.
