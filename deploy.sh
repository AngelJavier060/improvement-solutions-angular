#!/bin/bash

# Script para desplegar en producción
echo "🚀 Iniciando despliegue de Improvement Solutions..."

# Verificar si Docker y Docker Compose están instalados
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Por favor instala Docker primero."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está instalado. Por favor instala Docker Compose primero."
    exit 1
fi

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    echo "📋 Creando archivo .env desde .env.production..."
    cp .env.production .env
    echo "⚠️  IMPORTANTE: Revisa y actualiza las variables en el archivo .env antes de continuar"
    read -p "Presiona Enter para continuar..."
fi

# Detener servicios existentes
echo "🛑 Deteniendo servicios existentes..."
docker-compose down

# Limpiar imágenes anteriores (opcional)
read -p "¿Quieres limpiar las imágenes anteriores? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 Limpiando imágenes anteriores..."
    docker system prune -f
    docker image prune -f
fi

# Construir y levantar servicios
echo "🔨 Construyendo y levantando servicios..."
docker-compose up --build -d

# Verificar el estado de los servicios
echo "🔍 Verificando estado de los servicios..."
sleep 10
docker-compose ps

# Mostrar logs
echo "📋 Últimos logs de los servicios:"
docker-compose logs --tail=50

echo "✅ Despliegue completado!"
echo "🌐 Frontend disponible en: http://localhost"
echo "🔧 Backend API disponible en: http://localhost:8080/api/v1"
echo "💾 Base de datos disponible en: localhost:3306"
echo ""
echo "Para ver logs en tiempo real usa: docker-compose logs -f"
echo "Para detener los servicios usa: docker-compose down"
