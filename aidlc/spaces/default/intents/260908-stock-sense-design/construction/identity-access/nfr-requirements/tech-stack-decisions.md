# Identity Access Technology Decisions

Unit: U3 Identity Access (`identity-access`)

## Decisions

| Concern | Selection | Rationale and constraints |
| --- | --- | --- |
| Identity provider | Duende IdentityServer Community Edition on ASP.NET Core | Native OIDC/OAuth and federation support while remaining portfolio-runnable. The design shall not depend on paid Automatic Key Management. |
| Browser flow | U11 BFF using authorization code with PKCE | Keeps tokens server-side and browser authority in a secure HttpOnly cookie boundary. U3 registers only `https://app.stocksense.localhost/signin-oidc`. |
| Federation | Google OIDC adapter, optional by configuration | Demonstrates federation without making owner credentials necessary for the clean local reviewer path. Links use verified issuer-subject identity only. |
| Service language | C#/.NET, version pinned during implementation | Matches Duende and the service portfolio while supporting OpenTelemetry, health checks, and Kubernetes deployment. |
| Relational persistence | PostgreSQL with Dapper/Npgsql calling U3-owned stored procedures/functions | Satisfies routine-only access, parameterization, custom Duende persistence, and strict runtime/migration privilege separation. EF Core and application direct SQL are prohibited. |
| Migration | Flyway | Provides ordered, separately privileged schema/routine migrations that block rollout on failure. |
| Password hashing | Argon2id, versioned record format | Starts at 19 MiB/t=2/p=1 with unique salts and optional Vault pepper; the exact maintained .NET package is selected and pinned after known-answer, license, vulnerability, and clean-build checks. |
| Signing keys | Duende static signing and validation APIs with versioned Vault/VSO-delivered certificates | Compatible with the selected edition. U3 metadata and controlled rollout implement pre-publication, activation, overlap, retirement, and emergency rotation. |
| Data protection | Persistent ASP.NET Core Data Protection key ring protected through the platform secret boundary | Keeps BFF/identity protected state decryptable across restart and restore; lifecycle is separate from token-signing keys. |
| Secret delivery | HashiCorp Vault plus Vault Secrets Operator, read-only workload mounts | Keeps secrets outside Git/Terraform state and scopes delivery to U3. Private material and recovery/unseal assets remain protected outside the cluster. |
| Contracts | OpenAPI 3.1 for U3 REST/admin surfaces, AsyncAPI 3.0 for durable identity events, OIDC discovery/JWKS for protocol metadata | Preserves formal versioned boundaries while recognizing that standard OIDC endpoints are governed by protocol conformance. |
| Messaging | RabbitMQ transactional outbox/inbox profile | Provides durable at-least-once identity events, confirms, bounded retry, DLQ, and replay without exactly-once claims. |
| Telemetry | OpenTelemetry .NET SDK and Collector, OpenSearch/Dashboards projection | Produces portable signals and portfolio dashboards while keeping audit authority in PostgreSQL/outbox. |
| Deployment | Helm on Docker Desktop Kubernetes; Terraform/Terragrunt for platform configuration | Uses the approved local cloud-native profile and inherited 13 GiB/2.5 CPU application quota. U3 begins as one replica. |

## Rejected alternatives

- Duende Automatic Key Management is excluded because the selected community
  profile must not depend on a paid feature.
- EF Core and Duende EF stores are excluded by the approved Dapper/routine-only
  persistence decision.
- In-memory users, clients, grants, signing keys, or data-protection keys are
  excluded for restart/recovery evidence.
- Email-based external-account matching and public signup/reset are excluded by
  the approved identity boundary.
- Redis cannot become authoritative for credentials, sessions, permissions,
  lockout, refresh generations, or key lifecycle.

## Implementation parameters to pin

Before the implementation PR is accepted, record exact .NET, Duende, Dapper,
Npgsql, Flyway, Argon2id library, OpenTelemetry, base-image, and contract-tool
versions and checksums. Record certificate algorithm/size and loader interface,
Vault paths/policies, health-probe timings, connection-pool limits, and retained
grant cleanup schedule. These choices may not weaken the approved requirements.
