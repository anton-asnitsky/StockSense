# PR authority verifier fixtures

These files are test data, not current owner approval or executable policy.

`trusted-workflow.yml` and `trusted-policy.mjs.txt` retain exact immutable Git blob
bytes from `anton-asnitsky/StockSense` commit
`8cce4f8040ad0767fca1b1ab14a00bb067a66b76`, respectively:

- `.github/workflows/public-pr-policy.yml`: `6d546c763f783a261d6c708079e1ca84779370eb`
- `.github/scripts/public-pr-policy.mjs`: `2756247041676c61d949354c1d6d22ac139b0a4e`

`u2-job.log` is the retained GitHub job log for job `140166253947`, run
`45871255797`, attempt 2, fetched on 2026-11-27. The log has GitHub-masked token
values. Tests substitute its historical compared head with an explicit synthetic
head. The source revision stays pinned. Neither the fixture nor successful log
parsing supplies live authorization; production independently verifies current
repository, PR, comments, workflow, run, attempt, job, check and immutable blobs.

Do not execute the policy fixture or install the workflow fixture.
The raw log retains timestamp-only lines ending in a space; Git's whitespace
checker reports those authentic log bytes. They are intentionally preserved.

The same read-only probe observed this GitHub pagination form (requested with
`per_page=1` to expose a continuation):
`<https://api.github.com/repositories/1361237685/issues/74/comments?per_page=1&page=2>; rel="next"`.
The parser accepts only this pinned numeric repository path or its equivalent
named-repository path, with the requested page size and exact next-page number.

`scenario.mjs` supplies synthetic API identities and comments for unit/integration
tests. Its only import-time I/O reads these immutable local fixtures. It never
executes the historical policy or contacts GitHub.
