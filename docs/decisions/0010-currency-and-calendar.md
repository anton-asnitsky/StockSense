# ADR 0010: Retailer currency and calendar rules

Date: 2026-09-08
Status: Accepted by the owner.

## Decision

- Each retailer has one configurable currency and time zone.
- Supplier prices use the retailer's currency initially; currency conversion is
  outside the initial scope.
- Store timestamps in UTC. Aggregate daily sales and schedule daily forecasts
  using the retailer's local date and time zone.
- Express supplier lead times in calendar days initially, not business days.

## Execution and acceptance

SS-07 stores explicit retailer settings. SS-10 validates import currency and
applies retailer-local date boundaries; mismatched currencies produce a clear
validation error rather than silent conversion. Use decimal money values.

SS-13 schedules forecasts by retailer-local date, with idempotency for each
tenant/date/run purpose. Define the daily trigger and missed-run policy during
implementation. Test daylight-saving transitions and UTC/local date boundaries
so repeated triggers do not duplicate business effects or skip recovery work.

SS-14 computes supplier arrival dates using calendar-day arithmetic in the
retailer's calendar. Do not substitute fixed 24-hour timestamp increments across
daylight-saving transitions. Weekends and holidays are not excluded in v1.

Specific seeded currencies/time zones remain fixture choices. Configuration
changes must not silently relabel historical money or historical daily aggregates;
define controlled change behavior before allowing edits to populated retailers.
