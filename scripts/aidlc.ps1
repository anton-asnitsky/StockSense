# Forward all arguments to the native runtime with the StockSense project context.
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/Enter-StockSense.ps1"
Push-Location $stockSenseRoot
try {
    & (Join-Path $env:AIDLC_BIN_DIR 'aidlc.cmd') @args
    $aidlcExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}
exit $aidlcExitCode
