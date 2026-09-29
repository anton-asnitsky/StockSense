# StockSense contract sources

`source/common/v1/` holds the approved C01 tenant-message and retailerless
identity-audit envelope schemas. These are canonical source documents for the
contract package. Their `additionalProperties: false` boundaries keep tenant
and global messages separate.

`samples/walking-skeleton/` is an **illustrative candidate fixture**, not a
release artifact. It covers only C01, and its all-zero `sourceRevision` is an
explicit placeholder. The current governance CLI checks its path inventory,
digests, budgets, reference preflight, protected-content rules and the canonical
documents actually present. The sample exercises JSON Schema validation, but
not an OpenAPI or AsyncAPI document. It does not yet reconstruct files from a
Git revision or prove complete standards,
compatibility, generation, scan, attestation or provider conformance evidence.
The CLI reports `validationLevel: candidate-canonical-validation` and
`releaseReady: false`.
Never publish or consume this sample as a release package.

After editing a canonical C01 source, run
`node tools/contracts/scripts/create-sample.mjs` from the repository root to
refresh its illustrative copy and digests. The script deliberately retains the
all-zero fixture revision; it does not assert Git provenance.

From the repository root, run `pnpm --dir tools/contracts test:unit` and
`pnpm --dir tools/contracts test:integration`. The integration suite also
validates both envelope profiles with JSON Schema 2020-12 and checks that
tenant and global fields cannot be substituted for one another.
