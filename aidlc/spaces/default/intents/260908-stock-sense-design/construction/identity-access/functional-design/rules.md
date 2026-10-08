# Identity Access Business Rules

Unit: U3 Identity Access (`identity-access`)

Sources: FR1, FR2, FR20; NFR3-NFR6, NFR8-NFR11, NFR13-NFR15; C02, C16, and C20; the U3 unit boundary; assigned stories; and the confirmed Identity Access Functional Design decisions.

The YAML block is the source of truth for U3 decision logic. References to BFF session, retailer context, infrastructure, or reviewer behavior define U3's contribution at those boundaries. U11 owns the browser cookie and U4 owns retailer memberships and roles.

```yaml
schemaVersion: "1.0.0"
unit: identity-access
rules:
  - id: BR1.1
    statement: An active account with a valid, unlocked local credential may authenticate through the local path.
    category: authorization
    appliesTo: [Account, LocalCredential, AuthorizationSession]
    trigger: Local credentials are submitted.
    logic: "IF the account is active, the credential is not locked, and the submitted secret verifies THEN authentication may continue and the failure count is cleared."
    violationBehaviour: "Deny authentication, create no authorization session, and return a non-enumerating failure."
    source: [FR1, NFR5]

  - id: BR1.2
    statement: Invalid credentials and inactive accounts create no session or token.
    category: authorization
    appliesTo: [Account, LocalCredential, AuthorizationSession]
    trigger: Local authentication validation fails.
    logic: "IF the account is absent, disabled, locked, or the secret does not verify THEN no grant, session, access token, or refresh token is issued."
    violationBehaviour: "Return the same browser-safe denial class and record a security audit outcome without revealing which check failed."
    source: [FR1, NFR5, NFR10]

  - id: BR1.3
    statement: Five failed local authentication attempts lock the credential for 15 minutes.
    category: policy
    appliesTo: [LocalCredential]
    trigger: A submitted local credential fails verification.
    logic: "IF the fifth failure in the current unlocked attempt sequence is recorded THEN set lockedUntil to 15 minutes after that failure; attempts during the lock cannot authenticate."
    violationBehaviour: "Deny authentication until the lock expires or an operator performs a valid reset."
    source: [FR1, NFR5]

  - id: BR1.4
    statement: The reproducible profile provides four bounded demo identities with generated per-environment passwords.
    category: policy
    appliesTo: [Account, LocalCredential]
    trigger: A demo environment is initialized.
    logic: "IF demo identities are provisioned THEN create a planner, a manager-planner, a multi-retailer planner, and an operator with no retailer membership; generate passwords for that environment and disclose them once through protected setup output."
    violationBehaviour: "Fail demo initialization rather than use checked-in, shared, or predictable passwords."
    source: [NFR5, NFR6, NFR11]

  - id: BR1.5
    statement: Local credential reset is operator-controlled and invalidates all prior account sessions.
    category: authorization
    appliesTo: [Account, LocalCredential, AuthorizationSession, RefreshTokenFamily]
    trigger: A local credential reset is requested.
    logic: "IF the operator is authorized and a new generated credential is protected successfully THEN replace the credential revision, increment the account security revision, and revoke all sessions; public signup and email reset remain unavailable."
    violationBehaviour: "Reject unauthorized or incomplete reset and retain the existing credential state."
    source: [FR1, NFR5, NFR6]

  - id: BR2.1
    statement: Google authentication is available only when its exact provider configuration and callback are present.
    category: validation
    appliesTo: [ExternalIdentityLink, LinkingTransaction]
    trigger: Google sign-in or linking begins.
    logic: "IF the provider is configured and the callback exactly equals https://identity.stocksense.localhost/signin-google THEN the flow may begin; otherwise Google is unavailable."
    violationBehaviour: "Hide or deny the Google path while preserving local authentication."
    source: [FR1, NFR5, NFR11]

  - id: BR2.2
    statement: An unlinked external identity creates no account and receives no access based on email or profile claims.
    category: authorization
    appliesTo: [Account, ExternalIdentityLink]
    trigger: A verified Google callback has no issuer-subject link.
    logic: "IF no ExternalIdentityLink matches the verified issuer and subject THEN deny account access regardless of matching email, verified-email flag, name, or other profile claim."
    violationBehaviour: "Create nothing, grant no membership, and return instructions to use local sign-in and explicit linking."
    source: [FR1, NFR5]

  - id: BR2.3
    statement: External identity linking requires a recent local reauthentication and a pending one-time transaction.
    category: authorization
    appliesTo: [Account, LinkingTransaction, ExternalIdentityLink]
    trigger: A signed-in user selects Link Google.
    logic: "IF local reauthentication succeeds THEN create a state- and nonce-bound transaction for that account; only its matching verified callback may complete the link."
    violationBehaviour: "Reject unauthenticated, non-reauthenticated, mismatched-state, mismatched-nonce, or wrong-account linking and create no link."
    source: [FR1, NFR5]

  - id: BR2.4
    statement: A linking transaction expires after 10 minutes and is consumed at most once.
    category: constraint
    appliesTo: [LinkingTransaction]
    trigger: A Google linking callback is evaluated.
    logic: "IF the transaction is pending, unexpired, and all callback proofs validate THEN it may complete once; otherwise it cannot create a link."
    violationBehaviour: "Mark expired or invalid transactions terminal, deny linkage, and require a new reauthenticated attempt."
    source: [FR1, NFR5]

  - id: BR2.5
    statement: An external issuer-subject identity can belong to only one local account.
    category: constraint
    appliesTo: [ExternalIdentityLink, LinkingTransaction]
    trigger: A verified link is about to commit.
    logic: "IF the issuer-subject pair is already linked to the initiating account THEN return the existing result; IF linked to another account THEN reject; otherwise create exactly one link atomically."
    violationBehaviour: "Deny conflicting linkage without disclosing the other account and record the denied attempt."
    source: [FR1, NFR5]

  - id: BR2.6
    statement: Link changes revoke prior account sessions and self-service unlinking is absent from v1.
    category: policy
    appliesTo: [Account, ExternalIdentityLink, AuthorizationSession, RefreshTokenFamily]
    trigger: An external link is added or an operator performs an approved link correction.
    logic: "IF link state changes THEN increment the account security revision and revoke all sessions; no user-facing unlink operation is offered."
    violationBehaviour: "Reject unsupported unlink requests and require reauthentication after an approved link change."
    source: [FR1, NFR5]

  - id: BR3.1
    statement: Browser authorization uses validated authorization code, state, nonce, callback, and PKCE proof before U3 issues tokens.
    category: authorization
    appliesTo: [AuthorizationSession, MachineClient]
    trigger: The BFF exchanges an authorization response.
    logic: "IF the client, redirect, authorization code, state, nonce, and PKCE proof all match an unconsumed request THEN token issuance may continue."
    violationBehaviour: "Deny the exchange, consume or invalidate the failed request where applicable, and issue no tokens."
    source: [FR1, NFR5]

  - id: BR3.2
    statement: Human authorization sessions have a 30-minute idle limit and an 8-hour absolute limit with no persistent-login extension.
    category: policy
    appliesTo: [AuthorizationSession]
    trigger: A human session is created or validated.
    logic: "IF accepted activity occurred within 30 minutes and absoluteExpiresAt has not passed THEN the session may remain active; otherwise it expires."
    violationBehaviour: "Deny renewal and protected authorization; require a complete new sign-in."
    source: [FR1, NFR5]

  - id: BR3.3
    statement: Access tokens last 10 minutes and allow no more than five minutes of validation clock skew.
    category: constraint
    appliesTo: [AuthorizationSession, MachineClient, CryptographicKeyVersion]
    trigger: An access token is issued or validated.
    logic: "IF issuance is authorized THEN set a 10-minute lifetime; IF validation falls outside signed lifetime plus at most five minutes of skew THEN the token is invalid."
    violationBehaviour: "Reject the token without extending its signed lifetime or granting fallback authority."
    source: [NFR5]

  - id: BR3.4
    statement: Refresh credentials rotate once per use, remain bounded by the session, and detect reuse.
    category: constraint
    appliesTo: [AuthorizationSession, RefreshTokenFamily]
    trigger: A refresh credential is presented.
    logic: "IF the current generation is valid and the session is active THEN consume and replace it atomically; IF a consumed generation is reused THEN revoke the family and session."
    violationBehaviour: "Issue no token on invalid or reused refresh and require a new sign-in after reuse detection."
    source: [FR1, NFR5]

  - id: BR3.5
    statement: StockSense logout invalidates U3 authorization state but does not promise to end the upstream Google session.
    category: policy
    appliesTo: [AuthorizationSession, RefreshTokenFamily]
    trigger: The BFF submits a valid logout request.
    logic: "IF the U3 session is active THEN mark it logged-out and revoke its refresh family; later replay cannot authorize StockSense access."
    violationBehaviour: "Treat repeated logout as safe completion while denying all later use of invalidated authorization state."
    source: [FR1, NFR5]

  - id: BR3.6
    statement: Session loss, revocation, or retailer-context change during a mutation never causes automatic resubmission.
    category: policy
    appliesTo: [AuthorizationSession]
    trigger: Authorization becomes invalid or uncertain while a business mutation is in progress.
    logic: "IF the mutation outcome is uncertain THEN return a recovery outcome that requires explicit status reconciliation or user action after reauthentication."
    violationBehaviour: "Do not claim success and do not automatically repeat the mutation."
    source: [FR1, NFR5, NFR15]

  - id: BR3.7
    statement: U3 cannot compensate for missing browser CSRF validation.
    category: authorization
    appliesTo: [AuthorizationSession]
    trigger: A browser mutation reaches the BFF boundary.
    logic: "IF the browser session is expired or the required CSRF proof is missing or invalid THEN the mutation must not be authorized, even if an upstream token still exists."
    violationBehaviour: "Deny the mutation and create no business effect."
    source: [NFR5]

  - id: BR4.1
    statement: Signing and session-data-protection keys rotate as versioned material every 90 days.
    category: policy
    appliesTo: [CryptographicKeyVersion]
    trigger: Scheduled rotation or controlled emergency rotation begins.
    logic: "IF replacement material is protected and readable THEN activate one new version per purpose and stop new issuance with the prior version."
    violationBehaviour: "Do not activate incomplete material; preserve the last valid active version until controlled recovery or explicit emergency action."
    source: [NFR5, NFR6]

  - id: BR4.2
    statement: Prior keys remain available for every artifact they may still validly verify or decrypt.
    category: constraint
    appliesTo: [CryptographicKeyVersion]
    trigger: A key stops issuing new artifacts.
    logic: "IF purpose is token-signing THEN retain for at least 15 minutes after last issuance; IF purpose is session-data-protection THEN retain for at least 8 hours and 5 minutes after last issuance."
    violationBehaviour: "Block retirement before retainUntil and fail validation if required historical material is absent."
    source: [NFR5, NFR6]

  - id: BR4.3
    statement: Identity and key material survive restart and recovery without secret material in source control or infrastructure state.
    category: constraint
    appliesTo: [Account, CryptographicKeyVersion, MachineCredentialVersion]
    trigger: Service restart, backup, restore, or key loading occurs.
    logic: "IF protected persistent identity data and external protection material are available and pass integrity checks THEN restore the same identities and valid key versions."
    violationBehaviour: "Fail closed, expose no partial authentication capability, and require controlled recovery."
    source: [NFR5, NFR6, NFR9]

  - id: BR4.4
    statement: Missing, sealed, corrupt, or expired protection material fails closed.
    category: authorization
    appliesTo: [CryptographicKeyVersion, MachineCredentialVersion]
    trigger: Required key or credential material is resolved.
    logic: "IF material cannot be retrieved, authenticated, decrypted, or shown to be within its allowed lifecycle THEN it is unavailable."
    violationBehaviour: "Issue no new tokens or credentials, deny dependent authentication, and require controlled replacement plus user reauthentication where applicable."
    source: [NFR5, NFR6]

  - id: BR5.1
    statement: Machine tokens validate issuer, audience, signature, lifetime, token type, client status, and requested scope.
    category: authorization
    appliesTo: [MachineClient, MachineCredentialVersion, CryptographicKeyVersion]
    trigger: A workload requests or presents a machine token.
    logic: "IF every token property validates and the requested audience and scopes are subsets of the active client registration THEN workload authentication may succeed."
    violationBehaviour: "Deny the request without business effect when any property is missing, stale, expired, or unauthorized."
    source: [NFR5]

  - id: BR5.2
    statement: Machine identity never implies a human role, retailer membership, or high-impact purchasing authority.
    category: authorization
    appliesTo: [MachineClient]
    trigger: A workload token is used at an application boundary.
    logic: "IF a capability requires current human membership, manager authority, purchase approval, rejection, cancellation, or receipt THEN machine identity alone cannot satisfy it."
    violationBehaviour: "Deny the operation and record the stable authorization reason."
    source: [FR2, NFR3, NFR5]

  - id: BR5.3
    statement: Machine credential rotation uses workload-scoped secret delivery and bounded overlap.
    category: policy
    appliesTo: [MachineClient, MachineCredentialVersion]
    trigger: A workload credential is created, rotated, reloaded, or recovered.
    logic: "IF the new version is available only to its authorized workload and consumers demonstrate successful reload THEN activate it and retire the old version after bounded overlap."
    violationBehaviour: "Keep unauthorized workloads denied; expired or missing credentials cannot gain broad fallback permissions."
    source: [NFR6]

  - id: BR6.1
    statement: U3 authenticates an account but U4 remains authoritative for retailer membership, role, and placement generation.
    category: authorization
    appliesTo: [Account, AuthorizationSession]
    trigger: An authenticated identity requests retailer-scoped work.
    logic: "IF U3 validates the identity THEN expose only a stable account reference; the receiving business boundary must obtain and enforce current U4 authority."
    violationBehaviour: "A token claim, route identifier, cached role, or prior membership cannot authorize the business request."
    source: [FR2, NFR3, NFR5]

  - id: BR6.2
    statement: Post-authentication retailer selection reflects the current set returned by U4.
    category: policy
    appliesTo: [Account, AuthorizationSession]
    trigger: The BFF resolves retailer contexts after sign-in or refresh.
    logic: "IF there are zero memberships THEN show no-access guidance; IF one THEN it may be selected automatically; IF many THEN require explicit selection."
    violationBehaviour: "Do not invent, persist as authority, or self-assign a retailer context."
    source: [FR2, NFR3, NFR14]

  - id: BR6.3
    statement: Stale or revoked retailer context is cleared before business calls and cannot receive late results from another context.
    category: authorization
    appliesTo: [AuthorizationSession]
    trigger: Membership changes, retailer selection changes, or an authorized response arrives.
    logic: "IF the selected retailer is no longer current or a response belongs to a prior selection generation THEN clear or discard it before it can authorize or appear under the new context."
    violationBehaviour: "Return access-recovery state and never use stale context for a mutation."
    source: [FR2, NFR3, NFR14]

  - id: BR7.1
    statement: U3 persists identity data only within its owned relational boundary through approved parameterized operations.
    category: constraint
    appliesTo: [Account, LocalCredential, ExternalIdentityLink, AuthorizationSession, RefreshTokenFamily, CryptographicKeyVersion, MachineClient, MachineCredentialVersion, IdentityAuditRecord, IdentityOutboxMessage]
    trigger: Runtime identity data is read or changed.
    logic: "IF a runtime operation needs persistent identity state THEN it invokes an owned parameterized operation under the U3 runtime role; direct table access and access to business tables are prohibited."
    violationBehaviour: "Deny the data operation and fail dependency validation when prohibited access is detected."
    source: [NFR3, NFR4]

  - id: BR7.2
    statement: Schema evolution is versioned, ordered, separately privileged, and must complete before a changed service becomes ready.
    category: constraint
    appliesTo: [Account, LocalCredential, ExternalIdentityLink, AuthorizationSession, RefreshTokenFamily, CryptographicKeyVersion, MachineClient, MachineCredentialVersion, IdentityAuditRecord, IdentityOutboxMessage]
    trigger: A deployment requires an identity schema change.
    logic: "IF an unapplied migration is required THEN run it once under migration authority and verify success before runtime readiness."
    violationBehaviour: "Block rollout and retain the prior compatible service when migration fails or is inconsistent."
    source: [NFR4, NFR13]

  - id: BR7.3
    statement: Identity restart preserves authoritative accounts, credentials, links, sessions, clients, and valid key lifecycle state.
    category: constraint
    appliesTo: [Account, LocalCredential, ExternalIdentityLink, AuthorizationSession, RefreshTokenFamily, CryptographicKeyVersion, MachineClient, MachineCredentialVersion]
    trigger: The identity service restarts.
    logic: "IF owned storage and protection material are healthy THEN reload authoritative records and resume only with lifecycle-valid keys and credentials."
    violationBehaviour: "Do not reseed over existing data, invent keys, or declare readiness with incomplete identity state."
    source: [NFR5, NFR6]

  - id: BR7.4
    statement: Identity restore is accepted only after record, relationship, key, and secret-reference integrity checks pass.
    category: validation
    appliesTo: [Account, LocalCredential, ExternalIdentityLink, AuthorizationSession, CryptographicKeyVersion, MachineClient, MachineCredentialVersion]
    trigger: An identity backup is restored into a clean environment.
    logic: "IF counts, referential integrity, active-key availability, protected references, and representative authentication checks all reconcile THEN the restore may be declared usable."
    violationBehaviour: "Keep the restored service unavailable and report an actionable failure for corrupt, incomplete, or mismatched recovery input."
    source: [FR20, NFR6, NFR9, NFR11]

  - id: BR7.5
    statement: Retention reconciliation prevents expired identity audit data from reappearing after restore or replay.
    category: policy
    appliesTo: [IdentityAuditRecord, IdentityOutboxMessage]
    trigger: Restored records or projection-replay candidates are prepared for exposure.
    logic: "IF a record expired under the active retention policy THEN exclude it from live access and replay even when the backup still contains it."
    violationBehaviour: "Fail recovery validation when expired data would become visible again."
    source: [NFR9]

  - id: BR8.1
    statement: The identity boundary exposes reproducible build, readiness, and local-authentication smoke outcomes for a clean checkout.
    category: validation
    appliesTo: [Account, LocalCredential, CryptographicKeyVersion]
    trigger: The clean-reviewer validation profile runs.
    logic: "IF prerequisites are pinned and available THEN the identity service builds, starts, reports health, and completes a local sign-in smoke path without owner credentials."
    violationBehaviour: "Report the failed prerequisite or smoke step and do not claim the reviewer profile is ready."
    source: [NFR11, NFR13]

  - id: BR8.2
    statement: The local issuer and BFF redirects use stable exact HTTPS identities.
    category: constraint
    appliesTo: [MachineClient, AuthorizationSession]
    trigger: Local identity or BFF configuration is validated.
    logic: "IF the issuer is https://identity.stocksense.localhost and the BFF origin is https://app.stocksense.localhost with callbacks /signin-oidc and /signout-callback-oidc THEN local redirects may be accepted."
    violationBehaviour: "Fail startup or client validation for mismatched issuer, origin, scheme, or callback."
    source: [FR1, NFR5, NFR12]

  - id: BR8.3
    statement: Missing resources, storage, bootstrap inputs, or scoped secrets produce explicit safe startup failure.
    category: validation
    appliesTo: [CryptographicKeyVersion, MachineCredentialVersion]
    trigger: Local deployment prerequisites or workload secrets are resolved.
    logic: "IF required capacity, persistent storage, protection material, or workload-scoped credentials are absent THEN the dependent identity capability remains unready."
    violationBehaviour: "Expose actionable diagnostics without cloud provisioning, fallback credentials, or a success claim."
    source: [NFR2, NFR6, NFR11, NFR12]

  - id: BR8.4
    statement: The local reviewer path remains complete without Google secrets and returns browser-safe, accessible identity outcomes.
    category: policy
    appliesTo: [Account, AuthorizationSession, LinkingTransaction]
    trigger: The application starts or an identity outcome is presented.
    logic: "IF Google is unconfigured THEN omit that option while local sign-in, signed-out, no-access, expired, denied, and recovery states remain available with stable text codes."
    violationBehaviour: "Do not expose raw provider errors or block local reviewer completion."
    source: [FR1, NFR10, NFR11, NFR14]

  - id: BR9.1
    statement: Every synchronous identity boundary is described by a versioned OpenAPI contract with success and failure examples.
    category: validation
    appliesTo: [Account, AuthorizationSession, MachineClient, CryptographicKeyVersion]
    trigger: An identity metadata, authorization, token, logout, linking, reset, or client operation is introduced or changed.
    logic: "IF its versioned request, response, authentication, validation, and stable error semantics pass contract checks THEN it may be integrated."
    violationBehaviour: "Fail contract validation and block the applicable integration."
    source: [NFR8, NFR13]

  - id: BR9.2
    statement: Every durable identity event is described by AsyncAPI and is created atomically with its authoritative change and audit record.
    category: constraint
    appliesTo: [IdentityAuditRecord, IdentityOutboxMessage]
    trigger: An auditable identity change commits.
    logic: "IF the business change is valid THEN commit the identity state, immutable audit record, and outbox message together; publish under the versioned event contract."
    violationBehaviour: "Roll back the authoritative change if its audit/outbox records cannot commit; retry publication without repeating the change."
    source: [NFR7, NFR8, NFR10]

  - id: BR9.3
    statement: Identity event publication is at-least-once, observable, bounded, and idempotent by immutable message identity.
    category: policy
    appliesTo: [IdentityOutboxMessage]
    trigger: A pending identity outbox message is published, redelivered, or replayed.
    logic: "IF publication is confirmed THEN mark published; otherwise retry within the bounded policy and dead-letter visibly after exhaustion while preserving messageId."
    violationBehaviour: "Never claim exactly-once transport or create another authoritative identity change during replay."
    source: [NFR7, NFR10, NFR15]
```

## Rule application

Rules apply at the U3 boundary and describe its contribution to shared flows. A U3 authentication success never replaces U4 membership authorization, and U3 cannot compensate for missing U11 cookie or CSRF controls. Cross-unit outcomes require evidence from every owning unit.

## Rules summary

| Group | Rules | Result |
| --- | --- | --- |
| Local identity | BR1.1-BR1.5 | Valid active credentials authenticate; failures lock safely; demo provisioning and reset remain controlled |
| Google federation | BR2.1-BR2.6 | Exact optional configuration and explicit, expiring, unique account linking prevent email-based takeover |
| Sessions and tokens | BR3.1-BR3.7 | PKCE validation, bounded sessions/tokens, rotating refresh, logout, CSRF, and no mutation replay define the human authorization lifecycle |
| Key lifecycle | BR4.1-BR4.4 | Versioned protected keys rotate, overlap for concrete lifetimes, survive recovery, and fail closed |
| Machine identity | BR5.1-BR5.3 | Narrow workload authentication cannot acquire human or retailer authority and rotates through scoped delivery |
| Retailer boundary | BR6.1-BR6.3 | U4 remains authoritative; zero/one/many selection and stale-context handling are explicit |
| Persistence and recovery | BR7.1-BR7.5 | U3 uses its owned data boundary, versioned migration, integrity-checked restore, and retention reconciliation |
| Reviewer profile | BR8.1-BR8.4 | Exact local HTTPS behavior, explicit prerequisites, optional Google, and safe browser outcomes support clean-room review |
| Contracts and events | BR9.1-BR9.3 | Versioned synchronous contracts and atomic at-least-once identity events remain testable and auditable |
