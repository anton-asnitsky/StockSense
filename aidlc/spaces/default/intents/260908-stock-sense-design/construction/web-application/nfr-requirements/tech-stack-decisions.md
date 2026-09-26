# Web Application Technology Decisions

Unit: U12 Web Application (`web-application`)

## Decisions

| Concern | Selection | Rationale and constraints |
| --- | --- | --- |
| Language and UI runtime | TypeScript and React, versions pinned during implementation | Provides typed composition and the required portfolio evidence while keeping browser business authority absent. Strict TypeScript is required. |
| Build tool | Vite production build | Supports deterministic content-hashed assets, route splitting, bundle reporting, local development, and the accepted delivery budgets. |
| Component system | Ant Design and Ant Design Charts | Supplies the approved design system and data visualization primitives; application code remains responsible for WCAG behavior, CSP integration, and textual chart alternatives. |
| Routing | React Router | Owns public/private routes, retailer deep links, responsive continuation links, and explicit unsupported/recovery screens. Route state never grants authority. |
| Server state | TanStack Query with persistence disabled and automatic request retries disabled | Owns C18 reads/mutations in memory, supports cancellation and generation-prefixed keys, and avoids multiplying U11 retries or replaying governed actions. |
| REST boundary | U1-generated TypeScript client from versioned C18 OpenAPI 3.1 | Makes U11 the browser's only network boundary and fails incompatible operations/models in CI. The exact generator is owned and pinned by U1. |
| Forms | Ant Design Form with typed C18 adapters | Provides accessible field/form summaries and local shape/usability checks while provider validation remains authoritative. |
| Localization | `react-i18next` and `Intl` | Ships English first while preserving stable keys, locale-aware values, pseudo-localization, and RTL checks for future multilingual delivery. |
| Markdown safety | React Markdown rendering with raw HTML disabled plus one audited DOMPurify sanitation adapter | Adds defense in depth for assistant prose and citations without allowing model HTML or executable content. Exact parser/plugin versions and allowlists are pinned and tested. |
| GenUI validation | Closed JSON Schemas and an allowlisted typed React component registry | Restricts model output to approved evidence, table, citation, comparison, review-draft, and purchase-draft data; no runtime component/code execution exists. |
| Browser security | Same-origin delivery, strict CSP, Trusted Types where supported, secure U11 cookie boundary | Prevents direct service access, arbitrary script, framing, unsafe base URLs, and browser-held tokens. Ant Design styles use nonce/hash support or extracted CSS. |
| Telemetry | OpenTelemetry browser SDK through the platform collector | Captures bounded Web Vitals and safe UI diagnostics while collector failure remains non-blocking and provider audit remains authoritative. |
| Unit/component tests | Vitest, React Testing Library, and axe-core integrations | Provides fast behavior, semantic, accessibility, sanitizer, and state-transition checks using user-visible outcomes. |
| Browser tests | Playwright Chromium, Firefox, WebKit, and current installed Microsoft Edge channel | Exercises the declared browser matrix, three viewports, deep links, uploads, purchasing, SSE, GenUI, recovery, accessibility, and five-session performance profile with exact versions recorded. |
| Static delivery | One fixed 64 MiB/0.02 CPU request, 128 MiB/0.10 CPU limit static-serving replica with deterministic hashed Vite assets behind the Kubernetes same-origin ingress; no HPA or service worker | Allows long immutable asset caching while HTML/session/private responses remain no-store, gives U12 a measurable share of the 16 GiB/3 CPU envelope, and prevents offline private copies. |

## Rejected alternatives

- A browser-held token architecture and direct browser calls to U3-U10 are
  excluded by the BFF security boundary.
- Redux or another general-purpose global business store is excluded until a
  measured need exists; route, server, form, and local presentation state have
  explicit owners.
- Query-cache persistence, offline private-data service workers, and browser
  draft persistence are excluded by the memory-only privacy rule.
- TanStack Query default retries and optimistic success for governed commands
  are excluded because they can multiply BFF retries or misstate authority.
- Arbitrary model HTML, component names, callbacks, scripts, remote modules,
  and third-party analytics are excluded by CSP and GenUI rules.
- CDN-hosted runtime dependencies and floating versions are excluded from the
  clean-reviewer and supply-chain profile.

## Implementation parameters to pin

Before the implementation PR is accepted, record exact Node, package manager,
TypeScript, React, Vite, Ant Design/Charts, React Router, TanStack Query,
OpenAPI generator/client, i18n, Markdown/DOMPurify, schema validator,
OpenTelemetry, Vitest, Testing Library, axe-core, Playwright, ESLint, formatter,
base-image, and static-server versions and checksums. Record the browser matrix,
CSP/nonce integration, sanitizer/URL allowlists, query sizing method, bundle
measurement command, source-map access policy, and lockfile verification. These
choices may not weaken the approved requirements.
