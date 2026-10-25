# U1 Kiota MessagePack exception evidence

This record supports one temporary row in the protected-main image-exception ledger. It is not U1 acceptance, C01 release, or approval to change branch protection or merge a pull request.

The owner approved the exact finding and controls on 2026-10-25. The AI-DLC audit at `aidlc/spaces/default/intents/260908-stock-sense-design/audit/anton-pc-e91d12f789b9.md` records the question as `DECISION_RECORDED` at 13:22:56Z, the owner's `HUMAN_TURN` at 15:01:14Z, and `QUESTION_ANSWERED` at 15:01:33Z: “Approve this exact temporary exception (Recommended).” The answer did not authorize a merge or protection change.

| Evidence | Exact value |
| --- | --- |
| Story | Draft [PR #24](https://github.com/anton-asnitsky/StockSense/pull/24), head `3c7d02eec2b2cae1b602f6c3581d1f615a857413` |
| Hosted scan | [Run 40196387113](https://github.com/anton-asnitsky/StockSense/actions/runs/40196387113), merge revision `20e9e0cca99b8f9bd416652dc14484dfabf846fa`, Git tree `bdb03da60c5e07a8b02c17cfc0e755e98fca5dc4` |
| Candidate tree digest | `sha256:fb0212af3ec27ca3fd05909b4285b47060a8b7ed24af368bdbd8c11c43eaa496`, computed from the complete Git tree excluding the ledger blob, using U1's own `candidateTreeDigestFromGit` |
| Validator image | `sha256:fd9ce904345628006dac99b64c4b012511084d4abf815980ebb02ed60ca6f1a1`, zero findings |
| Kiota image | `sha256:9d53713cbf0eb6b2c0d0d1f1a02760432ad93ca6302f44104f5a2f2ccec1d7be`, one finding |
| Finding | Medium `GHSA-qhrr-8q5h-9q3h`, `MessagePack` 2.5.302, `pkg:nuget/MessagePack@2.5.302`, fixed in 2.5.303 |
| Scanner database | Grype v6.1.10, built 2026-10-25T06:27:34Z |
| Expiry | 2026-11-25T00:00:00Z |

Kiota 1.35.0 includes affected MessagePack. Its [`generate` command](https://github.com/microsoft/kiota/blob/v1.35.0/src/kiota/Handlers/KiotaGenerateCommandHandler.cs) is separate from the [`rpc` handler](https://github.com/microsoft/kiota/blob/v1.35.0/src/kiota/Handlers/KiotaRpcCommandHandler.cs) that attaches StreamJsonRpc. StockSense invokes fixed `generate` arguments. No path from that invocation to the advisory's untrusted MessagePack `object` deserializer was identified. This is a bounded reachability assessment; the vulnerable package is still present. Kiota 1.36.1 still depends on MessagePack 2.5.302, so a simple tool version update does not resolve the scan finding.

The story build verifies Kiota's 1.35.0 NuGet archive against SHA-256 `5e75f6adf161717be8d9f39eb596f93d52535e7b8cbcc00cffdcef3d0d3c3486`. The generator runs without network access, with a read-only filesystem and non-root user, 2 GiB memory cap and 120-second timeout. The image scan and exception are tied to the exact candidate tree. The row expires automatically; reassess and remove it sooner if the tool, invocation, or upstream dependency changes.

The ledger verifier was run locally against the retained hosted scans: validator 0 findings/0 dispositions, Kiota 1 finding/1 disposition. Hosted CI must rerun after this row reaches protected `main`; it currently reads the empty protected-main ledger and therefore correctly fails the image gate. U1's other review findings and acceptance remain separate.
