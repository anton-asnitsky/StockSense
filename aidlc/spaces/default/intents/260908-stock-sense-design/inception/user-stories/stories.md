# StockSense user stories

Date: 2026-09-21
Status: Approved by owner gate on 2026-09-22; subsequently edited for downstream reconciliation and currently reported as drifted pending revalidation.

## Scope and priorities

The approved requirements and owner-confirmed epic/feature plan govern these
67 stories. Every story is Must Have for the full initial portfolio release;
delivery slices are decided later. Required ML/agent/operational work is not
optional merely because inventory ships first. External live activation and
additional languages are outside the default local demo.

## Shared acceptance obligations

Every affected story must satisfy current retailer/role authorization (NFR3/5),
Flyway and Dapper parameterized routines without EF/table SQL (NFR4), applicable
OpenAPI/AsyncAPI contracts (NFR8), and atomic mutation/audit/outbox (FR17/17.1).
Browser stories use React/TypeScript, Ant Design and Vite (C11), with keyboard
access and loading/empty/failure/stale states (NFR14). These are mandatory
acceptance obligations alongside each story’s explicit criteria. Full upstream
requirements remain authoritative; mappings do not weaken their boundaries.

Shared checks use these explicit acceptance anchors. Each consuming story must
exercise applicable checks against its own resource/tool/job and attach evidence;
a foundation-only test does not cover later integrations.

| Obligation | Acceptance anchors | Applicable consumers |
| --- | --- | --- |
| Current tenant/session/role authority | AC1.4.1-6, AC1.1.3-4 | Every business read/mutation and agent tool; jobs also use AC8.5.2 |
| Contract compatibility | AC8.2.1-3, AC10.2.4 | Every REST endpoint and async message introduced by a story |
| Atomic audit and safe retry | AC9.1.1-3, AC8.5.1-3 | Imports, purchases, memberships, reviews, promotion, privileged operations and agent mutations |
| Browser context and keyboard flow | AC1.4.4-5, AC2.3.2, AC5.5.1-5, AC10.1.4 | Every browser story; assistant handoffs also use AC7.4.4 and AC7.10.4 |

Every browser workflow also requires native or semantically equivalent controls,
meaningful labels, logical heading/focus order, visible focus, text for every
status/error/icon, polite announcements for dynamic state, no color-only meaning,
and keyboard completion. Focus stays on the initiating control unless the action
opens a dialog or navigates; story-specific criteria define exceptional recovery.

When a named OQ or versioned profile is an implementation prerequisite, acceptance
is `not-run` with reason `blocked-prerequisite` and the missing OQ/profile/version;
it cannot pass, fail, or be estimated as ready until that prerequisite exists.
Purchasing owns durable idempotency results for every purchase mutation; assistant
and browser clients pass payload-bound keys and reconcile through Purchasing.
Each result is retained for the lifetime of its purchase aggregate and for 90 days
after that aggregate becomes terminal. An expired key returns typed
`idempotency-key-expired` without effect; a deliberate new command requires
authoritative reconciliation and a new key.
Messaging Platform owns envelope, confirms, delivery identity, retry/DLQ/replay
policy and size limits; each domain consumer owns inbox uniqueness, authority
revalidation and its atomic business effect/outbox transaction.

Every acceptance claim about concurrency or replay uses a versioned deterministic
schedule that records initial entity/version state, a synchronization barrier before
commit, competing commands, allowed winner count, final entity/version/status,
audit/outbox/inbox/idempotency-result counts, and the exact replay response. The
minimum schedules cover four simultaneous review-quota requests; duplicate and
distinct receipts racing the remaining quantity; approve versus edit/cancel; manual
versus due scheduled review; lease expiry versus renew/finalize; same-expected-version
index-route compare-and-swap; and lost-response exact replay plus changed-payload
replay. Scheduler timing alone is not acceptance evidence.

Given/When/Then scenarios name explicit actions; they do not select a coding test methodology. OQ references
are implementation prerequisites, not permission to choose undocumented limits.
No accessibility certification or newly mandatory drift-detection capability is
added by this story elaboration.

## Personas

Planner and Manager are primary business roles; Operator and Reviewer cover
operational and reproducibility outcomes. See personas.md. Services support
these actors without independent human authority.

## Story map

| Epic | Story IDs |
| --- | --- |
| EP01 Secure access and retailer isolation | US1.1, US1.2, US1.3, US1.4, US1.5 |
| EP02 Inventory and reproducible demo data | US2.1, US2.2, US2.3, US2.4, US2.5 |
| EP03 Supplier information | US3.1, US3.2, US3.3, US3.4 |
| EP04 Demand forecasting and ML lifecycle | US4.1, US4.2, US4.3, US4.4, US4.5, US4.6, US4.7, US4.8 |
| EP05 Replenishment planning | US5.1, US5.2, US5.3, US5.4, US5.5 |
| EP06 Controlled purchasing and receipts | US6.1, US6.2, US6.3, US6.4, US6.5, US6.6 |
| EP07 AI assistant and agentic workflows | US7.1, US7.2, US7.3, US7.4, US7.5, US7.6, US7.7, US7.8, US7.9, US7.10, US7.11, US7.12 |
| EP08 Local platform and delivery | US8.1, US8.2, US8.3, US8.4, US8.5, US8.6, US8.7, US8.8 |
| EP09 Observability, audit and recovery | US9.1, US9.2, US9.3, US9.4, US9.5, US9.6, US9.7, US9.8, US9.9, US9.10, US9.11 |
| EP10 Reviewer experience and portfolio evidence | US10.1, US10.2, US10.3 |

## EP01: Secure access and retailer isolation

### US1.1: Local sign-in

As a Planner, I want to sign in locally, so that I can use the demo without Google credentials.

- Parent: EP01 / FE01.01
- Priority: Must Have
- Requirements: FR1,NFR5,NFR11
- Planned tasks: SS-08/09
- Depends on: US1.4,US1.5
- INVEST: use an isolated local sign-in fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC1.1.1**: **Given** valid seeded local credentials, **when** login is submitted, **then** seeded credentials produce a Duende/BFF session with Secure/HttpOnly cookies and server-side tokens.
- **AC1.1.2**: **Given** invalid credentials or invalid callback/state/PKCE proof, **when** login or callback validation runs, **then** invalid credentials, callback/state or PKCE failure create no session.
- **AC1.1.3**: **Given** an expired session or missing CSRF protection, **when** a protected mutation is requested, **then** expired sessions and missing CSRF protection cannot authorize mutations.

- **AC1.1.4**: **Given** expiry/revocation during a mutation, **when** authority fails, **then** the operation returns the typed `authority-lost` outcome, commits no newly authorized effect, and the UI shows `Sign in again` plus `Check status` when the prior outcome is uncertain; it makes no success claim, preserves entered context and never resubmits automatically after reauthentication.

### US1.2: Google federation and safe linking

As a Planner, I want to sign in through Google, so that I can retain explicit account and membership boundaries.

- Parent: EP01 / FE01.01
- Priority: Must Have
- Requirements: FR1,NFR5
- Planned tasks: SS-09
- Depends on: US1.1
- INVEST: use an isolated google federation and safe linking fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC1.2.1**: **Given** configured Google credentials and exact redirects, **when** Google login completes, **then** configured federation and exact redirects resolve the verified linked account.
- **AC1.2.2**: **Given** a Google identity sharing an existing local email, **when** the Google identity signs in, **then** matching email alone grants neither local account ownership nor retailer memberships.
- **AC1.2.3**: **Given** valid or invalid proof of the intended linked accounts, **when** account linkage is attempted, **then** verified authorized linkage succeeds; email-only, unauthenticated and wrong-account linkage fail. OQ7 must be resolved before implementation.

### US1.3: Logout

As a Planner, I want to end my StockSense session, so that I can prevent subsequent access through its cookie.

- Parent: EP01 / FE01.01
- Priority: Must Have
- Requirements: FR1,NFR5
- Planned tasks: SS-09
- Depends on: US1.1
- INVEST: use an isolated logout fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC1.3.1**: **Given** an authenticated BFF session, **when** the user signs out, **then** logout invalidates the BFF session and displays signed-out state.
- **AC1.3.2**: **Given** a previously logged-out cookie, **when** the old cookie is replayed, **then** replay of the old cookie cannot authorize protected requests.
- **AC1.3.3**: **Given** an upstream Google session after StockSense logout, **when** protected StockSense access is requested again, **then** google logout is not implied; new StockSense access requires a valid new session.

### US1.4: Retailer authorization

As a Planner, I want to select an authorized retailer, so that I can work without exposing other retailers.

- Parent: EP01 / FE01.02
- Priority: Must Have
- Requirements: FR2,NFR3,NFR4,NFR5
- Planned tasks: SS-07/09
- Depends on: US8.1,US8.3,US8.4
- INVEST: use an isolated retailer authorization fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC1.4.1**: **Given** explicit current retailer memberships, **when** retailers are listed and selected, **then** only current explicit memberships appear and authorize business access.
- **AC1.4.2**: **Given** missing context, a foreign identifier or revoked membership, **when** business data is requested, **then** missing context, substituted identifiers and revoked memberships fail even with a valid session.
- **AC1.4.3**: **Given** a connection previously used for retailer A and a caller authorized only for B, **when** B requests data on that reused connection, **then** no A data is returned, the retailer context is reset before reuse, and runtime direct-table SQL is denied.

- **AC1.4.4**: **Given** multiple memberships, **when** retailer selection changes, **then** the selected identity stays visible and old/late responses cannot appear under the new heading or supply its mutation context.
- **AC1.4.5**: **Given** no memberships after successful login, **when** the landing view opens, **then** explicit no-access/provisioning guidance appears without signup or self-assigned access.
- **AC1.4.6**: **Given** an invalid machine scope, audience or job authority, **when** a protected operation is invoked, **then** it returns the typed authorization problem, creates no business/audit-success/outbox effect and records denial evidence without sensitive credentials.

### US1.5: Persistent identity and keys

As a Operator, I want to preserve identity across restarts, so that I can provide recoverable authentication.

- Parent: EP01 / FE01.03
- Priority: Must Have
- Requirements: NFR4,NFR5,NFR6
- Planned tasks: SS-08
- Depends on: US8.3,US8.4
- INVEST: use an isolated persistent identity and keys fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC1.5.1**: **Given** a dedicated identity database and runtime role, **when** Flyway migrations and store calls run, **then** dedicated identity storage uses Flyway and Dapper routines without EF Core or access to business tables.
- **AC1.5.2**: **Given** persisted signing/data-protection keys, **when** identity service restarts, **then** restart preserves protected signing/data-protection material and identity records.
- **AC1.5.3**: **Given** protected identity/key backups and the OQ7 recovery procedure, **when** restored into a clean environment, **then** recovered identity records and protected keys support authenticated access without keys in Git/state.
- **AC1.5.4**: **Given** the versioned OQ7 signing-key rotation policy, **when** signing keys rotate, **then** new issuance uses the active key and old-key verification follows that policy's explicit validity boundary; without that policy the check is `not-run`/`blocked-prerequisite`, and no overlap or lifetime is inferred.

## EP02: Inventory and reproducible demo data

### US2.1: Reproducible retail simulation

As a Reviewer, I want to generate the demo dataset, so that I can repeat comparisons.

- Parent: EP02 / FE02.01
- Priority: Must Have
- Requirements: FR3,FR11,NFR11
- Planned tasks: SS-10
- Depends on: US1.4,US9.1
- INVEST: use an isolated reproducible retail simulation fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC2.1.1**: **Given** a fixed seed/configuration, **when** simulation runs, **then** sales, inventory and supplier data reproduce for three isolated retailers, one store/100 products each and 18 months with seasonality, promotions and intermittent demand.
- **AC2.1.2**: **Given** demand10 and available stock6, plus a zero-demand day, **when** sales are simulated, **then** demand 10 with stock 6 records sales 6 and lost demand 4 separately; zero demand records both zero.
- **AC2.1.3**: **Given** retailer-local dates spanning DST, **when** timestamps are aggregated, **then** uTC timestamps aggregate to retailer-local dates including DST; OQ3 fixes currencies/time zones before generation.

### US2.2: Validated inventory imports

As a Planner, I want to import inventory data, so that I can establish explainable stock records.

- Parent: EP02 / FE02.02
- Priority: Must Have
- Requirements: FR3,FR4,FR11,FR17
- Planned tasks: SS-10
- Depends on: US2.1,US8.2,US9.1
- INVEST: use an isolated validated inventory imports fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC2.2.1**: **Given** valid source-versioned inventory input, **when** the import commits, **then** valid imports identify source versions and reconcile stock with ledger effects.
- **AC2.2.2**: **Given** malformed, duplicate or wrong-currency input, **when** the import is validated or replayed, **then** malformed or duplicate imports have explicit outcomes without duplicate stock; currency mismatches are rejected.
- **AC2.2.3**: **Given** an authorized valid import and injected audit-write failure, **when** commit is attempted, **then** stock, ledger and business outbox remain unchanged and the import reports failure.

- **AC2.2.4**: **Given** malformed inventory input or a currency mismatch, **when** processing finishes, **then** the result shows source version, available row/field diagnostics, reasons and accepted/rejected/pending outcomes, identifies what became authoritative and provides correction/re-upload guidance. Contract design defines the batch policy before implementation; no partial-commit policy is inferred here.

### US2.3: Inventory and movement history

As a Planner, I want to inspect stock and movements, so that I can explain current quantities.

- Parent: EP02 / FE02.03
- Priority: Must Have
- Requirements: FR4,NFR14
- Planned tasks: SS-11
- Depends on: US1.1,US2.2
- INVEST: use an isolated inventory and movement history fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC2.3.1**: **Given** committed imports, adjustments and receipts, **when** inventory and history are opened, **then** imported, adjusted and received stock reconciles to displayed movement history.
- **AC2.3.2**: **Given** loading, empty, failed and stale retrieval fixtures, **when** the inventory view renders, **then** loading, empty, failed and stale views are explicit and keyboard-operable.
- **AC2.3.3**: **Given** a session authorized only for retailer A and a product from B, **when** foreign history is requested, **then** another retailer’s product identifier cannot disclose inventory/history.

### US2.4: Trustworthy cache behavior

As a Planner, I want to use resilient inventory views, so that I can retain correctness during cache failure.

- Parent: EP02 / FE02.04
- Priority: Must Have
- Requirements: FR19,NFR3
- Planned tasks: SS-32
- Depends on: US2.3,US8.4
- INVEST: use an isolated trustworthy cache behavior fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC2.4.1**: **Given** two retailers with populated Redis entries, **when** cached values are requested, **then** tenant/version-scoped Redis keys cannot mix retailer data.
- **AC2.4.2**: **Given** a V1 inventory cache fill in flight and V2 committing, **when** V1 completes after the commit, **then** it cannot overwrite or masquerade as V2 and authoritative checks still use current data; exact view freshness follows the cache contract before implementation.
- **AC2.4.3**: **Given** a cold cache or unavailable Redis, **when** inventory is requested, **then** the request uses the authorized authoritative read path, returns no stale cached value as current, records `cache-unavailable` in evidence and exposes a non-blocking `Live data; cache unavailable` state; order and quota checks continue against authoritative state.

### US2.5: Import sales history

As a Planner, I want to import versioned observed sales, so that I can feed reproducible forecasts.

- Parent: EP02 / FE02.02
- Priority: Must Have
- Requirements: FR3,FR11
- Planned tasks: SS-10
- Depends on: US2.1,US8.2,US9.1
- INVEST: isolate the import sales history fixture; completion is this specific
  capability, with final integrated recovery/evidence in US9.6/US10.2.

- **AC2.5.1**: **Given** valid generated history for an authorized retailer, **when** imported, **then** product/local-date/source-version records preserve observed sales separately from synthetic lost-demand evaluation truth.
- **AC2.5.2**: **Given** the same history imported twice, **when** replayed, **then** no duplicate history or stock effect occurs.
- **AC2.5.3**: **Given** malformed or foreign-retailer input, **when** validated, **then** explicit outcomes prevent unauthorized writes; schema/batch policy is fixed in contract design and latent demand cannot leak into training.

## EP03: Supplier information

### US3.1: Supplier CSV offers

As a Planner, I want to upload offers, so that I can use validated supplier inputs.

- Parent: EP03 / FE03.01
- Priority: Must Have
- Requirements: FR10,FR10.2,FR11
- Planned tasks: SS-21
- Depends on: US8.2,US8.5,US2.2
- INVEST: use an isolated supplier csv offers fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC3.1.1**: **Given** golden-corpus CSV fixtures immediately below and exactly at 95% and 99% valid rows, **when** extraction completes, **then** the exact `valid rows / total rows` fraction is compared without rounded display values: every required column plus at least 99% is Validated, 95% to below 99% is PartiallyValidated, and a missing required column or below 95% is Failed, with row/field evidence.
- **AC3.1.2**: **Given** malformed rows or wrong-currency offers, **when** rows are validated, **then** malformed rows and currency mismatches cannot become authoritative terms.
- **AC3.1.3**: **Given** a duplicate ingestion job, **when** the consumer replays the job, **then** replay does not duplicate offers; OQ4 schema and size/row limits are resolved before implementation.

- **AC3.1.4**: **Given** a selected authorized file, **when** ingestion progresses or ends, **then** the keyboard-accessible view shows retailer, upload progress, queued/processing state, source version, terminal classification, row/field reasons linked to source location and a plain-language next action; correctable failure preserves context and status never depends on color alone.

### US3.2: Supplier PDF evidence

As a Planner, I want to inspect extracted terms and their source, so that I can assess extraction reliability.

- Parent: EP03 / FE03.02
- Priority: Must Have
- Requirements: FR10,FR10.1,FR10.2
- Planned tasks: SS-21
- Depends on: US3.1
- INVEST: use an isolated supplier pdf evidence fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC3.2.1**: **Given** golden-corpus text-PDF fixtures immediately below and exactly at 98% expected anchors, with every page readable and all required terms found, **when** extraction completes, **then** the exact `matched anchors / expected anchors` fraction is compared without rounded display values: at least 98% is Validated with submission/version and page provenance in MongoDB.
- **AC3.2.2**: **Given** independent readability and anchor fixtures immediately below and exactly at 90%, plus scanned, encrypted and malformed PDFs, **when** processed, **then** both exact fractions must be at least 90% for PartiallyValidated; either fraction below 90% is Failed; scanned or encrypted input is Unsupported; every available omission is identified and no OCR capability is claimed.
- **AC3.2.3**: **Given** a foreign-retailer document identifier, **when** the source is requested, **then** cross-tenant document access fails; OQ4 fixes page/size/extraction limits before implementation.

- **AC3.2.4**: **Given** supported or partially extracted terms, **when** the planner opens evidence, **then** the keyboard-accessible view shows progress/terminal classification and the exact authorized source version/page; omissions link to source locations, raw extraction is distinct from accepted terms, and unavailable/scanned/encrypted limitations plus corrective next actions are explicit in text and icon.

### US3.3: Accepted commercial terms

As a Planner, I want to distinguish validated terms from raw extraction, so that I can make reliable comparisons.

- Parent: EP03 / FE03.03
- Priority: Must Have
- Requirements: FR10.1,FR6
- Planned tasks: SS-21
- Depends on: US3.2,US9.1
- INVEST: use an isolated accepted commercial terms fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC3.3.1**: **Given** validated extracted commercial terms, **when** terms are accepted through routines, **then** authorized routines store accepted normalized terms in PostgreSQL linked to source/version.
- **AC3.3.2**: **Given** unvalidated text conflicting with accepted terms, **when** planning reads commercial terms, **then** unvalidated document text cannot override authoritative commercial data.
- **AC3.3.3**: **Given** a proposal based on an earlier term version, **when** the earlier proposal is approved, **then** revised terms cause stale proposal approval to conflict and require correction.

### US3.4: Cache supplier knowledge safely

As a Planner, I want supplier retrieval and comparisons to remain correct during cache changes, so that I never act on stale or foreign terms.

- Parent: EP03 / FE03.04
- Priority: Must Have
- Requirements: FR19,FR19.1,FR16.2,NFR3
- Planned tasks: SS-21/32/34
- Depends on: US3.3,US7.12
- INVEST: isolates disposable caching and active-route reconciliation from source ingestion and retrieval presentation.

- **AC3.4.1**: **Given** an authorized retrieval/comparison result, **when** cached, **then** its five-minute key includes retailer, placement generation, contract, source and active-index generations.
- **AC3.4.2**: **Given** source/index invalidation, Redis outage, cold start or a stale-fill race, **when** the result is requested, **then** the service falls back to authoritative state and never serves stale or foreign data.

## EP04: Demand forecasting and ML lifecycle

### US4.1: Daily baseline forecast

As a Planner, I want to see versioned demand forecasts, so that I can anticipate shortages.

- Parent: EP04 / FE04.01
- Priority: Must Have
- Requirements: FR5,FR11
- Planned tasks: SS-13
- Depends on: US2.5,US8.5
- INVEST: use an isolated daily baseline forecast fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC4.1.1**: **Given** versioned observed history, **when** the daily forecast job executes, **then** daily seasonal-naive/moving-average forecasts identify 28-day horizon and model/data/configuration versions.
- **AC4.1.2**: **Given** scheduler restart or duplicate local-date delivery, **when** the schedule is replayed, **then** repeated local-date scheduling or restart does not duplicate effects, including DST cases.
- **AC4.1.3**: **Given** a failed or stale forecast run, **when** results are opened, **then** failure/staleness is visible rather than current; OQ2 freshness is fixed before implementation.

### US4.2: Versioned datasets and artifacts

As a Operator, I want to access scoped evaluation datasets, so that I can reproduce model results safely.

- Parent: EP04 / FE04.02
- Priority: Must Have
- Requirements: FR3,FR13,NFR3
- Planned tasks: SS-17
- Depends on: US4.1
- INVEST: use an isolated versioned datasets and artifacts fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC4.2.1**: **Given** a dataset and temporal split, **when** the dataset is published, **then** immutable split metadata, temporal boundaries and checksums identify dataset/artifact content.
- **AC4.2.2**: **Given** an authorized Python caller or a foreign artifact request, **when** the caller requests dataset/artifacts, **then** python accesses business data and PVC artifacts through tenant-authorized APIs without table SQL.
- **AC4.2.3**: **Given** synthetic observed sales and latent true demand, **when** training features are assembled, **then** training uses only observations available at origin; latent true demand remains evaluation truth and cross-tenant artifacts are denied.

### US4.3: Evaluate forecast and inventory outcomes

As a Reviewer, I want to compare common baselines and candidates, so that I can judge evidence honestly.

- Parent: EP04 / FE04.02
- Priority: Must Have
- Requirements: FR12,FR3,NFR15
- Planned tasks: SS-17/18
- Depends on: US4.2,US4.7
- INVEST: use an isolated evaluate forecast and inventory outcomes fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC4.3.1**: **Given** complete held-out horizons and common candidate origins, **when** per-retailer forecast errors are scored, **then** complete held-out horizons share origins/products; per-retailer MAE/WAPE use approved formulas: demand10/forecast8 gives 2/20%, demand0/forecast2 gives 2/N/A.
- **AC4.3.2**: **Given** forecast scores and inventory-policy reports from US4.7, **when** candidate results are compared, **then** the same origins, products and exogenous scenarios are identified while realized inventory trajectories may differ; only the forecast varies between policies.
- **AC4.3.3**: **Given** true demand [10,0] and forecast [8,2], **when** equally weighted observations are scored per retailer, **then** MAE=sum(abs(error))/2=2 units/day and WAPE=100*sum(abs(error))/sum(demand)=40%; zero-demand observations remain included. A wholly zero-demand horizon reports WAPE N/A with MAE retained.

- **AC4.3.4**: **Given** a candidate failed or data was excluded, **when** the report is published, **then** counts, dates, missing-data exclusions, versions, rejected candidates and synthetic-data limits are visible.

### US4.4: Tracked model training

As a Operator, I want to train a versioned candidate, so that I can base model choices on recorded runs.

- Parent: EP04 / FE04.03
- Priority: Must Have
- Requirements: FR12,FR13,NFR2
- Planned tasks: SS-18/19
- Depends on: US4.2,US4.3,US8.3
- INVEST: use an isolated tracked model training fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC4.4.1**: **Given** versioned data/code/configuration, **when** the training job runs, **then** kubernetes training links code, data, configuration, model and evaluations in isolated MLflow metadata.
- **AC4.4.2**: **Given** an interrupted training job, **when** the job restarts, **then** failed/restarted jobs retain explicit status and provenance and cannot silently promote output.
- **AC4.4.3**: **Given** an unauthorized MLflow caller or second concurrent ML job, **when** access or scheduling is attempted, **then** operator-only access and one-active-ML-job constraints are tested within the resource policy.

### US4.5: Model promotion and rollback

As a Operator, I want to select and reverse active models, so that I can keep forecasting changes accountable.

- Parent: EP04 / FE04.04
- Priority: Must Have
- Requirements: FR13,FR13.1,FR17.1
- Planned tasks: SS-19
- Depends on: US4.4,US9.1
- INVEST: use an isolated model promotion and rollback fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC4.5.1**: **Given** a candidate with recorded evaluation evidence, **when** an authorized promotion is requested, **then** authorized promotion identifies evaluation evidence/run/version and audit.
- **AC4.5.2**: **Given** a failed candidate or missing promotion evidence, **when** promotion is attempted, **then** missing evidence or failed candidates cannot become active through the promotion path.
- **AC4.5.3**: **Given** a previously validated model version, **when** rollback is requested, **then** rollback selects a known prior model for subsequent forecasts without erasing earlier provenance.
- **AC4.5.4**: **Given** a promoted or retained release, **when** Forecasting resolves it, **then** Model Lifecycle's immutable package records `skops.io` artifact, canonical manifest, SHA-256, signer-key ID, Ed25519 signature and policy/allowlist version; Forecasting verifies all fields before load and keeps revoked or incompatible evidence inactive.
- **AC4.5.5**: **Given** signing-key rotation, revocation or rollback, **when** a retained release is considered, **then** the versioned policy defines its overlap window and active/retained effect, and rollback cannot activate a package whose signature, key status or trusted-type policy fails.

### US4.6: Forecast quality and freshness

As a Planner, I want to see active model quality and forecast age, so that I can know whether inputs are usable.

- Parent: EP04 / FE04.04
- Priority: Must Have
- Requirements: FR5,FR13,NFR14
- Planned tasks: SS-20
- Depends on: US4.5
- INVEST: use an isolated forecast quality and freshness fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC4.6.1**: **Given** an active model and forecast results, **when** forecast status is opened, **then** view shows model version, evaluated quality, forecast age and run status.
- **AC4.6.2**: **Given** a forecast beyond the approved freshness threshold, **when** planning attempts to use the forecast, **then** beyond the agreed freshness threshold, planning follows explicit stale/unavailable behavior.
- **AC4.6.3**: **Given** the latest forecast failed and an older successful result exists, **when** status is opened, **then** latest failure and last successful model/data versions are distinguished and the older result is not relabeled fresh.

### US4.7: Evaluate inventory policy outcomes

As a Reviewer, I want to compare chronological policy simulations, so that I can measure lost demand and inventory tradeoffs.

- Parent: EP04 / FE04.02
- Priority: Must Have
- Requirements: FR12,FR3
- Planned tasks: SS-17/18
- Depends on: US4.2
- INVEST: isolate the evaluate inventory policy outcomes fixture; completion is this specific
  capability, with final integrated recovery/evidence in US9.6/US10.2.

- **AC4.7.1**: **Given** common exogenous demand, initial stock, supplier constraints, lead times, ordering policy and fixed versioned costs, **when** one chronological simulation per scenario runs for each forecast, **then** only forecast input varies and overlapping forecast origins are not double-counted.
- **AC4.7.2**: **Given** demand10 and stock6, **when** scored, **then** lost units4 and lost-demand rate40% are reported; zero total demand yields rate N/A with lost units reported separately.
- **AC4.7.3**: **Given** closing on-hand value12,8,0 across three days, **when** averaged, **then** the result is20/3 in that retailer currency; fixed acquisition costs apply, zero-stock days remain in the denominator, inbound/revenue are excluded and currencies are never aggregated.

### US4.8: Coordinate heavy model work

As a Operator, I want training and forecasting heavy work to share a fenced lease, so that the local cluster remains bounded and stale workers cannot publish results.

- Parent: EP04 / FE04.05
- Priority: Must Have
- Requirements: FR13.1,NFR2,NFR8.3
- Planned tasks: SS-18/19/20
- Depends on: US4.4,US8.2,US8.5
- INVEST: covers one versioned coordination capability with explicit lifecycle and failure outcomes.
- Readiness: Blocked for implementation/sizing until the lease queue/deadline and
  canonical request-hash contract is versioned in NFR8.3.

Model Lifecycle owns PostgreSQL-backed lease/queue state and fencing-token issuance.
Training and Forecasting are clients; artifact registration, promotion and forecast
publication each enforce the current token in the atomic authoritative write.

- **AC4.8.1**: **Given** an authorized heavy job, **when** it acquires, renews or releases the lease with an idempotency key, **then** the API returns a stable state, deadline and monotonically fenced token.
- **AC4.8.2**: **Given** a queued, expired, duplicate or conflicting request, **when** coordination is evaluated, **then** the contract returns a bounded typed outcome without overlapping heavy execution.
- **AC4.8.3**: **Given** restart or restore, **when** lease reconciliation runs, **then** stale holders cannot finalize artifacts or forecasts and queue/lease state is reconstructed before new work starts.
- **AC4.8.4**: **Given** renew after expiry, stale-token release, same-key/different-payload acquire, queued deadline expiry or two finalizers, **when** the operation executes, **then** canonical request-hash conflict and fencing rules permit at most one current owner and one authoritative finalization.

## EP05: Replenishment planning

### US5.1: Deterministic replenishment

As a Planner, I want to inspect shortage and quantity suggestions, so that I can prepare purchases consistently.

- Parent: EP05 / FE05.01
- Priority: Must Have
- Requirements: FR6
- Planned tasks: SS-14
- Depends on: US4.1,US2.1
- INVEST: use an isolated deterministic replenishment fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC5.1.1**: **Given** a consistent snapshot including dated inbound and supplier constraints, **when** replenishment is calculated, **then** consistent snapshots include inventory position, dated inbound, forecast, calendar lead time, MOQ, packs and buffer days with versions.
- **AC5.1.2**: **Given** the OQ3 calculation fixtures, **when** boundary cases are calculated, **then** reviewed zero-demand, MOQ and pack-rounding fixtures produce expected quantities.
- **AC5.1.3**: **Given** no valid forecast or changed inventory/term versions, **when** suggestion generation or approval is attempted, **then** missing forecast or changed inputs cannot bypass explicit unavailability and approval revalidation; OQ2/OQ3 precede implementation.

- **AC5.1.4**: **Given** versioned synthetic supplier terms generated in US2.1, **when** the first purchasing slice calculates replenishment, **then** it uses those authoritative fixtures without depending on later PDF extraction. OQ3 must specify dated-inbound, calendar-lead-time, MOQ, pack and buffer boundary inputs with exact expected quantities before implementation.

### US5.2: Scheduled inventory review

As a Planner, I want to receive daily replenishment reviews, so that I can keep suggestions current without spending manual quota.

- Parent: EP05 / FE05.01
- Priority: Must Have
- Requirements: FR9.4,FR9.1,FR11
- Planned tasks: SS-14/35
- Depends on: US5.1,US8.5
- INVEST: use an isolated scheduled inventory review fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC5.2.1**: **Given** a scheduled review due for a retailer-local date, **when** daily scheduling runs, **then** one logical scheduled review per local date runs independently of daily forecasting and consumes no manual allowance.
- **AC5.2.2**: **Given** an active manual review when scheduled work becomes due, **when** scheduled dispatch runs, **then** if another review is active, due work is retained until it ends; only one review is active per retailer.
- **AC5.2.3**: **Given** restart or redelivery spanning a DST boundary, **when** the scheduler resumes, **then** restart/redelivery/DST tests preserve trigger/date/input versions/outcome without duplicate effects.

- **AC5.2.4**: **Given** an active manual job and a due scheduled review, **when** that job ends after a restart/redelivery, **then** retained scheduled work runs once with intended local date, no manual charge and no overlap.

### US5.3: Compare buffer scenarios

As a Planner, I want to compare configurable safety buffers, so that I can understand inventory tradeoffs.

- Parent: EP05 / FE05.02
- Priority: Must Have
- Requirements: FR6,FR7
- Planned tasks: SS-14
- Depends on: US5.1
- INVEST: use an isolated compare buffer scenarios fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC5.3.1**: **Given** retailer defaults and zero/nonzero/absent product overrides, **when** scenario buffers are resolved, **then** an explicit product override including zero wins over retailer defaults; absent override inherits the default.
- **AC5.3.2**: **Given** two buffer scenarios on common inputs, **when** scenarios are compared, **then** common input scenarios expose changed settings and deterministic quantity differences.
- **AC5.3.3**: **Given** a stale scenario and an approved order, **when** the scenario is applied, **then** stale input cannot mutate approved orders; numerical defaults follow OQ3 simulation.

### US5.4: Manual inventory review

As a Planner, I want to request a fresh inventory review, so that I can respond to new stock or terms.

- Parent: EP05 / FE05.03
- Priority: Must Have
- Requirements: FR9,FR9.1,FR9.2,FR9.3
- Planned tasks: SS-35
- Depends on: US5.1,US8.5,US9.1
- INVEST: use an isolated manual inventory review fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC5.4.1**: **Given** an authorized retailer with available allowance and valid forecast, **when** manual review is accepted, **then** acceptance commits quota/job/outbox atomically for latest inventory/terms and valid forecast, without retraining.
- **AC5.4.2**: **Given** concurrent users, duplicate keys and exhausted allowance, **when** requests race or replay, **then** three distinct jobs per local day are shared by users; fourth is denied, concurrent duplicates return the authorized existing job and one active review is enforced.
- **AC5.4.3**: **Given** an accepted failed job crossing local midnight, **when** the same job is retried, **then** accepted failed jobs keep their slot; same-job replay across midnight charges nothing extra; preacceptance rejection consumes none.

- **AC5.4.4**: **Given** two slots consumed today and no active job, **when** distinct users race requests, **then** at most one new job is accepted, consumed slots never exceed three and rejected requests have no quota/job/outbox effect.
- **AC5.4.5**: **Given** an accepted job identity, **when** a duplicate request or lost-response retry arrives under current authority, **then** the same job is returned without extra charge; revoked authority discloses no job details.
- **AC5.4.6**: **Given** an accepted failed job charged on local day D, **when** retried on D+1, **then** D’s charge remains and D+1 allowance is unchanged. A distinct accepted job charges its own local date, including DST cases.
- **AC5.4.7**: **Given** no usable forecast, **when** review runs, **then** explicit unavailable/failure status contains no usable invented recommendation; preacceptance failures consume no slot, while accepted failures retain theirs.

### US5.5: Review status and allowance

As a Planner, I want to inspect review progress and quota, so that I can know whether to wait or retry.

- Parent: EP05 / FE05.03
- Priority: Must Have
- Requirements: FR9.5,FR9.2,NFR14
- Planned tasks: SS-11/35
- Depends on: US5.2,US5.4
- INVEST: use an isolated review status and allowance fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC5.5.1**: **Given** successful and active/queued review jobs, **when** review status is opened, **then** view exposes last success, forecast/inventory/terms versions, active/queued job/outcome, remaining allowance and local reset time.
- **AC5.5.2**: **Given** never-run, failed, unavailable or exhausted-quota fixtures, **when** review status renders, **then** never-run, failed, unavailable and quota-exhausted states are explicit; exhausted new requests are disabled without replacing server checks.
- **AC5.5.3**: **Given** a retryable accepted job and a foreign job identifier, **when** retry/status is requested, **then** same-job retry retains its charge; keyboard navigation works and foreign job identifiers disclose nothing.

- **AC5.5.4**: **Given** three accepted jobs and a failed retryable one, **when** status opens, **then** new review is unavailable with local reset time while same-job retry is a distinct action with no extra charge.
- **AC5.5.5**: **Given** a latest failed review and an earlier successful result, **when** displayed, **then** last-success versions/time remain distinct from the failed attempt and older suggestions are not relabeled current; chat and review view share the same job/outcome.

## EP06: Controlled purchasing and receipts

### US6.1: Draft a purchase proposal

As a Planner, I want to prepare a draft from a scenario, so that I can review commercial lines before submission.

- Parent: EP06 / FE06.01
- Priority: Must Have
- Requirements: FR7,FR6
- Planned tasks: SS-15/16
- Depends on: US5.3,US9.1
- INVEST: use an isolated draft a purchase proposal fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC6.1.1**: **Given** a current authorized scenario, **when** a draft is created, **then** current authorized scenario inputs create an editable draft with source versions and audit.
- **AC6.1.2**: **Given** locked Submitted/Approved commercial lines, **when** an edit is attempted, **then** submitted/approved lines cannot be edited; correction creates a new linked draft.
- **AC6.1.3**: **Given** replayed Draft creation or a stale expected edit version, **when** creation/edit is retried, **then** exact replay returns the original result without a duplicate Draft; changed payload conflicts without effect; a stale edit preserves entered values, moves focus to a text error summary, identifies changed fields, links current evidence and offers creation of a linked replacement Draft without overwriting the source.

- **AC6.1.4**: **Given** a locked source order needing correction, **when** a linked replacement Draft is created, **then** its view shows both identities/statuses, leaves the source unchanged and requires fresh submission/approval; only currently permitted rejection/cancellation actions are offered.
- **AC6.1.5**: **Given** an accepted purchasing operation, **when** its key is replayed during aggregate lifetime or within 90 days after terminal state, changed under the same key, or replayed after expiry, **then** exact replay returns the original authorized result, changed payload returns a typed conflict without effect, and expired replay returns `idempotency-key-expired` without effect; a new command is accepted only after authoritative reconciliation with a new key.

### US6.2: Submit a draft

As a Planner, I want to submit my proposal, so that I can obtain a manager decision on locked lines.

- Parent: EP06 / FE06.01
- Priority: Must Have
- Requirements: FR7,NFR14
- Planned tasks: SS-15/16
- Depends on: US6.1
- INVEST: use an isolated submit a draft fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC6.2.1**: **Given** a valid Draft and current version, **when** the user submits, **then** it transitions to Submitted, locks commercial lines and shows durable Submitted status, submitter, submission time and next authorized actor; when one person holds both roles, the acting Planner role is explicit and separately audited.
- **AC6.2.2**: **Given** a non-Draft order or stale expected version and a new submission key, **when** submitted, **then** the transition is rejected without business mutation; stale submission preserves entered values, moves focus to a text error summary, identifies changed fields, links current evidence and offers a linked replacement Draft; an authorized exact replay of an accepted key returns its original result without another transition/audit/outbox effect.
- **AC6.2.3**: **Given** an authorized Manager and a Submitted proposal, **when** the pending-decision view or proposal opens, **then** the proposal appears in that Manager's queue and exposes quantities, terms, versions, submitter, submission time, locked status and acting role for an explicit human decision.

### US6.3: Approve or reject a proposal

As a Manager, I want to decide on submitted purchases, so that I can allow only reviewed fulfillment.

- Parent: EP06 / FE06.02
- Priority: Must Have
- Requirements: FR7,FR6,FR17.1
- Planned tasks: SS-15/16
- Depends on: US6.2
- INVEST: use an isolated approve or reject a proposal fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC6.3.1**: **Given** a current Submitted proposal and authorized Manager, **when** the Manager approves, **then** approval revalidates permission, offer, price, quantity and inventory versions, records Approved with audit, and the Planner sees Approved status, decision actor, acting Manager role and decision time.
- **AC6.3.2**: **Given** a Submitted proposal selected for rejection, **when** the Manager rejects, **then** rejection transitions Submitted to terminal Rejected; the Planner sees status, decision actor, acting Manager role, time and supplied reason; correction requires a new linked Draft and fresh approval.
- **AC6.3.3**: **Given** stale inputs, concurrent decisions or unauthorized actors, **when** a decision is submitted, **then** concurrent/stale decisions, unauthorized actors and agent approval attempts cannot produce an invalid committed approval.

- **AC6.3.4**: **Given** changed inventory/terms on a Submitted order, **when** approval revalidation fails, **then** no approval commits, the Submitted proposal remains unapproved, focus moves to a text error summary, changed fields and current status are identified, and the Manager can inspect current evidence and create a linked replacement Draft; quantities are never silently replaced and the stale proposal is never presented as approvable.
- **AC6.3.5**: **Given** every actor/state/action combination from the approved FR7/FR8 transition table, **when** exercised with isolated fixtures, **then** allowed combinations succeed and all unlisted transitions fail atomically; Manager-only receipt authority and a person with both roles work while Planner-only approval fails. Exact accepted-operation replay returns its original result.

### US6.4: Cancel before receipt

As a Manager, I want to cancel an unreceived order, so that I can prevent unwanted fulfillment.

- Parent: EP06 / FE06.02
- Priority: Must Have
- Requirements: FR7,FR8
- Planned tasks: SS-15/16
- Depends on: US6.3
- INVEST: use an isolated cancel before receipt fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC6.4.1**: **Given** a Submitted/Approved order with no receipts, **when** the manager cancels, **then** submitted/Approved with no receipt transitions to terminal Cancelled under current version/authority.
- **AC6.4.2**: **Given** a Draft, partial receipt or terminal state, **when** cancellation is attempted, **then** draft, partially received and terminal orders reject cancellation; returns and post-receipt cancellation are out of v1.
- **AC6.4.3**: **Given** an Approved order with no receipts, **when** cancellation races a valid receipt, **then** either cancellation commits and receipt has no effect, or receipt commits and cancellation fails; both cannot succeed.

### US6.5: Record partial receipt

As a Planner, I want to record part of a delivery, so that I can reflect goods actually received.

- Parent: EP06 / FE06.03
- Priority: Must Have
- Requirements: FR8,FR4,FR17
- Planned tasks: SS-15/16
- Depends on: US6.3,US8.5
- INVEST: use an isolated record partial receipt fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC6.5.1**: **Given** an approved line of10 with no prior receipt and a permitted receiver, **when** a receipt of6 is submitted, **then** receiving6 against approved10 records PartiallyReceived with receipt/order/stock/audit/outbox atomicity; authorized managers may also receive.
- **AC6.5.2**: **Given** nonpositive, foreign or cumulatively excessive receipt lines, **when** the receipt is submitted, **then** nonpositive, foreign or cumulatively excessive lines (6 then5 against10) reject the whole receipt without partial effects.
- **AC6.5.3**: **Given** concurrent distinct receipts or replayed idempotency keys, **when** receipt commands execute, **then** distinct concurrent receipts enforce cumulative limits; exact-key retry is effect-free and changed payload under the same key fails.

- **AC6.5.4**: **Given** a multi-line receipt with one valid and one over-limit line, **when** submitted, **then** no line, stock movement, order transition or business outbox effect commits.
- **AC6.5.5**: **Given** approved10/received6/outstanding4, **when** 5 is entered, **then** the view shows those balances and identifies the invalid line/limit; a concurrent receipt is reconciled before another attempt.
- **AC6.5.6**: **Given** receipt submission times out with uncertain outcome, **when** checked/retried, **then** the original operation is reconciled rather than a new receipt created or failure presumed.

### US6.6: Complete receipt

As a Planner, I want to finish receiving an order, so that I can reconcile outstanding quantities.

- Parent: EP06 / FE06.03
- Priority: Must Have
- Requirements: FR8,FR7
- Planned tasks: SS-15/16
- Depends on: US6.5
- INVEST: use an isolated complete receipt fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC6.6.1**: **Given** approved10 with received6 and remaining4, **when** remaining4 is received, **then** receiving remaining4 after6 against10 completes the line; all lines fulfilled makes Received, including a full first receipt from Approved.
- **AC6.6.2**: **Given** a multi-line order with an outstanding line, **when** another line completes, **then** any outstanding line keeps the order PartiallyReceived.
- **AC6.6.3**: **Given** a terminal or unapproved order and a new receipt key, **when** a new receipt is attempted, **then** new receipts against Received/Rejected/Cancelled/unapproved states fail; exact replay returns only its original result.

- **AC6.6.4**: **Given** a committed receipt, **when** shown, **then** its identity, updated balances/order state and linked stock movement are available; another outstanding line keeps PartiallyReceived.

## EP07: AI assistant and agentic workflows

### US7.1: Local assistant inference

As a Reviewer, I want to run real CPU inference, so that I can evaluate without owner hardware or secrets.

- Parent: EP07 / FE07.01
- Priority: Must Have
- Requirements: FR15,NFR11,NFR2
- Planned tasks: SS-36
- Depends on: US8.1,US8.4
- INVEST: use an isolated local assistant inference fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC7.1.1**: **Given** a documented verified CPU model/runtime, **when** Strands invokes local generation, **then** documented verified model/runtime supports actual Strands generation without the owner GPU or credentials.
- **AC7.1.2**: **Given** an unavailable local provider, **when** generation is requested, **then** local failure is explicit and cannot automatically fall back to an external provider.
- **AC7.1.3**: **Given** explicit optional external-adapter configuration, **when** provider adapter contract tests execute, **then** optional adapter fixtures preserve StockSense contracts; live remote activation needs deliberate configuration/credentials/spend policy. OQ1/OQ8 fix model/runtime limits.

### US7.2: Authorized retrieval

As a Planner, I want to retrieve relevant supplier evidence, so that I can ground answers in permitted sources.

- Parent: EP07 / FE07.02
- Priority: Must Have
- Requirements: FR16,FR10.1,NFR3
- Planned tasks: SS-33/34
- Depends on: US3.3,US8.5
- INVEST: use an isolated authorized retrieval fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC7.2.1**: **Given** authorized source chunks and embedding configuration, **when** evidence is indexed and retrieved, **then** server-owned Qdrant routing isolates collections by retailer and embedding/configuration version.
- **AC7.2.2**: **Given** a foreign collection, wrong-model vector or deleted source, **when** retrieval is requested, **then** client-selected collections, wrong-model vectors, foreign/deleted documents cannot become evidence.
- **AC7.2.3**: **Given** a repeated versioned upsert/deletion event, **when** the ingestion consumer replays it, **then** no duplicate chunk effect occurs and deleted evidence is absent; index-wide cutover/rollback/rebuild is accepted under US7.12.

### US7.3: Embedding comparison

As a Reviewer, I want to compare both embedding candidates, so that I can inspect the basis for model selection.

- Parent: EP07 / FE07.02
- Priority: Must Have
- Requirements: FR16.1,NFR14
- Planned tasks: SS-34
- Depends on: US7.2
- INVEST: use an isolated embedding comparison fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC7.3.1**: **Given** held-out English queries for both selected candidates, **when** both embeddings are evaluated, **then** held-out English queries compare EmbeddingGemma-300M and Qwen3-Embedding-0.6B for retrieval quality, citations, CPU latency/memory and reproducible setup.
- **AC7.3.2**: **Given** different candidate embedding dimensions, **when** candidate indexes are created, **then** separate candidate collections prevent dimension/configuration mixing on the same fixtures.
- **AC7.3.3**: **Given** preserved original text and language metadata, **when** a later language fixture is supplied, **then** original text/language metadata allows later multilingual extension without claiming additional language acceptance; OQ1 winner follows evaluation.

### US7.4: Bounded assistant conversation

As a Planner, I want to ask questions through a controlled assistant, so that I can obtain evidence without granting purchasing authority.

- Parent: EP07 / FE07.03
- Priority: Must Have
- Requirements: FR14,NFR5,NFR8,NFR14
- Planned tasks: SS-22/23
- Depends on: US7.1,US7.2,US8.2
- INVEST: use an isolated bounded assistant conversation fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC7.4.1**: **Given** an authenticated retailer context and representative read tool, **when** Strands executes a conversation, **then** the read result and tenant-scoped tool-control contract are demonstrated through OpenAPI; calculation, review and draft integration are accepted in US7.8-10, with retry safety present from the first mutation.
- **AC7.4.2**: **Given** authorized read-tool output or streaming failure, **when** the response renders, **then** responses cite returned evidence versions; streaming/loading/completion/error states are explicit and keyboard-operable.
- **AC7.4.3**: **Given** model-provided tenant authority or forbidden approval requests, **when** the model attempts a forbidden call, **then** model-selected tenant authority or forbidden approval calls are rejected by backend enforcement.

- **AC7.4.4**: **Given** a citation, **when** the planner opens it, **then** the authorized source/data version supporting the claim is shown, or explicit unavailable/deleted status appears rather than substituted content.

### US7.5: Agent evaluation and audit evidence

As a Reviewer, I want to inspect adversarial agent results, so that I can assess enforceable safety and grounding.

- Parent: EP07 / FE07.04
- Priority: Must Have
- Requirements: FR14,FR17.1,NFR10,NFR15
- Planned tasks: SS-23/34/37
- Depends on: US7.4,US9.1
- INVEST: use an isolated agent evaluation and audit evidence fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC7.5.1**: **Given** injected supplier instructions, substituted tenants, fabricated citations and approval requests, **when** agent/backend evaluation runs, **then** forbidden access/actions are rejected, no unauthorized disclosure/mutation occurs and unsupported citations are not presented as evidence. Required rejection failures remain failed acceptance.
- **AC7.5.2**: **Given** completed and rejected tool actions, **when** audit history is inspected, **then** audited tool actions/rejections identify actor/retailer/tool/target/outcome and permitted provenance without hidden reasoning, secrets or full prompts.
- **AC7.5.3**: **Given** valid authorized read and draft cases plus failed adversarial cases, **when** evaluation is reported, **then** valid tools work, missing evidence/failures stay explicit and disabling all tools cannot satisfy safety acceptance.

### US7.6: Investigate inventory shortages

As a Planner, I want to ask why a product is running short, so that I can inspect evidence behind recommendations.

- Parent: EP07 / FE07.05
- Priority: Must Have
- Requirements: FR14,FR4,FR5
- Planned tasks: SS-22/23
- Depends on: US7.4,US4.1,US2.3
- INVEST: use an isolated investigate inventory shortages fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC7.6.1**: **Given** an authorized product and inventory/forecast evidence, **when** the planner asks why stock is low, **then** authorized inventory/history/forecast tools supply the facts and versions cited in the explanation.
- **AC7.6.2**: **Given** missing or stale input evidence, **when** an explanation is requested, **then** missing or stale inputs yield explicit limitations rather than invented demand.
- **AC7.6.3**: **Given** a question naming another retailer’s product, **when** the question is processed, **then** questions naming another retailer’s product cannot disclose its data.

### US7.7: Compare suppliers conversationally

As a Planner, I want to ask for eligible supplier comparisons, so that I can understand commercial tradeoffs.

- Parent: EP07 / FE07.06
- Priority: Must Have
- Requirements: FR14,FR10.1,FR6
- Planned tasks: SS-22/23
- Depends on: US7.4,US3.3
- INVEST: use an isolated compare suppliers conversationally fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC7.7.1**: **Given** eligible versioned supplier offers, **when** the planner requests comparison, **then** domain tools compare eligible offers and responses cite source versions.
- **AC7.7.2**: **Given** retrieved unvalidated text conflicting with accepted terms, **when** the agent compares offers, **then** unvalidated retrieved text cannot override accepted commercial terms or calculation rules.
- **AC7.7.3**: **Given** insufficient eligible supplier evidence, **when** a recommendation is requested, **then** insufficient eligible evidence is disclosed without inventing a preferred supplier.

### US7.8: Explain replenishment scenarios

As a Planner, I want to ask how quantities were calculated, so that I can challenge inputs before purchasing.

- Parent: EP07 / FE07.07
- Priority: Must Have
- Requirements: FR14,FR6,FR7
- Planned tasks: SS-22/23
- Depends on: US7.4,US5.3
- INVEST: use an isolated explain replenishment scenarios fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC7.8.1**: **Given** current authorized replenishment inputs, **when** the planner asks how a quantity was calculated, **then** domain-tool calculations explain MOQ, pack, lead time and buffer effects with current input versions.
- **AC7.8.2**: **Given** a requested scenario change, **when** the planner requests comparison, **then** scenario changes use deterministic calculation results rather than model-invented quantities.
- **AC7.8.3**: **Given** no usable forecast, **when** replenishment is requested, **then** no valid forecast produces explicit unavailability and no purchase creation.

### US7.9: Request review in conversation

As a Planner, I want to request the existing manual review through chat, so that I can refresh suggestions within the same controls.

- Parent: EP07 / FE07.07
- Priority: Must Have
- Requirements: FR14,FR9,FR9.1,FR9.2,FR9.3
- Planned tasks: SS-22/23/35
- Depends on: US7.4,US5.4,US5.5
- INVEST: use an isolated request review in conversation fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC7.9.1**: **Given** an explicit authorized manual-review request, **when** the assistant calls the manual-review tool, **then** an explicit authorized request invokes the same quota/job/outbox operation as the UI and returns its actual job.
- **AC7.9.2**: **Given** exhausted allowance or an active review, **when** the tool is invoked, **then** exhausted allowance or active jobs cannot be bypassed; the response explains the real result.
- **AC7.9.3**: **Given** an accepted failed job being retried, **when** the agent retries the job, **then** same-job retries preserve charge/deduplication and do not trigger retraining.

### US7.10: Draft a proposal conversationally

As a Planner, I want to turn purchase intent into a draft, so that I can review a prepared proposal.

- Parent: EP07 / FE07.08
- Priority: Must Have
- Requirements: FR14,FR14.1,FR7
- Planned tasks: SS-22/23
- Depends on: US7.4,US6.1
- INVEST: use an isolated draft a proposal conversationally fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC7.10.1**: **Given** clear authorized purchase intent and validated inputs, **when** confirmation opens, **then** it shows retailer, supplier, products, quantities, prices/currency, source versions and `Create Draft only`, traps focus accessibly, and offers explicit Confirm/Cancel; Cancel returns focus to the initiating message and creates nothing.
- **AC7.10.5**: **Given** the user confirms the unchanged visible payload, **when** the create tool runs, **then** action-draft identity, confirmation proof, canonical payload hash, context/version and idempotency bind one domain Draft; context change invalidates confirmation and explains the changed input.
- **AC7.10.2**: **Given** ambiguous product/quantity or missing data, **when** the request is interpreted, **then** ambiguous product/quantity or missing inputs cause clarification before mutation.
- **AC7.10.3**: **Given** a request to edit an existing Draft or to submit, approve, reject, cancel, receive or send, **when** evaluated, **then** the assistant performs no mutation and identifies the Planner or Manager action required.

- **AC7.10.4**: **Given** a successful draft tool call, **when** the assistant answers, **then** it labels the result Draft and links to that exact authorized draft for human review/submission.

### US7.11: Recover interrupted agent work

As a Planner, I want to understand and recover incomplete operations, so that I can avoid duplicate business effects.

- Parent: EP07 / FE07.09
- Priority: Must Have
- Requirements: FR14,NFR7,NFR10
- Planned tasks: SS-22/23
- Depends on: US7.4,US7.9,US7.10
- INVEST: use an isolated recover interrupted agent work fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC7.11.1**: **Given** an operation with completed, incomplete or uncertain tools, **when** cancellation or configured limits trigger, **then** a persistent operation summary stops further work and groups steps as Completed, Incomplete or Outcome unknown with committed Draft/review identities; committed actions are never described as undone.
- **AC7.11.2**: **Given** a lost response after a mutating tool call, **when** the operation is retried, **then** ambiguous mutating responses reconcile original idempotency key/result before retry, preventing duplicate drafts or review charges.
- **AC7.11.3**: **Given** a provider/tool failure, **when** displayed, **then** text distinguishes retryable from terminal failure, shows safe correlation and `Check status` for unknown mutation outcomes without secrets/external fallback; Retry appears only after reconciliation proves no effect committed, and absent limits yield `blocked-prerequisite`.

- **AC7.11.4**: **Given** cancellation after a draft/review committed, **when** execution stops, **then** completed draft/job identities and unfinished/uncertain actions are distinguished with the existing result/reconciliation path; cancellation does not undo committed drafts or charges.

### US7.12: Manage index lifecycle

As a Operator, I want to rebuild and switch retrieval indexes, so that I can preserve authorized evidence through index changes.

- Parent: EP07 / FE07.02
- Priority: Must Have
- Requirements: FR16,FR16.2,NFR3
- Planned tasks: SS-33/34
- Depends on: US7.2
- INVEST: isolate the manage index lifecycle fixture; completion is this specific
  capability, with final integrated recovery/evidence in US9.6/US10.2.

- **AC7.12.1**: **Given** versioned retained source data, **when** a new model/config index is built, **then** per-retailer collections reconcile source versions and deletions.
- **AC7.12.2**: **Given** a validated replacement index and expected route version, **when** cutover or rollback occurs through the PostgreSQL routine-owned compare-and-swap route, **then** exactly one intended generation becomes active and vector configurations never mix.
- **AC7.12.3**: **Given** missing/deleted/foreign sources or interrupted indexing, **when** rebuilt, **then** unauthorized evidence stays unavailable and counts/provenance reconcile before activation.
- **AC7.12.4**: **Given** startup or restore with a missing/mismatched PostgreSQL route, Qdrant collection, dimension, count or digest, **when** reconciliation runs, **then** retrieval remains unavailable until the active generation is proved or an authorized expected-version rollback/cutover succeeds.

## EP08: Local platform and delivery

### US8.1: Build the application skeleton

As a Reviewer, I want to build from a clean checkout, so that I can verify the chosen stack.

- Parent: EP08 / FE08.01
- Priority: Must Have
- Requirements: NFR11,NFR13,NFR4
- Planned tasks: SS-03
- Depends on: None
- INVEST: use an isolated build the application skeleton fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC8.1.1**: **Given** a clean checkout and pinned prerequisites, **when** documented builds and smoke checks run, **then** pinned prerequisites build React/TypeScript/Ant Design/Vite, .NET API/worker/identity and Python boundaries with health/smoke checks.
- **AC8.1.2**: **Given** Vite development and production modes, **when** the frontend runs/builds, **then** vite dev mode renders an Ant Design component and its production output is served by ASP.NET Core.
- **AC8.1.3**: **Given** unsupported prerequisites or an EF dependency, **when** prerequisite/dependency validation runs, **then** unsupported prerequisites or EF dependency produce validation failure; OQ8 versions and development practices precede coding.

### US8.2: Validate integration contracts

As a Operator, I want to check integration schemas, so that I can catch incompatibilities before deployment.

- Parent: EP08 / FE08.02
- Priority: Must Have
- Requirements: NFR8,NFR8.1,NFR8.2,NFR8.3
- Planned tasks: SS-04/05
- Depends on: US8.1
- INVEST: use an isolated validate integration contracts fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC8.2.1**: **Given** the initial inventory/import REST boundary, **when** the reusable contract-validation capability runs, **then** OpenAPI covers payload/auth/tenant/errors for that flow; each later consumer story must add and pass its contracts before acceptance.
- **AC8.2.2**: **Given** an initial representative job/event fixture, **when** async contract validation runs, **then** AsyncAPI examples validate; later messaging consumers add their own contracts and US10.2 checks final all-flow coverage.
- **AC8.2.3**: **Given** invalid examples or incompatible schema changes, **when** CI contract validation runs, **then** invalid examples and incompatible changes fail applicable CI validation.
- **AC8.2.4**: **Given** the browser/BFF, messaging, evidence, heavy-lease, signed-model and recovery-barrier boundaries, **when** catalogue validation runs, **then** their complete versioned schemas, security/idempotency rules, examples and compatibility policies exist; legacy placeholders block dependent code generation.

### US8.3: Provision local Kubernetes

As a Operator, I want to reproduce the local infrastructure, so that I can give reviewers a controlled environment.

- Parent: EP08 / FE08.03
- Priority: Must Have
- Requirements: NFR12,NFR2,NFR6
- Planned tasks: SS-06
- Depends on: US8.1
- INVEST: use an isolated provision local kubernetes fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC8.3.1**: **Given** Docker Desktop and protected bootstrap credentials, **when** Terraform/Terragrunt and Helm apply, **then** terraform/Terragrunt and Helm reproduce local HTTPS, PVCs, probes and service prerequisites.
- **AC8.3.2**: **Given** local state or an explicitly chosen backend, **when** state is used for an apply, **then** default local or deliberately configured remote state remains protected, backed up and serialized outside ephemeral job workspaces.
- **AC8.3.3**: **Given** missing disk/resources/bootstrap inputs, **when** prerequisite checks run, **then** missing disk/bootstrap credentials or insufficient resources fail explicitly without assumed extra host capacity or cloud provisioning; OQ5/OQ8 precede setup.

### US8.4: Provide scoped workload secrets

As a Operator, I want to bootstrap Vault and workload credentials, so that I can avoid secrets in source and state.

- Parent: EP08 / FE08.04
- Priority: Must Have
- Requirements: NFR6
- Planned tasks: SS-29/30
- Depends on: US8.3
- INVEST: use an isolated provide scoped workload secrets fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC8.4.1**: **Given** protected Vault bootstrap access, **when** Vault is initialized, **then** persistent TLS Raft Vault protects unseal/recovery material outside the cluster and retires root-token use after scoped admin setup.
- **AC8.4.2**: **Given** workload-specific Kubernetes identities, **when** VSO synchronizes workload credentials, **then** vSO and Kubernetes identity policies synchronize only authorized secrets without Git/Terraform-state exposure.
- **AC8.4.3**: **Given** sealed Vault, absent credentials or an unauthorized workload identity, **when** a dependent workload starts, **then** it remains `NotReady`, exposes the typed `secret-unavailable` or `secret-access-denied` reason, serves no business endpoint and performs no business write; no default or plaintext credential fallback occurs, and Vault bootstrap remains independent of application databases.

### US8.5: Reliable asynchronous work

As a Operator, I want to retry and replay jobs safely, so that I can avoid duplicate effects during failures.

- Parent: EP08 / FE08.02
- Priority: Must Have
- Requirements: NFR7,NFR7.1,NFR3,NFR5
- Planned tasks: SS-12
- Depends on: US8.2,US8.3,US1.4
- INVEST: use an isolated reliable asynchronous work fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC8.5.1**: **Given** a committed representative job and outbox, **when** the outbox relay publishes and the consumer commits, **then** durable publication/confirms plus transactional outbox/inbox acknowledge only after business commit.
- **AC8.5.2**: **Given** a representative transactional-effect consumer fixture, **when** broker/worker failures and redelivery occur, **then** the effect commits once with tenant/job authority checked; actual import/receipt consumers repeat the failure tests before their own acceptance.
- **AC8.5.3**: **Given** envelopes of 65,535, 65,536 and 65,537 bytes, delivery attempts one through six, backoff endpoints of one and 30 seconds, and replay batches of 100 and 101, **when** authenticated publication/delivery/replay is evaluated, **then** the first two envelope sizes are accepted and 65,537 is rejected before publication; attempts one through five preserve canonical digest/attempt identity and attempt six creates no sixth delivery; contract-defined backoff stays within the inclusive bounds; seven-day DLQ retention applies; batch 100 is accepted and batch 101 is rejected atomically.
- **AC8.5.4**: **Given** a parameterized domain-consumer conformance fixture, **when** duplicate, changed-payload, stale-authority, crash-before-commit and crash-after-commit schedules run, **then** that consumer proves inbox uniqueness, current authority and one atomic business effect/outbox result; the representative platform fixture alone is insufficient.

### US8.6: Migrate IaC state

As a Operator, I want to move the configured backend deliberately, so that I can retain control of deployment state.

- Parent: EP08 / FE08.03
- Priority: Must Have
- Requirements: NFR12
- Planned tasks: SS-06/25
- Depends on: US8.3
- INVEST: use an isolated migrate iac state fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC8.6.1**: **Given** backed-up state and an explicitly selected target, **when** state migration executes, **then** explicit target selection and backed-up state allow verified identity-preserving migration.
- **AC8.6.2**: **Given** two simultaneous apply attempts, **when** both applies request the lock, **then** concurrent applies are blocked by tested locking/serialization.
- **AC8.6.3**: **Given** an interrupted state migration, **when** recovery runs, **then** failed migration recovers through documented backup without committed state or implicit cloud storage.

### US8.7: Check changes before integration

As a Operator, I want to run hosted CI safeguards, so that I can prevent unsafe code reaching deployment.

- Parent: EP08 / FE08.05
- Priority: Must Have
- Requirements: NFR13,NFR8
- Planned tasks: SS-05
- Depends on: US8.1,US8.2
- INVEST: use an isolated check changes before integration fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC8.7.1**: **Given** a pull request on a working branch, **when** hosted CI runs, **then** hosted PR CI reports applicable build/test/contract/migration/security results.
- **AC8.7.2**: **Given** a failed required check, **when** merge readiness is evaluated, **then** failed required checks block integration and branch safeguards are verified under SS-01.
- **AC8.7.3**: **Given** an untrusted public pull request, **when** PR code executes, **then** public PR code cannot reach the isolated local runner or deployment secrets; OQ8 resolves runner isolation.

### US8.8: Deploy trusted revisions

As a Operator, I want to roll out identified revisions safely, so that I can avoid broken schema/application combinations.

- Parent: EP08 / FE08.05
- Priority: Must Have
- Requirements: NFR13,NFR12
- Planned tasks: SS-25
- Depends on: US8.7,US6.6,US8.6
- INVEST: use an isolated deploy trusted revisions fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC8.8.1**: **Given** an explicitly trusted revision, **when** trusted delivery executes, **then** trusted runner deployment records immutable image identity and IaC/Helm inputs.
- **AC8.8.2**: **Given** a failing Flyway migration, **when** rollout is attempted, **then** flyway validation/migration failure blocks rollout.
- **AC8.8.3**: **Given** a previous schema-compatible application image, **when** rollback executes, **then** rollback selects a known image with tested schema compatibility and traceable release identity.

## EP09: Observability, audit and recovery

### US9.1: Atomic business audit

As a Operator, I want to retain authoritative audit events, so that I can explain sensitive changes during search outages.

- Parent: EP09 / FE09.01
- Priority: Must Have
- Requirements: FR17,FR17.1,NFR4
- Planned tasks: SS-37
- Depends on: US1.4,US8.2
- INVEST: use an isolated atomic business audit fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC9.1.1**: **Given** a representative authorized business-mutation fixture, **when** it commits, **then** mutation, audit and outbox commit atomically with actor/tenant/target/outcome/provenance. Each later inventory/purchase/membership/review/promotion/privileged/agent story proves its own integration; US10.2 verifies the complete coverage matrix.
- **AC9.1.2**: **Given** an injected audit failure or rejected request, **when** mutation/rejection processing executes, **then** audit failure rolls back mutation; rejected attempts use a separate record surviving business rollback.
- **AC9.1.3**: **Given** runtime update/delete or foreign-tenant access attempts, **when** audit access is attempted, **then** runtime update/delete and cross-tenant audit access fail; controlled retention has separate authority.

### US9.2: Search authorized audit history

As a Planner, I want to inspect retailer business actions, so that I can understand sensitive changes.

- Parent: EP09 / FE09.01
- Priority: Must Have
- Requirements: FR17,FR17.1,FR18,NFR3
- Planned tasks: SS-38
- Depends on: US9.1,US8.5,US8.4
- INVEST: use an isolated search authorized audit history fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC9.2.1**: **Given** repeated RabbitMQ audit deliveries, **when** projection replays the events, **then** rabbitMQ projection deduplicates indexed events by ID.
- **AC9.2.2**: **Given** an ordinary user with one retailer membership, **when** audit search is requested, **then** tenant-authorized APIs return only permitted events and ordinary users cannot access operator-wide Dashboards.
- **AC9.2.3**: **Given** OpenSearch outage or delayed projection, **when** index recovery runs, **then** index outage/replay exposes lag while PostgreSQL remains authoritative and retained events rebuild search.

### US9.3: Investigate operational failures

As a Operator, I want to correlate requests across services, so that I can find failures without exposing sensitive data.

- Parent: EP09 / FE09.02
- Priority: Must Have
- Requirements: FR18,NFR10
- Planned tasks: SS-24/38
- Depends on: US9.2
- INVEST: use an isolated investigate operational failures fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC9.3.1**: **Given** API/message/ML/agent operations and the versioned OQ6 telemetry profile, **when** correlated telemetry is inspected, **then** OpenSearch logs and configured metrics/traces correlate API, message/job, ML and agent operations; every metric label set stays within the profile's named series/cardinality budget and evidence reports observed versus allowed counts. Without that profile this check is `not-run`/`blocked-prerequisite`.
- **AC9.3.2**: **Given** sensitive values in processing context, **when** logs are emitted, **then** default logging excludes credentials, tokens, supplier text, full prompts and hidden reasoning.
- **AC9.3.3**: **Given** telemetry outage and buffer pressure under the versioned OQ6 profile, **when** business work continues, **then** buffers never exceed the profile limit, overflow follows its named drop/reject policy, `telemetry-loss` evidence records affected signal/count/time range, and business commits remain available; without the profile this check is `not-run`/`blocked-prerequisite`.

### US9.4: Measure performance and capacity

As a Reviewer, I want to inspect measured local resource evidence, so that I can judge whether the setup fits its promise.

- Parent: EP09 / FE09.02
- Priority: Must Have
- Requirements: NFR1,NFR1.1,NFR1.2,NFR2,NFR2.1,NFR15
- Planned tasks: SS-24
- Depends on: US4.4,US7.5,US9.3
- INVEST: use an isolated measure performance and capacity fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.
- Readiness: Blocked for implementation/sizing until the NFR1.2 workload profile
  fixes operation mix, arrival/request count, warm-up, denominator and classifications.

- **AC9.4.1**: **Given** the seeded warm stack and five concurrent users with mix/sample count/duration/hardware fixed before running, **when** ordinary inventory/purchasing reads are benchmarked including authorization, **then** measured p95 is strictly below one second and all parameters/results are published.
- **AC9.4.2**: **Given** the full demo including OpenSearch/Dashboards, Vault/VSO, Redis, Qdrant, agent services and one active ML job, **when** capacity is measured, **then** sustained and peak RAM/CPU including Kubernetes/VM overhead fit 16GB/3CPU without extra assumed host resources.
- **AC9.4.3**: **Given** startup/download/inference measurements or a failed budget result, **when** the measured report is published, **then** startup/download/LLM measurements are separate; failed fit is reported for owner decision without dropping services or increasing budgets silently.
- **AC9.4.4**: **Given** the versioned import/reliability profile, **when** Retail Data is measured, **then** admission, queue and active-processing clocks are reported separately, start/deadline/readiness/restart targets are checked, and unexpected errors/timeouts use the profile's fixed operation mix, request count and denominator; that profile is an implementation prerequisite rather than an inferred test mix.
- **AC9.4.5**: **Given** embedding/model/index and whole-cluster profiles, **when** measured at exact resource boundaries, **then** pinned artifact size, peak RSS, pod/host sampling interval, duration, throttling/OOM state and 1.5/2/16 GiB plus 3 CPU outcomes are recorded; heavy phases serialize and an absent profile is `blocked-prerequisite`.

### US9.5: Consistent retention

As a Operator, I want to expire logs and audits consistently, so that I can prevent expired data returning after recovery.

- Parent: EP09 / FE09.03
- Priority: Must Have
- Requirements: NFR9,FR17
- Planned tasks: SS-37/38/26
- Depends on: US9.2
- INVEST: use an isolated consistent retention fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC9.5.1**: **Given** configured 7-day operational-log and 90-day business-audit retention, **when** retention maintenance executes, **then** PostgreSQL and OpenSearch compare UTC instants with the same versioned rule: age below the period is retained and age equal to or greater than the period is expired, proven by fixtures immediately before, exactly at and immediately after each cutoff; OQ10 governs only maintenance schedule and allowed cleanup lag.
- **AC9.5.2**: **Given** an expired event and index rebuild/rollback, **when** the projection is rebuilt, **then** rebuild/rollback cannot resurrect expired audit data.
- **AC9.5.3**: **Given** a backup containing now-expired records, **when** backup data is restored, **then** restore applies the documented backup-expiry/cleanup policy with boundary fixtures; OQ5/OQ10 specify schedule and allowed lag before implementation.

### US9.6: Restore the application

As a Operator, I want to recover into a clean environment, so that I can demonstrate recoverability.

- Parent: EP09 / FE09.03
- Priority: Must Have
- Requirements: FR20,NFR9
- Planned tasks: SS-26
- Depends on: US8.8,US4.5,US9.5,US9.7,US9.9,US9.10,US9.11,US7.12
- INVEST: integrated recovery proof over independently accepted restore/replay
  capabilities, not a single implementation story spanning all stores. Its fixture
  is the full seeded clean environment; detailed restore work is US9.9/9.10.

- **AC9.6.1**: **Given** validated store/secret restore capabilities and a recovery manifest, **when** the integrated clean-environment restore runs after explicit Operator confirmation, **then** a visible run identity shows current phase/checkpoint/scope and protected backups restore business/identity PostgreSQL, MongoDB and artifacts with key sets, digests, stock and provenance reconciled.
- **AC9.6.2**: **Given** retained authoritative source versions, **when** projections are rebuilt, **then** rebuilt audit/vector projections preserve retained source versions, deletions and expiry.
- **AC9.6.3**: **Given** broker/worker interruption or partial restore failure, **when** replay/rollback/recovery handling executes, **then** the view identifies what remains fenced, what resumed, the authorized next action and terminal Succeeded, Failed, Aborted or Safely resumed status; success is unavailable until reconciliation passes, and OQ5 objectives are fixed and measured.

### US9.7: Rotate and recover credentials

As a Operator, I want to restore secret and key access, so that I can recover without lost in-cluster credentials.

- Parent: EP09 / FE09.03
- Priority: Must Have
- Requirements: NFR6,FR20
- Planned tasks: SS-31
- Depends on: US8.4,US1.5,US8.5
- INVEST: use an isolated rotate and recover credentials fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC9.7.1**: **Given** a rotated workload credential, **when** consumers reload or roll out, **then** credential rotation triggers tested consumer reload/rollout with service access under new credentials.
- **AC9.7.2**: **Given** sealed Vault or expired credentials, **when** consumers request access, **then** sealed Vault and expired credentials fail explicitly without excessive fallback permissions.
- **AC9.7.3**: **Given** protected snapshots and key/unseal material outside the cluster, **when** secret/key recovery executes, **then** protected snapshots/unseal/identity-key material outside the cluster restore workload access in a clean environment.

### US9.8: Extract one tenant

As a Operator, I want to move a retailer to dedicated storage, so that I can evolve deployment without mixing data.

- Parent: EP09 / FE09.04
- Priority: Must Have
- Requirements: FR20,NFR3
- Planned tasks: SS-27
- Depends on: US9.6
- INVEST: use an isolated extract one tenant fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC9.8.1**: **Given** a chosen retailer with queued/active work, **when** tenant migration begins, **then** pause/drain chosen tenant work then copy and reconcile database, document and artifact data before cutover.
- **AC9.8.2**: **Given** validated copied data and a new placement generation, **when** cutover executes, **then** the placement record changes atomically, caches invalidate, all new reads/writes resolve only to the new generation, stale jobs/routes return typed `stale-placement-generation` without effect, and evidence proves there was no dual-route business write.
- **AC9.8.3**: **Given** post-cutover writes and other retailers, **when** the migrated tenant is used, **then** post-cutover writes preserve stock/provenance/isolation and other tenants retain their intended placement.

### US9.9: Restore relational stores

As a Operator, I want to restore business and identity databases, so that I can recover authoritative relational records.

- Parent: EP09 / FE09.03
- Priority: Must Have
- Requirements: FR20,NFR9
- Planned tasks: SS-26
- Depends on: US9.5,US1.5,US9.11
- INVEST: isolate the restore relational stores fixture; completion is this specific
  capability, with final integrated recovery/evidence in US9.6/US10.2.

- **AC9.9.1**: **Given** a protected backup and versioned recovery manifest from US9.11, **when** restored into clean isolated databases, **then** business/identity key sets, digests, stock-ledger balance, audit/source versions and integrity checks match the fixture and manifest cut.
- **AC9.9.2**: **Given** expired audit records in backup, **when** retention reconciliation runs before exposure, **then** expired records cannot reappear in live access.
- **AC9.9.3**: **Given** a corrupt or incomplete backup, **when** restoration is attempted, **then** validation fails explicitly and the restored service is not declared recovered.

### US9.10: Restore documents and model artifacts

As a Operator, I want to restore source documents and versioned artifacts, so that I can recover evidence needed for retrieval and model provenance.

- Parent: EP09 / FE09.03
- Priority: Must Have
- Requirements: FR20,NFR3
- Planned tasks: SS-26
- Depends on: US3.3,US4.2
- INVEST: isolate the restore documents and model artifacts fixture; completion is this specific
  capability, with final integrated recovery/evidence in US9.6/US10.2.

- **AC9.10.1**: **Given** protected MongoDB/PVC artifact backups and OQ5 policy, **when** restored, **then** document versions and artifact checksums reconcile with their metadata.
- **AC9.10.2**: **Given** missing/corrupt files or wrong-retailer access, **when** checked, **then** recovery/access fails explicitly without substituting another source.
- **AC9.10.3**: **Given** restored source/deletion records, **when** handed to projection rebuild, **then** retained provenance and deletion state are available without claiming the index itself has already recovered.

### US9.11: Capture a consistent recovery cut

As a Operator, I want to quiesce PostgreSQL and RabbitMQ changes for backup, so that recovery evidence represents one consistent boundary.

- Parent: EP09 / FE09.03
- Priority: Must Have
- Requirements: FR20.1,NFR8.3
- Planned tasks: SS-06/26
- Depends on: US8.2,US8.5,US9.1
- INVEST: isolates barrier coordination and externally observable partial-failure behavior from the later full restore drill.
- Readiness: Recovery policy v1 resolves OQ5 participant and global deadlines;
  implementation must validate them under the local resource envelope.

The story owns a versioned recovery manifest containing barrier ID/generation,
fencing epoch, PostgreSQL LSN/transaction evidence, included queue identities and
digests, participant states, snapshot state and terminal outcome. Delivery splits
into a coordinator plus PostgreSQL and RabbitMQ participants behind this contract.

- **AC9.11.1**: **Given** an authorized recovery request, **when** participants register and the coordinator prepares/closes the versioned barrier, **then** affected producers, consumers, relays, acknowledgements and topology mutations are fenced before the snapshot starts, and stale fencing tokens are rejected.
- **AC9.11.2**: **Given** a quiesced cut, **when** captured, **then** PostgreSQL LSN/transaction evidence and per-queue identities/digests bind the broker-supported snapshot manifest.
- **AC9.11.3**: **Given** participant timeout, lost prepare acknowledgement, abort-before-delayed-prepare ordering, coordinator restart or failure at close/drain/evidence/snapshot/resume, **when** recovery policy v1 executes idempotent abort/resume, **then** class A participants use 30/30/30/60-second, class B 60/60/60/120-second, and class C 120/180/60/180-second prepare/close/abort/resume deadlines; global registration, prepare, close/drain/evidence, snapshot, abort and resume/reconciliation limits are 60 seconds, 5 minutes, 5 minutes, 30 minutes, 5 minutes and 10 minutes; prepare dispatch is durable before send; every potentially delivered participant receives abort regardless of prepare acknowledgement; the participant's durable terminal guard prevents late prepare/close from acquiring or recreating a fence; the operator view shows run identity, phase, checkpoint, scope, terminal fencing inventory and terminal Failed, Aborted or Safely resumed state; `Aborted` requires complete abort acknowledgement plus cleared-or-suppressed fence disposition for the dispatch inventory, no success marker exists, a timeout leaves unresolved participants fenced, and an abandoned generation can never publish success.
- **AC9.11.4**: **Given** a destructive snapshot/recovery action, **when** requested, **then** the Operator reviews scope and manifest summary and explicitly confirms; status inspection/validation remains non-destructive, and success is unavailable until every participant and reconciliation check passes.

## EP10: Reviewer experience and portfolio evidence

### US10.1: Reproduce the reviewer journey

As a Reviewer, I want to run the full demo independently, so that I can assess the project from source.

- Parent: EP10 / FE10.01
- Priority: Must Have
- Requirements: NFR11,NFR11.1,NFR14,NFR14.1,NFR15
- Planned tasks: SS-28
- Depends on: US6.6,US7.5,US9.4,US9.6,US9.8
- INVEST: use an isolated reproduce the reviewer journey fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC10.1.1**: **Given** a clean reviewer environment without owner secrets/GPU, **when** documented bootstrap/demo runs, **then** clean checkout without owner secrets/cached models/AMD GPU follows documented prerequisites, verified downloads, local login and real CPU inference.
- **AC10.1.2**: **Given** seeded demo accounts and agreed dataset, **when** the full journey is performed, **then** walkthrough covers import, inventory, forecast, shortage, draft, human approval, simulated receipt and evaluation with linked evidence.
- **AC10.1.3**: **Given** a missing prerequisite or failed setup step, **when** setup is attempted, **then** missing prerequisites/failure yield actionable setup/recovery diagnostics rather than a claimed successful demo.

- **AC10.1.4**: **Given** provisioned demo memberships and keyboard-only operation, **when** retailer selection, import-error inspection, scenario review, submission, manager decision and receipt are traversed, **then** visible focus, meaningful labels, text statuses/errors and logical focus recovery allow completion; updates do not steal focus or rely only on color.
- **AC10.1.5**: **Given** three clean reference-host runs, **when** setup/demo timing is evaluated, **then** every run meets the 90-minute total and 45-minute post-download deadline with each phase reported; no interpolated three-sample p95 substitutes.

### US10.2: Inspect portfolio evidence

As a Reviewer, I want to trace decisions to demonstrated outcomes, so that I can assess engineering skills and limits.

- Parent: EP10 / FE10.02
- Priority: Must Have
- Requirements: NFR15,NFR8.2,FR12
- Planned tasks: SS-28
- Depends on: US10.1
- INVEST: use an isolated inspect portfolio evidence fixture with the dependencies
  below supplied as capabilities, not prior test executions. Acceptance ends at
  the stated outcome; estimate effort after contract decisions, before scheduling.

- **AC10.2.1**: **Given** an identified released revision, **when** evidence is opened, **then** stable links connect requirements, stories, designs, tasks and actual validation evidence.
- **AC10.2.2**: **Given** model/resource/recovery evaluation records, **when** evaluation reports are inspected, **then** model/data cards, rejected candidates, resource/recovery findings and synthetic limitations remain visible.
- **AC10.2.3**: **Given** explicit owner approval for versioned release, **when** release artifacts are published, **then** owner-approved versioned release identifies demonstrated revision/tag/image without fabricated lifecycle or test outcomes.

- **AC10.2.4**: **Given** all delivered consumer stories, **when** the machine-checkable release coverage matrix is validated, **then** every applicable FR/NFR maps through `requirement_id`, `story_id`, `ac_id`, `test_level`, `oracle/profile`, `evidence_artifact`, `revision/environment` and outcome; every REST/async boundary and sensitive business flow has its own contract/authorization/audit/retry evidence; duplicate or unknown IDs and missing applicable mappings fail the relevant quality gate, and foundation fixture passes alone are insufficient.
- **AC10.2.5**: **Given** a versioned evidence manifest, **when** validated, **then** every check has exactly one of passed, failed, limited, rejected, unavailable or not-run plus reason, expected/actual result, trace IDs, immutable revision, environment, timing, command profile, artifact hashes and limitations.

### US10.3: Verify the supported browser profile

As a Reviewer, I want recorded cross-browser evidence, so that I can assess whether the portfolio UI supports its declared clients.

- Parent: EP10 / FE10.03
- Priority: Must Have
- Requirements: NFR14.1,NFR8.1
- Planned tasks: SS-03/11/28
- Depends on: US8.1,US10.1
- INVEST: isolates declared browser/version/viewport compatibility evidence from the broader end-to-end reviewer journey.

- **AC10.3.1**: **Given** the declared test matrix, **when** core routes run, **then** the latest two stable Chrome, Firefox and Edge releases plus current Safari-major compatible WebKit evidence record exact versions and outcomes.
- **AC10.3.2**: **Given** 360x800, 768x1024 and 1440x900 viewports, **when** core states render at 200% zoom/reflow, **then** keyboard order, focus, text alternatives and non-color status remain operable without page-level horizontal scrolling; labeled keyboard-operable data-region overflow is allowed.
- **AC10.3.3**: **Given** an unsupported browser or failed matrix entry, **when** compatibility is assessed, **then** immutable evidence records exact browser/version and failed, limited, unavailable or not-run outcome; the product shows a compatibility message only when it can render one reliably, and detection alone never proves support.

## Delivery readiness and open decisions

This is a story baseline, not a declaration that every story is ready for coding.
OQ1-OQ10 retain the approved requirements’ point-of-use deadlines. Establish
contract schemas, limits and exact fixtures before affected implementation.
Practices affirmation, Git safeguards (SS-01) and design reconciliation (SS-02)
remain prerequisites; no owner approval, test result or completed code is inferred.
Dependencies describe capabilities, not sequential epic completion. Operations
design starts with each service; final integrated proof does not replace early
resource feasibility checks. The story map preserves the existing SS task IDs.


## Lifecycle status reconciliation

The authoritative audit record contains `GATE_APPROVED` and `STAGE_COMPLETED`
receipts for User Stories at 2026-09-22T06:39:38Z. Requirements Analysis had
already been approved at 2026-09-21T16:36:58Z, including explicit accepted-risk
dispositions for its four advisory findings. The `NOT-READY` appendix below is
the immutable advisory review that preceded the User Stories gate; its R-01
describes the then-stale requirements header rather than the later authoritative
gate state. The appendix remains historical evidence. Post-approval downstream
reconciliation edits have caused the framework to mark this completed stage as
drifted, so approval and revalidation status must be reported separately.

## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-09-21T18:45:49Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Evidence | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Critical | aidlc/spaces/default/intents/260908-stock-sense-design/inception/user-stories/stories.md > Status and Scope and priorities; user-stories-questions.md > Source and Consolidated Summary Confirmation; personas.md > Status; user-stories-assessment.md > Rationale; requirements-analysis/requirements.md > Status and Review | The story package repeatedly describes requirements.md as approved, but requirements.md states that independent review and stage approval are pending and its terminal review verdict is NOT-READY with unresolved findings R-01 through R-04. The package therefore relies on and presents an approval state that the frozen source does not have. | Resolve or explicitly disposition the requirements findings through the requirements-analysis gate, then align every story-package approval claim and any affected story or criterion with the resulting requirements baseline. | Unresolved |

### Validation Results

- `stories.md` contained exactly 105,379 bytes and no pre-existing `## Review` heading before this appendix.
- Story structure contains 67 unique `USx.y` stories and 242 unique `ACx.y.z` acceptance criteria, matching the owner-confirmed package summary.
- `traceability.json` contains 58 unique upstream IDs and 58 coverage rows; every row is marked `OK` and targets named story IDs present in `stories.md`.
- The requirements source explicitly says approval is pending and terminates with `**Verdict:** NOT-READY`; the conflicting approved-baseline claims occur in all four lead Markdown artifacts.
- The review was bounded to the seven frozen artifacts and the User Stories stage definition supplied for this retry.

### Summary

The story package is structurally detailed and its declared requirement-to-story coverage is internally complete, but it is founded on a requirements baseline that remains pending and NOT-READY. Engineering cannot treat these stories as approved until that upstream gate is resolved and the package is reconciled to the resulting baseline.
