# Identity Access Reliability Requirements

Unit: U3 Identity Access (`identity-access`)

## Service profile

U3 runs one replica initially. Healthy PostgreSQL and lifecycle-valid signing
and data-protection material are readiness dependencies. Google is optional;
its absence or outage cannot remove local authentication.

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR6.4 | U3 shall reload rotated workload credentials and versioned signing/data-protection material through the Vault/VSO delivery boundary without accepting absent, corrupt, expired, or unauthorized material. Old and new machine credentials may overlap for at most 15 minutes after successful reload verification. | Rotation tests cover staged delivery, successful reload, bounded overlap, old-version rejection after retirement, sealed Vault, corrupt material, and pod restart. Evidence identifies versions without recording secret values. | Keep the dependent capability unready or deny authentication; never generate fallback secrets or broaden access. |
| NFR7.1 | Identity changes requiring durable integration shall atomically commit U3 state, authoritative audit data, and a transactional outbox record; publication uses confirms, bounded retry, DLQ, idempotent consumption, and acknowledgement after consumer commit. | Failure tests interrupt the broker, publisher, and consumer around commit boundaries and prove eventual single logical effects for account disablement, credential reset, link change, session revocation, and key-lifecycle events. | Preserve committed outbox work, surface lag/dead letters, and require audited replay; never claim exactly-once transport. |
| NFR9.1 | U3 operational logs shall default to seven-day retention and identity business/security audit to 90 days, configurable per deployment. Controlled expiry shall remain consistent with PostgreSQL and the OpenSearch projection. | Retention tests expire seeded records, rebuild the projection, and prove expired events do not reappear. Backup expiry is documented before restore acceptance. | Stop and report inconsistent maintenance; do not delete immutable audit history through runtime application roles. |
| NFR13.2 | Flyway migration failure, incompatible schema, or missing stored routine shall keep U3 unready and block rollout. Rollback shall use an immutable application version declared compatible with the current schema. | CI and deployment tests exercise successful migration, failed migration, version skew, routine permission failure, and compatible application rollback. | Stop rollout before traffic; do not grant direct table access or downgrade schema ad hoc. |
| NFR15.2 | U3 shall meet the platform recovery drill's RPO of 24 hours and RTO of four hours for authoritative identity records and protected lifecycle state, without claiming production HA. | Restore into a clean cluster, reconcile accounts, links, grants, sessions, key versions, protection references, and representative local login/token/revocation behavior; record elapsed time and observed data loss. | Report a missed objective as failed or limited evidence and keep the service unready until integrity checks pass. |

## Degraded behavior

- PostgreSQL or required key-material failure denies login, refresh, token
  issuance, linking, reset, and rotation; discovery/JWKS is served only from a
  coherent lifecycle-valid set.
- Google failure hides or denies Google flows with a stable safe outcome while
  local sign-in remains available.
- OpenSearch and telemetry outages cannot block authoritative U3 commits; audit
  projection lag remains visible and replayable.
- Repeated logout and revocation remain idempotent and grant no authority.

## Availability statement

Restart, restore, and dependency-failure evidence is required. The single-node,
single-replica profile has no production availability SLA and no zero-downtime
failover claim.
