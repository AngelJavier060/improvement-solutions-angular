# Script de despliegue para Windows PowerShell
Write-Host "🚀 Iniciando despliegue de Improvement Solutions..." -ForegroundColor Green

# Verificar si Docker está instalado
try {
    docker --version | Out-Null
    Write-Host "✅ Docker encontrado" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker no está instalado. Por favor instala Docker Desktop primero." -ForegroundColor Red
    exit 1
}

# Construir el backend
Write-Host "🔨 Construyendo backend..." -ForegroundColor Yellow
cd backend
if (Test-Path "mvnw.cmd") {
    .\mvnw.cmd clean package -DskipTests
} else {
    mvn clean package -DskipTests
}
cd ..

# Detener y reconstruir contenedores
Write-Host "🛑 Deteniendo contenedores existentes..." -ForegroundColor Yellow
docker-compose down

Write-Host "🔨 Construyendo y levantando contenedores..." -ForegroundColor Yellow
docker-compose up --build -d

# Limpiar recursos no utilizados
Write-Host "🧹 Limpiando recursos no utilizados..." -ForegroundColor Yellow
docker system prune -f

Write-Host "✅ Despliegue completado!" -ForegroundColor Green
Write-Host "🌐 Frontend disponible en: http://localhost" -ForegroundColor Cyan
Write-Host "🔧 Backend disponible en: http://localhost:8088" -ForegroundColor Cyan
Write-Host "🛑 Deteniendo servicios existentes..." -ForegroundColor Yellow
docker-compose down

# Preguntar si quiere limpiar imágenes anteriores
$cleanup = Read-Host "¿Quieres limpiar las imágenes anteriores? (y/n)"
if ($cleanup -eq "y" -or $cleanup -eq "Y") {
    Write-Host "🧹 Limpiando imágenes anteriores..." -ForegroundColor Yellow
    docker system prune -f
    docker image prune -f
}

# Construir y levantar servicios
Write-Host "🔨 Construyendo y levantando servicios..." -ForegroundColor Blue
docker-compose up --build -d

# Esperar un momento para que los servicios se inicien
Write-Host "⏳ Esperando que los servicios se inicien..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Verificar el estado de los servicios
Write-Host "🔍 Verificando estado de los servicios..." -ForegroundColor Blue
docker-compose ps

# Mostrar logs
Write-Host "📋 Últimos logs de los servicios:" -ForegroundColor Blue
docker-compose logs --tail=50

Write-Host ""
Write-Host "✅ Despliegue completado!" -ForegroundColor Green
Write-Host "🌐 Frontend disponible en: http://localhost" -ForegroundColor Cyan
Write-Host "🔧 Backend API disponible en: http://localhost:8080/api/v1" -ForegroundColor Cyan
Write-Host "💾 Base de datos disponible en: localhost:3306" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para ver logs en tiempo real usa: docker-compose logs -f" -ForegroundColor Gray
Write-Host "Para detener los servicios usa: docker-compose down" -ForegroundColor Gray
