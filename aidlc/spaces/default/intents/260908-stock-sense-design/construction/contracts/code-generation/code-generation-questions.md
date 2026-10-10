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

The Testing Contract uses test-after ordering and the Standard test
strategy. `unit-test-instructions.md` identifies the 17 unit and nine
integration files in the current U1 scripts, plus three planned integration
suites. The project's classic
scope additionally requires at least 80% U1 line coverage and CI execution
before merge; the rendered contract's no-extra-new-test-floor line does not
waive those obligations. The unit-scoped
command is `pnpm --dir tools/contracts test:unit`.
A partial U1 implementation and test runner exist on
`feat/contracts-governance-foundation`; the approved plan's remaining steps
and acceptance checks are incomplete.
The owner approved the earlier plan and a protected receipt was recorded on
2026-09-29. The current reissued Code Generation directive has a different
approval epoch, so that receipt no longer authorizes further generation.
The prior advisory architecture review was NOT-READY on R-12 through R-17.
Focused source review subsequently found the R-12/R-13 controls READY; R-14
through R-17 and full U1 acceptance remain open. The revised plan adds Steps
10-16 for those findings, and its acceptance
boundary still applies. A fresh approval of this exact plan and test
instructions permits remediation, not a release or full U1 acceptance claim.
On 2026-10-04 a subsequent `Approve Plan` response was durably recorded and
verified for fingerprint `sha256:e190c1748d2c9772e94b5316354cb718aff04798091ed68987a11f6a072e0e7e`.
Implementation then exposed the approved 128-reference limit as too small for
C18's 129 direct references. The owner approved a 1024 package-wide amendment,
with all other bounds intact and a full-catalogue resource test before
acceptance. The plan and test instructions now include that amendment plus
security-review regressions for effective `$id` binding, reference counting,
protected-content variants, generated manifests, and safe finding codes.
The revised plan was approved and its protected receipt verified on 2026-10-05.
The focused R-12 reference-preflight and R-13 protected-output source controls
were independently reviewed as READY; full C01-C27 resource proof and release
publication remain open. Source checkpoint `42746a4` is pushed on
`feat/contracts-governance-foundation`. The present workflow reissued the Code
Generation directive with a new approval epoch, so its earlier receipt does not
authorize the next implementation pass. The implementation plan is unchanged;
the test instructions now inventory the 17 unit and nine integration files in
the current U1 scripts.

## Plan Approval

Approve the revised `code-generation-plan.md` and
`unit-test-instructions.md` for the U1 Contracts remediation and implementation?

[Approval Fingerprint]: sha256:45fd8207801fc0fc12d26c09dc0187f08dc8f7805294c9ef8faf7ba95aedb260

- Approve Plan — proceed to code generation
- Request Changes — revise the plan and instructions

[Answer]: Approve Plan
