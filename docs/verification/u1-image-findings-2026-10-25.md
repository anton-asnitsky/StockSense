# U1 image finding inventory — 2026-10-25

This is a review inventory, not a vulnerability exception or U1 acceptance. It records the exact retained scan from draft PR #32 at head c53942990c0617d9c78fa17e21965195f3ba7470; the hosted pull-request merge revision was 9562abb688c97b1dda65bda8e369d315289b7101, with candidate tree digest sha256:278085d2b08f4a7d5237486d5cf1714363db987c14aa5fab1204b705f9bf6cae.

Evidence: [hosted run 40188994237](https://github.com/anton-asnitsky/StockSense/actions/runs/40188994237). Its independent functional probe passed 89 integration tests, with 3 skips and 2 TODOs; the coverage run passed 381 tests with 95.31% line coverage. The required U1 check failed at IMAGE_FINDINGS, and the protected-main exception ledger remains empty.

The final validator image uses Node 24.19.0. The 40 findings below are the exact current report rows: 31 validator, 9 Kiota. No row has been approved. A proposed disposition must identify the exact finding, owner, rationale, compensating control, approval reference, creation time and expiry; a future scan or source change requires revalidation.

| Image | Severity | Finding | Package | Version | Type | PURL | Fix state | Scanner fix version |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| validator | High | CVE-2026-102010 | gcc-14-base | 14.2.0-19 | deb | pkg:deb/debian/gcc-14-base@14.2.0-19?arch=amd64&distro=debian-13.7&upstream=gcc-14 | wont-fix | — |
| validator | High | CVE-2026-102010 | libgcc-s1 | 14.2.0-19 | deb | pkg:deb/debian/libgcc-s1@14.2.0-19?arch=amd64&distro=debian-13.7&upstream=gcc-14 | wont-fix | — |
| validator | High | CVE-2026-102010 | libgomp1 | 14.2.0-19 | deb | pkg:deb/debian/libgomp1@14.2.0-19?arch=amd64&distro=debian-13.7&upstream=gcc-14 | wont-fix | — |
| validator | High | CVE-2026-102010 | libstdc++6 | 14.2.0-19 | deb | pkg:deb/debian/libstdc%2B%2B6@14.2.0-19?arch=amd64&distro=debian-13.7&upstream=gcc-14 | wont-fix | — |
| validator | High | CVE-2026-19499 | libc6 | 2.41-12+deb13u4 | deb | pkg:deb/debian/libc6@2.41-12%2Bdeb13u4?arch=amd64&distro=debian-13.7&upstream=glibc | wont-fix | — |
| validator | High | CVE-2026-5435 | libc6 | 2.41-12+deb13u4 | deb | pkg:deb/debian/libc6@2.41-12%2Bdeb13u4?arch=amd64&distro=debian-13.7&upstream=glibc | wont-fix | — |
| validator | High | CVE-2026-85091 | zlib1g | 1:1.3.dfsg+really1.3.1-1+b1 | deb | pkg:deb/debian/zlib1g@1%3A1.3.dfsg%2Breally1.3.1-1%2Bb1?arch=amd64&distro=debian-13.7&upstream=zlib%401%3A1.3.dfsg%2Breally1.3.1-1 | not-fixed | — |
| validator | High | CVE-2026-95619 | gcc-14-base | 14.2.0-19 | deb | pkg:deb/debian/gcc-14-base@14.2.0-19?arch=amd64&distro=debian-13.7&upstream=gcc-14 | wont-fix | — |
| validator | High | CVE-2026-95619 | libgcc-s1 | 14.2.0-19 | deb | pkg:deb/debian/libgcc-s1@14.2.0-19?arch=amd64&distro=debian-13.7&upstream=gcc-14 | wont-fix | — |
| validator | High | CVE-2026-95619 | libgomp1 | 14.2.0-19 | deb | pkg:deb/debian/libgomp1@14.2.0-19?arch=amd64&distro=debian-13.7&upstream=gcc-14 | wont-fix | — |
| validator | High | CVE-2026-95619 | libstdc++6 | 14.2.0-19 | deb | pkg:deb/debian/libstdc%2B%2B6@14.2.0-19?arch=amd64&distro=debian-13.7&upstream=gcc-14 | wont-fix | — |
| validator | Medium | CVE-2026-18374 | libc6 | 2.41-12+deb13u4 | deb | pkg:deb/debian/libc6@2.41-12%2Bdeb13u4?arch=amd64&distro=debian-13.7&upstream=glibc | wont-fix | — |
| validator | Medium | CVE-2026-19542 | libc6 | 2.41-12+deb13u4 | deb | pkg:deb/debian/libc6@2.41-12%2Bdeb13u4?arch=amd64&distro=debian-13.7&upstream=glibc | wont-fix | — |
| validator | Medium | CVE-2026-27171 | zlib1g | 1:1.3.dfsg+really1.3.1-1+b1 | deb | pkg:deb/debian/zlib1g@1%3A1.3.dfsg%2Breally1.3.1-1%2Bb1?arch=amd64&distro=debian-13.7&upstream=zlib%401%3A1.3.dfsg%2Breally1.3.1-1 | wont-fix | — |
| validator | Medium | CVE-2026-6238 | libc6 | 2.41-12+deb13u4 | deb | pkg:deb/debian/libc6@2.41-12%2Bdeb13u4?arch=amd64&distro=debian-13.7&upstream=glibc | wont-fix | — |
| validator | Medium | CVE-2026-6791 | libc6 | 2.41-12+deb13u4 | deb | pkg:deb/debian/libc6@2.41-12%2Bdeb13u4?arch=amd64&distro=debian-13.7&upstream=glibc | wont-fix | — |
| validator | Medium | CVE-2026-77117 | libc6 | 2.41-12+deb13u4 | deb | pkg:deb/debian/libc6@2.41-12%2Bdeb13u4?arch=amd64&distro=debian-13.7&upstream=glibc | wont-fix | — |
| validator | Medium | CVE-2026-80489 | libc6 | 2.41-12+deb13u4 | deb | pkg:deb/debian/libc6@2.41-12%2Bdeb13u4?arch=amd64&distro=debian-13.7&upstream=glibc | wont-fix | — |
| validator | Medium | CVE-2026-8674 | libc6 | 2.41-12+deb13u4 | deb | pkg:deb/debian/libc6@2.41-12%2Bdeb13u4?arch=amd64&distro=debian-13.7&upstream=glibc | wont-fix | — |
| validator | Medium | CVE-2026-86805 | libc6 | 2.41-12+deb13u4 | deb | pkg:deb/debian/libc6@2.41-12%2Bdeb13u4?arch=amd64&distro=debian-13.7&upstream=glibc | wont-fix | — |
| validator | Medium | CVE-2026-89092 | libc6 | 2.41-12+deb13u4 | deb | pkg:deb/debian/libc6@2.41-12%2Bdeb13u4?arch=amd64&distro=debian-13.7&upstream=glibc | wont-fix | — |
| validator | Low | CVE-2026-6368 | libc6 | 2.41-12+deb13u4 | deb | pkg:deb/debian/libc6@2.41-12%2Bdeb13u4?arch=amd64&distro=debian-13.7&upstream=glibc | wont-fix | — |
| validator | Low | CVE-2026-95818 | libc6 | 2.41-12+deb13u4 | deb | pkg:deb/debian/libc6@2.41-12%2Bdeb13u4?arch=amd64&distro=debian-13.7&upstream=glibc | wont-fix | — |
| validator | Low | CVE-2026-97399 | libc6 | 2.41-12+deb13u4 | deb | pkg:deb/debian/libc6@2.41-12%2Bdeb13u4?arch=amd64&distro=debian-13.7&upstream=glibc | wont-fix | — |
| validator | Negligible | CVE-2010-4756 | libc6 | 2.41-12+deb13u4 | deb | pkg:deb/debian/libc6@2.41-12%2Bdeb13u4?arch=amd64&distro=debian-13.7&upstream=glibc | not-fixed | — |
| validator | Negligible | CVE-2018-20796 | libc6 | 2.41-12+deb13u4 | deb | pkg:deb/debian/libc6@2.41-12%2Bdeb13u4?arch=amd64&distro=debian-13.7&upstream=glibc | not-fixed | — |
| validator | Negligible | CVE-2019-1010022 | libc6 | 2.41-12+deb13u4 | deb | pkg:deb/debian/libc6@2.41-12%2Bdeb13u4?arch=amd64&distro=debian-13.7&upstream=glibc | not-fixed | — |
| validator | Negligible | CVE-2019-1010023 | libc6 | 2.41-12+deb13u4 | deb | pkg:deb/debian/libc6@2.41-12%2Bdeb13u4?arch=amd64&distro=debian-13.7&upstream=glibc | not-fixed | — |
| validator | Negligible | CVE-2019-1010024 | libc6 | 2.41-12+deb13u4 | deb | pkg:deb/debian/libc6@2.41-12%2Bdeb13u4?arch=amd64&distro=debian-13.7&upstream=glibc | not-fixed | — |
| validator | Negligible | CVE-2019-1010025 | libc6 | 2.41-12+deb13u4 | deb | pkg:deb/debian/libc6@2.41-12%2Bdeb13u4?arch=amd64&distro=debian-13.7&upstream=glibc | not-fixed | — |
| validator | Negligible | CVE-2019-9192 | libc6 | 2.41-12+deb13u4 | deb | pkg:deb/debian/libc6@2.41-12%2Bdeb13u4?arch=amd64&distro=debian-13.7&upstream=glibc | not-fixed | — |
| kiota | Medium | CVE-2026-18374 | libc6 | 2.39-0ubuntu8.9 | deb | pkg:deb/ubuntu/libc6@2.39-0ubuntu8.9?arch=amd64&distro=ubuntu-24.04&upstream=glibc | not-fixed | — |
| kiota | Medium | CVE-2026-8674 | libc6 | 2.39-0ubuntu8.9 | deb | pkg:deb/ubuntu/libc6@2.39-0ubuntu8.9?arch=amd64&distro=ubuntu-24.04&upstream=glibc | not-fixed | — |
| kiota | Medium | CVE-2026-86805 | libc6 | 2.39-0ubuntu8.9 | deb | pkg:deb/ubuntu/libc6@2.39-0ubuntu8.9?arch=amd64&distro=ubuntu-24.04&upstream=glibc | not-fixed | — |
| kiota | Medium | CVE-2026-89092 | libc6 | 2.39-0ubuntu8.9 | deb | pkg:deb/ubuntu/libc6@2.39-0ubuntu8.9?arch=amd64&distro=ubuntu-24.04&upstream=glibc | not-fixed | — |
| kiota | Medium | CVE-2026-95818 | libc6 | 2.39-0ubuntu8.9 | deb | pkg:deb/ubuntu/libc6@2.39-0ubuntu8.9?arch=amd64&distro=ubuntu-24.04&upstream=glibc | not-fixed | — |
| kiota | Medium | CVE-2026-97399 | libc6 | 2.39-0ubuntu8.9 | deb | pkg:deb/ubuntu/libc6@2.39-0ubuntu8.9?arch=amd64&distro=ubuntu-24.04&upstream=glibc | not-fixed | — |
| kiota | Medium | GHSA-qhrr-8q5h-9q3h | MessagePack | 2.5.302 | dotnet | pkg:nuget/MessagePack@2.5.302 | fixed | 2.5.303 |
| kiota | Low | CVE-2025-5222 | libicu74 | 74.2-1ubuntu3.1 | deb | pkg:deb/ubuntu/libicu74@74.2-1ubuntu3.1?arch=amd64&distro=ubuntu-24.04&upstream=icu | not-fixed | — |
| kiota | Negligible | CVE-2016-20013 | libc6 | 2.39-0ubuntu8.9 | deb | pkg:deb/ubuntu/libc6@2.39-0ubuntu8.9?arch=amd64&distro=ubuntu-24.04&upstream=glibc | wont-fix | — |

The only scanner-reported available fix in this candidate is Kiota MessagePack 2.5.302 to 2.5.303 (Medium). Its remediation needs a supported, pinned Kiota toolchain change and fresh integration/scan proof; no package substitution is assumed safe. The other 39 rows report not-fixed or wont-fix. Evaluate upstream image updates and exposure individually before proposing any time-limited exception.
