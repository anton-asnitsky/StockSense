# US8.7 image evidence hosted probe

This validation-only child branch starts at `feat/us8-7-ci-evidence` commit
`1779dde`. Its PR targets that branch and changes only this note, allowing the
hosted U1 workflow to exercise the proposed image inventory, vulnerability
scan, SBOM, and CI policy without a workflow edit in the child PR's diff.

Record the exact tested merge revision, check results, retained image evidence,
and any scanner failure before crediting R-15. This probe does not approve a
merge or establish U1 candidate READY.
