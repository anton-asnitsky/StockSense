# Assistant Observability Requirements

Unit: U9 Assistant (`assistant`)

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR10.2 | Emit bounded OpenTelemetry logs, metrics, and traces with safe tenant hash, correlation, conversation, turn, generation-attempt, provider/profile, tool, action-draft, citation, evaluation, and version context across BFF/API, Strands, local runtime or configured Bedrock adapter, RabbitMQ, PostgreSQL routines, Redis, and every domain tool. Measure admission/queue/first-token/total latency, token counts/rates, tool latency/outcomes, citation validation, confirmations, uncertainty, safety/evaluation outcomes, recovery, and CPU/RAM/GPU/storage. | W3C-context, cardinality, redaction, canary, bounded-buffer, stream-order, provider/tool, and signal-loss tests prove end-to-end correlation and the signal-specific attribute policy. | Aggregate/drop unsafe labels, expose telemetry loss and observability-degraded state, and preserve authoritative work. |
| NFR10.3 | Warn when queue age exceeds two minutes, admission exceeds 500 ms, first token exceeds 30 seconds, outbox lag exceeds 30 seconds, or resources exceed 90% for five minutes. Alert on five-minute queue expiry, two-minute healthy no-tool completion breach, 60-second no-first-token or three-minute hard timeout, provider failure, any dead letter, Uncertain side effect over 30 seconds, citation-integrity failure, forbidden tool/action attempt, tenant disclosure/mutation, critical evaluation failure, reconciliation over one hour, or backup age over 24 hours. | Synthetic probes trigger and resolve every threshold with severity, safe correlation, provider/profile, affected operation class, runbook link, and notification evidence. | Missing telemetry cannot be interpreted as healthy; raise observability-degraded state without exposing prompts, secrets, reasoning, or foreign identifiers. |
| NFR15.3 | Dashboards and evidence manifests shall link stable requirement IDs to environment/profile/configuration/model/tool/index/contract digests, conversations/turns/attempts, latency/tokens/resources, tools, citations/claims, GenUI/action hashes, domain effects, safety/usefulness cases, retries/DLQ, retention, recovery, tests, outcomes, and limitations. | Checksummed exports resolve every stable ID and preserve passed, failed, limited, rejected, and not-run outcomes. Evidence independently reproduces the CPU path and the owner-governed side effects. | Reject incomplete evidence and prohibit latency, quality, safety, recovery, capacity, isolation, citation, or successful-demo claims without supporting artifacts. |

## Runbooks

Runbooks cover queue pressure/expiry, local-runtime failure, Bedrock
misconfiguration, hard generation timeout, tool timeout, lost stream,
confirmation expiry, uncertain side effect, citation/index mismatch, prompt
injection or forbidden action, tenant leak, evaluation regression, DLQ/replay,
restore/reconciliation, resource pressure, and telemetry loss.
