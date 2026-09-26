# StockSense Planning and Purchasing NFR Requirements Questions

Date: 2026-09-19
Stage: NFR Requirements
Unit: planning-purchasing
Status: In progress

The approved baseline is a co-deployed .NET application containing separate
Retail Data and Planning/Purchasing modules, PostgreSQL authority through
Dapper/Npgsql and owned stored procedures/functions only, Flyway migrations,
payload-bound idempotency, strict tenant and placement enforcement,
transactional outbox/inbox, RabbitMQ, and disposable Redis caching. The
functional design fixes the deterministic replenishment calculation, one active
review per retailer, three accepted manual reviews per retailer-local day,
Manager-governed purchase decisions, immutable commercial lines after
submission, and atomic partial/full receipts. These questions quantify the
remaining operating targets.

## Interaction mode

Continue with the established guided-question workflow.

- A. Guide me through each question (Recommended)
- B. I will edit this file directly
- C. Answer all questions in chat
- X. Other (please specify)

[Answer]: A. Guide me through each question (Recommended)

## Q1. Interactive read and command performance

Which target should Planning/Purchasing meet inside the inception p95-below-one-second requirement?

- A. After warm-up, require p95 below 500 ms for authorized status, allowance, recommendation, scenario, Draft, order, and receipt reads; p95 below 750 ms for policy, preference, Draft, submit, approve, reject, cancel, and receipt commands of up to ten lines under five concurrent users; admit a manual review within 500 ms; run every benchmark mix for at least five minutes and 500 requests and report PostgreSQL and Redis-assisted results separately (Recommended)
- B. Use one p95-below-one-second target for every read and command, with no separate admission or cache-path measurements
- C. Retain only the inception aggregate target and choose operation budgets during implementation
- X. Other (please specify)

[Answer]: A. After warm-up, require p95 below 500 ms for authorized status, allowance, recommendation, scenario, Draft, order, and receipt reads; p95 below 750 ms for policy, preference, Draft, submit, approve, reject, cancel, and receipt commands of up to ten lines under five concurrent users; admit a manual review within 500 ms; run every benchmark mix for at least five minutes and 500 requests and report PostgreSQL and Redis-assisted results separately (Recommended)

## Q2. Review execution, capacity, and application resources

What bounded local profile should review calculation use with the shared Retail Data application pod?

- A. Keep the approved shared pod request at 512 MiB/0.20 CPU and limit at 1.5 GiB/0.75 CPU; complete one 100-product review or scenario calculation within 60 seconds after worker claim; allow one active review per retailer and at most three active review jobs cluster-wide; queue retained scheduled work without overlap; measure whole-stack peak and sustained resources before changing limits (Recommended)
- B. Raise the shared pod limit to 2 GiB/1 CPU and allow ten concurrent review jobs, with a three-minute completion target
- C. Set only container limits during implementation and measure review capacity after the first demo
- X. Other (please specify)

[Answer]: A. Keep the approved shared pod request at 512 MiB/0.20 CPU and limit at 1.5 GiB/0.75 CPU; complete one 100-product review or scenario calculation within 60 seconds after worker claim; allow one active review per retailer and at most three active review jobs cluster-wide; queue retained scheduled work without overlap; measure whole-stack peak and sustained resources before changing limits (Recommended)

## Q3. API, page, line, and numeric bounds

Which bounded contract profile should protect browser, assistant, and service calls?

- A. Limit each review/scenario to 100 products and each Draft/order/receipt request to 100 lines, while the interactive receipt performance target applies through ten lines; use cursor pages of 50 rows by default and 100 maximum; cap a response at 1 MiB; represent demand and quantities as scale-four decimals with round-half-to-even at declared boundaries, require receipt and ordered quantities to resolve to valid pack increments, use scale-four currency amounts, and reject overflow above 1,000,000 units per line (Recommended)
- B. Allow 500 products or lines, 500-row pages, 5 MiB responses, and implementation-selected numeric scales
- C. Rely on request timeouts and database types without explicit API or numeric limits
- X. Other (please specify)

[Answer]: A. Limit each review/scenario to 100 products and each Draft/order/receipt request to 100 lines, while the interactive receipt performance target applies through ten lines; use cursor pages of 50 rows by default and 100 maximum; cap a response at 1 MiB; represent demand and quantities as scale-four decimals with round-half-to-even at declared boundaries, require receipt and ordered quantities to resolve to valid pack increments, use scale-four currency amounts, and reject overflow above 1,000,000 units per line (Recommended)

## Q4. Review queue, lease, timeout, and retry behavior

How should scheduled and manual review execution recover from worker or queue failure?

- A. Give each claimed review a 60-second lease renewed every 15 seconds and fence it after four missed renewals; allow three attempts with exponential backoff from 30 seconds to five minutes; alert when admitted work waits ten minutes; never expire retained scheduled work, and preserve its original local date; make integrity, authority, incompatible-evidence, and deterministic calculation failures terminal; retries reuse the same job, immutable input snapshot, idempotency result, and manual allowance charge (Recommended)
- B. Use a five-minute lease, ten attempts, and expire every queued review after 30 minutes
- C. Let RabbitMQ redelivery and pod restarts determine retries without a job-level lease or attempt limit
- X. Other (please specify)

[Answer]: A. Give each claimed review a 60-second lease renewed every 15 seconds and fence it after four missed renewals; allow three attempts with exponential backoff from 30 seconds to five minutes; alert when admitted work waits ten minutes; never expire retained scheduled work, and preserve its original local date; make integrity, authority, incompatible-evidence, and deterministic calculation failures terminal; retries reuse the same job, immutable input snapshot, idempotency result, and manual allowance charge (Recommended)

## Q5. Redis degradation and database fallback protection

How should authorized Planning/Purchasing reads use Redis and protect PostgreSQL during cache failure?

- A. Cache only already-authorized, versioned read results for at most 30 seconds and unavailable results for five seconds; key by retailer, placement generation, actor authorization version, resource/version, query shape, and page cursor; invalidate affected keys after commit; on Redis failure coalesce requests, allow at most 20 concurrent PostgreSQL fallbacks per pod with 100 waiting, keep a 750 ms database budget, return sanitized `503` with retry guidance on overflow, and alert after 30 seconds of continuous cache unavailability (Recommended)
- B. Cache results for five minutes, use retailer and resource IDs only, and permit unbounded PostgreSQL fallback
- C. Fail all cache-eligible reads whenever Redis is unavailable
- X. Other (please specify)

[Answer]: A. Cache only already-authorized, versioned read results for at most 30 seconds and unavailable results for five seconds; key by retailer, placement generation, actor authorization version, resource/version, query shape, and page cursor; invalidate affected keys after commit; on Redis failure coalesce requests, allow at most 20 concurrent PostgreSQL fallbacks per pod with 100 waiting, keep a 750 ms database budget, return sanitized `503` with retry guidance on overflow, and alert after 30 seconds of continuous cache unavailability (Recommended)

## Q6. RabbitMQ retries, dead letters, and replay

Which event-publication and worker-message profile should this unit require?

- A. Use five delivery attempts with exponential backoff from one to 30 seconds, a seven-day DLQ retention, replay batches of at most 100 messages with one active replay per queue, an outbox-lag alert at 30 seconds, and a backlog alert at 1,000 ready messages; preserve message identity, validate tenant and placement context on every delivery, acknowledge only after inbox and business commit, and audit every replay (Recommended)
- B. Use ten attempts, 24-hour DLQ retention, and replay up to 1,000 messages at once
- C. Configure retries and replay limits per deployment without project acceptance values
- X. Other (please specify)

[Answer]: A. Use five delivery attempts with exponential backoff from one to 30 seconds, a seven-day DLQ retention, replay batches of at most 100 messages with one active replay per queue, an outbox-lag alert at 30 seconds, and a backlog alert at 1,000 ready messages; preserve message identity, validate tenant and placement context on every delivery, acknowledge only after inbox and business commit, and audit every replay (Recommended)

## Q7. Recovery and reconciliation objective

How should the platform RPO 24 hours/RTO two hours be specialized for Planning/Purchasing?

- A. Restore one seeded retailer into a clean target within two hours from a backup no older than 24 hours; keep reads and mutations unavailable until placement, effective policies/preferences, logical review keys, allowance counts, pinned evidence digests, latest/last-success pointers, order transitions, approved/received/outstanding balances, expected arrivals, stock-movement links, idempotency, audit, and outbox/inbox checkpoints reconcile; test crash points around receipt/order/stock commit and message acknowledgement (Recommended)
- B. Restore Planning/Purchasing tables within two hours and reconcile inventory and messaging asynchronously after commands resume
- C. Inherit the platform objective without unit-specific reconciliation checks
- X. Other (please specify)

[Answer]: A. Restore one seeded retailer into a clean target within two hours from a backup no older than 24 hours; keep reads and mutations unavailable until placement, effective policies/preferences, logical review keys, allowance counts, pinned evidence digests, latest/last-success pointers, order transitions, approved/received/outstanding balances, expected arrivals, stock-movement links, idempotency, audit, and outbox/inbox checkpoints reconcile; test crash points around receipt/order/stock commit and message acknowledgement (Recommended)

## Q8. Business evidence and retention

Which retention profile should the portfolio deployment demonstrate?

- A. Keep purchase proposals, orders, receipts, stock-movement links, policies, preferences, accepted allowance charges, idempotency results, and their source/provenance dependencies for the life of the seeded portfolio dataset; keep review/scenario/recommendation history for one year and failed/partial attempt detail for 90 days; retain business audit for 90 days, operational logs and dead letters for seven days, and recovery snapshots for 30 days; legal holds and referenced dependencies override expiry, and restore/rebuild must not resurrect expired data (Recommended)
- B. Keep every Planning/Purchasing record indefinitely
- C. Keep all business records for 90 days and logs for 30 days, regardless of references
- X. Other (please specify)

[Answer]: A. Keep purchase proposals, orders, receipts, stock-movement links, policies, preferences, accepted allowance charges, idempotency results, and their source/provenance dependencies for the life of the seeded portfolio dataset; keep review/scenario/recommendation history for one year and failed/partial attempt detail for 90 days; retain business audit for 90 days, operational logs and dead letters for seven days, and recovery snapshots for 30 days; legal holds and referenced dependencies override expiry, and restore/rebuild must not resurrect expired data (Recommended)

## Q9. Security and data-protection controls

Which security profile should apply across the co-deployed modules and external boundaries?

- A. Revalidate current tenant, role, resource ownership, placement generation, expected version, idempotency digest, and machine job authority at every boundary; require BFF CSRF protection, TLS 1.2 or later for HTTP, PostgreSQL, RabbitMQ, Redis, and object access, encrypted persistent storage and backups, Vault/VSO-managed least-privilege credentials with tested rotation, stored-routine-only application access, and fail-closed trust/version/digest handling; require negative tests for identifier substitution, stale placement, pooled connections, cache substitution, assistant privilege escalation, concurrent decisions, and cancel/receipt or receipt/receipt races without revealing foreign existence (Recommended)
- B. Rely on BFF authentication, PostgreSQL RLS, and Kubernetes namespace isolation without the additional boundary and race tests
- C. Defer transport encryption and credential-rotation tests until cloud deployment
- X. Other (please specify)

[Answer]: A. Revalidate current tenant, role, resource ownership, placement generation, expected version, idempotency digest, and machine job authority at every boundary; require BFF CSRF protection, TLS 1.2 or later for HTTP, PostgreSQL, RabbitMQ, Redis, and object access, encrypted persistent storage and backups, Vault/VSO-managed least-privilege credentials with tested rotation, stored-routine-only application access, and fail-closed trust/version/digest handling; require negative tests for identifier substitution, stale placement, pooled connections, cache substitution, assistant privilege escalation, concurrent decisions, and cancel/receipt or receipt/receipt races without revealing foreign existence (Recommended)

## Q10. Telemetry and operational alert thresholds

Which observability profile should Planning/Purchasing expose?

- A. Emit structured logs, metrics, and traces with safe tenant, correlation, job, attempt, review, scenario, proposal, order, receipt, event, and version identifiers across BFF/API, scheduler, worker, PostgreSQL routines, Redis, RabbitMQ, and dependent service calls; allow high-cardinality identifiers only in logs/traces and bounded tenant hashing in metrics; dashboard read/command latency, schedule and queue delay, job outcomes, blocked products, manual allowance, state transitions, concurrency conflicts, receipt conservation, cache fallback, outbox/DLQ, recovery, and resources; warn at ten-minute queue age, 500 ms read or 750 ms command p95 breach for ten minutes, 30-second cache/outbox lag, or 90% resource use for five minutes; alert on a missed daily review, 60 seconds without job progress, any dead letter, retry exhaustion, impossible transition, over-receipt/conservation failure, unresolved reconciliation over one hour, backup age over 24 hours, or any tenant/integrity violation (Recommended)
- B. Record application logs and Kubernetes CPU/RAM only, with alerts limited to pod restarts and review failure
- C. Add dashboards and alert thresholds after the first deployment
- X. Other (please specify)

[Answer]: A. Emit structured logs, metrics, and traces with safe tenant, correlation, job, attempt, review, scenario, proposal, order, receipt, event, and version identifiers across BFF/API, scheduler, worker, PostgreSQL routines, Redis, RabbitMQ, and dependent service calls; allow high-cardinality identifiers only in logs/traces and bounded tenant hashing in metrics; dashboard read/command latency, schedule and queue delay, job outcomes, blocked products, manual allowance, state transitions, concurrency conflicts, receipt conservation, cache fallback, outbox/DLQ, recovery, and resources; warn at ten-minute queue age, 500 ms read or 750 ms command p95 breach for ten minutes, 30-second cache/outbox lag, or 90% resource use for five minutes; alert on a missed daily review, 60 seconds without job progress, any dead letter, retry exhaustion, impossible transition, over-receipt/conservation failure, unresolved reconciliation over one hour, backup age over 24 hours, or any tenant/integrity violation (Recommended)

## Q11. Daily scheduled-review SLO

What exact threshold should define a missed or late 08:00 retailer-local review?

- A. Over a 30-day seeded test, create exactly one logical scheduled job per retailer/local date and create or retain at least 99% by 08:05; when no older review is active and dependencies are healthy, claim it by 08:10 and finish its 100-product calculation by 08:11; if an older review blocks it, preserve the original local date, warn after ten minutes, alert after 30 minutes, and start within ten minutes after becoming eligible (Recommended)
- B. Require one logical job by 08:15 and completion by 09:00, without a separate retained-work threshold
- C. Alert only when no successful scheduled review exists by the end of the retailer-local day
- X. Other (please specify)

[Answer]: A. Over a 30-day seeded test, create exactly one logical scheduled job per retailer/local date and create or retain at least 99% by 08:05; when no older review is active and dependencies are healthy, claim it by 08:10 and finish its 100-product calculation by 08:11; if an older review blocks it, preserve the original local date, warn after ten minutes, alert after 30 minutes, and start within ten minutes after becoming eligible (Recommended)

## Ambiguity Scan

The selected targets form one bounded local Planning/Purchasing profile. Reads,
commands, review admission, worker execution, response size, page size, line
count, numeric precision, resources, concurrency, leases, retries, queue delay,
cache behavior, recovery, retention, encryption, and alerts are quantitative.
The ten-line interactive receipt benchmark is a performance fixture inside the
100-line contract ceiling; requests above ten lines remain valid through the
ceiling but do not inherit the 750 ms target.

The three job attempts and five RabbitMQ delivery attempts govern different
layers. Broker redelivery preserves message identity and inbox deduplication and
does not create another Review Job attempt, manual allowance charge, purchase
transition, or receipt. A dead-letter replay resumes the same logical message
and business operation under current authority and idempotency checks.

Scheduled work is never silently expired. One logical job exists or is retained
by 08:05, and a prior active review changes only its eligibility to start. The
ten-minute warning and 30-minute alert make that retained state visible without
redating or duplicating the job. The 60-second calculation target fits between
the 08:10 claim and 08:11 completion targets.

Redis remains disposable because cache entries include authority and version
context, commits invalidate affected keys, and bounded PostgreSQL fallback
rechecks authority. Recovery keeps reads and commands unavailable until
Purchasing, Retail Data, idempotency, audit, and messaging evidence reconcile.
Retention dependencies and holds override expiry, while restore and rebuild
must preserve prior expiry. High-cardinality business identifiers are confined
to logs and traces; metrics use bounded dimensions and tenant hashing. No
material performance, scalability, reliability, security, recovery, retention,
or observability target remains unspecified for this unit.

## Consolidated Summary

- **Interactive performance:** After warm-up, authorized reads must achieve
  p95 below 500 ms and commands of up to ten lines p95 below 750 ms under five
  concurrent users. Manual review admission must finish within 500 ms. Each
  benchmark runs for at least five minutes and 500 requests and reports
  PostgreSQL and Redis-assisted paths separately.
- **Review capacity and resources:** Keep the co-deployed Retail Data and
  Planning/Purchasing pod at a 512 MiB/0.20 CPU request and 1.5 GiB/0.75 CPU
  limit. Complete one 100-product review or scenario within 60 seconds after
  claim. Run one active review per retailer and three cluster-wide, and measure
  whole-stack sustained and peak use before changing limits.
- **Contract bounds and numbers:** Limit reviews/scenarios and Draft/order/
  receipt requests to 100 products or lines, cursor pages to 50 by default and
  100 maximum, and responses to 1 MiB. Use scale-four decimals and
  round-half-to-even at declared boundaries, enforce valid pack increments and
  scale-four currency, and reject more than 1,000,000 units per line.
- **Review execution:** Use a 60-second lease renewed every 15 seconds and
  fence after four missed renewals. Permit three attempts with 30-second to
  five-minute exponential backoff. Deterministic evidence, authority,
  integrity, and calculation failures are terminal. Every retry preserves the
  job, immutable snapshot, idempotency result, and allowance charge.
- **Daily schedule:** In a 30-day seeded test, create exactly one logical job
  per retailer/local date and create or retain at least 99% by 08:05. When
  eligible and healthy, claim by 08:10 and finish by 08:11. Retained work keeps
  its date, warns after ten minutes, alerts after 30 minutes, and starts within
  ten minutes of becoming eligible.
- **Redis degradation:** Cache authorized versioned reads for at most 30
  seconds and unavailable results for five seconds, with commit invalidation.
  Coalesce fallback and allow 20 concurrent PostgreSQL queries plus 100 waiting
  per pod under a 750 ms database budget. Return sanitized `503` on overflow
  and alert after 30 seconds of cache unavailability.
- **Messaging:** Attempt RabbitMQ delivery five times with one-to-30-second
  exponential backoff. Retain dead letters seven days. Replay no more than 100
  messages per audited batch with one replay per queue. Alert at 30 seconds of
  outbox lag or 1,000 ready messages; preserve identity and acknowledge only
  after inbox and business commit.
- **Recovery:** Restore one seeded retailer within two hours from a backup no
  older than 24 hours. Keep reads and commands unavailable until authority,
  policies, review keys, allowance, evidence, pointers, transitions, balances,
  arrival dates, stock links, idempotency, audit, and messaging reconcile.
  Exercise receipt/order/stock commit and acknowledgement crash points.
- **Retention:** Keep purchasing records and dependent provenance for the life
  of the seeded dataset, review/scenario/recommendation history for one year,
  failed attempt details and business audit for 90 days, logs and dead letters
  for seven days, and recovery snapshots for 30 days. Holds and references
  override expiry; restore cannot resurrect expired data.
- **Security:** Revalidate tenant, role, ownership, placement, version,
  idempotency, and job authority at every boundary. Require BFF CSRF protection,
  TLS 1.2+, encrypted persistence and backups, Vault/VSO least-privilege
  credentials with rotation tests, stored-routine-only application access, and
  negative tenant, cache, assistant, decision, cancellation, and receipt-race
  tests.
- **Observability:** Correlate logs and traces across every service boundary and
  keep metric dimensions bounded. Dashboard latency, scheduling, jobs, blocked
  products, allowance, purchase transitions, conflicts, receipt conservation,
  cache, messaging, recovery, and resources. Use the selected queue, latency,
  cache, outbox, resource, progress, dead-letter, retry, recovery, backup,
  transition, conservation, tenant, and integrity thresholds.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct
