# StockSense Web BFF NFR Requirements Questions

Date: 2026-09-20
Stage: NFR Requirements
Unit: web-bff
Status: In progress

The approved baseline is a same-origin ASP.NET Core BFF with a Redis-backed
opaque browser session, Duende IdentityServer OIDC authorization-code/PKCE,
server-side delegated tokens, CSRF protection, generated provider clients,
streamed uploads, bounded composition, assistant SSE, and provider-owned
commands and operations. Redis loss signs users out and cannot erase, repeat,
or complete provider work. These questions quantify the remaining profile and
close the implementation gaps identified by the functional review.

## Interaction mode

Continue with the established guided-question workflow.

- A. Guide me through each question (Recommended)
- B. I will edit this file directly
- C. Answer all questions in chat
- X. Other (please specify)

[Answer]: A. Guide me through each question (Recommended)

## Q1. Browser and BFF latency budgets

Which warmed local performance profile should U11 meet?

- A. Under five concurrent users, require BFF-owned overhead below 150 ms p95 for session, retailer-context, proxy-read, and operation-status requests; require complete dashboard responses below one second p95 when providers meet their budgets; require mutation and long-job admission responses below 500 ms p95 excluding provider-owned long-running work; run each representative mix for at least five minutes and 500 requests and report BFF, authorization, Redis, provider, and response-building time separately (Recommended)
- B. Use one two-second p95 target for all browser requests without separating BFF and provider time
- C. Measure latency without release thresholds
- X. Other (please specify)

[Answer]: A. Under five concurrent users, require BFF-owned overhead below 150 ms p95 for session, retailer-context, proxy-read, and operation-status requests; require complete dashboard responses below one second p95 when providers meet their budgets; require mutation and long-job admission responses below 500 ms p95 excluding provider-owned long-running work; run each representative mix for at least five minutes and 500 requests and report BFF, authorization, Redis, provider, and response-building time separately (Recommended)

## Q2. BFF resources, request concurrency, and backpressure

Which bounded local capacity profile should the Web BFF use?

- A. Request 256 MiB/0.10 CPU and limit one BFF replica to 512 MiB/0.25 CPU; support five active local users, at most ten in-flight requests per session, 100 in-flight requests cluster-wide, and 100 queued requests waiting no more than 500 ms; reserve upload and SSE capacity separately; reject overflow with safe `429` or `503`; accept the profile only when the complete stack remains inside 13 GiB/2.5 CPU (Recommended)
- B. Allocate 1 GiB/0.50 CPU and allow unbounded request queuing
- C. Choose resources and concurrency after implementation
- X. Other (please specify)

[Answer]: A. Request 256 MiB/0.10 CPU and limit one BFF replica to 512 MiB/0.25 CPU; support five active local users, at most ten in-flight requests per session, 100 in-flight requests cluster-wide, and 100 queued requests waiting no more than 500 ms; reserve upload and SSE capacity separately; reject overflow with safe `429` or `503`; accept the profile only when the complete stack remains inside 13 GiB/2.5 CPU (Recommended)

## Q3. Redis capacity, eviction, and refresh fencing

How should ephemeral session state and token refresh be bounded?

- A. Limit BFF-owned Redis data to 256 MiB, 1,000 active sessions, 32 KiB per session, 8 KiB per login transaction, and 4 KiB per command binding; use `noeviction`, reject new login/session work at 90% memory, and warn at 80%; retain the confirmed 30-minute idle and eight-hour absolute session limits; serialize refresh with a 15-second fenced lease, make waiters fail after five seconds, reject stale owners, and revoke the session on an indeterminate token-endpoint/Redis commit (Recommended)
- B. Allow Redis LRU eviction and retry refresh-token use after an indeterminate commit
- C. Leave capacity, eviction, lock, and waiter behavior implementation-defined
- X. Other (please specify)

[Answer]: A. Limit BFF-owned Redis data to 256 MiB, 1,000 active sessions, 32 KiB per session, 8 KiB per login transaction, and 4 KiB per command binding; use `noeviction`, reject new login/session work at 90% memory, and warn at 80%; retain the confirmed 30-minute idle and eight-hour absolute session limits; serialize refresh with a 15-second fenced lease, make waiters fail after five seconds, reject stale owners, and revoke the session on an indeterminate token-endpoint/Redis commit (Recommended)

## Q4. Provider deadlines, bulkheads, circuits, and safe retries

Which generated-client isolation profile should U11 enforce?

- A. Use a one-second connect deadline, three-second total deadline for interactive reads, five-second total deadline for commands/admission, one safe-read retry with 100-250 ms jitter inside the original deadline, and no automatic mutation retry; give each provider a 20-call concurrency bulkhead plus 50 waiters for at most 500 ms; open its circuit for 30 seconds after five consecutive failures or at least 50% failures over 20 calls, then allow two half-open probes; key isolation by provider, operation class, and contract major version (Recommended)
- B. Use a shared ten-second timeout and one global circuit for every provider
- C. Let each client library choose defaults
- X. Other (please specify)

[Answer]: A. Use a one-second connect deadline, three-second total deadline for interactive reads, five-second total deadline for commands/admission, one safe-read retry with 100-250 ms jitter inside the original deadline, and no automatic mutation retry; give each provider a 20-call concurrency bulkhead plus 50 waiters for at most 500 ms; open its circuit for 30 seconds after five consecutive failures or at least 50% failures over 20 calls, then allow two half-open probes; key isolation by provider, operation class, and contract major version (Recommended)

## Q5. Upload streaming and admission limits

How should CSV/PDF upload forwarding be bounded?

- A. Keep the 10 MiB CSV and 25 MiB PDF defaults; allow two concurrent uploads cluster-wide and one per session; cap BFF buffering at 256 KiB per upload; require the provider connection within one second, a 15-second body-idle timeout, and a two-minute total admission window; abort before admission on disconnect or limit failure, never retry automatically after bytes may have been admitted, and return explicit `413`, `415`, `422`, `429`, `503`, or uncertain-admission status (Recommended)
- B. Buffer each complete upload in BFF memory and allow five concurrent 25 MiB uploads
- C. Defer streaming memory, concurrency, and time limits
- X. Other (please specify)

[Answer]: A. Keep the 10 MiB CSV and 25 MiB PDF defaults; allow two concurrent uploads cluster-wide and one per session; cap BFF buffering at 256 KiB per upload; require the provider connection within one second, a 15-second body-idle timeout, and a two-minute total admission window; abort before admission on disconnect or limit failure, never retry automatically after bytes may have been admitted, and return explicit `413`, `415`, `422`, `429`, `503`, or uncertain-admission status (Recommended)

## Q6. Polling, assistant SSE, and resume bounds

Which long-running-operation and event-stream profile should apply?

- A. Poll no faster than once per second, back off to five seconds, and honor larger provider retry guidance; keep SSE alive every 15 seconds, treat 45 seconds without an event/keepalive as disconnected, allow one stream per conversation, two per session, and 20 cluster-wide, and retain resumable event cursors for five minutes after disconnect; after cursor expiry require a bounded provider snapshot rather than replaying an unbounded stream (Recommended)
- B. Poll every 250 ms and retain all SSE events for the session lifetime
- C. Leave cadence, keepalive, concurrency, and cursor retention to the UI
- X. Other (please specify)

[Answer]: A. Poll no faster than once per second, back off to five seconds, and honor larger provider retry guidance; keep SSE alive every 15 seconds, treat 45 seconds without an event/keepalive as disconnected, allow one stream per conversation, two per session, and 20 cluster-wide, and retain resumable event cursors for five minutes after disconnect; after cursor expiry require a bounded provider snapshot rather than replaying an unbounded stream (Recommended)

## Q7. Browser responses, dashboard partial state, and metadata cache

Which response and cache contract should U11 expose?

- A. Cap ordinary JSON responses at 1 MiB and assistant snapshots at 2 MiB; return dashboard HTTP `200` with explicit `complete` or `partial` aggregate state and typed state for every requested section, replacing application-level `206`; cache only already-authorized metadata for 30 seconds when positive and five seconds when unavailable, with at most 10,000 entries/128 MiB; include subject, retailer, placement, scopes, provider, metadata kind, source version, and contract version in keys and invalidate on authority or version change (Recommended)
- B. Keep `206` for partial dashboards and cache provider DTOs for five minutes without contract-version keys
- C. Use unbounded responses and framework cache defaults
- X. Other (please specify)

[Answer]: A. Cap ordinary JSON responses at 1 MiB and assistant snapshots at 2 MiB; return dashboard HTTP 200 with explicit complete or partial aggregate state and typed state for every requested section, replacing application-level 206; cache only already-authorized metadata for 30 seconds when positive and five seconds when unavailable, with at most 10,000 entries/128 MiB; include subject, retailer, placement, scopes, provider, metadata kind, source version, and contract version in keys and invalidate on authority or version change (Recommended)

## Q8. Redis-independent command reconciliation

How should an uncertain provider command remain reconcilable after Redis loss?

- A. Return a same-origin operation URL containing a BFF-issued encrypted and authenticated opaque handle that carries only provider route class, provider operation ID, subject, retailer, placement generation, issued/expiry time, and key version; protect keys in Vault, allow a 24-hour handle lifetime and current/previous key overlap, reauthorize current subject/retailer/placement on every lookup, use provider-owned durable status/idempotency as authority, return tenant-hiding `404` when unauthorized, and never recreate the command when the handle is invalid or expired (Recommended)
- B. Store the only operation mapping in Redis and declare reconciliation unavailable after Redis loss
- C. Expose raw provider URLs and identifiers directly to the browser
- X. Other (please specify)

[Answer]: A. Return a same-origin operation URL containing a BFF-issued encrypted and authenticated opaque handle that carries only provider route class, provider operation ID, subject, retailer, placement generation, issued/expiry time, and key version; protect keys in Vault, allow a 24-hour handle lifetime and current/previous key overlap, reauthorize current subject/retailer/placement on every lookup, use provider-owned durable status/idempotency as authority, return tenant-hiding 404 when unauthorized, and never recreate the command when the handle is invalid or expired (Recommended)

## Q9. Recovery, restart, and session-loss objectives

Which recovery profile should U11 demonstrate?

- A. Recreate the stateless BFF and validated configuration within 30 minutes and remain inside the platform RPO 24 hours/RTO two hours; do not restore Redis browser sessions, login transactions, refresh state, CSRF tokens, or command bindings; force reauthentication after Redis loss while preserving provider-owned operations; validate current signing/encryption key overlap, provider registry/contracts, placement, safe errors, telemetry, and cross-tenant isolation before readiness; complete a one-retailer routing move within 15 minutes with at most five minutes of rejected work and no other-retailer impact (Recommended)
- B. Back up and restore all Redis session/token state as authoritative recovery data
- C. Inherit the platform objective without U11-specific readiness and session-loss checks
- X. Other (please specify)

[Answer]: A. Recreate the stateless BFF and validated configuration within 30 minutes and remain inside the platform RPO 24 hours/RTO two hours; do not restore Redis browser sessions, login transactions, refresh state, CSRF tokens, or command bindings; force reauthentication after Redis loss while preserving provider-owned operations; validate current signing/encryption key overlap, provider registry/contracts, placement, safe errors, telemetry, and cross-tenant isolation before readiness; complete a one-retailer routing move within 15 minutes with at most five minutes of rejected work and no other-retailer impact (Recommended)

## Q10. Security telemetry, abuse limits, and alerts

Which operational-security profile should protect the BFF?

- A. Enforce TLS 1.2+, secure host-only cookies, origin/CSRF checks, local return-path allowlists, contract validation, security headers, Vault/VSO credentials, encrypted persistence/backups, and no browser token exposure; limit login starts to five/minute per client and 20/hour, ordinary reads to 120/minute per session, mutations to 30/minute per session, and preserve the stricter upload/SSE limits; emit bounded OpenTelemetry and alert on cross-tenant disclosure, token/cookie/CSRF leakage, callback replay, refresh-token reuse or indeterminate rotation, unsafe redirect, contract mismatch, circuit saturation, Redis memory over 90%, provider uncertainty without reconciliation, telemetry loss, or recovery/readiness failure (Recommended)
- B. Rely on provider authorization and web-server defaults without BFF-specific abuse or security alerts
- C. Add rate limits and security telemetry after the first deployment
- X. Other (please specify)

[Answer]: A. Enforce TLS 1.2+, secure host-only cookies, origin/CSRF checks, local return-path allowlists, contract validation, security headers, Vault/VSO credentials, encrypted persistence/backups, and no browser token exposure; limit login starts to five/minute per client and 20/hour, ordinary reads to 120/minute per session, mutations to 30/minute per session, and preserve the stricter upload/SSE limits; emit bounded OpenTelemetry and alert on cross-tenant disclosure, token/cookie/CSRF leakage, callback replay, refresh-token reuse or indeterminate rotation, unsafe redirect, contract mismatch, circuit saturation, Redis memory over 90%, provider uncertainty without reconciliation, telemetry loss, or recovery/readiness failure (Recommended)

## Ambiguity Scan

- The one-second complete-dashboard objective applies when all providers meet their allocated parallel budgets. The general three-second safe-read deadline remains the ceiling for other interactive provider calls, including the single in-budget retry.
- The BFF's 512 MiB/0.25 CPU limit and the 256 MiB Redis data limit are separate component budgets. Both must fit inside the complete local stack limit of 13 GiB/2.5 CPU.
- Upload and SSE capacity are reserved separately from the 100 ordinary in-flight request slots so long-lived streams cannot starve interactive traffic.
- Redis uses `noeviction`; admission closes at 90% memory. Redis loss invalidates browser sessions and refresh state, but provider-owned commands and durable operations remain authoritative.
- An indeterminate refresh-token exchange revokes the affected BFF session. An indeterminate provider command is reconciled through its encrypted operation handle and is never retried automatically.
- Dashboard HTTP `200` with a typed `complete` or `partial` aggregate state supersedes the functional-design use of application-level `206` and requires the Web BFF OpenAPI contract to be updated.
- The 24-hour encrypted operation handle closes the Redis-loss reconciliation gap and requires concrete command-admission, operation-status, and error schemas in contracts C16-C18.
- The selected values bound latency, resources, concurrency, queueing, response size, cache size, upload behavior, event streaming, recovery, security, telemetry, and abuse controls. No material Web BFF NFR remains unspecified.

## Consolidated Summary

The Web BFF remains a stateless, same-origin ASP.NET Core gateway backed by disposable Redis session state. It adds less than 150 ms p95 of owned overhead under five concurrent users, serves complete dashboards in under one second p95 when providers meet their budgets, and admits mutations or long jobs in under 500 ms p95 excluding provider execution. Each representative test mix runs for at least five minutes and 500 requests with BFF, authorization, Redis, provider, and response-building time reported separately.

One BFF replica requests 256 MiB/0.10 CPU and is limited to 512 MiB/0.25 CPU. It permits ten in-flight requests per session, 100 ordinary requests cluster-wide, and 100 queued requests for at most 500 ms, with separate upload and SSE reservations. Overflow receives safe `429` or `503` responses, and the complete local stack must remain inside 13 GiB/2.5 CPU.

Redis is limited to 256 MiB of BFF-owned data and 1,000 active sessions, using bounded session, login-transaction, and command-binding records with `noeviction`. Admission warns at 80% memory and rejects new login/session work at 90%. Sessions retain a 30-minute idle and eight-hour absolute lifetime. Refresh uses a 15-second fenced lease, five-second waiter limit, stale-owner rejection, and session revocation after an indeterminate token exchange or Redis commit.

Generated provider clients use a one-second connection deadline, three-second interactive-read deadline, five-second command/admission deadline, one jittered safe-read retry inside the original deadline, and no automatic mutation retry. Each provider and operation class has an isolated 20-call bulkhead, 50 half-second waiters, and a circuit that opens for 30 seconds after five consecutive failures or at least 50% failures over 20 calls, with two half-open probes.

CSV and PDF forwarding retains the 10 MiB and 25 MiB limits, permits two uploads cluster-wide and one per session, and buffers no more than 256 KiB per upload. Connection, idle, and total-admission deadlines are one second, 15 seconds, and two minutes. The BFF never retries after bytes may have been admitted and returns typed rejection or uncertain-admission results.

Operation polling starts no faster than once per second and backs off to five seconds. Assistant SSE emits a keepalive every 15 seconds, disconnects after 45 seconds of silence, permits one stream per conversation, two per session, and 20 cluster-wide, and retains cursors for five minutes before requiring a bounded provider snapshot.

Ordinary JSON responses are capped at 1 MiB and assistant snapshots at 2 MiB. Dashboards use HTTP `200` plus typed per-section state and an explicit aggregate `complete` or `partial` state. The BFF caches authorized metadata for 30 seconds and unavailable results for five seconds, bounded to 10,000 entries/128 MiB, with subject, retailer, placement, scopes, provider, metadata kind, source version, and contract version in every key.

Provider commands remain recoverable after Redis loss through BFF-issued encrypted and authenticated same-origin operation handles valid for 24 hours. Vault protects rotating keys with current/previous overlap. Every lookup reauthorizes the current subject, retailer, and placement; provider-owned durable status and idempotency remain authoritative; unauthorized access returns tenant-hiding `404`; invalid or expired handles never recreate work.

The BFF and validated configuration can be recreated within 30 minutes while remaining inside the platform's 24-hour RPO and two-hour RTO. Redis state is not restored; users reauthenticate while provider operations remain intact. Readiness validates key overlap, provider registry and contracts, placement, safe errors, telemetry, and cross-tenant isolation. A single-retailer routing move completes within 15 minutes with no more than five minutes of rejected work and no impact on other retailers.

Security requires TLS 1.2+, secure host-only cookies, origin and CSRF checks, safe return paths, contract validation, security headers, Vault/VSO credentials, encryption for applicable persisted data and backups, and no browser token exposure. Login starts are limited to five per minute per client and 20 per hour; ordinary reads to 120 per minute per session; and mutations to 30 per minute per session. Bounded OpenTelemetry and actionable alerts cover tenant disclosure, credential leakage, replay, refresh-token anomalies, unsafe redirects, contract mismatch, saturation, Redis pressure, unreconciled uncertainty, telemetry loss, and failed recovery or readiness.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
