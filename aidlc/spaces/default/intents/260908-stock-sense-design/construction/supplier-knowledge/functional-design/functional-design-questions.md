# StockSense supplier-knowledge functional-design questions

Date: 2026-09-25 (reconciled; original Q1-Q14 answered 2026-09-12)
Stage: Functional Design
Unit: supplier-knowledge
Status: Confirmed after approved-contract reconciliation (2026-09-25)

These questions resolve the remaining behavior choices for supplier ingestion, accepted commercial terms, document evidence, and retrieval indexes. Accepted decisions remain fixed: MongoDB owns supplier source and extraction records; PostgreSQL routines own normalized authoritative terms; Qdrant is a rebuildable projection with separate collections per retailer and embedding/configuration version; RabbitMQ jobs are idempotent; CSV and text-based PDF are the initial formats; OCR is deferred; supplier currency must match the retailer currency; EmbeddingGemma-300M and Qwen3-Embedding-0.6B are evaluated on held-out English fixtures; original text and language metadata are preserved for later multilingual support; arbitrary client-selected collections are prohibited; and retrieved supplier content is untrusted data.

## Interaction mode

How would you like to complete these questions?

- A. Guide me through each question (Recommended)
- B. I will edit this file directly
- C. Answer all questions in chat
- X. Other (please specify)

[Answer]: A. Guide me through each question (Recommended)

## Q1. Original-source storage and version identity

Where should original CSV/PDF bytes live, and what creates a source version?

- A. Store immutable original bytes in MongoDB GridFS and source/extraction metadata in MongoDB documents; identify each version by retailer, supplier, source kind, server version, and SHA-256 checksum; reuse an existing result for an exact replay and create a new version for changed bytes (Recommended)
- B. Store original bytes in S3-compatible object storage and only metadata, checksums, and object references in MongoDB
- C. Store only extracted text and normalized rows; do not retain original file bytes
- X. Other (please specify)

[Answer]: B. Store original bytes in S3-compatible object storage and only metadata, checksums, and object references in MongoDB

## Q2. Initial schemas, limits, and validation policy

Which bounded-ingestion policy should the first release use?

- A. Accept UTF-8 RFC 4180 CSV files up to 5 MiB/20,000 rows and text PDFs up to 20 MiB/200 pages; cap returned diagnostics at 100; validate every row/page; retain valid candidates and explicit rejected items in one immutable result, but make nothing authoritative until a later acceptance action (Recommended)
- B. Use the same limits but reject the entire submission if any CSV row or PDF page is invalid or unsupported
- C. Use lower demo limits of 2 MiB/5,000 CSV rows and 10 MiB/100 PDF pages
- X. Other (please specify)

[Answer]: A. Accept UTF-8 RFC 4180 CSV files up to 5 MiB/20,000 rows and text PDFs up to 20 MiB/200 pages; cap returned diagnostics at 100; validate every row/page; retain valid candidates and explicit rejected items in one immutable result, but make nothing authoritative until a later acceptance action (Recommended)

## Q3. Submission and extraction lifecycle

How should source processing states and retries behave?

- A. Use Received, Queued, Processing, Validated, PartiallyValidated, Failed, Superseded, and Deleted; permit retry only from Failed or an interrupted Processing lease; keep every attempt; make exact message replays return the existing attempt/result; and never silently promote a partial result to complete (Recommended)
- B. Use only Pending, Completed, and Failed and derive partial details from diagnostics
- C. Create a new submission version for every retry, even when the original bytes and configuration are unchanged
- X. Other (please specify)

[Answer]: A. Use Received, Queued, Processing, Validated, PartiallyValidated, Failed, Superseded, and Deleted; permit retry only from Failed or an interrupted Processing lease; keep every attempt; make exact message replays return the existing attempt/result; and never silently promote a partial result to complete (Recommended)

## Q4. Authority to accept commercial terms

Who may turn validated candidates into authoritative PostgreSQL terms?

- A. Planners may upload and review sources; Managers may accept, supersede, or revoke terms; Operators may repair processing and indexes but may not accept commercial terms; every acceptance revalidates current membership, retailer placement, product mapping, currency, source status, and expected version (Recommended)
- B. Permit both Planners and Managers to accept terms, while only Managers may revoke them
- C. Automatically accept every fully valid CSV row while requiring manual acceptance only for PDF-extracted candidates
- X. Other (please specify)

[Answer]: A. Planners may upload and review sources; Managers may accept, supersede, or revoke terms; Operators may repair processing and indexes but may not accept commercial terms; every acceptance revalidates current membership, retailer placement, product mapping, currency, source status, and expected version (Recommended)

## Q5. Accepted-term scope, effective periods, and correction

How should authoritative supplier terms be versioned?

- A. Scope terms to retailer/supplier/product, with price, currency, calendar-day lead time, minimum order quantity, pack size, and half-open effective period; prohibit overlapping accepted periods for the same key; retain immutable versions; correct by superseding or revoking with expected-version checks; and preserve old versions for existing proposals and audit (Recommended)
- B. Keep only one current term per supplier/product and update it in place
- C. Allow overlapping terms and let Planning select the lowest current price
- X. Other (please specify)

[Answer]: A. Scope terms to retailer/supplier/product, with price, currency, calendar-day lead time, minimum order quantity, pack size, and half-open effective period; prohibit overlapping accepted periods for the same key; retain immutable versions; correct by superseding or revoking with expected-version checks; and preserve old versions for existing proposals and audit (Recommended)

## Q6. Cross-store applicability

Should accepted supplier terms vary by store in the first model?

- A. Make terms retailer-wide in v1; every store under that retailer uses the same supplier/product terms, while the model preserves an extension point for future store or region eligibility (Recommended)
- B. Require every accepted term to name one store
- C. Allow each term to apply to an arbitrary set of stores in v1
- X. Other (please specify)

[Answer]: A. Make terms retailer-wide in v1; every store under that retailer uses the same supplier/product terms, while the model preserves an extension point for future store or region eligibility (Recommended)

## Q7. Idempotency and multi-store consistency

How should commands and jobs behave across MongoDB, PostgreSQL, RabbitMQ, and Qdrant?

- A. Give submission, extraction, validation, acceptance, embedding, deletion, rebuild, and activation separate tenant-scoped idempotency keys plus request hashes; exact replays return the original result and changed payloads conflict; use a MongoDB transaction/outbox for source-state events and a PostgreSQL transaction/audit/outbox for authoritative-term changes; coordinate projections without a distributed transaction (Recommended)
- B. Use the source checksum as the only idempotency key for every flow
- C. Use a distributed transaction spanning MongoDB, PostgreSQL, RabbitMQ, and Qdrant
- X. Other (please specify)

[Answer]: A. Give submission, extraction, validation, acceptance, embedding, deletion, rebuild, and activation separate tenant-scoped idempotency keys plus request hashes; exact replays return the original result and changed payloads conflict; use a MongoDB transaction/outbox for source-state events and a PostgreSQL transaction/audit/outbox for authoritative-term changes; coordinate projections without a distributed transaction (Recommended)

## Q8. Provenance and citation payload

What evidence must every accepted term and retrieved chunk carry?

- A. Preserve retailer, supplier, source ID/version/checksum, row or page locator, chunk ID/text hash, parser/extractor version, validation configuration, extraction run, language, actor, and timestamps; return document name, version, page/row, chunk, excerpt, and availability/quality status in citations; never substitute another version when evidence is missing (Recommended)
- B. Preserve document ID and page only, relying on logs for processing details
- C. Return excerpts without stable source/version locators
- X. Other (please specify)

[Answer]: A. Preserve retailer, supplier, source ID/version/checksum, row or page locator, chunk ID/text hash, parser/extractor version, validation configuration, extraction run, language, actor, and timestamps; return document name, version, page/row, chunk, excerpt, and availability/quality status in citations; never substitute another version when evidence is missing (Recommended)

## Q9. Source deletion and authoritative history

What should happen when a source document is deleted?

- A. Use a retained tombstone, remove its chunks from every active/building index, and block deletion while a current accepted term depends on it unless that term is revoked or superseded in the same governed action; historical terms and audit provenance retain the source identity/checksum but source bytes become unavailable according to retention policy (Recommended)
- B. Delete the source and all accepted terms derived from it immediately
- C. Never permit source deletion
- X. Other (please specify)

[Answer]: A. Use a retained tombstone, remove its chunks from every active/building index, and block deletion while a current accepted term depends on it unless that term is revoked or superseded in the same governed action; historical terms and audit provenance retain the source identity/checksum but source bytes become unavailable according to retention policy (Recommended)

## Q10. Chunking and hostile-content treatment

How should text PDFs become retrieval chunks?

- A. Normalize deterministically, preserve page and section/table boundaries where possible, split into roughly 600-token chunks with about 15% overlap, and derive stable chunk IDs from source version, locator, text hash, and chunking configuration; changing parser/chunking settings creates a new index generation; retrieved instructions remain quoted untrusted evidence and never become executable guidance (Recommended)
- B. Create one chunk per page regardless of size or structure
- C. Use model-generated semantic summaries as the indexed source of truth
- X. Other (please specify)

[Answer]: A. Normalize deterministically, preserve page and section/table boundaries where possible, split into roughly 600-token chunks with about 15% overlap, and derive stable chunk IDs from source version, locator, text hash, and chunking configuration; changing parser/chunking settings creates a new index generation; retrieved instructions remain quoted untrusted evidence and never become executable guidance (Recommended)

## Q11. English-initial behavior

How should non-English documents and queries behave before another language is evaluated?

- A. Preserve and identify non-English source text but mark it unsupported for authoritative extraction and default retrieval; reject non-English queries with an explicit supported-language response; enable a language only after same-language and cross-language fixtures pass declared evaluation thresholds; never translate silently (Recommended)
- B. Index and search every detected language with a reduced-confidence warning
- C. Translate all non-English inputs to English automatically before extraction and retrieval
- X. Other (please specify)

[Answer]: A. Preserve and identify non-English source text but mark it unsupported for authoritative extraction and default retrieval; reject non-English queries with an explicit supported-language response; enable a language only after same-language and cross-language fixtures pass declared evaluation thresholds; never translate silently (Recommended)

## Q12. Embedding evaluation and default selection

How should the two approved embedding candidates be compared and promoted?

- A. Build separate candidate collections over identical versioned chunks; compare Recall@k, ranking quality, citation correctness, CPU query latency, ingestion throughput, RAM, download footprint, and setup reproducibility; have the Reviewer select one default from recorded evidence, retain the other as an optional configuration, and require a full rebuild for any model/configuration change (Recommended)
- B. Select the model with the best Recall@k automatically, regardless of resource cost or citation quality
- C. Keep both models active and query both for every production request
- X. Other (please specify)

[Answer]: A. Build separate candidate collections over identical versioned chunks; compare Recall@k, ranking quality, citation correctness, CPU query latency, ingestion throughput, RAM, download footprint, and setup reproducibility; have the Reviewer select one default from recorded evidence, retain the other as an optional configuration, and require a full rebuild for any model/configuration change (Recommended)

## Q13. Retrieval-index lifecycle and authority

Which lifecycle should govern Qdrant collections?

- A. Use Planned, Building, Validating, Active, Superseded, Failed, and Deleted generations; let authorized Operators initiate rebuild, activate a fully reconciled generation, roll back to a retained valid generation, or retire one; validate source/deletion counts, checksums, model/config compatibility, and tenant ownership before an atomic server-side routing switch; never expose collection names to clients (Recommended)
- B. Rebuild the active collection in place and accept partial availability during indexing
- C. Let each assistant request choose the embedding model and collection
- X. Other (please specify)

[Answer]: A. Use Planned, Building, Validating, Active, Superseded, Failed, and Deleted generations; let authorized Operators initiate rebuild, activate a fully reconciled generation, roll back to a retained valid generation, or retire one; validate source/deletion counts, checksums, model/config compatibility, and tenant ownership before an atomic server-side routing switch; never expose collection names to clients (Recommended)

## Q14. Deterministic supplier comparison

How should the Supplier Knowledge comparison tool order eligible accepted terms?

- A. Filter by retailer, product, effective time, source availability, and eligibility; normalize unit price only within the retailer currency and pack quantity; return a deterministic ordering by normalized unit price, then lead time, minimum order quantity, pack size, and supplier name/ID; expose every input and do not invent a composite preference score (Recommended)
- B. Rank suppliers with an opaque weighted score chosen by the assistant
- C. Return accepted terms unordered and leave every comparison to the language model
- X. Other (please specify)

[Answer]: A. Filter by retailer, product, effective time, source availability, and eligibility; normalize unit price only within the retailer currency and pack quantity; return a deterministic ordering by normalized unit price, then lead time, minimum order quantity, pack size, and supplier name/ID; expose every input and do not invent a composite preference score (Recommended)

## Ambiguity Scan

All answers select concrete behavior and contain no vague or conditional choices. The two embedding models remain candidates by design: choosing the default requires the recorded comparison evidence and is not an unresolved functional behavior. Detailed operational retention durations, parser/runtime versions, and measured embedding thresholds belong to later NFR, implementation, and evaluation work.

The object-storage decision refines ADR 0009's earlier statement that tenant-scoped originals are retained in MongoDB. MongoDB remains authoritative for supplier submissions, extraction records, version metadata, checksums, and object references; immutable original bytes move to S3-compatible object storage. This matches the SupplierKnowledge component's existing object-storage dependency and must be reflected when ADR 0009 and the shared contracts are next revised.

The source lifecycle and accepted-term lifecycle are deliberately separate. A Validated or PartiallyValidated source contains candidates and evidence only. It never becomes authoritative until a currently authorized Manager accepts specific terms through PostgreSQL routines. MongoDB source transactions and PostgreSQL term transactions each commit their own outbox and audit evidence; idempotent messages reconcile projections without claiming a distributed transaction.

Qdrant remains a disposable, rebuildable projection. Server-owned routing selects one validated collection generation for a retailer and embedding configuration. A missing, stale, deleted, foreign, or configuration-incompatible generation produces an explicit unavailable/conflict result and never falls back to another collection. No contradiction or missing behavior remains for artifact generation.

## Consolidated Summary

Supplier Knowledge is a standalone service that owns supplier submissions, extraction and validation records, candidate offers, authoritative accepted terms, source provenance, document chunks, and tenant/model-specific retrieval-index lifecycles. It does not own Retail Data product identity, purchasing decisions, model experiments, or assistant conversations. It consumes authorized product and retailer reference data and exposes versioned terms, evidence retrieval, and deterministic supplier comparison through governed contracts.

Immutable original CSV and PDF bytes live in S3-compatible object storage. MongoDB owns tenant-scoped submission and extraction metadata, object references, raw and normalized SHA-256 checksums, parser/configuration identity, processing attempts, diagnostics, and source tombstones. Exact content and request replays return the existing result; changed bytes create a new source version. Source processing moves through Received, Queued, Processing, Validated or PartiallyValidated, with explicit Failed, Superseded, and Deleted outcomes. Failed or lease-interrupted work may retry without erasing earlier attempts.

The initial CSV format is UTF-8 RFC 4180 and is limited to 5 MiB and 20,000 rows. Text PDFs are limited to 20 MiB and 200 pages; scans, encrypted/unreadable files, malformed content, and pages without usable text receive explicit outcomes because OCR is outside v1. Up to 100 row/field/page diagnostics are returned. One immutable result retains valid candidates and rejected items, but neither full nor partial validation automatically creates authoritative commercial terms.

Planners may upload sources and review validation/extraction evidence. Managers alone may accept, supersede, or revoke commercial terms. Operators may repair processing and manage retrieval indexes but cannot accept terms. Every term mutation revalidates current membership and role, tenant placement generation, product mapping, retailer currency, source availability/status, idempotency request hash, and expected entity version.

Accepted terms are immutable PostgreSQL records scoped to retailer, supplier, and product and apply retailer-wide in v1. Each version records price in the retailer currency, calendar-day lead time, minimum order quantity, pack size, a half-open effective period, and complete source provenance. Accepted periods for the same retailer/supplier/product cannot overlap. Corrections create a superseding or revoking version; history remains addressable for proposals, stale-version checks, and audit. The model retains an extension seam for later store or regional eligibility.

Submission, extraction, validation, term acceptance, embedding, deletion, index rebuild, and activation each have a tenant-scoped idempotency key and request hash. Exact replays return the original outcome; key reuse with changed input conflicts. MongoDB transactions commit source state and a local outbox. PostgreSQL routines commit accepted terms, business audit, and a local outbox. RabbitMQ consumers update dependent projections idempotently. Object storage and Qdrant reconciliation are observable workflows rather than participants in a distributed transaction.

Every accepted term and document chunk traces to retailer, supplier, source ID/version/checksum, row or page locator, parser/extractor version, validation and chunking configuration, processing run, language, actor, and timestamps. Retrieval citations return document name, source version, page or row, chunk ID, excerpt, and availability/quality status. Missing or deleted evidence is reported explicitly and never replaced with another version.

Source deletion creates a retained tombstone and removes the source's points from active and building indexes. Deletion is blocked while a current accepted term depends on the source unless that term is revoked or superseded in the same governed action. Historical terms and audits retain source identity and checksums after policy-driven deletion makes the original bytes unavailable. Rebuilds honor tombstones so deleted evidence cannot reappear.

Text PDFs are normalized deterministically and split along page and section/table boundaries where possible, targeting about 600 tokens with 15% overlap. Stable chunk IDs incorporate source version, locator, text hash, and chunking configuration. Parser, normalization, chunking, embedding model, dimension, prompting, pooling, precision, or other material configuration changes create a new index generation. Supplier-document instructions remain quoted untrusted evidence and never control agents or tools.

English is the only initially supported extraction and retrieval language. Non-English text and detected language metadata are preserved, but authoritative extraction and default retrieval reject it explicitly until same-language and cross-language fixtures satisfy declared evaluation thresholds. The system never silently translates content or queries.

EmbeddingGemma-300M and Qwen3-Embedding-0.6B receive separate collections built from identical versioned chunks. Evaluation records Recall@k, ranking quality, citation correctness, CPU query latency, ingestion throughput, RAM, download footprint, and clean-setup reproducibility. A human Reviewer selects the default from this evidence; the other model remains an explicit alternative. No model/configuration switch reuses an incompatible index.

Retrieval generations move through Planned, Building, Validating, Active, Superseded, Failed, and Deleted. Authorized Operators may rebuild, activate a fully reconciled generation, roll back to a retained valid generation, or retire one. Before an atomic server-side routing switch, validation checks retailer ownership, model/configuration compatibility, source versions, tombstones, point counts, and checksums. Clients and models never receive or choose collection names.

Supplier comparison filters terms by authorized retailer, product, effective time, source availability, and eligibility. It normalizes unit price using pack quantity within the retailer's single currency and orders results by normalized unit price, lead time, minimum order quantity, pack size, then supplier name and ID. The response exposes every compared input and its provenance. The assistant may explain this result but cannot replace it with an opaque or invented preference score.

## Reconciliation with approved contracts and prior review (2026-09-25)

The Q1-Q14 source, term, retrieval, multilingual and model-evaluation choices above remain unchanged. U5 uses the U14 C23 package for its tenant-scoped RabbitMQ mechanics under the versioned C01/C22 protocol; U5 still owns MongoDB/PostgreSQL outboxes and inboxes, current retailer authority, producer semantics and atomic local effects. U5 is an asynchronous C25 recovery participant, with durable generation fencing, checkpoint and abort/resume results; it is not one of the C24 synchronous bootstrap participants. U15 coordinates the full recovery cut.

The prior architecture review identified three implementability gaps, not new product-policy choices. The revised design must make source deletion and accepted-term changes mutually exclusive through a durable cross-store fence and reconciliation protocol; represent a Validated-but-inactive retrieval generation before activation; and track object cleanup and index cleanup as separate durable substates with a completion predicate. It must preserve the approved rule that an accepted term cannot depend on a deleted source and that index validation cannot silently change the active route.

The existing confirmation predates these approved contract details and review corrections. No new owner-level business choice is proposed.

## Historical Consolidated Summary Confirmation

Does this all look correct before I generate the artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct

## Current Review Reconciliation (2026-09-26)

The approved Q1-Q14 source, terms, retrieval, language, embedding and comparison choices remain unchanged. For C25 recovery, U5 uses one durable class-C generation across a PostgreSQL coordinator fence record and a MongoDB source fence record. Prepare stops new work, installs both fences, drains operations and message relays/consumers/acknowledgements, then close binds separate PostgreSQL, MongoDB and messaging checkpoints. Every source or term mutation checks its local fence in the same transaction as its authoritative write; workers and message paths acquire bounded operation permits and check the generation at their commit or acknowledgement boundary. Any unavailable or mismatched fence fails closed, and U5 never acknowledges a closed cut until both stores and messaging paths prove quiescence. Abort and resume reconcile both records before clearing either fence.

For cache freshness, MongoDB owns a monotonic retailer source generation incremented atomically with every source upload, version change, supersession and deletion; PostgreSQL owns a monotonic accepted-term generation incremented with every accepted-term mutation. The cache key also includes the active retrieval-route generation when retrieval evidence is involved. Each cache hit and fill reads the current authoritative generation vector; a fill compares that vector again before publishing, so a missed invalidation cannot make a stale result appear current. Redis remains disposable.

## Consolidated Summary Confirmation

Does this Supplier Knowledge recovery-fence and cache-freshness correction look correct for the current Functional Design pass?

- Looks correct
- Request changes

[Answer]: Looks correct
