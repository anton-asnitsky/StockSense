# PR #66 exact candidate image exception decision

Draft [PR #66](https://github.com/anton-asnitsky/StockSense/pull/66) is at exact head `7adcf1295fdb002a7b429dae62b13c9e22096b4c`, targeting protected `main` `bffd780237455ff2ba03f65e4fb624d330c90c88`. GitHub's synthetic merge commit `0d3e47d61563ce8c83e0fc07c71bd56ae4a2db78` has those exact parents and tree `8967cc8317a6a515a5cd25142b97ab8eacca0bf9`. The candidate-tree digest, excluding only the protected ledger blob, is `sha256:24d34f5394aaedb15d768ecbedc93ac760c0861b8eacb3b52a765da66ae17b76`. The existing PR #61 exception has a different candidate-tree digest and does not apply.

[Hosted run 40907744878](https://github.com/anton-asnitsky/StockSense/actions/runs/40907744878) built and scanned this exact candidate. The retained raw Grype receipt names the synthetic commit and matches the raw scan bytes: Kiota `sha256:f533df5de53adfbdb26df9b62016fd9ff7b2b1f18e1ba1a60f5d10c593a033ed`, validator `sha256:e2282000d6a3f16504d67372c517765288a2897acbd25bdf71651ec1a0aa3724`. The validator has zero findings. Kiota image `sha256:60806f7a1cb8f41aac981ecd124bd55926f55d1053de4636a2f6c2223428f1f3` has one Medium finding, [GHSA-qhrr-8q5h-9q3h](https://github.com/advisories/GHSA-qhrr-8q5h-9q3h) in `pkg:nuget/MessagePack@2.5.302`, fixed in 2.5.303. The scan database reports valid. The unapproved ledger mismatch makes U1 red; U2 is separately red because current protected `main` still runs the old unconditional protected-path rejection. Vulnerability passed. No red check is represented as passing.

The existing approved control remains: Kiota 1.35.0 pinned to package SHA-256 `5e75f6adf161717be8d9f39eb596f93d52535e7b8cbcc00cffdcef3d0d3c3486`, fixed `kiota generate` arguments, network-disabled/read-only/non-root container, 2 GiB memory cap and 120-second timeout. These limit exposure, but an unidentified route to the vulnerable MessagePack deserializer remains a residual risk. The proposed finding-specific exception expires `2026-11-25T00:00:00Z`.

Approval authorizes preparing an exact protected-main ledger PR for this candidate digest and finding only. That ledger PR's merge, any required-check change, PR #66's merge, U1 candidate acceptance and C01 release each require separate decisions. A refreshed PR #66 head, base, scan or candidate digest would require a new assessment.

## Decision

Approve this one temporary finding-specific exception for PR #66's exact candidate digest and retained scan evidence?

- Approve exact PR #66 temporary exception
- Request changes

[Answer]: Approve exact PR #66 temporary exception
