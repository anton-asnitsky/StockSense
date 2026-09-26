# Supplier Knowledge Scalability Requirements

Unit: U5 Supplier Knowledge (`supplier-knowledge`)

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR2.1 | The service shall start with a 512 MiB/0.20 CPU request and a 2 GiB/0.75 CPU limit. Source parsing shall stream/chunk input, and model loading/index building shall serialize when required by the whole-stack 16 GiB/3 CPU envelope. | Measure sustained/peak CPU, memory, model footprint, Qdrant client buffers, GC, throttling, restarts, and complete-cluster use during maximum processing and retrieval. | Report failure/limitation; serialize work or retune measured values without increasing the approved host budget or weakening quality gates. |
| NFR2.2 | Run one active extraction per retailer and at most one maximum PDF extraction cluster-wide. Permit three queued jobs per retailer and ten cluster-wide; a job not started within 15 minutes fails retryably. | Multi-retailer tests prove fairness, duplicate admission, queue limits, deadline expiry, restart recovery, and bounded `429` outcomes while retrieval remains responsive. | Reject overflow before expensive processing; retain admitted job identity and never queue indefinitely. |
| NFR2.3 | Each retailer, embedding model/configuration, and vector dimension shall use a separate generation. Only one reconciled generation is active per server-owned route; superseded valid generations remain bounded by retention. | Build/rebuild tests verify tenant/config isolation, expected/indexed counts, tombstones, checksums, atomic route switch, rollback, and cleanup. | Preserve the current valid route on failure; no shared, foreign, partially built, or dimension-incompatible fallback is allowed. |

## Capacity triggers

Revisit resource or worker concurrency when latency breaches persist for ten
minutes, memory exceeds 80% of the limit, CPU throttling exceeds 10% of measured
time, or queues repeatedly reach their limits. Any increase requires whole-stack
evidence and cannot activate both embedding candidates for every query.

## Limitations

Qdrant is a projection and may scale or rebuild independently, but authoritative
sources, terms, tombstones, and routes remain under their owning stores.
