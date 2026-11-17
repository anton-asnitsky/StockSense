# New dependency scan blocker during Noble rollout

The current PR #76 scan reports GHSA-fc5q-39xc-vjpf (CVE-2026-112366), High, for picomatch 4.0.7 via Secretlint's walker. The scanner ran successfully and the disposition gate failed with SCAN_FINDINGS. This is separate from the runtime-image findings. [Exact job](https://github.com/anton-asnitsky/StockSense/actions/runs/44155502137/job/134295030175)

GitHub's advisory lists the affected range through 4.0.7 and no patched version. npm's latest tag resolves to 4.0.7. The referenced upstream PR #194 remains open; its own scope notes say some affected forms remain unresolved. It cannot establish a complete supported repair. No release pin, scanner change or exception was introduced. [Advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) · [Upstream PR](https://github.com/micromatch/picomatch/pull/194)

A supported fix must be rechecked when published. An interim finding-specific disposition would need candidate-specific scope and input analysis, policy validation and separate owner approval. No such disposition is established by the runtime plan approval.
