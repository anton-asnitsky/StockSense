<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-09-20T14:31:00Z — HTTP 200 with typed complete/partial dashboard state supersedes the functional-design application-level 206 behavior; C18 must be versioned before generated clients consume it.
- 2026-09-20T14:31:00Z — U10's accepted audit query bounds are inherited by U11 rather than independently selected: 90-day range, 50 default/200 maximum page, five filters, 1 MiB response, stable cursor, checkpoint, lag, and freshness state.
- 2026-09-20T14:31:00Z — The generic three-second provider read deadline is only an upper failure bound and does not replace inception NFR1's end-to-end below-one-second p95 target for ordinary inventory and purchasing reads; reviewer finding R-01 carries this requirement forward.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-09-20T14:31:00Z — NFR4 is N/A because U11 owns no PostgreSQL schema, role, or SQL path; routine-only persistence remains with data-owning services.
- 2026-09-20T14:31:00Z — NFR7 is N/A because U11 owns no RabbitMQ endpoint or durable integration state; HTTP/SSE does not replace provider-owned outbox, inbox, idempotency, or recovery.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-09-20T14:31:00Z — Redis remains intentionally disposable for browser sessions while 24-hour Vault-backed encrypted operation handles preserve provider reconciliation after Redis loss; users reauthenticate rather than restoring uncertain browser authority.
- 2026-09-20T14:31:00Z — The one-replica local portfolio profile uses hard request, queue, upload, SSE, cache, and Redis bounds to protect the 13 GiB/2.5 CPU application quota; overflow is explicit instead of hidden in unbounded waiting.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-09-20T14:31:00Z — Reviewer R-01: add an explicit end-to-end below-one-second p95 acceptance mix for ordinary inventory and purchasing reads before implementation, or obtain an upstream NFR1 change.
- 2026-09-20T14:31:00Z — Reviewer R-02: distinguish telemetry configuration/instrumentation readiness from exporter or OpenSearch availability and define degraded probe/serving behavior.
- 2026-09-20T14:31:00Z — Reviewer R-03: revise and version C16-C18 with the callback, typed dashboard, operation-handle/status, SSE/snapshot, error, and resilience-isolation schemas before generated-client implementation.
