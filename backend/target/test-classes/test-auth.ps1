# Test de autenticación
Write-Host "Probando autenticación..."

$loginData = @{
    username = "javier"
    password = "12345"
} | ConvertTo-Json

Write-Host "Enviando solicitud de login..."
Write-Host "Datos: $loginData"

$headers = @{
    "Content-Type" = "application/json"
    "Accept" = "application/json"
    "Origin" = "http://localhost:4200"
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" `
                                -Method Post `
                                -Body $loginData `
                                -Headers $headers `
                                -ContentType "application/json"
    Write-Host "Respuesta exitosa:"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error en la solicitud:"
    Write-Host "StatusCode:" $_.Exception.Response.StatusCode.value__ 
    Write-Host "StatusDescription:" $_.Exception.Response.StatusDescription
    $errorDetails = $_.ErrorDetails.Message
    if ($errorDetails) {
        Write-Host "Detalles del error:" $errorDetails
    }
    $rawResponse = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($rawResponse)
    $rawResponse.Position = 0
    $responseBody = $reader.ReadToEnd()
    Write-Host "Cuerpo de la respuesta:" $responseBody
}
