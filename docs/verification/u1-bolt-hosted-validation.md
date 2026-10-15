# U1 Bolt hosted validation trigger

This documentation-only child PR targets `bolt/u1-contracts-trust` at
`81a78563ad59eba3ede9621f8e2a9f24a9ae6025`. Its purpose is to run the
combined U1 source through the hosted `U1 contracts` and
`Vulnerability scan` jobs without proposing a change to `.github/`.

The Bolt PR to `main` intentionally changes workflows, so the current
pull-request policy refuses it before the integration and coverage steps.
A green child run is evidence for this Bolt source revision, not a release,
package attestation, protected-base guard activation, or merge approval.
