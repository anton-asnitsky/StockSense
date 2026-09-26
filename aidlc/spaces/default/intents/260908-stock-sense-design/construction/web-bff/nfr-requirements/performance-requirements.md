# Web BFF Performance Requirements

Unit: U11 Web BFF (`web-bff`)

## Scope

These targets cover warmed U11 processing in the local Docker Desktop Kubernetes
profile. Provider execution, browser rendering, cluster startup, model
generation, and download time are measured separately. U11 must expose its own
overhead so a fast aggregate cannot hide slow authorization, Redis, or response
construction.

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR1.1 | Under five concurrent users, session, retailer-context, proxy-read, and operation-status requests shall add less than 150 ms p95 of BFF-owned processing after warm-up. | Run each representative mix for at least five minutes and 500 measured requests. Publish p50/p95/p99, errors, hardware, revision, request mix, and separate BFF, authorization, Redis, provider, and response-building durations. | Mark the operation failed or limited; do not subtract omitted work or combine provider time with BFF time to claim a pass. |
| NFR1.2 | A complete dashboard shall finish below one second p95 when every provider meets its allocated parallel budget. Typed partial and unavailable responses remain subject to the same BFF-owned 150 ms p95 overhead target. | Exercise complete, one-section stale, one-section unavailable, forbidden optional section, and required-inventory-unavailable cases with five concurrent users and the seeded dataset. Verify HTTP `200` complete/partial aggregation and the required-core failure path. | Return the declared typed degraded state within the request deadline; never wait indefinitely or present omitted data as complete. |
| NFR1.3 | Mutation and long-job admission responses shall finish below 500 ms p95 excluding provider-owned long-running work. U11 shall not wait for an admitted import, review, forecast, purchase workflow, or assistant turn to complete. | Measure accepted, rejected, replayed, conflict, throttled, and uncertain-admission cases for at least five minutes and 500 requests across the representative command mix. | Return the authoritative rejection, stable uncertainty result, or same-origin operation location; never infer success or submit a replacement command. |
| NFR1.4 | Generated provider clients shall use a one-second connection deadline, a three-second total deadline for interactive reads, and a five-second total deadline for commands/admission. A safe read may receive one retry with 100-250 ms jitter only inside the original deadline; mutations receive no automatic retry. | Fault tests inject connect delay, slow body, timeout before headers, reset after bytes, and malformed/oversized responses. Evidence proves elapsed time stays bounded and the retry classifier matches the generated contract. | Cancel the downstream call and return a stable timeout, unavailable, partial, or uncertain outcome; never extend the browser deadline silently. |
| NFR1.5 | Ordinary authorized inventory and purchasing reads through U11 shall complete end to end below one second p95 under five concurrent local users. The clock starts when U11 accepts the authenticated HTTP request and ends after current session, membership/role, retailer placement, provider authorization, provider execution, contract validation, and browser-safe response construction; it includes BFF and provider time, while browser rendering remains separately measured. The three-second NFR1.4 deadline is only a failure bound and does not satisfy this acceptance objective. | After 50 warm-up calls, run at least 500 inventory reads and 500 purchasing reads over a fixed representative mix including cache hit/miss, pagination, authorized empty, and ordinary not-found outcomes. Publish end-to-end and separated BFF/authorization/Redis/provider/validation/response p50/p95/p99/max, errors, hardware, revision, contracts, and limits. Either operation class at p95 of one second or higher fails. | Return the provider-owned typed timeout/unavailable result within the three-second failure bound, retain the failed sample in evidence, and never omit authentication/authorization work or substitute cached authority to claim the target. |

## Benchmark controls

- Use release builds, pinned dependencies, generated clients from the accepted
  OpenAPI documents, a warmed Redis instance, current U3/U4 authorization, and
  the deterministic seeded dataset.
- Fix the operation mix, sample count, duration, concurrency, provider delay
  budget, pod requests/limits, and host allocation before running acceptance.
- Record cold start, first connection, Redis restart, key reload, and provider
  recovery separately from steady-state latency.
- Preserve raw output and environment/configuration digests as checksummed,
  revision-bound evidence linked to these IDs.

## Limitations

The targets demonstrate the confirmed five-user portfolio workload on the
documented reviewer profile. They are not a public-service SLA or a claim about
arbitrary provider, network, or browser performance.
