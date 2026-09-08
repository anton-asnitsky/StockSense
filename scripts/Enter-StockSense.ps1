# Dot-source this file to expose the supported per-user runtime in this session.
$stockSenseRoot = Split-Path -Parent $PSScriptRoot
$env:AIDLC_INSTALL_ROOT = Join-Path $env:LOCALAPPDATA 'aidlc'
$env:AIDLC_BIN_DIR = Join-Path $env:LOCALAPPDATA 'aidlc/bin'
if (-not (Test-Path -LiteralPath (Join-Path $env:AIDLC_BIN_DIR 'aidlc.cmd'))) {
    throw 'AI-DLC is not installed. Run ./scripts/Install-AiDlc.ps1 first.'
}
if (($env:Path -split ';') -notcontains $env:AIDLC_BIN_DIR) {
    $env:Path = "$env:AIDLC_BIN_DIR;$env:Path"
}
$env:AIDLC_RULES_DIR = Join-Path $stockSenseRoot 'aidlc/spaces/default/memory'
