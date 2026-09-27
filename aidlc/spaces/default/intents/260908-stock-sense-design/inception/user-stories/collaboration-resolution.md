# User Stories collaboration resolution

Date: 2026-09-21

Design, Development, and Quality reviewed the revised 67-story draft independently
in Round 1. The Product lead integrated knowledge corrections into the owned
artifacts. Round 2 is the final reconciliation pass; each participant updates its
own contribution record after comparing the integrated draft with all positions.

## Round 1 integrated changes

- Supplier ingestion now exposes progress, source identity, quality outcomes,
  accessible diagnostics, and corrective actions.
- Assistant draft creation now uses a payload-complete, cancellable confirmation;
  context changes invalidate the confirmation before any mutation.
- Interrupted assistant work now preserves a durable Completed, Incomplete, or
  Unknown result with status reconciliation before retry.
- Model Lifecycle owns the heavy-work lease and fencing token. Final model and
  forecast writes enforce that token, and signing-key rotation, revocation, and
  rollback semantics are explicit.
- Supplier Knowledge owns active-index routing and startup/restore reconciliation;
  retrieval fails closed while PostgreSQL and Qdrant disagree.
- Messaging Platform and domain-consumer responsibilities are separated, and a
  reusable consumer-conformance fixture is required.
- Purchasing owns durable mutation idempotency results. Assistant mutations pass a
  payload-bound key and reconcile through Purchasing.
- The recovery barrier now precedes restore. It produces a versioned recovery
  manifest through a coordinator plus PostgreSQL and RabbitMQ participants, with
  stale-generation fencing, resumable progress, explicit destructive-action
  confirmation, and observable terminal outcomes.
- Browser evidence records exact support results, including browsers that cannot
  render an in-product warning. Shared browser workflows carry an accessibility
  baseline for keyboard, focus, labels, status, errors, and dynamic updates.
- Stories whose reliability, recovery, or lease contracts are unresolved are
  explicitly blocked for implementation or sizing instead of being treated as
  executable acceptance.

## Round 1 triage

No owner judgment call remained after integration. The open points were technical
knowledge objections that could be checked against the revised draft, so all three
participants were re-dispatched for Round 2. Their current positions remain in
`contributions/` and are not rewritten by the lead.

## Validation before Round 2

Before the final policy integration, the draft contained 67 unique story IDs and
239 unique acceptance-criterion IDs. The accepted package and split compound
identity scenarios bring the final draft to 67 stories and 242 criteria.
All 58 requirement IDs are declared in `traceability.json`; output validation and
Markdown whitespace checks pass. These are document checks, not application-test
evidence.

## Round 2 resolution

Round 2 confirmed the supplier, assistant, recovery, browser, accessibility,
index-routing, heavy-work, messaging and sizing corrections. The lead also applied
the remaining objective testability corrections: deterministic race schedules,
typed failure outcomes, exact supplier/message boundary fixtures, split identity
scenarios, telemetry profile blockers and a machine-checkable release matrix.

The owner accepted the recommended Q3 package. The final draft therefore requires
observable Planner-to-Manager handoff and keyboard-safe stale-decision recovery;
retains Purchasing idempotency results for aggregate lifetime plus 90 days after
terminal state and rejects expired-key replay without effect; compares extraction
percentages as exact fractions; and applies 7/90-day retention against UTC instants
with age equal to the configured period treated as expired. OQ10 now governs only
maintenance schedule and allowed cleanup lag.

All Round 2 objections are either integrated or resolved by that owner decision.
No third mob round is planned. The three contribution files preserve the original
specialist positions and the lead does not rewrite them as agreement.

## 2026-09-27 formal redo: current collaboration

The owner chose Modify for the existing artifacts and confirmed the revised
summary. The original policy choices, epic/feature hierarchy and 67 stable story
IDs remain. This is a new collaboration pass against the freshly approved
Requirements Analysis, not a continuation of the 2026-09-21 review receipt.

In current Round 1, Design requested operator-visible queue/fence status and a
complete, accessible view of OQ5 recovery prerequisites. Development identified
missing U5 build dependencies, uncertain lease-expiry fencing and an overbroad
setup gate. Quality found four missing reverse traceability links, a 16 GiB versus
16 GB cluster-budget mismatch, and insufficient U5 completion, resource-profile
and post-OQ5 recovery oracles. Each objection was a checkable knowledge issue;
none required a new owner policy decision.

The integrated draft makes U5 candidate builds clients of the one heavy-work
slot, keeps U5 route activation independent, tests lost lease acknowledgements
and stale build-complete/route attempts, and exposes safe operator status. It
pins and separately measures model and embedding-build cluster profiles against
16 GB/3 CPU, while preserving the distinct 1.5/2 GiB U5 limits. Basic setup
requires disk sufficiency but not the still-open RPO, RTO or backup-expiry values;
the recovery drill visibly blocks objective-based acceptance until those and
the complete disk footprint are confirmed/measured. Current traceability covers
all 59 FR/NFR IDs in both directions with 67 stories and 250 unique criteria;
the declared dependency graph is acyclic. Required-section, upstream-coverage
and traceability sensors passed on the integrated draft. Their own files under
`contributions/` remain the specialists' evidence; the lead does not rewrite them.

Round 2 resolved the Design and Quality objections and Development's four main
objections. Development maintained one narrow concern, quoted verbatim from its
position:

> OBJECT: The sole maintained dissent is AC7.2.1's ambiguous “indexed and retrieved” fixture. Clarify it as retrieval from a validated U5 active route, with candidate/index-wide build and activation accepted under US4.8/US7.12, so US7.2 cannot be read as permission for an unfenced production build.

The lead then revised AC7.2.1 to use a seeded, validated U5 active-route
fixture and to assign candidate/index-wide build and activation to US4.8/US7.12.
The two-round limit prevents another mob round; the independent Product Lead
review must verify that this final edit closes the concern.
