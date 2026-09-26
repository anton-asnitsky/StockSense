# StockSense Audit Evidence NFR Requirements Questions

Date: 2026-09-20
Stage: NFR Requirements
Unit: audit-evidence
Status: Awaiting consolidated-summary confirmation

The approved baseline is PostgreSQL-retained derived event evidence plus a
rebuildable, tenant-routed OpenSearch projection and operator-only Dashboards.
C15 events arrive through RabbitMQ with inbox deduplication, projection
checkpointing, commit-before-acknowledgement, bounded replay, coordinated
retention, no-resurrection watermarks, and strict separation from producer
business authority. These questions quantify the remaining operating profile.

## Interaction mode

Continue with the established guided-question workflow.

- A. Guide me through each question (Recommended)
- B. I will edit this file directly
- C. Answer all questions in chat
- X. Other (please specify)

[Answer]: A. Guide me through each question (Recommended)

## Q1. Authorized audit-query performance and bounds

Which local query profile should Audit Evidence meet?

- A. After warm-up, require p95 below 750 ms for authorized 30-day retailer queries and p95 below two seconds for the full 90-day retained window under five concurrent users; allow date ranges no longer than 90 days, cursor pages of 50 by default and 200 maximum, at most five filters, and a 1 MiB response; run each fresh/stale/unavailable mix for at least five minutes and 500 requests while reporting OpenSearch, authorization, and response-building time separately (Recommended)
- B. Use one p95-below-two-second target for every query, 1,000-row pages, and 5 MiB responses
- C. Retain only a qualitative “responsive” target and choose limits during implementation
- X. Other (please specify)

[Answer]: A. After warm-up, require p95 below 750 ms for authorized 30-day retailer queries and p95 below two seconds for the full 90-day retained window under five concurrent users; allow date ranges no longer than 90 days, cursor pages of 50 by default and 200 maximum, at most five filters, and a 1 MiB response; run each fresh/stale/unavailable mix for at least five minutes and 500 requests while reporting OpenSearch, authorization, and response-building time separately (Recommended)

## Q2. Event admission, searchable latency, and freshness

What end-to-end C15 event target should apply?

- A. Limit one audit event envelope to 64 KiB; commit inbox plus retained derived event within 500 ms p95; make 99% of valid events searchable with a verified projection checkpoint within five seconds and every valid event within 30 seconds when dependencies are healthy; classify lag below 30 seconds as Fresh, 30 seconds through five minutes as Stale, and over five minutes or an invalid route/checkpoint as Unavailable; acknowledge only after the durable checkpoint (Recommended)
- B. Allow 1 MiB events and require searchability within one minute without separate freshness states
- C. Measure ingestion and projection without pass/fail latency or event-size limits
- X. Other (please specify)

[Answer]: A. Limit one audit event envelope to 64 KiB; commit inbox plus retained derived event within 500 ms p95; make 99% of valid events searchable with a verified projection checkpoint within five seconds and every valid event within 30 seconds when dependencies are healthy; classify lag below 30 seconds as Fresh, 30 seconds through five minutes as Stale, and over five minutes or an invalid route/checkpoint as Unavailable; acknowledge only after the durable checkpoint (Recommended)

## Q3. Local resources, throughput, and backpressure

Which bounded resource and load profile should U10 and its search projection use?

- A. Start with a combined 3 GiB/0.75 CPU limit for Audit Evidence API/worker, single-node OpenSearch, and Dashboards, with OpenSearch using no replica in the local profile; sustain 20 valid events/second for ten minutes, absorb a burst of 1,000 events without loss, and keep five-user queries within target; serialize projection rebuilds and other heavy jobs; accept the profile only when the complete stack remains inside the platform's 13 GiB/2.5 CPU application quota, otherwise publish the measured failure and reduce/pin the component profile before release (Recommended)
- B. Allocate 6 GiB/1.5 CPU to OpenSearch/U10 and allow two simultaneous rebuilds
- C. Set component resources after deployment without a whole-stack pass/fail profile
- X. Other (please specify)

[Answer]: A. Start with a combined 3 GiB/0.75 CPU limit for Audit Evidence API/worker, single-node OpenSearch, and Dashboards, with OpenSearch using no replica in the local profile; sustain 20 valid events/second for ten minutes, absorb a burst of 1,000 events without loss, and keep five-user queries within target; serialize projection rebuilds and other heavy jobs; accept the profile only when the complete stack remains inside the platform's 13 GiB/2.5 CPU application quota, otherwise publish the measured failure and reduce/pin the component profile before release (Recommended)

## Q4. RabbitMQ retries, DLQ, and replay limits

Which values should close C15's unresolved delivery profile?

- A. Use a 30-second consumer deadline, five delivery attempts with exponential backoff from one to 30 seconds, a seven-day DLQ retention, one active replay per queue, replay batches of at most 100 events, a 30-second outbox/projection-lag warning, and a backlog alert at 1,000 ready messages; preserve original message/event identity and audit every replay (Recommended)
- B. Use ten attempts, a two-minute consumer deadline, 24-hour DLQ retention, and replay up to 1,000 events at once
- C. Configure values per deployment and leave C15 unresolved
- X. Other (please specify)

[Answer]: A. Use a 30-second consumer deadline, five delivery attempts with exponential backoff from one to 30 seconds, a seven-day DLQ retention, one active replay per queue, replay batches of at most 100 events, a 30-second outbox/projection-lag warning, and a backlog alert at 1,000 ready messages; preserve original message/event identity and audit every replay (Recommended)

## Q5. OpenSearch routing, rollover, and generation isolation

Which local index topology should implement the tenant route abstraction?

- A. Use server-owned per-retailer aliases pointing to one active immutable generation, one primary shard and zero replicas locally, rollover at 1 GiB or seven days, and separate index patterns/roles for business audit and operational logs; clients cannot name indexes; rebuild and replay write only to inactive generations; route activation uses expected placement/route versions after count/digest/checkpoint validation (Recommended)
- B. Use one shared multi-tenant index with retailer filters and direct client-selected index names
- C. Let OpenSearch templates choose shards, replicas, aliases, and rollover automatically
- X. Other (please specify)

[Answer]: A. Use server-owned per-retailer aliases pointing to one active immutable generation, one primary shard and zero replicas locally, rollover at 1 GiB or seven days, and separate index patterns/roles for business audit and operational logs; clients cannot name indexes; rebuild and replay write only to inactive generations; route activation uses expected placement/route versions after count/digest/checkpoint validation (Recommended)

## Q6. Replay, rebuild, and rollback controls

How should privileged projection maintenance be bounded?

- A. Require a dry run and expected request/route/policy versions; allow one rebuild or replay cluster-wide and one affected retailer at a time; process batches of 100 and rebuild 100,000 retained events within 30 minutes on the clean local profile; keep prior validated generations for a 24-hour rollback window while always applying current expiry watermarks; cancel only before route activation and audit every denied, failed, cancelled, and completed control (Recommended)
- B. Allow three concurrent rebuilds, batches of 1,000, and retain prior generations for seven days
- C. Run maintenance manually without fixed concurrency, duration, batch, or rollback limits
- X. Other (please specify)

[Answer]: A. Require a dry run and expected request/route/policy versions; allow one rebuild or replay cluster-wide and one affected retailer at a time; process batches of 100 and rebuild 100,000 retained events within 30 minutes on the clean local profile; keep prior validated generations for a 24-hour rollback window while always applying current expiry watermarks; cancel only before route activation and audit every denied, failed, cancelled, and completed control (Recommended)

## Q7. Retention and no-resurrection timing

Which coordinated retention profile should the portfolio demonstrate?

- A. Keep authoritative and derived business audit for 90 days and operational logs for seven days; complete producer/U10/OpenSearch cleanup and reconciliation within one hour of the versioned cutoff; retain policy, run, receipt, count/digest, failure, watermark, and tombstone evidence for one year; retain protected recovery snapshots for 30 days; holds override expiry, and delayed delivery, replay, rollback, restore, or rebuild must not resurrect expired records (Recommended)
- B. Keep business audit and logs indefinitely and delete only OpenSearch indexes when disk is full
- C. Use 90/7-day targets but allow cleanup and backup expiry to remain unmeasured
- X. Other (please specify)

[Answer]: A. Keep authoritative and derived business audit for 90 days and operational logs for seven days; complete producer/U10/OpenSearch cleanup and reconciliation within one hour of the versioned cutoff; retain policy, run, receipt, count/digest, failure, watermark, and tombstone evidence for one year; retain protected recovery snapshots for 30 days; holds override expiry, and delayed delivery, replay, rollback, restore, or rebuild must not resurrect expired records (Recommended)

## Q8. Recovery and tenant-projection movement

How should the platform RPO 24 hours/RTO two hours be specialized for U10?

- A. Restore PostgreSQL and configuration from a backup no older than 24 hours, rebuild each seeded retailer into a new inactive OpenSearch generation, and activate routes within two hours only after inbox/event counts, digests, checkpoints, schema, placement, quarantines/DLQ, replay/retention controls, expiry watermarks, self-audit, and cross-tenant isolation reconcile; move one retailer's projection within 15 minutes with no more than five minutes of rejected tenant work and no impact to other retailers (Recommended)
- B. Restore PostgreSQL within two hours and expose queries before OpenSearch generations and expiry reconcile
- C. Inherit the platform objective without U10-specific rebuild, route, or tenant-movement checks
- X. Other (please specify)

[Answer]: A. Restore PostgreSQL and configuration from a backup no older than 24 hours, rebuild each seeded retailer into a new inactive OpenSearch generation, and activate routes within two hours only after inbox/event counts, digests, checkpoints, schema, placement, quarantines/DLQ, replay/retention controls, expiry watermarks, self-audit, and cross-tenant isolation reconcile; move one retailer's projection within 15 minutes with no more than five minutes of rejected tenant work and no impact to other retailers (Recommended)

## Q9. Event, query, and operator security controls

Which security profile should protect audit evidence?

- A. Authenticate producer workloads and validate issuer, audience, scope, message/schema type, placement, event identity/digest, field allowlist, 64 KiB limit, and prohibited content before retention; reauthorize every user query/page/citation and hide foreign resources; require narrow Platform Operator scopes, expected versions, purpose/reason, payload-bound idempotency, and append-only self-audit for replay, retention, repair, investigation, route, and evidence controls; enforce TLS 1.2+, encrypted persistence/backups, Vault/VSO credentials with rotation, stored-routine-only PostgreSQL access, and no direct client/Dashboards business authority (Recommended)
- B. Trust authenticated RabbitMQ publishers and OpenSearch document-level security without application revalidation or operator self-audit
- C. Defer transport encryption, credential rotation, and negative cross-tenant/operator tests until cloud deployment
- X. Other (please specify)

[Answer]: A. Authenticate producer workloads and validate issuer, audience, scope, message/schema type, placement, event identity/digest, field allowlist, 64 KiB limit, and prohibited content before retention; reauthorize every user query/page/citation and hide foreign resources; require narrow Platform Operator scopes, expected versions, purpose/reason, payload-bound idempotency, and append-only self-audit for replay, retention, repair, investigation, route, and evidence controls; enforce TLS 1.2+, encrypted persistence/backups, Vault/VSO credentials with rotation, stored-routine-only PostgreSQL access, and no direct client/Dashboards business authority (Recommended)

## Q10. Telemetry, evidence, and operational alerts

Which observability profile should Audit Evidence expose?

- A. Emit bounded OpenTelemetry signals with safe tenant hash, correlation, producer/message, event, projection generation/checkpoint, query, replay, retention, operator-control, and recovery context; dashboard admission/projection latency, lag/freshness, validation/quarantine, duplicates/mismatches, queue/DLQ/replay, query latency/results, generation/rebuild, retention/no-resurrection, resources, and telemetry loss; warn at 30-second lag, 750 ms 30-day query p95 or two-second 90-day p95 breach for ten minutes, 80% disk, or 90% CPU/RAM for five minutes; alert on five-minute unavailability, any dead letter, event-ID digest mismatch, cross-tenant result, prohibited-content retention, checkpoint/route inconsistency, failed generation activation, retention/recovery reconciliation over one hour, backup age over 24 hours, or missing required evidence (Recommended)
- B. Record OpenSearch health and pod resources only, alerting on red cluster state and pod restart
- C. Add dashboards and evidence alerts after the first deployment
- X. Other (please specify)

[Answer]: A. Emit bounded OpenTelemetry signals with safe tenant hash, correlation, producer/message, event, projection generation/checkpoint, query, replay, retention, operator-control, and recovery context; dashboard admission/projection latency, lag/freshness, validation/quarantine, duplicates/mismatches, queue/DLQ/replay, query latency/results, generation/rebuild, retention/no-resurrection, resources, and telemetry loss; warn at 30-second lag, 750 ms 30-day query p95 or two-second 90-day p95 breach for ten minutes, 80% disk, or 90% CPU/RAM for five minutes; alert on five-minute unavailability, any dead letter, event-ID digest mismatch, cross-tenant result, prohibited-content retention, checkpoint/route inconsistency, failed generation activation, retention/recovery reconciliation over one hour, backup age over 24 hours, or missing required evidence (Recommended)

## Ambiguity Scan

The selected answers form one measurable local Audit Evidence profile. Query
latency, event admission and projection, throughput, burst handling, resources,
retries, dead letters, replay, rebuild, rollover, retention, recovery, security,
and operational alerts all have explicit limits and acceptance conditions.

The 3 GiB/0.75 CPU allocation is a starting combined cap for U10, OpenSearch,
and Dashboards. It does not increase the platform's 13 GiB/2.5 CPU application
quota. If the complete stack cannot pass inside that quota, the component
profile must be reduced and pinned before release, with the failed measurement
retained as evidence.

The projection targets are consistent: 99% of valid events become searchable
within five seconds and every valid event within 30 seconds while dependencies
are healthy. A lag below 30 seconds is Fresh, 30 seconds through five minutes is
Stale, and a lag over five minutes or an invalid route/checkpoint is Unavailable.
The 30-second warning and five-minute alert map directly to those states.

The RabbitMQ selection closes C15's unresolved retry placeholder with a
30-second deadline, five attempts, bounded exponential backoff, seven-day DLQ,
and 100-event replay batches. Replay and rebuild preserve original identity,
apply current expiry watermarks, and cannot reactivate expired evidence.

The one-hour coordinated retention and reconciliation limit starts at the
versioned cutoff and matches the corresponding alert. Recovery remains subject
to the two-hour platform RTO and cannot expose a tenant route until counts,
digests, checkpoints, schema, placement, expiry, self-audit, and tenant isolation
all reconcile. No material performance, scalability, reliability, security,
recovery, retention, or observability target remains unspecified for this unit.

## Consolidated Summary

- **Authorized queries:** After warm-up, achieve p95 below 750 ms for a 30-day
  retailer query and below two seconds for the 90-day retained window under five
  concurrent users. Cap ranges at 90 days, pages at 50 by default and 200
  maximum, filters at five, and responses at 1 MiB. Test each freshness mix for
  at least five minutes and 500 requests with timing components reported.
- **Event durability and freshness:** Cap C15 envelopes at 64 KiB, durably retain
  inbox and event evidence within 500 ms p95, and acknowledge only after the
  checkpoint. Make 99% searchable within five seconds and all healthy events
  within 30 seconds, exposing Fresh, Stale, and Unavailable states.
- **Resources and load:** Start U10, single-node OpenSearch, and Dashboards at a
  combined 3 GiB/0.75 CPU with one shard and no local replica. Sustain 20 valid
  events/second for ten minutes, absorb a 1,000-event burst without loss, keep
  five-user queries within target, serialize heavy jobs, and remain inside the
  whole-stack 13 GiB/2.5 CPU quota.
- **RabbitMQ delivery:** Use a 30-second consumer deadline, five attempts with
  one-to-30-second exponential backoff, seven-day DLQ retention, one active
  replay per queue, 100-event batches, a 30-second lag warning, and a 1,000-ready
  message backlog alert. Preserve event identity and audit every replay.
- **OpenSearch isolation:** Use server-owned per-retailer aliases over immutable
  generations, rolling over at 1 GiB or seven days. Separate business audit from
  operational logs, prohibit client-selected indexes, rebuild only inactive
  generations, and activate routes only after versioned validation.
- **Maintenance controls:** Require dry run, expected versions, one cluster-wide
  and one affected-retailer operation at a time, and 100-event batches. Rebuild
  100,000 events within 30 minutes, retain the prior validated generation for
  24 hours, apply current expiry watermarks, and audit every outcome.
- **Retention:** Keep business audit for 90 days and operational logs for seven
  days. Complete coordinated cleanup within one hour, retain policy and deletion
  evidence for one year, keep protected snapshots for 30 days, honor holds, and
  prevent resurrection through delayed delivery, replay, rollback, restore, or
  rebuild.
- **Recovery and movement:** Use backups no older than 24 hours and meet the
  two-hour RTO only after full reconciliation and cross-tenant checks. Move one
  retailer projection within 15 minutes with at most five minutes of rejected
  work for that retailer and no impact on others.
- **Security:** Authenticate and validate producers before retention; reauthorize
  every query, page, and citation; use narrow purpose-bound operator scopes,
  expected versions, payload-bound idempotency, and append-only self-audit.
  Enforce TLS 1.2+, encrypted persistence and backups, Vault/VSO rotation,
  stored-routine-only PostgreSQL access, and no direct business authority in
  OpenSearch Dashboards.
- **Observability:** Emit bounded OpenTelemetry signals and dashboards covering
  admission, projection, freshness, validation, queues, queries, generations,
  retention, recovery, resources, and telemetry loss. Apply the selected query,
  lag, disk, CPU/RAM, DLQ, integrity, isolation, route, reconciliation, backup,
  and missing-evidence thresholds.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct
