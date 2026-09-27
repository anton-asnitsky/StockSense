# Functional Design continuation audit — 2026-09-27

This is a working assessment of the existing AI-DLC intent
`260908-stock-sense-design`, not a lifecycle receipt or an approval. The engine
remains the authority for stage routing and gates.
An independent read-only StockSense process-steward check on this snapshot
returned **not ready for the Functional Design gate**; it did not change the
workflow.

## Verified position

- Branch `chore/bolt1-retail-data-functional-design` is at `451f04b`, pushed
  to `origin`. Functional Design is revising (revision 17). The 2026-09-26
  owner `Request Changes` and stage reset are recorded; do not request them
  again.
- The current `classic` scope has `review_cap: advisory`. The reviewer
  protocol says an advisory `NOT-READY` verdict is terminal for its single
  normal-flow pass. Thus five `NOT-READY` unit completions are not, by
  themselves, invalid. The prior process-steward objection that evaluated
  the uncapped stage declaration does not establish a violation.
- `aidlc --doctor --json` now reports 61 passed, four warnings, zero failed.
  Codex session hooks have fired since the Claude session. This does not
  retroactively attest earlier Claude reviews or artifact edits.
- The seven 2026-09-26 review-request/review-completed/unit-completed trails
  exist for Contracts, Identity Access, Messaging Platform, Retail Data,
  Recovery Coordination, Supplier Knowledge, and Model Lifecycle. After the
  12:38Z revision reset, the audit has no corresponding `SUBAGENT_COMPLETED`
  records. Treat their appendices as substantive review material, but do not
  claim independent reviewer execution was proven. Their completion receipts
  remain in the engine record until a valid lifecycle action changes them.
- Five of those seven verdicts are `NOT-READY` (Contracts, Messaging Platform,
  Retail Data, Recovery Coordination, and Supplier Knowledge); Identity Access
  and Model Lifecycle were marked `READY`. The former verdicts carry real
  unresolved findings. Advisory terminality is not a claim of design readiness.

## Work to carry forward

1. Follow the engine's current per-unit recovery route. It currently offers
   Contracts with `review_state: recovery-required`, iteration 2. The
   post-review Contracts, Retail Data, and Model Lifecycle fixes need fresh
   reviews against current bytes; do not mark findings resolved ourselves.
2. Complete the six units with no current completion receipt: Forecasting,
   Planning/Purchasing, Assistant, Audit Evidence, Web BFF, and Web
   Application. Keep the review appendix, frozen artifact, and diary rules.
3. Before the Functional Design gate, obtain an independent current-snapshot
   architecture check of the seven earlier units and the required StockSense
   process-steward check. Disclose any review-provenance gap at the gate even
   if current content passes. Do not synthesize missing hook events.
4. Forecasting's `Looks correct` answer is a real owner answer, but the
   confirmed question file was altered to pass a parser guard: the
   2026-09-25 clarification heading was removed while two `[Answer]` lines
   remained under one feedback question. Keep the original answer in Git
   history. Prepare a clean question/decision presentation that preserves
   both dates and ask the owner for a fresh confirmation through the normal
   gate before generating or approving Forecasting artifacts. Do not inject
   a human-turn event or edit engine-owned receipts by hand.
5. Inception artifacts have changed after approval, including the C07 caller
   amendment. Current status reports stale Requirements, Stories, Mockups,
   Units, Contracts, and Delivery Planning, with Domain Design needing
   revalidation. Do not describe the old gate hashes as covering the new
   bytes. Follow the owner's selected lifecycle route for reconciliation.

## Open owner decisions

- **U5 embedding resource limit.** The current C07 excludes U5 and
  `embedding-index`, while U5 still builds candidate Qdrant generations.
  Recommended: share the one durable global heavy-work slot for U5 *build*
  jobs, while U5 retains its own independently fenced activation and route
  authority. This needs a deliberate C07 request/lease role and work-type
  amendment, without giving U5 the U7 shared-transaction finalizer. The
  alternative is a separate U5 queue with explicit concurrency and local
  CPU/memory limits demonstrated under the 3-CPU/16-GiB profile.
- **Closed-stage drift.** Recommended: formal redo from the earliest affected
  Inception stage despite the larger review cycle; alternative: continue the
  engine's advisory route with an explicit, owner-reviewed reconciliation of
  changed baselines at the Construction gate.

## Git disposition

The current branch mixes several design units and an Inception amendment.
Do not rewrite its published history solely to make it look like one story.
Keep further story implementation on short-lived story branches and present
this branch's complete diff for explicit owner merge approval. The uncommitted
audit-shard addition at the time of this note contains only session/compaction
events; it is engine-owned and should be staged only after checking the final
diff.
