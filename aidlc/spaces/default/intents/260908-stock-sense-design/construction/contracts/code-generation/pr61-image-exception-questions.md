# PR #61 candidate image exception decision

Draft [PR #61](https://github.com/anton-asnitsky/StockSense/pull/61) has exact
head `374f9113e9d49e67a6bc579a0fc8cd6aa33d77cf`, based on `main` at
`68bb426590ccd529ccdfcb2dfcaa8ea701ed46e9`. It changes only
`.github/workflows/release-evidence.yml`: the image-evidence path passed to a
`pnpm --dir tools/contracts` script is corrected from
`tools/contracts/dist/image-evidence` to `dist/image-evidence`. This addresses
the `IMAGE_MISSING` failure in [main-push release-evidence run
40754286140](https://github.com/anton-asnitsky/StockSense/actions/runs/40754286140).
The ledger-excluded committed candidate-tree digest is
`sha256:9f9ab01d75178ac20df7eba78b697f2f3a7cf74b5cce372f402b4b54a7ff2259`.
The existing protected-main exception is bound to the prior candidate tree
and does not cover this one.

[Hosted PR #61 run 40756484537](https://github.com/anton-asnitsky/StockSense/actions/runs/40756484537)
built and scanned the exact images and retained image artifact `12844954707`.
Its validator scan has zero findings. The Kiota scan has one Medium finding,
[GHSA-qhrr-8q5h-9q3h](https://github.com/advisories/GHSA-qhrr-8q5h-9q3h),
`pkg:nuget/MessagePack@2.5.302`, fixed in `2.5.303`. The Kiota image ID is
`sha256:92a18575b5f8a832c9a8e506b16a1ce8655475e18d85e66c218c0d81ea412c41`,
its SBOM digest is
`sha256:f26785a5423bc7f0ece82eb5fba94368b2c93bb40b6fdaf06f90faddd96d857c`,
and the retained Kiota scan-file SHA-256 is
`1430b2c0a7a71ca58ffe99a7f53041878ac7936fdb2386bd376a862cecf47af4`.
The scan database was valid and built `2026-10-28T06:23:30Z`. The U1 job
failed at the expected protected-main ledger mismatch; the required U2 job
rejects this protected workflow edit. Vulnerability passed. Neither red check
is being treated as a U1 acceptance or PR merge authorization.

The advisory concerns denial of service if attacker-controlled MessagePack
reaches `System.Object` deserialization. PR #61 does not change the pinned
Kiota image recipe or generation invocation. The pinned Kiota package SHA-256
remains `5e75f6adf161717be8d9f39eb596f93d52535e7b8cbcc00cffdcef3d0d3c3486`;
the fixed `kiota generate` invocation runs network-disabled, read-only and
non-root, with a 2 GiB memory cap and 120-second timeout. Prior independent
review found no identified path to the vulnerable deserializer in that
invocation. MessagePack 2.5.302 is still present, and an unidentified
deserialization path remains a residual risk. These controls limit exposure;
they do not prove the library safe.

The proposed finding-specific exception expires `2026-11-25T00:00:00Z`.
Approval permits preparing a protected-main ledger PR for this exact digest
only. That PR's merge, any temporary required-check change, PR #61's merge,
U1 acceptance and C01 release require separate decisions. The complete
main-push release-evidence run must pass after a separately approved merge.

The independent AI-DLC process review found a **Major documentation drift**:
U1 `traceability.json` and `code-summary.md` still cite earlier PRs, main
revisions, plan fingerprints, and finding dispositions. That drift must be
reconciled before a broader U1 readiness or acceptance gate. This narrow
exception decision does not complete the engine's current Infrastructure
Design stage or validate U1 traceability.

## Decision

Do you approve this one temporary finding-specific exception for PR #61's
exact candidate digest and retained scan evidence?

- Approve exact PR #61 temporary exception
- Request changes

[Answer]:
