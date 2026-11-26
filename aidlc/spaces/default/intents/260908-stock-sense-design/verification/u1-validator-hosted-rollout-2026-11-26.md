# U1 validator repair hosted proof and working-branch rollout

Protected approval: sha256:499b02fc9448292b8f1691ccc6918f6b8626fa18be3abb490a0d38784813674d. Receipt verified before implementation; see u1-validator-plan-approval-2026-11-26.md. Reviewed production repair 59c34bae1e031c0db032f99f2ea1d12f67715e76 builds on reviewed ledger/SBOM 3fef097f5a7f87885d6453dfd3017ec23751a1b1. No protected-main or ledger-authority policy change was made.

## Two independent hosted proofs

Run https://github.com/anton-asnitsky/StockSense/actions/runs/45868206325 completed SUCCESS in both lanes, using diagnostic commit d454f2c161b948fd95ce6e5453cd120311999a8d with both immutable candidate pins set to production 59c34bae1e031c0db032f99f2ea1d12f67715e76.

| Lane | Job | Proof artifact | Verified ZIP SHA256 |
|---|---|---|---|
| 1 | 140076484573 | 15141907394 | 313cba31aefa5d7dc6e4d827f8774e4a56385b909ca9adae371869a3a3a98319 |
| 2 | 140076484162 | 15141503314 | 4c344ce6fcce8ffc2aea3661e5ae058193cb4bd027fe5b99bfff1d107dba07f8 |

The coordinator verified downloaded ZIP bytes against GitHub metadata. Independent security review also verified both ZIPs and all 79 extracted files per lane, then used the production helpers to verify source/image/SBOM/raw/database/normalized bindings. See u1-validator-fresh-scan-review-2026-11-26.md. Retained artifacts are under .local-data/u1-validator-45868206325/ locally; the GitHub artifacts provide retained hosted evidence.

Both lanes passed lint, type checks,466 registered tests (465 passed,0 failed,0 skipped,1 existing release-only TODO), and 92.00% line coverage against the unchanged 80% floor. C01-C27 validation covered 27 boundaries, 40 canonical documents and 355 fixtures, with releaseReady:false. All three current PR baselines reproduced 107 consumer outputs twice, without any output or lockfile changes; actual generated C# consumers compiled and passed the request/response fixture. The consumer baselines were the pre-rollout heads listed in the prior CI recheck, not obsolete earlier PR revisions.

The first diagnostic attempt 45866784501 failed because its consumer helper still expected PR74's historical Kiota 1.35-to-1.38 lock change. The current baseline already used 1.38 and had zero output differences. A separately reviewed proof-only correction now requires original Kiota 1.38 and zero differences for every current baseline. Production 59c34 was unchanged. Both corrected lanes passed; the earlier failed run is not presented as success.

## Security result and limitations

Both normal production scans contain Node 24.22.3 and no old 24.22.2 binary findings: all 15 previous Node findings, including seven fixed High findings, are absent. Both retain exactly 39 current image findings: five validator glibc (three Medium/two Low; unknown fix state) and 34 Kiota (32 Medium/one Low/one Negligible). There are zero High/Critical rows. All 39 identities match the actual bound SBOMs. Current npm/secret checks pass without an exception.

Kiota's normalized runtime remains sha256:1c7fc5fd4df187a3571460bf807e860f1be6bfd704c3fd9fe037c641adea5340. Its current 34 rows contain all 14 historical identities plus 20 additional scanner matches; the runtime was not changed. Scanner not-fixed does not establish vendor applicability: several vendor statuses remain Needs evaluation. No finding has been dispositioned by this repair.

The diagnostic proof verifies that unknown findings are rejected. Its explicit result is ordinaryU1Passed:false, ownerApproval:false, protectedReceipt:false and positiveLedgerSbomProofCompleted:false. Diagnostic success is not ordinary U1 success or security acceptance. Main's expired, incompatible ledger remains a separate publication blocker. NFR13.2/NFR13.5/NFR15.2 and R-15/R-16 remain open.

## Tested branch rollout

Before rollout, each current PR/base/head was checked in GitHub and every actual working branch was checked for tracked changes. Existing untracked aidlc/proof artifacts were preserved. PR74/PR75 isolated branch tests each passed 61 tests, lint and type checks under verified Node 24.22.3; see u1-validator-branch-validation-2026-11-26.md. All cherry-picks were conflict-free. Actual post-cherry-pick trees were checked against the tested trees before an atomic, non-force push of the three working branches.

| PR | Published head | Tested tree | Ordinary contracts run | U2 run |
|---|---|---|---|---|
| 74 | 2252d2109d47d3f26c6d6d0a035cea9be96ded81 | ab873f9e837e10df24580fa249a6e8d35272937c | 45871261749 | 45871255797 |
| 75 | d592dff7483ee6af2c12d9639c4b23332eaea2a6 | 632d12d33b689eccaf6f36e7c282d9abb8311634 | 45871261227 | 45871255352 |
| 76 | e70f9a78c465468c17a47407b0385e1c9c54c67b | ab873f9e837e10df24580fa249a6e8d35272937c | 45871258618 | 45871255320 |

All target bolt/u1-candidate-ready at 402ace3b195c291a756ed230a24a73199ef8349a. PR74/PR76 equal the complete hosted candidate tree. PR75 retains its reviewed preexisting story/local-CA differences. No PR was merged; U1 acceptance, C01 release and the next gate remain on hold.

## Ordinary CI status

All three fresh Vulnerability scan jobs passed. All three U1 jobs completed FAILURE after successful image build/inventory/scan, at `Verify current findings against protected main ledger`, with the exact error: `Image ledger refused: ledger row is malformed, names an unknown image or belongs to a different candidate tree or execution baseline`. No production verifier was weakened to bypass that failure.

| PR | U1 failed job | Vulnerability passed job | Retained image artifact | Test-merge source | Verified ZIP SHA256 |
|---|---|---|---|---|---|
| 74 | 140086969525 | 140086968999 | 15142653961 | 3ec87945e6f537b2d4b5a0c79b08e4cc7fcfc39e | 9ed64994f6188ec45931d362b790189873882fe635317a664c6bda0ba4dd6350 |
| 75 | 140086967756 | 140086967997 | 15143695081 | 3da4f6e640b672ae6ad2d8d81235e2da7b79267a | c752f1bae40f40620b90675a678fb3bd79afffd8157ce9a082395dacdb8875e0 |
| 76 | 140086958825 | 140086958218 | 15143705153 | 661e7d5071e2162d25ec0f3c87891cc4ec6eb96a | 333f8e97f067c89a038a46f58e276cc0ab0f53a89017ac8887d81d3a7ac68729 |

All three U2 jobs also failed specifically for missing exact-head owner approval: jobs 140086952893, 140086951184 and 140086950734 respectively. The owner's previous comments authorize older heads, not these revisions. No matching new owner comments were present at the recheck. Exact new lines are in u1-validator-u2-approval-lines-2026-11-26.md and were requested through the owner question; none was fabricated or posted by the coordinator.

CI is not green. The validator repair is implemented and independently tested, but current protected-main publication, current finding dispositions and refreshed owner U2 approvals remain blocking. The next gate stays on hold; all merges remain with the owner.
