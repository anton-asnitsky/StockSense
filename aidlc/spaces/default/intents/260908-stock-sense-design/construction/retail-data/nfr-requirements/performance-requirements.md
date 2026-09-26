# Retail Data Performance Requirements

Unit: U4 Retail Data (`retail-data`)

## Scope

Targets apply to the warmed clean-reviewer Docker Desktop Kubernetes profile
with five concurrent users and the approved seeded three-retailer dataset.
Cache hits, PostgreSQL fallback, queue time, validation, commit, and snapshot
generation are reported separately.

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR1.1 | Inventory positions, product lookup, retailer context, and current snapshot metadata shall achieve p95 below 400 ms; bounded movement/demand pages shall achieve p95 below 800 ms. Cursor pagination defaults to 100 and permits at most 500 rows. | Run each representative mix for at least five minutes and 500 requests with five concurrent users. Publish p50/p95/p99, errors, page sizes, hardware, pod limits, revision, cache-hit results, and PostgreSQL-fallback results. | Mark the affected operation failed or limited; never increase page limits or label stale data current to pass. |
| NFR1.2 | Ordinary membership, settings, stock-adjustment, and receipt commands of at most ten lines shall achieve p95 below 750 ms under five concurrent users. | Tests include success, authorization denial, stale version, idempotent replay, concurrent receipt/adjustment, and atomic rollback while recording full transaction latency. | Return an explicit conflict, denial, or unavailable outcome with no partial effect. |
| NFR1.3 | A maximum 1,000-row/2 MiB inventory import shall complete within 30 seconds and a maximum 100,000-row/25 MiB demand import within three minutes; admission shall complete within 500 ms. | Clean-profile tests record upload admission, queue, validation, lock acquisition, commit, outbox, CPU, memory, and diagnostics truncation. Exact replay is timed separately. | Reject overflow or deadline breach with an immutable failed/retryable result; never partially commit an atomic batch. |
| NFR1.4 | One retailer's 100-product/18-month versioned snapshot shall be generated within 60 seconds. | Verify manifest versions, row counts, temporal cutoff, digest, purpose restrictions, generation duration, and later paged serving. | Publish no manifest on incomplete or inconsistent input; return explicit unavailable/conflict. |

## Benchmark controls

- Use pinned release builds, real stored routines, current placement generations,
  and deterministic seeded data.
- Exclude startup, migration, restore, and tenant extraction from steady-state
  endpoint measurements and report them independently.
- Preserve raw results and configuration digests as revision-bound evidence.

## Limitations

These targets demonstrate the portfolio profile and do not establish a public
service SLA or production-scale capacity claim.
