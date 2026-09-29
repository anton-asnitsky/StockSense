# U1 Contracts Code Generation Plan Approval

The plan covers a focused shared-prerequisite branch, a runnable U1 test
runner, C01 package loading, untrusted-input and protected-content controls,
standards-based validation, C01-C27 contract fixtures, compatibility,
consumer-local generation, release evidence, and traceability. U1 implements
the protected-content gate identified as NFR Design R-02. The independent
public-PR trust anchor identified as R-01 remains a joint U2 CI/branch-policy
dependency and blocks any release-isolation claim until verified.

Required CI toolchain pins and checks must be verified before any implementation
acceptance claim. Until then, local results are partial development evidence only.

The approved Testing Contract uses test-after ordering and the Standard test
strategy. `unit-test-instructions.md` names seven component suites with five to
eight substantive tests each, plus U1 integration tests. The project's classic
scope additionally requires at least 80% U1 line coverage and CI execution
before merge; the rendered contract's no-extra-new-test-floor line does not
waive those obligations. The unit-scoped
command is `pnpm --dir tools/contracts test:unit` after the runner is created.
No generated application code or test runner has been written yet.
The owner selected Approve Plan in this chat, but the protected AI-DLC approval
receipt was refused because the response was not matched to the offered choice
for the active prompt and session. Generation remains pending a fresh valid
approval challenge and response.

## Plan Approval

Approve the exact `code-generation-plan.md` and
`unit-test-instructions.md` for the U1 Contracts implementation?

[Approval Fingerprint]: sha256:89e28321470ba15b0d4eddbdbc42ca6d9fb0dd471ec48564e23e531649250c88

- Approve Plan — proceed to code generation
- Request Changes — revise the plan and instructions

[Answer]: Approve Plan
