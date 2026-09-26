# Retail Data Scalability Requirements

Unit: U4 Retail Data (`retail-data`)

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR2.1 | The co-deployed Retail Data and Planning/Purchasing application pod shall start with a 512 MiB/0.20 CPU request and a 1.5 GiB/0.75 CPU limit. PostgreSQL, RabbitMQ, and Redis remain separate measured workloads. Import parsing and validation shall stream or chunk data rather than retain an unbounded file/row graph. | Measure sustained/peak CPU, memory, throttling, restarts, managed-heap/GC behavior, import buffers, and whole-stack resource use during all maximum workloads. | Report failure or limitation; serialize work or retune measured values without weakening atomicity, security, or the 13 GiB/2.5 CPU application quota. |
| NFR2.2 | The unit shall run one active import per retailer, at most one maximum-size demand import cluster-wide, one pending import per retailer, and at most three pending imports cluster-wide. A job that cannot start within ten minutes fails retryably. | Concurrency tests span three retailers, queue fairness, duplicate admission, deadline expiry, pod restart, and `429` overflow while interactive NFR1 traffic remains within budget. | Reject excess work before source processing, preserve the admitted job identity, and never silently drop or indefinitely queue work. |
| NFR2.3 | Redis outage fallback shall permit 20 concurrent authoritative PostgreSQL reads per pod and queue 100 more, with request coalescing and a 750 ms database budget. | Outage tests prove identical requests coalesce, pool use remains bounded, authorized responses remain correct, overflow receives explicit `503`, and recovery cannot publish a stale fill. | Shed overflow with retry guidance; never use Redis for membership, role, placement, receipt, purchasing, or quota authority. |

## Capacity triggers

Revisit allocation or decomposition when p95 breaches persist for ten minutes,
CPU throttling exceeds 10% of measured time, memory exceeds 80% of the limit,
or the admitted workload repeatedly reaches queue/fallback limits. Any scale-out
design must preserve single-transaction U4/U8 receipt atomicity or explicitly
approve a new consistency model.

## Limitations

The initial single-pod modular deployment is a deliberate transaction boundary,
not a claim that logical U4 and U8 ownership has been merged.
