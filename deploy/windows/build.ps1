# Zostaví appku na Windows: nainštaluje závislosti a vytvorí frontend build.
# Spusti z koreňa projektu:  powershell -ExecutionPolicy Bypass -File deploy\windows\build.ps1
$ErrorActionPreference = 'Stop'

# Prejdi do koreňa projektu (dva priečinky nad týmto skriptom).
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $root
Write-Host "Projekt: $root" -ForegroundColor Cyan

# Kontrola Node.js
try {
	$nodeVersion = node --version
	Write-Host "Node.js: $nodeVersion" -ForegroundColor Green
} catch {
	Write-Error "Node.js nie je nainštalovaný. Stiahni LTS verziu z https://nodejs.org a spusti skript znova."
	exit 1
}

Write-Host "`n[1/3] Inštalujem závislosti backendu..." -ForegroundColor Cyan
npm --prefix backend ci

Write-Host "`n[2/3] Inštalujem závislosti frontendu..." -ForegroundColor Cyan
npm --prefix frontend ci

Write-Host "`n[3/3] Zostavujem frontend (Vite build)..." -ForegroundColor Cyan
npm --prefix frontend run build

Write-Host "`nHotovo. Appku spustíš cez deploy\windows\run.ps1 (test) alebo ju nainštaluj ako službu (viď DEPLOY-WINDOWS.md)." -ForegroundColor Green
