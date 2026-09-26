---
name: aidlc
description: Resume and operate the existing StockSense AI-DLC intent using the pinned project runtime and lifecycle receipts.
---

# StockSense AI-DLC in Claude Code

This is a Claude Code entry point to the already-installed **Codex harness** of AI-DLC 2.8.0. It does not install a second framework, change the active intent, or claim that Claude-native hooks are active. Read `CLAUDE.md`, `AGENTS.md`, the current handoff under `docs/handoff/`, and `.agents/skills/aidlc/SKILL.md`. Translate Codex-specific tool names into Claude Code equivalents while preserving the engine's lifecycle protocol. Read `.codex/aidlc-common/protocols/stage-protocol.md`, `stage-protocol-construction.md`, and `stage-protocol-reviewer.md` before resuming Construction.

On Windows use `./scripts/aidlc.ps1` as the `aidlc` command. `./scripts/Start-Claude.ps1` prepares the runtime environment and pins `AIDLC_HARNESS_DIR=.codex`. Run from the repository root. The skill can be invoked as `/aidlc`; `$ARGUMENTS` are the user's request, not an authorization to bypass a gate.

1. Inspect the active intent's `aidlc-state.md`, audit receipts, the handoff, and `./scripts/aidlc.ps1 engine orchestrate next` for its actual directive. Forward any user-supplied AI-DLC flags or words unchanged to the first `next` call. For `load-steering`, run `./scripts/aidlc.ps1 engine orchestrate continue <continue_token>` immediately and use only the resulting directive. For a `print` directive naming a command, run that command first. Never invent routing.
2. Carry out exactly the emitted stage or unit work using its `stage_file`, `protocol_modules`, `inline_context_paths`, and `wave.entries`. Use the existing `.codex/` stage definitions and agent role TOMLs as the methodology source. Ask the owner at every prescribed summary and approval gate; record only an exact human answer with the engine commands. Never alter engine-owned lifecycle files manually.
3. For a review, use a Claude subagent with the exact reviewer identity and the dispatch protocol in `.codex/aidlc-common/protocols/stage-protocol-reviewer.md`. The reviewer may append only the canonical `## Review` suffix to its assigned artifact. Record request and verdict through `./scripts/aidlc.ps1 engine log review`; do not forge a verdict or bypass a stale-receipt limit.
4. If the emitted review state is `escalation-required`, **stop**. Do not request another review or complete the unit. Only the owner's explicit `Request Changes` decision can reset the stage attempt. The current handoff describes this exact condition; preparing a commit or switching tools is not that decision.
5. Before any approval gate, use the StockSense process-steward role for an independent read-only check. Resolve blocking or major findings or present them clearly. Follow `CONTRIBUTING.md` for Git: push working branches when authorized, never merge without owner approval.

The Claude-native agent definitions in `.claude/agents/` cover the immediate reviewer and process steward. For later specialist roles, read `docs/development-agent-team.md` and the matching `.codex/agents/*.toml` role instructions; do not claim those roles are Claude-native until ported and verified. If Claude Code or the project AI-DLC runtime is unavailable, report the missing prerequisite rather than changing lifecycle state.
