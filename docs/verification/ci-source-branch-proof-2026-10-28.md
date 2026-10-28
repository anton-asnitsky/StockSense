# CI source-branch probe

This documentation-only change probes a pull request from an ordinary
`chore/*` source branch into `main`. It is disposable and is not a release or
change to CI policy.

Expected PR checks: `U1 contracts`, `Vulnerability scan`, and the independent
protected-base `U2 protected-base PR policy` all pass. `release-evidence` runs
only after a trusted push to `main`, because it writes provenance attestations.
