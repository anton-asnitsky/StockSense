# StockSense Assistant NFR Requirements Questions

Date: 2026-09-19
Stage: NFR Requirements
Unit: assistant
Status: In progress

The approved baseline is a Strands-based, provider-neutral Assistant with local
Qwen generation by default, an optional deliberately configured Bedrock
adapter, English-first behavior, typed allowlisted tools, server-derived tenant
authority, versioned RAG citations, explicit GenUI confirmation for side
effects, and no submission, approval, rejection, cancellation, receipt, or
supplier-dispatch authority. The exact local model/runtime remains an
evidence-based reviewer choice. These questions quantify the remaining NFRs.

## Interaction mode

Continue with the established guided-question workflow.

- A. Guide me through each question (Recommended)
- B. I will edit this file directly
- C. Answer all questions in chat
- X. Other (please specify)

[Answer]: A. Guide me through each question (Recommended)

## Q1. Local turn latency and streaming targets

Which CPU-capable local response profile should the portfolio acceptance path use?

- A. Admit a turn and emit its first durable status within 500 ms; for a warmed supported local Qwen profile with at most 4,096 input tokens, emit the first generated token within 30 seconds p95 and complete a 256-token no-tool answer within two minutes p95; measure tool and downstream time separately, keep streaming fragments provisional, and publish tokens/second plus CPU/RAM/GPU observations without allowing GPU evidence to replace the CPU result (Recommended)
- B. Require first token within ten seconds and a 512-token response within one minute on the reviewer CPU
- C. Measure local inference without pass/fail first-token or completion targets
- X. Other (please specify)

[Answer]: A. Admit a turn and emit its first durable status within 500 ms; for a warmed supported local Qwen profile with at most 4,096 input tokens, emit the first generated token within 30 seconds p95 and complete a 256-token no-tool answer within two minutes p95; measure tool and downstream time separately, keep streaming fragments provisional, and publish tokens/second plus CPU/RAM/GPU observations without allowing GPU evidence to replace the CPU result (Recommended)

## Q2. Prompt, output, tool, citation, and response bounds

Which bounded turn profile should protect local resources and contracts?

- A. Allow at most 4,096 input tokens and 512 output tokens, use at most 12 recent turns plus a 1,500-token versioned summary, invoke at most eight tools in one turn with 20 returned items per tool, attach at most ten citations from at most three source documents, and cap the terminal response plus GenUI description at 1 MiB; reject or summarize before exceeding a bound and never truncate authority/evidence fields (Recommended)
- B. Allow 8,192 input and 2,048 output tokens, 50 recent messages, 20 tool calls, and 5 MiB responses
- C. Use provider defaults without project-level turn, tool, citation, or response limits
- X. Other (please specify)

[Answer]: A. Allow at most 4,096 input tokens and 512 output tokens, use at most 12 recent turns plus a 1,500-token versioned summary, invoke at most eight tools in one turn with 20 returned items per tool, attach at most ten citations from at most three source documents, and cap the terminal response plus GenUI description at 1 MiB; reject or summarize before exceeding a bound and never truncate authority/evidence fields (Recommended)

## Q3. Assistant and local-model resource envelope

Which local Kubernetes resource and concurrency profile should Assistant use?

- A. Limit the Assistant API/orchestrator to 1 GiB/0.50 CPU and the local model runtime to 6 GiB/1 CPU, with optional GPU pass-through measured separately; allow one active local generation cluster-wide, reject a second active turn in the same conversation, queue at most two turns per retailer and five cluster-wide for up to five minutes, and keep tool-only/read endpoints responsive under the full queue; require whole-stack measurement inside 16 GiB/3 CPU before changing values (Recommended)
- B. Allow two local generations with an 8 GiB/1.5 CPU model-runtime limit and ten queued turns
- C. Set resources and concurrency during implementation without fixed local acceptance values
- X. Other (please specify)

[Answer]: A. Limit the Assistant API/orchestrator to 1 GiB/0.50 CPU and the local model runtime to 6 GiB/1 CPU, with optional GPU pass-through measured separately; allow one active local generation cluster-wide, reject a second active turn in the same conversation, queue at most two turns per retailer and five cluster-wide for up to five minutes, and keep tool-only/read endpoints responsive under the full queue; require whole-stack measurement inside 16 GiB/3 CPU before changing values (Recommended)

## Q4. Model profile, portability, and provider failure

How should the executing reviewer choose and prove the local generation profile?

- A. Select from checked-in compatible Qwen profiles using a documented benchmark on the reviewer's machine; require a quantized artifact with pinned model/runtime/container versions, checksums, license/terms, context limit, prompt template, tool-calling format, and CPU instructions; require real CPU inference from a clean checkout; record optional AMD GPU results separately; keep Bedrock disabled unless explicitly configured with credentials and spend policy; never switch providers automatically, and start a new conversation after any deliberate provider/model/config change (Recommended)
- B. Pin one owner-tested Qwen artifact now and allow automatic Bedrock fallback when local inference fails
- C. Let every reviewer choose any compatible model/runtime without checked-in profiles or reproducibility evidence
- X. Other (please specify)

[Answer]: A. Select from checked-in compatible Qwen profiles using a documented benchmark on the reviewer's machine; require a quantized artifact with pinned model/runtime/container versions, checksums, license/terms, context limit, prompt template, tool-calling format, and CPU instructions; require real CPU inference from a clean checkout; record optional AMD GPU results separately; keep Bedrock disabled unless explicitly configured with credentials and spend policy; never switch providers automatically, and start a new conversation after any deliberate provider/model/config change (Recommended)

## Q5. Tool deadlines, retries, and side-effect confirmation

Which execution profile should govern typed reads and confirmed actions?

- A. Give read tools a three-second deadline and one jittered retry only for safe/idempotent transport failure; give manual-review and Draft commands a five-second caller deadline with no changed-request retry; persist invocation identity, payload hash, idempotency key, expected version, and action-draft link before calling; make GenUI action drafts expire after five minutes; on timeout reconcile only with the original key and byte-equivalent payload for up to 30 seconds before marking the turn Uncertain; permit at most one confirmed side-effect invocation per turn (Recommended)
- B. Use ten-second tool deadlines, retry every failure three times, and keep confirmation drafts valid for 30 minutes
- C. Use each downstream client's default timeout and retry policy
- X. Other (please specify)

[Answer]: A. Give read tools a three-second deadline and one jittered retry only for safe/idempotent transport failure; give manual-review and Draft commands a five-second caller deadline with no changed-request retry; persist invocation identity, payload hash, idempotency key, expected version, and action-draft link before calling; make GenUI action drafts expire after five minutes; on timeout reconcile only with the original key and byte-equivalent payload for up to 30 seconds before marking the turn Uncertain; permit at most one confirmed side-effect invocation per turn (Recommended)

## Q6. Retrieval, citation, and GenUI integrity

Which evidence and presentation profile should the Assistant enforce?

- A. Retrieve at most eight authorized chunks per query and expose no more than the selected ten citations/three documents; require every material quantity, accepted term, forecast, recommendation, and Draft fact to link to an exact retained version; reject stale/mixed index versions, missing locators, fabricated citations, and unsupported claims; allow only versioned server-owned GenUI components/actions with typed data, text-equivalent content, keyboard-operable controls, visible focus, an integrity digest, and no model-produced code, markup, hidden parameters, or event handlers (Recommended)
- B. Retrieve up to 50 chunks and allow uncited explanatory quantities when the model is confident
- C. Treat citations and GenUI validation as presentation concerns to resolve later
- X. Other (please specify)

[Answer]: A. Retrieve at most eight authorized chunks per query and expose no more than the selected ten citations/three documents; require every material quantity, accepted term, forecast, recommendation, and Draft fact to link to an exact retained version; reject stale/mixed index versions, missing locators, fabricated citations, and unsupported claims; allow only versioned server-owned GenUI components/actions with typed data, text-equivalent content, keyboard-operable controls, visible focus, an integrity digest, and no model-produced code, markup, hidden parameters, or event handlers (Recommended)

## Q7. Agent safety and usefulness acceptance

Which evaluation threshold should block an Assistant release?

- A. Run at least 100 versioned cases on every candidate profile, including 40 valid read/explanation cases, 20 valid confirmed review/Draft cases, and 40 adversarial tenant, prompt-injection, fabricated-citation, forbidden-action, ambiguity, stale-evidence, provider, and tool-failure cases; require 100% denial with zero disclosure/mutation for tenant and forbidden-action cases, 100% explicit confirmation and payload-hash match for side effects, 100% valid citation resolution for material claims, at least 90% expected usefulness on valid cases, and no critical safety failure; publish failures and reject the release rather than weakening the suite (Recommended)
- B. Run 25 representative cases and accept 95% aggregate pass rate, including safety cases
- C. Demonstrate several manual prompts without a versioned pass/fail suite
- X. Other (please specify)

[Answer]: A. Run at least 100 versioned cases on every candidate profile, including 40 valid read/explanation cases, 20 valid confirmed review/Draft cases, and 40 adversarial tenant, prompt-injection, fabricated-citation, forbidden-action, ambiguity, stale-evidence, provider, and tool-failure cases; require 100% denial with zero disclosure/mutation for tenant and forbidden-action cases, 100% explicit confirmation and payload-hash match for side effects, 100% valid citation resolution for material claims, at least 90% expected usefulness on valid cases, and no critical safety failure; publish failures and reject the release rather than weakening the suite (Recommended)

## Q8. Retention and clean-target recovery

Which Assistant data-lifecycle profile should the portfolio deployment demonstrate?

- A. Retain conversations, terminal turns, summaries, action drafts, invocation/citation links, idempotency/reconciliation records, and business audit for 90 days; retain versioned evaluation evidence for one year and operational logs/dead letters for seven days; never store hidden reasoning and exclude full prompts from operational logs; dependencies and holds override expiry; target RPO 24 hours and RTO two hours, keeping conversations/tools unavailable until tenant bindings, source/index versions, action/invocation states, citations, idempotency, audit, and outbox/inbox reconcile, with expired data unable to reappear (Recommended)
- B. Retain all conversations, prompts, tool payloads, and evaluation evidence indefinitely
- C. Retain Assistant state for 30 days and expose restored conversations before citation/index reconciliation completes
- X. Other (please specify)

[Answer]: A. Retain conversations, terminal turns, summaries, action drafts, invocation/citation links, idempotency/reconciliation records, and business audit for 90 days; retain versioned evaluation evidence for one year and operational logs/dead letters for seven days; never store hidden reasoning and exclude full prompts from operational logs; dependencies and holds override expiry; target RPO 24 hours and RTO two hours, keeping conversations/tools unavailable until tenant bindings, source/index versions, action/invocation states, citations, idempotency, audit, and outbox/inbox reconcile, with expired data unable to reappear (Recommended)

## Q9. Security, prompt-injection, and secret controls

Which security profile should apply to Assistant boundaries?

- A. Revalidate actor, retailer, role, placement, conversation, resource, tool, citation, and action-draft authority at every boundary; derive authority and routes only from server context; treat user/retrieved/model/summary/GenUI content as untrusted data; enforce typed schemas, allowlists, output/evidence validation, TLS 1.2+, encrypted persistence/backups, Vault/VSO workload credentials with tested rotation, and no secrets/tokens/full prompts/hidden reasoning in telemetry; require negative tests for identifier substitution, stale placement, pooled context, indirect prompt injection, tool fabrication, argument smuggling, citation forgery, GenUI tampering, and external-provider activation (Recommended)
- B. Rely on the system prompt, BFF authentication, and downstream authorization without dedicated prompt-injection or GenUI-tampering tests
- C. Defer transport encryption, credential rotation, and adversarial tool testing until cloud deployment
- X. Other (please specify)

[Answer]: A. Revalidate actor, retailer, role, placement, conversation, resource, tool, citation, and action-draft authority at every boundary; derive authority and routes only from server context; treat user/retrieved/model/summary/GenUI content as untrusted data; enforce typed schemas, allowlists, output/evidence validation, TLS 1.2+, encrypted persistence/backups, Vault/VSO workload credentials with tested rotation, and no secrets/tokens/full prompts/hidden reasoning in telemetry; require negative tests for identifier substitution, stale placement, pooled context, indirect prompt injection, tool fabrication, argument smuggling, citation forgery, GenUI tampering, and external-provider activation (Recommended)

## Q10. Telemetry and operational alert thresholds

Which observability profile should Assistant expose?

- A. Emit bounded OpenTelemetry logs, metrics, and traces with safe tenant hash, correlation, conversation, turn, generation attempt, provider/profile, tool, action-draft, citation, evaluation, and version context across BFF/API, Strands, local runtime/Bedrock adapter, RabbitMQ, PostgreSQL, Redis, and domain tools; dashboard admission, queue, first-token/total latency, token rates/counts, tool latency/outcomes, citation validation, confirmations, uncertain work, safety/evaluation outcomes, recovery, and resources; warn at two-minute queue age, 500 ms admission breach, 30-second first-token breach, 90% resource use for five minutes, or 30-second outbox lag; alert on five-minute queue expiry, two-minute no-tool completion breach, provider failure, any dead letter, Uncertain side effect over 30 seconds, citation-integrity failure, forbidden tool/action attempt, tenant disclosure/mutation, critical evaluation failure, reconciliation over one hour, or backup age over 24 hours (Recommended)
- B. Record application logs and Kubernetes CPU/RAM only, alerting on pod restarts and provider failure
- C. Add dashboards and safety alerts after the first deployment
- X. Other (please specify)

[Answer]: A. Emit bounded OpenTelemetry logs, metrics, and traces with safe tenant hash, correlation, conversation, turn, generation attempt, provider/profile, tool, action-draft, citation, evaluation, and version context across BFF/API, Strands, local runtime/Bedrock adapter, RabbitMQ, PostgreSQL, Redis, and domain tools; dashboard admission, queue, first-token/total latency, token rates/counts, tool latency/outcomes, citation validation, confirmations, uncertain work, safety/evaluation outcomes, recovery, and resources; warn at two-minute queue age, 500 ms admission breach, 30-second first-token breach, 90% resource use for five minutes, or 30-second outbox lag; alert on five-minute queue expiry, two-minute no-tool completion breach, provider failure, any dead letter, Uncertain side effect over 30 seconds, citation-integrity failure, forbidden tool/action attempt, tenant disclosure/mutation, critical evaluation failure, reconciliation over one hour, or backup age over 24 hours (Recommended)

## Q11. Generation hard timeouts and retry boundary

What hard limit should terminate a provider attempt, and when may it retry?

- A. Terminate a generation attempt if no first token arrives within 60 seconds or total generation exceeds three minutes; allow one jittered same-provider retry only for a transient failure before any tool invocation or side-effect draft begins, recording a new attempt under the same turn; never retry on policy, schema, context, safety, or resource-limit failures and never switch providers automatically; after tool execution starts, expose provider failure explicitly and preserve completed tool evidence (Recommended)
- B. Allow five minutes per attempt and three same-provider retries, including after read tools complete
- C. Use provider defaults without a project hard timeout or retry boundary
- X. Other (please specify)

[Answer]: A. Terminate a generation attempt if no first token arrives within 60 seconds or total generation exceeds three minutes; allow one jittered same-provider retry only for a transient failure before any tool invocation or side-effect draft begins, recording a new attempt under the same turn; never retry on policy, schema, context, safety, or resource-limit failures and never switch providers automatically; after tool execution starts, expose provider failure explicitly and preserve completed tool evidence (Recommended)

## Ambiguity Scan

The selected targets form one bounded local Assistant profile. Admission,
first-token and completion latency, hard provider timeouts, input/output size,
memory, tool/result/citation counts, response size, resources, concurrency,
queues, retries, confirmation lifetime, reconciliation, evaluation, retention,
recovery, encryption, and alerts are quantitative.

The 30-second first-token and two-minute 256-token completion values are p95
acceptance targets for healthy warmed CPU runs. The 60-second first-token and
three-minute total values are hard per-attempt failure limits. A single
same-provider retry is permitted only before any tool invocation or action draft
and is reported separately from healthy latency. Queue time, model time, tool
time, and downstream time remain distinct. No timeout permits provider switching
or duplicate side effects.

The model choice remains with the executing reviewer, but the selectable
profiles, resource envelope, checksums, terms, prompt/tool formats, CPU path,
and acceptance suite are fixed and reproducible. Optional AMD GPU evidence is
supplemental. Bedrock remains disabled without explicit configuration,
credentials, and spend policy and never becomes an automatic fallback.

Tool and evidence limits align: each turn can call eight tools, each tool returns
20 items, retrieval contributes at most eight chunks, and the final response
uses no more than ten citations from three documents. Summarization may reduce
conversation text before generation but cannot truncate authority, versions,
citation locators, confirmation payloads, or idempotency context. A five-minute
action-draft lifetime is longer than the five-second command deadline and
30-second uncertainty reconciliation window.

Safety acceptance cannot be offset by usefulness: tenant disclosure, forbidden
mutation, unconfirmed side effects, invalid material citations, or another
critical safety failure blocks release. Recovery exposes no conversation or tool
capability until authority, evidence, actions, idempotency, audit, and messaging
reconcile. No material performance, scalability, reliability, security,
recovery, retention, agent-evaluation, or observability target remains
unspecified for this unit.

## Consolidated Summary

- **Local latency:** Admit and durably acknowledge a turn within 500 ms. On a
  warmed supported CPU profile with at most 4,096 input tokens, achieve first
  token within 30 seconds p95 and a 256-token no-tool answer within two minutes
  p95. Measure GPU separately and never use it in place of CPU evidence.
- **Turn bounds:** Permit 4,096 input and 512 output tokens, 12 recent turns plus
  a 1,500-token summary, eight tools per turn, 20 results per tool, ten citations
  across three documents, and a 1 MiB terminal response plus GenUI description.
- **Resources and concurrency:** Limit the Assistant API/orchestrator to
  1 GiB/0.50 CPU and the model runtime to 6 GiB/1 CPU. Run one local generation
  cluster-wide, reject overlapping turns in one conversation, and queue two
  turns per retailer and five cluster-wide for at most five minutes while
  keeping tool-only/read endpoints responsive.
- **Model portability:** Select the exact quantized Qwen profile through a
  checked-in reviewer benchmark. Pin model/runtime/container versions,
  checksums, terms, context, prompt template, tool format, and CPU instructions.
  Record optional GPU evidence separately. Bedrock is explicit opt-in only.
- **Generation failure:** Hard-stop an attempt at 60 seconds without a first
  token or three minutes total. Permit one jittered same-provider retry only for
  a transient pre-tool failure. Policy, schema, context, safety, resource, or
  post-tool failures do not retry or switch providers.
- **Tools and confirmation:** Use three-second read deadlines with one safe
  retry and five-second side-effect command deadlines. Persist invocation,
  payload hash, idempotency, expected version, and action-draft identity before
  calling. Confirmations expire after five minutes; reconcile uncertain effects
  for 30 seconds using the original identical request; allow one side effect per
  turn.
- **Evidence and GenUI:** Retrieve at most eight authorized chunks. Require
  exact retained-version citations for material domain claims and reject stale,
  mixed, missing, fabricated, or unsupported evidence. GenUI uses accessible,
  versioned server-owned components/actions, typed data, integrity digests, and
  no model code, markup, hidden parameters, or event handlers.
- **Agent evaluation:** Run at least 100 cases per candidate profile: 40 valid
  reads, 20 valid confirmed actions, and 40 adversarial/failure cases. Require
  zero tenant or forbidden-action disclosure/mutation, 100% confirmation/hash
  match, 100% valid material citations, at least 90% usefulness on valid cases,
  and no critical safety failure.
- **Retention and recovery:** Keep Assistant state and business audit 90 days,
  evaluation evidence one year, and logs/dead letters seven days. Never retain
  hidden reasoning or full prompts in operational logs. Target RPO 24 hours and
  RTO two hours and keep capabilities unavailable until full reconciliation;
  expiry survives restore and rebuild.
- **Security:** Reauthorize every actor, tenant, conversation, resource, tool,
  citation, and action draft. Derive authority from server context and treat all
  model-facing content as untrusted. Enforce typed allowlists, output/evidence
  validation, TLS 1.2+, encrypted persistence/backups, Vault/VSO credentials,
  rotation, redaction, and the selected adversarial tests.
- **Observability:** Correlate admission, queue, generation, tokens, tools,
  citations, confirmations, uncertain work, evaluations, recovery, and
  resources across Strands and every dependency. Use the selected queue,
  latency, provider, outbox, dead-letter, uncertainty, citation, forbidden
  action, tenant, evaluation, recovery, backup, and resource thresholds.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifacts?

- Looks correct
- Request changes

[Answer]: Looks correct
