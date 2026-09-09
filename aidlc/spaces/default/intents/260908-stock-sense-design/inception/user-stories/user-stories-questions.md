# User stories plan and questions

Date: 2026-09-09
Status: Epic/feature/story hierarchy selected; proposed grouping awaits confirmation.
Source: approved requirements-analysis/requirements.md in this intent.

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

## Consolidated Summary Confirmation

- Organize work as epics -> features -> user stories, as requested by the owner.
- Proposed epics: access and tenancy; inventory and demo data; supplier information;
  forecasting and ML; replenishment; purchasing; AI assistant and agentic workflows;
  local platform and delivery; observability and recovery; portfolio experience.
- Use the four established human roles: planner, manager, operator and reviewer.
  Services remain supporting actors with explicitly bounded authority.
- EP07 explicitly covers investigation, supplier comparison, replenishment
  assistance, draft proposals, execution/recovery and evaluation/auditing, supported
  by local inference and RAG. Domain services enforce authority and calculations;
  the assistant cannot approve purchases or bypass manual-review quotas.
- Preserve all approved requirements and SS task IDs. Each feature has a stable ID;
  each story names its parent feature, requirement IDs and testable acceptance criteria.
- Retain workflow-based delivery slices across epics. Required initial-release
  capabilities remain required even if they ship after the first inventory demo.
- Have design, development and quality specialists contribute to the story drafts,
  then independently review the integrated result. Story count follows decomposition.

Does this all look correct before I generate the user stories and personas?

- Looks correct
- Request changes

[Answer]:
