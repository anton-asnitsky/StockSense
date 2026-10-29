# U1 Contracts Code Generation Plan Approval — reusable image exception

The owner approved the reusable Kiota exception design scope in `u1-reusable-image-exception-questions.md`. The revised `code-generation-plan.md` and `unit-test-instructions.md` add Steps 17–19: a protected complete-path execution fingerprint, a normalized final-runtime baseline proven by two independent hosted builds, per-run image scans and fail-closed negative tests. The exact-tree exception stays active until replacement proof and a separately approved protected-main rollout. The official Kiota 1.36.1 package still bundles MessagePack 2.5.302, so this plan retains pinned Kiota 1.35.0.

[PR #69](https://github.com/anton-asnitsky/StockSense/pull/69) changed only documentation. U2 and Vulnerability passed; U1 failed because the protected ledger row belongs to another whole-candidate digest. The [proof](../../../verification/ordinary-pr-ci-smoke-2026-10-29.md) and [NFR amendment](../nfr-design/image-exception-scope-amendment-2026-10-29.md) describe the gap and risk. The residual risk is denial of service if an unknown input path reaches vulnerable MessagePack deserialization. The proposed reusable exception expires no later than 2026-11-25 and requires reapproval for changed execution inputs, runtime content, or finding.

The existing source-bound plan receipt is invalid after this plan/test amendment. Plan approval permits implementation and verification only. The protected-main ledger and policy merge, any temporary required-check change, U1 candidate acceptance and C01 release remain separate decisions. R-14–R-16 remain open.

## Plan Approval

Do you approve this exact `code-generation-plan.md` and `unit-test-instructions.md` for continued U1 Contracts remediation?

[Approval Fingerprint]: sha256:71be9ce061ef26cfa02fa6fe235ee3c0f34045105da361ddf014b2210cb5f609

- Approve Plan
- Request Changes

[Answer]: Approve Plan
