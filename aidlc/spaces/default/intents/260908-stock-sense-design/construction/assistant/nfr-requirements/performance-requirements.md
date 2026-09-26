# Assistant Performance Requirements

Unit: U9 Assistant (`assistant`)

## Scope

Targets apply to a clean reviewer deployment using one supported checked-in
local Qwen profile, real CPU inference, at most 4,096 input tokens, and the
approved one-generation cluster limit. Admission, queue, prompt assembly,
generation, tool calls, evidence validation, persistence, and streaming are
reported separately. Optional AMD GPU and explicitly configured Bedrock results
are supplemental and cannot replace the CPU acceptance path.

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR1.1 | Turn admission and the first durable Queued/Running status shall achieve p95 below 500 ms under five concurrent local users. A warmed healthy CPU profile shall emit its first generated token within 30 seconds p95 and complete a 256-token no-tool response within two minutes p95. | After 20 warm-up turns, run at least 100 representative no-tool English turns for each candidate profile. Publish p50/p95/p99 admission, queue, prompt, first-token, decode, validation, persistence, and total durations; token counts/rates; error rate; CPU/RAM/GPU; model/runtime/configuration digests; and retry state. Every profile promoted for local use must meet all three p95 targets on its declared reviewer hardware class. | Return explicit queued, capacity, timed-out, unavailable, failed, or cancelled state without inventing a completed answer or switching provider. Streaming fragments remain provisional. |
| NFR1.2 | Each generation attempt shall hard-stop when no first token arrives within 60 seconds or total generation exceeds three minutes. One jittered same-provider retry is allowed only for a transient failure before any tool invocation or action draft begins; policy, schema, context, safety, and resource-limit failures are terminal. | Failure tests interrupt provider connection, first token, decoding, output validation, and model process. Prove one new recorded attempt under the same turn, no provider switch, no retry after tool/action work, preservation of completed tool evidence, and explicit terminal state. | Stop generation and persist the safe attempt outcome. After tool execution starts, preserve evidence and fail the turn explicitly; never replay a tool or side effect through provider retry. |
| NFR1.3 | Read tools shall use a three-second deadline and at most one jittered retry for safe/idempotent transport failure. Confirmed manual-review and Draft commands shall use a five-second caller deadline. Each turn shall allow at most 4,096 input and 512 output tokens, 12 recent turns plus a 1,500-token summary, eight tool calls, 20 items per tool, ten citations across three documents, and a 1 MiB terminal response plus GenUI description. | Boundary tests cover each limit and one-over rejection, prompt summarization, authority/evidence-field preservation, read timeout/retry, mutation timeout, response loss, response size, unsupported language, and terminal streaming order. Report model and downstream time separately. | Reject, summarize, paginate, or return an explicit limited/unavailable state before exceeding a bound. Never truncate authority, evidence, locator, confirmation, expected-version, or idempotency fields and never change/retry a mutation payload. |

## Limitations

The latency targets measure system behavior and reproducibility, not answer
quality. Quality and safety are separately release-gated by the versioned agent
evaluation suite. Networked Bedrock performance is not implied by local results.
