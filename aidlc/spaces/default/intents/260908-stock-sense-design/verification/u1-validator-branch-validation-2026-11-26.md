# U1 validator repair: isolated story branch validation

Date: 2026-11-26. Scope: local integration checks only. Protected repair plan fingerprint: `sha256:499b02fc9448292b8f1691ccc6918f6b8626fa18be3abb490a0d38784813674d`; coordinator verified the receipt before dispatch. No actual PR branch was changed or published by this validation, and no merge occurred.

## Exact candidates

Reviewed repair commit: `59c34bae1e031c0db032f99f2ea1d12f67715e76`, tree `ab873f9e837e10df24580fa249a6e8d35272937c`.

| Check branch | Prior local head | Resulting local head | Resulting tree |
|---|---|---|---|
| `codex/u1-ledger-pr74-check` | `8c1e343677c9b7d5537c394cdd6a84af0d7e8394` | `e99794874795934c2ff52498703e4eb7e23dd5ee` | `ab873f9e837e10df24580fa249a6e8d35272937c` |
| `codex/u1-ledger-pr75-check` | `1bd8e2aca14ea060da6c097575091fb3836d2037` | `1a06efae6666e32376b05e2af4237d404eb5e7e9` | `632d12d33b689eccaf6f36e7c282d9abb8311634` |

Both worktrees had no tracked changes before the cherry-pick and have no tracked changes afterward. Their existing untracked `tools/contracts/aidlc/` directories were preserved. The repair cherry-picked without conflict; PR75 automatically merged three files without manual edits. No dependency install or lockfile update was performed.

## Source identity and retained story differences

Compared Git blob IDs for all eleven paths changed by the reviewed repair. All eleven match on PR74; its complete resulting tree also equals the reviewed candidate tree. PR75 has eight identical repaired-file blobs and three preexisting story differences:

| PR75 path | Reviewed blob | PR75 blob | Preserved difference |
|---|---|---|---|
| `.github/workflows/contracts-required.yml` | `71ec88296a91da46939e11ca2942f50894bf38da` | `dfd05b6dde85bcbd3611d9ec8e1aa356a9d98d94` | US8.7 branch does not contain US8.2's integration-baseline compatibility step and artifact upload. |
| `tools/contracts/Dockerfile.validator` | `435e875296b9b370fa8371584640e7f18645f40b` | `a55c422f6ce327779af69eabda5989f9b09b0569` | No optional local npm HTTPS inspection CA secret mount; Node binary pin and verification changes match. |
| `tools/contracts/scripts/build-standards-image.mjs` | `61e2eb617c1613b23e7e4e2481e942f3641c1847` | `76a249055fcb3cc506ea341bd6945d3c562124fd` | No optional `STOCKSENSE_BUILD_CA_FILE` Docker secret argument; runtime verification matches. |

The same three differences existed between the prior PR75 check head and the repair's parent `3fef097f5a7f87885d6453dfd3017ec23751a1b1`. PR75 also retains its preexisting canonical-contract, fixture and compatibility implementation differences from the combined candidate; this cherry-pick does not absorb the other story. The eight identical repaired paths are release-evidence workflow, package.json, ci-policy.mjs, image-evidence.mjs, sbom.mjs, the two new image-evidence fixtures, and image-evidence.test.mjs.

## Checks

Both checktrees used the verified runtime at `D:/Git/StockSense/.local-data/node24223-verification/node-v24.22.3-win-x64/node.exe`, which reported `v24.22.3`; that directory was prepended to PATH for child processes. Existing dependencies were reused.

From each checktree's `tools/contracts` directory:

```text
node --test --test-concurrency=1 test/unit/image-evidence.test.mjs test/unit/image-ledger.test.mjs test/unit/sbom.test.mjs test/unit/ci-policy.test.mjs test/integration/sbom-context.test.mjs
node node_modules/eslint/bin/eslint.js .
node node_modules/typescript/bin/tsc --noEmit
```

| Candidate | Tests | Lint exit | Type-check exit |
|---|---|---|---|
| PR74 check `e997948` | 61 passed, 0 failed, 0 skipped, 0 TODO | 0 | 0 |
| PR75 check `1a06efa` | 61 passed, 0 failed, 0 skipped, 0 TODO | 0 | 0 |

The tests include real isolated-Git SBOM production entrypoints, v1/v2 binding and ledger regressions, exact binary inventory checks, all twenty historical raw rows, fixed High rejection, and unknown-disposition rejection. Logs remain in each checktree at `tools/contracts/dist/validator-branch-tests.log`:

- PR74 log SHA256: `1f8db21aec117d1e0f7831555b2cf0da0a2f43dced8709e47df84fbc0a939595`.
- PR75 log SHA256: `84f2017ad3a89f512ade9377b019897d4e8bfd510b5d0f2c45cad0c442c8868b`.

These are local targeted integration checks, not complete hosted candidate acceptance. Actual PR publication remains coordinator-owned and conditional on the reviewed hosted proof, including run `45866784501`. This report does not assert that run passed, that ordinary U1 is green, or that unresolved image findings or protected-main ledger publication are cleared. Fresh actual-head CI and genuine U2 owner approvals are still required after any rollout. No U1 acceptance, C01 release, next-gate advancement, finding exception or merge is authorized by this report.
