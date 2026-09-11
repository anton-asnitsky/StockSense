# StockSense unit-to-story map

Date: 2026-09-10
Stage: Units Generation
Status: Draft for independent review

The map assigns every story from `../user-stories/stories.md` to a primary owning unit and every directly contributing unit. Unit IDs and directories resolve through `unit-of-work.md`; dependencies resolve through `unit-of-work-dependency.md`. The assignments reflect the owner-confirmed 13-unit decomposition.

## Story assignments

| Story | Title | Primary unit | Implementing units | Construction directories |
| --- | --- | --- | --- | --- |
| US1.1 | Local sign-in | U3 | U3, U11, U12 | `u3-identity-access`, `u11-web-bff`, `u12-web-application` |
| US1.2 | Google federation and safe linking | U3 | U3, U11, U12 | `u3-identity-access`, `u11-web-bff`, `u12-web-application` |
| US1.3 | Logout | U3 | U3, U11, U12 | `u3-identity-access`, `u11-web-bff`, `u12-web-application` |
| US1.4 | Retailer authorization | U4 | U3, U4, U11, U12 | `u3-identity-access`, `u4-retail-data`, `u11-web-bff`, `u12-web-application` |
| US1.5 | Persistent identity and keys | U3 | U3, U13 | `u3-identity-access`, `u13-demo-evidence` |
| US2.1 | Reproducible retail simulation | U13 | U4, U5, U13 | `u4-retail-data`, `u5-supplier-knowledge`, `u13-demo-evidence` |
| US2.2 | Validated inventory imports | U4 | U4, U10, U11, U12 | `u4-retail-data`, `u10-audit-evidence`, `u11-web-bff`, `u12-web-application` |
| US2.3 | Inventory and movement history | U4 | U4, U11, U12 | `u4-retail-data`, `u11-web-bff`, `u12-web-application` |
| US2.4 | Trustworthy cache behavior | U4 | U4, U11, U12 | `u4-retail-data`, `u11-web-bff`, `u12-web-application` |
| US2.5 | Import sales history | U4 | U4, U10, U11, U12 | `u4-retail-data`, `u10-audit-evidence`, `u11-web-bff`, `u12-web-application` |
| US3.1 | Supplier CSV offers | U5 | U4, U5, U11, U12 | `u4-retail-data`, `u5-supplier-knowledge`, `u11-web-bff`, `u12-web-application` |
| US3.2 | Supplier PDF evidence | U5 | U5, U11, U12 | `u5-supplier-knowledge`, `u11-web-bff`, `u12-web-application` |
| US3.3 | Accepted commercial terms | U5 | U4, U5, U10, U11, U12 | `u4-retail-data`, `u5-supplier-knowledge`, `u10-audit-evidence`, `u11-web-bff`, `u12-web-application` |
| US4.1 | Daily baseline forecast | U7 | U4, U6, U7 | `u4-retail-data`, `u6-model-lifecycle`, `u7-forecasting` |
| US4.2 | Versioned datasets and artifacts | U6 | U4, U6, U13 | `u4-retail-data`, `u6-model-lifecycle`, `u13-demo-evidence` |
| US4.3 | Evaluate forecast and inventory outcomes | U6 | U4, U6, U13 | `u4-retail-data`, `u6-model-lifecycle`, `u13-demo-evidence` |
| US4.4 | Tracked model training | U6 | U6, U13 | `u6-model-lifecycle`, `u13-demo-evidence` |
| US4.5 | Model promotion and rollback | U6 | U6, U10, U11, U12 | `u6-model-lifecycle`, `u10-audit-evidence`, `u11-web-bff`, `u12-web-application` |
| US4.6 | Forecast quality and freshness | U7 | U6, U7, U11, U12 | `u6-model-lifecycle`, `u7-forecasting`, `u11-web-bff`, `u12-web-application` |
| US4.7 | Evaluate inventory policy outcomes | U6 | U4, U5, U6, U13 | `u4-retail-data`, `u5-supplier-knowledge`, `u6-model-lifecycle`, `u13-demo-evidence` |
| US5.1 | Deterministic replenishment | U8 | U4, U5, U7, U8 | `u4-retail-data`, `u5-supplier-knowledge`, `u7-forecasting`, `u8-planning-purchasing` |
| US5.2 | Scheduled inventory review | U8 | U7, U8, U10 | `u7-forecasting`, `u8-planning-purchasing`, `u10-audit-evidence` |
| US5.3 | Compare buffer scenarios | U8 | U8, U11, U12 | `u8-planning-purchasing`, `u11-web-bff`, `u12-web-application` |
| US5.4 | Manual inventory review | U8 | U4, U8, U10, U11, U12 | `u4-retail-data`, `u8-planning-purchasing`, `u10-audit-evidence`, `u11-web-bff`, `u12-web-application` |
| US5.5 | Review status and allowance | U8 | U8, U11, U12 | `u8-planning-purchasing`, `u11-web-bff`, `u12-web-application` |
| US6.1 | Draft a purchase proposal | U8 | U8, U11, U12 | `u8-planning-purchasing`, `u11-web-bff`, `u12-web-application` |
| US6.2 | Submit a draft | U8 | U8, U10, U11, U12 | `u8-planning-purchasing`, `u10-audit-evidence`, `u11-web-bff`, `u12-web-application` |
| US6.3 | Approve or reject a proposal | U8 | U4, U8, U10, U11, U12 | `u4-retail-data`, `u8-planning-purchasing`, `u10-audit-evidence`, `u11-web-bff`, `u12-web-application` |
| US6.4 | Cancel before receipt | U8 | U8, U10, U11, U12 | `u8-planning-purchasing`, `u10-audit-evidence`, `u11-web-bff`, `u12-web-application` |
| US6.5 | Record partial receipt | U8 | U4, U8, U10, U11, U12 | `u4-retail-data`, `u8-planning-purchasing`, `u10-audit-evidence`, `u11-web-bff`, `u12-web-application` |
| US6.6 | Complete receipt | U8 | U4, U8, U10, U11, U12 | `u4-retail-data`, `u8-planning-purchasing`, `u10-audit-evidence`, `u11-web-bff`, `u12-web-application` |
| US7.1 | Local assistant inference | U9 | U9, U11, U12, U13 | `u9-assistant`, `u11-web-bff`, `u12-web-application`, `u13-demo-evidence` |
| US7.2 | Authorized retrieval | U5 | U4, U5, U9 | `u4-retail-data`, `u5-supplier-knowledge`, `u9-assistant` |
| US7.3 | Embedding comparison | U5 | U5, U9, U13 | `u5-supplier-knowledge`, `u9-assistant`, `u13-demo-evidence` |
| US7.4 | Bounded assistant conversation | U9 | U4, U9, U11, U12 | `u4-retail-data`, `u9-assistant`, `u11-web-bff`, `u12-web-application` |
| US7.5 | Agent evaluation and audit evidence | U9 | U9, U10, U13 | `u9-assistant`, `u10-audit-evidence`, `u13-demo-evidence` |
| US7.6 | Investigate inventory shortages | U9 | U4, U7, U8, U9, U11, U12 | `u4-retail-data`, `u7-forecasting`, `u8-planning-purchasing`, `u9-assistant`, `u11-web-bff`, `u12-web-application` |
| US7.7 | Compare suppliers conversationally | U9 | U5, U9, U11, U12 | `u5-supplier-knowledge`, `u9-assistant`, `u11-web-bff`, `u12-web-application` |
| US7.8 | Explain replenishment scenarios | U9 | U8, U9, U11, U12 | `u8-planning-purchasing`, `u9-assistant`, `u11-web-bff`, `u12-web-application` |
| US7.9 | Request review in conversation | U9 | U8, U9, U10, U11, U12 | `u8-planning-purchasing`, `u9-assistant`, `u10-audit-evidence`, `u11-web-bff`, `u12-web-application` |
| US7.10 | Draft a proposal conversationally | U9 | U8, U9, U10, U11, U12 | `u8-planning-purchasing`, `u9-assistant`, `u10-audit-evidence`, `u11-web-bff`, `u12-web-application` |
| US7.11 | Recover interrupted agent work | U9 | U9, U11, U12, U13 | `u9-assistant`, `u11-web-bff`, `u12-web-application`, `u13-demo-evidence` |
| US7.12 | Manage index lifecycle | U5 | U5, U9, U10 | `u5-supplier-knowledge`, `u9-assistant`, `u10-audit-evidence` |
| US8.1 | Build the application skeleton | U13 | U2, U3, U4, U5, U6, U7, U8, U9, U10, U11, U12, U13 | `u2-platform-infrastructure`, `u3-identity-access`, `u4-retail-data`, `u5-supplier-knowledge`, `u6-model-lifecycle`, `u7-forecasting`, `u8-planning-purchasing`, `u9-assistant`, `u10-audit-evidence`, `u11-web-bff`, `u12-web-application`, `u13-demo-evidence` |
| US8.2 | Validate integration contracts | U1 | U1, U2, U3, U4, U5, U6, U7, U8, U9, U10, U11, U12, U13 | `u1-contracts`, `u2-platform-infrastructure`, `u3-identity-access`, `u4-retail-data`, `u5-supplier-knowledge`, `u6-model-lifecycle`, `u7-forecasting`, `u8-planning-purchasing`, `u9-assistant`, `u10-audit-evidence`, `u11-web-bff`, `u12-web-application`, `u13-demo-evidence` |
| US8.3 | Provision local Kubernetes | U2 | U2, U3, U4, U5, U6, U7, U8, U9, U10, U11, U12, U13 | `u2-platform-infrastructure`, `u3-identity-access`, `u4-retail-data`, `u5-supplier-knowledge`, `u6-model-lifecycle`, `u7-forecasting`, `u8-planning-purchasing`, `u9-assistant`, `u10-audit-evidence`, `u11-web-bff`, `u12-web-application`, `u13-demo-evidence` |
| US8.4 | Provide scoped workload secrets | U2 | U2, U3, U4, U5, U9, U10, U13 | `u2-platform-infrastructure`, `u3-identity-access`, `u4-retail-data`, `u5-supplier-knowledge`, `u9-assistant`, `u10-audit-evidence`, `u13-demo-evidence` |
| US8.5 | Reliable asynchronous work | U1 | U1, U2, U4, U5, U6, U7, U8, U9, U10, U13 | `u1-contracts`, `u2-platform-infrastructure`, `u4-retail-data`, `u5-supplier-knowledge`, `u6-model-lifecycle`, `u7-forecasting`, `u8-planning-purchasing`, `u9-assistant`, `u10-audit-evidence`, `u13-demo-evidence` |
| US8.6 | Migrate IaC state | U2 | U2, U4, U13 | `u2-platform-infrastructure`, `u4-retail-data`, `u13-demo-evidence` |
| US8.7 | Check changes before integration | U2 | U1, U2, U11, U12, U13 | `u1-contracts`, `u2-platform-infrastructure`, `u11-web-bff`, `u12-web-application`, `u13-demo-evidence` |
| US8.8 | Deploy trusted revisions | U2 | U2, U10, U11, U12, U13 | `u2-platform-infrastructure`, `u10-audit-evidence`, `u11-web-bff`, `u12-web-application`, `u13-demo-evidence` |
| US9.1 | Atomic business audit | U10 | U4, U5, U6, U7, U8, U9, U10 | `u4-retail-data`, `u5-supplier-knowledge`, `u6-model-lifecycle`, `u7-forecasting`, `u8-planning-purchasing`, `u9-assistant`, `u10-audit-evidence` |
| US9.2 | Search authorized audit history | U10 | U4, U10, U11, U12 | `u4-retail-data`, `u10-audit-evidence`, `u11-web-bff`, `u12-web-application` |
| US9.3 | Investigate operational failures | U10 | U2, U10, U13 | `u2-platform-infrastructure`, `u10-audit-evidence`, `u13-demo-evidence` |
| US9.4 | Measure performance and capacity | U13 | U2, U10, U13 | `u2-platform-infrastructure`, `u10-audit-evidence`, `u13-demo-evidence` |
| US9.5 | Consistent retention | U10 | U2, U10, U13 | `u2-platform-infrastructure`, `u10-audit-evidence`, `u13-demo-evidence` |
| US9.6 | Restore the application | U13 | U2, U3, U4, U5, U6, U7, U8, U9, U10, U13 | `u2-platform-infrastructure`, `u3-identity-access`, `u4-retail-data`, `u5-supplier-knowledge`, `u6-model-lifecycle`, `u7-forecasting`, `u8-planning-purchasing`, `u9-assistant`, `u10-audit-evidence`, `u13-demo-evidence` |
| US9.7 | Rotate and recover credentials | U3 | U2, U3, U10, U13 | `u2-platform-infrastructure`, `u3-identity-access`, `u10-audit-evidence`, `u13-demo-evidence` |
| US9.8 | Extract one tenant | U4 | U2, U4, U10, U13 | `u2-platform-infrastructure`, `u4-retail-data`, `u10-audit-evidence`, `u13-demo-evidence` |
| US9.9 | Restore relational stores | U2 | U2, U3, U4, U7, U8, U10, U13 | `u2-platform-infrastructure`, `u3-identity-access`, `u4-retail-data`, `u7-forecasting`, `u8-planning-purchasing`, `u10-audit-evidence`, `u13-demo-evidence` |
| US9.10 | Restore documents and model artifacts | U2 | U2, U5, U6, U10, U13 | `u2-platform-infrastructure`, `u5-supplier-knowledge`, `u6-model-lifecycle`, `u10-audit-evidence`, `u13-demo-evidence` |
| US10.1 | Reproduce the reviewer journey | U13 | U2, U3, U4, U5, U7, U8, U9, U10, U11, U12, U13 | `u2-platform-infrastructure`, `u3-identity-access`, `u4-retail-data`, `u5-supplier-knowledge`, `u7-forecasting`, `u8-planning-purchasing`, `u9-assistant`, `u10-audit-evidence`, `u11-web-bff`, `u12-web-application`, `u13-demo-evidence` |
| US10.2 | Inspect portfolio evidence | U13 | U1, U2, U10, U11, U12, U13 | `u1-contracts`, `u2-platform-infrastructure`, `u10-audit-evidence`, `u11-web-bff`, `u12-web-application`, `u13-demo-evidence` |

## Cross-cutting story treatment

- Browser-facing stories map to U11 Web BFF and U12 Web Application in addition to the authoritative domain owner; server authorization and business invariants remain with the domain service.
- Contract validation and reliable-message stories map to U1 Contracts and each affected producer/consumer; U1 owns schemas while runtime units own behavior.
- Platform, recovery, secret, deployment, and measurement stories map to U2 Platform Infrastructure and U13 Demo Evidence where verification evidence is required.
- Audit stories map to U10 for projection/query behavior and to originating units where authoritative audit/outbox writes occur.
- Assistant flows map to U9 and every governed tool owner; U9 orchestrates but never acquires the authority of those services.

## Within-unit story order

These are local dependency orders inside each unit. They do not select a cross-unit delivery sequence.

| Unit | Within-unit order |
| --- | --- |
| U1 `contracts` | US8.2 → US8.5 → US8.7 → US10.2 |
| U2 `platform-infrastructure` | US8.1 → US8.2 → US8.3 → US8.4 → US8.5 → US8.6 → US8.7 → US8.8 → US9.3 → US9.4 → US9.5 → US9.6 → US9.7 → US9.8 → US9.9 → US9.10 → US10.1 → US10.2 |
| U3 `identity-access` | US1.1 → US1.2 → US1.3 → US1.4 → US1.5 → US8.1 → US8.2 → US8.3 → US8.4 → US9.6 → US9.7 → US9.9 → US10.1 |
| U4 `retail-data` | US1.4 → US2.1 → US2.2 → US2.3 → US2.4 → US2.5 → US3.1 → US3.3 → US4.1 → US4.2 → US4.3 → US4.7 → US5.1 → US5.4 → US6.3 → US6.5 → US6.6 → US7.2 → US7.4 → US7.6 → US8.1 → US8.2 → US8.3 → US8.4 → US8.5 → US8.6 → US9.1 → US9.2 → US9.6 → US9.8 → US9.9 → US10.1 |
| U5 `supplier-knowledge` | US2.1 → US3.1 → US3.2 → US3.3 → US4.7 → US5.1 → US7.2 → US7.3 → US7.7 → US7.12 → US8.1 → US8.2 → US8.3 → US8.4 → US8.5 → US9.1 → US9.6 → US9.10 → US10.1 |
| U6 `model-lifecycle` | US4.1 → US4.2 → US4.3 → US4.4 → US4.5 → US4.6 → US4.7 → US8.1 → US8.2 → US8.3 → US8.5 → US9.1 → US9.6 → US9.10 |
| U7 `forecasting` | US4.1 → US4.6 → US5.1 → US5.2 → US7.6 → US8.1 → US8.2 → US8.3 → US8.5 → US9.1 → US9.6 → US9.9 → US10.1 |
| U8 `planning-purchasing` | US5.1 → US5.2 → US5.3 → US5.4 → US5.5 → US6.1 → US6.2 → US6.3 → US6.4 → US6.5 → US6.6 → US7.6 → US7.8 → US7.9 → US7.10 → US8.1 → US8.2 → US8.3 → US8.5 → US9.1 → US9.6 → US9.9 → US10.1 |
| U9 `assistant` | US7.1 → US7.2 → US7.3 → US7.4 → US7.5 → US7.6 → US7.7 → US7.8 → US7.9 → US7.10 → US7.11 → US7.12 → US8.1 → US8.2 → US8.3 → US8.4 → US8.5 → US9.1 → US9.6 → US10.1 |
| U10 `audit-evidence` | US2.2 → US2.5 → US3.3 → US4.5 → US5.2 → US5.4 → US6.2 → US6.3 → US6.4 → US6.5 → US6.6 → US7.5 → US7.9 → US7.10 → US7.12 → US8.1 → US8.2 → US8.3 → US8.4 → US8.5 → US8.8 → US9.1 → US9.2 → US9.3 → US9.4 → US9.5 → US9.6 → US9.7 → US9.8 → US9.9 → US9.10 → US10.1 → US10.2 |
| U11 `web-bff` | US1.1 → US1.2 → US1.3 → US1.4 → US2.2 → US2.3 → US2.4 → US2.5 → US3.1 → US3.2 → US3.3 → US4.5 → US4.6 → US5.3 → US5.4 → US5.5 → US6.1 → US6.2 → US6.3 → US6.4 → US6.5 → US6.6 → US7.1 → US7.4 → US7.6 → US7.7 → US7.8 → US7.9 → US7.10 → US7.11 → US8.1 → US8.2 → US8.3 → US8.7 → US8.8 → US9.2 → US10.1 → US10.2 |
| U12 `web-application` | US1.1 → US1.2 → US1.3 → US1.4 → US2.2 → US2.3 → US2.4 → US2.5 → US3.1 → US3.2 → US3.3 → US4.5 → US4.6 → US5.3 → US5.4 → US5.5 → US6.1 → US6.2 → US6.3 → US6.4 → US6.5 → US6.6 → US7.1 → US7.4 → US7.6 → US7.7 → US7.8 → US7.9 → US7.10 → US7.11 → US8.1 → US8.2 → US8.3 → US8.7 → US8.8 → US9.2 → US10.1 → US10.2 |
| U13 `demo-evidence` | US1.5 → US2.1 → US4.2 → US4.3 → US4.4 → US4.7 → US7.1 → US7.3 → US7.5 → US7.11 → US8.1 → US8.2 → US8.3 → US8.4 → US8.5 → US8.6 → US8.7 → US8.8 → US9.3 → US9.4 → US9.5 → US9.6 → US9.7 → US9.8 → US9.9 → US9.10 → US10.1 → US10.2 |

## Coverage verification

- Upstream stories: 63
- Assigned stories: 63
- Unassigned stories: none
- Units without stories: none
- Duplicate story identifiers: none

| Unit | Mapped story count |
| --- | ---: |
| U1 `contracts` | 4 |
| U2 `platform-infrastructure` | 18 |
| U3 `identity-access` | 13 |
| U4 `retail-data` | 32 |
| U5 `supplier-knowledge` | 19 |
| U6 `model-lifecycle` | 14 |
| U7 `forecasting` | 13 |
| U8 `planning-purchasing` | 23 |
| U9 `assistant` | 20 |
| U10 `audit-evidence` | 33 |
| U11 `web-bff` | 38 |
| U12 `web-application` | 38 |
| U13 `demo-evidence` | 28 |
