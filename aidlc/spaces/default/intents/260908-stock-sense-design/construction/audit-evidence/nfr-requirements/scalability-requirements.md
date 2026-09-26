# Audit Evidence Scalability Requirements

Unit: U10 Audit Evidence (`audit-evidence`)

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR2.1 | The Audit Evidence API/worker, single-node OpenSearch, and Dashboards shall start with a combined limit of 3 GiB RAM and 0.75 CPU. The complete application stack shall still fit the approved 13 GiB/2.5 CPU Kubernetes application quota within the 16 GiB/3 CPU host envelope. | Measure sustained and peak pod/cluster CPU, RAM, storage, Kubernetes overhead, throttling, garbage collection, OpenSearch pressure, restart behavior, and all other demonstrated workloads. Retain the measured configuration and failed runs. | Do not use unapproved host capacity. If the complete stack misses the quota, fail acceptance and reduce and pin the component profile before release. |
| NFR2.2 | With the fixed resource profile, U10 shall sustain 20 valid events/second for ten minutes, absorb a burst of 1,000 events without loss, and keep the five-user query mix within NFR1.1. Heavy rebuild, replay, retention, and recovery work is serialized. | Run combined ingestion, query, duplicate-delivery, DLQ, telemetry, and one permitted maintenance-job load. Publish accepted/projected/dead-lettered counts, queue age, lag, query latency, errors, checkpoints, and resource peaks. | Apply bounded backpressure or reject work explicitly; never lose a retained event, acknowledge before checkpoint, start an unpermitted heavy job, or raise limits silently. |
| NFR2.3 | Each retailer shall use a server-owned alias to one active immutable projection generation. The local profile uses one primary shard, zero replicas, rollover at 1 GiB or seven days, and separate index patterns and roles for business audit and operational logs. Clients cannot select an index. | Tests prove route resolution, 1 GiB/time rollover, active/inactive isolation, no direct client index choice, generation validation, atomic expected-version activation, and independent operational-log retention. | Reject stale or foreign route/version work, keep invalid generations inactive, and preserve the prior active route. |
| NFR2.4 | At most one replay or rebuild shall run cluster-wide and at most one shall affect a given retailer. One active replay is allowed per queue, with batches capped at 100 events. Tenant projection state shall remain independently movable and extractable without changing event IDs or business chronology. | Concurrency and movement tests cover competing operator requests, queue replay, unrelated retailer traffic, cancellation before activation, stale placement generations, and a 100,000-event build. | Return conflict or capacity status, fence stale placement, and keep unrelated retailers responsive and on their intended routes. |
| NFR2.5 | The local U10 profile shall cap each C15 ingress queue at 5,000 ready messages and 256 MiB, whichever arrives first, with producer confirms rejected before overflow and routing to the declared overflow/DLQ policy rather than dropping. U10 persistent allocations shall be 2 GiB PostgreSQL, 8 GiB OpenSearch data, 512 MiB OpenSearch translog/headroom reserve, 512 MiB RabbitMQ U10 durable-data budget, 256 MiB telemetry disk spool, and 4 GiB checksummed backup/evidence storage. Warn at 70% of any allocation, stop rebuild/replay admission at 80%, and make ingestion/query readiness fail before 90% while preserving already-retained evidence. | Fill each queue/storage allocation through 69/70/79/80/89/90% boundaries under combined NFR2.2 load. Prove publisher-confirm failure and safe retry at queue caps, no silent drop, retention/rollover cleanup, rebuild backpressure, query availability below the fail threshold, explicit readiness above it, accurate byte/message gauges, and total disk/RAM/CPU evidence within the Docker Desktop profile. | Reject new producer or maintenance work with bounded capacity status and retry guidance, keep committed evidence immutable, and require retention/cleanup or an explicitly versioned profile change before resuming; never evict authoritative PostgreSQL evidence or silently increase a volume. |

## Capacity triggers

Revisit and remeasure the profile when sustained ingestion exceeds 20 events/s,
a 1,000-event burst is not drained without loss, a 100,000-event rebuild misses
30 minutes, query p95 breaches for ten minutes, any NFR2.5 allocation exceeds 80%, or CPU/RAM
exceeds 90% for five minutes. A profile change requires whole-stack evidence.

## Limitations

The local profile deliberately uses no OpenSearch replica and serializes heavy
jobs. It demonstrates recovery and rebuild behavior; it does not claim a
multi-node production availability topology.
