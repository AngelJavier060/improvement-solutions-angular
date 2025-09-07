# Script para iniciar la aplicación en entorno local
# Ejecutar desde la raíz del proyecto: .\start-local.ps1

Write-Host "=== Iniciando Improvement Solutions - Entorno Local ===" -ForegroundColor Green

# Verificar si MySQL está ejecutándose
Write-Host "Verificando MySQL..." -ForegroundColor Yellow
$mysqlProcess = Get-Process mysqld -ErrorAction SilentlyContinue
if (-not $mysqlProcess) {
    Write-Host "ERROR: MySQL no está ejecutándose. Por favor inicia MySQL primero." -ForegroundColor Red
    Write-Host "Puedes usar: net start mysql80" -ForegroundColor Yellow
    exit 1
}

# Configurar variables de entorno para desarrollo local
$env:SPRING_PROFILES_ACTIVE = "local"
$env:DB_USER = "javier"
$env:DB_PASSWORD = "12345"
$env:SERVER_PORT = "8080"

Write-Host "Variables de entorno configuradas:" -ForegroundColor Cyan
Write-Host "  SPRING_PROFILES_ACTIVE: $env:SPRING_PROFILES_ACTIVE"
Write-Host "  DB_USER: $env:DB_USER"
Write-Host "  SERVER_PORT: $env:SERVER_PORT"

# Cambiar al directorio backend
Set-Location backend

Write-Host "Compilando y ejecutando aplicación..." -ForegroundColor Yellow
Write-Host "Logs disponibles en: logs/application-local.log" -ForegroundColor Cyan

# Ejecutar la aplicación
mvn spring-boot:run

Write-Host "Aplicación finalizada." -ForegroundColor Green
