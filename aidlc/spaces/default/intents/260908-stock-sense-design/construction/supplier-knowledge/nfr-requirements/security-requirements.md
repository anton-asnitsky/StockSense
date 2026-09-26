# Supplier Knowledge Security Requirements

Unit: U5 Supplier Knowledge (`supplier-knowledge`)

## Authority boundary

MongoDB owns source/extraction metadata, PostgreSQL owns accepted terms and the
deletion dependency fence, object storage owns immutable bytes, and Qdrant is a
rebuildable projection. Retrieved content is untrusted evidence and never grants
authority or becomes executable instruction.

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR3.1 | Every upload, status, candidate, acceptance, deletion, retrieval, comparison, rebuild, and route operation shall revalidate identity, membership/role, retailer ownership, scope/job authority, and current placement generation. | Negative tests cover route/resource substitution, revoked membership, stale jobs, client-selected collection/model, pooled context reuse, and model-supplied authority. | Deny without disclosing foreign source, term, chunk, supplier, or collection existence. |
| NFR3.2 | Source deletion shall first reserve a PostgreSQL dependency fence. Term acceptance locks/checks the same fence and cannot commit after reservation. Deletion advances idempotently through reserved, dependencies-cleared, source-tombstoned, cleanup-pending, and completed with outbox acknowledgements and reconciliation. | Race tests interleave acceptance, supersession/revocation, reservation, Mongo tombstone, object deletion, index cleanup, retries, and crashes and prove acceptance/deletion mutual exclusion. | Preserve the fence and safe prior authority; never complete deletion or accept a conflicting term on uncertainty. |
| NFR3.3 | Object cleanup and each active/building index-generation cleanup shall persist independent pending/running/succeeded/failed states. Completion requires a durable tombstone, required term action, object success or recorded retention expiry, and confirmed chunk removal from every required generation. | Partial-success matrix tests every branch order, failure, retry, generation added during cleanup, and restore/reconciliation. | Keep deletion incomplete and content non-retrievable through the tombstone while failed branches retry. |
| NFR3.4 | Retrieved document text, metadata, and embedded instructions shall remain quoted untrusted data. Only typed server-side tools and deterministic accepted-term logic may drive effects. | Prompt-injection fixtures request tenant changes, secrets, tool calls, collection/model selection, approval, or citation substitution and produce no unauthorized action. | Return bounded evidence/limitation and record the adversarial outcome. |
| NFR4.1 | PostgreSQL runtime access shall use Dapper/Npgsql through parameterized U5-owned stored procedures/functions only; direct SQL, EF Core, RLS bypass, cross-unit schemas, and runtime audit mutation are prohibited. | Static and integration tests deny direct DML/DDL, arbitrary SQL, migration rights, and foreign schema access while approved term/fence routines pass. | Fail request/readiness and never retry with broader credentials. |
| NFR5.1 | Human calls shall arrive through the BFF session/CSRF boundary; machine workers use narrow issuer/audience/scope/job authority. Planner, Manager, and Operator privileges remain distinct. | Tests reject invalid sessions/CSRF, wrong audience/scope, Planner acceptance, Operator acceptance, and Manager index administration without required authority. | Deny with stable problem details and no state or projection effect. |
| NFR6.1 | MongoDB, PostgreSQL, object-store, RabbitMQ, Qdrant, model-repository, and encryption credentials shall be workload-scoped Vault/VSO deliveries and absent from Git, Terraform state, sources, logs, and evidence. | Scans, RBAC/mount tests, canaries, rotation/restart tests, and clean setup prove isolation and redaction. | Keep dependent capability unready and rotate suspected exposure. |
| NFR8.1 | REST/admin/upload/retrieval boundaries use versioned OpenAPI 3.1 and durable events AsyncAPI 3.0 with bounded schemas, idempotency, provenance, deletion-fence, generation, and error semantics. | CI validates syntax, examples, compatibility, size/page/diagnostic limits, stable citations, and generated clients. | Block the applicable change; contract conformance cannot grant runtime authority. |
| NFR10.1 | Signals and diagnostics shall exclude credentials, tokens, raw source bytes/full text, hidden prompts/reasoning, foreign tenant data, and unbounded row/page content. | Canary tests retain only bounded locator, rule, status, version, hash, quality, and correlation fields. | Suppress unsafe detail and fail evidence publication if needed. |
| NFR13.1 | CI shall run build/test, contract, Flyway/routine, Mongo schema/index, tenant, deletion-race, prompt-injection, secret, dependency, model-checksum, and container checks on hosted untrusted runners. | Workflow policy proves public PR code receives no local runner, cluster, Vault, model-repository, or deployment credentials. | Block release/deployment and record the failed control. |
| NFR14.1 | Preserve original text and detected language. V1 authoritative extraction/retrieval accepts English only; non-English queries receive explicit supported-language outcomes, and no silent translation occurs. | English, mixed, unsupported, misdetected, and future-language fixtures prove gating and metadata preservation. | Preserve source evidence but deny unsupported extraction/retrieval without claiming multilingual quality. |

## Explicit limitations

OCR, arbitrary client-selected collections, cross-language retrieval, automatic
remote embedding fallback, and assistant authority over commercial terms are
outside v1.

## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-21T12:46:07Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/construction/supplier-knowledge/nfr-requirements/performance-requirements.md > NFR1.1 | The maximum-size CSV/PDF timing tests are measurable, but extraction correctness is not: “usable text,” partial success, and parser/page quality have no quantitative acceptance threshold even though inception requirements.md OQ4 assigns extraction-quality limits to U5. An implementation can meet the time target while producing arbitrarily poor evidence. | Define measurable CSV and PDF extraction-quality gates, including the fixture corpus, required field/text or page success measures, thresholds for Validated/PartiallyValidated/Failed, and evidence required to pass. | New |
| R-02 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/construction/supplier-knowledge/nfr-requirements/tech-stack-decisions.md > Decisions | No cache decision or requirement covers Supplier Knowledge, although inception requirements.md FR19 requires disposable tenant-scoped caching with outage, cold-start, stale-fill/invalidation, and cross-retailer acceptance cases, and NFR3 explicitly includes caches in tenant isolation. The traceability file nevertheless marks NFR3 fully covered. | State whether U5 uses caching; if it does, specify ownership, eligible data, tenant-safe keys, TTL/invalidation, stale-fill race handling, outage behavior, and tests; if it does not, prohibit U5 caching and record the applicable FR19/NFR3 disposition in traceability. | New |
| R-03 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/construction/supplier-knowledge/nfr-requirements/performance-requirements.md > Evaluation controls | Embedding promotion rejects a candidate that exceeds its “declared RAM compliance,” but neither candidate has a numeric model/process RAM ceiling or a defined relationship to the 2 GiB service limit and 16 GiB cluster envelope. The promotion test therefore cannot produce a deterministic pass/fail result. | Set numeric peak-memory and download/working-set limits for each evaluation process, define measurement conditions and whether model loading, ingestion, and query serving may coexist, and bind promotion to those values plus the service and cluster limits. | New |
| R-04 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/construction/supplier-knowledge/nfr-requirements/scalability-requirements.md > NFR2.3 | The design requires an atomic, version-checked ActiveIndexRoute switch, but the NFR artifacts identify no authoritative store, uniqueness/concurrency mechanism, transaction boundary, durability target, or recovery rule for that route. “Server-owned” does not tell an implementer how one active generation is enforced or restored independently of Qdrant. | Name the authoritative route store and record shape; define compare-and-swap/uniqueness and transaction behavior, route-to-generation consistency checks, backup/restore treatment, and reconciliation after crashes or partial activation. | New |
| R-05 | Minor | aidlc/spaces/default/intents/260908-stock-sense-design/construction/supplier-knowledge/nfr-requirements/performance-requirements.md > NFR1.1 | The upload target says every admission “shall complete within 500 ms,” while the confirmed summary says p95 below 500 ms; the acceptance text asks to publish p50/p95 but does not state which interpretation passes. | Choose one percentile and measurement boundary for upload admission and make the requirement, confirmed target, and pass/fail evidence consistent. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Stage definition inspection | PASS: no standalone validation command is declared; sensors are required-sections, upstream-coverage, linter, type-check, and traceability | No stage-listed shell validator was available to run in this bounded review. |
| PowerShell JSON parse | PASS: traceability.json parses | The traceability artifact is syntactically valid; R-02 concerns semantic coverage rather than JSON shape. |
| Terminal review check | PASS: security-requirements.md contained zero prior `## Review` headings | This iteration can append exactly one terminal review section. |

### Summary

Tenant authorization, untrusted-document handling, local transactional outbox/inbox behavior, degraded authority behavior, recovery, and observability are substantially specified. The four major gaps leave extraction acceptance, caching obligations, embedding resource promotion, and durable Qdrant routing open to incompatible implementations, so the advisory verdict is NOT-READY.
