# User stories plan and questions

Date: 2026-09-27
Status: Reopened after formal Inception redo; prior answers remain historical owner
choices, while the revised summary below awaits confirmation for this pass.
Source: newly approved requirements-analysis/requirements.md in this intent.

## Persona development approach

Use the four confirmed human roles: planner, manager, platform operator and
portfolio reviewer. Define their goals, context and relationships without invented
demographics or claims of user research. Worker/agent services are supporting
actors with bounded authority, not additional human personas. A person may hold
both planner and manager roles, as the requirements permit.

## Story format and granularity

Use "As a [persona], I want [goal], so that [benefit]", stable USx.y IDs,
Given/When/Then criteria with ACx.y.z IDs, requirement references, dependencies
and INVEST notes. Split each workflow into small, demonstrable outcomes; do not
equate one story with one existing SS task or invent estimates before sizing.
Preserve security, failure, concurrency and quantitative boundary cases.

## Story prioritization

Use MoSCoW priorities against the approved release requirements. Required release
coverage remains Must Have; sequencing does not demote ML, agent or operational
requirements to optional. Optional external activation and later languages remain
outside the default local demo. Delivery Planning sets the formal release slices.

## Q1: Story organization

The existing execution plan delivers inventory first, then simulated purchasing,
then ML and assistant capabilities. Which primary organization should stories use?

A. Workflow steps (recommended): sign in, import, inspect, forecast, review,
   purchase and receive; group supporting operator/reviewer stories separately.
B. Persona groups: planner, manager, operator and reviewer, with cross-links
   showing the end-to-end workflows.
X. Other (please specify)

[Answer]: Other: Let's separate the features into the groups of epics. And the feature we'll spit to the user stories.

Interpretation: organize the backlog as epics containing features, with each
feature decomposed into user stories. Workflow ordering remains a delivery view.

## Collaboration and output plan

After the planning answers are confirmed, draft personas and stories, collect
independent design/development/quality contributions, integrate them, and run
the independent product review. Publish stories.md, personas.md, this assessment,
traceability.json and the three contribution files. Story count follows the
selected organization and acceptance coverage, not an arbitrary quota.

## Epic and feature structure

See `epic-feature-map.md` for the proposed groups and existing SS task mappings.
Epic IDs are EP01-EP10; feature IDs are FE01.01-style keys. Stories retain USx.y
IDs and explicitly identify their parent feature and epic. Criteria retain
ACx.y.z IDs. Existing requirements and SS task IDs are preserved, not renumbered.
Epics group outcomes, features define capabilities and stories define small,
testable user outcomes. Epics are not sequential release gates.

## Q2: Explicit assistant and agentic flows

Proposal: rename EP07 to AI assistant and agentic workflows and expose inventory
investigation, supplier comparison, replenishment assistance, proposal drafting,
execution/recovery and evaluation/auditing. Keep local inference and RAG as
supporting capabilities, Strands as the coordinator and domain services as the
authority. Scheduled processing remains deterministic; managers retain approval.

[Answer]: Cool. Approved

This records approval of the EP07 refinement, not completion of User Stories.

## Q3: Final mob decisions

The final Design, Development and Quality reconciliation resolved the technical
ownership, recovery, browser, accessibility and evidence objections. Three
owner-level policies remain. The recommended package is:

1. Require an observable Planner-to-Manager handoff with Submitted/decision
   status, actor, timestamp, locked-line and next-actor information, plus a
   keyboard-safe stale-decision path that explains changed fields and offers a
   linked replacement Draft without mutating the source.
2. Retain each Purchasing idempotency result for the lifetime of its purchase
   aggregate and for 90 days after the aggregate becomes terminal. A replay after
   expiry returns typed `idempotency-key-expired` without effect; the caller must
   reconcile authoritative state and use a new key for a deliberate new command.
3. Compare extraction percentages as exact fractions without display rounding.
   Apply retention against UTC instants: age equal to or greater than the configured
   period is expired; OQ10 remains responsible only for maintenance schedule and
   allowed cleanup lag.

A. Accept the recommended package
B. Review the three policies individually
X. Other (please specify)

[Answer]: A. Accept the recommended package (`I accept`)

## 2026-09-27 revision scope

The owner selected Modify for the existing User Stories artifacts. Keep the
approved epic/feature organization, human personas, original story IDs and
prior Q1-Q3 policy answers. Reconcile the new FR16.3 and expanded FR13.1/NFR2:
U5 embedding-index builds share U6's durable global heavy-work slot with
training, evaluation and Forecasting batches, while U5 alone owns index
validation and active-route activation. The shared-transaction Forecasting
finalizer is not an U5 capability. Add observable contention, fencing and
resource-evidence criteria for both model and embedding job profiles. Update
traceability for every current FR/NFR ID without renumbering existing stories.
Recovery-barrier phase deadlines and 7/90-day log/audit retention defaults stay
fixed; RPO, RTO, backup expiry and local disk capacity remain open under OQ5.
The earlier Requirements Analysis questionnaire sentence that calls all recovery
targets selected is not authority for numerical values; the owner approved the
current requirements with that discrepancy disclosed.

## Consolidated Summary Confirmation

- Organize work as epics -> features -> user stories, as requested by the owner.
- Use EP01-EP10 and the four established human roles: Planner, Manager, Operator
  and Reviewer. Services remain supporting actors with bounded authority.
- EP07 covers investigation, supplier comparison, replenishment assistance, Draft
  proposals, execution/recovery and evaluation/auditing through local inference,
  RAG and Strands. Domain services enforce calculations and authority.
- Preserve all approved requirements, SS task IDs and the 67 existing Must Have
  story IDs. Add or revise acceptance criteria only where current requirements
  require them; keep every criterion ID unique and update the count afterward.
- Cover extraction classifications and boundaries, cache isolation, ML lease and
  package controls, active-index reconciliation, reliable messaging, BFF contracts,
  consistent recovery barriers, evidence outcomes, clean-run timing and browser
  compatibility without inventing unresolved profiles or limits.
- The assistant may create a newly confirmed Draft only. Later editing remains a
  Planner action; the assistant cannot submit, approve, reject, cancel or receive.
- Expand heavy-work coordination to include U5 embedding-index builds alongside
  model training, evaluation and Forecasting batches. Test shared-slot contention,
  stale lease fencing and distinct U5 route-activation authority. Measure both
  heavy-job profiles within the 16 GiB/3 CPU cluster envelope.
- Require visible Planner-to-Manager handoff and keyboard-safe stale-decision
  recovery into a linked replacement Draft without mutating the source proposal.
- Retain Purchasing idempotency results for aggregate lifetime plus 90 days after
  terminal state. Expired keys return `idempotency-key-expired` without effect and
  require reconciliation plus a new key for a deliberate new command.
- Compare supplier quality percentages as exact fractions without display rounding.
  Apply retention against UTC instants, with age equal to or greater than the
  configured period expired; OQ10 governs maintenance schedule and cleanup lag.
- Keep unresolved workload and telemetry profiles visibly blocked. Use the fixed
  recovery-barrier phase deadlines, while leaving RPO, RTO, backup expiry and
  local disk capacity open under OQ5 until their values are confirmed.
- Preserve the independent Design, Development and Quality contribution records;
  their objective corrections and the accepted owner policies are integrated before
  the independent Product Lead review.

Does this all look correct before I finalize and independently review the user stories and personas?

- Looks correct
- Request changes

[Answer]: Looks correct
