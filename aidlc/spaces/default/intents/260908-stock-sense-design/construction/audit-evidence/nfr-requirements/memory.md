<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
2026-09-20T12:34:00Z — The 3 GiB/0.75 CPU U10/OpenSearch/Dashboards profile is subordinate to the 13 GiB/2.5 CPU whole-application quota; a failed whole-stack run requires a reduced pinned profile rather than more host capacity.
2026-09-20T12:34:00Z — Searchability targets and freshness states share one boundary model: 99% within five seconds, all healthy events within 30 seconds, Fresh below 30 seconds, Stale through five minutes, then Unavailable.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
2026-09-20T12:34:00Z — The independent advisory review completed only on its permitted retry; the first attempt wrote no terminal appendix.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
2026-09-20T12:34:00Z — The local OpenSearch profile uses one primary shard and no replica, favoring reproducible resource fit and tested rebuild/cutover over multi-node availability claims.
2026-09-20T12:34:00Z — Heavy replay, rebuild, retention, and recovery work is serialized to preserve interactive query targets and the fixed local resource envelope.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
2026-09-20T12:34:00Z — Reviewer R-01: refine C15 for producer security binding, digest and 64 KiB enforcement, selected retry/DLQ values, and compatibility overlap.
2026-09-20T12:34:00Z — Reviewer R-02: refine C18 with bounded audit-query parameters, result fields, cursor rules, and Fresh/Stale/partial/Unavailable mappings.
2026-09-20T12:34:00Z — Reviewer R-03: extend or losslessly encode C19 evidence outcomes for rejected, unavailable, and not-run.
2026-09-20T12:34:00Z — Reviewer R-04: choose numeric RabbitMQ queue, telemetry-buffer, and persistent-storage capacities with overflow and acceptance behavior.
