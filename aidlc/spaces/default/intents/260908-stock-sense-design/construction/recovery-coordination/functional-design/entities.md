# Recovery Coordination Functional Entity Model

Unit: U15 Recovery Coordination (`recovery-coordination`)

Decision basis: confirmed U15 Functional Design summary and approved C24-C27 / recovery-policy-v1.

The YAML block is the logical source of truth. U15 owns coordinator records, not participant business state, backup contents, or broker topology.

## Source-of-truth entity model

```yaml source-of-truth
schemaVersion: "1.0.0"
unit: recovery-coordination
entities:
  - name: ParticipantRegistration
    description: Current authenticated capability declaration for one policy-named participant.
    attributes:
      - { name: registrationId, logicalType: Identifier, required: true, unique: true }
      - { name: participant, logicalType: Enum, required: true, unique: true, allowedValues: [identity-access, tenant-directory, inventory, purchasing, demand-history, supplier-knowledge, model-lifecycle, forecasting, replenishment, assistant, audit-evidence] }
      - { name: registrationGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: participantClass, logicalType: Enum, required: true, unique: false, allowedValues: [A, B, C] }
      - { name: protocolVersion, logicalType: Version, required: true, unique: false }
      - { name: supportedPolicyVersions, logicalType: StringSet, required: true, unique: false }
      - { name: capabilities, logicalType: EnumSet, required: true, unique: false, allowedValues: [prepare, close, abort, resume] }
      - { name: commandTransport, logicalType: Enum, required: true, unique: false, allowedValues: [synchronous-http, rabbitmq] }
      - { name: commandRoute, logicalType: OpaqueRoute, required: true, unique: false }
      - { name: acknowledgementRoute, logicalType: OpaqueRoute, required: true, unique: false }
      - { name: workloadIdentity, logicalType: ExternalIdentifier, required: true, unique: false }
      - { name: lifecycleState, logicalType: Enum, required: true, unique: false, allowedValues: [ready, draining, unavailable] }
    entityConstraints:
      - Registration identity, class, routes, transport, capabilities and workload must match the immutable recovery policy.
      - Changing registration increments its generation but never edits a run roster snapshot.

  - name: RecoveryPreview
    description: Non-destructive reviewed scope and single-use start authority for one human Operator.
    attributes:
      - { name: previewId, logicalType: Identifier, required: true, unique: true }
      - { name: reservedRunId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false }
      - { name: operatorSubject, logicalType: ExternalIdentifier, required: true, unique: false }
      - { name: bffClientId, logicalType: ExternalIdentifier, required: true, unique: false }
      - { name: operation, logicalType: Enum, required: true, unique: false, allowedValues: [snapshot, restore, rollback, tenant-migration] }
      - { name: placementGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: recoveryGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: rosterDigest, logicalType: Sha256, required: true, unique: false }
      - { name: frozenRosterDocument, logicalType: ImmutableJsonDocument, required: true, unique: false }
      - { name: manifestSummaryDigest, logicalType: Sha256, required: true, unique: false }
      - { name: confirmationDigest, logicalType: Sha256, required: true, unique: true }
      - { name: expiresAt, logicalType: Instant, required: true, unique: false }
      - { name: consumedAt, logicalType: Instant, required: false, unique: false }
    entityConstraints:
      - The preview and single-use confirmation are durably stored by U15 in PostgreSQL with one reserved run ID and the complete 11-registration C26 roster values, coordinator deadlines and canonical digest. Start admits this same run ID and frozen roster document or rejects; it never regenerates them from mutable registrations.
      - Confirmation is short-lived, single-use and bound to exact subject, BFF client, retailer, operation, reserved run ID, frozen roster/manifest digests and generations.
      - Preview creates no participant fence or destructive effect.

  - name: RecoveryRun
    description: Tenant-scoped authoritative coordinator phase and outcome.
    attributes:
      - { name: runId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false }
      - { name: previewId, logicalType: Identifier, required: true, unique: true, references: RecoveryPreview.previewId }
      - { name: operatorSubject, logicalType: ExternalIdentifier, required: true, unique: false }
      - { name: operation, logicalType: Enum, required: true, unique: false, allowedValues: [snapshot, restore, rollback, tenant-migration] }
      - { name: placementGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: recoveryGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: policyVersion, logicalType: Version, required: true, unique: false }
      - { name: phase, logicalType: Enum, required: true, unique: false, allowedValues: [registering, preparing, closing, snapshotting, aborting, resuming, reconciling, terminal] }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [accepted, running, aborting, reconciling, succeeded, aborted, safely-resumed, failed] }
      - { name: outcome, logicalType: Enum, required: false, unique: false, allowedValues: [succeeded, failed, aborted, safely-resumed] }
      - { name: checkpoint, logicalType: String, required: false, unique: false }
      - { name: phaseDeadlineAt, logicalType: Instant, required: true, unique: false }
      - { name: version, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
    entityConstraints:
      - A run references one immutable roster and one monotonic recovery generation.
      - Terminal success requires complete manifest and participant reconciliation; unresolved fences cannot be terminal success or Aborted.

  - name: RecoveryRosterSnapshot
    description: Immutable C26 RecoveryRosterSnapshot document frozen for one run before prepare, independent of mutable live registrations.
    attributes:
      - { name: runId, logicalType: Identifier, required: true, unique: true, references: RecoveryRun.runId }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false }
      - { name: placementGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: recoveryGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: policyVersion, logicalType: Version, required: true, unique: false }
      - { name: protocolVersion, logicalType: Version, required: true, unique: false }
      - { name: snapshottedAt, logicalType: Instant, required: true, unique: false }
      - { name: coordinatorDeadlinesSeconds, logicalType: ImmutableDeadlineSet, required: true, unique: false }
      - { name: registrations, logicalType: ImmutableRegistrationSnapshotSet, required: true, unique: false }
      - { name: rosterDigest, logicalType: Sha256, required: true, unique: false }
    entityConstraints:
      - Persist all 11 policy-named registration value objects, sorted by participant. Each frozen object includes participant, registrationId and generation, class, transport, four capabilities, workload identity, command and acknowledgement routes, requiredForSuccess and all four class deadlines; no field resolves through a mutable ParticipantRegistration after admission.
      - Persist the C26 coordinator deadline set and run/retailer/placement/recovery/policy/protocol metadata. Compute rosterDigest from RFC 8785 canonical JSON of this complete frozen C26 document with rosterDigest omitted.
      - Admission copies the exact previously persisted RecoveryPreview.frozenRosterDocument with runId equal to reservedRunId, and verifies its canonical digest and confirmation binding; a changed live registration invalidates admission rather than mutating the preview.
      - Missing or incompatible required registration blocks the run before prepare; later live registration changes never mutate this snapshot or its digest.

  - name: ParticipantCommand
    description: Durable write-ahead inventory item for a possibly delivered recovery command.
    attributes:
      - { name: commandId, logicalType: Identifier, required: true, unique: true }
      - { name: runId, logicalType: Identifier, required: true, unique: false, references: RecoveryRun.runId }
      - { name: participant, logicalType: String, required: true, unique: false }
      - { name: registrationId, logicalType: Identifier, required: true, unique: false }
      - { name: command, logicalType: Enum, required: true, unique: false, allowedValues: [prepare, close, abort, resume] }
      - { name: recoveryGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: messageId, logicalType: Identifier, required: true, unique: true }
      - { name: payloadDigest, logicalType: Sha256, required: true, unique: false }
      - { name: deadlineAt, logicalType: Instant, required: true, unique: false }
      - { name: dispatchState, logicalType: Enum, required: true, unique: false, allowedValues: [recorded, sent, acknowledged, expired, failed] }
    entityConstraints:
      - Prepare inventory is committed before send; all possibly delivered prepares remain abort targets.
      - Retry reuses command identity, payload and original class/global deadline.

  - name: ParticipantDisposition
    description: Validated latest acknowledgement and fence result for a rostered participant.
    attributes:
      - { name: runId, logicalType: Identifier, required: true, unique: false, references: RecoveryRun.runId }
      - { name: participant, logicalType: String, required: true, unique: false }
      - { name: commandId, logicalType: Identifier, required: true, unique: false, references: ParticipantCommand.commandId }
      - { name: acknowledgementMessageId, logicalType: Identifier, required: true, unique: true }
      - { name: outcome, logicalType: Enum, required: true, unique: false, allowedValues: [prepared, closed, aborted, resumed, terminal, failed] }
      - { name: fenceDisposition, logicalType: Enum, required: true, unique: false, allowedValues: [active, cleared, terminallySuppressed, unresolved] }
      - { name: checkpointDigest, logicalType: Sha256, required: false, unique: false }
      - { name: acknowledgedAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - Authenticated participant, command causation, roster digest, registration and generation must match before an acknowledgement advances a barrier.
      - Exact replay is idempotent; conflicting digest is quarantined.

  - name: RecoveryEvidenceJournal
    description: U15-owned append-only internal evidence for the closed cut, protected snapshot, reconciliation and resume before terminal manifest finalization.
    attributes:
      - { name: runId, logicalType: Identifier, required: true, unique: true, references: RecoveryRun.runId }
      - { name: evidenceVersion, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: closedCutEvidence, logicalType: ImmutableEvidenceReferenceSet, required: false, unique: false }
      - { name: protectedSnapshotReference, logicalType: OpaqueReference, required: false, unique: false }
      - { name: reconciliationEvidence, logicalType: ImmutableEvidenceReferenceSet, required: false, unique: false }
      - { name: resumeDispositions, logicalType: ImmutableEvidenceReferenceSet, required: false, unique: false }
    entityConstraints:
      - Append versioned evidence as phases complete; this journal is internal and cannot be served as a final C26 RecoveryManifest or marked verified.
      - A failed cut may retain partial evidence without creating a misleading final manifest.

  - name: RecoveryManifest
    description: Complete immutable versioned C26 RecoveryManifest finalized after terminal evidence is known and persisted for exact verified GET responses.
    attributes:
      - { name: manifestVersion, logicalType: Version, required: true, unique: false }
      - { name: manifestId, logicalType: Identifier, required: true, unique: true }
      - { name: runId, logicalType: Identifier, required: true, unique: true, references: RecoveryRun.runId }
      - { name: canonicalManifestDocument, logicalType: ImmutableJsonDocument, required: true, unique: false }
      - { name: rosterDigest, logicalType: Sha256, required: true, unique: false }
      - { name: barrierGeneration, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: fencingEpoch, logicalType: PositiveInteger, required: true, unique: false, min: 1 }
      - { name: manifestDigest, logicalType: Sha256, required: true, unique: false }
      - { name: verificationStatus, logicalType: Enum, required: true, unique: false, allowedValues: [pending, verified, failed] }
      - { name: createdAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - U15 gathers intermediate closed-cut, snapshot, reconciliation and resume evidence in RecoveryEvidenceJournal. Once the final participant dispositions and terminal outcome are known, one owned PostgreSQL routine validates them, closes the checkpoint set, and atomically stores the complete immutable C26 RecoveryManifest JSON, manifestDigest, terminal run status and audit/outbox evidence. A mutable summary or digest-only record is insufficient.
      - The document includes the frozen full roster; operation/run/barrier/generation/retention/objective fields; exact PostgreSQL LSN, transaction-evidence and database-snapshot references/digests; broker cluster/topology/checkpoint references/digests, broker-supported quiescence, and each queue identity/count/digest; participant checkpoint set; snapshot reference/state/digest; terminal fencing inventory; reconciliation; terminal outcome; and verification state, as required by C26.
      - manifestDigest is SHA-256 of RFC 8785 canonical JSON of the complete document with manifestDigest omitted. Verify every nested evidence and checkpoint digest, closed-cut generation, full roster digest and manifestDigest before verified status or C26 GET; the GET response is this stored document, never reconstructed from live registrations. Before finalization, C26 manifest GET returns the typed not-closed problem while run status exposes provisional progress.
      - Protected references are opaque and authorized; never store secrets, raw credentials or backup bytes in the manifest. Missing or inconsistent evidence prevents success.

  - name: RecoveryReconciliation
    description: Durable comparison of roster, fences, manifest and restored participant evidence.
    attributes:
      - { name: reconciliationId, logicalType: Identifier, required: true, unique: true }
      - { name: runId, logicalType: Identifier, required: true, unique: false, references: RecoveryRun.runId }
      - { name: status, logicalType: Enum, required: true, unique: false, allowedValues: [pending, passed, failed, unresolved] }
      - { name: missingParticipants, logicalType: StringSet, required: false, unique: false }
      - { name: unresolvedFences, logicalType: StringSet, required: false, unique: false }
      - { name: evidenceDigest, logicalType: Sha256, required: false, unique: false }
      - { name: checkedAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - A failed or unresolved reconciliation cannot be represented as recovered success.
      - Operator reconciliation requests do not clear participant fences directly.

  - name: CoordinatorReceipt
    description: Durable idempotency, inbox/outbox and business-audit evidence for one coordinator effect.
    attributes:
      - { name: receiptId, logicalType: Identifier, required: true, unique: true }
      - { name: retailerId, logicalType: Identifier, required: true, unique: false }
      - { name: operationKind, logicalType: String, required: true, unique: false }
      - { name: idempotencyKey, logicalType: String, required: true, unique: false }
      - { name: payloadDigest, logicalType: Sha256, required: true, unique: false }
      - { name: correlationId, logicalType: Identifier, required: true, unique: false }
      - { name: outcome, logicalType: String, required: true, unique: false }
      - { name: committedAt, logicalType: Instant, required: true, unique: false }
    entityConstraints:
      - The tuple retailerId, operationKind and idempotencyKey is unique; changed-payload reuse conflicts.
      - Coordinator state, command inventory, audit and outbox commit atomically through owned PostgreSQL routines.
relationships:
  - { from: RecoveryPreview, to: RecoveryRun, cardinality: "1:0..1", direction: "Confirmed preview admits one run" }
  - { from: RecoveryPreview, to: RecoveryRosterSnapshot, cardinality: "1:0..1", direction: "Preview freezes complete roster before admitted run copies it" }
  - { from: RecoveryRun, to: RecoveryRosterSnapshot, cardinality: "1:1", direction: "Run freezes one roster" }
  - { from: RecoveryRosterSnapshot, to: ParticipantRegistration, cardinality: "1:N", direction: "Roster captures live registration values once at admission; later reads use frozen values" }
  - { from: RecoveryRun, to: ParticipantCommand, cardinality: "1:N", direction: "Run inventories commands before send" }
  - { from: ParticipantCommand, to: ParticipantDisposition, cardinality: "1:0..N", direction: "Validated acknowledgements resolve commands" }
  - { from: RecoveryRun, to: RecoveryManifest, cardinality: "1:0..1", direction: "Closed cut produces a manifest" }
  - { from: RecoveryRun, to: RecoveryEvidenceJournal, cardinality: "1:0..1", direction: "Interim evidence accumulates until terminal manifest finalization" }
  - { from: RecoveryRun, to: RecoveryReconciliation, cardinality: "1:N", direction: "Run records reconciliation attempts" }
  - { from: RecoveryRun, to: CoordinatorReceipt, cardinality: "1:N", direction: "Effects have durable replay and audit evidence" }
```

## Human-readable summary

Registration is current and mutable by generation; the run roster contains the complete immutable values and deadlines already frozen with the preview and reserved run ID, never only pointers to live registrations. The run's command inventory, participant acknowledgements, internal evidence journal, finalized immutable C26 manifest and reconciliation records explain every phase transition and every unresolved fence. U15 persists only its own authority, protected manifest document and opaque backup/checkpoint references; each participant remains responsible for its local guard and data.
