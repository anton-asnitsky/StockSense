# StockSense web-bff functional-design questions

Date: 2026-09-15
Stage: Functional Design
Unit: web-bff
Status: In progress

These questions resolve the remaining behavior choices for the .NET Web BFF across its 38 assigned stories and 138 acceptance criteria. Existing decisions remain fixed: U11 is the only browser OIDC client; Duende IdentityServer owns identity; Tenant Directory owns memberships and business roles; the BFF uses authorization code with PKCE, keeps tokens server-side, issues a secure HttpOnly cookie, validates CSRF on mutations, revalidates retailer authority, propagates correlation, consumes generated U1 clients, and owns no business entity or provider data.

## Interaction mode

The owner previously selected guided, one-question-at-a-time decisions for Functional Design, so this unit continues in that mode.

[Answer]: A. Guide me through each question (Recommended)

## Q1. Browser-session persistence and cookie replay

How should U11 persist its server-side browser session and reject invalidated-cookie replay?

- A. Store the authoritative opaque session, token references, expiry, CSRF binding, retailer selection, and cookie generation in U11-owned PostgreSQL through Dapper and owned routines; use Redis only as a disposable read-through cache; rotate the `__Host-stocksense-session` identifier on login, privilege-sensitive reauthentication, token-reuse response, and retailer-context reset; revoke the prior identifier before returning the new cookie (Recommended)
- B. Store the whole session only in Redis with TTL and require every user to sign in again after Redis loss
- C. Put encrypted access and refresh tokens in the browser cookie so the BFF remains stateless
- X. Other (please specify)

[Answer]: B. Store the whole session only in Redis with TTL and require every user to sign in again after Redis loss

## Q2. Tokens used for downstream domain calls

What credential should the BFF present when it calls U4-U10 for a signed-in user?

- A. Hold one short-lived delegated user access token for the shared `stocksense-api` audience, with narrow scopes; forward it through generated clients, propagate actor/correlation context, and require every provider to revalidate current membership, role, resource ownership, and placement generation (Recommended)
- B. Exchange the user token for a distinct audience token before every provider call
- C. Call providers with the BFF's machine credential and send the user identity only in trusted headers
- X. Other (please specify)

[Answer]: A. Hold one short-lived delegated user access token for the shared `stocksense-api` audience, with narrow scopes; forward it through generated clients, propagate actor/correlation context, and require every provider to revalidate current membership, role, resource ownership, and placement generation (Recommended)

## Q3. Retailer-context selection

How should the selected retailer affect authorization and browser routing?

- A. Keep the selection in the server-side session for navigation only; auto-select a sole membership, require an explicit CSRF-protected selection for multiple memberships, require each retailer route to match the session selection, and revalidate membership and placement before every provider call; clear stale selection without retrying uncertain mutations (Recommended)
- B. Treat any retailer ID in the URL as an implicit context switch after membership validation
- C. Put the selected retailer in a signed browser cookie and let providers trust it directly
- X. Other (please specify)

[Answer]: A. Keep the selection in the server-side session for navigation only; auto-select a sole membership, require an explicit CSRF-protected selection for multiple memberships, require each retailer route to match the session selection, and revalidate membership and placement before every provider call; clear stale selection without retrying uncertain mutations (Recommended)

## Q4. CSRF and same-origin controls

Which browser mutation protection should U11 enforce?

- A. Use a server-side synchronizer token bound to the session and cookie generation, return the current token in the no-store session response, require it in `X-CSRF-Token` for every state-changing browser call, verify same-origin `Origin`/`Referer`, use a Secure HttpOnly `__Host-` cookie with `SameSite=Lax`, and rotate the token with login, logout, session rotation, and retailer-context changes (Recommended)
- B. Rely only on `SameSite=Strict` cookies and omit an application CSRF token
- C. Use a browser-readable double-submit cookie without server-side token state
- X. Other (please specify)

[Answer]: A. Use a server-side synchronizer token bound to the session and cookie generation, return the current token in the no-store session response, require it in `X-CSRF-Token` for every state-changing browser call, verify same-origin `Origin`/`Referer`, use a Secure HttpOnly `__Host-` cookie with `SameSite=Lax`, and rotate the token with login, logout, session rotation, and retailer-context changes (Recommended)

## Q5. Dashboard composition and partial results

How should the BFF return a composed dashboard when downstream reads have mixed outcomes?

- A. Treat current membership plus inventory summary as required; return `200` when all requested sections are current, `206` with typed per-section `ready`, `stale`, `unavailable`, or `forbidden` states when optional forecast/review/supplier sections fail, and `503` when the required core cannot be obtained; include source versions, freshness, observed-at time, and safe error codes (Recommended)
- B. Return `503` whenever any dashboard provider is unavailable so the UI never receives a partial page
- C. Always return `200` and omit unavailable sections without an explicit state
- X. Other (please specify)

[Answer]: A. Treat current membership plus inventory summary as required; return `200` when all requested sections are current, `206` with typed per-section `ready`, `stale`, `unavailable`, or `forbidden` states when optional forecast/review/supplier sections fail, and `503` when the required core cannot be obtained; include source versions, freshness, observed-at time, and safe error codes (Recommended)

## Q6. Commands, idempotency, and uncertain outcomes

How should browser commands behave across timeouts, repeated clicks, reloads, and provider uncertainty?

- A. Require a UUID idempotency key per logical command, bind it to session, actor, retailer, operation, expected version, and request hash, forward it unchanged to the provider, disable duplicate submission while pending, never automatically retry a timed-out mutation, and expose an operation-status reconciliation path that either returns the original result or an explicit unknown outcome (Recommended)
- B. Let the BFF generate a new idempotency key for every HTTP attempt and automatically retry transient command failures
- C. Deduplicate only in browser memory and rely on the UI to prevent repeated clicks
- X. Other (please specify)

[Answer]: A. Require a UUID idempotency key per logical command, bind it to session, actor, retailer, operation, expected version, and request hash, forward it unchanged to the provider, disable duplicate submission while pending, never automatically retry a timed-out mutation, and expose an operation-status reconciliation path that either returns the original result or an explicit unknown outcome (Recommended)

## Q7. Browser file-upload handling

How should the BFF handle inventory, demand, supplier CSV, and supplier PDF uploads?

- A. Stream directly to the owning provider without durable BFF storage; enforce a 10 MiB default for CSV and 25 MiB for PDF, validate declared and detected media type, filename length, decompressed/row/page limits supplied by the provider contract, compute a content digest while streaming, abort on disconnect or limit breach, and require a new explicit submission after an uncertain failure (Recommended)
- B. Buffer every upload in BFF memory before forwarding, using one 50 MiB limit for all formats
- C. Persist uploads in the BFF database so providers can fetch them later
- X. Other (please specify)

[Answer]: A. Stream directly to the owning provider without durable BFF storage; enforce a 10 MiB default for CSV and 25 MiB for PDF, validate declared and detected media type, filename length, decompressed/row/page limits supplied by the provider contract, compute a content digest while streaming, abort on disconnect or limit breach, and require a new explicit submission after an uncertain failure (Recommended)

## Q8. Long-running jobs and assistant output

How should the browser observe imports, reviews, forecasts, and assistant turns?

- A. Return `202` plus an opaque operation URL for every admitted long-running action; support bounded polling for all jobs and resumable same-origin server-sent events for assistant turn deltas and terminal state; keep job/conversation truth in the owning provider, let disconnects leave admitted work running, and resume SSE by bounded event cursor without duplicating a turn (Recommended)
- B. Use WebSockets for every job and cancel provider work whenever the browser disconnects
- C. Keep the original HTTP request open until each operation finishes and provide no status resource
- X. Other (please specify)

[Answer]: A. Return `202` plus an opaque operation URL for every admitted long-running action; support bounded polling for all jobs and resumable same-origin server-sent events for assistant turn deltas and terminal state; keep job/conversation truth in the owning provider, let disconnects leave admitted work running, and resume SSE by bounded event cursor without duplicating a turn (Recommended)

## Q9. BFF caching boundary

What may U11 cache across browser requests?

- A. Cache only its own session lookups, OIDC discovery/JWKS within validated lifetimes, and explicitly cacheable provider metadata keyed by user, retailer, placement generation, scope, and source version; never cache mutation results as authority, never serve membership from stale cache, and leave business-data caching policy to each provider (Recommended)
- B. Cache complete dashboard and audit responses by retailer to reduce downstream calls, regardless of user identity
- C. Do no caching at all, including sessions and OIDC discovery metadata
- X. Other (please specify)

[Answer]: A. Cache only its own session lookups, OIDC discovery/JWKS within validated lifetimes, and explicitly cacheable provider metadata keyed by user, retailer, placement generation, scope, and source version; never cache mutation results as authority, never serve membership from stale cache, and leave business-data caching policy to each provider (Recommended)

## Q10. Downstream failure and retry policy

How should the BFF contain provider failures while preserving browser responsiveness?

- A. Give each generated provider client its own timeout, concurrency bulkhead, and circuit state; allow at most one bounded retry for safe GETs within the overall browser budget; never retry mutations automatically; preserve safe provider codes, map unsafe details to stable BFF problem codes, propagate one correlation ID, and return explicit partial or unavailable state (Recommended)
- B. Share one global circuit breaker and retry every request up to three times
- C. Forward provider status, body, and exception details to the browser unchanged
- X. Other (please specify)

[Answer]: A. Give each generated provider client its own timeout, concurrency bulkhead, and circuit state; allow at most one bounded retry for safe GETs within the overall browser budget; never retry mutations automatically; preserve safe provider codes, map unsafe details to stable BFF problem codes, propagate one correlation ID, and return explicit partial or unavailable state (Recommended)

## Ambiguity Scan

No unresolved functional ambiguity remains. U11's browser-session state is deliberately ephemeral and Redis-only: Redis loss invalidates every outstanding BFF cookie and requires sign-in again, while provider-owned business commands, jobs, conversations, and idempotency records remain durable behind their own contracts. The BFF never promotes cached identity, retailer selection, a URL, a browser header, or a machine credential into user authority.

C18 requires additive contract refinement for retailer-context selection, CSRF token delivery, operation-status reconciliation, assistant SSE, typed partial dashboard sections, upload limits, and safe BFF error codes. Provider OpenAPI contracts must expose the corresponding operation resources and idempotent status reads. These are contract details for the approved behavior rather than unresolved product decisions.

Exact per-client latency budgets, bulkhead capacities, circuit thresholds, retry delays, polling cadence, SSE keepalive, response-size limits, and cache lifetimes remain bounded NFR Requirements parameters. The repository defaults for CSV and PDF upload size are functionally fixed at 10 MiB and 25 MiB and remain deployment-configurable without allowing unbounded input.

## Consolidated Summary

U11 is the only browser OIDC client and exposes the same-origin browser boundary at `https://app.stocksense.localhost`. It uses authorization code with PKCE and keeps access and rotating refresh tokens inside an opaque Redis-backed session. Redis is the sole BFF session store. Session entries carry token state, expiry, CSRF binding, retailer selection, and cookie generation under the already-approved 30-minute idle and 8-hour absolute limits. Redis loss or restart invalidates all browser sessions and requires sign-in again; it cannot lose or reverse provider-owned business work. The Secure, HttpOnly, host-only `__Host-stocksense-session` cookie uses `SameSite=Lax`, and invalidated cookie identifiers have no usable session state.

For downstream U4-U10 calls, the BFF holds one short-lived delegated user access token for the shared `stocksense-api` audience and narrow scopes. It propagates authenticated subject and correlation context through U1-generated clients. Every provider still validates the token, current retailer membership, business role, resource ownership, and placement generation. U11 never substitutes its machine identity for a human action and never sends access tokens or service credentials to the browser.

Retailer selection is navigation state in the Redis session, not authority. A single current membership is selected automatically; multiple memberships require an explicit CSRF-protected choice; zero memberships retains the approved no-access state. Retailer routes must match the selected context, and the BFF revalidates membership and placement before every provider call. It clears a stale or revoked selection and never automatically resubmits an uncertain mutation.

Every state-changing browser call requires a synchronizer CSRF token bound to the current session and cookie generation. The no-store session response supplies the token, and the browser returns it in `X-CSRF-Token`. U11 also verifies same-origin `Origin` or `Referer`. Login, logout, session rotation, and retailer-context changes rotate the CSRF token. Safe reads have no side effects.

Dashboard composition treats current membership and inventory summary as required. A complete result returns `200`. If optional forecast, review, or supplier sections fail, the BFF returns `206` with a typed state for every requested section: `ready`, `stale`, `unavailable`, or `forbidden`. A required-core failure returns `503` or the applicable authorization response. Every section includes source version, freshness, observation time, and safe error metadata so the UI never presents silent omission as complete data.

Each logical browser command uses one UUID idempotency key bound to actor, session, retailer, operation, expected version, and canonical request hash and forwarded unchanged to the authoritative provider. Duplicate submission is disabled while pending. U11 never automatically retries a mutation whose outcome may be uncertain. C18 and provider contracts expose an operation-status path that returns the original result, durable in-progress/failed state, or an explicit unknown outcome. After BFF session loss, a reauthenticated currently authorized actor may reconcile the provider-owned operation; session loss does not manufacture a second command.

Inventory, demand, and supplier CSV uploads default to 10 MiB; supplier PDF uploads default to 25 MiB. U11 streams content directly to the owning provider without durable BFF storage, validates declared and detected media types plus bounded filename and provider row/page/decompression rules, and computes a content digest while streaming. A disconnect or limit breach aborts forwarding. An uncertain failure requires explicit reconciliation or a new deliberate submission under the applicable idempotency contract.

Every admitted long-running import, review, forecast, or assistant action returns `202` with an opaque same-origin operation URL. All operations support bounded polling. Assistant turns additionally expose resumable server-sent events for deltas and terminal state, using a bounded event cursor. Browser disconnect does not cancel admitted provider work; reconnection resumes the same operation or conversation turn without duplicating it. The owning provider remains authoritative for job, conversation, and generated-output state.

Cross-request BFF caching is limited to Redis sessions, validated OIDC discovery/JWKS metadata, and provider metadata explicitly declared cacheable. Provider metadata keys include user, retailer, placement generation, scope, and source version. U11 never serves membership from stale cache, treats no cached mutation result as authority, and leaves business-data cache policy with each provider.

Each generated provider client has an independent timeout, concurrency bulkhead, and circuit state. Safe GETs may receive at most one bounded retry within the overall browser budget. Mutations are never automatically retried. U11 propagates one correlation ID, preserves provider problem codes only when safe, maps unsafe details to stable BFF codes, and returns explicit partial or unavailable states without exposing provider exceptions, credentials, tokens, or tenant-hidden resources.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct
