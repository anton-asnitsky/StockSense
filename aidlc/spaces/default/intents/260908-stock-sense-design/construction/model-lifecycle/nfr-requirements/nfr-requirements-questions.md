# StockSense Model Lifecycle NFR Requirements Questions

Date: 2026-09-18
Stage: NFR Requirements
Unit: model-lifecycle
Status: In progress

Approved behavior includes retailer-isolated reproducible datasets, deterministic
rolling-origin evaluation, mandatory seasonal-naive and moving-average baselines,
MLflow experiment evidence, immutable checksummed artifacts, explicit Operator
promotion and rollback, a single cluster-wide heavy ML job, CPU-compatible local
execution, optional owner-only AMD GPU evidence, and reconciled multi-store
recovery. These questions set the remaining measurable limits and operational
targets without changing those functional decisions.

## Interaction mode

- A. Guide me through each question (Recommended)
- B. I will edit this file directly
- C. Answer all questions in chat
- X. Other (please specify)

[Answer]: A. Guide me through each question (Recommended)

## Q1. Deterministic baseline and backtest configuration

Which fixed initial evaluation profile should every trained candidate and both
baselines use for the seeded 18-month daily history?

- A. Seasonal-naive uses a seven-day period; moving average uses the latest 28 observed days; evaluate six rolling origins spaced seven days apart, each with a complete 28-day horizon; use identical origins, products, exclusions, and metric arithmetic for every candidate, and version any configuration change as a new evaluation profile (Recommended)
- B. Seasonal-naive uses a 28-day period; moving average uses the latest seven observed days; retain only the minimum three complete 28-day origins
- C. Select periods and origin cadence independently for each run to maximize candidate quality
- X. Other (please specify)

[Answer]: A. Seasonal-naive uses a seven-day period; moving average uses the latest 28 observed days; evaluate six rolling origins spaced seven days apart, each with a complete 28-day horizon; use identical origins, products, exclusions, and metric arithmetic for every candidate, and version any configuration change as a new evaluation profile (Recommended)

## Q2. CPU job performance targets

What completion targets should the clean-reviewer CPU profile meet for one
retailer with 100 products and 18 months of daily history?

- A. Admit an asynchronous command within 500 ms; publish and validate a dataset within two minutes; train the initial HistGradientBoosting candidate within five minutes; complete the six-origin candidate-plus-baselines forecast evaluation within 15 minutes; complete artifact validation within 30 seconds; measure queue time separately and fail the acceptance check if any target is exceeded (Recommended)
- B. Allow five minutes for dataset publication, 15 minutes for training, and 45 minutes for evaluation
- C. Record durations without pass/fail targets
- X. Other (please specify)

[Answer]: A. Admit an asynchronous command within 500 ms; publish and validate a dataset within two minutes; train the initial HistGradientBoosting candidate within five minutes; complete the six-origin candidate-plus-baselines forecast evaluation within 15 minutes; complete artifact validation within 30 seconds; measure queue time separately and fail the acceptance check if any target is exceeded (Recommended)

## Q3. Kubernetes resources and queue capacity

Which initial resource and capacity envelope should apply within the shared
16 GiB RAM and three-CPU local cluster budget?

- A. Model Lifecycle API request 256 MiB/0.10 CPU and limit 512 MiB/0.25 CPU; ML worker request 1 GiB/0.50 CPU and limit 3 GiB/1.25 CPU with at most 4 GiB ephemeral job storage; MLflow request 256 MiB/0.10 CPU and limit 768 MiB/0.25 CPU; keep one heavy ML job active cluster-wide, queue at most three jobs per retailer and ten cluster-wide, and fail jobs that cannot start within 15 minutes with a retryable capacity outcome (Recommended)
- B. Give the worker a 4 GiB/2 CPU limit and allow two heavy jobs concurrently, with 25 queued jobs
- C. Leave requests, limits, queue bounds, and start deadlines to deployment-time configuration without acceptance values
- X. Other (please specify)

[Answer]: A. Model Lifecycle API request 256 MiB/0.10 CPU and limit 512 MiB/0.25 CPU; ML worker request 1 GiB/0.50 CPU and limit 3 GiB/1.25 CPU with at most 4 GiB ephemeral job storage; MLflow request 256 MiB/0.10 CPU and limit 768 MiB/0.25 CPU; keep one heavy ML job active cluster-wide, queue at most three jobs per retailer and ten cluster-wide, and fail jobs that cannot start within 15 minutes with a retryable capacity outcome (Recommended)

## Q4. Lease, retry, and dead-letter policy

How should interrupted and failed asynchronous ML work recover?

- A. Use a 60-second execution lease renewed every 15 seconds; after four missed heartbeats, fence the old attempt and mark it interrupted; permit at most three attempts per logical job with exponential backoff from 30 seconds to five minutes plus jitter; retry only transient dependency, worker-loss, and verified-checkpoint failures; make invalid data, schema, leakage, checksum, authorization, and resource-limit failures terminal; retain dead letters for seven days and replay at most 20 jobs per controlled batch (Recommended)
- B. Use a five-minute lease, retry every failure ten times, and automatically replay the dead-letter queue
- C. Configure lease, retry, and dead-letter behavior per environment without fixed acceptance values
- X. Other (please specify)

[Answer]: A. Use a 60-second execution lease renewed every 15 seconds; after four missed heartbeats, fence the old attempt and mark it interrupted; permit at most three attempts per logical job with exponential backoff from 30 seconds to five minutes plus jitter; retry only transient dependency, worker-loss, and verified-checkpoint failures; make invalid data, schema, leakage, checksum, authorization, and resource-limit failures terminal; retain dead letters for seven days and replay at most 20 jobs per controlled batch (Recommended)

## Q5. Reproducibility acceptance

What evidence should prove that a candidate and its comparison can be reproduced?

- A. Repeat the selected candidate evaluation three times from the same immutable dataset, evaluation profile, code/container digest, dependency lock, configuration, and seed; require identical cohort/exclusion sets and lifecycle outcomes, deterministic baseline forecasts, candidate forecasts equal within 1e-9 absolute tolerance, metrics equal within 1e-6, and identical canonical manifest and logical model-content digests; retain every run and disclose any environment-dependent artifact-byte difference without treating timestamps or packaging metadata as model content (Recommended)
- B. Repeat the run once and accept metric differences up to one percent
- C. Treat a successful initial run as sufficient reproducibility evidence
- X. Other (please specify)

[Answer]: A. Repeat the selected candidate evaluation three times from the same immutable dataset, evaluation profile, code/container digest, dependency lock, configuration, and seed; require identical cohort/exclusion sets and lifecycle outcomes, deterministic baseline forecasts, candidate forecasts equal within 1e-9 absolute tolerance, metrics equal within 1e-6, and identical canonical manifest and logical model-content digests; retain every run and disclose any environment-dependent artifact-byte difference without treating timestamps or packaging metadata as model content (Recommended)

## Q6. Dataset, artifact, and MLflow security

Which security acceptance profile should Model Lifecycle enforce?

- A. Enforce tenant scope at the API, job, control-store routine, object-prefix, artifact-manifest, and MLflow-tag/query boundaries; use distinct least-privilege workload identities and Vault-managed short-lived credentials; require TLS in transit and encryption at rest; permit MLflow access only to authorized Operators through the identity provider; never log source rows, model bytes, tokens, secrets, or signed object URLs; and require negative tests proving that a forged tenant, foreign object reference, foreign run ID, or cross-tenant promotion reveals no foreign existence or content (Recommended)
- B. Enforce tenant scope only in the API and rely on private cluster networking for storage and MLflow
- C. Use one unrestricted internal service identity because the initial dataset is synthetic
- X. Other (please specify)

[Answer]: A. Enforce tenant scope at the API, job, control-store routine, object-prefix, artifact-manifest, and MLflow-tag/query boundaries; use distinct least-privilege workload identities and Vault-managed short-lived credentials; require TLS in transit and encryption at rest; permit MLflow access only to authorized Operators through the identity provider; never log source rows, model bytes, tokens, secrets, or signed object URLs; and require negative tests proving that a forged tenant, foreign object reference, foreign run ID, or cross-tenant promotion reveals no foreign existence or content (Recommended)

## Q7. Backup, restore, and reconciliation objectives

What recovery profile should apply to the three Model Lifecycle authorities?

- A. Use one checksummed recovery manifest covering PostgreSQL lifecycle/control records, MLflow metadata, and immutable object snapshots; target RPO 24 hours and RTO two hours; restore all three into an unavailable/reconciling state, verify manifest and tenant ownership, then reconcile datasets, runs, evaluations, artifacts, checksums, runtime compatibility, release history, and routes per retailer before enabling resolution; run a clean-environment restore drill for every tagged portfolio release and never silently substitute a newer artifact (Recommended)
- B. Target RPO seven days and RTO one business day, restoring the newest available artifact when metadata is incomplete
- C. Back up each store independently and declare recovery complete when Kubernetes workloads start
- X. Other (please specify)

[Answer]: A. Use one checksummed recovery manifest covering PostgreSQL lifecycle/control records, MLflow metadata, and immutable object snapshots; target RPO 24 hours and RTO two hours; restore all three into an unavailable/reconciling state, verify manifest and tenant ownership, then reconcile datasets, runs, evaluations, artifacts, checksums, runtime compatibility, release history, and routes per retailer before enabling resolution; run a clean-environment restore drill for every tagged portfolio release and never silently substitute a newer artifact (Recommended)

## Q8. Dataset, run, and model retention

Which initial retention schedule should apply after dependency checks?

- A. Retain every dataset, evaluation, artifact, and release while referenced by an active route, retained Forecast Run, promotion, rollback, restore set, or required audit evidence; after references expire, keep superseded model bytes 90 days, rejected candidate and failed-attempt bytes 30 days, and dataset/model bytes in encrypted archive for one year; keep canonical manifests, checksums, MLflow/control provenance, lifecycle history, and expiry tombstones for one year; keep business audit 90 days, operational logs seven days, and recovery snapshots 30 days (Recommended)
- B. Retain all datasets, runs, and model bytes indefinitely
- C. Delete all non-active candidate and dataset bytes after 30 days and retain metadata only while the release is active
- X. Other (please specify)

[Answer]: A. Retain every dataset, evaluation, artifact, and release while referenced by an active route, retained Forecast Run, promotion, rollback, restore set, or required audit evidence; after references expire, keep superseded model bytes 90 days, rejected candidate and failed-attempt bytes 30 days, and dataset/model bytes in encrypted archive for one year; keep canonical manifests, checksums, MLflow/control provenance, lifecycle history, and expiry tombstones for one year; keep business audit 90 days, operational logs seven days, and recovery snapshots 30 days (Recommended)

## Q9. Model quality and data-drift monitoring

When should observed production behavior require an Operator review?

- A. Recompute retailer-scoped rolling 28-day MAE and WAPE weekly after actuals are complete, comparing the active release with its validation result and the same live seasonal-naive and moving-average baselines; warn after two consecutive checks where WAPE is at least 20% worse than validation or the best live baseline, and mark critical at 35%; also warn when numeric-feature population stability index exceeds 0.20 or unseen categorical values exceed 1%; treat leakage, schema, checksum, and tenant-integrity failures as immediate critical events; open a retraining/evaluation review but never promote or roll back automatically (Recommended)
- B. Review quality only when a user reports inaccurate forecasts
- C. Automatically retrain and promote whenever live WAPE is 10% worse than validation
- X. Other (please specify)

[Answer]: A. Recompute retailer-scoped rolling 28-day MAE and WAPE weekly after actuals are complete, comparing the active release with its validation result and the same live seasonal-naive and moving-average baselines; warn after two consecutive checks where WAPE is at least 20% worse than validation or the best live baseline, and mark critical at 35%; also warn when numeric-feature population stability index exceeds 0.20 or unseen categorical values exceed 1%; treat leakage, schema, checksum, and tenant-integrity failures as immediate critical events; open a retraining/evaluation review but never promote or roll back automatically (Recommended)

## Q10. Telemetry and operational alert thresholds

Which observability profile should Model Lifecycle expose?

- A. Emit structured logs, metrics, and traces carrying safe tenant, correlation, operation, job, attempt, run, dataset, release, and route identifiers across API, RabbitMQ, worker, PostgreSQL routine, object storage, and MLflow calls; measure admission/queue/run phase durations, lease age, retries, dead letters, artifact validation, route availability, evaluation quality, restore progress, and CPU/RAM/storage peaks; warn when queue age exceeds five minutes or resource usage exceeds 90% for five minutes, alert when a running job makes no progress for 60 seconds, any dead letter appears, a backup is older than 24 hours, or reconciliation exceeds one hour, and alert immediately for unavailable active routes, checksum/leakage/tenant-integrity failures, or failed promotion/rollback transactions (Recommended)
- B. Record application logs and Kubernetes CPU/RAM only, with alerts limited to pod restarts
- C. Add dashboards and alert thresholds after the first production deployment
- X. Other (please specify)

[Answer]: A. Emit structured logs, metrics, and traces carrying safe tenant, correlation, operation, job, attempt, run, dataset, release, and route identifiers across API, RabbitMQ, worker, PostgreSQL routine, object storage, and MLflow calls; measure admission/queue/run phase durations, lease age, retries, dead letters, artifact validation, route availability, evaluation quality, restore progress, and CPU/RAM/storage peaks; warn when queue age exceeds five minutes or resource usage exceeds 90% for five minutes, alert when a running job makes no progress for 60 seconds, any dead letter appears, a backup is older than 24 hours, or reconciliation exceeds one hour, and alert immediately for unavailable active routes, checksum/leakage/tenant-integrity failures, or failed promotion/rollback transactions (Recommended)

## Ambiguity Scan

The ten selections form one measurable local Model Lifecycle profile. The
baseline periods, moving-average window, rolling-origin cadence, and
reproducibility tolerances close the reviewer finding about comparable model
evaluation. CPU completion targets, resource limits, queue bounds, lease
renewal, retry classification, attempt limits, and dead-letter controls close
the execution and duplicate-worker gap while remaining within the shared
16 GiB RAM and three-CPU planning envelope.

Tenant checks apply independently at every authority boundary. Recovery uses a
single manifest but does not pretend PostgreSQL, MLflow, and object storage form
one transaction: restored routes remain unavailable until explicit per-retailer
reconciliation succeeds. Retention periods apply only after dependency checks,
so an active release, rollback target, retained forecast, restore set, or
required audit record always takes precedence over elapsed time.

Quality and drift thresholds create evidence and Operator review work. They do
not auto-promote, auto-roll back, or replace the approved requirement for a
human rationale. WAPE comparisons apply only where the accepted denominator
rules produce a defined value; MAE and integrity signals remain available for
zero-demand cases. Optional AMD GPU experiments remain separately labeled
evidence and cannot satisfy the portable CPU acceptance path. No material
performance, scalability, reliability, security, recovery, retention, or
observability target remains unspecified for this unit.

## Consolidated Summary

- **Evaluation profile:** Seven-day seasonal-naive and 28-day moving-average
  baselines; six weekly rolling origins with complete 28-day horizons; every
  candidate uses the same products, origins, exclusions, and metric arithmetic.
  Changes create a new versioned evaluation profile.
- **CPU performance:** Asynchronous command admission within 500 ms; dataset
  publication within two minutes; initial candidate training within five
  minutes; six-origin candidate-plus-baselines evaluation within 15 minutes;
  artifact validation within 30 seconds. Queue time is measured separately.
- **Resources and capacity:** API limit 512 MiB/0.25 CPU; worker limit
  3 GiB/1.25 CPU and 4 GiB ephemeral storage; MLflow limit 768 MiB/0.25 CPU.
  One heavy ML job may run cluster-wide, with three queued per retailer, ten
  queued cluster-wide, and a retryable 15-minute start deadline.
- **Leases and retries:** A 60-second lease renews every 15 seconds; four missed
  heartbeats fence the old attempt. A logical job gets at most three attempts
  with 30-second-to-five-minute exponential backoff and jitter. Only transient
  failures retry; deterministic validation, integrity, authorization, and
  resource-limit failures are terminal. Dead letters remain seven days and
  controlled replay batches contain at most 20 jobs.
- **Reproducibility:** Three runs pin the same immutable data, evaluation
  profile, code/container, dependencies, configuration, and seed. Cohorts and
  outcomes must match; baseline forecasts are deterministic; candidate
  forecasts agree within 1e-9 and metrics within 1e-6; canonical manifests and
  logical model-content digests match.
- **Security:** Tenant scope is enforced at API, job, governed database routine,
  object, manifest, and MLflow boundaries. Workload identities are distinct and
  least-privilege, credentials are short-lived and Vault-managed, transport and
  storage are encrypted, MLflow is Operator-only, sensitive values stay out of
  logs, and cross-tenant negative tests must reveal no foreign existence.
- **Recovery:** One checksummed manifest covers PostgreSQL control records,
  MLflow metadata, and immutable objects. RPO is 24 hours and RTO is two hours.
  Restore keeps routes unavailable until per-retailer reconciliation succeeds;
  every tagged portfolio release includes a clean-environment restore drill.
- **Retention:** Dependencies override expiry. After dependencies end,
  superseded model bytes remain 90 days, rejected/failed-attempt bytes 30 days,
  archived dataset/model bytes and provenance one year, business audit 90 days,
  logs seven days, and recovery snapshots 30 days.
- **Quality and drift:** Weekly rolling 28-day MAE/WAPE compares the active
  release with validation and live baselines. Two consecutive checks at least
  20% worse warn; 35% worse is critical. PSI above 0.20 or unseen categorical
  values above 1% warn. Leakage, schema, checksum, and tenant-integrity failures
  are immediately critical. Findings open Operator review without route changes.
- **Observability:** Correlated safe logs, metrics, and traces span API,
  RabbitMQ, worker, PostgreSQL, object storage, and MLflow. Queue age over five
  minutes and resources over 90% for five minutes warn. Stalled jobs, dead
  letters, stale backups, long reconciliation, unavailable routes, integrity
  failures, and failed promotion/rollback transactions alert at their approved
  thresholds.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct
