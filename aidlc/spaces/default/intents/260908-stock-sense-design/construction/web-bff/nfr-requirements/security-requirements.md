# Web BFF Security Requirements

Unit: U11 Web BFF (`web-bff`)

## Security boundary

U11 is the sole browser-facing OIDC client and the same-origin security and
composition boundary. It owns the opaque cookie, Redis session, CSRF binding,
selected retailer navigation state, generated provider clients, and browser-safe
mapping. U3 owns authentication; U4 owns membership and placement; U4-U10 own
domain authorization, state transitions, idempotency, and durable operations.

## Threat boundaries

| Boundary | Primary threats | Required control |
| --- | --- | --- |
| Browser to U11 | token theft, callback replay, CSRF, unsafe redirect, oversized input | authorization code with PKCE, exact callback, state/nonce, secure host-only cookie, origin/CSRF validation, local return-path allowlist, size/rate limits |
| U11 session to Redis | fixation, stale refresh owner, eviction, cross-session data | high-entropy opaque ID, generation/version checks, fenced refresh, `noeviction`, bounded records, TLS and workload credentials |
| U11 to U3/U4/providers | confused deputy, tenant substitution, broad token, malformed response | delegated user token, current membership/placement, generated clients, route/session agreement, provider reauthorization, response validation |
| Browser operation handle | forgery, disclosure, replay under another user/tenant | authenticated encryption, 24-hour expiry, Vault-managed versioned keys, current authority check, tenant-hiding denial |
| Cache and telemetry | stale authority, cross-tenant key collision, secret or identifier leakage | authority-complete cache keys, short expiry, no mutation authority, redaction, bounded labels |

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR3.1 | Every retailer-scoped route shall match the selected session retailer and shall revalidate current subject, membership, role where required, placement generation, resource ownership, and provider authorization. A URL, cookie, cache record, operation handle, correlation value, or machine credential shall never grant retailer authority. | Negative tests substitute subject, retailer, role, resource, placement generation, route, cookie generation, delegated-token claims, and provider operation IDs across two tenants and concurrent requests. | Deny before disclosure or mutation and return tenant-hiding `404` where resource existence is sensitive. |
| NFR3.2 | A same-origin operation URL shall carry only a BFF-issued encrypted and authenticated opaque handle containing provider route class, provider operation ID, subject, retailer, placement generation, issue/expiry time, and key version. The handle lasts at most 24 hours, uses current/previous key overlap, and is reauthorized on every lookup against provider-owned durable status. | Tamper, truncation, expiry, key-overlap, stale-placement, wrong-subject, wrong-retailer, revoked-membership, replay, Redis-loss, and reauthentication tests prove no cross-tenant result and no command recreation. | Return a safe tenant-hiding denial or expired result; never expose raw provider URLs/IDs or submit new work. |
| NFR3.3 | Metadata cache keys shall include subject, retailer, placement generation, scopes, provider, metadata kind, source version, and contract version. Only already-authorized metadata may be cached; membership, mutation output, allowance, and provider operation state are never authority from cache. | Collision and invalidation tests vary each key dimension, authority/version changes, positive/unavailable expiry, cache loss, and concurrent tenants. | Miss or invalidate the entry and call the authority within its deadline; never serve a less-specific or foreign entry. |
| NFR5.1 | Browser login shall use U11 as the sole OIDC client with authorization code and PKCE, exact `https://app.stocksense.localhost/signin-oidc` redirect registration, state/nonce and one-time login transaction validation, server-side token storage, and local return-path allowlisting. | Tests cover exact and lookalike redirects, `/auth/callback` as an invalid registered redirect, state/nonce/PKCE/code replay, lost transaction, issuer/audience/signature/lifetime failure, Google-unconfigured mode, and safe continuation. | Consume or discard unsafe protocol state, issue no browser session, and return a generic safe outcome. |
| NFR5.2 | The browser shall receive only a Secure, HttpOnly, `SameSite=Lax`, host-only `__Host-stocksense-session` cookie. U11 shall rotate session and CSRF state after login, context/security rotation, and logout; require same-origin `Origin` or valid fallback `Referer` plus `X-CSRF-Token` on every mutation; and send private responses with `Cache-Control: no-store`. TLS 1.2 or later is required. | Positive and negative tests cover missing/forged/stale CSRF, cross-origin requests, cookie flags/scope, old-cookie replay, logout repetition, session expiry, route mismatch, downgraded TLS, and browser caches. | Reject before upload-body or provider processing, expire invalid cookies where safe, and create no provider effect. |
| NFR5.3 | Refresh-token rotation shall follow the fenced single-winner behavior in NFR5.5. Tokens, refresh credentials, service credentials, operation-handle keys, and provider secrets remain server-side and are never returned to browser code. | Concurrent refresh, reuse, exception, tracing, error-page, browser-storage, and developer-tool fixtures verify one winner and no credential exposure. | Revoke uncertain/reused state and require reauthentication; never retry an uncertain refresh credential. |
| NFR5.4 | U11 shall limit login starts to five per minute per client and 20 per hour, ordinary reads to 120 per minute per session, and mutations to 30 per minute per session, while retaining stricter upload and SSE limits. Limits shall isolate clients/sessions and avoid account enumeration. | Boundary, replenishment, concurrency, restart, and two-client/two-session tests prove deterministic admission and sanitized `429` results. | Reject excess work before expensive authentication, body reading, or provider mutation where safe; never disclose account or tenant existence. |
| NFR6.1 | Session/data-protection material, operation-handle keys, Redis credentials, provider credentials, and TLS material shall remain outside Git, images, logs, manifests, and Terraform state and be delivered through workload-scoped Vault/VSO access. Applicable persisted platform data and backups shall be encrypted. Key rotation retains current/previous handle decryption overlap and validates integrity before readiness. | Secret/state/image scans, RBAC/mount tests, sealed-Vault startup, unauthorized-workload access, normal/emergency rotation, old-key retirement, corrupt-key, restart, backup, and recovery tests pass without exposing values. | Keep the dependent capability unready, deny decryption/authentication, and rotate suspected exposure; never generate a fallback production secret. |
| NFR8.1 | C16-C18 shall use versioned OpenAPI 3.1 contracts with valid examples, generated clients, response-size bounds, stable RFC 9457 problems, and compatibility checks. C18 shall define HTTP `200` typed complete/partial dashboards, retailer selection, command admission, uncertain outcomes, encrypted operation locations/status, uploads, polling, assistant SSE/snapshots, and all agreed error states. Its audit query shall inherit U10's maximum 90-day range, page default 50/maximum 200, maximum five filters, 1 MiB response limit, stable opaque cursor, generation, checkpoint, observed lag, and `Fresh`/`Stale`/partial/`Unavailable` mappings. C17 shall declare contract-major-version resilience isolation. | CI validates syntax, examples, generated client/server compatibility, breaking changes, exact callback, all size/rate/status/query bounds, stable cursor traversal, freshness mappings, and provider/BFF mappings. Invalid or unresolved C16-C18 placeholders fail the change. | Block the applicable change or deployment; runtime validation never turns a malformed response into authority. |
| NFR10.1 | Logs, traces, metrics, errors, browser responses, and evidence shall exclude credentials, tokens, cookies, CSRF values, codes, PKCE values, secret references, operation-handle plaintext, raw uploads, full prompts, hidden reasoning, provider exception bodies, and foreign-tenant data. | Canary, exception, problem-detail, upload, callback, refresh, handle, and telemetry-export tests inspect every signal and browser surface. | Redact/drop unsafe data, increment a bounded loss indicator, and fail evidence publication when safe proof is unavailable. |
| NFR13.1 | CI shall run U11 build/test, OpenAPI, generated-client compatibility, browser-security, tenant-isolation, refresh-concurrency, rate/size, resilience, recovery, secret, dependency, container, and supply-chain checks on hosted untrusted runners. Only a trusted immutable revision may reach the isolated local deployment runner. | Workflow policy and hostile fixtures prove public PR code receives no local runner, cluster, Vault, Redis, provider, deployment, or owner credentials. | Block release/deployment and preserve safe failed-control evidence. |
| NFR14.1 | C18 shall expose stable English codes and typed loading, empty, complete, partial, stale, unavailable, denied, expired, throttled, uncertain, and snapshot-required states without sensitive detail. U12 owns keyboard and visual accessibility; U11 preserves original multilingual provider text only when the contract classifies it browser-safe. | Contract and browser integration tests resolve every state and error to documented U12 behavior and verify no unsupported language or accessibility certification is claimed. | Return a safe generic state when detail cannot be disclosed; never collapse a partial or stale result into complete. |

## Explicit limitations and contract actions

- U11 has no PostgreSQL role or schema; NFR4 is not applicable to this unit.
- U11 owns no durable RabbitMQ integration; NFR7 remains provider-owned and is
  not replaced by HTTP or SSE.
- C16 must use `/signin-oidc` as the registered protocol callback.
- C18 must replace application-level `206` with HTTP `200` plus typed aggregate
  and per-section states and must add implementable C16-C18 operation schemas.
- The exact maintained cryptographic provider and package versions are pinned
  during implementation; hand-written cryptography is prohibited.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-21T14:18:22Z
**Iteration:** 1
**Request Challenge:** review:be85402b0dbe1e8d6404ea81e3e8cd41

### Findings

No gate-relevant findings.

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Traceability target resolution | PASS: all 15 inception NFR IDs are dispositioned and every `OK` target resolves to a detailed requirement row | The detailed NFR catalogue is complete for U11, with explicit justified `N/A` dispositions for NFR4, NFR7, and NFR12. |
| C16-C18 shared-contract cross-reference | PASS: C16, C17, and C18 all resolve in the passed contract catalogue | The revised NFRs identify the catalogue deltas that must block implementation until incorporated: `/signin-oidc`, generated-client and contract-major isolation metadata, typed HTTP `200` dashboard aggregation, operation handles/status, bounded uploads, SSE/snapshot behavior, and audit query bounds. |
| Architecture consistency review | PASS | The ordinary inventory/purchasing p95 objective includes authentication, authorization, provider execution, validation, and response construction with a fixed 500+500 acceptance mix; telemetry configuration/local enqueue failures keep readiness false while collector/exporter/OpenSearch availability failures preserve safe serving with `observability-degraded`; security, isolation, resource, recovery, accessibility-state, and evidence requirements are implementable and mutually consistent. |

### Summary

The revised requirements close the prior performance-acceptance and telemetry-readiness ambiguity and turn the C16-C18 functional gaps into explicit contract and CI blockers. The Web BFF security, tenant, resilience, recovery, resource, partial-state, operation-reconciliation, accessibility-state, and traceability requirements are sufficiently concrete for implementation.

