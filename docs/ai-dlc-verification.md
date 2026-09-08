# AI-DLC setup verification

Date: 2026-09-08. Platform: Windows x64.

## Results

- Official AI-DLC 2.8.0 release downloaded over HTTPS.
- Installer, executable and runtime archive matched pinned SHA-256 hashes.
- Official installer completed its available provenance verification successfully.
- Native runtime installed at `%LOCALAPPDATA%/aidlc/`; its command directory
  registered in the Windows user PATH.
- Codex CLI 0.153.1 exceeds upstream's minimum 0.145.0.
- Project pinned through the native `config --pin 2.8.0` command.
- Native `engine orchestrate help` executes successfully from StockSense and
  lists classic as the default, with standard depth and 26 lifecycle stages.
- Doctor: **59 passed, 3 warnings, 0 failed** using the actual Windows user PATH.
- PowerShell launch/install scripts parse successfully.
- Git whitespace validation passes. Downloads and machine-local data are ignored.

## Doctor advisories

1. **Onboarding customized:** `AGENTS.md` differs from the generated ownership
   baseline; review local guidance when upgrading rather than force-overwriting.
2. **Workspace files uncommitted:** recorded during the original setup check; the owner
   subsequently authorized publication.
3. **Update cache absent:** expected for a pinned offline diagnostic run; this
   does not affect workflow execution.

Restricted shell diagnostics may additionally report missing hook PATH because
they cannot inspect the real user registry. The external check sees the command.

## Activation still required

A separate `config trust --check` correctly reports **15 untrusted hook entries**.
The general doctor does not enforce user trust, so its success must not be read
as proof that hooks have fired. Start a fresh Codex session using
`./scripts/Start-Codex.ps1`, review the host's hook-trust prompt, and then run
`$aidlc --doctor`. No user-level trust settings were modified by setup.

No LLM workflow, subagent lifecycle, application tests, or cloud deployment was
executed as part of framework installation.

## Publication verification (2026-09-08)

The setup and initial lifecycle records are now being published with owner
approval. A fresh restricted-shell doctor run reports **61 passed, 4 warnings,
1 failed**. The failure is that hooks have never executed despite recorded
workflow progress; this is not a verified end-to-end AI-DLC run. Hook trust and
registration must be verified in a freshly launched configured Codex session
before lifecycle work resumes. No stage or approval was advanced during publication.

Warnings concern hook PATH discovery, customized onboarding, uncommitted records
at check time and absent update cache. PowerShell scripts parse successfully.
A local pattern scan of publication candidates found no private-key blocks or
common GitHub/AWS access-token formats; this is a limited check, not a security
certification. Machine-local cursors, sessions, downloads and runtime binaries
remain ignored.

Publication whitespace check: two pre-existing findings remain in the generated
state record (trailing space) and upstream license (blank EOF line). Those originals
are preserved; the check passes when those two files are excluded. All staged JSON
files parse successfully.
