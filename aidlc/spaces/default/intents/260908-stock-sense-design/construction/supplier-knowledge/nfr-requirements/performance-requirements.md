# Supplier Knowledge Performance Requirements

Unit: U5 Supplier Knowledge (`supplier-knowledge`)

## Scope

Targets apply to the clean local CPU profile. Upload admission, queueing, object
download, parsing, validation, chunking, embedding, persistence, and index work
are measured independently. OCR and non-English retrieval are outside v1.

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR1.1 | Source upload admission shall complete within 500 ms. A maximum 20,000-row/5 MiB CSV shall process within two minutes and a maximum 200-page/20 MiB text PDF within five minutes. | Run valid, partially valid, malformed, encrypted, scanned, replayed, and interrupted fixtures on the clean CPU profile. Publish p50/p95, phase timings, resource peaks, parser/model versions, checksums, and outcomes. | Preserve immutable source/attempt evidence and return an explicit failed or retryable result; never promote incomplete work. |
| NFR1.2 | End-to-end English retrieval shall achieve p95 below 800 ms using the selected local embedding model, with queries capped at 2,000 characters and at most ten chunks whose excerpts are each capped at 1,000 characters. | Execute at least 500 held-out and negative queries after warm-up, reporting query embedding, Qdrant, authorization/provenance validation, and response assembly separately. | Return explicit unavailable, unsupported-language, or limited evidence; never choose a foreign or incompatible collection. |
| NFR1.3 | Deterministic accepted-term comparison shall achieve p95 below 500 ms for the seeded retailer/product corpus and return complete inputs plus the declared ordering. | Benchmark current, future, expired, revoked, unavailable-source, stale-placement, and equal-price tie fixtures under five concurrent users. | Return no invented composite score or supplier preference; fail safely when evidence is insufficient. |

## Evaluation controls

- Embedding candidates use identical versioned chunks, held-out English queries,
  relevance labels, hardware, and corpus/query checksums.
- Promotion requires Recall@10 >= 0.80, citation correctness >= 0.95, retrieval
  p95 <= 800 ms, declared RAM compliance, and clean-setup reproducibility.
- Preserve all passing, failing, and rejected-candidate evidence.

## Limitations

These targets demonstrate the portfolio workload and do not establish a public
service SLA or multilingual quality claim.
