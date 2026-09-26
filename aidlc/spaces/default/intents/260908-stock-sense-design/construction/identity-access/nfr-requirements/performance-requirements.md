# Identity Access Performance Requirements

Unit: U3 Identity Access (`identity-access`)

## Scope

These targets cover U3 processing in the warmed local Docker Desktop Kubernetes
profile. Google network time, browser rendering, cluster startup, migration, and
backup/restore time are reported separately. U3 proves identity and issues
bounded tokens; U4 authorization checks and U11 browser-session work keep their
own budgets.

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR1.1 | After warm-up, U3 shall achieve p95 below 250 ms for discovery/JWKS, refresh, logout, and machine-token issuance under the approved local profile. | Run each operation for at least five minutes and 500 measured requests after warm-up, with five concurrent human clients where applicable and a 20-request machine-token burst. Publish p50/p95/p99, errors, hardware, pod resources, revision, and request mix. | Mark the operation failed or limited; do not average external Google time into a passing local result. |
| NFR1.2 | Local password sign-in, including Argon2id verification and U3 persistence, shall achieve p95 below 1.5 seconds with five concurrent human flows. | Execute at least 100 valid and invalid attempts using isolated test identities without triggering unintended lockouts. Report hash parameters, success/failure mix, latency percentiles, resource peaks, and lockout exclusions. | Fail the profile if the target or security baseline is missed; do not reduce Argon2id below the approved minimum to make the test pass. |
| NFR1.3 | Capacity and abuse controls shall coexist: interactive authentication permits a burst of five and replenishes ten requests per minute per source boundary; machine-token issuance permits a burst of 20 and replenishes 60 per minute per client. | Boundary tests prove admitted requests meet latency targets, excess requests receive sanitized `429` results, one client's limit does not consume another's allowance, and bounded metrics record denials. | Reject excess work before password verification or token creation where safe; never issue partial credentials or reveal account existence. |

## Benchmark controls

- Use a clean release build, pinned runtime and dependencies, representative
  PostgreSQL routines, lifecycle-valid signing keys, and the seeded profile.
- Record warm-up, sample count, duration, concurrency, CPU/memory requests and
  limits, Docker Desktop allocation, and sustained/peak use.
- Separate cold start, key reload, first database connection, Google redirect,
  and restore measurements from steady-state endpoint results.
- Preserve raw benchmark output as checksummed evidence linked to the source
  revision and these requirement IDs.

## Limitations

The targets demonstrate the confirmed five-user portfolio workload. They are
not a public-service capacity claim or availability SLA. Hardware contention
from ML, OpenSearch, or other cluster work must be disclosed in the evidence.
