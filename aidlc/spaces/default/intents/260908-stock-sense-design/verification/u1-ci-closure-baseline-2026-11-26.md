# U1 CI closure baseline validation

Status: bounded local baseline complete; integration remains interrupted, isolated C01 CLI check fails, and full coverage was not run. This is not ordinary CI success, U1 acceptance or release evidence.

## Immutable inputs

- Source checkout: `.aidlc/worktrees/u1-ci-closure`, branch `codex/u1-ci-closure`, starting commit `e70f9a78c465468c17a47407b0385e1c9c54c67b`.
- Approved normative plan SHA256: `97d65b6e528e12b132baadcd735cd5a165cbc463fbdd548fdc31f322cb1a45fa`; coordinator reported successful native protected-receipt verification before dispatch. This reviewer did not create or approve a receipt.
- Windows Node24.22.3 executable: `.local-data/node24223-verification/node-v24.22.3-win-x64/node.exe`, independently measured SHA256 `86fc4785327db5f5c7558dc6156c543b433c313e813a222e088086222ab4afa6`.
- pnpm11.25.0 entry: `C:/Users/anton/AppData/Local/node/corepack/v1/pnpm/11.25.0/bin/pnpm.cjs`, invoked through that Node executable. Verified version11.25.0.
- Existing validator image: `sha256:059e78e561ba9b7d2c7b73f81132573d255ca6eb4786e0df75e7de2e68a4efca`.
- Existing Kiota image: `sha256:89c9a4c01ac38da422858d0e504ce1bd6c4ac221cbfafa40c80c8aade1ce7453`.
- Independently computed sourceTreeDigest: `sha256:323aa96201e2473cf42423418a40e7ad53e2a869c57f02c63c4f90c48d83f0d8`, matching the retained validator build evidence.

## Commands and results

All package commands used the pinned Node/pnpm above, with the verified Node directory first on PATH. Container-backed tests set STOCKSENSE_STANDARDS_IMAGE and STOCKSENSE_KIOTA_IMAGE to the immutable IDs above.

| Command | Result |
|---|---|
| `pnpm --dir tools/contracts install --offline --frozen-lockfile` | Exit0;433 cached packages reused,0 downloaded; lockfile unchanged |
| `pnpm --dir tools/contracts lint` | Exit0 |
| `pnpm --dir tools/contracts type-check` | Exit0 |
| `pnpm --dir tools/contracts test:unit` | Exit0;349 registered,347 passed,0 failed,2 existing Windows symlink-privilege skips,0 TODO |
| `pnpm --dir tools/contracts test:integration` | Interrupted; partial failures retained, no completed-suite pass claimed |
| `pnpm --dir tools/contracts test:coverage` | Queued but deliberately prevented from starting during overlapping validator scan; no coverage claim |

The two existing skips are `symlinked graph member is refused` and `symlink inside package is rejected even when listed`. Linux hosted execution remains necessary to exercise them; no test, skip condition or coverage target was edited.

The initial integration run started without the clean checkout's `.tools/oasdiff/1.28.0/win32-x64/oasdiff.exe`. Compatibility cases failed; this setup omission was discovered and the existing `node --use-system-ca tools/contracts/scripts/setup-oasdiff.mjs` succeeded with its pinned official archive checksum and version check. The copied binary SHA256 is `35eedc4028380ce538583a09e015c4289da17d7898867a17364a6d940245e7fe`. This setup completed during the initial integration run, so that run is explicitly not a uniform ready-environment baseline and cannot be credited as successful.

The `source-bound C01-C27 catalogue validates through the CLI` case also failed after190648ms. Its existing subprocess timeout is180000ms. Exact failure diagnosis and an isolated reproduction remain pending; elapsed time alone does not prove resource contention or excuse the failure.

At the coordinator's direction, only the verified baseline PowerShell49132 process tree was stopped to avoid starting final coverage alongside a slow image scan. Its command line and descendant parent IDs were checked before stopping; no Docker client was in that stopped tree. Partial logs remain intact. The final integration process result is interrupted/exit-1, not a completed test verdict.

## Retained evidence and boundaries

Local logs: `.local-data/u1-ci-closure-baseline/lint.log`, `type-check.log`, `unit.log`, `integration.log`, `oasdiff-setup.log`. No coverage log existed at interruption.

Post-run tracked diff was empty. Existing/untracked hook output `tools/contracts/aidlc/` was preserved. Package JSON SHA256 `fc7fa9a0d065a32df0c14e71e71c5850c05ab8297605603e35f5f5970d26474b`; lockfile SHA256 `0ffbf449057f4446a69b9c481294c7ca21a53cadf08d25e762a3c910df25730a`.

No source, dependencies, lockfiles, test limits, required checks, owner comments, PRs or lifecycle state were changed. No current hosted CI result is inferred from these local checks. The coordinator subsequently stopped broader implementation at the approved runtime decision boundary and requested only the isolated C01 diagnostic below; full coverage was therefore not launched.

## Corrected native compatibility check

After the checksum-verified oasdiff setup, ran the focused non-Docker command under the same pinned Node from `tools/contracts`:

```text
node --test --test-concurrency=1 test/integration/baseline-compatibility.test.mjs test/integration/compatibility.tool.test.mjs
```

Result: exit0,15 tests passed,0 failures/skips/TODO,184247.6ms. This covers all previously failing immutable-baseline compatibility cases and the pinned differ success/removal/refusal cases without source changes. Evidence: `.local-data/u1-ci-closure-baseline/compatibility-corrected.log`. The initial setup failure remains recorded above; this corrected focused result does not complete the interrupted integration suite or establish C01/coverage success.

## Isolated C01 diagnostic — 2026-11-27 local date

After the validator agent confirmed its scan had completed and Docker was available, ran the original C01–C27 test alone with the same immutable image IDs, verified Node24.22.3, installed pinned differ and unchanged test source:

```text
node --test --test-concurrency=1 --test-name-pattern '^source-bound C01-C27 catalogue validates through the CLI$' test/integration/cli.catalogue.test.mjs
```

Result: exit1,1 selected test failed,0 passed/skipped/TODO. Case185304.9ms; total185940.1ms. The exact error is `AssertionError [ERR_ASSERTION]: ifError got unwanted exception: spawnSync .../node.exe ETIMEDOUT`, at `test/integration/cli.catalogue.test.mjs:22`, where the existing child-process timeout is180000ms. Full log: `.local-data/u1-ci-closure-baseline/c01-isolated.log`.

The timeout reproduces after the overlapping validator scan completed; contention from that scan is not established as the cause. This is a remaining local baseline failure requiring investigation before claiming complete local validation. No timeout, test, image binding or policy was weakened. Historical hosted passes are separate evidence and do not turn this local failure into a pass. Full coverage was deliberately not started because no source remediation was accepted and the approved runtime plan reached its stop condition.

## Comparison with retained hosted proof

Git independently resolves tested commit e70f9a78c465468c17a47407b0385e1c9c54c67b and retained hosted proof candidate 59c34bae1e031c0db032f99f2ea1d12f67715e76 to the same tree ab873f9e837e10df24580fa249a6e8d35272937c. Equality: True. The tracked checkout diff remained empty after local validation. This rules out a tracked source-tree difference between these baselines; it does not establish the cause of the local timeout. Hosted run45868206325 remains historical Linux evidence only, not a fresh pass for this local execution or changed runtime candidates.
