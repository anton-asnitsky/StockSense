# US8.7 image evidence hosted probe

This validation-only child branch starts at `feat/us8-7-ci-evidence` commit
`1779dde`. Its PR now targets that branch at `a0615ed`, after the scanner-user
permission, Grype status-schema, and image-remediation changes, and changes only this note, allowing the
hosted U1 workflow to exercise the proposed image inventory, vulnerability
scan, SBOM, and CI policy without a workflow edit in the child PR's diff.

Record the exact tested merge revision, check results, retained image evidence,
and any scanner failure before crediting R-15. This probe does not approve a
merge or establish U1 candidate READY.

On 2026-10-24 the draft PR base was refreshed to parent commit `a0615ed`,
which removes build-only vulnerable packages and retains Grype fix state. This
note-only child update requests a new hosted run against that exact parent.
Treat the October 17 result as historical; retain the new scan report even if
the image-finding gate correctly remains red.
