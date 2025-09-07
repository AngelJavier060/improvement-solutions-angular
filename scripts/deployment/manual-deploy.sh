#!/bin/bash

echo "🚀 Deployment manual de improvement-solutions-angular"
echo "📍 Este script debe ejecutarse EN EL SERVIDOR"

# Verificar si estamos en el servidor
if [ ! -f "/etc/os-release" ]; then
    echo "❌ Este script debe ejecutarse en el servidor Linux"
    exit 1
fi

# Crear directorio si no existe
if [ ! -d "/opt/improvement-solutions-angular" ]; then
    echo "📁 Creando directorio /opt/improvement-solutions-angular..."
    sudo mkdir -p /opt/improvement-solutions-angular
    sudo chown $(whoami):$(whoami) /opt/improvement-solutions-angular
    cd /opt/improvement-solutions-angular
    echo "📦 Clonando repositorio..."
    git clone https://github.com/AngelJavier060/improvement-solutions-angular.git .
else
    echo "📁 Directorio existe, actualizando..."
    cd /opt/improvement-solutions-angular
    git pull origin main
fi

echo "🔨 Construyendo backend..."
cd backend
if [ -f "mvnw" ]; then
    chmod +x mvnw
    ./mvnw clean package -DskipTests
else
    mvn clean package -DskipTests
fi
cd ..

echo "🐳 Verificando Docker..."
docker --version
if command -v docker-compose &> /dev/null; then
    docker-compose --version
    COMPOSE_CMD="docker-compose"
else
    docker compose version
    COMPOSE_CMD="docker compose"
fi

echo "🐳 Deteniendo contenedores anteriores si existen..."
$COMPOSE_CMD down 2>/dev/null || true

echo "🐳 Construyendo e iniciando contenedores..."
$COMPOSE_CMD up --build -d

echo "🧹 Limpiando recursos no utilizados..."
docker system prune -f

echo "✅ improvement-solutions-angular desplegado!"

echo "📊 Estado de contenedores:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo "🔍 Verificando contenedores de improvement-solutions:"
docker ps | grep -E "(improvement|mysql)" || echo "⚠️  No se encontraron contenedores"

echo "🌐 Servicios disponibles:"
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "Frontend: http://$SERVER_IP:8080"
echo "Backend: http://$SERVER_IP:8089"
echo "MySQL: $SERVER_IP:3307"
