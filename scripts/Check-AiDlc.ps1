# Run diagnostics with the configured runtime; optionally refresh update metadata.
[CmdletBinding()]
param([switch]$CheckUpdates)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/Enter-StockSense.ps1"
$taskAidlcCommand = Join-Path $env:AIDLC_BIN_DIR 'aidlc.cmd'
Push-Location $stockSenseRoot
try {
    if ($CheckUpdates) {
        # The native downloader failed on this Windows host. The documented
        # CA-bundle option uses curl while retaining certificate verification.
        $taskCaPath = Join-Path ([IO.Path]::GetTempPath()) ('stocksense-aidlc-ca-' + [guid]::NewGuid().ToString('N') + '.pem')
        try {
            $taskPublicRoots = Get-ChildItem Cert:\CurrentUser\Root, Cert:\LocalMachine\Root
            if (-not $taskPublicRoots) { throw 'No Windows trusted root certificates found.' }
            $taskPem = foreach ($taskCertificate in $taskPublicRoots) {
                '-----BEGIN CERTIFICATE-----'
                [Convert]::ToBase64String($taskCertificate.RawData, [Base64FormattingOptions]::InsertLineBreaks)
                '-----END CERTIFICATE-----'
            }
            $taskPem | Set-Content -LiteralPath $taskCaPath -Encoding ascii
            & $taskAidlcCommand update --check --ca-bundle $taskCaPath
            if ($LASTEXITCODE -notin @(0, 5)) {
                throw "AI-DLC update metadata check failed with exit code $LASTEXITCODE."
            }
        } finally {
            if (Test-Path -LiteralPath $taskCaPath) { Remove-Item -LiteralPath $taskCaPath }
        }
    }
    & $taskAidlcCommand doctor --json
    $taskDoctorExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}
exit $taskDoctorExitCode
