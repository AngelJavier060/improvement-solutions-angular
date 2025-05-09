#!/bin/bash

BASE_URL="http://localhost:8080"
ENDPOINT="/api/v1/public/generos"

echo "======================================================="
echo "     DIAGNÓSTICO DE ENDPOINTS PÚBLICOS"
echo "======================================================="
echo ""

echo "Probando acceso a ${BASE_URL}${ENDPOINT}"
echo ""

echo "1. Prueba con curl (sin autenticación):"
echo "---------------------------------------"
curl -s -X GET "${BASE_URL}${ENDPOINT}" -H "Content-Type: application/json"
echo -e "\n"

echo "2. Prueba con curl simulando navegador:"
echo "---------------------------------------"
curl -s -X GET "${BASE_URL}${ENDPOINT}" -H "Content-Type: application/json" -H "User-Agent: Mozilla/5.0" -H "Origin: http://localhost:4200"
echo -e "\n"

echo "3. Prueba con opciones CORS (Preflight):"
echo "---------------------------------------"
curl -s -X OPTIONS "${BASE_URL}${ENDPOINT}" -H "Origin: http://localhost:4200" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: Content-Type" -I
echo -e "\n"

echo "4. Prueba de endpoint de test:"
echo "---------------------------------------"
curl -s -X GET "${BASE_URL}/api/v1/public/test" -H "Content-Type: application/json"
echo -e "\n"

echo "======================================================="
echo "     RESUMEN"
echo "======================================================="
echo ""
echo "Si viste datos JSON con información de géneros, ¡el endpoint funciona!"
echo "Si viste errores 401 (No autorizado), el problema persiste."
echo ""
echo "Recuerda: estos endpoints NO deberían requerir token."
echo ""
