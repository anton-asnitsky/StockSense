# Audit Evidence Performance Requirements

Unit: U10 Audit Evidence (`audit-evidence`)

## Scope

Targets apply to the clean local CPU profile with authenticated producers,
authorized users, one seeded retailer at a time, warmed services, and the
approved OpenSearch route active. Measurements include authorization, route
resolution, PostgreSQL stored-routine work, projection access, response
construction, and checkpoint persistence. Startup, image pulls, restore, and
unrelated ML generation are reported separately.

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR1.1 | After warm-up, an authorized 30-day retailer audit query shall achieve p95 below 750 ms and an authorized query over the full 90-day retained window shall achieve p95 below two seconds under five concurrent local users. | After 50 warm-up calls, run representative fresh, stale, and unavailable mixes for at least five minutes and 500 requests each. Publish p50/p95/p99, throughput, error rate, hardware, configuration, OpenSearch time, authorization time, and response-building time. | Return explicit timeout, stale, partial, unavailable, or capacity state without weakening tenant, role, route, or freshness checks. |
| NFR1.2 | A valid C15 envelope of at most 64 KiB shall commit its unique inbox receipt and retained derived event within 500 ms p95. When dependencies are healthy, 99% of valid events shall have a verified searchable checkpoint within five seconds and every valid event within 30 seconds. RabbitMQ acknowledgement occurs only after the durable checkpoint. | Run at least 1,000 valid, duplicate, mismatched, invalid, and dependency-failure deliveries. Report receive-to-retained, retained-to-indexed, indexed-to-checkpoint, checkpoint-to-ack, and end-to-end percentiles plus duplicate and mismatch outcomes. | Preserve the committed event, retry or dead-letter under the reliability policy, expose lag/freshness, and never acknowledge an uncheckpointed event or create a second logical projection. |
| NFR1.3 | Query ranges shall not exceed 90 days; cursor pages shall default to 50 and allow at most 200 rows; at most five filters are accepted; one response shall not exceed 1 MiB. Results are ordered stably by occurred time and event ID and include generation, checkpoint, observed lag, and freshness. | Boundary and property tests cover zero/full ranges, page sizes 1/50/200/201, filter counts 0/5/6, stable cursor traversal, maximum response size, identical timestamps, route changes, and Fresh/Stale/Unavailable responses. | Reject invalid bounds before search, never truncate silently, and never label incomplete or invalid-route results as Fresh. |
| NFR1.4 | A replay or rebuild shall process 100-event batches and rebuild 100,000 retained eligible events into an inactive generation within 30 minutes on the clean local profile while applying current expiry watermarks. | Run clean and interrupted rebuilds with duplicates, expired events, quarantines, schema variants, and checkpoint restart. Publish elapsed time, throughput, resource peaks, counts, digests, exclusions, and validation results. | Leave failed or incomplete generations inactive, preserve the active route, and expose a terminal or retry-eligible operator result with safe diagnostics. |

## Freshness classification

- **Fresh:** verified checkpoint lag below 30 seconds.
- **Stale:** lag from 30 seconds through five minutes.
- **Unavailable:** lag over five minutes or an invalid route/checkpoint.

These are portfolio workload targets rather than a public production SLA.
