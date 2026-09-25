**Collaborator:** aidlc-quality-agent

## Contribution

Round 2 finds substantial integration of the quality contribution. The draft now has 67 stories and 239 unique AC IDs; it adds the shared `not-run`/`blocked-prerequisite` rule, payload-bound purchasing idempotency ownership, per-consumer messaging conformance, versioned performance profiles, exact recovery-manifest evidence, assistant reconciliation states, and immutable browser/evidence outcomes.

1. **Prior OBJECT — executable pass/fail oracles: partially resolved; material remainder maintained.** AC7.11.3, AC9.4.4-5, AC10.2.5 and AC10.3.2-3 now have materially stronger observable outcomes. AC1.1.4 still says “appropriate” recovery; AC2.4.3 says “explicit degraded behavior”; AC8.4.3 says “fail safely”; AC9.3.1 says “bounded cardinality”; AC9.3.3 defers unspecified limits to OQ6; and AC9.8.2 says routing works “correctly.” AC9.5.1 also retains malformed `configured7/90day`, `at7days`, and `at90days` wording. Exact correction: replace each qualitative phrase with a named response/status, persisted state, prohibited side effect and evidence field; where a limit remains open, cite the blocking OQ/profile. Normalize AC9.5.1 to “configured 7-day operational-log and 90-day business-audit retention,” with before/at/after cutoff fixtures.

2. **Prior OBJECT — blocked prerequisites: resolved.** The shared rule at the top of `stories.md` deterministically records `not-run` with reason `blocked-prerequisite` and the missing OQ/profile/version, and prohibits pass, fail, readiness and estimation while absent. Point-of-use ACs now apply this rule to reliability and resource profiles. Preserve this behavior in the evidence schema and later test plans.

3. **Prior OBJECT — deterministic concurrency/replay: partially resolved; material remainder maintained.** AC4.8.4 and AC8.5.4 add important competing-operation and crash schedules, but the backlog still does not prescribe synchronization points and exact final event counts for quota, receipt, purchase-decision, scheduled/manual review, lease, route-CAS and lost-response races. Exact correction: add a shared concurrency schedule contract requiring initial versions, a barrier before commit, competing commands, allowed winner count, final entity/version/state, audit/outbox/inbox/idempotency-result counts, and exact replay response. Require at minimum four simultaneous quota requests; duplicate and distinct receipt IDs racing remaining quantity; approve versus edit/cancel; manual versus due scheduled review; lease expiry versus renew/finalize; same-expected-version route CAS; and lost-response exact replay plus changed-payload replay.

4. **Prior OBJECT — requirement-to-evidence coverage: partially resolved; material remainder maintained.** AC10.2.4 now requires per-boundary and per-sensitive-flow evidence and rejects foundation-only proof, which resolves the highest-risk integration gap. It still does not require a machine-checkable row for every FR/NFR through story, AC, planned oracle, test level and evidence artifact, nor state that an unmapped requirement/AC blocks the relevant gate. Exact correction: extend AC10.2.4 so the versioned release matrix contains `requirement_id`, `story_id`, `ac_id`, `test_level`, `oracle/profile`, `evidence_artifact`, `revision/environment`, and outcome; duplicate IDs, unknown IDs and missing applicable mappings fail validation.

5. **Additional deterministic test-design gaps remain supporting corrections, not new product decisions.** Threshold ACs should enumerate exact boundary fixtures: CSV below/at 95% and below/at 99%; PDF readability and anchors independently below/at 90% and below/at 98%, including rounding; messages at 65,535/65,536/65,537 bytes, deliveries 1-6, and replay batches 100/101; retention immediately before/at/after each cutoff. Compound AC1.4.3 and AC1.5.3 still combine independent triggers and should use separate ACs or scenario tables. These are knowledge corrections that make accepted rules testable; any choice of percentage rounding, clock semantics or new numeric limit beyond existing requirements is an owner decision.

## Positions

AGREE: The prior blocked-prerequisite objection is resolved by the shared `not-run`/`blocked-prerequisite` rule and its prohibition on readiness or estimation without the named profile/version.

AGREE: The revised draft materially improves evidence and recovery coverage through AC7.11.3, AC8.5.4, AC9.4.4-5, AC9.6, AC9.9-11, AC10.2.4-5 and AC10.3.

AGREE: The developer’s ownership corrections are reflected: Purchasing owns durable mutation idempotency, Messaging Platform and domain-consumer responsibilities are separated, Model Lifecycle owns heavy-work lease state, active-index startup reconciliation is fail closed, and US9.11 produces the recovery manifest consumed by restore stories.

AGREE: The design participant’s objections are resolved by payload-complete assistant confirmation, persistent interrupted-operation status, visible Operator recovery states, conditional browser messaging, and shared browser accessibility obligations.

OBJECT: The claim that all acceptance criteria are executable pass/fail oracles remains unsupported while AC1.1.4, AC2.4.3, AC8.4.3, AC9.3.1, AC9.3.3 and AC9.8.2 retain qualitative or unresolved outcomes without a named blocked profile and exact observable result.

OBJECT: Concurrency and replay wording alone remains insufficient. Prescribed interleavings, synchronization points, final versions/states and audit/outbox/inbox/idempotency-result counts are still required so race tests are deterministic rather than scheduler-dependent.

OBJECT: AC10.2.4 improves integration evidence but does not yet guarantee complete machine-checkable traceability from every FR/NFR through story and AC to planned oracle and immutable evidence; missing applicable mappings must block the relevant quality gate.

OBJECT: Boundary semantics remain ambiguous for supplier-quality percentages, message limits/delivery attempts/replay batches and retention cutoffs. The accepted thresholds need below/at/above fixtures and explicit rounding/clock rules; any new numeric policy is an owner decision.
