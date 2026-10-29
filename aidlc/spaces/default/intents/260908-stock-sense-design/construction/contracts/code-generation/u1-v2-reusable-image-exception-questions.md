# U1 v2 reusable Kiota exception decision — 2026-10-30

Status: awaiting the owner's finding-specific decision. The earlier answer approved the design scope and U1 plan, not this protected-main ledger row or a merge.

## Exact proposed row

- Ledger schema: `stocksense-image-exceptions-v2`, replacing the existing v1 exact-tree row. No validator exception.
- Protected execution fingerprint: `sha256:fc4168f931fc3773e7b1401c400afbc38811cc6b96d2693fef06fddf52903bca`, computed from the complete protected execution path set in US8.7 story head `3db2391c61198ed38df9e9ba28abc66cf5e0dcb4`.
- Final Kiota runtime manifest digest: `sha256:70a0ef0fcb93807a86bae1fcbc81ee2d8c7e15dca01a7afdfe58c5ce9cfc082e` (2,390 entries, 218,922,397 file bytes). The canonical manifest includes paths, file bytes, modes, ownership, symlinks, hardlinks, device identities, executable image configuration and package inventory; timestamps are excluded.
- Single finding: `GHSA-qhrr-8q5h-9q3h`, Medium, Kiota-bundled `MessagePack` `2.5.302`, `pkg:nuget/MessagePack@2.5.302`, fixed upstream in `2.5.303`. The validator has zero findings.
- Owner: StockSense repository owner. Expiry: `2026-11-25T00:00:00Z`.
- Reason and control: Kiota 1.35.0 bundles the affected package. The pinned `kiota generate` path has no identified untrusted MessagePack deserialization route, but one may exist. Keep exact Kiota package SHA-256 `5e75f6adf161717be8d9f39eb596f93d52535e7b8cbcc00cffdcef3d0d3c3486`, fixed invocation, validated offline inputs, immutable source-bound image build and scan, no network, read-only filesystem, non-root user, 2 GiB memory cap, 120-second timeout. Residual risk: denial of service through an unidentified deserialization path.

## Proof and scope

Hosted [run 40961343256](https://github.com/anton-asnitsky/StockSense/actions/runs/40961343256), attempts 1 and 2, built different exact Kiota image IDs but produced the same runtime digest and the same one finding. Their uniquely identified artifacts are `12936431424` and `12935848555`, each downloaded and verified by ID. The proof tree equals [draft story PR #72](https://github.com/anton-asnitsky/StockSense/pull/72)'s tree `b97618c28f6540f0d767cf4a9cbfa85332a11948`. Both U1 jobs stopped at the expected old v1 ledger rejection. [Full checkpoint](../../../verification/u1-reusable-image-proof-2026-10-30.md).

If approved, this row would cover later validated OpenAPI input and ordinary PR changes only while the protected execution fingerprint and final runtime digest match, each actual image is freshly scanned, the database remains current, and the finding stays exact. Any new path in a protected root, changed tool package, runtime content, severity or finding, expired date or missing evidence fails. The protected-main ledger PR, any protection change, US8.7 story merge, U1 acceptance and C01 release require separate decisions.

## Owner question

Do you approve this one temporary v2 exception for the exact execution fingerprint, runtime digest and finding above, expiring 2026-11-25? Approval authorizes preparing a protected-main ledger PR only; it does not authorize a merge or U1 acceptance.

- Approve exact v2 temporary exception
- Request changes

`[Answer]:`
