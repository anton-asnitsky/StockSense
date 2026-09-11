**Collaborator:** aidlc-developer-agent

## Contribution

Reviewed all 58 stories, personas, epic/feature map, confirmed story questions, requirements and active inception rules. This is an independent round-1 contribution; no other contribution was read. The following are proposed repairs to the story baseline, not new scope, implementation findings or owner decisions.

### D1 — Before approval: express acceptance criteria as executable scenarios

The active inception rules and confirmed story plan require Given/When/Then. Every story currently has three declarative criteria, often combining several different triggers. Preserve existing AC IDs when rewriting; assign additional IDs when separating scenarios. Name the initial state, actor/authority, triggering operation and observable result. Shared obligations remain applicable, but each story should identify the obligations it actually exercises.

Concrete replacements:

- **AC6.5.1**: Given an authorized planner or manager and an Approved order with one line of quantity 10 and no receipts, when a receipt of 6 is accepted, then the order becomes PartiallyReceived and receipt, stock-ledger increase of 6, order version, audit and outbox commit together.
- **AC5.4.3**: Given an accepted manual-review job that consumed a slot on retailer-local date D and subsequently failed, when that same job is retried on D+1, then its original charge is retained and no slot on D+1 is consumed. Separate preacceptance rejection into another criterion.
- **AC2.3.3**: Given a session authorized only for retailer A, when it requests retailer B's product history by identifier, then no inventory or movement data for B is returned.

BDD acceptance wording does not select a code-generation testing methodology or replace the later approved Testing Contract.

### D2 — Before approval: make sales-history import coverage explicit

FR3 requires generating **and importing sales, inventory and supplier data**. US2.1 covers generation; US2.2 explicitly covers inventory imports; US3.1 covers supplier offers. No story explicitly accepts imported sales history. A generic FR3 mapping or the shared statement that requirements remain authoritative does not give the forecasting implementer a demonstrable sales-input outcome.

Add a small story under FE02.02, with a new stable ID, for importing generated sales history; retain US2.2 for inventory. Suggested story: "As a Planner, I want to import versioned sales history, so that forecasts use reproducible observed records."

Suggested scenarios: given valid generated history for an authorized retailer, import preserves product/local-date/source-version records and observed sales separately from synthetic lost-demand evaluation truth; replay produces no duplicate history or stock effects; malformed or foreign-retailer input returns an explicit outcome without unauthorized writes. Reference FR3/FR11 and US4.2's prohibition on latent-demand leakage. Choose schema and malformed-batch handling during design; do not invent either here. Make US4.1 depend on this accepted input capability and identify the initial supplier-data fixture from US2.1 used by US5.1.

### D3 — Before approval: distinguish foundation acceptance from release-wide verification

The explicit dependency list has no obvious story-ID cycle, but several prerequisite stories require evidence from capabilities delivered much later:

- US9.1 is required by US2.1/US2.2 and US6.1, while AC9.1.1 requires auditing purchasing, model promotion and agent actions. Completing all of US9.1 first would require its consumers to exist first.
- US8.2 precedes imports and messaging but AC8.2.1/2 covers every REST and async boundary, including later tools/jobs.
- US8.5 precedes receipts, while AC8.5.2 requires stock-effect failure evidence supplied by the receipt/import consumers.

Integrable fix: scope each foundation story's initial acceptance to a representative implemented vertical flow, with its reusable contract/audit/messaging capability tested. Explicitly allocate each remaining integration scenario to the consuming story and retain a final all-flows coverage check. Each consumer must prove its own atomicity, authorization and contract obligations before acceptance. Label dependency entries as capability prerequisites versus final integration evidence; this avoids falsely completing release-wide coverage early.

Also resolve two concrete boundaries:

- US5.1 needs accepted supplier constraints, but depends only on US4.1. Explicitly use the versioned synthetic supplier terms already required by FR3 for the first purchasing slice. Keep CSV/PDF extraction as the later supplier-information slice; do not accidentally make purchasing depend on PDF ingestion through US3.3 -> US3.2.
- US7.4's AC7.4.1 already includes draft tools although draft integration belongs to US7.10, which depends on US7.4. Bound US7.4 to a representative authorized read conversation and tool-control contract; prove calculations, drafting and manual-review mutations in US7.8-10 with US7.11's applicable retry safeguards present from their first mutation.

### D4 — Before approval: replace boilerplate INVEST claims with concrete boundaries

Every story repeats the same INVEST assertion and defers splitting to Delivery Planning. That supplies no evidence of smallness or independent testability. No duration estimate is needed now, but broad independent outcomes should be separated or explicitly identified as integration checks rather than ordinary implementation stories.

Prioritized proposed splits, preserving the approved requirements and feature IDs:

- **US4.3 / FE04.02**: separate temporal forecast scoring from chronological inventory-policy simulation. They have different inputs, algorithms and acceptance fixtures; both consume US4.2's versioned datasets. Keep the existing hand-check examples with their respective outcome.
- **US7.2 / FE07.02**: separate authorized retrieval from index lifecycle/rebuild. Preserve wrong-model, cross-tenant and deleted-source denial in the initial retrieval story; lifecycle work adds reindex, cutover, rollback and retained-source rebuild evidence.
- **US9.6 / FE09.03**: distinguish backup/restore capability from the final integrated recovery exercise. Its current three criteria span multiple stores, identity, artifacts, projections, broker replay and rollback. Name the restore fixture and reconciliation evidence for each dependency; reserve the integrated exercise for proving that those capabilities work together.

For each resulting story, replace the generic INVEST paragraph with its concrete test fixture, prerequisite capability and completion boundary. Update story count, map and traceability if splits are integrated; preserve existing IDs where their meaning remains unchanged.

### Decisions that may remain open

OQ1-OQ10 are disclosed point-of-use decisions, not defects merely because values are absent. Do not select a model, buffer default, freshness threshold, CSV limit, recovery objective or cloud service in this review. Keep named affected stories and original deadlines; resolve values before their required implementation/acceptance point. OQ9 remains a later multilingual increment. Final resource proof in US9.4 does not replace early feasibility work, as the draft already states. The personas and all-Must-Have release boundary need no change from this implementability review.

### Round 2 disposition — all prior objections resolved

The D1-D4 sections above preserve the round-1 findings, not current dissent. Rechecked the revised 63-story baseline and affected traceability mappings and assessment. Read only the Positions sections of the design and quality contributions as permitted for round 2. Their round-1 objections were treated as review context, not as evidence that the revised draft still contains those defects.

Final same-round wording check: re-read the current trigger changes in `stories.md` (SHA-256 `99e744b597396b373d5723b8261618f2d3d4d0ac8d1f97e6c27c84c1eb8e84bb`). All 215 criteria retain Given/When/Then and none retains "scenario is exercised". The inspected login, read, submission, manager decision, receipt, retry and recovery criteria now name their triggering actions explicitly. This strengthens D1's resolution; the D1-D4 dispositions and final agreement below remain unchanged. This is the final check within round 2, not a new review round.

| Finding | Disposition | Evidence in the revised draft |
| --- | --- | --- |
| D1: Scenario form and boundaries | Resolved | All 215 AC lines contain Given/When/Then. Concrete contexts now accompany the outcomes; AC5.4.4-7 isolate quota races, authorized replay, cross-midnight charging and unavailable forecasts. AC6.4.3 and AC6.5.4-6 make cancellation races, whole-receipt rejection and uncertain outcomes observable. Shared acceptance anchors require evidence from each consumer. |
| D2: Sales-history import | Resolved | US2.5 explicitly preserves observed sales separately from evaluation truth, prevents duplicate history/stock effects and denies unauthorized writes. US4.1 now depends on US2.5. FR3/FR11 traceability includes the new story. Schema and batch policy remain contract-design decisions. |
| D3: Foundation and consumer dependencies | Resolved | AC8.2.1-2, AC8.5.1-2 and AC9.1.1 accept representative contract, transactional-effect and audit fixtures. Consumers must prove their own integrations; AC10.2.4 verifies final coverage without treating foundation passes as sufficient. AC5.1.4 explicitly supplies synthetic supplier terms without a PDF dependency. AC7.4.1 limits initial conversation acceptance to a representative read tool, allocates mutation integration to US7.8-10 and requires retry safety from the first mutation. |
| D4: Multi-outcome sizing | Resolved | US4.7 owns chronological policy simulation while US4.3 scores forecasts and compares the resulting reports. US7.12 owns index-wide lifecycle/rebuild, leaving source authorization and per-event idempotency in US7.2. US9.9/9.10 own relational and document/artifact restore capabilities; US9.6 explicitly becomes integrated recovery proof with those dependencies. The story map, assessment and affected FR12/FR16/FR20 mappings include the new IDs. |

These changes provide sufficient implementation and acceptance boundaries for story approval. Effort estimates and exact implementation fixtures still belong to their stated design/planning points; repeated fixture phrasing alone is not the basis for this disposition. The concrete splits, acceptance cases and consumer allocations resolve the material concerns.

The design and quality Positions raised related scenario, user-feedback, evidence and scope concerns. The revised acceptance anchors and purchasing/review/assistant handoffs support the developer disposition above; this confirmation does not substitute for those specialists' own final checks. OQ1-OQ10 retain their deadlines, the unsourced drift obligation is removed, and no accessibility certification is introduced. No new scope or owner decision is inferred.

## Positions

- AGREE: D1 is resolved by contextual Given/When/Then criteria and explicit concurrency, replay and failure outcomes; BDD wording does not select the later coding Testing Contract.
- AGREE: D2 is resolved by US2.5, its FR3/FR11 mappings and US4.1's sales-input dependency.
- AGREE: D3 is resolved by representative foundation fixtures, mandatory per-consumer evidence, final coverage verification and explicit supplier-input/assistant-tool boundaries.
- AGREE: D4 is resolved by US4.7, US7.12, US9.9/9.10 and US9.6's explicit integrated-proof boundary. No prior sizing objection remains at this story gate.
- AGREE: Preserve the existing personas, tenant/backend authority, simulated purchasing, complete release scope and OQ point-of-use deadlines. Story approval is not code readiness, implementation evidence or deployment authorization.
- AGREE: No maintained developer dissent remains from round 1; the revised baseline can proceed to independent review and the owner story gate.
