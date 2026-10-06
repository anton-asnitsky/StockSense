# StockSense contract sources

`source/common/v1/` holds the approved C01 tenant-message and retailerless
identity-audit envelope schemas. These are canonical source documents for the
contract package. Their `additionalProperties: false` boundaries keep tenant
and global messages separate.

`source/` also contains draft canonical documents for every required C01-C27
artifact kind. The C08 inventory port uses a closed in-process dialect; C16 and
C20 identity profiles and C22/C23 messaging profiles use JSON Schema 2020-12.
The C23 AsyncAPI source names distinct tenant and global identity routes.
`profiles/messaging-platform/` holds governed C22/C23 profile **candidates**
that validate against those schemas. These drafts are not yet bound into a
complete, revision-stamped package with fixtures and release evidence.

`catalogue/v1/boundary-sources.json` is the checked C01-C27 source-to-boundary
map. After committing canonical source edits, run
`node tools/contracts/scripts/build-source-inventory.mjs` from the repository
root. It inventories every canonical file, checks each required artifact kind,
and verifies all 38 source digests against the Git `sourceRevision` it reports.
This is an input to package assembly, not a validated package or release claim.

`fixtures/messaging-platform/v1/example-fixture.json` contains candidate C22/C23
positive and negative examples. It is regenerated from the governed profile
candidates with `node tools/contracts/scripts/build-messaging-fixtures.mjs`.
The fixture oracle checks the exact schema revision, stable finding code, rule,
and element; it does not assert that a messaging runtime has passed conformance.

`samples/messaging-profiles/` is a separate C01/C22/C23 **candidate** built with
`node tools/contracts/scripts/create-messaging-sample.mjs`. Its six canonical
documents bind to one Git source revision, and the pinned isolated validators
check the AsyncAPI route, five schemas and eight exact fixtures. Its generation
profile explicitly records that consumer generation is unverified. The package
does not claim C02-C21/C24-C27 coverage, runtime messaging conformance, or
release readiness.

`samples/walking-skeleton/` is a **thin candidate package**, not a release
artifact. It covers C01 and C18 - two boundaries of twenty-seven. The governance CLI checks its path inventory,
digests, budgets, reference preflight, protected-content rules, the declared
package policy, the example-fixture oracle, and the canonical documents
actually present. The sample exercises JSON Schema validation and, through C18, the pinned
OpenAPI validator. Its declared consumer regenerates reproducibly with drift
detection. It does not prove AsyncAPI validation, compatibility, release scans,
SBOM, attestation or provider conformance evidence, and no fixture yet targets
C18, so none of C18 behaviour beyond syntax is exercised. The CLI reports
`validationLevel: candidate-canonical-and-fixture-validation` and
`releaseReady: false`.
Never publish or consume this sample as a release package.
The candidate CLI rejects release manifests until the release-evidence path is
implemented and independently verified.

**Source provenance.** The package records the real Git commit that contains
its canonical sources, and that record is a binding rather than a label. Run
the CLI with `--repo-root <path>` and every shipped canonical document - OpenAPI
and schemas alike - is compared against the blob at the recorded revision; drifted bytes are rejected
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

Candidate OpenAPI and AsyncAPI validation requires the local Linux Docker
engine and an exact, locally present validator image ID. Build the image from
`tools/contracts/Dockerfile.validator`, inspect its ID, and pass that ID to
the CLI and integration suite:

```powershell
docker build --file tools/contracts/Dockerfile.validator --tag stocksense-validator:local tools/contracts
$env:STOCKSENSE_STANDARDS_IMAGE = docker image inspect stocksense-validator:local --format '{{.Id}}'
node tools/contracts/src/cli.mjs validate contracts/samples/walking-skeleton
```

The runner rejects a missing digest and never invokes a host standards CLI.
It mounts only a digest-checked copy of the declared package graph in a
read-only Linux container with no network, a 60-second wall limit, and a
2 GiB memory/swap limit. The image tag is only a build convenience; validation
uses the inspected immutable image ID. The current C01/C18 sample is not the
full C01-C27 resource-acceptance proof.

Kiota is pinned separately as the local .NET tool
`Microsoft.OpenApi.Kiota` 1.35.0 in `.config/dotnet-tools.json`. Restore it
from the repository root with
`dotnet tool restore --configfile tools/contracts/nuget.config`, then check
`dotnet tool run kiota -- --version`. This installs the generator for
consumer-local client generation; its presence alone does not prove clean
regeneration or authorize a contract release.

For OpenAPI compatibility checks, `node --use-system-ca
tools/contracts/scripts/setup-oasdiff.mjs` downloads the approved oasdiff
1.28.0 asset for the host platform, verifies its repository-pinned SHA-256
checksum, and installs the executable under the ignored `.tools/` directory.
The tool must still compare the actual immutable Git integration baseline;
installing it alone is not a compatibility result.
