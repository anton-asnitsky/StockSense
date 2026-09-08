# ADR 0001: Use AWS Labs AI-DLC Workflows

Date: 2026-09-08
Status: Selected under the owner's instruction to choose and install a framework.

## Context

StockSense is a solo-developed portfolio product demonstrating React, .NET,
relational and NoSQL databases, ML/MLOps, agentic applications, DevOps, and
cloud-native delivery. The development process must expose requirements,
architecture decisions, implementation evidence, evaluation, and operations.

## Options considered

| Framework | Fit | Tradeoff |
| --- | --- | --- |
| AWS Labs AI-DLC Workflows | Direct implementation of the requested methodology, persistent lifecycle artifacts, Codex integration, operations stages | More workflow machinery and review gates; AWS-oriented guidance needs project context |
| GitHub Spec Kit | Strong specification-to-plan-to-task workflow with Codex support | Less direct alignment with demonstrating the named AI-DLC methodology across operations |
| BMAD Method | Broad role-based planning and development workflows | Another methodology and role vocabulary to adopt for a project explicitly targeting AI-DLC |

These are project-fit judgments, not comparative performance benchmarks.

## Decision

Install the official AWS Labs AI-DLC Workflows **2.8.0** native Windows release
with its **Codex** integration. Install the runtime in its supported per-user
AppData location (the native engine rejects runtime/project overlap); track the
project integration, shared method memory, and authored lifecycle artifacts.
Use the **classic** scope with standard depth and test strategy as the starting
profile: ideation is already captured in the project brief, and operations must
remain part of the lifecycle. Do not use the `mvp` scope as the full project
profile because it omits Operation stages.

Retain the user's configured model/provider and permission policy. Framework
selection does not select AWS as the application cloud. Azure remains a proposal.
Do not automatically install additional frameworks or provider services.

## Consequences

- Framework artifacts make the process inspectable in the public repository.
- Model and agent outputs still need evidence-based review.
- Native hooks require the runtime to be discoverable and project hook trust.
- Updates are deliberate, versioned changes; review generated integration diffs.
- Workflow gates must record actual owner decisions, never fabricated approval.
- Application implementation and cloud provisioning are separate from setup.

## Sources

- https://github.com/awslabs/aidlc-workflows
- https://github.com/awslabs/aidlc-workflows/releases/tag/v2.8.0
- https://github.github.com/spec-kit/
- https://github.com/bmad-code-org/BMAD-METHOD
