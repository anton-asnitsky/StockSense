# Forecasting Performance Requirements

Unit: U7 Forecasting (`forecasting`)

## Scope

Targets apply to the clean local CPU profile with one retailer, one store,
100 active products, one compatible pinned release, and 28 forecast days.
Queue time, dependency resolution, artifact loading, inference, validation, and
authoritative commit are reported separately. Startup and optional GPU results
cannot substitute for the CPU acceptance path.

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR1.1 | Scheduled and Operator-rerun admission and authorized status/current-series reads shall achieve p95 below 500 ms with five concurrent local callers and responses no larger than 1 MiB. | After 50 warm-up calls, run at least 500 representative admissions and 500 reads with the seeded three-retailer data. Publish p50/p95/p99, throughput, error rate, authorization cost, cache hit/miss state, hardware, and configuration; p95 at or above 500 ms fails. | Return explicit timeout, unavailable, or capacity status without weakening authorization, freshness, or current selection. |
| NFR1.2 | Cold loading and validation of the pinned model artifact shall finish within 30 seconds, and execution, validation, and atomic finalization of all 100 product series shall finish within two minutes after dequeue. | Run ten independent cold artifact loads and 30 representative CPU Forecast Runs across seasonal-naive, moving-average, and trained release fixtures. Every cold load and run must meet its hard deadline; report phase durations and CPU/RAM/storage peaks. | Fail the attempt with its measured phase and stable reason; never publish staged, timed-out, or incomplete output. |
| NFR1.3 | Published values shall be finite nonnegative decimal strings at scale four, quantized once with round-half-to-even and capped at 1,000,000 units/product/day. Planning/current-series requests allow at most 100 products, assistant evidence 20, and one response 1 MiB. | Boundary/property tests cover halves, zero, maximum, overflow, NaN/infinity/negative inputs, deterministic serialization, exactly 28 ordered values, duplicate/missing days, and product/response limits. | Reject the affected product or request explicitly; never clip, fill, truncate, silently round twice, or substitute zero. |

## Limitations

These are portfolio workload targets, not a public service SLA or proof of
commercial forecast quality.
