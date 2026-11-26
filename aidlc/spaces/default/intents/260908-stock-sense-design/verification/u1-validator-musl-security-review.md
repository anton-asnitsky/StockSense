# Independent security/technical review — validator musl amendment

Date: 2026-11-27. Reviewer: stocksense-technical-lead-agent, independent of the runtime and plan authors. Scope: U1 Contracts, runnable-retail-walking-skeleton Bolt, focused planning gate only.

## Verdict

READY to present the exact focused amendment for owner Plan Approval. No blocking or major planning findings remain. This verdict is not implementation authority, runtime acceptance, a vulnerability exception, ledger publication, merge, U1 acceptance, C01 release or next-gate advancement. A fresh genuine answer and protected receipt remain required before implementation.

Independently recalculated amendment SHA256: `4eb38b1e81d5fbd1b7bd48581fead4fe6022cf6bc0c0bc84842f7b65333bf60d`, file `u1-validator-musl-amendment.md`. The retained runtime screening/provenance report is `u1-ci-validator-runtime-2026-11-26.md`, independently recalculated SHA256 `9d0d5d63692fee2553c78bc086745880940c4d7cc212f334f9cd1c0f2a559a1d`. The earlier approved CI closure plan remains unchanged and supplies all other obligations.

## Independent provenance checks

Recomputed the actual musl archive SHA256 `601b3e1930a593f3d44af2d0dca978dad4bd8b4594c4f8268b67a33553b04c30`. Its exact filename/hash occurs in both the signed checksum document and retained verified plaintext. Independently reran offline gpgv against the retained signed document and pinned keyring; final execution exited zero and reported GOODSIG/VALIDSIG for authorized release signer `5BE8A3F6C8A5C01D106C0AD820B1A390B168D356`. Earlier restricted/MSYS-path attempts failed before successful verification and are not counted as passes.

Recomputed keyring SHA256 `610b8d249da3d5733f5a128def2dd0294dbbf5b5713e6ca2529db8db419dee00`. The trust anchor remains the reviewed official HTTPS-published keyring at pinned commit `481637f813e912c4aa3622d7964ab426c97b8e8d`; this does not create an independent web of trust or registry signature attestation. Reproduction uses Git's gpgv with MSYS paths: `gpgv.exe --status-fd 1 --keyring /d/Git/StockSense/.local-data/node24223-verification/pubring.kbx /d/Git/StockSense/.local-data/u1-ci-validator/SHASUMS256.txt.asc`.

Independently hashed the extracted archive executable and the retained executable copied by the specialist from the unstarted exact official Alpine image. Both equal `7e027679034844bb06f53bead732673553cf5bb0de424bbbd257b35c989d34b0`. Read-only ELF parsing confirms ELF64, little-endian x86-64 and interpreter `/lib/ld-musl-x86_64.so.1`. Neither candidate executable was run by this reviewer. This verifies the retained bytes; final candidate review must repeat the immutable-image extraction and final assembled-image comparison.

Recomputed and read pinned docker-node recipe SHA256 `0643d976290ebb8c229271196cc6d9c189ec7d49dd11950dd435907cd2278197`, source commit `1274f3ee37d4d0e59d308ea25b83d9e21e4db862`. Its selected x64 branch downloads the official nodejs.org musl archive and verifies signed checksums; the source-build branch is for other architectures and is expressly outside this amendment. No unofficial binary or source-build fallback is authorized. Immutable official Linux/amd64 image `sha256:d8d97e479cdc64f052f81f129362168717c59783ade8dcc1abd22e1cca8dbd7c` remains an input for exact candidate verification, not a clean final validator claim.

## Plan assessment and mandatory conditions

The proposal addresses the actual blocker by requiring glibc removal, not a different advisory namespace or rewritten fix state. It explicitly preserves all raw findings, complete SBOM/native/ELF inventory, scanner pins, unknown and fixed High/Critical refusal, frozen dependencies, Node version and Kiota version. No gcompat or other glibc compatibility layer may conceal an incompatible addon. Final package closure and authenticated Alpine inputs remain implementation deliverables.

The upstream amd64-musl Experimental support status is explicit and requires owner acceptance of a bounded evaluation. Authentication and equal binary hashes do not establish runtime compatibility or support equivalence. Shell-free final runtime, absence of build tools/package managers, non-root/read-only/offline execution, normal npm access, native addons, every validator engine, positive/negative fixtures and Unicode/time-zone/process behavior must be demonstrated. A failure returns to a focused decision; it does not enable fallback binaries.

The partial local baseline and isolated C01 timeout are disclosed. Existing 180-second limit, coverage floor of at least 80%, fixture scope and security controls remain unchanged. The amendment requires diagnosis rather than assuming musl fixes host I/O. Two complete hosted builds/scans, full pinned suites, C01-C27 and unchanged 107-file consumer output checks remain mandatory before rollout.

Kiota's 34 unresolved rows and the separate exact finding/publication owner decisions remain outside this runtime approval. The temporary PR ledger authority is not broadened; U2, main/release restrictions, final frozen-head approvals and all-nine ordinary checks remain intact. No successful musl runtime, full test run or clean scan is claimed by this planning review.

## Changes and checks performed

Only this assigned review document was written. Read existing source/provenance/planning evidence, recalculated hashes, parsed retained ELF metadata and independently verified the signed checksum document offline. No new binary execution, runtime build, source edit, scanner change, PR mutation, lifecycle mutation or owner decision was performed.
