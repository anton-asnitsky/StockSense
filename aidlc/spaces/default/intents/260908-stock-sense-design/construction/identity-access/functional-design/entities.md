# Identity Access Functional Entity Model

Unit: U3 Identity Access (`identity-access`)

Sources: `inception/units-generation/unit-of-work.md`, `inception/units-generation/unit-of-work-story-map.md`, `inception/requirements-analysis/requirements.md`, `inception/domain-design/components.md`, `inception/contract-design/contract-summary.md`, and the confirmed `functional-design-questions.md`.

The YAML block is the source of truth for the Identity Access logical entity model. Retailer memberships and roles belong to U4 Tenant Directory. Browser cookies and browser presentation state belong to U11 and U12; U3 records only the identity, authorization-grant, token, credential, key, and audit state it owns.

```yaml
schemaVersion: "1.0.0"
unit: identity-access
entities:
  - name: Account
    description: A stable StockSense human identity that may authenticate through one or more verified methods.
    attributes:
      - name: accountId
        logicalType: Identifier
        required: true
        unique: true
      - name: displayName
        logicalType: String
        required: true
        unique: false
        constraints: Browser-safe name; not an authorization input.
      - name: normalizedEmail
        logicalType: Email
        required: false
        unique: false
        constraints: Contact and display data only; never establishes account ownership or retailer membership.
      - name: status
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [active, disabled]
        default: active
      - name: securityRevision
        logicalType: PositiveInteger
        required: true
        unique: false
        default: 1
        constraints: Incremented after credential reset, identity-link change, or account disablement.
      - name: createdAt
        logicalType: Instant
        required: true
        unique: false
      - name: disabledAt
        logicalType: Instant
        required: false
        unique: false
    entityConstraints:
      - Public self-registration is prohibited.
      - An active account grants no retailer access without a current U4 membership decision.
      - A security-revision change invalidates every prior U3 authorization session and refresh-token family.

  - name: LocalCredential
    description: The protected local authentication secret and lockout state for one account.
    attributes:
      - name: credentialId
        logicalType: Identifier
        required: true
        unique: true
      - name: accountId
        logicalType: Identifier
        required: true
        unique: true
        references: Account.accountId
      - name: secretVerifier
        logicalType: ProtectedSecretVerifier
        required: true
        unique: false
        constraints: Plaintext is never persisted or emitted after one-time setup disclosure.
      - name: credentialRevision
        logicalType: PositiveInteger
        required: true
        unique: false
        default: 1
      - name: failedAttemptCount
        logicalType: NonNegativeInteger
        required: true
        unique: false
        default: 0
        min: 0
        max: 5
      - name: lockedUntil
        logicalType: Instant
        required: false
        unique: false
      - name: changedAt
        logicalType: Instant
        required: true
        unique: false
    entityConstraints:
      - Five failed attempts lock local authentication for 15 minutes.
      - On the first attempt after lock expiry, clear lockedUntil and reset failedAttemptCount to zero atomically before evaluating the submitted secret; that failure, if any, becomes attempt one of a new sequence.
      - Successful authentication clears the current failure count.
      - Failed-attempt and lockout state is available only to protected authentication, audit, and operator paths; absent, disabled, locked, and invalid credentials share one browser-visible authentication_failed result.
      - Reset is operator-controlled; signup and email-based reset are absent from v1.

  - name: ExternalIdentityLink
    description: An explicit binding between a verified external identity and one existing local account.
    attributes:
      - name: linkId
        logicalType: Identifier
        required: true
        unique: true
      - name: accountId
        logicalType: Identifier
        required: true
        unique: false
        references: Account.accountId
      - name: issuer
        logicalType: URI
        required: true
        unique: false
      - name: subject
        logicalType: String
        required: true
        unique: false
      - name: linkedAt
        logicalType: Instant
        required: true
        unique: false
      - name: linkedByAccountId
        logicalType: Identifier
        required: true
        unique: false
        references: Account.accountId
    entityConstraints:
      - The pair issuer and subject is globally unique within Identity Access.
      - Email, display name, or any other mutable external claim cannot create or select a link.
      - Self-service unlinking is not supported in v1.

  - name: LinkingTransaction
    description: A one-time proof that a recently reauthenticated local account initiated a specific external-identity link.
    attributes:
      - name: transactionId
        logicalType: Identifier
        required: true
        unique: true
      - name: accountId
        logicalType: Identifier
        required: true
        unique: false
        references: Account.accountId
      - name: provider
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [google]
      - name: stateDigest
        logicalType: Digest
        required: true
        unique: true
      - name: nonceDigest
        logicalType: Digest
        required: true
        unique: true
      - name: initiatedAt
        logicalType: Instant
        required: true
        unique: false
      - name: expiresAt
        logicalType: Instant
        required: true
        unique: false
        constraints: Exactly 10 minutes after initiation.
      - name: status
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [pending, completed, expired, rejected]
        default: pending
    entityConstraints:
      - A transaction may be completed once and only by the account that initiated it.
      - State, nonce, callback, provider proof, and recent local reauthentication must all validate before linking.

  - name: AuthorizationSession
    description: U3's revocable authorization-grant context for a human account; it is distinct from the U11 browser cookie.
    attributes:
      - name: sessionId
        logicalType: Identifier
        required: true
        unique: true
      - name: accountId
        logicalType: Identifier
        required: true
        unique: false
        references: Account.accountId
      - name: accountSecurityRevision
        logicalType: PositiveInteger
        required: true
        unique: false
      - name: clientId
        logicalType: Identifier
        required: true
        unique: false
        references: MachineClient.clientId
      - name: startedAt
        logicalType: Instant
        required: true
        unique: false
      - name: lastActivityAt
        logicalType: Instant
        required: true
        unique: false
      - name: absoluteExpiresAt
        logicalType: Instant
        required: true
        unique: false
        constraints: No later than 8 hours after session establishment.
      - name: status
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [active, expired, revoked, logged-out]
        default: active
      - name: revokedAt
        logicalType: Instant
        required: false
        unique: false
      - name: revocationReason
        logicalType: String
        required: false
        unique: false
    entityConstraints:
      - An active session expires after 30 minutes without accepted activity or at its absolute expiry, whichever occurs first.
      - Account disablement, credential reset, link change, or refresh-token reuse revokes the session.
      - No session contains retailer roles or establishes retailer authorization.

  - name: RefreshTokenFamily
    description: A bounded lineage of one-time refresh credentials associated with one authorization session.
    attributes:
      - name: familyId
        logicalType: Identifier
        required: true
        unique: true
      - name: sessionId
        logicalType: Identifier
        required: true
        unique: true
        references: AuthorizationSession.sessionId
      - name: currentGeneration
        logicalType: NonNegativeInteger
        required: true
        unique: false
        default: 0
      - name: currentTokenDigest
        logicalType: Digest
        required: true
        unique: true
      - name: expiresAt
        logicalType: Instant
        required: true
        unique: false
        constraints: Cannot exceed the owning session absolute expiry.
      - name: status
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [active, consumed, revoked, expired, reuse-detected]
        default: active
    entityConstraints:
      - Each token generation is accepted at most once and is replaced atomically.
      - A retained RefreshTokenGeneration digest identifies a consumed credential independently of the current generation.
      - Reuse of a consumed generation revokes the family and owning session; unknown digests fail without being misclassified as reuse.

  - name: RefreshTokenGeneration
    description: One immutable refresh-credential generation retained for one-time use and consumed-token replay detection.
    attributes:
      - name: generationId
        logicalType: Identifier
        required: true
        unique: true
      - name: familyId
        logicalType: Identifier
        required: true
        unique: false
        references: RefreshTokenFamily.familyId
      - name: generationNumber
        logicalType: NonNegativeInteger
        required: true
        unique: false
      - name: tokenDigest
        logicalType: Digest
        required: true
        unique: true
        constraints: Protected lookup digest; the bearer credential itself is never stored.
      - name: issuedAt
        logicalType: Instant
        required: true
        unique: false
      - name: consumedAt
        logicalType: Instant
        required: false
        unique: false
      - name: expiresAt
        logicalType: Instant
        required: true
        unique: false
        constraints: No later than the owning authorization session absolute expiry.
      - name: status
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [current, consumed, revoked, expired]
    entityConstraints:
      - The pair familyId and generationNumber is unique; exactly one generation is current for an active family.
      - Consume-current and insert-replacement occur in one serializable family transition; concurrent presentation cannot issue two replacements.
      - Retain consumed digests through the family expiry plus the five-minute validation-skew allowance, then expire them under the credential-retention policy.

  - name: CryptographicKeyVersion
    description: Versioned protected key material used for token signing or session-data protection.
    attributes:
      - name: keyId
        logicalType: Identifier
        required: true
        unique: true
      - name: purpose
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [token-signing, session-data-protection]
      - name: version
        logicalType: PositiveInteger
        required: true
        unique: false
      - name: publicMaterial
        logicalType: PublicKeyMaterial
        required: false
        unique: false
        constraints: Present only where public verification material applies.
      - name: protectedPrivateReference
        logicalType: ProtectedSecretReference
        required: true
        unique: true
        constraints: Resolves through the approved secret-protection boundary; never committed to source or state.
      - name: activatedAt
        logicalType: Instant
        required: true
        unique: false
      - name: lastIssuedAt
        logicalType: Instant
        required: false
        unique: false
      - name: retainUntil
        logicalType: Instant
        required: true
        unique: false
      - name: status
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [pending, active, verify-only, retired, unavailable]
        default: pending
    entityConstraints:
      - One active key exists per purpose; new issuance never uses verify-only or retired material.
      - Rotation is scheduled every 90 days.
      - Signing material remains verifiable for at least 15 minutes after last issuance; session-protection material remains decryptable for at least 8 hours and 5 minutes after last issuance.

  - name: MachineClient
    description: A registered workload identity with explicitly bounded token audiences and scopes.
    attributes:
      - name: clientId
        logicalType: Identifier
        required: true
        unique: true
      - name: clientKind
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [browser-bff, workload]
      - name: allowedAudiences
        logicalType: IdentifierSet
        required: true
        unique: false
      - name: allowedScopes
        logicalType: IdentifierSet
        required: true
        unique: false
      - name: status
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [active, disabled]
        default: active
    entityConstraints:
      - A workload client cannot receive a human role, retailer membership, or purchasing authority.
      - Requested audience and scope must be a subset of the registered allowance.

  - name: MachineCredentialVersion
    description: One protected, rotatable credential version for a registered machine client.
    attributes:
      - name: credentialVersionId
        logicalType: Identifier
        required: true
        unique: true
      - name: clientId
        logicalType: Identifier
        required: true
        unique: false
        references: MachineClient.clientId
      - name: protectedSecretReference
        logicalType: ProtectedSecretReference
        required: true
        unique: true
      - name: activatedAt
        logicalType: Instant
        required: true
        unique: false
      - name: expiresAt
        logicalType: Instant
        required: true
        unique: false
      - name: status
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [pending, active, overlap, revoked, expired]
        default: pending
    entityConstraints:
      - Rotation activates a new version before the bounded old-version overlap is removed.
      - Expired, revoked, or unknown versions cannot authenticate a workload.

  - name: IdentityAuditRecord
    description: An immutable authoritative record of a security-relevant identity decision or change.
    attributes:
      - name: auditId
        logicalType: Identifier
        required: true
        unique: true
      - name: eventType
        logicalType: String
        required: true
        unique: false
        constraints: Retailerless outcomes use identity.global.audit.recorded; tenant outcomes use identity.audit.recorded only with real retailer and placement context.
      - name: auditScope
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [global-identity, tenant]
      - name: retailerId
        logicalType: Identifier
        required: false
        unique: false
        constraints: Present only for tenant scope; forbidden for retailerless global identity scope.
      - name: placementGeneration
        logicalType: PositiveInteger
        required: false
        unique: false
        constraints: Present with a real retailerId for tenant scope; forbidden for global identity scope.
      - name: actorType
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [anonymous, human, workload, system]
      - name: actorId
        logicalType: Identifier
        required: false
        unique: false
      - name: accountId
        logicalType: Identifier
        required: false
        unique: false
        references: Account.accountId
      - name: targetId
        logicalType: Identifier
        required: false
        unique: false
      - name: outcome
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [succeeded, denied, failed]
      - name: reasonCode
        logicalType: String
        required: true
        unique: false
      - name: correlationId
        logicalType: Identifier
        required: true
        unique: false
      - name: occurredAt
        logicalType: Instant
        required: true
        unique: false
      - name: expiresAt
        logicalType: Instant
        required: true
        unique: false
    entityConstraints:
      - Records exclude credentials, tokens, external authorization codes, and raw key material.
      - Records are append-only until controlled retention expiry.
      - A pre-login denial uses a safe anonymous actor and generic resource identity; submitted identifiers, email, and raw provider claims are never stored.
      - Exactly one IdentityOutboxMessage is committed for every security-relevant audit record, including denials, in the same U3 transaction; an uncommitted pair is never exposed as a successful identity outcome.

  - name: IdentityOutboxMessage
    description: A durable publication record created atomically with every security-relevant identity audit decision, including denials.
    attributes:
      - name: messageId
        logicalType: Identifier
        required: true
        unique: true
      - name: auditId
        logicalType: Identifier
        required: true
        unique: true
        references: IdentityAuditRecord.auditId
      - name: messageType
        logicalType: String
        required: true
        unique: false
        constraints: identity.global.audit.recorded for retailerless outcomes; identity.audit.recorded only with real retailer and placement context.
      - name: envelopeProfile
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [global-identity, tenant]
      - name: retailerId
        logicalType: Identifier
        required: false
        unique: false
        constraints: Required for tenant envelope; forbidden for global identity envelope.
      - name: placementGeneration
        logicalType: PositiveInteger
        required: false
        unique: false
        constraints: Required with tenant retailerId; forbidden for global identity envelope.
      - name: schemaVersion
        logicalType: SemanticVersion
        required: true
        unique: false
      - name: correlationId
        logicalType: Identifier
        required: true
        unique: false
      - name: causationId
        logicalType: Identifier
        required: false
        unique: false
      - name: status
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [pending, published, failed, dead-lettered]
        default: pending
      - name: attemptCount
        logicalType: NonNegativeInteger
        required: true
        unique: false
        default: 0
      - name: occurredAt
        logicalType: Instant
        required: true
        unique: false
    entityConstraints:
      - Every security decision commits one audit record and one outbox message atomically; an accepted identity mutation commits its state in that same transaction.
      - Redelivery preserves message identity and cannot repeat the authoritative identity change.
      - The immutable message ID and idempotency key derive from the committed audit identity; payload digest uses the approved C23 canonical data profile.
      - U3 owns its C23 bootstrap publisher adapter and applicable C22 conformance evidence independently of U14.

  - name: PlatformOperatorGrant
    description: Revocable platform-wide human grant owned by U3, independent of every U4 retailer membership or role.
    attributes:
      - name: grantId
        logicalType: Identifier
        required: true
        unique: true
      - name: subjectId
        logicalType: Identifier
        required: true
        unique: false
        references: Account.accountId
      - name: status
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [active, revoked]
      - name: grantVersion
        logicalType: PositiveInteger
        required: true
        unique: false
      - name: grantedAt
        logicalType: Instant
        required: true
        unique: false
      - name: revokedAt
        logicalType: Instant
        required: false
        unique: false
    entityConstraints:
      - Only an owner-controlled audited operation can grant or revoke this human privilege.
      - A current-grant read returns active only for a current human subject and to U10's registered narrow grant-reader workload; no machine principal or retailer Operator role substitutes.
      - Revocation is effective on the next current-grant read, without relying on cached role claims.

  - name: IdentityRecoveryParticipantState
    description: Durable U3 C24 state for one retailer-scoped recovery run and generation.
    attributes:
      - name: participantStateId
        logicalType: Identifier
        required: true
        unique: true
      - name: retailerId
        logicalType: Identifier
        required: true
        unique: false
      - name: runId
        logicalType: Identifier
        required: true
        unique: false
      - name: recoveryGeneration
        logicalType: PositiveInteger
        required: true
        unique: false
      - name: placementGeneration
        logicalType: PositiveInteger
        required: true
        unique: false
      - name: registrationId
        logicalType: Identifier
        required: true
        unique: false
      - name: rosterDigest
        logicalType: Digest
        required: true
        unique: false
      - name: phase
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [prepared, closed, aborted, resumed, unresolved]
      - name: checkpointId
        logicalType: Identifier
        required: false
        unique: false
      - name: checkpointDigest
        logicalType: Digest
        required: false
        unique: false
      - name: fenceDisposition
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [active, cleared, terminally-suppressed, unresolved]
      - name: durableStateVersion
        logicalType: PositiveInteger
        required: true
        unique: false
    entityConstraints:
      - The retailerId and runId pair is unique; recoveryGeneration is monotonic and stale generations cannot reacquire a fence.
      - Close requires an immutable local checkpoint and matching digest; abort creates a terminal guard even when prepare was only potentially delivered.
      - Every prepared or unresolved state retains its fence through restart until a durable abort or reconciled resume clears or terminally suppresses it.

  - name: GlobalIdentityRecoveryFence
    description: Durable shared fence that prevents identity writes and key rotation while any retailer recovery run still holds U3.
    attributes:
      - name: fenceId
        logicalType: Identifier
        required: true
        unique: true
      - name: activeParticipantStateIds
        logicalType: IdentifierSet
        required: true
        unique: false
      - name: fenceVersion
        logicalType: PositiveInteger
        required: true
        unique: false
    entityConstraints:
      - One logical global fence tracks all active or unresolved U3 participant holders; it clears only after every holder has a durable cleared or terminally-suppressed disposition.
      - Startup reloads this fence before enabling any identity mutation or key rotation.

  - name: IdentityRecoveryCommandResult
    description: Durable idempotency and exact-result ledger for U3 C24 commands.
    attributes:
      - name: commandResultId
        logicalType: Identifier
        required: true
        unique: true
      - name: participantStateId
        logicalType: Identifier
        required: true
        unique: false
        references: IdentityRecoveryParticipantState.participantStateId
      - name: idempotencyKey
        logicalType: Identifier
        required: true
        unique: false
      - name: commandId
        logicalType: Identifier
        required: true
        unique: false
      - name: command
        logicalType: Enum
        required: true
        unique: false
        allowedValues: [prepare, close, abort, resume]
      - name: canonicalRequestHash
        logicalType: Digest
        required: true
        unique: false
      - name: durableStatus
        logicalType: PositiveInteger
        required: true
        unique: false
      - name: durableResponse
        logicalType: JsonValue
        required: true
        unique: false
    entityConstraints:
      - The participant, retailerId, runId and idempotencyKey tuple identifies one canonical request and exact durable result; commandId is also unique within the participant/run.
      - Matching replay returns the stored status and body; changed content under either identity returns typed 409 without changing state.
      - A 200 result is returned only after participant state, global fence, checkpoint when applicable, and command result commit atomically; persistence failure returns typed 503 without a fabricated durable result.

relationships:
  - from: Account
    to: LocalCredential
    cardinality: one-to-zero-or-one
    direction: Account owns LocalCredential
  - from: Account
    to: ExternalIdentityLink
    cardinality: one-to-many
    direction: Account owns ExternalIdentityLink
  - from: Account
    to: LinkingTransaction
    cardinality: one-to-many
    direction: Account initiates LinkingTransaction
  - from: Account
    to: AuthorizationSession
    cardinality: one-to-many
    direction: Account owns AuthorizationSession
  - from: AuthorizationSession
    to: RefreshTokenFamily
    cardinality: one-to-zero-or-one
    direction: AuthorizationSession owns RefreshTokenFamily
  - from: RefreshTokenFamily
    to: RefreshTokenGeneration
    cardinality: one-to-many
    direction: RefreshTokenFamily owns retained RefreshTokenGeneration records
  - from: MachineClient
    to: AuthorizationSession
    cardinality: one-to-many
    direction: MachineClient receives AuthorizationSession grants
  - from: MachineClient
    to: MachineCredentialVersion
    cardinality: one-to-many
    direction: MachineClient owns MachineCredentialVersion
  - from: Account
    to: IdentityAuditRecord
    cardinality: one-to-many
    direction: Account may be subject of IdentityAuditRecord
  - from: IdentityAuditRecord
    to: IdentityOutboxMessage
    cardinality: one-to-one
    direction: IdentityAuditRecord produces IdentityOutboxMessage
  - from: Account
    to: PlatformOperatorGrant
    cardinality: one-to-zero-or-many
    direction: Account may hold versioned PlatformOperatorGrant history
  - from: IdentityRecoveryParticipantState
    to: IdentityRecoveryCommandResult
    cardinality: one-to-many
    direction: Recovery state retains exact durable command results
  - from: GlobalIdentityRecoveryFence
    to: IdentityRecoveryParticipantState
    cardinality: one-to-many
    direction: Global fence tracks every active or unresolved participant holder
```

## Ownership boundaries

The model carries authenticated identity, credential, U3's platform-wide human grant, key, identity-event, and U3 recovery-participant state only. U11 owns browser cookies and browser token storage. U4 owns retailer membership, role, and placement. U15 owns recovery coordination; U3 owns only its durable participant fence, checkpoint, and command results. Infrastructure owns secret delivery, while U3 owns the lifecycle decisions that use protected references.

## Entity summary

| Entity | Owned meaning |
| --- | --- |
| Account | Stable human identity and security revision, without retailer authority |
| LocalCredential | Protected local verifier, reset revision, and lockout state |
| ExternalIdentityLink | Explicit unique binding by external issuer and subject |
| LinkingTransaction | Ten-minute, one-time, reauthentication-bound linking proof |
| AuthorizationSession | U3 grant/session revocation state, distinct from the BFF cookie |
| RefreshTokenFamily | One-time rotating refresh lineage bounded by its session |
| RefreshTokenGeneration | Retained per-generation digest for atomic rotation and consumed-token replay detection |
| CryptographicKeyVersion | Versioned signing or session-protection key lifecycle |
| MachineClient | Allowed workload identity, audiences, and scopes |
| MachineCredentialVersion | Rotatable protected workload credential |
| IdentityAuditRecord | Immutable identity decision evidence, including retailerless denials, with safe metadata |
| IdentityOutboxMessage | One atomic durable publication per security-relevant identity decision |
| PlatformOperatorGrant | Revocable human platform grant, independent of retailer roles |
| IdentityRecoveryParticipantState | Durable retailer/run/generation fence and checkpoint for U3's C24 participant |
| GlobalIdentityRecoveryFence | Shared write/key-rotation guard across active U3 recovery runs |
| IdentityRecoveryCommandResult | Exact durable idempotent result for each C24 command |

Retailer membership, role, placement generation, and the current retailer selection are deliberately absent. U3 supplies an authenticated account or workload identity; U4 and each authoritative business provider make current retailer authorization decisions.
