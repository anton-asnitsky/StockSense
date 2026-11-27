# Compatibility approvals

The required U1 check compares each PR with the exact commit of its target
branch. A `main` push compares with the preceding `main` commit. Changed
AsyncAPI and JSON Schema documents require a predecessor-bound approval and
overlap period; changed OpenAPI documents use the pinned differ.

The check reads `approvals.json` from the **integration base commit**, never
from the proposed PR. An approval therefore has to land on that branch through
its own owner-approved PR before a dependent contract change can pass. The
record is a JSON object keyed by the canonical logical ID. Each value names
`predecessorRevisionId`, `approvedBy`, and `overlapUntil`; approved renames also
name `predecessorLogicalId`. The CLI validates these fields against the exact
baseline and refuses missing or mismatched approvals.

The current file is empty because no changed non-OpenAPI revision has an
approved predecessor in this integration base. A first release needs no
approval, and an unchanged document is reported as unchanged. Release-tag
comparison is a later release gate; this PR check does not claim it.
