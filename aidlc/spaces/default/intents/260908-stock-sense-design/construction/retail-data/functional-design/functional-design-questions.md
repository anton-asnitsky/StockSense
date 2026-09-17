# StockSense retail-data functional-design questions

Date: 2026-09-12
Stage: Functional Design
Unit: retail-data
Status: Confirmed

These questions resolve the remaining behavior choices for Tenant Directory, Inventory, and Demand History. Accepted decisions remain fixed: PostgreSQL is authoritative; runtime access uses Dapper/Npgsql through owned parameterized stored procedures/functions only; Flyway owns migrations; tenant boundaries and placement generations are enforced on every operation; RabbitMQ uses transactional outbox/inbox and idempotency; Redis is disposable; timestamps are stored in UTC and daily behavior follows the retailer-local calendar; sales and lost demand remain separate; and the initial demo contains three isolated retailers, one store and 100 products per retailer, with 18 months of reproducible history.

## Interaction mode

How would you like to complete these questions?

- A. Guide me through each question (Recommended)
- B. I will edit this file directly
- C. Answer all questions in chat
- X. Other (please specify)

[Answer]: A. Guide me through each question (Recommended)

## Q1. Product identity and stock quantity model

Which identity and quantity rules should the initial catalog and stock model use?

- A. Give every product an immutable internal ID; require SKU uniqueness within a retailer; allow a product at multiple stores even though the demo has one; keep one inventory position per retailer/store/product; measure stock in non-negative integer eaches; and retire products without reusing SKUs or deleting history (Recommended)
- B. Make SKU the product identifier and keep products scoped directly to the demo store, accepting a migration if multi-store support is added
- C. Allow decimal stock quantities and configurable units of measure in the first release
- X. Other (please specify)

[Answer]: A. Give every product an immutable internal ID; require SKU uniqueness within a retailer; allow a product at multiple stores even though the demo has one; keep one inventory position per retailer/store/product; measure stock in non-negative integer eaches; and retire products without reusing SKUs or deleting history (Recommended)

## Q2. Atomic receipt boundary between Retail Data and Purchasing

FR8 requires the purchase receipt, stock movement, audit records, and outbox records to commit atomically. The current unit plan deploys Retail Data and Planning/Purchasing as separate services, while the domain design assumes their owned routines can participate in one PostgreSQL transaction. Which boundary should v1 use?

- A. Package U4 and U8 in one modular .NET service/deployment for v1; keep separate modules, schemas, and owned public routines; coordinate receipt posting over one database connection and transaction; preserve REST contracts as extraction seams (Recommended)
- B. Keep separate services and move receipt ownership plus the complete atomic receipt transaction into U4, while U8 retains proposals and order lifecycle
- C. Keep separate services and revise FR8 to an eventually consistent saga with pending, compensation, and reconciliation states
- X. Other (please specify)

[Answer]: A. Package U4 and U8 in one modular .NET service/deployment for v1; keep separate modules, schemas, and owned public routines; coordinate receipt posting over one database connection and transaction; preserve REST contracts as extraction seams (Recommended)

## Q3. Authoritative stock and correction behavior

How should stock changes and reconciliation work?

- A. Keep an immutable movement ledger; update the current position atomically from imports, receipts, and reason-coded adjustments; use expected position versions for concurrency; prohibit negative on-hand stock; and correct errors with compensating movements rather than edits or deletes (Recommended)
- B. Treat the current position as authoritative and retain movements as a best-effort explanatory log
- C. Recalculate every current position from the full ledger on every read and do not persist a position projection
- X. Other (please specify)

[Answer]: A. Keep an immutable movement ledger; update the current position atomically from imports, receipts, and reason-coded adjustments; use expected position versions for concurrency; prohibit negative on-hand stock; and correct errors with compensating movements rather than edits or deletes (Recommended)

## Q4. Inventory and demand import policy

What batch policy, evidence, and default limits should imports use?

- A. Use separate UTF-8 RFC 4180 schemas: inventory files up to 2 MiB/1,000 rows and demand files up to 25 MiB/100,000 rows; validate and commit each whole batch atomically or reject it; return at most 100 row/field diagnostics; generate an immutable batch version; retain the raw source in object storage plus raw and normalized SHA-256 digests; return the prior result for an exact replay, while corrected content creates a new version (Recommended)
- B. Use the same schemas and limits but commit valid rows, reject invalid rows, and mark the batch partially accepted
- C. Stage valid rows and require a planner to select and commit them individually
- X. Other (please specify)

[Answer]: A. Use separate UTF-8 RFC 4180 schemas: inventory files up to 2 MiB/1,000 rows and demand files up to 25 MiB/100,000 rows; validate and commit each whole batch atomically or reject it; return at most 100 row/field diagnostics; generate an immutable batch version; retain the raw source in object storage plus raw and normalized SHA-256 digests; return the prior result for an exact replay, while corrected content creates a new version (Recommended)

## Q5. Demand corrections and protected synthetic truth

How should corrected history and synthetic ground truth be represented?

- A. Append immutable source-versioned observations; let a later accepted batch supersede an earlier value for the same retailer/store/product/local date while retaining lineage; keep sales, lost demand, promotions, and synthetic true demand separate; and exclude synthetic true demand from operational and training-data ports unless an explicit evaluation-purpose contract requests it (Recommended)
- B. Update observations in place and rely on the import audit event for history
- C. Store only true demand as sales plus lost demand and derive the two components when needed
- X. Other (please specify)

[Answer]: A. Append immutable source-versioned observations; let a later accepted batch supersede an earlier value for the same retailer/store/product/local date while retaining lineage; keep sales, lost demand, promotions, and synthetic true demand separate; and exclude synthetic true demand from operational and training-data ports unless an explicit evaluation-purpose contract requests it (Recommended)

## Q6. Membership, role, and administration lifecycle

Who manages retailer access, and how do membership changes take effect?

- A. Let the platform Operator manage retailers, stores, memberships, roles, settings, and placements; model membership as pending, active, or revoked with effective timestamps and a set of Planner/Manager roles; make revocation immediately authoritative; and keep Manager/Planner roles from administering tenant placement or granting access (Recommended)
- B. Let each retailer Manager grant and revoke Planner or Manager access for that retailer, while the Operator manages retailers and placements
- C. Use a single role per membership and require an Operator for every membership change
- X. Other (please specify)

[Answer]: A. Let the platform Operator manage retailers, stores, memberships, roles, settings, and placements; model membership as pending, active, or revoked with effective timestamps and a set of Planner/Manager roles; make revocation immediately authoritative; and keep Manager/Planner roles from administering tenant placement or granting access (Recommended)

## Q7. Tenant extraction and placement cutover

Where should placement authority live, and how should a retailer move from the shared database to a dedicated database?

- A. Keep Tenant Directory and placement authority in the shared control database; seed retailer data at generation 1; increment the generation for every target or lifecycle change; put extraction into draining and reject mutations; copy and verify a consistent tenant snapshot plus pending outbox state; atomically cut over and resume writes; reject stale generations; permit rollback before the first dedicated write and require a forward cutover afterward (Recommended)
- B. Keep writes available during copy and replay changes after switching, accepting a more complex conflict-resolution process
- C. Require an offline maintenance window and update connection configuration manually without a modeled placement lifecycle
- X. Other (please specify)

[Answer]: A. Keep Tenant Directory and placement authority in the shared control database; seed retailer data at generation 1; increment the generation for every target or lifecycle change; put extraction into draining and reject mutations; copy and verify a consistent tenant snapshot plus pending outbox state; atomically cut over and resume writes; reject stale generations; permit rollback before the first dedicated write and require a forward cutover afterward (Recommended)

## Q8. Redis cache correctness

Which cache behavior should protect correctness during invalidation races and outages?

- A. Use cache-aside reads with retailer, placement generation, entity version, schema version, and query shape in server-built keys; use a compare-and-set version pointer to prevent stale fills; invalidate after commit through outbox-driven messages; expire entries after 60 seconds; return data version and observation time; and fall back to PostgreSQL with request coalescing and load protection when Redis is unavailable (Recommended)
- B. Use tenant-scoped keys and TTLs but accept brief stale reads after mutations
- C. Disable caching for Retail Data until a production environment is available
- X. Other (please specify)

[Answer]: A. Use cache-aside reads with retailer, placement generation, entity version, schema version, and query shape in server-built keys; use a compare-and-set version pointer to prevent stale fills; invalidate after commit through outbox-driven messages; expire entries after 60 seconds; return data version and observation time; and fall back to PostgreSQL with request coalescing and load protection when Redis is unavailable. Membership, role, placement, authorization, and receipt decisions never depend on Redis (Recommended)

## Q9. Seeded retailer calendars and currencies

Which concrete settings should the reproducible three-retailer fixture use?

- A. Seed ILS/Asia-Jerusalem, USD/America-New_York, and EUR/Europe-Berlin retailers, using canonical IANA time-zone IDs and ISO 4217 currency codes; include DST-boundary dates in the generated history (Recommended)
- B. Seed USD/America-New_York, EUR/Europe-Berlin, and GBP/Europe-London retailers
- C. Seed all three retailers with USD and UTC to minimize fixture complexity
- X. Other (please specify)

[Answer]: A. Seed ILS/Asia-Jerusalem, USD/America-New_York, and EUR/Europe-Berlin retailers, using canonical IANA time-zone IDs and ISO 4217 currency codes; include DST-boundary dates in the generated history (Recommended)

## Q10. Changes to retailer currency and time zone

What should happen when settings are changed after data exists?

- A. Make currency immutable after the first monetary record; allow time-zone changes only as a versioned, future-effective transition at a retailer-local day boundary; preserve every historical local date and setting version; and reject overlapping or retroactive changes (Recommended)
- B. Allow both settings to change and reinterpret all history using the current values
- C. Lock both settings permanently after retailer creation
- X. Other (please specify)

[Answer]: A. Make currency immutable after the first monetary record; allow time-zone changes only as a versioned, future-effective transition at a retailer-local day boundary; preserve every historical local date and setting version; and reject overlapping or retroactive changes (Recommended)

## Q11. Versioned snapshots for downstream consumers

How should forecasting, evaluation, replenishment, and assistant tools read Retail Data consistently?

- A. Publish immutable snapshot manifests that identify retailer, placement generation, source/import versions, stock-position watermark, local-date range, creation time, and content digest; require consumers to request a current snapshot or an existing version through authorized ports; and return an explicit unavailable/conflict result when a referenced version cannot be served (Recommended)
- B. Let every consumer read the latest records independently and record only its query time
- C. Materialize a complete private copy for every downstream unit whenever any Retail Data row changes
- X. Other (please specify)

[Answer]: A. Publish immutable snapshot manifests that identify retailer, placement generation, source/import versions, stock-position watermark, local-date range, creation time, and content digest; require consumers to request a current snapshot or an existing version through authorized ports; and return an explicit unavailable/conflict result when a referenced version cannot be served (Recommended)

## Q12. Receipt posting at the Inventory boundary

What guarantees should Inventory provide when Purchasing records partial or complete receipts?

- A. Accept only an authorized, placement-current command containing the purchase-order line, product, store, positive quantity, expected stock version, and idempotency key; atomically create one receipt movement, update the position, audit the effect, and publish the outbox event; return the original result for exact retries and a conflict for changed payloads or stale versions (Recommended)
- B. Accept receipt messages asynchronously and eventually update stock without an expected stock version
- C. Let Purchasing write the Inventory routines directly as part of its own transaction
- X. Other (please specify)

[Answer]: A. Accept only an authorized, placement-current command containing the purchase-order line, product, store, positive quantity, expected stock version, and idempotency key; atomically create one receipt movement, update the position, audit the effect, and publish the outbox event; return the original result for exact retries and a conflict for changed payloads or stale versions (Recommended)

## Q13. Retention and deletion of business history

Which functional retention rule should apply before detailed operational retention values are set?

- A. Never hard-delete accepted movements, observations, import lineage, memberships, placements, audit links, or published snapshot manifests through business APIs; use status/effective-time changes and compensating records; allow only policy-driven archival or purge jobs with referential and legal-hold checks (Recommended)
- B. Allow Operators to hard-delete incorrect imports and their derived records when no purchase order references them
- C. Keep all records indefinitely and provide no archival or purge behavior
- X. Other (please specify)

[Answer]: A. Never hard-delete accepted movements, observations, import lineage, memberships, placements, audit links, or published snapshot manifests through business APIs; use status/effective-time changes and compensating records; allow only policy-driven archival or purge jobs with referential and legal-hold checks (Recommended)

## Ambiguity Scan

All answers select concrete behavior and contain no vague or conditional choices. The receipt decision intentionally refines the earlier unit catalogue: U4 Retail Data and U8 Planning/Purchasing remain separate logical units and schemas but share one modular .NET runtime deployment in v1 so their owned routines can participate in one PostgreSQL transaction. C08 remains a public REST extraction seam; the v1 receipt path uses an in-process coordinator and public module ports over one database transaction.

The design will normalize the earlier singular `Membership.role` attribute into separate role grants. U4 owns the semantics and publication of `retail.reference.changed`; U5 consumes that event. U1 must incorporate the provider-side import/job/status schemas and these clarified C03/C08 semantics when the contract package is next revised. These are explicit downstream refinements, not unresolved design choices.

Inventory's authoritative quantity is on-hand stock. Purchasing remains authoritative for ordered and expected inbound quantities; any combined snapshot presents inbound values as versioned referenced data rather than transferring ownership to Inventory. No contradiction or missing behavior remains for artifact generation.

## Consolidated Summary

Retail Data comprises Tenant Directory, Inventory, and Demand History as separate internal modules with owned schemas, routines, and ports. It shares one modular .NET deployment with Planning/Purchasing in v1 solely to satisfy the atomic receipt invariant. REST boundaries remain available for later service extraction.

Products have immutable internal IDs and retailer-unique SKUs. A product may be stocked by multiple stores. Each retailer/store/product has one versioned position measured in non-negative integer eaches. Retired products retain their SKU and history. The immutable movement ledger is authoritative; positions update in the same transaction. Imports set absolute targets for listed SKUs, leave omitted SKUs unchanged, and create delta movements. Receipts add movements. Corrections use reason-coded compensating movements and expected versions prevent lost updates.

Inventory and demand use separate UTF-8 RFC 4180 CSV schemas. Inventory batches are limited to 2 MiB/1,000 rows; demand batches to 25 MiB/100,000 rows. The complete file validates before an all-or-nothing commit, with at most 100 row/field diagnostics. Each accepted source receives an immutable server version; the raw object, raw digest, and normalized SHA-256 digest are retained. Exact content replays return the original result, while corrections create a new version.

Demand observations are immutable and source-versioned. A later accepted batch supersedes the prior effective observation for the same retailer/store/product/local date without erasing lineage. Sales, lost demand, promotions, and synthetic true demand remain separate. Synthetic truth is unavailable through operational and training ports and requires an explicit evaluation-purpose contract.

The platform Operator manages retailers, stores, settings, placements, memberships, and separate Planner/Manager role grants. Memberships move through pending, active, and revoked states with effective timestamps; revocation is immediately authoritative. Retailer roles cannot administer access or placement.

Tenant Directory and placement authority stay in the shared control database. Retailer data starts at generation 1, and each placement lifecycle or target change increments the generation. Extraction drains mutations, copies and verifies a consistent tenant snapshot and pending outbox state, cuts over atomically, and rejects stale-generation work. Rollback is allowed before the first write at the new target; later recovery uses a new forward cutover.

Redis uses server-built cache-aside keys containing retailer, placement generation, entity/schema version, and query shape. Entries expire after 60 seconds; compare-and-set version pointers prevent stale fills and outbox events invalidate committed changes. Responses expose data version and observation time. Redis failure falls back to load-protected PostgreSQL reads. Authorization, membership, placement, and receipt decisions never depend on Redis.

The three fixtures use ILS/Asia-Jerusalem, USD/America-New_York, and EUR/Europe-Berlin and include DST-boundary history. Currency becomes immutable after the first monetary record. Time-zone changes are versioned, future-effective at a local-day boundary, and never reinterpret historical dates.

Downstream units consume authorized immutable snapshot manifests containing the retailer, placement generation, source/import versions, stock watermark, local-date range, creation time, and content digest. A consumer requests the current or a named version and receives an explicit conflict if it is unavailable.

Receipt commands require current authority and placement, valid purchase-order line/product/store references, a positive quantity, expected stock version, and a payload-bound idempotency key. One transaction records the receipt and movement, updates the stock position, and appends both modules' audit and outbox records. Exact retries return the original result; changed payloads, stale versions, over-receipts, and cancel/receipt races conflict.

Business APIs never hard-delete accepted movements, observations, import lineage, memberships, placements, audit links, or snapshot manifests. Corrections and lifecycle changes append history. Only controlled policy jobs may archive or purge records after reference and legal-hold checks; exact retention periods remain an NFR decision.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct
