Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  VERIFICACIÓN DE CAMBIOS DE CONFIGURACIÓN CORS" -ForegroundColor Cyan
Write-Host "  Y CORRECCIONES DE SEGURIDAD JWT" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host

# Definir URLs base
$baseUrl = "http://localhost:8080"
$endpoints = @(
    "/api/v1/public/generos",
    "/api/v1/public/estado-civil",
    "/api/v1/auth/login",
    "/api/v1/public/test"
)

Write-Host "1. Verificando endpoints públicos:" -ForegroundColor Yellow
Write-Host "--------------------------------"

foreach ($endpoint in $endpoints) {
    Write-Host "Probando $baseUrl$endpoint... " -NoNewline
    
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl$endpoint" -Method GET -Headers @{
            "Content-Type" = "application/json"
            "Origin" = "http://localhost:4200"
        } -ErrorAction Stop
        
        Write-Host "OK ($($response.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "Error: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}

Write-Host
Write-Host "2. Verificando cambios en frontend:" -ForegroundColor Yellow
Write-Host "--------------------------------"

$frontendFiles = @(
    "frontend\src\app\services\genero.service.ts",
    "frontend\src\app\services\estado-civil.service.ts",
    "frontend\src\app\services\estudio.service.ts",
    "frontend\src\app\services\file.service.ts",
    "frontend\src\app\core\services\auth.service.ts"
)

foreach ($file in $frontendFiles) {
    $fullPath = Join-Path "d:\PROGRAMAS CREADOS PROBADOS 2025\improvement-solutions-angular" $file
    
    if (Test-Path $fullPath) {
        Write-Host "Analizando $file... " -NoNewline
        
        $content = Get-Content -Path $fullPath -Raw
        
        if ($content -match "apiUrl.*=.*environment.apiUrl") {
            Write-Host "OK (Utiliza environment.apiUrl)" -ForegroundColor Green
        } else {
            Write-Host "Advertencia: No parece usar environment.apiUrl correctamente" -ForegroundColor Yellow
        }
        
        if ($content -match "/api/v1/") {
            Write-Host "  -> Advertencia: Contiene referencias a '/api/v1/' que podrían causar problemas" -ForegroundColor Yellow
        }
    } else {
        Write-Host "Error: El archivo $file no existe" -ForegroundColor Red
    }
}

Write-Host
Write-Host "3. Verificando eliminación de archivos CORS redundantes:" -ForegroundColor Yellow
Write-Host "--------------------------------"

$corsFiles = @(
    "backend\src\main\java\com\improvementsolutions\config\CustomCorsFilter.java",
    "backend\src\main\java\com\improvementsolutions\filter\LegacyCorsFilter.java"
)

$corsConfigFile = "backend\src\main\java\com\improvementsolutions\config\CorsConfig.java"

foreach ($file in $corsFiles) {
    $fullPath = Join-Path "d:\PROGRAMAS CREADOS PROBADOS 2025\improvement-solutions-angular" $file
    
    if (-not (Test-Path $fullPath)) {
        Write-Host "✓ $file eliminado correctamente" -ForegroundColor Green
    } else {
        Write-Host "✗ Error: $file todavía existe y debería ser eliminado" -ForegroundColor Red
    }
}

# Verificar que CorsConfig.java ya no tiene @Configuration activo
$corsConfigPath = Join-Path "d:\PROGRAMAS CREADOS PROBADOS 2025\improvement-solutions-angular" $corsConfigFile
if (Test-Path $corsConfigPath) {
    $content = Get-Content -Path $corsConfigPath -Raw
    if ($content -match "@Configuration") {
        Write-Host "✗ Error: CorsConfig.java todavía tiene @Configuration activo" -ForegroundColor Red
    } else {
        Write-Host "✓ CorsConfig.java correctamente modificado (sin @Configuration activo)" -ForegroundColor Green
    }
} else {
    Write-Host "! Advertencia: No se encuentra CorsConfig.java" -ForegroundColor Yellow
}

Write-Host
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  INSTRUCCIONES ADICIONALES" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "1. Asegúrese de iniciar el backend primero:" -ForegroundColor Yellow
Write-Host "   cd backend" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "   .\mvnw spring-boot:run" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host
Write-Host "2. Luego inicie el frontend:" -ForegroundColor Yellow
Write-Host "   cd frontend" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "   npm start" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host
Write-Host "3. Acceda a http://localhost:4200 para verificar el funcionamiento"
Write-Host "4. Pruebe específicamente las siguientes funcionalidades:"
Write-Host "   - Login/Autenticación (verifica JWT funciona correctamente)"
Write-Host "   - Acceso a datos públicos (verifica CORS)"
Write-Host "   - Subida de archivos (verifica configuración de rutas)"
Write-Host
Write-Host "=============================================" -ForegroundColor Cyan
