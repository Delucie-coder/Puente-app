# PowerShell smoke test for Puente mock server
$server = 'http://localhost:3010'
$OutDir = Join-Path -Path $PSScriptRoot -ChildPath 'tmp'
if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }

Write-Host "Fetching /api/lessons ..."
try {
    Invoke-RestMethod -Uri "$server/api/lessons" -OutFile (Join-Path $OutDir 'lessons.json') -ErrorAction Stop
} catch { Write-Error "Failed to fetch /api/lessons: $_"; exit 2 }

Write-Host "Fetching /api/lesson/market_english_greetings ..."
try {
    Invoke-RestMethod -Uri "$server/api/lesson/market_english_greetings" -OutFile (Join-Path $OutDir 'market_english_greetings.json') -ErrorAction Stop
} catch { Write-Error "Failed to fetch lesson: $_"; exit 3 }

Get-ChildItem -Path $OutDir | Format-Table Name, Length -AutoSize
