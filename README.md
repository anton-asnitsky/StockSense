# StockSense
StockSense will help a small retailer decide what to reorder, when, and why—using demand forecasts, supplier constraints, and an AI planning assistant.

## Project status

Initial design draft written; AI-DLC framework installed. Application implementation
has not started.

- [Execution plan](docs/execution-plan.md)
- [Git contribution rules](CONTRIBUTING.md)
- [AI-DLC lifecycle record](aidlc/spaces/default/intents/260908-stock-sense-design/aidlc-state.md)
- [Business intent and architecture proposal](docs/product-brief.md)
- [System design — draft v0.6](docs/design.md)
- [Identity provider decision](docs/decisions/0002-identity-provider.md)
- [Framework selection](docs/decisions/0001-ai-dlc-framework.md)
- [AI-DLC setup and usage](docs/ai-dlc-setup.md)

## Development workflow

This project uses **AWS Labs AI-DLC Workflows 2.8.0**, configured for Codex and
the classic lifecycle. It preserves construction and operations alongside
requirements and design. Model/provider choices come from your Codex settings.

On Windows, install the pinned per-user runtime after cloning:

```powershell
./scripts/Install-AiDlc.ps1
./scripts/Start-Codex.ps1
```

The runtime is already installed on the setup machine. In a fresh Codex session,
review its project hook-trust prompt, then run:

```text
$aidlc --doctor
$aidlc --status
$aidlc Resume the existing StockSense design intent and reconcile requirements with docs/product-brief.md and docs/design.md.
```

Run local diagnostics without starting a model session:

```powershell
./scripts/aidlc.ps1 doctor --json
```

The product is MIT licensed. The vendored AI-DLC framework is MIT-0 licensed;
see [upstream license](docs/AI-DLC-LICENSE.txt).
