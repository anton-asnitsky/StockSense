# U1 Kiota MessagePack exception evidence for PR #45

This record supports the proposed single row in draft [PR #46](https://github.com/anton-asnitsky/StockSense/pull/46). It records the owner's finding-specific exception decision, not a decision to merge either PR, change branch protection, accept U1, or release C01. The earlier [PR #24 exception record](u1-messagepack-exception-2026-10-25.md) is historical.

The owner selected **Approve exact temporary exception** in the [PR #45 question](../../aidlc/spaces/default/intents/260908-stock-sense-design/construction/contracts/code-generation/image-exception-pr45-questions.md#L35). The engine-owned [audit shard](../../aidlc/spaces/default/intents/260908-stock-sense-design/audit/anton-pc-e91d12f789b9.md#L80273) records `DECISION_RECORDED` at 2026-10-26T04:27:08Z, `HUMAN_TURN` at 2026-10-27T08:39:51Z, and `QUESTION_ANSWERED` at 2026-10-27T08:41:14Z. These are the receipt and answer named in the ledger row.

| Evidence | Exact value |
| --- | --- |
| Candidate | Draft [PR #45](https://github.com/anton-asnitsky/StockSense/pull/45), head `a113e050b91ae5bb94885086cf3ef207487fe8fb` |
| Hosted scan | [Run 40268537404](https://github.com/anton-asnitsky/StockSense/actions/runs/40268537404); `Vulnerability scan` passed, `U1 contracts` stopped at the old protected-main ledger binding |
| Candidate tree digest | `sha256:24e8749221f6a08f4c22d50bd20bed3ca5f393174c7fb18ae5b4a28e6ddcfed8` |
| Validator | Image `sha256:9b68fb91c1cac391e4e797e6874158ab98e6d9c0ec4911e96f55f7c975e10f50`; zero findings |
| Kiota | Image `sha256:b7cb6220ec7795e5d7d38a37dd572c35fa5e4a9d63d17745aeb6153b3df1cd82`; SBOM `sha256:b1dfa311a3b7ba418a9380a747bd4b39794061fa5454ab72781f02373ec30070` |
| Finding | One Medium `GHSA-qhrr-8q5h-9q3h` in `pkg:nuget/MessagePack@2.5.302`; Grype reports fixed version 2.5.303 |
| Scan database | Valid Grype v6.1.10, built 2026-10-25T06:27:34Z |
| Exception expiry | 2026-11-25T00:00:00Z |

The exception keeps the pinned Kiota 1.35.0 package hash `5e75f6adf161717be8d9f39eb596f93d52535e7b8cbcc00cffdcef3d0d3c3486` and applies only to the fixed `kiota generate` invocation. Generation runs without network access, with a read-only filesystem, non-root user, 2 GiB memory cap, and 120-second timeout. The vulnerable package remains present; the bounded reachability assessment must be revisited if the package, invocation, image, scan finding, or candidate tree changes.

The retained hosted scans were checked locally with U1's current image-disposition verifier against the proposed row: validator 0 findings/0 dispositions; Kiota 1 finding/1 disposition. Draft PR #46's hosted [U1 and vulnerability run 40476230821](https://github.com/anton-asnitsky/StockSense/actions/runs/40476230821) passed before this evidence-document update. Its [U2 protected-base policy](https://github.com/anton-asnitsky/StockSense/actions/runs/40476230975) rejected the ledger path as designed. Rerun all hosted checks on the final PR #46 head; no success is claimed for this updated source until they complete. Protected `main` must not be changed without separate owner merge and protection approval.
