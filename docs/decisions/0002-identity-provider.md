# ADR 0002: Use Duende IdentityServer

Date: 2026-09-08
Status: Accepted by the owner: “SoDuende IdentityServer it is”.

## Context and decision

StockSense needs native OIDC/OAuth, external federation, local Kubernetes
deployment and a portfolio that demonstrates .NET engineering. Select Duende
IdentityServer as a dedicated ASP.NET Core service, superseding proposed Keycloak.
Keycloak and Amazon Cognito with LocalStack were considered alternatives.

Use OIDC federation first, one issuer, and a confidential BFF client with
Authorization Code and PKCE. React receives a secure session cookie; tokens stay
server-side. StockSense retains tenant membership and business authorization.

Use custom Dapper/Npgsql stores with stored procedures/functions exclusively.
Flyway manages a separate logical identity database with distinct runtime and
migration roles. No EF Core or direct application table queries are permitted.
Persist signing and data-protection keys and test restart, rotation and restore.

## Consequences

- Login/account integration and custom stores add implementation work; identity
  foundation belongs in the first increment, alongside tenant isolation.
- OIDC federation provider and need for local accounts remain open.
- Personal/development/test use is permitted without a license under the published
  terms. Production Community Edition eligibility and feature entitlements must
  be checked for the actual deployment. Never commit a license key.
- Do not assume SAML, Duende BFF or redistribution rights are included. The BFF
  architecture can use ASP.NET Core middleware independently of the BFF product.
- Selecting this provider does not approve the whole design or provision services.

## References

- [Community Edition](https://duendesoftware.com/products/communityedition)
- [Custom stores](https://docs.duendesoftware.com/identityserver/data/providers/custom/)
- [External providers](https://docs.duendesoftware.com/identityserver/ui/login/external/)
- [Licensing](https://docs.duendesoftware.com/general/licensing/)
