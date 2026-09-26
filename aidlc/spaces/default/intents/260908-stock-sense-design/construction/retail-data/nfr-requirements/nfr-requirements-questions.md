# StockSense Retail Data NFR Requirements Questions

Date: 2026-09-18
Stage: NFR Requirements
Unit: retail-data
Status: In progress

The approved baseline is a modular .NET deployment containing separate Retail
Data and Planning/Purchasing modules, PostgreSQL authority, Dapper/Npgsql through
owned stored procedures/functions only, Flyway, strict tenant and placement
generation enforcement, transactional outbox/inbox, Redis as a disposable
cache, immutable movement and demand history, bounded atomic imports, versioned
snapshots, and controlled tenant extraction. These questions quantify the
remaining NFR targets.

## Interaction mode

Continue with the established guided-question workflow.

- A. Guide me through each question (Recommended)
- B. I will edit this file directly
- C. Answer all questions in chat
- X. Other (please specify)

[Answer]: A. Guide me through each question (Recommended)

## Q1. Interactive read performance and pagination

Which target should Retail Data meet inside the inception requirement of p95
below one second with five concurrent local users?

- A. After warm-up, require p95 below 400 ms for inventory positions, product lookup, retailer context, and current snapshot metadata; p95 below 800 ms for bounded movement/demand history pages; use cursor pagination with 100 default and 500 maximum rows; run each read mix for at least five minutes and 500 requests while reporting cache-hit and PostgreSQL-fallback results separately (Recommended)
- B. Use one p95-below-one-second target for every read and allow up to 1,000 rows per page
- C. Retain only the inception aggregate target and choose operation budgets during implementation
- X. Other (please specify)

[Answer]: A. After warm-up, require p95 below 400 ms for inventory positions, product lookup, retailer context, and current snapshot metadata; p95 below 800 ms for bounded movement/demand history pages; use cursor pagination with 100 default and 500 maximum rows; run each read mix for at least five minutes and 500 requests while reporting cache-hit and PostgreSQL-fallback results separately (Recommended)

## Q2. Import completion and concurrency

What completion targets should apply to the approved maximum atomic files?

- A. On the clean local CPU profile, complete a 1,000-row/2 MiB inventory import within 30 seconds and a 100,000-row/25 MiB demand import within three minutes; admit the upload/job within 500 ms; serialize one active import per retailer and at most one maximum-size demand import cluster-wide; publish validation, commit, and queue time separately (Recommended)
- B. Target one minute for inventory and ten minutes for demand, allowing two maximum-size demand imports concurrently
- C. Measure imports without pass/fail completion targets or concurrency limits
- X. Other (please specify)

[Answer]: A. On the clean local CPU profile, complete a 1,000-row/2 MiB inventory import within 30 seconds and a 100,000-row/25 MiB demand import within three minutes; admit the upload/job within 500 ms; serialize one active import per retailer and at most one maximum-size demand import cluster-wide; publish validation, commit, and queue time separately (Recommended)

## Q3. Co-deployed service resource envelope

Which initial Kubernetes budget should the shared Retail Data and
Planning/Purchasing deployment use within the 13 GiB/2.5 CPU application quota?

- A. Start with a 512 MiB/0.20 CPU request and a 1.5 GiB/0.75 CPU limit for the application pod, exclude PostgreSQL/RabbitMQ/Redis from that pod budget, bound import buffers to streaming/chunked validation, and require whole-stack measurement before changing the values (Recommended)
- B. Start with a 1 GiB/0.50 CPU request and a 2 GiB/1 CPU limit to reduce throttling risk
- C. Set only per-container limits during implementation without a unit-level budget
- X. Other (please specify)

[Answer]: A. Start with a 512 MiB/0.20 CPU request and a 1.5 GiB/0.75 CPU limit for the application pod, exclude PostgreSQL/RabbitMQ/Redis from that pod budget, bound import buffers to streaming/chunked validation, and require whole-stack measurement before changing the values (Recommended)

## Q4. Redis outage and fallback protection

How should the unit bound authoritative fallback when Redis is unavailable?

- A. Continue PostgreSQL reads with request coalescing, allow at most 20 concurrent fallback queries per pod and a queue of 100 waiting requests, give each fallback a 750 ms database budget inside the one-second user target, reject overflow with explicit `503` plus retry guidance, and alert after 30 seconds of continuous Redis unavailability (Recommended)
- B. Permit unbounded PostgreSQL fallback and rely on its connection pool
- C. Return `503` for every cache-eligible read whenever Redis is unavailable
- X. Other (please specify)

[Answer]: A. Continue PostgreSQL reads with request coalescing, allow at most 20 concurrent fallback queries per pod and a queue of 100 waiting requests, give each fallback a 750 ms database budget inside the one-second user target, reject overflow with explicit `503` plus retry guidance, and alert after 30 seconds of continuous Redis unavailability (Recommended)

## Q5. Messaging, dead-letter, and replay bounds

Which local RabbitMQ operating profile should Retail Data require?

- A. Use five delivery attempts with exponential backoff from one to 30 seconds, a seven-day DLQ retention, replay batches of at most 100 messages with one active replay per queue, an outbox-lag alert at 30 seconds, and a backlog alert at 1,000 ready messages; preserve original message identity and audit every replay (Recommended)
- B. Use ten attempts, 24-hour DLQ retention, and replay up to 1,000 messages at once
- C. Configure retries and replay limits per deployment without project acceptance values
- X. Other (please specify)

[Answer]: A. Use five delivery attempts with exponential backoff from one to 30 seconds, a seven-day DLQ retention, replay batches of at most 100 messages with one active replay per queue, an outbox-lag alert at 30 seconds, and a backlog alert at 1,000 ready messages; preserve original message identity and audit every replay (Recommended)

## Q6. Tenant extraction objective

What measurable target should the shared-to-dedicated database migration meet
for one seeded retailer?

- A. Complete drain, consistent copy, validation, cutover, and cache/routing invalidation within 15 minutes, with mutation rejection lasting no more than five minutes; prove zero lost/duplicated authoritative records or pending outbox messages and reject every stale placement generation (Recommended)
- B. Complete within 30 minutes with up to 15 minutes of rejected mutations
- C. Demonstrate correctness without a completion or mutation-drain target
- X. Other (please specify)

[Answer]: A. Complete drain, consistent copy, validation, cutover, and cache/routing invalidation within 15 minutes, with mutation rejection lasting no more than five minutes; prove zero lost/duplicated authoritative records or pending outbox messages and reject every stale placement generation (Recommended)

## Q7. Retail Data recovery objective

How should the platform RPO 24 hours/RTO two hours be specialized for this unit?

- A. Restore one seeded retailer plus the shared placement directory into a clean target within two hours from a backup no older than 24 hours; reconcile ledger-to-position conservation, demand/version uniqueness, source and snapshot digests, idempotency state, audit links, and outbox/inbox state before exposure; rebuild Redis and downstream projections (Recommended)
- B. Restore only authoritative tables within two hours and validate caches/projections later
- C. Inherit the platform objective without unit-specific reconciliation checks
- X. Other (please specify)

[Answer]: A. Restore one seeded retailer plus the shared placement directory into a clean target within two hours from a backup no older than 24 hours; reconcile ledger-to-position conservation, demand/version uniqueness, source and snapshot digests, idempotency state, audit links, and outbox/inbox state before exposure; rebuild Redis and downstream projections (Recommended)

## Q8. Business-history and source retention

Which default retention policy should the portfolio profile demonstrate?

- A. Keep accepted movement, demand, membership, placement, import-lineage, idempotency, and snapshot-manifest records for the life of the seeded portfolio dataset; retain raw import objects online for 90 days and in encrypted archive for one year; retain business audit for 90 days and operational logs for seven days; expire backups on an explicit 30-day schedule and prove expired data cannot reappear (Recommended)
- B. Retain every authoritative record and raw source indefinitely for the portfolio
- C. Retain raw sources and import lineage for 30 days and all other business records for one year
- X. Other (please specify)

[Answer]: A. Keep accepted movement, demand, membership, placement, import-lineage, idempotency, and snapshot-manifest records for the life of the seeded portfolio dataset; retain raw import objects online for 90 days and in encrypted archive for one year; retain business audit for 90 days and operational logs for seven days; expire backups on an explicit 30-day schedule and prove expired data cannot reappear (Recommended)

## Q9. Mutation, snapshot, and import-queue budgets

Which final limits should close the remaining performance and backpressure gap?

- A. Require p95 below 750 ms for ordinary membership, settings, stock-adjustment, and receipt commands of up to ten lines under five concurrent users; generate one retailer's 100-product/18-month snapshot within 60 seconds; allow one queued import per retailer and three queued imports cluster-wide, reject overflow with sanitized `429`, and fail a job that cannot start within ten minutes with an explicit retryable outcome (Recommended)
- B. Use a one-second mutation target, a three-minute snapshot target, and queue up to ten imports cluster-wide for 30 minutes
- C. Measure these operations without pass/fail or queue-admission limits
- X. Other (please specify)

[Answer]: A. Require p95 below 750 ms for ordinary membership, settings, stock-adjustment, and receipt commands of up to ten lines under five concurrent users; generate one retailer's 100-product/18-month snapshot within 60 seconds; allow one queued import per retailer and three queued imports cluster-wide, reject overflow with sanitized `429`, and fail a job that cannot start within ten minutes with an explicit retryable outcome (Recommended)

## Ambiguity Scan

The selected targets form a coherent local operating profile. Interactive reads
remain inside the inception p95-below-one-second requirement, with separate
budgets for common and history operations. Ordinary mutations have their own
750-millisecond p95 target. Maximum imports are long-running jobs with fixed
completion targets, one active maximum demand import, bounded pending queues,
and a ten-minute admission deadline. Snapshot generation is measured separately
from paged serving.

The 1.5 GiB/0.75 CPU application limit fits inside the approved aggregate
application quota while leaving database, broker, cache, identity, telemetry,
and AI workloads as separate measured consumers. Streaming/chunked validation,
per-retailer serialization, cluster-wide heavy-job serialization, cache-fallback
concurrency, and bounded import queues prevent one workload from consuming the
entire local cluster.

Redis remains disposable and authoritative fallback is explicitly protected.
RabbitMQ retry, DLQ, backlog, lag, and replay limits are numeric. Tenant
extraction and clean-target recovery have duration, data-integrity, stale-route,
and mutation-drain criteria. Retention distinguishes business history, raw
source objects, business audit, operational logs, archives, and backups, and
requires expiry to survive restore/rebuild. No vague performance, scalability,
reliability, security, observability, retention, or recovery target remains for
this unit.

## Consolidated Summary

- **Interactive reads:** After warm-up, inventory positions, product lookup,
  retailer context, and current snapshot metadata must achieve p95 below 400 ms.
  Bounded movement/demand pages must achieve p95 below 800 ms. Cursor pages use
  100 rows by default and 500 maximum. Run each mix for at least five minutes
  and 500 requests with five concurrent users, reporting cache and PostgreSQL
  fallback separately.
- **Mutations and snapshots:** Ordinary membership, settings, stock-adjustment,
  and receipt commands up to ten lines must achieve p95 below 750 ms under five
  concurrent users. Generate one seeded retailer's 100-product/18-month snapshot
  within 60 seconds.
- **Imports:** Admit upload/jobs within 500 ms. Complete a maximum 1,000-row/
  2 MiB inventory import within 30 seconds and a maximum 100,000-row/25 MiB
  demand import within three minutes on the clean CPU profile. Report queue,
  validation, and commit time separately. Run one active import per retailer and
  at most one maximum demand import cluster-wide.
- **Import backpressure:** Permit one queued import per retailer and three queued
  imports cluster-wide. Reject overflow with sanitized `429`. A job that cannot
  start within ten minutes fails with an explicit retryable result.
- **Resource envelope:** Start the co-deployed Retail Data and
  Planning/Purchasing application pod at a 512 MiB/0.20 CPU request and a
  1.5 GiB/0.75 CPU limit. PostgreSQL, RabbitMQ, and Redis are separate workloads.
  Stream/chunk import processing and require whole-stack measurements before
  adjusting values.
- **Redis degradation:** Coalesce authoritative fallback reads, permit 20
  concurrent PostgreSQL fallback queries per pod and queue 100, use a 750 ms
  database budget, return explicit `503` with retry guidance on overflow, and
  alert after 30 seconds of continuous Redis unavailability.
- **Messaging:** Attempt delivery five times with exponential backoff from one
  to 30 seconds. Retain dead letters seven days. Replay at most 100 messages per
  batch with one active replay per queue. Alert at 30 seconds of outbox lag or
  1,000 ready messages. Preserve message identity and audit every replay.
- **Tenant extraction:** Move one seeded retailer from shared to dedicated
  storage within 15 minutes, with mutations rejected for no more than five
  minutes. Reconcile every authoritative record and pending outbox message and
  reject all stale placement generations.
- **Recovery:** Restore one retailer and the shared placement directory into a
  clean target within two hours from a backup no older than 24 hours. Before
  exposure, reconcile stock conservation, effective demand versions, source and
  snapshot digests, idempotency, audit links, and outbox/inbox state. Rebuild
  Redis and downstream projections.
- **Retention:** Keep accepted movement, demand, membership, placement, import
  lineage, idempotency, and snapshot manifests for the seeded dataset's life.
  Keep raw imports online for 90 days and encrypted in archive for one year,
  business audit for 90 days, operational logs for seven days, and backups for
  30 days. Prove expired data cannot reappear through restore or rebuild.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct
