# PR #51 candidate-validation image exception decision

Draft [PR #51](https://github.com/anton-asnitsky/StockSense/pull/51) has exact
head `d4aa5a6ddc13cce94f1077288971cf05a104511c`, Git tree
`61794b716eadc7484067d29a4e726a5789e991af`, and ledger-excluded
candidate-tree digest
`sha256:ae449a9062ba7ecb8acc196fcad442a21b26daf25e4d5df915249fe3e5b28e76`.
The earlier approval and protected-main ledger row bind a different tree and
cannot authorize this one. The code change binds the candidate record to the
full validation-result digest; it does not alter Kiota's invocation or package.

[Hosted run 40685726261](https://github.com/anton-asnitsky/StockSense/actions/runs/40685726261)
passed its Vulnerability job. U1 built and scanned both exact images, then
stopped at the expected protected-main ledger mismatch before later checks.
Its retained image-evidence artifact is `12814812445`. The validator scan has
zero findings. The Kiota scan has one Medium finding:
`GHSA-qhrr-8q5h-9q3h`, `pkg:nuget/MessagePack@2.5.302`, fixed in
`2.5.303`. The retained scan database was valid and built
`2026-10-28T06:23:30Z`. Its Kiota image ID is
`sha256:ec34d53f21a8c4c37e0c508b699490138efd1b2fdee85f1475bda801717f1290`,
SBOM digest is
`sha256:edd84d44866497cec2624752906dd583b39c5c4e53ca7f3e664ab0f8705bf966`,
and scan-file SHA-256 is
`d21d139b24fcefc09eef9db0f71d3595027d34ecc344afd364bebb107b97c674`.

The [GitHub advisory](https://github.com/advisories/GHSA-qhrr-8q5h-9q3h)
describes denial of service when untrusted MessagePack reaches an `object`
deserializer. Independent security review found no new route to that operation
in this change. The pinned Kiota package SHA-256 remains
`5e75f6adf161717be8d9f39eb596f93d52535e7b8cbcc00cffdcef3d0d3c3486`;
the fixed `kiota generate` invocation runs network-disabled, read-only and
non-root, with a 2 GiB memory cap and 120-second timeout. These controls limit
exposure; they do not prove the vulnerable library safe. An unidentified
deserialization path and denial of service inside the bounded container are
the residual risks. The proposed finding-specific exception expires
`2026-11-25T00:00:00Z` and replaces the older PR #51 tree row.

## Decision

Do you approve a temporary exception for this one finding on PR #51's **exact
candidate-tree digest**? Approval authorizes preparing a protected-main
ledger PR only. Merging that PR, changing required checks, merging PR #51,
accepting U1, and releasing C01 require separate decisions. Full hosted U1
checks still need to run after the ledger is updated.

- Approve exact PR #51 validation-fix temporary exception
- Request changes

[Answer]: Approve exact PR #51 validation-fix temporary exception
