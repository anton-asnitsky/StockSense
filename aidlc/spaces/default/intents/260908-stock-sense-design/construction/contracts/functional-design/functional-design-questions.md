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

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
