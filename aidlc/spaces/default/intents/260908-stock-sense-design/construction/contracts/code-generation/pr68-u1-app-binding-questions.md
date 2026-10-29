# PR #68 U1 required-check app binding disposition

The owner approved bootstrapping [PR #68](https://github.com/anton-asnitsky/StockSense/pull/68) with temporary removal and immediate restoration of the U1 and U2 required checks. It squash-merged as `8cce4f8040ad0767fca1b1ab14a00bb067a66b76`, with the approved head, base and Git tree. After both checks were restored, a live protection read showed all three contexts required. Vulnerability scan and U2 remain bound to GitHub Actions app ID `15368`; required PRs, strict checks, admin enforcement and force-push/deletion blocks retain their original values.

There is one restoration difference: U1 contracts was originally required with `app_id: null`; GitHub associated the restored U1 check with GitHub Actions app ID `15368`. This is more restrictive, but it is not the exact captured configuration. The guarded script reported the mismatch rather than claiming exact restoration. Automatic approval review rejected an attempted correction to `app_id: -1`, because [GitHub documents](https://docs.github.com/en/rest/branches/branch-protection?apiVersion=2022-11-28) that value as explicitly allowing **any app** to set U1; it would be an unapproved persistent security change. The rejected action was not retried or carried out indirectly. No check is currently missing from main protection.

The independent AI-DLC process review recommends accepting the stricter GitHub Actions binding. Choosing the any-app setting would require explicit owner authorization and a fresh automatic approval review, followed by a complete protection read-back. Main-push U1/Vulnerability and release-evidence verification is still running; this question resolves only the source binding. It does not accept U1 or release C01.

## Decision

Which U1 required-check app binding should remain on protected main?

- Accept U1 GitHub Actions app 15368 binding
- Authorize U1 any-app binding app_id -1
- Request changes

[Answer]: Accept U1 GitHub Actions app 15368 binding
