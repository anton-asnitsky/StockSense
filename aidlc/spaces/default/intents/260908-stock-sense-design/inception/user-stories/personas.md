# StockSense personas

Date: 2026-09-09
Status: Draft derived from approved requirements; not empirical user research.

## Persona definitions

| Name / role | Goals | Pain points to address | Context / priority |
| --- | --- | --- | --- |
| Retail Planner / Planner | Inspect inventory, investigate shortages, compare scenarios/suppliers, prepare drafts and record receipts | Stale or unexplained quantities, disconnected source evidence, uncertainty about review progress | Primary daily business role within explicit retailer memberships; English initial UI |
| Purchasing Manager / Manager | Review locked proposals, approve/reject, cancel before receipt and inspect business evidence | Stale terms, concurrent decisions, unauthorized purchasing and excessive receipts | Primary decision role; same person may also hold Planner; no mandatory separation of duties was selected |
| Platform Operator / Operator | Deploy, provision identities/secrets, operate models/jobs, investigate failures and recover tenant data | Hidden setup dependencies, uncertain recovery, unbounded resource use and missing provenance | Supporting privileged role; operator-wide tools remain separate from tenant business APIs |
| Portfolio Reviewer / Reviewer | Run a clean local demo and trace decisions to measured outcomes | Owner-only credentials/GPU assumptions, irreproducible models and unsupported claims | Supporting evaluator with no owner secrets or assumed AMD GPU; obtains locally provisioned demo roles for the walkthrough |

## Relationships and authority

Planner prepares and submits proposals; Manager approves/rejects and may cancel
submitted/approved orders before any receipt. Authorized planners/managers record
receipts. One human may hold both roles, but each operation still checks authority.
Operator is a privilege-bearing role, not an automatic substitute for business
membership. Reviewer is a journey persona, not a new application authorization role.

The assistant and worker services are supporting actors. They operate under
validated user/job authority, cannot select tenant authority from model output,
and cannot approve purchases. Scheduled forecasts/reviews are deterministic jobs.
Supplier systems are simulated; no external supplier persona or live order API
is added to the initial scope.

## Assumptions and validation

The requirements establish roles/goals, not demographics, technical comfort or
measured usage frequencies. The pain points above are design hypotheses implied
by the required outcomes; validate usability during mockups and workflow testing.
Do not invent a new data-scientist role to describe ML operations: Operator owns
training/promotion and Reviewer inspects the evidence in this release.
