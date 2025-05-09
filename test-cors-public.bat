@echo off
echo =================================================
echo   VERIFICACION DE ACCESO A ENDPOINT PUBLICO
echo =================================================
echo.

echo Probando endpoint /api/v1/public/generos...
curl -s -o response.txt -w "Código de estado: %%{http_code}\n" -H "Origin: http://localhost:4200" -H "Content-Type: application/json" http://localhost:8080/api/v1/public/generos

findstr "id" response.txt > nul
if %errorlevel% equ 0 (
  echo [OK] Exito: El endpoint publico es accesible sin autenticacion
  echo Contenido de respuesta:
  type response.txt
) else (
  echo [ERROR] No se pudo acceder al endpoint publico
  echo Es posible que el backend no este en ejecucion o que persista el problema
)
del response.txt

echo.
echo =================================================
echo   INSTRUCCIONES PARA VERIFICAR SOLUCION
echo =================================================
echo 1. Asegurate de que el backend esta en ejecucion
echo 2. Si el backend esta corriendo y aun obtienes errores 401,
echo    reinicia el backend para aplicar los cambios de configuracion
echo 3. Ejecuta el frontend con 'ng serve' desde la carpeta frontend
echo 4. Accede a http://localhost:4200 y verifica los endpoints publicos
