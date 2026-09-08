# ADR 0012: Local LLM first with an external-provider integration boundary

Date: 2026-09-08
Status: Accepted by the owner.

## Decision

Use a local LLM for the initial release. Prepare an integration boundary for an
external API, with Amazon Bedrock as the owner's example. This supersedes the
external-LLM-first design. Bedrock is not yet a provisioned or selected cloud
deployment. Do not silently fall back to a remote provider.

The local runtime, model, quantization and host-versus-Kubernetes placement remain
open pending hardware and resource information. Do not assume a GPU or increase
the existing 16 GB/3-CPU Kubernetes allocation. Validate latency, memory, tool use
and retrieval-grounded answers on the actual machine before choosing the model.

## Provider contract

Keep domain tools, tenant authorization, prompt assembly and audit outside the
provider adapter. Define a provider-neutral application interface for messages,
streaming where supported, tool requests/results, cancellation, errors and usage
metadata. Expose capabilities explicitly; do not assume all runtimes support the
same tool schemas, structured outputs, context size or accounting fields.

Implement the local adapter first. Provide an external-adapter extension point,
configuration example and contract-test fixtures for Bedrock-style integration;
an actual Bedrock adapter must use its supported API/authentication rather than
assuming wire compatibility with the local runtime. Require explicit selection
and credentials before external use. Keep credential material in Vault and never
send it through model prompts.

Use identical domain-tool authorization and scenario evaluations across adapters.
Record provider/model, prompt/tool versions, latency, failures and usage when
available. Keep calls bounded and support cancellation. Local-provider failure
must produce a clear unavailable/degraded response, not an unapproved external call.

## Embeddings and execution

This decision selects local generation, not a specific embedding model. Resolve
embedding provider/model separately in SS-33 and version dimensions/preprocessing;
a model change may require Qdrant reindexing.

SS-36 establishes the interface, local adapter and hardware-based model evaluation.
SS-22 integrates it with the agent. SS-24 verifies the full deployment resource
budget, including inference. External integration remains optional until enabled.
