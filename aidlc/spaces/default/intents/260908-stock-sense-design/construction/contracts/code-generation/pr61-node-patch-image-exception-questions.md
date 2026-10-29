# PR #61 Node-patched candidate image exception decision

Draft [PR #61](https://github.com/anton-asnitsky/StockSense/pull/61) is still
open at exact head `4df61602acfa52ee722d9d5c828c7bbf44ca377c`, based
on `main` at `68bb426590ccd529ccdfcb2dfcaa8ea701ed46e9`. The approved
Node 24.22.2 patch and raw image-scan evidence changed its ledger-excluded
candidate-tree digest to
`sha256:c77932d01cec9d9dbd57177504f8c4dc416affb63ab2c48bf635835f05907d34`.
The old PR #61 exception and closed PR #62 ledger proposal bind the previous
tree and cannot apply.

[Hosted run 40849263065](https://github.com/anton-asnitsky/StockSense/actions/runs/40849263065)
built and scanned the exact images at PR merge revision
`8fa1c0be08576ea5bd635925e6af82170416e4b0`. Its retained image artifact
includes checksum-bound raw Grype scans and database status. The validator
image `sha256:1a31ad1c914b9e4d0f60771f8fd72951dab6322c5f3672d8168d6e4ea3920537`
contains Node 24.22.2 and has zero findings. The Kiota image
`sha256:b76e62611cb7543b06e54ee6d172dd26020303fc1d88fcde28b37caedbe01a3c`
has one Medium finding,
[GHSA-qhrr-8q5h-9q3h](https://github.com/advisories/GHSA-qhrr-8q5h-9q3h),
for `pkg:nuget/MessagePack@2.5.302`, fixed in 2.5.303. Its SBOM digest is
`sha256:0868d2d40f65f411d09605408bdcbc8a88a0a4a4cb8e2da6d64421431d012d4a`;
its raw scan digest is
`sha256:a533347260262f810e2f1753b8933341f39a39b9819c8c644631d8b20223f074`.
Both raw scan and database-status hashes matched the retained receipt, and
the database was valid. Vulnerability passed. U1 stopped at the expected old
ledger binding; U2 rejected this PR's protected workflow edits. Neither red
check is a passing candidate or merge authorization.

The advisory concerns denial of service if attacker-controlled MessagePack
reaches `System.Object` deserialization. The pinned Kiota package SHA-256
remains `5e75f6adf161717be8d9f39eb596f93d52535e7b8cbcc00cffdcef3d0d3c3486`.
The fixed `kiota generate` invocation is network-disabled, read-only and
non-root, with a 2 GiB memory cap and 120-second timeout. The controls limit
exposure; they do not prove the vulnerable library safe. An unidentified
deserialization path remains a residual risk.

The proposed finding-specific exception expires `2026-11-25T00:00:00Z`.
Approval permits preparing an exact protected-main ledger PR only. That PR's
merge, any temporary required-check change, PR #61's merge, U1 acceptance and
C01 release require separate decisions. U1 source-manifest, traceability,
code-summary and R-14–R-16 reconciliation remain open before candidate READY.

## Decision

Do you approve this one temporary finding-specific exception for PR #61's
Node-patched exact candidate digest and retained scan evidence?

- Approve exact patched PR #61 temporary exception
- Request changes

[Answer]:
