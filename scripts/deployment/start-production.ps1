# Script para iniciar la aplicación en entorno de producción con Docker
# Ejecutar desde la raíz del proyecto: .\start-production.ps1

Write-Host "=== Iniciando Improvement Solutions - Entorno Producción ===" -ForegroundColor Green

# Verificar si Docker está ejecutándose
Write-Host "Verificando Docker..." -ForegroundColor Yellow
try {
    docker version | Out-Null
} catch {
    Write-Host "ERROR: Docker no está ejecutándose. Por favor inicia Docker Desktop." -ForegroundColor Red
    exit 1
}

# Detener contenedores existentes si están ejecutándose
Write-Host "Deteniendo contenedores existentes..." -ForegroundColor Yellow
docker-compose down

# Limpiar imágenes antiguas (opcional)
$cleanImages = Read-Host "¿Deseas limpiar imágenes antiguas? (y/N)"
if ($cleanImages -eq "y" -or $cleanImages -eq "Y") {
    Write-Host "Limpiando imágenes..." -ForegroundColor Yellow
    docker system prune -f
}

# Construir y ejecutar contenedores
Write-Host "Construyendo y ejecutando contenedores..." -ForegroundColor Yellow
Write-Host "Esto puede tomar varios minutos la primera vez..." -ForegroundColor Cyan

docker-compose up --build -d

# Verificar estado de los contenedores
Write-Host "Verificando estado de contenedores..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

$containers = docker-compose ps --services
foreach ($container in $containers) {
    $status = docker-compose ps $container
    Write-Host "Estado de $container`: " -NoNewline -ForegroundColor Cyan
    if ($status -match "Up") {
        Write-Host "✓ Ejecutándose" -ForegroundColor Green
    } else {
        Write-Host "✗ Error" -ForegroundColor Red
    }
}

Write-Host "`n=== URLs de Acceso ===" -ForegroundColor Green
Write-Host "Frontend: http://localhost:8001" -ForegroundColor Cyan
Write-Host "Frontend HTTPS: https://localhost:8443" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:8089" -ForegroundColor Cyan
Write-Host "Backend Health: http://localhost:8089/actuator/health" -ForegroundColor Cyan

Write-Host "`nPara ver logs en tiempo real:" -ForegroundColor Yellow
Write-Host "  docker-compose logs -f" -ForegroundColor White
Write-Host "Para detener:" -ForegroundColor Yellow
Write-Host "  docker-compose down" -ForegroundColor White
