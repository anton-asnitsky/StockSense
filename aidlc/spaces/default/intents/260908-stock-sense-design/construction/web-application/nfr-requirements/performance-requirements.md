# Web Application Performance Requirements

Unit: U12 Web Application (`web-application`)

## Scope

These targets cover the production React/Vite browser application running
against the warmed local Kubernetes stack. API latency, browser rendering,
bundle delivery, and interaction responsiveness are reported separately so a
passing aggregate cannot hide a slow BFF, oversized client, or blocked main
thread. Cold cluster startup, dependency installation, model generation, and
downloads are measured separately.

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR1.1 | Under five concurrent local users, ordinary inventory and purchasing C18 reads shall complete below one second p95 end to end through normal U12 session bootstrap, U11 authentication/authorization, and provider response. | Fix the seeded data, route/read mix, cache state, hardware, pod resources, browser/build versions, sample count, and duration before the run. Execute at least five minutes and 500 measured requests and publish p50/p95/p99, errors, and separated browser, BFF, authorization, and provider time. | Mark the affected journey failed or limited and render the declared stale/unavailable/failed state; do not omit authentication or use an owner-machine cache to claim a pass. |
| NFR1.2 | When NFR1.1 is met, private-route main content shall render within 1.5 seconds p95 after navigation. Core routes shall achieve LCP at or below 2.5 seconds p75, INP at or below 200 ms p75, and CLS at or below 0.1 p75. | Run at least 30 measured journeys per core route and viewport after warm-up in the accepted browser matrix. Record route, aggregate state, Web Vitals, long tasks, layout shifts, network waterfall, build revision, and throttling state. | Preserve a usable loading or degraded state, identify the failing route/chunk/interaction, and block the release claim until the target passes or is reported as limited. |
| NFR1.3 | Upload progress shall render at most four times per second and announce meaningful progress no more often than each 10% or five seconds. Operation polling starts at one second and backs off to five seconds. SSE expects 15-second keepalives, treats 45 seconds of silence as disconnected, and after approximately 1/2/5-second jittered reconnects stops at five attempts or 30 seconds before requesting a bounded snapshot. | Browser tests exercise slow upload, bursty progress, hidden/visible tabs, disconnect, duplicate/out-of-order event, cursor resume, five-minute cursor expiry, snapshot fallback, and screen-reader announcements. | Stop noisy announcements and duplicate rendering, preserve the operation identity, and show explicit reconnecting/snapshot/unavailable state; never create a second upload, command, or assistant turn. |
| NFR1.4 | Automatic TanStack Query request retries shall be disabled. Ordinary failed reads expose an explicit user retry; only the separately governed polling and SSE loops run automatically. Mutation, upload admission, session/authority, and uncertain-command requests are never replayed automatically. | Network and timeout tests count browser and BFF requests for safe reads, authentication, commands, uploads, polls, and streams and prove no multiplicative retry or duplicate side effect. | Render the typed failure or uncertainty state and require a deliberate user action or authorized reconciliation path. |
| NFR2.1 | Production gzip output shall not exceed 300 KiB JavaScript for the public/authentication entry, 75 KiB CSS, 600 KiB cumulative JavaScript for the first authenticated dashboard, or 250 KiB for any lazy feature chunk. Source maps are protected build artifacts and are not served publicly. | A deterministic bundle report attributes every package and generated-client contribution, verifies route-level splitting and selective Ant Design/icon imports, and fails CI at the absolute boundary. Test boundary changes against a clean production build. | Block CI and release; do not hide payload in an eagerly prefetched route, inline data, remote CDN, or unmeasured runtime download. |
| NFR2.2 | Private server state shall remain memory-only. Session/authority resources and mutations use zero stale time; ordinary reads may use 15 seconds stale time and five minutes garbage collection only with source version and observation time visible. One tab retains at most 250 private query entries and an estimated 25 MiB serialized payload. | Cache instrumentation and a 30-minute journey exercise dashboard, tables, purchasing, assistant, audit, route changes, logout, `401`, and retailer/session-generation changes. Evidence records peak entries/payload, cancellations, evictions, heap trend, and complete purge. | Evict eligible ordinary reads before either ceiling, render a refetch state, and purge all private state on the declared security transitions; never persist or evict authority into an unsafe fallback. |
| NFR2.3 | U12 static delivery shall run as one fixed replica requesting 64 MiB/0.02 CPU and limited to 128 MiB/0.10 CPU, with no application HPA in the local acceptance profile. Its asset-serving container, ingress buffers, temporary files, and logs shall remain within those limits while five sessions execute the NFR1 journeys, two uploads, and 20 assistant SSE streams. The complete measured cluster shall remain within the approved 16 GiB RAM and 3 CPU host envelope and 13 GiB/2.5 CPU application quota. | Run the combined browser profile for at least ten minutes from a production build. Record U12 and whole-cluster CPU/RAM/storage, ingress/static-server connections and buffers, throttling, restarts, request latency, and every other workload limit. Configuration inspection proves one replica, fixed requests/limits, read-only content, bounded temporary storage, and no autoscaling. Any U12 or whole-stack limit breach fails acceptance. | Apply bounded connection/backpressure behavior or return explicit unavailable status; never add replicas/resources, spill private content to disk, or rely on unrecorded host capacity to pass. |
| NFR11.1 | A clean reviewer shall reproduce the U12 build, browser matrix, bundle checks, and complete local journey within 30 minutes without owner credentials, pre-existing package caches, required GPU, or external API access. | From a clean checkout, use pinned Node/package-manager/dependency versions and lockfile integrity, build deterministic assets, deploy through the same-origin Kubernetes ingress, and record commands, versions, checksums, elapsed time, and limitations. | Mark reproducibility failed; the development server or owner-machine state cannot substitute for the production build and deployed path. |

## Measurement controls

- Use production mode, the generated C18 client for the accepted contract
  version, deterministic seed data, and a clean browser profile.
- Capture performance at 360x800, 768x1024, and 1440x900 and record the exact
  browser versions resolved by the rolling support matrix.
- Separate cold asset load, warm navigation, API response, render/commit, and
  user-input delay. Do not compare unlike cache or throttling states.
- Preserve raw traces, bundle manifests, screenshots where safe, and tool output
  as checksummed revision-bound evidence.

## Limitations

These targets demonstrate the local five-user portfolio profile. They are not
a public-service capacity claim, a universal device guarantee, or a production
availability SLA.
