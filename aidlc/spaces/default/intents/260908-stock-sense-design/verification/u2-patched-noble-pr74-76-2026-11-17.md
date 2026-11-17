# U2 approval verification after the patched Noble rollout

All three U2 protected-base PR policy jobs passed on attempt 2. Rechecked against the live PR heads on 2026-11-17; every job head matches the current PR head. Shared approved base: `402ace3b195c291a756ed230a24a73199ef8349a`.

| PR | Approved current head | Owner comment | Passing job |
| --- | --- | --- | --- |
| #74 | edeec8b54a4ee2d019349befbb005b944dce901d | [6958509853](https://github.com/anton-asnitsky/StockSense/pull/74#issuecomment-6958509853) | [134306278951](https://github.com/anton-asnitsky/StockSense/actions/runs/44155484901/job/134306278951) |
| #75 | bd0241d3313a998039cce4a37059d188e502fda2 | [6958522181](https://github.com/anton-asnitsky/StockSense/pull/75#issuecomment-6958522181) | [134306284968](https://github.com/anton-asnitsky/StockSense/actions/runs/44155490435/job/134306284968) |
| #76 | 0f5db4d25cc9364f825eb752dad05c037c7b9944 | [6958530359](https://github.com/anton-asnitsky/StockSense/pull/76#issuecomment-6958530359) | [134306294528](https://github.com/anton-asnitsky/StockSense/actions/runs/44155501472/job/134306294528) |

Jobs completed at 19:27:09Z, 19:27:09Z and 19:27:12Z respectively. Owner comments were verified against exact base/head and owner identity before the reruns. These checks authorize only their recorded revisions. A later protected source change needs a new matching owner comment.

U1 remains red at protected-main ledger verification; the separate dependency scan remains blocked by the High picomatch advisory. U2 success does not close NFR13.2, NFR13.5, NFR15.2, R-15 or R-16. No merge, U1 acceptance or C01 release occurred. Earlier U2 results in u2-pr74-76-2026-11-17.md remain historical.
