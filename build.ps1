$versionFile = Join-Path $PSScriptRoot "version.txt"
$v = Get-Content $versionFile -Raw | ForEach-Object { $_.Trim() }
$parts = $v.Split(".")
$patch = [int]$parts[2] + 1
$newV = "$($parts[0]).$($parts[1]).$patch"
$newV | Set-Content $versionFile -NoNewline

$env:VITE_APP_VERSION = "v$newV"

Write-Host "Building v$newV ..." -ForegroundColor Cyan

Push-Location (Join-Path $PSScriptRoot "arayuz")
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

go build -ldflags "-s -w -H=windowsgui" -o (Join-Path $PSScriptRoot "build/bin/MusteriDefteri.exe") .
if ($LASTEXITCODE -eq 0) {
    Write-Host "Build OK: v$newV" -ForegroundColor Green
}
exit $LASTEXITCODE
