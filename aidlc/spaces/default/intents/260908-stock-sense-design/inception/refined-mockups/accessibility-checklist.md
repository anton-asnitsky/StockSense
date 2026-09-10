# StockSense accessibility checklist

Date: 2026-09-10
Target: WCAG 2.2 Level AA
Status: Design checklist; implementation evidence pending

## Scope and claim boundary

This checklist applies to all browser screens and reusable components in `mockups.md` and `interaction-spec.md`, including Ant Design and Ant Design Charts integrations. It records design requirements and future verification evidence. It does not claim that an implementation exists or conforms.

The first release supports full desktop and tablet workflows. Mobile supports essential reading, evidence inspection and safe approval/rejection where the governing role and domain state permit the action. Accessibility requirements apply to every supported capability at every promised width.

## WCAG 2.2 AA design coverage

| WCAG area | StockSense requirement | Planned evidence | Status |
| --- | --- | --- | --- |
| 1.1.1 Non-text content | Meaningful icons and images have accessible names; decorative assets are ignored | Automated scan plus screen-reader inspection | Planned |
| 1.3.1 Info and relationships | Headings, landmarks, forms, tables, lists and status relationships use semantic markup | DOM review and screen-reader navigation | Planned |
| 1.3.2 Meaningful sequence | Reading and focus order remain logical across responsive reflow | Keyboard and screen-reader walkthrough | Planned |
| 1.3.3 Sensory characteristics | Instructions do not depend only on position, shape or color | Copy review | Planned |
| 1.3.4 Orientation | Supported workflows do not force one orientation without necessity | Responsive device/emulation check | Planned |
| 1.3.5 Identify input purpose | Common identity and contact inputs expose appropriate purpose/autocomplete | DOM review | Planned |
| 1.4.1 Use of color | Status and chart series use text, icons, patterns or markers with color | Visual and forced-colors review | Planned |
| 1.4.3 Contrast minimum | Normal text reaches 4.5:1; large text reaches 3:1 | Automated and manual contrast measurement | Planned |
| 1.4.4 Resize text | 200% text resize preserves content and controls | Browser zoom/text test | Planned |
| 1.4.10 Reflow | Supported content works at 320 CSS px equivalent without two-dimensional scrolling except essential tables/charts | 400% zoom and viewport tests | Planned |
| 1.4.11 Non-text contrast | Focus, controls, status boundaries and meaningful graphics reach 3:1 | Manual contrast measurement | Planned |
| 1.4.12 Text spacing | User-applied spacing does not clip or overlap essential content | WCAG text-spacing bookmarklet/test | Planned |
| 1.4.13 Content on hover/focus | Supplemental overlays are dismissible, hoverable and persistent where applicable | Keyboard/pointer inspection | Planned |
| 2.1.1 Keyboard | All supported functionality works without a pointer | Full keyboard walkthrough | Planned |
| 2.1.2 No keyboard trap | Focus can leave every component; modals provide a defined exit when safe | Keyboard walkthrough | Planned |
| 2.1.4 Character key shortcuts | Single-character shortcuts are absent or can be disabled/remapped | Shortcut inventory | Planned |
| 2.2.1 Timing adjustable | User tasks have no unexplained time limit; session expiry provides recovery | Session/timeout tests | Planned |
| 2.2.2 Pause, stop, hide | Auto-updating views can pause or avoid disruptive refresh; motion respects user settings | Interaction test | Planned |
| 2.3.1 Three flashes | No flashing content above threshold | Visual review | Planned |
| 2.4.1 Bypass blocks | Skip-to-main is the first focusable control | Keyboard/DOM check | Planned |
| 2.4.2 Page titled | Route titles identify page and retailer context where safe | Route test | Planned |
| 2.4.3 Focus order | Focus follows reading/task order after route and overlay changes | Keyboard walkthrough | Planned |
| 2.4.4 Link purpose | Link purpose is clear from text or programmatic context | Automated/manual review | Planned |
| 2.4.5 Multiple ways | Primary areas are reachable through navigation and contextual links | Navigation review | Planned |
| 2.4.6 Headings and labels | Headings and labels describe topic or purpose | Content review | Planned |
| 2.4.7 Focus visible | Every interactive element has a visible focus indicator | Keyboard and visual check | Planned |
| 2.4.11 Focus not obscured minimum | Sticky headers, drawers and banners do not fully hide focused controls | Boundary viewport tests | Planned |
| 2.5.1 Pointer gestures | No multipoint/path gesture is required | Pointer/touch review | Planned |
| 2.5.2 Pointer cancellation | Actions occur on up-event or allow cancellation/undo | Interaction test | Planned |
| 2.5.3 Label in name | Accessible names contain visible control labels | Accessibility tree review | Planned |
| 2.5.4 Motion actuation | No motion-only input is required | Feature inventory | Planned |
| 2.5.7 Dragging movements | Any drag operation has a non-drag alternative | Interaction test | Planned |
| 2.5.8 Target size minimum | Targets meet 24×24 CSS px or an allowed spacing/equivalent exception; mobile primary actions target 44px | Computed-size test | Planned |
| 3.1.1 Language of page | HTML language is English initially | DOM check | Planned |
| 3.2.1 On focus | Focus alone does not change context | Keyboard test | Planned |
| 3.2.2 On input | Input changes do not submit or navigate without warning/action | Form test | Planned |
| 3.2.3 Consistent navigation | Shell and repeated controls remain consistent | Cross-screen review | Planned |
| 3.2.4 Consistent identification | Repeated icons/actions use consistent names and behavior | Component audit | Planned |
| 3.2.6 Consistent help | Help/assistant access remains in a consistent location | Cross-screen review | Planned |
| 3.3.1 Error identification | Errors are identified in text and associated with fields/actions | Form/error tests | Planned |
| 3.3.2 Labels or instructions | Inputs have visible labels and necessary formats/constraints | Form review | Planned |
| 3.3.3 Error suggestion | Correctable errors include concrete guidance | Content and validation tests | Planned |
| 3.3.4 Error prevention | Purchasing, receipts, imports and promotions use review/confirm and authoritative validation | End-to-end workflow tests | Planned |
| 3.3.7 Redundant entry | Previously provided values are reused or selectable where safe | Workflow review | Planned |
| 3.3.8 Accessible authentication minimum | Login does not depend on a cognitive function test without an alternative | Authentication review | Planned |
| 4.1.2 Name, role, value | Custom/Ant controls expose valid roles, names, values and states | Automated scan and accessibility-tree review | Planned |
| 4.1.3 Status messages | Loading, success, warning and failure updates are announced without unnecessary focus movement | Screen-reader test | Planned |

Criteria not relevant to the implemented content must be recorded as Not applicable with evidence rather than omitted from the final conformance review.

## Global keyboard checklist

- [ ] Skip link is first in tab order and moves focus to the main heading.
- [ ] Sidebar, mobile navigation and assistant controls are reachable and have visible focus.
- [ ] Retailer selection works using standard combobox keys.
- [ ] Route changes move focus to the new page heading.
- [ ] Tables expose interactive links/buttons without requiring row-click behavior.
- [ ] Sort direction is announced and can be changed from the keyboard.
- [ ] Filters can be applied and reset without a pointer.
- [ ] Drawers and dialogs receive focus on open and return it on close.
- [ ] Modal dialogs trap focus and Escape cancels when cancellation is safe.
- [ ] Tabs follow the ARIA tabs keyboard model.
- [ ] Tooltips are supplemental; essential information is available without hover.
- [ ] Charts have keyboard-reachable controls and non-chart alternatives.
- [ ] Assistant streaming never steals focus or announce every token.
- [ ] Dragging, if introduced, has buttons or another keyboard alternative.
- [ ] No hidden focusable elements remain behind closed overlays.

## Focus management by event

| Event | Required focus outcome |
| --- | --- |
| Route navigation | Main page heading receives programmatic focus |
| Retailer change success | Focus remains on selector; change is announced; new page data loads without stealing focus |
| Retailer change failure/revocation | Focus moves to the actionable alert or no-access heading |
| Detail drawer open | Drawer heading receives focus; originating row/button is remembered |
| Detail drawer close | Focus returns to originating control or nearest stable list heading |
| Dialog open | Dialog title receives focus; focus is contained |
| Dialog validation failure | Error summary receives focus and links to invalid controls |
| Dialog cancel | Focus returns to trigger |
| Successful consequential action | Result heading receives focus; outcome is announced once |
| Background job progress | Focus remains unchanged; polite status region updates at meaningful milestones |
| Session expiry | Focus moves to session-expired alert; uncertain mutation is identified |
| Conflict/stale response | Focus moves to conflict heading; reload action follows in order |

## Screen-specific checklist

### UI-00 Sign-in and access recovery

- [ ] Email/password controls have persistent labels and suitable autocomplete attributes.
- [ ] Local and Google sign-in methods have distinct accessible names.
- [ ] Error copy does not expose whether an account exists.
- [ ] Callback/PKCE/state failures provide a keyboard-reachable return action.
- [ ] No-access state identifies the user and provides provisioning guidance without self-assignment.
- [ ] Password managers and paste are not blocked.

### UI-01 Overview

- [ ] Exception cards are real links/buttons with outcome-oriented labels.
- [ ] Metric cards distinguish zero, unavailable and loading.
- [ ] Severity is conveyed by text and icon, not color alone.
- [ ] Chart summaries and tables contain the same decision-relevant values.
- [ ] Auto-refresh can be paused or does not disrupt focus/reading.

### UI-02 Import center

- [ ] Upload control works without drag-and-drop.
- [ ] Progress exposes a name, value and stage.
- [ ] Validation summary identifies accepted, rejected and pending counts.
- [ ] Row diagnostics associate field, value, reason and correction.
- [ ] Error summary links to relevant controls or diagnostics.
- [ ] Review-before-commit explains authoritative effect and batch policy.

### UI-03 Inventory

- [ ] Table caption/heading identifies retailer and dataset freshness.
- [ ] Sort buttons announce column and direction.
- [ ] Pagination exposes current range and total.
- [ ] Empty source and empty filter states are distinguishable.
- [ ] Drawer focus and return behavior work after filtering or refresh.
- [ ] Movement values include sign, unit and resulting balance in text.

### UI-04 Forecasts

- [ ] Forecast chart has a concise text summary and exact data table.
- [ ] Candidate, baseline and interval differ by more than color.
- [ ] Model/data versions and cutoff are readable without hover.
- [ ] Stale and unavailable states explain downstream consequences.
- [ ] Metric abbreviations have definitions available in context.

### UI-05 Replenishment

- [ ] Remaining manual-review allowance and reset time are text.
- [ ] Disabled request action has visible explanation and alternative.
- [ ] Request confirmation names quota effect.
- [ ] Job status updates are polite and do not steal focus.
- [ ] Calculation evidence has a logical reading order.

### UI-06 through UI-08 Purchasing and receipts

- [ ] Editable fields exist only for states and roles that permit editing.
- [ ] Quantity controls expose unit, pack/minimum constraints and errors.
- [ ] Approval/rejection/cancel buttons name the target proposal/order.
- [ ] Confirmation includes retailer, identifier, version and consequences.
- [ ] Decision reason requirements are announced before submission.
- [ ] Partial/full receipt totals are expressed in text per line.
- [ ] Conflict, duplicate and uncertain outcomes never appear as success.
- [ ] Mobile decision controls remain separated to prevent accidental activation.

### UI-09 Supplier knowledge

- [ ] Upload has browse alternative and supported-format instructions.
- [ ] Extraction/index stages and partial warnings are text.
- [ ] Document source, version and checksum are available to assistive technology.
- [ ] Extracted tables preserve headers or provide a linearized alternative.
- [ ] Delete confirmation explains source and projection effects.

### UI-10 and UI-11 Assistant

- [ ] Conversation has a labeled log structure and text speaker identity.
- [ ] Prompt has a visible label; Send and Stop have distinct names.
- [ ] Streaming output is grouped and announced at meaningful completion points.
- [ ] Citations are keyboard reachable and include source/version context.
- [ ] Tool activity distinguishes requested, running, denied, failed and completed.
- [ ] Proposed mutation opens the owning domain confirmation; chat itself cannot approve.
- [ ] Provider/retrieval degradation is explicit.
- [ ] Full-screen mobile assistant preserves a clear back path and context label.

### UI-12 through UI-15 Operations and reviewer evidence

- [ ] Run/deployment/recovery evidence identifies revision and timestamp.
- [ ] Logs and traces use semantic tables/lists and bounded pagination.
- [ ] Charts have exact-value alternatives.
- [ ] Missing evidence is labeled missing rather than silently omitted.
- [ ] External/documentation links disclose destination where useful.
- [ ] Reviewer steps reflect observed completion and remain keyboard operable.

## Forms and error handling

- [ ] Every input has a visible label and programmatic association.
- [ ] Required/optional state is conveyed in text.
- [ ] Format, range, currency, time zone and unit instructions precede errors.
- [ ] Validation occurs on blur and submission without disruptive per-keystroke announcements.
- [ ] Error summary appears before the form, receives focus after failed submission and links to fields.
- [ ] Field errors explain how to correct the value.
- [ ] Server errors explain the effect: committed, not committed or uncertain.
- [ ] Disabled controls expose a visible reason; disabled elements are not the only route to that explanation.
- [ ] Success appears inline near the initiating workflow and includes an authoritative identifier/evidence link.

## Data table checklist

- [ ] Use semantic table elements for tabular data.
- [ ] Each table has an accessible name or associated heading.
- [ ] Header scope and sort state are programmatic.
- [ ] Interactive content uses buttons/links with descriptive names.
- [ ] Row selection is not required to access the primary action.
- [ ] Sticky headers/columns do not obscure keyboard focus at supported zoom.
- [ ] Horizontal scroll has a visible cue; non-essential columns can collapse responsively.
- [ ] Mobile cards preserve labels rather than presenting unlabeled values.
- [ ] Loading skeletons are hidden from the accessibility tree or labeled once.
- [ ] Virtualization, if used, is tested with screen readers and does not corrupt row counts/position.

## Chart checklist

- [ ] Chart purpose and conclusion appear in visible text.
- [ ] Exact values are available in a table.
- [ ] Series use labels plus line style/marker/pattern, not color alone.
- [ ] Legend controls, if interactive, are keyboard operable and announce state.
- [ ] Tooltips are supplemental and do not contain unique information.
- [ ] SVG/canvas output has an appropriate accessible name or is hidden when the alternative carries meaning.
- [ ] Reduced-motion preference disables non-essential transitions.
- [ ] High contrast and forced-colors modes retain series identification.

## Status and live-region policy

| Update | Announcement |
| --- | --- |
| Page/data load begins | One polite named status when delay is meaningful |
| Page/data load completes | Polite result count/summary; no focus movement |
| Background job milestone | Polite, throttled milestone message |
| Form validation on submit | Focused error summary; assertive only when needed |
| Consequential mutation succeeds | Focused result heading plus one polite announcement |
| Consequential mutation fails | Focused actionable alert |
| Session expires | Assertive actionable alert and focus move |
| Assistant stream | No token announcements; one completion/interruption summary |
| Retailer context changes | Polite confirmation naming new retailer |

Avoid multiple simultaneous live regions announcing the same update.

## Responsive and zoom checklist

- [ ] Test 360, 375, 576, 767, 768, 1023, 1024, 1280 and 1440px widths.
- [ ] Test 200% and 400% browser zoom.
- [ ] At compact widths, navigation, assistant and details become distinct surfaces with headings and back/close controls.
- [ ] Essential read/review/approval flows remain available on mobile.
- [ ] Dense authoring features outside the mobile promise provide clear guidance rather than broken controls.
- [ ] No fixed-height region clips validation, status or translated/long content.
- [ ] Touch targets and spacing meet the selected WCAG target.
- [ ] Landscape and portrait preserve supported mobile review tasks.

## Automated verification plan

Run against implemented routes and component stories:

- axe-core checks integrated with component and end-to-end tests.
- eslint accessibility rules appropriate to React/JSX.
- Lighthouse accessibility audit as supporting evidence, not the sole gate.
- Automated color-contrast checks for token combinations and component states.
- DOM assertions for labels, roles, names, descriptions, expanded/selected/sort state and live regions.
- Keyboard-focused end-to-end tests for critical flows.

Automated tools cannot establish full conformance. Their pass must be supplemented by manual evidence.

## Manual verification plan

- [ ] Complete every critical workflow using keyboard only.
- [ ] Test NVDA with a supported Windows browser for shell, forms, tables, dialogs, drawers, assistant and charts.
- [ ] Inspect the browser accessibility tree for custom/Ant component names, roles, values and relationships.
- [ ] Test high contrast/forced colors and reduced motion.
- [ ] Test text spacing, 200% text size and 400% zoom.
- [ ] Verify contrast for all normal, hover, focus, disabled, selected, stale, warning and error states.
- [ ] Verify focus is never obscured by sticky headers, bottom action bars, assistant surfaces or notifications.
- [ ] Verify mobile read/review/approval tasks with touch and keyboard/switch-equivalent navigation where available.

## Critical journey evidence matrix

| Journey | Automated evidence | Manual evidence |
| --- | --- | --- |
| Sign in/select retailer | labels, errors, route focus, tenant UI state | keyboard + NVDA walkthrough |
| Import and diagnostics | step/status semantics, error links | keyboard diagnostics and review-before-commit |
| Inventory and drawer | table semantics, focus restoration | keyboard + NVDA table/drawer |
| Forecast comparison | alternative table presence | chart/color/forced-colors review |
| Request replenishment | quota text, disabled reason | confirmation and live-status walkthrough |
| Draft/submit proposal | form labels/errors, confirmation name | keyboard error recovery |
| Approve/reject/cancel | button names, dialog semantics | mobile and desktop manager walkthrough |
| Record receipt | cumulative validation relationships | keyboard partial/full receipt walkthrough |
| Supplier document | upload alternative/status | extraction warning and source review |
| Assistant/tool preview | log semantics, focus, citation names | NVDA conversation and governed action handoff |
| Operations/reviewer evidence | headings, links, table semantics | full reviewer journey at zoom/keyboard |

## Definition of done for accessibility

The browser experience may claim the selected target only when:

- All applicable WCAG 2.2 Level A and AA criteria have an evidence disposition.
- Critical journey automated checks pass in CI.
- Keyboard-only and NVDA walkthroughs pass for supported workflows.
- Token and component-state contrast is measured, including focus and disabled/read-only distinctions.
- Charts have equivalent summaries/tables and non-color series differentiation.
- Desktop, tablet, mobile-essential and zoom/reflow checks pass at agreed browser versions.
- Known exceptions are documented with impact, workaround, owner and remediation plan.
- Evidence links identify the tested revision; no certification or conformance claim is inferred from this design document alone.

## Traceability

This checklist operationalizes NFR14 and the browser obligations attached to every UI story, especially AC1.1.4, AC1.4.4–AC1.4.5, AC2.3.2, AC5.5.1–AC5.5.5, AC7.4.4, AC7.10.4 and AC10.1.4. Security and domain authorization remain independently tested; an accessible control does not imply the user is authorized to invoke it.
