Write-Host "================================================="
Write-Host "  VERIFICACIÓN DE ACCESO A ENDPOINT PÚBLICO"
Write-Host "================================================="
Write-Host

Write-Host "Probando endpoint /api/v1/public/generos..."
$response = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/public/generos" -Method GET -Headers @{
    "Origin" = "http://localhost:4200"
    "Content-Type" = "application/json"
} -ErrorAction SilentlyContinue

if ($response -and $response.StatusCode -eq 200) {
    Write-Host "✅ Éxito: El endpoint público es accesible sin autenticación" -ForegroundColor Green
    Write-Host "Contenido de respuesta:"
    Write-Host $response.Content
} else {
    Write-Host "❌ Error: No se pudo acceder al endpoint público" -ForegroundColor Red
    Write-Host "Es posible que el backend no esté en ejecución o que persista el problema"
}

Write-Host
Write-Host "================================================="
Write-Host "  INSTRUCCIONES PARA VERIFICAR SOLUCIÓN"
Write-Host "================================================="
Write-Host "1. Asegúrate de que el backend está en ejecución"
Write-Host "2. Si el backend está corriendo y aún obtienes errores 401,"
Write-Host "   reinicia el backend para aplicar los cambios de configuración"
Write-Host "3. Ejecuta el frontend con 'ng serve' desde la carpeta frontend"
Write-Host "4. Accede a http://localhost:4200 y verifica los endpoints públicos"
