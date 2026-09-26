# Web Application Security Requirements

Unit: U12 Web Application (`web-application`)

## Security boundary

U12 is an untrusted presentation client. It calls only the same-origin U11 Web
BFF through the generated C18 client, holds no service token or durable business
authority, and never derives tenant access or domain permission from a route,
visible control, browser cache, model output, or local calculation. U11 and the
owning providers remain authoritative.

## Threat boundaries

| Boundary | Primary threats | Required control |
| --- | --- | --- |
| Browser route/session | tenant substitution, stale tab, session replay, late response | bootstrap before private render, route/context agreement, generation-prefixed keys, cancellation/purge, tenant-hiding states |
| Browser to U11 | CSRF, token theft, command replay, direct-service bypass | same-origin generated C18 client, HttpOnly cookie, in-memory CSRF use, one confirmation-time idempotency key, no automatic mutation retry |
| Markdown and GenUI | XSS, arbitrary component/code execution, hidden authority values | strict CSP, Trusted Types where supported, one audited sanitizer, raw HTML disabled, closed schemas and allowlisted components |
| Browser storage/cache | private-data persistence, cross-user reuse, offline stale authority | memory-only state, no service worker, no private Cache Storage/IndexedDB/local/session storage, purge on security transitions |
| Telemetry and diagnostics | credential/PII leakage, raw prompt capture, unbounded queue | allowlisted safe fields, bounded queue/export, observable drop, non-blocking failure |
| Supply chain/static delivery | malicious package/script, cache poisoning, incompatible client | lockfile integrity, scans/SBOM, same-origin hashed assets, CSP, immutable revision, generated-contract compatibility |

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR3.1 | Before any private render or request, U12 shall bootstrap the no-store C18 session and require the route retailer to match U11's selected current context. Query keys include session generation, retailer context version, feature/resource/filter identity, and contract version. Late results from an old context are discarded. | Two-tenant tests substitute routes, session generations, retailer/context versions, resources, cursors, operation handles, deep links, tabs, and delayed responses across users and context switches. | Purge or discard the result, reveal no foreign existence or payload, and require explicit authorized context selection. |
| NFR3.2 | Session, retailer, files, drafts, provider responses, assistant content/cursors, idempotency keys, and private query data shall remain in memory only and shall never enter `localStorage`, `sessionStorage`, IndexedDB, Cache Storage, service-worker caches, URLs, or cross-tab payloads. Logout, `401`, Redis/session loss, generation change, or retailer switch cancels requests/streams and removes all private state. | Storage, browser-cache, history, crash/reload, BroadcastChannel, devtools, and multi-tab tests seed canary values and prove complete purge with no mutation replay. | Stop rendering private content, clear state, close streams, remove selected files, and present sign-in/context recovery. |
| NFR5.1 | U12 shall redirect sign-in/logout through U11 only and use the secure HttpOnly session cookie without reading it. Before private mutations, the generated C18 v2 client shall obtain a no-store browser-security bootstrap containing the session generation, CSRF value, issue/expiry time, and rotation reason; the value remains memory-only and rotates after login, retailer/context change, security-key rotation, reauthentication, and logout. Every mutating operation—including retailer selection, imports, manual-review requests, purchase Draft/create/edit/submit/approve/reject/cancel/receipt commands, assistant-turn admission, operation controls, and audit/evidence controls—shall send the current `X-CSRF-Token`. Access/refresh/service tokens and provider credentials shall never be accessible to browser code. | Generated-client and browser tests enumerate every C18 mutation and fail if its OpenAPI security/header declaration lacks CSRF. Positive/negative tests cover bootstrap no-store headers, rotation, missing/forged/stale/expired CSRF, session-generation mismatch, callback recovery, expired/revoked session, old-cookie replay, logout across tabs, Redis loss, browser storage, source maps, errors, and direct U3-U10 calls. | Create no session or provider effect; purge private state and render a stable sign-in, denied, or unavailable outcome. Never fall back to a stale token or omit CSRF because a mutation is asynchronous. |
| NFR5.2 | Every logical command shall use one UUID idempotency key generated at confirmation/admission and bound to the canonical visible payload hash, actor, retailer, session generation, target, operation, expected version, and confirmation/action-draft identity where applicable. Every C18 mutation with a logical domain or operation effect—including imports, manual review, purchase commands, assistant turns, and operator controls—declares and carries that key; context/session bootstrap and logout use their own replay-safe protocol identity rather than a domain key. Governed commands show an accessible confirmation with actor, action, retailer, target, evidence, and expected version, disable duplicate controls, and reconcile uncertainty through the original key before another logical action. | OpenAPI/generated-client tests enumerate every mutation and verify its CSRF plus applicable idempotency declaration. Component/browser tests cover double-click, back/forward, changed payload, stale version, timeout, disconnect, response loss, exact replay, hash mismatch, expired confirmation, mobile boundary, assistant-proposed action, and context/session change. | Claim no optimistic success, never reuse a key for changed content or create a replacement command to resolve uncertainty, and require a new human decision after a proven rejection or changed command. |
| NFR6.1 | The production bundle, HTML, source maps, manifests, logs, telemetry, and test artifacts shall contain no credential, token, cookie, CSRF value, private key, Vault reference value, owner endpoint, or external API secret. U12 receives no Vault secret; runtime configuration contains only public same-origin and revision data. | Repository/history, lockfile, bundle, image, source-map, manifest, browser, and CI-log scans plus canary tests find no secret material. | Block build/deployment, revoke suspected exposure, and never inject a fallback secret into the browser. |
| NFR8.1 | U12 shall consume only the complete versioned OpenAPI 3.1 C18 v2 construction baseline through U1-generated TypeScript clients. C18 v2 must define the no-store CSRF bootstrap/rotation schema; CSRF on every mutation; applicable idempotency binding; session/context; typed HTTP `200` complete/partial dashboards; bounded reads/uploads; opaque operation handles/status/reconciliation; purchase Draft/transitions; assistant turn/SSE/resume/snapshot; bounded audit query; C19 v2 evidence access; stable RFC 9457 problems; response limits; and contract-version metadata before any dependent feature code is accepted. The passed C18 v1 `/auth/callback`, dashboard `206`, generic responses, and missing operations are legacy and shall fail the construction baseline. | CI validates syntax, examples, compatibility/overlap, generated types, full mutation-header matrix, operation coverage, error/state exhaustiveness, size/rate bounds, session/CSRF rotation, typed dashboard sections, polling/status, SSE/snapshot, audit/evidence fixtures, and a production build. Hand-written alternative DTOs or unresolved C18 v2 operations fail the change. | Block integration and deployment or render an explicit contract-incompatible public startup state; never generate against v1, guess a missing operation/schema, or hand-code around a missing security header. |
| NFR10.1 | Browser logs, telemetry, errors, URLs, diagnostics, screenshots, and evidence shall exclude subjects, retailer/resource identifiers, form values, files, prompts, generated text, tokens, cookies, CSRF values, raw provider details, and hidden reasoning. Allowed fields are route template, build revision, bounded UI state/outcome, Web Vitals, upload/SSE timing, safe error code, and validated correlation ID. | Canary tests inspect console, network, exporter payloads, traces, error boundaries, accessibility output, screenshots, and CI artifacts for every prohibited value. | Redact/drop the unsafe record, increment a bounded loss count, and fail evidence publication when safe proof cannot be produced. |
| NFR10.2 | The unsent browser telemetry queue shall be capped at 500 records or 1 MiB and exported at 50 records or five seconds. Overflow drops oldest records and increments an observable counter. Collector/OpenSearch unavailability shall not block safe user work or make the UI appear healthy. | Exporter-offline, slow-network, overflow, malformed-event, tab-close, and recovery tests verify resource bounds, drop accounting, and explicit observability-degraded evidence. | Continue safe UI work, bound memory/retry, and surface telemetry loss through the next available safe channel. |
| NFR13.1 | Every pull request shall run formatting, ESLint, TypeScript, unit/component tests, generated-client compatibility, bundle budgets, dependency and secret scans, and axe checks. Core Playwright journeys run in bundled Chromium, Firefox, and WebKit plus the installed current stable Microsoft Edge channel at 360/768/1440 widths with at most two workers, plus the five-session NFR1 profile. Overall line coverage is at least 80%, and each changed interaction/security rule has targeted tests. Only a trusted immutable revision may reach the isolated local deployment runner. | Workflow policy, exact browser/channel versions, reports, hostile fixtures, and public-PR simulations prove all gates run and untrusted code receives no local runner, cluster, deployment, provider, Vault, or owner credentials. | Block merge/deployment and retain safe failed-control evidence; waivers require explicit recorded authority and expiry. |
| NFR14.1 | U12 shall meet WCAG 2.2 AA requirements for the confirmed scope with zero axe-core Critical or Serious violations on each core route/state, complete keyboard journeys, verified focus order/restoration, semantic names/roles/states, live regions, contrast, reduced motion, 200% zoom, 400% text/reflow, 360 px layout, and chart/table equivalence. Critical journeys receive manual NVDA plus Chrome checks. | Automated and manual evidence covers sign-in, retailer selection, dashboard states, imports, purchasing decisions/receipts, assistant/GenUI, audit, errors, dialogs/drawers, and navigation. | Block the affected UI claim/release; make no accessibility-certification claim and do not suppress a finding because Ant Design supplied the primitive. |
| NFR14.2 | At test time U12 shall support the latest two stable Chrome and Firefox releases, the current stable Edge release, and the current Safari major through standards-compatible code and Playwright WebKit coverage. It shall test 360x800, 768x1024, and 1440x900, preserve the approved limited mobile/full tablet-desktop action boundary, use stable `react-i18next`/`Intl` keys with English initially, and pass pseudo-localization and RTL checks. | Record exact browser/tool/channel versions and run capability, including an explicit current Edge-channel execution, viewport, localization, and unsupported-browser tests. Mobile guidance preserves a safe deep link without exposing private state. | Render an explicit unsupported-browser or device-boundary screen and never silently expose a broken or less-governed action. |
| NFR15.1 | U12 performance, accessibility, security, compatibility, bundle, contract, and journey evidence shall bind stable NFR/story/rule IDs to the immutable revision, environment, browser matrix, commands, actual outcome, limitation, and checksum. Artifact presence is distinct from measured success. | The C19 evidence manifest resolves every ID and preserves passed, failed, limited, rejected, unavailable, and not-run outcomes without prohibited browser data. | Reject incomplete evidence and prohibit a successful quality, accessibility, security, or lifecycle claim. |
| NFR15.2 | U12 shall produce deterministic content-hashed assets with one-year immutable caching while HTML entry points and all session/private responses remain `no-store`; no offline service worker is registered. A clean deployment proves deep-link reload, revision display, logout/Redis-loss purge, contract-mismatch failure, and rollback to an immutable C18-compatible UI build within the 30-minute reconstruction objective. | Clean-cluster and rollback drills record asset/HTML headers, hashes, revision, client-contract version, elapsed time, state purge, deep-link result, old/new build behavior, and limitations. | Keep an incompatible build unavailable, serve no stale private shell as authenticated, and report a missed objective as failed or limited evidence. |

## Content and GenUI controls

- Serve scripts, styles, fonts, and assets from the same origin. CSP includes
  `default-src 'self'`, `object-src 'none'`, `base-uri 'none'`,
  `frame-ancestors 'none'`, and `connect-src 'self'`; it permits no
  `unsafe-eval` or arbitrary inline script. Ant Design runtime styles use an
  approved nonce/hash path or extracted same-origin CSS.
- Enable Trusted Types where supported. One audited DOMPurify-based adapter
  renders Markdown with raw HTML disabled and allowlisted schemes/attributes.
  Other `dangerouslySetInnerHTML` use is prohibited.
- Validate GenUI JSON against closed schemas before React receives it. Only the
  approved cards, tables, citations, comparisons, review drafts, and purchase
  drafts may render; model-supplied code, callbacks, component names, URLs,
  authority values, and hidden parameters are rejected.

## Explicit N/A ownership

- NFR4 is N/A: U12 owns no PostgreSQL role, schema, migration, or SQL path.
- NFR7 is N/A: browser SSE/polling is not durable messaging; U12 owns no
  RabbitMQ publisher, consumer, outbox, inbox, replay, or business state.
- NFR9 is N/A: U12 stores no authoritative audit/log data and owns no retention
  maintenance; platform/U10 enforce seven/90-day policies. Browser caches are
  disposable and governed here by no-store and memory-only rules.
- NFR12 is N/A: U12 consumes Helm/Terraform/Terragrunt deployment output but
  owns no infrastructure state, backend, apply serialization, or migration.

## Upstream contract actions

Before code generation, U1/U11 must version the complete C18 surface, replace
application-level dashboard `206` with HTTP `200` plus typed aggregate and
section state, and provide the operation reconciliation, SSE/snapshot, audit,
evidence, and purchasing operations required above. Generated-client
compatibility is a blocking input, not a browser workaround.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-21T14:30:49Z
**Iteration:** 1
**Request Challenge:** review:4d5d3f98bf22eec4984488a725c9f1ef

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | aidlc/spaces/default/intents/260908-stock-sense-design/construction/web-application/nfr-requirements/security-requirements.md > NFR14.2; nfr-requirements-questions.md > Q3 and Consolidated Summary | The confirmed browser profile requires the latest two stable Edge releases, but NFR14.2, NFR13.1, and the selected Playwright stack require only the current stable Edge channel. Current Edge is runnable and explicitly tested, but the generated requirement silently narrows the confirmed compatibility scope and leaves the previous Edge release without evidence. | Either restore the latest-two-Edge test/support requirement with recorded versions and runnable channels, or revise and reconfirm the browser-profile answer so the upstream decision and generated requirements agree. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| NFR stage contract inspection | PASS | The UI-kind output set is complete: performance, security, technology decisions, and traceability are present; excluded service-only artifacts are not required for U12. |
| Traceability target check | PASS: 15 unique upstream NFR IDs, 15 coverage rows, no missing or duplicate coverage IDs, and every `OK` target resolves to a detailed requirement | The inception NFR set is structurally covered and all detailed references resolve. |
| Required-control cross-check | PASS with R-01 | NFR5.1/NFR5.2 define no-store CSRF bootstrap and rotation, CSRF on every C18 mutation, and applicable idempotency for all logical commands including manual review and assistant turns; NFR2.3 measures U12 and whole-cluster use within 16 GiB/3 CPU; NFR8.1 blocks on complete C18 v2 typed HTTP 200 aggregate/section states, operation/status/reconciliation, SSE/resume/snapshot, audit, and C19 v2 evidence access; current stable Edge has an explicit Playwright channel run. |
| Security, quality, and reproduction cross-check | PASS | The artifacts set enforceable React/Vite/Ant Design bundle and runtime limits, tenant/private-state isolation, CSP/XSS/GenUI controls, WCAG and Web Vitals gates, bounded privacy-safe telemetry, immutable/no-store delivery, and clean-checkout reproduction evidence. |
| `git diff --check -- construction/web-application/nfr-requirements` | PASS | No whitespace errors were present before the review append. |

### Summary

The revised NFRs close the prior security, command-replay, capacity, C18 v2, and current-Edge execution gaps with measurable blockers and failure behavior. The sole remaining issue is a non-blocking mismatch between the confirmed latest-two-Edge scope and the generated current-Edge-only requirement.
