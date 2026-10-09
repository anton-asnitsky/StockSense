# Web BFF Reliability Requirements

Unit: U11 Web BFF (`web-bff`)

## Service profile

U11 begins as one stateless replica with Redis as disposable session state.
U3, U4, provider APIs, Redis, current protected key material, and accepted
contracts are readiness dependencies according to the operation being served.
U11 owns no PostgreSQL schema and no RabbitMQ publisher or consumer; durable
messaging and provider operations remain with U3-U10.

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR5.5 | Access-token refresh shall be serialized per session by a 15-second fenced lease. Waiters fail after five seconds, stale owners cannot commit, and an indeterminate token-endpoint/Redis commit revokes the session. Redis loss invalidates login transactions, sessions, refresh state, CSRF state, and command bindings and requires reauthentication. | Concurrency and fault tests cover one winner, lease expiry, stale-owner commit, token response before/after Redis failure, refresh reuse, Redis restart, old-cookie replay, and post-loss login. | Revoke or reject the session and require sign-in; never reuse an uncertain refresh token or restore browser authority from client data. |
| NFR9.1 | U11 operational logs shall use the platform's configurable seven-day default. U11 shall not back up or restore Redis browser sessions, login transactions, refresh state, CSRF tokens, command bindings, metadata cache, or SSE cursors. Business audit remains provider-owned and follows its 90-day policy. | Retention and recovery tests prove expired logs do not reappear, Redis state is absent after recovery, users reauthenticate, and provider-owned operations and audit remain reachable after current authorization. | Report retention or recovery inconsistency; never treat disposable Redis data as authoritative backup content. |
| NFR13.2 | Each provider and operation class shall have an isolated 20-call concurrency bulkhead plus 50 waiters for at most 500 ms. Its circuit opens for 30 seconds after five consecutive failures or at least 50% failures over 20 calls and permits two half-open probes. Isolation keys include provider, operation class, and contract major version. | Deterministic fault tests prove independent circuits, thresholds, open duration, half-open probe count, waiter expiry, safe-read retry bounds, and no mutation retry. | Fail only the affected provider/operation class with a stable partial, unavailable, or uncertain outcome; do not cascade saturation or broaden a retry. |
| NFR13.3 | Upload admission shall require provider connection within one second, no more than 15 seconds of body inactivity, and no more than two minutes total. Polling starts no faster than once per second and backs off to five seconds. SSE sends keepalives every 15 seconds, treats 45 seconds of silence as disconnected, and retains resumable cursors for five minutes before requiring a bounded provider snapshot. | Slow-body, disconnect, admitted/not-admitted ambiguity, poll-throttle, event-gap, cursor-expiry, resume, and snapshot tests prove no duplicate admission or assistant turn. | Abort only work not yet admitted, return a typed uncertain state when admission cannot be proven, and leave admitted provider work running unless its contract exposes authorized cancellation. |
| NFR15.2 | U11 and validated configuration shall be recreated within 30 minutes and remain inside the platform RPO of 24 hours and RTO of four hours. Startup/readiness shall validate current/previous handle-key overlap, provider registry/contracts, placement access, safe errors, tenant isolation, OpenTelemetry SDK/collector endpoint configuration, redaction policy, bounded queue configuration, and the ability to enqueue a local self-test signal. Exporter or OpenSearch availability is explicitly excluded from the serving-readiness gate after configuration validation: loss of export/storage sets a separate `observability-degraded` condition while readiness remains true for otherwise safe work. A one-retailer routing move shall complete within 15 minutes with at most five minutes of rejected work and no impact on another retailer. | A clean-cluster drill records elapsed time, lost disposable state, forced reauthentication, provider-operation reconciliation, every readiness check, and a routing move with concurrent control-tenant traffic. Fault fixtures distinguish invalid/missing instrumentation configuration, unsafe redaction, and unbounded queues (readiness false) from collector connection failure, exporter rejection, and OpenSearch outage after valid startup (readiness true, observability-degraded true, loss/age counters visible). | Keep U11 unready only for invalid security/contract/key/placement/instrumentation configuration or failed local enqueue validation. For exporter/store outage, continue otherwise safe provider work with bounded buffering/drop policy, expose degraded health and evidence limitations, and never report telemetry health from missing signals. |

## Degraded behavior

- Required inventory unavailability produces a typed service failure; optional
  section failures produce HTTP `200` with explicit `partial` aggregate state.
- An uncertain command is reconciled through its same-origin encrypted handle
  after reauthentication and current authority checks. U11 never creates a new
  logical command to resolve uncertainty.
- Provider or Redis failures cannot make U11 invent domain state. Invalid
  telemetry configuration fails readiness; collector/exporter/OpenSearch
  availability loss after valid startup leaves serving readiness true, sets
  `observability-degraded`, and does not block otherwise safe provider work.
- Invalid or expired operation handles return a safe denial and never trigger a
  provider mutation.

## Availability statement

The single-node, single-replica profile has no production availability SLA and
no zero-downtime claim. Recovery and isolation evidence is required for the
portfolio claim.
