# U1 security remediation plan inputs — 2026-11-26

Read-only security research for the coordinator's fresh protected plan. No dependency installation, runtime build, code/policy change, exception, merge, gate approval, or acceptance was performed. Existing work was preserved. Read CONTRIBUTING.md and the current validator scan review; root AGENTS.md instructions were supplied in context.

## Verified primary-source facts

### Node: supported patch exists; downloaded archive still needs verification

The [Node 24.22.3 release](https://nodejs.org/en/blog/release/v24.22.3), dated November 11, identifies a security release covering the 15 Node CVEs enumerated in `u1-validator-scan-review-2026-11-26.md`. A direct read of [vendor SHASUMS256.txt](https://nodejs.org/dist/v24.22.3/SHASUMS256.txt) returned:

`4f2b175a6d53a5c617a80dba2676238a0688cef28c6da4eba35c7d844e66fcfb  node-v24.22.3-linux-x64.tar.xz`

This verifies the published checksum only. Implementation must verify downloaded bytes and applicable signature policy, align validator/host/workflow engine pins, rebuild, and independently bind exact image, SBOM, raw scan and database evidence. No claim that the resulting image is clean is made.

### Picomatch: advisory withdrawn; refresh the unchanged audit first

[GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) was withdrawn November 18 and updated November 19. GitHub states that it is not a security issue, referencing the upstream maintainer discussion. The historical affected range remains `<=4.0.7`, with patched version `None`.

Direct npm registry reads on November 26 returned:

| Metadata source | Observed value |
| --- | --- |
| [picomatch/latest](https://registry.npmjs.org/picomatch/latest) | `4.0.7` |
| [secretlint/latest](https://registry.npmjs.org/secretlint/latest) | `14.1.0`; depends on walker `14.1.0` |
| [walker/latest](https://registry.npmjs.org/@secretlint%2fwalker/latest) | `14.1.0`; picomatch `^4.0.7` |
| [walker/13.0.6](https://registry.npmjs.org/@secretlint%2fwalker/13.0.6) | picomatch `^4.0.7` |

There is no verified patched picomatch release to select, and a Secretlint major update retains the same picomatch range. Minimal action is rerunning the normal audit on the unchanged lockfile against fresh advisory metadata. Do not add an ignore, suppression, risk exception, partial upstream patch, or unnecessary major dependency update. If the normal hosted audit still reports the withdrawn advisory, preserve the raw result and investigate its metadata provenance; withdrawal alone is not evidence that a CI job passed.

### Wolfi: no demonstrated clean package upgrade

The [Wolfi glibc recipe](https://raw.githubusercontent.com/wolfi-dev/os/main/glibc-2.44.yaml) observed during research declares version `2.44`, epoch `26`. The [Chainguard wolfi-base vulnerability page](https://images.chainguard.dev/directory/image/wolfi-base/vulnerabilities) still reports CVE-2026-121758, CVE-2026-124024, CVE-2026-115819 and CVE-2026-100290 for `glibc-2.44@2.44-r26`.

For CVE-2026-126765, the vendor [cimg-base advisory page](https://images.chainguard.dev/directory/image/cimg-base/advisories) lists the glibc family under investigation; the [node image vulnerability page](https://images.chainguard.dev/directory/image/node/vulnerabilities) reports the finding with `glibc-2.44@2.44-r27`. These live vendor pages concern their current images, not proof of applicability or remediation for StockSense's exact `2.44-r21` bytes. Page freshness can differ; neither absence from a particular page nor a higher revision establishes a fix.

All five exact-candidate dispositions remain unresolved. No fixed Wolfi revision or false-positive conclusion was established. Do not blindly update the base image or promise that such an update makes CI green. Resolve vendor patch/advisory applicability against the exact package/image and fresh scan; if no supported demonstrable fix exists, stop and report the blocker for a separately scoped decision. No platform migration or exception is proposed by this research.

## Bounded plan choices and stop conditions

1. Refresh the existing hosted dependency audit first; retain lockfile and controls unless new evidence establishes a necessary supported change.
2. Under a fresh verified protected plan, patch Node to the vendor-supported release and repair scan reporting only with exact package identity binding, complete raw-row preservation, and negative tests. Unknown disposition must remain unknown and must not gain exception eligibility; fixed High/Critical findings remain blocking.
3. Reconcile all five Wolfi rows before claiming a complete or passing image scan. Keep the vulnerable original candidate as a positive control. Stop if metadata remains incomplete, raw/SBOM identity differs, or the required policy still fails.
4. Require independent candidate review, pinned CLI C01–C27 checks, focused evidence tests, and fresh hosted scans at each actual PR head. A diagnostic lane is not final PR success. Protected-main ledger publication, owner risk acceptance, merges, U1 acceptance and C01 release remain outside these research inputs.

Residual risk: current evidence does not establish a fully green path for all three PRs. It does establish a supported Node patch and removes the factual basis for assuming that the withdrawn picomatch advisory requires a dependency upgrade.
