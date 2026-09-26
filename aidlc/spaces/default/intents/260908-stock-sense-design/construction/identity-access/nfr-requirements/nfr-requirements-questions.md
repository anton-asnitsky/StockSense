# StockSense Identity Access NFR Requirements Questions

Date: 2026-09-18
Stage: NFR Requirements
Unit: identity-access
Status: In progress

The approved baseline is Duende IdentityServer with custom Dapper/Npgsql
persistence through stored procedures/functions, Flyway migrations, local demo
accounts, optional Google federation, BFF authorization code with PKCE,
Vault-delivered secrets, 10-minute access tokens, rotating refresh credentials,
30-minute idle and 8-hour absolute sessions, 90-day key rotation, and a
secret-free clean-reviewer path. These questions quantify the remaining NFRs
and resolve two implementation gaps retained by the Functional Design review.

## Interaction mode

Continue with the established guided-question workflow.

- A. Guide me through each question (Recommended)
- B. I will edit this file directly
- C. Answer all questions in chat
- X. Other (please specify)

[Answer]: A. Guide me through each question (Recommended)

## Q1. Identity performance and capacity

Which measurable local-profile target should Identity Access meet on the
confirmed five-concurrent-user portfolio workload?

- A. After warm-up, require p95 below 250 ms for discovery/JWKS, token refresh, logout, and machine-token issuance; p95 below 1.5 seconds for local password sign-in including adaptive password verification; sustain five concurrent human flows and a burst of 20 concurrent machine-token requests without errors; measure Google network time separately (Recommended)
- B. Require p95 below 500 ms for all local identity operations, including password sign-in, with five concurrent users and no separate machine-token burst
- C. Measure latency and capacity without setting pass/fail thresholds until implementation benchmarking
- X. Other (please specify)

[Answer]: A. After warm-up, require p95 below 250 ms for discovery/JWKS, token refresh, logout, and machine-token issuance; p95 below 1.5 seconds for local password sign-in including adaptive password verification; sustain five concurrent human flows and a burst of 20 concurrent machine-token requests without errors; measure Google network time separately (Recommended)

## Q2. Local password protection and abuse controls

Which credential-protection profile should the custom identity store use?

- A. Use Argon2id with a per-credential random salt, an optional Vault-held pepper, versioned parameters starting at 19 MiB memory, two iterations, and one lane; calibrate upward only when the 1.5-second sign-in target and cluster envelope still pass; cap input length, use constant-behavior generic failures, preserve the confirmed five-attempt/15-minute lockout, and rate-limit by bounded account and source signals (Recommended)
- B. Use ASP.NET Core `PasswordHasher<TUser>` with its versioned PBKDF2 format and framework defaults, plus the confirmed lockout and rate limiting
- C. Use PBKDF2-HMAC-SHA256 with a fixed 600,000-iteration project format for easier FIPS-oriented portability
- X. Other (please specify)

[Answer]: A. Use Argon2id with a per-credential random salt, an optional Vault-held pepper, versioned parameters starting at 19 MiB memory, two iterations, and one lane; calibrate upward only when the 1.5-second sign-in target and cluster envelope still pass; cap input length, use constant-behavior generic failures, preserve the confirmed five-attempt/15-minute lockout, and rate-limit by bounded account and source signals (Recommended)

## Q3. Community-edition signing-key lifecycle

How should the project implement the approved 90-day signing-key rotation
without depending on Duende's paid Automatic Key Management feature?

- A. Use Duende's static signing/validation-key APIs with versioned certificates delivered read-only from Vault/VSO and lifecycle metadata owned by U3; stage and publish a new public key at least 24 hours before activation, promote it through a controlled rollout, retain prior verification keys through the longest valid signed artifact plus five minutes of skew, exercise emergency rotation, and persist ASP.NET Core data-protection keys separately (Recommended)
- B. Load operator-created X.509 signing certificates from Vault and rotate them manually with a documented runbook, without an application-owned key lifecycle adapter
- C. Use Duende Automatic Key Management and accept a paid license/add-on requirement for this portfolio
- X. Other (please specify)

[Answer]: A. Use Duende's static signing/validation-key APIs with versioned certificates delivered read-only from Vault/VSO and lifecycle metadata owned by U3; stage and publish a new public key at least 24 hours before activation, promote it through a controlled rollout, retain prior verification keys through the longest valid signed artifact plus five minutes of skew, exercise emergency rotation, and persist ASP.NET Core data-protection keys separately (Recommended)

## Q4. Reliability and degraded operation

What availability behavior should the local portfolio profile demonstrate?

- A. Run one Identity Access replica by default; require healthy PostgreSQL and lifecycle-valid Vault-delivered key material for readiness; fail closed for login/token operations when either is unavailable; keep local login available when Google is absent or unavailable; inherit the platform RPO 24 hours/RTO 2 hours and prove restart plus restore without claiming production HA (Recommended)
- B. Run two replicas and target continued identity service during one pod failure, while retaining the same database/Vault fail-closed behavior
- C. Demonstrate restart and recovery behavior without explicit readiness dependencies or recovery objectives
- X. Other (please specify)

[Answer]: A. Run one Identity Access replica by default; require healthy PostgreSQL and lifecycle-valid Vault-delivered key material for readiness; fail closed for login/token operations when either is unavailable; keep local login available when Google is absent or unavailable; inherit the platform RPO 24 hours/RTO 2 hours and prove restart plus restore without claiming production HA (Recommended)

## Q5. Identity observability and alerting

Which operational evidence should be mandatory?

- A. Emit OpenTelemetry metrics/traces and structured security events with no credentials, tokens, authorization codes, raw external claims, or key material; alert immediately on key-load/integrity failure and refresh-token reuse, and alert when five-minute server-error rate exceeds 2% or latency exceeds its p95 target for ten minutes; dashboard sign-in outcomes, lockouts, token/refresh results, Google dependency health, key lifecycle, and audit/outbox lag (Recommended)
- B. Collect structured logs and basic request metrics, but defer numeric alert thresholds and security-event alerts
- C. Rely on IdentityServer application logs and the platform-wide dashboard without unit-specific signals
- X. Other (please specify)

[Answer]: A. Emit OpenTelemetry metrics/traces and structured security events with no credentials, tokens, authorization codes, raw external claims, or key material; alert immediately on key-load/integrity failure and refresh-token reuse, and alert when five-minute server-error rate exceeds 2% or latency exceeds its p95 target for ten minutes; dashboard sign-in outcomes, lockouts, token/refresh results, Google dependency health, key lifecycle, and audit/outbox lag (Recommended)

## Q6. OIDC callback contract reconciliation

How should the Functional Design review's callback-path discrepancy be
resolved?

- A. Register `https://app.stocksense.localhost/signin-oidc` as the sole OIDC redirect URI handled by U11's server-side middleware; treat `/auth/callback` only as an optional browser continuation route after middleware completes the protocol exchange, never as a registered U3 callback; align C16 and negative redirect tests to this split (Recommended)
- B. Register `/auth/callback` as the OIDC redirect URI and remove `/signin-oidc` from the design
- C. Register both paths as independent OIDC callbacks for the same BFF client
- X. Other (please specify)

[Answer]: A. Register `https://app.stocksense.localhost/signin-oidc` as the sole OIDC redirect URI handled by U11's server-side middleware; treat `/auth/callback` only as an optional browser continuation route after middleware completes the protocol exchange, never as a registered U3 callback; align C16 and negative redirect tests to this split (Recommended)

## Q7. Lockout expiry and concurrent failures

How should the Functional Design review's lockout-counter boundary be resolved?

- A. On the first attempt after `lockedUntil`, atomically clear the expired lock and reset the failure count before evaluating the submitted secret; a failed attempt becomes count 1 in a new sequence; serialize concurrent attempts in the owning stored routine so only one transition observes each version (Recommended)
- B. Preserve the count at five after expiry and relock immediately on the next failure
- C. Require an operator reset after every lockout rather than allowing time-based expiry
- X. Other (please specify)

[Answer]: A. On the first attempt after `lockedUntil`, atomically clear the expired lock and reset the failure count before evaluating the submitted secret; a failed attempt becomes count 1 in a new sequence; serialize concurrent attempts in the owning stored routine so only one transition observes each version (Recommended)

## Q8. Abuse-rate and machine-credential overlap limits

Which numeric limits should make the selected bounded controls testable while
still permitting the approved capacity burst?

- A. Allow a burst of five and replenish ten interactive authentication attempts per minute per source boundary, retain the five-failure account lockout independently, allow machine-token issuance to burst to 20 and replenish 60 requests per minute per client, and limit old/new machine-credential overlap to 15 minutes after successful reload verification; return sanitized `429` outcomes and bounded telemetry (Recommended)
- B. Double each request-rate allowance and permit a 60-minute machine-credential overlap
- C. Configure all limits at deployment time without project-wide acceptance values
- X. Other (please specify)

[Answer]: A. Allow a burst of five and replenish ten interactive authentication attempts per minute per source boundary, retain the five-failure account lockout independently, allow machine-token issuance to burst to 20 and replenish 60 requests per minute per client, and limit old/new machine-credential overlap to 15 minutes after successful reload verification; return sanitized `429` outcomes and bounded telemetry (Recommended)

## Ambiguity Scan

The answers form one measurable local identity profile. The 1.5-second password
target accommodates adaptive Argon2id verification, while faster metadata and
token operations retain a 250-millisecond p95 budget. The interactive burst of
five permits the confirmed five-user benchmark, and the machine-client burst of
20 matches its capacity test. Account lockout and source throttling are
independent controls, so distributed guesses do not bypass account protection
and unknown-account traffic does not require disclosing identity state.

Community-edition key management is explicit: U3 and the protected deployment
workflow own version metadata and controlled activation, Vault protects private
material, and Duende receives active and validation keys through its static-key
configuration. The 24-hour pre-publication window is longer than the local
metadata refresh path, and retired verification keys remain until every signed
artifact has expired plus five minutes of skew. ASP.NET Core data-protection
keys remain a separate persistent lifecycle.

The one-replica profile does not claim high availability. PostgreSQL and valid
key material are hard readiness dependencies; Google is optional and cannot
disable local login. Recovery inherits the already approved platform RPO and
RTO. Alert thresholds, rate limits, machine-credential overlap, callback
ownership, and lockout-expiry transitions now have testable values or exact
state rules. No vague performance, availability, security, scalability,
reliability, or observability target remains for this unit.

## Consolidated Summary

- **Performance and capacity:** After warm-up, discovery/JWKS, refresh, logout,
  and machine-token issuance must achieve p95 below 250 ms. Local password
  sign-in must achieve p95 below 1.5 seconds. Test five concurrent human flows
  and a burst of 20 concurrent machine-token requests; report Google network
  latency separately.
- **Password protection:** Use versioned Argon2id records beginning at 19 MiB,
  two iterations, and one lane with a unique salt and optional Vault-held
  pepper. Parameters may increase only while the sign-in and cluster budgets
  still pass. Bound input, return generic failures, and preserve the confirmed
  five-failure/15-minute lockout.
- **Abuse controls:** Interactive authentication permits a burst of five and
  replenishes ten requests per minute per source boundary. Machine-token
  issuance permits a burst of 20 and replenishes 60 per minute per client.
  Return sanitized `429` outcomes and bounded telemetry.
- **Signing and protection keys:** Use Duende static signing/validation-key APIs
  with versioned certificates delivered read-only by Vault/VSO. Publish a new
  public key at least 24 hours before activation, promote it through a controlled
  rollout, retain prior validation keys through all valid artifacts plus five
  minutes of skew, test emergency rotation, and persist data-protection keys
  separately.
- **Machine credentials:** Activate replacements only after scoped delivery and
  reload verification, then retire the old credential within a 15-minute
  overlap.
- **Reliability:** Run one replica initially. PostgreSQL and lifecycle-valid key
  material are readiness dependencies and fail closed. Google absence or outage
  affects only Google flows. Demonstrate restart and clean restore against RPO
  24 hours and RTO 2 hours without claiming production HA.
- **Observability:** Emit sanitized OpenTelemetry signals and structured
  security events. Alert immediately on key-load/integrity failure and refresh
  reuse. Alert when the five-minute server-error rate exceeds 2% or a latency
  target remains breached for ten minutes. Dashboard sign-in outcomes,
  lockouts, token operations, Google health, key lifecycle, and audit/outbox lag.
- **OIDC callback:** Register only
  `https://app.stocksense.localhost/signin-oidc` as U11's OIDC redirect.
  `/auth/callback` may be a post-middleware browser continuation, never a U3
  registered redirect. Reconcile C16 and its negative tests accordingly.
- **Lockout concurrency:** On the first attempt after lock expiry, atomically
  clear the lock and reset the count before verification. A failed attempt starts
  a new sequence at one. The U3 stored routine serializes concurrent transitions.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct
