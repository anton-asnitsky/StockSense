# StockSense contracts functional-design questions

Date: 2026-09-11
Stage: Functional Design
Unit: contracts
Status: Confirmed

These questions close the implementation choices left open for the Contracts unit. The approved design already fixes OpenAPI 3.1.x, AsyncAPI 3.0.0, JSON Schema 2020-12, provider-owned semantics, canonical packaging by the Contracts unit, provider-separated specifications, RFC 9457 errors, strict tenant authority, and at-least-once RabbitMQ delivery. The choices below do not reopen those decisions.

## Interaction mode

How would you like to complete these questions?

- A. Guide me through each question (Recommended)
- B. I will edit this file directly
- C. Answer all questions in chat
- X. Other (please specify)

[Answer]: A. Guide me through each question (Recommended)

## Q1. Contract validation and compatibility toolchain

Which toolchain should the repository pin for canonical contract validation and breaking-change checks?

- A. Redocly CLI for OpenAPI linting and bundling, AsyncAPI CLI for AsyncAPI validation and diffing, Ajv 8 with `ajv-formats` for JSON Schema and example validation, and `oasdiff` for OpenAPI breaking-change checks; pin exact versions in repository manifests (Recommended)
- B. Redocly CLI for both OpenAPI and AsyncAPI linting, AsyncAPI CLI for AsyncAPI diffing, and Ajv for shared schema validation; omit a separate OpenAPI compatibility checker
- C. OpenAPI Generator and AsyncAPI Generator as the central validation stack, supplemented only where their validation is insufficient
- X. Other (please specify)

[Answer]: A. Redocly CLI for OpenAPI linting and bundling, AsyncAPI CLI for AsyncAPI validation and diffing, Ajv 8 with `ajv-formats` for JSON Schema and example validation, and `oasdiff` for OpenAPI breaking-change checks; pin exact versions in repository manifests (Recommended)

Pinned baseline selected for the first contract package: OpenAPI 3.1.2, AsyncAPI 3.0.0, JSON Schema 2020-12, `@redocly/cli` 2.51.2, `@asyncapi/cli` 6.0.2, Ajv 8.20.0, `ajv-formats` 3.0.1, and `oasdiff` 1.28.0. Repository manifests and installation checks must use exact versions rather than floating tags.

References: [Redocly CLI lint](https://redocly.com/docs/cli/commands/lint), [AsyncAPI CLI usage](https://www.asyncapi.com/docs/tools/cli/usage), [Ajv JSON Schema support](https://ajv.js.org/json-schema.html), and [`oasdiff` breaking-change checks](https://github.com/oasdiff/oasdiff/blob/main/docs/BREAKING-CHANGES.md).

## Q2. Typed client and message-model generation

How should consumer-local typed clients and message models be generated from the canonical specifications?

- A. Use Kiota for service clients, `openapi-typescript` for browser/BFF TypeScript types, and AsyncAPI CLI generators for message models; keep generated outputs consumer-local and avoid a shared runtime contract library (Recommended)
- B. Use Kiota for every supported OpenAPI consumer and AsyncAPI CLI generators for message models, including browser-facing TypeScript
- C. Use OpenAPI Generator and AsyncAPI Generator for all languages and consumers
- X. Other (please specify)

[Answer]: A. Use Kiota for service clients, `openapi-typescript` for browser/BFF TypeScript types, and AsyncAPI CLI generators for message models; keep generated outputs consumer-local and avoid a shared runtime contract library (Recommended)

Pinned generator baseline: Kiota 1.35.0, `openapi-typescript` 7.13.0, and `@asyncapi/cli` 6.0.2. Generated outputs must record the generator and version that produced them.

References: [Microsoft Kiota overview](https://learn.microsoft.com/en-us/openapi/kiota/overview) and [`openapi-typescript` introduction](https://openapi-ts.dev/introduction).

## Q3. Generated artifact policy

Which generated files should be tracked, and how should drift be detected?

- A. Track canonical specifications, examples, and generator configuration; track generated outputs only inside consumers that compile them, mark them as generated, prohibit manual edits, and make CI regenerate and fail on drift (Recommended)
- B. Track no generated outputs; generate every client and model during each local and CI build
- C. Track every generated client and model in one central Contracts package for all consumers
- X. Other (please specify)

[Answer]: A. Track canonical specifications, examples, and generator configuration; track generated outputs only inside consumers that compile them, mark them as generated, prohibit manual edits, and make CI regenerate and fail on drift (Recommended)

## Q4. Compatibility comparison baseline

What baseline should each change use for breaking-change detection across story, Bolt, and release branches?

- A. A story branch compares with its Bolt integration branch, a Bolt pull request compares with `main`, and a release compares with the latest release tag; an intentional breaking change requires an explicit approved major-version exception (Recommended)
- B. Every branch compares only with `main`
- C. Every branch compares only with the latest release tag
- X. Other (please specify)

[Answer]: A. A story branch compares with its Bolt integration branch, a Bolt pull request compares with `main`, and a release compares with the latest release tag; an intentional breaking change requires an explicit approved major-version exception (Recommended)

## Q5. Initial representative asynchronous fixture

US8.2 requires an initial job/event fixture, while the walking skeleton requires RabbitMQ audit propagation. Which minimum fixture should establish the reusable AsyncAPI validation capability?

- A. Include an inventory-import job lifecycle (`requested`, `completed`, and `failed`) plus one immutable authoritative inventory-import audit event using the common envelope; later stories add their own messages before acceptance (Recommended)
- B. Include only the inventory-import job lifecycle and defer authoritative audit-event validation to the audit story
- C. Include only one authoritative inventory-import audit event and defer job lifecycle messages to the import story
- X. Other (please specify)

[Answer]: A. Include an inventory-import job lifecycle (`requested`, `completed`, and `failed`) plus one immutable authoritative inventory-import audit event using the common envelope; later stories add their own messages before acceptance (Recommended)

## Ambiguity Scan

The selected answers are mutually consistent with the approved Contract Design and walking-skeleton scope. Validation responsibilities do not overlap ambiguously: Redocly owns OpenAPI linting and bundling, `oasdiff` owns OpenAPI compatibility checks, AsyncAPI CLI owns AsyncAPI validation and diffing, and Ajv owns JSON Schema and concrete-example validation. Generated outputs remain consumer-local, while the Contracts unit owns canonical inputs and governance. The comparison baseline follows the actual Git integration path. The initial message fixture covers both job lifecycle and authoritative audit propagation without claiming release-wide message coverage.

## Consolidated Summary

- **Validation toolchain:** Use OpenAPI 3.1.2, AsyncAPI 3.0.0, and JSON Schema 2020-12. Pin `@redocly/cli` 2.51.2 for OpenAPI linting and bundling, `@asyncapi/cli` 6.0.2 for AsyncAPI validation and diffing, Ajv 8.20.0 with `ajv-formats` 3.0.1 for JSON Schema and example validation, and `oasdiff` 1.28.0 for OpenAPI breaking-change detection.
- **Typed generation:** Pin Kiota 1.35.0 for service clients, `openapi-typescript` 7.13.0 for browser/BFF TypeScript types, and `@asyncapi/cli` 6.0.2 for message models. Generated outputs live with their consumers, record their generator version, and create no shared runtime contract library.
- **Generated artifacts:** Track canonical specifications, examples, and generator configuration. Track generated code only where a consumer compiles it, mark it as generated, prohibit manual edits, and have CI regenerate and fail on drift.
- **Compatibility baseline:** Story branches compare with their Bolt integration branch, Bolt pull requests compare with `main`, and releases compare with the latest release tag. An intentional breaking change requires an explicitly approved major-version exception.
- **Initial asynchronous fixture:** Validate the `inventory-import.requested`, `inventory-import.completed`, and `inventory-import.failed` lifecycle plus one immutable authoritative inventory-import audit event using the common envelope. Each later messaging story remains responsible for adding and passing its own contracts.

## Historical Consolidated Summary Confirmation (2026-09-11)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct

## Current summary for Construction re-entry (2026-09-24)

The previous Q1-Q5 answers remain the selected implementation choices: pinned Redocly, AsyncAPI CLI, Ajv, `oasdiff`, Kiota, and `openapi-typescript`; consumer-local generated outputs; story/Bolt/release compatibility baselines; and the initial inventory-import lifecycle plus authoritative audit fixture. The approved Contract Design and Delivery Plan add these requirements to the Contracts unit's functional design:

- **C01 package governance:** A walking-skeleton `candidate` may cover the boundaries it delivers, but every listed canonical OpenAPI, AsyncAPI, JSON Schema, and governed sidecar must identify its owner, C01-C27 boundary IDs, semantic version, package path, `sha256:` content digest, and immutable Git `sourceRevision` where the contract requires it. The fixed policy validates required canonical kinds and sidecars; a `release` covers exactly C01-C27, includes generated-output manifests for declared consumers and actual compatibility, validation, and evidence results, and is reconstructed from its source revision before publication. Generated runtime code remains consumer-local.
- **C24 bootstrap validation:** U1 validates the provider-owned Identity Access and Tenant Directory OpenAPI documents, required `X-Correlation-ID` and `Idempotency-Key` headers, durable typed `200` result, typed RFC 9457 `401`/`403`/`409`/`422`/`503` problems, and the approved positive/negative fixtures. The fixtures include checkpoint matching, late prepare after abort, idempotency conflict, and `RECOVERY_PERSISTENCE_UNAVAILABLE` when a durable result cannot be committed. U3/U4 own runtime participant behavior; U15 owns coordination. A participant `200` does not prove whole-run recovery success.
- **Delivery timing:** The thin C01 candidate supports Bolt 1; the full release package and C24 provider/consumer conformance are Bolt 2 acceptance work; Bolt 7 reruns those checks against a pinned clean-room revision. The seven-Bolt order and one-story-per-branch rule are unchanged.

The existing Contracts functional-design files are draft inputs for reconciliation after this checkpoint. Their earlier review appendix is historical and will require a fresh review before an approval gate.

## Reconciliation with approved Contract Design (2026-09-25)

The prior Q1-Q5 choices and C01/C24 summary remain affirmed. The new Contract Design approval changes only the U1 validation and evidence obligations below; U1 still owns canonical contracts, not runtime authorization, audit persistence, broker adapters, or UI behavior:

- **C01/C15 closed audit profiles:** Validate distinct tenant and retailerless global identity-audit envelopes and routes. A retailerless U3 security outcome must not acquire fabricated retailer or placement fields or leak into a tenant query. The global profile includes redacted pre-login denials; its examples and negative fixtures remain separate from tenant event examples.
- **C22/C23 bootstrap publishers:** Validate U3 and U4 service-owned publisher profiles against every applicable versioned C22 fixture and record their separate U13 evidence. U14's .NET/Python package is validated for its approved consumers, including U10 consumption, but U3/U4 do not depend on U14 to publish bootstrap audit events.
- **C02/C17/C18 global read boundary:** Validate the provider-owned revocable human platform-Operator grant/current-check operation, U10's distinct delegated-human global audit query with a live U3 grant check per page, and U11/U12's separate no-store platform view. Negative fixtures cover retailer-only Operators, machine callers, revoked grants, invalid token audience/client/scope, unavailable grant checks, and leakage through tenant routes.
- **Delivery and evidence:** Bolt 1 includes the thin candidate contracts for the audited path; Bolt 2 requires the applicable U3/U4 publisher conformance, U13 results, and global-read boundary checks; Bolt 7 reruns them against the pinned clean-room revision. The approved seven-Bolt order is unchanged.

The existing draft Contracts functional-design files still carry an earlier NOT-READY review with four findings. After this confirmation, those files must be reconciled with these contract changes and the review findings before any Functional Design gate is opened.

## Historical Consolidated Summary Confirmation (C01/C15/C17/C18/C22/C23)

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct

## Consolidated Summary Confirmation

The earlier Q1-Q5 choices remain unchanged: pinned validators and generators, consumer-local generated outputs, branch-specific compatibility baselines, and the initial inventory-import message fixture. The approved C07/C10/C13 Contract Design and Delivery Plan add these U1-owned acceptance obligations:

- Package the versioned `model_lifecycle.finalize_heavy_work_v1` EXECUTE-only shared-transaction signature as C07's canonical typed sidecar, with its named U5/U7 caller roles and positive/negative conformance fixtures. U1 validates the contract and evidence; U6 owns the routine, lease, fence and pin, while U5/U7 own their publication transactions.
- Validate C07 fixtures for immutable run/pin/request/first-attempt/first-lease binding, a distinct retry attempt only after terminal/fenced proof, same-transaction owner publication and U6 pin closure, exact replay versus changed-payload conflict, and failures or crashes before and after commit. Include pin-admission/drain exclusion, atomic evaluation-lease completion with promotion/rollback, and central-slot reconciliation only after retailer-local terminal proof.
- Publish and validate C10's typed `ForecastRunHistoryResponse` and C10/C13 bounded distinct product-set schemas and examples. Covered and unavailable products form an exact partition; unavailable products carry reasons and only covered products have 28 dated values. Stale, unpublished and failed outcomes remain explicit.
- Include these canonical documents, generated-output manifests, fixtures and their real validation results in the source-bound C01 release package by Bolt 2. U6/U7 producer-consumer conformance closes in Bolt 4, and U13 reruns the assembled evidence in Bolt 7. The seven-Bolt sequence and U1's non-runtime ownership remain unchanged.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
