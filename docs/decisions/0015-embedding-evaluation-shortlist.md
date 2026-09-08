# ADR 0015: EmbeddingGemma and Qwen evaluation shortlist

Date: 2026-09-08
Status: Owner approved EmbeddingGemma and Qwen as candidates.

## Decision

Evaluate `google/embeddinggemma-300m` and `Qwen/Qwen3-Embedding-0.6B` for local
RAG embeddings. This approves the two candidates, not a production winner or
simultaneous use of both models for every query. BGE is not in this shortlist.
The design must support future multilingual documents and queries. The owner
selected English as the initial supported document/query language. Additional
languages and cross-language acceptance are deferred until explicitly selected;
do not claim verified support for them in the initial release.

Start with CPU inference for the reviewer profile. Pin model revisions, runtime,
precision, pooling, normalization and query/document formatting. Follow each
model's required prompts and input limits; do not blindly share preprocessing.
Validate the download/setup path, including EmbeddingGemma access terms, in the
clean-environment reviewer test. Do not require the owner's credentials.

## Controlled evaluation

SS-33 prepares versioned document chunks and separate Qdrant collections for each
model/configuration. Initially compare the default vector dimensions: 768 for
EmbeddingGemma and 1024 for Qwen. Lower-dimensional variants are later experiments.
Even equal-dimensional outputs from different models are not interchangeable.
Query vectors must use the same model/configuration as their target index.

SS-34 evaluates both on the same held-out supplier questions, relevance labels
and authorized corpus. Include product identifiers, lead times, pack sizes,
minimum orders, ambiguous questions and missing evidence. Evaluate English queries against English documents first, preserving original
source text and citations. Keep language metadata and language-aware fixtures so
additional languages can be added. Extend the evaluation to same-language and
cross-language retrieval when more languages are selected; report results per
language pair rather than claiming universal coverage.

Record Recall@k and ranking quality, query latency, ingestion throughput, RAM,
download footprint and downstream citation correctness. Keep retrieval settings
and chunk inputs comparable; report truncation and configuration differences.
Do not infer a winner from model size or unrelated vendor benchmark results.

Select one default from measured results and document the tradeoff before release.
Retain the other as an explicitly configured alternative. A switch requires a
complete versioned reindex and verified query/index routing, not just a model-name
change. Old/deleted documents and cross-tenant results must remain inaccessible.
Serial evaluation avoids assuming both models fit in memory concurrently.

## References

- [EmbeddingGemma](https://huggingface.co/google/embeddinggemma-300m)
- [Qwen3-Embedding-0.6B](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B)
