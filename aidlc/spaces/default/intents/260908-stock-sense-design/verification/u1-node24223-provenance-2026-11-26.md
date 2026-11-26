# Node 24.22.3 validator provenance

Date: 2026-11-26. Approved repair fingerprint: sha256:499b02fc9448292b8f1691ccc6918f6b8626fa18be3abb490a0d38784813674d. Worktree: `.aidlc/worktrees/u1-validator-repair`, based on reviewed candidate `3fef097f5a7f87885d6453dfd3017ec23751a1b1`. This records verified download/build-input provenance; it is not a green image scan, owner exception, merge, acceptance or release receipt.

## Distribution bytes and signature

Downloaded the official [release checksums](https://nodejs.org/dist/v24.22.3/SHASUMS256.txt), [detached signature](https://nodejs.org/dist/v24.22.3/SHASUMS256.txt.sig), Linux x64 archive and Windows x64 archive. SHA256 was computed over actual downloaded bytes:

| Artifact | SHA256 |
|---|---|
| node-v24.22.3-linux-x64.tar.xz | 4f2b175a6d53a5c617a80dba2676238a0688cef28c6da4eba35c7d844e66fcfb |
| node-v24.22.3-win-x64.zip | e612af99f626ab415ea225af6bce5c971feb448cb5cae250bb1c3fa50c5f7d9f |
| SHASUMS256.txt | 06d17307d84ec057dd2783863f12cb228c9273f9424b330532e4e3699f5d47c9 |
| SHASUMS256.txt.sig | d17729e51168e542e3b0349d6cad2db272c76e3ab16c8aa1b7fca172d69d7855 |
| Official release pubring.kbx | 610b8d249da3d5733f5a128def2dd0294dbbf5b5713e6ca2529db8db419dee00 |
| Extracted Linux bin/node | a7ec1b37e6ff9d187e4198c5b6df9a4eb1c74dd31804fb3bac55cc4ceca1ac01 |

Verification policy for this repair: accept archive bytes only when their SHA256 matches the signed vendor checksum file and its detached signature validates against the official Node release-key repository. The keyring was downloaded over HTTPS from `nodejs/release-keys` at immutable commit `481637f813e912c4aa3622d7964ab426c97b8e8d`, path `gpg/pubring.kbx`. GPG returned GOODSIG and VALIDSIG for fingerprint `5BE8A3F6C8A5C01D106C0AD820B1A390B168D356`, Antoine du Hamel, signature date 2026-11-11. The isolated GPG trust database has no owner-trust certifications and reports TRUST_UNDEFINED; signer authorization here comes from the official pinned vendor keyring fetched via HTTPS, not an independently established web of trust. No stronger claim is made.

The first GPG attempt used a Windows keyring path that this Git-for-Windows GPG interpreted as an invalid resource URL. Retrying with the equivalent `/d/Git/...` path produced the valid result above; the failed attempt was not treated as a verification pass. A concurrent redundant extraction attempt encountered the first extraction's file lock; only the completed extraction and subsequent stable hash read are used.

Scratch evidence is retained locally at `D:/Git/StockSense/.local-data/node24223-verification/`. Verified host executable `node-v24.22.3-win-x64/node.exe --version` returned `v24.22.3`.

## Immutable builder and actual binary binding

The previous builder index `c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c` is official Node bookworm-slim. The replacement retains that family and pins its Linux/amd64 manifest directly:

- Discovered version tag: `docker.io/library/node:24.22.3-bookworm-slim`.
- Observed index: `sha256:873f586f3794f52281bd039bf02c048a0be08fde619338f9941bad1eb6b34530`.
- Pinned Linux/amd64 manifest: `sha256:e0e989b967dacc279681ed81774b2ce9eeebbb0efb8e0c427573235bebf1eda1`.
- Registry annotation source: `https://github.com/nodejs/docker-node.git#1274f3ee37d4d0e59d308ea25b83d9e21e4db862:24/bookworm-slim`.
- Registry annotation base: Debian bookworm-slim digest `sha256:311f7a192fd9a92b165a86b32fa3aae9005b11849bfb1db2d4fd784559ee464f`.

Pulled that exact manifest with `--platform linux/amd64`. Docker inspect reported linux/amd64. A network-disabled, read-only, capability-dropped container calculated `/usr/local/bin/node` SHA256 `a7ec1b37e6ff9d187e4198c5b6df9a4eb1c74dd31804fb3bac55cc4ceca1ac01`, equal to the extracted signed distribution binary. This establishes actual copied binary equality, independently of a version string. Registry annotations are recorded provenance metadata, not a claim of independently verified registry-attestation signatures.

The repaired Dockerfile asserts that binary hash before dependency installation. The repaired build script additionally copies the binary out of the built final image and checks the same hash, then performs the existing non-root, offline runtime version smoke check. Hosted proof must still execute this final-image path and retain image/SBOM/scan evidence.

## Scope and validation status

Changed Node version expectations in the validator recipe, image-build script, package engine, scanner policy, SBOM policy, contracts-required and release-evidence workflows. Final distroless base, Kiota runtime, pnpm, dependency lockfile and vulnerability policy remain unchanged. The base-owned U2 workflow remains on its separate existing Node 24.22.2 pin because U2 changes are outside this approval.

The modified image-build script passes Node 24.22.3 syntax checking. Combined unit/integration/coverage, full image builds, raw scan reconciliation and hosted proof are coordinator-owned and must be recorded separately. No complete CI pass or glibc disposition is inferred from this provenance verification.
