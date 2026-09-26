# Planning and Purchasing Scalability Requirements

Unit: U8 Planning and Purchasing (`planning-purchasing`)

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR2.1 | The local profile shall run exactly one co-deployed Retail Data and Planning/Purchasing application pod, requesting 512 MiB/0.20 CPU and limited to 1.5 GiB/0.75 CPU. The process exposes exactly three bounded Review Job worker slots and a separate bounded interactive request pool; no HPA or additional application replica is active in acceptance. PostgreSQL, RabbitMQ, Redis, identity, telemetry, and other dependencies remain separately budgeted within the approved 16 GiB/3 CPU cluster envelope. | Measure sustained and peak pod/cluster CPU, RAM, storage, request/worker queues, connection pools, throttling, OOM/restart behavior, and dependency use under the exact combined NFR1.5 workload. Configuration inspection proves one replica, three worker slots, fixed limits, and no autoscaling. | Apply backpressure, serialize work, or fail explicitly; do not silently raise resource limits, add workers/replicas, or rely on extra host capacity. |
| NFR2.2 | At most one Review Job shall be active per retailer and at most three cluster-wide. Retained scheduled work shall not overlap the active retailer job. Manual requests encountered during an active job shall expose that authorized job and consume no allowance. | Multi-retailer tests prove per-retailer exclusion, three-job cluster capacity, due-time ordering, manual conflict behavior, duplicate scheduler suppression, retained scheduled activation, restart recovery, and responsive interactive reads. | Preserve the one logical job and original local date, reject or retain work according to its trigger, and never create duplicate calculations or allowance charges. |
| NFR2.3 | Contract and storage paths shall enforce the 100-product/line, 50/100-page, 1 MiB response, and 1,000,000-unit bounds before expensive work. Planning/Purchasing state, caches, messages, and evidence shall remain independently extractable by retailer without changing public identifiers or business history. | Boundary tests reject overflow before calculation or mutation. A seeded tenant-extraction exercise validates placement fencing, identifiers, versions, policy/preference history, review and purchase aggregates, idempotency, outbox/inbox, cache invalidation, and unchanged contracts. | Return sanitized `413`, `422`, `429`, or `503` as applicable; fence stale placement and keep unresolved resources unavailable. |
| NFR2.4 | During Redis failure, cache-eligible reads shall coalesce identical work and allow at most 20 concurrent PostgreSQL fallback queries per pod plus 100 waiting requests, each with a 750 ms database budget. | Load tests remove Redis under the approved five-user mix and burst above both limits. Prove bounded pool/queue use, current authority checks, stable cache-miss results, and recovery without a stampede. | Reject overflow with sanitized `503` and retry guidance, preserve authoritative writes, and alert after 30 seconds of continuous cache unavailability. |

## Capacity triggers

Revisit the profile after three representative review runs miss 60 seconds,
scheduled work repeatedly waits ten minutes after eligibility, p95 targets fail
for ten minutes, PostgreSQL fallback overflows, or CPU/RAM exceeds 90% for five
minutes. Any change requires whole-stack remeasurement and a versioned profile.

## Limitations

The local profile favors deterministic tenant isolation and purchase integrity
over parallel review throughput. Added replicas cannot bypass per-retailer
serialization, transaction locks, or the three-job cluster ceiling.
