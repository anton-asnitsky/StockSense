# StockSense Demo Evidence NFR Requirements Questions

Date: 2026-09-20
Stage: NFR Requirements
Unit: demo-evidence
Status: In progress

The approved baseline makes U13 the reproducibility and evidence package. It
must verify the deployed system only through supported deployment and
application interfaces, preserve the 16 GiB/3 CPU whole-cluster envelope and
13 GiB/2.5 CPU application quota, prove the accepted 24-hour RPO and two-hour
RTO, and let a portfolio reviewer run the complete local CPU path without owner
credentials, caches, GPU, or a cloud account. These questions close the
remaining measurable evidence, portability, and security decisions without
moving infrastructure or business authority into U13.

## Interaction mode

Continue with the established guided-question workflow.

- A. Guide me through each question (Recommended)
- B. I will edit this file directly
- C. Answer all questions in chat
- X. Other (please specify)

[Answer]: A. Guide me through each question (Recommended)

## Q1. Clean-reviewer time objective

Which reproducibility objective should the complete local demo meet from a
clean checkout?

- A. On the documented reference host and network, complete prerequisites, verified dependency/model downloads, build, cluster deployment, seed, and the core demo in 90 minutes p95 across three clean runs; additionally complete build/deploy/seed/core demo in 45 minutes p95 after verified downloads, report each phase separately, and treat any miss as failed or limited evidence rather than hiding setup time (Recommended)
- B. Require the complete clean run within two hours and report only total elapsed time
- C. Demonstrate a clean run without a numeric time objective
- X. Other (please specify)

[Answer]: A. On the documented reference host and network, complete prerequisites, verified dependency/model downloads, build, cluster deployment, seed, and the core demo in 90 minutes p95 across three clean runs; additionally complete build/deploy/seed/core demo in 45 minutes p95 after verified downloads, report each phase separately, and treat any miss as failed or limited evidence rather than hiding setup time (Recommended)

## Q2. Evidence outcome and manifest model

Which result model should replace C19's current three-state outcome?

- A. Version C19 so every check records exactly one of passed, failed, limited, rejected, unavailable, or not-run, with stable reason code, expected and actual result, requirement/story/test IDs, immutable revision, environment fingerprint, start/end times, command profile and arguments, artifact checksums, and declared limitations; artifact presence never implies success (Recommended)
- B. Keep passed, failed, and limited only and place all other states in free-text notes
- C. Store only pass/fail plus a log link
- X. Other (please specify)

[Answer]: A. Version C19 so every check records exactly one of passed, failed, limited, rejected, unavailable, or not-run, with stable reason code, expected and actual result, requirement/story/test IDs, immutable revision, environment fingerprint, start/end times, command profile and arguments, artifact checksums, and declared limitations; artifact presence never implies success (Recommended)

## Q3. Deterministic scenario verification

How should U13 prove that the seeded portfolio dataset is reproducible?

- A. Fix seed, generator/config/schema versions and retailer calendars; generate three isolated retailers with one store, 100 products, and 18 months each; canonicalize logical records before hashing so volatile timestamps and package metadata cannot mask drift; rerun generation twice and require identical logical hashes while preserving sales, lost demand, true demand, promotions, seasonality, intermittent demand, inventory, suppliers, and evaluation leakage controls (Recommended)
- B. Verify only row counts and the configured random seed
- C. Keep one checked-in generated dataset without regeneration proof
- X. Other (please specify)

[Answer]: A. Fix seed, generator/config/schema versions and retailer calendars; generate three isolated retailers with one store, 100 products, and 18 months each; canonicalize logical records before hashing so volatile timestamps and package metadata cannot mask drift; rerun generation twice and require identical logical hashes while preserving sales, lost demand, true demand, promotions, seasonality, intermittent demand, inventory, suppliers, and evaluation leakage controls (Recommended)

## Q4. Demo journey tiers and deadlines

Which executable demo tiers should U13 expose?

- A. Provide a 15-minute walking-skeleton smoke tier for login, tenant context, deterministic import, inventory, baseline replenishment, draft, approval, receipt, stock update, and audit correlation; provide a 45-minute full tier that adds tenant attacks, supplier/RAG, model lifecycle and forecast evidence, assistant/GenUI boundaries, retention, recovery, and rollback; both use supported APIs/UI and emit step-level outcomes (Recommended)
- B. Provide one complete demo with a 60-minute deadline and no smaller smoke tier
- C. Provide independent component demonstrations without one end-to-end journey
- X. Other (please specify)

[Answer]: A. Provide a 15-minute walking-skeleton smoke tier for login, tenant context, deterministic import, inventory, baseline replenishment, draft, approval, receipt, stock update, and audit correlation; provide a 45-minute full tier that adds tenant attacks, supplier/RAG, model lifecycle and forecast evidence, assistant/GenUI boundaries, retention, recovery, and rollback; both use supported APIs/UI and emit step-level outcomes (Recommended)

## Q5. Whole-cluster resource evidence

How should U13 measure the accepted local resource envelope?

- A. Sample host/VM/Kubernetes and per-workload CPU, working-set/RSS memory, restart/OOM/throttle, persistent-disk use, queue depth, and job phase every second; run a 30-minute warmed complete-workload profile with five browser users and one serialized active ML job; fail any 60-second sustained breach of 16 GiB/3 CPU total or 13 GiB/2.5 CPU application quota, and report instantaneous peaks separately (Recommended)
- B. Capture one Kubernetes metrics snapshot after the demo
- C. Record configured requests and limits without measuring actual use
- X. Other (please specify)

[Answer]: A. Sample host/VM/Kubernetes and per-workload CPU, working-set/RSS memory, restart/OOM/throttle, persistent-disk use, queue depth, and job phase every second; run a 30-minute warmed complete-workload profile with five browser users and one serialized active ML job; fail any 60-second sustained breach of 16 GiB/3 CPU total or 13 GiB/2.5 CPU application quota, and report instantaneous peaks separately (Recommended)

## Q6. Recovery drill evidence

Which release-level drill should prove the accepted RPO 24 hours and RTO two
hours?

- A. From documented backups, recreate a clean cluster, restore Terraform state and Vault through their protected procedures, restore authoritative PostgreSQL/MongoDB/object/model data, rebuild Redis/Qdrant/OpenSearch projections, replay bounded RabbitMQ/DLQ work, verify tenant isolation and no expired-audit resurrection, then run the smoke tier; measure data-loss point and elapsed recovery against RPO/RTO and preserve failures/limitations (Recommended)
- B. Restore only PostgreSQL and confirm pods become Ready
- C. Document recovery commands without executing a measured drill
- X. Other (please specify)

[Answer]: A. From documented backups, recreate a clean cluster, restore Terraform state and Vault through their protected procedures, restore authoritative PostgreSQL/MongoDB/object/model data, rebuild Redis/Qdrant/OpenSearch projections, replay bounded RabbitMQ/DLQ work, verify tenant isolation and no expired-audit resurrection, then run the smoke tier; measure data-loss point and elapsed recovery against RPO/RTO and preserve failures/limitations (Recommended)

## Q7. Evidence security and command safety

Which security boundary should apply to the evidence harness?

- A. Use an allowlisted versioned command profile with structured arguments and no arbitrary shell from manifests; require least-privilege identities and supported APIs; redact credentials, tokens, cookies, CSRF values, raw supplier files, prompts, generated text, hidden reasoning, and direct tenant/person identifiers; scan outputs before publication; checksum and sign the manifest; fail closed on schema, revision, identity, or redaction mismatch (Recommended)
- B. Permit free-form shell commands when the resulting manifest is checksummed
- C. Capture complete raw logs for troubleshooting and remove secrets manually before publication
- X. Other (please specify)

[Answer]: A. Use an allowlisted versioned command profile with structured arguments and no arbitrary shell from manifests; require least-privilege identities and supported APIs; redact credentials, tokens, cookies, CSRF values, raw supplier files, prompts, generated text, hidden reasoning, and direct tenant/person identifiers; scan outputs before publication; checksum and sign the manifest; fail closed on schema, revision, identity, or redaction mismatch (Recommended)

## Q8. Reviewer-selected local AI profile

How should the portable demo preserve the executing reviewer's model choice?

- A. Ship a CPU-capable local Qwen generation profile and both accepted EmbeddingGemma/Qwen embedding profiles as documented compatible choices; let the reviewer select a locally available pinned profile through validated configuration and record artifact/license/checksum/runtime details; require no GPU or owner cache; keep Bedrock opt-in behind explicit credentials and spend policy with no automatic fallback (Recommended)
- B. Require one exact local model artifact for every reviewer
- C. Use Bedrock as the default whenever the local model is unavailable
- X. Other (please specify)

[Answer]: A. Ship a CPU-capable local Qwen generation profile and both accepted EmbeddingGemma/Qwen embedding profiles as documented compatible choices; let the reviewer select a locally available pinned profile through validated configuration and record artifact/license/checksum/runtime details; require no GPU or owner cache; keep Bedrock opt-in behind explicit credentials and spend policy with no automatic fallback (Recommended)

## Q9. CI and trusted-runner evidence cadence

When should the evidence package run?

- A. On every pull request, run schema, command-profile, deterministic fixture, contract, redaction, and harness tests on hosted untrusted runners; run the real cluster smoke/profile only from a protected main revision or manual approved dispatch on the isolated local runner; run the full and recovery tiers for release evidence, never from public PR code (Recommended)
- B. Run all Kubernetes evidence on every pull request using the local self-hosted runner
- C. Run the evidence package manually with no CI validation
- X. Other (please specify)

[Answer]: A. On every pull request, run schema, command-profile, deterministic fixture, contract, redaction, and harness tests on hosted untrusted runners; run the real cluster smoke/profile only from a protected main revision or manual approved dispatch on the isolated local runner; run the full and recovery tiers for release evidence, never from public PR code (Recommended)

## Q10. Published and retained evidence

Which evidence should live in the public portfolio repository?

- A. Commit compact revision-bound manifests, Markdown summaries, measured tables, sanitized logs/excerpts, contract/test reports, and small charts under a stable evidence index; keep bulky raw traces, browser media, backups, model artifacts, and sensitive diagnostics outside Git with checksums and a 30-day local/CI retention default; every missing external artifact remains visible as unavailable or expired (Recommended)
- B. Commit every raw artifact, backup, model, trace, screenshot, and log to Git LFS
- C. Publish only a manually written README summary without machine-readable evidence
- X. Other (please specify)

[Answer]: A. Commit compact revision-bound manifests, Markdown summaries, measured tables, sanitized logs/excerpts, contract/test reports, and small charts under a stable evidence index; keep bulky raw traces, browser media, backups, model artifacts, and sensitive diagnostics outside Git with checksums and a 30-day local/CI retention default; every missing external artifact remains visible as unavailable or expired (Recommended)

## Ambiguity Scan

The accepted decisions form one measurable and internally consistent profile:

- The 90-minute clean-run objective includes prerequisites and verified
  dependency/model downloads. The 45-minute objective begins only after those
  downloads have been verified. Both are p95 targets across three clean runs,
  and phase timing remains visible.
- The 15-minute smoke and 45-minute full tiers are execution deadlines after
  the system is ready. They do not replace or shorten the clean setup targets.
- Resource evidence measures both the 16 GiB/3 CPU whole-cluster boundary and
  the 13 GiB/2.5 CPU application quota. A breach sustained for 60 seconds
  fails the profile; shorter peaks remain visible without being relabeled.
- One active ML job is serialized during the complete-workload profile. This
  demonstrates the approved local capacity plan rather than parallel training
  capacity or a production-scale claim.
- The selected local AI profile is reviewer-configurable only among validated,
  pinned compatible profiles. The default proof remains CPU-capable Qwen;
  EmbeddingGemma and Qwen embeddings remain accepted choices. Bedrock requires
  explicit credentials and spend policy and is never a fallback.
- The six-state C19 result model is closed and machine-readable. A missing,
  expired, rejected, unavailable, or not-run artifact cannot be converted into
  passed evidence by prose, file presence, or a successful neighboring check.
- The full recovery tier measures the already accepted RPO 24 hours and RTO
  two hours. The 45-minute full-demo deadline covers verification scenarios,
  not the complete two-hour recovery drill.
- Public PRs run only unprivileged harness validation. Real cluster, full, and
  recovery evidence runs only from protected revisions or approved dispatches
  on the isolated local runner.
- Git contains compact sanitized evidence. External bulky artifacts use
  checksums and 30-day retention; expiry remains an explicit manifest state,
  so the repository does not imply that unavailable raw evidence is present.
- U13 uses supported deployment and application interfaces only. It owns
  orchestration and evidence packaging, not infrastructure definitions,
  business state, authorization, database seeding, or provider contracts.

No material NFR ambiguity remains for U13. C19 must be versioned before
implementation to carry the accepted six-state outcome and metadata. Exact
tool and package versions will be pinned in the technology decision and
implementation lockfiles without weakening these targets.

## Consolidated Summary Confirmation

The Demo Evidence package will provide a clean-reviewer run that finishes
within 90 minutes p95 including verified downloads and within 45 minutes p95
after downloads, each measured across three clean runs. It will expose a
15-minute walking-skeleton smoke tier, a 45-minute full portfolio tier, and a
separate measured recovery drill for the accepted 24-hour RPO and two-hour
RTO.

Every result will use a versioned C19 manifest state of passed, failed,
limited, rejected, unavailable, or not-run and bind expected/actual results,
stable IDs, immutable revision, environment, timing, command profile,
checksums, and limitations. Dataset generation will be repeated with fixed
versions and canonical logical hashes for three isolated retailers, one store
and 100 products each, and 18 months of leakage-safe history.

The complete-workload profile will sample host, VM, Kubernetes, workload,
disk, queue, restart, OOM, and throttle evidence each second for 30 warmed
minutes with five browser users and one serialized ML job. A 60-second
sustained breach of either 16 GiB/3 CPU total or 13 GiB/2.5 CPU application
quota fails the profile; shorter peaks remain reported.

The harness will expose only allowlisted versioned commands with structured
arguments, least-privilege identities, automatic redaction scans, checksummed
and signed manifests, and fail-closed revision/schema/identity checks. It will
ship a CPU-capable Qwen path while allowing the reviewer to choose among
validated pinned local generation and accepted EmbeddingGemma/Qwen embedding
profiles. Bedrock remains explicit, credentialed, spend-governed, and
non-fallback.

Hosted runners will validate schemas, fixtures, contracts, redaction, and the
harness on every pull request. Protected revisions or approved dispatches will
run real-cluster evidence on the isolated local runner; release evidence will
include full and recovery tiers. The repository will publish compact,
sanitized, revision-bound manifests, summaries, reports, tables, and charts.
Bulky or sensitive artifacts remain outside Git with checksums and 30-day
retention, and missing or expired evidence remains explicit.

- Looks correct
- Request changes

[Answer]: Looks correct
