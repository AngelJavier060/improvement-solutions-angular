@echo off
echo ===================================================
echo   VALIDACION DE CORRECCIONES DE ENDPOINTS PUBLICOS
echo ===================================================
echo.

REM Asegúrate de que el backend esté corriendo para ejecutar estas pruebas
echo 1. Probando acceso a endpoints publicos:
echo ------------------------------------------

REM Prueba el endpoint de géneros
echo Probando /api/v1/public/generos... 
curl -s -o response.txt -H "Origin: http://localhost:4200" -H "Content-Type: application/json" http://localhost:8080/api/v1/public/generos
findstr "id" response.txt > nul
if %errorlevel% equ 0 (
  echo [OK] Endpoint de generos funciona correctamente
) else (
  echo [ERROR] Error en el endpoint de generos
)
del response.txt

REM Prueba el endpoint de validación
echo Probando /api/v1/public/validacion... 
curl -s -o response.txt -H "Origin: http://localhost:4200" -H "Content-Type: application/json" http://localhost:8080/api/v1/public/validacion
findstr "mensaje" response.txt > nul
if %errorlevel% equ 0 (
  echo [OK] Endpoint de validacion funciona correctamente
) else (
  echo [ERROR] Error en el endpoint de validacion
)
del response.txt

REM Prueba el endpoint de validación CORS
echo Probando /api/v1/public/validacion/cors... 
curl -s -o response.txt -H "Origin: http://localhost:4200" -H "Content-Type: application/json" http://localhost:8080/api/v1/public/validacion/cors
findstr "cors" response.txt > nul
if %errorlevel% equ 0 (
  echo [OK] Configuracion CORS funciona correctamente
) else (
  echo [ERROR] Error en la configuracion CORS
)
del response.txt

echo.
echo ===================================================
echo   INSTRUCCIONES
echo ===================================================
echo 1. Si todas las pruebas pasan, la solucion esta correcta.
echo 2. Si alguna prueba falla, revisa las configuraciones de seguridad.
echo.
