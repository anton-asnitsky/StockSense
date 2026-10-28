# U1 source inventory after PR #51

PR #51 merged at `7ff4c4c41d24146f25c4cc2dd3ef1074063e2408`; its Git tree
`61794b716eadc7484067d29a4e726a5789e991af` matches the tested PR head
`d4aa5a6ddc13cce94f1077288971cf05a104511c`. Hosted U1 run
`40685726261`, attempt 2, concluded success for that head. PR #56's
digest-specific image exception is on protected `main` at
`36c54749790c6288553018e15989beca7418f5f9`.

`construction/contracts/code-generation/source-manifest.json` inventories
186 unique paths in the merged Bolt Git object. All 186 paths exist there; the
five new candidate-evidence source and test paths came from PR #51. It is **not**
an inventory of this AI-DLC checkout: the five new paths are absent here and
these seven declared paths have different bytes:

- `.github/workflows/release-evidence.yml`
- `contracts/README.md`
- `security/image-exceptions.json`
- `tools/contracts/package.json`
- `tools/contracts/src/diagnostics.mjs`
- `tools/contracts/test/integration/cli.catalogue.test.mjs`
- `tools/contracts/test/unit/diagnostics.test.mjs`

The updated traceability has 95 unique IDs: 50 `OK` and 45 `GAP`. The outcome
counts were not changed by this reconciliation. The new Bolt candidate still
needs a matching source checkout, source-bound independent review, and a trusted
main attestation. R-14–R-16, U1 candidate acceptance, and C01 release remain
open. This record does not advance the AI-DLC stage or approve a merge.
