# Identity Access Security Requirements

Unit: U3 Identity Access (`identity-access`)

## Security boundary

U3 proves a human or workload identity, owns credential/link/grant/key
lifecycle, and issues bounded authorization artifacts. It does not own retailer
membership, role, or placement authority. U4 revalidates those facts; U11 owns
the browser cookie, server-side token storage, CSRF boundary, and selected
retailer context.

## Threat boundaries

| Boundary | Primary threats | Required control |
| --- | --- | --- |
| Browser/BFF to U3 | redirect substitution, code replay, CSRF, token disclosure | exact registered redirect, authorization code with PKCE, state/nonce, one-time codes, server-side tokens |
| Google to U3 | forged callback, email takeover, unknown issuer-subject | validate issuer/audience/signature/lifetime/state/nonce and link only explicit `(issuer, subject)` |
| Workload to U3 | broad scopes, human-role inheritance, credential replay | narrow client/audience/scope/token type, protected versioned credentials, bounded overlap |
| U3 to PostgreSQL | SQL injection, privilege bypass, cross-unit reads | parameterized U3 stored procedures/functions, runtime RLS/roles, separate Flyway authority |
| Vault/VSO to U3 | stale/corrupt key, secret disclosure, unauthorized mount | workload-scoped read-only delivery, integrity/lifecycle checks, fail-closed readiness |

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR3.1 | U3 tokens and protocol context shall never establish retailer membership, role, or placement authority. Tokens carry stable identity and narrow protocol claims only; business providers revalidate U4-owned authority. | Negative tests substitute retailer IDs, roles, subjects, audiences, scopes, and placement generations across users and pooled connections and obtain no cross-tenant result. | Deny without disclosing foreign identity or tenant data; record a bounded security outcome. |
| NFR3.2 | External identity links shall be unique by verified `(issuer, subject)` and created only after recent local reauthentication through the approved ten-minute link transaction. Matching email never links or creates an account. | Tests cover same-email takeover, unknown link, wrong account, expired/consumed transaction, duplicate callback, concurrent link, and idempotent same-account completion. | Create no account, session, membership, role, or link; return a generic safe denial. |
| NFR4.1 | U3 application roles shall execute parameterized U3-owned PostgreSQL stored procedures/functions only. Direct table SQL, EF Core, cross-unit storage access, RLS bypass, and runtime audit mutation are prohibited; Flyway uses separate migration authority. | Static policy and integration tests deny direct `SELECT/INSERT/UPDATE/DELETE`, arbitrary SQL, another unit's schema, audit update/delete, and migration privileges to runtime roles. | Fail startup/readiness or the request; never retry with broader credentials. |
| NFR5.1 | Browser identity shall use U11 as the sole OIDC client with authorization code and PKCE, exact redirect validation, server-side tokens, secure HttpOnly cookie handling, and U11-owned CSRF enforcement. U3 registers only `https://app.stocksense.localhost/signin-oidc`; `/auth/callback` may be a post-middleware continuation and is never a registered U3 redirect. | Positive and negative tests cover exact redirect, `/auth/callback`, lookalike origins, state, nonce, PKCE, code replay, session expiry, logout, and old-cookie replay. C16 is reconciled before its contract gate. | Consume or invalidate unsafe requests, issue nothing, and return a stable browser-safe outcome. |
| NFR5.2 | Access tokens live ten minutes with at most five minutes of validation skew. Human refresh credentials rotate once per use within a 30-minute-idle/eight-hour-absolute session; reuse revokes the family and session. | Concurrent refresh and replay tests prove one winner, no extended absolute lifetime, terminal reuse detection, and U11 cleanup instructions. | Issue no replacement on invalid/reused state and require reauthentication. |
| NFR5.3 | Machine tokens shall validate issuer, audience, signature, lifetime, token type, active client, and requested narrow scope and shall never carry or inherit human roles or purchasing approval authority. | Contract and authorization tests reject wrong issuer/audience/type/scope, expired token, disabled client, old credential, and attempts to approve, reject, cancel, or receive purchases. | Deny without business effect; broad fallback scopes are forbidden. |
| NFR5.4 | Local authentication shall retain the five-failure/15-minute lockout and the approved source/client rate limits. On the first attempt after `lockedUntil`, the owning routine atomically clears the expired lock and resets the counter before verification; a failure starts a new sequence at one. | Boundary and concurrency tests cover the fourth/fifth failure, exact expiry, first failure after expiry, successful reset, parallel attempts, source throttling, and account enumeration resistance. | Return generic or sanitized `429` outcomes; serialize conflicting transitions and create no session. |
| NFR6.1 | Credentials, signing keys, data-protection keys, peppers, Google secrets, and workload secrets shall remain outside Git and Terraform state and be delivered through workload-scoped Vault/VSO paths. | Repository/state scans find no secret material; RBAC and mount tests deny unrelated workloads; backup and unseal/recovery material is proven outside the cluster. | Keep the dependent capability unready and initiate controlled rotation for suspected exposure. |
| NFR6.2 | Local passwords shall use versioned Argon2id records with a unique random salt, starting at 19 MiB memory, two iterations, and one lane; an optional pepper is held in Vault. Parameters may increase only while NFR1.2 and the cluster envelope pass. | Known-answer, unique-salt, malformed-record, rehash-on-upgrade, maximum-input, timing-distribution, and clean-profile performance tests pass. Stored records contain no plaintext or recoverable password. | Reject malformed/unsupported records generically; never reduce below the approved minimum or log submitted secrets. |
| NFR6.3 | Community-edition signing rotation shall use Duende static signing/validation-key APIs with versioned certificates delivered read-only by Vault/VSO and U3 lifecycle metadata. Publish the next public key at least 24 hours before activation, rotate every 90 days, and retain prior verification keys until all signed artifacts expire plus five minutes. | Normal and emergency drills verify staged publication, activation, JWKS overlap, old/new token validation boundaries, retirement, restart, integrity failure, and data-protection persistence. | Issue no token when no coherent active key exists; retain safe validation material rather than retire it early. |
| NFR8.1 | U3-owned REST/admin boundaries shall have versioned OpenAPI 3.1 contracts; identity endpoints and metadata shall pass OIDC/OAuth/Duende conformance and exact-client configuration checks. Durable identity events shall use AsyncAPI 3.0. | CI validates syntax, examples, compatibility, redirect registration, discovery/JWKS coherence, stable errors, and generated client inputs where applicable. | Block the applicable change or release; contract lint cannot grant runtime authority. |
| NFR10.1 | Logs, traces, metrics, events, errors, and evidence shall exclude passwords, credentials, tokens, authorization codes, raw external claims, signing/data-protection material, peppers, and secret references. | Canary redaction tests cover every signal/export path; bounded fields retain correlation ID, stable outcome code, client category, key version identifier, and tenant-free account pseudonym where authorized. | Suppress unsafe detail and fail evidence publication if a safe actionable record cannot be produced. |
| NFR13.1 | CI shall run identity build/test, contract, Flyway, stored-routine permission, secret, dependency, and container security checks on untrusted hosted runners; only a trusted immutable revision may reach the isolated deployment runner. | Workflow policy and negative fixtures prove no public-PR code receives deployment/Vault credentials or executes on the self-hosted runner. | Block release/deployment and report the failed control. |
| NFR14.1 | U3 shall expose stable English outcome codes for signed-out, no-access, expired, locked, denied, provider-unavailable, and recovery states without embedding sensitive claims. U12 owns keyboard and visual accessibility. | Contract tests resolve every U3 outcome to documented U11/U12 behavior and verify Google-unconfigured operation; no claim of additional language or accessibility certification is made. | Return a safe generic outcome when detail cannot be disclosed. |

## Explicit limitations and upstream actions

- C16 and the canonical functional design must be reconciled to the confirmed
  `/signin-oidc` protocol callback before implementation contract acceptance.
- The canonical lockout rule/entity text must adopt the approved expiry reset
  and concurrency transition before implementation.
- Exact Argon2id package/version, certificate format, and key-loader interface
  remain implementation selections and must be pinned, scanned, and tested.
- These controls do not make the single-node local profile production-ready or
  give U3 retailer authorization ownership.
