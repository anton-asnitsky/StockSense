# U2 provenance probe for proposed PR ledger authority

Status: read-only independent security investigation. No workflow, approval comment, rerun, implementation or policy was changed by this reviewer. This is evidence for a proposed matcher, not authorization to implement a new trust mode.

## Actual GitHub identities

Repository `anton-asnitsky/StockSense` has numeric ID `1361237685`; owner `anton-asnitsky` has numeric ID `8492824`. U2 workflow ID is `386489834`, path `.github/workflows/public-pr-policy.yml`, event `pull_request_target`. The inspected successful check is owned by GitHub Actions app ID `15368`, slug `github-actions`, app owner `github`.

Historical PR74 run `44155484901`, attempt `2`, succeeded with job/check `134306278951` and check suite `119533030256`. Run, job and check `head_sha` all equal `edeec8b54a4ee2d019349befbb005b944dce901d`. The unchanged genuine owner comment `6958509853`, created/updated `2026-11-17T19:25:05Z`, has `User` type and `OWNER` association and exactly approves base `402ace3b195c291a756ed230a24a73199ef8349a` and that old head. The successful log reports those same compared base/head revisions and exact-head owner approval.

## Critical mutable-association trap

Today the historical successful run's `pull_requests[0].head.sha` is `2252d2109d47d3f26c6d6d0a035cea9be96ded81`, the new PR74 head. The check response's nested PR association also has that new head. Equivalent old-success/new-nested-head behavior was observed for PR75 and PR76. These nested PR fields are association data that can advance; they are not immutable proof of what the old successful job tested.

Never accept success plus nested PR head as approval for a new revision. Require the run's top-level `head_sha`, the exact-attempt job's `head_sha`, and the associated check's `head_sha` to equal the frozen current head. Require the expected PR association separately for identity, not as the sole historical revision evidence.

## Source policy differs from compared target base

The successful historical checkout log explicitly uses `8cce4f8040ad0767fca1b1ab14a00bb067a66b76`, the trusted default-main revision. Current PR74 attempt1 logs independently show the same checkout ref, fetch, checkout and final Git SHA. The PR target base being compared is `402ace3b195c291a756ed230a24a73199ef8349a` on `bolt/u1-candidate-ready`.

At default-main `8cce4f8040ad0767fca1b1ab14a00bb067a66b76`, the workflow blob is `6d546c763f783a261d6c708079e1ca84779370eb`; the policy script blob is `2756247041676c61d949354c1d6d22ac139b0a4e`. The workflow checks out `github.sha`; the policy explicitly takes the compared base from `event.pull_request.base.sha` and rechecks live PR head/base. It executes trusted default-main code while comparing the actual target-base tree. Do not describe the Bolt base SHA as the executed policy revision.

The inspected run/attempt API response does not expose a `workflow_sha` or other explicit workflow-source commit field; `referenced_workflows` is empty. Workflow ID/path, app identity and run head alone therefore do not prove the executed workflow source commit. Checkout logs establish the checked-out policy code here, but are not a signed workflow-source attestation. A matcher must preserve this limitation rather than manufacture a source field.

## Latest attempts changed during the probe

The three current runs initially had failed attempt1 jobs. During this read-only probe the coordinator's separate reruns completed successfully. Final observed values:

| PR | Run | Latest attempt | Successful job/check | Top-level run and job head |
|---|---|---|---|---|
| 74 | 45871255797 | 2 | 140166253947 | 2252d2109d47d3f26c6d6d0a035cea9be96ded81 |
| 75 | 45871255352 | 2 | 140166258790 | d592dff7483ee6af2c12d9639c4b23332eaea2a6 |
| 76 | 45871255320 | 2 | 140166243153 | e70f9a78c465468c17a47407b0385e1c9c54c67b |

The old attempt1 job endpoints still correctly report failures. This probe verifies the latest run/job metadata above; the historical successful check supplied the independently inspected Actions app identity. The coordinator owns full current approval and latest check/log reconciliation. U2 success is not U1 success or finding acceptance.

## Concrete matcher requirements and remaining design choice

1. Read current PR identity, open state, same-repository head/base, allowed target ref, frozen base/head and actual U1 merge parents from GitHub; recheck before issuing any receipt.
2. Enumerate the expected workflow's runs with complete bounded pagination. Require exact repository IDs, event, numeric workflow ID and path, exact top-level head, expected PR association, completed success, and latest `run_attempt`.
3. Query `/actions/runs/{id}/attempts/{attempt}/jobs`; require the unique intended U2 job with exact run ID, attempt, head and successful conclusion. Fetch that job's check; require matching check ID/suite, head and successful conclusion plus Actions app ID `15368`. Reject lookalike names, wrong workflow/app, stale attempts, incomplete results and API failures. Re-read run/attempt to reject a rerun race.
4. Establish executed policy provenance independently of the mutable PR association. For the existing workflow, a fail-closed narrowly reviewed log parser can require one exact immutable checkout revision and the successful policy summary's exact base/head, then verify expected workflow/script blobs at that revision. Pin the reviewed trusted source and log grammar; reject missing/ambiguous/truncated logs. Explicitly record that this relies on GitHub's trusted workflow execution and retained logs, not a cryptographic workflow-source attestation. If that assurance is insufficient, a typed provenance producer must first be deployed through a separately authorized protected-source change; the current API fields cannot supply the absent assurance by themselves.
5. Independently revalidate live exact owner U2 and separate ledger-publication statements. A historical successful job cannot make a deleted, edited or revoked comment valid forever. Bind current owner numeric ID/type/association, comment ID/body digest/timestamps, repository/PR/base/head, immutable ledger identity and expiry.

Add regression fixtures for the observed old-success/new-nested-head mismatch, an old failed job under a latest successful run, a newer failed attempt following an earlier success, same-head/different-base runs, default-main source differing from target base, spoofed workflow/check names, wrong app, missing source evidence and PR/run changes during verification.

## API evidence locations

- Historical run: https://github.com/anton-asnitsky/StockSense/actions/runs/44155484901
- Historical successful job: https://github.com/anton-asnitsky/StockSense/actions/runs/44155484901/job/134306278951
- Historical owner comment: https://github.com/anton-asnitsky/StockSense/pull/74#issuecomment-6958509853
- Current U2 runs: https://github.com/anton-asnitsky/StockSense/actions/runs/45871255797 ; https://github.com/anton-asnitsky/StockSense/actions/runs/45871255352 ; https://github.com/anton-asnitsky/StockSense/actions/runs/45871255320

Read-only probe used GitHub REST run/attempt/jobs/check-runs/contents/comment endpoints and retained job logs on 2026-11-26. No implementation tests were run because no implementation was changed. No vulnerability disposition, new authority mode, merge or lifecycle advancement is approved by this report.
