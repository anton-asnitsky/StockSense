<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
2026-09-21T07:48:27Z — treated Demo Evidence as a verification and packaging unit that owns orchestration and evidence semantics but no infrastructure definition, business state, tenant authority, or provider behavior.
2026-09-21T07:48:27Z — separated the 90-minute clean setup objective, 45-minute post-download setup objective, 15-minute smoke tier, 45-minute full verification tier, and two-hour recovery drill so one timing claim cannot conceal another.
2026-09-21T07:48:27Z — interpreted the 16 GiB/3 CPU whole-cluster limit and 13 GiB/2.5 CPU application quota as measured acceptance boundaries rather than configured-request evidence.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
2026-09-21T07:48:27Z — replaced C19's three-state result assumption with the confirmed six-state model: passed, failed, limited, rejected, unavailable, and not-run.
2026-09-21T07:48:27Z — kept bulky traces, media, backups, models, and sensitive diagnostics outside Git while retaining checksums and explicit expired/unavailable manifest rows.
2026-09-21T07:48:27Z — added a repository-local Node fallback for the AI-DLC review-brief tool because the native 2.8.0 dispatcher could not invoke the checked-in exported main function and the official update endpoint was unavailable.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
2026-09-21T07:48:27Z — selected a Python 3.12 and uv evidence harness to reuse the portfolio's existing Python prerequisite and support cross-platform typed orchestration, accepting a small additional package surface.
2026-09-21T07:48:27Z — allowed reviewer-selected validated local model profiles while retaining a CPU-capable Qwen proof path; reproducibility depends on recording the exact selected artifact, runtime, license, and checksum.
2026-09-21T07:48:27Z — distinguished trusted keyless CI signing from ephemeral local reviewer signing so clean local evidence remains tamper-evident without claiming release provenance.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
2026-09-21T07:48:27Z — clarify measurable U13 evidence for persistent Vault, workload-scoped access, VSO synchronization, and consumer credential reload/rotation before code generation.
2026-09-21T07:48:27Z — resolve C15 retry count under its owning contract and have U13 consume that versioned value instead of fixing five attempts independently.
2026-09-21T07:48:27Z — reconcile C19 semantic ownership by U13, canonical packaging/validation by U1, and the missing U1-to-U13 prerequisite before implementing the six-state schema.
