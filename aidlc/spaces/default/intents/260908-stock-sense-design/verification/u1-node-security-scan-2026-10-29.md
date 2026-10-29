# U1 validator Node security scan — 2026-10-29

[Draft PR #62](https://github.com/anton-asnitsky/StockSense/pull/62), head
`a6912ccc09b2f3c048fb172caad011b7e5c45b40`, changes only the protected
image-exception ledger for PR #61's previously approved candidate digest.
Its [hosted U1 run 40839795810](https://github.com/anton-asnitsky/StockSense/actions/runs/40839795810)
and unchanged attempt 2 both failed at `Inventory and scan the exact built
images`, before ledger verification, with `IMAGE_SCAN: validator scan has an
incomplete finding`. Vulnerability passed; U2 separately rejected the
protected ledger edit as designed. This is not a passing U1 candidate or a
merge-ready ledger PR.

The hosted run retained image artifact `12882705823`, including
`validator.cdx.json` with SHA-256
`a829ba091b7e2a48c4cd7a178dc873b14fd185716246c40777416a594a556025`.
That SBOM and PR #61's earlier validator SBOM each contain the same 683
package identities, with none added or removed. The raw Grype match was not
retained because the build script checks findings before writing its
normalized scan. A local scan of that exact retained SBOM used the official
Grype 0.120.1 Windows binary from a release archive whose SHA-256
`32e3c811f31822d17592908bafdc6288aaaca3d52583c479167a8dc8399ed65d`
matched the publisher's checksums file. The local raw JSON has SHA-256
`f1910f9735941bb7d25cb476f6eb90813be8de1e2044ed5e80087f0bc238aa59`.
This local reproduction identifies the matches but is not the hosted raw
scanner output or a trusted release attestation.

The pinned Node 24.19.0 binary in the validator image produced eight Grype
matches: `CVE-2026-111497` (Critical); `CVE-2026-105482`,
`CVE-2026-106069`, `CVE-2026-105483` (High); `CVE-2026-106072`,
`CVE-2026-105481`, `CVE-2026-106074` (Medium); and `CVE-2026-106073` (Low).
All eight were reported as fixed, with Node 24.22.1 among the fixed versions.
Their artifact type is `binary` and PURL is `pkg:generic/node@24.19.0`.
The U1 image parser only accepts the known Debian, npm and NuGet PURL/type
pairs, so it rejects these as incomplete. Its separate policy also rejects
fixed High and Critical findings. Widening the parser or adding a temporary
exception would not resolve the security gate; the Node binary must be
replaced and rescanned. The [Node.js 24.22.1 security release](https://nodejs.org/en/blog/release/v24.22.1/)
lists the fixes, and [24.22.2 LTS](https://nodejs.org/en/blog/release/v24.22.2/)
was published on 2026-10-28. The official Docker Hub
`node:24.22.2-bookworm-slim` index resolved to immutable
`sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c`;
the new binary and final image still require hosted smoke and scan proof.

That first investigation preceded the revised source-bound plan approval.

## Approved patch and hosted follow-up

The owner approved the revised U1 plan and test instructions at fingerprint
`sha256:6705bd49bc11e014c4698466da0958b3c3dcfd7612aaf0affff908e321eaef0f`.
The audit records the human turn before `PLAN_APPROVAL_RECORDED`; a subsequent
`testing-posture verify --unit contracts` returned `approved: true` and
`receiptValid: true`. Draft [PR #61](https://github.com/anton-asnitsky/StockSense/pull/61)
head `4df61602acfa52ee722d9d5c828c7bbf44ca377c` pins Node 24.22.2,
retains raw image scans and database status with image, SBOM, scanner and
source-revision digests, and enforces the local 80% line-coverage floor.
The five new raw-evidence unit tests and local type check passed. The full
local unit suite had 317 passes, zero failures and two Windows environment
skips; it was run before the final verifier-buffer initialization, which was
then covered by the five focused tests and type check. Local Docker Desktop
was unavailable, so final-image proof comes from hosted CI.

[Hosted run 40849263065](https://github.com/anton-asnitsky/StockSense/actions/runs/40849263065)
scanned the PR merge revision `8fa1c0be08576ea5bd635925e6af82170416e4b0`
with source-manifest digest
`sha256:c77932d01cec9d9dbd57177504f8c4dc416affb63ab2c48bf635835f05907d34`.
The retained `image-evidence-8fa1c0be08576ea5bd635925e6af82170416e4b0`
artifact contains both SBOMs, both normalized scans, both raw Grype scans,
database-status outputs and checksum-bound receipts. Local SHA-256 checks
matched each receipt's raw scan, database status and SBOM digest.

| Image | Exact built image ID | Current findings | Evidence |
| --- | --- | ---: | --- |
| Validator | `sha256:1a31ad1c914b9e4d0f60771f8fd72951dab6322c5f3672d8168d6e4ea3920537` | 0 | SBOM lists Node 24.22.2 and no Node 24.19.0; database valid; raw scan digest `sha256:22ba5d9e396da2377de126470f98a25e80ced2a28260070710a6c371e66d109a` |
| Kiota | `sha256:b76e62611cb7543b06e54ee6d172dd26020303fc1d88fcde28b37caedbe01a3c` | 1 | `GHSA-qhrr-8q5h-9q3h`, Medium, MessagePack 2.5.302, fixed; raw scan digest `sha256:a533347260262f810e2f1753b8933341f39a39b9819c8c644631d8b20223f074` |

Vulnerability passed. U1 reached the protected-main ledger check and failed
because the old ledger row belongs to the previous candidate tree. U2 rejected
the protected workflow edits as designed. Thus PR #61 remains draft and is
not merge-ready. The old-digest [draft PR #62](https://github.com/anton-asnitsky/StockSense/pull/62)
was closed without merging. Any exception for the one current Kiota finding
needs a fresh owner decision bound to the new digest; its ledger PR and each
merge need separate approvals. U1 candidate READY and C01 release remain open.
