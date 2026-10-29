# PR #61 guard-pin candidate image exception decision

Draft [PR #61](https://github.com/anton-asnitsky/StockSense/pull/61) is at exact
head `e507beaeea97d614fce376c15c7c235c49378471`, with protected `main`
at `8b0b7ae88a89edd717f7899a3723dff952fb8f03`. The proposed merge
tree is `2d93d270f435e7c03f66a1ad52b1c3f62184dd36`. The candidate-tree
digest, excluding only the protected ledger's own blob, is
`sha256:edaa5c022e7f69492ac68c237419e122aa2eee92b0cbd1ba086216e3f38c2a69`.
The previous `c77932d0…` exception does not apply to these bytes.

[Hosted run 40858865507](https://github.com/anton-asnitsky/StockSense/actions/runs/40858865507)
built and scanned the exact revised images. Its retained, checksum-bound raw
Grype reports have zero validator findings and one Medium Kiota finding,
`GHSA-qhrr-8q5h-9q3h` in `pkg:nuget/MessagePack@2.5.302`, fixed in
2.5.303. The raw validator scan digest is
`sha256:6036bdbac89c69d9edf87978f917aa99e23feb22fe25d4c7c701909a92dc8d32`;
the raw Kiota scan digest is
`sha256:736b775058b6f70e8d1e7bd5d6c0fc634c2adddaf499df56346fe514dd4e6c6c`.
The retained receipts match both files. The validator image ID is
`sha256:13a892e482a47c712ccaabd54c7da04a4bfc271a717a634227b4d2daf8f580ab`;
the Kiota image ID is
`sha256:9eea188c21c7e664bcca0ac8787b5afdd9a9a3f7254426acd7cc3f3c86c151`.
GitHub's immutable synthetic commit
`010033e4318ff9e8d10c344a5e7a34e6aa95cbdf` has parents exactly the
`main` and PR #61 heads above and tree exactly `2d93d270…`. The hosted
artifact API binds `image-evidence-010033e…` to run `40858865507`; both raw
scan receipts name that synthetic commit as their source revision.
The protected ledger rejected the new digest, as it should. Vulnerability
passed; U1 and U2 remain red. No candidate or merge is credited as passed.

The advisory concerns denial of service if attacker-controlled MessagePack
reaches `System.Object` deserialization. Kiota 1.35.0 remains pinned to
package SHA-256
`5e75f6adf161717be8d9f39eb596f93d52535e7b8cbcc00cffdcef3d0d3c3486`.
The fixed `kiota generate` invocation remains network-disabled, read-only
and non-root, with a 2 GiB memory cap and 120-second timeout. These controls
limit exposure but do not establish that the vulnerable library is safe; an
unidentified deserialization path remains a residual risk.

The proposed finding-specific exception expires `2026-11-25T00:00:00Z`.
Approval authorizes preparing a protected-main ledger PR for this exact
candidate digest and finding only. The ledger PR's merge, any required-check
change, PR #61's merge, U1 candidate acceptance and C01 release each require
separate decisions. Full hosted proof is still blocked on the ledger; R-14–R-16
and source-manifest/traceability reconciliation remain open.

## Decision

Do you approve this one temporary finding-specific exception for PR #61's
exact revised candidate digest and retained scan evidence?

- Approve exact revised PR #61 temporary exception
- Request changes

[Answer]: Approve exact revised PR #61 temporary exception
