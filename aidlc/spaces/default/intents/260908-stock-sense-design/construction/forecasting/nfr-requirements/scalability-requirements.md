# Forecasting Scalability Requirements

Unit: U7 Forecasting (`forecasting`)

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR2.1 | The API shall request 256 MiB/0.10 CPU and limit 512 MiB/0.25 CPU; the worker shall request 512 MiB/0.25 CPU and limit 2 GiB/1 CPU with at most 1 GiB ephemeral job storage. | Measure sustained/peak service, worker, model, buffers, PostgreSQL/Redis clients, throttling, OOM/restart behavior, and complete-cluster RAM/CPU/storage while the maximum seeded run executes. | Fail/serialize work and publish measured limitations; do not silently increase the approved 16 GiB/3 CPU host budget. |
| NFR2.2 | U6 Model Lifecycle owns the PostgreSQL-backed cluster heavy-compute lease and exposes an internal versioned coordination API to U6 and U7; neither unit accesses the other's tables. The singleton scope is `stocksense/local-heavy-compute`. Acquire supplies workload identity, retailer, job/run ID, class, due time, and expected lease version and returns a monotonically increasing fencing token plus a 60-second lease; renew is required every 15 seconds and release is idempotent. The coordinator orders overdue scheduled Forecast Runs first, then earlier due scheduled runs, then Operator reruns and lifecycle jobs by enqueue time, while admitting at least one waiting lifecycle job after three consecutive forecast grants when no forecast is overdue. Queues allow three runs per retailer and ten cluster-wide, with a 15-minute start deadline. | Contract and multi-retailer tests prove mutual exclusion across U6/U7, authorization, due-time/FIFO ordering, starvation bound, optimistic acquire races, renewal, idempotent release, stale-fence rejection at finalization, holder crash, API/network partition, coordinator restart, queue overflow, deadline expiry, and responsive reads. The lease row, queue decisions, and fencing sequence survive restart and restore. | Reject overflow before expensive work. A holder that cannot renew stops before authoritative commit; stale fencing tokens cannot finalize. Coordinator unavailability admits no new heavy work. A start timeout consumes one transient run attempt and never creates another daily effect or revision. |
| NFR2.3 | Forecast state, queues, caches, and evidence shall be independently extractable by retailer. Worker replicas may scale stateless admission/reads but cannot bypass the cluster lease; placement migration preserves identifiers, pointers, versions, and history. | Move one seeded retailer to a dedicated placement, add API/worker replicas, and verify stale placement rejection, no duplicate finalization, no cross-tenant cache, and unchanged contracts. | Fence stale workers/placements and keep pointers unavailable until migration reconciliation succeeds. |

## Capacity triggers

Revisit limits when three representative runs breach their approved deadline,
queue age repeatedly exceeds five minutes, resources exceed 90% for five
minutes, or ephemeral storage exceeds 80%. Any change requires whole-stack
remeasurement and a versioned deployment profile.

## Limitations

The initial profile prioritizes bounded local reproducibility over parallel
inference throughput. Freshness alerts expose pressure; they do not authorize
additional host capacity or silent fallback.
