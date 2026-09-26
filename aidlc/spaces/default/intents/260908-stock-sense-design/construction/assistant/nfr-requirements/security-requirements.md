# Assistant Security Requirements

Unit: U9 Assistant (`assistant`)

## Authority and trust boundary

Assistant owns conversations, turns, summaries, generation attempts, typed tool
orchestration, citations, action drafts, GenUI descriptions, reconciliation,
and evaluation evidence. Owning domain services remain authoritative for
identity, retailer placement, inventory, supplier terms and source evidence,
forecasts, replenishment, manual-review allowance, and purchase Drafts. User
content, retrieved text, model output, summaries, caches, and GenUI data are
untrusted and never grant authority or define routes.

## Requirements

| ID | Requirement | Acceptance and evidence | Failure behavior |
| --- | --- | --- | --- |
| NFR3.1 | Every conversation start, turn, stream resume, tool call, citation open, confirmation, retry, reconciliation, evaluation, retention action, and restore shall revalidate current actor, retailer membership/role, placement generation, conversation ownership, resource ownership, tool/action scope, and contract version at BFF/API, message, routine, cache, provider, and domain-tool boundaries. | Negative tests cover missing context, actor/retailer/conversation/turn/tool/citation/action substitution, revoked membership, role change, stale placement, pooled context, wrong audience/scope, forged expected version, and foreign correlation or idempotency identity. | Deny with stable safe errors and no foreign existence, content, timing-sensitive detail, queue position, evidence, or business effect. |
| NFR3.2 | The server-owned registry shall allow only typed read tools plus manual-review request and purchase-Draft create/edit operations. Actor, retailer, role, placement, collection/index route, hidden parameters, expected versions, and idempotency context shall come from server state. The Assistant shall never submit, approve, reject, cancel, receive, dispatch, or calculate an authoritative purchase quantity. | Tests cover invented tool names, argument smuggling, schema bypass, indirect prompt injection, encoded instructions in retrieved content, assistant Draft submission, approval/cancellation/receipt attempts, route/index substitution, and model claims of successful authority. | Reject before invocation, preserve the turn as limited/failed as applicable, and record safe policy evidence without executing a fallback or broader tool. |
| NFR3.3 | Material inventory, demand, accepted-term, forecast, recommendation, scenario, allowance, and Draft claims shall resolve to exact retained authorized versions. Retrieval shall return at most eight chunks and final output at most ten citations from three documents. Mixed/stale/deleted/expired sources, missing locators, fabricated links, unsupported claims, and citation-to-claim mismatch shall fail validation. | Evaluation fixtures substitute document, revision, chunk, page, index/model version, retailer, product, and citation/claim links; they test source deletion/expiry, index rebuild, conflicting evidence, and citation reopening under revoked authority. | Remove or explicitly qualify the unsupported claim, return unavailable/insufficient evidence, and never substitute model knowledge or a similar/newer source silently. |
| NFR4.1 | PostgreSQL application access shall invoke parameterized U9-owned stored procedures/functions only through the pinned persistence driver. Runtime roles shall have no direct table DML/DDL, arbitrary SQL, migration rights, RLS bypass, cross-unit schema access, or audit update/delete privilege; Flyway uses separate migration credentials. | Static, grant, integration, pooled-connection, routine-input, migration, and tenant-extraction tests prove only approved routines are executable and every persistence operation carries tenant/placement context. | Fail the operation or readiness check and never retry with broader credentials or direct SQL. |
| NFR5.1 | Browser traffic shall arrive through the BFF OIDC session with authorization code/PKCE, secure HttpOnly cookies, server-side tokens, and CSRF protection. Assistant-to-domain and worker/provider calls use narrow issuer, audience, scope, retailer, operation, conversation/turn, and job claims; no machine token inherits a human purchasing role. | Tests cover invalid callbacks, expired/revoked sessions, missing/forged CSRF, wrong audience/scope, direct browser domain access, worker/provider impersonation, confirmation by another actor, and machine-to-human escalation. | Deny and preserve conversation, invocation, action draft, allowance, Draft, audit, and outbox state. |
| NFR6.1 | HTTP, PostgreSQL, RabbitMQ, Redis, local-provider, optional Bedrock, and object/source access shall use TLS 1.2 or later where networked, with validated service identity. Persistent volumes, backups, cached state when persisted, and evaluation exports shall be encrypted. Distinct least-privilege credentials shall use Vault/VSO with tested reload/rotation/revocation; Bedrock credentials and spend policy are absent unless explicitly enabled. | Reject plaintext, untrusted/expired/wrong-name certificates and foreign identities. Secret scans, RBAC/mount tests, canaries, rotation/restart, provider-enable/disable, backup, and clean-restore tests prove isolation and fail-closed behavior. | Keep the capability unready, deny provider/tool access, rotate suspected exposure, and never downgrade transport or activate an external provider automatically. |
| NFR8.1 | REST boundaries shall use OpenAPI 3.1, asynchronous turn/audit events AsyncAPI 3.0, and provider/GenUI/evaluation documents JSON Schema 2020-12. Contracts shall declare all token/tool/result/citation/response limits, authority/version/idempotency fields, stream sequencing, action confirmation, exact side-effect operations, provider limits, stable errors, and Completed/Failed/Cancelled/Uncertain states. | CI validates syntax, examples, compatibility, generated clients, C11-C15/C18/C21 semantics, Draft create/edit shapes, stream order, bounded schemas, replay/conflict behavior, provider profiles, and GenUI allowlists. | Block the applicable change; contract validity never grants runtime authority or permits an unspecified tool/action. |
| NFR10.1 | Telemetry, audit, errors, caches, and evidence shall exclude credentials, tokens, CSRF values, signed URLs, raw supplier documents, full prompts, hidden reasoning, foreign tenant data, and unbounded tool/model payloads. High-cardinality conversation, turn, attempt, action, invocation, citation, and evaluation IDs are allowed only in access-controlled logs/traces; metrics use bounded classes and tenant hashing. | Canary, redaction, cardinality, exception, problem-detail, provider/tool diagnostic, stream, prompt-injection, and evidence-bundle tests verify the signal-specific policy and bounded buffering. | Redact/drop unsafe fields, count signal loss, reject unsafe evidence publication, and preserve authoritative work. |
| NFR13.1 | CI shall run unit/integration, OpenAPI/AsyncAPI/JSON Schema, stored-routine/Flyway, tenant/role, tool-schema, prompt-injection, GenUI, citation, provider-profile, idempotency/reconciliation, messaging, recovery, secret, container, dependency, model-license/checksum, and supply-chain checks on hosted untrusted runners. | Workflow policy proves public PR code receives no local runner, cluster, Vault, PostgreSQL, Redis, RabbitMQ, model, Bedrock, deployment, or owner credentials. | Block release/deployment and retain failed-control evidence. |
| NFR14.1 | Every Assistant and GenUI state shall expose text-equivalent status, meaningful labels, keyboard-operable controls, visible focus, logical focus recovery, and explicit loading, queued, streaming, clarification, empty, stale, failed, cancelled, uncertain, confirmation, expiry, and citation-unavailable states. English is the only validated initial language; unsupported input triggers the approved English-only flow without a tool or generation call. | Browser/contract tests use keyboard-only navigation, screen-reader names/status, focus during streaming and replacement, color-independent states, unsupported-language fixtures, expiry, cancellation, uncertainty, and citation reopening. | Fail the affected interaction evidence and expose a plain-text safe state; never hide authority, evidence, side-effect, or uncertainty information in visual-only UI. |

## Explicit limitations

No system prompt, model choice, confidence score, citation, or GenUI component is
a security boundary. Local execution does not relax tenant, encryption, secret,
tool, or confirmation controls. English-only validation does not authorize
silent translation or multilingual side effects.

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-21T13:50:14Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/260908-stock-sense-design/inception/contract-design/contract-summary.md > C14 — Review request and draft proposal tools | C14 says U9 may create or edit a purchase Draft, and NFR3.2/NFR8.1 plus the functional design require both operations, but the OpenAPI fragment exposes only `createPurchaseDraftForAssistant`. It also omits the action-draft identity, confirmation proof, payload hash, expected version, and idempotency-bound request shape required to enforce the confirmed edit/create flow. An implementer cannot build or contract-test Draft editing and cannot prove that either mutation is bound to the confirmed visible payload. | Add a distinct Draft edit operation to C14 and define request/response schemas for both create and edit that carry the server-bound action-draft identity, confirmation proof, payload hash, expected Draft/domain version, and idempotency semantics; add representative success, stale-version, changed-payload, expired-confirmation, replay, and authorization examples. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Stage-declared validation tools | None declared in the supplied NFR stage file | Bounded manual cross-reference review found the C14 mismatch recorded as R-01. |

### Summary

The NFR set is otherwise bounded and testable across authority, tenant and prompt-injection safety, provider isolation, retrieval/GenUI integrity, resources, evaluation, recovery, observability, and traceability. C14 must be completed before implementation of the confirmed Draft edit path; under the review rubric, this single Major finding does not block READY.
