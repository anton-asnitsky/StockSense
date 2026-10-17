# US8.7 hosted workflow probe

This child branch starts at `feat/us8-7-ci-evidence` commit `ea57972`. Its
only change is this note. The child PR targets that branch so the hosted U1
checks execute the proposed workflow and contract tooling with no workflow
change in the child PR's own diff. The parent PR remains blocked by the
protected-base workflow-change policy until the owner approves its concrete
merge sequence.

The probe must show the exact hosted commit and results for `U1 contracts` and
`Vulnerability scan`. It does not substitute for protected-base enforcement,
the main-push attestation, or U1 candidate acceptance.
