# AI-DLC setup

## Selected framework

AWS Labs AI-DLC Workflows 2.8.0, native Windows x64 release, Codex integration.
Release source: `0d399dd828b59e84d90f7cc198c69fab9ad8f1a7`.
See [ADR 0001](decisions/0001-ai-dlc-framework.md) for the selection rationale.

## Installed layout

| Path | Ownership / purpose |
| --- | --- |
| `.agents/skills/` | Upstream conductor and stage skills |
| `.codex/` | Upstream agents, hooks, engine reference files, runtime metadata; documented local adaptations below |
| `aidlc/spaces/default/memory/` | Shared methodology and StockSense project rules |
| `aidlc.settings.json` | Classic scope; swarm disabled |
| `.aidlc-version` | Exact project runtime pin: 2.8.0 |
| `docs/product-brief.md` | Conversation-derived business intent and proposals |
| `scripts/` | Windows runtime installer, environment helper, CLI launcher |
| `%LOCALAPPDATA%/aidlc/` | Per-user native runtime, outside Git |
| `work/` | Ignored downloads and diagnostic scratch |

No application code, lifecycle intent, gate approval, Git commit, or deployment
was created during framework setup. Lifecycle state/audits will be created by
the engine when inception starts; they must not be fabricated manually.

## Run

On a new Windows checkout, run `./scripts/Install-AiDlc.ps1`. The installer pins
the release and hashes, downloads via HTTPS, and invokes upstream validation.
It writes the runtime to `%LOCALAPPDATA%/aidlc/`, the supported per-user location.
The bootstrap adds the command directory to the Windows user PATH. It does not
change the system PATH. The native engine refuses a runtime nested inside a project. Project configuration
and shared artifacts remain tracked in this repository.

Use `./scripts/Start-Codex.ps1` to start Codex with the required process environment.
The launcher passes its environment to the CLI and its hook child processes.
Alternatively dot-source `./scripts/Enter-StockSense.ps1` in a terminal first.
The setup machine has Codex CLI 0.153.1; upstream requires at least 0.145.0.

In that fresh session, review and accept Codex's hook-trust prompt if you want
the installed hooks to execute, then use `$aidlc --doctor`. This is a Codex host
activation requirement, not an extra project approval gate. Setup does not write
user-level trust settings. `.codex/trust-seed.toml` is the upstream alternative
for administrators who deliberately manage trust through user configuration.

The currently running desktop conversation cannot retroactively load a new
process environment or attest hook execution. For desktop-only use, ensure the
desktop process inherits the environment from the helper before opening a fresh
project session. The CLI launcher is the verified environment path for now.

For local engine commands use `./scripts/aidlc.ps1 doctor --json` or
`./scripts/aidlc.ps1 engine orchestrate help`. These commands do not need an LLM.

An initial intent now exists at
`aidlc/spaces/default/intents/260908-stock-sense-design/`; requirements analysis
is in progress and its gate has not been approved. The original generated record
contains incomplete project metadata (including the title "Let's"); preserve its
history and reconcile it through the engine when resuming. The design and ADRs
record subsequent owner decisions, not completed lifecycle gates.

Resume the workflow with:

```text
$aidlc --status
$aidlc Resume the existing StockSense design intent and reconcile requirements with docs/product-brief.md and docs/design.md.
```

## Project adaptations

- Session and agent TOMLs omit model/provider/effort pins to inherit the user's
  choices. Upstream ships Bedrock-specific names; those are not used here.
- The project does not override sandbox/network policy or grant broad Git
  permission prefixes. Only the native framework engine command is listed.
- Upstream onboarding prose is retained, with StockSense guidance appended.
  Doctor reports an onboarding hash advisory against its generated baseline.
  StockSense
  guidance outside that block takes precedence for these local adaptations.
- Classic retains operations and avoids repeating the earlier ideation exercise.
  Standard detail/testing is requested explicitly when starting the workflow.
- Explicit `swarm=false` avoids opting into automatic parallel worker execution.

## Updates

Do not run a blind refresh: upstream model/provider defaults differ from this
project. Download a specific release, verify it, review its changes, and reapply
the documented configuration adaptations. Upstream's refresh conflict detection
correctly reports manually adapted TOMLs/rules rather than overwriting them.
Preserve StockSense memory, knowledge, authored artifacts and existing decisions.

The Windows bootstrap is supplied here. Other operating systems can use the
matching official release installer and the same tracked Codex integration;
those installations have not been tested in this project.

## Verification limits

Native installation passed upstream checksums and available provenance checks.
Local doctor results and hook activation status are recorded in
[setup verification](ai-dlc-verification.md). A running CLI conversation with
trusted hooks is still needed to verify the full agent lifecycle end to end.
