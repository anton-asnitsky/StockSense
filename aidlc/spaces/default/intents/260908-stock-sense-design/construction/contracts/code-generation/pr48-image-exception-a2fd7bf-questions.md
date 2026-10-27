# PR #48 revised-tree image exception decision

Draft [PR #48](https://github.com/anton-asnitsky/StockSense/pull/48) changed
to head `a2fd7bff83a713fe83fc015cb8158f25eaddfeb2` to correct the hosted
type-check failure. Its [run 40550767567](https://github.com/anton-asnitsky/StockSense/actions/runs/40550767567)
checked synthetic merge `72268f4cbeafd14f548eb2cb4ac01cd3fadcc9b4`,
Git tree `4d6c2f6274bc98b24e0d9f2a4e66e0e0a7b53229`, and candidate digest
`sha256:ce87da745fe33c5300bff56d107282fe9ea177a6a6b4b30437ff8bca67df470b`.
Its Vulnerability job passed. U1 stopped at the protected-main image ledger
because the previous exception is bound to the prior tree; lint, type-check,
tests and coverage did not run on this new head.

The retained `validator.scan.json` SHA-256 is
`b749190d86fe361f4a77212f7f3b6d42aa572f55d1fa47322eacc2d47504a73f`:
zero findings, image ID
`sha256:30dfde541ceed5da719ad63f9ffaec36b45a9ae598e1275b67afe6b2035768a0`.
The retained `kiota.scan.json` SHA-256 is
`2993e6fec8747617e934a7f8e2b80dcae47b07d77021c25b6d1d827fe9a19d44`:
one Medium `GHSA-qhrr-8q5h-9q3h` in Kiota-bundled MessagePack 2.5.302,
`pkg:nuget/MessagePack@2.5.302`, fixed in 2.5.303; image ID
`sha256:26abc6064bf6cb9f31c863fea341d530bd6de20144bc0fa48e04f6287cc5e52b`.
The image SBOM digests are
`sha256:a5b11d51b6d0be5425a033a49a381fb95ffde01ddab0bfe73a177cdc169ed585`
and
`sha256:3e5dd7950e4c28dadfb65f3784376eb6d4e44b0cf0b62e1742c5906f7694337a`.

The proposed temporary exception expires `2026-11-25T00:00:00Z`. It retains
the fixed `kiota generate` invocation, pinned Kiota package SHA-256
`5e75f6adf161717be8d9f39eb596f93d52535e7b8cbcc00cffdcef3d0d3c3486`,
network-disabled/read-only/non-root container, 2 GiB memory cap and
120-second timeout. The finding remains a time-limited reachability
assessment, not proof that the affected library is safe. The prior approved
exception cannot cover this new candidate digest.

## Decision

Do you approve this one finding-specific temporary exception for the exact
candidate digest above? Approval authorizes preparing a new protected-main
ledger proposal only. That ledger PR's merge and any temporary branch-
protection change require a separate decision. This does not approve PR #48's
merge, accept U1, or release C01.

- Approve exact revised PR #48 temporary exception
- Request changes

[Answer]: Approve exact revised PR #48 temporary exception
