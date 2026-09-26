# StockSense Forecasting NFR Requirements Questions

Date: 2026-09-19
Stage: NFR Requirements
Unit: forecasting
Status: In progress

Approved behavior includes one idempotent daily request per retailer-local date,
immutable pinned Retail Data and Model Lifecycle inputs, one 28-day series per
active store/product, explicit complete/partial/failed outcomes, Operator-only
partial publication, freshness through the next 02:00 due time plus six hours,
no silent model substitution, routine-only PostgreSQL access, durable RabbitMQ
work, disposable Redis reads, and fail-closed restore reconciliation. These
questions set the remaining measurable limits without changing those choices.

## Interaction mode

- A. Guide me through each question (Recommended)
- B. I will edit this file directly
- C. Answer all questions in chat
- X. Other (please specify)

[Answer]: A. Guide me through each question (Recommended)

## Q1. CPU forecasting and read performance

What performance profile should one seeded retailer with 100 products meet on
the clean-reviewer CPU path?

- A. Admit scheduled or Operator rerun commands within 500 ms; return authorized status/current-series reads at p95 below 500 ms with five concurrent local callers; cold-load and validate the pinned model artifact within 30 seconds; and execute, validate, and atomically finalize all 100 product series within two minutes after dequeue, measuring queue, input resolution, artifact load, inference, validation, and commit time separately (Recommended)
- B. Require reads below one second and allow ten minutes for one retailer forecast run
- C. Record durations without pass/fail targets
- X. Other (please specify)

[Answer]: A. Admit scheduled or Operator rerun commands within 500 ms; return authorized status/current-series reads at p95 below 500 ms with five concurrent local callers; cold-load and validate the pinned model artifact within 30 seconds; and execute, validate, and atomically finalize all 100 product series within two minutes after dequeue, measuring queue, input resolution, artifact load, inference, validation, and commit time separately (Recommended)

## Q2. Decimal precision and response bounds

Which deterministic numeric and response profile should Forecasting expose?

- A. Quantize each finite nonnegative expected-demand result exactly once at publication to decimal scale four using round-half-to-even, reject values above 1,000,000 units per product/day, serialize fixed decimal strings, cap Planning/current-series requests at 100 products and assistant evidence requests at 20 products, cap one response at 1 MiB, and require explicit pagination or batching beyond those limits (Recommended)
- B. Store binary floating-point values as produced and allow up to 500 products in one response
- C. Leave precision, magnitude, and response limits to each consumer
- X. Other (please specify)

[Answer]: A. Quantize each finite nonnegative expected-demand result exactly once at publication to decimal scale four using round-half-to-even, reject values above 1,000,000 units per product/day, serialize fixed decimal strings, cap Planning/current-series requests at 100 products and assistant evidence requests at 20 products, cap one response at 1 MiB, and require explicit pagination or batching beyond those limits (Recommended)

## Q3. Kubernetes resources and forecast queue capacity

Which initial capacity profile should Forecasting use inside the shared 16 GiB
RAM and three-CPU local cluster envelope?

- A. Forecasting API request 256 MiB/0.10 CPU and limit 512 MiB/0.25 CPU; worker request 512 MiB/0.25 CPU and limit 2 GiB/1 CPU with at most 1 GiB ephemeral job storage; permit one active Forecast Run cluster-wide through the same heavy-compute admission lease used by Model Lifecycle, order scheduled work by due time before later Operator reruns, queue at most three runs per retailer and ten cluster-wide, and fail work that cannot start within 15 minutes with a retryable capacity outcome (Recommended)
- B. Give each retailer a 2 GiB/1 CPU worker concurrently and allow 25 queued runs without coordinating with Model Lifecycle
- C. Leave resource requests, limits, concurrency, and queue bounds to deployment-time configuration
- X. Other (please specify)

[Answer]: A. Forecasting API request 256 MiB/0.10 CPU and limit 512 MiB/0.25 CPU; worker request 512 MiB/0.25 CPU and limit 2 GiB/1 CPU with at most 1 GiB ephemeral job storage; permit one active Forecast Run cluster-wide through the same heavy-compute admission lease used by Model Lifecycle, order scheduled work by due time before later Operator reruns, queue at most three runs per retailer and ten cluster-wide, and fail work that cannot start within 15 minutes with a retryable capacity outcome (Recommended)

## Q4. Queue expiry, lease, retry, and dead-letter policy

How should transient execution failures recover without creating another daily
request or run revision?

- A. Use a 60-second execution lease renewed every 15 seconds and fence the worker after four missed heartbeats; allow at most three attempts per logical run with exponential backoff from 30 seconds to five minutes plus jitter; count a 15-minute queue-start expiry as a transient failed attempt and requeue the same run and pinned snapshot while the attempt budget remains; exact request replay returns that run; make data, schema, checksum, tenant, authorization, incompatible-model, invalid-output, and resource-limit failures terminal; retain dead letters seven days and replay at most 20 runs per controlled Operator batch (Recommended)
- B. Use a five-minute lease, retry every failure ten times, and create a new run revision after each queue timeout
- C. Configure lease, retry, and dead-letter behavior per environment without fixed acceptance values
- X. Other (please specify)

[Answer]: A. Use a 60-second execution lease renewed every 15 seconds and fence the worker after four missed heartbeats; allow at most three attempts per logical run with exponential backoff from 30 seconds to five minutes plus jitter; count a 15-minute queue-start expiry as a transient failed attempt and requeue the same run and pinned snapshot while the attempt budget remains; exact request replay returns that run; make data, schema, checksum, tenant, authorization, incompatible-model, invalid-output, and resource-limit failures terminal; retain dead letters seven days and replay at most 20 runs per controlled Operator batch (Recommended)

## Q5. Redis cache limits and degradation

What cache policy should apply to Forecasting reads?

- A. Cache only authorized status and current-series responses under keys containing retailer, placement generation, route/resource version, product-set digest, and authorization-relevant context; use a maximum 60-second TTL, five-second negative-cache TTL for explicit unavailable results, and request coalescing per exact key; invalidate affected keys only after an authoritative publication, acknowledgement, pointer, compatibility, or retention commit; never serve beyond TTL or after known invalidation; and fall back to the governed PostgreSQL read routine when Redis is cold or unavailable (Recommended)
- B. Cache the latest retailer forecast for 24 hours under retailer ID only and serve stale data during Redis or PostgreSQL failure
- C. Disable caching for the first release
- X. Other (please specify)

[Answer]: A. Cache only authorized status and current-series responses under keys containing retailer, placement generation, route/resource version, product-set digest, and authorization-relevant context; use a maximum 60-second TTL, five-second negative-cache TTL for explicit unavailable results, and request coalescing per exact key; invalidate affected keys only after an authoritative publication, acknowledgement, pointer, compatibility, or retention commit; never serve beyond TTL or after known invalidation; and fall back to the governed PostgreSQL read routine when Redis is cold or unavailable (Recommended)

## Q6. Daily scheduling and publication timeliness

What operational target should distinguish a late forecast from a stale one?

- A. Across a 30-day seeded schedule test, create exactly one logical request for every retailer-local date; admit at least 99% within five minutes of the resolved 02:00 due instant and publish a complete current revision by 02:30 when dependencies are healthy; alert at five minutes without admission and at 30 minutes without a complete current publication, while preserving the approved six-hour freshness boundary and reporting partial, failed, or unavailable rather than substituting data (Recommended)
- B. Require publication only before the six-hour freshness grace expires
- C. Treat any run completed on the same retailer-local date as on time
- X. Other (please specify)

[Answer]: A. Across a 30-day seeded schedule test, create exactly one logical request for every retailer-local date; admit at least 99% within five minutes of the resolved 02:00 due instant and publish a complete current revision by 02:30 when dependencies are healthy; alert at five minutes without admission and at 30 minutes without a complete current publication, while preserving the approved six-hour freshness boundary and reporting partial, failed, or unavailable rather than substituting data (Recommended)

## Q7. Forecast history and operational retention

Which retention schedule should apply after dependency and hold checks?

- A. Retain published current and superseded requests, runs, product series, provenance, idempotency keys, acknowledgements, and pointer history for one year; retain unpublished partial/failed runs and attempts for 90 days and abandoned staged output for seven days; retain business audit 90 days, operational logs seven days, recovery snapshots 30 days, and dead letters seven days; prevent expiry while planning, purchasing, model evaluation, restore, legal/diagnostic hold, or required audit evidence still references the revision, and leave identity/checksum tombstones after controlled expiry (Recommended)
- B. Retain all forecast runs and series indefinitely
- C. Retain only the current forecast plus 30 days of history
- X. Other (please specify)

[Answer]: A. Retain published current and superseded requests, runs, product series, provenance, idempotency keys, acknowledgements, and pointer history for one year; retain unpublished partial/failed runs and attempts for 90 days and abandoned staged output for seven days; retain business audit 90 days, operational logs seven days, recovery snapshots 30 days, and dead letters seven days; prevent expiry while planning, purchasing, model evaluation, restore, legal/diagnostic hold, or required audit evidence still references the revision, and leave identity/checksum tombstones after controlled expiry (Recommended)

## Q8. Backup, restore, and reconciliation objectives

What recovery profile should apply to Forecasting authority and dependencies?

- A. Target RPO 24 hours and RTO two hours using checksummed PostgreSQL forecast/audit/outbox/inbox snapshots plus a pinned RabbitMQ replay checkpoint; restore every current pointer as unavailable/reconciling, then verify tenant and placement, schedule keys, source versions, model releases and artifact checksums, schemas/runtime, 28-value series and coverage, publication/acknowledgement history, retention, and replay position before enabling each retailer; mark snapshot-time running attempts interrupted and apply the ordinary retry policy; run a clean-environment restore drill for every tagged portfolio release without regenerating or substituting forecasts (Recommended)
- B. Target RPO seven days and RTO one business day, exposing restored pointers before dependency reconciliation finishes
- C. Declare recovery complete when PostgreSQL starts and let consumers discover inconsistencies
- X. Other (please specify)

[Answer]: A. Target RPO 24 hours and RTO two hours using checksummed PostgreSQL forecast/audit/outbox/inbox snapshots plus a pinned RabbitMQ replay checkpoint; restore every current pointer as unavailable/reconciling, then verify tenant and placement, schedule keys, source versions, model releases and artifact checksums, schemas/runtime, 28-value series and coverage, publication/acknowledgement history, retention, and replay position before enabling each retailer; mark snapshot-time running attempts interrupted and apply the ordinary retry policy; run a clean-environment restore drill for every tagged portfolio release without regenerating or substituting forecasts (Recommended)

## Q9. Transport, storage, and tenant security

Which security acceptance profile should Forecasting enforce?

- A. Revalidate current tenant, placement, role or machine scope, job/run ownership, and product ownership at every HTTP, message, stored-routine, cache, and artifact boundary; require TLS 1.2 or later with validated service identity for HTTP, PostgreSQL, RabbitMQ, Redis, and object access; require encrypted persistent volumes, database backups, Redis persistence when enabled, and artifact storage under platform-managed keys; deliver distinct least-privilege credentials through Vault/VSO with tested rotation; fail closed on trust, key, checksum, or scope failure; and require negative tests for forged identifiers, stale placement, pooled connections, cache-key substitution, foreign artifacts, and direct storage access without revealing foreign existence (Recommended)
- B. Enforce tenant scope only at the API and rely on private Kubernetes networking for internal traffic and storage
- C. Use one shared internal credential because the initial data is synthetic
- X. Other (please specify)

[Answer]: A. Revalidate current tenant, placement, role or machine scope, job/run ownership, and product ownership at every HTTP, message, stored-routine, cache, and artifact boundary; require TLS 1.2 or later with validated service identity for HTTP, PostgreSQL, RabbitMQ, Redis, and object access; require encrypted persistent volumes, database backups, Redis persistence when enabled, and artifact storage under platform-managed keys; deliver distinct least-privilege credentials through Vault/VSO with tested rotation; fail closed on trust, key, checksum, or scope failure; and require negative tests for forged identifiers, stale placement, pooled connections, cache-key substitution, foreign artifacts, and direct storage access without revealing foreign existence (Recommended)

## Q10. Telemetry and operational alert thresholds

Which observability profile should Forecasting expose?

- A. Emit structured logs, metrics, and traces with safe tenant, correlation, schedule, request, run, attempt, release, source, publication, coverage, and pointer identifiers across scheduler, API, RabbitMQ, worker, PostgreSQL routines, Redis, Retail Data, Model Lifecycle, and artifact access; dashboard admission/queue/phase latency, lease age, attempts, product outcomes, coverage, freshness, pointer history, cache behavior, dependency calls, recovery, and resource peaks; warn when queue age exceeds five minutes, a partial revision awaits acknowledgement for 30 minutes, read p95 exceeds 500 ms for ten minutes, or resources exceed 90% for five minutes; alert on missed admission/publication targets, 60 seconds without progress, any dead letter, retry exhaustion, stale or unavailable current forecast at the freshness boundary, reconciliation over one hour, backup age over 24 hours, and immediately on tenant, leakage, schema, checksum, or pointer-integrity failure (Recommended)
- B. Record application logs and Kubernetes CPU/RAM only, with alerts limited to pod restarts and job failure
- C. Add dashboards and alert thresholds after the first deployment
- X. Other (please specify)

[Answer]: A. Emit structured logs, metrics, and traces with safe tenant, correlation, schedule, request, run, attempt, release, source, publication, coverage, and pointer identifiers across scheduler, API, RabbitMQ, worker, PostgreSQL routines, Redis, Retail Data, Model Lifecycle, and artifact access; dashboard admission/queue/phase latency, lease age, attempts, product outcomes, coverage, freshness, pointer history, cache behavior, dependency calls, recovery, and resource peaks; warn when queue age exceeds five minutes, a partial revision awaits acknowledgement for 30 minutes, read p95 exceeds 500 ms for ten minutes, or resources exceed 90% for five minutes; alert on missed admission/publication targets, 60 seconds without progress, any dead letter, retry exhaustion, stale or unavailable current forecast at the freshness boundary, reconciliation over one hour, backup age over 24 hours, and immediately on tenant, leakage, schema, checksum, or pointer-integrity failure (Recommended)

## Ambiguity Scan

The ten selections form one bounded local Forecasting profile. Read and batch
durations, numeric precision, response sizes, resources, concurrency, queue
deadlines, execution leases, attempt accounting, retry classes, cache behavior,
schedule timeliness, retention, recovery, encryption, and alert thresholds are
quantified. The queue-start timeout explicitly consumes an attempt under the
same logical run, so it neither creates another daily effect nor conflicts with
the immutable rerun-revision rule.

The 02:30 operational publication target is earlier than the approved freshness
boundary. Missing that target raises an alert but does not change the selected
forecast or silently use another model; the prior publication retains its
original freshness deadline. The 15-minute queue start deadline, two-minute
execution target, and shared heavy-compute lease leave operational margin
before 02:30. A partial revision remains non-current until Operator
acknowledgement regardless of percentage coverage, and each downstream caller
still validates its exact required product set.

Redis remains disposable because every key includes authority and version
context, known changes invalidate it, and misses/outages fall back to governed
PostgreSQL routines. Recovery exposes no restored pointer until dependencies
and immutable evidence reconcile. Retention cannot remove referenced evidence.
Security controls cover both network and persistent data, and synthetic data
does not weaken tenant or credential isolation. No material performance,
scalability, reliability, security, recovery, retention, or observability target
remains unspecified for this unit.

## Consolidated Summary

- **Performance:** Admit scheduled/rerun commands within 500 ms; authorized
  status/current-series reads below 500 ms p95 with five concurrent callers;
  cold model load/validation within 30 seconds; execute, validate, and finalize
  one 100-product retailer run within two minutes after dequeue.
- **Numeric and response bounds:** Quantize once to scale-four decimal using
  round-half-to-even; reject values above 1,000,000 units/product/day; serialize
  fixed decimal strings. Planning/current reads allow 100 products, assistant
  evidence 20, and one response at most 1 MiB.
- **Resources and capacity:** API limit 512 MiB/0.25 CPU; worker limit
  2 GiB/1 CPU and 1 GiB ephemeral storage. Forecasting and Model Lifecycle
  share one heavy-compute admission lease. Due scheduled work precedes later
  Operator reruns; queues allow three per retailer and ten cluster-wide with a
  15-minute start deadline.
- **Retries:** A 60-second lease renews every 15 seconds; four missed heartbeats
  fence the worker. Each run gets three attempts with 30-second-to-five-minute
  backoff and jitter. Queue expiry consumes an attempt under the same run.
  Deterministic integrity, authorization, model, output, and resource-limit
  failures are terminal. Dead letters remain seven days; replay batches are 20.
- **Cache:** Authorized, versioned, product-set-specific Redis entries live at
  most 60 seconds; unavailable results five seconds. Authoritative changes
  invalidate affected keys. Redis failure falls back to governed PostgreSQL
  reads and never permits stale-beyond-TTL or weakened authority.
- **Daily timeliness:** A 30-day seeded test creates exactly one request per
  retailer/local date, admits at least 99% within five minutes of 02:00, and
  publishes a complete current revision by 02:30 when dependencies are healthy.
  Alerts fire at five and 30 minutes; the six-hour freshness rule is unchanged.
- **Retention:** Published forecast history and provenance remain one year;
  unpublished partial/failed runs 90 days; staged output seven days; business
  audit 90 days; logs and dead letters seven days; recovery snapshots 30 days.
  Dependencies and holds override expiry and controlled expiry leaves tombstones.
- **Recovery:** RPO 24 hours and RTO two hours. Checksummed PostgreSQL snapshots
  and a pinned RabbitMQ checkpoint restore pointers as unavailable until
  per-retailer schedule, source, model, checksum, schema, series, coverage,
  publication, retention, and replay reconciliation succeeds. Every tagged
  portfolio release includes a clean-environment restore drill.
- **Security:** Revalidate tenant and resource authority at every boundary;
  require TLS 1.2+, encrypted persistence/backups/artifacts, Vault/VSO-managed
  least-privilege credentials, fail-closed trust/key/checksum handling, and
  cross-tenant, stale-placement, cache, artifact, and direct-access tests.
- **Observability:** Correlated safe telemetry spans every Forecasting boundary.
  Dashboards cover latency, queue/lease, outcomes, coverage, freshness,
  pointers, cache, dependencies, recovery, and resources. Alerts use the
  approved schedule, progress, dead-letter, retry, freshness, recovery, backup,
  resource, latency, partial-acknowledgement, and integrity thresholds.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct
