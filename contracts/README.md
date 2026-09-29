# StockSense contract sources

`source/common/v1/` holds the approved C01 tenant-message and retailerless
identity-audit envelope schemas. These are canonical source documents for the
contract package. Their `additionalProperties: false` boundaries keep tenant
and global messages separate.

`samples/walking-skeleton/` is a **thin candidate package**, not a release
artifact. It covers only C01. The governance CLI checks its path inventory,
digests, budgets, reference preflight, protected-content rules, the declared
package policy, the example-fixture oracle, and the canonical documents
actually present. The sample exercises JSON Schema validation, but not an
OpenAPI or AsyncAPI document. It does not prove compatibility, generation,
scan, attestation or provider conformance evidence. The CLI reports
`validationLevel: candidate-canonical-and-fixture-validation` and
`releaseReady: false`.
Never publish or consume this sample as a release package.
The candidate CLI rejects release manifests until the release-evidence path is
implemented and independently verified.

**Source provenance.** The package records the real Git commit that contains
its canonical sources, and that record is a binding rather than a label. Run
the CLI with `--repo-root <path>` and every shipped canonical document is
compared against the blob at the recorded revision; drifted bytes are rejected
with `SOURCE_REVISION_MISMATCH`. Without `--repo-root` the result reports
`sourceBinding: unverified-no-repository`.

After editing a canonical C01 source, commit it, then run
`node tools/contracts/scripts/create-sample.mjs` from the repository root to
refresh its copy, digests and revision stamp. The script refuses to stamp a
revision while the sources have uncommitted changes, because no commit would
then describe the bytes being packaged.

From the repository root, run `pnpm --dir tools/contracts test:unit` and
`pnpm --dir tools/contracts test:integration`. The integration suite also
validates both envelope profiles with JSON Schema 2020-12 and checks that
tenant and global fields cannot be substituted for one another.
