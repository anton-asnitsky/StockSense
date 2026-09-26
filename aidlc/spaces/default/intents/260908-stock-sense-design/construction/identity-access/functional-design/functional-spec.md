# Identity Access Functional Specification

Unit: U3 Identity Access (`identity-access`)

Sources: `unit-of-work.md`, `unit-of-work-story-map.md`, `requirements.md`, `components.md`, `contract-summary.md`, and the confirmed Identity Access Functional Design questionnaire.

## Purpose and boundaries

Identity Access proves who a human or workload is, issues and revokes bounded authorization artifacts, manages explicit external-identity links, protects authentication credentials and keys, and records authoritative identity changes. It supports a secret-free local reviewer path and optional Google federation.

Identity Access does not own retailer memberships, roles, placement generation, or business authorization. U4 Tenant Directory makes those current decisions. U11 owns the browser-facing session cookie, CSRF enforcement, server-side token storage, and retailer-context orchestration. U12 owns presentation state. A U3 token supplies authenticated identity and narrow protocol claims; it never turns a route identifier, cached role, or external email into retailer authority.

The fixed local identities are:

- Issuer: `https://identity.stocksense.localhost`
- Application and BFF origin: `https://app.stocksense.localhost`
- Google callback: `https://identity.stocksense.localhost/signin-google`
- BFF sign-in callback: `https://app.stocksense.localhost/signin-oidc`
- BFF sign-out callback: `https://app.stocksense.localhost/signout-callback-oidc`

The registered OIDC redirect URI is `/signin-oidc` on the BFF origin. U11's C16 `/auth/callback` operation is a browser-facing continuation after middleware has validated and consumed that OIDC response; it is not registered as an OAuth redirect URI and never receives a reusable authorization code. U3 checks only the registered `/signin-oidc` URI at code issuance and exchange. U11 rejects direct, replayed, or out-of-order calls to `/auth/callback` with the C16 failure response.

Google is optional. When its client configuration is absent, the Google option is unavailable and local authentication remains complete. A real Google smoke run is owner-operated evidence because reviewers receive no owner credentials.

## Participants

| Participant | Responsibility |
| --- | --- |
| Human user | Authenticates locally or through a previously linked Google identity and initiates explicit linking |
| Platform operator | Controls demo identity initialization, credential reset, client registration, key recovery, and protected bootstrap |
| Identity Access | Validates identity proof, owns links/grants/keys, issues tokens, revokes authorization state, and records audit/outbox data |
| Web BFF | Acts as the only browser OIDC client, stores tokens server-side, owns the secure browser cookie, and enforces CSRF |
| Google | Optional external identity proof source; supplies verified issuer-subject identity but no StockSense authority |
| Tenant Directory | Resolves current retailer memberships, roles, and placement generation from the authenticated account reference |
| Workload client | Authenticates under a narrow registered audience and scope without human roles |
| Secret-protection boundary | Protects key and credential references and makes them available only to authorized workloads |
| Audit consumer | Receives versioned, redeliverable identity events and builds a disposable search projection |
| Portfolio reviewer | Uses generated local credentials and the local path without Google secrets or owner-specific state |

## Owned logical operations

| Operation | Inputs | Successful result | Required failures |
| --- | --- | --- | --- |
| Authenticate locally | Local identifier, submitted secret, client request context | Verified account subject eligible for authorization flow | One browser-visible `authentication_failed` result for absent, invalid, locked, or disabled credentials; unavailable protection material is a service dependency failure |
| Resolve external identity | Verified issuer, subject, external callback proof | Existing linked account subject | Unknown link, invalid callback, unavailable provider |
| Start external link | Active local account, recent local reauthentication, provider | Ten-minute pending linking transaction | Missing reauthentication, disabled account, provider unavailable |
| Complete external link | Transaction, verified issuer-subject, state, nonce | Unique link and revoked prior sessions | Expired/consumed transaction, state/nonce failure, conflicting account link |
| Establish authorization session | Account subject, validated client, redirect, code-flow proof | Active U3 session plus bounded token family | Invalid client/redirect/state/nonce/code/PKCE, inactive account |
| Refresh authorization | Current one-time refresh token and active session | Consumed generation plus one replacement generation and access token | Expired/revoked session, old generation, reuse detection |
| End authorization session | Active or already ended session | Logged-out/revoked U3 state | Unknown session returns no authority |
| Register/rotate workload credential | Authorized operator, client allowance, protected credential reference | Active bounded credential version | Unauthorized operator, broad scope, missing secret protection |
| Publish discovery and keys | Active issuer configuration, lifecycle-valid public verification keys | C02 metadata and active/verify-only public keys | Inconsistent issuer/endpoints, missing required active key |
| Reset local credential | Authorized operator, target account, protected generated credential | New credential/security revision and all-session revocation | Unauthorized reset, failed protection, unknown account |
| Rotate/recover keys | Authorized operation, protected material, integrity evidence | One active key per purpose and retained prior versions | Missing/corrupt/sealed material, premature retirement, failed integrity check |
| Grant or revoke platform Operator | Owner-controlled action, verified human subject, current grant version | Audited, revocable platform grant independent of retailer roles | Unauthorized actor, stale grant version, unavailable audit commit |
| Read current platform grant | Registered U10 grant-reader workload, delegated human subject | Current active/revoked decision without retailer authority | Invalid workload/scope, unavailable lookup; never a positive default |
| Serve recovery participant | Registered U15 coordinator, C24 command, run/generation, roster, checkpoint and idempotency data | Durable prepare/close/abort/resume result and correctly held or released fence | Invalid coordinator, stale generation, changed retry, missing checkpoint, unresolved reconciliation or persistence |
| Commit identity audit/outbox | Security decision or accepted identity change with known tenant or global scope | One immutable redacted audit row and one matching outbox row in the same transaction | Invalid envelope profile or failed atomic commit |

Every persistent operation resolves through U3-owned parameterized data operations under its runtime identity. Direct table access, arbitrary query execution, and cross-unit storage access are prohibited. Schema evolution runs under separate migration authority and must finish before the changed service becomes ready.

## Workflows

### FD1. Local sign-in through the BFF

1. U11 creates a one-time authorization request for its registered client, exact `https://app.stocksense.localhost/signin-oidc` callback, state, nonce, and PKCE challenge.
2. Identity Access validates the client and exact local callback before presenting configured authentication methods.
3. The user submits local credentials over the identity origin.
4. Identity Access finds the local credential without revealing whether the account exists.
5. It rejects an absent or disabled account, active lockout, or invalid secret, updates failure/lockout state where applicable, and creates a denied audit outcome without a session. All four cases return the same browser-visible `authentication_failed` result; the exact cause remains only in protected audit/operator evidence.
6. For a valid active credential, it clears the current failure count and authenticates the account subject.
7. Identity Access validates the still-pending authorization request and issues a one-time authorization response. It does not include retailer membership or role authority.
8. U11 sends the authorization response and PKCE verifier to the token boundary.
9. Identity Access validates client, redirect, state, nonce, code, and verifier; failure consumes or invalidates the request and issues nothing.
10. On success, Identity Access creates an authorization session with a 30-minute idle and 8-hour absolute limit, then issues a 10-minute access token and one-time refresh family.
11. U11 completes its internal OIDC middleware callback at `/signin-oidc`, then invokes its C16 `/auth/callback` browser continuation only for the validated one-time result. It stores tokens server-side, rotates its secure HttpOnly cookie, and asks U4 for current retailer contexts using the stable account reference.
12. U11 returns the zero-, one-, or many-membership landing behavior defined in FD6. A direct or replayed `/auth/callback` request has no validated middleware result and fails closed.

### FD2. Sign in through a linked Google identity

1. Identity Access offers Google only when the configured provider and exact `/signin-google` callback are valid.
2. The user chooses Google and is redirected with a one-time state, nonce, and PKCE-bound request.
3. Google returns to the exact callback.
4. Identity Access validates provider issuer, audience, signature, lifetime, state, nonce, code, and PKCE proof.
5. It looks up only the verified `(issuer, subject)` pair in `ExternalIdentityLink`.
6. When a link exists for an active account, authorization continues at FD1 step 7.
7. When no link exists, Identity Access creates no account, session, role, or membership. Matching email and `email_verified` do not change this outcome.
8. The user receives safe guidance to sign in locally and explicitly link Google.
9. Provider unavailability or callback failure is audited and denied while the independent local path remains available.

### FD3. Link Google to an existing account

1. A locally authenticated user selects Link Google.
2. Identity Access requires a fresh local credential verification for the same active account.
3. It creates a pending linking transaction bound to that account, Google, state, nonce, and a ten-minute expiry.
4. The user completes Google authentication at the exact callback.
5. Identity Access validates external proof and confirms the linking transaction is pending, unexpired, unconsumed, and belongs to the current local account.
6. It checks the verified issuer-subject pair under a uniqueness boundary.
7. If the pair belongs to another account, it rejects the attempt without identifying that account.
8. If the pair already belongs to this account, it returns the existing idempotent result and consumes the transaction.
9. Otherwise it atomically creates the link, completes the transaction, increments the account security revision, revokes every prior session/refresh family, and commits an audit/outbox event.
10. The user must sign in again. No self-service unlink operation is exposed in v1.

### FD4. Refresh an active human authorization session

1. U11 presents the current refresh credential from server-side storage.
2. Identity Access locates its family and validates the client, active account, account security revision, 30-minute idle limit, 8-hour absolute limit, and current refresh generation.
3. If the digest matches the current unconsumed `RefreshTokenGeneration`, Identity Access atomically marks that generation consumed, inserts one replacement bounded by the same absolute session expiry, advances the family pointer, updates accepted activity, and issues a 10-minute access token. Concurrent submissions cannot create two replacements.
4. If the digest matches a retained consumed generation, Identity Access marks reuse detected, revokes the family and session, records the security event, and issues nothing. An unknown digest is denied without being reported as confirmed reuse. Consumed digests remain available through family expiry plus five minutes.
5. Expired, revoked, mismatched, unknown, or disabled-account state returns a stable reauthentication outcome.
6. U11 clears its cookie/token state on terminal refresh failure.

### FD5. Logout and security revocation

1. U11 validates its browser mutation and CSRF protection before requesting logout.
2. Identity Access marks an active authorization session `logged-out` and revokes its refresh family. Repeated logout is safe and grants no authority.
3. U11 removes its server-side tokens and invalidates the current browser cookie.
4. Replay of either old U3 authorization state or the old browser cookie cannot authorize a protected request.
5. The signed-out state is displayed. The upstream Google session is left unchanged.
6. Account disablement, local credential reset, or identity-link change increments `securityRevision` and revokes all account sessions by the same terminal path.

### FD6. Resolve retailer context after authentication

1. U3 returns a stable authenticated account reference without retailer roles or memberships.
2. U11 requests current contexts from U4 Tenant Directory.
3. With zero memberships, U11 exposes no-access/provisioning guidance and offers no signup or self-assignment.
4. With one membership, U11 may select it automatically and records a local selection generation.
5. With multiple memberships, the user explicitly selects one and U11 advances the selection generation.
6. Before every business request, the authoritative provider revalidates current membership, role, and placement generation with U4-owned information.
7. Revocation, missing context, foreign identifiers, or stale placement fail even when U3 identity remains valid.
8. Late responses from a prior selection generation are discarded and cannot appear under or supply mutation context for the new retailer.
9. If authorization changes during a mutation and its result is uncertain, U11 reconciles status or asks the user; it never automatically resubmits the mutation.

### FD7. Issue and validate machine authorization

1. An operator registers a workload client with explicit token type, allowed audiences, and allowed scopes.
2. A protected credential version is delivered only to the authorized workload identity.
3. The workload requests only a subset of its registered audiences and scopes.
4. Identity Access validates active client and credential lifecycle, then issues a short-lived machine token under the active signing key.
5. A receiving service validates issuer, audience, signature, lifetime, token type, scope, and workload/job authority locally from C02 metadata and keys.
6. Invalid scope, audience, token type, client, credential, signature, or lifetime is denied without business effect.
7. Machine authorization cannot satisfy human membership, manager authority, purchase approval, rejection, cancellation, or receipt permissions.

### FD8. Rotate a machine credential

1. The operator creates a new protected credential version under the same bounded client registration.
2. The secret-protection boundary exposes it only to the authorized workload.
3. The workload reloads or rolls out and demonstrates authentication with the new version.
4. The prior version may remain in bounded overlap only for the declared transition window.
5. After successful cutover, the old version is revoked and removed from workload delivery.
6. Sealed protection storage, absent material, failed reload, or expired credentials produces explicit denial without broader fallback permission.

### FD9. Rotate signing and session-protection keys

1. Rotation starts on the 90-day schedule or through a controlled emergency action.
2. New versioned material is generated and protected before activation.
3. Identity Access verifies the new material is readable and suitable for its purpose.
4. One new version per purpose becomes active; prior material stops new issuance and becomes verify-only.
5. Token-signing material remains available for at least 15 minutes after its last issuance.
6. Session-data-protection material remains available for at least 8 hours and 5 minutes after its last issuance.
7. Retirement is allowed only after `retainUntil` and verification that no valid artifact depends on that version.
8. Missing or corrupt required material fails closed. Controlled replacement requires user reauthentication rather than silently accepting incompatible state.

### FD10. Initialize and reset demo identities

1. Initialization checks whether the environment already has an identity baseline; it never overwrites an existing baseline by reseeding.
2. On an empty environment it creates the planner, manager-planner, multi-retailer planner, and operator account profiles.
3. It generates a different local password for each account and environment, stores only its protected verifier, and reveals the plaintext once through protected setup output.
4. U4 independently provisions the declared demo memberships; U3 stores no membership copy as authority.
5. The smoke flow validates local login for representative identities and confirms the operator has no retailer authority.
6. An authorized reset generates and protects a replacement, increments account/credential revisions, revokes sessions, and returns one-time protected disclosure.
7. Failed initialization or reset reports an actionable outcome and never falls back to a checked-in default.

### FD11. Back up and restore Identity Access

1. A consistent backup captures U3-owned relational records while external key, credential, and unseal/recovery material is protected outside the cluster.
2. Restore occurs into an isolated clean identity boundary before exposure.
3. Migration history, record counts, referential integrity, account security revisions, active/retained key versions, and protected references are reconciled.
4. Retention reconciliation removes expired audit records and prevents their outbox events from reappearing through replay.
5. Representative local login, token validation, revocation, and retained-key verification checks run against the restored state.
6. Only a complete, consistent result becomes ready. Corrupt, incomplete, sealed, or mismatched input remains unavailable with explicit diagnostics.
7. Integrated recovery evidence records elapsed time, observed data loss, limitations, source revision, and checksums without claiming an unmeasured objective.

### FD11a. Serve the C24 identity recovery participant

1. U3 registers the `identity-access` class A participant with U15 under the versioned roster and policy. The C24 provider-owned route accepts only U15's authenticated coordinator workload, required `X-Correlation-ID` and `Idempotency-Key`, current retailer placement generation from U4, a monotonic recovery generation, registered roster digest, and matching path/body identities. Missing or invalid token is `401`; wrong workload/scope is `403`; unsupported policy/protocol or route mismatch is `422`.
2. Before changing state, look up the command ledger by participant, retailer, run and idempotency key and also enforce command-ID uniqueness within that run. A byte-equivalent canonical request returns its exact stored status and body; reuse with changed content returns `409 RECOVERY_IDEMPOTENCY_CONFLICT`. Reject stale placement or recovery generations with typed `409`.
3. `prepare` atomically persists the retailer/run participant state, its recovery generation, command result, and membership in the shared global identity fence before returning durable `200 prepared`. This fence blocks identity writes, session/token issuance, grant and credential changes, authoritative identity audit/outbox writes, and signing/data-protection key rotation. Pure read-only validation such as discovery, JWKS and token signature checks may continue only when they do not mutate authoritative state or emit a required event.
4. `close` requires the prepared fence and a consistent local U3 checkpoint containing its owned PostgreSQL transaction/LSN and identity/outbox cursor evidence. U3 persists the immutable checkpoint ID and matching `sha256:` digest with the closed state and exact response. A missing or mismatched checkpoint cannot return `closed`; U15, not U3, assembles the cross-participant PostgreSQL and broker manifest.
5. `abort` durably records a terminal guard and result for that run/generation even if prepare was dispatched but not yet observed. It clears or terminally suppresses the local fence only when safe. A delayed `prepare` or `close` for the aborted generation returns its terminal disposition and cannot recreate a fence. U3 does not infer coordinator-wide success from its own `200`.
6. `resume` first reconciles the restored/local account, session, key, grant, audit/outbox and checkpoint state against the accepted manifest and current generation. It persists the result and clears its holder of the global fence only after reconciliation succeeds. A failed or uncertain reconciliation remains fenced and returns typed `409 RECOVERY_RECONCILIATION_REQUIRED` or `RECOVERY_FENCE_UNRESOLVED`.
7. U3 uses the class A prepare/close/abort/resume deadlines of 30/30/30/60 seconds and never extends a logical command beyond U15's global phase deadline. On restart, it reloads the participant ledger and global fence before enabling writes or key rotation. If durable state or the exact result cannot commit, return `503 RECOVERY_PERSISTENCE_UNAVAILABLE` with no fabricated `200`; repeated commands keep their original identities.

### FD12. Commit and publish an identity security event

1. Every security-relevant authentication decision, including a redacted pre-login denial without a known account or retailer, and every authoritative identity change creates one immutable `IdentityAuditRecord`. Unknown subjects use the safe anonymous actor and generic authentication-attempt resource; no submitted identifier, email, password, token, code or raw provider claim enters the record.
2. In the same U3 transaction, create exactly one `IdentityOutboxMessage` for that audit ID; an accepted identity mutation joins that same transaction. Retailerless outcomes use the closed C01 global identity-audit envelope, `identity.global.audit.recorded` type and separate C15 global route with no retailer or placement field. Tenant outcomes use `identity.audit.recorded` only with a real retailer ID and placement generation. Neither profile can be substituted for the other.
3. If the required audit/outbox pair cannot commit, fail the attempted identity transition closed and do not report a successfully recorded denial or accepted change. The immutable message ID and idempotency key derive from the committed audit ID; the payload digest uses the C23 canonical data profile.
4. U3's service-owned C23 bootstrap adapter publishes the outbox row with authenticated producer binding and durable confirm, independent of U14. It obeys the same size, five-delivery, retry, DLQ, replay and telemetry rules and passes every applicable versioned C22 fixture; U13 captures separate U3 evidence.
5. On confirmation mark the outbox row published; bounded failure remains visible in failed/dead-letter state. Replay preserves message identity and canonical payload, never repeats the identity change, and requires the approved global or tenant Operator authority for its route. U10 deduplicates independently and keeps global events out of retailer projections.

### FD13. Manage and read the platform Operator grant

1. An owner-controlled, audited U3 operation grants or revokes a versioned `PlatformOperatorGrant` for a verified human subject. It is separate from U4 retailer memberships and roles; a retailer Operator never inherits it.
2. U3 issues `audit.identity.global.read` only in a delegated human BFF token with the approved issuer, stable subject, `aud=stocksense-audit-evidence` and `client_id=stocksense-web-bff`. A machine token never represents the human grant.
3. The C02 current-grant read operation accepts only U10's registered grant-reader workload with `identity.platform-grant.read`; it returns the live active/revoked decision for the requested token subject. Invalid machine authority fails closed, and an unavailable lookup produces no positive grant result.
4. U10 uses this live operation on every C17 global identity-audit page and replay request. U11/U12 expose only the separate no-store C18 platform view; U3 does not authorize from retailer roles, cached token claims or browser-supplied subject IDs.

## State machines

### Account lifecycle

```mermaid
stateDiagram-v2
    [*] --> Active: controlled provisioning
    Active --> Active: credential reset or link change increments security revision
    Active --> Disabled: operator disables account
    Disabled --> Active: controlled re-enable
    Disabled --> [*]
```

Text fallback: controlled provisioning creates an Active account. Reset and link changes keep it Active but advance its security revision and revoke prior sessions. Disablement blocks authentication; controlled re-enable does not restore old sessions.

### Local credential lockout lifecycle

```mermaid
stateDiagram-v2
    [*] --> Usable
    Usable --> Usable: failed attempts 1 through 4
    Usable --> Locked: fifth failed attempt
    Locked --> Usable: lock expires; counter atomically resets to zero
    Locked --> Usable: authorized reset
    Usable --> Replaced: authorized reset
    Replaced --> [*]
```

Text fallback: a local credential remains Usable through four failures, becomes Locked on the fifth for 15 minutes, and returns to Usable after expiry or reset. The first post-expiry attempt atomically clears the lock and counter before credential evaluation; a failed attempt is counted as one. Concurrent attempts serialize at this boundary. Reset replaces the prior credential and revokes account sessions. Lockout never changes the browser-visible `authentication_failed` class; protected audit/operator evidence may carry the internal lockout reason.

### Linking transaction lifecycle

```mermaid
stateDiagram-v2
    [*] --> Pending: local reauthentication succeeds
    Pending --> Completed: callback and unique link commit
    Pending --> Expired: 10-minute limit passes
    Pending --> Rejected: proof, account, or uniqueness check fails
    Completed --> [*]
    Expired --> [*]
    Rejected --> [*]
```

Text fallback: reauthentication creates a Pending transaction. It reaches Completed once, or terminal Expired/Rejected state. Terminal transactions cannot be replayed.

### Authorization session lifecycle

```mermaid
stateDiagram-v2
    [*] --> Active: validated authorization exchange
    Active --> Active: accepted activity within limits
    Active --> Expired: idle or absolute limit reached
    Active --> Revoked: disable, reset, link change, or refresh reuse
    Active --> LoggedOut: logout completes
    Expired --> [*]
    Revoked --> [*]
    LoggedOut --> [*]
```

Text fallback: a validated exchange creates Active authorization state. It remains active only within the 30-minute idle and 8-hour absolute limits, and ends permanently as Expired, Revoked, or Logged Out.

### Refresh-token family lifecycle

```mermaid
stateDiagram-v2
    [*] --> Active
    Active --> Active: current generation consumed and replaced atomically
    Active --> Expired: owning session expires
    Active --> Revoked: logout or security revision changes
    Active --> ReuseDetected: consumed generation is replayed
    ReuseDetected --> Revoked: session and family revoked
    Expired --> [*]
    Revoked --> [*]
```

Text fallback: one Active refresh generation rotates atomically. Session expiry or security action ends the family. Replaying a consumed generation enters Reuse Detected and revokes the entire family and session.

### Cryptographic key lifecycle

```mermaid
stateDiagram-v2
    [*] --> Pending: protected material created
    Pending --> Active: integrity and availability verified
    Active --> VerifyOnly: replacement activates
    VerifyOnly --> Retired: retainUntil passes and no valid artifact depends on key
    Pending --> Unavailable: material fails validation
    Active --> Unavailable: required material is lost or corrupt
    VerifyOnly --> Unavailable: retained material is lost or corrupt
    Retired --> [*]
    Unavailable --> [*]
```

Text fallback: protected material starts Pending, becomes Active after validation, then Verify Only after replacement. It retires only after its concrete retention boundary. Missing or corrupt material becomes Unavailable and causes fail-closed recovery.

### Machine credential lifecycle

```mermaid
stateDiagram-v2
    [*] --> Pending
    Pending --> Active: scoped delivery and validation succeed
    Active --> Overlap: replacement activates
    Overlap --> Revoked: cutover completes
    Active --> Expired: expiry passes
    Overlap --> Expired: expiry passes
    Revoked --> [*]
    Expired --> [*]
```

Text fallback: a machine credential is Pending until scoped delivery succeeds, Active during normal use, and may enter bounded Overlap when its replacement activates. It then becomes Revoked or Expired and cannot authenticate.

### Identity recovery participant lifecycle

```mermaid
stateDiagram-v2
    [*] --> Prepared: durable prepare and global fence
    [*] --> Aborted: abort before delayed prepare
    Prepared --> Closed: matching checkpoint and digest
    Prepared --> Aborted: durable abort
    Closed --> Aborted: durable abort
    Closed --> Resumed: local reconciliation succeeds
    Aborted --> Resumed: safe reconciliation and fence disposition
    Prepared --> Unresolved: timeout or persistence uncertainty
    Closed --> Unresolved: reconciliation uncertainty
    Unresolved --> Resumed: later verified reconciliation
    Resumed --> [*]
```

Text fallback: prepare persists a U3 fence before acknowledging; close records a matching checkpoint. Abort is terminal for the old generation even when it arrives before prepare. Resume clears this run's global-fence holder only after local reconciliation; uncertain or timed-out states stay fenced across restart. A successful U3 result does not complete U15's overall run.

## Interaction sequences

### Local sign-in and retailer-context handoff

```mermaid
sequenceDiagram
    actor User
    participant BFF as Web BFF
    participant Identity as Identity Access
    participant Tenant as Tenant Directory

    User->>BFF: Start local login
    BFF->>Identity: Authorization request with state, nonce, PKCE challenge
    User->>Identity: Submit local credentials
    Identity->>Identity: Validate account, credential, lockout, request
    Identity-->>BFF: One-time authorization response
    BFF->>Identity: Code plus PKCE verifier
    Identity-->>BFF: Server-side tokens and stable account subject
    BFF->>Tenant: Resolve current retailer contexts
    Tenant-->>BFF: Zero, one, or many current memberships
    BFF-->>User: No-access, auto-selected, or explicit-selection state
```

Text fallback: the BFF begins a protected authorization flow, Identity Access verifies local proof and issues bounded tokens, and only then does the BFF ask Tenant Directory for current retailer contexts.

### Explicit Google linking

```mermaid
sequenceDiagram
    actor User
    participant Identity as Identity Access
    participant Google
    participant Audit as Audit and outbox

    User->>Identity: Reauthenticate locally and choose Link Google
    Identity->>Identity: Create 10-minute transaction with state and nonce
    Identity->>Google: Authorization request
    Google-->>Identity: Exact callback with external proof
    Identity->>Identity: Validate proof, transaction, issuer-subject uniqueness
    alt valid and unlinked
        Identity->>Audit: Commit link, security revision, revocation, event
        Identity-->>User: Link complete; sign in again
    else invalid, expired, or linked elsewhere
        Identity->>Audit: Record denied outcome
        Identity-->>User: Safe failure; no link or access
    end
```

Text fallback: a locally reauthenticated account creates a ten-minute transaction, Google returns verified proof, and Identity Access either commits one unique link with session revocation or records a safe denial without creating access.

### Refresh reuse response

```mermaid
sequenceDiagram
    participant BFF as Web BFF
    participant Identity as Identity Access
    participant Audit as Audit and outbox

    BFF->>Identity: Present refresh generation
    Identity->>Identity: Validate session and current generation
    alt current generation
        Identity->>Identity: Consume and replace atomically
        Identity-->>BFF: New access and refresh artifacts
    else consumed generation replayed
        Identity->>Audit: Record reuse and revocation
        Identity-->>BFF: Reauthentication required
        BFF->>BFF: Clear browser session and server-side tokens
    end
```

Text fallback: a current refresh generation rotates once. Replay of a consumed generation revokes the U3 session and tells the BFF to clear its own session state.

## Derived entity-relationship view

The YAML in `entities.md` is authoritative; this diagram is a readable derivative.

```mermaid
erDiagram
    ACCOUNT ||--o| LOCAL_CREDENTIAL : authenticates_with
    ACCOUNT ||--o{ EXTERNAL_IDENTITY_LINK : owns
    ACCOUNT ||--o{ LINKING_TRANSACTION : initiates
    ACCOUNT ||--o{ AUTHORIZATION_SESSION : establishes
    MACHINE_CLIENT ||--o{ AUTHORIZATION_SESSION : receives_grants
    AUTHORIZATION_SESSION ||--o| REFRESH_TOKEN_FAMILY : owns
    REFRESH_TOKEN_FAMILY ||--|{ REFRESH_TOKEN_GENERATION : retains
    MACHINE_CLIENT ||--o{ MACHINE_CREDENTIAL_VERSION : authenticates_with
    ACCOUNT |o--o{ IDENTITY_AUDIT_RECORD : may_be_subject_of
    IDENTITY_AUDIT_RECORD ||--|| IDENTITY_OUTBOX_MESSAGE : emits
    ACCOUNT ||--o{ PLATFORM_OPERATOR_GRANT : has_history
    GLOBAL_IDENTITY_RECOVERY_FENCE ||--o{ IDENTITY_RECOVERY_PARTICIPANT_STATE : guards
    IDENTITY_RECOVERY_PARTICIPANT_STATE ||--o{ IDENTITY_RECOVERY_COMMAND_RESULT : records

    ACCOUNT {
        identifier accountId PK
        enum status
        positive_integer securityRevision
        email normalizedEmail
    }
    LOCAL_CREDENTIAL {
        identifier credentialId PK
        identifier accountId FK
        secret_verifier secretVerifier
        integer failedAttemptCount
        instant lockedUntil
    }
    EXTERNAL_IDENTITY_LINK {
        identifier linkId PK
        identifier accountId FK
        uri issuer
        string subject
    }
    LINKING_TRANSACTION {
        identifier transactionId PK
        identifier accountId FK
        digest stateDigest
        digest nonceDigest
        instant expiresAt
        enum status
    }
    AUTHORIZATION_SESSION {
        identifier sessionId PK
        identifier accountId FK
        identifier clientId FK
        instant absoluteExpiresAt
        enum status
    }
    REFRESH_TOKEN_FAMILY {
        identifier familyId PK
        identifier sessionId FK
        integer currentGeneration
        enum status
    }
    REFRESH_TOKEN_GENERATION {
        identifier generationId PK
        identifier familyId FK
        integer generationNumber
        digest tokenDigest
        instant consumedAt
        enum status
    }
    CRYPTOGRAPHIC_KEY_VERSION {
        identifier keyId PK
        enum purpose
        integer version
        instant retainUntil
        enum status
    }
    MACHINE_CLIENT {
        identifier clientId PK
        enum clientKind
        identifier_set allowedAudiences
        identifier_set allowedScopes
    }
    MACHINE_CREDENTIAL_VERSION {
        identifier credentialVersionId PK
        identifier clientId FK
        instant expiresAt
        enum status
    }
    IDENTITY_AUDIT_RECORD {
        identifier auditId PK
        identifier accountId FK
        string eventType
        enum auditScope
        identifier retailerId
        positive_integer placementGeneration
        enum outcome
        identifier correlationId
    }
    IDENTITY_OUTBOX_MESSAGE {
        identifier messageId PK
        identifier auditId FK
        string messageType
        enum envelopeProfile
        enum status
    }
    PLATFORM_OPERATOR_GRANT {
        identifier grantId PK
        identifier subjectId FK
        enum status
        positive_integer grantVersion
    }
    GLOBAL_IDENTITY_RECOVERY_FENCE {
        identifier fenceId PK
        identifier_set activeParticipantStateIds
        positive_integer fenceVersion
    }
    IDENTITY_RECOVERY_PARTICIPANT_STATE {
        identifier participantStateId PK
        identifier retailerId
        identifier runId
        positive_integer recoveryGeneration
        enum phase
        enum fenceDisposition
        digest checkpointDigest
    }
    IDENTITY_RECOVERY_COMMAND_RESULT {
        identifier commandResultId PK
        identifier participantStateId FK
        identifier idempotencyKey
        identifier commandId
        digest canonicalRequestHash
        integer durableStatus
    }
```

`CryptographicKeyVersion` is independent protected lifecycle material used by sessions and token issuance; it has no foreign-key ownership by an account or client. A retailerless audit record may have no Account and always has one outbox row. The global recovery fence tracks all active U3 participant runs so one retailer's resume cannot re-enable identity writes while another run remains unresolved.

## Derived rules summary

The YAML in `rules.md` is authoritative; this table groups the rules by implementation concern.

| Concern | Rules | Required behavior |
| --- | --- | --- |
| Local authentication | BR1.1-BR1.5 | Generic denial, lockout, generated demo credentials, controlled reset, and all-session revocation |
| Google federation | BR2.1-BR2.6 | Optional exact configuration, no email linking, explicit ten-minute proof, unique issuer-subject link, no self-unlink |
| Human authorization | BR3.1-BR3.7 | Valid code/PKCE proof, bounded session/token lifetime, one-time refresh, logout, CSRF boundary, no automatic mutation retry |
| Key protection | BR4.1-BR4.4 | 90-day rotation, concrete overlap, protected persistence, and fail-closed recovery |
| Machine and platform identity | BR5.1-BR5.5 | Narrow workload authentication cannot acquire human or retailer authority; a separate revocable human platform grant supports current Operator checks and safe machine denials |
| Retailer boundary | BR6.1-BR6.3 | Tenant Directory authority and safe zero/one/many context handling |
| Persistence/recovery | BR7.1-BR7.11 | Owned parameterized operations, ordered migration, restart/restore integrity, C24 participant ledger, checkpoint, fence and deadlines |
| Reviewer path | BR8.1-BR8.5 | Stable local HTTPS, explicit prerequisites, local login without Google, accessible outcomes, and measured U3 contribution to three clean reviewer runs |
| Contracts/events | BR9.1-BR9.5 | Complete versioned C02/C24 APIs, closed tenant/global audit envelopes, atomic one-to-one audit/outbox, bounded publication and U3-owned C23/C22 conformance |

## Boundary contracts and failure semantics

| Boundary | Owner | Identity Access obligation |
| --- | --- | --- |
| C02 Identity metadata, keys and current platform grant | U3 | Publish exact issuer/endpoints and active plus lifecycle-valid verify-only public signing keys; provide the registered U10 workload a live grant decision with no positive fallback |
| C16 Browser login through BFF | U11 with U3 protocol provider | Accept only the registered `/signin-oidc` OIDC redirect; U11's `/auth/callback` is a separate one-time browser continuation after validation, with no reusable code; enforce PKCE, server-side token use, logout, and session validation |
| C20 Google federation adapter | U3 | Validate external proof and link only by explicit audited issuer-subject binding |
| Tenant membership query | U4 | Provide stable account reference only; never claim current retailer authority |
| C01/C15 identity audit event | U3 producer, U10 consumer | Commit exactly one immutable redacted audit/outbox pair per decision. Use the closed global envelope and separate route for retailerless outcomes; require real retailer/placement in tenant events |
| C22/C23 messaging conformance | U1 contracts, U3 publisher | Implement and test a service-owned authenticated outbox adapter against every applicable fixture; preserve message identity, bounded delivery and replay independently of U14 |
| C24 recovery participant | U15 coordinator, U3 participant | Authenticate the registered coordinator; persist exact command results, checkpoint and shared identity-write/key-rotation fence across prepare, close, abort, resume and restart |
| C17/C18 platform evidence access | U10 evidence API, U11/U12 BFF and UI | Supply a separate revocable human platform grant and live current-grant read; U3 neither grants retailer authority nor owns evidence pagination/UI |
| Secret/key delivery | U2 platform boundary, U3 consumer | Resolve only workload-scoped protected references and fail closed when unavailable |
| Demo/recovery evidence | U13 | Expose supported health, local authentication, rotation, and restore checks without direct storage mutation |

Identity endpoints and protocol responses use their standard authorization semantics. StockSense-specific service errors use stable browser-safe codes and a correlation identifier. The minimum behavior set is:

| Condition | External result |
| --- | --- |
| Unknown user, wrong password, disabled account, or locked local credential | `authentication_failed`; identical browser-visible denial class and no session; internal cause retained only in protected audit/operator evidence |
| Invalid redirect, state, nonce, code, callback, or PKCE | `invalid_authorization_response`; no token or session |
| Unknown Google issuer-subject link | `external_identity_not_linked`; no account creation |
| Expired or mismatched linking transaction | `linking_transaction_invalid`; no link |
| External identity belongs to another account | `external_identity_link_conflict`; no account disclosure |
| Expired/revoked session or refresh reuse | `reauthentication_required`; no renewal |
| Missing required CSRF at U11 | `csrf_validation_failed`; no mutation |
| Invalid machine audience/scope/job authority | `machine_authority_denied`; no business effect |
| Invalid or revoked platform Operator grant; unavailable current-grant lookup | Deny global evidence access; no cached or retailer-role fallback |
| Missing or invalid C24 coordinator token; wrong workload/scope | Typed `401` or `403`; no participant mutation |
| Stale placement/recovery generation or changed idempotency request | Typed `409`; no new fence or result |
| Unsupported C24 protocol/policy or route/body mismatch | Typed `422`; no participant mutation |
| Missing checkpoint or failed local resume reconciliation | Typed `409`; retain the recovery fence |
| Recovery persistence or exact-result commit unavailable | `503 RECOVERY_PERSISTENCE_UNAVAILABLE`; no fabricated durable success |
| Invalid tenant/global identity-audit envelope | Reject before publication; no cross-profile substitution or fabricated retailer metadata |
| Sealed or missing protected material | `identity_dependency_unavailable`; service not ready for affected capability |
| Failed migration or corrupt restore | `identity_recovery_invalid`; service not declared recovered |

Credentials, tokens, authorization codes, raw external claims, key material, and secret references are excluded from error detail, logs, and event payloads. Correlation uses bounded identifiers rather than sensitive values.

## Acceptance scenarios

The following scenarios must remain independently executable and evidence-bound:

1. Valid seeded local credentials complete the BFF flow; absent, wrong-password, disabled, and locked local accounts create no session and return the same browser-visible `authentication_failed` class. Internal audit distinguishes the cause without exposing it; invalid state/nonce/callback/PKCE also creates no session.
2. A Google identity with the same email as a local account remains unlinked and unauthorized until the local account reauthenticates and completes the explicit ten-minute flow.
3. Wrong-account, expired, replayed, and issuer-subject-conflict linking attempts fail without changing links or sessions.
4. Session idle/absolute expiry, account disablement, reset, link change, logout, and refresh reuse each prevent further authorization.
5. A logged-out cookie and revoked U3 grant both fail; StockSense does not claim to log out Google.
6. Zero, one, and multiple memberships produce no-access, automatic selection, and explicit-selection behavior respectively; revoked, substituted, and late-context cases fail.
7. Workload tokens with wrong issuer, audience, scope, type, lifetime, or job authority fail and cannot exercise human purchasing permissions.
8. Restart preserves identities and valid keys; rotation uses new active material while prior artifacts validate only through their explicit retention boundary.
9. Sealed/missing protection material, failed credential reload, corrupt backup, incomplete restore, and failed migration keep the service unready with actionable diagnostics.
10. A clean reviewer environment without Google secrets or owner state starts the identity boundary, obtains generated demo credentials through protected setup output, and completes local login.
11. Identity state changes atomically create redacted audit/outbox records; publication retry/replay preserves one authoritative effect and immutable message identity.
12. Restore reconciles identity counts, relationships, keys, representative authentication, and retention so expired audit data cannot reappear.
13. A retailerless pre-login denial produces a redacted global C01/C15 audit and exactly one outbox message; a tenant-scoped decision uses the separate tenant envelope. Atomic failure prevents an accepted identity change, while retry and replay preserve the committed message ID.
14. A retailer Operator without a platform grant cannot read global evidence. Revoking the platform grant makes U10's next C02 current-grant check deny, and a machine token or unavailable grant lookup never substitutes for a delegated human grant.
15. U15's authenticated C24 prepare and close durably fence U3 writes/key rotation and record a matching U3 checkpoint. Changed-key retries, stale generations, missing checkpoints, delayed prepare after abort, restart, and failed resume remain typed and fenced; only reconciled resume releases this run's holder, without releasing other active holders.
16. U3's own C23 publisher passes applicable C22 fixtures and emits separate evidence; its OpenAPI/AsyncAPI provider contracts include current-grant, typed C24 commands, and both closed audit envelopes for the U1-governed catalogue.
17. U3 records per-run startup, readiness and local-login timing in each of three clean reviewer runs; U13 alone assesses the complete 90-minute total and 45-minute post-download limits from measured runs.

These scenarios prove U3's contribution only. UI accessibility, Kubernetes provisioning, secret-store operation, Tenant Directory enforcement, and integrated recovery require their owning units' evidence as well.
## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-25T19:50:25Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/construction/identity-access/functional-design/entities.md > PlatformOperatorGrant entityConstraints and Account relationship | The model permits multiple versioned grants per subject but does not identify a single current grant or prevent two active grants. Revoking one row could leave another active, making the C02 current-grant response ambiguous and weakening the C17/C18 next-read revocation guarantee. | Define a per-subject current-grant invariant, monotonic version and atomic grant/revoke behavior so the C02 check returns active only for the one current grant and denies after revocation. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Stage-defined validation tools | None declared | The stage lists gate sensors but no reviewer validation command. |
| Read-only rule and traceability check | PASS: 51 rules, 51 coverage rows, 2 explained reverse entries, no missing targets, orphans, or duplicate rule IDs | BR5.4 is explicitly explained in the reverse map; structural rule references are consistent. |
| Stage sensors | Not fired in this advisory pass | Sensor `fire` is a mutating gate action; the read-only structural check above covers rule references without changing stage state. |

### Summary

The revised BR5.4 reverse mapping matches the C02/C17/C18 ownership boundary, and locked-account sign-in now shares the same browser-visible failure class as absent, disabled, and invalid credentials. The grant-history invariant should be made explicit before implementation; this one Major finding does not block the advisory READY verdict.
