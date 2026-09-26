# Forward all arguments to the native runtime with the StockSense project context.
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/Enter-StockSense.ps1"
Push-Location $stockSenseRoot
try {
    $useReviewBriefFallback = (
        $args.Count -ge 3 -and
        $args[0] -eq 'engine' -and
        $args[1] -eq 'review-brief'
    )

    if ($useReviewBriefFallback) {
        $node = Get-Command node -ErrorAction Stop
        $loader = Join-Path $PSScriptRoot 'aidlc-typescript-loader.mjs'
        $runner = Join-Path $PSScriptRoot 'aidlc-tool-runner.mjs'
        $tool = Join-Path $stockSenseRoot '.codex/tools/aidlc-review-brief.ts'
        $loaderUri = [System.Uri]::new($loader).AbsoluteUri
        $toolArgs = @($args | Select-Object -Skip 2)
        & $node.Source --no-warnings --experimental-strip-types --experimental-transform-types --experimental-loader $loaderUri $runner $tool @toolArgs
        $aidlcExitCode = $LASTEXITCODE
    } else {
        & (Join-Path $env:AIDLC_BIN_DIR 'aidlc.cmd') @args
        $aidlcExitCode = $LASTEXITCODE
    }
} finally {
    Pop-Location
}
exit $aidlcExitCode
