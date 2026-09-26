# Recovery Coordination Functional Design Questions

Unit: U15 Recovery Coordination (`recovery-coordination`)

Status: Confirmed from approved Inception contracts (2026-09-25).

The choices below are carried from the approved C24-C27 contracts, recovery policy v1, U15 unit boundary, and US9.11. They do not request a new business policy. The design must distinguish U15 coordination from each participant's own data, write fence, backup and restore procedure.

## Q1. Who can inspect and start a recovery run?

[Answer]: The approved C26 path uses a server-held delegated human token from the BFF, with current U4 Operator membership and placement checked on every operation. Preview and status are read-only. A destructive start requires a short-lived single-use confirmation bound to the exact preview, roster, manifest, operation, actor and generations. Machine tokens register participants but cannot act as the human Operator.

## Q2. How is the participant set fixed for a run?

[Answer]: The approved recovery-policy-v1 roster contains the named Class A identity-access and tenant-directory HTTP participants, Class B inventory and purchasing RabbitMQ participants, and the named Class C RabbitMQ participants. U15 validates live registration against policy, transport, capability, route and workload identity, then persists an immutable canonical roster snapshot and digest before any prepare dispatch. Registration changes cannot alter an active run.

## Q3. What is the recovery cut lifecycle?

[Answer]: U15 durably records every potentially delivered prepare in a write-ahead inventory, dispatches class-specific C24/C25 commands, closes the barrier only after complete acknowledgements and drain evidence, captures PostgreSQL LSN/transaction and per-queue broker identities/digests, and binds a versioned manifest to the snapshot. Participants own their own fences and checkpoints. The published class/global deadlines and 24-hour RPO, 2-hour RTO and 30-day retention objectives are fixed by recovery-policy-v1.

## Q4. How are retries, timeouts and restarts resolved?

[Answer]: The approved contracts use stable command identities, idempotent acknowledgements and monotonic recovery generations. U15 aborts every participant with a potentially delivered prepare, including one whose acknowledgement was lost. Abort-before-delayed-prepare establishes a terminal participant guard. U15 resumes from durable state after restart without resetting deadlines. Stale or digest-mismatched acknowledgements cannot satisfy a barrier; unresolved participants remain fenced, and no abandoned generation can publish success.

## Q5. What makes a run terminal and visible to the Operator?

[Answer]: C26 status exposes run identity, phase, checkpoint, scope, participant dispositions, deadline and fence inventory, reconciliation and terminal outcome. `Aborted` requires complete abort acknowledgement and cleared-or-suppressed fences for the write-ahead dispatch inventory. `Succeeded` requires every participant, snapshot manifest and reconciliation check to pass. Failed or unresolved runs show the authorized next action without a false success marker. U10 projects U15's audit evidence through C27; U13 verifies the integrated drill.

## Ambiguity Scan

No owner-level business choice remains open for this unit. Implementation details such as exact persistent-store routine names, backup driver mechanics, manifest location and confirmation-token lifetime are bounded by the approved interfaces and belong to later implementation/NFR work. The service never substitutes its own restore action for a participant's authority.

## Consolidated Summary

Recovery Coordination is a standalone, tenant-scoped service owning run admission, operator confirmation, immutable roster snapshots, write-ahead command inventory, deadline enforcement, barrier phase state, acknowledgement reconciliation, manifest binding, and terminal outcomes. It uses PostgreSQL routines for authoritative coordinator state and U14's versioned messaging mechanics for C25. C24's Class A participants use synchronous HTTP; Classes B/C use RabbitMQ. U15 validates current delegated-human Operator authority for C26 on every read and mutation, and machine registration uses separate credentials.

An authorized, explicitly confirmed start freezes the approved roster and policy version. U15 records a prepare dispatch before sending it, fences and closes all required participants, captures their durable checkpoints and the PostgreSQL/RabbitMQ cut evidence, and only then marks a snapshot eligible. It does not own participant data or backup implementations. Every command and acknowledgement is idempotent, generation-fenced and deadline-bounded. Timeout, restart, abort-before-prepare, lost acknowledgement and reconciliation failures preserve visible unresolved fences and prevent success. A terminal run reports a precise result and safe next action, with an audit trail suitable for the local portfolio recovery drill.

## Historical Consolidated Summary Confirmation

Does this reflect the approved recovery behavior before I generate U15's Functional Design artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct

## Current Contract Reconciliation (2026-09-26)

The previously approved Q1-Q5 choices remain unchanged. For the current design pass, U15 freezes one policy-v1 roster with two synchronous C24 class-A participants (`identity-access` and `tenant-directory`) and distinct C25 asynchronous participants. The approved policy assigns `inventory` and `purchasing` to class B, and `demand-history` to class C; every other named C25 participant keeps its policy-assigned class. U15 rejects any registration whose participant identity, route, transport, workload, capability or class disagrees with that roster before prepare. Each participant owns its own fence, checkpoint and command result; U15 owns the write-ahead dispatch inventory, barrier, immutable manifest binding, deadlines, C26 Operator-facing run state, and C27 audit publication. A lost acknowledgement, abort-before-delayed-prepare or restart cannot turn an unresolved fence into success.

## Consolidated Summary Confirmation

Does this current Recovery Coordination summary look correct for U15 Functional Design?

- Looks correct
- Request changes

[Answer]: Looks correct
