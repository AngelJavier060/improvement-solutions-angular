#!/bin/bash
# Script para probar la carga de archivos al endpoint de logos

# Crear un archivo de imagen temporal para probar
echo "Creando imagen de prueba..."
#convert -size 200x200 xc:lightblue -pointsize 20 -fill black -gravity center -annotate 0 "Test Logo" test-logo.png

# Función para verificar si curl está instalado
check_curl() {
    if ! command -v curl &> /dev/null
    then
        echo "curl no está instalado. Por favor instale curl para ejecutar este script."
        exit 1
    fi
}

# Ejecutar la prueba de carga
echo "Probando carga a /api/files/upload/logos"
curl -v -F "file=@test-logo.png" http://localhost:8080/api/files/upload/logos

echo "Prueba completada."
