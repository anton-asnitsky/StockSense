# ADR 0014: Strands Agents in Python

Date: 2026-09-08
Status: Accepted by the owner: “Strands accepted.”

## Decision

Use Strands Agents in a Python agent service. This supersedes the earlier
Microsoft Agent Framework and LangGraph recommendations; neither was selected.
Use Strands model-provider abstractions for local llama.cpp inference and optional
future Bedrock integration. Pin SDK/provider/runtime versions after compatibility
testing. No AWS account or remote inference is required by the local profile.

## Application and provider boundaries

Expose StockSense-owned request, streaming/status and error contracts through an
OpenAPI-described agent API. Keep framework-specific types internal. The .NET
backend remains the business authority and forwards authenticated, bounded user
context to the agent service; never trust model-generated tenant or permission
claims. Authenticate service calls and recheck business permissions at tool APIs.

Use narrow tools for authorized inventory reads, deterministic replenishment,
tenant-scoped retrieval and draft proposals. The agent cannot approve orders.
The trusted retrieval adapter authorizes documents before sending chunks to the
model. RabbitMQ handles durable jobs under AsyncAPI contracts; .NET purchasing
state remains independent of the agent loop.

Use provider configuration/factories rather than duplicating a full model SDK.
Add StockSense adapters only for capability translation, policy or observability
that the provider interface does not supply. Do not assume local and Bedrock wire
protocols match. Preserve cancellation, bounded tool/model calls, timeouts,
provider/model identification and structured errors. Never silently call a remote
provider after local failure. Invalid tool requests must fail validation before
execution; custom tools enforce authorization regardless of framework hooks.

Any durable agent-session persistence uses the existing authorized storage/API
boundaries; no default framework SQL store may bypass the PostgreSQL routine-only
policy. Keep sessions and retrieval results tenant-isolated. Bound history and
context to the selected model budget.

## Execution impact

SS-36 configures and contract-tests Strands local model integration, provider
capabilities and the future Bedrock boundary. SS-22 implements the Python service,
tool loop, budgets and observability. SS-23/34 test adversarial behavior and RAG.
SS-24 includes the Python agent service in the resource budget. SS-28 validates
reviewer setup without cloud credentials. No new task ID is required.

Qwen is the first model evaluation candidate, with Gemma as challenger and Llama
as a comparison baseline. This framework decision does not bypass model/artifact
and CPU/GPU compatibility checks.

## References

- [Model providers](https://strandsagents.com/docs/user-guide/concepts/model-providers/)
- [Agent loop](https://strandsagents.com/docs/user-guide/concepts/agents/agent-loop/)
