# Launch Claude Code with the pinned StockSense AI-DLC runtime in this process.
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/Enter-StockSense.ps1"
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    throw 'Claude Code CLI is not installed or is not on PATH. Install/sign in to Claude Code, then rerun this script.'
}
Push-Location $stockSenseRoot
try {
    & claude @args
    $claudeExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}
exit $claudeExitCode
