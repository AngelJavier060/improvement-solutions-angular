# Ejecuta la app Flutter en Chrome contra PRODUCCIÓN,
# evitando el bloqueo CORS del navegador (solo para desarrollo local).
# Uso:
#   cd appimprovement
#   .\run_chrome_prod.ps1

$ErrorActionPreference = "Stop"
$profileDir = Join-Path $env:TEMP "flutter_chrome_dev_profile"
New-Item -ItemType Directory -Force -Path $profileDir | Out-Null

Write-Host "API: https://improvement-solution.com (produccion)" -ForegroundColor Cyan
Write-Host "Chrome con perfil aislado (CORS desactivado solo en este perfil)." -ForegroundColor Yellow
Write-Host ""

flutter run -d chrome `
  --web-browser-flag="--disable-web-security" `
  --web-browser-flag="--user-data-dir=$profileDir" `
  --web-browser-flag="--disable-popup-blocking"
