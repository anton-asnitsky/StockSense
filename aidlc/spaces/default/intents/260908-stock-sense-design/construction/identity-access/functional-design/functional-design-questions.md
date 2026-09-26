# StockSense identity-access functional-design questions

Date: 2026-09-11
Stage: Functional Design
Unit: identity-access
Status: Confirmed

These questions resolve OQ7 and the remaining behavior choices for the Identity Access unit. Accepted decisions remain fixed: Duende IdentityServer, OIDC/OAuth, Google as the first external provider, seeded local demo accounts, authorization code with PKCE through the .NET BFF, server-side tokens, secure HttpOnly cookies, a separate identity database, Dapper/Npgsql through owned stored procedures/functions only, Flyway migrations, Vault-sourced secrets, no public signup, no automatic email-based linking, and retailer authorization owned by Tenant Directory rather than Identity Access.

## Interaction mode

How would you like to complete these questions?

- A. Guide me through each question (Recommended)
- B. I will edit this file directly
- C. Answer all questions in chat
- X. Other (please specify)

[Answer]: A. Guide me through each question (Recommended)

## Q1. Explicit Google account linking

What should happen when Google authenticates an identity that has no existing `(issuer, subject)` link?

- A. Deny account access and create nothing. A user must first sign in locally, reauthenticate, choose Link Google, and complete a short-lived Google callback; reject an external identity already linked to another account, and omit self-service unlinking in v1 (Recommended)
- B. Deny direct access, but allow an operator to issue a single-use invitation that links the Google identity after its callback
- C. Create a new local account automatically with no retailer memberships, while still prohibiting email-based membership inheritance
- X. Other (please specify)

[Answer]: A. Deny account access and create nothing. A user must first sign in locally, reauthenticate, choose Link Google, and complete a short-lived Google callback; reject an external identity already linked to another account, and omit self-service unlinking in v1 (Recommended)

## Q2. Browser session and token lifecycle

Which initial session policy should StockSense enforce?

- A. Use a 30-minute idle and 8-hour absolute BFF session, 10-minute access tokens, one-time rotating refresh tokens bounded by the session, session revocation on refresh-token reuse, no Remember me, and all-session revocation after account disable, credential reset, or identity-link changes (Recommended)
- B. Use a 60-minute idle and 12-hour absolute session with 15-minute access tokens and the same rotating-refresh and revocation rules
- C. Use a 30-minute session without refresh tokens and require a complete sign-in whenever the access token expires
- X. Other (please specify)

[Answer]: A. Use a 30-minute idle and 8-hour absolute BFF session, 10-minute access tokens, one-time rotating refresh tokens bounded by the session, session revocation on refresh-token reuse, no Remember me, and all-session revocation after account disable, credential reset, or identity-link changes (Recommended)

## Q3. Signing and data-protection key lifecycle

How should signing and cookie-protection keys rotate and recover?

- A. Rotate versioned signing and data-protection keys every 90 days; retain prior verification/decryption material for every token or session it can still validate plus clock skew; protect persisted key material and backups with Vault-backed encryption; fail closed on missing material and require controlled replacement plus user reauthentication (Recommended)
- B. Rotate every 30 days with a seven-day overlap, accepting that longer-lived sessions must be invalidated during rotation
- C. Rotate only through an explicit operator action while retaining every historical verification key until manually retired
- X. Other (please specify)

[Answer]: A. Rotate versioned signing and data-protection keys every 90 days; retain prior verification/decryption material for every token or session it can still validate plus clock skew; protect persisted key material and backups with Vault-backed encryption; fail closed on missing material and require controlled replacement plus user reauthentication (Recommended)

## Q4. Seeded local identities and credential reset

Which local demo identities and credential policy should the reproducible profile provide?

- A. Seed a planner-only user, a manager-plus-planner user, a multi-retailer planner, and an operator with no retailer membership; generate passwords per environment, reveal them once through protected setup output, provide an operator-controlled reset, disable signup/email reset, and lock an account for 15 minutes after five failures (Recommended)
- B. Seed one planner, one manager, and one operator, with passwords supplied by the reviewer through local environment configuration
- C. Seed only one broad demo administrator and rely on scripted role changes for other scenarios
- X. Other (please specify)

[Answer]: A. Seed a planner-only user, a manager-plus-planner user, a multi-retailer planner, and an operator with no retailer membership; generate passwords per environment, reveal them once through protected setup output, provide an operator-controlled reset, disable signup/email reset, and lock an account for 15 minutes after five failures (Recommended)

## Q5. Post-authentication retailer context

What should happen after successful authentication for zero, one, or multiple current retailer memberships?

- A. Zero memberships shows a no-access/provisioning state; one membership is selected automatically; multiple memberships require explicit selection; a revoked or stale selection is cleared before any business call, and uncertain mutations are never automatically resubmitted (Recommended)
- B. Always require explicit retailer selection, including when only one membership exists
- C. Treat zero memberships as an authentication failure and end the StockSense session
- X. Other (please specify)

[Answer]: A. Zero memberships shows a no-access/provisioning state; one membership is selected automatically; multiple memberships require explicit selection; a revoked or stale selection is cleared before any business call, and uncertain mutations are never automatically resubmitted (Recommended)

## Q6. Google configuration and clean-reviewer behavior

How should optional Google federation coexist with the clean local reviewer path?

- A. Pin one stable local HTTPS issuer, application origin, and callback URI; show Google sign-in only when its client is configured; keep local login fully usable without Google secrets; record a separate owner-run smoke test for the real Google flow (Recommended)
- B. Require every reviewer to register a Google client and validate both login paths during setup
- C. Replace the real Google path in the default profile with a local mock provider and defer external-provider evidence
- X. Other (please specify)

[Answer]: A. Pin the identity issuer to `https://identity.stocksense.localhost`, the application/BFF origin to `https://app.stocksense.localhost`, the Google callback to `https://identity.stocksense.localhost/signin-google`, the BFF OIDC callback to `https://app.stocksense.localhost/signin-oidc`, and the BFF logout callback to `https://app.stocksense.localhost/signout-callback-oidc`. Show Google sign-in only when configured, keep local login usable without Google secrets, and record a separate owner-run smoke test for the real Google flow (Recommended)

## Q7. Linking transaction and clock-skew limits

Which concrete limits should replace the remaining “short-lived” and “clock skew” terms?

- A. Expire the explicit Google-linking transaction, state, and nonce after 10 minutes; allow at most five minutes of validation clock skew; retain old signing keys for at least the 10-minute token lifetime plus skew and old data-protection keys for at least the 8-hour session lifetime plus skew after their last issuance (Recommended)
- B. Use a five-minute linking transaction and two-minute clock skew with retention derived from the same token/session lifetimes
- C. Defer all of these timing values to deployment configuration without a repository default
- X. Other (please specify)

[Answer]: A. Expire the explicit Google-linking transaction, state, and nonce after 10 minutes; allow at most five minutes of validation clock skew; retain old signing keys for at least the 10-minute token lifetime plus skew and old data-protection keys for at least the 8-hour session lifetime plus skew after their last issuance (Recommended)

## Ambiguity Scan

All behavior-bearing terms now have concrete defaults. The identity boundary remains consistent with the accepted architecture: Identity Access authenticates people and machine clients, while Tenant Directory remains authoritative for retailer memberships and roles. The local reviewer path has no dependency on Google credentials, and the separate owner-run Google smoke test does not block reproducible local validation. Token, session, linking, key-retention, account-lockout, and retailer-selection behavior are specified without unresolved timing or ownership ambiguity.

## Consolidated Summary

The Identity Access unit will implement Duende IdentityServer as the OIDC/OAuth authority and support seeded local identities plus optional Google federation. Unknown Google identities receive no account or access. Linking requires an authenticated local user to reauthenticate, initiate an explicit link, and finish a state- and nonce-bound Google callback within 10 minutes. External identities cannot be linked to multiple accounts, and v1 has no self-service unlinking or public signup.

The .NET BFF will use authorization code with PKCE, store tokens server-side, and issue a secure HttpOnly browser cookie with CSRF protection. Browser sessions have a 30-minute idle limit and an 8-hour absolute limit. Access tokens last 10 minutes. Refresh tokens rotate once per use, remain bounded by the browser session, and reuse revokes the session. StockSense offers no Remember me option. Disabling an account, resetting credentials, or changing an identity link revokes all sessions.

Signing and data-protection keys rotate every 90 days and are persisted using Vault-backed protection. Validation allows at most five minutes of clock skew. Old signing keys remain available for at least the access-token lifetime plus skew after their last issuance, and old data-protection keys remain available for at least the browser-session lifetime plus skew. Missing required key material fails closed and requires controlled replacement followed by user reauthentication.

The reproducible profile seeds four identities: a planner, a manager who is also a planner, a planner with multiple retailer memberships, and an operator with no retailer membership. Passwords are generated per environment, revealed once through protected setup output, and reset only through an operator-controlled flow. Five failed sign-in attempts lock the account for 15 minutes. Signup and email-based password reset remain disabled.

After authentication, Tenant Directory determines retailer access. Zero memberships shows a no-access/provisioning state, one membership is selected automatically, and multiple memberships require explicit selection. A stale or revoked selection is cleared before business calls. A mutation whose outcome is uncertain is never resubmitted automatically.

The fixed local endpoints are `https://identity.stocksense.localhost` for the issuer and `https://app.stocksense.localhost` for the application/BFF. The callbacks are `/signin-google` on the identity origin and `/signin-oidc` plus `/signout-callback-oidc` on the application origin. Google sign-in appears only when configured; local sign-in remains fully usable without Google secrets. A real Google federation smoke test is recorded separately as owner-run evidence.

## Reconciliation with approved Contract Design (2026-09-25)

The Q1-Q7 identity, session, key, Google-linking, and reviewer-path choices above remain unchanged. The approved C01/C02/C15/C17/C18/C22/C23/C24 contract and the existing Identity Access review require these additions to U3's Functional Design:

- **Audit publication:** U3 commits every security-relevant identity audit record and exactly one outbox row atomically, including redacted pre-login denials with no retailer context. Such outcomes use the closed retailerless C01 envelope and distinct C15 global route; tenant identity events use real retailer and placement data. U3 owns its C23-conformant bootstrap publisher adapter, passes every applicable C22 fixture, and gives U13 separate evidence. U14 does not become a U3 publisher dependency.
- **Platform access:** U3 owns a revocable human platform-Operator grant and a current-grant operation in C02, distinct from retailer Operator membership. U10 calls that operation for each C17 global identity-audit page; U11/U12 own the separate no-store C18 platform view. U3 denies machine callers and unauthorized grant readers and fails closed when current-grant checks cannot be completed.
- **Recovery participant:** U3 implements its own C24 synchronous `prepare`, `close`, `abort`, and `resume` lifecycle. It persists run/fence and idempotency results before acknowledging, fences identity writes and key rotation during recovery, rejects stale retailer/placement/recovery generations, suppresses a delayed prepare after abort, and resumes only after local reconciliation. A `200` participant result does not assert coordinator-wide success; persistence failure returns the approved typed `503` without inventing a durable result.
- **Coverage:** The design must account for the eight previously omitted assigned criteria: AC1.4.6, AC1.5.4, AC8.2.4, AC9.11.1–AC9.11.4, and AC10.1.5. It will distinguish U3's contribution from shared U1, U10, U13, and U15 acceptance responsibilities.

These are applications of already approved contracts, not new identity policy choices. The old Functional Design review appendix is historical; its R-02, R-05, and R-06 findings must be resolved in the revised artifacts before completion.

## Historical Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct

## Review Reconciliation (2026-09-25)

The approved Q1-Q7 decisions and contract reconciliation above remain unchanged. The Identity Access Functional Design revision will also close the two findings from its previous architecture review:

- R-07: Link BR5.4, the current platform-Operator grant rule, to its C02/C17/C18 contract evidence in the reverse traceability map, without attributing another unit's acceptance criteria to U3.
- R-08: Give absent, disabled, locked, and invalid local credentials the same browser-visible denial class. Keep lockout timing and the reason available only to protected operator/audit paths; align FD1, BR1.2, and the boundary response table. This prevents account-state disclosure while preserving the approved five-failure, 15-minute lockout.

## Consolidated Summary Confirmation

Does this revised Identity Access summary look correct before I update its Functional Design artifacts and request a fresh review?

- Looks correct
- Request changes

[Answer]: Looks correct
