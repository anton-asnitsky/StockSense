**Collaborator:** aidlc-developer-agent

## Contribution

1. **Make every U5 candidate build a client of the shared slot.** US7.3 (AC7.3.2) creates separate candidate indexes for the embedding comparison but depends only on US7.2; it can therefore be delivered before US4.8 even though FR16.3 requires an authenticated `embedding-index` lease for a U5 build. Add US4.8 to US7.3's capability dependencies and require the candidate-build part of the evaluation to acquire and honor that lease. Keep U5 responsible for candidate validation and the PostgreSQL active-route compare-and-swap. US7.2 can test authorized retrieval against a validated, seeded active-route fixture, but its fixture must not bypass the U5 route checks or imply an unfenced production index build.

2. **Put the measured U5 build on the capacity story's critical path.** US9.4 AC9.4.2/5 requires a real U5 embedding-index build profile, yet its dependencies omit US7.12. Add US7.12 (and US7.3 if both candidate profiles are the intended measurement) to US9.4's capability dependencies. A mock index or a model-only run cannot satisfy NFR2/FR16.3. Preserve the `blocked-prerequisite` outcome until the real U5 build, pinned artifact and resource profile exist.

3. **Strengthen the cross-service fencing contract at the lease/route boundary.** FR13.1 explicitly says uncertain lease expiry blocks slot reassignment until the authoritative local fence is reconciled. US4.8 AC4.8.2-5 requires non-overlap and stale-token denial, but does not expressly make uncertain U5 expiry/restart a fail-closed reassignment case. Add a deterministic schedule: U5 holds the slot, its renewal/expiry acknowledgement is lost, a U6/U7 job requests the slot, and the coordinator denies reassignment or returns a typed pending outcome until U5's local fence is reconciled; a late U5 worker cannot complete/activate a candidate. The NFR8.3 contract should bind authenticated service identity to each work type and allowed terminal operation, so U5 cannot claim a Forecasting finalizer and a U6 client cannot claim U5 route authority. U5 activation still uses its own tenant/source/configuration/generation/expected-route checks; the lease is build authority only. Implement US4.8 as coordinator plus client/fence conformance tasks and US7.12 as U5 generation/route tasks, preserving the existing story IDs and independent acceptance.

4. **Correct the OQ5 prerequisite in US8.3.3.** Its statement that “OQ5 precede setup” makes open RPO, RTO and backup-expiry values appear to block basic Kubernetes provisioning. Approved OQ5 requires those values before SS-06/26 recovery implementation, while local disk sufficiency is checked before downloads/deployment. Revise AC8.3.3/readiness to name the disk check for setup and reserve RPO/RTO/backup-expiry gating for US9.5/9.6/9.9/9.10 recovery work. Keep FR20.1 participant/global barrier deadlines and NFR9 7/90-day log/audit defaults fixed.

The explicit `Depends on` graph across all 67 stories is acyclic; the issues above are missing capability edges and a prerequisite overreach, not a declared graph cycle. Prior Purchasing idempotency and Planner-to-Manager policies are now represented by the confirmed summary and shared acceptance obligations.

Round 2 disposition: US7.3 now depends on US4.8 and AC7.3.2 requires an authenticated current build lease. US9.4 now depends on US7.3 and US7.12 and pins both measured profiles against the approved **16 GB/3 CPU** cluster limit; the U5-specific 1.5/2 GiB limits remain separate. AC4.8.6 now blocks reassignment during uncertain U5 expiry until its local fence is reconciled, and AC7.12.5 rejects stale build-complete, validation and route attempts without invoking the Forecasting finalizer. AC8.3.3 now limits the basic setup prerequisite to disk/resources/bootstrap inputs and leaves open OQ5 recovery values for recovery work. The revised explicit dependency graph is still acyclic. Exact reverse traceability checks found 67 stories, 250 unique ACs, 59 upstream IDs and no missing story-to-requirement or requirement-to-story links.

One narrow implementation ambiguity remains from item 1: AC7.2.1 still says evidence is “indexed and retrieved” in US7.2, which precedes US4.8 and US7.12. Read as a production index build, that would evade FR16.3's lease and U5 route activation. State that US7.2 retrieval uses a validated, seeded active-route fixture; its repeated incremental upsert/deletion behavior stays in AC7.2.3, while any candidate or index-wide build and activation follow US4.8/US7.12. This preserves the independently testable retrieval story without adding a new policy or story ID.

## Positions

AGREE: US4.8 assigns global lease/queue state and fencing-token issuance to Model Lifecycle; US7.12 assigns index validation and active-route activation to U5. The draft correctly excludes U5 from the U6 Forecasting shared-transaction finalizer.

AGREE: US9.4 separately measures model and embedding heavy-job profiles against the full 16 GiB/3 CPU cluster envelope, and US9.6/9.11 distinguishes open OQ5 recovery objectives from fixed FR20.1 barrier deadlines.

OBJECT: US7.3 and US9.4 lack the U5 build/lease capability dependencies needed to substantiate their acceptance criteria; correct those edges before treating either story as implementation-ready.

OBJECT: US8.3.3's broad OQ5 setup gate and US4.8's implicit uncertain-expiry behavior leave materially different implementation interpretations. Apply the corrections above before sizing or implementing those boundaries.

AGREE: Round 1 item 1's missing US7.3-to-US4.8 dependency and candidate-build lease criterion are resolved by the revised dependency and AC7.3.2. The separate US7.2 fixture wording concern is maintained below.

AGREE: Round 1 item 2 is resolved: US9.4 now depends on the U5 index lifecycle and candidate comparison and requires separately pinned real profiles under 16 GB/3 CPU. This supersedes my historical 16 GiB shorthand above.

AGREE: Round 1 item 3 is resolved for the shared contract and fencing schedule by AC4.8.5-7 and AC7.12.5. U5 retains route authority and cannot use the Forecasting finalizer. The Design position's operator-visible contention and the Quality position's stale build-complete assertions are now represented.

AGREE: Round 1 item 4 is resolved by AC8.3.3 and AC9.6.3-4. RPO, RTO and backup expiry remain open; the complete local disk footprint is separately measured. The Design and Quality positions' recovery status and post-decision measurement oracles are represented without changing fixed FR20.1/NFR9 values. Quality's four reverse-link objections are also resolved in the current JSON.

OBJECT: The sole maintained dissent is AC7.2.1's ambiguous “indexed and retrieved” fixture. Clarify it as retrieval from a validated U5 active route, with candidate/index-wide build and activation accepted under US4.8/US7.12, so US7.2 cannot be read as permission for an unfenced production build.
