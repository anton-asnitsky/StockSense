# Web BFF Scalability Requirements

Unit: U11 Web BFF (`web-bff`)

## Scope

The initial deployment uses one U11 replica. Scalability means bounded behavior
inside the shared 13 GiB/2.5 CPU application quota and a safe path to multiple
replicas using shared Redis and shared protected key material; it does not claim
production high availability.

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR2.1 | One BFF replica shall request 256 MiB memory/0.10 CPU and be limited to 512 MiB memory/0.25 CPU. U11 plus its separately budgeted Redis use shall not cause the complete demonstrated stack to exceed 13 GiB/2.5 CPU. | Measure pod and node sustained/peak CPU, working set, throttling, garbage collection, restarts, and Kubernetes overhead during the NFR1 profile and a complete demo. | Report the profile as failed or limited; retune only with measured whole-stack evidence and without silently increasing the host budget. |
| NFR2.2 | U11 shall allow at most ten ordinary in-flight requests per session, 100 ordinary in-flight requests cluster-wide, and 100 queued ordinary requests for at most 500 ms. Upload and SSE reservations are separate. | Boundary and burst tests prove per-session and cluster isolation, queue expiry, fair admission, and safe `429` or `503` overflow without starving health/readiness traffic. | Reject overflow before expensive work or provider admission and emit a bounded saturation signal. |
| NFR2.3 | BFF-owned Redis data shall be limited to 256 MiB and 1,000 active sessions, with maxima of 32 KiB per session, 8 KiB per login transaction, and 4 KiB per command binding. Redis uses `noeviction`, warns at 80%, and rejects new login/session work at 90%. The metadata cache is limited to 10,000 entries/128 MiB, with 30-second positive and five-second unavailable lifetimes. | Fill, expiry, concurrent-login, cache-churn, and restart tests prove hard record bounds, no eviction of live authority state, admission closure at 90%, bounded cache cardinality, and deterministic recovery after cache loss. | Reject new login/session work or bypass disposable metadata cache safely; never evict or fabricate an active session to admit more work. |
| NFR2.4 | Ordinary JSON responses shall be capped at 1 MiB and assistant snapshots at 2 MiB. U11 shall allow at most two concurrent uploads cluster-wide and one per session with at most 256 KiB BFF buffering per upload; SSE shall allow one stream per conversation, two per session, and 20 cluster-wide. | Size, slow-client, disconnect, concurrency, and memory-pressure tests exercise boundary-minus-one, exact-boundary, and boundary-plus-one cases while tracking working set and ordinary-request latency. | Return `413`, `429`, `503`, a bounded snapshot requirement, or a stable typed problem before unbounded allocation; close excess streams without cancelling provider-owned work. |
| NFR11.1 | The five-user, upload, SSE, cache, and Redis-capacity profile shall run from a clean checkout on the documented CPU-only reviewer path without owner credentials, cached models, or the owner's GPU. | The clean-room run provisions U11 and dependencies, executes the profile, and records versions, checksums, resource measurements, and any host-specific limitation. | Mark reproducibility failed; owner-machine state or an unrecorded resource increase cannot substitute. |

## Capacity triggers

- Investigate sustained p95 failure, CPU throttling above 10% of measured time,
  memory above 80% of the pod limit, Redis above 80%, queue saturation, or
  expected-profile admission denials.
- A second replica requires shared session state, shared handle/data-protection
  keys, cluster-wide rate and concurrency coordination, and a repeat of all
  capacity and refresh-fencing tests.
- Long-lived upload and SSE reservations must remain visible and may not consume
  the complete ordinary-request pool.

## Limitations

The bounds are acceptance baselines for the local portfolio environment. Any
change must be measured, documented, and remain within the approved whole-stack
quota.
