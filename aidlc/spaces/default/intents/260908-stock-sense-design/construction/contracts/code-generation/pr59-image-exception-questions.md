# PR #59 candidate image exception decision

Draft [PR #59](https://github.com/anton-asnitsky/StockSense/pull/59) has exact
head `2c77ca3ce480a08a38992744a17040036b446b69`, based on protected
`main` at `36c54749790c6288553018e15989beca7418f5f9`. It retains the
Bolt's implementation bytes while preserving main-only audit and verification
records. Its ledger-excluded committed candidate-tree digest is
`sha256:9847509d6ee3930bdca0707e8c4478118bb6e045701528e5d2340957c1b15add`.
Main's existing image exception binds a different digest and cannot cover it.

[Hosted run 40727329170](https://github.com/anton-asnitsky/StockSense/actions/runs/40727329170)
passed its Vulnerability job. U1 built and scanned the exact images, retained
artifact `12833028034`, then stopped at the expected protected-main ledger
mismatch before later tests. The validator scan has zero findings. The Kiota
scan has one Medium finding, [GHSA-qhrr-8q5h-9q3h](https://github.com/advisories/GHSA-qhrr-8q5h-9q3h),
`pkg:nuget/MessagePack@2.5.302`, fixed in `2.5.303`. The Kiota image ID is
`sha256:b77ceb34c19e5d902799b1ab018c64eddf9a2566e501811e66bd59fcc438167d`,
its SBOM digest is
`sha256:123e924c7d2b7ee20e25c742f6c8f14a8f8380bb3f3ef3f912717d71805e98b7`,
and the retained Kiota scan-file SHA-256 is
`39cb0a93cae7e7b71210ae153a70410014a1e8f9116cd4139c198405fda2873a`.
The scan database was valid and built `2026-10-28T06:23:30Z`.

The advisory concerns denial of service when attacker-controlled MessagePack
reaches `System.Object` deserialization. The pinned Kiota package SHA-256 is
`5e75f6adf161717be8d9f39eb596f93d52535e7b8cbcc00cffdcef3d0d3c3486`.
The fixed `kiota generate` invocation remains network-disabled, read-only and
non-root, with a 2 GiB memory cap and 120-second timeout. Independent security
review found no identified path to the vulnerable deserializer in this
invocation. MessagePack 2.5.302 is still present; the changed image ID/SBOM
has not been fully diffed against the prior image, and an unidentified
deserialization path remains a residual risk. These controls limit exposure;
they do not prove the library safe.

The proposed finding-specific exception expires `2026-11-25T00:00:00Z`.
Approval permits preparing a protected-main ledger PR for this exact digest
only. That PR's merge, any temporary required-check change, PR #59's merge,
U1 acceptance and C01 release require separate decisions. U1's full hosted
checks must run after the ledger is updated. The U2 protected-base check also
rejects PR #59's protected-path edits by design.

## Decision

Do you approve this one temporary finding-specific exception for PR #59's
exact candidate digest and retained scan evidence?

- Approve exact PR #59 temporary exception
- Request changes

[Answer]: Approve exact PR #59 temporary exception
