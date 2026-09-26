# Assistant Scalability Requirements

Unit: U9 Assistant (`assistant`)

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR2.1 | The Assistant API/Strands orchestrator shall limit at 1 GiB/0.50 CPU and the local model runtime at 6 GiB/1 CPU. Optional GPU pass-through is measured separately. Both workloads and all dependencies shall remain inside the approved 16 GiB/3 CPU cluster envelope. | Measure sustained/peak CPU, RAM, GPU/VRAM when present, storage, model mapping, context buffers, Python/runtime overhead, connection pools, throttling, OOM/restart behavior, and whole-cluster overhead during maximum prompt, streaming, tools, citations, GenUI, evaluation, and recovery scenarios. | Apply backpressure or fail explicitly; do not silently raise limits, require extra host resources, or substitute GPU/Bedrock for the CPU acceptance path. |
| NFR2.2 | Only one local generation shall run cluster-wide. A second active turn in the same conversation shall be rejected with the current turn identity. Queues shall allow at most two turns per retailer and five cluster-wide for five minutes while authorized tool-only/read endpoints remain within their declared deadlines. | Multi-retailer load tests exercise five queued turns, per-retailer overflow, duplicate submissions, same-conversation overlap, cancellation, queue expiry, model restart, fairness, and concurrent read tools. Prove one generation slot, stable identities, bounded memory, and no cross-tenant queue disclosure. | Reject overflow with sanitized `429`/`503`, fail a five-minute expiry explicitly, and preserve admitted turn state; never merge, silently queue same-conversation work, or bypass the generation lease. |
| NFR2.3 | Prompt, retrieval, tool, citation, GenUI, response, and conversation-memory bounds shall be enforced before model or downstream expansion. Assistant state, messages, caches, queues, evaluation evidence, and source references shall remain independently extractable by retailer without changing stable identities. | Property/load tests combine 4,096-token prompts, eight tool calls, 20 results each, eight retrieved chunks, ten citations, 1 MiB output, tenant extraction, stale placement, cache invalidation, and replica restart. | Return a stable bounded/placement error, fence stale work, and keep unresolved conversations unavailable; never drop provenance or mix tenant/model/index versions to fit a limit. |

## Capacity triggers

Revisit the profile after three representative runs breach first-token or total
targets, queue age repeatedly exceeds two minutes, five-minute expiries occur,
tool-only reads miss deadlines under the full queue, or CPU/RAM exceeds 90% for
five minutes. Any change requires whole-stack CPU-path remeasurement and a
versioned generation profile.

## Limitations

The initial profile intentionally serializes local generation for portfolio
reproducibility. Additional model replicas require a new capacity and isolation
profile; they cannot be inferred from stateless API scaling.
