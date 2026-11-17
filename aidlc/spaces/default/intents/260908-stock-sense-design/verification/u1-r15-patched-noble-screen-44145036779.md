# Patched Noble candidate screening

**Superseded by inventory correction.** Independent review found the upstream wrapper's prefix deletion removed tzdata-legacy when replacing tzdata. The run's ten-package inventory and its package reconciliation therefore missed one selected downloaded package. Diagnostic commit c8e8d93 anchors exact package-field replacement, tests the prefix collision and requires equality between every downloaded deb identity and dpkg. Retain this run as historical behavior evidence. Its scan and inventory cannot qualify the final candidate.

## Result

Two isolated hosted builds at recipe commit `6788ce2` used integration source `46325b340caa23f203227eae0f92a97b2c818c9c`. Both produced the same complete normalized runtime digest `sha256:ef2c028479917be4ba3031639bd5a5ccdd43d84065834745b5aed59c9866e0d0` and identical authenticated package locks. Both raw scans retained 14 findings, comprising twelve Medium, one Low and one Negligible. The six libc6 findings with a published fix disappeared. Each positive-control SBOM restored those same six findings when the libc6 identity was changed back to 2.39-0ubuntu8.9. Both actual-image scans used libc6 2.39-0ubuntu8.12. [Hosted screening](https://github.com/anton-asnitsky/StockSense/actions/runs/44145036779) · [Machine comparison](u1-r15-patched-noble-screen-44145036779.json)

| Lane | Actual image ID | Retained scan/evidence artifact | Retained image artifact |
| --- | --- | --- | --- |
| 1 | `sha256:887a09d647c642d8e40e25fbbbd402b4354b5677453df259331100f2123d1b8f` | [14355713654](https://github.com/anton-asnitsky/StockSense/actions/runs/44145036779/artifacts/14355713654), SHA-256 `96f886a7d912cfe62c183753dd548d06e8cfdd1d2c25fa3a255d41d1ec7966c6` | [14356597052](https://github.com/anton-asnitsky/StockSense/actions/runs/44145036779/artifacts/14356597052), SHA-256 `14baae8a8d3d0f36839e8144bed1a62c0b3831aac0e6c6be17f8e095e5968aaf` |
| 2 | `sha256:edc392fce4df0a2eb94e6f8fd8b054b6834f5cb6535cc66bf7dacbc03b1d50a9` | [14356726739](https://github.com/anton-asnitsky/StockSense/actions/runs/44145036779/artifacts/14356726739), SHA-256 `a87491c930c76f17c218d4992dc8a7689024198a85dea986742df548fe902775` | [14356147623](https://github.com/anton-asnitsky/StockSense/actions/runs/44145036779/artifacts/14356147623), SHA-256 `0b41ba93363a7a9e064a9ff9a7b11c6ee736b232554410cc509980d8eaee62b2` |

## Authenticated construction and inventory

Microsoft's current Noble amd64 child still resolved to `e7e90bfc3ce16f9efdf18c25c7e4876af4ffba7ea50582878f6ea05b1e04a7ec`, containing the old libc6. The candidate constructs a clean rootfs from the fixed Ubuntu `20261116T000000Z` snapshot with Chisel 1.5.0. Chisel's signed InRelease and package-index integrity checks remain active. The transport permits only that snapshot's archive paths and rejects redirects outside it. Both artifacts retain all fetched index/package paths and SHA-256 values, the three signed InRelease files, each original deb control file, the exact effective wrapper, release configuration, slice tar and resulting Chisel/dpkg inventory.

The recipe pins the Python builder child `2784af835b90070d9d37d3aa5aa01a3e825d88436b0d58f7776d2cdcb6780f9e`, Canonical slices `a84c5eb70f22c34212c6582f603467498061c978`, wrapper `06863a443519f644272eddfc45e013de8dbe0cb2`, and Chisel binary SHA-384 `f8ba3f3d04165b50d91aae7eb3bcaca2a714f1877d2af005989617937cf2e375ab30d4a50b1308263e61a61ecb79de5c`. It retains Microsoft's exact .NET 10.0.15 payload from `e7e90bfc…`, the approved SDK and Kiota archive. The original archive hash verifies `ec934c391c94e156543ce63cb497d6944180105b2b794b8b3a53a89b89cd4d82`. [Diagnostic recipe](https://github.com/anton-asnitsky/StockSense/tree/6788ce2/.github/r15-noble)

Every installed binary package in the ten-package dpkg manifest reconciles to a downloaded deb identity and a Syft entry. The supplemental gcc-14 source identity is justified by the package control source field and Syft's ELF-note cataloger. All native and NuGet identities remain in both raw inventories. The default and explicit Ubuntu 24.04 scans have identical finding identities. The valid Grype v6.1.10 database was built on 2026-11-17 at 06:20:58 UTC and originated from an archive bound to SHA-256 `3f0cbdbc9d40fb69eaeacec1869b27a8c74f1894108804ace8b7468513e2df07`.

## Native behavior and optional tracing

Both images ran as UID/GID 65532 with a read-only root, no network, dropped capabilities, no-new-privileges, one CPU, a 2 GiB memory/swap limit and 128-process limit. Kiota reported 1.38.0, the net10 probe completed, and French globalization and both Jerusalem seasonal offsets passed.

The inventory enumerated all 51 ELF files. The 48 active ELF files with DT_NEEDED entries passed the exact candidate loader's dependency-list operation. The two remaining active ELF files have no DT_NEEDED dependency. The final ELF is Microsoft's unchanged optional LTTng provider, whose required liblttng-ust.so.0 is absent. It remains explicitly recorded with its original hash and unmet dependency. DOTNET_LTTng and COMPlus_LTTng are both set to zero. The exact .NET 10.0.15 initialization source checks this setting before dlopen and tolerates missing tracing dependencies. Runtime smoke tests verified the settings and the absence of the tracing provider from process mappings. [Immutable upstream source](https://github.com/dotnet/runtime/blob/a3788b71495457354b64ca8040b6ded5ff6ca4f9/src/coreclr/pal/src/misc/tracepointprovider.cpp)

An earlier all-ELF check correctly identified the unresolved provider. An isolated attempt to install Noble's liblttng-ust1t64 still failed because that package provides ABI .so.1. The final recipe uses the explicit disabled tracing configuration. Every active dependency remains checked, and every provider/package remains inventoried.

## Consumers and remaining work

Each image independently ran all three consumers twice for each current PR head, preserving all 107 output paths. All 103 generated C# files were unchanged. PR #74's only generated difference was the Kiota lock version field. Six generated-client compile/request/response fixture runs passed. The 36 bounded invocations had a maximum observed duration of 1,368 ms and peak memory of 143,724,544 bytes. [Independent consumer comparison](r15-noble-consumer-proof-44145036779.json)

Fourteen raw findings still require the owner-reviewed disposition described by the vendor reconciliation. This is isolated candidate evidence. Ordinary U1, protected-main ledger binding, combined SBOM and attestation require their own final-revision verification. [Vendor reconciliation](u1-r15-noble-vendor-reconciliation-2026-11-17.md) · [Disposition proposal](u1-r15-noble-disposition-proposal-2026-11-17.md)
