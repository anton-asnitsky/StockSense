# StockSense Web Application NFR Requirements Questions

Date: 2026-09-20
Stage: NFR Requirements
Unit: web-application
Status: In progress

The approved baseline is a React/TypeScript/Vite SPA using Ant Design, Ant
Design Charts, React Router, TanStack Query, generated C18 clients,
`react-i18next`, and `Intl`. The browser calls only the same-origin U11 BFF,
retains private state in memory only, presents explicit complete/partial/stale/
unavailable states, and routes every governed action through confirmation and
provider authority. These questions quantify the remaining browser quality
profile without changing that functional boundary.

## Interaction mode

Continue with the established guided-question workflow.

- A. Guide me through each question (Recommended)
- B. I will edit this file directly
- C. Answer all questions in chat
- X. Other (please specify)

[Answer]: A. Guide me through each question (Recommended)

## Q1. Browser performance and interaction targets

Which warmed local browser profile should core routes meet?

- A. Under five concurrent local users, preserve the inception target of below one second p95 for ordinary inventory and purchasing C18 reads including authentication/authorization; require private-route main content within 1.5 seconds p95 after navigation when that API target is met, LCP at or below 2.5 seconds p75, INP at or below 200 ms p75, and CLS at or below 0.1 p75; run at least 30 measured journeys per core route and retain the separate five-minute/500-request API evidence (Recommended)
- B. Require only Lighthouse score 80 or higher without route-level latency or interaction thresholds
- C. Measure browser performance without release thresholds
- X. Other (please specify)

[Answer]: A. Under five concurrent local users, preserve the inception target of below one second p95 for ordinary inventory and purchasing C18 reads including authentication/authorization; require private-route main content within 1.5 seconds p95 after navigation when that API target is met, LCP at or below 2.5 seconds p75, INP at or below 200 ms p75, and CLS at or below 0.1 p75; run at least 30 measured journeys per core route and retain the separate five-minute/500-request API evidence (Recommended)

## Q2. JavaScript and CSS delivery budgets

Which production bundle profile should Vite enforce?

- A. Limit the gzip-compressed public/authentication entry to 300 KiB JavaScript and 75 KiB CSS, the first authenticated dashboard load to 600 KiB cumulative JavaScript, and each lazy feature chunk to 250 KiB; require route-level code splitting, selective Ant Design/icon imports, dependency attribution, and a CI failure on any absolute budget breach (Recommended)
- B. Allow 1 MiB initial JavaScript and report bundle growth without blocking CI
- C. Leave bundle size and code splitting implementation-defined
- X. Other (please specify)

[Answer]: A. Limit the gzip-compressed public/authentication entry to 300 KiB JavaScript and 75 KiB CSS, the first authenticated dashboard load to 600 KiB cumulative JavaScript, and each lazy feature chunk to 250 KiB; require route-level code splitting, selective Ant Design/icon imports, dependency attribution, and a CI failure on any absolute budget breach (Recommended)

## Q3. Browser and viewport support matrix

Which browser compatibility profile should U12 support?

- A. At test time, support the latest two stable Chrome, Edge, and Firefox releases plus the current Safari major through standards-compatible code and Playwright WebKit coverage; test 360x800, 768x1024, and 1440x900 viewports; preserve the confirmed limited 360 px action set and full tablet/desktop workflows; fail with an explicit unsupported-browser screen when required capabilities are absent (Recommended)
- B. Support only the current Chrome desktop release
- C. Claim evergreen-browser support without a tested matrix
- X. Other (please specify)

[Answer]: A. At test time, support the latest two stable Chrome, Edge, and Firefox releases plus the current Safari major through standards-compatible code and Playwright WebKit coverage; test 360x800, 768x1024, and 1440x900 viewports; preserve the confirmed limited 360 px action set and full tablet/desktop workflows; fail with an explicit unsupported-browser screen when required capabilities are absent (Recommended)

## Q4. Accessibility verification thresholds

Which measurable WCAG 2.2 AA gate should apply?

- A. Require zero axe-core Critical or Serious violations on every core route/state; complete all core journeys by keyboard; verify focus order/restoration, names/roles/states, live-region behavior, contrast, reduced motion, 200% zoom, 400% text/reflow, 360 px layout, chart/table equivalence, pseudo-localization, and RTL; manually spot-check the critical sign-in, retailer, purchase decision, receipt, assistant, and audit journeys with NVDA plus Chrome while making no accessibility-certification claim (Recommended)
- B. Run automated axe checks only and allow Serious findings with documented notes
- C. Rely on Ant Design defaults without application-level verification
- X. Other (please specify)

[Answer]: A. Require zero axe-core Critical or Serious violations on every core route/state; complete all core journeys by keyboard; verify focus order/restoration, names/roles/states, live-region behavior, contrast, reduced motion, 200% zoom, 400% text/reflow, 360 px layout, chart/table equivalence, pseudo-localization, and RTL; manually spot-check the critical sign-in, retailer, purchase decision, receipt, assistant, and audit journeys with NVDA plus Chrome while making no accessibility-certification claim (Recommended)

## Q5. Query-cache and browser-memory bounds

How should U12 bound private server state in one tab?

- A. Keep all private state memory-only; use zero stale time and no automatic retry for session/authority resources and mutations; allow ordinary read data a 15-second stale time and five-minute garbage-collection window only when version/observed-time remain visible; cap retained private queries at 250 entries and approximately 25 MiB serialized payload per tab; cancel and remove all private state on logout, `401`, session generation change, or retailer switch (Recommended)
- B. Persist TanStack Query state in IndexedDB for offline recovery and retain it for 24 hours
- C. Use library cache defaults without entry, lifetime, or memory bounds
- X. Other (please specify)

[Answer]: A. Keep all private state memory-only; use zero stale time and no automatic retry for session/authority resources and mutations; allow ordinary read data a 15-second stale time and five-minute garbage-collection window only when version/observed-time remain visible; cap retained private queries at 250 entries and approximately 25 MiB serialized payload per tab; cancel and remove all private state on logout, `401`, session generation change, or retailer switch (Recommended)

## Q6. Upload, polling, and SSE timing

Which asynchronous interaction timing profile should U12 use?

- A. Render upload progress no more than four times per second and announce meaningful progress no more often than each 10% or five seconds; poll accepted operations from one second with backoff to five seconds and honor larger provider guidance; recognize 15-second SSE keepalives and 45 seconds of silence; reconnect after approximately 1, 2, and 5 seconds with jitter, stop after five attempts or 30 seconds, then request the bounded operation snapshot; retain and use the authorized cursor only inside U11's five-minute window and deduplicate every event (Recommended)
- B. Update progress on every network event, poll every 250 ms, and reconnect SSE indefinitely
- C. Leave progress throttling, polling, reconnect, and snapshot timing implementation-defined
- X. Other (please specify)

[Answer]: A. Render upload progress no more than four times per second and announce meaningful progress no more often than each 10% or five seconds; poll accepted operations from one second with backoff to five seconds and honor larger provider guidance; recognize 15-second SSE keepalives and 45 seconds of silence; reconnect after approximately 1, 2, and 5 seconds with jitter, stop after five attempts or 30 seconds, then request the bounded operation snapshot; retain and use the authorized cursor only inside U11's five-minute window and deduplicate every event (Recommended)

## Q7. Browser content and GenUI security policy

Which client-side security baseline should protect U12?

- A. Serve all scripts/styles/assets from the same origin; enforce a CSP with `default-src 'self'`, no `unsafe-eval`, no arbitrary inline script, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`, and `connect-src 'self'`; use Trusted Types where supported; sanitize Markdown through one audited DOMPurify-based adapter with raw HTML disabled and allowlisted links; validate GenUI JSON against closed schemas and an allowlisted component registry; prohibit runtime code, callbacks, scriptable URLs, third-party analytics, and direct service endpoints (Recommended)
- B. Allow trusted CDN scripts and model-supplied HTML after basic escaping
- C. Rely on React escaping without CSP, sanitizer, or GenUI schema tests
- X. Other (please specify)

[Answer]: A. Serve all scripts/styles/assets from the same origin; enforce a CSP with `default-src 'self'`, no `unsafe-eval`, no arbitrary inline script, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`, and `connect-src 'self'`; use Trusted Types where supported; sanitize Markdown through one audited DOMPurify-based adapter with raw HTML disabled and allowlisted links; validate GenUI JSON against closed schemas and an allowlisted component registry; prohibit runtime code, callbacks, scriptable URLs, third-party analytics, and direct service endpoints (Recommended)

## Q8. Frontend telemetry and privacy bounds

Which browser telemetry profile should U12 emit?

- A. Emit bounded OpenTelemetry browser signals for route templates, build revision, Core Web Vitals, UI state transitions, upload/SSE timing, safe error code, and correlation ID; exclude subjects, retailer/resource IDs, form values, files, prompts, generated text, tokens, cookies, CSRF values, and raw URLs; cap the unsent queue at 500 records or 1 MiB, export at 50 records or five seconds, drop oldest on overflow with an observable count, and never block user work when the collector/OpenSearch is unavailable (Recommended)
- B. Capture full URLs, console logs, form values, and assistant text for easier debugging
- C. Emit unbounded console diagnostics only
- X. Other (please specify)

[Answer]: A. Emit bounded OpenTelemetry browser signals for route templates, build revision, Core Web Vitals, UI state transitions, upload/SSE timing, safe error code, and correlation ID; exclude subjects, retailer/resource IDs, form values, files, prompts, generated text, tokens, cookies, CSRF values, and raw URLs; cap the unsent queue at 500 records or 1 MiB, export at 50 records or five seconds, drop oldest on overflow with an observable count, and never block user work when the collector/OpenSearch is unavailable (Recommended)

## Q9. Browser test and CI matrix

Which automated quality gate should protect UI changes?

- A. On every pull request run format, ESLint, TypeScript, unit/component tests, generated-client compatibility, bundle budgets, dependency/secret scans, and axe checks; run core Playwright journeys in Chromium, Firefox, and WebKit at 360/768/1440 widths with at most two workers, plus a five-concurrent-session performance profile for inventory and purchasing reads; require 80% line coverage overall and targeted tests for every changed interaction or security rule (Recommended)
- B. Run unit tests and one Chromium smoke test only
- C. Defer browser, accessibility, bundle, and security checks until deployment
- X. Other (please specify)

[Answer]: A. On every pull request run format, ESLint, TypeScript, unit/component tests, generated-client compatibility, bundle budgets, dependency/secret scans, and axe checks; run core Playwright journeys in Chromium, Firefox, and WebKit at 360/768/1440 widths with at most two workers, plus a five-concurrent-session performance profile for inventory and purchasing reads; require 80% line coverage overall and targeted tests for every changed interaction or security rule (Recommended)

## Q10. Static delivery, clean-reviewer, and recovery profile

Which reproducible delivery profile should U12 demonstrate?

- A. Produce deterministic hashed Vite assets with one-year immutable caching while serving the HTML entry and session/private responses as no-store; register no offline service worker; recreate the UI from a clean checkout within 30 minutes using pinned Node/package-manager/dependency versions and lockfile integrity, no owner credentials/GPU/external API, and the Kubernetes same-origin ingress; prove reload/deep-link behavior, revision display, logout/Redis-loss purge, contract mismatch failure, and rollback to an immutable compatible UI build (Recommended)
- B. Add an offline service worker that caches private API responses and use floating dependency versions
- C. Demonstrate only the development server from the owner's existing installation
- X. Other (please specify)

[Answer]: A. Produce deterministic hashed Vite assets with one-year immutable caching while serving the HTML entry and session/private responses as no-store; register no offline service worker; recreate the UI from a clean checkout within 30 minutes using pinned Node/package-manager/dependency versions and lockfile integrity, no owner credentials/GPU/external API, and the Kubernetes same-origin ingress; prove reload/deep-link behavior, revision display, logout/Redis-loss purge, contract mismatch failure, and rollback to an immutable compatible UI build (Recommended)

## Q11. Browser retry ownership

How should failed ordinary C18 reads retry in the browser without multiplying U11's bounded provider retry?

- A. Disable automatic TanStack Query retries for C18 requests; render the typed stale/unavailable/failed state and offer an explicit user retry for ordinary reads; keep only the separately governed operation-polling and SSE-reconnect loops automatic; never replay a mutation, upload admission, session/authority request, or uncertain command (Recommended)
- B. Use TanStack Query's default three automatic retries in addition to U11 retry behavior
- C. Let each feature choose an unbounded retry policy
- X. Other (please specify)

[Answer]: A. Disable automatic TanStack Query retries for C18 requests; render the typed stale/unavailable/failed state and offer an explicit user retry for ordinary reads; keep only the separately governed operation-polling and SSE-reconnect loops automatic; never replay a mutation, upload admission, session/authority request, or uncertain command (Recommended)

## Ambiguity Scan

- The below-one-second p95 target applies end to end to ordinary inventory and purchasing C18 reads under the five-user profile. The 1.5-second p95 route target adds browser rendering; LCP, INP, and CLS use p75 because they describe browser experience rather than API latency.
- Bundle limits measure production gzip output and exclude source maps, which are retained as protected build artifacts rather than served publicly. A dependency or generated-client change cannot bypass the absolute CI budgets.
- Browser support is a rolling matrix resolved and recorded at test time. Playwright WebKit is the automated compatibility path for Safari behavior; no claim is made for older or untested browsers.
- Automated axe results are one gate, not an accessibility certification. Keyboard, focus, zoom/reflow, screen-reader, localization, and chart-equivalence checks remain independently required.
- The 250-entry and 25 MiB per-tab private-query limits are acceptance ceilings. U12 evicts eligible ordinary reads before crossing either ceiling and never evicts or persists state in a way that grants authority.
- Automatic TanStack Query request retries are disabled, preventing multiplication of U11's own bounded safe-read retry. Explicit user retries create a new safe read; governed polling and SSE reconnect retain their separately approved loops.
- Ant Design runtime styling must use CSP-compatible nonce/hash support or extracted same-origin CSS. It cannot weaken the script policy or introduce arbitrary inline executable content.
- Browser telemetry verifies configuration and records loss but never becomes an authority or serving dependency. Collector or OpenSearch failure degrades observability without blocking safe user work.
- One-year caching applies only to content-hashed immutable assets. HTML, sessions, API data, and private state remain `no-store`, and no service worker creates an offline private-data copy.
- The 360 px action boundary remains functional scope: reading, retailer selection, and approve/reject stay supported; imports, draft editing, cancellation, and receipt entry require tablet/desktop with a preserved deep link.
- The selected values quantify performance, delivery size, compatibility, accessibility, browser memory, asynchronous timing, security, telemetry, CI, reproducibility, caching, and retry ownership. No material Web Application NFR remains unspecified.

## Consolidated Summary

The React/TypeScript/Vite application preserves the inception requirement for ordinary inventory and purchasing C18 reads below one second p95 under five concurrent local users with normal authentication and authorization. When that API target is met, private-route main content renders within 1.5 seconds p95. Browser experience targets are LCP at or below 2.5 seconds p75, INP at or below 200 ms p75, and CLS at or below 0.1 p75. Each core route receives at least 30 measured journeys alongside the separate five-minute, 500-request API benchmark.

Production gzip budgets are 300 KiB JavaScript for the public/authentication entry, 75 KiB CSS, 600 KiB cumulative JavaScript for the first authenticated dashboard, and 250 KiB for each lazy feature chunk. Vite must use route-level splitting, selective Ant Design/icon imports, and dependency attribution; an absolute budget breach fails CI.

At test time, U12 supports the latest two stable Chrome, Edge, and Firefox releases and the current Safari major through standards-compatible implementation and Playwright WebKit coverage. Automated viewport coverage uses 360x800, 768x1024, and 1440x900. The approved limited mobile action set remains available at 360 px, full workflows remain available on tablet/desktop, and absent required browser capabilities produce an explicit unsupported-browser screen.

The WCAG 2.2 AA verification gate permits no axe-core Critical or Serious violation on a core route or state. Every core journey works by keyboard. Tests cover focus, semantic names/roles/states, live regions, contrast, reduced motion, 200% zoom, 400% text/reflow, 360 px layout, chart/table equivalence, pseudo-localization, and RTL. Critical journeys receive manual NVDA plus Chrome checks; the project claims no accessibility certification.

Private browser state remains memory-only. Session/authority resources and all mutations use zero stale time and no automatic retry. Ordinary reads may remain fresh for 15 seconds and are garbage-collected after five minutes only while source version and observation time remain visible. A tab retains no more than 250 private queries or approximately 25 MiB of serialized payload. Logout, `401`, session-generation change, or retailer switch cancels work and removes all private state.

Upload progress renders at most four times per second and is announced no more often than each 10% or five seconds. Operation polling starts at one second, backs off to five seconds, and honors longer provider guidance. The UI expects 15-second SSE keepalives and treats 45 seconds of silence as disconnected. Reconnect attempts use approximately 1, 2, and 5 seconds with jitter and stop after five attempts or 30 seconds before requesting a bounded operation snapshot. Cursors remain usable only inside U11's five-minute window, and events are deduplicated.

All executable content and assets are same-origin. CSP uses `default-src 'self'`, prohibits `unsafe-eval` and arbitrary inline script, and restricts object, base, frame, and connection sources. Trusted Types apply where supported. One audited DOMPurify-based adapter renders Markdown with raw HTML disabled and allowlisted links. Closed schemas and an allowlisted registry protect GenUI; runtime code, callbacks, scriptable URLs, third-party analytics, and direct service endpoints are prohibited.

Browser OpenTelemetry includes route templates, build revision, Core Web Vitals, UI state transitions, upload/SSE timing, safe error codes, and correlation IDs. It excludes identities, tenant/resource IDs, form values, files, prompts, generated text, credentials, CSRF values, and raw URLs. The unsent queue is capped at 500 records or 1 MiB, exports at 50 records or five seconds, drops oldest on overflow with an observable count, and never blocks user work when telemetry infrastructure is unavailable.

Every UI pull request runs formatting, ESLint, TypeScript, unit/component tests, generated-client compatibility, bundle budgets, dependency and secret scans, and axe checks. Core Playwright journeys run in Chromium, Firefox, and WebKit at all three viewports with at most two workers. The five-session performance profile covers inventory and purchasing reads. Overall line coverage is at least 80%, and each changed interaction or security rule receives targeted tests.

Vite emits deterministic content-hashed assets cached immutably for one year; HTML entry points and session/private responses are `no-store`, and no offline service worker is registered. A clean checkout recreates U12 within 30 minutes using pinned Node, package-manager, dependency, and lockfile versions without owner credentials, GPU, or external API access. The Kubernetes same-origin deployment proves reload/deep links, revision display, logout and Redis-loss purge, contract mismatch failure, and rollback to an immutable compatible UI build.

TanStack Query performs no automatic C18 request retries. Ordinary read failures render typed stale, unavailable, or failed states and allow explicit user retry. Only the separately governed operation-polling and SSE-reconnect loops remain automatic. Mutations, upload admission, session/authority requests, and uncertain commands are never replayed automatically.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
