# ADR 0004: Demo size and forecasting baseline

Date: 2026-09-08
Status: Accepted by the owner.

## Decision

- Seed three isolated retailers, one store per retailer, 100 products per store.
- Generate 18 months of reproducible synthetic daily history.
- Produce 28-day forecasts, refreshed daily.
- Include different demand patterns across retailers, with seasonality,
  promotions and intermittent demand.

This is the initial demonstration scope, not a production capacity guarantee.
Keep the seed and scenario configuration versioned. Preserve separate observed
sales and lost demand. Use temporal splits and only information available at
forecast time, including for promotional features. Synthetic results demonstrate
system behavior; they do not establish real-world forecasting improvements.

## Execution impact

SS-10 implements these scenarios; SS-13 implements daily 28-day baseline forecasts;
SS-18 compares trained models with the same horizon and evaluation scenarios.
Calendar, currency, safety stock and supplier policies remain unresolved.
