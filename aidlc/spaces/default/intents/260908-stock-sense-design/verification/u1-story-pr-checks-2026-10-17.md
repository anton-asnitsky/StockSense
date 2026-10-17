# U1 story PR checks — 2026-10-17

This is evidence for two separate U1 candidate story branches. It is not U1 acceptance, a merged Bolt, or a C01 release receipt. Both PRs target `bolt/u1-candidate-ready`, created from protected `main` commit `581b70a1020e5ae36d631625a41392fddf30dbfb`, and remain drafts.

| Story | Head | Hosted run | Required checks | Line coverage |
| --- | --- | --- | --- | --- |
| [US8.2 inventory import contracts, PR #22](https://github.com/anton-asnitsky/StockSense/pull/22) | `7656f288b786060485b10a67e5773a617a8827c6` | [39019069959](https://github.com/anton-asnitsky/StockSense/actions/runs/39019069959) | U1 contracts **success**; Vulnerability scan **success** | 95.12% |
| [US10.2 candidate provenance, PR #23](https://github.com/anton-asnitsky/StockSense/pull/23) | `c4ef2863060fb632eb8bd206f4f587f0ea55f817` | [39018640548](https://github.com/anton-asnitsky/StockSense/actions/runs/39018640548) | U1 contracts **success**; Vulnerability scan **success** | 93.84% |

The GitHub run records show lint, type checking, secret scan, pinned standards/Kiota image builds, unit tests, integration tests, and the 80% coverage step succeeded in each U1 job. The separate vulnerability jobs succeeded. This statement is tied to the exact PR heads above; it does not establish a combined branch or later head. The hosted workflow checks test the PR merge revision and do not execute the push-only `release-evidence.yml` workflow.

Local US8.2 validation: 255 unit passes and two Windows symlink-privilege skips; complete package 6/6; immutable-baseline compatibility 5/5; resource suite 7 passes, one local image-ID skip and one existing TODO; lint and type checking pass. The first-release C15/C23 source additions yield 40 canonical files and 16 AsyncAPI message targets. Local US10.2 validation: 18/18 focused bundle/clean-consumer tests; 255 unit passes and two Windows skips; lint and type checking pass. Its broader local integration run had 85 passes, nine failures from missing exact Docker image IDs or oasdiff, five skips and two TODOs. After installing hash-pinned oasdiff 1.28.0, the three compatibility tests passed. The local validator image build could not fetch pnpm within Docker because the container did not trust the network TLS chain; hosted image-backed checks passed on the PR head.

R-14 and R-16 still need a combined exact-source review and any remaining owner-specific evidence disposition. R-15's full dependency inventory, retained scan finding disposition, and candidate binding remain open. The complete C01 release manifest, release attestation and downstream runtime proof remain a separate gate; `releaseReady` stays false. No story PR or Bolt was merged by this record.
