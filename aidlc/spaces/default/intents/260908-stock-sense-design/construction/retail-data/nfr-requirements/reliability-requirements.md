# Retail Data Reliability Requirements

Unit: U4 Retail Data (`retail-data`)

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR7.1 | Durable events shall use transactional outbox/inbox, publisher confirms, acknowledgement after consumer commit, five delivery attempts with exponential backoff from one to 30 seconds, seven-day DLQ retention, and audited replay batches of at most 100 with one active replay per queue. | Broker/publisher/consumer crash tests prove eventual one logical effect, exact-redelivery deduplication, digest mismatch rejection, preserved message identity, stale placement rejection, DLQ routing, and safe replay. | Retain committed outbox state and expose lag/dead letters; never claim exactly-once transport. |
| NFR9.1 | Accepted movements, demand, memberships, placements, import lineage, idempotency records, and snapshot manifests shall remain for the seeded dataset's life. Raw imports remain online 90 days and encrypted in archive one year; business audit remains 90 days, operational logs seven days, and backups 30 days. | Controlled expiry plus restore/rebuild proves expired data does not reappear and retained references, legal holds, digests, tombstones, and stock conservation remain valid. | Retain data when a reference/hold cannot be resolved; runtime roles cannot delete authoritative history. |
| NFR11.1 | A clean reviewer shall generate/import the deterministic three-retailer fixture and complete representative reads, receipt, snapshot, cache-outage, replay, extraction, and restore checks without owner credentials, cached data, or GPU use. | Evidence records source/scenario versions, seed, tool/runtime checksums, expected counts/digests, measured results, and limitations. | Mark reproducibility failed; private fixtures or owner-machine state cannot substitute. |
| NFR13.2 | Flyway failure, missing routine, incompatible schema, or failed U4/U8 transaction-contract check shall block rollout. Application rollback shall use an immutable version compatible with the current schema. | CI/deployment tests cover successful and failed migration, least-privilege runtime, routine signature drift, modular transaction rollback, and compatible application rollback. | Stop before traffic and never grant direct-table or ad hoc migration privileges. |
| NFR15.2 | Restore one seeded retailer and the shared placement directory within two hours from a backup no older than 24 hours. Before exposure, reconcile ledger/position conservation, demand effective-version uniqueness, source/snapshot digests, idempotency, audit links, and outbox/inbox state; rebuild Redis and downstream projections. | A clean-target drill records elapsed time, observed data loss, every reconciliation result, placement generation, rebuilt projections, and checksums. | Keep the target unavailable and report a missed RPO/RTO or failed invariant as failed/limited evidence. |

## Tenant extraction reliability

One seeded retailer shall complete drain, consistent copy, validation, cutover,
and routing/cache invalidation within 15 minutes, with mutations rejected for no
more than five minutes. Reconciliation permits zero lost or duplicate
authoritative rows and pending outbox messages. Every stale generation is
rejected. Rollback is permitted only before the first destination write;
subsequent recovery uses a new forward transition.

## Degraded behavior

Redis and OpenSearch outages do not block authoritative commits. Broker outages
accumulate observable outbox work. PostgreSQL, placement authority, or required
transactional-audit failure rejects mutations atomically.
