**Collaborator:** aidlc-quality-agent

## Contribution

Round 1 blind review of all 58 stories, personas, epic-feature map, questions and requirements. Findings below are proposed integrations, not owner decisions or executed tests. Apply before story approval; preserve the existing point-of-use deadlines for unresolved numerical and implementation choices.

### Q-01: Convert acceptance statements into independently testable scenarios

The questions file and inception rules require Given/When/Then. The draft instead supplies three declarative bullets per story, frequently combining several different conditions. Phrases such as “tests succeed”, “tested policy” and “cannot produce an invalid committed approval” do not define the expected result. Preserve existing AC IDs when rewriting; append IDs when splitting scenarios. There is no requirement to keep exactly three criteria per story.

For every criterion, name the initial state/actor/input, one action or failure trigger, and observable result, including unchanged business state on rejection. Capability dependencies must be satisfiable with isolated fixtures rather than requiring earlier stories' tests to have run. For example:

- Replace AC1.4.2 with separate scenarios: **Given** a still-valid session whose selected retailer membership has been revoked, **When** the user requests that retailer's inventory, **Then** access is denied and no inventory is returned. Repeat independently for missing retailer context and a substituted foreign entity identifier.
- Replace AC2.2.3: **Given** an authorized valid import and an injected required audit-write failure, **When** the import attempts to commit, **Then** stock, ledger and outbox remain unchanged and the import reports failure.
- Replace AC2.4.2's policy-only assertion: **Given** a cache fill using inventory version V1 is in flight and V2 commits, **When** the V1 fill finishes after the commit, **Then** it cannot overwrite or masquerade as V2; authoritative business checks still use current data. Specify the observable view outcome when the cache policy is designed, without inventing a TTL here.

Map shared acceptance obligations to stable scenario IDs or an explicit applicable-story matrix. Shared prose remains binding, but must not become a substitute for identifiable authorization, contract and atomicity checks.

### Q-02: Make manual/scheduled review boundary outcomes explicit

US5.2/US5.4/US5.5 and US7.9 substantially preserve FR9-FR9.5, but AC5.4.2 blends quota, duplicate requests and active-job exclusion. Add separate scenarios so implementation cannot pass only the sequential three/four-request case:

- **Given** two slots are consumed today and no review is active, **When** different users concurrently submit distinct review requests, **Then** at most one new job is accepted, total consumed slots never exceeds three and at most one review is active. Assert no quota/job/outbox effect for any rejected request; do not invent the response precedence between quota and active-job conflicts.
- **Given** an accepted job and its request identity, **When** an authorized duplicate arrives concurrently or after a lost response, **Then** it resolves to the same job and consumes no additional slot. **Given** a requester without current authority, **When** that requester attempts the same lookup/retry, **Then** no job details are disclosed (FR9.1).
- **Given** yesterday's accepted job failed and today has its own allowance, **When** that job is retried across local midnight, **Then** its original charge is preserved and today's allowance is unchanged. Separately verify that a new job is charged against its own acceptance local date, including DST boundaries (FR9/FR9.2/FR11).
- **Given** a manual review is active when the scheduled review becomes due, **When** the active job finishes, **Then** the retained scheduled job runs once with its intended local date, consumes no manual slot and never overlaps another review. Restart/redelivery must preserve this outcome (FR9.4).
- **Given** no usable forecast, **When** a manual or scheduled review executes, **Then** it exposes an unavailable/failure outcome and produces no invented demand or usable recommendation. Keep the preacceptance versus accepted-failure charging distinction; OQ2 determines exact validity and failure timing before implementation.

### Q-03: Preserve the complete purchasing matrix and replay exception

US6.1-US6.6 cover the main flow well. Before approval, explicitly incorporate the requirements' entire FR7/FR8 transition table as a parameterized acceptance matrix: allowed actor/state/action combinations succeed; all unlisted transitions fail atomically. Include manager-only receipt authority, planner-only denied approval, and an authorized person holding both roles; do not introduce separation of duties.

AC6.2.2 currently says every non-Draft submission fails, which needs the requirements' accepted-key replay exception. Integrable wording: **Given** a submission previously committed under an idempotency key, **When** an authorized caller replays that accepted operation, **Then** return its original result without another transition/audit/outbox business effect; a new submission against a non-Draft order conflicts. Apply the same original-result rule to accepted purchase commands, not only receipts.

Add these observable scenarios:

- **Given** a submitted order whose inventory or supplier terms changed, **When** a manager approves using the earlier versions, **Then** approval conflicts and no approval or fulfillment effect commits. Concurrent manager decisions must yield only one valid transition from the expected version (AC6.3.1/3).
- **Given** an approved order with no receipt, **When** cancellation races a valid receipt, **Then** either cancellation commits and the receipt has no effect, or receipt commits and cancellation fails; both cannot succeed (AC6.4.3).
- **Given** a receipt with one valid line and another exceeding its remaining approved quantity, **When** it is recorded, **Then** no line, stock movement, order transition or business outbox effect commits (AC6.5.2). A multi-line fixture proves the whole-receipt boundary.
- **Given** an active source order, **When** a replacement linked draft is created, **Then** the original order remains unchanged and the replacement requires fresh submission/approval. AC6.1.2 currently omits the explicit prohibition on silently replacing an active order.

### Q-04: Restore explicit simulation and evaluation oracles

US2.1 emphasizes dataset shape but does not explicitly name all FR3 data families. Amend AC2.1.1 to require reproducible **sales, inventory and supplier data**, not merely counts/history. US2.2 should explicitly cover sales imports as well as inventory imports, with source provenance and invalid/duplicate outcomes; US3.1 covers supplier ingestion.

US4.3's hand checks are valuable, but single-observation WAPE examples cannot detect a wrong aggregation formula. Carry the full FR3/FR12 evaluation definitions into its scenarios or reference a stable acceptance table containing them:

- **Given** true demand [10, 0] and forecasts [8, 2] for two equally weighted observations in one retailer, **When** errors are scored, **Then** MAE is 2 units/day and WAPE is 40%, computed from summed errors/summed demand, with the zero-demand observation retained. This is a derived test fixture, not a new business target.
- **Given** a zero-stock closing day alongside positive-stock days, **When** average inventory value is calculated, **Then** the zero-stock day remains in the calendar-day denominator; use fixed versioned acquisition costs and exclude inbound stock and sales revenue. Do not aggregate currencies.
- Explicitly state that candidate comparison changes only the forecast, keeping the declared exogenous scenario inputs equal. Do not inadvertently require realized stock trajectories to remain equal across candidates.

For US5.1, “reviewed fixtures produce expected quantities” must link to the OQ3 fixture specification and its expected quantities before implementation. Include dated inbound and calendar-day lead-time boundary cases, alongside zero demand, MOQ, pack rounding and zero-versus-absent buffer overrides. Do not select new buffer defaults or replenishment formulas during this review.

### Q-05: Evaluation reporting alone must not satisfy agent rejection requirements

AC7.5.1 requires expected-versus-actual reports and AC7.5.3 requires honest disclosure, but neither explicitly requires the FR14 forbidden-action fixtures to pass. Retaining a report of successful tenant escalation must not satisfy acceptance.

Add: **Given** fixtures containing injected supplier instructions, substituted tenant context, fabricated citations or purchase-approval requests, **When** the assistant and backend execute the scenario, **Then** forbidden access/actions are rejected, no unauthorized mutation or disclosure occurs, and unsupported citations are not presented as evidence. Record expected/actual outcomes and preserve failures; an unmet required rejection remains failed acceptance. Keep successful authorized tool/draft cases to ensure safety is not satisfied merely by disabling the assistant.

### Q-06: Separate resource measurements from undefined operational limits

AC9.4.1 should say **five concurrent users**, include benchmark parameters fixed before the run, and require the measured p95 to be strictly below one second. AC9.4.2 must explicitly report **sustained and peak** RAM/CPU plus Kubernetes/VM overhead for the full declared workload (NFR2), not just an unspecified “fits” result. Keep startup/download/inference timing separate as drafted.

Do not add availability, autoscaling or recovery-number targets from generic QA guidance: these are not approved requirements. Retain OQ5/OQ6/OQ10 for recovery objectives, queue bounds and retention lag. Acceptance scenarios should reference those decisions and exact boundary fixtures once set; reporting a resource-budget failure does not convert it into a pass.

### Q-07: Remove or source the additional drift-detection obligation

AC4.6.3 requires a drift fixture/baseline/threshold and visible detection. The mapped FR5/FR13/NFR14 require freshness, run/evaluation provenance and usable UI states; they do not explicitly require drift detection. OQ2 concerns forecast validity, not a new drift-monitoring policy. Replace AC4.6.3 with a Given/When/Then failed-run/freshness scenario from FR5, or identify an actual confirmed source before retaining drift detection as Must Have. Do not treat a proposed monitoring capability as an owner decision.

### Round 2 disposition

Reviewed the full revised stories.md, traceability.json and assessment, plus only the Positions sections of the design and developer contributions. The round 1 analysis above is historical; this disposition and the final Positions below supersede its objections. No implementation tests were run or claimed.

Read-only structural checks confirm 63 stories, 215 uniquely identified ACs, Given/when/then markers on every AC, all 43 upstream FR/NFR IDs represented, and no nonexistent story targets in traceability.json. Structural validity does not establish semantic acceptance precision.

| Prior finding | Disposition | Evidence in revised draft |
| --- | --- | --- |
| Q-01 | Partially resolved; specific dissent remains below | GWT markers, isolated-fixture INVEST notes, shared acceptance anchors and AC10.2.4 resolve format presence, test independence and per-consumer evidence allocation. The same-round trigger edit resolves placeholder actions; two outcome assertions remain insufficiently explicit. |
| Q-02 | Resolved | AC5.2.4 and AC5.4.4-7 explicitly cover serialization, retained scheduled work, quota races, authorized deduplication, midnight/DST charging and unavailable forecasts; AC5.5.4-5 supplies retry/status distinctions. |
| Q-03 | Resolved | AC6.2.2 restores replay exemption; AC6.3.5 binds the full actor/transition matrix and original-result replay; AC6.1.4, AC6.3.4, AC6.4.3 and AC6.5.4-6 cover replacement, stale input, cancel/receipt races, multi-line atomicity and uncertain receipt outcomes. The inherited matrix includes atomic concurrent-change denial. |
| Q-04 | Resolved | AC2.1.1 names all three data families; US2.5 explicitly imports sales and feeds US4.1. AC4.3.3 and US4.7 retain aggregate error and chronological valuation oracles; AC5.1.4 assigns exact replenishment boundary fixtures to OQ3 before implementation. |
| Q-05 | Resolved | AC7.5.1 explicitly requires forbidden access/action rejection and treats violations as failed acceptance; AC7.5.3 also requires valid tools to work. |
| Q-06 | Resolved | AC9.4.1 fixes five concurrent users and predeclared benchmark parameters with strict p95; AC9.4.2 requires sustained/peak resource evidence with overhead. Failure disclosure does not replace those pass conditions. |
| Q-07 | Resolved | AC4.6.3 now distinguishes the latest failed run from last-success provenance; the shared section explicitly excludes a newly mandatory drift capability. |

The design collaborator's Positions reinforce explicit actor-visible outcomes; the developer's Positions reinforce sales-import coverage and bounded foundation evidence. Those integration changes are present. Representative foundation fixtures plus mandatory consumer evidence in AC8.2.1-2, AC8.5.2, AC9.1.1 and AC10.2.4 preserve requirements without circular completion dependencies. US7.12 and US9.9/9.10 separate lifecycle/restore capabilities while retaining integrated proof. No additional accessibility certification or new numerical decisions are needed.

### Remaining Q-01 dissent after the same-round trigger edit

Re-read the current stories after the lead replaced generic When clauses with explicit triggers. No “scenario is exercised” wording remains. AC1.1.3 now attempts a protected mutation and AC1.3.2 now replays the old cookie with protected-request denial as its result; both targeted concerns are resolved. This is the final update within round 2, not another review round.

Only two existing outcome assertions retain the original Q-01 concern:

- **AC1.4.3:** The new trigger is “routine and machine requests execute”, but “service scopes/audiences/job authority are validated” does not explicitly require invalid inputs to be denied. Add isolated negative cases: **Given** a machine request with invalid scope, audience or job authority, **when** the protected operation is invoked, **then** it is denied without business effects. For pooled reuse, state that a caller authorized only for B receives no A data on a connection previously used for A. Retain explicit runtime direct-table-SQL denial. These make the existing NFR3/NFR5 checks observable rather than adding authority rules.
- **AC1.5.3:** The trigger now executes rotation/restore, but its result still says “reviewed key rotation/restore tests succeed”. Replace that circular result with the observable authentication/key-recovery outcome, referring to OQ7 for the exact rotation policy before implementation and AC9.7.3 for restored access. For example: **Given** protected identity/key backup material and the OQ7 recovery procedure, **when** restored into a clean environment, **then** the recovered identity service supports authenticated access using the restored identity records and protected key material, with no keys in Git/state. Specify the rotation outcome against OQ7 separately without inventing lifetime/overlap values.

The generic-trigger objection is withdrawn. These two outcome repairs alone remain from Q-01; Q-02 through Q-07 remain resolved. This does not request broader scope or resolution of OQ values ahead of their existing deadlines.
## Positions

- AGREE: Q-02 through Q-07 are resolved by the cited revised acceptance criteria; their round 1 objections are withdrawn.
- AGREE: Q-01's structural format, independent fixtures and shared-obligation traceability concerns are resolved. Foundation fixtures require later per-consumer evidence, including final AC10.2.4 coverage.
- AGREE: Retain four personas, the full required release, new bounded story splits, human purchasing authority and existing OQ deadlines. No accessibility certification, new drift requirement or unapproved numerical targets are needed.
- AGREE: The latest same-round edit resolves generic When triggers, including the specific AC1.1.3 and AC1.3.2 concerns.
- OBJECT: Q-01 remains partially unresolved only for AC1.4.3 and AC1.5.3: explicitly require invalid machine authority to be denied with isolated tenant-reuse outcomes, and replace “tests succeed” with observable rotation/restore outcomes tied to OQ7. The two concrete repairs are specified above; all other prior objections are withdrawn.
