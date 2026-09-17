# StockSense model-lifecycle functional-design questions

Date: 2026-09-13
Stage: Functional Design
Unit: model-lifecycle
Status: Confirmed

These questions resolve the remaining behavior choices for reproducible datasets, temporal evaluation, tracked training, model promotion, rollback, and recovery. Accepted decisions remain fixed: Model Lifecycle is a standalone Python service and worker; MLflow tracks experiments and model versions with operator-only access; immutable artifacts use object storage; business data enters through tenant-authorized APIs rather than direct table access; PostgreSQL access uses governed routines; RabbitMQ work is idempotent and recoverable; forecasts cover 28 days and refresh daily; seasonal-naive and moving-average baselines are mandatory; training and evaluation must prevent future leakage; model claims must expose synthetic-data limitations; Docker Desktop Kubernetes has a 16 GiB RAM and three-CPU total planning budget; and a clean reviewer environment must work without the owner's GPU or credentials.

## Interaction mode

The owner's standing preference from the current Functional Design stage is retained:

- A. Guide me through each question (Recommended)
- B. I will edit this file directly
- C. Answer all questions in chat
- X. Other (please specify)

[Answer]: A. Guide me through each question (Recommended)

## Q1. Training scope and model granularity

How should trained forecast models be isolated and packaged initially?

- A. Train one retailer-scoped multi-product model package per version, using product identity and permitted product/calendar/promotion features; never pool training rows or parameters across retailers; keep per-product seasonal-naive and moving-average baselines for comparison (Recommended)
- B. Train one independent model per product, producing about 100 model artifacts per retailer and version
- C. Train one shared model across all retailers and rely on retailer identity as a feature
- X. Other (please specify)

[Answer]: A. Train one retailer-scoped multi-product model package per version, using product identity and permitted product/calendar/promotion features; never pool training rows or parameters across retailers; keep per-product seasonal-naive and moving-average baselines for comparison (Recommended)

## Q2. Dataset snapshot and immutable identity

What should define a reproducible training/evaluation dataset version?

- A. Publish an immutable manifest that pins retailer, retail-data export, accepted-term export when policy evaluation needs it, forecast-origin cutoff, feature schema, split configuration, source checksums, object references, and one aggregate content checksum; changed inputs create a new version (Recommended)
- B. Record only a query timestamp and regenerate the dataset from current source data when needed
- C. Copy rows into MLflow without a separate versioned manifest
- X. Other (please specify)

[Answer]: A. Publish an immutable manifest that pins retailer, retail-data export, accepted-term export when policy evaluation needs it, forecast-origin cutoff, feature schema, split configuration, source checksums, object references, and one aggregate content checksum; changed inputs create a new version (Recommended)

## Q3. Temporal backtest design

How should baseline and candidate forecasts be evaluated without leakage?

- A. Use deterministic expanding-window rolling-origin backtests with at least three complete 28-day held-out horizons, identical origins/products for every candidate, origin-time feature availability checks, and a separately versioned fixture selection; exclude incomplete horizons with explicit reasons (Recommended)
- B. Use one final 28-day holdout period for every evaluation
- C. Randomly split daily observations into training and test rows
- X. Other (please specify)

[Answer]: A. Use deterministic expanding-window rolling-origin backtests with at least three complete 28-day held-out horizons, identical origins/products for every candidate, origin-time feature availability checks, and a separately versioned fixture selection; exclude incomplete horizons with explicit reasons (Recommended)

## Q4. Initial trained candidate family

Which first trained candidate should demonstrate the ML workflow within the local CPU budget?

- A. Use scikit-learn HistGradientBoostingRegressor with Poisson loss over lag, shifted rolling, calendar, known-promotion, product-identity, and horizon-day features; pin the library version, seed, feature schema, and missing-value policy (Recommended)
- B. Use LightGBM with a Poisson objective and the same governed feature/provenance contract
- C. Use XGBoost with a count-compatible objective and the same governed feature/provenance contract
- X. Other (please specify)

[Answer]: A. Use scikit-learn HistGradientBoostingRegressor with Poisson loss over lag, shifted rolling, calendar, known-promotion, product-identity, and horizon-day features; pin the library version, seed, feature schema, and missing-value policy (Recommended)

## Q5. Training/evaluation job lifecycle and concurrency

How should long-running ML work behave?

- A. Use Requested, Queued, Running, Succeeded, Failed, Cancelled, and Superseded jobs; allow one active resource-intensive ML job cluster-wide with a visible FIFO queue; use leases/heartbeats and retained attempts; retry only failed or interrupted attempts; never promote directly from a job (Recommended)
- B. Allow one active job per retailer even when several exceed the shared resource budget
- C. Run jobs synchronously in the API request and expose only success or failure
- X. Other (please specify)

[Answer]: A. Use Requested, Queued, Running, Succeeded, Failed, Cancelled, and Superseded jobs; allow one active resource-intensive ML job cluster-wide with a visible FIFO queue; use leases/heartbeats and retained attempts; retry only failed or interrupted attempts; never promote directly from a job (Recommended)

## Q6. Experiment and artifact provenance

What evidence must every model candidate retain?

- A. Retain retailer, dataset/split versions, code revision, container/runtime identity, feature schema, configuration and seed, parent job/attempt, baseline identities, metrics, exclusions, artifact URI/checksum/format, dependency lock, timestamps, and actor/service authority; failed runs remain inspectable (Recommended)
- B. Retain model parameters and aggregate accuracy only
- C. Treat the serialized model file as sufficient provenance
- X. Other (please specify)

[Answer]: A. Retain retailer, dataset/split versions, code revision, container/runtime identity, feature schema, configuration and seed, parent job/attempt, baseline identities, metrics, exclusions, artifact URI/checksum/format, dependency lock, timestamps, and actor/service authority; failed runs remain inspectable (Recommended)

## Q7. Model registry and active-route authority

How should candidate state and the currently active model be represented?

- A. Keep immutable artifact bytes in object storage and experiment evidence in MLflow; keep the retailer-scoped Candidate, Validated, Rejected, Active, Superseded, Retired lifecycle plus the single active forecasting route in Model Lifecycle's authoritative control records; MLflow tags do not independently activate a model (Recommended)
- B. Treat the latest MLflow registered-model version as automatically active
- C. Overwrite a fixed model file whenever training succeeds
- X. Other (please specify)

[Answer]: A. Keep immutable artifact bytes in object storage and experiment evidence in MLflow; keep the retailer-scoped Candidate, Validated, Rejected, Active, Superseded, Retired lifecycle plus the single active forecasting route in Model Lifecycle's authoritative control records; MLflow tags do not independently activate a model (Recommended)

## Q8. Promotion eligibility and human authority

What should an Operator need before promoting a baseline or trained candidate?

- A. Require a successful comparable evaluation, verified artifact/runtime compatibility, complete provenance, no leakage failure, and an explicit Operator decision with rationale; do not auto-promote or require an unproven universal improvement threshold, and allow an honestly evaluated baseline to remain active (Recommended)
- B. Automatically promote the candidate with the lowest aggregate WAPE
- C. Require every trained candidate to beat every baseline on every metric before it can be promoted
- X. Other (please specify)

[Answer]: A. Require a successful comparable evaluation, verified artifact/runtime compatibility, complete provenance, no leakage failure, and an explicit Operator decision with rationale; do not auto-promote or require an unproven universal improvement threshold, and allow an honestly evaluated baseline to remain active (Recommended)

## Q9. Atomic promotion and rollback semantics

How should route changes affect forecasts already running?

- A. Resolve and pin the active model release when a forecast run starts; atomically change the retailer route with expected-version checks; validate checksum and compatibility first; represent rollback as a new audited route change to a retained Validated/Superseded release; never mutate historical runs or silently switch an in-flight forecast (Recommended)
- B. Let workers read a mutable latest-model pointer during every forecast step
- C. Cancel and replace every historical forecast whenever a model route changes
- X. Other (please specify)

[Answer]: A. Resolve and pin the active model release when a forecast run starts; atomically change the retailer route with expected-version checks; validate checksum and compatibility first; represent rollback as a new audited route change to a retained Validated/Superseded release; never mutate historical runs or silently switch an in-flight forecast (Recommended)

## Q10. Idempotency, messaging, and audit consistency

How should model commands and jobs survive retries?

- A. Give dataset publication, training, evaluation, registration, promotion, rollback, and restore separate tenant-scoped operation keys plus request hashes; exact replay returns the original result and changed payload conflicts; commit authoritative state, business audit, and outbox together, then use idempotent inbox processing without an exactly-once transport claim (Recommended)
- B. Use the dataset checksum as the only idempotency key for every operation
- C. Depend on RabbitMQ redelivery settings to prevent duplicate state changes
- X. Other (please specify)

[Answer]: A. Give dataset publication, training, evaluation, registration, promotion, rollback, and restore separate tenant-scoped operation keys plus request hashes; exact replay returns the original result and changed payload conflicts; commit authoritative state, business audit, and outbox together, then use idempotent inbox processing without an exactly-once transport claim (Recommended)

## Q11. Forecasting handoff

What should Forecasting receive from Model Lifecycle?

- A. Return a server-resolved immutable model release containing retailer, release/version, artifact checksum/reference, runtime and input/output schema compatibility, evaluation summary, activation time, and provenance links; production callers cannot select arbitrary artifact URIs, while evaluation jobs may name validated candidates explicitly (Recommended)
- B. Return only the active artifact file path
- C. Let each forecast request submit any model URI it wants to execute
- X. Other (please specify)

[Answer]: A. Return a server-resolved immutable model release containing retailer, release/version, artifact checksum/reference, runtime and input/output schema compatibility, evaluation summary, activation time, and provenance links; production callers cannot select arbitrary artifact URIs, while evaluation jobs may name validated candidates explicitly (Recommended)

## Q12. Restore and reconciliation

How should restored model metadata and artifacts become usable?

- A. Restore immutable artifacts, MLflow metadata, and authoritative lifecycle/routes; verify tenant ownership, checksums, dependency/runtime compatibility, dataset/evaluation references, and retained/expired status; keep routes unavailable until reconciliation succeeds, then restore the recorded active route or an explicitly chosen validated fallback with audit evidence (Recommended)
- B. Mark the newest restored artifact active before verification so forecasting can start quickly
- C. Restore files only and recreate provenance manually when needed
- X. Other (please specify)

[Answer]: A. Restore immutable artifacts, MLflow metadata, and authoritative lifecycle/routes; verify tenant ownership, checksums, dependency/runtime compatibility, dataset/evaluation references, and retained/expired status; keep routes unavailable until reconciliation succeeds, then restore the recorded active route or an explicitly chosen validated fallback with audit evidence (Recommended)

## Q13. Retention and deletion dependencies

What should happen when a dataset, evaluation, or model release is referenced by later evidence?

- A. Use immutable records with retention states and dependency checks; prevent ordinary deletion of anything referenced by an active route, retained forecast, promotion, rollback, or required audit evidence; allow policy-driven byte expiry only with tombstones and preserved checksums/provenance, and make unavailable evidence explicit (Recommended)
- B. Cascade-delete models and evaluations when their dataset expires
- C. Never expire any ML artifact or metadata
- X. Other (please specify)

[Answer]: A. Use immutable records with retention states and dependency checks; prevent ordinary deletion of anything referenced by an active route, retained forecast, promotion, rollback, or required audit evidence; allow policy-driven byte expiry only with tombstones and preserved checksums/provenance, and make unavailable evidence explicit (Recommended)

## Ambiguity Scan

All thirteen answers select concrete behavior and are mutually consistent. Model Lifecycle owns retailer-scoped dataset, job, evaluation, release, and activation-control records; MLflow records experiment and model evidence; object storage owns immutable dataset and model bytes; and Forecasting consumes only a server-resolved immutable release. These authorities do not overlap.

The chosen trained candidate is scikit-learn HistGradientBoostingRegressor with Poisson loss. Its precise pinned library revision and measured resource request remain implementation and NFR values, not unresolved functional behavior. Exact seasonal-naive period, moving-average window, backtest origin cadence beyond the minimum three complete horizons, job deadlines, retry counts, queue limits, retention durations, RPO/RTO, and forecast freshness threshold remain disclosed later-stage values. None changes the selected lifecycle, authority, idempotency, or leakage rules.

The existing reference to PVC artifacts is compatible with immutable object storage in the local cluster: the storage service may itself use persistent volumes, while callers receive checksummed object references rather than host paths or mutable files. The Model Lifecycle ledger, MLflow metadata, and object bytes must be restored and reconciled together before an active route becomes usable.

No cross-retailer fitted model, automatic model promotion, arbitrary production artifact selection, silent fallback, mutable latest dataset, random train/test split, or exactly-once transport claim is permitted. No contradiction or missing decision remains for artifact generation.

## Consolidated Summary

Model Lifecycle is a standalone Python service and worker that owns reproducible retailer-scoped datasets, resource-bounded ML jobs, evaluation reports, immutable model releases, promotion history, and the authoritative active-model route used by Forecasting. It does not own source retail or supplier data, forecast result freshness, replenishment decisions, or business-audit search. It consumes authorized, versioned Retail Data exports and accepted-term exports and publishes model-release metadata and immutable audit events through governed contracts.

Each trained model package is scoped to one retailer and pools that retailer's products. Algorithm and feature-specification versions may be reused across retailers, but training rows, fitted parameters, artifacts, evaluations, and routes never cross tenant boundaries. Per-product seasonal-naive and moving-average baselines remain explicit candidates. The first trained candidate is scikit-learn HistGradientBoostingRegressor with Poisson loss over lagged observed sales, shifted rolling statistics, calendar fields, promotions known at the forecast origin, product identity, and horizon day. Deterministic seeds, a pinned dependency set, a versioned feature schema, and an explicit missing-value policy are required. Synthetic latent demand and lost-demand truth are evaluation-only and never model inputs.

A Dataset Version is an immutable manifest. It pins retailer and placement generation, Retail Data export, the accepted-term export used for policy evaluation, availability cutoff, source revisions and checksums, feature schema, temporal split configuration, forecast origins, object references, row counts, exclusions, and an aggregate checksum. Any changed input creates a new version. Callers never request a mutable latest dataset or regenerate an old version from current source data.

Forecast evaluation uses deterministic expanding-window rolling-origin backtests with at least three complete 28-day held-out horizons. Every candidate uses the same origins and products. Each feature and transformation must be available and fitted as of its forecast origin; future calendar or promotion values are allowed only when they were known then. Incomplete horizons are excluded with explicit reasons. Reports apply the accepted per-retailer MAE/WAPE definitions, preserve zero-demand behavior, and compare chronological inventory-policy simulations under the same exogenous demand, stock, supplier, lead-time, cost, and ordering-policy fixture. Only the forecast changes between policy runs, and overlapping origins are never double-counted.

Dataset publication, training, and evaluation are asynchronous logical jobs with Requested, Queued, Running, Succeeded, Failed, Cancelled, and Superseded states. A visible FIFO queue permits one active resource-intensive ML job across the local cluster. Attempts are retained separately from the logical job and use leases and heartbeats. Failed or lease-interrupted work may retry under the same job from verified inputs/checkpoints; a job can never promote its output automatically.

Every candidate and failed run retains the retailer, dataset and split versions, code revision, container/runtime identity, feature schema, configuration, seed, job and attempt, baseline identities, metrics, excluded data, artifact URI, SHA-256 checksum, format, dependency lock, timestamps, and actor or service authority. Object storage is authoritative for immutable bytes. MLflow is the operator-only experiment and model-evidence catalog. Model Lifecycle's transactional control records are authoritative for Candidate, Validated, Rejected, Active, Superseded, and Retired lifecycle state and for the single active forecasting route per retailer; MLflow tags cannot activate a model.

Promotion and rollback are explicit Operator actions. Promotion requires a successful comparable evaluation against both baselines, complete lineage, verified artifact checksum, compatible runtime and schemas, and no leakage failure. The Operator records a rationale; no automatic winner or universal improvement threshold is invented, and a baseline may remain active when a trained candidate is not justified. A route change uses expected-version concurrency and atomically records the new route, immutable promotion decision, audit entry, and outbox event. Rollback is a new audited route change to a retained compatible Validated or Superseded release and never erases provenance.

Forecasting resolves the active release from Model Lifecycle when admitting a run and pins it for that run and all retries. The release includes retailer, release and promotion versions, immutable artifact reference and checksum, runtime and input/output schema compatibility, evaluation summary, activation time, and provenance links. Production callers cannot select arbitrary artifact URIs. Evaluation jobs may explicitly select validated candidates. Missing, incompatible, corrupt, or unreconciled releases produce an explicit unavailable result without substitution; Forecasting owns forecast execution and freshness behavior.

Dataset publication, training, evaluation, registration, promotion, rollback, and restore each use a tenant-scoped operation key plus canonical request hash. Exact replay returns the original result; changed payload under the same key conflicts. Authoritative mutations commit lifecycle state, business audit, and outbox records together. RabbitMQ relays and workers use idempotent inbox processing and acknowledge only after local effects commit; retries and DLQ replay never imply exactly-once transport.

Retention is dependency-aware. Ordinary deletion is denied while an active route, retained forecast, promotion, rollback, or required audit record depends on the dataset, evaluation, release, or artifact. Policy-driven byte expiry retains a tombstone, identity, checksum, dependency history, and explicit unavailable status. Recovery restores immutable objects, MLflow metadata, and authoritative lifecycle and route records under a checksummed recovery manifest. Reconciliation verifies tenant ownership, checksums, runtime compatibility, datasets, evaluations, and retention state before any route becomes usable. The system then restores the recorded route or an explicitly chosen validated fallback with audit evidence; it never silently substitutes the newest file.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
