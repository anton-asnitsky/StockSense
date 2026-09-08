# StockSense design discovery

Status: Q1-Q7 answered; initial design draft available at docs/design.md for review.
The owner requested questions in chat; answers will be captured here.

## Q1. Retail domain

Which retail setting should StockSense model? This affects demand patterns,
inventory rules, and the demo.

A. Non-perishable specialty retail, such as household goods (recommended)
B. Grocery, including expiry and waste
C. Fashion, including sizes, colors, and seasons
X. Other (please specify)

[Answer]: Non-perishable specialty retail, such as household goods (Recommended)

## Q2. Retailer and store boundaries

Should the first release serve one retailer or multiple independent retailers?

A. One retailer and one store, with a path to expand (recommended)
B. Multiple retailers with isolated data from the start
C. One retailer with multiple stores
X. Other (please specify)

[Answer]: Multiple retailers with isolated data from the start

## Q3. Cloud and budget

Which cloud should the project demonstrate, and what monthly hosting budget
should the design target? Include a budget amount/currency if known.

A. Azure; low-cost, on-demand demos (recommended)
B. AWS; low-cost, on-demand demos
C. No cloud preference; prioritize low cost
X. Other (please specify)

[Answer]: The design should be cloud-native but for now will run on the K8S environment.

## Q4. Kubernetes environment

What Kubernetes environment will StockSense run on—local or remote, which
distribution, and approximately how much CPU/RAM is available? Mention existing
storage, ingress, or databases if known.

[Answer]: Docker Desktop K8S cluster. Let's allocate 16GB RAM and 0.25 CPU.

[Answer clarification for Q4]: Docker Desktop K8S cluster, 16 GB RAM. CPU later clarified as up to 25% of a machine with 12 cores: planning allocation of 3 CPU units.

## Q5. Required isolation boundary

Is sharing database infrastructure acceptable with enforced retailer access
boundaries, or must retailers have separate databases/deployments?

A. Shared infrastructure with enforced retailer isolation is acceptable
B. Separate database per retailer is required
C. Separate deployment per retailer is required
X. Other (please specify)

[Answer]: Initially shard database with strictly enforced tenant boundaries, that can be split to separate databases per tenant.

Interpretation: "shard" refers to the shared database option in the preceding
question. Start with shared storage and strict isolation; support later migration
to separate databases per tenant. This does not request database sharding now.

## Q6. Initial data source

Should we start with generated demo sales and supplier data, or is real data available?

A. Generated, reproducible demo data first (recommended)
B. A public retail dataset plus simulated supplier data
C. Existing real data or integrations
X. Other (please specify)

[Answer]: Indeed

Context: This confirms the immediately preceding question proposing reproducible
synthetic sales, inventory, and supplier data.

## Q7. CPU allocation units

Does "0.25 CPU" mean one quarter of a CPU core for the whole environment,
25% of the host's CPU capacity, or 250 millicores per application pod?

[Answer]: Up to 25% of my machine CPU

Follow-up answer on machine capacity: "12 cores".
The owner accepted the resulting 3-CPU / 16-GB planning envelope.

## Subsequent topics

After these boundaries are clear, clarify delivery timeframe, data availability,
public demo access, agent action limits, and planning policies as needed.
Reuse confirmed conversation decisions rather than asking for them again.
