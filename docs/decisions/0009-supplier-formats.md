# ADR 0009: Initial supplier document formats

Date: 2026-09-08
Status: Accepted by the owner.

## Decision

Support CSV for structured supplier offers, including product, price, lead time,
minimum order quantity and pack size. Support text-based PDF for catalogs and
commercial terms, including extraction and RAG. Defer scanned PDFs and OCR to a
later increment.

## Acceptance and boundaries

SS-21 defines and versions the CSV schema, supplies valid/invalid fixtures and
validates required fields, numeric values and product mappings. Currency and
calendar conventions remain separate decisions.

PDF extraction retains source version and page references. Unsupported scans,
encrypted/unreadable files and extraction failures produce explicit outcomes;
never silently treat missing text as valid supplier terms. File size and processing
limits are defined during implementation. Mixed documents must flag pages without
usable text rather than claiming complete extraction.

Preserve tenant-scoped originals and extraction/validation records in MongoDB.
Accepted normalized terms enter PostgreSQL through approved routines. Qdrant
indexing preserves source/chunk/version provenance. Supplier text remains
untrusted data, including when retrieved into an agent context.

SS-21 covers duplicate imports, invalid CSV, text extraction and rejection paths.
SS-33/34 cover indexing, source citations and tenant-authorized retrieval.
