# Independent runtime remediation review

Reviewer: stocksense-technical-lead-agent, independent of both runtime specialists. Review concerns U1 Contracts and the runnable-retail-walking-skeleton Bolt. This review grants no finding acceptance, ledger authorization, merge, U1 acceptance or C01 release.

## Reviewed boundary

The approved closure plan has SHA256 `97d65b6e528e12b132baadcd735cd5a165cbc463fbdd548fdc31f322cb1a45fa`; the recorded protected approval fingerprint is `sha256:33ae249de4db4b3e9b3ee57f22eea5559e992bd96a747a80a2987d3ccc7579d7`. The coordinator's approval report records successful native verification before isolated work. This reviewer did not reissue the directive or manufacture a receipt.

The Kiota report reviewed is `u1-ci-kiota-runtime-2026-11-26.md`, SHA256 `a1f31efd8b86ee8c41b530b28a739074fb9c614944d2d3b7f52a94049ec040b1`. Both document hashes were independently recalculated. The Kiota worktree is clean at the reviewed source baseline; no runtime change is proposed for integration.

## Kiota evidence verification

- Independently checked the size and SHA256 of all 35 retained files listed by `.local-data/u1-ci-kiota/evidence-sha256.json`.
- Independently decompressed both Noble security and updates package indexes, matched compressed size/hash to their InRelease records, and parsed every entry for libc6, libicu74, libssl3t64 and openssl. All available versions and package hashes in these captured indexes equal the reviewed `kiota-runtime-inputs.json` archive pins. This supports the dated conclusion that these captured indexes offer no newer package bytes for the four affected packages; it is not a perpetual claim about future repositories.
- Inspected the retained gpgv transcripts: both report the Ubuntu Archive Automatic Signing Key (2018), fingerprint `F6ECB3762474EDA9D21B7022871920D1991BC93C`. Index authentication was performed by the specialist. This review independently verifies content bindings; independent signature execution is not yet claimed here. The exact verification image/keyring command was requested for reproducibility.
- Compared all 34 proposal-inventory rows with the retained PR76 normalized scan, including advisory, package, version, PURL, severity, fix state and fix versions. They match exactly, with 21 unique advisories: 13 libssl3t64, 13 openssl, seven libc6 and one libicu74. Every row's PURL/version is present in the actual retained SBOM.
- Independently inspected all 1775 runtime entries for image `sha256:d28e88ff9100f6df37890cbb88bc0509159fcabbe44d76013942e84c29efd65d`, normalized runtime `sha256:1c7fc5fd4df187a3571460bf807e860f1be6bfd704c3fd9fe037c641adea5340`. The reported genrb, gconv modules, openssl CLI and libcrypt filenames are absent; libcrypto.so.3 and libssl.so.3 are present. Filename absence alone does not prove absence of a statically linked or alternate implementation.
- Inspected the retained primary OpenSSL advisory texts. The eight stated OpenSSL 3.0 exclusions are supported; other listed advisories explicitly include 3.0. Scheduled December 1 fixes do not establish availability of a corrected Noble package now. The report correctly separates vendor status, scanner status and owner decisions.
- Inspected bounded generator source: network isolation, read-only filesystem, non-root execution, no-new-privileges, dropped capabilities, PID/memory limits and supervised execution are actual controls. These reduce exposure but do not establish universal call-path non-applicability. No new Docker workload or implementation test was run by this reviewer.

## Findings and required action

**No blocking or major defect found in the Kiota screening report as a proposal.** It does not claim a clean scan, approved exceptions, a repaired runtime or green CI. Its 34 rows are preserved and its suggested expiries are expressly unapproved.

**Blocking for rollout/CI closure:** no current Kiota finding has a final candidate/execution binding and genuine owner disposition. The report's non-applicability candidates still need the stated final package/feature or call-path proof; risk-review rows must not be relabelled not affected. Any permitted decisions require independently reviewed exact rows, current raw/SBOM/database bindings, controls, expiry and actual owner answers. No operative ledger should be generated from the present unbound table.

**Validator review remains pending:** the specialist built a newer same-family diagnostic candidate, but its complete pinned scan was not yet available at this review checkpoint. A successful build or newer digest is not remediation evidence. Unknown findings remain ineligible; if they persist, the approved plan's stop point applies before authority implementation or runtime rollout.

## Smallest supported next step

Finish and independently reconcile the actual validator SBOM/raw scan. If unknown findings persist, retain the diagnostic evidence and bring a concrete scoped strategy amendment to the owner; do not weaken normalization or exception rules. If the validator can meet the approved requirement, continue the ordered closure plan while preparing final-bound Kiota proposals for separate owner decisions. Recheck package availability and vendor advisories at the final decision, then perform the required two hosted proofs and ordinary checks on unchanged final revisions.

The local baseline suite is owned by the quality specialist and is not a pass claim in this review. All merges remain with the owner and the next lifecycle gate remains held.

## Final runtime screening addendum

This addendum supersedes the pending validator and signature-reproduction limitations above. The updated Kiota report is `de1191987d7b08772feb098445e692edf1d2c1e0d08f4c7e1746cd5f15c63146`; its added reproducibility information does not accept any finding.

Independently repeated both retained InRelease verifications offline, using the existing `ubuntu@sha256:2198e4c65076e9cb0b3d695219df667c0e3b0072da64ca3c2648aca17dcecaf5` image, read-only evidence mount, no network, 0.5 CPU and 128 MiB. Both gpgv checks succeeded with signing key `F6ECB3762474EDA9D21B7022871920D1991BC93C`. Independently measured keyring SHA256 `80a36b0a6de2f69f49d2df75ef473ccde121e9e190b9ea01d20a4f63778d5c31` and gpgv SHA256 `f14d026b9eae172c432e015bce227483293b4966f2f3fdcfa582f71d3dbb2ae8`, matching the specialist's exact inputs. This is verification against the identified installed archive keyring; it is not a new image-signature or independent key-enrollment claim.

### Actual validator result

The newer same-family base `sha256:f2f261fb5b67206f6d31c27ca0001837743b253d96744620f0fee280ffaaf5b9` produced diagnostic image `sha256:518e0f9f17cc2993aa8a11f238aa90dba8081b46f5ad5c73eb606c8b3913b13c`. Its SBOM contains Node 24.22.3 and glibc-2.44 2.44-r28. Independent checks recomputed:

| Retained bytes | SHA256 |
|---|---|
| validator.cdx.json | 42e227a81b214810cfc99f02ffa7715815dffbc807499066d2350b0eb9cc0ba8 |
| validator.grype-raw.json | 023d0e5bb36c289dddf7507917f10307faefafdf9a79635a3246e2f4f58dddbd |
| validator.grype-db.json | d3bf44def6e5bde54a65b3294d7aa90f7afade4b90b445c53587a7ae62c1ef91 |

Production `inspectImageSbom`, `normalizeImageScan` and `inspectImageScan` accepted the retained evidence; independently re-normalized output equals `validator.scan.json` exactly. All five finding PURLs/versions exist in the SBOM. The raw five matches and normalized five rows preserve the prior candidate's advisory IDs, severities and unknown fix states: CVE-2026-121758, CVE-2026-124024 and CVE-2026-115819 are Medium; CVE-2026-126765 and CVE-2026-100290 are Low. Node has no retained finding. The valid pinned database was built `2026-11-26T06:22:34Z`.

The archive/image identity was checked through its actual OCI hierarchy. Docker inspect's ID identifies an OCI index, not the image-config digest. An initial direct equality assertion between those different object types failed; that was a review assumption corrected by examining the descriptors. Independently verified index bytes `518e0f9f...`, its unique linux/amd64 platform manifest `cc9067c8ec036ead506357de258a7b66351a0a0d8adbfbd3ad358c24ee5ede4c`, config `095a1878a9ccbeb9aabb0e1078e65fde3fd6f747c1f0adf5890825b3613285be`, and all 11 layer blob sizes/digests. The config's rootfs diff IDs, user and entrypoint match retained Docker inspect. Syft's container reference `92eb2fc3c3e5fe63` and source manifest representation `a6f5436a1ca11f0e945d54978091237a4dfb4e89cd224a218973b1b45d4af259` match the raw scan's source metadata; they are not substituted for Docker's OCI-index identity.

The specialist retained the unsuccessful Windows-cache attempt and successful bounded Linux-cache retry. The latter scanned the retained SBOM with the pinned scanner and fresh database. This remains dirty-source diagnostic screening: one isolated Dockerfile base-pin change, no immutable hosted revision proof and no successful protected ledger receipt. It is sufficient to demonstrate that this tested base update did not remove the five findings; it is not sufficient for rollout acceptance.

### Verdict and alternatives

**Confirmed blocking result: the tested same-family update does not satisfy Step 4.** All five unknown findings remain ineligible. Honor the approved stop point: do not integrate this pin as a remediation, begin authority implementation on the assumption that scans are clean, suppress rows, relabel unknown as not-fixed, or manufacture exceptions.

The smallest supported action now is a focused strategy amendment, with actual evidence and independent review before implementation/rollout. A genuine alternative worth isolated evaluation is a musl-based Node 24.22.3 runtime that removes glibc itself; this changes the libc and Node-binary provenance assumptions and requires verifying immutable official-image/source identity, native-addon compatibility, complete inventory/scans and the same contract/consumer tests. It is a research option, not a selected digest or a promise of clean scans. Moving to another glibc distribution merely to obtain a different scanner fix-state is not remediation. A vendor-patched glibc route is also valid only when authentic patch/package evidence and actual scan results demonstrate the affected implementation is repaired; no such candidate is established here.

Kiota's 34 rows remain separately unresolved and cannot be cleared by the validator strategy. Final candidate-bound non-applicability or temporary-risk proposals, genuine owner decisions, exact ledger publication and all ordinary required checks are still required. No security rule was weakened and no runtime rollout is recommended by this review.
