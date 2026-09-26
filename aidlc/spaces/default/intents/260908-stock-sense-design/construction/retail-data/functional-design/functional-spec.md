# Retail Data Functional Specification

Unit: U4 Retail Data (`retail-data`)

Decision basis: confirmed Retail Data Functional Design answers dated 2026-09-12.

Status: Draft for independent review

## Purpose and boundary

Retail Data supplies authoritative tenant directory, product, on-hand inventory, movement, demand, calendar, and source-version behavior. Planning/Purchasing owns proposals, orders, receipts, review quotas, and dated inbound supply. For v1, U4 and U8 run in one modular deployment so a receipt and its Inventory effects can share one commit; module schemas, entities, ports, and audit streams remain distinct. The REST receipt boundary is retained as an extraction seam and is not used as a non-atomic hop inside the v1 commit.

The specification is the source of truth for the workflows and state transitions below. `entities.md` is authoritative for entity shape and relationships. `rules.md` is authoritative for decision logic.

## Actors and authority

| Actor | Retail Data authority |
| --- | --- |
| Platform Operator | Creates and manages retailers, stores, settings, placements, memberships, and Planner/Manager role grants; initiates controlled extraction and retention operations. |
| Planner | Lists and selects explicitly assigned retailers; imports inventory and demand; reads authorized inventory, movement, demand, and operation outcomes. |
| Manager | Has Planner behavior when both grants exist; additionally performs governed Purchasing decisions defined by U8. |
| Authorized receiver | A person permitted by the approved Purchasing matrix to record receipt quantities; U8 validates this role before the shared receipt transaction. |
| Machine consumer | Uses a narrow audience, scope, job authority, retailer, and placement generation to request versioned data or process events. |
| Assistant tool | Acts only through a current human session and a bounded typed tool; model-supplied tenant or approval authority is ignored. |

## Workflows

### WF1 — Resolve retailer authority

1. Validate the human or machine identity, audience, scope, and requested operation.
2. Resolve the account reference supplied by Identity Access; do not infer access from identity claims.
3. Establish a clean request and persistence context with the requested retailer and current shared-directory placement generation.
4. Load the current effective Membership and independent role grants through the Tenant Directory authority.
5. Verify that every route, payload, job, and referenced resource belongs to the same retailer.
6. Continue only when membership, role, resource ownership, and placement all match.
7. For a foreign or revoked resource, return no protected value. For no memberships, return an empty list and explicit provisioning guidance.
8. Include retailer identity, membership version, and placement generation in the safe response metadata so late clients can discard stale context.

### WF2 — Administer retailer membership and roles

1. Require platform-operator authority and a payload-bound idempotency key.
2. Resolve the target retailer and account without treating a supplied account or retailer ID as authority.
3. Lock the current Membership and role-grant versions.
4. Validate the requested state transition and prohibit duplicate current role grants.
5. Append or transition Membership and MembershipRole state; never erase historical grants.
6. Increment the affected entity versions.
7. Commit the administrative effect, authoritative audit, and outbox event together.
8. Invalidate membership views. Every later request revalidates authority; revocation takes effect immediately.

### WF3 — Create or change retailer settings

1. Require platform-operator authority and lock the retailer's current setting version.
2. For currency creation or change, check whether any accepted monetary record exists.
3. Permit currency establishment only before the first monetary record; reject later changes.
4. For a time-zone change, require a future retailer-local date boundary and reject overlap or retroactivity.
5. Resolve the corresponding UTC instant using the requested canonical time zone and append a new setting version.
6. Preserve every historical observation's original setting-version reference.
7. Commit the new version, audit, and `retail.reference.changed` outbox event atomically.

### WF4 — Import inventory

1. Authorize a Planner or Manager for the retailer and current placement; require an idempotency key.
2. Accept one UTF-8 RFC 4180 inventory file no larger than 2 MiB or 1,000 data rows.
3. Preserve the raw source object, raw digest, normalized digest, source metadata, and immutable server batch version before authoritative validation.
4. If retailer, store, import kind, and normalized digest match a prior batch, return its authorized result. If the same idempotency key has a different request digest, return conflict.
5. Validate headers and each row: `storeCode`, `sku`, `productName`, `category`, `onHandUnits`, `acquisitionUnitCost`, and `currencyCode`.
6. Resolve every store and product in the authorized retailer; require integer non-negative target stock, non-negative cost, and the retailer currency. Collect at most 100 safe row/field diagnostics and mark truncation.
7. If any error exists, reject the full batch and state that no data became authoritative.
8. Lock every affected Product and InventoryPosition in stable order and revalidate expected versions.
9. Create or version products without reusing SKU identity. For each listed position, calculate target minus current on-hand; append the corresponding opening or reconciliation movement. Leave omitted SKUs unchanged.
10. Advance affected position versions and the retailer inventory watermark.
11. Commit the accepted batch, products, movements, positions, idempotency result, audit, and outbox records together.
12. Return batch version, resulting watermark, accepted state, and correction guidance. A correction is a new version and never edits the original batch.

### WF5 — Import or correct demand history

1. Authorize the retailer and current placement and accept one UTF-8 RFC 4180 demand file no larger than 25 MiB or 100,000 data rows.
2. Preserve the same source evidence and duplicate semantics as WF4.
3. Validate `localDate`, `storeCode`, `sku`, `salesUnits`, `lostDemandUnits`, and optional promotion type/intensity against the effective retailer setting version.
4. Require non-negative integer sales and lost-demand quantities. Resolve product, store, and local date inside the authorized tenant.
5. Reject the whole batch on any error with at most 100 diagnostics and no authoritative observations.
6. For each business key, append a source-versioned DemandObservation and optional PromotionObservation.
7. If the key already has an effective observation, atomically mark the new version effective and retain a supersedes link to the prior version.
8. Keep sales and lost demand separate; expose their sum only as calculated observed demand.
9. If the source is the synthetic generator, write latent true demand to the protected SyntheticDemandTruth boundary. Do not expose it through operational, training, forecasting-input, or assistant ports.
10. Commit batch, observations, supersession links, audit, and outbox together and publish the new demand watermark.

### WF6 — Read inventory and movement history with Redis

1. Execute WF1 and resolve the current Inventory watermark and query shape.
2. Build the cache key from server-verified retailer, placement generation, schema version, entity/watermark version, and query shape.
3. On a valid hit, return the value with data version, observation time, and cache status.
4. On miss or Redis failure, coalesce identical requests and apply load protection before reading the authoritative position and movement routines.
5. Before publishing a fill, compare the loaded version with the current version pointer. Discard a fill that lost a race with a newer commit.
6. Store an eligible result for at most 60 seconds.
7. On a business commit, publish an outbox-backed invalidation. Expiry and version checks remain the recovery path for delayed invalidation.
8. If safe fallback capacity is unavailable, return explicit degraded or unavailable status rather than stale data labeled current.
9. Membership, role, placement, receipt, purchasing, and quota decisions always read authoritative state.

### WF7 — Create and serve a versioned Retail Data snapshot

1. Authorize the machine or human consumer, retailer, purpose, resource range, and current placement.
2. Begin a consistent read at one inventory watermark and resolve the effective product, setting, inventory, demand, promotion, and source versions.
3. For forecasting or training purpose, enforce the allowed temporal cutoff and exclude later-known corrections and SyntheticDemandTruth.
4. For evaluation purpose, include named synthetic truth only when the explicit evaluation scope permits it.
5. For replenishment purpose, reference Purchasing-owned dated inbound separately from Inventory on-hand and include every input version.
6. Calculate a content digest and publish an immutable manifest with purpose, placement generation, local-date range, source versions, watermark, and creation time.
7. Serve current or named manifests through authorized ports. Never silently substitute another version when a named manifest is missing, archived, purged, or stale.
8. Record generation, audit, and outbox evidence atomically when snapshot publication changes shared state.

### WF8 — Answer an assistant inventory or demand tool

1. Accept only a typed server-side tool request bound to the current authenticated account and selected retailer.
2. Execute WF1 and reject any tenant, role, product, date range, or filter authority supplied by the model.
3. Bound product count, time range, result size, and allowed aggregation under the tool contract.
4. Read the named or current authorized snapshot and return facts, status, versions, and evidence identifiers.
5. If evidence is missing, stale, archived, or foreign, return an explicit limitation without substituted content.
6. Record the tool outcome with correlation and snapshot identity; no read tool may mutate inventory or approve Purchasing state.

### WF9 — Post a partial or complete receipt atomically

1. The shared Purchasing module authenticates the receiver and locks the order aggregate, receipt idempotency record, and every affected stock position in stable order.
2. Revalidate current membership and role, placement generation, order state, approved line quantities, product/store ownership, and expected stock versions.
3. Lock order, order lines, and stock positions in one deterministic order, and reuse the original idempotency key for any serialization retry.
4. Revalidate membership, role, and placement immediately before commit so a request admitted before revocation or draining cannot commit afterward.
5. Validate every receipt quantity as a positive integer and calculate cumulative prior plus proposed receipts per line.
6. Reject the complete command if any line is foreign, unapproved, terminal, stale, non-positive, or above its approved quantity.
7. For a matching idempotency replay, revalidate current authority and return the original result. Reject changed payload under the same key.
8. Through the Inventory public module port, append one receipt movement per valid line, update positions, and advance the inventory watermark.
9. Through the Purchasing-owned routine, create the receipt and lines and transition the order to PartiallyReceived or Received.
10. Commit receipt, order balance, movements, positions, both authoritative audits, both outboxes, and idempotency outcome in one transaction.
11. Use neither asynchronous messaging nor loopback network calls inside this commit; publish committed effects afterward from each module's outbox.
12. If any audit, outbox, state, or movement write fails, roll back every effect.
13. If the caller loses the response, reconcile by the original idempotency key before any retry or new receipt is attempted.

### WF10 — Publish and consume asynchronous work

1. Append an event with canonical message identity, type, schema version, retailer, actor, correlation, causation, idempotency, placement generation, and payload in the business transaction. U4 uses only the closed C01 tenant envelope with real retailer/placement values; it does not synthesize a global identity-audit event.
2. U4's service-owned C23 publisher binds the registered producer workload to the envelope, computes the RFC 8785/SHA-256 data digest, enforces the 65,536-byte serialized limit, and relays the pending record with the same message identity until broker confirmation or the bounded five-delivery policy is exhausted. U4 has no U14 package dependency.
3. On delivery, the consumer validates schema, authenticated producer, machine/job authority, retailer, current placement generation, and payload digest.
4. Lock or create the consumer/message InboxReceipt.
5. For an exact completed redelivery, acknowledge without a duplicate effect. Reject digest mismatch or stale authority.
6. Commit any business effect and completed inbox receipt before acknowledging.
7. Route exhausted transient failures to an observable seven-day tenant dead letter. A current authorized Operator replay accepts one to 100 messages, retains the original canonical message identity, and creates an audited new bounded cycle; changed content under that identity conflicts. U4 reconciles authoritative state before declaring the replay closed.
8. U4 passes each applicable versioned C22 tenant-publisher fixture, including confirms, retry/DLQ, replay, producer binding, size, digest and telemetry. U13 records U4 results separately from U3 and U14.

### WF11 — Extract one retailer to a dedicated database

1. Require platform-operator authority, one selected retailer, a verified destination, and no active transition.
2. Increment placement generation and enter Draining. Stop new selected-retailer mutations and reject or finish selected-tenant jobs by explicit policy; other retailers continue.
3. Establish a stable source watermark and copy tenant-owned products, positions, movements, sources, demand, snapshots, idempotency history, audit links, and pending outbox state.
4. Verify record counts, digests, referential ownership, SKU uniqueness, effective demand keys, stock-ledger reconciliation, source lineage, and outbox watermark.
5. If validation fails, retain source authority, record failure evidence, and do not expose the destination.
6. If validation succeeds and the source watermark is still current, atomically change target and generation in the shared control directory.
7. Publish routing and cache invalidation and resume selected-retailer work at the destination.
8. Reject every request or job carrying an older generation.
9. Before the first destination write, rollback may restore the source under a new generation. After a destination write, recovery requires a new forward transition.

### WF12 — Restore and reconcile Retail Data

1. Restore into an isolated, unavailable target using protected, explicitly selected backup inputs.
2. Verify tenant counts and ownership, product/SKU constraints, position-to-ledger conservation, source and snapshot digests, effective demand uniqueness, audit links, and pending outbox/inbox state.
3. Reject corrupt, incomplete, cross-tenant, or unreconciled restores.
4. Apply current retention policy before exposure so expired records do not reappear.
5. Rebuild disposable cache and downstream projections only from retained authoritative versions.
6. Make the target eligible for placement only after every required check succeeds and evidence records the measured limitations.

### WF13 — Archive or purge retained history

1. Require controlled retention authority and a policy version; business APIs cannot enter this workflow.
2. Select records by tenant, class, age, legal-hold status, and backup-expiry policy.
3. Verify that no retained entity, idempotency result, source lineage, snapshot, or audit reference requires the candidate.
4. Archive or purge only the permitted records and preserve tombstone/evidence required to prevent resurrection through restore or rebuild.
5. Commit retention audit and affected projection-reconciliation work.
6. On any hold, reference, or validation failure, retain the data and report the blocking category.

### WF14 — Generate and verify the reproducible retail fixture

1. Read the checked-in scenario version and fixed seed.
2. Create three isolated retailers with ILS/Asia-Jerusalem, USD/America-New_York, and EUR/Europe-Berlin settings, one store and 100 products each.
3. Generate 18 months of local-date history with seasonality, promotions, intermittent demand, and explicit DST boundaries.
4. Simulate each day chronologically. Sales cannot exceed available stock; lost demand is latent demand minus sales; zero demand produces zero sales and zero lost demand.
5. Preserve fixed versioned acquisition costs and supplier reference inputs without cross-currency aggregation.
6. Import through the same bounded authoritative workflows used by a reviewer; never seed private records directly.
7. Verify counts, source digests, stock conservation, the demand-10/stock-6 result, zero-demand result, tenant isolation, and repeatability under the same seed.
8. Publish evidence only when every claimed check has a concrete result tied to the revision and scenario version.

### WF15 — Serve separately registered C24/C25 recovery participants

1. U4 registers three distinct identities in U15's immutable roster: `tenant-directory` as a class-A synchronous C24 participant, `inventory` as a class-B C25 asynchronous participant, and `demand-history` as a class-C C25 asynchronous participant. There is no `retail-data` participant identity. Registration fixes each participant's class, route, capabilities and workload identity for the run; U15 refuses an incomplete or incompatible roster, including a mismatched class, before prepare.
2. Tenant Directory accepts C24 commands at `/internal/v1/recovery/participants/tenant-directory/retailers/{retailerId}/runs/{runId}/{command}` and returns the durable result synchronously. It validates U15's coordinator token, correlation/idempotency headers, roster/policy, retailer/run identity, current placement generation and monotonic recovery generation. Missing/invalid credentials are typed `401`, wrong workload/scope `403`, unsupported protocol/policy or route/body mismatch `422`, and stale generations or changed idempotency requests `409`.
3. Before a Tenant Directory transition, its own command ledger checks participant/retailer/run, command ID, idempotency key and canonical request. An exact retry returns the prior status/body; changed content conflicts. `prepare` atomically advances the recovery generation and commits a membership/role, settings, placement and topology write fence with its exact result before `200 prepared`. It does not claim Inventory, Demand History or U8 Purchasing fences. Read-only validation is allowed only without authoritative mutation or required audit publication.
4. Tenant Directory `close` binds its own PostgreSQL transaction/LSN, placement, membership and generation state, audit/outbox cursors, immutable checkpoint ID and digest. `abort` persists a terminal guard even before an observed prepare so delayed prepare/close cannot reacquire the fence. `resume` reconciles those same authoritative records and releases only its own fence; missing checkpoints or uncertain reconciliation return typed `409` and remain fenced. It observes class-A 30/30/30/60-second prepare/close/abort/resume limits and the shorter global deadline. Failed state or exact-result commit returns `503 RECOVERY_PERSISTENCE_UNAVAILABLE`, never fabricated `200`.
5. Inventory consumes its C25 command at `stocksense.recovery.command.v1.inventory` under class-B prepare/close/abort/resume deadlines of 60/60/60/120 seconds; Demand History consumes its own command at `stocksense.recovery.command.v1.demand-history` under class-C deadlines of 120/180/60/180 seconds. Each validates the authenticated C01 tenant envelope, registered coordinator/roster/policy, current retailer and placement/recovery generation, and its assigned class deadline. Both send durable, idempotent acknowledgements to `stocksense.recovery.acknowledgement.v1`, preserving their own command/result identity and setting acknowledgement `causationId` to the command `messageId`.
6. Inventory `prepare` fences product/stock writes, inventory import, receipt-stock movement and affected relays/consumers/acks. Its `close` checkpoint proves stock-movement conservation, position watermark and inventory inbox/outbox cursors. Demand History `prepare` independently fences observations, promotions, demand import and affected relays/consumers/acks. Its `close` checkpoint proves source/observation versions, local-date lineage and demand inbox/outbox cursors. U8 Purchasing separately owns its order-state participant and fence; the co-deployed receipt transaction must respect both U4 Inventory and U8 Purchasing fences.
7. Each C25 participant durably records one monotonic state and exact command/acknowledgement result per participant/retailer/run/generation before reporting success. An exact retry republishes its stable acknowledgement without a second transition; changed content conflicts. `abort` before delayed `prepare` persists a terminal guard; `resume` clears only that participant's fence after its own checkpoint and authoritative records reconcile. On restart all three U4 participant guards load before the corresponding writes resume; timeout or persistence uncertainty retains the affected fence. U15 assembles all separately attributed checkpoints with U2 broker queue identities/digests into the complete cut.

## State machines

### Membership

```mermaid
stateDiagram-v2
  [*] --> Pending
  Pending --> Active: operator activates with at least one role
  Pending --> Revoked: operator revokes
  Active --> Active: role grant set changes
  Active --> Revoked: operator revokes
  Revoked --> [*]
```

- Revoked is terminal for that Membership identity. Restoring access creates a new effective grant record or an explicitly linked new membership under the administrative policy.
- Only Active authorizes access; role grants are evaluated independently.

### Product

```mermaid
stateDiagram-v2
  [*] --> Active
  Active --> Active: versioned metadata correction
  Active --> Retired: operator retires
  Retired --> [*]
```

- Retired products retain identity, SKU, positions, movements, costs, and observation references.

### Import batch

```mermaid
stateDiagram-v2
  [*] --> Pending
  Pending --> Validating: source evidence preserved
  Validating --> Accepted: all rows and atomic commit succeed
  Validating --> Rejected: validation fails
  Validating --> Failed: required processing or commit fails
  Accepted --> [*]
  Rejected --> [*]
  Failed --> [*]
```

- Accepted, Rejected, and Failed are immutable outcomes. Corrected content creates a new batch version. Exact replay returns the terminal result.

### Placement transition

```mermaid
stateDiagram-v2
  [*] --> Requested
  Requested --> Draining: operator starts
  Draining --> Copied: stable watermark copied
  Copied --> Validated: all checks pass
  Validated --> Committed: atomic target-generation cutover
  Requested --> Failed: precondition fails
  Draining --> Failed: drain or copy fails
  Copied --> Failed: verification fails
  Validated --> Failed: stale validation or cutover fails
  Committed --> RolledBack: no destination write exists
  Committed --> [*]: destination write exists
  RolledBack --> [*]
  Failed --> [*]
```

- Every placement lifecycle or target transition advances generation; stale generations never resume business effects.

### Snapshot manifest

```mermaid
stateDiagram-v2
  [*] --> Available
  Available --> Archived: retention policy archives content
  Available --> Purged: retention policy purges content
  Archived --> Purged: retention policy purges archive
  Purged --> [*]
```

- Manifest identity and lineage remain immutable. Archived or Purged is returned explicitly; consumers never receive a replacement version silently.

### Outbox publication

```mermaid
stateDiagram-v2
  [*] --> Pending
  Pending --> Pending: bounded retry
  Pending --> Published: broker confirms
  Pending --> DeadLettered: retries exhausted
  DeadLettered --> Pending: audited replay
  Published --> [*]
```

- Business state remains committed independently of publication progress. Replays retain the original message identity.

## Derived entity-relationship view

This readability view is derived from the authoritative YAML in `entities.md`.

```mermaid
erDiagram
  RETAILER ||--o{ RETAILER_SETTING_VERSION : has
  RETAILER ||--o{ STORE : owns
  RETAILER ||--o{ MEMBERSHIP : grants
  MEMBERSHIP ||--o{ MEMBERSHIP_ROLE : carries
  RETAILER ||--|| RETAILER_PLACEMENT : routes
  RETAILER_PLACEMENT ||--o{ PLACEMENT_TRANSITION : records
  RETAILER ||--o{ PRODUCT : catalogs
  STORE ||--o{ INVENTORY_POSITION : holds
  PRODUCT ||--o{ INVENTORY_POSITION : stocked_as
  INVENTORY_POSITION ||--o{ STOCK_MOVEMENT : explained_by
  IMPORT_BATCH ||--o{ IMPORT_DIAGNOSTIC : reports
  IMPORT_BATCH ||--o{ STOCK_MOVEMENT : creates
  IMPORT_BATCH ||--o{ DEMAND_OBSERVATION : creates
  DEMAND_OBSERVATION o|--o{ DEMAND_OBSERVATION : superseded_by
  PRODUCT ||--o{ DEMAND_OBSERVATION : observed_for
  PRODUCT ||--o{ PROMOTION_OBSERVATION : promoted_for
  PRODUCT ||--o{ SYNTHETIC_DEMAND_TRUTH : evaluated_for
  RETAILER ||--o{ RETAIL_DATA_SNAPSHOT_MANIFEST : publishes
  BUSINESS_AUDIT_RECORD ||--o{ OUTBOX_MESSAGE : emits
  RETAILER ||--o{ RETAIL_RECOVERY_PARTICIPANT_STATE : recovers
  RETAIL_RECOVERY_PARTICIPANT_STATE ||--o{ RETAIL_RECOVERY_COMMAND_RESULT : records
```

## Derived rules view

| Rules | Workflow effect |
| --- | --- |
| BR1.1-BR1.10 | WF1-WF3 and WF11 resolve current membership, roles, settings, and placement before work. |
| BR2.1-BR2.12 | WF4, WF6, and WF9 conserve stock and coordinate receipts atomically. |
| BR3.1-BR3.8 | WF4-WF5 preserve bounded source evidence, all-or-nothing authority, and U4 reference ownership. |
| BR4.1-BR4.8 | WF5, WF7, and WF14 preserve temporal truth and prevent feature leakage. |
| BR5.1-BR5.4 | WF6 tolerates cache races and outages without changing authority. |
| BR6.1-BR6.8 | WF7-WF8 provide versioned, purpose-bound data to downstream units. |
| BR7.1-BR7.10 | WF2-WF5 and WF9-WF10 provide atomic audit/outbox and U4-owned C23 publishing with separate C22 evidence. |
| BR8.1-BR8.16 | WF11-WF13 and WF15 define tenant mobility, restore, Tenant Directory C24 plus Inventory/Demand History C25 participant commands/fences, and retention safety. |
| BR9.1-BR9.7 | WF9, WF14 and WF15 preserve modular ownership, complete provider contracts and reproducible evidence. |

## Business scenarios and edge cases

| Scenario | Required outcome |
| --- | --- |
| Retailer A session requests Retailer B product | No foreign resource existence or data is disclosed; no cache value can bypass the denial. |
| A reused connection served Retailer A previously | Prior transaction context is cleared; only the newly verified retailer context can return rows. |
| Inventory batch contains one invalid currency row | The complete batch is Rejected; no product, movement, position, audit-success, or outbox effect commits. |
| Same inventory content is uploaded twice | The authorized original batch result and watermark return without duplicate stock. |
| Import target equals current on-hand | Batch may be Accepted with an explicit no-change row outcome; no quantity-changing movement is appended. |
| V1 cache fill completes after V2 commits | Compare-and-set rejects the V1 fill; it cannot be returned as V2. |
| Redis is unavailable | Reads use coalesced guarded fallback or explicit degradation; authority and mutations remain correct. |
| Demand 10 with stock 6 | Sales is 6 and lost demand is 4; latent truth 10 remains evaluation-only. |
| Demand is zero | Sales and lost demand are both zero; downstream WAPE handles its denominator without altering stored truth. |
| Time-zone changes after history exists | New local dates use the future setting version; historical dates and aggregates keep their original meaning. |
| Receipt lines are 6 then 5 against approved 10 | The second complete receipt rejects with no effects; 6 then 4 completes the line. |
| Two receipts race for the same remainder | Stable locking and expected versions permit at most the valid cumulative quantity; loser receives conflict. |
| Receipt response times out after commit | Reconciliation by the same idempotency key returns the original receipt and movement identities. |
| Audit or outbox write fails during import or receipt | Every accepted business effect rolls back; a safe failed outcome is reported separately. |
| Old job arrives after tenant cutover | Placement generation mismatch returns conflict and creates no destination or source effect. |
| Extraction validation finds a ledger mismatch | Source remains authoritative and destination is not exposed. |
| Restore contains expired audit history | Retention reconciliation completes before any live access or projection rebuild. |
| U15 addresses a `retail-data` C24 route or omits an Inventory/Demand History C25 registration | The roster or command is rejected; no participant is silently aliased or skipped. |
| U15 retries the same Tenant Directory C24 command after losing a response | Tenant Directory returns its exact durable status/body; changed request under that identity is `409` without a new fence. |
| U15 retries a C25 Inventory or Demand History command after losing an acknowledgement | That participant republishes its stable acknowledgement identity and prior durable outcome; no second transition occurs. |
| Abort arrives before a delayed prepare at any of the three participants | That participant's durable terminal guard suppresses delayed prepare/close and prevents fence resurrection. |
| Tenant Directory resume finds a placement, grant or checkpoint mismatch | Only its membership/placement fence remains held; typed reconciliation failure reaches U15. |
| Inventory resume finds a stock-ledger mismatch, or Demand History finds a source-lineage mismatch | The affected participant's own fence remains held and its C25 acknowledgement reports failure; another participant's fence is not cleared. |

## Error and result semantics

| Condition | Contract result |
| --- | --- |
| Missing or invalid identity | Unauthenticated denial. |
| Valid identity without current membership, role, machine scope, or job authority | Authorized-context denial with no business effect. |
| Foreign tenant-owned resource | Hidden-not-found behavior where disclosure would leak existence. |
| File exceeds the applicable byte or row limit | Payload-too-large result with the accepted limit and no source processing beyond safe intake evidence. |
| Stale entity version, placement generation, idempotency payload, named snapshot, or concurrent receipt | Conflict with safe current-state metadata. |
| Invalid domain content, CSV row, quantity, currency, date, or state transition | Validation failure with bounded diagnostics and no partial effect. |
| Cache, authoritative dependency, or safe fallback unavailable | Explicit degraded or unavailable result; stale data is never relabeled current. |
| Accepted asynchronous work | Stable job or message identity and status; retries preserve identity. |
| Invalid C24 coordinator or unsupported policy at Tenant Directory | Typed `401`/`403`/`422`; no participant mutation. |
| Stale C24 placement/recovery generation or changed idempotency request | Typed `409`; no new Tenant Directory fence or command result. |
| Invalid, stale or changed C25 command at Inventory or Demand History | Reject or report the contracted failed/terminal acknowledgement; no success effect or cross-participant fence change. |
| Missing checkpoint or failed recovery reconciliation | Typed C24 `409` or C25 failed acknowledgement; retain only the affected participant's fence. |
| Recovery persistence or exact-result commit unavailable | C24 `503 RECOVERY_PERSISTENCE_UNAVAILABLE` or no C25 success acknowledgement; no fabricated success. |

## Contract refinements to carry forward

1. U4 owns `retail.reference.changed` semantics and publication; U5 consumes it.
2. The contract package must add provider-side inventory and demand import intake, status, diagnostics, and result schemas using the confirmed limits and atomic policy.
3. C08 inventory reads remain REST. The v1 receipt write uses the co-deployed public module port and one transaction; the REST receipt operation remains an extraction seam and cannot claim v1 atomicity after physical separation without a newly approved consistency model.
4. Membership uses a role-grant collection rather than one singular role attribute.
5. Inventory owns on-hand. Purchasing owns dated inbound and order balances; combined snapshots retain both version identities.
6. U4 owns a service-local C23-conformant publisher and separate C22 results; no U14 runtime dependency is introduced. U4 serves `tenant-directory` on synchronous C24 and separately registered `inventory` and `demand-history` on asynchronous C25 while U15 coordinates the full cut. Platform-wide Operator grant remains with U3, separate from U4 retailer roles.

## Functional limitations

- One store per retailer is seeded, while the model supports multiple stores.
- Stock uses integer eaches; fractional units and unit conversion are outside v1.
- Currency conversion, business-day lead-time calendars, real supplier fulfillment, and autonomous ordering are outside scope.
- Exact operational retention durations, recovery objectives, queue limits, and performance thresholds are defined in later NFR stages.
- Redis, audit search, and other projections are rebuildable and cannot repair or replace authoritative Retail Data.

## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-26T14:46:12Z
**Iteration:** 1
**Request Challenge:** review:bf1dc43add0d9683c96ae086c4741552

This is a single advisory pass. Findings are decision support for the human approval gate, ranked by severity; no fix-and-re-review loop follows.

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | functional-spec.md > WF15 steps 1 and 5; entities.md > RetailAsyncRecoveryParticipantState; rules.md > BR8.14 and BR8.15 | The prior class ambiguity is resolved. Inventory is fixed to class B with prepare/close/abort/resume deadlines of 60/60/60/120 seconds; Demand History is fixed to class C with 120/180/60/180 seconds. WF15 and the entity and rule constraints reject mismatched registration before prepare, matching recovery-policy-v1. | None; retain the fixed class mapping and pre-prepare registration validation. | Resolved |
| R-02 | Critical | aidlc/spaces/default/intents/260908-stock-sense-design/construction/retail-data/functional-design/entities.md > source-of-truth entity list and InventoryPosition entityConstraints; functional-spec.md > Purpose and boundary; rules.md > BR2.9, BR6.3 | `InboundSupplyCommitment` is an entity this Unit owns under every passed contract, and it is absent from the entity model. `unit-of-work.md` line 64 states "U4 owns `InboundSupplyCommitment`; U8 owns purchase orders and commands commitment changes through the Inventory port"; `components.md` line 1935 lists it among Inventory's owned entities and line 1963 gives its attributes (`inbound_commitment_id, source_order_id, source_order_line_id, approved_quantity, received_quantity, open_quantity, expected_arrival_date, status, version, updated_at`); `contract-summary.md` line 29 records "U4 owns inventory/commitment effects" and the C08 section states "U4 routines alone mutate stock and dated inbound commitments". The artifacts under review assert the opposite: functional-spec.md line 11 says "Planning/Purchasing owns proposals, orders, receipts, review quotas, and dated inbound supply", entities.md line 145 says "Inbound and purchasing state are referenced snapshot inputs, not owned quantities", and BR2.9 forbids persisting inbound as Inventory-owned. No entity, rule, or workflow in this Unit creates, updates, or closes a commitment, so U8's approved-order path has no owner. | Either model `InboundSupplyCommitment` in entities.md with its contracted attributes, lifecycle and conservation rules (and the workflow steps that open, consume and close it), or obtain an approved revision of `unit-of-work.md`, `components.md` and C08 that moves the entity to U8 before this design claims that ownership. | New |
| R-03 | Major | functional-spec.md > WF9; entities.md > source-of-truth entity list | The approved C08 in-process port (`contract-summary.md` §C08, `kind: in-process-port`, `name: RetailOperationsInventoryPort`, version 1.0.0) declares four operations: `getInventorySnapshot`, `createApprovedCommitments` (invariant `all-lines-or-none`), `cancelOpenCommitments` (invariant `rejected-after-any-receipt`) and `recordReceipt`. Only `recordReceipt` has a designed behaviour here (WF9). `createApprovedCommitments` and `cancelOpenCommitments` appear in no workflow, rule or entity, and `getInventorySnapshot`'s contracted output field `datedInboundCommitments` has no source in this Unit's model. A developer cannot implement three of the four contracted port operations from this document. | Add the missing port behaviours as workflow steps (or explicitly designed module-port operations) covering `getInventorySnapshot`, `createApprovedCommitments` and `cancelOpenCommitments`, including their contracted invariants and the `stale-order-version`, `over-receipt` and `idempotency-hash-mismatch` error mappings C08 declares. | New |
| R-04 | Major | functional-spec.md > Purpose and boundary (line 11); functional-spec.md > Contract refinements to carry forward, item 3 | The spec describes C08 as a REST boundary: "The REST receipt boundary is retained as an extraction seam" and "C08 inventory reads remain REST. … the REST receipt operation remains an extraction seam". The approved C08 contract has no REST surface at all — it is `kind: in-process-port` and states explicitly "Neither module queries the other's tables, and no HTTP or RabbitMQ hop splits the invariant". U4's REST inventory and demand reads are carried by C03, C06, C11 and C17, not C08. The mischaracterisation would send an implementer looking for a C08 OpenAPI document that does not exist and would license a later HTTP receipt hop that C08 forbids. | Correct the C08 references to name it as the in-process typed port it is, and re-attribute the REST inventory/demand read seams to the contracts that actually own them (C03/C06/C11/C17). If a REST extraction seam for receipts is genuinely wanted, record it as a requested C08 revision rather than as current contract content. | New |
| R-05 | Major | functional-spec.md > WF7 and State machines; entities.md > RetailDataSnapshotManifest; rules.md > BR9.3 | C04 (`contract-summary.md` §C04) obliges this Unit to serve an asynchronous dataset-export job: `requestRetailDatasetExport` returning `202` with a job resource and a required `Idempotency-Key`, and `getRetailDatasetExport` returning job status plus a checksummed artifact reference, with `409` on idempotency conflict or stale source version and `404` when the job is not visible in the retailer context. `traceability.json` declares AC4.2.1 and AC4.2.2 `OK`, but no export-job entity, workflow or state machine exists. The only candidate, `RetailDataSnapshotManifest`, has `status` limited to `[available, archived, purged]` and a state machine with the same three states — it cannot express an accepted-but-incomplete job. BR9.3 compounds this by claiming Retail Data exposes "accepted, rejected, pending, failed … outcomes" for `RetailDataSnapshotManifest`, states the entity does not have. | Model the C04 export job (identity, idempotency binding, status lifecycle including pending/failed, artifact reference and checksum, retailer-scoped visibility), or reconcile BR9.3 and the manifest status enum and state the C04 job lifecycle as an explicit deferral with its owner. | New |
| R-06 | Minor | functional-spec.md > WF3 step 7; rules.md > BR3.8 | WF3 commits a retailer currency or time-zone setting change together with a `retail.reference.changed` outbox event, and BR3.8 extends that event to "retailer, store, product, currency, and calendar reference semantics". The approved payload for that message (`contract-summary.md` §C03, `messageType: { const: retail.reference.changed }`) has `required: [sourceVersion, changedProductIds]` and carries no field identifying a store, currency or calendar change. A consumer receiving a time-zone change would get an empty `changedProductIds` and no way to tell what changed. The "Contract refinements to carry forward" list does not name this. | Either narrow WF3/BR3.8 to publish `retail.reference.changed` only for product-scoped reference changes, or add the payload extension to the contract-refinement list so U1 can widen the schema. | New |
| R-07 | Minor | aidlc/spaces/default/intents/260908-stock-sense-design/construction/retail-data/functional-design/traceability.json > upstream_ids and coverage; rules.md > BR7.10 | BR7.10 cites `AC8.5.4` as a source, and AC8.5.4 is precisely the criterion that forbids substituting a representative platform fixture for a domain consumer's own conformance — the obligation BR7.10 states. `AC8.5.4` appears in neither `upstream_ids` nor `coverage`, while its three siblings AC8.5.1, AC8.5.2 and AC8.5.3 are both declared and marked `OK`. Separately, `unit-of-work-story-map.md` line 63 does not assign US8.5 to `u4-retail-data`, so the three declared AC8.5 entries are extra-contractual additions. The traceability sensor does not flag either condition. | Add an `AC8.5.4` coverage entry (or state why it is excluded), and reconcile the US8.5 assignment with `unit-of-work-story-map.md` so the declared upstream set matches the mapped stories. | New |
| R-08 | Minor | functional-spec.md > Derived rules view, first row; rules.md > Rules summary, first row | Both summary tables label the first rule group `BR1.1-BR1.10`. `rules.md` defines eleven rules in that group; `BR1.11` (revalidate membership, role and placement immediately before commit) is named by no summary row, although it is load-bearing for WF9 step 4 and WF2. | Change both ranges to `BR1.1-BR1.11`. | New |
| R-09 | Minor | functional-spec.md > Derived entity-relationship view | The derived ER diagram omits two relationships that the authoritative YAML in `entities.md` declares: `Retailer -> RetailAsyncRecoveryParticipantState` and `RetailAsyncRecoveryParticipantState -> RetailAsyncRecoveryCommandResult`. The synchronous C24 pair is drawn; the C25 pair added in this revision is not, so the readability view no longer matches its source of truth. | Add the two missing edges (and their entities) to the ER view. | New |
| R-10 | Minor | functional-spec.md > header "Decision basis"; entities.md > header; rules.md > header | All three artifacts state "Decision basis: confirmed Retail Data Functional Design answers dated 2026-09-12", while the Q&A carries a 2026-09-25 contract reconciliation plus a second confirmation, and `traceability.json` records "confirmed on 2026-09-26". The artifacts do incorporate the later reconciliation, so the header understates what they are based on. | Update the decision-basis line in the three artifacts to name the reconciled confirmation date. | New |
| R-11 | Minor | rules.md > Sources line (line 7) | The Sources line reads "C02-C04, C06, C08, C11, C15, C17-C19, C24-C26". The YAML block never cites C03 or C18, and it does cite C01, C22 and C23, which the line omits. | Correct the Sources line to the contracts the rules actually cite. | New |

### Validation Tool Results

The packaged sensors under `.codex/tools/` are Bun/TypeScript and cannot be executed in this session (no `bun`, no `python`). The rows below are **reproductions in Node 24 of each sensor's logic read from its source**, not tool passes.

| Tool | Result | Interpretation |
|---|---|---|
| `traceability` (reproduction of `.codex/tools/aidlc-sensor-traceability.ts`, functional-design branch, against the regenerated `runtime-graph.json` with all 15 units) | PASS — `{gaps: [], orphans: [], missing_from_table: [], missing_from_upstream_ids: [], invalid_entries: [], invalid_targets: [], findings_count: 0}`. 33 stories map to `retail-data`, deriving 121 acceptance criteria; all 121 are declared; 124 `upstream_ids` and 124 `coverage` rows agree; every one of the 84 `BRx.y` IDs in `rules.md` is named by at least one `OK` target, so `reverse: []` produces no derived orphan. | Structurally clean. The sensor does not check the reverse direction of the declared set, which is how the AC8.5 discrepancy in R-07 passes. |
| `upstream-coverage` (reproduction of `.codex/tools/aidlc-sensor-upstream-coverage.ts`) | PASS — all five consumed slugs (`unit-of-work`, `unit-of-work-story-map`, `requirements`, `components`, `contract-summary`) are referenced in the union of the three Markdown deliverables (all via the Sources line of `entities.md`). | Citation present. Citation is not agreement: R-02, R-03 and R-04 are contradictions of those same cited contracts. |
| `required-sections` (reproduction of `.codex/tools/aidlc-sensor-required-sections.ts`) | PASS — no template directory resolves (`aidlc/spaces/default/memory/templates/` is absent), so the generic floor applies: `entities.md` 2 H2, `rules.md` 2 H2, `functional-spec.md` 10 H2, all at or above the two-H2 minimum. | No structural finding. |
| `linter` / `type-check` | PASS (vacuous) — the three artifacts contain nine fenced blocks: seven `mermaid` and two `yaml source-of-truth`. No TypeScript or JavaScript snippet exists for either sensor to inspect. | Consistent with the stage's "no code" constraint. |
| Recovery-class cross-check (manual, against `contract-summary.md` `recovery-policy-v1`) | PASS — `tenant-directory` class A 30/30/30/60, `inventory` class B 60/60/60/120, `demand-history` class C 120/180/60/180, and the synchronous/asynchronous route identities all match the policy block verbatim. | Confirms R-01 remains resolved against current bytes. |

### Summary

The recovery-participant work from the prior pass holds up cleanly against `recovery-policy-v1`, and every mechanical sensor reproduction passes. The concern the human should weigh is the Purchasing boundary: this Unit's own approved boundary statement, the component catalogue and C08 all place `InboundSupplyCommitment` and dated inbound-commitment effects inside U4, while these artifacts hand them to U8 and model nothing for them, leaving three of C08's four port operations undesigned. That divergence may well be the intended decision, but it contradicts three passed contracts that have not been revised, so it needs either a design change here or an approved contract revision before implementation.
