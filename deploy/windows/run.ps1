# Rýchle spustenie na test (popredie). Appka pobeží na http://localhost:3001.
# Konfigurácia sa načíta z backend\.env (ak existuje) – skopíruj z backend\.env.example.
# Spusti:  powershell -ExecutionPolicy Bypass -File deploy\windows\run.ps1
$ErrorActionPreference = 'Stop'

$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location (Join-Path $root 'backend')

if (-not (Test-Path '.\.env')) {
	Write-Host "Poznámka: backend\.env neexistuje – appka pobeží v DEV režime (WhatsApp sa iba loguje)." -ForegroundColor Yellow
}

Write-Host "Spúšťam appku na http://localhost:3001 (Ctrl+C pre ukončenie)..." -ForegroundColor Cyan
npm start
