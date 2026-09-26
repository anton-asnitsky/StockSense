# Model Lifecycle Performance Requirements

Unit: U6 Model Lifecycle (`model-lifecycle`)

## Scope

Targets apply to the clean local CPU profile with one retailer, 100 products,
18 months of daily history, and the approved six-origin evaluation profile.
Queue time, execution phases, object I/O, MLflow recording, and startup are
reported separately. Optional AMD GPU runs are supplemental evidence only.
Admission is measured from receipt of the authenticated command until its
durable job-and-outbox commit. Queue time begins at that commit and ends at
lease acquisition or the queue deadline. Execution deadlines begin at lease
acquisition and include every required phase through the terminal durable
outcome; they exclude prior queue time but include dependency I/O and evidence
recording performed by the attempt.

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR1.1 | Every measured asynchronous command shall be admitted within 500 ms; every measured dataset-publication attempt shall finish within two minutes, initial HistGradientBoosting training within five minutes, six-origin candidate-plus-baselines evaluation within 15 minutes, and artifact validation within 30 seconds. These are hard per-run deadlines rather than percentile SLOs. | Run at least ten cold-start and 30 warmed CPU repetitions per applicable operation with fixed data/code/configuration digests and no overlapping heavy job. Any deadline breach fails acceptance. Publish sample count, cold/warm classification, p50/p95/max admission, phase and end-to-end execution durations, queue time separately, CPU/RAM/storage peaks, artifact sizes, and outcome. | Preserve job identity and evidence, return an explicit failed, capacity, or retryable outcome, and never promote incomplete output. |
| NFR1.2 | Active-release resolution for Forecasting shall achieve p95 below one second with five concurrent local callers on the seeded three-retailer workload, including normal machine authorization and checksum/compatibility metadata assembly. | Execute at least 500 warmed requests covering active, unavailable, corrupt, expired, reconciling, and concurrent route-change states. | Return explicit unavailable or conflict state; never substitute another release or expose foreign existence. |
| NFR1.3 | Evaluation shall use seven-day seasonal-naive and latest-28-observation moving-average baselines over six weekly rolling origins, each with a complete 28-day horizon and identical products, origins, exclusions, and arithmetic for every candidate. | Persist the versioned evaluation profile and prove hand-check metrics, incomplete-horizon exclusion, zero-demand behavior, and equal cohorts. | Mark the report incomplete and ineligible for validation or promotion. |

## Reproducibility acceptance

Repeat the selected evaluation three times from identical immutable inputs,
container/dependency lock, configuration, and seed. Cohorts and lifecycle
outcomes must match; baselines are deterministic; candidate forecasts agree
within 1e-9 absolute tolerance and metrics within 1e-6. Canonical manifests and
logical model-content digests match. Environment-dependent packaging bytes are
disclosed and excluded from the logical digest only by a versioned rule.

## Limitations

Targets demonstrate the portfolio workload. They are not a public availability
SLA or evidence of commercial forecast improvement.
