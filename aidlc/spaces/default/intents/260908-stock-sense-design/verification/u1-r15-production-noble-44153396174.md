# R-15 normal production recipe verification

## Verified source and result

Both hosted lanes passed on isolated production source `5897e4fc3e402771feb0a7dda3a7b015b52b2340`. Each invoked the normal `node scripts/build-kiota-image.mjs` entrypoint, including three Python input/identity regressions. Each completed raw scanning, signed package reconciliation, active native dependency checks, all three PR consumer comparisons, lint, type checking, the full unit/integration suite and the explicit C01–C27 CLI/bundle receipt. [Hosted run](https://github.com/anton-asnitsky/StockSense/actions/runs/44153396174) · [Machine evidence](u1-r15-production-noble-44153396174.json)

Each full suite registered 453 tests, with 452 passes, zero failures or skips and one existing release-only TODO. Line coverage was 91.93% and 91.98%, both above the 80% floor. Each canonical CLI verified 27 boundaries, 40 documents and 355 fixture outcomes and returned releaseReady false. The independently verified bundle receipt matched the raw canonical-result digest.

| Lane | Image ID | Evidence archive | Image archive |
| --- | --- | --- | --- |
| 1 | `sha256:f85a75634ca0aaf663f3f5af108998c902b8ba30facee9109d33c8863cd11e52` | [14361210878](https://github.com/anton-asnitsky/StockSense/actions/runs/44153396174/artifacts/14361210878), SHA-256 `e08e6a2b044d8d2a98536b4e41dd3968d81138967c346bcd4c624f9b165afb5a` | [14361220873](https://github.com/anton-asnitsky/StockSense/actions/runs/44153396174/artifacts/14361220873), SHA-256 `90568e6c710c8957593cb83cac16f715debda542667f51d9f56f8eac937aff03` |
| 2 | `sha256:6dc7ea7f5fdffd2064c1c3dfb8e14e58f44e676374c3e1fa7b5669d7ece95f31` | [14360118266](https://github.com/anton-asnitsky/StockSense/actions/runs/44153396174/artifacts/14360118266), SHA-256 `f29533ef4eddfc996162f0e0d6ccde6308c3bd24e74353fa72e882e5b9e75433` | [14360133292](https://github.com/anton-asnitsky/StockSense/actions/runs/44153396174/artifacts/14360133292), SHA-256 `bbc67b3a3d3521f829d206798edf89b65773dd228646c8553331e987decf5d74` |

## Complete runtime and supply-chain evidence

The two exact images have identical complete normalized runtime digest `sha256:1c7fc5fd4df187a3571460bf807e860f1be6bfd704c3fd9fe037c641adea5340`. This matches the corrected isolated construction in run 44147191815. Their eleven-package locks match byte-for-byte and include tzdata-legacy. Every downloaded deb control identity matches the installed dpkg set. Every installed binary has a Syft identity, and the supplemental gcc-14 ELF-note source identity matches its authenticated source package. The signed InRelease files, index/deb hashes, exact effective Chisel wrapper, slice release, full rootfs/config manifest and immutable runtime-input lock are retained.

The normal recipe pins the Python builder, Chisel archive, Canonical slice archive and wrapper bytes. Chisel verifies Ubuntu signatures and index chains. The transport accepts only reviewed snapshot paths and checks every response against the locked size and SHA-256 before returning it. The final package set and versions must equal the reviewed lock. The original Microsoft .NET payload and Kiota 1.38.0 archive remain intact.

All 51 ELF files remain inventoried. Forty-eight active ELF files with dependencies passed the actual candidate loader. Two active ELF files have no DT_NEEDED dependencies. The unchanged optional Microsoft LTTng provider retains its recorded missing ABI .so.0 dependency. DOTNET_LTTng and COMPlus_LTTng are explicitly zero, source-backed by the exact .NET 10.0.15 initializer, and runtime process-map checks confirm it is unloaded. Every other required native dependency is resolved. Rootless, offline, read-only bounded Kiota and net10 probes passed with French globalization and both seasonal Jerusalem offsets.

Both complete raw scans returned the same fourteen findings, with twelve Medium, one Low and one Negligible. Six formerly fixable libc6 findings disappeared at authenticated 2.39-0ubuntu8.12. The known-vulnerable libc6 positive control detected those six again. The current database and explicit Ubuntu scan matched the default scan. Every residual raw finding remains visible. The source-reconciled disposition proposal still requires an owner decision. [Vendor assessment](u1-r15-noble-vendor-reconciliation-2026-11-17.md) · [Disposition proposal](u1-r15-noble-disposition-proposal-2026-11-17.md)

## Consumers and repaired verification failures

Each candidate image generated all 107 paths twice for each previous PR head. All 103 C# files matched their own baselines. Only PR #74's generated Kiota lock version changed from 1.35.0 to 1.38.0. The six actual generated-client compile/request/response fixtures passed.

Independent review found the upstream wrapper's prefix-based deletion dropped tzdata-legacy. The production helper anchors the Package field exactly, tests the prefix collision and rejects a missing downloaded package. The earlier ten-package run 44145036779 is superseded. Corrected isolated run 44147191815 and its full-suite replay 44148404427 passed.

The first production full-suite attempt 44151198589 retained valid build and scan evidence but failed twelve baseline/provenance tests because its diagnostic checkout omitted Git ancestry. The final run retains complete history, verifies the immutable Bolt and stamped source commit/fixture, and preserves that history during consumer comparison. The candidate source remains 5897e4f. The production Dockerfile also uses JSON exec RUN form, as required by its existing regression test.

These results qualify the isolated technical candidate for final-PR verification. Required ordinary PR U1/U2/vulnerability checks, protected-main disposition, combined SBOM authority and any attestation remain bound to the final PR revisions and owner decisions.
