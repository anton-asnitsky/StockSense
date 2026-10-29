# U1 reusable image-exception scope decision

The [ordinary PR proof](../../../verification/ordinary-pr-ci-smoke-2026-10-29.md) demonstrates that U1 fails on a docs-only change because the one approved Kiota MessagePack exception is tied to a prior complete candidate tree. The [proposed correction](../../../verification/u1-reusable-image-exception-proposal-2026-10-29.md) binds a single temporary finding-specific exception to protected Kiota execution inputs and controls. A complete-path guard would reject added unreviewed build or scan inputs; a canonical final-runtime file/configuration baseline would reject extra executable content. Two hosted builds must match that baseline before reuse is enabled. Every PR would still scan its exact built image; new or changed findings would fail. The current exact-tree approval does not authorize this broader scope. Kiota 1.36.1 still bundles the affected MessagePack 2.5.302.

The residual risk is denial of service if an unidentified route reaches the vulnerable MessagePack deserializer. The reusable rule would cover future validated OpenAPI input changes under unchanged execution controls; it expires no later than 2026-11-25 and requires a new assessment if the tool package, invocation, input handling, scanner, workflow, or container controls change. This decision would approve the **design scope only**. The protected ledger change, implementation plan renewal, PR merge, any temporary branch-protection change, U1 acceptance and C01 release remain separate decisions.

## Decision

May U1 use this narrowly bound, reusable Kiota finding exception so ordinary PRs can pass CI without a fresh whole-tree exception each time?

- Approve reusable Kiota exception design
- Request changes

[Answer]: Approve reusable Kiota exception design
