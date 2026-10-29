# U1 validator-image prerequisite: temporary finding disposition

Draft PR #45 (`fix/u1-validator-image-context`, head `a113e05`) changes only
the validator image build context. Its hosted run `40268537404` passed
`Vulnerability scan` and stopped `U1 contracts` at the protected-main image
ledger. The candidate-tree digest is
`sha256:24e8749221f6a08f4c22d50bd20bed3ca5f393174c7fb18ae5b4a28e6ddcfed8`.
The retained scan has zero validator findings and one Kiota finding:
`GHSA-qhrr-8q5h-9q3h`, Medium, `MessagePack` 2.5.302; Grype reports
2.5.303 as fixed. The Kiota image is
`sha256:b7cb6220ec7795e5d7d38a37dd572c35fa5e4a9d63d17745aeb6153b3df1cd82`
with SBOM digest
`sha256:b1dfa311a3b7ba418a9380a747bd4b39794061fa5454ab72781f02373ec30070`;
its scan database status is valid. The existing protected-main exception names
the same finding but a different candidate tree and cannot authorize PR #45.

The proposed disposition retains Kiota 1.35.0 and the exact package hash
`5e75f6adf161717be8d9f39eb596f93d52535e7b8cbcc00cffdcef3d0d3c3486`.
It is limited to the fixed `kiota generate` invocation in a network-disabled,
read-only, non-root container with 2 GiB memory and 120-second limits. It
expires by `2026-11-25T00:00:00Z` and must be revisited if the invocation,
package, image, scan finding, or candidate tree changes. The fixed library
version is not silently substituted into the pinned tool package.

## Decision

Approve one finding-specific, time-limited exception for this exact PR #45
candidate tree, to be recorded in a separately reviewed protected-main ledger
change? This decision does not merge PR #45 or a ledger PR, change branch
protection, accept U1, or release C01.

- Approve exact temporary exception
- Request remediation

[Answer]: Approve exact temporary exception
