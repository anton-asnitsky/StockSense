# Launch Codex with the runtime available to its non-interactive hook processes.
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/Enter-StockSense.ps1"
Push-Location $stockSenseRoot
try {
    & codex @args
    $codexExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}
exit $codexExitCode
