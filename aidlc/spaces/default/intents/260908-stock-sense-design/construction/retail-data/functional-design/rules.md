# Retail Data Business Rules

Unit: U4 Retail Data (`retail-data`)

Decision basis: confirmed Retail Data Functional Design answers dated 2026-09-12.

Sources: FR2-FR6, FR8-FR12, FR14, FR17, FR19-FR20; NFR3-NFR4, NFR7-NFR15; C02-C04, C06, C08, C11, C15, C17-C19, C24-C26; the U4 unit boundary; assigned stories; and the confirmed Retail Data Functional Design decisions.

The YAML block is the source of truth for Retail Data decision logic. Rules covering Purchasing, forecasting, model evaluation, assistant, infrastructure, or audit define U4's contribution at those boundaries. Their owning units retain the remaining behavior.

## Source-of-truth business rules

```yaml source-of-truth
schemaVersion: "1.0.0"
unit: retail-data
rules:
  - id: BR1.1
    statement: Retailer access requires a current explicit membership for the authenticated account.
    category: authorization
    appliesTo: [Retailer, Membership, MembershipRole]
    trigger: A retailer-scoped list, query, command, or tool call is received.
    logic: "IF the account has an active effective membership for the requested retailer THEN evaluate its current role grants; otherwise grant no retailer authority."
    violationBehaviour: "Return no foreign data and deny the operation without business effects."
    source: [FR2, NFR3]

  - id: BR1.2
    statement: Retailer identifiers select context but never establish authority.
    category: authorization
    appliesTo: [Retailer, Membership]
    trigger: A route, payload, message, cache key, or referenced resource carries a retailer identifier.
    logic: "IF the identifier differs from the server-resolved current membership and resource ownership THEN treat it as foreign regardless of a valid session."
    violationBehaviour: "Deny or hide the resource using the contract-safe error and record no business mutation."
    source: [FR2, NFR3]

  - id: BR1.3
    statement: Tenant and actor context is established afresh for every persistence operation.
    category: constraint
    appliesTo: [Retailer, Membership, RetailerPlacement]
    trigger: A persistence connection begins or is reused.
    logic: "IF a connection is used for a request THEN clear prior context, set the verified retailer, actor, role, and placement generation transaction-locally, and permit only owned routines and tenant-scoped results."
    violationBehaviour: "Fail closed; return no rows and allow no direct record access."
    source: [NFR3, NFR4]

  - id: BR1.4
    statement: Machine calls require the expected identity, audience, scope, job authority, retailer, and placement generation.
    category: authorization
    appliesTo: [Retailer, RetailerPlacement]
    trigger: An internal service or worker invokes a protected port.
    logic: "IF all machine and job claims match the called operation and current retailer placement THEN continue; no claim supplied by a payload grants authority."
    violationBehaviour: "Deny without mutation, inbox completion, or disclosure."
    source: [FR2, NFR3, NFR5]

  - id: BR1.5
    statement: Only active memberships and current role grants appear in retailer discovery.
    category: authorization
    appliesTo: [Membership, MembershipRole]
    trigger: An authenticated account lists available retailers.
    logic: "IF a membership and at least one required role grant are active at evaluation time THEN include its retailer identity and version; exclude pending and revoked grants."
    violationBehaviour: "Return an empty authorized list when none exist and expose no provisioning shortcut."
    source: [FR2, NFR3, NFR14]

  - id: BR1.6
    statement: Membership revocation is immediately authoritative.
    category: authorization
    appliesTo: [Membership, MembershipRole]
    trigger: A membership or role is revoked or a later request is authorized.
    logic: "IF revocation commits THEN every subsequent query, mutation, retry, cached read, and job check observes the revoked state."
    violationBehaviour: "Deny access and disclose no previously authorized result or idempotent outcome detail."
    source: [FR2, NFR3]

  - id: BR1.7
    statement: A platform Operator alone administers retailers, stores, settings, memberships, role grants, and placements.
    category: authorization
    appliesTo: [Retailer, Store, RetailerSettingVersion, Membership, MembershipRole, RetailerPlacement]
    trigger: An administrative mutation is requested.
    logic: "IF the caller has current platform-operator authority THEN validate and execute the bounded administrative command; Planner and Manager grants do not imply administration."
    violationBehaviour: "Deny atomically and record a bounded denied-attempt audit without foreign values."
    source: [FR2, FR17, NFR3]

  - id: BR1.8
    statement: A membership may hold Planner and Manager roles concurrently through separate grants.
    category: constraint
    appliesTo: [Membership, MembershipRole]
    trigger: A role is granted, revoked, or evaluated.
    logic: "IF a role grant is current THEN it independently confers that role's permissions; revoking one role does not revoke another or the membership."
    violationBehaviour: "Reject duplicate current grants and unlisted roles."
    source: [FR2, FR7, FR8]

  - id: BR1.9
    statement: Every request and job uses the current retailer placement generation.
    category: constraint
    appliesTo: [RetailerPlacement, PlacementTransition]
    trigger: A tenant-owned operation starts or resumes.
    logic: "IF its supplied generation equals the shared directory's current generation and the placement state permits the operation THEN route to the current target."
    violationBehaviour: "Return conflict for stale work and perform no business effect."
    source: [FR20, NFR3]

  - id: BR1.10
    statement: Every placement target or lifecycle change increments generation atomically.
    category: constraint
    appliesTo: [RetailerPlacement, PlacementTransition]
    trigger: Placement enters a new lifecycle state or changes target.
    logic: "IF the transition is valid and commits THEN persist a strictly larger generation with its audit and outbox evidence."
    violationBehaviour: "Reject stale, skipped, duplicate-mismatch, or concurrent transitions."
    source: [FR20, NFR3, NFR7]

  - id: BR1.11
    statement: Long-running mutations revalidate membership, role, and placement immediately before commit.
    category: authorization
    appliesTo: [Membership, MembershipRole, RetailerPlacement]
    trigger: A validated mutation is ready to commit.
    logic: "IF the same membership and role remain current and placement generation is unchanged THEN commit may proceed; admission-time authority alone is insufficient."
    violationBehaviour: "Abort with no business, audit-success, outbox, version, or idempotency-success effect."
    source: [FR2, FR20, NFR3]

  - id: BR2.1
    statement: Products use immutable internal identity and retailer-unique SKUs.
    category: constraint
    appliesTo: [Product]
    trigger: A product is created, imported, corrected, or retired.
    logic: "IF a normalized SKU has never belonged to another product in the retailer THEN create or version that product; never reuse the SKU or replace its internal identity."
    violationBehaviour: "Reject duplicate or reused SKU identity without changing the catalog."
    source: [FR3, FR4]

  - id: BR2.2
    statement: A product may have one position per store and remains referentially available after retirement.
    category: constraint
    appliesTo: [Product, Store, InventoryPosition]
    trigger: A position is created or a product is retired.
    logic: "IF product and store belong to the same retailer THEN at most one position may exist for that pair; retirement blocks new operational changes but keeps history."
    violationBehaviour: "Reject foreign, duplicate, or retired-product position creation."
    source: [FR4, NFR3]

  - id: BR2.3
    statement: Stock is measured in non-negative integer eaches.
    category: validation
    appliesTo: [InventoryPosition, StockMovement]
    trigger: A quantity is imported, adjusted, simulated, received, or returned.
    logic: "IF the quantity is an integer and the resulting on-hand value is at least zero THEN it is valid."
    violationBehaviour: "Reject the complete command or batch with a quantity diagnostic and no effects."
    source: [FR3, FR4, FR8]

  - id: BR2.4
    statement: The immutable movement ledger is the authority for on-hand stock.
    category: calculation
    appliesTo: [InventoryPosition, StockMovement]
    trigger: Stock changes.
    logic: "IF a movement commits THEN set resulting on-hand to prior on-hand plus quantity delta, advance position version and retailer watermark, and preserve the movement permanently."
    violationBehaviour: "Rollback movement and position together if conservation cannot be proven."
    source: [FR4, FR17]

  - id: BR2.5
    statement: Current positions are transactionally maintained projections of the ledger.
    category: constraint
    appliesTo: [InventoryPosition, StockMovement]
    trigger: A position is read or verified.
    logic: "IF a position is current THEN its quantity, version, and watermark reconcile with all committed movements through that watermark."
    violationBehaviour: "Mark the result unavailable, raise reconciliation evidence, and do not silently repair history."
    source: [FR4, FR20]

  - id: BR2.6
    statement: Inventory imports set absolute targets for listed products and leave omitted products unchanged.
    category: calculation
    appliesTo: [ImportBatch, Product, InventoryPosition, StockMovement]
    trigger: A validated inventory batch commits.
    logic: "IF a row's target differs from current on-hand THEN append an opening-import or reconciliation-adjustment movement for the delta; if equal, record a no-change outcome without a stock effect."
    violationBehaviour: "Reject the whole batch when any target cannot be resolved or conserved."
    source: [FR3, FR4]

  - id: BR2.7
    statement: Stock mutations require expected position versions.
    category: constraint
    appliesTo: [InventoryPosition, StockMovement]
    trigger: An adjustment, receipt, or version-sensitive import is committed.
    logic: "IF every expected position version equals the locked current version THEN validate all lines and apply them once."
    violationBehaviour: "Return conflict with current safe version metadata and commit no line."
    source: [FR4, FR8]

  - id: BR2.8
    statement: Corrections append reason-coded compensating movements.
    category: policy
    appliesTo: [StockMovement, InventoryPosition]
    trigger: An accepted stock effect is found to be wrong.
    logic: "IF an authorized correction is valid THEN append a movement referencing the original source and a reason; never edit or delete the original movement."
    violationBehaviour: "Reject unreasoned, unreferenced, or unauthorized correction."
    source: [FR4, FR17]

  - id: BR2.9
    statement: Inventory is authoritative for on-hand quantity and dated inbound commitments.
    category: constraint
    appliesTo: [InventoryPosition, RetailDataSnapshotManifest]
    trigger: A planning snapshot is assembled.
    logic: "IF a snapshot includes dated inbound supply THEN read it from the Inventory-owned InboundSupplyCommitment rows with their own version, and reference Purchasing-owned order and approval state separately; never persist purchase orders as Inventory-owned records nor count open commitments as on-hand stock."
    violationBehaviour: "Reject snapshots that merge ownership or omit source versions."
    source: [FR6, FR8]

  - id: BR2.10
    statement: Product acquisition cost uses the retailer currency effective at acceptance.
    category: validation
    appliesTo: [Product, RetailerSettingVersion]
    trigger: A product or inventory source carrying cost is accepted.
    logic: "IF currency equals the retailer's immutable currency and cost is non-negative THEN preserve both value and setting version."
    violationBehaviour: "Reject currency mismatch; never convert silently."
    source: [FR3, FR11, FR12]

  - id: BR2.11
    statement: Currency becomes immutable after the first accepted monetary record.
    category: constraint
    appliesTo: [RetailerSettingVersion, Product]
    trigger: A retailer currency change is requested.
    logic: "IF no monetary record exists THEN a valid setting version may establish currency; otherwise the existing currency remains fixed."
    violationBehaviour: "Reject the change without relabeling historical or current money."
    source: [FR11]

  - id: BR2.12
    statement: Receipt posting is atomic across Purchasing and Inventory module effects.
    category: constraint
    appliesTo: [InventoryPosition, StockMovement, IdempotencyRecord, BusinessAuditRecord, OutboxMessage]
    trigger: A partial or complete receipt command is accepted by the shared deployment coordinator.
    logic: "IF authority, placement, order state, cumulative quantity, product/store ownership, expected stock version, and idempotency all validate for every line THEN commit receipt, order balances, stock movements, positions, both modules' audits, and outboxes once."
    violationBehaviour: "Reject or rollback the entire receipt; commit no line or event."
    source: [FR8, FR17, NFR7]

  - id: BR2.13
    statement: Dated inbound commitments change only through the C08 port under order-version and receipt invariants.
    category: constraint
    appliesTo: [InboundSupplyCommitment, InventoryPosition, StockMovement]
    trigger: Planning/Purchasing invokes createApprovedCommitments, cancelOpenCommitments, or recordReceipt.
    logic: "IF the caller supplies current retailer authority, placement generation and expected order version THEN apply the requested commitment effect inside the caller-owned transaction: create all approved lines or none; reject cancellation once any line of that order has a receipt; and post a receipt only while cumulative received quantity stays within the approved quantity, moving stock and reducing open quantity in the same commit."
    violationBehaviour: "Return the typed C08 conflict for stale placement generation, stale order version, idempotency-hash mismatch or over-receipt, and leave commitment, stock, audit and outbox unchanged."
    source: [FR6, FR8]

  - id: BR3.1
    statement: Inventory and demand imports use separate bounded UTF-8 CSV schemas.
    category: validation
    appliesTo: [ImportBatch]
    trigger: An import is submitted.
    logic: "IF inventory input is at most 2 MiB and 1,000 rows, or demand input is at most 25 MiB and 100,000 rows, and its required headers and encoding are valid THEN begin validation."
    violationBehaviour: "Reject before authoritative changes with a stable schema or limit code."
    source: [FR3, FR4, NFR11]

  - id: BR3.2
    statement: A batch is accepted atomically only after full validation.
    category: constraint
    appliesTo: [ImportBatch, ImportDiagnostic]
    trigger: File parsing and row validation finish.
    logic: "IF every row, reference, currency, quantity, local date, and source constraint is valid THEN commit the complete batch; otherwise accept none."
    violationBehaviour: "Mark rejected with bounded diagnostics and correction guidance; no partial authoritative state is permitted."
    source: [FR3, FR4, FR17]

  - id: BR3.3
    statement: Import results expose bounded actionable diagnostics and authority outcome.
    category: policy
    appliesTo: [ImportBatch, ImportDiagnostic]
    trigger: An import reaches accepted, rejected, or failed state.
    logic: "IF processing ends THEN return batch version, state, row/field codes, reasons, diagnostic truncation, resulting watermark when accepted, and correction or retry guidance."
    violationBehaviour: "Do not claim acceptance when authoritative commit is absent or uncertain."
    source: [FR3, FR4, NFR14]

  - id: BR3.4
    statement: Import sources and normalized content have immutable evidence.
    category: constraint
    appliesTo: [ImportBatch]
    trigger: An import is received.
    logic: "IF intake succeeds THEN generate a server-owned version and preserve raw source reference, raw digest, normalized digest, kind, retailer, store, and row count."
    violationBehaviour: "Fail intake before validation if evidence cannot be preserved."
    source: [FR3, FR20, NFR15]

  - id: BR3.5
    statement: Exact import replay returns the original result while corrected content creates a new version.
    category: constraint
    appliesTo: [ImportBatch, IdempotencyRecord]
    trigger: Content matching a prior import is submitted.
    logic: "IF current authority is revalidated and retailer, store, kind, and normalized digest match THEN return the prior outcome; if content differs, create a new immutable batch version."
    violationBehaviour: "Deny a caller whose authority was revoked and reject an idempotency key reused with a different request digest."
    source: [FR3, FR4, NFR7]

  - id: BR3.6
    statement: Import commit, movements or observations, audit, and outbox share one transaction.
    category: constraint
    appliesTo: [ImportBatch, StockMovement, DemandObservation, BusinessAuditRecord, OutboxMessage]
    trigger: A validated batch becomes authoritative.
    logic: "IF every business and evidence write succeeds THEN commit all together."
    violationBehaviour: "Rollback all writes and mark processing failed through a separate safe outcome when any required write fails."
    source: [FR17, NFR7]

  - id: BR3.7
    statement: Foreign retailer, store, product, or setting references cannot become authoritative.
    category: authorization
    appliesTo: [ImportBatch, Product, Store, RetailerSettingVersion]
    trigger: An import row or downstream source references Retail Data identifiers.
    logic: "IF every reference belongs to the authorized retailer and current placement THEN validate content."
    violationBehaviour: "Reject the entire batch without confirming foreign-resource existence."
    source: [FR2, FR3, NFR3]

  - id: BR3.8
    statement: U4 owns versioned retailer, store, product, currency, and calendar reference semantics.
    category: policy
    appliesTo: [Retailer, Store, Product, RetailerSettingVersion, OutboxMessage]
    trigger: A reference changes or another unit requests reference data.
    logic: "IF an authorized reference change commits THEN publish retail.reference.changed with current version and placement; consumers validate through U4 ports and never write U4 storage."
    violationBehaviour: "Reject stale or foreign reference requests and publish no event for a rolled-back change."
    source: [FR2, FR3, NFR7, NFR8]

  - id: BR4.1
    statement: Demand facts are immutable and source-versioned.
    category: constraint
    appliesTo: [DemandObservation, PromotionObservation, ImportBatch]
    trigger: A demand batch is accepted.
    logic: "IF rows validate THEN append observations carrying retailer, store, product, local date, source version, and setting version."
    violationBehaviour: "Reject the batch rather than update accepted observations in place."
    source: [FR3, FR5]

  - id: BR4.2
    statement: Corrections supersede effective observations while preserving lineage.
    category: constraint
    appliesTo: [DemandObservation, PromotionObservation]
    trigger: A later accepted batch contains an existing business key.
    logic: "IF the new version is valid THEN mark it effective and the prior observation superseded in the same transaction, retaining both and their link."
    violationBehaviour: "Reject concurrent or ambiguous correction without changing effective history."
    source: [FR3, FR5, FR17]

  - id: BR4.3
    statement: Sales, lost demand, promotions, and synthetic true demand remain separate.
    category: constraint
    appliesTo: [DemandObservation, PromotionObservation, SyntheticDemandTruth]
    trigger: Demand is imported, simulated, queried, or exported.
    logic: "IF true observed demand is needed THEN calculate sales plus lost demand while retaining both components; never substitute it for either component."
    violationBehaviour: "Reject schemas or exports that collapse the required provenance."
    source: [FR3, FR12]

  - id: BR4.4
    statement: Synthetic latent truth is available only to explicit evaluation-purpose contracts.
    category: authorization
    appliesTo: [SyntheticDemandTruth, RetailDataSnapshotManifest]
    trigger: A consumer requests synthetic truth.
    logic: "IF caller, scope, retailer, dataset purpose, and evaluation contract are all authorized THEN return the named truth version; training, operational, and assistant purposes remain denied."
    violationBehaviour: "Deny without exposing truth values and record the attempted purpose."
    source: [FR3, FR12, NFR3]

  - id: BR4.5
    statement: Daily demand uses the retailer-local date derived from the effective time-zone version.
    category: calculation
    appliesTo: [DemandObservation, PromotionObservation, RetailerSettingVersion]
    trigger: A timestamped fact is assigned to a business date.
    logic: "IF a UTC instant is accepted THEN resolve its local date using the setting version effective for that instant, including DST transitions."
    violationBehaviour: "Reject absent, ambiguous, overlapping, or retroactive setting resolution."
    source: [FR11]

  - id: BR4.6
    statement: Time-zone changes are versioned and future-effective at a retailer-local day boundary.
    category: constraint
    appliesTo: [RetailerSettingVersion]
    trigger: A time-zone change is requested.
    logic: "IF the effective boundary is future, non-overlapping, and maps to the first instant of the selected local date THEN append a new setting version."
    violationBehaviour: "Reject retroactive or overlapping changes and preserve historical local dates."
    source: [FR11, FR20]

  - id: BR4.7
    statement: Reproducible demand generation preserves stockout and zero-demand truth.
    category: calculation
    appliesTo: [DemandObservation, SyntheticDemandTruth, StockMovement]
    trigger: A synthetic retail day is generated.
    logic: "IF latent demand is 10 and available stock is 6 THEN record sales 6 and lost demand 4; if demand is zero THEN record both as zero."
    violationBehaviour: "Fail the fixture verification rather than publish inconsistent truth."
    source: [FR3, FR12, NFR11]

  - id: BR4.8
    statement: Temporal data exports include only facts available at their declared cutoff.
    category: authorization
    appliesTo: [DemandObservation, PromotionObservation, RetailDataSnapshotManifest]
    trigger: Forecasting or model evaluation requests a dated snapshot.
    logic: "IF an observation or promotion was effective and known by the cutoff THEN include its named version; exclude later corrections and latent truth unless evaluation purpose explicitly permits it."
    violationBehaviour: "Reject an export with missing cutoff, source version, or authorized purpose."
    source: [FR5, FR12, NFR15]

  - id: BR5.1
    statement: Cache keys are server-built from retailer, placement generation, schema version, entity version, and query shape.
    category: constraint
    appliesTo: [RetailerPlacement, InventoryPosition, RetailDataSnapshotManifest]
    trigger: An eligible Retail Data view is read or cached.
    logic: "IF the authoritative query succeeds THEN derive a key only from verified server context and version metadata."
    violationBehaviour: "Bypass or reject unsafe cache access; never accept client-selected tenant key components."
    source: [FR19, NFR3]

  - id: BR5.2
    statement: A stale fill cannot replace or masquerade as a newer cache version.
    category: constraint
    appliesTo: [InventoryPosition, RetailDataSnapshotManifest]
    trigger: A cache fill races with a committed change.
    logic: "IF the fill's version still equals the authoritative compare-and-set version pointer THEN publish it; otherwise discard it."
    violationBehaviour: "Return or reload current authoritative data and never label the stale value current."
    source: [FR19]

  - id: BR5.3
    statement: Eligible cache entries expire after 60 seconds and committed changes emit invalidation evidence.
    category: policy
    appliesTo: [InventoryPosition, OutboxMessage]
    trigger: A cacheable view is stored or authoritative data changes.
    logic: "IF stored THEN bound it to 60 seconds and expose data version and observation time; IF data changes THEN append an invalidation event with the business outbox."
    violationBehaviour: "Treat missing invalidation as recoverable through version and expiry checks, never as authority."
    source: [FR19, NFR7]

  - id: BR5.4
    statement: Redis outage or cold start preserves correctness and bounds fallback load.
    category: policy
    appliesTo: [InventoryPosition, Membership, RetailerPlacement]
    trigger: Cache data is absent, unavailable, corrupt, or expired.
    logic: "IF authoritative reads remain healthy THEN use request coalescing and load protection to read them; all authorization and mutations bypass cache authority."
    violationBehaviour: "Return an explicit degraded or unavailable result before overloading the authoritative store."
    source: [FR19, NFR2, NFR3]

  - id: BR6.1
    statement: Every downstream dataset or evidence view is identified by an immutable snapshot manifest.
    category: constraint
    appliesTo: [RetailDataSnapshotManifest]
    trigger: Forecasting, evaluation, replenishment, assistant, or recovery data is assembled.
    logic: "IF a consistent authorized view is available THEN bind retailer, placement generation, source versions, inventory watermark, local-date range, creation time, purpose, and content digest."
    violationBehaviour: "Return unavailable rather than emit an incomplete or mutable snapshot identity."
    source: [FR5, FR6, FR12, FR14, FR20]

  - id: BR6.2
    statement: Consumers request the current snapshot or an explicit existing version through an authorized port.
    category: authorization
    appliesTo: [RetailDataSnapshotManifest]
    trigger: A downstream consumer requests Retail Data.
    logic: "IF authority, retailer, purpose, placement generation, and requested version are valid THEN return bounded data and manifest."
    violationBehaviour: "Return hidden-not-found for foreign data or conflict for unavailable, stale, archived, or purged named versions; never substitute another version."
    source: [FR5, FR6, FR14, NFR3]

  - id: BR6.3
    statement: Planning snapshots version Inventory on-hand and Inventory-owned dated inbound commitments independently.
    category: constraint
    appliesTo: [RetailDataSnapshotManifest, InventoryPosition]
    trigger: A replenishment input snapshot is composed.
    logic: "IF both inputs are current THEN identify the Inventory movement watermark and the dated inbound commitment version independently, alongside forecast, terms, and policy versions, and carry the referenced Purchasing order version without copying order state."
    violationBehaviour: "Return explicit stale or unavailable input category and produce no usable recommendation snapshot."
    source: [FR6, FR9]

  - id: BR6.4
    statement: Forecast and model consumers cannot access Retail Data storage directly.
    category: authorization
    appliesTo: [RetailDataSnapshotManifest, DemandObservation, InventoryPosition]
    trigger: A data export or artifact request is made.
    logic: "IF the machine caller is authorized THEN serve the versioned bounded contract; storage credentials and direct records remain inaccessible."
    violationBehaviour: "Deny direct or foreign access without producing an export."
    source: [NFR3, NFR4, NFR8]

  - id: BR6.5
    statement: Assistant inventory and demand tools return bounded authorized facts with evidence versions.
    category: authorization
    appliesTo: [InventoryPosition, StockMovement, DemandObservation, RetailDataSnapshotManifest]
    trigger: An assistant tool invokes Retail Data.
    logic: "IF the current human, retailer, role, placement, resource, range, and tool purpose are valid THEN return only bounded facts and evidence identifiers."
    violationBehaviour: "Reject model-selected authority, foreign products, excessive ranges, and unavailable evidence without invented values."
    source: [FR14, NFR3, NFR8]

  - id: BR6.6
    statement: Supplier consumers resolve products, retailer currency, and reference versions through U4 authority.
    category: authorization
    appliesTo: [Product, RetailerSettingVersion, RetailDataSnapshotManifest]
    trigger: Supplier ingestion, acceptance, retrieval, or planning validates a Retail Data reference.
    logic: "IF the product and currency belong to the authorized retailer and named reference version THEN return the bounded reference."
    violationBehaviour: "Reject foreign, retired, mismatched-currency, or stale references; supplier content cannot override U4."
    source: [FR10, FR11, NFR3]

  - id: BR6.7
    statement: Evaluation snapshots preserve common exogenous inputs and explicit exclusions.
    category: policy
    appliesTo: [RetailDataSnapshotManifest, SyntheticDemandTruth, Product]
    trigger: Forecast or inventory-policy evaluation data is requested.
    logic: "IF the evaluation purpose is authorized THEN bind products, dates, demand truth, initial stock, acquisition costs, and source versions so candidates share the same exogenous scenario."
    violationBehaviour: "Reject incomparable snapshots and expose missing or excluded counts rather than silently changing the population."
    source: [FR12, NFR15]

  - id: BR6.8
    statement: Inventory valuation remains per retailer currency and excludes inbound and revenue.
    category: calculation
    appliesTo: [InventoryPosition, Product, RetailDataSnapshotManifest]
    trigger: Closing on-hand value input is assembled for evaluation.
    logic: "IF each position has a fixed versioned acquisition cost THEN value closing on-hand in that retailer's currency, include zero-stock days, and never aggregate currencies."
    violationBehaviour: "Report metric unavailable when cost or currency lineage is absent."
    source: [FR11, FR12]

  - id: BR7.1
    statement: Accepted business mutation, authoritative audit, and outbox records commit atomically.
    category: constraint
    appliesTo: [BusinessAuditRecord, OutboxMessage]
    trigger: A membership, setting, placement, product, inventory, demand, snapshot, or receipt mutation is accepted.
    logic: "IF every required state, audit, and outbox write succeeds THEN commit once with actor, tenant, target, outcome, provenance, correlation, idempotency, and placement generation."
    violationBehaviour: "Rollback the business mutation when audit or outbox write fails."
    source: [FR17, NFR7]

  - id: BR7.2
    statement: Rejected privileged attempts use a separate immutable bounded audit record.
    category: policy
    appliesTo: [BusinessAuditRecord]
    trigger: Authorization or domain validation rejects a privileged attempt before business commit.
    logic: "IF safe retailer and actor context is known THEN record rejection without foreign values in an independent transaction."
    violationBehaviour: "Operational logging failure cannot convert rejection into acceptance or expose protected data."
    source: [FR17, NFR10]

  - id: BR7.3
    statement: Outbox publication is at-least-once with confirms and bounded retry.
    category: policy
    appliesTo: [OutboxMessage]
    trigger: A pending outbox message is relayed.
    logic: "IF publication is confirmed THEN mark published; otherwise retry within the configured bound using the same message identity."
    violationBehaviour: "Move exhausted publication to observable dead-letter handling without rolling back committed business state."
    source: [NFR7]

  - id: BR7.4
    statement: Consumers deduplicate messages and acknowledge only after inbox and business commit.
    category: constraint
    appliesTo: [InboxReceipt]
    trigger: A message is delivered or redelivered.
    logic: "IF message identity, retailer, authority, placement, and digest validate THEN commit inbox and any business effect once before acknowledgement; exact redelivery returns prior completion."
    violationBehaviour: "Reject mismatch, retry transient failure, or dead-letter exhausted failure without duplicate effects."
    source: [NFR7]

  - id: BR7.5
    statement: Event contracts preserve canonical tenant, actor, correlation, causation, idempotency, and placement metadata.
    category: validation
    appliesTo: [OutboxMessage, InboxReceipt]
    trigger: An event is created or consumed.
    logic: "IF required envelope metadata and supported schema version validate THEN process under server-resolved authority."
    violationBehaviour: "Reject invalid examples or messages and perform no business effect."
    source: [NFR7, NFR8]

  - id: BR7.6
    statement: U4 publishes tenant, inventory, demand, and reference lifecycle events; downstream indexes remain projections.
    category: policy
    appliesTo: [OutboxMessage, BusinessAuditRecord]
    trigger: An authoritative U4 mutation commits.
    logic: "IF the change is externally relevant THEN publish the U4-owned event semantics; consumers may rebuild but cannot feed projection state back as authority."
    violationBehaviour: "Reject attempts to overwrite U4 state from audit, cache, search, or vector projections."
    source: [FR17, FR19, NFR7]

  - id: BR7.7
    statement: Audit projection replay does not duplicate authoritative event identity.
    category: constraint
    appliesTo: [BusinessAuditRecord, OutboxMessage]
    trigger: Audit Evidence consumes or rebuilds from U4 events.
    logic: "IF an event ID was already projected THEN retain one projection result; U4 remains authoritative during projection outage."
    violationBehaviour: "Expose projection lag or unavailability rather than duplicate or silently omit authority."
    source: [FR17, NFR7, NFR9]

  - id: BR7.8
    statement: Runtime behavior cannot update or delete accepted audit and outbox history.
    category: authorization
    appliesTo: [BusinessAuditRecord, OutboxMessage]
    trigger: A runtime mutation targets audit or outbox history.
    logic: "IF the caller is ordinary runtime behavior THEN only append and controlled relay transitions are permitted; retention authority is separate."
    violationBehaviour: "Deny direct update, delete, and foreign-tenant access."
    source: [FR17, NFR4, NFR9]

  - id: BR7.9
    statement: U4's service-local publisher implements C23 without an U14 runtime dependency.
    category: validation
    appliesTo: [OutboxMessage, BusinessAuditRecord]
    trigger: A U4 audit, reference, inventory or demand event is published or replayed.
    logic: "IF the closed tenant C01 envelope, authenticated producer binding, RFC 8785 data digest, 65,536-byte serialized limit, confirm, five-delivery retry, seven-day DLQ, authorized replay and telemetry rules pass THEN relay the committed outbox identity; U3 global identity events use a different owner/profile."
    violationBehaviour: "Fail the U4 publication capability closed for invalid envelope or missing applicable C22 conformance evidence; keep business outbox state durable."
    source: [C01, C15, C22, C23, AC8.2.4, AC8.5.3]

  - id: BR7.10
    statement: U4 supplies its own versioned C22 fixture results to U13.
    category: validation
    appliesTo: [OutboxMessage, InboxReceipt]
    trigger: U4 claims audit-delivery or reliable-work acceptance.
    logic: "IF every applicable tenant publisher fixture and owner consumer duplicate, conflict, stale-authority and crash schedule passes against U4 state THEN publish separately attributed U4 evidence."
    violationBehaviour: "Do not substitute U14 package fixtures or a representative consumer pass for U4's own result."
    source: [C22, C23, AC8.2.4, AC8.5.2, AC8.5.4]

  - id: BR8.1
    statement: Tenant extraction begins by draining new mutations and active work for only the selected retailer.
    category: constraint
    appliesTo: [RetailerPlacement, PlacementTransition]
    trigger: An authorized extraction starts.
    logic: "IF no transition is active THEN enter draining with a new generation, stop new selected-tenant mutations, and allow other retailers to continue."
    violationBehaviour: "Reject concurrent transition or new selected-tenant mutation with explicit status."
    source: [FR20, NFR3]

  - id: BR8.2
    statement: Extraction copies and verifies a consistent tenant snapshot and pending outbox state before cutover.
    category: constraint
    appliesTo: [PlacementTransition, RetailDataSnapshotManifest, OutboxMessage]
    trigger: Draining reaches a stable watermark.
    logic: "IF authoritative records, source versions, checksums, counts, ledger balances, audit links, and pending outbox through the watermark match at the destination THEN mark validated."
    violationBehaviour: "Remain off the destination, mark failed evidence, and resume or retry under controlled recovery."
    source: [FR20, NFR15]

  - id: BR8.3
    statement: Validated cutover atomically changes target and generation and invalidates old cache routing.
    category: constraint
    appliesTo: [RetailerPlacement, PlacementTransition, OutboxMessage]
    trigger: An Operator commits a validated transition.
    logic: "IF copied evidence remains current THEN switch target, increment generation, publish routing/cache invalidation, and resume new work at the destination."
    violationBehaviour: "Reject stale validation and keep the prior active target."
    source: [FR20, FR19, NFR3]

  - id: BR8.4
    statement: Rollback is allowed only before the first destination write.
    category: constraint
    appliesTo: [PlacementTransition, RetailerPlacement]
    trigger: A cutover rollback is requested.
    logic: "IF no destination business write has committed THEN restore prior target under a new generation; otherwise recovery requires another forward transition."
    violationBehaviour: "Reject unsafe rollback that could create divergent authorities."
    source: [FR20]

  - id: BR8.5
    statement: Backups and restores preserve tenant identity, ledger integrity, source lineage, audit links, and outbox state.
    category: constraint
    appliesTo: [Retailer, InventoryPosition, StockMovement, ImportBatch, DemandObservation, BusinessAuditRecord, OutboxMessage]
    trigger: A backup is created or restored.
    logic: "IF protected backup validation, counts, checksums, tenant ownership, stock reconciliation, and source provenance all match THEN the restored store may become eligible for use."
    violationBehaviour: "Fail closed and do not declare recovery for corrupt, incomplete, or mismatched data."
    source: [FR20, NFR15]

  - id: BR8.6
    statement: Restored data is reconciled with retention before exposure.
    category: policy
    appliesTo: [BusinessAuditRecord, RetailDataSnapshotManifest, ImportBatch]
    trigger: A restored environment is prepared for access.
    logic: "IF records expired under the current policy THEN complete controlled expiry reconciliation before serving reads or rebuilding projections."
    violationBehaviour: "Keep the restored environment unavailable until reconciliation succeeds."
    source: [FR20, NFR9]

  - id: BR8.7
    statement: Business APIs do not hard-delete accepted Retail Data history.
    category: policy
    appliesTo: [Membership, MembershipRole, RetailerPlacement, Product, StockMovement, ImportBatch, DemandObservation, PromotionObservation, RetailDataSnapshotManifest]
    trigger: Deletion or correction is requested.
    logic: "IF business history is accepted THEN use retirement, revocation, supersession, or compensation while preserving identity and lineage."
    violationBehaviour: "Reject hard deletion through business authority."
    source: [FR17, FR20, NFR9]

  - id: BR8.8
    statement: Archival and purge require controlled policy authority and reference checks.
    category: authorization
    appliesTo: [StockMovement, ImportBatch, DemandObservation, BusinessAuditRecord, RetailDataSnapshotManifest]
    trigger: A retention job requests archival or purge.
    logic: "IF retention policy, legal-hold status, referential checks, backup-expiry rules, and operator authority permit THEN apply the declared action with audit evidence."
    violationBehaviour: "Retain records and report the blocking reference or hold category."
    source: [NFR9, NFR15]

  - id: BR8.9
    statement: U4 Tenant Directory C24 prepare durably fences membership, placement and topology writes before success.
    category: constraint
    appliesTo: [RetailRecoveryParticipantState, RetailRecoveryCommandResult, RetailerPlacement]
    trigger: U15's authenticated registered coordinator submits prepare.
    logic: "IF participant tenant-directory, synchronous C24 route, coordinator, roster, policy, required headers, retailer, current placement and monotonic recovery generation validate THEN atomically persist the Tenant Directory state, membership/placement/topology fence and exact result before 200. Inventory and Demand History use separate C25 participants."
    violationBehaviour: "Reject typed 401/403/409/422, or 503 on persistence failure; no uncommitted success or unfenced Tenant Directory write."
    source: [C24, AC9.11.1]

  - id: BR8.10
    statement: Tenant Directory C24 close binds its own durable checkpoint and digest while its fence remains held.
    category: validation
    appliesTo: [RetailRecoveryParticipantState, RetailRecoveryCommandResult, OutboxMessage, InboxReceipt]
    trigger: U15 submits close after a prepared U4 participant.
    logic: "IF Tenant Directory's owned PostgreSQL transaction/LSN, placement/membership/recovery-generation state, audit/outbox cursors and checkpoint digest reconcile THEN persist the class-A closed result; U15/U2 assemble separate Inventory, Demand History, Purchasing and broker evidence."
    violationBehaviour: "Deny close without matching durable evidence; never claim the whole cut from a U4 result."
    source: [C24, AC9.11.2]

  - id: BR8.11
    statement: C24 abort and resume preserve terminal guards and local reconciliation across retry and restart.
    category: constraint
    appliesTo: [RetailRecoveryParticipantState, RetailRecoveryCommandResult]
    trigger: Abort, delayed prepare, resume or process restart occurs.
    logic: "IF abort precedes observed prepare THEN persist a Tenant Directory terminal guard that suppresses delayed prepare/close. Resume clears only this run's membership/placement/topology fence after its own generation, grant, placement, audit/outbox and checkpoint evidence reconcile."
    violationBehaviour: "Keep unresolved participants fenced and return typed reconciliation or fence-unresolved result; no coordinator-wide success inference."
    source: [C24, AC9.11.3]

  - id: BR8.12
    statement: C24 command identity and deadline are durable and exact.
    category: constraint
    appliesTo: [RetailRecoveryParticipantState, RetailRecoveryCommandResult]
    trigger: A prepare, close, abort, resume or retry is received.
    logic: "IF tenant-directory/retailer/run, command ID, idempotency key and canonical request match a stored C24 result THEN return its exact status/body; a changed retry is 409. Observe Tenant Directory's class-A 30/30/30/60-second limits and U15's global phase deadline."
    violationBehaviour: "Return 503 when durable state/result cannot commit; a timeout remains fenced and cannot reset the logical deadline."
    source: [C24, AC9.11.3]

  - id: BR8.13
    statement: U4 recovery participants accept commands only from the registered U15 coordinator; inspection remains non-destructive.
    category: authorization
    appliesTo: [RetailRecoveryParticipantState, RetailRecoveryCommandResult, RetailAsyncRecoveryParticipantState, RetailAsyncRecoveryCommandResult]
    trigger: C24 or C25 status or mutation is requested.
    logic: "IF U15's narrow authenticated workload and scope authorize the registered C24 or C25 command THEN process it under current retailer/placement context; only read-only validation may continue while the owning module is fenced without creating a required authoritative event. U15 owns explicit human confirmation."
    violationBehaviour: "Deny unauthorized or stale mutation without a participant effect; do not turn retailer Operator role into platform grant."
    source: [C24, C25, C26, AC9.11.4]

  - id: BR8.14
    statement: Inventory is a separate C25 participant with its own write fence and stock checkpoint.
    category: constraint
    appliesTo: [RetailAsyncRecoveryParticipantState, RetailAsyncRecoveryCommandResult, InventoryPosition, StockMovement]
    trigger: U15 dispatches an inventory prepare, close, abort or resume command.
    logic: "IF the registered inventory C25 command arrives on stocksense.recovery.command.v1.inventory with current retailer/placement/recovery generation and class B prepare/close/abort/resume deadlines of 60/60/60/120 seconds THEN persist its own monotonic command state and fence product, stock, inventory import, receipt-stock mutation and affected relay/consumer work before acknowledging. Close binds stock conservation, position watermark and inbox/outbox checkpoint; resume clears only after Inventory reconciliation."
    violationBehaviour: "Reject an inventory registration with any class other than B before prepare. Publish no success acknowledgement before durable state/fence/checkpoint commit; keep uncertain Inventory work fenced and never claim Tenant Directory or Purchasing completion."
    source: [C25, C26, AC9.11.1, AC9.11.2, AC9.11.3]

  - id: BR8.15
    statement: Demand History is a separate C25 participant with its own write fence and source checkpoint.
    category: constraint
    appliesTo: [RetailAsyncRecoveryParticipantState, RetailAsyncRecoveryCommandResult, DemandObservation, PromotionObservation]
    trigger: U15 dispatches a demand-history prepare, close, abort or resume command.
    logic: "IF the registered demand-history C25 command arrives on stocksense.recovery.command.v1.demand-history with current retailer/placement/recovery generation and class C prepare/close/abort/resume deadlines of 120/180/60/180 seconds THEN persist its own monotonic command state and fence demand/promotion observations, demand import and affected relay/consumer work before acknowledging. Close binds source/observation versions, local-date lineage and inbox/outbox checkpoint; resume clears only after Demand History reconciliation."
    violationBehaviour: "Reject a demand-history registration with any class other than C before prepare. Publish no success acknowledgement before durable state/fence/checkpoint commit; keep uncertain Demand History work fenced and never claim Inventory or Tenant Directory completion."
    source: [C25, C26, AC9.11.1, AC9.11.2, AC9.11.3]

  - id: BR8.16
    statement: Both U4 C25 participants preserve command and acknowledgement identity across retry, abort and restart.
    category: constraint
    appliesTo: [RetailAsyncRecoveryParticipantState, RetailAsyncRecoveryCommandResult, OutboxMessage, InboxReceipt]
    trigger: A C25 command is delivered, retried, delayed or acknowledged.
    logic: "IF authenticated C01 envelope context and registered participant, route, roster, policy, class deadline and command ID match THEN persist one exact result and publish its stable acknowledgement to stocksense.recovery.acknowledgement.v1 with causationId equal to command messageId. Exact retries return that result; changed content conflicts; abort-before-prepare suppresses a delayed prepare; restart reloads guards before writes resume."
    violationBehaviour: "Reject stale, changed or unauthorized commands; retain an unresolved fence on timeout or persistence failure, and never fabricate a success acknowledgement."
    source: [C01, C25, C26, AC9.11.1, AC9.11.3]

  - id: BR9.1
    statement: The reproducible fixture contains three isolated retailers, one store and 100 products each, and 18 months of history.
    category: policy
    appliesTo: [Retailer, Store, Product, InventoryPosition, DemandObservation, PromotionObservation, SyntheticDemandTruth]
    trigger: The demo scenario is generated.
    logic: "IF the same scenario seed and configuration version are used THEN identifiers, inventory, sales, lost demand, promotions, supplier reference inputs, and source digests reproduce."
    violationBehaviour: "Fail fixture verification when counts or checksums differ."
    source: [FR3, NFR11, NFR15]

  - id: BR9.2
    statement: Demo retailers use fixed diverse currency and time-zone profiles.
    category: policy
    appliesTo: [RetailerSettingVersion]
    trigger: Demo retailer settings are seeded.
    logic: "IF the three fixtures are created THEN assign ILS/Asia-Jerusalem, USD/America-New_York, and EUR/Europe-Berlin and include DST-boundary dates."
    violationBehaviour: "Fail seed verification for noncanonical or mismatched settings."
    source: [FR11, NFR11]

  - id: BR9.3
    statement: Retail Data exposes explicit accepted, rejected, pending, failed, stale, degraded, and unavailable outcomes where applicable.
    category: policy
    appliesTo: [ImportBatch, RetailDataSnapshotManifest, PlacementTransition, InventoryPosition]
    trigger: A user or consumer queries an operation or view.
    logic: "IF state is known THEN return stable status, version, observation time, safe reasons, and recovery action; never label stale or failed data current."
    violationBehaviour: "Return unavailable with correlation evidence instead of a false success."
    source: [NFR14, NFR15]

  - id: BR9.4
    statement: U4 contracts define payloads, tenant authority, errors, examples, and compatibility for every REST and async boundary.
    category: validation
    appliesTo: [ImportBatch, RetailDataSnapshotManifest, OutboxMessage, InboxReceipt]
    trigger: A boundary is introduced or changed.
    logic: "IF its OpenAPI or AsyncAPI schema and examples validate and the compatibility policy passes THEN the boundary may be consumed."
    violationBehaviour: "Block the applicable change on invalid examples or incompatible schemas."
    source: [NFR8, NFR13]

  - id: BR9.5
    statement: Retail Data and Planning/Purchasing share one v1 transaction-capable deployment while retaining logical ownership.
    category: policy
    appliesTo: [InventoryPosition, StockMovement, BusinessAuditRecord, OutboxMessage]
    trigger: Receipt behavior or module extraction is designed.
    logic: "IF running v1 THEN coordinate through public module ports and owned routines in one transaction; no module reads or writes another module's private records."
    violationBehaviour: "Reject a receipt design that splits the atomic invariant or bypasses module ownership."
    source: [FR8, NFR4, NFR8]

  - id: BR9.6
    statement: Public REST boundaries remain extraction seams and cannot weaken v1 atomic behavior.
    category: policy
    appliesTo: [InventoryPosition, StockMovement, RetailDataSnapshotManifest]
    trigger: A module is called externally or considered for separate deployment.
    logic: "IF a read is external THEN use the versioned contract; IF receipt modules are separated later THEN first replace the atomic requirement with an explicitly approved consistency design."
    violationBehaviour: "Do not route v1 receipt commit across a non-atomic network boundary."
    source: [FR8, NFR8, NFR15]

  - id: BR9.7
    statement: U4 provider contracts and reviewer evidence include C24/C25 and C22/C23 contributions.
    category: validation
    appliesTo: [RetailRecoveryParticipantState, RetailAsyncRecoveryParticipantState, OutboxMessage, InboxReceipt]
    trigger: U1 validates the package or U13 evaluates the reviewer profile.
    logic: "IF U4 provider-owned tenant-directory C24 commands/problems, separate inventory and demand-history C25 command/acknowledgement examples, tenant C01/C15 schemas, security/idempotency rules, compatibility and applicable C22 results are complete THEN U13 may attribute U4 evidence; U4 reports measured clean-run timing contribution only."
    violationBehaviour: "Block U4 acceptance on missing provider contracts or evidence; U13 alone assesses complete three-run 90-minute and 45-minute limits."
    source: [C01, C15, C22, C24, C25, AC8.2.4, AC10.1.5]
```

## Rules summary

| Rule range | Concern | Result |
| --- | --- | --- |
| BR1.1-BR1.10 | Tenant authority and placement | Every call revalidates explicit membership, role, machine authority, and current placement generation. |
| BR2.1-BR2.12 | Catalog, stock, and receipts | Immutable identities and movements conserve non-negative stock; receipt effects commit once across the shared deployment. |
| BR3.1-BR3.8 | Imports and references | Bounded all-or-nothing inputs retain immutable evidence and publish U4-owned reference changes. |
| BR4.1-BR4.8 | Demand and calendar | Source lineage, local dates, observed demand components, and protected synthetic truth remain distinct. |
| BR5.1-BR5.4 | Redis | Versioned cache-aside behavior may degrade, but never becomes authority. |
| BR6.1-BR6.8 | Downstream data | Immutable authorized snapshots preserve versions, purpose, ownership, and evaluation comparability. |
| BR7.1-BR7.10 | Audit and messaging | Business, audit, and outbox writes are atomic; U4's service-local C23 publisher and consumer behavior have separate C22 evidence. |
| BR8.1-BR8.16 | Extraction, restore, recovery, retention | Draining and verified generation cutover preserve one authority; Tenant Directory C24 and separate Inventory/Demand History C25 participants retain their own durable fences, checkpoints and exact results. |
| BR9.1-BR9.7 | Demo and boundaries | Diverse deterministic fixtures, complete U4 provider contracts and measured contributions make reviewer evidence reproducible. |
