# ADR 0005: Google federation and local demo access

Date: 2026-09-08
Status: Accepted by the owner.

## Decision

Use Google as the first external OIDC provider federated through Duende
IdentityServer. Also provide seeded local demo accounts. Initial application
access is local-only; no public deployment or public signup is in scope.

React continues to authenticate through the .NET BFF and Duende. Google is an
upstream identity provider, not a replacement for Duende or StockSense tenant
authorization. Local accounts allow the core demo to run without Google login.

## Implementation and acceptance

- SS-09 configures Google federation and verifies the complete browser flow.
  Google client registration, consent configuration and local redirect URLs must
  be validated during implementation. Inject credentials outside source control.
- Seed local users and explicit retailer memberships reproducibly. Store password
  hashes using supported authentication libraries and the approved custom
  Dapper/stored-routine persistence; use Flyway for the identity schema.
- Generate or inject demo credentials locally; do not commit reusable passwords.
  Disable demo seeding outside the local profile.
- Test both login paths, unauthorized retailer access, membership revocation,
  logout and account-linking behavior. Do not auto-link by matching email.
- Keep local HTTPS and secure BFF sessions. Local-only exposure does not make
  Google authentication offline; that login path requires external connectivity.

This decision does not provision a Google application or enable public access.
