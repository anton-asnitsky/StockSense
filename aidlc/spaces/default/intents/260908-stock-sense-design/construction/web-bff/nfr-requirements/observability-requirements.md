# Web BFF Observability Requirements

Unit: U11 Web BFF (`web-bff`)

## Signal policy

U11 emits bounded OpenTelemetry metrics, traces, and structured operational
logs. Provider-owned audit and operation state remain authoritative. A telemetry
or OpenSearch outage cannot block an otherwise safe browser or provider action.

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR10.2 | U11 shall emit bounded request count, duration, size, outcome, queue, rate-limit, session, refresh, Redis, cache, upload, SSE, provider-client, circuit, operation-reconciliation, and readiness signals. Traces shall separate authorization, Redis, provider, retry/wait, and response-building duration. | Cardinality tests resolve every required signal by stable name and bounded labels. Representative traces explain NFR1 outcomes without exposing prohibited values. | Drop or aggregate unsafe labels, increment a redaction/loss counter, and preserve the business request when security permits. |
| NFR10.3 | Immediate alerts shall cover cross-tenant disclosure, token/cookie/CSRF leakage, callback replay, refresh-token reuse or indeterminate rotation, unsafe redirect, handle integrity failure, and readiness key/contract failure. Threshold alerts shall cover circuit or queue saturation, Redis above 90%, provider uncertainty without successful reconciliation, missing keepalives, telemetry loss, and failed recovery/routing objectives. | Synthetic probes trigger and resolve every alert with threshold/window, affected bounded route/provider class, revision, runbook link, and notification evidence. | Keep the alert active until measured recovery; missing telemetry creates an observability-degraded condition rather than a healthy state. |
| NFR10.4 | Telemetry buffering, batch size, export retry, and disk/memory use shall be bounded by the platform collector profile. Readiness requires valid SDK/collector configuration, redaction rules, bounded queues, and successful local enqueue self-test, but does not require the collector exporter or OpenSearch store to be reachable after startup validation. Exporter/store failure sets `observability-degraded`, bounded queue age/usage and drop counters, while serving readiness remains true. U11 telemetry shall exclude tokens, cookies, CSRF values, authorization codes, PKCE values, operation-handle plaintext, secrets, raw uploads, full prompts, hidden reasoning, provider exception bodies, and foreign-tenant identifiers. | Canary and fault tests independently break configuration, redaction, local enqueue, collector connection, exporter, and OpenSearch. They prove the exact readiness/degraded matrix, bounded resource use, observable queue age/drop counts, recovery, and safe work continuing only for exporter/store availability failures. | Keep readiness false for unsafe or invalid local instrumentation configuration. For exporter/store outage, redact or drop according to the bounded policy, count the loss, continue safe work, and fail evidence publication when safe proof cannot be produced. |
| NFR15.1 | The U11 dashboard shall show endpoint and BFF-owned latency, provider duration, queue/rejection rates, active sessions, refresh outcomes, Redis/cache capacity, upload/SSE concurrency, circuit state, partial-dashboard causes, uncertain-operation reconciliation, pod resources, readiness, and telemetry loss. | A checksummed dashboard export and seeded scenarios prove each panel, source, time range, no-data state, and bounded filter. | Mark missing or stale data explicitly; never infer zero failures from absent signals. |
| NFR15.3 | Every U11 acceptance run shall produce revision-bound evidence linking requirement IDs, environment/configuration digest, contract versions, commands, timestamps, actual outcomes, limitations, and artifact checksums. Results support passed, failed, limited, unavailable, and not-run states. | The C19 evidence manifest resolves all referenced IDs and files and rejects duplicate, missing, or unverifiable claims. | Reject incomplete evidence and prohibit a successful performance, security, recovery, or lifecycle claim. |

## Correlation and cardinality

- Propagate one validated correlation ID across U11, U3/U4, and provider calls;
  generate a bounded replacement when the browser value is invalid.
- High-cardinality session, subject, retailer, operation, and conversation
  references may appear only as protected pseudonymous fields in authorized
  logs/traces. Metrics use route templates, provider class, outcome, aggregate
  state, and bounded status values.
- Operation-handle key version may be recorded; handle ciphertext and payload
  may not.

## Runbooks

Runbooks cover Redis pressure/loss, callback replay, refresh uncertainty,
provider circuit saturation, upload uncertainty, stale/expired SSE cursor,
operation-handle failure, contract mismatch, tenant-isolation alarm, telemetry
loss, readiness failure, and missed recovery/routing objectives.
