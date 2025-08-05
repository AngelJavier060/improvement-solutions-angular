#!/bin/bash

# Script para verificar y preparar el servidor para improvement-solutions-angular
echo "🔍 Verificando estado del servidor para improvement-solutions-angular..."

# Verificar conexión al servidor
echo "📡 Verificando conexión al servidor..."

# Verificar si Docker está instalado
echo "🐳 Verificando Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Instalando..."
    apt-get update
    apt-get install -y docker.io docker-compose
    systemctl start docker
    systemctl enable docker
else
    echo "✅ Docker encontrado"
fi

# Verificar si Git está instalado
echo "📦 Verificando Git..."
if ! command -v git &> /dev/null; then
    echo "❌ Git no está instalado. Instalando..."
    apt-get install -y git
else
    echo "✅ Git encontrado"
fi

# Crear directorio para el proyecto
echo "📁 Creando directorio del proyecto..."
mkdir -p /opt/improvement-solutions-angular
cd /opt/improvement-solutions-angular

# Verificar puertos disponibles
echo "🔌 Verificando puertos disponibles..."
echo "Puerto 8080 (Frontend HTTP):"
if lsof -i :8080 &> /dev/null; then
    echo "⚠️  Puerto 8080 está en uso"
    lsof -i :8080
else
    echo "✅ Puerto 8080 disponible"
fi

echo "Puerto 8443 (Frontend HTTPS):"
if lsof -i :8443 &> /dev/null; then
    echo "⚠️  Puerto 8443 está en uso"
    lsof -i :8443
else
    echo "✅ Puerto 8443 disponible"
fi

echo "Puerto 8089 (Backend):"
if lsof -i :8089 &> /dev/null; then
    echo "⚠️  Puerto 8089 está en uso"
    lsof -i :8089
else
    echo "✅ Puerto 8089 disponible"
fi

echo "Puerto 3307 (MySQL):"
if lsof -i :3307 &> /dev/null; then
    echo "⚠️  Puerto 3307 está en uso"
    lsof -i :3307
else
    echo "✅ Puerto 3307 disponible"
fi

# Verificar espacio en disco
echo "💾 Verificando espacio en disco..."
df -h /

# Verificar otros proyectos
echo "📋 Verificando otros proyectos en el servidor..."
if [ -d "/opt/pollos-chanchos-Angular" ]; then
    echo "🐔 Encontrado: pollos-chanchos-Angular"
    cd /opt/pollos-chanchos-Angular
    echo "   Estado: $(docker-compose ps --services --filter 'status=running' | wc -l) servicios corriendo"
    cd -
fi

# Verificar certificados SSL
echo "🔒 Verificando certificados SSL..."
if [ -d "/etc/letsencrypt/live/improvement-solution.com" ]; then
    echo "✅ Certificados SSL encontrados para improvement-solution.com"
    ls -la /etc/letsencrypt/live/improvement-solution.com/
else
    echo "⚠️  No se encontraron certificados SSL para improvement-solution.com"
    echo "   Necesitarás configurar Let's Encrypt después del deployment"
fi

echo ""
echo "🎯 Configuración de puertos para improvement-solutions-angular:"
echo "   - Frontend HTTP: 8080"
echo "   - Frontend HTTPS: 8443"
echo "   - Backend API: 8089"
echo "   - MySQL: 3307"
echo ""
echo "🌐 URLs de acceso:"
echo "   - Frontend: http://improvement-solution.com:8080"
echo "   - Frontend SSL: https://improvement-solution.com:8443"
echo "   - Backend API: http://improvement-solution.com:8089/api/"

echo "✅ Verificación completada!"
