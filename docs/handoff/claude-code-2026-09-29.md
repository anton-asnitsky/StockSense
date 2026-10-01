# Claude Code handoff - StockSense, refreshed 2026-10-01

This is the current continuation note. The September 26 handoff describes a
historical Model Lifecycle review escalation that was resolved; do not resume
from it. Check the AI-DLC engine's live directive and audit before acting.

## Start in the existing project

1. Work in `D:\Git\StockSense`. On Windows launch Claude Code with
   `./scripts/Start-Claude.ps1`, which sets the existing AI-DLC runtime
   environment. Confirm the installed Claude CLI and hooks rather than claiming
   that they were tested in this Codex session.
2. Read root `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`,
   `docs/development-agent-team.md`, `docs/product-brief.md`,
   `docs/decisions/0001-ai-dlc-framework.md`, `docs/ai-dlc-setup.md`, and
   `aidlc/spaces/default/memory/project.md`. Use the project `/aidlc` skill and
   `./scripts/aidlc.ps1` with `AIDLC_HARNESS_DIR=.codex`. Do not initialize a new
   intent, refresh the framework blindly, or hand-edit state and audit files.
3. Inspect `aidlc/spaces/default/intents/260908-stock-sense-design/aidlc-state.md`,
   its audit, and the next `aidlc engine orchestrate` directive. The current
   workflow is classic scope, standard depth/testing, unit-major Construction.
  The state header still says Functional Design while the last observed
  directive assigned **U1 Contracts Code Generation**. Follow a fresh engine
  directive, not the displayed stage header or this note if they diverge.

## Protected approval and current implementation

- The U1 plan is at
  `aidlc/spaces/default/intents/260908-stock-sense-design/construction/contracts/code-generation/code-generation-plan.md`;
  its test instructions and questions are beside it. The user approved the
  exact plan in the Codex desktop session on September 29. The engine returned
  `PLAN_APPROVAL_RECORDED` for `code-generation`, `contracts`, and the questions
  file has `[Answer]: Approve Plan`, fingerprint
  `sha256:89e28321470ba15b0d4eddbdbc42ca6d9fb0dd471ec48564e23e531649250c88`.
  The Testing Contract hash is
  `sha256:e36cd685382e2c5f5742ca1ccf6fd71475f191e30c58bc27eb30ea803e969c32`.
  Verify the audit and live engine status before relying on this receipt in a
  new Claude session. Do not manually recreate or bypass an approval if that
  session requires a fresh protected challenge.
- The prose above the Plan Approval section in
  `code-generation-questions.md` still says generation is pending and no code
  exists. That prose predates the successful protected answer; the audited
  receipt and current Git work are newer. Reconcile it through the applicable
  AI-DLC procedure without changing the approved plan or its fingerprint.
- Current repository checkout: `chore/bolt1-retail-data-functional-design`,
  HEAD `8df3528`, matching `origin` on October 1. It has many pre-existing
  modified/untracked AI-DLC design, state, audit, NFR and code-generation
  files, plus local handoff edits. **Preserve them.** Do not reset, stash, stage
  en masse, or infer that their presence is a completed stage. Run `git status`
  first and stage only intended files.
- Focused implementation worktree:
  `D:\Git\StockSense\.aidlc\worktrees\contracts-governance-foundation` on
  `feat/contracts-governance-foundation`, based on
  `origin/bolt-runnable-retail-walking-skeleton` (`524d7d3`). HEAD is now
  `8b2970f` and matches `origin/feat/contracts-governance-foundation`; the
  worktree was clean on October 1. Recent commits after `74c5656` include
  immutable compatibility (`856d6ec`), regeneration (`e385086`), release
  evidence (`21132f1`), vendored tooling (`8c1997b`), real source-revision
  binding (`6030c76`), and the C18 browser OpenAPI source (`8b2970f`).
  No PR or merge has been verified for this branch.

The pushed U1 slice now contains package loading, input-safety preflight,
protected-content and policy checks, standards validators, exact fixture
oracles, immutable-compatibility and regeneration logic, release-evidence
checks, the approved tenant/global identity-audit schemas, a candidate sample
bound to real Git revision `cda7f793`, and a C18 browser OpenAPI source. The
sample remains `candidate` and `releaseReady: false`. The C18 source landed
after the latest recorded source manifest and verification summary; reconcile
those records and test it before claiming coverage. Never claim full C01-C27
conformance or a releasable package.

Last *recorded* local verification in `code-summary.md`, before the C18 commit:

| Command | Result |
| --- | --- |
| `pnpm --dir tools/contracts test:unit` | 65 pass, 0 TODO, 1 skipped Windows symlink case |
| `pnpm --dir tools/contracts test:integration` | 20 pass, 1 TODO |
| `pnpm --dir tools/contracts test:coverage` | 85 pass, 1 TODO, 1 skipped; 94.01% line coverage for then-current `src/` |
| `pnpm lint`, `pnpm type-check`, `pnpm scan:secrets` | passed locally |
| `pnpm scan:vuln` | failed: 46 vulnerabilities (3 low, 19 moderate, 20 high, 4 critical) |

The latest recorded `pnpm install --frozen-lockfile` exited 0 without a network
error. There is still no clean-room CI proof, required CI run, public-PR trust
anchor, release scans, SBOM, attestation or provider conformance.

The approved plan names `oasdiff` and Kiota. The real `oasdiff` is a Go binary;
the npm name resolves to a security placeholder. Kiota's npm release is preview.
The code currently vendors `openapi-diff`, which is **not** the approved differ,
and leaves the differ/generator seams fail-closed. The proposed CycloneDX npm
tool could not inspect a pnpm tree and SBOM generation remains absent. Resolve
these as reviewed decisions, not silent substitutions. The pinned
`@asyncapi/cli@6.0.2` transitive tree accounts for the recorded vulnerability
findings. See the code summary for detail. Its traceability records 43 `OK`
and 52 `GAP` among 95 identifiers; do not call the stage complete.

**October 1 session caveat:** the Codex AI-DLC command guard appended
`PLAN_APPROVAL_BLOCKED` audit events even for read-only `Get-Content`, `rg` and
`git` commands after the protected `PLAN_APPROVAL_RECORDED` event. These new
blocked events do not revoke the earlier human approval, but show that this
session's hook still treats the Code Generation gate as protected. Inspect the
current audit and engine status in Claude's fresh harness before writes. Do not
hand-edit the audit, state or approval fingerprint to bypass the guard.

## Next work and stop conditions

- Continue the approved U1 plan from the current partial code. The C01-C27
  canonical catalogue and owner evidence are still largely absent. The C18
  source is new and needs manifest/validator/fixture/coverage reconciliation.
  The pinned OpenAPI/AsyncAPI CLI calls and generators have not been exercised
  on a complete package. Resolve the differ, generator, SBOM and vulnerability
  blockers; retain the 80% coverage floor. Do not weaken the plan or tests.
- Before reporting Code Generation complete, reconcile source paths in the
  focused worktree with the AI-DLC active record, create the required
  `source-manifest.json`, `code-summary.md`, and element-level
  `traceability.json` (all exist but need current evidence), and run the stage sensors and required independent
  architecture/process-steward reviews. The engine owns all transitions.
- `main` is at the completed Inception baseline (`63a319c`); the Bolt branch
  contains only part of Construction design. A clean, fully approved design
  baseline could be merged separately before more coding, but do not merge the
  unfinished Bolt or U1 branch just to start work. `CONTRIBUTING.md` requires
  one branch per story, focused shared-prerequisite PRs into the Bolt, required
  checks, and explicit owner approval for **every concrete merge**. Commits and
  pushes on work branches are already authorized.
- Cloud provisioning, paid APIs, real retailer data and real supplier orders
  have not been authorized.

Suggested first prompt to Claude Code:

> Read `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, and
> `docs/handoff/claude-code-2026-09-29.md`. Inspect the live AI-DLC intent,
> protected U1 plan-approval receipt, the dirty design checkout, and the pushed
> `feat/contracts-governance-foundation` worktree. Preserve all existing work.
> Continue the approved U1 Contracts implementation from the clean, pushed
> `8b2970f` worktree, reconcile the newer C18 source with the AI-DLC records,
> and resolve the remaining catalogue, tooling, CI and lifecycle gaps in order.
> The last Codex session's command guard logged `PLAN_APPROVAL_BLOCKED` even
> for read-only commands; diagnose that through the live engine without editing
> receipts. Report blockers accurately. Do not merge any branch without my
> approval.
