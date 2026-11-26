# U2 exact-head approvals and reruns — 2026-11-26

All three new owner comments were checked against the live open PR base/head, with exact trimmed body, owner login anton-asnitsky, User type and OWNER association. Base remained 402ace3b195c291a756ed230a24a73199ef8349a. Each verified comment was unedited at inspection.

| PR | Approved head | Owner comment | Run / attempt | Successful job |
|---|---|---|---|---|
| 74 | 2252d2109d47d3f26c6d6d0a035cea9be96ded81 | 7203188575 | 45871255797 / 2 | 140166253947 |
| 75 | d592dff7483ee6af2c12d9639c4b23332eaea2a6 | 7203196017 | 45871255352 / 2 | 140166258790 |
| 76 | e70f9a78c465468c17a47407b0385e1c9c54c67b | 7203202386 | 45871255320 / 2 | 140166243153 |

The coordinator reran each failed U2 job only after comment verification, then confirmed completed/success and exact run.headSha using GitHub run metadata. Independent steward also confirmed all three current PR status rollups show U2 and Vulnerability scan SUCCESS. Earlier attempt1 failures remain historical evidence; they are not erased.

U1 remains failed on runs45871261749,45871261227,45871258618 at protected-main ledger verification. No all-green claim, merge, U1 acceptance, C01 release or gate advancement follows. Subsequent implementation pushes require new exact-head owner comments. These U2 approvals do not authorize vulnerability exceptions or PR-ledger publication.
