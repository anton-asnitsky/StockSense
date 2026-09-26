<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
2026-09-20T16:13:43Z — treated the inception one-second p95 objective as an end-to-end browser-to-provider target for ordinary inventory and purchasing reads, with private-route render and Core Web Vitals measured separately.
2026-09-20T16:13:43Z — treated the React client as an untrusted same-origin presentation tier: U11 owns browser authentication, U1 owns generated C18 types, and provider services remain authoritative for tenant access and business invariants.
2026-09-20T16:13:43Z — interpreted UI-kind applicability to require performance, security, technology, and traceability artifacts while service-only scalability, reliability, and observability documents remain out of scope.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
2026-09-20T16:13:43Z — disabled TanStack Query automatic request retries for all C18 calls; only separately governed operation polling and SSE reconnection may retry automatically.
2026-09-20T16:13:43Z — excluded browser persistence, offline service workers, third-party analytics, direct service calls, and arbitrary model-rendered code from the Web Application design.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
2026-09-20T16:13:43Z — accepted strict production gzip budgets and route-level splitting to keep the reviewer-local portfolio experience responsive, at the cost of tighter dependency and Ant Design import controls.
2026-09-20T16:13:43Z — accepted a rolling latest-browser support statement with Playwright Chromium, Firefox, and WebKit coverage; the review identified that explicit Edge execution is still needed to substantiate the two-version Edge claim.
2026-09-20T16:13:43Z — accepted bounded, non-blocking browser telemetry so observability outages cannot stop safe user work, while preserving an observable loss counter and evidence of degraded telemetry.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
2026-09-20T16:13:43Z — C18 must define browser-safe CSRF bootstrap and rotation plus CSRF and applicable idempotency semantics for every mutating endpoint, including manual review and assistant turns.
2026-09-20T16:13:43Z — C18 must replace dashboard HTTP 206 semantics with the accepted typed HTTP 200 aggregate/section state and add the missing operation, SSE/snapshot, audit, evidence, and purchasing surfaces before U12 feature implementation.
2026-09-20T16:13:43Z — the next design pass must allocate and measure U12's Kubernetes resource contribution within the 16 GiB and 3 CPU local cluster envelope rather than treating bundle/cache limits as complete NFR2 coverage.
