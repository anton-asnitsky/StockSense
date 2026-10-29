# PR #61 revised guard pin and image scan — 2026-10-29

Draft [PR #61](https://github.com/anton-asnitsky/StockSense/pull/61) at head
`e507beaeea97d614fce376c15c7c235c49378471` follows protected `main`
`8b0b7ae88a89edd717f7899a3723dff952fb8f03`. The prospective merge
tree is `2d93d270f435e7c03f66a1ad52b1c3f62184dd36`; the repository's
`candidateTreeDigestFromGit` computes its ledger-excluded digest as
`sha256:edaa5c022e7f69492ac68c237419e122aa2eee92b0cbd1ba086216e3f38c2a69`.
Draft proof [PR #64](https://github.com/anton-asnitsky/StockSense/pull/64)
has that exact Git tree on its head. It is proof-only and must not be merged.

The prior exact-tree [proof run 40857651866](https://github.com/anton-asnitsky/StockSense/actions/runs/40857651866)
passed the image scan and protected-ledger binding, then exposed
`CI_GUARD_DRIFT/BR6.7`: `public-pr-policy.yml` had been updated to Node
24.22.2 while `check-ci-policy.mjs` still pinned its old bytes. The story
branch now pins the reviewed workflow digest
`sha256:fc5bbd9b189de20393496af6c9fa83f189b9ecc319a39ae8e6a9316754f18b78`
and adds a repository-level regression test. Focused tests, the full local
unit suite (319 passed, 2 Windows skips), lint and type-check pass. The
local integration suite is not acceptance evidence because the isolated
standards Docker image ID is unavailable on this host; hosted evidence is
required.

[Hosted PR #61 run 40858865507](https://github.com/anton-asnitsky/StockSense/actions/runs/40858865507)
passed Vulnerability and retained the exact image scan. Its validator scan has
zero findings; the Kiota scan has one Medium finding,
`GHSA-qhrr-8q5h-9q3h` in `pkg:nuget/MessagePack@2.5.302`, fixed in
2.5.303. The retained raw scans are in ignored local
`.aidlc/tmp/pr61-e507-scan/`. Their SHA-256 hashes match the receipts:
validator `6036bdbac89c69d9edf87978f917aa99e23feb22fe25d4c7c701909a92dc8d32`;
Kiota `736b775058b6f70e8d1e7bd5d6c0fc634c2adddaf499df56346fe514dd4e6c6c`.
GitHub's immutable synthetic scan commit
`010033e4318ff9e8d10c344a5e7a34e6aa95cbdf` has parents exactly
`8b0b7ae88a89edd717f7899a3723dff952fb8f03` and
`e507beaeea97d614fce376c15c7c235c49378471`, and tree exactly
`2d93d270f435e7c03f66a1ad52b1c3f62184dd36`. The GitHub artifact API
binds `image-evidence-010033e…` to hosted run `40858865507`, and both raw
scan receipts name that synthetic commit as `sourceRevision`.
The hosted image IDs are validator
`sha256:13a892e482a47c712ccaabd54c7da04a4bfc271a717a634227b4d2daf8f580ab`
and Kiota
`sha256:9eea188c21c7e664bcca0ac8787b5afdd9a9e9a3f7254426acd7cc3f3c86c151`.
U1 then stopped at the protected ledger, which still binds the previous
`c77932d0…` candidate. This is the intended fail-closed response to a source
change. The refreshed proof PR's U1 check also cannot pass that ledger until
an exact exception is approved and merged separately.

The previous finding-specific owner decision binds only the older candidate.
It does not authorize an exception for `edaa5c02…`, a ledger merge, a PR #61
merge, a required-check change, U1 acceptance, or C01 release. The current
plan/test approval remains valid: `testing-posture verify --unit contracts`
returned `approved: true`, `fingerprintValid: true`, `receiptValid: true`,
fingerprint
`sha256:6705bd49bc11e014c4698466da0958b3c3dcfd7612aaf0affff908e321eaef0f`.
R-14–R-16, source-manifest/traceability freshness, hosted proof after a
ledger decision, and U1 candidate READY remain open.
