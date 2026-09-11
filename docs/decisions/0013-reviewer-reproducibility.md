# ADR 0013: Reviewer-run local portfolio

Date: 2026-09-08
Status: Owner requirement; launch profiles below are the implementation proposal.

## Requirement

A reviewer must be able to clone StockSense and run it locally without the owner's
GPU, credentials, local files or private services. Configuration must be portable
and reproducible. No existing runnable implementation is claimed by this decision.

## Proposed launch profiles

- Reviewer CPU profile: documented local Kubernetes setup plus a small supported
  local model. Validate hardware minima and practical latency before release.
  CPU inference may be slower; expose this honestly and bound concurrency/context.
- Accelerated profile: same application/provider contract with an optional host
  inference endpoint. The owner's Windows/Vulkan setup is one profile, not the
  universal prerequisite. Document and test supported OS/runtime combinations.
- Deterministic test profile: fixtures for CI and UI smoke tests, explicitly labeled
  as simulated output. It does not replace the real local-inference demonstration.

Do not promise every reviewer can run the full stack on arbitrary hardware.
Publish measured requirements for the supported profiles. Account for the added
Vault, Redis, Qdrant and inference workloads when revising the resource plan.

## Exported and bootstrapped configuration

Version IaC/Helm settings, lockfiles, runtime/image versions, model identifiers,
quantization/context settings, download checksums, prompts, contracts and seed
configuration. Keep endpoints parameterized; do not hardcode host paths, GPU IDs
or the owner's machine name. Store large model weights outside Git and script
their acquisition with provenance, license information and integrity checks.

Provide prerequisite checks and setup/start/stop/reset scripts for documented
platforms. Run reset only against the explicit demo environment with confirmation.
Setup must report unsupported hardware and unavailable ports instead of silently
switching to an external paid API. Document first-run downloads/internet needs.

Bootstrap each reviewer's Vault, local certificates, credentials and seeded demo
accounts independently. Keep unseal/recovery material local and out of Git; explain
manual unseal after restart. Owner secrets and Terraform state are not exports.
Google login and external providers such as Bedrock are optional integrations
requiring the reviewer's own configuration. Seeded local login must demonstrate
the core app and real local-model path without those integrations.

## Acceptance

SS-36 benchmarks and documents CPU inference plus the accelerated profile where
available. SS-28 runs the entire documented setup on a clean environment with no
owner secrets or caches and verifies login, seeded inventory, purchasing, document
retrieval and a real LLM response. Record hardware, setup time, downloads, latency,
resource consumption and limitations. Repeat setup after a normal restart,
including Vault recovery/unseal steps. Do not describe an untested profile as ready.
