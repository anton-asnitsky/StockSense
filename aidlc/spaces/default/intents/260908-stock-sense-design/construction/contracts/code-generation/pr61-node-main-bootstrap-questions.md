# PR #61 protected-main Node patch bootstrap decision

Draft [PR #61](https://github.com/anton-asnitsky/StockSense/pull/61) at exact
head `44d439060606878c9b3a4ff014279e0437d88147` targets protected
`main` at `6fb5b64b710a95e8f41749d1654e203d95fcb8c9`. It changes 13
files: three protected workflows, the Node 24.22.2 validator/tool pins,
image evidence and scan-source logic, the corresponding CI guard pin, and
unit tests. Its Git tree and prospective merge tree are exactly
`7804a5b10f7b13fe07a3ec6054d3efe195680b40`; its ledger-excluded
digest is the owner-approved
`sha256:edaa5c022e7f69492ac68c237419e122aa2eee92b0cbd1ba086216e3f38c2a69`.
Protected `main` contains the exact temporary exception for the one Medium
Kiota MessagePack finding, expiring 2026-11-25.

PR #61's [current hosted run 40888120625](https://github.com/anton-asnitsky/StockSense/actions/runs/40888120625)
passed exact image scanning, protected-ledger binding and Vulnerability.
U1 then failed at CI policy because the PR changes protected workflows; U2
also rejected those paths. Neither red check is credited as passing.

Proof-only [PR #64](https://github.com/anton-asnitsky/StockSense/pull/64)
has the exact same Git tree. Its [hosted run 40888350016](https://github.com/anton-asnitsky/StockSense/actions/runs/40888350016)
passed U1 and Vulnerability, including image-ledger verification, CI policy,
lint, type-check, unit tests, integration tests and the 80% line-coverage
floor. GitHub's immutable synthetic proof commit
`6cd59aaf1df3815ff2be9db5ac4a60389a6fb2e0` has that exact tree. This
is evidence for the candidate code and workflow bytes; it does not make PR
#61's own required checks green. The independent technical review found no
separate Major implementation defect; it identifies the red required checks
as the merge blocker.

The proposed one-time sequence is:

1. Recheck PR #61 exact head, `main` exact base, 13-file scope, current checks,
   proof tree, protected exception and full protection snapshot. Stop if any
   pin moved or proof no longer binds.
2. Mark only PR #61 ready. Temporarily remove only `U1 contracts` and
   `U2 protected-base PR policy` from required checks, retaining the
   required PR, `Vulnerability scan` (app 15368), strict checks, admin
   enforcement, and force-push/deletion blocks. This temporary change
   affects every PR to `main` while active and does not retroactively
   validate either red check.
3. Squash-merge only PR #61. In a `finally` path, immediately restore U1
   with its original unbound app ID and U2 with app ID 15368, even if the
   merge fails. Re-read the full protection settings and require equality
   with the original snapshot.
4. Verify the merge commit and run the protected `main` U1 and release-
   evidence workflows. Record their actual results, investigate any failure,
   and leave proof PR #64 unmerged.

This decision authorizes only PR #61's bootstrap and temporary check change.
It does not accept U1 candidate READY or release C01. The source manifest,
95-ID traceability, code summary, R-14–R-16 and independent acceptance
review remain separate work.

## Decision

Do you approve this exact PR #61 bootstrap sequence and temporary U1/U2
required-check change?

- Approve PR #61 bootstrap and temporary U1/U2 check change
- Request changes

[Answer]: Approve PR #61 bootstrap and temporary U1/U2 check change
