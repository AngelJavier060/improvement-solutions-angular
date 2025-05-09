@echo off
echo =======================================================
echo   VERIFICACION DE CAMBIOS DE CONFIGURACION CORS
echo   Y CORRECCIONES DE SEGURIDAD JWT
echo =======================================================
echo.

set BASE_URL=http://localhost:8080
set ENDPOINTS=/api/v1/public/generos /api/v1/public/estado-civil /api/v1/auth/login /api/v1/public/test

echo 1. Verificando endpoints publicos:
echo --------------------------------
echo.

for %%e in (%ENDPOINTS%) do (
    echo Probando %BASE_URL%%%e... 
    curl -s -o nul -w "%%{http_code}\n" -H "Origin: http://localhost:4200" -H "Content-Type: application/json" %BASE_URL%%%e
)

echo.
echo 2. Verificando eliminacion archivos CORS redundantes:
echo ------------------------------------------------
echo.

set CORS_FILES=backend\src\main\java\com\improvementsolutions\config\CustomCorsFilter.java backend\src\main\java\com\improvementsolutions\filter\LegacyCorsFilter.java
set CONFIG_FILE=backend\src\main\java\com\improvementsolutions\config\CorsConfig.java

for %%f in (%CORS_FILES%) do (
    if not exist "%%f" (
        echo [OK] %%f eliminado correctamente
    ) else (
        echo [ERROR] %%f todavia existe y deberia ser eliminado
    )
)

if exist "%CONFIG_FILE%" (
    findstr "@Configuration" "%CONFIG_FILE%" > nul
    if errorlevel 1 (
        echo [OK] CorsConfig.java correctamente modificado (sin @Configuration activo)
    ) else (
        echo [ERROR] CorsConfig.java todavia tiene @Configuration activo
    )
) else (
    echo [ADVERTENCIA] No se encuentra CorsConfig.java
)

echo.
echo 3. Instrucciones para iniciar la aplicacion:
echo -----------------------------------------
echo.
echo 1. Inicie el backend primero:
echo    cd backend
echo    mvnw spring-boot:run
echo.
echo 2. Luego inicie el frontend:
echo    cd frontend
echo    npm start
echo.
echo 3. Acceda a http://localhost:4200 para verificar el funcionamiento
echo 4. Pruebe las funcionalidades principales (login, datos publicos, archivos)

echo.
echo =======================================================
