# PR #51 exact-tree image exception decision

Draft [PR #51](https://github.com/anton-asnitsky/StockSense/pull/51) has
story head `2a3adf1961eeb8804cee624dee40f7c96f305acb` and U1 Bolt base
`9885068ad4098c1a7a1999adb4dda86552383331`. Its
[hosted run 40588250011](https://github.com/anton-asnitsky/StockSense/actions/runs/40588250011)
checked synthetic merge `4cb3f5f50903b04d5e9a5e376c914ba7df23d534`,
Git tree `1a0fb4c3ac3a34d9f135cc211922731809e1701d`, and exact
candidate digest
`sha256:eb1645b7df20d5681c8200dd0ec6587621c12cebc58decb2aad317792a5d2c21`.
The Vulnerability job passed. The U1 job built and scanned both pinned images,
then stopped at the protected-main ledger because its current row belongs to
PR #48's older tree. Hosted lint, type, unit, integration and coverage steps
have not yet run on PR #51.

Retained artifact `12773565169` contains zero validator findings (image ID
`sha256:0379a2f9bc33082e1e238035c667234c8843e9e35de8b64a1c635a9c6a3c3362`,
scan SHA-256 `909ecae3bdbe21309217bdc134e32f478d885dec9e3198f9cec37b7a6e483e26`)
and one Kiota Medium finding, `GHSA-qhrr-8q5h-9q3h`, in bundled MessagePack
2.5.302, `pkg:nuget/MessagePack@2.5.302`, fixed in 2.5.303 (image ID
`sha256:1e4b99d0382c3f9e01c6a5a0da16f0cfb7e143a7d33a6caaef38ccc25d085bb4`,
scan SHA-256 `abfaf588124f6097ddc79e0927737a7b4c77978ef8b7bef29ce4b29ec2af902c`).
The source and image evidence is detailed in
`verification/u1-pr51-image-scan-2026-10-27.md`.

The proposed time-limited disposition retains the fixed `kiota generate`
invocation, Kiota package SHA-256
`5e75f6adf161717be8d9f39eb596f93d52535e7b8cbcc00cffdcef3d0d3c3486`,
network-disabled/read-only/non-root container, 2 GiB memory cap and
120-second timeout. It would expire `2026-11-25T00:00:00Z`. This is a
reachability assessment, not proof that the affected library is safe. The
independent security review found the same advisory and no weakened Kiota
invocation control in this story; an unrecognized deserialization route is
the residual risk. The
protected-main ledger permits only current-candidate rows, so a proposal for
this tree would replace the PR #48 row; the old exception would no longer
authorize a rerun of that earlier tree.

## Decision

Do you approve this one finding-specific temporary exception for the exact
PR #51 candidate digest above? Approval authorizes preparing a protected-main
ledger PR only. Merging that PR, temporarily changing required checks, merging
PR #51, accepting U1, and releasing C01 require separate decisions. The
independent reviews found that AI-DLC source/traceability records and the
trusted main-push candidate receipt still need completion before U1 READY.

- Approve exact PR #51 temporary exception
- Request changes

[Answer]:
