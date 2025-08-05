#!/bin/bash

echo "🚀 Configurando improvement-solutions-angular INDEPENDIENTE"
echo "📍 Este script NO toca pollos-chanchos-Angular en absoluto"
echo ""

# Verificar que estamos en el servidor correcto
if [ ! -d "/opt/pollos-chanchos-Angular" ]; then
    echo "⚠️  No se encuentra pollos-chanchos-Angular. ¿Estás en el servidor correcto?"
    exit 1
fi

echo "✅ pollos-chanchos-Angular encontrado (no se tocará)"
echo ""

# Crear directorio independiente
echo "📁 Creando directorio independiente para improvement-solutions..."
mkdir -p /opt/improvement-solutions-angular
cd /opt/improvement-solutions-angular

# Verificar si ya existe el repositorio
if [ -d ".git" ]; then
    echo "📦 Repositorio ya existe, actualizando..."
    git pull origin main
else
    echo "📦 Clonando repositorio improvement-solutions-angular..."
    git clone https://github.com/AngelJavier060/improvement-solutions-angular.git .
fi

# Verificar puertos disponibles para improvement-solutions
echo ""
echo "🔌 Verificando puertos para improvement-solutions..."

check_port() {
    local port=$1
    local service=$2
    if lsof -i :$port &> /dev/null; then
        echo "⚠️  Puerto $port ($service) está en uso:"
        lsof -i :$port
        return 1
    else
        echo "✅ Puerto $port ($service) disponible"
        return 0
    fi
}

# Puertos que usará improvement-solutions
check_port 8080 "Frontend HTTP"
check_port 8443 "Frontend HTTPS" 
check_port 8089 "Backend API"
check_port 3307 "MySQL"

echo ""
echo "🐳 Verificando Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no encontrado"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no encontrado"
    exit 1
fi

echo "✅ Docker y Docker Compose disponibles"

# Mostrar contenedores actuales (pollos-chanchos)
echo ""
echo "📊 Contenedores actuales en el servidor:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🔧 Construcción inicial del backend..."
cd backend

# Verificar si existe mvnw
if [ ! -f "mvnw" ]; then
    echo "❌ mvnw no encontrado. Usando maven del sistema..."
    mvn clean package -DskipTests
else
    echo "✅ Usando mvnw..."
    chmod +x mvnw
    ./mvnw clean package -DskipTests
fi

cd ..

echo ""
echo "🐳 Construyendo contenedores de improvement-solutions..."
docker-compose up --build -d

echo ""
echo "⏳ Esperando que los servicios estén listos..."
sleep 10

echo ""
echo "📊 Verificando que improvement-solutions esté funcionando..."
docker-compose ps

echo ""
echo "🌐 URLs de acceso para improvement-solutions:"
echo "   Frontend: http://improvement-solution.com:8080"
echo "   Backend API: http://improvement-solution.com:8089/api/"
echo ""

echo "📊 Estado final de TODOS los contenedores:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "✅ improvement-solutions-angular configurado independientemente!"
echo "🔒 pollos-chanchos-Angular NO fue modificado"
echo ""
echo "🛠️  Comandos útiles:"
echo "   cd /opt/improvement-solutions-angular"
echo "   docker-compose logs -f"
echo "   docker-compose restart"
echo "   git pull origin main && docker-compose up --build -d"
