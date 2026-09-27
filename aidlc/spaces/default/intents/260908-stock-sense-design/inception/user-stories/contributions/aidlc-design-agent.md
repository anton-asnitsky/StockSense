**Collaborator:** aidlc-design-agent

## Contribution

1. **Make shared-slot contention visible to the Operator (major).** AC4.8.1-5 define correct lease outcomes, but none requires an operator-facing view of a queued U5 embedding build versus a running model/evaluation/Forecasting job. Extend US4.8 acceptance with an authorized status surface (UI or CLI) that identifies the current job type and safe job/run ID, queue position or waiting state, deadline, last transition, and outcome. On contention, deadline expiry, lost lease or uncertain post-restore fence, show a plain-language reason and safe next action; never imply that a queued or fenced build is running or can activate an index. Let US7.12 expose candidate generation as inactive until U5 validation and expected-route activation succeed. Exercise U5-first and model/Forecasting-first schedules. This is an observability outcome, not new authority: the global lease governs build work, while U5 alone validates and activates the route without the Forecasting finalizer.

2. **Expose all OQ5 recovery prerequisites without conflating them with fixed deadlines (major).** AC9.6.3 and US9.11 correctly keep RPO, RTO and backup expiry open, but omit the OQ5 total persistent-disk-capacity decision from the operator/reviewer readiness story. Extend US9.6/US10.2 evidence so the recovery overview lists each open prerequisite by name and status: owner-confirmed RPO, RTO and backup expiry, plus measured complete local persistent-disk capacity before deployment. Objective-based restore checks remain `not-run` with `blocked-prerequisite` and the missing item named until resolved. The FR20.1 participant/global barrier deadlines and NFR9 7/90-day log/audit defaults remain separately testable and must not be presented as RPO, RTO or backup expiry. A partial barrier/restore result may be inspected without a false overall recovery-success claim.

3. **Make new operational states accessible and reviewable.** The shared browser obligation and AC10.1.4 cover the business journey well. If the shared-slot or recovery status surface is a browser view, require status text that distinguishes Queued, Running, Deadline reached, Lease lost, Reconciliation required and Inactive index; announce material transitions without stealing focus or repeating every poll, keep actions keyboard-operable, and return focus to a named status/error heading after failed confirmation. For a CLI surface, use stable text labels and actionable next steps. Add a reviewer fixture that can distinguish `not-run`/`blocked-prerequisite` from failed, aborted and safely resumed recovery evidence without relying on color. This strengthens the specified states without claiming a new accessibility certification.

The four personas remain faithful to approved roles: Planner and Manager are business authorities, Operator owns privileged operational actions, and Reviewer is a demo journey rather than an authorization role. The revised purchasing handoff and stale-decision criteria now cover the earlier design concerns. No new human persona or separation-of-duties rule is needed.

## Positions

AGREE: US4.8/US7.12 preserve one global heavy-work slot and U5's separate index-route authority; they do not grant U5 the Forecasting shared-transaction finalizer.

AGREE: US9.11 retains fixed FR20.1 barrier deadlines, and US9.5 retains NFR9 log/audit defaults while OQ5 recovery targets and backup expiry remain open.

AGREE: The shared browser acceptance rule, purchasing handoff and stale-decision recovery provide a sound accessible baseline.

OBJECT: AC4.8.1-5 and AC7.12.1-5 do not yet require operator-visible contention, queue/deadline and fenced-build status or the safe route-activation next step described above.

OBJECT: AC9.6.3 and reviewer evidence should name OQ5 disk capacity alongside RPO, RTO and backup expiry, with separate `blocked-prerequisite` evidence and accessible status distinctions rather than an implied overall recovery pass.

### Round 2 disposition (current pass)

AGREE: Prior shared-slot status OBJECT is resolved by AC4.8.7's authorized queue, deadline, lease-loss and reconciliation status, plus AC7.12.5's inactive stale generation and safe rebuild outcome. Browser/CLI text and keyboard behavior are specified without granting U5 the Forecasting finalizer.

AGREE: Prior OQ5 recovery OBJECT is resolved by AC9.6.3-4 and AC10.2.2/6: RPO, RTO, backup expiry and measured complete local disk capacity are distinct visible prerequisites; missing objective inputs remain `not-run`/`blocked-prerequisite`. FR20.1 barrier deadlines and NFR9 retention defaults remain fixed and separately testable.

AGREE: Prior accessibility refinement is resolved by AC4.8.7, AC9.6.3 and AC10.2.6: material status changes are textual and announced without focus theft, failed confirmation has focus recovery, and Reviewer evidence distinguishes blocked, failed, aborted and safely resumed outcomes without color alone.

AGREE: The developer's recorded build/lease dependency concern is resolved for this draft: US7.3 depends on U5 indexing in US7.2 and the lease in US4.8; US9.4 depends on US7.3 and US7.12. AC4.8.6 fences uncertain expiry, and AC8.3.3 keeps basic setup separate from OQ5 recovery targets.

AGREE: The quality agent's recorded concerns are resolved for this draft: AC7.12.5 covers stale build-complete and route attempts; AC9.4.2/5 pins separate candidate and whole-cluster profiles; AC9.6.4 adds post-OQ5 measured objectives. A direct check found 67 story declarations, 250 unique criteria and zero differences between all 59 declared requirement links and traceability coverage rows.

AGREE: No Round 1 design objection is maintained after integration; no new technical inconsistency was found in the other specialists' recorded positions.
