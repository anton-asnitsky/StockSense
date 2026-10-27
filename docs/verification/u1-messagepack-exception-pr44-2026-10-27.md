# U1 Kiota MessagePack exception evidence for PR #44

This record supports a single finding-specific row in `security/image-exceptions.json` for draft [PR #44](https://github.com/anton-asnitsky/StockSense/pull/44). It does not authorize merging this ledger change or PR #44, changing branch protection, accepting U1, or releasing C01. The [PR #45 disposition](u1-messagepack-exception-pr45-2026-10-27.md) remains historical.

The owner selected **Approve exact PR #44 temporary exception** in the [question record](../../aidlc/spaces/default/intents/260908-stock-sense-design/construction/contracts/code-generation/pr44-image-exception-questions.md). The [AI-DLC audit](../../aidlc/spaces/default/intents/260908-stock-sense-design/audit/anton-pc-e91d12f789b9.md) records `DECISION_RECORDED` at `2026-10-27T13:01:22Z`, `HUMAN_TURN` at `2026-10-27T13:01:57Z`, and `QUESTION_ANSWERED` at `2026-10-27T13:03:39Z`. The approval covers preparing the exact ledger PR only.

| Evidence | Exact value |
| --- | --- |
| Candidate | Draft PR #44, story head `62d5ab3a9761274a5b0753e7e5d6a9ad208e6113`; U1 Bolt parent `e7079f1bf96a541c1b3e47ba72de905ba5547c88` |
| Hosted scan | [Run 40506044379](https://github.com/anton-asnitsky/StockSense/actions/runs/40506044379), synthetic merge `3fec410de7dc12ddbd6a24bc2c4cbfae3757e7fd`; Vulnerability scan passed; U1 stopped at protected-main ledger binding before tests |
| Candidate tree digest | `sha256:2d132afa596f7d4b861b640cfeadba53a4257cccefa4bf53349c716fe3bd113e` |
| Validator | Image `sha256:d262de63e02a394f3958c17b6713de19cdb4130c4951486c0a3b9f132831d497`; SBOM `sha256:77b971ee0e32827204eb9af4beaa897c93a5fb152600ca951d7a39ed7ab9fe83`; zero findings |
| Kiota | Image `sha256:d15fad038bd75b4b6b617620412709be6d745c2ffa136ad89b3570ef75c6127e`; SBOM `sha256:ee556ffb30d78f8b7637136511108d9bbf62f1249107cc34b8d03b82ab5f9f05` |
| Finding | One Medium `GHSA-qhrr-8q5h-9q3h`, `pkg:nuget/MessagePack@2.5.302`, fixed in `2.5.303` |
| Scan database | Valid Grype v6.1.10, built `2026-10-27T06:30:41Z` |
| Exception expiry | `2026-11-25T00:00:00Z` |

The retained artifact is `image-evidence-3fec410de7dc12ddbd6a24bc2c4cbfae3757e7fd`. The validator and Kiota package/version inventories match the prior PR #45 retained scans (316 and 120 distinct entries). Kiota's Dockerfile, image build, fixed generation invocation, and image-gate sources are unchanged. The row retains the pinned Kiota 1.35.0 package hash `5e75f6adf161717be8d9f39eb596f93d52535e7b8cbcc00cffdcef3d0d3c3486` and applies only to `kiota generate` in a network-disabled, read-only, non-root container with 2 GiB memory and 120-second limits. This is a time-limited reachability assessment; the vulnerable package remains present. Reassess if the package, invocation, image, scan finding, candidate tree, or controls change.
