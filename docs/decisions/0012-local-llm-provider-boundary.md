# ADR 0012: Local LLM first with an external-provider integration boundary

Date: 2026-09-08
Status: Accepted by the owner.

## Decision

Use a local LLM for the initial release. Prepare an integration boundary for an
external API, with Amazon Bedrock as the owner's example. This supersedes the
external-LLM-first design. Bedrock is not yet a provisioned or selected cloud
deployment. Do not silently fall back to a remote provider.

The local runtime, model, quantization and host-versus-Kubernetes placement remain
open pending runtime validation and placement agreement. The owner reports an
AMD Radeon RX 6700 XT with 12 GB dedicated VRAM. This is hardware information,
not confirmation of GPU passthrough or extra host RAM/CPU allocation. Do not increase
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

This decision selects local generation, not a specific embedding model. ADR 0015 approves EmbeddingGemma and Qwen as candidates; evaluate in SS-33/34
and version dimensions/preprocessing;
a model change may require Qdrant reindexing.

SS-36 establishes the interface, local adapter and hardware-based model evaluation.
SS-22 integrates it with the agent. SS-24 verifies the full deployment resource
budget, including inference. External integration remains optional until enabled.

## Hardware evaluation proposal

Evaluate native Windows llama.cpp with Vulkan for this GPU before choosing a
runtime or model. Host serving remains a proposal; validate Kubernetes-to-host
connectivity and access controls if selected. Benchmark a quantized 7B–8B-class
model first with bounded context/concurrency, measuring actual free VRAM, host
RAM/CPU, latency and tool correctness. These are evaluation settings, not a
selected model or capacity guarantee.

[llama.cpp build backends](https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md)

Reviewer reproducibility (ADR 0013) constrains runtime selection: the owner GPU
is optional acceleration. Validate a real CPU inference profile and scripted,
versioned setup; do not require reviewers to have that GPU or private credentials.

## Framework refinement

ADR 0014 selects Strands Agents in Python. Implement the provider boundary using
Strands provider abstractions and narrow application adapters where needed, not
a duplicate general-purpose SDK. StockSense-owned API contracts isolate callers
from framework types. Domain authorization and capability tests remain required.
