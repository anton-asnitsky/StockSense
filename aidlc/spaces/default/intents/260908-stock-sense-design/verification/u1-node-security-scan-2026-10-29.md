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

The existing AI-DLC plan/test instructions approve Node 24.19.0. Their
proposed security amendment must receive a new source-bound Plan Approval
before implementation. The approved PR #61 MessagePack exception is bound to
the pre-upgrade candidate tree; any Node change requires a new exact scan and
finding-specific decision. PR #61 and PR #62 remain draft and unmerged. U1
candidate READY and C01 release remain unclaimed.
