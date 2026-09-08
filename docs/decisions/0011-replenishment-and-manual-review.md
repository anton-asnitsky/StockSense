# ADR 0011: Replenishment policy and on-demand inventory review

Date: 2026-09-08
Status: Policy accepted; owner requested limited daily manual reviews.
The numerical manual-review limit remains proposed, not approved.

## Replenishment decision

Review inventory daily. Use supplier-specific calendar-day lead times, minimum
order quantities and pack sizes. Express initial safety stock as configurable
buffer days, with retailer defaults and product overrides. Compare buffer settings
in simulation before choosing defaults. Require manager approval for every
purchase order; a review never approves or submits an order automatically.

## On-demand review

Add a planner/manager action to request an inventory review for the authorized
retailer. Recompute shortages and replenishment suggestions from the latest
committed inventory and supplier terms using the latest valid forecast. This is
not a request to retrain a model. Missing or stale forecasts must be reported
explicitly using the existing freshness policy.

Proposed initial limit: three accepted manual review requests per retailer per
retailer-local calendar day, shared across its users. Scheduled daily reviews do
not consume this quota. The owner has not yet approved the number or quota scope.

The API enforces authorization and the quota atomically through PostgreSQL routines;
Redis may display remaining quota but is not its authority. Quota consumption,
job creation and outbox publication are one transaction. Publish the review job
through RabbitMQ with an AsyncAPI contract; OpenAPI covers request and status APIs.

Deduplicate idempotent retries without consuming quota twice. Permit one active
review per retailer; repeated clicks return the existing job rather than enqueueing
more work. An accepted request consumes quota once; worker retries reuse that job.
Do not automatically refund failed jobs in the initial proposal. A server failure
before acceptance consumes no quota. Daily quota resets follow the retailer-local
date, including DST, not a fixed 24-hour timer.

The UI shows last successful review, forecast/input versions, active job, remaining
allowance and reset time. Record actor, retailer, trigger, input versions and
outcome in the audit trail. Read inputs from a consistent snapshot and revalidate
versions at purchase approval; review output does not reserve inventory.

## Execution

SS-14 implements accepted replenishment behavior. SS-35 implements on-demand
requests, quotas, worker processing and UI. Acceptance includes concurrent requests,
multiple users, duplicate clicks, broker retries, quota exhaustion, local midnight,
tenant isolation and stale forecasts. Finalize quota settings before SS-35.
