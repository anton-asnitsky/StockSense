# StockSense assistant functional-design questions

Date: 2026-09-14
Stage: Functional Design
Unit: assistant
Status: Confirmed

These questions resolve the remaining behavior choices for tenant-bound conversations, turn execution, tool consent, ambiguity handling, evidence and citations, bounded memory, action drafts, interruption recovery, provider selection, and initial language handling. Accepted decisions remain fixed: the Assistant is a standalone Python Strands service; local generation is the initial path with a reproducible CPU-only reviewer route; the exact local model/runtime remains an execution-time choice supported by evidence; an optional Bedrock adapter is explicitly configured and never an automatic fallback; all model output and retrieved text are untrusted; every tool rechecks current actor, retailer, role, placement, and resource authority; domain services own deterministic calculations and mutations; the Assistant cannot submit, approve, reject, cancel, receive, or send an order; Qdrant routing is server-selected by retailer and index version; citations expose authorized source/data versions; side-effecting tools are idempotent; and hidden reasoning, secrets, and full prompts are excluded from audit records.

## Interaction mode

The owner's standing preference from the current Functional Design stage is retained:

- A. Guide me through each question (Recommended)
- B. I will edit this file directly
- C. Answer all questions in chat
- X. Other (please specify)

[Answer]: A. Guide me through each question (Recommended)

## Q1. Conversation tenant and execution binding

How should a conversation be bound so history cannot cross retailer or execution contexts?

- A. Pin one retailer, initiating actor, language, provider adapter, model identifier, and assistant configuration version when the conversation starts; recheck current membership and retailer placement on every turn and tool call; require a new conversation for a different retailer, provider, model, or language, without copying prior history automatically (Recommended)
- B. Allow a conversation to switch retailer and provider in place while retaining all prior context
- C. Bind only the current request and let the model infer retailer and provider from conversation history
- X. Other (please specify)

[Answer]: A. Pin one retailer, initiating actor, language, provider adapter, model identifier, and assistant configuration version when the conversation starts; recheck current membership and retailer placement on every turn and tool call; require a new conversation for a different retailer, provider, model, or language, without copying prior history automatically (Recommended)

## Q2. Turn concurrency and streaming lifecycle

How should simultaneous messages, streaming, cancellation, and terminal outcomes behave?

- A. Allow one active user turn per conversation; reject a second turn while one is active; expose Queued, Running, Completed, Failed, Cancelled, and Uncertain outcomes; treat streamed fragments as provisional and persist only the terminal user-visible response, tool/citation references, and outcome (Recommended)
- B. Run multiple turns concurrently and merge their tool results into one conversation history
- C. Persist every streamed token as an authoritative conversation record
- X. Other (please specify)

[Answer]: A. Allow one active user turn per conversation; reject a second turn while one is active; expose Queued, Running, Completed, Failed, Cancelled, and Uncertain outcomes; treat streamed fragments as provisional and persist only the terminal user-visible response, tool/citation references, and outcome (Recommended)

## Q3. Consent boundary for tools

When may the Assistant invoke read-only and side-effecting tools?

- A. Invoke authorized read and deterministic comparison tools as needed to answer the user's request; before each manual-review request or purchase-draft mutation, present the exact retailer, target, parameters, expected effect, and allowance or draft impact and require explicit user confirmation; never expose approval or order-submission tools (Recommended)
- B. Invoke manual-review and draft tools whenever the model infers likely intent from the conversation
- C. Require explicit confirmation before every read-only tool as well as every mutation
- X. Other (please specify)

[Answer]: A. Invoke authorized read and deterministic comparison tools as needed to answer the user's request; before each manual-review request or purchase-draft mutation, present the exact retailer, target, parameters, expected effect, and allowance or draft impact and require explicit user confirmation; never expose approval or order-submission tools (Recommended)

## Q4. Ambiguous entity and mutation intent

What should happen when a product, store, supplier, quantity, source review, or requested action is ambiguous?

- A. Return bounded authorized matches and ask a clarifying question; do not invoke a mutation until every required identifier and parameter is resolved from current authorized data and repeated back in the confirmation; never guess from names alone (Recommended)
- B. Choose the highest-ranked match and disclose the choice after executing
- C. Let the model generate identifiers when no exact match is available
- X. Other (please specify)

[Answer]: A. Return bounded authorized matches and ask a clarifying question; do not invoke a mutation until every required identifier and parameter is resolved from current authorized data and repeated back in the confirmation; never guess from names alone (Recommended)

## Q5. Evidence precedence and claim support

How should structured facts, accepted commercial terms, retrieved source text, and model knowledge be combined?

- A. Treat current authorized domain-tool facts and accepted-term records as authoritative; use retrieved source text only as supporting evidence; attach source/version citations to material factual claims; disclose conflicts or missing evidence; never let retrieved text or model knowledge override domain rules or accepted terms (Recommended)
- B. Prefer semantically closest retrieved text even when it conflicts with an accepted term
- C. Allow uncited model knowledge when it sounds consistent with tool output
- X. Other (please specify)

[Answer]: A. Treat current authorized domain-tool facts and accepted-term records as authoritative; use retrieved source text only as supporting evidence; attach source/version citations to material factual claims; disclose conflicts or missing evidence; never let retrieved text or model knowledge override domain rules or accepted terms (Recommended)

## Q6. Citation access and source lifecycle

What should happen when a user opens a citation after authority or source state has changed?

- A. Store an immutable citation descriptor with source type, source/version identity, locator, and claim link; reauthorize every citation open; show the exact retained version when permitted, or explicit forbidden, deleted, expired, or unavailable status without substituting another source (Recommended)
- B. Cache rendered source text in the conversation and display it later without reauthorization
- C. Redirect missing citations to the latest similar source automatically
- X. Other (please specify)

[Answer]: A. Store an immutable citation descriptor with source type, source/version identity, locator, and claim link; reauthorize every citation open; show the exact retained version when permitted, or explicit forbidden, deleted, expired, or unavailable status without substituting another source (Recommended)

## Q7. Bounded conversation memory

What conversation material should be retained and supplied to later turns?

- A. Retain user-visible messages, terminal assistant responses, compact evidence references, explicit user confirmations, and bounded tool-result summaries; build each prompt from a deterministic recent-turn window plus a versioned summary; exclude hidden reasoning, secrets, raw credentials, and unrestricted full tool payloads (Recommended)
- B. Retain and resend every prompt, hidden reasoning trace, and full tool response indefinitely
- C. Keep no conversation history after each response
- X. Other (please specify)

[Answer]: A. Retain user-visible messages, terminal assistant responses, compact evidence references, explicit user confirmations, and bounded tool-result summaries; build each prompt from a deterministic recent-turn window plus a versioned summary; exclude hidden reasoning, secrets, raw credentials, and unrestricted full tool payloads (Recommended)

## Q8. Assistant action-draft lifecycle

How should the Assistant represent a proposed side effect before and after the owning domain service executes it?

- A. Create an expiring AssistantActionDraft that records the resolved action type, safe display payload, payload hash, evidence references, and confirmation state; on confirmed execution, link it to the actual U8 review job or purchase draft and terminal outcome; the AssistantActionDraft never becomes a purchase order or business authority (Recommended)
- B. Treat the AssistantActionDraft itself as the purchase draft and submit it directly
- C. Keep proposed actions only in transient model text with no stable identity or payload hash
- X. Other (please specify)

[Answer]: X. A + GenUI usage

## Q8a. GenUI trust boundary

How should GenUI render Assistant results and action confirmations?

- A. Render a versioned, server-defined UI schema tied to the AssistantActionDraft; allow only approved Ant Design components and declared actions; let the model supply typed display data but never executable component code, HTML, scripts, event handlers, authority, or hidden mutation parameters; the final confirmation invokes the same governed domain tool with the visible payload hash (Recommended)
- B. Let the model generate arbitrary React, HTML, and event-handler code for each response
- C. Use GenUI only for read-only results and always switch to a fixed non-GenUI form for action confirmation
- X. Other (please specify)

[Answer]: A. Render a versioned, server-defined UI schema tied to the AssistantActionDraft; allow only approved Ant Design components and declared actions; let the model supply typed display data but never executable component code, HTML, scripts, event handlers, authority, or hidden mutation parameters; the final confirmation invokes the same governed domain tool with the visible payload hash (Recommended)

## Q9. Interrupted or uncertain tool execution

How should cancellation, timeout, and lost responses behave around side effects?

- A. Persist the invocation identity, payload hash, and idempotency key before calling a side-effecting tool; cancellation stops new work but does not undo committed effects; an uncertain response is reconciled with the same key before any retry; the final turn distinguishes committed, incomplete, failed, and still-uncertain actions (Recommended)
- B. Treat every timeout as failure and retry with a new idempotency key
- C. Claim that cancellation reverses any review job or draft created earlier in the turn
- X. Other (please specify)

[Answer]: A. Persist the invocation identity, payload hash, and idempotency key before calling a side-effecting tool; cancellation stops new work but does not undo committed effects; an uncertain response is reconciled with the same key before any retry; the final turn distinguishes committed, incomplete, failed, and still-uncertain actions (Recommended)

## Q10. Initial English-only behavior

The first release supports English while keeping a multilingual extension path. How should a clearly non-English request behave initially?

- A. Record the user-visible turn, respond that the current release supports English, and perform no tool call or mutation until the user restates or explicitly confirms an English interpretation; retain a language field so validated languages can be added later (Recommended)
- B. Translate and execute the request automatically without disclosing that the language is unsupported
- C. Reject and delete the conversation immediately
- X. Other (please specify)

[Answer]: A. Record the user-visible turn, respond that the current release supports English, and perform no tool call or mutation until the user restates or explicitly confirms an English interpretation; retain a language field so validated languages can be added later (Recommended)

## Ambiguity Scan

All answers select concrete behavior and are mutually consistent. Each conversation is pinned to one retailer, actor, language, provider adapter, model, and Assistant configuration version. Current membership and placement are still rechecked on every turn and tool invocation. Changing any pinned execution context starts a separate conversation and never copies history automatically.

One user turn may execute at a time. A concurrent message is rejected with the active-turn state rather than queued or merged. Stream fragments are provisional; only the terminal visible response, outcome, tool references, and citations become conversation history. Exact timing, context size, retention, and retry limits remain NFR or implementation values.

Read and deterministic comparison tools may run to answer an authorized request. Manual-review and purchase-draft mutations require an expiring AssistantActionDraft plus explicit confirmation of the exact visible payload and effect. Ambiguous identifiers or parameters always cause clarification. GenUI renders only versioned, server-defined schemas through allowlisted Ant Design components and declared actions; model output cannot introduce executable UI, hidden parameters, or authority.

Current domain facts and accepted commercial terms remain authoritative. Retrieved source text is supporting evidence only, and model knowledge cannot override domain rules. Material claims carry source/version citations. Citation opening always reauthorizes access and never substitutes a different source when the cited version is forbidden, deleted, expired, or unavailable.

Conversation prompts use a deterministic recent-turn window plus a versioned bounded summary. Retained data excludes hidden reasoning, credentials, secrets, and unrestricted raw tool payloads. Side-effecting invocation identity, payload hash, and idempotency key are persisted before execution; cancellation stops further work without undoing committed effects, and uncertain outcomes are reconciled before retry.

The initial validated language is English. Clearly non-English input produces an explicit limitation and no tool invocation until the user restates the request or confirms an English interpretation. The persisted language field and provider-neutral contracts preserve later multilingual and provider extension paths. No unresolved functional ambiguity remains for artifact generation.

## Consolidated Summary

The Assistant owns bounded conversations, turns, typed tool orchestration, citations, action-draft confirmations, interruption recovery, provider-neutral generation, and agent evaluation evidence. It never owns retailer membership, deterministic domain calculations, supplier acceptance, replenishment recommendations, purchase proposals, orders, approvals, receipts, or inventory state. Every tool call uses server-derived actor and retailer context and rechecks current membership, role, resource ownership, and placement generation. Model-supplied authority is ignored and rejected.

A conversation pins one retailer, initiating actor, English language, provider adapter, model identifier, and Assistant configuration version. Provider, model, retailer, or language changes start a new conversation without copying prior history. The exact local model and runtime remain an evidence-based execution choice, but the initial configuration must provide a documented CPU-only reviewer path. Optional external providers require deliberate configuration and never receive automatic fallback traffic.

Only one turn may be active in a conversation. Turn states are Queued, Running, Completed, Failed, Cancelled, or Uncertain. A concurrent user message is rejected with the active-turn reference. Streaming output is provisional and cannot be treated as a completed answer; the terminal record contains the user-visible response, safe outcome, tool-invocation references, citation references, and correlation identity.

Authorized read tools and deterministic comparison or explanation tools may run when needed to answer the user's request. A manual-review request or purchase-draft create/edit is a side effect and requires an expiring AssistantActionDraft. That draft records the resolved action type, safe visible payload, payload hash, evidence references, and confirmation state. The Assistant must present the retailer, target, parameters, expected effect, and allowance or draft impact and obtain explicit confirmation before invoking U8. The action draft then links to the actual review job or purchase draft and terminal result. It never becomes a purchase order and cannot submit, approve, reject, cancel, receive, or send one.

Ambiguous products, stores, suppliers, quantities, source reviews, or action types produce bounded authorized matches and a clarification question. The Assistant never guesses identifiers from names. Mutation begins only after every required identifier and parameter is resolved from current authorized data and repeated in the visible confirmation.

GenUI renders versioned, server-defined presentation schemas tied to conversation results and AssistantActionDrafts. The web application maps those schemas to allowlisted Ant Design components and declared actions. The model may supply validated typed display data but cannot supply executable React, HTML, scripts, event handlers, authority claims, or hidden mutation parameters. A confirmed GenUI action sends the same visible payload hash to the same governed domain tool used by fixed UI flows.

Authorized domain-tool facts and accepted commercial-term records outrank retrieved text and model knowledge. Retrieved supplier material is untrusted supporting evidence and cannot change accepted terms or deterministic rules. Material factual claims cite source type, exact source/data version, locator, and the supported claim. Opening a citation rechecks authorization and returns that retained version when available; otherwise it shows an explicit forbidden, deleted, expired, or unavailable state without substituting another source.

Conversation memory retains visible user messages, terminal Assistant responses, compact evidence references, explicit confirmations, and bounded tool-result summaries. Prompts are built from a deterministic recent-turn window and a versioned summary. Hidden reasoning, full prompts by default, secrets, credentials, and unrestricted raw tool payloads are neither conversation memory nor business audit content.

Before a side-effecting call, the Assistant persists the invocation identity, payload hash, idempotency key, and intended target. Cancellation prevents further calls but never claims to reverse an already committed review job or purchase draft. Timeout or lost response produces an Uncertain state; the Assistant reconciles the original key and payload before retrying and reports committed, incomplete, failed, or still-uncertain actions accurately.

The initial release supports English. A clearly non-English request is retained as a visible turn, receives an explicit English-only limitation, and triggers no tool call or mutation until the user restates it or confirms an English interpretation. Conversation and contract language fields allow validated languages to be added later without changing tenant, tool, citation, confirmation, or audit boundaries.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct
