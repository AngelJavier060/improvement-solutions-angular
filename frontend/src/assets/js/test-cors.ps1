# Script para probar configuración CORS con PowerShell
# Guarda este archivo como test-cors.ps1 y ejecútalo con PowerShell

# Parámetros de configuración
$apiBaseUrl = "http://localhost:8080"
$endpoints = @(
    "/api/auth/login",
    "/api/files/upload/logos"
)

# Función para realizar prueba OPTIONS en un endpoint
function Test-CorsEndpoint {
    param (
        [string]$endpoint
    )
    
    $url = "$apiBaseUrl$endpoint"
    Write-Host "`n===== PRUEBA DE CORS PARA: $endpoint ====="
    Write-Host "URL: $url"
    
    try {
        $headers = @{
            "Origin" = "http://localhost:4200"
            "Access-Control-Request-Method" = "POST"
            "Access-Control-Request-Headers" = "Origin, Content-Type, Authorization"
        }
        
        $response = Invoke-WebRequest -Uri $url -Method OPTIONS -Headers $headers -ErrorAction Stop
        
        Write-Host "Solicitud OPTIONS exitosa (Status: $($response.StatusCode))"
        Write-Host "`nCabeceras de respuesta CORS:"
        
        $corsHeaders = @(
            "Access-Control-Allow-Origin",
            "Access-Control-Allow-Methods", 
            "Access-Control-Allow-Headers",
            "Access-Control-Allow-Credentials",
            "Access-Control-Max-Age"
        )
        
        foreach ($header in $corsHeaders) {
            if ($response.Headers.ContainsKey($header)) {
                $headerValue = $response.Headers[$header]
                
                # Verificar si hay múltiples valores en la cabecera Allow-Origin
                if ($header -eq "Access-Control-Allow-Origin" -and $headerValue -match ",") {
                    Write-Host "$header : $headerValue" -ForegroundColor Red
                    Write-Host "¡ALERTA! Cabecera con múltiples valores detectada" -ForegroundColor Red
                } else {
                    Write-Host "$header : $headerValue"
                }
            } else {
                Write-Host "$header : (no presente)" -ForegroundColor Yellow
            }
        }
        
        # Verificar si todas las cabeceras CORS necesarias están presentes
        $missingHeaders = $corsHeaders | Where-Object { -not $response.Headers.ContainsKey($_) }
        if ($missingHeaders.Count -gt 0) {
            Write-Host "`nFaltan algunas cabeceras CORS importantes:" -ForegroundColor Yellow
            $missingHeaders | ForEach-Object { Write-Host "- $_" }
        }
        
        return $true
    }
    catch {
        Write-Host "Error en la solicitud OPTIONS: $_" -ForegroundColor Red
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
            Write-Host "Código de estado HTTP: $statusCode"
        }
        return $false
    }
}

# Ejecutar pruebas en cada endpoint
Write-Host "=== INICIANDO PRUEBAS DE CONFIGURACIÓN CORS ==="

foreach ($endpoint in $endpoints) {
    Test-CorsEndpoint -endpoint $endpoint
}

Write-Host "`n=== PRUEBAS COMPLETADAS ==="
