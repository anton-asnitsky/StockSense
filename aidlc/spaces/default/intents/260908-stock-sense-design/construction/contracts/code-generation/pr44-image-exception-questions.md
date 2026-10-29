# PR #44 exact image-finding disposition proposal

Draft [PR #44](https://github.com/anton-asnitsky/StockSense/pull/44) has story
head `62d5ab3a9761274a5b0753e7e5d6a9ad208e6113`. Hosted
[run 40506044379](https://github.com/anton-asnitsky/StockSense/actions/runs/40506044379)
checked out synthetic merge `3fec410de7dc12ddbd6a24bc2c4cbfae3757e7fd`
with current U1 Bolt parent `e7079f1bf96a541c1b3e47ba72de905ba5547c88`.
The complete candidate-tree digest, computed locally with the U1 ledger
algorithm and confirmed in the hosted failure log, is
`sha256:2d132afa596f7d4b861b640cfeadba53a4257cccefa4bf53349c716fe3bd113e`.

The retained artifact `image-evidence-3fec410de7dc12ddbd6a24bc2c4cbfae3757e7fd`
contains completed Syft inventories and Grype scans using a valid database
built 2026-10-27T06:30:41Z. The validator image has zero findings. The Kiota
image has exactly one Medium finding:
`GHSA-qhrr-8q5h-9q3h`, MessagePack `2.5.302`,
`pkg:nuget/MessagePack@2.5.302`, type `dotnet`, fixed in `2.5.303`.
The validator and Kiota package/version inventories match the prior PR #45
retained scans exactly (316 and 120 distinct entries respectively); the
Kiota Dockerfile, image build, fixed generator invocation, image evidence and
ledger verification sources are unchanged between PR #45's source head and
this hosted PR #44 merge.

The existing owner-approved finding disposition on protected `main` is bound
to PR #45's different candidate tree. U1 therefore stopped before installing
dependencies or running tests. A PR #44 disposition would replace that
completed prerequisite's ledger row with one row for the exact digest above,
retaining the same finding identity, owner, reachability rationale, fixed
`kiota generate` invocation, exact Kiota package SHA-256
`5e75f6adf161717be8d9f39eb596f93d52535e7b8cbcc00cffdcef3d0d3c3486`,
network-disabled/read-only/non-root container, 2 GiB memory and 120-second
limits, and expiry `2026-11-25T00:00:00Z`. The new row's approval reference
must point to the answer actually recorded for this question.

## Decision

Approve one temporary exception for this exact PR #44 candidate tree and
finding, solely to prepare a protected-main ledger PR? This does not approve
the ledger PR merge, any temporary change to required checks, PR #44's merge,
U1 acceptance, or C01 release. Rejecting the exception leaves PR #44's U1
hosted check blocked until the finding is remediated or another disposition
is approved.

- Approve exact PR #44 temporary exception
- Request changes

[Answer]: Approve exact PR #44 temporary exception
