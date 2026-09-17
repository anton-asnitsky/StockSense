# StockSense web-application functional-design questions

Date: 2026-09-15
Stage: Functional Design
Unit: web-application
Status: Awaiting consolidated summary confirmation

These questions resolve the remaining implementation-facing UI behavior for U12 across its 38 assigned stories and 138 acceptance criteria. Existing decisions remain fixed: React with TypeScript and Vite; Ant Design and Ant Design Charts; a professional analytical visual direction; role-aware left navigation with a retailer/context bar; exception-focused dashboard; table-plus-detail-drawer workspaces; master-detail purchasing review; contextual and full-page assistant surfaces; WCAG 2.2 AA; full desktop/tablet workflows; mobile read/review essentials; English first with multilingual extensibility; explicit loading, empty, error, stale, denied, quota, and recovery states; and U11 as the browser application's only network boundary.

## Interaction mode

The owner previously selected guided, one-question-at-a-time decisions for Functional Design, so this unit continues in that mode.

[Answer]: A. Guide me through each question (Recommended)

## Q1. Client routing and server-state architecture

Which React application architecture should U12 use for navigation and C18 data?

- A. React Router for route state, TanStack Query for C18 server state and mutations, U1-generated TypeScript clients, and component/context state for transient UI; add no general-purpose global business store unless a later measured need requires one (Recommended)
- B. Redux Toolkit for routes, all server responses, forms, and UI state, with handwritten fetch wrappers
- C. Keep all data and navigation state in page-level React components without a shared query/cache layer
- X. Other (please specify)

[Answer]: A. React Router for route state, TanStack Query for C18 server state and mutations, U1-generated TypeScript clients, and component/context state for transient UI; add no general-purpose global business store unless a later measured need requires one (Recommended)

## Q2. Session bootstrap and multi-tab behavior

How should the SPA react to session expiry, logout, Redis session loss, and changes made in another tab?

- A. Bootstrap from the no-store C18 session resource before rendering private routes; use `BroadcastChannel` only to signal logout and retailer-context refresh across tabs; on `401` clear query/UI state, preserve no private payload, and show a sign-in-required recovery screen without automatically replaying mutations (Recommended)
- B. Persist the complete session response and selected retailer in `localStorage` so tabs continue after BFF session loss
- C. Let every tab manage session state independently and discover logout only when its next API request fails
- X. Other (please specify)

[Answer]: A. Bootstrap the session through a no-store C18 endpoint before rendering private routes; use `BroadcastChannel` only to propagate logout and retailer-context refresh; on `401`, clear query and transient UI state, expose no private payload, present sign-in recovery, and never replay a mutation automatically (Recommended)

## Q3. Retailer routes and deep links

How should browser URLs represent retailer context and handle a deep link to a different or stale retailer?

- A. Use `/retailers/:retailerId/...` for retailer workspaces; before rendering, require the route to match the BFF-selected context; offer an explicit context-switch action when the retailer is currently authorized, otherwise show tenant-hidden/not-available state; never switch implicitly or replay pending mutations (Recommended)
- B. Keep retailer IDs out of URLs and store the current retailer only in browser memory
- C. Treat any retailer ID in a deep link as an automatic context switch and immediately load its data
- X. Other (please specify)

[Answer]: A. Use `/retailers/:retailerId/...` for retailer workspaces; before rendering, require the route to match the BFF-selected context; offer an explicit context-switch action when the retailer is currently authorized, otherwise show tenant-hidden/not-available state; never switch implicitly or replay pending mutations (Recommended)

## Q4. Forms and client validation

How should complex imports, purchase drafts, decisions, and receipts validate input?

- A. Use Ant Design Form with typed adapters around U1-generated request models; validate required shape, format, safe bounds, and cross-field UX constraints locally, while displaying provider validation as authoritative field/form errors; preserve unsent drafts only in session memory and warn before navigation (Recommended)
- B. Reimplement all provider business rules in the browser and block submission whenever client calculations disagree
- C. Perform no client validation and show only the provider's final problem response
- X. Other (please specify)

[Answer]: A. Use Ant Design Form with typed adapters around U1-generated request models; validate required shape, format, safe bounds, and cross-field UX constraints locally, while displaying provider validation as authoritative field/form errors; preserve unsent drafts only in session memory and warn before navigation (Recommended)

## Q5. Command confirmation and uncertain outcomes

How should the UI handle high-impact commands, double clicks, timeouts, reloads, and unknown outcomes?

- A. Create one UUID idempotency key when the user confirms a logical action, disable duplicate controls while pending, show the exact actor/action/retailer/version in an accessible Ant Design confirmation dialog for submit/approve/reject/cancel/receipt, and route timeout/unknown results to operation reconciliation before offering another action (Recommended)
- B. Retry timed-out commands automatically and generate a new key after each reload
- C. Use optimistic success for all commands and correct the UI later if a read disagrees
- X. Other (please specify)

[Answer]: A. Create one UUID idempotency key when the user confirms a logical action, disable duplicate controls while pending, show the exact actor/action/retailer/version in an accessible Ant Design confirmation dialog for submit/approve/reject/cancel/receipt, and route timeout/unknown results to operation reconciliation before offering another action (Recommended)

## Q6. Partial, stale, and unavailable data presentation

How should pages represent mixed dashboard/workspace outcomes without misleading users?

- A. Keep the last explicitly identified data visible only when its source version and observed time are shown; render independent section states with Ant Design Alert/Skeleton/Result, disable actions whose prerequisites are stale or unavailable, and use an aggregate `complete` or `partial` state from a `200` response rather than interpreting HTTP `206` as application partiality (Recommended)
- B. Clear the entire page whenever any section becomes stale or unavailable
- C. Continue showing cached data without freshness labels and keep all actions enabled
- X. Other (please specify)

[Answer]: A. Keep last-known data only with its version and timestamp visible; use section-level Ant Design Alert, Skeleton, and Result states; disable actions whose prerequisites are stale or unavailable; represent aggregate completeness as explicit `complete` or `partial` application state in an HTTP `200` response rather than HTTP `206` (Recommended)

## Q7. Upload progress and recovery

How should inventory, demand, supplier CSV, and supplier PDF uploads behave in the browser?

- A. Validate kind, extension, media type, and the 10 MiB CSV/25 MiB PDF limits before sending; use a progress-capable request to U11; keep the selected file only in memory; after `202`, switch to the operation resource; after disconnect or unknown admission, reconcile the same idempotency key before allowing resubmission (Recommended)
- B. Read and retain each entire file in browser storage so an interrupted upload can resume after sign-in
- C. Submit with ordinary form navigation and provide no progress or operation state
- X. Other (please specify)

[Answer]: A. Validate kind, extension, media type, and the 10 MiB CSV/25 MiB PDF limits before sending; use a progress-capable request to U11; keep the selected file only in memory; after `202`, switch to the operation resource; after disconnect or unknown admission, reconcile the same idempotency key before allowing resubmission (Recommended)

## Q8. Assistant streaming and generative UI

How should U12 render assistant SSE output and GenUI content safely?

- A. Use a strict allowlisted component registry for typed GenUI cards, tables, citations, comparisons, review requests, and purchase drafts; render ordinary prose with sanitized Markdown; deduplicate SSE events by turn/event ID, reconnect with the bounded cursor, fall back to the operation snapshot, and require normal human confirmation components for every governed action (Recommended)
- B. Allow the model to emit arbitrary HTML, Ant Design component names, and executable callbacks
- C. Render assistant output as plain text only and omit structured GenUI actions and evidence
- X. Other (please specify)

[Answer]: A. Use a strict allowlisted component registry for typed GenUI cards, tables, citations, comparisons, review requests, and purchase drafts; sanitize Markdown; deduplicate and resume SSE events with snapshot recovery; route every state-changing proposal through the standard human confirmation and authorization flow (Recommended)

## Q9. Mobile action boundary

Which actions should remain available at the 360 px mobile breakpoint?

- A. Support status, evidence, audit, assistant reading, retailer selection, and manager approve/reject after the same full evidence and confirmation flow; require tablet/desktop for imports, purchase-draft editing, cancellation, and receipt entry, with a clear explanation and preserved deep link (Recommended)
- B. Provide full parity for uploads, complex draft editing, and multi-line receipts at 360 px
- C. Make every authenticated screen read-only on mobile, including manager review decisions
- X. Other (please specify)

[Answer]: A. Support status, evidence, audit, assistant reading, retailer selection, and manager approve/reject after the same full evidence and confirmation flow; require tablet/desktop for imports, purchase-draft editing, cancellation, and receipt entry, with a clear explanation and preserved deep link (Recommended)

## Q10. Localization foundation

How should an English-first UI remain ready for future multilingual delivery?

- A. Use `react-i18next` from the first implementation; keep all user-facing strings, status labels, validation messages, dates, numbers, currencies, and plural rules behind stable keys and `Intl`; ship only English resources initially and include pseudo-localization plus RTL layout checks in development (Recommended)
- B. Hardcode English strings now and extract them only when a second language is selected
- C. Store translated UI text in backend responses and let each provider choose wording
- X. Other (please specify)

[Answer]: A. Use `react-i18next` from the first implementation; keep all user-facing strings, status labels, validation messages, dates, numbers, currencies, and plural rules behind stable keys and `Intl`; ship only English resources initially and include pseudo-localization plus RTL layout checks in development (Recommended)

## Ambiguity Scan

All ten functional questions are resolved. The choices are consistent with U12's existing visual, accessibility, tenant-isolation, security, and integration decisions and with U11 as the browser's only network boundary. No unresolved functional ambiguity blocks artifact generation.

The following quantitative choices remain intentionally deferred to NFR Requirements: response and interaction performance budgets, supported browser versions, automated accessibility thresholds, JavaScript bundle-size limits, test concurrency, and measurable streaming/reconnection timing. Those values refine quality targets without changing the functional behavior confirmed here.

## Consolidated Summary

1. **Application and data state:** U12 uses React Router for route state, TanStack Query for C18 queries and mutations, and U1-generated TypeScript clients. Components and narrowly scoped React context hold transient UI state. A general-purpose global business-state store is introduced only if a measured need emerges.
2. **Network and trust boundary:** The browser calls only U11 Web BFF through C18. It never calls domain services directly, handles service tokens, or performs authoritative business authorization. U11 and downstream providers remain authoritative for identity, tenant access, permissions, versions, and domain rules.
3. **Session lifecycle and browser storage:** Before rendering private routes, the SPA bootstraps through the no-store C18 session resource. Tabs use `BroadcastChannel` only for logout and retailer-context refresh signals. A `401`, logout, or Redis-backed session loss clears query and transient UI state, exposes no private payload, and presents sign-in recovery without replaying mutations. Private, session, retailer, file, and unsent business data are not persisted in `localStorage`, `sessionStorage`, IndexedDB, or browser caches.
4. **Retailer context and deep links:** Retailer workspaces use `/retailers/:retailerId/...`. The route must match U11's selected retailer context before data renders. An authorized mismatch offers an explicit context switch; an unauthorized or stale retailer remains hidden or unavailable. Context never changes implicitly, and pending work is never replayed across retailers.
5. **Forms and validation:** Ant Design Form binds through typed adapters to generated C18 models. The client validates required shape, format, safe bounds, and cross-field usability constraints, while provider validation remains authoritative and maps to field or form errors. Unsent drafts remain in memory for the current session, with navigation warnings for dirty forms.
6. **Commands and uncertain outcomes:** Submit, approve, reject, cancel, and receipt actions create one UUID idempotency key when the user confirms. Accessible confirmations identify the actor, action, retailer, and resource version; duplicate controls remain disabled while pending. A timeout, disconnect, or unknown result enters reconciliation for the original key before another command is allowed. The UI does not claim optimistic success for governed mutations.
7. **Partial, stale, and unavailable data:** Independent sections render explicit loading, empty, denied, unavailable, stale, and error states with Ant Design primitives. Last-known data remains visible only with its source version and observed time. Actions are disabled when required evidence or state is stale or unavailable. Aggregate endpoints express `complete` or `partial` application state in an HTTP `200` response rather than using HTTP `206` for application-level partiality.
8. **Uploads and long-running work:** Inventory, demand, and supplier CSV files are limited to 10 MiB; supplier PDFs are limited to 25 MiB. The client checks declared kind, extension, media type, and size, streams through a progress-capable request to U11, and keeps selected files only in memory. After `202 Accepted`, the UI follows the operation resource. Unknown admission reconciles the same idempotency key before resubmission.
9. **Assistant, SSE, and GenUI:** Assistant prose renders as sanitized Markdown. SSE handling deduplicates by turn/event identity, resumes with the bounded cursor, and falls back to an operation snapshot when needed. GenUI uses a strict registry of typed, allowlisted cards, tables, citations, comparisons, review requests, and purchase drafts; arbitrary HTML, component names, scripts, and callbacks are rejected. Every state-changing proposal uses the same authorization, evidence, and human-confirmation flow as conventional UI actions.
10. **Responsive boundary:** Desktop and tablet support the full workflow. At 360 px, users can inspect status, evidence, audit history, and assistant output, select a retailer, and approve or reject after the full evidence and confirmation flow. Imports, purchase-draft editing, cancellation, and receipt entry require tablet or desktop; mobile explains the boundary and preserves a deep link for continuation.
11. **Localization and accessibility:** `react-i18next` is present from the first implementation. All visible text, statuses, validation messages, dates, numbers, currencies, and plural rules use stable translation keys and `Intl`. English is the initial language; pseudo-localization and RTL checks protect future multilingual delivery. Existing WCAG 2.2 AA, keyboard, focus, semantic, and screen-reader requirements remain binding across conventional and generated UI.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct
