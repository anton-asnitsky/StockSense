# R-15 patched Noble rollout status

The protected plan receipt for sha256:65e28326a756ad07d1414c9fd36f3df68b774802259d6f23ad5743cf918899ab verified before implementation. After independent candidate review and two passing normal-production lanes, the reviewed changes were published to all three working branches. [Technical review](r15-noble-technical-review-44147191815.md) · [Full production proof](u1-r15-production-noble-44153396174.md)

| PR | Published head | Test merge | Ordinary run |
| --- | --- | --- | --- |
| #74 | edeec8b54a4ee2d019349befbb005b944dce901d | 8856f2d6c1990dd0df3bfb1ae63553e21bfb7b49 | [44155488252](https://github.com/anton-asnitsky/StockSense/actions/runs/44155488252) |
| #75 | bd0241d3313a998039cce4a37059d188e502fda2 | 20add1080680567a75692e857b98b2c225d81dde | [44155493632](https://github.com/anton-asnitsky/StockSense/actions/runs/44155493632) |
| #76 | 0f5db4d25cc9364f825eb752dad05c037c7b9944 | 9fc0a9b55f9b0b35b483816beb67052fcb4a3581 | [44155502137](https://github.com/anton-asnitsky/StockSense/actions/runs/44155502137) |

All share base 402ace3b195c291a756ed230a24a73199ef8349a and normalized runtime sha256:1c7fc5fd4df187a3571460bf807e860f1be6bfd704c3fd9fe037c641adea5340. The integrated test-merge tree 54c472fba572fffddaa15b3e4e96edfaa6868691 equals the tested production source tree. On each ordinary PR, validator findings are zero, all six fixable libc6 matches are resolved, and Kiota retains fourteen rows (12 Medium, one Low, one Negligible). The per-PR raw receipts, SBOMs and source bindings were verified. [Per-PR evidence](u1-r15-final-pr-scans-2026-11-17.json) · [Repeated integrated attempt](u1-r15-final-pr76-attempt2-2026-11-17.json)

Each full production lane passed 452 tests with zero failures/skips and one existing release-only TODO. Line coverage exceeded 91%. Both independently generated all 107 consumer outputs twice on each of the three prior source baselines; all six compiled-client fixtures passed. Each canonical CLI receipt covers 27 boundaries, 40 documents and 355 fixtures, with releaseReady false.

The final runtime preserves the Microsoft payload. Its optional LTTng provider remains inventoried and is explicitly disabled because Noble supplies a different ABI. All 48 active native dependency checks passed. The reviewed recipe fixes a real Chisel-wrapper prefix collision that had omitted tzdata-legacy from package status. The final eleven-package manifest, signed package lock and SBOM agree.

## Remaining owner and security decisions

- U1 failed at protected-main ledger verification on all three PRs. The fourteen exact runtime findings remain unapproved. The proposal retains uncertainty in the eight upstream not-affected cases and does not declare native paths unreachable. [Disposition proposal](u1-r15-noble-disposition-proposal-2026-11-17.md)
- The separate vulnerability check failed on all three for the newly reported High picomatch 4.0.7 advisory. No patched release is available in the checked upstream metadata. [Dependency evidence](u1-r15-new-picomatch-finding-2026-11-17.md)
- Earlier U2 passes bind the old heads. The new heads require owner comments and reruns. The current exact approval lines were presented to the owner.
- Governed combined SBOM authority and attestation are outstanding. R-15 and R-16 remain open. No PR was merged, and neither U1 acceptance nor C01 release was recorded.

Attempt 1 of the final PR #76 run retains independently verified raw receipts and GitHub artifact digest metadata, but its original outer ZIP was replaced by the rerun before an independent archive-byte comparison. Attempt 2 retains its archive. This limitation does not imply an outer-archive verification for attempt 1.
