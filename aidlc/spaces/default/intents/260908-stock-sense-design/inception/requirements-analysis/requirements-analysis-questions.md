# StockSense design discovery

Status: Q1-Q7 answered; subsequent owner decisions recorded below. Q8-Q10 accepted by the owner on 2026-09-09; prior consolidated summary confirmed; revised summary awaiting confirmation.
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

## Subsequent confirmed decisions (conversation reconciliation, 2026-09-09)

Sources: docs/product-brief.md, docs/design.md and accepted ADRs 0002-0019.
These carry forward existing owner decisions, not newly inferred approvals.

- Three isolated retailers, one store and 100 products each; 18 months of
  reproducible synthetic daily history; daily refreshed 28-day forecasts.
- React/TypeScript with Ant Design components and Vite (owner update, 2026-09-09); .NET; Dapper/Npgsql through PostgreSQL routines only; Flyway migrations.
- RabbitMQ with OpenAPI REST and AsyncAPI messaging contracts.
- Duende IdentityServer; Google federation and seeded local accounts; local access.
- Terraform/Terragrunt infrastructure; GitHub Actions; reviewer-selectable state
  backend defaulting to local. Commit/push allowed; merges need owner approval.
- Kubernetes Vault with Vault Secrets Operator; Redis cache; MongoDB documents;
  Qdrant collections per retailer and embedding version; Python ML and MLflow.
- CSV offers and text-based PDFs; one currency/time zone per retailer; calendar-day
  supplier lead times; English first with multilingual extensibility.
- Daily replenishment with configurable buffer-day safety stock and supplier
  constraints; manager approval required; supplier order/delivery simulated.
- Three accepted manual reviews per retailer/local day shared by users; scheduled
  reviews excluded; duplicates return the existing job; no retraining per request.
- Local generation first via Python Strands and a provider boundary for optional
  Bedrock; no automatic external fallback. Reviewers need a reproducible CPU path
  without owner secrets or GPU. Owner GPU is RX 6700 XT, 12 GB VRAM.
- EmbeddingGemma-300M and Qwen3-Embedding-0.6B are evaluation candidates; default
  model, exact artifacts, placement and measured inference limits remain open.
- OpenSearch/Dashboards for operational logs and searchable audit; PostgreSQL
  authoritative audit committed with business changes/outbox, then RabbitMQ indexing.
- Full deployment must be measured within 16 GB RAM / 3 CPU; no extra host CPU/RAM
  allocation, real supplier purchasing or cloud provisioning is implied.

## Q8. Initial interactive performance target

The design proposes ordinary inventory/purchasing reads returning within one
second at the 95th percentile with five concurrent local users. Should this be
an initial acceptance target? Use seeded data and a warmed running stack; model
download/startup and LLM generation are measured separately.

A. Adopt p95 under 1 second with five users as the initial target
B. Measure the first slice before setting a numeric acceptance target
X. Other (please specify)

[Answer]: A. Adopt p95 under 1 second with five users as the initial target

## Q9. Local log and business-audit retention

Retention affects disk use and audit rebuilds. Which default should the local
reviewer deployment use? Values will remain configurable. Audit retention applies
to both PostgreSQL records and searchable copies, with controlled expiry. Backup
expiry must follow a documented schedule as well; ordinary application roles
cannot delete audit history. These are portfolio defaults, not legal requirements.

A. Operational logs: 7 days; business audit: 90 days
B. Operational logs: 7 days; business audit: retained until explicit demo reset
X. Other (please specify)

[Answer]: A. Operational logs: 7 days; business audit: 90 days

## Q10. Quota treatment after a failed manual review

An accepted manual inventory review may fail after its job is created. The daily
allowance is three per retailer, and retrying the same job must not use another
slot. Should a terminally failed job retain its consumed slot? Requests rejected
before acceptance never consume a slot.

A. Keep the slot consumed; retry/replay the same accepted job without another charge
B. Refund once on terminal failure; a new accepted request then consumes a slot
X. Other (please specify)

[Answer]: A. Keep the slot consumed; retry/replay the same accepted job without another charge

Owner reply for Q8-Q10: "Accepted", in response to the three proposed defaults
in chat. This accepts these defaults, not a lifecycle completion gate.

## Owner revision: frontend stack (2026-09-09)

[Answer]: UI should use Ant Design components library + Vite

The owner subsequently selected `Request Changes`. This explicitly amends the
previously confirmed summary: React and TypeScript remain selected, Ant Design
is the component library, and Vite supplies frontend development/build tooling.
The earlier `Looks correct` answer records the prior summary confirmation; it
does not constitute approval of the revised requirements or close review findings.

## Owner purchasing policy and review repair (2026-09-09)

The owner requested: "Now resolve four gaps".

Question: Include manager rejection, cancellation before any receipt, and partial
receipts? Planners edit drafts only; submitted/approved lines are locked; managers
approve/reject submitted proposals or cancel submitted/approved orders before
receipt; authorized planners/managers record receipts; cumulative receipts never
exceed approved quantities.

[Answer]: Use these purchasing rules (Recommended)

R-02 carries forward ADR 0004's separate sales/lost-demand truth; proposed evaluation
definitions use MAE/WAPE, per-retailer lost-demand rates and average daily on-hand
value, with explicit zero-demand handling and common simulation fixtures. R-03
restores ADR 0011 daily review, buffer precedence and status/quota UI. R-04 makes
ADR 0005 logout and no-email-auto-link checks mandatory. These repairs are submitted
for review; this answer is not requirements-stage approval.


## Consolidated Summary Confirmation

- StockSense is a portfolio application for non-perishable specialty retail,
  helping planners forecast demand and propose replenishment with manager approval.
- Multiple retailers are isolated from the start using shared storage with strict
  tenant boundaries and a path to dedicated tenant databases; no physical sharding
  requirement is inferred from the original wording.
- Initial demo: three retailers, one store and 100 products each; reproducible
  synthetic sales/inventory/supplier data with 18 months of daily history and
  daily refreshed 28-day forecasts. No real supplier purchasing or payments.
- Docker Desktop Kubernetes is the initial deployment; cloud-native portability
  remains required. The cluster budget is 16 GB RAM and 3 CPU units, reflecting
  25% of the reported 12-core host. Full-stack fit must be demonstrated.
- React/TypeScript with Ant Design components and Vite; .NET, PostgreSQL, Dapper/Npgsql routine-only access, Flyway, RabbitMQ,
  OpenAPI/AsyncAPI, MongoDB, Redis, Python ML and MLflow are selected.
- Duende IdentityServer supports Google federation and seeded local demo accounts;
  local access, server-enforced tenant membership and manager purchasing approval.
- Terraform/Terragrunt and Helm deploy infrastructure; GitHub Actions supplies
  CI/CD with trusted local deployment execution. Terraform state defaults to local,
  with reviewer choice of backend. Vault and Vault Secrets Operator handle secrets.
- Supplier input is CSV and text-based PDF; OCR is deferred. Retailers have one
  currency/time zone each, with UTC timestamps and calendar-day supplier lead times.
- Daily replenishment considers supplier constraints and configurable buffer-day
  safety stock. Three accepted manual reviews per retailer/local day are shared
  across users, excluding scheduled reviews; duplicate requests reuse the job.
- A failed accepted manual review retains its slot; retry/replay of that job does
  not consume another. Rejected-before-acceptance requests do not consume quota.
- Python Strands supports local generation initially and optional external providers
  such as Bedrock, with no automatic external fallback. Reviewers need real local
  CPU inference without owner secrets or the owner RX 6700 XT 12 GB GPU.
- Qdrant collections are isolated per retailer and embedding configuration; evaluate
  EmbeddingGemma-300M and Qwen3-Embedding-0.6B. English first, multilingual extension
  supported by the design; exact default models and artifacts follow evaluation.
- OpenSearch/Dashboards support logs and audit search; PostgreSQL owns transactional
  business audits projected through outbox/RabbitMQ. Defaults are 7 days of logs
  and 90 days of audit in PostgreSQL and OpenSearch; retention is configurable.
- Ordinary inventory/purchasing reads target p95 under 1 second with five concurrent
  local users, seeded data and a warmed stack. LLM generation/startup are separate.
- Commit/push is authorized on working branches; every merge needs owner approval.
  Formal requirements generation does not approve implementation or deployment.
- Remaining implementation decisions include model/runtime/placement benchmarks,
  disk capacity, backup expiry/recovery targets, remaining telemetry storage,
  upload limits, buffer defaults, runner isolation and identity key integration.
  No numerical values or owner approval are invented for these open items.

- Purchasing includes manager rejection, cancellation of submitted/approved orders
  before any receipt, locked submitted/approved lines, and partial/full receipts
  by authorized planners/managers. Cumulative receipts cannot exceed approved lines.
- Evaluation preserves observed sales and lost demand separately. Proposed measures:
  MAE/WAPE against held-out synthetic true demand, lost-demand totals/rates, and
  average daily closing on-hand value per retailer/currency. Zero denominators
  display N/A; models share evaluation dates and exogenous simulation scenarios.
- Daily replenishment runs independently of daily forecasts. Product buffer settings
  override retailer defaults. The UI displays review times, input versions, job
  status, remaining manual allowance and reset time; failed accepted jobs keep slots.
- Identity verification explicitly includes logout/session invalidation and tests
  preventing automatic account linking or inherited membership by matching email.

Does this all look correct before I generate the requirements artifact?

- Looks correct
- Request changes

[Answer]: