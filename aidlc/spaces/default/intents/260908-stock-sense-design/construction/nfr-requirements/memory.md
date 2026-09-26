<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->


2026-09-20T12:34:00Z — The 3 GiB/0.75 CPU U10/OpenSearch/Dashboards profile is subordinate to the 13 GiB/2.5 CPU whole-application quota; a failed whole-stack run requires a reduced pinned profile rather than more host capacity.
<!-- aidlc-wave-memory:audit-evidence:b109a5f53e8978da9240b5b13bd508dca4d94d42752712574b8a5988064e1667 -->

2026-09-20T12:34:00Z — Searchability targets and freshness states share one boundary model: 99% within five seconds, all healthy events within 30 seconds, Fresh below 30 seconds, Stale through five minutes, then Unavailable.
<!-- aidlc-wave-memory:audit-evidence:e01d39fe119d6589646d3f6229d33bc851f1473f963de90e205df3adb857dd58 -->

- 2026-09-20T14:31:00Z — HTTP 200 with typed complete/partial dashboard state supersedes the functional-design application-level 206 behavior; C18 must be versioned before generated clients consume it.
<!-- aidlc-wave-memory:web-bff:b82af32b9ce21479f360c71873d191a0e7e4a59fd675cbf0e3ebd5132142ea51 -->

- 2026-09-20T14:31:00Z — U10's accepted audit query bounds are inherited by U11 rather than independently selected: 90-day range, 50 default/200 maximum page, five filters, 1 MiB response, stable cursor, checkpoint, lag, and freshness state.
<!-- aidlc-wave-memory:web-bff:ec1285388d8e2ddbc9080f401760831d0edb8272dc46dce12c6ecb07f137afee -->

- 2026-09-20T14:31:00Z — The generic three-second provider read deadline is only an upper failure bound and does not replace inception NFR1's end-to-end below-one-second p95 target for ordinary inventory and purchasing reads; reviewer finding R-01 carries this requirement forward.
<!-- aidlc-wave-memory:web-bff:b00fad7c3f22287cc5428abd7d1aeca90153697a6b2a75b9abdcea5cfa1598d2 -->

2026-09-20T16:13:43Z — treated the inception one-second p95 objective as an end-to-end browser-to-provider target for ordinary inventory and purchasing reads, with private-route render and Core Web Vitals measured separately.
<!-- aidlc-wave-memory:web-application:08dd5d9d8bc07955fb042492fb35eccbd545ace16049c602d9f03407c9b3a316 -->

2026-09-20T16:13:43Z — treated the React client as an untrusted same-origin presentation tier: U11 owns browser authentication, U1 owns generated C18 types, and provider services remain authoritative for tenant access and business invariants.
<!-- aidlc-wave-memory:web-application:e805e0374af5b59b6622a21903bfc2c158773dbcec45651c9ec72334499cb281 -->

2026-09-20T16:13:43Z — interpreted UI-kind applicability to require performance, security, technology, and traceability artifacts while service-only scalability, reliability, and observability documents remain out of scope.
<!-- aidlc-wave-memory:web-application:42ac4bf319ca0e98b1fb3c3ad4ae1f5c1d049f0f26e5d3372f1b94c844a0e5d7 -->

2026-09-21T07:48:27Z — treated Demo Evidence as a verification and packaging unit that owns orchestration and evidence semantics but no infrastructure definition, business state, tenant authority, or provider behavior.
<!-- aidlc-wave-memory:demo-evidence:d0c9f4b8fb1798202982a2c34d4d3b10d00d98391fc3fa2f4da2676ede40711d -->

2026-09-21T07:48:27Z — separated the 90-minute clean setup objective, 45-minute post-download setup objective, 15-minute smoke tier, 45-minute full verification tier, and two-hour recovery drill so one timing claim cannot conceal another.
<!-- aidlc-wave-memory:demo-evidence:0435674e342a2552eab3e894b92a11a269d514381a56c18771c09751523476e2 -->

2026-09-21T07:48:27Z — interpreted the 16 GiB/3 CPU whole-cluster limit and 13 GiB/2.5 CPU application quota as measured acceptance boundaries rather than configured-request evidence.
<!-- aidlc-wave-memory:demo-evidence:71222d7fea1c09e6ae42124264277b58e911f08e12499111d101b01fd9237fb2 -->
## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->


2026-09-20T12:34:00Z — The independent advisory review completed only on its permitted retry; the first attempt wrote no terminal appendix.
<!-- aidlc-wave-memory:audit-evidence:cd4608b48a331da3879d2e8bed24a3494ad511d712143cf68ef43957af00293d -->

- 2026-09-20T14:31:00Z — NFR4 is N/A because U11 owns no PostgreSQL schema, role, or SQL path; routine-only persistence remains with data-owning services.
<!-- aidlc-wave-memory:web-bff:e37bc48ec68f037dee5c30484b94c62529ee59fa18cda1d129dda4bf2b90b81d -->

- 2026-09-20T14:31:00Z — NFR7 is N/A because U11 owns no RabbitMQ endpoint or durable integration state; HTTP/SSE does not replace provider-owned outbox, inbox, idempotency, or recovery.
<!-- aidlc-wave-memory:web-bff:2f4de0b1f478a783f37ad8a6783884055a4752dc91064b5ef1879ad5bde8d3ca -->

2026-09-20T16:13:43Z — disabled TanStack Query automatic request retries for all C18 calls; only separately governed operation polling and SSE reconnection may retry automatically.
<!-- aidlc-wave-memory:web-application:784ad3eb1a08c9eb4928d502cab0d4e16f1dc707c54004fb54829e8cb575892d -->

2026-09-20T16:13:43Z — excluded browser persistence, offline service workers, third-party analytics, direct service calls, and arbitrary model-rendered code from the Web Application design.
<!-- aidlc-wave-memory:web-application:0ae055c61d6e4a00bddca76a1599ce8dbb4d3ae0ae6d7f58e5a05232d25a6f16 -->

2026-09-21T07:48:27Z — replaced C19's three-state result assumption with the confirmed six-state model: passed, failed, limited, rejected, unavailable, and not-run.
<!-- aidlc-wave-memory:demo-evidence:83958f1b8339d6e01c12e402ef4f4e3a7ba84643639a08047c18c2c524c78fdf -->

2026-09-21T07:48:27Z — kept bulky traces, media, backups, models, and sensitive diagnostics outside Git while retaining checksums and explicit expired/unavailable manifest rows.
<!-- aidlc-wave-memory:demo-evidence:80a0ab2c63c4126eaa22c855f8ed4c9f41ffbb1becba5149d33fec8b13290e9f -->

2026-09-21T07:48:27Z — added a repository-local Node fallback for the AI-DLC review-brief tool because the native 2.8.0 dispatcher could not invoke the checked-in exported main function and the official update endpoint was unavailable.
<!-- aidlc-wave-memory:demo-evidence:40f05810d22d1a361cbe35b0234849e4f68e3971dedfce2505f33295a09391d4 -->
## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->


2026-09-20T12:34:00Z — The local OpenSearch profile uses one primary shard and no replica, favoring reproducible resource fit and tested rebuild/cutover over multi-node availability claims.
<!-- aidlc-wave-memory:audit-evidence:4cd51a778b8da014c0fe11c7f9b61190b96b7a27dfc167b56f385c3fb85fd3d7 -->

2026-09-20T12:34:00Z — Heavy replay, rebuild, retention, and recovery work is serialized to preserve interactive query targets and the fixed local resource envelope.
<!-- aidlc-wave-memory:audit-evidence:1cea98667985bcc55dea7fec8bb05cf1730dd46e0280ae8a68f951225c5ecc34 -->

- 2026-09-20T14:31:00Z — Redis remains intentionally disposable for browser sessions while 24-hour Vault-backed encrypted operation handles preserve provider reconciliation after Redis loss; users reauthenticate rather than restoring uncertain browser authority.
<!-- aidlc-wave-memory:web-bff:8794be6d82cb06d45031128177ed24f1355224241be1e32a1d1866acbcec96cd -->

- 2026-09-20T14:31:00Z — The one-replica local portfolio profile uses hard request, queue, upload, SSE, cache, and Redis bounds to protect the 13 GiB/2.5 CPU application quota; overflow is explicit instead of hidden in unbounded waiting.
<!-- aidlc-wave-memory:web-bff:b133be74a6d68a481a39a4d013b587e5e07cbb4783f86d1e08f12447cd3f9a39 -->

2026-09-20T16:13:43Z — accepted strict production gzip budgets and route-level splitting to keep the reviewer-local portfolio experience responsive, at the cost of tighter dependency and Ant Design import controls.
<!-- aidlc-wave-memory:web-application:98c59fffffa187357d0c6475859104f448971a4591d61be66fa78230c28113a9 -->

2026-09-20T16:13:43Z — accepted a rolling latest-browser support statement with Playwright Chromium, Firefox, and WebKit coverage; the review identified that explicit Edge execution is still needed to substantiate the two-version Edge claim.
<!-- aidlc-wave-memory:web-application:5d94df483c310452ef51deaea7b1750226b8532d3e34a73f44a763f4b30a5c43 -->

2026-09-20T16:13:43Z — accepted bounded, non-blocking browser telemetry so observability outages cannot stop safe user work, while preserving an observable loss counter and evidence of degraded telemetry.
<!-- aidlc-wave-memory:web-application:f7e2ec633f5fb6dec0a2736076f286e5b5f5c41f0be43e199b20582d4fed536b -->

2026-09-21T07:48:27Z — selected a Python 3.12 and uv evidence harness to reuse the portfolio's existing Python prerequisite and support cross-platform typed orchestration, accepting a small additional package surface.
<!-- aidlc-wave-memory:demo-evidence:3d3b800e18a8be767ef7d4e2709a459ef577cb6411e61e6096a2b51d830c95db -->

2026-09-21T07:48:27Z — allowed reviewer-selected validated local model profiles while retaining a CPU-capable Qwen proof path; reproducibility depends on recording the exact selected artifact, runtime, license, and checksum.
<!-- aidlc-wave-memory:demo-evidence:bc826c59fe4d5c2c79fd1211a93479b6c98e7afc5aea52d1282907eadccebeee -->

2026-09-21T07:48:27Z — distinguished trusted keyless CI signing from ephemeral local reviewer signing so clean local evidence remains tamper-evident without claiming release provenance.
<!-- aidlc-wave-memory:demo-evidence:b1755e377f53bb0e3face3dbe5ca54b709be6a52104c26d3ad324bb78103d51c -->
## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

2026-09-20T12:34:00Z — Reviewer R-01: refine C15 for producer security binding, digest and 64 KiB enforcement, selected retry/DLQ values, and compatibility overlap.
<!-- aidlc-wave-memory:audit-evidence:12310d95dfb9175c0e22683bbdbb7d650fb2fb3d1e93a2961d581cbd283cffa8 -->

2026-09-20T12:34:00Z — Reviewer R-02: refine C18 with bounded audit-query parameters, result fields, cursor rules, and Fresh/Stale/partial/Unavailable mappings.
<!-- aidlc-wave-memory:audit-evidence:e22370a566dd839edb5cd1222bd0b4df7e83830a84715d9e67f945a75d7336f7 -->

2026-09-20T12:34:00Z — Reviewer R-03: extend or losslessly encode C19 evidence outcomes for rejected, unavailable, and not-run.
<!-- aidlc-wave-memory:audit-evidence:f04f3afffbb65ad8806687db9333b20287984c8092dbc5d9dc3c9632b6acc7ba -->

2026-09-20T12:34:00Z — Reviewer R-04: choose numeric RabbitMQ queue, telemetry-buffer, and persistent-storage capacities with overflow and acceptance behavior.
<!-- aidlc-wave-memory:audit-evidence:59e9ebe204dc1a8b17f65a278c874ea5c961fc1bf0f6e640a48ae9ba38ffb182 -->

- 2026-09-20T14:31:00Z — Reviewer R-01: add an explicit end-to-end below-one-second p95 acceptance mix for ordinary inventory and purchasing reads before implementation, or obtain an upstream NFR1 change.
<!-- aidlc-wave-memory:web-bff:4c50d9f00eac86c6f67f8245d508f1c5fbe2935d7538a6e01e3d95f944e9107c -->

- 2026-09-20T14:31:00Z — Reviewer R-02: distinguish telemetry configuration/instrumentation readiness from exporter or OpenSearch availability and define degraded probe/serving behavior.
<!-- aidlc-wave-memory:web-bff:19a4c7c304b745d54a51e85afabc05dbf892a1bf208835e6f42f66c4f3338fd6 -->

- 2026-09-20T14:31:00Z — Reviewer R-03: revise and version C16-C18 with the callback, typed dashboard, operation-handle/status, SSE/snapshot, error, and resilience-isolation schemas before generated-client implementation.
<!-- aidlc-wave-memory:web-bff:085b8bfdb00dbfcbc9b61a695859abe3cdd7cfb80b2b83b53a087599f3c7ed28 -->

2026-09-20T16:13:43Z — C18 must define browser-safe CSRF bootstrap and rotation plus CSRF and applicable idempotency semantics for every mutating endpoint, including manual review and assistant turns.
<!-- aidlc-wave-memory:web-application:777b3035b72bf17dffe8a9459ab86899379eba25b91e7aba4ed8599590897e1d -->

2026-09-20T16:13:43Z — C18 must replace dashboard HTTP 206 semantics with the accepted typed HTTP 200 aggregate/section state and add the missing operation, SSE/snapshot, audit, evidence, and purchasing surfaces before U12 feature implementation.
<!-- aidlc-wave-memory:web-application:d0f954ea8666360dc67d8909ffec0b79fd52e365e29a5eed00336109528d6306 -->

2026-09-20T16:13:43Z — the next design pass must allocate and measure U12's Kubernetes resource contribution within the 16 GiB and 3 CPU local cluster envelope rather than treating bundle/cache limits as complete NFR2 coverage.
<!-- aidlc-wave-memory:web-application:8f62fe1d7e749dc71c5b8ad9ddbaab515ae8309ddf5e979c988abb851338140d -->

2026-09-21T07:48:27Z — clarify measurable U13 evidence for persistent Vault, workload-scoped access, VSO synchronization, and consumer credential reload/rotation before code generation.
<!-- aidlc-wave-memory:demo-evidence:452a9e41af4a9498620727ed3cb7dec0d16a7d1f3e99c9ad930c299361cb2964 -->

2026-09-21T07:48:27Z — resolve C15 retry count under its owning contract and have U13 consume that versioned value instead of fixing five attempts independently.
<!-- aidlc-wave-memory:demo-evidence:977024dc48b953ef1845e8292a8769f3729a9804e989ebe8ae61d0b51e839330 -->

2026-09-21T07:48:27Z — reconcile C19 semantic ownership by U13, canonical packaging/validation by U1, and the missing U1-to-U13 prerequisite before implementing the six-state schema.
<!-- aidlc-wave-memory:demo-evidence:f5cdd5ef329ddea1ef808bc9d856577d3fb4f85099d6ff5d7527cb7900c30bbe -->
