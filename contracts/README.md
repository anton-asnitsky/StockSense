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
`fixtures/web-bff/v1/example-fixture.json` contains six C18 request-body
examples bound to the OpenAPI document revision. The thin sample builder does
not write its governed fixture sidecar: it reconstructs the bytes that sidecar
should hold and refuses when the committed file differs, so authoring the
sidecar is a manual step and a stale revision is refused.
`fixtures/common/v1/example-fixture.json` carries the C01 package-manifest
examples. Every canonical document a fixture can be bound to needs its own
positive and negative example, and the package meta-schema is one of them: a
manifest is a payload for it.

`samples/messaging-profiles/` is a separate C01/C22/C23 **candidate** built with
`node tools/contracts/scripts/create-messaging-sample.mjs`. Its six canonical
documents bind to one Git source revision, and the pinned isolated validators
check the AsyncAPI route, five schemas and ten exact fixtures. Its generation
profile explicitly records that consumer generation is unverified. The package
does not claim C02-C21/C24-C27 coverage, runtime messaging conformance, or
release readiness.

Building it runs in two passes, because a sidecar's bytes are what the stamp is
resolved from: `--rewrite-sidecars` writes the bound sidecars and stops, you
commit them, and the default run then resolves the revision, refuses to stamp
while any bound path is uncommitted, and proves every binding against the blobs
at that commit. A generation profile records the revision inside its own bytes,
so it is stamped but never blob-bound - there is no fixpoint to bind it to.

`samples/walking-skeleton/` is a **thin candidate package**, not a release
artifact. It covers C01 and C18 - two boundaries of twenty-seven. The governance CLI checks its path inventory,
digests, budgets, reference preflight, protected-content rules, the declared
package policy, the example-fixture oracle, and the canonical documents
actually present. The sample exercises JSON Schema validation and, through C18, the pinned
OpenAPI validator. Its declared consumer regenerates reproducibly with drift
detection. It does not prove AsyncAPI validation, compatibility, release scans,
SBOM, attestation or provider conformance evidence. Six revision-bound C18
request-body fixtures now check manual review, reconciliation and assistant-turn
shapes with exact positive and negative outcomes. They do not establish C18
CSRF, idempotency, dashboard, SSE, audit or runtime behavior. The CLI reports
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

The governed sidecars are bound the same way, by their path inside the
repository, so a fixture sidecar cannot drift from the commit it claims. A
package validated from outside the repository - a temporary copy, say - cannot
have those paths, and the result then reports
`sourceBinding: verified-canonical-package-outside-repository`: the canonical
documents were still proven, the sidecars were not, and neither fact is
overstated. Three provenance failures are reported apart, because they call for
different actions: `SOURCE_REVISION_MISMATCH` means the shipped bytes drifted,
`SOURCE_PATH_ABSENT` means the recorded commit does not contain a path the
package ships, `SOURCE_REVISION_UNKNOWN` means the commit is not in this
repository, and `GIT_UNAVAILABLE` means Git could not be run at all. The split
is not perfect: a `--repo-root` that is not a Git repository exits non-zero
rather than failing to start, so it reports `SOURCE_REVISION_UNKNOWN` - the
commit genuinely is not in that directory, but the cause is the wrong root
rather than a false claim by the package.

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
$env:STOCKSENSE_STANDARDS_IMAGE = pnpm --dir tools/contracts --silent build:standards-image
node tools/contracts/src/cli.mjs validate contracts/samples/walking-skeleton
```

`build:standards-image` builds the image, reads the tool-source digest back out
of it, and prints the exact image ID the runner requires. Use it rather than a
bare `docker build`: one path for a person and for a hosted job means the image
a run was judged by is always the image this tree describes. Note that the image
ID changes on every rebuild even when nothing changed, because the build is not
bit-reproducible - the stable identity is the tool-source digest, not the ID, so
a pinned ID cannot be committed and every environment has to build its own.

The image bakes in a copy of `tools/contracts/src`, so the fixture oracle that
runs inside it is the oracle as of the build, not as of the working tree. This
is enforced, not merely documented: the runner reads the digest recorded in the
image and refuses a mismatch with `STANDARDS_IMAGE_STALE`. **Rebuild after any
change under `tools/contracts/src`.** Before the check existed, a two-day-old
image rejected a valid package for a feature it did not have, and an equally
old one would have passed a package the current rules reject - a passing run
against a stale image proves nothing about the current rules.

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
