# Install only the pinned runtime. Tracked Codex integration already lives in Git.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$stockSenseRoot = Split-Path -Parent $PSScriptRoot
$releaseVersion = '2.8.0'
$releaseBase = "https://github.com/awslabs/aidlc-workflows/releases/download/v$releaseVersion"
$downloadDir = Join-Path $stockSenseRoot "work/aidlc-release"
New-Item -ItemType Directory -Force $downloadDir | Out-Null
$pinnedHashes = @{
    'install.ps1' = '14428d2ee5c002f42c06495d68fef85c93b00f57977c22a6bdaddd2b876c2ba0'
    'aidlc-windows-x64.exe' = 'f77083dfad04cc295749c85023e2b2d70eac90a5e5dd355955755e0fa34ecf44'
    'aidlc-runtime-2.8.0.tar.gz' = '8d215ec981245dc0930fba51740b8d78903b67a267815fe5b7e45c493e0ca991'
}
foreach ($asset in @('install.ps1', 'checksums.txt', 'version.json', 'aidlc-release.intoto.jsonl', 'aidlc-runtime-2.8.0.tar.gz', 'aidlc-windows-x64.exe')) {
    $destination = Join-Path $downloadDir $asset
    Invoke-WebRequest -UseBasicParsing -Uri "$releaseBase/$asset" -OutFile $destination -TimeoutSec 120
    if ($pinnedHashes.ContainsKey($asset)) {
        $actualHash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actualHash -ne $pinnedHashes[$asset]) { throw "Pinned checksum mismatch: $asset" }
    }
}
$env:AIDLC_INSTALL_ROOT = Join-Path $env:LOCALAPPDATA 'aidlc'
$env:AIDLC_BIN_DIR = Join-Path $env:LOCALAPPDATA 'aidlc/bin'
# The official installer checks release metadata, asset hashes, and provenance
# when a compatible GitHub CLI verifier is available. Never disable verification.
& powershell.exe -NoProfile -File (Join-Path $downloadDir 'install.ps1') -Version $releaseVersion -From $downloadDir -Yes
if ($LASTEXITCODE -ne 0) { throw "Official installer failed with exit code $LASTEXITCODE" }
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (($userPath -split ';') -notcontains $env:AIDLC_BIN_DIR) {
    $updatedPath = if ([string]::IsNullOrEmpty($userPath)) { $env:AIDLC_BIN_DIR } else { "$env:AIDLC_BIN_DIR;$userPath" }
    [Environment]::SetEnvironmentVariable('Path', $updatedPath, 'User')
}
Write-Output 'Installed. Start the configured session with ./scripts/Start-Codex.ps1'
