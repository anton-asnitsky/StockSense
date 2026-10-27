# PR #48 exception — ordered audit confirmation

The prior owner reply approved this exact temporary exception, but the
question's `DECISION_RECORDED` audit event was omitted before presentation.
This fresh question is recorded first so the audit can prove the options the
owner saw. It does not broaden the prior scope.

Draft [PR #48](https://github.com/anton-asnitsky/StockSense/pull/48), head
`cd5019a`, has hosted merge revision `d5255094449397aa5daef1d76ed3e9fb86869880`
and exact candidate digest
`sha256:af3d8c73886af2a8560b36fe5ee2aff09c0a487b68ad575b1de77334d799edce`.
[Run 40532815840](https://github.com/anton-asnitsky/StockSense/actions/runs/40532815840)
retained zero validator findings and one Medium Kiota-bundled MessagePack
2.5.302 finding, `GHSA-qhrr-8q5h-9q3h` (`pkg:nuget/MessagePack@2.5.302`,
fixed in 2.5.303). The proposed exception expires
`2026-11-25T00:00:00Z` and retains the fixed `kiota generate` invocation,
pinned package SHA-256
`5e75f6adf161717be8d9f39eb596f93d52535e7b8cbcc00cffdcef3d0d3c3486`,
network-disabled/read-only/non-root container, 2 GiB and 120-second limits.
The one-file draft [PR #49](https://github.com/anton-asnitsky/StockSense/pull/49)
contains the proposed protected-main ledger row; its U1 and Vulnerability
checks passed, while U2 refused the ledger edit by policy.

## Decision

Do you reconfirm this exact temporary finding-specific exception? This
authorizes the protected-main ledger proposal only. It does not approve PR
#49's merge or temporary protection change, PR #48's merge, U1 acceptance or
C01 release.

- Approve this exact temporary exception
- Request changes

[Answer]: Approve this exact temporary exception
