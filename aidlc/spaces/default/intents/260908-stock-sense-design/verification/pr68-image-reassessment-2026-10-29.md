# PR #68 image-exception reassessment — 2026-10-29

## Source and candidate binding

- The owner-approved temporary exception in [the PR #66 question](../construction/contracts/code-generation/pr66-image-exception-questions.md) covers candidate-tree digest `sha256:24d34f5394aaedb15d768ecbedc93ac760c0861b8eacb3b52a765da66ae17b76`, the one Medium Kiota MessagePack 2.5.302 finding `GHSA-qhrr-8q5h-9q3h`, unchanged pinned and isolated invocation controls, and expiry `2026-11-25T00:00:00Z`. Its text requires a new assessment when head, base, scan, or digest changes.
- Draft [PR #68](https://github.com/anton-asnitsky/StockSense/pull/68) is the same policy patch as PR #66 cherry-picked onto current main. Its exact head is `2ff344f720dd4cede61e3fc72ca06f05987aa1e4`, base `c9abe61de1eaf816c8da8ce0d07b96604bc8295d`. GitHub's synthetic commit `3053a34d50455652a0cff91ea8ac47d7180f561d` has those parents and tree `6f3bad800617f5aa09e6c5630cab61cbb8ef7a0b`.
- The old PR #66 synthetic tree and PR #68 synthetic tree differ only at `security/image-exceptions.json`. The ledger-excluded candidate-tree digest was recalculated from PR #68's complete Git tree and is **unchanged** at the approved digest above. The [retained hosted ledger verification](https://github.com/anton-asnitsky/StockSense/actions/runs/40947556271) binds that digest, main `c9abe61`, and ledger blob `8302aa82184068e1d6f741f669362e905490b495`.

## Fresh scan and residual risk

- [Hosted run 40947556271](https://github.com/anton-asnitsky/StockSense/actions/runs/40947556271) retained new raw Grype scans and receipts for synthetic commit `3053a34`. The raw-file hashes match their receipts: Kiota `sha256:a1a2f9521ea53ed079236e9ebb0242a803ecec0cc10d7dff8a2cad82d51346fb`, validator `sha256:9500ea4b276be68add6e9b7e9497e0e670359242e49cd0d265c9e780c722d680`. The scanner database reports valid.
- The new scan has zero validator findings and exactly one Kiota Medium finding, `GHSA-qhrr-8q5h-9q3h` in `pkg:nuget/MessagePack@2.5.302`, fixed in 2.5.303. Both finding lists are identical to the previous PR #66 scan. The pinned Kiota invocation, no-network/read-only/non-root container, 2 GiB/120-second limits, and expiry are unchanged. An unidentified route to vulnerable deserialization remains residual risk.
- An independent StockSense security specialist reviewed the exact source, receipts, scan, controls, and expiry and found no Major gap. The review concluded the existing owner finding-specific exception remains valid after this reassessment; **it did not approve the protected CI change or PR merge**.

## Remaining gates

- PR #68's Vulnerability check passed. U1 passed image-ledger verification but failed later at its deliberate `CI_WORKFLOW_CHANGE/BR6.7` rule for `.github` changes. U2 failed under the old base-owned protected-path policy. Nine focused local policy tests passed. No red check is represented as passing.
- PR #68 is draft and unmerged. The separate owner approval for its exact merge and any temporary required-check change remains open. U1 candidate acceptance and C01 release remain separate.
