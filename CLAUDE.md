# StockSense instructions for Claude Code

Read `AGENTS.md`, `CONTRIBUTING.md`, `docs/product-brief.md`, `docs/decisions/0001-ai-dlc-framework.md`, and `aidlc/spaces/default/memory/project.md` before project work. The owner-approved decisions and Git rules in those files apply in Claude Code too. The current handoff is `docs/handoff/claude-code-2026-09-26.md`; read it before resuming AI-DLC.

The active AI-DLC intent is `aidlc/spaces/default/intents/260908-stock-sense-design/`. Use its `aidlc-state.md` and audit receipts as lifecycle authority. Do not create a replacement intent, infer an approval from a prior conversation, or hand-edit state, audit, `memory.md`, or engine-owned receipts. The workflow is currently paused at a Model Lifecycle Functional Design review escalation. The owner's request to prepare this handoff is not a `Request Changes` decision.

Use the project `/aidlc` skill in `.claude/skills/aidlc/SKILL.md` and the existing runtime through `./scripts/aidlc.ps1`. The installed framework and stage protocols live under `.agents/skills/aidlc/` and `.codex/aidlc-common/`; they are the procedure until a separately validated Claude-native AI-DLC installation exists. Keep `AIDLC_HARNESS_DIR=.codex` so adding this `.claude/` directory does not change the active framework tree. On Windows, launch with `./scripts/Start-Claude.ps1`.

Before each AI-DLC approval gate, commission the independent read-only StockSense process-steward review described in `AGENTS.md` and `docs/development-agent-team.md`. Record only actual human answers. Preserve unrelated work. The owner authorizes commits and pushes on working branches; every merge needs explicit owner approval. Each implementation user story gets its own branch as specified in `CONTRIBUTING.md`.
