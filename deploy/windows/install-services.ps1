# Nainštaluje appku a Caddy ako Windows SLUŽBY (autoštart po reštarte servera).
# Potrebuje NSSM (https://nssm.cc) a beh ako Administrátor.
#
# Príklad:
#   powershell -ExecutionPolicy Bypass -File deploy\windows\install-services.ps1 `
#       -SiteAddress "mlieko.ahafarma.sk" -CaddyPath "C:\caddy\caddy.exe"
#
# Pre lokálny test bez HTTPS použi -SiteAddress ":80".
param(
	[Parameter(Mandatory = $true)][string]$SiteAddress,
	[string]$CaddyPath = "caddy.exe",
	[string]$AppServiceName = "MilkApp",
	[string]$CaddyServiceName = "MilkCaddy"
)
$ErrorActionPreference = 'Stop'

# --- kontrola oprávnení ---
$admin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { Write-Error "Spusti PowerShell ako Administrátor."; exit 1 }

# --- kontrola NSSM ---
$nssmCmd = Get-Command nssm.exe -ErrorAction SilentlyContinue
if (-not $nssmCmd) {
	Write-Error "NSSM sa nenašiel. Stiahni ho z https://nssm.cc, rozbaľ a pridaj nssm.exe do PATH (alebo do tohto priečinka)."
	exit 1
}

# --- cesty ---
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$backend = Join-Path $root 'backend'
$nodeCmd = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $nodeCmd) { Write-Error "Node.js sa nenašiel v PATH."; exit 1 }
$node = $nodeCmd.Source
if (-not (Test-Path (Join-Path $root 'frontend\dist'))) {
	Write-Error "Chýba frontend\dist. Najprv spusti deploy\windows\build.ps1."
	exit 1
}
$caddyfile = Join-Path $PSScriptRoot 'Caddyfile'

Write-Host "Node:   $node"
Write-Host "Backend:$backend"
Write-Host "Caddy:  $CaddyPath"
Write-Host "Doména: $SiteAddress`n"

# --- príprava priečinka na logy ---
$logDir = Join-Path $backend 'logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

# --- služba appky ---
Write-Host "Inštalujem službu '$AppServiceName'..." -ForegroundColor Cyan
& nssm install $AppServiceName $node "--env-file-if-exists=.env" "src\server.js" | Out-Null
& nssm set $AppServiceName AppDirectory $backend | Out-Null
& nssm set $AppServiceName AppEnvironmentExtra "NODE_ENV=production" | Out-Null
& nssm set $AppServiceName Start SERVICE_AUTO_START | Out-Null
& nssm set $AppServiceName AppStdout (Join-Path $backend 'logs\app.log') | Out-Null
& nssm set $AppServiceName AppStderr (Join-Path $backend 'logs\app.log') | Out-Null

# --- služba Caddy (HTTPS) ---
Write-Host "Inštalujem službu '$CaddyServiceName'..." -ForegroundColor Cyan
& nssm install $CaddyServiceName $CaddyPath "run" "--config" $caddyfile "--adapter" "caddyfile" | Out-Null
& nssm set $CaddyServiceName AppDirectory $PSScriptRoot | Out-Null
& nssm set $CaddyServiceName AppEnvironmentExtra "SITE_ADDRESS=$SiteAddress" | Out-Null
& nssm set $CaddyServiceName Start SERVICE_AUTO_START | Out-Null

# --- štart ---
Write-Host "`nSpúšťam služby..." -ForegroundColor Cyan
& nssm start $AppServiceName | Out-Null
& nssm start $CaddyServiceName | Out-Null

Write-Host "`nHotovo. Appka beží ako služby '$AppServiceName' a '$CaddyServiceName'." -ForegroundColor Green
Write-Host "Otvor: https://$SiteAddress  (alebo http://localhost pri SITE_ADDRESS=:80)"
Write-Host "Odinštalovanie: nssm remove $AppServiceName confirm; nssm remove $CaddyServiceName confirm"
