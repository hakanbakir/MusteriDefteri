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

$exe = Join-Path $PSScriptRoot "build/bin/MusteriDefteri.exe"
go build -ldflags "-s -w -H=windowsgui" -o $exe .
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$rcedit = Join-Path $PSScriptRoot "build/rcedit.exe"
if (-not (Test-Path $rcedit)) {
    Write-Host "Downloading rcedit.exe ..." -ForegroundColor Yellow
    $null = New-Item -ItemType Directory -Force -Path (Join-Path $PSScriptRoot "build")
    Invoke-WebRequest -Uri "https://github.com/electron/rcedit/releases/download/v2.0.0/rcedit-x64.exe" -OutFile $rcedit -UseBasicParsing
}

if (Test-Path $rcedit) {
    & $rcedit $exe --set-icon (Join-Path $PSScriptRoot "winres/icon.ico")
}

Write-Host "Build OK: v$newV" -ForegroundColor Green
exit 0
