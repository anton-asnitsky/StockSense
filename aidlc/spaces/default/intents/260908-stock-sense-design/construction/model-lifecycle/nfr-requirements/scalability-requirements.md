# Model Lifecycle Scalability Requirements

Unit: U6 Model Lifecycle (`model-lifecycle`)

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR2.1 | The API shall request 256 MiB/0.10 CPU and limit 512 MiB/0.25 CPU; the ML worker shall request 1 GiB/0.50 CPU and limit 3 GiB/1.25 CPU with at most 4 GiB ephemeral job storage; MLflow shall request 256 MiB/0.10 CPU and limit 768 MiB/0.25 CPU. | Measure sustained/peak workload and complete-cluster RAM/CPU/storage, Kubernetes/VM overhead, throttling, OOM/restart behavior, and performance while one heavy ML job runs. | Fail or serialize work and report measured limitations; do not increase the approved 16 GiB/3 CPU host budget silently. |
| NFR2.2 | At most one resource-intensive ML job shall run cluster-wide. Admit at most three queued jobs per retailer and ten cluster-wide. A job that has not acquired a lease within 15 minutes transitions atomically from `Queued` to terminal `Failed(CapacityTimeout)` without creating or consuming a `ModelJobAttempt`; no automatic retry occurs. The original operation key and hash always replay that terminal result. A currently authorized caller may submit a new logical command with a new operation key after at least 30 seconds; it receives a new job identity and queue deadline. | Multi-retailer load proves FIFO order, fairness, duplicate admission, queue overflow, the exact 15-minute transition, no attempt-budget consumption, same-key replay, changed-payload conflict, authorized new-key resubmission, cancellation, restart recovery, and responsive route resolution. | Reject overflow before expensive work, retain the terminal admitted-job identity and evidence, and never queue indefinitely or convert capacity expiry into an execution retry. |
| NFR2.3 | Each model package, dataset, evaluation, artifact, and route shall be independently extractable by retailer. Scaling workers or moving a retailer to dedicated storage shall preserve identifiers, manifests, contracts, and evidence without retraining unrelated retailers. | Export/restore one retailer, add worker replicas with the global heavy-job lease, and verify no duplicate execution, cross-tenant cache, or route drift. | Fence stale workers and placements; preserve the current validated route until migration/reconciliation succeeds. |

## Capacity triggers

Revisit limits when a passing workload breaches an approved duration three runs
in succession, queue age repeatedly exceeds five minutes, CPU or memory exceeds
90% for five minutes, or ephemeral storage exceeds 80%. Any change requires a
whole-stack remeasurement and a versioned deployment profile.

## Limitations

The first release optimizes bounded local reproducibility, not horizontal model
training throughput. The global heavy-job lease remains authoritative even when
worker replicas exist.
