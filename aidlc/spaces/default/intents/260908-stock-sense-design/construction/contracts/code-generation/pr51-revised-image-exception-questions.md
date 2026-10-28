# Revised PR #51 exact-tree image exception decision

Draft [PR #51](https://github.com/anton-asnitsky/StockSense/pull/51) now has
head `4fe574f0349d89bce584ba09bccf33d096658020`, Git tree
`d9339f019736f97f1b6ee47883d089762fa3e0e6`, and exact
ledger-excluded candidate digest
`sha256:15e1b80226d07916a0cab6dd81e00c00d502ec077ad7faa095d6a0b111d8abba`.
Proof-only [PR #54](https://github.com/anton-asnitsky/StockSense/pull/54)
has the same tree. The previous owner-approved exception was bound to the
earlier `sha256:eb1645b7df20d5681c8200dd0ec6587621c12cebc58decb2aad317792a5d2c21`
tree and does not authorize this one.

[Hosted run 40664060724](https://github.com/anton-asnitsky/StockSense/actions/runs/40664060724)
retained exact image scans in artifact `12804434439`. The validator image had
zero findings. The Kiota image had one Medium finding,
`GHSA-qhrr-8q5h-9q3h`, in bundled MessagePack 2.5.302,
`pkg:nuget/MessagePack@2.5.302`, fixed in 2.5.303. The retained image IDs,
SBOM and scan hashes are in
`verification/u1-pr51-revised-image-scan-2026-10-28.md`. The Vulnerability
job passed; U1 stopped at the old protected-main ledger row before later
tests. The new code passes pinned built-image IDs to the bounded generator
runner for clean-checkout candidate regeneration; local focused tests, lint,
and type check passed. Full hosted proof is still required.

The proposed time-limited disposition keeps the exact pinned Kiota package
SHA-256 `5e75f6adf161717be8d9f39eb596f93d52535e7b8cbcc00cffdcef3d0d3c3486`,
fixed `kiota generate` invocation, network-disabled/read-only/non-root
container, 2 GiB memory cap, and 120-second timeout, expiring
`2026-11-25T00:00:00Z`. This is a reachability judgment, not proof that the
affected library is safe; an unrecognized deserialization route remains the
residual risk. The protected-main ledger permits only current-candidate rows,
so the new proposal would replace the earlier PR #51 row, which would then
stop authorizing that old tree.

## Decision

Do you approve one finding-specific temporary exception for this **revised**
PR #51 candidate digest? Approval authorizes preparing a protected-main ledger
PR only. Merging that PR, temporarily changing required checks, merging
PR #53 or PR #51, accepting U1, and releasing C01 require separate decisions.

- Approve exact revised PR #51 temporary exception
- Request changes

[Answer]:
