# StockSense Supplier Knowledge NFR Requirements Questions

Date: 2026-09-18
Stage: NFR Requirements
Unit: supplier-knowledge
Status: In progress

Approved behavior includes bounded CSV/text-PDF ingestion, MongoDB metadata,
S3-compatible immutable originals, PostgreSQL authoritative terms, Qdrant as a
rebuildable tenant/model-specific projection, deterministic chunks and
citations, English-first retrieval, and evidence-based comparison of
EmbeddingGemma-300M with Qwen3-Embedding-0.6B.

## Interaction mode

- A. Guide me through each question (Recommended)
- B. I will edit this file directly
- C. Answer all questions in chat
- X. Other (please specify)

[Answer]: A. Guide me through each question (Recommended)

## Q1. Source-processing performance

- A. Admit uploads within 500 ms; process a maximum 20,000-row/5 MiB CSV within two minutes and a maximum 200-page/20 MiB text PDF within five minutes on the clean CPU profile; run one active extraction per retailer and one maximum PDF extraction cluster-wide; report queue, download, parse, validation, chunking, embedding, and commit time separately (Recommended)
- B. Allow five minutes for CSV and 15 minutes for PDF with two large PDF jobs concurrently
- C. Measure processing without pass/fail or concurrency limits
- X. Other (please specify)

[Answer]: A. Admit uploads within 500 ms; process a maximum 20,000-row/5 MiB CSV within two minutes and a maximum 200-page/20 MiB text PDF within five minutes on the clean CPU profile; run one active extraction per retailer and one maximum PDF extraction cluster-wide; report queue, download, parse, validation, chunking, embedding, and commit time separately (Recommended)

## Q2. Retrieval performance and result bounds

- A. Require p95 below 800 ms for end-to-end English retrieval on the selected local embedding model, return at most ten chunks with excerpts capped at 1,000 characters each, cap queries at 2,000 characters, and separate embedding from Qdrant latency (Recommended)
- B. Require p95 below two seconds and return up to 25 chunks
- C. Leave latency and result limits to implementation
- X. Other (please specify)

[Answer]: A. Require p95 below 800 ms for end-to-end English retrieval on the selected local embedding model, return at most ten chunks with excerpts capped at 1,000 characters each, cap queries at 2,000 characters, and separate embedding from Qdrant latency (Recommended)

## Q3. Embedding promotion thresholds

- A. Require Recall@10 at least 0.80 and citation correctness at least 0.95 on held-out English fixtures; reject any candidate slower than 800 ms p95 or exceeding its declared local RAM budget; select the best passing quality/resource tradeoff and retain full evidence for both models (Recommended)
- B. Select the highest Recall@10 candidate with no minimum citation or resource threshold
- C. Let the reviewer choose qualitatively without numeric promotion gates
- X. Other (please specify)

[Answer]: A. Require Recall@10 at least 0.80 and citation correctness at least 0.95 on held-out English fixtures; reject any candidate slower than 800 ms p95 or exceeding its declared local RAM budget; select the best passing quality/resource tradeoff and retain full evidence for both models (Recommended)

## Q4. Service resource and queue envelope

- A. Start the service at a 512 MiB/0.20 CPU request and 2 GiB/0.75 CPU limit, allow three queued jobs per retailer and ten cluster-wide, fail jobs not started within 15 minutes retryably, and serialize model loading/build work when whole-stack measurement requires it (Recommended)
- B. Use a 1 GiB/0.50 CPU request and 3 GiB/1 CPU limit with 25 queued jobs
- C. Choose limits during implementation
- X. Other (please specify)

[Answer]: A. Start the service at a 512 MiB/0.20 CPU request and 2 GiB/0.75 CPU limit, allow three queued jobs per retailer and ten cluster-wide, fail jobs not started within 15 minutes retryably, and serialize model loading/build work when whole-stack measurement requires it (Recommended)

## Q5. Deletion fence across MongoDB and PostgreSQL

- A. Create a PostgreSQL source-dependency fence before MongoDB tombstoning; term acceptance must lock/check the same source fence and cannot commit once deletion is reserved; deletion proceeds through reserved, term-dependencies-cleared, source-tombstoned, cleanup-pending, and completed states with idempotent commands, outbox acknowledgements, and reconciliation (Recommended)
- B. Check dependencies immediately before MongoDB deletion and accept the small race window
- C. Use a distributed transaction across MongoDB and PostgreSQL
- X. Other (please specify)

[Answer]: A. Create a PostgreSQL source-dependency fence before MongoDB tombstoning; term acceptance must lock/check the same source fence and cannot commit once deletion is reserved; deletion proceeds through reserved, term-dependencies-cleared, source-tombstoned, cleanup-pending, and completed states with idempotent commands, outbox acknowledgements, and reconciliation (Recommended)

## Q6. Object and vector cleanup join

- A. Persist independent object-cleanup and per-index-generation cleanup states with pending/running/succeeded/failed values; declare deletion complete only when the tombstone is durable, required term action is committed, object cleanup succeeds or retention expiry is recorded, and every active/building generation confirms chunk removal (Recommended)
- B. Mark deletion complete after object removal and repair Qdrant asynchronously without a join
- C. Mark deletion complete after Qdrant cleanup and remove object bytes later without tracking
- X. Other (please specify)

[Answer]: A. Persist independent object-cleanup and per-index-generation cleanup states with pending/running/succeeded/failed values; declare deletion complete only when the tombstone is durable, required term action is committed, object cleanup succeeds or retention expiry is recorded, and every active/building generation confirms chunk removal (Recommended)

## Q7. Messaging and recovery

- A. Use five attempts with one-to-30-second backoff, seven-day DLQ retention, replay batches of 100, and 30-second lag alerts; inherit RPO 24 hours/RTO two hours and require MongoDB/PostgreSQL/object checksum reconciliation plus complete Qdrant rebuild before healthy retrieval (Recommended)
- B. Use ten attempts, one-day DLQ retention, and restore authoritative stores before later vector rebuilding
- C. Configure values per deployment without acceptance limits
- X. Other (please specify)

[Answer]: A. Use five attempts with one-to-30-second backoff, seven-day DLQ retention, replay batches of 100, and 30-second lag alerts; inherit RPO 24 hours/RTO two hours and require MongoDB/PostgreSQL/object checksum reconciliation plus complete Qdrant rebuild before healthy retrieval (Recommended)

## Q8. Source and projection retention

- A. Keep source/extraction metadata, accepted-term provenance, tombstones, and chunk manifests for the seeded dataset's life; keep original bytes online 90 days and encrypted archive one year; retain superseded valid index generations 30 days for rollback, audit 90 days, logs seven days, and backups 30 days (Recommended)
- B. Retain all sources and index generations indefinitely
- C. Retain source bytes and superseded indexes for 30 days only
- X. Other (please specify)

[Answer]: A. Keep source/extraction metadata, accepted-term provenance, tombstones, and chunk manifests for the seeded dataset's life; keep original bytes online 90 days and encrypted archive one year; retain superseded valid index generations 30 days for rollback, audit 90 days, logs seven days, and backups 30 days (Recommended)

## Ambiguity Scan

The choices form one bounded local profile. Processing and retrieval targets
fit the approved CPU-first reviewer path; resource and queue limits serialize
heavy model/index work when necessary. Embedding promotion now has quality,
citation, latency, memory, and reproducibility gates. Messaging, retention, and
recovery have explicit limits.

The PostgreSQL deletion fence makes term acceptance and deletion reservation
mutually exclusive without a distributed transaction. Independent object and
per-generation vector cleanup states provide a durable join and deterministic
retry for every partial-success combination. Qdrant remains unavailable until a
rebuild reconciles sources, tombstones, chunks, and configuration. No material
performance, scalability, reliability, security, retention, or recovery target
remains vague.

## Consolidated Summary

- **Processing:** Upload admission p95 below 500 ms; maximum CSV within two
  minutes and maximum text PDF within five minutes. One active extraction per
  retailer and one maximum PDF extraction cluster-wide; report every phase.
- **Retrieval:** p95 below 800 ms, queries at most 2,000 characters, ten chunks
  maximum, and 1,000-character excerpts; separate embedding/Qdrant latency.
- **Embedding gate:** Recall@10 >= 0.80 and citation correctness >= 0.95; reject
  candidates over 800 ms p95 or declared RAM budget; retain both evaluations.
- **Resources:** 512 MiB/0.20 CPU request, 2 GiB/0.75 CPU limit; three queued
  jobs per retailer, ten cluster-wide, and a 15-minute start deadline.
- **Deletion:** Reserve a PostgreSQL dependency fence before tombstoning;
  acceptance locks the same fence. Track reservation, dependency clearance,
  tombstone, cleanup, acknowledgements, and reconciliation idempotently.
- **Cleanup join:** Track object and every active/building index cleanup
  independently; complete only after all required branches satisfy the durable
  completion predicate.
- **Messaging/recovery:** Five attempts with one-to-30-second backoff, seven-day
  DLQ, replay batches of 100, 30-second lag alert, RPO 24 hours/RTO two hours,
  and complete reconciled Qdrant rebuild before healthy retrieval.
- **Retention:** Metadata, provenance, tombstones, and manifests live for the
  seeded dataset; originals are online 90 days/archive one year; superseded
  indexes 30 days; audit 90 days; logs seven days; backups 30 days.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct
