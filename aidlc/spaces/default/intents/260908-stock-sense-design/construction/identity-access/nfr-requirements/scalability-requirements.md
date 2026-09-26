# Identity Access Scalability Requirements

Unit: U3 Identity Access (`identity-access`)

## Scope

The first release runs one U3 replica on a single Docker Desktop Kubernetes
node. Scalability means bounded behavior inside the shared 13 GiB/2.5 CPU
application quota and a documented path to multiple replicas; it does not imply
production high availability.

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR2.1 | The initial U3 workload shall start with a 256 MiB memory/0.10 CPU request and a 768 MiB memory/0.50 CPU limit, including five concurrent Argon2id verifications, without causing the complete demonstrated stack to exceed the approved application or host envelope. | Measure pod and node sustained/peak CPU, working set, throttling, restarts, and Argon2 allocation during NFR1 tests and one complete demo. Any adjusted values must remain inside the 13 GiB/2.5 CPU application quota and be recorded before acceptance. | Report the profile as failed or limited; serialize noninteractive work or retune allocations without weakening security or silently increasing the host budget. |
| NFR2.2 | All mutable U3 state shall reside in shared PostgreSQL records or protected shared key/data-protection stores so a future replica can join without local authoritative state. Rate-limit counters may be local only in the one-replica profile and must move to a shared bounded store before scaling out. | Architecture and restart tests prove the pod filesystem contains no authoritative accounts, grants, credentials, links, sessions, keys, or audit state. A scale-out readiness checklist identifies shared data protection, signing keys, operational grants, and rate-limit coordination. | Refuse multi-replica deployment while any required state or counter can diverge. |
| NFR11.1 | The five-user and 20-request burst profile shall run on the documented clean-reviewer CPU path without owner credentials, GPU use, or pre-existing caches. | A clean checkout provisions the identity profile, obtains protected one-time demo credentials, executes the benchmarks, and records tool/runtime versions and checksums. | Mark reproducibility failed; owner-machine measurements cannot substitute. |

## Capacity triggers

- Revisit replica count or resource allocation when p95 breaches persist for ten
  minutes, CPU throttling exceeds 10% of measured time, memory exceeds 80% of
  the limit, or authentication admission rejects valid expected-profile load.
- Scale-out requires shared rate limiting, common data-protection/signing state,
  deterministic key activation, and a database capacity test before a second
  replica is enabled.
- Argon2 work remains bounded by endpoint admission; unbounded verification
  concurrency is prohibited.

## Limitations

The initial resource values are acceptance baselines to measure, not guarantees
for every host. A measured change is allowed only if the whole-stack quota,
security minimums, and recorded evidence remain satisfied.
