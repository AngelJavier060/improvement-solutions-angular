#!/bin/bash
# Script para probar los endpoints después de las correcciones

echo "==================================================="
echo "  VALIDACIÓN DE CORRECCIONES DE ENDPOINTS PÚBLICOS"
echo "==================================================="
echo ""

# Asegúrate de que el backend esté corriendo para ejecutar estas pruebas
echo "1. Probando acceso a endpoints públicos:"
echo "------------------------------------------"

# Prueba el endpoint de géneros
echo "Probando /api/v1/public/generos... "
curl -s -o response.txt -w "%{http_code}\n" -H "Origin: http://localhost:4200" -H "Content-Type: application/json" http://localhost:8080/api/v1/public/generos
cat response.txt | grep -q "id"
if [ $? -eq 0 ]; then
  echo "✓ Endpoint de géneros funciona correctamente"
else
  echo "✗ Error en el endpoint de géneros"
fi
rm response.txt

# Prueba el endpoint de validación
echo "Probando /api/v1/public/validacion... "
curl -s -o response.txt -w "%{http_code}\n" -H "Origin: http://localhost:4200" -H "Content-Type: application/json" http://localhost:8080/api/v1/public/validacion
cat response.txt | grep -q "mensaje"
if [ $? -eq 0 ]; then
  echo "✓ Endpoint de validación funciona correctamente"
else
  echo "✗ Error en el endpoint de validación"
fi
rm response.txt

# Prueba el endpoint de validación CORS
echo "Probando /api/v1/public/validacion/cors... "
curl -s -o response.txt -w "%{http_code}\n" -H "Origin: http://localhost:4200" -H "Content-Type: application/json" http://localhost:8080/api/v1/public/validacion/cors
cat response.txt | grep -q "cors"
if [ $? -eq 0 ]; then
  echo "✓ Configuración CORS funciona correctamente"
else
  echo "✗ Error en la configuración CORS"
fi
rm response.txt

echo ""
echo "==================================================="
echo "  INSTRUCCIONES"
echo "==================================================="
echo "1. Si todas las pruebas pasan, la solución está correcta."
echo "2. Si alguna prueba falla, revisa las configuraciones de seguridad."
echo ""
