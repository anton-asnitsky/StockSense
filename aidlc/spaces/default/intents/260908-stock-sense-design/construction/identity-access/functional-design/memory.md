<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

2026-09-11T20:01:07Z — Separated U3 authorization sessions and refresh families from the U11 browser cookie. U3 authenticates an account and issues bounded protocol artifacts; U11 owns cookie, CSRF, token storage, and browser-session presentation.

2026-09-11T20:01:07Z — Kept retailer memberships, roles, placement generation, and current retailer authorization in U4 Tenant Directory. Identity tokens carry a stable account or workload reference and cannot convert tenant context into authority.

2026-09-11T20:01:07Z — Interpreted the owner-confirmed Google policy as explicit account linking by immutable external issuer and subject after recent local reauthentication. Matching email and unlinked Google sign-in create no account, membership, or session.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

2026-09-11T20:01:07Z — The framework validity view continues to report advisory drift for earlier stages after the runtime graph was recompiled because authored inputs changed after their original receipts. The AI-DLC skill requires validity advisories to remain detection-only and forbids rerouting the active stage.

2026-09-11T20:01:07Z — A repository-local Mermaid CLI was unavailable, so no new dependency was introduced on the design branch. Mermaid blocks were kept to standard state, sequence, and ER syntax with a text fallback for every diagram; the architecture reviewer inspected the rendered structure.

2026-09-11T20:01:07Z — The advisory architecture reviewer reported three major and one minor finding. Per the single-pass advisory review contract, the reviewed artifacts remain frozen and the findings are carried to the human decision instead of being silently repaired.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

2026-09-11T20:01:07Z — Chose a 30-minute idle and 8-hour absolute human authorization session with 10-minute access tokens and one-time rotating refresh credentials. Reuse revokes the refresh family and session, prioritizing replay containment over seamless recovery.

2026-09-11T20:01:07Z — Chose a 90-day key-rotation schedule with retention derived from the last issuance: 15 minutes for signing verification and 8 hours 5 minutes for session-data decryption. Missing required material fails closed and requires controlled recovery.

2026-09-11T20:01:07Z — Kept Google optional and fixed stable local HTTPS identities so a clean reviewer can complete local sign-in without owner secrets while the owner can record separate real-federation smoke evidence.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

2026-09-11T20:01:07Z — R-01 requires an explicit consumed refresh-token generation or retained-digest model so reuse can be distinguished from an unknown invalid token.

2026-09-11T20:01:07Z — R-02 requires a C15-compatible identity-event profile for retailerless activity, complete actor/idempotency/data mapping, and audit-to-outbox cardinality aligned with denied events.

2026-09-11T20:01:07Z — R-03 requires reconciliation between the confirmed registered BFF callback `/signin-oidc` and C16's browser-facing `/auth/callback` operation.

2026-09-11T20:01:07Z — R-04 requires the exact atomic failure-counter reset behavior when a 15-minute credential lock expires, including concurrent attempts at the boundary.
