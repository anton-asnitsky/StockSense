# Web BFF Technology Decisions

Unit: U11 Web BFF (`web-bff`)

## Decisions

| Concern | Selection | Rationale and constraints |
| --- | --- | --- |
| Service framework | ASP.NET Core BFF, version pinned during implementation | Provides same-origin middleware, OIDC, cookie, CSRF, rate limiting, streaming, SSE, health checks, and OpenTelemetry support in the approved .NET service portfolio. |
| Browser identity | Duende IdentityServer authorization code with PKCE through the ASP.NET Core OIDC handler | U11 is the sole browser client; tokens remain server-side and U3 registers only `https://app.stocksense.localhost/signin-oidc`. |
| Session and ephemeral state | Redis with `noeviction`, TLS, bounded records, and atomic/fenced operations | Supports disposable opaque sessions and coordination while making Redis loss an explicit sign-out rather than a domain-data loss event. |
| Operation handles | ASP.NET Core Data Protection `ITimeLimitedDataProtector` with application/purpose isolation and a versioned current/previous key ring delivered from Vault through VSO | Allows 24-hour opaque same-origin reconciliation after Redis loss without storing the only decryption material in Redis. Custom cryptographic primitives are prohibited. |
| Provider integration | OpenAPI 3.1 generated .NET clients from C17 provider documents | Prevents hand-maintained DTO drift and keeps provider business semantics and authorization authoritative. |
| Browser contract | OpenAPI 3.1 C16/C18 with RFC 9457 problems | Defines same-origin session, context, dashboard, upload, command, status, SSE/snapshot, audit, and safe-error shapes for generated React clients. |
| Resilience | .NET HTTP resilience pipelines using maintained Microsoft/Polly components | Implements per-provider/operation/contract-version deadlines, one safe-read retry, bulkheads, circuits, and no automatic mutation retry. |
| Admission and abuse control | ASP.NET Core rate limiting plus explicit bounded semaphores/queues | Enforces separate ordinary request, login, mutation, upload, and SSE limits with safe `429`/`503` behavior. |
| Streaming | ASP.NET Core request streaming and server-sent events | Avoids durable or whole-body BFF storage and supports bounded assistant event resume/snapshot behavior. |
| Secrets and keys | HashiCorp Vault with Vault Secrets Operator and workload-scoped read-only delivery | Keeps credentials and handle/data-protection keys outside Git and Terraform state and enables tested rotation/reload. |
| Telemetry | OpenTelemetry .NET SDK and Collector with OpenSearch/Dashboards | Produces portable bounded signals and portfolio dashboards while provider audit remains authoritative. |
| Deployment | Helm on Docker Desktop Kubernetes; Terraform/Terragrunt for platform configuration | Matches the approved local cloud-native profile and shared 13 GiB/2.5 CPU application quota. U11 starts as one replica. |
| Persistence | No U11 PostgreSQL schema, MongoDB collection, Qdrant collection, object store, or RabbitMQ endpoint | U11 retains only disposable Redis/session/cache state and provider-issued opaque references; domain data and durable operations remain in owning services. |

## Rejected alternatives

- Browser-held access or refresh tokens, local storage, and direct browser calls
  to domain services are excluded by the approved BFF boundary.
- In-process sessions or caches are excluded as authority because restart or a
  second replica would diverge.
- Raw provider URLs/identifiers and Redis-only command reconciliation are
  excluded because they fail tenant hiding or recovery after Redis loss.
- Whole-body upload buffering and durable BFF upload storage are excluded by
  the streaming and ownership rules.
- A shared global provider circuit and automatic mutation retries are excluded
  because they cause cross-capability failure and duplicate work.
- Application-level HTTP `206` for dashboard degradation is superseded by HTTP
  `200` with typed complete/partial aggregate and per-section state.

## Implementation parameters to pin

Before the implementation PR is accepted, record exact .NET/runtime, OIDC,
Redis client, OpenAPI generator, resilience/rate-limiting, data-protection,
OpenTelemetry, base-image, and contract-tool versions and checksums. Record the
protected key format and rotation procedure, Redis commands/scripts and timeout,
connection-pool limits, queue implementation, ingress/body limits, collector
buffering, and generated-client compatibility policy. These selections may not
weaken the approved requirements.
