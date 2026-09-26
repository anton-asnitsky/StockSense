# Planning and Purchasing Performance Requirements

Unit: U8 Planning and Purchasing (`planning-purchasing`)

## Scope

Targets apply to the clean local CPU profile with one seeded retailer, one
store, 100 active products, a compatible 28-day forecast, accepted supplier
terms, and the approved shared Retail Data/Planning-Purchasing application pod.
Authentication, authorization, placement resolution, stored-routine execution,
and authoritative commit are included. Browser rendering, application startup,
and upstream job generation are measured separately.

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR1.1 | After warm-up, authorized review, allowance, recommendation, scenario, Draft, order, and receipt reads shall achieve p95 below 500 ms under five concurrent local users. | After 50 warm-up calls, run each representative read mix for at least five minutes and 500 requests. Publish p50/p95/p99, throughput, error rate, authorization cost, cache state, PostgreSQL time, hardware, and configuration. Report Redis-assisted and PostgreSQL-fallback paths separately. | Return explicit timeout, unavailable, stale, or capacity status without weakening authority, freshness, version, or tenant checks. |
| NFR1.2 | Policy, preferred-term, Draft, submit, approve, reject, cancel, and receipt commands of up to ten lines shall achieve p95 below 750 ms under five concurrent local users. Manual review admission shall complete within 500 ms. | Benchmark at least 500 commands across success, validation, idempotent replay, stale-version, unauthorized, and concurrency-conflict fixtures. Include PostgreSQL transaction, external evidence recheck, outbox, audit, and receipt stock-posting time. Every accepted effect must be visible at response completion. | Return a durable original result, stable conflict, validation, unavailable, or timeout outcome. A timeout never authorizes a duplicate transition, allowance charge, order, receipt, or stock movement. |
| NFR1.3 | A claimed 100-product review or scenario calculation shall validate pinned evidence, calculate product outcomes, and commit its immutable result within 60 seconds. | Run at least 30 reviews spanning zero-need, MOQ/pack rounding, eligible/late inbound, partial blocked-product, all-blocked, dependency, and duplicate-delivery fixtures. Every run must meet the deadline; report dependency, calculation, validation, and commit phases plus resource peaks. | Fail or retry the attempt under the reliability policy; never publish partial rows as a successful result, fabricate zero recommendations, or replace pinned evidence. |
| NFR1.4 | Reviews/scenarios and Draft/order/receipt requests shall contain at most 100 products or lines; cursor pages shall default to 50 and allow at most 100 rows; one response shall not exceed 1 MiB. Demand, quantity, and currency values shall use scale-four decimal strings with round-half-to-even at declared boundaries; quantities shall satisfy positive, pack, minimum, cumulative-receipt, and 1,000,000-unit-per-line bounds. | Boundary and property tests cover zero, halves, maximum, overflow, negative/nonfinite values, pack/MOQ order, exact serialization, pagination stability, response size, ten-line performance, 100-line acceptance, 101-line rejection, and cumulative 6+4 versus rejected 6+5 receipt fixtures. | Reject the request or affected product explicitly; never clip, truncate, double-round, over-receive, or reinterpret an invalid number. |
| NFR1.5 | The fixed local acceptance profile shall run one co-deployed Retail Data/Planning-Purchasing pod with three bounded Review Job worker slots while all three seeded retailers have active 100-product reviews, five interactive users execute the NFR1.1 read mix and NFR1.2 command mix, and one user records ten-line receipt traffic. Under the NFR2.1 pod limit and complete 16 GiB/3 CPU cluster envelope, reads shall retain p95 below 500 ms, commands/receipts p95 below 750 ms, and every review shall retain the 60-second NFR1.3 deadline. | After warm-up, run the combined workload for at least ten minutes and repeat it three times from a clean seeded state. Each run publishes per-operation p50/p95/p99/max, three review phase timelines, worker-slot occupancy, queue age, receipt conservation, error/conflict rate, PostgreSQL pool/wait time, RabbitMQ/Redis state, pod and whole-cluster CPU/RAM/storage/throttling/restarts, and exact limits. Any latency/deadline, correctness, pod, or cluster-budget breach fails the profile. | Apply bounded backpressure or return explicit capacity/timeout without partial effects; never add replicas, worker slots, CPU, RAM, or host capacity during the acceptance run. |

## Limitations

The 750 ms command target applies through ten lines; valid requests of 11-100
lines retain correctness and bounded-timeout requirements but have no 750 ms
claim. These are portfolio workload targets, not a public production SLA.
