# StockSense Contracts NFR Requirements Questions

Date: 2026-09-17
Stage: NFR Requirements
Unit: contracts
Status: In progress

The approved Functional Design already fixes OpenAPI 3.1.2, AsyncAPI 3.0.0,
JSON Schema 2020-12, the validator and generator families, exact-version pinning,
consumer-local generation, compatibility baselines, and the initial fixtures.
These questions define the remaining security and supply-chain requirements
without reopening those choices.

## Interaction mode

Continue with the established guided-question workflow.

- A. Guide me through each question (Recommended)
- B. I will edit this file directly
- C. Answer all questions in chat
- X. Other (please specify)

[Answer]: A. Guide me through each question (Recommended)

## Q1. Contract-package integrity evidence

How should a reviewer verify that a published contract package and its generated
outputs came from the declared repository revision?

- A. Produce a SHA-256 manifest and GitHub artifact attestation for release packages; bind generator/version/source digests in the manifest and verify all of them before use (Recommended)
- B. Produce a SHA-256 manifest only; rely on Git history and protected releases for provenance
- C. Rely on immutable Git tags and package-manager lockfiles without a separate package manifest
- X. Other (please specify)

[Answer]: A. Produce a SHA-256 manifest and GitHub artifact attestation for release packages; bind generator/version/source digests in the manifest and verify all of them before use (Recommended)

## Q2. Contract toolchain security gate

What security threshold should apply to contract validation and generation tools?

- A. Generate an SBOM, fail on detected secrets and known Critical/High vulnerabilities with a fix available, and require a time-bounded recorded exception for anything accepted (Recommended)
- B. Fail only on Critical vulnerabilities and detected secrets; report High findings without blocking
- C. Report dependency vulnerabilities and secrets without making them a merge gate
- X. Other (please specify)

[Answer]: A. Generate an SBOM, fail on detected secrets and known Critical/High vulnerabilities with a fix available, and require a time-bounded recorded exception for anything accepted (Recommended)

## Q3. Untrusted contract validation

How should contract checks handle schemas and examples submitted by an untrusted
public pull request?

- A. Run on GitHub-hosted runners without deployment secrets, vendor or allowlist external references, disable arbitrary generator hooks, and publish only sanitized diagnostics (Recommended)
- B. Permit read-only network resolution of any external schema reference while withholding all secrets
- C. Run the same checks on the self-hosted deployment runner for faster access to cached tools
- X. Other (please specify)

[Answer]: A. Run on GitHub-hosted runners without deployment secrets, vendor or allowlist external references, disable arbitrary generator hooks, and publish only sanitized diagnostics (Recommended)

## Ambiguity Scan

The selected controls are mutually consistent. Package provenance is bound to
the repository revision and exact generator inputs through digests and an
attestation. The SBOM and vulnerability gate apply to the tools that create and
validate those packages. Untrusted pull requests can execute the same semantic
checks without deployment credentials or unrestricted schema resolution. A
time-bounded exception is evidence, not a silent bypass, and cannot authorize a
release package whose digest or attestation fails verification.

## Consolidated Summary

- **Integrity and provenance:** Every released contract package includes a
  SHA-256 manifest and GitHub artifact attestation. The manifest binds the Git
  revision, canonical source digests, generator identities and versions,
  configuration digests, and generated-output digests. Consumers verify the
  manifest and attestation before using a release package.
- **Toolchain security:** Contract validation and generation produce an SBOM and
  fail when secret scanning finds a credential or dependency scanning finds a
  known Critical or High vulnerability with a fix available. Any accepted
  exception identifies the finding, rationale, owner, scope, and expiry.
- **Untrusted validation:** Public pull-request checks run on GitHub-hosted
  runners without deployment secrets. External references are vendored or
  allowlisted and integrity-pinned, arbitrary generator hooks are disabled, and
  diagnostics are sanitized before publication. The self-hosted deployment
  runner never executes this code.
- **Inherited decisions:** OpenAPI 3.1.2, AsyncAPI 3.0.0, JSON Schema 2020-12,
  Redocly CLI, AsyncAPI CLI, Ajv, `oasdiff`, Kiota, and
  `openapi-typescript` remain exactly pinned as confirmed in Functional Design.
  Generated outputs remain consumer-local and CI detects drift.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct
